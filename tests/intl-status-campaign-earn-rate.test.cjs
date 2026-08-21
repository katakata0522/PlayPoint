'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assertContentDate(relativePath, expectedDate) {
  const html = read(relativePath);
  assert.match(html, new RegExp(`<meta name="last-modified" content="${expectedDate}">`), relativePath);
  assert.match(html, new RegExp(`"dateModified": "${expectedDate}"`), relativePath);
}

test('international status pages describe final special earn rates instead of multiplying tier rates', () => {
  const diamondKo = read('ko/status/diamond/index.html');
  assert.match(diamondKo, /현재 등급의 기본 적립률/);
  assert.match(diamondKo, /Google Play에 표시된 최종 특별 적립률/);
  assert.doesNotMatch(diamondKo, /먼저 1배로 기준/);

  const platinumEn = read('en/status/platinum/index.html');
  assert.match(platinumEn, /normal tier earn rate/);
  assert.match(platinumEn, /final special earn rate shown in Google Play/);
  assert.doesNotMatch(platinumEn, /Run the estimate at 1x first/);

  const platinumKo = read('ko/status/platinum/index.html');
  assert.match(platinumKo, /현재 등급의 기본 적립률/);
  assert.match(platinumKo, /최종 특별 적립률/);
  assert.doesNotMatch(platinumKo, /확인: 남은 포인트, 배율, 지역 조건/);

  const platinumTw = read('tw/status/platinum/index.html');
  assert.match(platinumTw, /目前等級基本獲點率/);
  assert.match(platinumTw, /Google Play 顯示的最終特別獲點率/);
  assert.doesNotMatch(platinumTw, /確認: 剩餘點數、倍率、地區條件/);

  const goldEn = read('en/status/gold/index.html');
  assert.match(goldEn, /normal tier earn rate/);
  assert.match(goldEn, /final special earn rate shown in Google Play/);
  assert.doesNotMatch(goldEn, /Run a 1x estimate first/);

  const goldKo = read('ko/status/gold/index.html');
  assert.match(goldKo, /현재 등급의 기본 적립률/);
  assert.match(goldKo, /최종 특별 적립률/);

  const goldTw = read('tw/status/gold/index.html');
  assert.match(goldTw, /目前等級基本獲點率/);
  assert.match(goldTw, /最終特別獲點率/);
});

test('campaign wait pages compare confirmed rates without treating 2x or 3x as a multiplier input', () => {
  const en = read('en/campaign/wait/index.html');
  assert.match(en, /Start with your normal tier earn rate/);
  assert.match(en, /final special earn rate shown in Google Play/);
  assert.doesNotMatch(en, /A multiplier should be entered/);
  assert.doesNotMatch(en, /Compare 1x, then 2x, then 3x/);

  const ko = read('ko/campaign/wait/index.html');
  assert.match(ko, /현재 등급의 기본 적립률/);
  assert.match(ko, /Google Play에 표시된 최종 특별 적립률/);
  assert.doesNotMatch(ko, /대상 결제일 때만 배율 사용/);

  const tw = read('tw/campaign/wait/index.html');
  assert.match(tw, /目前等級基本獲點率/);
  assert.match(tw, /Google Play 顯示的最終特別獲點率/);
  assert.doesNotMatch(tw, /只有符合資格才輸入倍率/);
});

test('only meaningfully edited international LP locale/page pairs receive the new content date', () => {
  for (const file of [
    'ko/status/diamond/index.html',
    'en/status/platinum/index.html',
    'ko/status/platinum/index.html',
    'tw/status/platinum/index.html',
    'en/status/gold/index.html',
    'ko/status/gold/index.html',
    'tw/status/gold/index.html',
    'en/campaign/wait/index.html',
    'ko/campaign/wait/index.html',
    'tw/campaign/wait/index.html'
  ]) {
    assertContentDate(file, '2026-08-21');
  }

  for (const file of [
    'en/status/diamond/index.html',
    'tw/status/diamond/index.html',
    'en/status/silver/index.html',
    'en/campaign/2x/index.html',
    'en/campaign/3x/index.html'
  ]) {
    assertContentDate(file, '2026-08-18');
  }
});

test('legacy multiplier query parameters remain for backward-compatible calculator links', () => {
  assert.match(read('en/status/gold/index.html'), /multiplier=1/);
  assert.match(read('en/campaign/2x/index.html'), /multiplier=2/);
  assert.match(read('en/campaign/3x/index.html'), /multiplier=3/);
  assert.match(read('en/campaign/wait/index.html'), /multiplier=2/);
});
