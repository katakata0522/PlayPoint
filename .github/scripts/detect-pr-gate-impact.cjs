'use strict';

const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
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
  '.github/scripts/changed-page-smoke.cjs',
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

const GUIDE_PAGES = new Set(['attention.html', 'hk/google-play-points-guide.html', 'in/google-play-points-guide.html']);
const ANALYTICS_SCRIPTS = new Set([
  'gsc-nonoverlap-28d', 'playpoint-ad-change-monitor', 'playpoint-analytics-feature-usage',
  'playpoint-analytics-growth-review', 'playpoint-analytics-maintenance', 'playpoint-analytics-p1p2',
  'playpoint-analytics-release-effects', 'playpoint-measurement-review', 'playpoint-revenue-diagnostics',
].map(name => 'scripts/' + name + '.gs'));
const ANALYTICS_TESTS = [
  'measurement-baseline-contract', 'playpoint-ad-change-monitor', 'playpoint-analytics-maintenance',
  'playpoint-event-daily', 'playpoint-revenue-diagnostics', 'playpoint-revenue-integrity',
  'reader-outcomes', 'security-seo-hardening',
].map(name => 'tests/' + name + '.test.cjs');
const ANALYTICS_INPUTS = new Set([...ANALYTICS_SCRIPTS, ...ANALYTICS_TESTS,
  'docs/GSC_28D_CAPTURE_RUNBOOK.md', 'docs/PLAYPOINT_ANALYTICS_P1P2_RUNBOOK.md',
  'docs/READER_OUTCOMES.md', 'docs/patches/playpoint-analytics-daily-queue.patch']);

function isFocusedPage(file) {
  return GUIDE_PAGES.has(file) || (/^(?:(?:en|ko|tw|hk|in)\/)?articles\/[a-z0-9-]+\.html$/.test(file)
    && isStandaloneNonFixtureArticle(file));
}

// 他のURL、生成コード、配信条件の変更まで日付更新として扱わない。
function onlyPageDates(file, before, after, pages) {
  function mask(text) {
    if (file === 'sitemap.xml') {
      return text.replace(/<url>[\s\S]*?<\/url>/g, entry => {
        const url = entry.match(/<loc>https:\/\/playpoint-sim\.com\/([^<]+)<\/loc>/)?.[1];
        return pages.includes(url) ? entry.replace(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/, '<lastmod/>') : entry;
      });
    }
    return text.replace(/^(\s*'([^'\n]+)':\s*')\d{4}-\d{2}-\d{2}('.*,?\s*)$/gm,
      (line, prefix, key, end) => pages.includes(key) ? prefix + 'DATE' + end : line);
  }
  return mask(before) === mask(after);
}

function classifyPrGateImpact(changedPaths, { regular = true, datesVerified = false, analyticsRegular = regular } = {}) {
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
  let browserScope = uniqueBrowserPaths.length === 0
    ? 'none'
    : uniqueBrowserPaths.every(isStandaloneNonFixtureArticle)
      ? 'articles'
      : 'full';

  const pages = normalized.filter(isFocusedPage);
  const companions = new Set(['scripts/content-dates.cjs', 'sitemap.xml']);
  if (pages.length && !datesVerified && normalized.some(file => companions.has(file))) browserScope = 'full';
  if (regular && pages.length && normalized.every(file => isFocusedPage(file) || (datesVerified && companions.has(file)))) {
    browserScope = pages.some(isStandaloneNonFixtureArticle) ? 'articles' : 'pages';
  }
  if (!regular && uniqueBrowserPaths.length) browserScope = 'full';
  const analytics = analyticsRegular && normalized.some(file => ANALYTICS_SCRIPTS.has(file))
    && normalized.every(file => ANALYTICS_INPUTS.has(file));
  return {
    preflightScope: analytics ? 'analytics' : 'full',
    pages,
    browserRequired: uniqueBrowserPaths.length > 0,
    browserScope,
    apacheRequired: apachePaths.length > 0,
    browserPaths: uniqueBrowserPaths,
    apachePaths: [...new Set(apachePaths)],
  };
}

function fromRevision(base, head = 'HEAD') {
  if (!/^[0-9a-f]{40}$/.test(base)) throw new Error('PRの基点SHAが不正です');
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (git('rev-parse', head + '^1').trim() !== base) throw new Error('PRの基点と検証対象の親が一致しません');
  const raw = git('diff', '--raw', '--no-renames', '-z', base, head).split('\0');
  raw.pop();
  const paths = [], headers = [];
  for (let i = 0; i < raw.length; i += 2) { headers.push(raw[i]); paths.push(raw[i + 1]); }
  const regular = headers.length > 0 && headers.every(value => /^:100644 100644 [0-9a-f]+ [0-9a-f]+ M$/.test(value));
  const pages = paths.filter(isFocusedPage);
  const datesVerified = regular && pages.length > 0 && ['sitemap.xml', 'scripts/content-dates.cjs']
    .filter(file => paths.includes(file))
    .every(file => onlyPageDates(file, git('show', base + ':' + file), git('show', head + ':' + file), pages));
  const analyticsRegular = headers.every((header, index) => /^:100644 100644 [0-9a-f]+ [0-9a-f]+ M$/.test(header)
    || (/^:000000 100644 0+ [0-9a-f]+ A$/.test(header) && paths[index].startsWith('docs/') && ANALYTICS_INPUTS.has(paths[index])));
  return classifyPrGateImpact(paths, { regular, datesVerified, analyticsRegular });
}

if (require.main === module) {
  try {
    const impact = process.argv[2] === '--base' ? fromRevision(process.argv[3])
      : classifyPrGateImpact(fs.readFileSync(0, 'utf8').split(/\r?\n/).filter(Boolean));
    process.stdout.write(JSON.stringify(impact) + '\n');
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

module.exports = {
  ANALYTICS_SCRIPTS, ANALYTICS_TESTS, onlyPageDates, fromRevision, isFocusedPage,
  APACHE_GATE_INPUTS,
  BROWSER_GATE_INPUTS,
  classifyPrGateImpact,
};
