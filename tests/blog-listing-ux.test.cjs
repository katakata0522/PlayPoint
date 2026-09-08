'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const blogUtils = require('../blog/utils.js');
const {
  buildArticleSearchIndex,
  articleMatchesSearch,
  articleMatchesGameTitle,
  clampPageJump,
  GAME_TITLE_FILTERS
} = blogUtils;

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

test('listed corpus AND search and game-title filter share one callable listing filter', () => {
  assert.equal(typeof blogUtils.filterListedArticles, 'function');
  const registry = JSON.parse(read('blog/articles.json'));
  const andHits = blogUtils.filterListedArticles(registry, { search: 'パズドラ 使い方' });
  assert.ok(andHits.some(article => article.id === 'pad-puzzle-and-dragons-play-points'));
  assert.ok(andHits.every(article => articleMatchesSearch(article, 'パズドラ 使い方')));
  assert.equal(
    blogUtils.filterListedArticles(registry, { search: 'パズドラ ドッカン' }).length,
    0
  );

  const uma = blogUtils.filterListedArticles(registry, { gameTitle: 'ウマ娘' });
  assert.ok(uma.length >= 1);
  assert.ok(uma.length < registry.length);
  assert.ok(uma.every(article => articleMatchesGameTitle(article, 'ウマ娘')));
  assert.equal(uma.some(article => (article.title || '').includes('ロック')), false);

  const categories = [...new Set(registry.map(article => article.category))].sort();
  assert.deepEqual(categories, ['キャンペーン', 'トラブル', 'ランク', '使い方']);
});

test('blog listing exposes the public search and game-title controls used by browser smoke', () => {
  const html = read('blog/index.html');
  assert.match(html, /id="search-input"/);
  assert.match(html, /id="game-title-filter"/);
});

test('blog pagination styles cover the runtime DOM contract without pinning renderer implementation', () => {
  const compact = read('blog/index-compact.css');
  const style = read('blog/style.css');

  for (const selector of ['pagination-input-wrap', 'pagination-page-input', 'pagination-page-slash', 'pagination-page-total']) {
    assert.match(compact, new RegExp(selector), `compact CSS missing ${selector}`);
    assert.match(style, new RegExp(selector), `base CSS missing ${selector}`);
  }
  assert.match(compact, /cursor:\s*text/);
});
