'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../scripts/playpoint-analytics-maintenance.gs'), 'utf8');

function runtime(extra = {}) {
  const c = vm.createContext({
    console,
    playPointP12ErrorText_: error => error.message,
    playPointP12ShiftIsoDate_: (day, delta) => new Date(Date.parse(day + 'T00:00:00Z') + delta * 86400000).toISOString().slice(0, 10),
    playPointP12LiteralRow_: row => row.map(value => typeof value === 'string' && value.startsWith('=') ? "'" + value : value),
    ...extra
  });
  vm.runInContext(source, c);
  return c;
}

test('同曜日7日比較は10月8日時点で9月23〜29日と9月30日〜10月6日を選ぶ', () => {
  const weeks = Array.from(runtime().playPointEventDailyWeeks_('2026-10-07'), x => [x.start, x.end]);
  assert.deepEqual(weeks, [['2026-09-23','2026-09-29'], ['2026-09-30','2026-10-06']]);
});

test('GA4の日付を検証し、存在しない日付と外れた期間を集計しない', () => {
  const c = runtime();
  assert.equal(c.playPointEventDailyIso_('20261007'), '2026-10-07');
  assert.throws(() => c.playPointEventDailyIso_('20260231'), /実在/);
  assert.throws(() => c.playPointEventDailyIso_('2026-10-07'), /不正/);
  c.playPointReaderReport_ = () => ({rows: [{date:'20261001',eventName:'search',eventCount:2,totalUsers:1}]});
  const period = {start:'2026-09-23',end:'2026-10-07'};
  assert.equal(c.playPointEventDailySource_('p',period,['date','eventName'],['search'],{}).rows[0].isoDate, '2026-10-01');
  c.playPointReaderReport_ = () => ({rows: [{date:'20261008',eventName:'search',eventCount:2,totalUsers:1}]});
  assert.equal(c.playPointEventDailySource_('p',period,['date','eventName'],['search'],{}).state, 'ERROR');
});

test('登録前の帰属カスタム定義を勝手に0件にせず、GA4 APIを呼ばない', () => {
  let calls=0;
  const c=runtime({playPointReaderReport_:()=>{calls++;return {rows:[]};}});
  const s=c.playPointEventDailySource_('p',{start:'2026-09-23',end:'2026-10-07'},
    ['date','eventName','customEvent:entry_source_path'],['calculator_form_started'],{});
  assert.equal(s.state,'WAITING_DEFINITION');
  assert.equal(calls,0);
});

test('日内ユーザーと週のユニーク人数を混同せず、正常な0と未取得を分ける', () => {
  const c=runtime();
  const period={start:'2026-09-23',end:'2026-10-07'};
  const data={EVENTS:{state:'OK',detail:'OK',rows:[
    {isoDate:'2026-10-01',eventName:'article_to_calculator_clicked',eventCount:3,totalUsers:2}
  ]},ARTICLE:{state:'WAITING_DEFINITION',detail:'pending',rows:[]},
  ATTRIBUTION:{state:'WAITING_DEFINITION',detail:'pending',rows:[]}};
  const grid=c.playPointEventDailyGrid_(period,'2026-10-08 18:00:00',data);
  const prev=grid.find(r=>r[0]==='前週'&&r[2]==='article_to_calculator_clicked');
  const curr=grid.find(r=>r[0]==='直近完了週'&&r[2]==='article_to_calculator_clicked');
  const missing=grid.find(r=>r[0]==='EVENTS'&&r[1]==='2026-10-02'&&r[2]==='article_to_calculator_clicked');
  assert.equal(prev[3],0); assert.equal(curr[3],3);
  assert.equal(curr[4],''); // 週のユニークユーザーは日別人数の和から推測しない
  assert.equal(missing[3],0); assert.equal(missing[4],0);
  const bad={...data, EVENTS:{state:'RESTRICTED',detail:'threshold',rows:[]}};
  const restricted=c.playPointEventDailyGrid_(period,'2026-10-08',bad);
  assert.equal(restricted.find(r=>r[0]==='EVENTS'&&r[1]==='2026-10-02'&&r[2]==='search')[3],'');
});

