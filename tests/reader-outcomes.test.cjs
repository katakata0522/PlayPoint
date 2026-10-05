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
test('しきい値で制限された値は完全取得とはしない',()=>{
  const c=runtime(); assert.equal(c.playPointReaderSource_(()=>({rows:[{eventCount:4}],restricted:true}),[],{}).state,'RESTRICTED');
  assert.equal(c.playPointReaderSource_(()=>{throw Error('quota');},[],{}).state,'ERROR');
  assert.equal(c.playPointReaderSource_(()=>({rows:[{eventCount:4}],parameterMissing:true}),[],{}).state,'PARAMETER_PARTIAL');
});
test('公開台帳の言語・役割を結合し、ページ再訪と入口コホートを区別する',()=>{
  const c=runtime();const grid=c.playPointReaderBuildGrid_({start:'2026-09-03',end:'2026-10-02'},
    [{path:'/ko/articles/a.html',role:'troubleshooting',locale:'KO'}],{
      READING:{state:'OK',detail:'ok',rows:[{pagePath:'/ko/articles/a.html',newVsReturning:'returning',screenPageViews:20,activeUsers:5}]},
      SEARCH:{state:'WAITING_DEFINITION',detail:'pending',rows:[]}
    },'2026-10-05 18:00');
  assert.equal(grid[9][3],'KO');assert.equal(grid[9][4],'troubleshooting');assert.equal(grid[9][9],5);
  assert.match(grid[9][11],/初回記事への帰属ではない/);assert.equal(grid[10][9],'');
  assert(grid.every(r=>r.length===12));
});
test('解決・行をまたぐユニーク数・空欄の誤解を避け、シート数式注入を防ぐ',()=>{
  const c=runtime(); const grid=c.playPointReaderBuildGrid_({start:'2026-09-03',end:'2026-10-02'},[],{
    ERRORS:{state:'ERROR',detail:'=IMPORTXML("bad")',rows:[]}},'2026-10-05');
  assert.match(grid[5][1],/代用しない/);assert.match(grid[1][2],/足して全体人数にしない/);
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
