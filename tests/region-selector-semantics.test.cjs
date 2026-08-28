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
});

test('browser-language suggestion never treats generic English or Chinese as a US/Taiwan rule match', () => {
  const js = fs.readFileSync(path.join(root, 'js', 'language-suggestion.js'), 'utf8');
  assert.match(js, /en-us/);
  assert.match(js, /U\.S\. Play Points calculator is available!/);
  assert.doesNotMatch(js, /English version is available!/);
  assert.doesNotMatch(js, /提供繁體中文版本/);
  assert.match(js, /대한민국 Play Points 계산기가 있습니다!/);
  assert.match(js, /Generic English does not imply United States Play rules/);
});

test('longer country labels switch to a two-column mobile grid instead of overflowing', () => {
  const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
  assert.match(css, /@media \(max-width: 520px\)[\s\S]*?\.region-switch \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.region-switch \.region-more \{[\s\S]*?grid-column: 1 \/ -1/);
});
