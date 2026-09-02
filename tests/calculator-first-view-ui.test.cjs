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

test('スマホFirst Viewは行数を変えず余白だけ圧縮する', () => {
  const css = firstViewCss();
  assert.ok(css, 'First View CSSが見つかりません');
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /\.top-bar\s*\{[\s\S]*?margin:\s*0\.55rem auto 0\.8rem/);
  assert.match(css, /\.site-description\s*\{[\s\S]*?margin-bottom:\s*0\.8rem/);
  assert.match(css, /\.tab-switch\s*\{[\s\S]*?margin:\s*0\.75em auto 0\.95em/);
});

test('CLSを増やすヘッダーやタブの列数変更をFirst View CSSへ入れない', () => {
  const css = firstViewCss();
  assert.doesNotMatch(css, /grid-template-columns/);
  assert.doesNotMatch(css, /grid-column/);
  assert.doesNotMatch(css, /display:\s*none/);
});

test('最初の3入力と還元設定の境界は寸法を増やさず視覚的に分ける', () => {
  const css = firstViewCss();
  assert.match(
    css,
    /#mainMode > \.section:first-child label\[for="baseRate"\]\s*\{[\s\S]*?border-top:\s*1px solid/
  );
  assert.doesNotMatch(css, /label\[for="baseRate"\][^}]*padding-top/s);
  assert.doesNotMatch(css, /label\[for="baseRate"\][^}]*margin-top/s);
});

test('First View CSSは共有初期化で一度だけ注入する', () => {
  assert.match(source, /const FIRST_VIEW_CRITICAL_STYLE_ID = 'calculator-first-view-critical-style'/);
  assert.match(source, /document\.getElementById\(FIRST_VIEW_CRITICAL_STYLE_ID\)/);
  assert.match(source, /ensureCalculatorFirstViewCriticalStyle\(\);[\s\S]*?ensureRegionSelectorCriticalStyle\(\);[\s\S]*?const bootRegionSelector/);
});
