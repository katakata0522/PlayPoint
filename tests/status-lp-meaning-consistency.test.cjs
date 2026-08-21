const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const statusPages = [
  ['Silver', path.join(root, 'status', 'silver', 'index.html')],
  ['Gold', path.join(root, 'status', 'gold', 'index.html')],
  ['Diamond', path.join(root, 'status', 'diamond', 'index.html')]
];

for (const [label, pagePath] of statusPages) {
  test(`${label} LP uses the current special earn-rate meaning`, () => {
    const html = fs.readFileSync(pagePath, 'utf8');

    assert.match(html, /特別獲得率/);
    assert.doesNotMatch(html, /キャンペーン倍率を入力/);
    assert.doesNotMatch(html, /残りポイントと倍率を入/);
    assert.doesNotMatch(html, /<strong>倍率:<\/strong>/);
  });

  test(`${label} LP does not advertise the removed weekly-average result`, () => {
    const html = fs.readFileSync(pagePath, 'utf8');
    assert.doesNotMatch(html, /週平均/);
  });
}