test('不正な重複（日付×イベント名）は合算せずに検出する', () => {
  const c=runtime(), period={start:'2026-10-01',end:'2026-10-07'};
  const rows=[{isoDate:'2026-10-02',eventName:'search',eventCount:1,totalUsers:1},
    {isoDate:'2026-10-02',eventName:'search',eventCount:1,totalUsers:1}];
  assert.throws(()=>c.playPointEventDailyGrid_(period,'today',{
    EVENTS:{state:'OK',detail:'',rows},
    ARTICLE:{state:'OK',detail:'',rows:[]},
    ATTRIBUTION:{state:'OK',detail:'',rows:[]}
  }), /重複行/);
});

test('既存のP1週次ジョブから独立イベント更新を呼び、失敗を黙殺しない', () => {
  const c=runtime();
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../scripts/playpoint-analytics-p1p2.gs'),'utf8'),c);
  c.playPointP12GetSpreadsheet_=()=>({});
  c.playPointP12RunStage_=stage=>({stage,status:'OK'});
  c.playPointP12Log_=()=>{};
  c.capturePlayPointReaderOutcomes=()=>({state:'OK'});
  c.refreshPlayPointArticlePortfolio=()=>({rows:1});
  c.capturePlayPointEventDailyReview=()=>({state:'OK',rows:350});
  assert(c.capturePlayPointAnalyticsP1P2().some(r=>r.stage==='EVENT_DAILY'&&r.status==='OK'));
  c.capturePlayPointEventDailyReview=()=>{throw Error('GA4 unavailable');};
  assert.throws(()=>c.capturePlayPointAnalyticsP1P2(),/EVENT_DAILY=.*GA4 unavailable/);
});


test('機能追加イベントを日次・30日集計へ統合し、未観測を実測ゼロ扱いしない', () => {
  const c=runtime(), period={start:'2026-10-01',end:'2026-10-14'};
  for(const name of ['purchase_comparison_completed','calendar_reminder_added','pwa_install_accepted',
    'share_url_copied','widget_referral_landed','web_vital','article_decision_action','article_resolution_action','article_reference_action']){
    assert(c.PLAYPOINT_EVENT_DAILY.events.includes(name));
    assert(c.PLAYPOINT_READER_OUTCOMES.events.includes(name));
  }
  const data={EVENTS:{state:'OK',detail:'',rows:[
    {isoDate:'2026-10-13',eventName:'purchase_comparison_completed',eventCount:3,totalUsers:2}
  ]},ARTICLE:{state:'OK',rows:[]},ATTRIBUTION:{state:'OK',rows:[]}};
  const grid=c.playPointEventDailyGrid_(period,'2026-10-15',data);
  const hit=grid.find(r=>r[0]==='EVENTS'&&r[1]==='2026-10-13'&&r[2]==='purchase_comparison_completed');
  assert.equal(hit[3],3);assert.equal(hit[4],2);
  const miss=grid.find(r=>r[0]==='EVENTS'&&r[1]==='2026-10-13'&&r[2]==='web_vital');
  assert.equal(miss[3],'');assert.equal(miss[6],'NO_EVENT_ROW');
  assert.equal(grid.find(r=>r[0]==='直近完了週'&&r[2]==='web_vital')[3],'');
  const reader=c.playPointReaderBuildGrid_(period,[],{EVENTS:{state:'OK',rows:[],detail:''}},'2026-10-15');
  assert.equal(reader.find(r=>r[2]==='calendar_reminder_added')[1],'NO_EVENT_ROW');
  assert.equal(c.PLAYPOINT_EVENT_DAILY.historyDays,63);
  assert.equal(c.PLAYPOINT_EVENT_DAILY.detailDays,35);
});

