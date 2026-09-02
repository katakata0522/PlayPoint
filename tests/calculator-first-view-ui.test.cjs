'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/main-calculator-ui.js'), 'utf8');

test('スマホの補助リンクとタブを1段に圧縮して計算入力を早く見せる', () => {
  assert.match(source, /@media \(max-width: 640px\)/);
  assert.match(source, /\.header-links\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(source, /\.header-links \.alert-link\s*\{[\s\S]*?grid-column:\s*auto/);
  assert.match(source, /\.tab-switch\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(source, /\.tab-switch #tab-diary\s*\{[\s\S]*?grid-column:\s*auto/);
});

test('First View圧縮でナビゲーションやタブを非表示にしない', () => {
  const css = source.match(/const CALCULATOR_FIRST_VIEW_CSS = `([\s\S]*?)`;/)?.[1] || '';
  assert.ok(css, 'First View CSSが見つかりません');
  assert.doesNotMatch(css, /\.header-links[^{}]*\{[^{}]*display:\s*none/s);
  assert.doesNotMatch(css, /\.tab-switch[^{}]*\{[^{}]*display:\s*none/s);
  assert.match(css, /\.header-links a\s*\{[\s\S]*?min-height:\s*44px/);
});

test('最初の3入力と還元設定の境界を視覚的に分ける', () => {
  assert.match(
    source,
    /#mainMode > \.section:first-child label\[for="baseRate"\]\s*\{[\s\S]*?border-top:\s*1px solid/
  );
});

test('First View CSSはモジュール評価時に一度だけ注入する', () => {
  assert.match(source, /const CALCULATOR_FIRST_VIEW_STYLE_ID = 'calculator-first-view-style'/);
  assert.match(source, /document\.getElementById\(CALCULATOR_FIRST_VIEW_STYLE_ID\)/);
  assert.match(source, /document\.head\.appendChild\(style\)/);
  assert.match(source, /ensureCalculatorFirstViewStyle\(\);/);
});
