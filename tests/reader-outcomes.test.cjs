'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../scripts/playpoint-analytics-maintenance.gs'), 'utf8');
function runtime(extra = {}) {
  const c = vm.createContext({ console, playPointP12ErrorText_: e => e.message,
    playPointP12NormalizePage_: p => p.replace(/\/$/, ''),
    playPointP12LiteralRow_: r => r.map(v => typeof v === 'string' && /^[=]/.test(v) ? "'" + v : v),
    playPointP12ShiftIsoDate_: (d,n) => new Date(Date.parse(d+'T00:00:00Z')+n*86400000).toISOString().slice(0,10), ...extra });
  vm.runInContext(source,c); return c;
}
test('未登録パラメータはAPIを呼ばず待機し、取得0件と区別する',()=>{
  const c=runtime(); let calls=0;
  const waiting=c.playPointReaderSource_(()=>{calls++;return {rows:[]};},['customEvent:component'],{});
  assert.equal(waiting.state,'WAITING_DEFINITION'); assert.equal(calls,0);
  const empty=c.playPointReaderSource_(()=>{calls++;return {rows:[]};},['customEvent:component'],{'customEvent:component':true});
  assert.equal(empty.state,'OK');assert.equal(empty.rows.length,0);assert.equal(calls,1);
});

test('既存のゲーム計算機と計算後リンクを同じ集計で取り、人数比を完了率と呼ばない',()=>{
 const c=runtime();
 for(const name of ['game_form_started','game_calculation_completed','result_related_article_clicked','result_decision_link_clicked']){
  assert(c.PLAYPOINT_READER_OUTCOMES.events.includes(name));assert(c.PLAYPOINT_EVENT_DAILY.events.includes(name));
 }
 const grid=c.playPointReaderBuildGrid_({start:'2026-09-07',end:'2026-10-06'},[],{
  EVENTS:{state:'OK',detail:'ok',rows:[{eventName:'game_calculation_completed',eventCount:15,totalUsers:10}]}},'now');
 assert.equal(grid[9][2],'game_calculation_completed');assert.equal(grid[9][3],15);assert.equal(grid[9][4],10);
 assert.match(grid[5][1],/疑問解決.*代用しない/);
});
test('しきい値で制限された値は完全取得とはしない',()=>{
  const c=runtime(); assert.equal(c.playPointReaderSource_(()=>({rows:[{eventCount:4}],restricted:true}),[],{}).state,'RESTRICTED');
  assert.equal(c.playPointReaderSource_(()=>{throw Error('quota');},[],{}).state,'ERROR');
  assert.equal(c.playPointReaderSource_(()=>({rows:[{eventCount:4}],parameterMissing:true}),[],{}).state,'PARAMETER_PARTIAL');
});

test('パラメータ取得割合は行数や人数でなく返却イベント回数を分母にする',()=>{
  const c=runtime({playPointP12Ga4Report_:()=>({}),playPointP12ParseGa4Rows_:()=>[
    {'customEvent:component':'menu',eventCount:80,totalUsers:10},
    {'customEvent:component':'(not set)',eventCount:20,totalUsers:15}]});
  const r=c.playPointReaderSource_(()=>c.playPointReaderReport_('p',{},['customEvent:component'],['eventCount','totalUsers']),[],{});
  assert.equal(r.state,'PARAMETER_PARTIAL'); assert.equal(r.coverage.available,80);
  assert.match(r.detail,/80\/100回（80.0%）/); assert.match(r.detail,/人数の割合ではない/);
});

test('各パラメータの欠落を分け、検索結果0件を有効な観測として保持する',()=>{
  const c=runtime({playPointP12Ga4Report_:()=>({}),playPointP12ParseGa4Rows_:()=>[
    {'customEvent:intent_id':'other','customEvent:results_count':0,eventCount:4},
    {'customEvent:intent_id':'(not set)','customEvent:results_count':'2',eventCount:3},
    {'customEvent:intent_id':'(not set)','customEvent:results_count':'(not set)',eventCount:12}]});
  const r=c.playPointReaderReport_('p',{},['customEvent:intent_id','customEvent:results_count'],['eventCount']);
  assert.equal(r.coverage.total,19);assert.equal(r.coverage.available,4);
  assert.equal(r.coverage.byParameter['customEvent:intent_id'].missing,15);
  assert.equal(r.coverage.byParameter['customEvent:results_count'].missing,12);
  assert.equal(r.coverage.byParameter['customEvent:results_count'].available,7);
  assert.equal(c.playPointReaderParameterMissing_(0),false);
});