test('役割別成果は確認済み開始日と同じ期間の母数を使い、未確認・別役割・欠測・小標本を区別',()=>{
  const c=runtime(), period={start:'2026-10-01',end:'2026-10-30'};
  const articles=[
    {path:'/articles/a.html',locale:'JP',role:'decision_support',listed:true},
    {path:'/articles/b.html',locale:'JP',role:'troubleshooting',listed:true},
    {path:'/articles/c.html',locale:'JP',role:'reference',listed:true},
    {path:'/articles/d.html',locale:'JP',role:'retention',listed:true},
    {path:'/articles/e.html',locale:'JP',role:'hold',listed:false},
    {path:'/articles/f.html',locale:'JP',role:'calculator_bridge',listed:true}
  ];
  const source={state:'OK',rows:[
    {pagePath:articles[0].path,eventName:'page_view',totalUsers:100},
    {pagePath:articles[0].path,eventName:'article_decision_action',totalUsers:12},
    {pagePath:articles[1].path,eventName:'page_view',totalUsers:20},
    {pagePath:articles[2].path,eventName:'page_view',totalUsers:10},
    {pagePath:articles[2].path,eventName:'article_reference_action',totalUsers:11},
    {pagePath:articles[3].path,eventName:'page_view',totalUsers:15},
    {pagePath:articles[4].path,eventName:'page_view',totalUsers:2}
  ]};
  const reading={state:'OK',rows:[{pagePath:articles[3].path,newVsReturning:'returning',activeUsers:2}]};
  const pending=c.playPointGrowthRoleGrid_(period,articles,source,reading,'2026-11-02','');
  assert.equal(pending.grid[6][5],12);assert.equal(pending.grid[6][6],'');
  assert.equal(pending.grid[6][7],'COVERAGE_UNVERIFIED');
  assert.equal(pending.grid[7][5],'');
  const covered=c.playPointGrowthRoleGrid_(period,articles,source,reading,'2026-11-02','2026-09-30');
  assert.equal(covered.grid[6][6],.12);assert.equal(covered.grid[6][7],'OBSERVED');
  assert.equal(covered.grid[7][5],0);assert.equal(covered.grid[7][7],'SMALL_SAMPLE');
  assert.equal(covered.grid[8][7],'COHORT_MISMATCH');assert.equal(covered.grid[8][6],'');
  assert.equal(covered.grid[9][7],'NOT_MEASURED');assert.equal(covered.grid[9][8],2);
  assert.equal(covered.grid[10][7],'HOLD');assert.equal(covered.grid[11][7],'NOT_MEASURED');
  assert.deepEqual(JSON.parse(JSON.stringify(c.playPointGrowthRolePeriod_(period,'2026-10-18','2026-11-02'))),{start:'2026-10-18',end:'2026-10-30'});
  assert.throws(()=>c.playPointGrowthRoleGrid_(period,articles,{state:'OK',rows:source.rows.concat(source.rows[0])},reading,'2026-11-02',''),/重複/);
  assert.throws(()=>c.playPointGrowthRoleGrid_(period,articles,{state:'RESTRICTED',rows:[]},reading,'2026-11-02',''),/完全取得/);
});

