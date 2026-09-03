'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const primaryRegions = [
  ['JP', '🇯🇵 日本'],
  ['US', '🇺🇸 United States'],
  ['KR', '🇰🇷 대한민국'],
  ['TW', '🇹🇼 台灣']
];

for (const file of ['index.html', 'en/index.html', 'ko/index.html', 'tw/index.html', 'hk/index.html', 'in/index.html']) {
  test(`${file} presents Play country/region rather than language-only labels`, () => {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(html, /<div class="region-switch" aria-label="Play country or region">/);
    for (const [region, label] of primaryRegions) {
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      assert.match(html, new RegExp(`<button data-region="${region}"(?: class="active")?>${escaped}<\\/button>`));
    }
    const active = html.match(/<button data-region="(?:JP|US|KR|TW)" class="active">/g) || [];
    assert.equal(active.length, 1, `${file}: exactly one primary region must be active in fallback HTML`);
  });
}

test('expanded selector keeps Hong Kong and India discoverable as regions', () => {
  const js = fs.readFileSync(path.join(root, 'js', 'region-navigation.js'), 'utf8');
  assert.match(js, /香港 Hong Kong/);
  assert.match(js, />India</);
  assert.match(js, /More regions/);
  assert.match(js, /🇭🇰 HK/);
  assert.match(js, /🇮🇳 IN/);
  assert.match(js, /data-region-active="false"/);
  assert.match(js, /toggle\.dataset\.regionActive = activeExpandedRegion \? 'true' : 'false'/);
  assert.match(js, /aria-current/);
});

test('browser-language suggestion requires a country-specific locale before choosing Play rules', () => {
  const compatibility = fs.readFileSync(path.join(root, 'js', 'language-suggestion.js'), 'utf8');
  const firstView = fs.readFileSync(path.join(root, 'js', 'first-view.js'), 'utf8');

  assert.match(compatibility, /from '\.\/first-view\.js'/);
  for (const locale of ['en-us', 'ko-kr', 'zh-tw', 'zh-hk', 'en-in']) {
    assert.ok(firstView.includes(`startsWith('${locale}')`), `missing explicit locale guard: ${locale}`);
  }
  assert.match(firstView, /browserLang\.startsWith\('ko'\)\) return null/);
  assert.match(firstView, /browserLang\.startsWith\('zh'\)\) return null/);
  assert.match(firstView, /browserLang\.startsWith\('en'\)\) return null/);
  assert.match(firstView, /hideLegacyLanguageBanner\(\)/);
  assert.match(firstView, /markRegionRecommended\(suggestion\.region, suggestion\.recommendation\)/);
  assert.doesNotMatch(firstView, /languageSuggestionBanner\.classList\.remove\(CONSTANTS\.CLASS_HIDDEN\)/);
});

test('mobile selector owns first paint before the async stylesheet arrives', () => {
  const js = fs.readFileSync(path.join(root, 'js', 'region-navigation.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'region-selector.css'), 'utf8');

  assert.match(js, /REGION_SELECTOR_CRITICAL_STYLE_ID = 'region-selector-critical-style'/);
  assert.match(js, /ensureRegionSelectorCriticalStyle\(\);[\s\S]*?const bootRegionSelector/);
  assert.match(js, /grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(js, /font-size: 0/);
  for (const [region, label] of [['JP', '🇯🇵 JP'], ['US', '🇺🇸 US'], ['KR', '🇰🇷 KR'], ['TW', '🇹🇼 TW']]) {
    assert.ok(js.includes(`button[data-region="${region}"]::after { content: "${label}"; }`), `missing critical label for ${region}`);
  }

  assert.match(css, /\.region-switch > button\[data-region\]::after \{[\s\S]*?content: none/);
  assert.match(css, /@media \(max-width: 520px\)[\s\S]*?\.region-switch \{[\s\S]*?grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/);
});

test('mobile selector keeps full desktop country names but shows compact region codes in one row', () => {
  const css = fs.readFileSync(path.join(root, 'region-selector.css'), 'utf8');
  const js = fs.readFileSync(path.join(root, 'js', 'region-navigation.js'), 'utf8');

  assert.match(css, /\.region-label-desktop \{[\s\S]*?display: none/);
  assert.match(css, /\.region-label-mobile \{[\s\S]*?display: inline/);
  assert.match(css, /\.region-switch \.region-more \{[\s\S]*?grid-column: auto/);
  assert.match(css, /min-height: 44px/);

  for (const label of ['🇯🇵 JP', '🇺🇸 US', '🇰🇷 KR', '🇹🇼 TW']) {
    assert.ok(js.includes(label), `missing compact mobile label: ${label}`);
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

test('region selection color and desktop right edge are owned by region-selector.css', () => {
  const css = fs.readFileSync(path.join(root, 'region-selector.css'), 'utf8');

  assert.match(css, /\.region-more-toggle\[data-region-active="true"\]/);
  assert.match(css, /background: var\(--input-focus-border-color, #005fcc\) !important/);
  assert.match(css, /@media \(min-width: 521px\)[\s\S]*?\.region-switch \.region-more-toggle \{[\s\S]*?border-left: 0;[\s\S]*?border-top-right-radius: 6px;[\s\S]*?border-bottom-right-radius: 6px/);
  assert.doesNotMatch(css, /\.region-more-toggle\.active \{/);
});
