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
  assert.ok(registry.length > 0);
  assert.ok(GAME_TITLE_FILTERS.length > 0);
  assert.equal(new Set(GAME_TITLE_FILTERS).size, GAME_TITLE_FILTERS.length);
  assert.ok(GAME_TITLE_FILTERS.every(value => typeof value === 'string' && value.trim()));
  assert.equal(
    articleMatchesGameTitle({ title: '【ウマ娘】5.5周年', tags: ['ウマ娘'] }, 'ウマ娘'),
    true
  );
  assert.equal(
    articleMatchesGameTitle({ title: 'Play Pointsがロックされた', tags: ['ロック'] }, 'ウマ娘'),
    false
  );
});

test('reader-facing browse taxonomy filters the full public corpus without breaking legacy categories', () => {
  const registry = JSON.parse(read('blog/articles.json')).filter(article => article.listed !== false);
  const topics = ['はじめて・基本', 'ランク・ステータス', '貯める・キャンペーン', '使う・交換', 'トラブル・アカウント', 'ゲーム別課金', '最新情報・イベント'];
  assert.ok(registry.length > topics.length);
  assert.ok(registry.every(article => topics.includes(article.browseCategory)));
  for (const topic of topics) {
    const expectedCount = registry.filter(article => article.browseCategory === topic).length;
    assert.ok(expectedCount > 0, topic);
    const hits = blogUtils.filterListedArticles(registry, { browseCategory: topic });
    assert.equal(hits.length, expectedCount, topic);
    assert.ok(hits.every(article => article.browseCategory === topic), topic);
  }
  const legacyTrouble = blogUtils.filterListedArticles(registry, { category: 'トラブル' });
  assert.ok(legacyTrouble.length > 0);
  assert.ok(legacyTrouble.every(article => article.category === 'トラブル'));
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
});

test('blog listing exposes the public search and game-title controls used by browser smoke', () => {
  const html = read('blog/index.html');
  assert.match(html, /id="search-input"/);
  assert.match(html, /id="game-title-filter"/);
});

test('blog listing keeps content visible without scroll-animation success and has one canonical footer', () => {
  const html = read('blog/index.html');
  const style = read('blog/style.css');

  assert.equal((html.match(/<footer\b/g) || []).length, 1, 'blog/index.html must expose exactly one footer');
  assert.doesNotMatch(html, /class="blog-footer"/, 'legacy duplicate footer must not return');
  assert.doesNotMatch(style, /\.fade-in-up\s*\{[^}]*opacity:\s*0/s, 'primary article cards must never default to opacity:0');
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

test('search sorting uses the selected meaning, stays stable, and leaves source records unchanged', () => {
  const list = Object.freeze([
    Object.freeze({ id:'old', title:'Guide', description:'天井',date:'2025-12-25', modified:'2026-09-18' }),
    Object.freeze({ id:'new', title:'天井', description:'Guide',date:'2026-09-13', modified:'2026-09-13' }),
    Object.freeze({ id:'missing', title:'Other',date:'invalid' })
  ]);
  const order = mode => blogUtils.sortListedArticles(list,{mode,search:'天井'}).map(a=>a.id);
  assert.deepEqual(order('relevance'), ['new','old','missing']);
  assert.deepEqual(order('oldest'), ['old','new','missing']);
  assert.deepEqual(order('newest'), ['new','old','missing']);
  assert.deepEqual(order('updated'), ['old','new','missing']);
  assert.deepEqual(list.map(a=>a.id),['old','new','missing']);
  assert.deepEqual(blogUtils.sortListedArticles([{id:'a',date:'2026-01-01'},{id:'b',date:'2026-01-01'}],{mode:'newest'}).map(a=>a.id), ['a','b']);
});

test('URL and page-input normalization rejects fractional, negative and malformed input', () => {
  for (const input of [-1,0,'-2','2.7','1e2','2junk','',NaN,Infinity,'9999999999999999999999']) assert.equal(clampPageJump(input,13),1,String(input));
  assert.equal(clampPageJump(' ３ ',13),3);
  assert.equal(clampPageJump('999',13),13);
  assert.equal(clampPageJump('2',0),1);
  assert.equal(blogUtils.validArticleDate('2026-02-30'),'');
  assert.equal(blogUtils.validArticleDate('2024-02-29'),'2024-02-29');
});

test('broken thumbnails use same-origin fallback and cannot loop or replace the article link', () => {
  const image = { src:'../images/game-icons/fgo.webp', alt:'FGO', onerror:()=>{}, classList:{add(){}} };
  blogUtils.handleImageError(image);
  assert.equal(image.onerror,null);
  assert.equal(image.src, '/images/article-placeholder.svg');
  assert.equal(image.alt,'');
  assert.ok(fs.existsSync(path.join(root,image.src)));
});

test('reading theme resolves saved intent before the system preference and ignores invalid values', () => {
  const {resolveTheme} = require('../js/reading-theme.js');
  assert.equal(resolveTheme({theme:'dark'},false),'dark');
  assert.equal(resolveTheme({theme:'light'},true),'light');
  assert.equal(resolveTheme(null,true),'dark');
  assert.equal(resolveTheme({theme:'invalid'},false),'light');
});


test('ゲーム略称と複合検索から、記事がない場合も該当する計算機へ案内する', () => {
  const calculators = JSON.parse(read('blog/game-calculators.json'));
  for (const [query, id] of [['ブルアカ 課金', 'bluearchive'], ['鳴潮 月パス', 'wutheringwaves'], ['メメントモリ', 'mementomori'], ['学マス', 'gakumas'], ['ニケ', 'nikke'], ['プロスピA', 'prospi-a']]) {
    assert.deepEqual(blogUtils.relatedGameCalculators(calculators, query, '').map(game => game.id), [id], query);
  }
  assert.deepEqual(blogUtils.relatedGameCalculators(calculators, '存在しないゲーム', ''), []);
  assert.deepEqual(blogUtils.relatedGameCalculators(calculators, '', 'ブルアカ').map(game => game.id), ['bluearchive']);
  assert.deepEqual(blogUtils.relatedGameCalculators([{title:'ブルアカ',id:'bluearchive',href:'https://example.com'}], 'ブルアカ', ''), []);
  assert.ok(blogUtils.gameTitleFilters([{gameTitle:'追加ゲーム'}]).includes('追加ゲーム'));
  for (const game of calculators) assert.ok(fs.existsSync(path.join(root, game.href, 'index.html')), game.href);
});
