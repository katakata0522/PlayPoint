'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { assertOrderedAttributes } = require('./helpers/markup-contract.cjs');
const {
  ensureStaticCalculatorLayout,
  validateStaticLayout
} = require('../scripts/static-calculator-layout.cjs');
const {
  SIMPLIFIED_CALCULATOR_COPY,
  replaceSimplifiedCalculatorCopy
} = require('../scripts/language-page-builder.cjs');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const expectedLabels = Object.freeze({
  'index.html': [
    '100円あたりの獲得率（自動入力・編集可）',
    'キャンペーン特別獲得率（例：3pt/100円）',
    '獲得率・キャンペーンを調整（任意）'
  ],
  'en/index.html': [
    'Points per $1 (auto-filled, editable)',
    'Promotion special earn rate (e.g. 3 pt / $1)',
    'Adjust earn rates & promotion (optional)'
  ],
  'ko/index.html': [
    '₩1,000당 적립률 (자동 입력·수정 가능)',
    '캠페인 특별 적립률 (예: 1,000원당 3pt)',
    '적립률·프로모션 조정 (선택)'
  ],
  'tw/index.html': [
    '每 NT$30 獲得點數（自動帶入，可修改）',
    '活動特別獲點率（例：每 NT$30 3 點）',
    '調整獲點率與活動（選填）'
  ]
});
const indexPaths = ['index.html', 'en/index.html', 'ko/index.html', 'tw/index.html', 'hk/index.html', 'in/index.html'];

const legacyCalculatorFixture = `
<head></head>
<body>
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
</div>
</body>`;

test('旧HTMLを初回描画から安定する静的レイアウトへ安全に変換できる', () => {
  const converted = ensureStaticCalculatorLayout(legacyCalculatorFixture);
  validateStaticLayout(converted);
  assert.ok(!converted.includes('id="pack-amount"'));
  assert.ok(!converted.includes('sectionTitleRate'));
  assert.match(converted, /data-visible-base-rate-layout="true"/);
  assert.match(converted, /id="calculator-advanced-settings"/);
  assert.match(converted, /id="calculator-advanced-settings-body"/);
  assert.match(converted, /id="playpoint-first-view-critical"/);
  assert.match(converted, /id="playpoint-first-view-state"/);
  assert.match(converted, /100円あたりの獲得率（自動入力・編集可）/);
  assert.match(converted, /キャンペーン特別獲得率（例：3pt\/100円）/);
  assert.ok(!converted.includes('data-lang-key="labelBaseRate"'));
  assert.ok(!converted.includes('data-lang-key="labelMultiplier"'));
  assert.equal(ensureStaticCalculatorLayout(converted), converted, '静的化処理は冪等である');
});

test('6地域の公開HTMLはJavaScript実行前から詳細設定の最終DOMを持つ', () => {
  for (const indexPath of indexPaths) {
    const html = read(indexPath);
    const mainMode = html.slice(html.indexOf('<div id="mainMode"'), html.indexOf('<div id="reverseMode"'));
    validateStaticLayout(html);
    assert.ok(!mainMode.includes('id="pack-amount"'), `${indexPath}: 平均パック額が残っている`);
    assert.ok(!mainMode.includes('data-lang-key="sectionTitleRate"'), `${indexPath}: 独立した還元設定が残っている`);
    assert.ok(mainMode.includes('id="calculator-advanced-settings"'), `${indexPath}: 静的な詳細設定ラッパーがない`);
    assert.ok(mainMode.includes('calculator-advanced-settings__toggle'), `${indexPath}: 静的な詳細設定トグルがない`);
    const advancedLabels = mainMode.match(/data-simplified-calculator-copy="advancedSettingsLabel"/g) || [];
    assert.equal(advancedLabels.length, 1, `${indexPath}: 詳細設定ラベルは1言語分だけ静的出力する`);
    assert.ok(!mainMode.includes('calculator-advanced-settings__copy--'), `${indexPath}: 他言語の非表示コピーを埋め込まない`);
  }
});

test('主要4言語の公開HTMLはJavaScript実行前から専用ラベルを持つ', () => {
  for (const [indexPath, labels] of Object.entries(expectedLabels)) {
    const html = read(indexPath);
    const mainMode = html.slice(html.indexOf('<div id="mainMode"'), html.indexOf('<div id="reverseMode"'));
    assert.ok(!mainMode.includes('data-lang-key="labelBaseRate"'), `${indexPath}: 通常計算の獲得率が一般翻訳キーへ依存している`);
    assert.ok(!mainMode.includes('data-lang-key="labelMultiplier"'), `${indexPath}: 通常計算の倍率が一般翻訳キーへ依存している`);
    for (const label of labels) {
      assert.ok(mainMode.includes(label), `${indexPath}: 静的ラベルがありません: ${label}`);
    }
  }
});

