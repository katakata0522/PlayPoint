'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const {
  audit,
  candidateGenerators,
  fileToPublicPath,
  localeOf,
  resolveInternalHref
} = require('../scripts/navigation-source-map.cjs');

const root = path.resolve(__dirname, '..');

test('navigation source-map scans the complete checked-in HTML surface', () => {
  const report = audit(root);
  assert.ok(report.stats.htmlPages > 100, `expected broad HTML coverage, got ${report.stats.htmlPages}`);
  assert.ok(report.stats.internalAnchorEdges > report.stats.htmlPages, 'expected internal transition graph');
  assert.ok(report.stats.headMetadataLinks > 0, 'expected canonical/hreflang metadata inventory');
  for (const locale of ['ja', 'en', 'ko', 'tw', 'hk', 'in']) {
    assert.ok(report.stats.byLocale[locale] > 0, `missing locale coverage: ${locale}`);
  }
  assert.ok(report.sourceSignals.some(row => row.file === 'scripts/language-page-builder.cjs'), 'language page generator must be inventoried');
  assert.ok(report.sourceSignals.some(row => row.file === 'scripts/intl-navigation-sidebar-v1.cjs'), 'intl navigation generator must be inventoried');
});

test('navigation source-map keeps transition normalization deterministic', () => {
  assert.equal(fileToPublicPath('index.html'), '/');
  assert.equal(fileToPublicPath('en/index.html'), '/en/');
  assert.equal(localeOf('/en/articles/example.html'), 'en');
  assert.equal(localeOf('/articles/example.html'), 'ja');
  assert.equal(resolveInternalHref('../articles/', '/en/'), '/articles/');
  assert.equal(resolveInternalHref('./articles/', '/en/'), '/en/articles/');
});

test('known page families retain explicit generator ownership candidates', () => {
  const intl = candidateGenerators('/en/articles/google-play-points-levels.html');
  assert.equal(intl.group, 'intl-article');
  assert.ok(intl.sources.includes('scripts/intl-navigation-sidebar-v1.cjs'));

  const region = candidateGenerators('/hk/');
  assert.equal(region.group, 'expanded-region-top');
  assert.ok(region.sources.includes('scripts/region-page-sync.cjs'));
});

test('candidate findings remain inventory data rather than an automatic zero-issue gate', () => {
  const report = audit(root);
  assert.ok(Array.isArray(report.suspiciousEdges));
  for (const edge of report.suspiciousEdges) {
    assert.ok(edge.issues.length > 0);
    assert.ok(edge.generatorGroup);
    assert.ok(Array.isArray(edge.generatorSources));
  }
});
