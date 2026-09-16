'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const budget = require('../.github/scripts/mobile-performance-budget.cjs');
const suite = require('../.github/scripts/lighthouse-suite.cjs');
const diagnostics = require('../.github/scripts/lighthouse-diagnostics.cjs');
function temporary(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-lh-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true })); return dir;
}
function report(values = {}, url = 'http://127.0.0.1:4173/') {
  return { finalUrl: url, lighthouseVersion: '13.4.1', environment: { hostUserAgent: 'test-Chromium' }, configSettings: { formFactor: 'mobile' },
    categories: { performance: { score: values.score ?? 0.9 } }, audits: {
      'largest-contentful-paint': { numericValue: values.lcp ?? 1800 }, 'total-blocking-time': { numericValue: values.tbt ?? 100 },
      'cumulative-layout-shift': { numericValue: values.cls ?? 0.01 }, 'total-byte-weight': { numericValue: values.bytes ?? 200000 } } };
}
function files(dir, values, prefix = 'calculator-home') {
  return values.map((value, i) => { const file = path.join(dir, prefix + '-' + (i + 1) + '.json'); fs.writeFileSync(file, JSON.stringify(report(value))); return file; });
}
test('時間の中央値が合格しても1sampleのbyte超過を隠さない', t => {
  const result = budget.evaluateProfileGroup('calculatorHome', files(temporary(t), [{ bytes: 358401 }, { bytes: 200000 }, { bytes: 200000 }]));
  assert.equal(result.classification, 'BUDGET_FAIL');
  assert.equal(result.metrics.totalByteWeight, 358401);
  assert.match(result.failures.join('\n'), /totalByteWeight/);
  assert.equal(budget.HARD_BUDGETS.calculatorHome.totalByteWeight, 358400);
});
test('時間系の外れ値と全sampleを中央値と同時に残す', t => {
  const result = budget.evaluateProfileGroup('calculatorHome', files(temporary(t), [{ tbt: 4221 }, { tbt: 23 }, { tbt: 94, cls: 0.433 }]));
  assert.equal(result.classification, 'PASS_WITH_OUTLIERS');
  assert.equal(result.metrics.totalBlockingTimeMs, 94);
  assert.equal(result.spread.totalBlockingTimeMs.min, 23);
  assert.equal(result.spread.totalBlockingTimeMs.max, 4221);
  assert.equal(result.spread.totalBlockingTimeMs.medianAbsoluteDeviation, 71);
  assert.equal(result.sampleMetrics.length, 3);
  assert.equal(result.individualBreaches.length, 2);
});
test('計測欠損・無効値・runtimeError・sample不足・重複を合格させない', t => {
  const dir = temporary(t), good = report();
  const invalid = structuredClone(good); invalid.categories.performance.score = null;
  assert.throws(() => budget.extractMetrics(invalid), /invalid/);
  for (const value of [NaN, -1, undefined]) {
    const broken = structuredClone(good); broken.audits['total-blocking-time'].numericValue = value;
    assert.throws(() => budget.extractMetrics(broken), /監査値/);
  }
  assert.throws(() => budget.evaluateMetrics('default', {}), /invalid/);
  const sample = files(dir, [{}]);
  assert.equal(budget.evaluateProfileGroup('calculatorHome', sample).failures.length, 1);
  assert.throws(() => budget.evaluateProfileGroup('calculatorHome', [sample[0], sample[0], sample[0]]), /duplicate/);
  fs.writeFileSync(sample[0], JSON.stringify({ ...good, runtimeError: { code: 'NO_FCP' } }));
  assert.throws(() => budget.readReport(sample[0]), /不正/);
  assert.throws(() => budget.readReport(path.join(dir, 'missing.json')), /ありません/);
});
test('異なるURL・測定環境を同じ中央値へ混ぜない', t => {
  const sample = files(temporary(t), [{}, {}, {}]);
  fs.writeFileSync(sample[2], JSON.stringify(report({}, 'http://127.0.0.1:4173/other')));
  assert.throws(() => budget.evaluateProfileGroup('calculatorHome', sample), /different URLs/);
  const changed = report(); changed.configSettings.formFactor = 'desktop';
  fs.writeFileSync(sample[2], JSON.stringify(changed));
  assert.throws(() => budget.evaluateProfileGroup('calculatorHome', sample), /different measurement environments/);
});
test('追加測定は時間超過だけで発動し、byte超過や欠損を再試行しない', () => {
  assert.equal(budget.needsAdditionalSamples(report({ lcp: 4000 }), 'articleHub'), true);
  assert.equal(budget.needsAdditionalSamples(report({ lcp: 4000, bytes: 400000 }), 'articleHub'), false);
  assert.equal(budget.needsAdditionalSamples(report(), 'articleHub'), false);
  const invalid = report(); invalid.categories.performance.score = null;
  assert.throws(() => budget.needsAdditionalSamples(invalid, 'articleHub'));
});
function executeFixture(calls, alter) {
  return (command, args) => {
    const file = args.find(arg => arg.startsWith('--output-path=')).slice('--output-path='.length);
    calls.push({ command, args, file });
    const value = report({}, args[1]);
    const status = alter?.(value, file, calls.length) ?? 0;
    fs.writeFileSync(file, JSON.stringify(value));
    return { status };
  };
}
test('suiteは同一6ページを測り、初回時間超過の2sampleだけを追加する', t => {
  const outputDir = temporary(t), calls = [];
  const exit = suite.main({ outputDir, env: { AUDIT_TARGET: 'local' }, execute: executeFixture(calls, (value, file) => {
    if (path.basename(file) === 'article-hub.json') value.audits['largest-contentful-paint'].numericValue = 4000;
  }) });
  assert.equal(exit, 0);
  const manifest = JSON.parse(fs.readFileSync(path.join(outputDir, 'audit-manifest.json')));
  assert.equal(calls.length, 10);
  assert.equal(manifest.attempts.length, 10);
  assert.equal(manifest.thirdPartyBlocked, true);
  assert.ok(calls.every(call => call.args.filter(arg => arg.startsWith('--blocked-url-patterns=')).length === 6));
  assert.equal(new Set(calls.map(call => call.args[1])).size, 6);
  assert.equal(budget.reportPathsFromArgs(['--manifest', path.join(outputDir, 'audit-manifest.json')]).length, 10);
  assert.equal(budget.main(['--manifest', path.join(outputDir, 'audit-manifest.json')]), 0);
  const saved = JSON.parse(fs.readFileSync(path.join(outputDir, 'budget-summary.json')));
  assert.equal(saved.evaluations.find(group => group.profile === 'articleHub').sampleCount, 3);
});
test('suiteはbyte違反を追加測定で消さず、本番の外部通信は遮断しない', t => {
  const outputDir = temporary(t), calls = [];
  assert.equal(suite.main({ outputDir, env: { AUDIT_TARGET: 'production' }, execute: executeFixture(calls, (value, file) => {
    if (path.basename(file) === 'article-hub.json') value.audits['total-byte-weight'].numericValue = 400000;
  }) }), 0);
  assert.equal(calls.length, 8);
  assert.ok(calls.every(call => !call.args.some(arg => arg.startsWith('--blocked-url-patterns='))));
  assert.equal(budget.main(['--manifest', path.join(outputDir, 'audit-manifest.json')]), 1);
});
test('suiteのCLI失敗はvalid JSONが残っても成功にしない', t => {
  const outputDir = temporary(t), calls = [];
  assert.equal(suite.main({ outputDir, env: { AUDIT_TARGET: 'local' }, execute: executeFixture(calls, (_, __, count) => count === 1 ? 1 : 0) }), 1);
  const manifestFile = path.join(outputDir, 'audit-manifest.json');
  assert.throws(() => budget.reportPathsFromArgs(['--manifest', manifestFile]), /did not complete/);
  assert.equal(budget.reportPathsFromArgs(['--manifest', manifestFile], { requireComplete: false }).length, 8);
  assert.throws(() => suite.main({ outputDir, env: { AUDIT_TARGET: 'other' } }), /AUDIT_TARGET/);
  assert.throws(() => suite.main({ outputDir, env: { AUDIT_TARGET: 'local', AUDIT_BASE_URL: 'https://elsewhere.test' } }), /origin/);
});
test('途中で止まったmanifestは残存診断を許し、全ページ完了とは扱わない', t => {
  const dir = temporary(t), sample = files(dir, [{}]);
  const file = path.join(dir, 'audit-manifest.json');
  fs.writeFileSync(file, JSON.stringify({ schemaVersion: 1, passed: false, reports: sample }));
  assert.throws(() => budget.reportPathsFromArgs(['--manifest', file]), /missing a required/);
  assert.deepEqual(diagnostics.parseArgs(['--manifest', file]).reportPaths, sample);
});