test('6地域トップは通常デザインを保ちつつ主要CTAをモバイル優先のDOM順にする', () => {
  const css = read('style.css');
  assert.ok(!css.includes('HOME_CALCULATOR_FIRST'), 'Calculator-First専用CSSが残っている');

  for (const indexPath of indexPaths) {
    const html = read(indexPath);
    const mainMode = html.slice(html.indexOf('<div id="mainMode"'), html.indexOf('<div id="reverseMode"'));
    assert.ok(!html.includes('home-calculator-first'), `${indexPath}: Calculator-Firstクラスが残っている`);
    assert.ok(!html.includes('home-help-link'), `${indexPath}: Calculator-First専用リンクが残っている`);
    assertOrderedAttributes(mainMode, 'id', ['calculateButton', 'calculator-advanced-settings'], indexPath);
    // モバイル表示順・操作可能性は既存browser-smokeの実画面検査が担当する。
  }
});

test('日本語トップは説明の後にランク導線と記事ハブだけをコンパクトに表示する', () => {
  const html = read('index.html');
  assertOrderedAttributes(html, 'data-lang-key', ['descriptionSectionTitle', 'articleDrawerTitle'], '日本語トップ');
  assert.ok(!html.includes('home-article-carousel'));
  assert.ok(html.includes('class="home-guide-shortcuts"'));
  assert.ok(html.includes('href="blog/"'));
  assert.ok(html.includes('href="latest/"'));
});

test('多言語生成処理は通常計算専用ラベルを実際のHTMLへ適用する', () => {
  const fixture = `
    <span data-simplified-calculator-copy="baseRateLabel">old base</span>
    <span data-simplified-calculator-copy="multiplierLabel">old promo</span>
    <span data-simplified-calculator-copy="advancedSettingsLabel">old advanced</span>`;

  for (const locale of ['en', 'ko', 'tw']) {
    const copy = SIMPLIFIED_CALCULATOR_COPY[locale];
    const converted = replaceSimplifiedCalculatorCopy(fixture, copy);
    assert.ok(converted.includes(copy.baseRateLabel), `${locale}: base rate copy`);
    assert.ok(converted.includes(copy.multiplierLabel), `${locale}: promotion copy`);
    assert.ok(converted.includes(copy.advancedSettingsLabel), `${locale}: advanced settings copy`);
    assert.equal(replaceSimplifiedCalculatorCopy(converted, copy), converted, `${locale}: copy replacement should be idempotent`);
  }
});

// 資産URL・実importの主担当はruntime-module-guards。ここでは登録APIの動作を分離する。
const { runEsmProbe, ORIGIN } = require('./helpers/runtime-esm.cjs');

test('6地域の実登録処理は同じroot SWをHTTP cacheを使わず登録し更新確認する', () => {
  const paths = ['/', '/en/', '/ko/', '/tw/', '/hk/', '/in/'];
  const results = runEsmProbe({ kind: 'registration', scenarios: paths.map(pathname => ({ pathname })) });
  for (const [index, result] of results.entries()) {
    assert.deepEqual(result.calls, [{ url: `${ORIGIN}/sw.js`, options: { updateViaCache: 'none' } }], paths[index]);
    assert.equal(result.updates, 1, paths[index]);
    assert.deepEqual(result.errors, [], paths[index]);
    assert.deepEqual(result.warnings, [], paths[index]);
  }
});

test('SW登録はload後のidleへ遅延し、idle APIがない場合もtimerから一度起動する', () => {
  const results = runEsmProbe({ kind: 'registration', scenarios: [{ pathname: '/' }, { pathname: '/', noIdle: true }] });
  for (const [index, result] of results.entries()) {
    assert.equal(result.beforeLoad, 0);
    assert.equal(result.afterLoad, 0);
    assert.deepEqual(result.scheduled, index === 0 ? { idle: 1, timers: 0 } : { idle: 0, timers: 1 });
    assert.equal(result.calls.length, 1);
    assert.equal(result.updates, 1);
  }
});

test('SW未対応環境では登録・更新・遅延タスクを起動しない', () => {
  const [result] = runEsmProbe({ kind: 'registration', scenarios: [{ pathname: '/', unsupported: true }] });
  assert.equal(result.loadListeners, 0);
  assert.equal(result.calls.length, 0);
  assert.equal(result.updates, 0);
  assert.deepEqual(result.scheduled, { idle: 0, timers: 0 });
});

test('SW登録拒否と更新拒否は未処理例外にせず、登録拒否時にupdateしない', () => {
  const [registration, update] = runEsmProbe({ kind: 'registration', scenarios: [
    { pathname: '/', registerFailure: true }, { pathname: '/', updateFailure: true }
  ] });
  assert.equal(registration.calls.length, 1);
  assert.equal(registration.updates, 0);
  assert.ok(registration.errors.length > 0, '登録失敗を報告していない');
  assert.equal(update.calls.length, 1);
  assert.equal(update.updates, 1);
  assert.ok(update.warnings.length > 0, '更新失敗を報告していない');
});

// S08: HTTP cacheの主担当はPR Gateの実Apache検査とproduction security health。
// 設定文の並びを疑似解釈する旧静的テストは、実HTTPで同等以上を保証して置換した。
