'use strict';

const fs = require('node:fs');
const { detectDeployImpact, normalizeRepositoryPath } = require('./detect-deploy-impact.cjs');

const BROWSER_GATE_INPUTS = Object.freeze([
  '.github/workflows/quality-check.yml',
  '.github/scripts/setup-browser-runtime.sh',
  '.github/scripts/browser-smoke.cjs',
  '.github/scripts/ui-contract-browser.cjs',
  '.github/scripts/diary-browser.cjs',
  '.github/scripts/accessibility-browser.cjs',
  '.github/scripts/browser-reading-ui.cjs',
  '.github/scripts/calculator-presentation-contract.cjs',
  '.github/scripts/game-calculator-browser.cjs',
  '.github/scripts/article-css-smoke.cjs',
  '.github/scripts/article-design-smoke.cjs',
  '.github/scripts/mobile-region-layout-smoke.cjs',
  '.github/scripts/mobile-first-view-smoke.cjs',
  '.github/scripts/site-shell-vnext-smoke.cjs',
  '.github/scripts/browser-revenue-smoke.cjs',
  '.github/scripts/embed-widget-smoke.cjs',
  '.github/scripts/browser-navigation-retry.cjs',
  '.github/scripts/browser-revision-evidence.cjs',
  '.github/scripts/verify-deploy-revision.cjs',
  '.github/scripts/detect-pr-gate-impact.cjs',
  '.github/scripts/bind-browser-evidence.cjs',
  '.github/scripts/browser-concurrency.cjs',
  '.github/scripts/run-pr-browser-checks.cjs',
  '.github/scripts/refactor-runtime-compatibility.cjs',
  '.github/scripts/refactor-visual-smoke.cjs',
]);

// 代表・統合シナリオから参照されない単体記事HTMLだけの変更時は記事・収益関連のChromium検査へ絞る。
const STANDALONE_ARTICLE_HTML = /^(?:(?:en|ko|tw|hk|in)\/)?articles\/(?!index\.html$)[^/]+\.html$/;
const CORE_SUITE_REFERENCED_ARTICLES = new Set([
  'articles/2025-12-25-best-use.html',
  'articles/2025-12-25-diamond-worth-it.html',
  'articles/2026-07-24-play-points-1-value.html',
  'articles/2026-09-19-play-points-calendar-schedule-guide.html',
  'articles/2026-09-26-pokemon-sleep-play-points-coupon.html',
  'articles/2026-10-10-diamond-play-pass-value.html',
  'en/articles/google-play-points-weekly-reward.html',
  'ko/articles/google-play-points-weekly-reward.html',
  'tw/articles/google-play-points-weekly-reward.html',
  'en/articles/google-play-points-super-weekly-reward.html',
  'ko/articles/google-play-points-super-weekly-reward.html',
  'tw/articles/google-play-points-super-weekly-reward.html',
]);

function isStandaloneNonFixtureArticle(filePath) {
  return STANDALONE_ARTICLE_HTML.test(filePath) && !CORE_SUITE_REFERENCED_ARTICLES.has(filePath);
}

const APACHE_GATE_INPUTS = Object.freeze([
  '.github/scripts/detect-pr-gate-impact.cjs',
  '.htaccess',
  'tests/helpers/apache-cache-contract.cjs',
  '.github/scripts/http-cache-contract.cjs',
  'tests/http-cache-contract.test.cjs',
]);

function classifyPrGateImpact(changedPaths) {
  if (!Array.isArray(changedPaths)) throw new TypeError('変更パスは配列で指定してください');
  const normalized = changedPaths.map(normalizeRepositoryPath).filter(Boolean);
  const deployImpact = detectDeployImpact(normalized);
  const browserPaths = normalized.filter(file =>
    deployImpact.deploymentPaths.some(item => item.path === file)
    || BROWSER_GATE_INPUTS.includes(file)
    || file.startsWith('.github/ci-runtime/')
  );
  const apachePaths = normalized.filter(file => APACHE_GATE_INPUTS.includes(file));

  const uniqueBrowserPaths = [...new Set(browserPaths)];
  const browserScope = uniqueBrowserPaths.length === 0
    ? 'none'
    : uniqueBrowserPaths.every(isStandaloneNonFixtureArticle)
      ? 'articles'
      : 'full';

  return {
    browserRequired: uniqueBrowserPaths.length > 0,
    browserScope,
    apacheRequired: apachePaths.length > 0,
    browserPaths: uniqueBrowserPaths,
    apachePaths: [...new Set(apachePaths)],
  };
}

if (require.main === module) {
  try {
    const changedPaths = fs.readFileSync(0, 'utf8').split(/\r?\n/).filter(Boolean);
    process.stdout.write(JSON.stringify(classifyPrGateImpact(changedPaths)) + '\n');
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

module.exports = {
  APACHE_GATE_INPUTS,
  BROWSER_GATE_INPUTS,
  classifyPrGateImpact,
};
