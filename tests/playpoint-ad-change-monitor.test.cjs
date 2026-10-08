'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function runtime(extra = {}) {
  const c = vm.createContext({
    playPointP12ShiftIsoDate_: (day, offset) => new Date(Date.parse(day + 'T00:00:00Z') + offset * 86400000).toISOString().slice(0, 10),
    playPointP12LiteralRow_: row => row,
    playPointP12NormalizePage_: value => value.replace(/index\.html$/, ''),
    playPointEventDailyIso_: value => value.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3'),
    playPointReaderSource_: fn => ({ state: 'OK', ...fn() }), ...extra
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../scripts/playpoint-ad-change-monitor.gs'), 'utf8'), c);
  return c;
}
function history(c, start, end) {
  return Array.from(c.playPointAdChangeDays_(start, end), date => ({ date, dataState: 'RECONCILED',
    revenue: 50, ga4Pv: 100, adsensePv: 120, impressions: 400 }));
}
function sources() {
  const rows = Array.from({length:14}, (_,i)=>({date:'202610'+String(10+i).padStart(2,'0'),screenPageViews:100,sessions:i===0?10:0}));
  return { DAILY: { state: 'OK', rows },
    RETURNING: { state: 'OK', rows: [{ date: '20261010', sessions: 3 }] },
    EVENTS: { state: 'OK', rows: [{ date: '20261010', eventName: 'article_to_calculator_clicked', eventCount: 2 }] } };
}
test('未経過と欠測の14日比較をゼロ収益として判定しない', () => {
  const c = runtime(), h = history(c, '2026-10-10', '2026-10-23');
  const pending = c.playPointAdChangePeriod_('2026-10-10', '2026-10-23', '2026-10-22', h, sources());
  assert.equal(pending.days, 13); assert.equal(pending.revenueDaily, undefined);
  h[3].dataState = 'ERROR';
  assert.equal(c.playPointAdChangePeriod_('2026-10-10', '2026-10-23', '2026-10-23', h, sources()).days, 13);
  h.push(h[0]);
  assert.throws(() => c.playPointAdChangePeriod_('2026-10-10', '2026-10-23', '2026-10-23', h, sources()), /重複/);
});
test('期間合計から収益密度・再訪セッションを計算し、API制限を空欄にする', () => {
  const c = runtime(), h = history(c, '2026-10-10', '2026-10-23'), s = sources();
  h[0].revenue = 200; h[0].adsensePv = 1000;
  const r = c.playPointAdChangePeriod_('2026-10-10', '2026-10-23', '2026-10-23', h, s);
  assert.equal(r.revenueDaily, 850 / 14); assert.equal(r.ga4Rpm, 850000 / 1400);
  assert.equal(r.adRpm, 850000 / 2560); assert.equal(r.median, 50);
  assert.equal(r.returningShare, 0.3); assert.equal(r.articleCta, 2000 / 1400);
  assert.match(r.note, /乖離/); assert.match(r.note, /上振れ/);
  s.RETURNING.state = 'RESTRICTED';
  assert.equal(c.playPointAdChangePeriod_('2026-10-10', '2026-10-23', '2026-10-23', h, s).returningShare, undefined);
});
test('D7が反映待ち期間まで経過した獲得日だけをAPIに渡す', () => {
  let body;
  const c = runtime({ playPointP12Ga4Report_: (_, b) => { body = b; return {}; }, playPointP12ParseGa4Rows_: () => [] });
  const days = c.playPointAdChangeDays_('2026-10-10', '2026-10-16');
  const waiting = c.playPointAdChangeCohorts_('p', days, '2026-10-16');
  assert.equal(waiting.state, '集計待ち'); assert.equal(body, undefined);
  c.playPointAdChangeCohorts_('p', days, '2026-10-18');
  assert.equal(body.cohortSpec.cohorts.length, 2);
  assert.equal(body.cohortSpec.cohorts[1].dateRange.startDate, '2026-10-11');
  assert.equal(body.dateRanges, undefined); assert.equal(body.cohortSpec.cohortsRange.endOffset, 7);
});
test('D7は同じ獲得日集団の人数で加重し、未経過・欠測は0%にしない', () => {
  const c = runtime(), days = c.playPointAdChangeDays_('2026-09-25', '2026-10-01');
  const rows = [];
  days.forEach((day, i) => {
    const name = 'acquired_' + day.replace(/-/g, '');
    rows.push({ cohort: name, cohortNthDay: '0000', cohortTotalUsers: i === 0 ? 100 : 10, cohortActiveUsers: i === 0 ? 100 : 10 });
    rows.push({ cohort: name, cohortNthDay: '0007', cohortTotalUsers: i === 0 ? 100 : 10, cohortActiveUsers: i === 0 ? 20 : 1 });
  });
  const groups = [{ label: '変更前', days, source: { state: 'OK', rows } },
    { label: '変更後', days: c.playPointAdChangeDays_('2026-10-10', '2026-10-16'), source: { state: '集計待ち', rows: [] } }];
  const grid = c.playPointAdChangeCohortGrid_('2026-10-08', groups, 'now');
  const total = grid.find(row => row[0] === '変更前合計');
  assert.equal(total[3], 160); assert.equal(total[4], 26); assert.equal(total[5], 26 / 160);
  assert.equal(grid.find(row => row[0] === '変更後合計')[5], '');
  rows.splice(rows.length - 2, 2);
  assert.equal(c.playPointAdChangeCohortGrid_('2026-10-08', groups, 'now').find(row => row[0] === '変更前合計')[5], '');
});
test('完全な実応答が活動0日の行を省略しても、成熟とD0母数がある時だけ0人とする', () => {
  const c = runtime(), groups = [{ label: '変更前', days: ['2026-09-25'], source: { state: 'OK', rows: [
    { cohort: 'acquired_20260925', cohortNthDay: '0000', cohortTotalUsers: 91, cohortActiveUsers: 91 },
    { cohort: 'acquired_20260925', cohortNthDay: '0001', cohortTotalUsers: 91, cohortActiveUsers: 2 }
  ] } }];
  let row = c.playPointAdChangeCohortGrid_('2026-10-06', groups, 'now')[5];
  assert.equal(row[3], 91); assert.equal(row[4], 0); assert.equal(row[5], 0);
  assert.equal(row[6], 'OK（7日目の活動行なし）');
  assert.equal(c.playPointAdChangeCohortGrid_('2026-10-01', groups, 'now')[5][5], '');
  groups[0].source.state = 'RESTRICTED';
  assert.equal(c.playPointAdChangeCohortGrid_('2026-10-06', groups, 'now')[5][5], '');
  groups[0].source.state = 'OK'; groups[0].source.rows[0].cohortActiveUsers = 50;
  assert.equal(c.playPointAdChangeCohortGrid_('2026-10-06', groups, 'now')[5][5], '');
});
test('日次トリガーの再実行で重複せず、他のトリガーを変更しない', () => {
  let created = 0;
  const triggers = [{ getHandlerFunction: () => 'runMasterpieceSync' }];
  const builder = { timeBased() { return this; }, everyDays() { return this; }, atHour() { return this; },
    inTimezone() { return this; }, create() { created++; const t = { getHandlerFunction: () => 'capturePlayPointAdChangeMonitor' }; triggers.push(t); return t; } };
  const c = runtime({ ScriptApp: { getProjectTriggers: () => triggers, newTrigger: () => builder } });
  c.installPlayPointAdChangeMonitorDailyTrigger(); c.installPlayPointAdChangeMonitorDailyTrigger();
  assert.equal(created, 1); assert.equal(triggers.length, 2);
});

test('日次PV欠測・再照合差異から再訪率を作らない', () => {
  const c=runtime(), h=history(c,'2026-10-10','2026-10-23'), s=sources();
  s.DAILY.rows[0].screenPageViews=99;
  const r=c.playPointAdChangePeriod_('2026-10-10','2026-10-23','2026-10-23',h,s);
  assert.equal(r.returningShare,''); assert.match(r.note,/再照合差異/);
});
test('記事CTAは記事PV分母で端末を分け、他ページとユーザー人数を合算しない', () => {
  const c=runtime(), w=['前','2026-10-10','2026-10-10'];
  const pages={state:'OK',rows:[{date:'20261010',pagePath:'/articles/a.html',deviceCategory:'mobile',screenPageViews:20,userEngagementDuration:200},
    {date:'20261010',pagePath:'/',deviceCategory:'mobile',screenPageViews:80,userEngagementDuration:100}]};
  const events={state:'OK',rows:[{date:'20261010',pagePath:'/articles/a.html',deviceCategory:'mobile',eventName:'article_to_calculator_clicked',eventCount:2}]};
  const rows=c.playPointChangeQualitySegments_(w,'2026-10-10',pages,events);
  const article=rows.find(r=>r[1]==='記事'&&r[2]==='mobile');
  assert.equal(article[4],20); assert.equal(article[6],10); assert.equal(article[7],10);
  assert.equal(rows.find(r=>r[1]==='Play Points計算機')[6],'');
  events.state='RESTRICTED'; assert.equal(c.playPointChangeQualitySegments_(w,'2026-10-10',pages,events)[0][6],'');
  assert.equal(c.playPointChangeQualitySegments_(w,'2026-10-09',pages,events)[0][3],'集計待ち');
});
test('計算完了は順序APIだけで作り、欠測・人数逆転・0母数では率を作らない', () => {
  const c=runtime(), source={state:'OK',rows:[{funnelStepName:'1. 計算開始',activeUsers:20},{funnelStepName:'2. 開始後24時間以内の成功',activeUsers:15}]};
  assert.equal(c.playPointChangeQualityFunnel_(source).rate,.75);
  source.rows[1].activeUsers=21; assert.equal(c.playPointChangeQualityFunnel_(source).rate,'');
  source.rows.splice(1); assert.equal(c.playPointChangeQualityFunnel_(source).state,'欠測・順序不整合');
  assert.equal(c.playPointChangeQualityFunnel_({state:'ERROR',rows:[]}).rate,'');
});
test('再訪0人でも参考区間は0幅とせず、小さい母数の不確かさを表示する', () => {
  const c=runtime(), zero=c.playPointChangeQualityWilson_(0,10), one=c.playPointChangeQualityWilson_(1,100);
  assert(Math.abs(zero[0])<1e-12); assert(zero[1]>.27&&zero[1]<.29);
  assert(one[0]<.01&&one[1]>.01); assert.equal(c.playPointChangeQualityWilson_(1,0)[0],'');
});
test('日次更新へ補助集計を接続し、補助障害は成功した収益比較を巻き戻さない', () => {
  const calls=[];const c=runtime({playPointP12NowText_:()=> 'now',playPointP12ErrorText_:e=>e.message,
    withScriptLock_:fn=>fn(),playPointP12HealthError_:()=>{},
    capturePlayPointEventDailyReview:()=>{calls.push('event');throw Error('quota');},
    capturePlayPointReaderOutcomes:()=>{calls.push('reader');return {state:'OK'};}});
  c.playPointCaptureAdChangeMonitor_=()=>({state:'OK'});c.playPointCaptureChangeQuality_=()=>({state:'OK'});
  const r=c.capturePlayPointAdChangeMonitor();assert.equal(r.state,'OK');assert.deepEqual(calls,['event','reader']);
  assert.equal(r.maintenance[0].state,'ERROR');assert.equal(r.maintenance[1].state,'OK');
});
