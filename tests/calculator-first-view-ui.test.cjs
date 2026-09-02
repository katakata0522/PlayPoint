'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/region-navigation.js'), 'utf8');

function firstViewCss() {
  return source.match(/function ensureCalculatorFirstViewCriticalStyle\(\) \{[\s\S]*?style\.textContent = `([\s\S]*?)`;[\s\S]*?document\.head\.appendChild\(style\);[\s\S]*?\}/)?.[1] || '';
}

test('スマホの補助リンクとタブを1段に圧縮して計算入力を早く見せる', () => {
  const css = firstViewCss();
  assert.ok(css, 'First View CSSが見つかりません');
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /\.header-links\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.header-links \.alert-link\s*\{[\s\S]*?grid-column:\s*auto/);
  assert.match(css, /\.tab-switch\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.tab-switch #tab-diary\s*\{[\s\S]*?grid-column:\s*auto/);
});

test('First View圧縮でナビゲーションやタブを非表示にしない', () => {
  const css = firstViewCss();
  assert.doesNotMatch(css, /\.header-links[^{}]*\{[^{}]*display:\s*none/s);
  assert.doesNotMatch(css, /\.tab-switch[^{}]*\{[^{}]*display:\s*none/s);
  assert.match(css, /\.header-links a\s*\{[\s\S]*?min-height:\s*44px/);
});

test('最初の3入力と還元設定の境界を視覚的に分ける', () => {
  assert.match(
    firstViewCss(),
    /#mainMode > \.section:first-child label\[for="baseRate"\]\s*\{[\s\S]*?border-top:\s*1px solid/
  );
});

test('First View CSSは最初の描画前に一度だけ注入する', () => {
  assert.match(source, /const FIRST_VIEW_CRITICAL_STYLE_ID = 'calculator-first-view-critical-style'/);
  assert.match(source, /document\.getElementById\(FIRST_VIEW_CRITICAL_STYLE_ID\)/);
  assert.match(source, /ensureCalculatorFirstViewCriticalStyle\(\);[\s\S]*?ensureRegionSelectorCriticalStyle\(\);[\s\S]*?const bootRegionSelector/);
});
