'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../scripts/playpoint-revenue-diagnostics.gs'),'utf8');
function runtime(){const c=vm.createContext({console});vm.runInContext(source,c);return c;}
function daily(date,revenue,ga4Pv,adsensePv,engagement=30){
 return {date,revenue,ga4Pv,adsensePv,avgEngagementSec:engagement,impressions:600,clicks:5,
   pageCtr:5/adsensePv,pageRpm:1000*revenue/adsensePv,impCtr:5/600,impRpm:1000*revenue/600,
   dataState:'RECONCILED'};
}

function coreRuntime(extra={}) {
 const patch=fs.readFileSync(path.join(__dirname,'../docs/patches/playpoint-analytics-v11.6.5-validation.patch'),'utf8');
 const after=patch.split(/\r?\n/).filter(l=>l.startsWith(' ')||(l.startsWith('+')&&!l.startsWith('+++'))).map(l=>l.slice(1)).join('\n');
 const names=['fetchGa4Daily_','fetchAdSenseDaily_','assertGa4ReportNotTruncated_','assertAdSenseReportNotTruncated_',
  'metricNumber_','apiMetricNumber_','validateApiDailyDate_','createWeeklyDetailArchive_'];
 const c=vm.createContext({CONFIG:{ADSENSE_SITE_DOMAINS:['playpoint-sim.com'],CURRENCY_CODE:'JPY'},
  AnalyticsData:{newRunReportRequest:()=>({})},resolveAdSenseAccountName_:()=> 'accounts/test',
  adsenseDateParameters_:()=>({}),normalizeDomain_:v=>v,escapeAdSenseFilterParameter_:v=>v,
  adSenseCell_:(cells,i)=>cells[i]?.value??'',dimensionValue_:(row,i)=>row.dimensionValues?.[i]?.value??'',
  normalizeRatio_:v=>Number(v),errorMessage_:e=>e.message,...extra});
 for(const name of names){
  const fn=after.match(new RegExp('function '+name+'\\([^]*?\\n\\}'));
  assert(fn,'公開差分に関数がない: '+name);vm.runInContext(fn[0],c);
 }
 return c;
}

test('元GA4日次も数値欠落・重複・期間外・途中切れ・制限ありを拒否する',()=>{
 const row={dimensionValues:[{value:'20261008'}],metricValues:['10','5','0'].map(value=>({value}))};
 let report={rowCount:1,rows:[row]};const c=coreRuntime({runGa4Report_:()=>report});
 assert.equal(c.fetchGa4Daily_('2026-10-08','2026-10-08')['2026-10-08'].engagementDurationSec,0);
 for(const value of [undefined,null,'','bad',false]){
  row.metricValues[0].value=value;assert.throws(()=>c.fetchGa4Daily_('2026-10-08','2026-10-08'),/数値が欠落/);
 }
 row.metricValues[0].value='10';report.rows=[row,row];report.rowCount=2;
 assert.throws(()=>c.fetchGa4Daily_('2026-10-08','2026-10-08'),/重複/);
 report.rows=[row];report.rowCount=2;assert.throws(()=>c.fetchGa4Daily_('2026-10-08','2026-10-08'),/行しか取得/);
 report.rowCount=1;assert.throws(()=>c.fetchGa4Daily_('2026-10-07','2026-10-07'),/要求期間外/);
 for(const metadata of [{subjectToThresholding:true},{dataLossFromOtherRow:true},{samplingMetadatas:[{}]}]){
  report.metadata=metadata;assert.throws(()=>c.fetchGa4Daily_('2026-10-08','2026-10-08'),/完全な履歴/);
 }
 report.metadata={};row.dimensionValues[0].value='20260231';
 assert.throws(()=>c.fetchGa4Daily_('2026-02-01','2026-03-01'),/日付が不正/);
});

