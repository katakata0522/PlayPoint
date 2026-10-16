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
// 同一期間の計測診断・収益比較。実APIではなく、取得境界と計算を検証する。
(() => {
  const test = require('node:test'), assert = require('node:assert/strict');
  const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
  const source = fs.readFileSync(path.join(__dirname, '../scripts/playpoint-measurement-review.gs'), 'utf8');
  const runtime = () => { const c = vm.createContext({ console }); vm.runInContext(source, c); return c; };
  const plain = value => JSON.parse(JSON.stringify(value));
  const dimensions = ['deviceCategory', 'country', 'pagePath'];
  const metrics = ['screenPageViews', 'publisherAdImpressions', 'totalAdRevenue'];
  const period = { start: '2026-10-07', end: '2026-10-13' };
  const prior = { start: '2026-09-30', end: '2026-10-06' };
  const row = (page, pv, revenue, country = 'Japan', device = 'desktop') => ({ deviceCategory: device, country, pagePath: page, screenPageViews: pv, publisherAdImpressions: pv * 2, totalAdRevenue: revenue });
  function response(rows, total = rows.length, metadata = {}) {
    return { rowCount: total, dimensionHeaders: dimensions.map(name => ({ name })), metricHeaders: metrics.map(name => ({ name })),
      metadata: { timeZone: 'Asia/Tokyo', currencyCode: 'JPY', ...metadata },
      rows: rows.map(r => ({ dimensionValues: dimensions.map(name => ({ value: r[name] })), metricValues: metrics.map(name => ({ value: String(r[name]) })) })) };
  }
  function pair(before, after) {
    return [{ rows: before, period: prior, state: 'OK', metadata: { timeZone: 'Asia/Tokyo', currencyCode: 'JPY' } },
      { rows: after, period, state: 'OK', metadata: { timeZone: 'Asia/Tokyo', currencyCode: 'JPY' } }];
  }

  test('同曜日・非重複窓と3日待ちを月末・うるう年でも維持する', () => {
    const c = runtime();
    assert.deepEqual(plain(c.playPointMeasurementPeriods_('2026-10-16', 7)), { current: period, previous: prior });
    assert.equal(c.playPointMeasurementPeriods_('2024-03-03', 7).current.end, '2024-02-29');
    for (const args of [['2026-02-30', 7], ['2026-10-16', 30], ['2026-10-16', 7, '2026-10-15']]) assert.throws(() => c.playPointMeasurementPeriods_(...args));
  });
  test('既存Google JSON helperへは文字列化前のpayloadを渡す', () => {
    const c = runtime(); let request;
    c.playPointP12GoogleJson_ = (url, options) => { request = { url, options }; return {}; };
    c.playPointMeasurementRequest_(':runReport', { limit: '2' });
    assert.equal(typeof request.options.payload, 'object');
    assert.equal(request.options.payload.limit, '2');
    assert.equal(request.options.method, 'post');
    c.playPointMeasurementRequest_('/customDimensions?pageSize=200', null, true);
    assert.equal(request.options.method, 'get');
    assert.equal(request.url, 'https://analyticsadmin.googleapis.com/v1beta/properties/489079798/customDimensions?pageSize=200');
  });
  test('別プロパティや別ブックでは診断も書き込みも開始しない', () => {
    const c = runtime();
    c.resolveAndRememberSpreadsheet_ = () => ({ getId: () => 'other' });
    c.playPointP12GetGa4PropertyId_ = () => '489079798';
    c.playPointP12GoogleJson_ = () => { throw new Error('呼んではいけない'); };
    assert.throws(() => c.playPointMeasurementGuard_(), /PlayPoint以外/);
    c.resolveAndRememberSpreadsheet_ = () => ({ getId: () => c.PLAYPOINT_MEASUREMENT_REVIEW.spreadsheet });
    c.playPointP12GetGa4PropertyId_ = () => 'other';
    assert.throws(() => c.playPointMeasurementGuard_(), /PlayPoint以外/);
  });
  test('複数ページの行数・列順を検証し、全取得後だけ比較に使う', () => {
    const c = runtime(), calls = [];
    c.PLAYPOINT_MEASUREMENT_REVIEW = { ...c.PLAYPOINT_MEASUREMENT_REVIEW, pageSize: 2 };
    const rows = [row('/a', 1, 1), row('/b', 2, 2), row('/c', 3, 3)];
    const result = c.playPointMeasurementReport_(period, dimensions, metrics, null, (_url, body) => {
      calls.push(plain(body)); const offset = Number(body.offset); return response(rows.slice(offset, offset + 2), 3);
    });
    assert.equal(result.state, 'OK'); assert.equal(result.rows.length, 3);
    assert.deepEqual(calls.map(r => r.offset), ['0', '2']);
    assert(calls.every(r => r.currencyCode === 'JPY'));
  });
  test('欠落・不正数値・真偽値・非整数の回数を0へ丸めない', () => {
    const c = runtime();
    for (const raw of ['', ' ', undefined, null, false, true, 'bad', '-1', '1.5']) {
      const report = response([row('/a', 1, 1)]); report.rows[0].metricValues[0].value = raw;
      assert.throws(() => c.playPointMeasurementReport_(period, dimensions, metrics, null, () => report));
    }
    const result = c.playPointMeasurementReport_(period, dimensions, metrics, null, () => response([row('/a', 0, 0)]));
    assert.equal(result.rows[0].screenPageViews, 0); assert.equal(c.playPointMeasurementTotals_(result.rows).revenuePer1000PV, null);
  });
  test('途中欠落・重複・列変更・時差・通貨変更を拒否する', () => {
    const c = runtime();
    const bad = [response([], 1), response([row('/a', 1, 1), row('/a', 1, 1)]), response([], 0, { timeZone: 'UTC' }), response([], 0, { currencyCode: 'USD' })];
    const header = response([]); header.metricHeaders.reverse(); bad.push(header);
    for (const report of bad) assert.throws(() => c.playPointMeasurementReport_(period, dimensions, metrics, null, () => report));
  });
  test('取得中の件数変化と過大レポートを採用しない', () => {
    const c = runtime(); c.PLAYPOINT_MEASUREMENT_REVIEW = { ...c.PLAYPOINT_MEASUREMENT_REVIEW, pageSize: 1 };
    let call = 0;
    assert.throws(() => c.playPointMeasurementReport_(period, dimensions, metrics, null, () => response([row('/' + call, 1, 1)], ++call === 1 ? 2 : 3)), /件数変化/);
    assert.throws(() => c.playPointMeasurementReport_(period, dimensions, metrics, null, () => response([], 50001)), /上限超過/);
  });
  test('しきい値・other・sampling・収益閲覧制限があれば構成補正しない', () => {
    const c = runtime();
    for (const meta of [{ subjectToThresholding: true }, { dataLossFromOtherRow: true }, { samplingMetadatas: [{}] }, { schemaRestrictionResponse: { activeMetricRestrictions: [{}] } }]) {
      const report = c.playPointMeasurementReport_(period, dimensions, metrics, null, () => response([row('/a', 1, 1)], 1, meta));
      assert.equal(report.state, 'RESTRICTED');
      assert.equal(c.playPointMeasurementCompare_(report, report, 'desktop').state, 'RESTRICTED');
    }
  });
  test('比較期間の重複・長さの不一致を拒否する', () => {
    const c = runtime();
    const [before, after] = pair([], []);
    assert.throws(() => c.playPointMeasurementCompare_(before, before, 'desktop'), /重複/);
    after.period = { start: '2026-10-07', end: '2026-10-12' };
    assert.throws(() => c.playPointMeasurementCompare_(before, after, 'desktop'), /日数不一致/);
  });
  test('構成比だけ変わった時は単価改善と誤判定しない', () => {
    const c = runtime();
    const result = c.playPointMeasurementCompare_(...pair([row('/a', 90, 90), row('/b', 10, 20)], [row('/a', 10, 10), row('/b', 90, 180)]), 'desktop');
    assert.equal(result.previous.revenuePer1000PV, 1100); assert.equal(result.current.revenuePer1000PV, 1900);
    assert.equal(result.standardizedCurrentRPM, 1100); assert.equal(result.withinDifference, 0); assert.equal(result.mixDifference, 800);
  });
  test('同じ構成なら層内単価差を保ち、分解後の差が元の差に一致する', () => {
    const c = runtime();
    const result = c.playPointMeasurementCompare_(...pair([row('/a', 90, 90), row('/b', 10, 20)], [row('/a', 90, 180), row('/b', 10, 40)]), 'desktop');
    assert.equal(result.standardizedCurrentRPM, 2200); assert.equal(result.withinDifference, 1100); assert.equal(result.mixDifference, 0);
    assert.equal(result.withinDifference + result.mixDifference, result.commonCurrentRPM - result.commonBeforeRPM);
  });
  test('新規・消失・未設定の層を同条件の成功例へ混ぜず、カバー率を残す', () => {
    const c = runtime();
    const result = c.playPointMeasurementCompare_(...pair([row('/a', 10, 1), row('/lost', 10, 1)], [row('/a', 10, 2), row('/new', 20, 2), row('(not set)', 10, 1)]), 'desktop');
    assert.equal(result.commonStrata, 1); assert.equal(result.newStrata, 1); assert.equal(result.lostStrata, 1);
    assert.equal(result.beforeCoverage, 0.5); assert.equal(result.afterCoverage, 0.25);
    assert.equal(c.playPointMeasurementCompare_(...pair([], []), 'desktop').state, 'NO_COMMON_STRATA');
  });
  test('GA4管理APIが読めない時は未登録と断定しない・内部除外や実送信は確認待ち', () => {
    const c = runtime(); let grid;
    c.playPointMeasurementGuard_ = () => ({});
    c.Utilities = { formatDate: () => '2026-10-16' };
    c.playPointMeasurementWrite_ = (_ss, _title, rows) => { grid = rows; };
    c.playPointMeasurementRequest_ = (_url, _body, admin) => {
      if (admin) throw new Error('403');
      return { dimensions: c.PLAYPOINT_MEASUREMENT_REVIEW.parameters.map(p => ({ apiName: 'customEvent:' + p[1] })) };
    };
    c.playPointMeasurementReport_ = () => ({ rows: [], state: 'OK' });
    c.capturePlayPointMeasurementSettingsAudit();
    assert.equal(grid[2][1], 'UNAVAILABLE'); assert.equal(grid[2][6], 'NO_OBSERVATIONS');
    assert.equal(grid.find(r => r[0] === '内部アクセス除外')[6], 'MANUAL_CONFIRM_REQUIRED');
    assert.equal(grid.find(r => r[0] === '本番実送信')[6], 'MANUAL_CONFIRM_REQUIRED');
  });
  test('一項目の照会失敗で別項目を停止しない・カスタム定義は読み取るだけ', () => {
    const c = runtime(); let grid, attempts = 0;
    c.playPointMeasurementGuard_ = () => ({}); c.Utilities = { formatDate: () => '2026-10-16' };
    c.playPointMeasurementWrite_ = (_ss, _title, rows) => { grid = rows; };
    c.playPointMeasurementRequest_ = (url, body, admin) => {
      assert.equal(body == null, true);
      if (admin) return { customDimensions: [{ parameterName: 'error_type', scope: 'EVENT' }] };
      return { dimensions: c.PLAYPOINT_MEASUREMENT_REVIEW.parameters.map(p => ({ apiName: 'customEvent:' + p[1] })) };
    };
    c.playPointMeasurementReport_ = () => { if (++attempts === 1) throw new Error('error'); return { rows: [], state: 'OK' }; };
    c.capturePlayPointMeasurementSettingsAudit();
    assert.equal(attempts, 7); assert.equal(grid[2][6], 'REPORT_FAILED'); assert.equal(grid[3][6], 'NO_OBSERVATIONS');
  });
  test('収益レポートの途中失敗では直前の正常シートを上書きしない', () => {
    const c = runtime(); let writes = 0, calls = 0;
    c.playPointMeasurementGuard_ = () => ({}); c.Utilities = { formatDate: () => '2026-10-16' };
    c.playPointMeasurementWrite_ = () => { writes++; };
    c.playPointMeasurementReport_ = () => { if (++calls === 2) throw new Error('停止'); return {}; };
    assert.throws(() => c.capturePlayPointRevenueLikeForLike(), /停止/); assert.equal(writes, 0);
  });
})();
