'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  ensureStaticCalculatorLayout,
  validateStaticLayout
} = require('../scripts/static-calculator-layout.cjs');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const expectedLabels = Object.freeze({
  'index.html': [
    '100円あたりの獲得率（自動入力・編集可）',
    'キャンペーン特別獲得率（例：3pt/100円）'
  ],
  'en/index.html': [
    'Points per $1 (auto-filled, editable)',
    'Promotion special earn rate (e.g. 3 pt / $1)'
  ],
  'ko/index.html': [
    '₩1,000당 적립률 (자동 입력·수정 가능)',
    '캠페인 특별 적립률 (예: 1,000원당 3pt)'
  ],
  'tw/index.html': [
    '每 NT$30 獲得點數（自動帶入，可修改）',
    '活動特別獲點率（例：每 NT$30 3 點）'
  ]
});
const indexPaths = Object.keys(expectedLabels);

const legacyCalculatorFixture = `
<div id="mainMode" role="tabpanel" aria-labelledby="tab-main">
  <div class="section">
    <label for="currentStatus"><span data-lang-key="labelCurrentStatus">現在</span></label>
    <select id="currentStatus"></select>
    <label for="targetStatus"><span data-lang-key="labelTargetStatus">目標</span></label>
    <select id="targetStatus"></select>
    <label for="neededPoints"><span data-lang-key="labelNeededPoints">必要</span></label>
    <input id="neededPoints">
    <!-- オプション設定（平均パック額） -->
    <div class="option-settings"><div><input id="pack-amount"></div></div>
  </div>
  <div class="section">
    <h2 data-lang-key="sectionTitleRate">還元設定</h2>
    <label for="baseRate"><span data-lang-key="labelBaseRate">直接入力</span></label>
    <input id="baseRate">
    <label for="multiplier"><span data-lang-key="labelMultiplier">倍率</span></label>
    <input id="multiplier">
    <div class="warning" data-lang-key="warningRate">説明</div>
  </div>
  <div class="section"><button id="calculateButton">計算</button></div>
</div>`;

test('旧HTMLを5項目の静的レイアウトへ安全に変換できる', () => {
  const converted = ensureStaticCalculatorLayout(legacyCalculatorFixture);
  validateStaticLayout(converted);
  assert.ok(!converted.includes('id="pack-amount"'));
  assert.ok(!converted.includes('sectionTitleRate'));
  assert.match(converted, /data-visible-base-rate-layout="true"/);
  assert.match(converted, /100円あたりの獲得率（自動入力・編集可）/);
  assert.match(converted, /キャンペーン特別獲得率（例：3pt\/100円）/);
  assert.ok(!converted.includes('data-lang-key="labelBaseRate"'));
  assert.ok(!converted.includes('data-lang-key="labelMultiplier"'));
  assert.equal(ensureStaticCalculatorLayout(converted), converted, '静的化処理は冪等である');
});

test('4言語の公開HTMLはJavaScript実行前から5項目と専用ラベルを持つ', () => {
  for (const indexPath of indexPaths) {
    const html = read(indexPath);
    const mainMode = html.slice(html.indexOf('<div id="mainMode"'), html.indexOf('<div id="reverseMode"'));
    validateStaticLayout(html);
    assert.ok(!mainMode.includes('id="pack-amount"'), `${indexPath}: 平均パック額が残っている`);
    assert.ok(!mainMode.includes('data-lang-key="sectionTitleRate"'), `${indexPath}: 独立した還元設定が残っている`);
    assert.ok(!mainMode.includes('data-lang-key="labelBaseRate"'), `${indexPath}: 通常計算の獲得率が一般翻訳キーへ依存している`);
    assert.ok(!mainMode.includes('data-lang-key="labelMultiplier"'), `${indexPath}: 通常計算の倍率が一般翻訳キーへ依存している`);
    for (const label of expectedLabels[indexPath]) {
      assert.ok(mainMode.includes(label), `${indexPath}: 静的ラベルがありません: ${label}`);
    }
  }
});

test('多言語生成処理は通常計算専用ラベルを一般翻訳と分離する', () => {
  const source = read('scripts/language-page-builder.cjs');
  assert.match(source, /SIMPLIFIED_CALCULATOR_COPY/);
  assert.match(source, /replaceSimplifiedCalculatorCopy/);
  for (const labels of Object.values(expectedLabels).slice(1)) {
    for (const label of labels) assert.ok(source.includes(label), `多言語生成コピーがありません: ${label}`);
  }
});

test('UIモジュールの旧HTML向けフォールバックと静的HTML向け早期終了を維持する', () => {
  const source = read('js/main-calculator-ui.js');
  assert.match(source, /mainMode\.dataset\.visibleBaseRateLayout === 'true'/);
  assert.match(source, /statusSection\.append\(baseRateLabel, baseRate, multiplierLabel, multiplier\)/);
  assert.match(source, /if \(packSettings\) packSettings\.remove\(\)/);
});

test('UIモジュールは内容ハッシュ付きで読み込み、Service Workerも即時更新確認する', () => {
  const mainSource = read('js/main.js');
  const serviceWorkerRegistration = read('js/service-worker-registration.js');
  const serviceWorker = read('sw.js');
  const assetSync = read('scripts/asset-sync.cjs');

  assert.match(mainSource, /from '\.\/main-calculator-ui\.js\?v=[a-f0-9]{10}';/);
  assert.match(mainSource, /from '\.\/service-worker-registration\.js';/);
  assert.match(serviceWorkerRegistration, /register\(swPath, \{ updateViaCache: 'none' \}\)/);
  assert.match(serviceWorkerRegistration, /reg\.update\(\)/);
  assert.match(serviceWorker, /'\.\/js\/main-calculator-ui\.js\?v=[a-f0-9]{10}'/);
  assert.match(serviceWorker, /'\.\/js\/service-worker-registration\.js'/);
  assert.match(assetSync, /syncMainCalculatorUiImportVersion/);
  assert.match(assetSync, /syncServiceWorkerRegistration/);
  assert.match(assetSync, /mainCalculatorUiVersion/);
});

test('未バージョンJavaScriptだけを短期再検証し、v付き資産はimmutableにする', () => {
  const htaccess = read('.htaccess');
  assert.ok(htaccess.includes('<FilesMatch "\\.(js|mjs)$">'));
  assert.match(htaccess, /max-age=300, must-revalidate/);
  assert.match(htaccess, /max-age=31536000, immutable/);
  assert.match(htaccess, /QUERY_STRING/);
});
