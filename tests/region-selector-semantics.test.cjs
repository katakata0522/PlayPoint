'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { runEsmProbe } = require('./helpers/runtime-esm.cjs');

const root = path.resolve(__dirname, '..');
const primaryRegions = [
  ['JP', 'JP'],
  ['US', 'US'],
  ['KR', 'KR'],
  ['TW', 'TW']
];
const primaryRegionFiles = new Set(['index.html', 'en/index.html', 'ko/index.html', 'tw/index.html']);
const expandedRegionFiles = new Map([
  ['hk/index.html', /香港 Play Points 官方條件/],
  ['in/index.html', /India Play Points official conditions/]
]);
const regionSelectorAriaLabels = new Map([
  ['index.html', 'Play の国または地域'],
  ['en/index.html', 'Play country or region'],
  ['ko/index.html', 'Play 국가 또는 지역'],
  ['tw/index.html', 'Play 國家或地區'],
  ['hk/index.html', 'Play 國家或地區'],
  ['in/index.html', 'Play country or region']
]);

for (const file of ['index.html', 'en/index.html', 'ko/index.html', 'tw/index.html', 'hk/index.html', 'in/index.html']) {
  test(`${file} presents Play country/region rather than language-only labels`, () => {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.ok(
      html.includes(`<div class="region-switch" aria-label="${regionSelectorAriaLabels.get(file)}">`),
      `${file}: region selector aria-label must match the page locale`
    );
    for (const [region, label] of primaryRegions) {
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      assert.match(html, new RegExp(`<button data-region="${region}"(?: class="active")?>${escaped}<\\/button>`));
    }
    const active = html.match(/<button data-region="(?:JP|US|KR|TW)" class="active">/g) || [];
    if (primaryRegionFiles.has(file)) {
      assert.equal(active.length, 1, `${file}: exactly one primary region must be active in fallback HTML`);
      return;
    }

    assert.ok(expandedRegionFiles.has(file), `${file}: unknown region selector contract`);
    assert.equal(active.length, 0, `${file}: an expanded region must not present another primary region as current`);
    assert.match(html, expandedRegionFiles.get(file), `${file}: fallback HTML must identify the actual expanded region`);
  });
}

test('expanded selector keeps Hong Kong and India discoverable as regions', () => {
  const js = fs.readFileSync(path.join(root, 'js', 'region-navigation.js'), 'utf8');
  assert.match(js, /香港 Hong Kong/);
  assert.match(js, />India</);
  assert.match(js, /More regions/);
  assert.match(js, /HK: \{ short: 'HK' \}/);
  assert.match(js, /IN: \{ short: 'IN' \}/);
  assert.match(js, /aria-current/);
});

test('browser-language compatibility delegates recommendation behavior to first-view', () => {
  const graph = runEsmProbe({ kind: 'graph' });
  const compatibility = graph.find(item => new URL(item.url).pathname === '/js/language-suggestion.js');
  assert.ok(compatibility, 'language-suggestion.js is missing from the active ESM graph');
  const dependencies = new Set(compatibility.imports.map(url => new URL(url).pathname));
  assert.ok(dependencies.has('/js/first-view.js'), 'browser-language compatibility no longer delegates to first-view');
});

test('mobile selector owns first-paint protection before the async stylesheet arrives', () => {
  const js = fs.readFileSync(path.join(root, 'js', 'region-navigation.js'), 'utf8');

  assert.match(js, /REGION_SELECTOR_CRITICAL_STYLE_ID = 'region-selector-critical-style'/);
  assert.match(js, /ensureRegionSelectorCriticalStyle\(\);[\s\S]*?const bootRegionSelector/);
});

test('mobile selector keeps separate compact labels and a 44px touch target', () => {
  const css = fs.readFileSync(path.join(root, 'region-selector.css'), 'utf8');

  assert.match(css, /\.region-label-desktop \{[\s\S]*?display: none/);
  assert.match(css, /\.region-label-mobile \{[\s\S]*?display: inline/);
  assert.match(css, /min-height: 44px/);
});

test('desktop selector loads local SVG flags only in the desktop/tablet stylesheet', () => {
  const css = fs.readFileSync(path.join(root, 'desktop-topbar.css'), 'utf8');
  const js = fs.readFileSync(path.join(root, 'js', 'region-navigation.js'), 'utf8');

  assert.match(css, /@media \(min-width: 521px\)[\s\S]*?\.region-label-desktop::before/);
  assert.match(css, /width: 24px;[\s\S]*?height: 18px;/);
  assert.match(js, /window\.innerWidth <= 520/);
  assert.match(js, /desktop-topbar\.css/);
  assert.match(js, /data-desktop-topbar-style/);

  const labels = { JP: '🇯🇵 JP', US: '🇺🇸 US', KR: '🇰🇷 KR', TW: '🇹🇼 TW' };
  const assets = { JP: 'jp.svg', US: 'us.svg', KR: 'kr.svg', TW: 'tw.svg', HK: 'hk.svg', IN: 'in.svg' };
  for (const [region, mobile] of Object.entries(labels)) {
    assert.ok(
      js.includes(`${region}: { desktop: '${region}', mobile: '${mobile}' }`),
      `missing responsive visible label for ${region}`
    );
  }
  for (const [region, file] of Object.entries(assets)) {
    assert.ok(fs.existsSync(path.join(root, 'images', 'flags', file)), `missing local flag asset ${file}`);
    assert.match(css, new RegExp(`data-region=["']${region}["'][\\s\\S]*?flags/${file.replace('.', '\\.')}`));
  }
});
test('region selector uses localized accessible names instead of English-only labels', () => {
  const js = fs.readFileSync(path.join(root, 'js', 'region-navigation.js'), 'utf8');

  assert.match(js, /REGION_ACCESSIBLE_NAMES/);
  assert.match(js, /Google Play Points の国・地域/);
  assert.match(js, /Google Play Points 국가\/지역/);
  assert.match(js, /Google Play Points 國家\/地區/);
  assert.match(js, /getAccessibleRegionName\(region\)/);
  assert.match(js, /button\.setAttribute\('aria-label', `\$\{accessibleName\} — \$\{copy\.regionSuffix\}`\)/);
});

test('region selector state styling uses the expanded-region data state', () => {
  const css = fs.readFileSync(path.join(root, 'region-selector.css'), 'utf8');

  assert.match(css, /\.region-more-toggle\[data-region-active="true"\]/);
  assert.doesNotMatch(css, /\.region-more-toggle\.active \{/);
});