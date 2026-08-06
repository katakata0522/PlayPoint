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
const swSource = read('sw.js');
const minifySource = read('.github/scripts/minify.cjs');
const assetSyncSource = read('scripts/asset-sync.cjs');
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

test('4言語に自動入力の獲得率と通常倍率の文言が用意されている', () => {
  const expectedCopy = [
    '100円あたりの獲得率（自動入力・編集可）',
    'キャンペーン倍率（通常は1倍）',
    'Points per $1 (auto-filled, editable)',
    'Campaign multiplier (normally 1×)',
    '₩1,000당 적립률 (자동 입력·수정 가능)',
    '캠페인 배율 (보통 1배)',
    '每 NT$30 獲得點數（自動帶入，可修改）',
    '活動倍率（通常為 1 倍）'
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

test('UIモジュールを圧縮・版管理・Service Workerの対象に含める', () => {
  assert.match(minifySource, /'js\/main-calculator-ui\.js'/);
  assert.match(assetSyncSource, /'js\/main-calculator-ui\.js'/);
  assert.match(swSource, /'\.\/js\/main-calculator-ui\.js\?v=[a-f0-9]{10}'/);
});
