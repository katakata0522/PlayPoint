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

test('calculator headers are owned by one immutable Site Shell registry without fixed item counts', () => {
  assert.ok(Object.isFrozen(CALCULATOR_HEADER_PROFILES));
  assert.ok(Object.isFrozen(CALCULATOR_REGION_BUTTONS));
  assert.ok(targetPaths.length > 0, 'calculator header target registry must not be empty');

  const regionIds = CALCULATOR_REGION_BUTTONS.map(button => button.region);
  assert.equal(new Set(regionIds).size, regionIds.length, 'calculator region ids must stay unique');

  for (const relativePath of targetPaths) {
    const profile = getCalculatorHeaderProfile(relativePath);
    assert.ok(Object.isFrozen(profile));
    assert.equal(profile.regionButtons, CALCULATOR_REGION_BUTTONS);
    assert.ok(Object.isFrozen(profile.links));
    assert.ok(profile.regionButtons.length > 0, relativePath + ': region buttons are empty');
    assert.ok(profile.links.length > 0, relativePath + ': header links are empty');
    assert.ok(String(profile.regionAriaLabel || '').trim(), relativePath + ': accessible region label is missing');
    if (profile.activeRegion !== null) assert.ok(regionIds.includes(profile.activeRegion), relativePath + ': active region is unknown');
  }

  const flexible = renderCalculatorHeader({
    activeRegion: 'JP',
    regionAriaLabel: 'Regions',
    regionButtons: [
      { region: 'JP', label: 'Japan' },
      { region: 'US', label: 'U.S.' }
    ],
    links: [{ href: '/', label: 'Home', langKey: 'home' }]
  });
  assert.match(flexible, /data-region="JP" class="active"/);
  assert.match(flexible, /data-region="US"/);
  assert.match(flexible, /data-lang-key="home"/);

  assert.throws(() => renderCalculatorHeader({
    activeRegion: 'JP',
    regionAriaLabel: 'Regions',
    regionButtons: [{ region: 'JP', label: 'Japan' }, { region: 'JP', label: 'Duplicate' }],
    links: [{ href: '/', label: 'Home', langKey: 'home' }]
  }), /unique region ids/);
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

test('海外の計算機からゲーム一覧へ進んでも国・地域を維持する', () => {
  for (const locale of ['en', 'ko', 'tw']) {
    const relativePath = `${locale}/index.html`;
    const profile = getCalculatorHeaderProfile(relativePath);
    const games = profile.links.find(link => link.langKey === 'linkGames');
    const destination = new URL(games.href, `https://playpoint-sim.com/${relativePath}`);
    assert.equal(destination.pathname, `/${locale}/games/`);
    assert.ok(fs.existsSync(path.join(root, locale, 'games', 'index.html')));
  }
});

test('calculator Header synchronization repairs drift and becomes idempotent', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-calculator-shell-'));
  try {
    copyTargetTree(tempRoot);

    const clean = syncCalculatorHeaders(tempRoot);
    assert.equal(clean.changed, 0);
    assert.equal(clean.checked, targetPaths.length);

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
