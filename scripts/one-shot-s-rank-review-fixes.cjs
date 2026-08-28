'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function update(relativePath, transform) {
  const file = path.join(root, relativePath);
  const before = fs.readFileSync(file, 'utf8');
  const after = transform(before);
  if (after === before) throw new Error(`review patch made no change: ${relativePath}`);
  fs.writeFileSync(file, after, 'utf8');
  console.log(`patched ${relativePath}`);
}

update('scripts/intl-guide-taxonomy.cjs', source => source.replace(
  "const CATEGORY_OVERRIDES = Object.freeze({\n",
  "const CATEGORY_OVERRIDES = Object.freeze({\n  'google-play-balance-combine-payment': 'earn',\n  'google-play-games-vs-play-points': 'account',\n"
));

update('js/language-suggestion.js', source => source
  .replace(
    "        messageText = '한국어 버전이 있습니다!';\n        buttonText = '한국어로 전환';",
    "        messageText = '대한민국 Play Points 계산기가 있습니다!';\n        buttonText = '대한민국 버전으로 전환';"
  )
  .replace(
    "    } else if (browserLang.startsWith('zh')) {\n        targetRegion = 'TW';\n        messageText = '提供繁體中文版本！';\n        buttonText = '切換至繁體中文';\n        isCurrentMatch = isTaiwanPath();\n",
    ''
  )
  .replace(
    "    } else if (browserLang.startsWith('en')) {\n        targetRegion = 'US';\n        messageText = 'English version is available!';\n        buttonText = 'Switch to English';\n        isCurrentMatch = isEnglishPath();\n",
    ''
  ));

update('style.css', source => source.replace(
`@media (max-width: 700px) {
.comparison-reference-boundary {`,
`@media (max-width: 520px) {
.region-switch {
display: grid;
grid-template-columns: repeat(2, minmax(0, 1fr));
width: 100%;
gap: .35rem;
}
.region-switch > button {
width: 100%;
padding: .4em .55em;
border: 1px solid var(--input-border-color) !important;
border-radius: 6px !important;
white-space: nowrap;
}
.region-switch .region-more {
grid-column: 1 / -1;
width: 100%;
}
.region-switch .region-more-toggle {
width: 100%;
border: 1px solid var(--input-border-color) !important;
border-radius: 6px !important;
}
}
@media (max-width: 700px) {
.comparison-reference-boundary {`
));

update('tests/intl-guide-discovery.test.cjs', source => source.replace(
  "  assert.equal(getIntlGuideCategory('/en/articles/google-play-points-device-change.html'), 'account');",
  "  assert.equal(getIntlGuideCategory('/en/articles/google-play-points-device-change.html'), 'account');\n  assert.equal(getIntlGuideCategory('/en/articles/google-play-balance-combine-payment.html'), 'earn');\n  assert.equal(getIntlGuideCategory('/en/articles/google-play-games-vs-play-points.html'), 'account');"
));

update('tests/region-selector-semantics.test.cjs', source => source.replace(
`test('expanded selector keeps Hong Kong and India discoverable as regions', () => {
  const js = fs.readFileSync(path.join(root, 'js', 'region-navigation.js'), 'utf8');
  assert.match(js, /香港 Hong Kong/);
  assert.match(js, />India</);
  assert.match(js, /More regions/);
});`,
`test('expanded selector keeps Hong Kong and India discoverable as regions', () => {
  const js = fs.readFileSync(path.join(root, 'js', 'region-navigation.js'), 'utf8');
  assert.match(js, /香港 Hong Kong/);
  assert.match(js, />India</);
  assert.match(js, /More regions/);
});

test('browser-language suggestion never presents generic English or Chinese as a US/Taiwan rule match', () => {
  const js = fs.readFileSync(path.join(root, 'js', 'language-suggestion.js'), 'utf8');
  assert.match(js, /en-us/);
  assert.match(js, /U\\.S\\. Play Points calculator is available!/);
  assert.doesNotMatch(js, /English version is available!/);
  assert.doesNotMatch(js, /提供繁體中文版本/);
  assert.match(js, /대한민국 Play Points 계산기가 있습니다!/);
});

test('longer country labels switch to a two-column mobile grid instead of overflowing', () => {
  const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
  assert.match(css, /@media \\(max-width: 520px\\)[\\s\\S]*?\\.region-switch \\{[\\s\\S]*?grid-template-columns: repeat\\(2, minmax\\(0, 1fr\\)\\)/);
  assert.match(css, /\\.region-switch \\.region-more \\{[\\s\\S]*?grid-column: 1 \\/ -1/);
});`
));
