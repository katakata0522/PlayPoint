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
function report(values = {}, url = 'https://127.0.0.1:4173/') {
  const origin = new URL(url).origin;
  const firstPartyBytes = values.firstPartyBytes ?? values.bytes ?? 200000;
  const thirdPartyBytes = values.thirdPartyBytes ?? 0;
  const totalBytes = values.totalBytes ?? firstPartyBytes + thirdPartyBytes;
  const resourceBytes = values.resourceBytes ?? firstPartyBytes * 2;
  const networkItems = [{
    url: origin + '/app.js',
    resourceType: 'Script',
    transferSize: firstPartyBytes,
    resourceSize: resourceBytes,
    statusCode: 200
  }];
  if (thirdPartyBytes > 0) {
    networkItems.push({
      url: 'https://example-third-party.invalid/tracker.js',
      resourceType: 'Script',
      transferSize: thirdPartyBytes,
      resourceSize: thirdPartyBytes,
      statusCode: 200
    });
  }
  return { finalUrl: url, lighthouseVersion: '13.4.1', environment: { hostUserAgent: 'test-Chromium' }, configSettings: { formFactor: 'mobile' },
    categories: { performance: { score: values.score ?? 0.9 } }, audits: {
      'largest-contentful-paint': { numericValue: values.lcp ?? 1800 }, 'total-blocking-time': { numericValue: values.tbt ?? 100 },
      'cumulative-layout-shift': { numericValue: values.cls ?? 0.01 }, 'total-byte-weight': { numericValue: totalBytes },
      'network-requests': { details: { items: networkItems } } } };
}
function files(dir, values, prefix = 'calculator-home') {
  return values.map((value, i) => { const file = path.join(dir, prefix + '-' + (i + 1) + '.json'); fs.writeFileSync(file, JSON.stringify(report(value))); return file; });
}

test('性能suiteの6ページと国際記事3地域は測定ownerから直接解決する', () => {
  assert.deepEqual(suite.PAGES, [
    ['calculator-home', '/'],
    ['article-hub', '/blog/'],
    ['representative-article', '/articles/2026-03-10-play-points-reflection-timing.html'],
    ['international-article-en', '/en/articles/google-play-points-join-eligibility.html'],
    ['international-article-ko', '/ko/articles/google-play-points-join-eligibility.html'],
    ['international-article-tw', '/tw/articles/google-play-points-join-eligibility.html']
  ]);
  assert.equal(new Set(suite.PAGES.map(([, route]) => route)).size, suite.PAGES.length);

  for (const locale of ['en', 'ko', 'tw']) {
    const profile = budget.getProfile('performance-artifacts/international-article-' + locale + '.json');
    const expected = 'internationalArticle' + locale[0].toUpperCase() + locale.slice(1);
    assert.equal(profile, expected);
    assert.equal(budget.HARD_BUDGETS[profile].largestContentfulPaintMs, 3000);
    assert.equal(budget.HARD_BUDGETS[profile].cumulativeLayoutShift, 0.15);
  }
  assert.equal(budget.TARGETS.largestContentfulPaintMs, 2500);
  assert.equal(budget.TARGETS.cumulativeLayoutShift, 0.10);
  assert.equal(budget.TARGETS.totalByteWeight, undefined);
  assert.ok(budget.TRANSFER_BASELINES.calculatorHome > 0);

  const workflow = fs.readFileSync(path.join(__dirname, '../.github/workflows/mobile-performance.yml'), 'utf8');
  assert.match(workflow, /node \.github\/scripts\/lighthouse-suite\.cjs/);
  assert.match(workflow, /articles\/intl-shell-v1\.css/);
  assert.match(workflow, /articles\/intl-article\.css/);
  assert.match(workflow, /performance-apache-server\.cjs/);
  assert.match(workflow, /AUDIT_BASE_URL=https:\/\/127\.0\.0\.1:4173/);
  assert.match(workflow, /Content-Encoding: gzip/);
  assert.match(workflow, /'\.htaccess'/);
});

test('時間の中央値が合格しても1sampleのfirst-party gzip超過を隠さない', t => {
  const limit = budget.HARD_BUDGETS.calculatorHome.firstPartyTransferBytes;
  const result = budget.evaluateProfileGroup('calculatorHome', files(temporary(t), [
    { firstPartyBytes: limit + 1 },
    { firstPartyBytes: Math.max(1, limit - 1) },
    { firstPartyBytes: Math.max(1, limit - 1) }
  ]));
  assert.equal(result.classification, 'BUDGET_FAIL');
  assert.equal(result.metrics.firstPartyTransferBytes, limit + 1);
  assert.match(result.failures.join('\n'), /firstPartyTransferBytes/);
});
test('第三者通信は総量へ残すが自サイトgzip budgetを汚染しない', t => {
  const baseline = budget.TRANSFER_BASELINES.calculatorHome;
  const result = budget.evaluateProfileGroup('calculatorHome', files(temporary(t), [
    { firstPartyBytes: baseline, thirdPartyBytes: 700000 },
    { firstPartyBytes: baseline, thirdPartyBytes: 650000 },
    { firstPartyBytes: baseline, thirdPartyBytes: 600000 }
  ]));
  assert.equal(result.classification, 'PASS');
  assert.equal(result.metrics.firstPartyTransferBytes, baseline);
  assert.ok(result.metrics.totalByteWeight > budget.HARD_BUDGETS.calculatorHome.firstPartyTransferBytes);
  assert.equal(result.failures.length, 0);
});

