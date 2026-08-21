const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const platinumPath = path.join(root, 'status', 'platinum', 'index.html');

function readPlatinumPage() {
  return fs.readFileSync(platinumPath, 'utf8');
}

test('Platinum LP describes the current special earn-rate input', () => {
  const html = readPlatinumPage();

  assert.match(html, /Google Playに表示された特別獲得率/);
  assert.match(html, /<strong>特別獲得率:<\/strong>/);
  assert.doesNotMatch(html, /キャンペーン倍率を入力/);
  assert.doesNotMatch(html, /<strong>倍率:<\/strong>/);
});

test('Platinum LP does not advertise the removed weekly-average result', () => {
  const html = readPlatinumPage();

  assert.doesNotMatch(html, /週平均/);
  assert.match(html, /月平均/);
  assert.match(html, /1日あたり/);
});
