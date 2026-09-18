'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const { SCOPE_NOTES } = require('../scripts/article-content-navigation-normalize.cjs');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('台湾100點・levels記事は白金/鑽石総費用ownerへscopeを譲る', () => {
  for (const relativePath of [
    'tw/articles/google-play-points-100-value.html',
    'tw/articles/google-play-points-levels.html'
  ]) {
    const note = SCOPE_NOTES[relativePath];
    assert.ok(note, `${relativePath}: scope note missing`);
    assert.match(note.html, /google-play-points-platinum-diamond-cost\.html/);

    const html = read(relativePath);
    assert.match(html, /article-scope-note/);
    assert.match(html, /google-play-points-platinum-diamond-cost\.html/);
  }
});

test('100點記事は100點の獲得費用を扱い、総ランク費用ownerへ分離する', () => {
  const html = read('tw/articles/google-play-points-100-value.html');
  assert.match(html, /100\s*點/);
  assert.match(html, /google-play-points-platinum-diamond-cost\.html/);
  assert.doesNotMatch(html, /NT\$120,000|NT\$450,000/);
});

test('levels記事は制度参照に集中し、白金/鑽石の固定総消費額を持たない', () => {
  const html = read('tw/articles/google-play-points-levels.html');
  for (const threshold of ['250', '1,000', '4,000', '15,000']) assert.match(html, new RegExp(threshold));
  assert.match(html, /google-play-points-platinum-diamond-cost\.html/);
  assert.doesNotMatch(html, /NT\$120,000|NT\$450,000/);
});

test('白金/鑽石費用ownerは費用比較の主役を維持する', () => {
  const html = read('tw/articles/google-play-points-platinum-diamond-cost.html');
  assert.match(html, /白金/);
  assert.match(html, /鑽石/);
  assert.match(html, /4,000/);
  assert.match(html, /15,000/);
  assert.match(html, /href=["']\/tw\/["']/);
});
