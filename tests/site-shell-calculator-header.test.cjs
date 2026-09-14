'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  CALCULATOR_HEADER_PROFILES,
  CALCULATOR_REGION_BUTTONS,
  getCalculatorHeaderProfile,
  renderCalculatorHeader
} = require('../scripts/site-shell.cjs');
const { locateTopBar } = require('../scripts/fixed-page-header-sync.cjs');
const { syncCalculatorHeaders } = require('../scripts/calculator-header-sync.cjs');

const root = path.resolve(__dirname, '..');
const targetPaths = Object.keys(CALCULATOR_HEADER_PROFILES);

function copyTargetTree(tempRoot) {
  for (const relativePath of targetPaths) {
    const source = path.join(root, relativePath);
    const target = path.join(tempRoot, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
}

test('Stage 12C owns the six calculator headers from one immutable Site Shell registry', () => {
  assert.ok(Object.isFrozen(CALCULATOR_HEADER_PROFILES));
  assert.ok(Object.isFrozen(CALCULATOR_REGION_BUTTONS));
  assert.deepEqual(targetPaths, [
    'index.html',
    'en/index.html',
    'ko/index.html',
    'tw/index.html',
    'hk/index.html',
    'in/index.html'
  ]);

  const activeRegions = Object.fromEntries(
    targetPaths.map(relativePath => [relativePath, getCalculatorHeaderProfile(relativePath).activeRegion])
  );
  assert.deepEqual(activeRegions, {
    'index.html': 'JP',
    'en/index.html': 'US',
    'ko/index.html': 'KR',
    'tw/index.html': 'TW',
    'hk/index.html': null,
    'in/index.html': null
  });

  for (const relativePath of targetPaths) {
    const profile = getCalculatorHeaderProfile(relativePath);
    assert.ok(Object.isFrozen(profile));
    assert.equal(profile.regionButtons, CALCULATOR_REGION_BUTTONS);
    assert.ok(Object.isFrozen(profile.links));
    assert.equal(profile.regionButtons.length, 4);
    assert.equal(profile.links.length, 4);
    assert.equal(profile.regionAriaLabel, 'Play country or region');
  }

  assert.throws(() => getCalculatorHeaderProfile('games/index.html'), /No calculator header profile/);
});

test('calculator Site Shell preserves Hong Kong and India fallback navigation without pretending it is local game coverage', () => {
  const hongKong = getCalculatorHeaderProfile('hk/index.html');
  const india = getCalculatorHeaderProfile('in/index.html');

  assert.deepEqual(
    hongKong.links.slice(1, 3).map(link => [link.href, link.label]),
    [
      ['../tw/games/', '🎮 遊戲計算（台灣規則・非香港）'],
      ['../tw/articles/', '📝 指南']
    ]
  );
  assert.deepEqual(
    india.links.slice(1, 3).map(link => [link.href, link.label]),
    [
      ['../en/games/', '🎮 Game calculators (U.S. rules, not India)'],
      ['../en/articles/', '📝 Articles']
    ]
  );
});

test('committed calculator pages are already byte-canonical for the shared Header renderer', () => {
  for (const relativePath of targetPaths) {
    const html = fs.readFileSync(path.join(root, relativePath), 'utf8');
    const located = locateTopBar(html, relativePath);
    const expected = renderCalculatorHeader(getCalculatorHeaderProfile(relativePath), located.indent);
    assert.equal(located.html, expected, `${relativePath} calculator header drifted from Site Shell`);
  }
});

test('calculator Header synchronization repairs drift and becomes idempotent', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-calculator-shell-'));
  try {
    copyTargetTree(tempRoot);

    const clean = syncCalculatorHeaders(tempRoot);
    assert.equal(clean.changed, 0);
    assert.equal(clean.checked, 6);

    const englishPath = path.join(tempRoot, 'en', 'index.html');
    fs.writeFileSync(
      englishPath,
      fs.readFileSync(englishPath, 'utf8').replace('>📝 Articles</a>', '>📝 Articles drift</a>'),
      'utf8'
    );

    const repaired = syncCalculatorHeaders(tempRoot);
    assert.deepEqual(repaired.changedFiles, ['en/index.html']);
    assert.doesNotMatch(fs.readFileSync(englishPath, 'utf8'), /Articles drift/);
    assert.equal(syncCalculatorHeaders(tempRoot).changed, 0);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('canonical build applies calculator Header synchronization after regional generation and before public asset finalization', () => {
  const source = fs.readFileSync(path.join(root, 'scripts', 'build-html.js'), 'utf8');
  assert.match(source, /require\('\.\/calculator-header-sync\.cjs'\)/);

  const localizedIndex = source.indexOf('writeLocalizedPages(rootDir');
  const regionIndex = source.indexOf('syncRegionPages(rootDir)');
  const regionHreflangIndex = source.indexOf('syncRegionHreflang(rootDir)');
  const headerIndex = source.indexOf('syncCalculatorHeaders(rootDir)');
  const publicAssetsIndex = source.indexOf('syncPublicAssetVersions(rootDir)');

  assert.ok(localizedIndex >= 0);
  assert.ok(regionIndex > localizedIndex);
  assert.ok(regionHreflangIndex > regionIndex);
  assert.ok(headerIndex > regionHreflangIndex);
  assert.ok(publicAssetsIndex > headerIndex);
});
