'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
// Windows の CRLF でもマーカー検索が壊れないよう LF に正規化する
const readText = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n');
const blogScript = readText('blog/script.js');
const blogIndex = readText('blog/index.html');
const browserSmoke = readText('.github/scripts/browser-smoke.cjs');

function functionBody(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(start, -1, `missing start marker: ${startMarker}`);
  assert.notEqual(end, -1, `missing end marker: ${endMarker}`);
  return source.slice(start, end);
}

test('skeleton loading never references filtered results', () => {
  const body = functionBody(
    blogScript,
    '    function showSkeletonLoading() {',
    '\n    // Intersection Observer for Scroll Fade-In'
  );
  assert.doesNotMatch(body, /\bfiltered\b/);
});

test('result count is calculated inside render after filtering', () => {
  const body = functionBody(
    blogScript,
    '    function render() {',
    '\n    function renderPagination('
  );
  // 件数は画面に出さず、初期表示を含めて aria-live 用に更新する
  assert.match(body, /dom\.resultStatus\.textContent/);
  assert.match(body, /filtered\.length/);
  assert.match(body, /currentSearch/);
  assert.match(body, /else \{\s*dom\.resultStatus\.textContent = filtered\.length \+ '件';\s*\}/);
});

test('pagination, reset and category controls synchronize URL and active state', () => {
  const changePage = functionBody(
    blogScript,
    '    function changePage(num) {',
    '\n    // Back to Top Button'
  );
  assert.match(changePage, /updateURLState\(\);[\s\S]*render\(\);/);
  assert.match(
    blogScript,
    /function resetFilters\(\)[\s\S]*syncCategoryActiveState\(\);[\s\S]*updateURLState\(\);/
  );
  assert.match(
    blogScript,
    /function setCategory\(cat\)[\s\S]*syncCategoryActiveState\(\);/
  );
});

test('sidebar ARIA state is synchronized in markup and runtime', () => {
  assert.match(
    blogIndex,
    /id="sidebar-toggle"[^>]*aria-controls="sidebar"[^>]*aria-expanded="false"/
  );
  assert.match(blogScript, /setAttribute\('aria-hidden', String\(!isOpen\)\)/);
  assert.match(blogScript, /setAttribute\('aria-expanded', String\(isOpen\)\)/);
});

test('browser smoke covers the blog runtime flow', () => {
  assert.match(browserSmoke, /async function verifyBlogPage\(/);
  assert.match(browserSmoke, /new URL\('blog\/', baseUrl\)/);
  assert.match(
    browserSmoke,
    /Blog initial render, search, reset, pagination, category and sidebar/
  );
});


test('production revision verification retries IPv4 network errors', () => {
  assert.match(browserSmoke, /family: 4/);
  assert.match(browserSmoke, /function requestRevisionText\(url\)/);
  // 終端は改行数に依存せず main 定義の直前まで取る
  const body = functionBody(
    browserSmoke,
    'async function verifyRevision(baseUrl) {',
    'async function main() {'
  );
  assert.match(body, /attempt <= 4/);
  assert.match(body, /catch \(error\)/);
  assert.match(body, /lastError = error/);
});