test('分類の取得済み行と記事クリックを部分欠落に巻き込まず、未取得件数を0件と呼ばない',()=>{
  const c=runtime(), params=['customEvent:intent_id','customEvent:results_count'];
  const grid=c.playPointReaderBuildGrid_({start:'2026-09-11',end:'2026-10-10'},[],{
    SEARCH:{state:'PARAMETER_PARTIAL',detail:'partial',parameters:params,rows:[
      {pagePath:'/blog/',eventCount:1,'customEvent:intent_id':'other','customEvent:results_count':0},
      {pagePath:'/blog/',eventCount:15,'customEvent:intent_id':'(not set)','customEvent:results_count':'(not set)'},
      {pagePath:'/en/articles/',eventCount:1,'customEvent:intent_id':'(not set)','customEvent:results_count':'0'}]},
    ARTICLE_ACTIONS:{state:'OK',detail:'ok',rows:[{pagePath:'/articles/a.html',eventName:'article_navigation_click',eventCount:5,totalUsers:4}]}},'now');
  assert.equal(grid[9][1],'OK');assert.match(grid[9][11],/検索結果0件/);
  assert.equal(grid[10][1],'PARAMETER_PARTIAL');assert.match(grid[10][11],/未取得（0件ではない）.*intent_id, results_count/);
  assert.equal(grid[11][1],'PARAMETER_PARTIAL');assert.match(grid[11][11],/検索結果0件.*未設定: intent_id/);
  assert.equal(grid[13][1],'OK');assert.equal(grid[13][4],4);assert.match(grid[13][11],/重複.*足さない/);
});

test('日別の初取得と最終欠落を観測として示し、登録日や利用者人数に置き換えない',()=>{
  const c=runtime();const params=['customEvent:component'];
  const source={state:'PARAMETER_PARTIAL',detail:'取得 6/36回',parameters:params,rows:[
    {date:'20261008',pagePath:'/articles/a.html','customEvent:component':'related',eventCount:6},
    {date:'20260915',pagePath:'/articles/a.html','customEvent:component':'(not set)',eventCount:30}]};
  const grid=c.playPointReaderParameterAuditGrid_({start:'2026-09-11',end:'2026-10-10'},{NAV_COMPONENT:source},'now');
  assert.match(grid[3][1],/初取得日は定義の登録日ではない/);
  assert.match(grid[6][7],/初取得観測日: 2026-10-08.*最終未設定観測日: 2026-09-15/);
  assert.equal(grid[7][6],'OK');assert.equal(grid[7][5],6);
  assert.equal(grid[8][6],'PARAMETER_PARTIAL');assert.equal(grid[8][5],30);
  assert(grid.every(row=>row.length===8));
  source.rows[0].date='20261011';
  assert.throws(()=>c.playPointReaderParameterAuditGrid_({start:'2026-09-11',end:'2026-10-10'},{NAV_COMPONENT:source},'now'),/期間外/);
});

test('手動診断は一項目の定義欠落でも標準ページと他の既存項目を取得する',()=>{
  const c=runtime({playPointP12NowText_:()=> '2026-10-13 14:00:00',
    playPointP12BuildGa4Period_:()=>({start:'2026-09-11',end:'2026-10-10'}),
    playPointP12GetGa4PropertyId_:()=> 'p',
    playPointP12GoogleJson_:()=>({dimensions:[{apiName:'customEvent:results_count'}]})});
  const requested=[];
  c.playPointReaderReport_=(_p,_period,dims)=>{requested.push(Array.from(dims));return {rows:[],parameters:dims.filter(d=>d.startsWith('customEvent:'))};};
  c.playPointReaderParameterAuditGrid_=(_period,sources)=>{
    assert.equal(sources.PAGE_EVENTS.state,'OK');assert.equal(sources.SEARCH_RESULTS.state,'OK');
    assert.equal(sources.SEARCH_INTENT.state,'WAITING_DEFINITION');assert.equal(sources.NAV_COMPONENT.state,'WAITING_DEFINITION');
    throw Error('diagnostic reached');
  };
  assert.throws(()=>c.capturePlayPointReaderParameterAudit(),/diagnostic reached/);
  assert.deepEqual(requested,[['date','pagePath','eventName'],['date','pagePath','customEvent:results_count']]);
});

