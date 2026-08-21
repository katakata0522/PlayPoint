'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

const articleFiles = [];
for (const locale of ['en', 'ko', 'tw']) {
  const dir = path.join(root, locale, 'articles');
  for (const name of fs.readdirSync(dir)) {
    if (name.endsWith('.html')) articleFiles.push(`${locale}/articles/${name}`);
  }
}

const staleArticlePhrases = [
  'Use the calculator at 1x first',
  'A 1x estimate gives you',
  'current status and multiplier',
  'status rate, and multiplier',
  'multiplier you can honestly use',
  'Always compare the 1x estimate first',
  'Estimate at 1x before checking campaigns',
  'Compare the normal 1x path first',
  'same thresholds and multipliers',
  'multiplier events can significantly reduce',
  'Run the same amount at 1x',
  'calculate the subscription at 1x first',
  '적용할 배율을 차례로 넣고',
  '먼저 1배 기준으로 예상치를 보고',
  '먼저 1배 기준을 보고',
  '1배와 캠페인 특별 적립률',
  '1배 예상치, 캠페인 특별 적립률 예상치',
  '공식 화면에 명확한 배율이 있을 때만',
  '부족 포인트, 현재 적립률, 표시된 배율',
  '可以先用 1 倍估算基準',
  '先看 1 倍基準，再看活動特別獲點率',
  '請先用 1 倍估算基準',
  '先估 1 倍結果，再估 2 倍或 3 倍結果',
  '預期倍率、1 倍估算',
  '官方畫面明確顯示倍率時',
  '不足點數、目前積點率與帳號顯示倍率'
];

test('international article source does not teach multiplier-as-input semantics', () => {
  const source = read('scripts/intl-seo-content.cjs');
  for (const phrase of staleArticlePhrases) {
    assert.ok(!source.includes(phrase), `stale international article source wording remains: ${phrase}`);
  }
  assert.match(source, /final special earn rate shown/);
  assert.match(source, /최종 특별 적립률/);
  assert.match(source, /最終.*特別獲點率/);
  assert.match(source, /multiplier=1/); // legacy URL compatibility remains intentionally supported.
});

test('published international articles do not expose stale multiplier input instructions', () => {
  for (const relativePath of articleFiles) {
    const html = read(relativePath);
    for (const phrase of staleArticlePhrases) {
      assert.ok(!html.includes(phrase), `${relativePath}: stale wording remains: ${phrase}`);
    }
  }
});

test('level-planning articles do not advertise the removed weekly-average result', () => {
  const checks = [
    ['en/articles/google-play-points-levels.html', 'Weekly and monthly views are helpful'],
    ['ko/articles/google-play-points-levels.html', '남은 기간을 주 단위나 월 단위로 나누면'],
    ['tw/articles/google-play-points-levels.html', '把總金額拆成每週或每月節奏']
  ];
  for (const [relativePath, stale] of checks) {
    assert.ok(!read(relativePath).includes(stale), `${relativePath}: removed weekly-average style wording remains`);
  }
});

test('campaign labels remain available without restoring multiplier math', () => {
  assert.match(read('en/articles/google-play-points-not-showing.html'), /2x or 3x/);
  assert.match(read('ko/articles/google-play-points-not-showing.html'), /2배나 3배/);
  assert.match(read('tw/articles/google-play-points-not-showing.html'), /2 倍或 3 倍/);
});
