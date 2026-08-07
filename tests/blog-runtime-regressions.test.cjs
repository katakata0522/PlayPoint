'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const blogScript = fs.readFileSync(path.join(root, 'blog/script.js'), 'utf8');
const blogIndex = fs.readFileSync(path.join(root, 'blog/index.html'), 'utf8');
const browserSmoke = fs.readFileSync(path.join(root, '.github/scripts/browser-smoke.cjs'), 'utf8');

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
  assert.match(body, /dom\.resultStatus\.textContent[\s\S]*filtered\.length/);
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
