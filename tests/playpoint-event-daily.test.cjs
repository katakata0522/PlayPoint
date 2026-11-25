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


test('流入元×端末の集計を独立したセッション/PV総量と照合し、入口欠落とDirectを混同しない',()=>{
  const c=runtime(), period={start:'2026-10-24',end:'2026-11-22'};
  const g={sessionSourceMedium:'google / organic',deviceCategory:'mobile'};
  const d={sessionSourceMedium:'(direct) / (none)',deviceCategory:'desktop'};
  const ok=rows=>({state:'OK',rows});
  const sources={
    TRAFFIC:ok([{...g,sessions:100,activeUsers:80,screenPageViews:140,engagedSessions:75},
      {...d,sessions:10,activeUsers:2,screenPageViews:50,engagedSessions:7}]),
    TOTAL:ok([{sessions:110,screenPageViews:190}]),
    ENTRY:ok([{...g,landingPage:'/',sessions:90,screenPageViews:140},{...g,landingPage:'(not set)',sessions:10,screenPageViews:0},
      {...d,landingPage:'/blog/',sessions:10,screenPageViews:50}]),
    SUCCESS:ok([{...g,eventCount:5}]), REVENUE:ok([{...g,totalAdRevenue:80}]),
    HOST:ok([{hostName:'playpoint-sim.com',screenPageViews:180},{hostName:'localhost',screenPageViews:10}])
  };
  const view=c.playPointGrowthTrafficGrid_(period,sources,'2026-11-25');
  assert.equal(view.state,'OK');assert.equal(view.total,110);assert.equal(view.matched,110);
  assert.equal(view.unknown,10);assert.equal(view.grid[4][3],10/110);
  const google=view.grid.find(r=>r[0]==='流入元別'&&r[1]===g.sessionSourceMedium);
  assert.equal(google[7],.75);assert.equal(google[8],80);assert.equal(google[9],5);assert.equal(google[10],5);
  assert.equal(google[12],.1);assert.equal(google[13],'CHECK_ENTRY');
  const direct=view.grid.find(r=>r[0]==='流入元別'&&r[1]===d.sessionSourceMedium);
  assert.equal(direct[8],'');assert.equal(direct[9],'');assert.equal(direct[12],0);
  assert.match(view.grid[4][2],/不明参照元 0セッション/);
  assert.equal(view.grid.find(r=>r[3]==='localhost')[13],'CHECK_HOST');
  assert.equal(view.grid.find(r=>r[0]==='入口明細'&&r[3]==='(not set)')[13],'UNKNOWN_ENTRY');
  const mismatch=c.playPointGrowthTrafficGrid_(period,{...sources,TOTAL:ok([{sessions:111,screenPageViews:190}])},'now');
  assert.equal(mismatch.state,'PARTIAL');assert.equal(mismatch.grid[4][3],'');
  assert(mismatch.grid.some(r=>r[13]==='TOTAL_MISMATCH'));
  const entryBad=c.playPointGrowthTrafficGrid_(period,{...sources,ENTRY:ok(sources.ENTRY.rows.slice(1))},'now');
  assert.equal(entryBad.state,'PARTIAL');assert.equal(entryBad.grid[4][3],'');
  assert.equal(entryBad.grid.find(r=>r[0]==='流入元別'&&r[1]===g.sessionSourceMedium)[12],'');
  const noRevenue=c.playPointGrowthTrafficGrid_(period,{...sources,REVENUE:{state:'ERROR',rows:[]}},'now');
  assert.equal(noRevenue.state,'PARTIAL');assert.equal(noRevenue.grid.find(r=>r[0]==='流入元別')[8],'');
  assert.throws(()=>c.playPointGrowthTrafficGrid_(period,{...sources,TRAFFIC:ok(sources.TRAFFIC.rows.concat(sources.TRAFFIC.rows[0]))},'now'),/重複/);
  assert.throws(()=>c.playPointGrowthTrafficGrid_(period,{...sources,TRAFFIC:{state:'RESTRICTED',rows:[]}},'now'),/完全な取得/);
});

test('実利用性能は観測分布のみを集計し、未登録・小標本・版不明・欠損分類を区別',()=>{
  const c=runtime(), p={start:'2026-10-24',end:'2026-11-22'};
  function row(name,rating,device,page,version,eventCount) {
    return {'customEvent:metric_name':name,'customEvent:metric_rating':rating,deviceCategory:device,
      'customEvent:page_group':page,'customEvent:release_version':version,eventCount};
  }
  const rows=[row('LCP','good','mobile','calculator_home','abc',30),
    row('LCP','poor','mobile','calculator_home','abc',10),
    row('LCP','needs_improvement','mobile','calculator_home','unknown',2),
    row('CLS','good','desktop','calculator_home','abc',2),
    row('(not set)','good','mobile','calculator_home','abc',4)];
  const view=c.playPointGrowthVitalsGrid_(p,{state:'PARAMETER_PARTIAL',rows,detail:'partial'},'now');
  assert.equal(view.state,'PARTIAL');assert.match(view.detail,/観測 48件.*分類不可 4件.*未特定 2件/);
  const mobile=view.grid.find(r=>r[0]==='端末別'&&r[1]==='LCP');
  assert.equal(mobile[5],42);assert.equal(mobile[9],30/42);assert.equal(mobile[10],10/42);
  const version=view.grid.find(r=>r[0]==='版・ページ別'&&r[1]==='LCP');
  assert.equal(version[5],40);assert.equal(version[10],.25);assert.equal(version[11],'CHECK_POOR_SHARE');
  assert.equal(view.grid.find(r=>r[0]==='版未特定')[11],'SMALL_SAMPLE');
  assert.match(view.grid[2][1],/公式CWV.*ではない/);
  const waiting=c.playPointGrowthVitalsGrid_(p,{state:'WAITING_DEFINITION',rows:[],detail:'pending'},'now');
  assert.equal(waiting.state,'WAITING_DEFINITION');assert.equal(waiting.grid.length,6);
  const empty=c.playPointGrowthVitalsGrid_(p,{state:'OK',rows:[],detail:''},'now');
  assert.equal(empty.state,'NO_OBSERVATIONS');assert.equal(empty.grid.length,6);
  assert.throws(()=>c.playPointGrowthVitalsGrid_(p,{state:'OK',rows:rows.concat(rows[0]),detail:''},'now'),/重複/);
});

