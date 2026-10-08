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

test('既存Sheetのdurationシリアル値を秒で解釈し、空欄は未取得扱い',()=>{
 const c=runtime();
 assert(Math.abs(c.playPointRevenueDurationSeconds_(51/86400)-51)<0.00001);
 assert.equal(c.playPointRevenueDurationSeconds_(0),0);
 assert.equal(c.playPointRevenueDurationSeconds_('0時間00分42秒'),42);
 assert.equal(c.playPointRevenueDurationSeconds_(''),null);
 assert.equal(c.playPointRevenueDurationSeconds_('not set'),null);
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
