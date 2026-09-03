'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const firstView = () => read('js/first-view.js');

test('スマホ通常計算は3つの主要入力を先に見せ、獲得率設定を任意の詳細設定へ分離する', () => {
  const source = firstView();

  assert.match(source, /const MOBILE_QUERY = '\(max-width: 640px\)'/);
  assert.match(source, /neededPoints\.insertAdjacentElement\('afterend', container\)/);
  assert.match(source, /body\.append\(baseRateLabel, baseRate, multiplierLabel, multiplier, warning\)/);
  assert.match(source, /calculator-advanced-settings__toggle/);
  assert.match(source, /body\.inert = collapsedForUser/);
  assert.match(source, /獲得率・キャンペーンを調整（任意）/);
  assert.match(source, /Adjust earn rates & promotion \(optional\)/);
  assert.match(source, /적립률·프로모션 조정 \(선택\)/);
  assert.match(source, /調整獲點率與活動（選填）/);
});

test('キャンペーン条件付きの共有URLではスマホ詳細設定を自動展開できる', () => {
  const source = firstView();

  assert.match(source, /params\.get\('mode'\) !== 'main'/);
  assert.match(source, /Number\(params\.get\('multiplier'\)\)/);
  assert.match(source, /multiplier > 1/);
  assert.match(source, /shouldAutoOpenAdvancedSettings\(window\.location\.search\)/);
});

test('地域提案はレイアウトを押し下げるバナーではなく既存の地域ボタンを強調する', () => {
  const source = firstView();

  assert.match(source, /hideLegacyLanguageBanner\(\)/);
  assert.match(source, /data-region-recommended="true"/);
  assert.match(source, /markRegionRecommended\(suggestion\.region, suggestion\.recommendation\)/);
  assert.doesNotMatch(source, /languageSuggestionBanner\.classList\.remove\(CONSTANTS\.CLASS_HIDDEN\)/);
  assert.match(source, /browserLang\.startsWith\('en-us'\)/);
  assert.match(source, /browserLang\.startsWith\('zh-tw'\)/);
  assert.match(source, /browserLang\.startsWith\('ko-kr'\)/);
  assert.match(source, /browserLang\.startsWith\('en'\)[\s\S]*?return null/);
});

test('ファーストビュー処理は互換モジュール経由で読み込まれ、Service Workerの必須シェルにも含まれる', () => {
  const languageSuggestion = read('js/language-suggestion.js');
  const assetSync = read('scripts/asset-sync.cjs');
  const serviceWorker = read('sw.js');

  assert.match(languageSuggestion, /from '\.\/first-view\.js'/);
  assert.ok(assetSync.includes("'js/first-view.js'"));
  assert.ok(serviceWorker.includes("'./js/first-view.js'"));
});
