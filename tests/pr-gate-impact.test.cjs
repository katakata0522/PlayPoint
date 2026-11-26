'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { classifyPrGateImpact } = require('../.github/scripts/detect-pr-gate-impact.cjs');
const {
  ARTICLE_BROWSER_CHECKS,
  PR_BROWSER_CHECKS,
  parseScope,
  resolveChecks,
  runPrChecks,
} = require('../.github/scripts/run-pr-browser-checks.cjs');

test('docs/testsだけの変更はfull preflightを残しつつApache/Chromiumを省略できる', () => {
  const result = classifyPrGateImpact([
    'docs/TEST_TRIAGE.md',
    'tests/example.test.cjs',
    'README.md',
  ]);
  assert.equal(result.browserRequired, false);
  assert.equal(result.apacheRequired, false);
});

test('公開成果物やruntime変更はChromiumを必須にする', () => {
  for (const file of ['index.html', 'style.css', 'js/main.js', 'articles/example.html', 'en/articles/example.html']) {
    assert.equal(classifyPrGateImpact([file]).browserRequired, true, file);
  }
});

test('browser検証基盤自身の変更もChromiumを必須にする', () => {
  for (const file of [
    '.github/workflows/quality-check.yml',
    '.github/scripts/browser-smoke.cjs',
    '.github/scripts/ui-contract-browser.cjs',
    '.github/scripts/diary-browser.cjs',
    '.github/scripts/accessibility-browser.cjs',
    '.github/scripts/browser-reading-ui.cjs',
    '.github/scripts/calculator-presentation-contract.cjs',
    '.github/scripts/game-calculator-browser.cjs',
    '.github/scripts/setup-browser-runtime.sh',
    '.github/scripts/browser-revision-evidence.cjs',
    '.github/scripts/verify-deploy-revision.cjs',
    '.github/scripts/detect-pr-gate-impact.cjs',
    '.github/scripts/browser-concurrency.cjs',
    '.github/scripts/run-pr-browser-checks.cjs',
    '.github/ci-runtime/package-lock.json',
  ]) {
    assert.equal(classifyPrGateImpact([file]).browserRequired, true, file);
    assert.equal(classifyPrGateImpact([file]).browserScope, 'full', file);
  }
});

test('Apache実HTTPは設定・cache検査・影響判定の変更時に必須にする', () => {
  assert.equal(classifyPrGateImpact(['.github/scripts/detect-pr-gate-impact.cjs']).apacheRequired, true);
  assert.equal(classifyPrGateImpact(['.htaccess']).apacheRequired, true);
  assert.equal(classifyPrGateImpact(['tests/helpers/apache-cache-contract.cjs']).apacheRequired, true);
  assert.equal(classifyPrGateImpact(['.github/scripts/http-cache-contract.cjs']).apacheRequired, true);
  assert.equal(classifyPrGateImpact(['index.html']).apacheRequired, false);
});

test('混在変更は安全側の強い検証へ昇格する', () => {
  const result = classifyPrGateImpact(['docs/note.md', 'tests/example.test.cjs', 'js/main.js']);
  assert.equal(result.browserRequired, true);
  assert.equal(result.browserScope, 'full');
  assert.equal(result.apacheRequired, false);
  assert.deepEqual(result.browserPaths, ['js/main.js']);
});

test('独立記事HTMLだけの変更はarticles scopeへ絞り、統合対象記事やhub変更はfullへ戻す', () => {
  const docsOnly = classifyPrGateImpact(['docs/TEST_TRIAGE.md']);
  assert.equal(docsOnly.browserScope, 'none');

  const articleOnly = classifyPrGateImpact([
    'articles/2026-10-23-seven-eleven-gift-card-lottery.html',
    'en/articles/google-play-points-fastest-silver.html',
    'docs/TEST_TRIAGE.md',
  ]);
  assert.equal(articleOnly.browserRequired, true);
  assert.equal(articleOnly.browserScope, 'articles');

  for (const fullTrigger of [
    'articles/2025-12-25-best-use.html',
    'en/articles/google-play-points-weekly-reward.html',
    'en/articles/index.html',
    'articles/article-shared.css',
    'articles/reading-ui.js',
  ]) {
    assert.equal(classifyPrGateImpact([fullTrigger]).browserScope, 'full', fullTrigger);
  }

  assert.equal(
    classifyPrGateImpact(['articles/2026-10-23-seven-eleven-gift-card-lottery.html', 'js/main.js']).browserScope,
    'full'
  );
});