test('元AdSense日次も実測ゼロと欠落を区別し、列順・通貨・重複・途中切れを検証する',()=>{
 const metrics=['ESTIMATED_EARNINGS','PAGE_VIEWS','IMPRESSIONS','CLICKS','PAGE_VIEWS_CTR','PAGE_VIEWS_RPM','IMPRESSIONS_CTR','IMPRESSIONS_RPM'];
 const row={cells:['2026-10-08','0','10','20','0','0','0','0','0'].map(value=>({value}))};
 const report={headers:['DATE',...metrics].map(name=>({name})),totalMatchedRows:'1',rows:[row]};
 report.headers[1].currencyCode='JPY';const c=coreRuntime({AdSense:{Accounts:{Reports:{generate:()=>report}}}});
 assert.equal(c.fetchAdSenseDaily_('2026-10-08','2026-10-08')['2026-10-08'].earnings,0);
 row.cells[1].value='';assert.throws(()=>c.fetchAdSenseDaily_('2026-10-08','2026-10-08'),/数値が欠落/);
 row.cells[1].value='0';report.headers[1].currencyCode='USD';
 assert.throws(()=>c.fetchAdSenseDaily_('2026-10-08','2026-10-08'),/通貨/);report.headers[1].currencyCode='JPY';
 report.headers[2].name='CLICKS';assert.throws(()=>c.fetchAdSenseDaily_('2026-10-08','2026-10-08'),/列構成/);
 report.headers[2].name='PAGE_VIEWS';report.totalMatchedRows='2';
 assert.throws(()=>c.fetchAdSenseDaily_('2026-10-08','2026-10-08'),/行しか取得/);
 report.rows=[row,row];assert.throws(()=>c.fetchAdSenseDaily_('2026-10-08','2026-10-08'),/重複/);
 report.rows=[];report.totalMatchedRows='0';assert.equal(Object.keys(c.fetchAdSenseDaily_('2026-10-08','2026-10-08')).length,0);
});

test('既存週次保存へ改善計測も含め、独立した取得期間と出力一覧を保持する',()=>{
 const saved=[];const grid=[['読者行動','2026-10-09 09:00'],['対象期間','2026-09-07 ～ 2026-10-06']];
 const c=coreRuntime({CONFIG:{SHEETS:{},TIME_ZONE:'Asia/Tokyo'},Utilities:{formatDate:()=> '2026-10-09_090000'},
  getOrCreateDataChildFolder_:()=>({}),getOrCreateNestedFolder_:()=>({}),currentTimestamp_:()=> '2026-10-09 09:00',
  createOrReplaceTextFile_:(_folder,file,text)=>saved.push({file,text}),rowsToCsv_:v=>JSON.stringify(v)});
 const names=['📊ページ価値ファネル','🔎検索クロス分析','🧭URL検査','📚記事Portfolio','🧑読者行動・再訪',
  '📈GA4イベント日次','⚖広告変更比較','↩7日目再訪','🧪変更効果・利用品質'];
 const ss={getSheetByName:name=>names.includes(name)?{getLastRow:()=>2,getDataRange:()=>({getValues:()=>grid})}:null};
 assert.equal(c.createWeeklyDetailArchive_(ss,{endDate:'2026-10-08'},{endDate:'2026-10-06'},{}),'Archives/Weekly/2026-10-09_090000');
 const manifest=JSON.parse(saved.find(x=>x.file==='manifest.json').text);
 assert.equal(manifest.sourceSheets.length,9);assert(saved.some(x=>x.file==='reader_outcomes.csv'));
 assert.equal(manifest.sourceSheets[4].context[1],'2026-09-07 ～ 2026-10-06');
 assert.match(manifest.note,/not collection success/);
});

test('既存Sheetのdurationシリアル値を秒で解釈し、空欄は未取得扱い',()=>{
 const c=runtime();
 assert(Math.abs(c.playPointRevenueDurationSeconds_(51/86400)-51)<0.00001);
 assert.equal(c.playPointRevenueDurationSeconds_(0),0);
 assert.equal(c.playPointRevenueDurationSeconds_('0時間00分42秒'),42);
 assert.equal(c.playPointRevenueDurationSeconds_(''),null);
 assert.equal(c.playPointRevenueDurationSeconds_('not set'),null);
});

test('照合済み収益の空欄・不正値を0円にしないが、実測0円は受け入れる',()=>{
 const c=runtime(), headers=['日付','PV数（GA4）','推定収益（円）','AdSenseページビュー','広告インプレッション数','広告クリック数',
 'AdSenseページCTR','AdSenseページRPM（円）','広告インプレッションCTR','広告インプレッションRPM（円）','データ状態'];
 const row=['2026-10-08',100,0,110,300,0,0,0,0,0,'RECONCILED'];
 const ss={getSheetByName:()=>({getLastRow:()=>2,getDataRange:()=>({getValues:()=>[headers,row]})})};
 assert.equal(c.playPointRevenueReadDailyHistory_(ss)[0].revenue,0);
 row[2]='';assert.throws(()=>c.playPointRevenueReadDailyHistory_(ss),/数値が欠落/);
 row[2]='bad';assert.throws(()=>c.playPointRevenueReadDailyHistory_(ss),/数値が欠落/);
 row[10]='PARTIAL';assert.equal(c.playPointRevenueReadDailyHistory_(ss)[0].dataState,'PARTIAL');
});

