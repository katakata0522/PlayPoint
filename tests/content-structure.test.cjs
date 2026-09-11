'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  insertStaticPrompt,
  japaneseArticlePaths
} = require('../scripts/article-static-usability.cjs');
const { classifyArticleRole } = require('../scripts/article-role-registry.cjs');

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

test('canonical buildはArticle Roleに応じて汎用計算主導線を出し分ける', () => {
  const input = '<article class="content"><div class="cta-box">別用途の既存CTA</div><section class="answer-box"><h2>即答</h2><p>回答。</p></section><section class="section"><h2>詳細</h2></section></article>';
  const calculatorOptions = { relativePath: 'articles/2026-07-24-play-points-100-value.html', listed: true };
  const first = insertStaticPrompt(input, calculatorOptions);
  const second = insertStaticPrompt(first, calculatorOptions);
  const answerIndex = first.indexOf('class="answer-box"');
  const answerEnd = first.indexOf('</section>', answerIndex) + '</section>'.length;
  const promptIndex = first.indexOf('data-generated-article-prompt="true"');
  const detailIndex = first.indexOf('<section class="section">');

  assert.equal(second, first, 'canonical buildを再実行してもCTAを増やしません');
  assert.ok(first.includes('別用途の既存CTA'), '別用途のCTAを壊しません');
  assert.ok(promptIndex > answerEnd, 'calculator_bridgeの計算CTAは即答の後に置きます');
  assert.ok(promptIndex < detailIndex, 'calculator_bridgeの計算CTAは詳細本文より前に置きます');
  assert.equal((first.match(/data-generated-article-prompt="true"/g) || []).length, 1);

  const retention = insertStaticPrompt(input, { relativePath: 'articles/2026-07-31-google-play-quests.html', listed: true });
  assert.doesNotMatch(retention, /data-generated-article-prompt="true"/, 'retentionへ汎用計算CTAを出しません');
  assert.ok(retention.includes('別用途の既存CTA'), '非calculator Roleでも既存文脈CTAを保持します');

  const articles = readArticles();
  for (const article of articles) {
    if (!/^\.\.\/articles\/[^/]+\.html$/.test(article.file || '')) continue;
    const relativePath = article.file.replace(/^\.\.\//, '');
    const html = read(relativePath);
    const role = classifyArticleRole(relativePath, { listed: article.listed !== false });
    const generatedCount = (html.match(/data-generated-article-prompt="true"/g) || []).length;

    if (role === 'calculator_bridge') {
      assert.match(html, /<aside\b[^>]*class=["'][^"']*\barticle-calculator-prompt\b[^"']*["'][^>]*>/i, relativePath + ': calculator_bridgeの計算主導線がありません');
    } else {
      assert.equal(generatedCount, 0, relativePath + ': ' + role + 'へ汎用計算CTAを出してはいけません');
    }
  }
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

 test('旧記事のdiv導入でも計算CTAはタイトルと回答より後に置く', () => {
  const input = '<article class="content"><header class="hero"><h1>Title</h1></header><div class="intro"><div>Answer</div><p>Condition</p></div><h2>Details</h2></article>';
  const options = {relativePath:'articles/2025-12-25-diamond-worth-it.html', listed:true};
  const output = insertStaticPrompt(input, options);
  assert.ok(output.indexOf('data-generated-article-prompt') > output.indexOf('<p>Condition</p></div>'));
  assert.ok(output.indexOf('data-generated-article-prompt') < output.indexOf('<h2>Details</h2>'));
  assert.equal(insertStaticPrompt(output, options), output);
 });


test('公開記事の条件説明は定型の二列カードへ戻らない', () => {
  for (const article of readArticles().filter(article => article.listed !== false)) {
    const html = read(article.file.replace('../', ''));
    assert.ok(!html.includes('knowledge-boundary__grid'), article.file);
    const note = html.match(/<section class="knowledge-boundary"[^>]*>[\s\S]*?<\/section>/)?.[0];
    if (note) {
      assert.match(note, /<h2\b[^>]*>[^<]+<\/h2>/, article.file);
      assert.match(note, /<p>/, article.file);
    }
  }
});
