const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pages = [
  ['2x', path.join(root, 'campaign', '2x', 'index.html')],
  ['3x', path.join(root, 'campaign', '3x', 'index.html')],
  ['wait', path.join(root, 'campaign', 'wait', 'index.html')]
];

for (const [label, pagePath] of pages) {
  test(`${label} campaign LP does not describe the input as a multiplier`, () => {
    const html = fs.readFileSync(pagePath, 'utf8');

    assert.match(html, /特別獲得率/);
    assert.doesNotMatch(html, /ステータス倍率/);
    assert.doesNotMatch(html, /倍率別の必要課金額/);
    assert.doesNotMatch(html, /倍率差/);
    assert.doesNotMatch(html, /倍率込みの計算/);
    assert.doesNotMatch(html, /倍率や不足ポイントを含んだURL/);
  });
}

test('2x and 3x campaign tables label the baseline as the normal earn rate', () => {
  for (const relativePath of ['2x', '3x']) {
    const html = fs.readFileSync(path.join(root, 'campaign', relativePath, 'index.html'), 'utf8');
    assert.match(html, /通常獲得率/);
    assert.doesNotMatch(html, /通常時（1倍）/);
  }
});
