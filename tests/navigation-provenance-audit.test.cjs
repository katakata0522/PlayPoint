'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  classifyTransition,
  equivalentCandidates,
  extractHtmlNavigation,
  extractRuntimeNavigationFromText,
  isDeclaredContentFallback,
  regionForPathname,
  resolveReference
} = require('../scripts/navigation-provenance-audit.cjs');

function index(paths) {
  return new Map(paths.map((pathname, i) => [pathname, `file-${i}.html`]));
}

function record(overrides = {}) {
  return {
    sourceFile: 'en/articles/source.html',
    sourcePath: '/en/articles/source.html',
    sourceRegion: 'US',
    kind: 'anchor',
    role: 'content',
    scope: 'internal',
    pathname: '/articles/target.html',
    targetRegion: 'JP',
    ...overrides
  };
}

test('region detection distinguishes all six Play country roots', () => {
  assert.equal(regionForPathname('/'), 'JP');
  assert.equal(regionForPathname('/en/articles/x.html'), 'US');
  assert.equal(regionForPathname('/ko/'), 'KR');
  assert.equal(regionForPathname('/tw/'), 'TW');
  assert.equal(regionForPathname('/hk/'), 'HK');
  assert.equal(regionForPathname('/in/'), 'IN');
});

test('localized Japanese fallback is high priority when same-locale equivalent exists', () => {
  const urls = index(['/articles/target.html', '/en/articles/target.html']);
  const result = classifyTransition(record(), urls);
  assert.equal(result.disposition, 'likely-wrong-locale');
  assert.equal(result.issue, 'localized-equivalent-exists');
  assert.equal(result.localizedEquivalent, '/en/articles/target.html');
});

test('HK to TW and IN to EN article/game fallback is explicitly declared', () => {
  const hk = record({ sourceFile: 'hk/index.html', sourcePath: '/hk/', sourceRegion: 'HK', pathname: '/tw/articles/', targetRegion: 'TW' });
  const india = record({ sourceFile: 'in/index.html', sourcePath: '/in/', sourceRegion: 'IN', pathname: '/en/games/', targetRegion: 'US' });
  assert.equal(isDeclaredContentFallback('HK', hk), true);
  assert.equal(isDeclaredContentFallback('IN', india), true);
  assert.equal(classifyTransition(hk, index(['/tw/articles/'])).disposition, 'declared-content-fallback');
  assert.equal(classifyTransition(india, index(['/en/games/'])).disposition, 'declared-content-fallback');
});

test('region switch and hreflang cross-region links are not treated as user-navigation defects', () => {
  const urls = index(['/en/', '/ko/']);
  const regionSwitch = record({ sourceRegion: 'US', sourcePath: '/en/', pathname: '/ko/', targetRegion: 'KR', role: 'region-switch' });
  const hreflang = record({ sourceRegion: 'US', sourcePath: '/en/', pathname: '/ko/', targetRegion: 'KR', kind: 'hreflang', role: 'hreflang' });
  assert.equal(classifyTransition(regionSwitch, urls).disposition, 'declared-region-switch');
  assert.equal(classifyTransition(hreflang, urls).disposition, 'hreflang-cross-locale');
});

test('HTML extraction covers anchors, canonical, hreflang, form actions and meta refresh', () => {
  const html = [
    '<link rel="canonical" href="https://playpoint-sim.com/en/">',
    '<link href="https://playpoint-sim.com/ko/" hreflang="ko" rel="alternate">',
    '<a href="./articles/">Guides</a>',
    '<form action="/en/search.html"></form>',
    '<meta http-equiv="refresh" content="0; url=/en/">'
  ].join('\n');
  const records = extractHtmlNavigation('en/index.html', html);
  assert.deepEqual(records.map(item => item.kind).sort(), ['anchor', 'canonical', 'form-action', 'hreflang', 'meta-refresh'].sort());
});

test('runtime extraction keeps literal destinations separate from dynamic expressions', () => {
  const records = extractRuntimeNavigationFromText(
    'js/example.js',
    'window.location.href = "/en/";\nlocation.assign(nextUrl);\nwindow.open("/ko/");'
  );
  assert.equal(records.length, 3);
  assert.equal(records[0].scope, 'internal');
  assert.equal(records[1].scope, 'dynamic');
  assert.equal(records[2].scope, 'internal');
});

test('equivalent candidates map Japanese blog hub to locale guide hub', () => {
  assert.deepEqual(equivalentCandidates('/blog/', 'US'), ['/en/articles/']);
  assert.deepEqual(equivalentCandidates('/blog/', 'HK'), ['/tw/articles/']);
});

test('URL normalization keeps query/hash for evidence while classifying by pathname', () => {
  const value = resolveReference('../?status=gold#result', 'https://playpoint-sim.com/en/articles/a.html');
  assert.equal(value.scope, 'internal');
  assert.equal(value.pathname, '/en/');
  assert.equal(value.search, '?status=gold');
  assert.equal(value.hash, '#result');
});
