'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

test('記事一覧JSONはimmutableより後で短時間再検証へ上書きする', () => {
  const htaccess = read('.htaccess');
  const immutableIndex = htaccess.indexOf('max-age=31536000, immutable');
  const articlesIndex = htaccess.indexOf('<Files "articles.json">');
  assert.ok(immutableIndex >= 0);
  assert.ok(articlesIndex > immutableIndex);
  assert.match(htaccess.slice(articlesIndex), /max-age=300, must-revalidate/);
});

test('共通分析基盤が記事流入を計算完了へ引き継ぐ', () => {
  const analytics = read('js/analytics-core.js');
  assert.match(analytics, /playpointCalculatorEntryContext/);
  assert.match(analytics, /entry_source_path/);
  assert.match(analytics, /entry_link_context/);
  assert.match(analytics, /calculator_preset/);
  assert.match(analytics, /CALCULATION_EVENTS/);
});

test('トップと記事群が同じ分析基盤を読み込む', () => {
  const thirdParty = read('js/third-party.js');
  const components = read('blog/components.js');
  assert.match(thirdParty, /analytics-core\.js/);
  assert.match(components, /analytics-core\.js/);
  assert.match(components, /rememberCalculatorEntry/);
});

test('記事の既存導線がある場合は自動CTAを重複させない', () => {
  const components = read('blog/components.js');
  assert.match(components, /removeRedundantArticleCtas/);
  assert.match(components, /article-calculator-prompt/);
  assert.match(components, /article-next-step-cta/);
  assert.match(components, /related-links-section/);
});

test('共通コンポーネントCSSはJavaScriptから分離されている', () => {
  const components = read('blog/components.js');
  const css = read('blog/common-components.css');
  assert.match(components, /common-components\.css/);
  assert.doesNotMatch(components, /const css = `/);
  assert.match(css, /\.header/);
  assert.match(css, /\.site-footer/);
  assert.match(css, /\.toc-box/);
});

test('多言語記事でも共通資産はサイトルートから取得する', () => {
  const components = read('blog/components.js');
  assert.match(components, /\/js\/analytics-core\.js/);
  assert.match(components, /\/js\/consent\.js/);
  assert.match(components, /\/blog\/common-components\.css/);
});
