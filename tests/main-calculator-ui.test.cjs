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

test('通常計算は倍率を主画面へ残し、直接獲得率と平均パック額を詳細設定へ移す', () => {
  assert.match(uiSource, /statusSection\.append\(multiplierLabel, multiplier\)/);
  assert.match(uiSource, /content\.append\(baseRateLabel, baseRate\)/);
  assert.match(uiSource, /content\.appendChild\(packSettings\)/);
  assert.match(uiSource, /actionSection\.appendChild\(details\)/);
  assert.match(uiSource, /rateSection\.remove\(\)/);

  assert.match(uiSource, /document\.createElement\('details'\)/);
  assert.doesNotMatch(uiSource, /details\.open\s*=\s*true/);
  assert.match(uiSource, /existingAdvancedSettings/);
});

test('4言語に通常倍率と詳細設定の文言が用意されている', () => {
  const expectedCopy = [
    'キャンペーン倍率（通常は1倍）',
    '詳細な条件で計算する',
    'Campaign multiplier (normally 1×)',
    'Use advanced calculation settings',
    '캠페인 배율 (보통 1배)',
    '상세 조건으로 계산하기',
    '活動倍率（通常為 1 倍）',
    '使用進階條件計算'
  ];

  for (const text of expectedCopy) {
    assert.ok(uiSource.includes(text), `missing copy: ${text}`);
  }
});

test('初期化前にDOMを組み替え、地域更新時に文言も更新する', () => {
  assert.match(mainSource, /import \{ simplifyMainCalculatorLayout, updateSimplifiedCalculatorCopy \} from '\.\/main-calculator-ui\.js';/);
  assert.match(mainSource, /export function init\(\) \{\s*simplifyMainCalculatorLayout\(STATE\.currentRegion\);/s);
  assert.match(mainSource, /UI\.updateUIText\(\);\s*updateSimplifiedCalculatorCopy\(STATE\.currentRegion\);/s);
});

test('既存の入力IDと共有URL仕様を維持する', () => {
  for (const indexPath of indexPaths) {
    const html = read(indexPath);
    for (const id of ['currentStatus', 'targetStatus', 'neededPoints', 'multiplier', 'baseRate', 'pack-amount']) {
      assert.match(html, new RegExp(`id=["']${id}["']`), `${indexPath}: missing ${id}`);
    }
    assert.match(html, /id=["']reverseMode["']/);
  }

  assert.match(shareSource, /url\.searchParams\.set\('multiplier', String\(multiplier\)\)/);
  assert.match(shareSource, /CALC\.calculate\(\)/);
});

test('新しいUIモジュールを圧縮・版管理・Service Workerの対象に含める', () => {
  assert.match(minifySource, /'js\/main-calculator-ui\.js'/);
  assert.match(assetSyncSource, /'js\/main-calculator-ui\.js'/);
  assert.match(swSource, /'\.\/js\/main-calculator-ui\.js'/);
});
