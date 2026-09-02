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
    assert.equal(active.length, 1, `${file}: exactly one primary region must be active`);
  });
}

test('expanded selector keeps Hong Kong and India discoverable as regions', () => {
  const js = fs.readFileSync(path.join(root, 'js', 'region-navigation.js'), 'utf8');
  assert.match(js, /香港 Hong Kong/);
  assert.match(js, />India</);
  assert.match(js, /More regions/);
  assert.match(js, /🇭🇰 HK/);
  assert.match(js, /🇮🇳 IN/);
});

test('browser-language suggestion requires a country-specific locale before choosing Play rules', () => {
  const js = fs.readFileSync(path.join(root, 'js', 'language-suggestion.js'), 'utf8');
  assert.match(js, /en-us/);
  assert.match(js, /ko-kr/);
  assert.match(js, /zh-tw/);
  assert.match(js, /U\.S\. Play Points calculator is available!/);
  assert.doesNotMatch(js, /English version is available!/);
  assert.doesNotMatch(js, /提供繁體中文版本/);
  assert.match(js, /대한민국 Play Points 계산기가 있습니다!/);
  assert.match(js, /Generic English does not imply United States Play rules/);
  assert.match(js, /language-only ko locale does not identify the user's Play country/);
});

test('mobile selector keeps full desktop country names but shows compact region codes in one row', () => {
  const css = fs.readFileSync(path.join(root, 'region-selector.css'), 'utf8');
  const js = fs.readFileSync(path.join(root, 'js', 'region-navigation.js'), 'utf8');

  assert.match(css, /@media \(max-width: 520px\)[\s\S]*?\.region-switch \{[\s\S]*?grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.region-label-desktop \{[\s\S]*?display: none/);
  assert.match(css, /\.region-label-mobile \{[\s\S]*?display: inline/);
  assert.match(css, /\.region-switch \.region-more \{[\s\S]*?grid-column: auto/);
  assert.match(css, /min-height: 44px/);

  for (const label of ['🇯🇵 JP', '🇺🇸 US', '🇰🇷 KR', '🇹🇼 TW']) {
    assert.ok(js.includes(label), `missing compact mobile label: ${label}`);
  }
  for (const name of ['Japan', 'United States', 'South Korea', 'Taiwan']) {
    assert.ok(js.includes(`${name} — Google Play Points region`) || js.includes(`name: '${name}'`), `missing accessible region name: ${name}`);
  }
});
