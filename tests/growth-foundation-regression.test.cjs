'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { ensureAnalyticsCoreScript } = require('../scripts/analytics-runtime-sync.cjs');
const { listPublicHtmlFiles } = require('../scripts/article-asset-versioning.cjs');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('記事一覧JSONは版付き静的資産より短い再検証ルールを優先する', () => {
  const htaccess = read('.htaccess');
  const immutableIndex = htaccess.indexOf('max-age=31536000, immutable');
  const articlesIndex = htaccess.indexOf('<Files "articles.json">');
  assert.ok(immutableIndex >= 0 && articlesIndex > immutableIndex);
  assert.match(htaccess.slice(articlesIndex), /max-age=300, must-revalidate/);
});

test('計測コアは対象HTMLへ実行スクリプトより前に一度だけ挿入する', () => {
  const input = '<body>\n    <script defer src="../blog/article.js?v=old"></script>\n</body>';
  const once = ensureAnalyticsCoreScript(input);
  const twice = ensureAnalyticsCoreScript(once);
  assert.equal(once, twice, '同期処理が冪等ではありません');
  assert.ok(once.indexOf('/js/analytics-core.js') < once.indexOf('../blog/article.js'));
  assert.match(once, /\n    <script src="\/js\/analytics-core\.js"><\/script>\n    <script defer/);
  assert.equal((once.match(/analytics-core\.js/g) || []).length, 1);
});

test('計測対象の公開HTMLは共通コアを実行スクリプトより先に読み込む', () => {
  const runtimePattern = /<script\b[^>]*\bsrc=["'][^"']*(?:js\/intent-tracking|blog\/article|blog\/script)\.js/i;
  for (const htmlFile of listPublicHtmlFiles(root)) {
    const html = fs.readFileSync(htmlFile, 'utf8');
    const runtimeIndex = html.search(runtimePattern);
    if (runtimeIndex < 0) continue;
    const coreIndex = html.search(/<script\b[^>]*\bsrc=["'][^"']*js\/analytics-core\.js/i);
    assert.ok(coreIndex >= 0 && coreIndex < runtimeIndex, path.relative(root, htmlFile));
  }
});

test('計算機系モジュールは同期scriptを増やさず計測コアを依存読込する', () => {
  const config = read('js/config.js');
  const pointsCost = read('js/points-cost.js');
  assert.match(config, /^import '\.\/analytics-core\.js\?v=[a-f0-9]{10}';/m);
  assert.match(pointsCost, /^import '\.\/analytics-core\.js\?v=[a-f0-9]{10}';/m);
  for (const file of ['index.html', 'en/index.html', 'ko/index.html', 'tw/index.html']) {
    const html = read(file);
    assert.doesNotMatch(html, /<script\b[^>]*src=["'][^"']*analytics-core\.js/);
    assert.match(html, /<link rel="modulepreload" href="(?:\.\.\/)?js\/analytics-core\.js\?v=[a-f0-9]{10}">/);
  }
});

test('記事固有導線がある場合は汎用関連記事とCTAを重ねない', () => {
  const article = read('blog/article.js');
  for (const selector of ['.related-links-section', '.article-related-guides']) {
    assert.ok(article.includes(selector), `重複回避セレクタがありません: ${selector}`);
  }
  assert.match(article, /setupContextualGuideLinks[\s\S]*?document\.querySelector\([^\n]+related-links-section/);
  assert.match(article, /setupArticleNextStepCta[\s\S]*?document\.querySelector\([^\n]+related-links-section/);
});

test('ブログ共通スタイルは外部CSSとして版管理し、JSへ大量埋め込みしない', () => {
  const components = read('blog/components.js');
  const css = read('blog/common-components.css');
  assert.ok(css.length > 500, '共通CSSが空または不足しています');
  assert.ok(components.includes('blog/common-components.css'));
  assert.doesNotMatch(components, /style\.textContent\s*=/);
  assert.doesNotMatch(components, /function injectStyles/);
});

test('記事品質監査は構造破損を検出しつつ固定件数・固定本文量を要求しない', () => {
  const audit = read('tests/all-article-quality-audit.test.cjs');
  assert.doesNotMatch(audit, /registry\.length\s*>=\s*\d+/);
  assert.doesNotMatch(audit, /bodyText\.length\s*>=\s*500/);
  assert.doesNotMatch(audit, /h2Matches\.length\s*>=\s*3/);
  assert.doesNotMatch(audit, /paragraphs\.length\s*>=\s*5/);
  assert.match(audit, /article body is empty/);
  assert.match(audit, /explanatory paragraph is missing/);
});
