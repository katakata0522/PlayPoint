'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

function before(html, first, second, label) {
  const a = html.indexOf(first);
  const b = html.indexOf(second);
  assert.notEqual(a, -1, `${label}: missing first marker`);
  assert.notEqual(b, -1, `${label}: missing second marker`);
  assert.ok(a < b, `${label}: search answer must precede calculator CTA`);
}

test('Taiwan use-coupons guide gives a reward decision framework before calculator', () => {
  const html = read('tw/articles/google-play-points-use-coupons.html');
  assert.match(html, /Google Play Points 怎麼用/);
  assert.match(html, /自己真的會用到的價值 ÷ 所需點數/);
  assert.match(html, /最低消費/);
  assert.match(html, /15776916/);
  assert.match(html, /playpoint:official-verified" content="2026-09-03"/);
  before(html, 'id="tw-use-answer"', 'data-generated-intl-article-prompt="true"', 'TW use-coupons');
});

test('English quests guide diagnoses missing and stuck states before calculator', () => {
  const html = read('en/articles/google-play-quests.html');
  assert.match(html, /Quest missing or stuck/);
  assert.match(html, /purchase step does not count/i);
  assert.match(html, /Play Games profile/);
  assert.match(html, /canceled or refunded/);
  assert.match(html, /11534416/);
  assert.match(html, /playpoint:official-verified" content="2026-09-03"/);
  before(html, 'id="quest-quick-check"', 'data-generated-intl-article-prompt="true"', 'EN quests');
});
