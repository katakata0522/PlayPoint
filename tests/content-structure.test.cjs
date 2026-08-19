'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function readArticles() {
  return JSON.parse(read('blog/articles.json'));
}

test('記事一覧は4つの検索意図カテゴリだけを使う', () => {
  const articles = readArticles();
  const categories = [...new Set(articles.map(article => article.category))].sort();

  assert.deepEqual(categories, ['キャンペーン', 'トラブル', 'ランク', '使い方']);
  assert.ok(articles.every(article => article.category && article.file));
});

test('反映トラブルの重複記事は新しい包括記事へ恒久統合する', () => {
  const articles = readArticles();
  const htaccess = read('.htaccess');
  const sitemap = read('sitemap.xml');
  const blogSitemap = read('blog/sitemap.xml');
  const canonicalPath = 'articles/2026-03-10-play-points-reflection-timing.html';
  const retiredPath = 'articles/2025-12-25-playpoints-not-reflected.html';
  const canonicalArticle = read(canonicalPath);

  assert.ok(!articles.some(article => article.file.endsWith(retiredPath)));
  assert.ok(
    htaccess.includes(
      'RewriteRule ^articles/2025-12-25-playpoints-not-reflected\\.html$ /articles/2026-03-10-play-points-reflection-timing.html [R=301,L,NE]'
    )
  );
  assert.ok(!sitemap.includes(retiredPath));
  assert.ok(!blogSitemap.includes(retiredPath));
  assert.ok(canonicalArticle.includes('端末側で最後に試すこと'));
  assert.ok(canonicalArticle.includes('もう一度購入して試さない'));
  assert.ok(canonicalArticle.includes('/en/articles/google-play-points-not-showing.html'));
});

test('主要検索記事は即答と判明・不明の境界を静的HTMLで示す', () => {
  const priorityArticles = [
    'articles/2026-03-10-play-points-reflection-timing.html',
    'articles/2026-07-24-play-points-1-value.html',
    'articles/2026-07-24-play-points-100-value.html',
    'articles/2026-07-24-play-points-500-1000-value.html',
    'articles/2026-07-24-play-points-cash-conversion.html',
    'articles/2026-07-24-earn-play-points-free.html',
    'articles/2026-07-25-play-credit-not-working.html',
    'articles/2026-07-25-play-points-coupon-not-applied.html',
    'articles/2025-12-25-playpoints-rank-maintenance.html',
    'articles/2025-12-25-campaign.html'
  ];

  for (const file of priorityArticles) {
    const html = read(file);
    assert.ok(html.includes('id="quick-answer"'), `${file}: 即答欄がありません`);
    assert.ok(html.includes('id="known-unknown"'), `${file}: 判明・不明の境界がありません`);
  }
});

test('既存CTAの有無にかかわらず記事冒頭近くへ計算導線を置く', () => {
  const script = read('blog/article.js');

  assert.ok(!script.includes("if (content.querySelector('.cta-box, .cta-banner')) return;"));
  assert.ok(script.includes("content.querySelector('.answer-box, .summary-box, .intro')"));
  assert.ok(script.includes('setupCalculatorPrompt();'));
});

test('引用用比較表は恒久URL・固定アンカー・一次情報を持つ', () => {
  const comparison = read('compare/earning-rates/index.html');

  assert.ok(comparison.includes('https://playpoint-sim.com/compare/earning-rates/'));
  assert.ok(comparison.includes('id="status-rates"'));
  assert.ok(comparison.includes('id="campaign-comparison"'));
  assert.ok(comparison.includes('/compare/earning-rates/#status-rates'));
  assert.ok(comparison.includes('/compare/earning-rates/#campaign-comparison'));
  assert.ok(comparison.includes('support.google.com/googleplay/answer/9080348'));
  assert.ok(comparison.includes('support.google.com/googleplay/answer/9077192'));

  for (const file of [
    'blog/index.html',
    'articles/2026-07-24-play-points-1-value.html',
    'articles/2026-07-24-play-points-500-1000-value.html',
    'articles/2025-12-25-campaign.html'
  ]) {
    assert.ok(read(file).includes('/compare/earning-rates/'), `${file}: 比較表への導線がありません`);
  }
});

test('記事台帳の公開記事はブログ静的一覧に載り、非掲載は載せない', () => {
  const articles = readArticles();
  const blogIndex = read('blog/index.html');
  const humanSitemap = read('sitemap.html');

  for (const article of articles) {
    const fileName = path.basename(article.file || '');
    if (!fileName || !/^\.\.\/articles\/[^/]+\.html$/.test(article.file)) continue;
    if (article.listed === false) {
      assert.ok(!blogIndex.includes(fileName), `非掲載記事がブログ静的一覧に残っています: ${fileName}`);
      assert.ok(!humanSitemap.includes(fileName), `非掲載記事が人向けサイトマップに残っています: ${fileName}`);
      continue;
    }
    assert.ok(
      blogIndex.includes(`href="${article.file}"`),
      `公開記事がブログ静的一覧にありません: ${article.file}`
    );
  }
});

test('公開記事はトップから3クリック以内で到達できる', () => {
  const { auditClickDepth } = require('../scripts/site-click-depth.cjs');
  const result = auditClickDepth(root);

  assert.equal(
    result.unreachable.length,
    0,
    `未到達URL: ${result.unreachable.join(', ')} / ブログJS一覧は数えません。node scripts/prepare-pr.cjs で静的導線を生成してコミットしてください`
  );
  assert.equal(result.overLimit.length, 0, `4クリック超URL: ${result.overLimit.join(', ')}`);
  assert.ok(result.checkedUrls.length > 0);
  assert.ok(result.maxDepth <= 3);
});

test('深いURLでも同意管理スクリプトをサイトルートから読み込む', () => {
  const thirdParty = read('js/third-party.js');

  assert.ok(thirdParty.includes("document.querySelector('script[src*=\"js/third-party.js\"]')"));
  assert.ok(thirdParty.includes("let prefix = '/'"));
});