test('抽出された順序ファネルを全数の完了率として使わない',()=>{
  const c=runtime({playPointP12GoogleJson_:()=>({funnelTable:{dimensionHeaders:[{name:'funnelStepName'}],
    metricHeaders:[{name:'activeUsers'}],metadata:{samplingMetadatas:[{samplesReadCount:'10',samplingSpaceSize:'100'}]},rows:[]}}),
    playPointP12ParseGa4Rows_:()=>[]});
  assert.equal(c.playPointReaderSource_(()=>c.playPointReaderOrderedFunnel_('p',{}),[],{}).state,'RESTRICTED');
});

test('記事台帳取得の障害でも読者のGA4計測を止めず、役割ラベルを未取得と示す',()=>{
  const c=runtime({resolveAndRememberSpreadsheet_:()=>({}),playPointP12BuildGa4Period_:()=>({start:'2026-09-07',end:'2026-10-06'}),
    playPointP12NowText_:()=> '2026-10-09 09:00:00',playPointP12GetGa4PropertyId_:()=> 'p',
    playPointP12GoogleJson_:()=>({}),formatDateSafe_:v=>v});
  c.playPointMaintenanceLoadInventory_=()=>{throw Error('GitHub unavailable');};
  let calls=0;
  c.playPointReaderReport_=c.playPointReaderCohorts_=c.playPointReaderOrderedFunnel_=()=>{calls++;return {rows:[]};};
  c.playPointReaderBuildGrid_=(_period,inventory,sources)=>{
    assert.equal(inventory.length,0);assert.equal(sources.INVENTORY.state,'ERROR');
    assert.equal(sources.EVENTS.state,'OK'); assert.equal(sources.FUNNEL.state,'OK');throw Error('metrics reached');
  };
  assert.throws(()=>c.playPointCaptureReaderOutcomes_(),/metrics reached/);assert(calls>=4);
});
test('公開台帳の言語・役割を結合し、ページ再訪と入口コホートを区別する',()=>{
  const c=runtime();const grid=c.playPointReaderBuildGrid_({start:'2026-09-03',end:'2026-10-02'},
    [{path:'/ko/articles/a.html',role:'troubleshooting',locale:'KO'}],{
      READING:{state:'OK',detail:'ok',rows:[{pagePath:'/ko/articles/a.html',newVsReturning:'returning',screenPageViews:20,activeUsers:5}]},
      SEARCH:{state:'WAITING_DEFINITION',detail:'pending',rows:[]}
    },'2026-10-05 18:00');
  assert.equal(grid[9][7],'KO');assert.equal(grid[9][8],'troubleshooting');assert.equal(grid[9][4],5);
  assert.match(grid[9][11],/初回記事への帰属ではない/);assert.equal(grid[10][4],'');
  assert(grid.every(r=>r.length===12));
});
test('解決・行をまたぐユニーク数・空欄の誤解を避け、シート数式注入を防ぐ',()=>{
  const c=runtime(); const grid=c.playPointReaderBuildGrid_({start:'2026-09-03',end:'2026-10-02'},[],{
    ERRORS:{state:'ERROR',detail:'=IMPORTXML("bad")',rows:[]}},'2026-10-05');
  assert.match(grid[5][1],/代用しない/);assert.match(grid[2][1],/足して全体人数にしない/);
  assert.equal(grid[1][1],'2026-09-03 ～ 2026-10-02');
  assert.equal(grid[8][11].charAt(0),"'");assert.equal(grid[8][9],'');
});
test('28日が経過した獲得日だけを追跡し、日次7・28日の率を取得する',()=>{
  let request;const c=runtime({playPointP12Ga4Report_:(_,b)=>{request=b;return {};},
    playPointP12ParseGa4Rows_:()=>[{cohort:'a',cohortNthDay:'0000',cohortActiveUsers:10,cohortTotalUsers:10},{cohort:'a',cohortNthDay:'0007',cohortActiveUsers:2,cohortTotalUsers:10},{cohort:'a',cohortNthDay:'0028',cohortActiveUsers:1,cohortTotalUsers:10},{cohort:'a',cohortNthDay:'0001',cohortActiveUsers:4,cohortTotalUsers:10}]});
  const r=c.playPointReaderCohorts_('p',{end:'2026-10-02'});
  assert.equal(request.cohortSpec.cohorts.length,7);assert.equal(request.cohortSpec.cohorts[6].dateRange.endDate,'2026-09-04');
  assert.equal(request.dateRanges,undefined);assert.equal(r.rows.length,3);
});
test('順序付きファネルは閉じて24時間以内の同一利用者を評価する',()=>{
  let request;const c=runtime({playPointP12GoogleJson_:(_,o)=>{request=o.payload;return {funnelTable:{dimensionHeaders:[{name:'funnelStepName'}],metricHeaders:[{name:'activeUsers'}],rows:[]}};},playPointP12ParseGa4Rows_:()=>[]});
  const r=c.playPointReaderOrderedFunnel_('p',{start:'2026-09-03',end:'2026-10-02'});
  assert.equal(request.funnel.isOpenFunnel,false);assert.equal(request.funnel.steps[1].withinDurationFromPriorStep,'86400s');assert.equal(r.rows.length,0);
});
test('未取得の順序付きファネルを独立イベント人数で埋めない',()=>{
  const c=runtime({playPointP12GoogleJson_:()=>({})});
  assert.throws(()=>c.playPointReaderOrderedFunnel_('p',{}),/応答形式/);
});
test('実APIの重複ヘッダーと短い値配列で実測人数を0に上書きしない',()=>{
  const p1=fs.readFileSync(path.join(__dirname,'../scripts/playpoint-analytics-p1p2.gs'),'utf8');
  const names=['activeUsers','funnelStepCompletionRate','funnelStepAbandonments','funnelStepAbandonmentRate'];
  const table={dimensionHeaders:[{name:'funnelStepName'}],metricHeaders:names.concat(names).map(name=>({name})),
    rows:[{dimensionValues:[{value:'1. 開始'}],metricValues:['215','.85581395348837208','31','.14418604651162792'].map(value=>({value}))},
      {dimensionValues:[{value:'2. 成功'}],metricValues:['184','1','0','0'].map(value=>({value}))}]};
  const c=runtime();vm.runInContext(p1,c);c.playPointP12GoogleJson_=()=>({funnelTable:table});
  assert.deepEqual(Array.from(c.playPointReaderOrderedFunnel_('p',{}).rows,r=>r.activeUsers),[215,184]);
  table.rows[0].metricValues.push({value:'216'});
  assert.throws(()=>c.playPointReaderOrderedFunnel_('p',{}),/欠落・競合/);
  table.rows[0].metricValues=[];
  assert.throws(()=>c.playPointReaderOrderedFunnel_('p',{}),/欠落・競合/);
});
test('旧期間欄の補足文を移行でき、より新しい集計は上書きしない',()=>{
  function run(previous) {
    const c=runtime({withScriptLock_:fn=>fn(),playPointP12NowText_:()=> '2026-10-05 20:00:00',
      resolveAndRememberSpreadsheet_:()=>({getSheetByName:()=>({getRange:()=>({getValue:()=> '2026-09-03 ～ 2026-10-02'})})}),
      playPointP12BuildGa4Period_:()=>({start:'2026-09-03',end:'2026-10-02'}),
      playPointP12GetGa4PropertyId_:()=> 'p',playPointP12GoogleJson_:()=>({}),
      playPointP12EnsureSheet_:()=>({getRange:()=>({getValue:()=>previous}),getLastRow:()=>0}),
      playPointP12EnsureRows_:()=>{throw Error('write reached');}});
    c.playPointMaintenanceLoadInventory_=()=>[];
    c.playPointReaderReport_=c.playPointReaderCohorts_=c.playPointReaderOrderedFunnel_=()=>({rows:[]});
    return ()=>c.playPointCaptureReaderOutcomes_();
  }
  assert.throws(run('2026-09-03 ～ 2026-10-02。人数の補足'),/write reached/);
  assert.throws(run('2026-09-03 ～ 2026-10-02'),/write reached/);
  assert.throws(run('2026-09-04 ～ 2026-10-03。人数の補足'),/より新しい/);
});
