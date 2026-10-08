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
