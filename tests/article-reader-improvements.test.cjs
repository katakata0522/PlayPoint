'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const manifest = JSON.parse(read('blog/articles.json')).filter(article => article.listed !== false);
const { GAME_GUIDE_ARTICLES } = require('../scripts/game-guide-article-catalog.cjs');
const { BROWSE_CATEGORIES } = require('../scripts/japanese-navigation-sidebar.cjs');
const { TOPIC_GUIDES } = require('../scripts/reader-topic-guides.cjs');
const { getImageDimensions } = require('../scripts/seo-head-audit.cjs');

test('一覧の全ページはJavaScriptなしでも別の記事へ進め、専用canonicalを持つ', () => {
  const count = Math.ceil(manifest.length / 12), seen = [];
  for (let page = 1; page <= count; page++) {
    const file = page === 1 ? 'blog/index.html' : `blog/page/${page}/index.html`;
    const html = read(file), url = `https://playpoint-sim.com/blog/${page === 1 ? '' : `page/${page}/`}`;
    assert.ok(html.includes(`rel="canonical" href="${url}"`), file);
    const cards = [...html.matchAll(/<a\b[^>]*data-blog-initial-card="true"[^>]*href="([^"]+)"/g)].map(match => new URL(match[1], url).pathname);
    assert.equal(cards.length, Math.min(12, manifest.length - (page - 1) * 12), file);
    seen.push(...cards);
    if (page < count) assert.match(html, new RegExp(`href="/blog/page/${page + 1}/"`), file);
    if (page > 1) {
      assert.equal(/\b(?:href|src)="(?:\.\.\/|(?:style|script|utils|components)\.)/.test(html), false, file);
      assert.ok(html.includes('CollectionPage'), file);
      assert.equal(/<link\b[^>]*hreflang=/.test(html), false, file + ': 対応する翻訳ページのない番号ページ');
    }
  }
  assert.equal(new Set(seen).size, manifest.length);
  assert.deepEqual([...new Set(seen)].sort(), manifest.map(article => new URL(article.file, 'https://playpoint-sim.com/blog/').pathname).sort());
});

test('記事パンくずは表示用7分類と構造化データを一致させる', () => {
  for (const article of manifest) {
    const html = read(article.file.slice(3)), breadcrumb = html.match(/<div class="breadcrumbs-wrapper">[\s\S]*?<\/div>/)?.[0] || '';
    assert.equal(breadcrumb.includes('?category='), false, article.id);
    assert.ok(BROWSE_CATEGORIES.includes(article.browseCategory), article.id);
    assert.ok(breadcrumb.includes('?topic=' + encodeURIComponent(article.browseCategory)), article.id);
    const data = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
    const crumbs = data.flatMap(node => node['@graph'] || [node]).find(node => node['@type'] === 'BreadcrumbList');
    if (crumbs) assert.equal(crumbs.itemListElement[2].name, article.browseCategory, article.id);
  }
});

test('ゲーム記事は先に回答を読み、全端末で本文目次と主張近くの一次情報を使える', () => {
  for (const article of GAME_GUIDE_ARTICLES) {
    const html = read(article.file.slice(3));
    assert.ok(html.indexOf('answer-box') < html.indexOf('reader-toc'), article.id);
    assert.ok(html.includes('reader-source'), article.id);
    const toc = html.match(/<!-- reader-toc:start -->([\s\S]*?)<!-- reader-toc:end -->/)?.[1];
    assert.ok(toc, article.id);
    for (const match of toc.matchAll(/href="#([^"]+)"/g)) assert.ok(html.includes(`id="${match[1]}"`), article.id + ': ' + match[1]);
    const summary = html.match(/<details class="reading-metadata"><summary>([\s\S]*?)<\/summary>/)?.[1] || '';
    assert.match(summary, /公式確認 \d{4}-\d{2}-\d{2}/, article.id);
    assert.equal(/旧固定価格|旧PlayPoint|最終正本|現行正本|結帳/.test(html), false, article.id);
  }
});

test('購入比較は即時の個数と将来の還元を分け、Pokémon GOのReward RoadをWeb専用として扱わない', () => {
  const pokemon = read('games/pokemon-go/google-play-vs-webstore/index.html');
  const table = pokemon.match(/<section class="section reader-comparison"[\s\S]*?<\/section>/)?.[0] || '';
  assert.match(table, /Google Play[\s\S]*?対象の現金購入はReward Roadも確認/);
  assert.match(table, /公式Web Store[\s\S]*?対象の現金購入はReward Roadも確認/);
  assert.match(table, /支払額 ÷ ボーナス込みの受取個数/);
  assert.match(table, /今すぐ受け取るポケコインに足しません/);
  assert.ok(pokemon.match(/<h1\b[^>]*>([^<]+)<\/h1>/)[1].length < 60);
  assert.ok(read('games/dokkan/google-play-vs-webstore/index.html').includes('reader-comparison'));
});

test('症状別の案内と初心者の操作図・計算例が実在する本文へつながる', () => {
  const diagnostic = read('articles/2026-08-16-points-disappeared.html');
  assert.match(diagnostic, /まず、消えたものを選んでください/);
  assert.ok(diagnostic.includes('href="#check"') && diagnostic.includes('id="check"'));
  for (const file of ['2026-08-16-january-rank-reset.html', '2026-08-16-weekly-reward-not-showing.html', '2026-03-10-play-points-reflection-timing.html']) assert.ok(diagnostic.includes(file));
  const beginner = read('articles/2025-12-25-getting-started.html');
  assert.match(beginner, /images\/guides\/play-points-start.svg/);
  assert.match(beginner, /対象額500円の計算例/);
  assert.match(beginner, /税を除いた対象額500円/);
  assert.match(beginner, /シルバーは6ポイント/);
  assert.ok(read('images/guides/play-points-start.svg').includes('無料で開始'));
});

test('目的別案内は空の絞り込みページではなく、状況・読む順番・独自の共有画像を持つ', () => {
  for (const guide of TOPIC_GUIDES) {
    const html = read(`guides/${guide.slug}/index.html`);
    assert.match(html, /reader-guide-order/);
    assert.ok(html.includes(guide.answer));
    assert.ok(read('blog/index.html').includes(`/guides/${guide.slug}/`));
    assert.ok(read('sitemap.xml').includes(`/guides/${guide.slug}/`));
    for (const [, , href] of guide.sections) assert.ok(fs.existsSync(path.join(root, href === '/' ? 'index.html' : href.slice(1))), href);
    const image = fs.readFileSync(path.join(root, `images/guides/${guide.slug}.jpg`));
    assert.deepEqual(getImageDimensions(image), { width: 1200, height: 630 });
  }
  const hub = read('blog/index.html');
  assert.match(hub, /<title>Google Play Points 記事一覧 \| PlayPoint<\/title>/);
  assert.match(hub, /images\/guides\/article-guide.jpg/);
});
