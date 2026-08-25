'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('dormant international Amount fallback copy uses special earn-rate terminology', () => {
  const source = read('scripts/intl-seo-content.cjs');

  assert.match(source, /Check: status, special earn rate, eligible amount/);
  assert.match(source, /Change the status and special earn rate to match your account/);
  assert.doesNotMatch(source, /Check: status, multiplier, eligible amount/);
  assert.doesNotMatch(source, /Change the status and multiplier to match your account/);

  assert.match(source, /확인: 등급, 특별 적립률, 대상 금액/);
  assert.match(source, /실제 등급과 특별 적립률에 맞게 바꾸세요/);
  assert.doesNotMatch(source, /확인: 등급, 배율, 대상 금액/);
  assert.doesNotMatch(source, /실제 등급과 배율에 맞게 바꾸세요/);

  assert.match(source, /確認: 等級、特別獲點率、適用金額/);
  assert.doesNotMatch(source, /確認: 等級、倍率、適用金額/);
});

test('published Japanese Amount copy uses special earn-rate terminology', () => {
  const ja = read('amount/10000/index.html');

  assert.match(ja, /特別獲得率/);
  assert.doesNotMatch(ja, /ステータスや倍率ごとに/);
  assert.doesNotMatch(ja, /キャンペーン倍率との違い/);
  assert.doesNotMatch(ja, /逆算・1万円・通常倍率/);
  assert.match(ja, /multiplier=1/);
});

test('published international Amount overrides stay unchanged and keep legacy query compatibility', () => {
  const en = read('en/amount/10000/index.html');
  const ko = read('ko/amount/10000/index.html');
  const tw = read('tw/amount/10000/index.html');

  assert.match(en, /Check: level, promotion rate, eligible pre-tax amount/);
  assert.match(en, /Change the amount, level, or special earn rate to match the purchase you are planning/);
  assert.match(ko, /확인: 등급, 특별 적립률, 대상 금액/);
  assert.match(tw, /確認: 等級、特別獲點率、適用金額/);

  for (const html of [en, ko, tw]) {
    assert.match(html, /multiplier=1/);
    assert.match(html, /2026-08-18/);
  }
});
