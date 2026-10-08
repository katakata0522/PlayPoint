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
  return { DAILY: { state: 'OK', rows: [{ date: '20261010', sessions: 10 }] },
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
