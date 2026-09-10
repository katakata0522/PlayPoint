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

test('100點記事は100點の獲得費用比較を残し、総ランク費用と区別する', () => {
  const html = read('tw/articles/google-play-points-100-value.html');
  assert.match(html, /累積 100 點需要多少消費/);
  assert.match(html, /各等級累積 100 點的估算/);
  assert.match(html, /升到白金級／鑽石級總共要花多少/);
});

test('levels記事は制度参照に集中し、白金/鑽石の固定総消費額を持たない', () => {
  const html = read('tw/articles/google-play-points-levels.html');
  assert.match(html, /等級門檻應怎麼理解/);
  assert.match(html, /這些數字代表年度累積點數，不是固定消費金額/);
  assert.doesNotMatch(html, /從 0 點開始的基本消費估算/);
  assert.doesNotMatch(html, /NT\$120,000/);
  assert.doesNotMatch(html, /NT\$450,000/);
  assert.doesNotMatch(html, /與基本消費估算/);
});

test('白金/鑽石費用ownerは費用比較の主役を維持する', () => {
  const html = read('tw/articles/google-play-points-platinum-diamond-cost.html');
  assert.match(html, /白金/);
  assert.match(html, /鑽石/);
  assert.match(html, /4,000/);
  assert.match(html, /15,000/);
  assert.match(html, /距離白金／鑽石，我還需要多少/);
});
