'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  GUIDE_BRAND,
  GUIDE_DESCRIPTION,
  GUIDE_PAGE_TITLE,
  japaneseArticleFiles,
  syncArticleBrand,
  syncBlogIndexBrand
} = require('../scripts/japanese-guide-brand.cjs');
const { buildBlogFeeds } = require('../scripts/blog-feeds.cjs');

const root = path.join(__dirname, '..');

const LEGACY_VISIBLE_BRANDS = [
  'Google Play Points攻略・使い方ブログ',
  'Google Play Points 攻略・使い方記事',
  'Playポイント攻略',
  'Google Play Points 計算機 ＆ 攻略ガイド'
];

test('日本語記事ハブは「Google Play Points 完全攻略ガイド」を正本にする', () => {
  const html = fs.readFileSync(path.join(root, 'blog', 'index.html'), 'utf8');

  assert.match(html, new RegExp(`<title>${GUIDE_PAGE_TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</title>`));
  assert.ok(html.includes(`content="${GUIDE_DESCRIPTION}"`));
  assert.ok(html.includes(`property="og:site_name" content="${GUIDE_BRAND}"`));
  assert.ok(html.includes(`class="brand">${GUIDE_BRAND}</a>`));
  assert.ok(html.includes(`<h1 class="hero-title">${GUIDE_BRAND}</h1>`));
  assert.ok(html.includes(`title="${GUIDE_BRAND} RSS"`));
  assert.ok(html.includes(`title="${GUIDE_BRAND} Atom"`));

  for (const legacy of LEGACY_VISIBLE_BRANDS) assert.equal(html.includes(legacy), false, legacy);
  assert.equal(syncBlogIndexBrand(html), html, '記事ハブのブランド同期は冪等であること');
});

test('公開中の日本語記事はヘッダー・OGP・記事一覧導線を完全攻略ガイドへ統一する', () => {
  const files = japaneseArticleFiles(root);
  assert.ok(files.length >= 1);

  for (const relativePath of files) {
    const html = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.ok(html.includes(`🎮 ${GUIDE_BRAND}</a>`), `${relativePath}: header brand`);
    assert.ok(html.includes(`property="og:site_name" content="${GUIDE_BRAND}"`), `${relativePath}: og:site_name`);
    assert.equal(html.includes('Google Play Points 計算機 ＆ 攻略ガイド'), false, `${relativePath}: legacy header`);
    assert.equal(html.includes('<span class="nav-sub">全攻略ガイド</span>'), false, `${relativePath}: legacy nav label`);
    assert.equal(syncArticleBrand(html, relativePath), html, `${relativePath}: brand sync must be idempotent`);
  }
});

test('RSS / Atom生成も完全攻略ガイドの名称と説明を使う', () => {
  const articles = JSON.parse(fs.readFileSync(path.join(root, 'blog', 'articles.json'), 'utf8'));
  const feeds = buildBlogFeeds(articles);
  assert.ok(feeds);

  for (const xml of [feeds.rss, feeds.atom]) {
    assert.ok(xml.includes(GUIDE_PAGE_TITLE));
    assert.ok(xml.includes(GUIDE_DESCRIPTION));
    assert.equal(xml.includes('Google Play Points攻略・使い方ブログ'), false);
  }
});
