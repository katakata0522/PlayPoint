'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'ops/apps-script/gsc-nonoverlap-28d.gs'), 'utf8');

function loadRuntime() {
  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'gsc-nonoverlap-28d.gs' });
  return context;
}

test('GSC Apps Script module is valid JavaScript and exposes capture/install entry points', () => {
  assert.doesNotThrow(() => new vm.Script(source));
  const runtime = loadRuntime();
  assert.equal(typeof runtime.captureGscNonOverlapping28d, 'function');
  assert.equal(typeof runtime.installPlayPointGsc28dWeeklyTrigger, 'function');
});

test('GSC comparison windows are exactly 28 days, adjacent and non-overlapping', () => {
  const runtime = loadRuntime();
  const windows = runtime.playPointGscBuildWindows_('2026-09-11');

  assert.equal(windows.current.start, '2026-08-15');
  assert.equal(windows.current.end, '2026-09-11');
  assert.equal(windows.current.days, 28);

  assert.equal(windows.previous.start, '2026-07-18');
  assert.equal(windows.previous.end, '2026-08-14');
  assert.equal(windows.previous.days, 28);

  assert.equal(runtime.playPointGscShiftIsoDate_(windows.previous.end, 1), windows.current.start);
});

test('GSC capture preserves query × exact URL FINAL evidence and paginates raw rows', () => {
  assert.match(source, /dimensions:\s*\['query', 'page'\]/);
  assert.match(source, /dataState:\s*'final'/);
  assert.match(source, /aggregationType:\s*'byPage'/);
  assert.match(source, /rowLimit:\s*25000/);
  assert.match(source, /startRow\s*\+=\s*rows\.length/);
  assert.match(source, /row\.keys\s*&&\s*row\.keys\[0\]/);
  assert.match(source, /row\.keys\s*&&\s*row\.keys\[1\]/);
});

test('GSC history is idempotent and keeps the comparison pair visible in dedicated sheets', () => {
  assert.match(source, /🗃GSC 28日履歴/);
  assert.match(source, /🔍GSC 28日比較/);
  assert.match(source, /SKIPPED_ALREADY_CAPTURED/);
  assert.match(source, /current_28d/);
  assert.match(source, /previous_28d/);
  assert.match(source, /検索クエリ/);
  assert.match(source, /exact URL/);
});

test('weekly installer refuses duplicate handler triggers', () => {
  assert.match(source, /getProjectTriggers\(\)/);
  assert.match(source, /getHandlerFunction\(\) === handler/);
  assert.match(source, /onWeekDay\(ScriptApp\.WeekDay\.FRIDAY\)/);
});
