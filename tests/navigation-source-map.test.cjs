'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  audit,
  buildPipeline,
  candidateGenerators,
  fileToPublicPath,
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
    surface: 'body',
    hasHreflang: false,
    explicitJapaneseFallback: false,
    ...overrides
  };
}

test('navigation source-map scans the complete checked-in public HTML surface', () => {
  const report = audit(root);
  assert.ok(report.stats.htmlPages > 100, `expected broad HTML coverage, got ${report.stats.htmlPages}`);
  assert.ok(report.stats.internalAnchorEdges > report.stats.htmlPages, 'expected internal transition graph');
  assert.ok(report.stats.headMetadataLinks > 0, 'expected canonical/hreflang metadata inventory');
  assert.ok(report.stats.publicTargets >= report.stats.htmlPages, 'non-HTML public targets must be inventoried too');
  assert.equal(report.stats.unclassifiedGeneratorPages, 0, 'every published HTML family needs an ownership candidate');
  for (const locale of ['ja', 'en', 'ko', 'tw', 'hk', 'in']) {
    assert.ok(report.stats.byLocale[locale] > 0, `missing locale coverage: ${locale}`);
  }
  assert.ok(report.sourceSignals.some(row => row.file === 'scripts/language-page-builder.cjs'), 'language page generator must be inventoried');
  assert.ok(report.sourceSignals.some(row => row.file === 'scripts/intl-navigation-sidebar-v1.cjs'), 'intl navigation generator must be inventoried');
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

test('explicit switches and visible Japanese fallbacks are separated from accidental crossings', () => {
  assert.equal(transitionKind(edge({ surface: 'region-switcher' })), 'region-switch');
  assert.equal(transitionKind(edge({ surface: 'locale-switcher' })), 'locale-switch');
  assert.equal(transitionKind(edge({ hasHreflang: true })), 'locale-switch');
  assert.equal(transitionKind(edge({ explicitJapaneseFallback: true })), 'explicit-ja-fallback');
  assert.equal(transitionKind(edge()), 'cross-locale-candidate');
  assert.equal(transitionKind(edge({ targetLocale: 'en' })), 'same-locale');
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

test('build pipeline inventory captures assigned calls, late imports, repeat finalizers and side-effect generation', () => {
  const pipeline = buildPipeline(root);
  assert.ok(pipeline.length > 40, `expected full build pipeline, got ${pipeline.length}`);
  assert.ok(pipeline.some(row => row.source === 'scripts/generate-game-simulators.cjs' && row.function === '[side-effect require]'));
  assert.ok(pipeline.some(row => row.function === 'syncIndexMetadata'), 'assigned build calls must be captured');
  assert.ok(pipeline.some(row => row.function === 'syncArticleDiscovery'), 'late import must be captured');
  assert.equal(pipeline.filter(row => row.function === 'syncIntlArticleJapaneseHreflang').length, 2, 'initial and final hreflang passes must both be visible');
  assert.deepEqual(pipeline.map(row => row.order), pipeline.map((_, index) => index + 1));
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
  assert.match(preflight, /navigation-source-map\.cjs', '--write-evidence', '--evidence-dir'/);
  assert.match(preflight, /path\.join\(evidenceDir\(\), 'navigation-source-map'\)/);
});