test('月間PVの成長分析は全14日の日次総量と照合し、言語・機能の重複集計を分離する',()=>{
  const c=runtime(), end='2026-11-22', days={}, history=[];
  for(let date='2026-10-24';date<=end;date=c.playPointP12ShiftIsoDate_(date,1)){
    const recent=date>='2026-11-16';
    days[date]={page_view:recent?210:150};
    history.push([date,'/',100,0,0,'RECONCILED'],[date,'/ko/articles/a.html',recent?90:30,0,0,'RECONCILED'],
      [date,'/en/games/a/',20,0,0,'RECONCILED']);
  }
  const daily={days};
  const pages=c.playPointGrowthPageChange_(history,daily,end);
  assert.equal(pages.state,'OK');
  assert.deepEqual(Array.from(pages.languages.KO),[210,630]);
  assert.deepEqual(Array.from(pages.features['ゲーム']),[140,140]);
  assert.deepEqual(Array.from(pages.features['計算機トップ']),[700,700]);
  const report=c.playPointGrowthOpportunityGrid_(daily,end,pages,{state:'OK',period:'2026-10-22 ～ 2026-11-20',detail:'',candidates:[]},'now');
  assert.equal(report.pace,6300);assert.equal(report.gap,3700);
  assert.equal(report.grid[3][2],4920);
  assert.equal(report.grid.find(r=>r[0]==='伸長ページ')[6],420);
  assert.equal(report.state,'OK');
  const mismatch=c.playPointGrowthPageChange_(history.slice(0,-1),daily,end);
  assert.equal(mismatch.state,'PAGE_TOTAL_MISMATCH');assert.equal(mismatch.rows.length,0);
  delete days[end];
  const missing=c.playPointGrowthOpportunityGrid_(daily,end,mismatch,{state:'ERROR',detail:'missing',candidates:[]},'now');
  assert.equal(missing.pace,'');assert.equal(missing.gap,'');assert.equal(missing.state,'PARTIAL');
});

test('検索改善候補は一検索語一URL、断片/URLパラメータ非合算、競合時はクリック試算を保留',()=>{
  const c=runtime(), period='2026-10-22 ～ 2026-11-20';
  const header=['順位','検索キーワード','ページ','クリック数','表示回数','CTR','平均掲載順位','対象期間','データ状態'];
  const row=(q,p,click,imp,pos=8,state='FINAL')=>[1,q,'https://playpoint-sim.com'+p,click,imp,click/imp,pos,period,state];
  const grid=[header,row('a','/articles/a.html',1,200),row('a','/articles/a.html#section',0,200),
    row('a','/articles/a.html?q=test',0,300),row('a','/articles/other.html',0,30),
    row('b','/ko/articles/b.html',0,100),row('b','/en/articles/b.html',0,75),
    row('c','/articles/c.html',20,200),row('d','/articles/d.html',0,80),
    row('e','/articles/e.html',0,200,2)];
  const result=c.playPointGrowthSearchCandidates_(grid,'2026-11-25');
  assert.equal(result.state,'OK');assert.equal(result.candidates.length,2);
  assert.equal(result.excludedAnchors,1);
  assert.equal(result.candidates[0].query,'a');assert.equal(result.candidates[0].imp,200);
  assert.deepEqual(Array.from(result.candidates[0].scenarios),[3,7]);
  assert.equal(result.candidates[1].state,'INTENT_OVERLAP');assert.deepEqual(Array.from(result.candidates[1].scenarios),['','']);
  const stale=c.playPointGrowthSearchCandidates_(grid,'2026-12-03');
  assert.equal(stale.state,'STALE');assert(stale.candidates.every(r=>r.scenarios[0]===''));
  assert.throws(()=>c.playPointGrowthSearchCandidates_(grid.concat(grid[1]),'2026-11-25'),/重複/);
  assert.throws(()=>c.playPointGrowthSearchCandidates_([header,row('q','/x',1,100,8,'PROVISIONAL')],'2026-11-25'),/未確定/);
});

test('流入診断は時間予算不足時に新たなAPIを呼ばず、旧期間の結果を上書きしない',()=>{
  let calls=0, errors=0;
  const c=runtime({playPointP12NowText_:()=> '2026-11-25 09:00:00',
    playPointP12BuildGa4Period_:()=>({start:'2026-10-24',end:'2026-11-22'}),
    playPointP12GetGa4PropertyId_:()=> 'p',resolveAndRememberSpreadsheet_:()=>({}),
    withScriptLock_:fn=>fn(),playPointP12HealthError_:()=>{errors++;}});
  c.playPointGrowthTrafficSource_=()=>{calls++;return {state:'OK',rows:[]};};
  assert.throws(()=>c.capturePlayPointTrafficQualityReview(Date.now()-1),/時間予算/);
  assert.equal(calls,0);assert.equal(errors,1);
  const sheet={getLastRow:()=>10,getRange:()=>({getValue:()=> '2026-10-25 ～ 2026-11-23'})};
  assert.throws(()=>c.playPointGrowthAssertPeriodFresh_({getSheetByName:()=>sheet},'x','2026-11-22'),/より新しい/);
});
