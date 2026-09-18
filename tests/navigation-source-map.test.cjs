'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  audit,
  buildPipeline,
  candidateGenerators,
  extractAnchors,
  fileToPublicPath,
  findCallColumn,
  hasExplicitTargetMarker,
  localeOf,
  resolveInternalHref,
  targetExists,
  transitionKind
} = require('../scripts/navigation-source-map.cjs');

const root = path.resolve(__dirname, '..');

function edge(overrides = {}) {
  return {
    sourceLocale: 'en',
    targetLocale: 'ja',
    target: '/articles/example.html',
    label: '',
    surface: 'body',
    hasHreflang: false,
    explicitLocaleFallback: false,
    ...overrides
  };
}

test('navigation source-map scans the complete checked-in public HTML surface', () => {
  const report = audit(root);
  assert.ok(report.stats.htmlPages > 0, 'public HTML inventory must not be empty');
  assert.ok(report.stats.internalAnchorEdges > 0, 'internal transition graph must not be empty');
  assert.ok(report.stats.headMetadataLinks > 0, 'canonical/hreflang metadata inventory must not be empty');
  assert.ok(report.stats.publicTargets >= report.stats.htmlPages, 'public target inventory must cover every HTML page');
  assert.equal(report.stats.unclassifiedGeneratorPages, 0, 'every published HTML family needs an ownership candidate');
  for (const locale of ['ja', 'en', 'ko', 'tw', 'hk', 'in']) {
    assert.ok(report.stats.byLocale[locale] > 0, `missing locale coverage: ${locale}`);
  }
  assert.ok(Array.isArray(report.sourceSignals) && report.sourceSignals.length > 0, 'generator source inventory must not be empty');
});

test('navigation source-map keeps transition normalization deterministic', () => {
  assert.equal(fileToPublicPath('index.html'), '/');
  assert.equal(fileToPublicPath('en/index.html'), '/en/');
  assert.equal(fileToPublicPath('feed.xml'), '/feed.xml');
  assert.equal(localeOf('/en/articles/example.html'), 'en');
  assert.equal(localeOf('/articles/example.html'), 'ja');
  assert.equal(resolveInternalHref('../articles/', '/en/'), '/articles/');
  assert.equal(resolveInternalHref('./articles/', '/en/'), '/en/articles/');
  assert.equal(targetExists('/feed.xml', new Set(['/feed.xml'])), true);
});

test('explicit switches and visible destination markers are separated from accidental crossings', () => {
  assert.equal(transitionKind(edge({ surface: 'region-switcher' })), 'region-switch');
  assert.equal(transitionKind(edge({ surface: 'locale-switcher' })), 'locale-switch');
  assert.equal(transitionKind(edge({ hasHreflang: true })), 'locale-switch');
  assert.equal(transitionKind(edge({ explicitLocaleFallback: true })), 'explicit-locale-fallback');
  assert.equal(transitionKind(edge()), 'cross-locale-candidate');
  assert.equal(transitionKind(edge({ targetLocale: 'en' })), 'same-locale');

  const examples = [
    ['Japanese reference page', 'ja'],
    ['일본어 참고 페이지', 'ja'],
    ['日文參考頁', 'ja'],
    ['Open U.S. calculator →', 'en'],
    ['영문 등급 가이드 보기', 'en'],
    ['한국어', 'ko'],
    ['繁體中文指南（台灣）', 'tw'],
    ['Hong Kong', 'hk'],
    ['India', 'in']
  ];
  for (const [label, targetLocale] of examples) {
    assert.equal(hasExplicitTargetMarker(label, targetLocale), true, `destination marker must be recognized: ${label} -> ${targetLocale}`);
  }
  assert.equal(hasExplicitTargetMarker('Privacy Policy', 'ja'), false, 'unmarked cross-locale link must stay reviewable');

  for (const [label, href] of [
    ['Japanese reference page', '/privacy.html'],
    ['영문 등급 가이드 보기', '/en/articles/google-play-points-levels.html'],
    ['繁體中文', '/tw/']
  ]) {
    const [anchor] = extractAnchors(`<a href="${href}">${label}</a>`, '/ko/');
    assert.equal(anchor.explicitLocaleFallback, true, `anchor must carry explicit locale classification: ${label}`);
  }
});