test('gzip baselineから20%を超える増加は警告だけにして有益な小変更を自動拒否しない', t => {
  const baseline = budget.TRANSFER_BASELINES.calculatorHome;
  const firstPartyBytes = Math.ceil(baseline * budget.TRANSFER_ADVISORY_GROWTH_RATIO) + 1;
  const result = budget.evaluateProfileGroup('calculatorHome', files(temporary(t), [
    { firstPartyBytes }, { firstPartyBytes }, { firstPartyBytes }
  ]));
  assert.equal(result.classification, 'PASS');
  assert.equal(result.failures.length, 0);
  assert.equal(result.transferWarnings.length, 1);
  assert.match(result.transferWarnings[0], /gzip基準/);
});

test('診断はgzip転送量と展開後resource量を分ける', () => {
  const sample = report({ firstPartyBytes: 100000, resourceBytes: 240000, thirdPartyBytes: 50000 });
  const summary = diagnostics.networkSummary(sample);
  assert.deepEqual(summary.firstParty, { requests: 1, transferBytes: 100000, resourceBytes: 240000 });
  assert.equal(summary.all.transferBytes, 150000);
  assert.equal(summary.compressionRatio, 100000 / 240000);
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
  const limits = budget.HARD_BUDGETS.articleHub;
  assert.equal(budget.needsAdditionalSamples(report({ lcp: limits.largestContentfulPaintMs + 1 }), 'articleHub'), true);
  assert.equal(budget.needsAdditionalSamples(report({
    lcp: limits.largestContentfulPaintMs + 1,
    firstPartyBytes: limits.firstPartyTransferBytes + 1
  }), 'articleHub'), false);
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
test('suiteは同一6ページを測り、homeと記事ハブを3sampleで比較する', t => {
  const outputDir = temporary(t), calls = [];
  const exit = suite.main({ outputDir, env: { AUDIT_TARGET: 'local' }, execute: executeFixture(calls, (value, file) => {
    if (path.basename(file) === 'article-hub-1.json') value.audits['largest-contentful-paint'].numericValue = 4000;
  }) });
  assert.equal(exit, 0);
  const manifest = JSON.parse(fs.readFileSync(path.join(outputDir, 'audit-manifest.json')));
  const expectedCalls = suite.PAGES.length + 4; // home +2, one timing breach +2
  assert.equal(calls.length, expectedCalls);
  assert.equal(manifest.attempts.length, expectedCalls);
  assert.equal(manifest.thirdPartyBlocked, true);
  assert.ok(calls.every(call =>
    call.args.filter(arg => arg.startsWith('--blocked-url-patterns=')).length === suite.BLOCKED.length
  ));
  assert.equal(new Set(calls.map(call => call.args[1])).size, suite.PAGES.length);
  assert.ok(calls.every(call => call.args.some(arg => arg.includes('--ignore-certificate-errors'))),
    'local Lighthouse must trust only the isolated self-signed audit origin');
  assert.equal(budget.reportPathsFromArgs(['--manifest', path.join(outputDir, 'audit-manifest.json')]).length, expectedCalls);
  assert.equal(budget.main(['--manifest', path.join(outputDir, 'audit-manifest.json')]), 0);
  const saved = JSON.parse(fs.readFileSync(path.join(outputDir, 'budget-summary.json')));
  assert.equal(saved.evaluations.find(group => group.profile === 'articleHub').sampleCount, 3);
});
test('suiteはfirst-party違反を追加測定で消さず、本番の外部通信は遮断しない', t => {
  const outputDir = temporary(t), calls = [];
  assert.equal(suite.main({ outputDir, env: { AUDIT_TARGET: 'production' }, execute: executeFixture(calls, (value, file) => {
    if (path.basename(file) === 'article-hub-1.json') {
      const limit = budget.HARD_BUDGETS.articleHub.firstPartyTransferBytes;
      value.audits['network-requests'].details.items[0].transferSize = limit + 1;
      value.audits['total-byte-weight'].numericValue = limit + 1;
    }
  }) }), 0);
  assert.equal(calls.length, suite.PAGES.length + 4); // home and hub each retain all 3 samples
  assert.ok(calls.every(call => !call.args.some(arg => arg.startsWith('--blocked-url-patterns='))));
  assert.ok(calls.every(call => !call.args.some(arg => arg.includes('--ignore-certificate-errors'))),
    'production Lighthouse must use normal certificate validation');
  assert.equal(budget.main(['--manifest', path.join(outputDir, 'audit-manifest.json')]), 1);
});
test('suiteのCLI失敗はvalid JSONが残っても成功にしない', t => {
  const outputDir = temporary(t), calls = [];
  assert.equal(suite.main({ outputDir, env: { AUDIT_TARGET: 'local' }, execute: executeFixture(calls, (_, __, count) => count === 1 ? 1 : 0) }), 1);
  const manifestFile = path.join(outputDir, 'audit-manifest.json');
  assert.throws(() => budget.reportPathsFromArgs(['--manifest', manifestFile]), /did not complete/);
  assert.equal(
    budget.reportPathsFromArgs(['--manifest', manifestFile], { requireComplete: false }).length,
    suite.PAGES.length + 4
  );
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
