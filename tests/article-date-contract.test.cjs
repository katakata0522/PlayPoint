'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {
  syncArticleDateContract,
  synchronizeArticleDateHtml
} = require('../scripts/article-date-contract.cjs');

const rootDir = path.resolve(__dirname, '..');

function japaneseFixture() {
  return `<!doctype html>
<html lang="ja">
<head>
  <meta name="author" content="かたかた">
  <meta name="last-modified" content="2026-08-04">
  <meta property="article:published_time" content="2025-12-25T00:00:00+09:00">
  <meta property="article:modified_time" content="2026-08-17T00:00:00+09:00">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","datePublished":"2025-12-25","dateModified":"2026-08-17"}</script>
</head>
<body>
  <header class="hero">
    <h1>テスト記事</h1>
    <p class="hero-meta">2026/07/31 更新 ・ 読了 6分</p>
  </header>
  <section class="source-list">
    <p class="small">最終公式確認日：2026年7月31日。条件は公式画面を確認してください。</p>
  </section>
</body>
</html>`;
}

function legacyPostMetaFixture() {
  return japaneseFixture().replace(
    '<p class="hero-meta">2026/07/31 更新 ・ 読了 6分</p>',
    '<div class="article-post-meta"><span>📅 公開: 2025.12.25 ｜ 🔄 更新: 2026.07.31 ｜ ⏱️ 読了 約6分</span></div>'
  );
}

function legacyArticleMetaFixture() {
  return japaneseFixture().replace(
    '<p class="hero-meta">2026/07/31 更新 ・ 読了 6分</p>',
    '<p class="article-meta">公開日：2025-12-25 / 更新日：2026-08-17 / 著者：<a href="../author/katakata.html" rel="author">かたかた</a></p>'
  );
}

function englishFixture() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta name="author" content="Katakata">
  <meta name="last-modified" content="2026-08-21">
  <meta property="article:published_time" content="2026-07-07T00:00:00+09:00">
  <meta property="article:modified_time" content="2026-08-21T00:00:00+09:00">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","datePublished":"2026-07-07","dateModified":"2026-08-21"}</script>
</head>
<body>
  <div class="hero"><h1>US comparison</h1><p class="hero-meta">Updated 2026-08-21 ・ US official conditions</p></div>
  <aside class="official-source-note"><p>Official information checked on 2026-08-05. Conditions can change.</p></aside>
</body>
</html>`;
}

test('更新日と公式情報確認日を別の意味として表示する', () => {
  const result = synchronizeArticleDateHtml(japaneseFixture(), {
    relativePath: 'articles/example.html',
    officialVerifiedAt: '2026-07-31'
  });

  assert.match(result.html, /data-article-date="published" datetime="2025-12-25"/);
  assert.match(result.html, /data-article-date="modified" datetime="2026-08-04"/);
  assert.match(result.html, /data-article-date="official-verified" datetime="2026-07-31"/);
  assert.match(result.html, /更新 <time[^>]*>2026\/08\/04<\/time>/);
  assert.match(result.html, /公式情報確認 <time[^>]*>2026\/07\/31<\/time>/);
  assert.match(result.html, /読了 6分/);
  assert.match(result.html, /<meta name="last-modified" content="2026-08-04">/);
  assert.match(result.html, /<meta name="playpoint:official-verified" content="2026-07-31">/);
  assert.match(result.html, /article:modified_time[^>]*content="2026-08-04T00:00:00\+09:00"/);
  assert.match(result.html, /"dateModified":"2026-08-04"/);
  assert.match(result.html, /最終公式確認日：2026年7月31日/);
});

test('旧article-post-meta形式でも意味を壊さず同期する', () => {
  const result = synchronizeArticleDateHtml(legacyPostMetaFixture(), {
    relativePath: 'articles/legacy.html',
    officialVerifiedAt: '2026-07-31'
  });

  assert.match(result.html, /class="article-post-meta"/);
  assert.match(result.html, /公開 <time[^>]*>2025\/12\/25<\/time>/);
  assert.match(result.html, /更新 <time[^>]*>2026\/08\/04<\/time>/);
  assert.match(result.html, /公式情報確認 <time[^>]*>2026\/07\/31<\/time>/);
  assert.match(result.html, /読了 約6分/);
});

test('旧article-meta形式は著者リンクを保持して同期する', () => {
  const result = synchronizeArticleDateHtml(legacyArticleMetaFixture(), {
    relativePath: 'articles/legacy-announcement.html',
    officialVerifiedAt: '2026-08-17'
  });

  assert.match(result.html, /class="article-meta"/);
  assert.match(result.html, /公式情報確認 <time[^>]*datetime="2026-08-17"/);
  assert.match(result.html, /著者：<a href="\.\.\/author\/katakata\.html" rel="author">かたかた<\/a>/);
});

test('日付正規化で地域注記を消さず、明示された公式確認日を同期できる', () => {
  const result = synchronizeArticleDateHtml(englishFixture(), {
    relativePath: 'en/articles/example.html',
    officialVerifiedAt: '2026-08-05'
  });

  assert.match(result.html, /US official conditions/);
  assert.match(result.html, /Official info checked <time[^>]*datetime="2026-08-05"/);
  assert.match(result.html, /Official sources checked: August 5, 2026/);
});

test('記事日付同期は冪等である', () => {
  const once = synchronizeArticleDateHtml(japaneseFixture(), {
    relativePath: 'articles/example.html',
    officialVerifiedAt: '2026-07-31'
  }).html;
  const twice = synchronizeArticleDateHtml(once, {
    relativePath: 'articles/example.html',
    officialVerifiedAt: '2026-07-31'
  });

  assert.equal(twice.changed, false);
  assert.equal(twice.html, once);
});

test('公開中の全記事が日付SSOTと同期済みである', () => {
  const summary = syncArticleDateContract(rootDir, { checkOnly: true });
  assert.ok(summary.checked > 100, `expected > 100 articles, got ${summary.checked}`);
  assert.equal(summary.changed, 0, `日付同期が必要な記事: ${summary.changedFiles.join(', ')}`);
});
