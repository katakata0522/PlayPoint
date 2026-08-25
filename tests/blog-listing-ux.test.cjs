'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  buildArticleSearchIndex,
  articleMatchesSearch,
  articleMatchesGameTitle,
  clampPageJump,
  GAME_TITLE_FILTERS
} = require('../blog/utils.js');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('listed blog search indexes title, description, tags, and category in memory', () => {
  const article = {
    title: 'パズドラ課金とPlay Points',
    description: 'パスの確認方法',
    tags: ['パズドラ', 'Play Points'],
    category: '使い方'
  };
  const index = buildArticleSearchIndex(article);
  assert.match(index, /パズドラ課金/);
  assert.match(index, /パスの確認方法/);
  assert.match(index, /play points/);
  assert.match(index, /使い方/);
  assert.equal(articleMatchesSearch(article, 'パズドラ 使い方'), true);
  assert.equal(articleMatchesSearch(article, 'ドッカン'), false);
  assert.equal(articleMatchesSearch(article, 'パズドラ   課金'), true);
});

test('game-title filtering matches title or tags without a fifth articles.json category', () => {
  const registry = JSON.parse(read('blog/articles.json'));
  const categories = [...new Set(registry.map(article => article.category))].sort();
  assert.deepEqual(categories, ['キャンペーン', 'トラブル', 'ランク', '使い方']);
  assert.ok(GAME_TITLE_FILTERS.includes('ウマ娘'));
  assert.ok(GAME_TITLE_FILTERS.includes('ドッカン'));
  assert.ok(GAME_TITLE_FILTERS.includes('パズドラ'));
  assert.equal(
    articleMatchesGameTitle({ title: '【ウマ娘】5.5周年', tags: ['ウマ娘'] }, 'ウマ娘'),
    true
  );
  assert.equal(
    articleMatchesGameTitle({ title: 'Play Pointsがロックされた', tags: ['ロック'] }, 'ウマ娘'),
    false
  );
});

test('page-number jump clamps full-width digits into the published page range', () => {
  assert.equal(clampPageJump('３', 10), 3);
  assert.equal(clampPageJump('0', 10), 1);
  assert.equal(clampPageJump('99', 10), 10);
  assert.equal(clampPageJump('abc', 10), 1);
});

test('blog listing wires page jump, in-memory search, and game-title filter', () => {
  const html = read('blog/index.html');
  const script = read('blog/script.js');
  assert.match(html, /id="search-input"/);
  assert.match(html, /id="game-title-filter"/);
  assert.match(script, /pagination-page-input/);
  assert.match(script, /buildArticleSearchIndex/);
  assert.match(script, /articleMatchesGameTitle/);
  assert.match(script, /clampPageJump/);
  assert.doesNotMatch(script, /'ゲーム': \{ order: 5/);
});
