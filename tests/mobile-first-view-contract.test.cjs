'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const firstView = () => read('js/first-view.js');

test('スマホ詳細設定は初回HTMLに存在し、JavaScriptは入力欄を移動しない', () => {
  const source = firstView();
  const staticLayout = read('scripts/static-calculator-layout.cjs');

  assert.match(source, /const MOBILE_QUERY = '\(max-width: 640px\)'/);
  assert.match(source, /document\.getElementById\(SETTINGS_ID\)/);
  assert.match(source, /body\.inert = collapsed/);
  assert.doesNotMatch(source, /insertAdjacentElement/);
  assert.doesNotMatch(source, /body\.append\(baseRateLabel/);
  assert.doesNotMatch(source, /document\.createElement\(['"]style['"]\)/);
  assert.doesNotMatch(source, /document\.createElement\(['"]div['"]\)/);

  assert.match(staticLayout, /ADVANCED_SETTINGS_ID = 'calculator-advanced-settings'/);
  assert.match(staticLayout, /ADVANCED_SETTINGS_STYLE_ID = 'playpoint-first-view-critical'/);
  assert.match(staticLayout, /calculator-advanced-settings__toggle/);
  assert.match(staticLayout, /獲得率・キャンペーンを調整（任意）/);
  assert.match(staticLayout, /Adjust earn rates & promotion \(optional\)/);
  assert.match(staticLayout, /적립률·프로모션 조정 \(선택\)/);
  assert.match(staticLayout, /調整獲點率與活動（選填）/);
});

test('キャンペーン条件付きURLはbody描画前に詳細設定の初期状態を確定する', () => {
  const source = firstView();
  const staticLayout = read('scripts/static-calculator-layout.cjs');

  assert.match(source, /params\.get\('mode'\) !== 'main'/);
  assert.match(source, /Number\(params\.get\('multiplier'\)\)/);
  assert.match(source, /multiplier > 1/);
  assert.match(source, /dataset\?\.playpointAdvancedSettings === 'open'/);
  assert.match(staticLayout, /document\.documentElement\.dataset\.playpointAdvancedSettings='open'/);
  assert.match(staticLayout, /html\[data-playpoint-advanced-settings="open"\]/);
});

test('地域提案はレイアウトを押し下げるバナーではなく既存の地域ボタンを強調する', () => {
  const source = firstView();

  assert.match(source, /hideLegacyBanner\(\)/);
  assert.match(source, /data-region-recommended="true"/);
  assert.match(source, /markRegionRecommended\(region, RECOMMENDATION_COPY/);
  assert.match(source, /aria-description/);
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