function releaseRuntime() {
  return runtime({Utilities:{formatDate:(value,zone)=>{
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(value);
    return ['year','month','day'].map(key=>parts.find(p=>p.type===key).value).join('-');
  }}});
}
function releaseReceipt() {
  return {schemaVersion:1,status:'verified',environment:'production',branch:'main',commit:'a'.repeat(40),
    deployedAt:'2026-10-15T15:00:00Z',verifiedAt:'2026-10-15T16:00:00Z',
    checks:{preflight:'passed',smokeTest:'passed',seoHealth:'passed'},
    workflow:{repository:'katakata0522/PlayPoint',runId:'1234'}};
}
test('公開証拠を検査し、マージ・未検証・別repo・SHA不一致・逆転日時を拒否する',()=>{
  const c=releaseRuntime(), p=releaseReceipt();
  const valid=c.playPointGrowthVerifiedRelease_(p,p.commit,'2026-11-15');
  assert.equal(valid[0],p.commit);assert.equal(valid[4],'https://github.com/katakata0522/PlayPoint/actions/runs/1234');
  assert.throws(()=>c.playPointGrowthVerifiedRelease_({...p,status:'deploying'},p.commit,'2026-11-15'),/証拠/);
  assert.throws(()=>c.playPointGrowthVerifiedRelease_(p,'b'.repeat(40),'2026-11-15'),/不一致/);
  assert.throws(()=>c.playPointGrowthVerifiedRelease_({...p,checks:{...p.checks,seoHealth:'pending'}},p.commit,'2026-11-15'),/証拠/);
  assert.throws(()=>c.playPointGrowthVerifiedRelease_({...p,verifiedAt:'2026-10-14T00:00:00Z'},p.commit,'2026-11-15'),/証拠/);
  assert.throws(()=>c.playPointGrowthVerifiedRelease_({...p,workflow:{repository:'other/repo',runId:'1234'}},p.commit,'2026-11-15'),/証拠/);
  assert.throws(()=>c.playPointGrowthVerifiedRelease_({commit:p.commit},p.commit,'2026-11-15'),/証拠/);
});
test('公開当日と検証完了日を除外し、JST/PT別に7/14/28日比較、欠測は空欄',()=>{
  const c=releaseRuntime(), p=releaseReceipt(), release=c.playPointGrowthVerifiedRelease_(p,p.commit,'2026-11-15');
  const w=c.playPointGrowthReleaseWindow_(release,7,'Asia/Tokyo');
  assert.deepEqual(JSON.parse(JSON.stringify(w)),{previous:{start:'2026-10-09',end:'2026-10-15'},current:{start:'2026-10-17',end:'2026-10-23'}});
  const pt=c.playPointGrowthReleaseWindow_(release,7,'America/Los_Angeles');
  assert.equal(pt.previous.end,'2026-10-14');assert.equal(pt.current.start,'2026-10-16');
  const days={},gsc={};
  for(let d='2026-09-01';d<='2026-11-30';d=c.playPointP12ShiftIsoDate_(d,1)){
    days[d]={page_view:100,calculator_form_started:10,calculator_funnel_completed:8,calculator_validation_error:2};
    gsc[d]={clicks:20,impressions:200};
  }
  const rows=c.playPointGrowthReleaseGrid_([release],{days},gsc,'2026-11-20','2026-11-20','OK',[]);
  const pv=rows.find(r=>r[2]===7&&r[3]==='GA4 PV');
  assert.equal(pv[6],700);assert.equal(pv[7],700);assert.equal(pv[9],'OBSERVED');
  assert.equal(rows.find(r=>r[2]===7&&r[3]==='計算成功回数/100PV')[7],8);
  assert.equal(rows.find(r=>r[2]===7&&r[3]==='Google検索CTR (%)')[7],10);
  assert.equal(rows.find(r=>r[2]===28&&r[3]==='GA4 PV')[9],'OBSERVED');
  const pending=c.playPointGrowthReleaseGrid_([release],{days},gsc,'2026-10-22','2026-10-22','OK',[]);
  assert.equal(pending.find(r=>r[2]===7&&r[3]==='GA4 PV')[9],'PENDING_FINAL');
  assert.equal(pending.find(r=>r[2]===7&&r[3]==='GA4 PV')[7],'');
  delete days['2026-10-20'];
  const missing=c.playPointGrowthReleaseGrid_([release],{days},gsc,'2026-11-20','2026-11-20','OK',[]);
  assert.equal(missing.find(r=>r[2]===7&&r[3]==='GA4 PV')[9],'MISSING_DAYS');
  assert.equal(missing.find(r=>r[2]===7&&r[3]==='GA4 PV')[7],'');
  const historical=c.playPointGrowthReleaseGrid_([release],{days},gsc,'2026-11-20','2026-11-20','OK',rows.slice(5));
  assert.equal(historical.find(r=>r[2]===7&&r[3]==='GA4 PV')[9],'HISTORICAL');
  assert.equal(historical.find(r=>r[2]===7&&r[3]==='GA4 PV')[7],700);
});
test('日別GA4/GSCは未取得と0を区別し、重複・集計条件不一致を拒否',()=>{
  const c=releaseRuntime(), g=[[],['対象期間','2026-10-01 ～ 2026-10-02'],[],[],[],[],
    ['EVENTS','2026-10-01','page_view',12,3,'','OBSERVED'],
    ['EVENTS','2026-10-01','calculator_form_started',0,0,'','OBSERVED'],
    ['EVENTS','2026-10-01','calculator_funnel_completed',0,0,'','OBSERVED'],
    ['EVENTS','2026-10-01','calculator_validation_error',0,0,'','OBSERVED']];
  const map=c.playPointGrowthDailyMap_(g);
  assert.equal(map.days['2026-10-01'].calculator_form_started,0);
  assert.equal(c.playPointGrowthWindowTotals_(map.days,{start:'2026-10-01',end:'2026-10-02'},'2026-10-10',['page_view'],true).state,'MISSING_DAYS');
  assert.throws(()=>c.playPointGrowthDailyMap_(g.concat([g[6]])),/重複/);
  assert.throws(()=>c.playPointGrowthGscMap_({responseAggregationType:'byPage',rows:[]}),/不一致/);
  const gs={responseAggregationType:'byProperty',rows:[{keys:['2026-10-01'],clicks:0,impressions:12}]};
  assert.equal(c.playPointGrowthGscMap_(gs)['2026-10-01'].clicks,0);
  assert.throws(()=>c.playPointGrowthGscMap_({...gs,rows:gs.rows.concat(gs.rows)}),/重複/);
});
