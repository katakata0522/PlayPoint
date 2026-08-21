'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assertContentDate(relativePath) {
  const html = read(relativePath);
  assert.match(html, /<meta name="last-modified" content="2026-08-21">/, relativePath);
  assert.match(html, /"dateModified": "2026-08-21"/, relativePath);
}

test('international amount pages describe special earn rate rather than a multiplier input', () => {
  const en = read('en/amount/10000/index.html');
  assert.match(en, /Check: status, special earn rate, eligible amount/);
  assert.match(en, /Change the status and special earn rate to match your account/);
  assert.doesNotMatch(en, /Check: status, multiplier, eligible amount/);
  assert.doesNotMatch(en, /Change the status and multiplier to match your account/);

  const ko = read('ko/amount/10000/index.html');
  assert.match(ko, /확인: 등급, 특별 적립률, 대상 금액/);
  assert.match(ko, /실제 등급과 특별 적립률에 맞게 바꾸세요/);
  assert.doesNotMatch(ko, /확인: 등급, 배율, 대상 금액/);
  assert.doesNotMatch(ko, /실제 등급과 배율에 맞게 바꾸세요/);

  const tw = read('tw/amount/10000/index.html');
  assert.match(tw, /確認: 等級、特別獲點率、適用金額/);
  assert.doesNotMatch(tw, /確認: 等級、倍率、適用金額/);
});

test('all three international amount pages receive the meaningful content date', () => {
  for (const file of [
    'en/amount/10000/index.html',
    'ko/amount/10000/index.html',
    'tw/amount/10000/index.html'
  ]) {
    assertContentDate(file);
  }
});

test('legacy multiplier query parameter remains for backward-compatible amount links', () => {
  for (const file of [
    'en/amount/10000/index.html',
    'ko/amount/10000/index.html',
    'tw/amount/10000/index.html'
  ]) {
    assert.match(read(file), /multiplier=1/, file);
  }
});
