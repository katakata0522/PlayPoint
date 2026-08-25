'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const uiSource = read('js/main-calculator-ui.js');
const mainSource = read('js/main.js');
const shareSource = read('js/share.js');
const indexPaths = ['index.html', 'en/index.html', 'ko/index.html', 'tw/index.html'];

test('通常計算は自動入力される獲得率と倍率を主画面に残し、平均パック額を表示しない', () => {
  assert.match(uiSource, /statusSection\.append\(baseRateLabel, baseRate, multiplierLabel, multiplier\)/);
  assert.match(uiSource, /const rateWarning = rateSection && rateSection\.querySelector\('\.warning'\)/);
  assert.match(uiSource, /statusSection\.appendChild\(rateWarning\)/);
  assert.match(uiSource, /if \(packSettings\) packSettings\.remove\(\)/);
  assert.match(uiSource, /rateSection\.remove\(\)/);
  assert.match(uiSource, /mainMode\.dataset\.visibleBaseRateLayout = 'true'/);

  assert.doesNotMatch(uiSource, /document\.createElement\('details'\)/);
  assert.doesNotMatch(uiSource, /advanced-calculation-settings/);
  assert.doesNotMatch(uiSource, /advancedSummary/);
});

test('4言語に通常獲得率とキャンペーン特別獲得率の文言が用意されている', () => {
  const expectedCopy = [
    '通常獲得率（自動入力・編集可）',
    'キャンペーン特別獲得率（例：3pt/100円）',
    'Base earn rate per $1 (auto-filled, editable)',
    'Promotion special earn rate (e.g. 3 pt / $1)',
    '기본 적립률 (자동 입력·수정 가능)',
    '캠페인 특별 적립률 (예: 1,000원당 3pt)',
    '基本獲點率（自動帶入，可修改）',
    '活動特別獲點率（例：每 NT$30 3 點）'
  ];

  for (const text of expectedCopy) {
    assert.ok(uiSource.includes(text), `missing copy: ${text}`);
  }

  for (const removedText of [
    '購入単位まで細かく計算する',
    'Use purchase-by-purchase calculation',
    '구매 단위까지 자세히 계산하기',
    '依每次購買金額精細計算'
  ]) {
    assert.ok(!uiSource.includes(removedText), `obsolete copy remains: ${removedText}`);
  }
});

test('初期化前にDOMを組み替え、地域更新時に文言も更新する', () => {
  assert.match(mainSource, /import \{ simplifyMainCalculatorLayout, updateSimplifiedCalculatorCopy \} from '\.\/main-calculator-ui\.js\?v=[a-f0-9]{10}';/);
  assert.match(mainSource, /export function init\(\) \{\s*simplifyMainCalculatorLayout\(STATE\.currentRegion\);/s);
  assert.match(mainSource, /UI\.updateUIText\(\);\s*updateSimplifiedCalculatorCopy\(STATE\.currentRegion\);/s);
});

test('既存の主要入力IDと共有URL仕様を維持する', () => {
  for (const indexPath of indexPaths) {
    const html = read(indexPath);
    for (const id of ['currentStatus', 'targetStatus', 'neededPoints', 'multiplier', 'baseRate']) {
      assert.match(html, new RegExp(`id=["']${id}["']`), `${indexPath}: missing ${id}`);
    }
    assert.match(html, /id=["']reverseMode["']/);
  }

  assert.match(shareSource, /url\.searchParams\.set\('multiplier', String\(multiplier\)\)/);
  assert.match(shareSource, /CALC\.calculate\(\)/);
});
