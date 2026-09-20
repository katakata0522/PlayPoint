const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const statusPages = [
  ['Silver', path.join(root, 'status', 'silver', 'index.html')],
  ['Gold', path.join(root, 'status', 'gold', 'index.html')],
  ['Platinum', path.join(root, 'status', 'platinum', 'index.html')],
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

  test(`${label} LP does not describe special earn rate as a 2x/3x multiplier`, () => {
    const html = fs.readFileSync(pagePath, 'utf8');
    assert.doesNotMatch(html, /2倍・3倍/);
  });
}

test('シルバーLPの早見表はブロンズ→シルバーで入力できる不足ポイントだけを出す', () => {
  const html = fs.readFileSync(path.join(root, 'status', 'silver', 'index.html'), 'utf8');
  const points = [...html.matchAll(/<td>([\d,]+) pt<\/td>/g)].map(match => Number(match[1].replace(/,/g, '')));
  assert.ok(points.length >= 2, '早見表の不足ポイント行がありません');
  for (const value of points) {
    assert.ok(value > 0 && value <= 250, `シルバー早見表の ${value} pt は計算機の上限250を超える`);
  }
  assert.doesNotMatch(html, />500 pt</);
});

test('プラチナLPは月平均・1日あたりが折りたたみ詳細側だと案内する', () => {
  const html = fs.readFileSync(path.join(root, 'status', 'platinum', 'index.html'), 'utf8');
  assert.doesNotMatch(html, /到達額だけでなく、月平均、1日あたりも一緒に見てください/);
  assert.match(html, /計算の詳細を見る/);
});