test('known page families retain explicit generator ownership candidates', () => {
  const intl = candidateGenerators('/en/articles/google-play-points-levels.html');
  assert.equal(intl.group, 'intl-article');
  assert.ok(intl.sources.includes('scripts/intl-navigation-sidebar-v1.cjs'));

  const intlLp = candidateGenerators('/en/status/diamond/');
  assert.equal(intlLp.group, 'intl-seo-lp');
  assert.ok(intlLp.sources.includes('scripts/intl-seo-pages.cjs'));

  const jpLp = candidateGenerators('/status/diamond/');
  assert.equal(jpLp.group, 'japanese-seo-lp');

  const region = candidateGenerators('/hk/');
  assert.equal(region.group, 'expanded-region-top');
  assert.ok(region.sources.includes('scripts/region-page-sync.cjs'));
});

test('pipeline call scanner uses identifier boundaries for callable names', () => {
  assert.equal(findCallColumn('syncArticleDiscovery({ rootDir });', 'syncArticleDiscovery'), 0);
  assert.equal(findCallColumn('  syncArticleDiscovery ({ rootDir });', 'syncArticleDiscovery'), 2);
  assert.equal(findCallColumn('prefixsyncArticleDiscovery({ rootDir });', 'syncArticleDiscovery'), -1);
  assert.equal(findCallColumn('syncArticleDiscoveryExtra({ rootDir });', 'syncArticleDiscovery'), -1);
  assert.equal(findCallColumn('tool$({ rootDir });', 'tool$'), 0);
});

test('build pipeline inventory captures assigned calls, late imports, repeat finalizers and side-effect generation', () => {
  const pipeline = buildPipeline(root);
  assert.ok(pipeline.length > 0, 'build pipeline inventory must not be empty');
  assert.ok(pipeline.some(row => row.source === 'scripts/generate-game-simulators.cjs' && row.function === '[side-effect require]'));
  assert.ok(pipeline.some(row => row.function === 'syncIndexMetadata'), 'assigned build calls must be captured');
  assert.ok(pipeline.some(row => row.function === 'syncArticleDiscovery' && row.source === 'scripts/article-discovery-sync.cjs'), 'late import must resolve to its real source');
  assert.ok(pipeline.some(row => row.function === 'normalizeArticleContentNavigation' && row.source === 'scripts/article-content-navigation-normalize.cjs'), 'aliased require must resolve to its real source');
  assert.ok(pipeline.filter(row => row.function === 'syncIntlArticleJapaneseHreflang').length >= 2, 'repeat finalizers must remain visible');
  assert.deepEqual(pipeline.map(row => row.order), pipeline.map((_, index) => index + 1));
  assert.deepEqual([...pipeline].sort((a, b) => a.line - b.line || a.order - b.order), pipeline, 'pipeline rows must remain in build source order');
  for (const row of pipeline.filter(row => row.function !== '[side-effect require]')) {
    assert.ok(fs.existsSync(path.join(root, row.source)), `pipeline source must exist: ${row.source}`);
  }
});

test('candidate findings remain inventory data rather than an automatic zero-issue gate', () => {
  const report = audit(root);
  assert.ok(Array.isArray(report.suspiciousEdges));
  for (const item of report.suspiciousEdges) {
    assert.ok(item.issues.length > 0);
    assert.ok(item.generatorGroup);
    assert.ok(Array.isArray(item.generatorSources));
    assert.ok(item.transitionKind);
  }
});

test('preflight stores navigation evidence outside the repository root evidence namespace', () => {
  const preflight = fs.readFileSync(path.join(root, '.github/scripts/preflight.cjs'), 'utf8');
  assert.match(preflight, /navigation-source-map\.cjs'[\s\S]*'--write-evidence'[\s\S]*'--evidence-dir'/);
  assert.match(preflight, /path\.join\(evidenceDir\(\), 'navigation-source-map'\)/);
});