test('2つの完全週は9月23〜29日と9月30日〜10月6日。収益中央値で単発上振れを分離',()=>{
 const c=runtime();
 const a=[91,52,78,43,37,42,194];
 const b=[50,100,104,84,54,51,62];
 const h=[];
 for(let i=0;i<14;i++){
  const date=new Date(Date.parse('2026-09-23T00:00:00Z')+86400000*i).toISOString().slice(0,10);
  h.push(daily(date,i<7?a[i]:b[i-7],100,110));
 }
 const weeks=Array.from(c.playPointRevenueWeeklyComparison_(h,'2026-10-07'),w=>JSON.parse(JSON.stringify(w)));
 assert.deepEqual(weeks.map(w=>[w.start,w.end,w.state]),[
  ['2026-09-23','2026-09-29','RECONCILED'],['2026-09-30','2026-10-06','RECONCILED']]);
 assert.equal(weeks[0].revenue,537);assert.equal(weeks[1].revenue,505);
 assert.equal(weeks[0].medianDailyRevenue,52);assert.equal(weeks[1].medianDailyRevenue,62);
 h.pop();
 const partial=c.playPointRevenueWeeklyComparison_(h,'2026-10-07');
 assert.equal(partial[1].state,'PARTIAL');
 assert.equal(partial[1].medianDailyRevenue,undefined);
});

test('AdSense PV突出と日次0秒/ページ別非0秒を別々に警告し、元の実測を変えない',()=>{
 const c=runtime(),h=[];
 for(let i=0;i<35;i++){
  const date=new Date(Date.parse('2026-09-03T00:00:00Z')+86400000*i).toISOString().slice(0,10);
  h.push(daily(date,50,100,110,date==='2026-09-28'?0:30));
 }
 const bad=h.find(x=>x.date==='2026-09-30');bad.ga4Pv=130;bad.adsensePv=977;
 const copy=JSON.stringify(h);
 const pageRows=Array.from({length:3},(_,i)=>['2026-09-28','/articles/a'+i,2,2,25/86400,'RECONCILED']);
 const page={getLastRow:()=>4,getRange:()=>({getValues:()=>pageRows})};
 const book={getSheetByName:name=>name==='📚ページ日次履歴'?page:null};
 const result=c.playPointRevenueInspectIntegrity_(book,h,'2026-10-07');
 assert.equal(result.pageState,'CHECKED');
 assert(result.issues.some(x=>x.code==='ADSENSE_GA4_PV_RATIO_WATCH'&&x.date==='2026-09-30'));
 assert(result.issues.some(x=>x.code==='GA4_DAILY_ZERO_PAGE_NONZERO'&&x.date==='2026-09-28'));
 assert.equal(JSON.stringify(h),copy);
 const missingPage=c.playPointRevenueInspectIntegrity_({getSheetByName:()=>null},h,'2026-10-07');
 assert.equal(missingPage.pageState,'NOT_AVAILABLE');
 assert(!missingPage.issues.some(x=>x.code==='GA4_DAILY_ZERO_PAGE_NONZERO'));
});

test('収益レポートは不完全な週を確定として出さず、データ品質セクションだけを書き込む',()=>{
 const c=runtime(),writes=[];
 const sheet={getMaxRows:()=>200,getRange:(row,col,n,width)=>({
  setValues:values=>{writes.push({row,col,values});},
  setFontWeight:()=>{},
  setNumberFormat:()=>{}
 })};
 const integrity={start:'2026-09-03',end:'2026-10-07',pageState:'NOT_AVAILABLE',medianRatio:null,
 issues:[],weeks:[{label:'前週',start:'2026-09-23',end:'2026-09-29',state:'PARTIAL'},
 {label:'直近完了週',start:'2026-09-30',end:'2026-10-06',state:'RECONCILED',
 ga4Pv:1113,revenue:505,impressions:5666,revenuePerGa4Pv:505/1113,medianDailyRevenue:62}]};
 c.playPointRevenueWriteIntegrity_(sheet,integrity,30);
 const rows=writes.find(x=>x.values.length>1).values;
 assert.equal(rows[4][2],''); // 前週の欠測をゼロにしない
 assert.equal(rows[5][3],505);assert.equal(rows[6][0],'要確認日');
 assert.equal(rows[7][0],'要確認なし');
});

test('日次収益の成功はGA4イベント更新失敗で巻き戻さない',()=>{
 const c=runtime(); let notes=[];
 c.withScriptLock_=f=>f();
 c.playPointRevenueCaptureUnlocked_=()=>({severity:'NORMAL',targetDate:'2026-10-07'});
 c.capturePlayPointEventDailyReview=()=>{throw Error('GA4 temporary unavailable');};
 c.playPointRevenueGetSpreadsheet_=()=>({});
 c.playPointRevenueLog_=(_book,type,message)=>{notes.push([type,message]);};
 const r=c.capturePlayPointRevenueDiagnostics();
 assert.equal(r.severity,'NORMAL');assert.equal(r.eventDaily.state,'ERROR');
 assert.equal(notes.length,1);assert.equal(notes[0][0],'WARN');
});