test('案内と更新日の変更に限って対象ページを直接検証する', () => {
  const { onlyPageDates, ANALYTICS_TESTS } = require('../.github/scripts/detect-pr-gate-impact.cjs');
  const pages = ['attention.html'];
  const entry = name => '<url><loc>https://playpoint-sim.com/' + name + '</loc><lastmod>2026-11-01</lastmod></url>';
  const sitemap = entry('index.html') + entry('attention.html');
  assert.ok(onlyPageDates('sitemap.xml', sitemap, entry('index.html') + entry('attention.html').replace('11-01', '11-02'), pages));
  assert.equal(onlyPageDates('sitemap.xml', sitemap, sitemap.replace('11-01', '11-02'), pages), false);
  const dates = "  'attention.html': '2026-11-01',\n  'index.html': '2026-11-01',";
  assert.ok(onlyPageDates('scripts/content-dates.cjs', dates, dates.replace('11-01', '11-02'), pages));
  assert.equal(onlyPageDates('scripts/content-dates.cjs', dates, dates + '\nupdate()', pages), false);
  const files = [...pages, 'scripts/content-dates.cjs', 'sitemap.xml'];
  assert.equal(classifyPrGateImpact(files, { datesVerified: true }).browserScope, 'pages');
  assert.equal(classifyPrGateImpact(files).browserScope, 'full');
  assert.equal(classifyPrGateImpact(['articles/new-story.html', 'scripts/content-dates.cjs']).browserScope, 'full');
  assert.equal(classifyPrGateImpact(pages, { regular: false }).browserScope, 'full');
  assert.deepEqual(resolveChecks('pages'), ['changed-page-smoke.cjs']);
  const script = 'scripts/playpoint-analytics-maintenance.gs';
  assert.equal(classifyPrGateImpact([script, ...ANALYTICS_TESTS]).preflightScope, 'analytics');
  assert.equal(classifyPrGateImpact([script, 'scripts/unknown.gs']).preflightScope, 'full');
  assert.equal(classifyPrGateImpact([script, 'js/main.js']).preflightScope, 'full');
  assert.equal(classifyPrGateImpact([script], { regular: false }).preflightScope, 'full');
});

test('PRブラウザランナーは全8本を3レーン並列またはarticles scopeへ正しく振り分ける', async t => {
  assert.equal(parseScope([]), 'full');
  assert.equal(parseScope(['--scope', 'articles']), 'articles');
  assert.throws(() => parseScope(['--scope', 'invalid']), /Unknown browser check scope/);
  assert.deepEqual(resolveChecks('full'), PR_BROWSER_CHECKS);
  assert.deepEqual(resolveChecks('articles'), ARTICLE_BROWSER_CHECKS);
  assert.equal(PR_BROWSER_CHECKS.length, 8);
  assert.deepEqual(ARTICLE_BROWSER_CHECKS, ['article-design-smoke.cjs', 'article-css-smoke.cjs', 'browser-revenue-smoke.cjs']);

  const artifactsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-pr-browser-'));
  t.after(() => fs.rmSync(artifactsDir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(artifactsDir, 'stale.txt'), 'old');

  const started = [];
  let releaseCore;
  const siblingReady = new Promise(resolve => { releaseCore = resolve; });
  await runPrChecks({
    scope: 'full',
    directory: artifactsDir,
    async run(script, args) {
      started.push({ script, args });
      if (script === 'browser-smoke.cjs') {
        assert.deepEqual(args, ['--keep-artifacts']);
        await siblingReady;
      } else if (script === 'article-design-smoke.cjs') {
        releaseCore();
      }
    }
  });
  assert.equal(fs.existsSync(path.join(artifactsDir, 'stale.txt')), false);
  assert.deepEqual(started.map(item => item.script).sort(), [...PR_BROWSER_CHECKS].sort());
});
