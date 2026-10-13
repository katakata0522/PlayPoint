'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const {
  getArticleFiles,
  syncArticleDateContract,
  synchronizeArticleDateHtml
} = require('../scripts/article-date-contract.cjs');
const { syncMetadata } = require('../scripts/reader-foundations.cjs');
const { buildBlogFeeds } = require('../scripts/blog-feeds.cjs');
const { getBlogSitemapEntries } = require('../scripts/sitemap-sync.cjs');

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

test('日本語台帳の実更新日をHTML・構造化データ・フィード・サイトマップへ揃え、海外の手動更新日は保持する', t => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-article-dates-'));
  t.after(() => {
    assert.equal(path.dirname(fixtureRoot), path.resolve(os.tmpdir()));
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  });
  const manifest = [
    ['best-use', 'best-use.html', '2026-08-04'],
    ['play-points-calendar-schedule-guide-2026', 'calendar.html', '2026-08-04'],
    ['play-pass-worth-it', 'pass.html', '2026-10-08']
  ].map(([id, file, modified]) => ({ id, file: `../articles/${file}`, date: '2025-12-25', modified, title: id, description: id }));
  const registry = { 'en/articles/manual.html': '2026-08-05' };
  for (const directory of ['articles', 'blog', 'scripts', 'en/articles']) fs.mkdirSync(path.join(fixtureRoot, directory), { recursive: true });
  for (const article of manifest) {
    const file = article.file.slice(3);
    fs.writeFileSync(path.join(fixtureRoot, file), japaneseFixture());
    registry[file] = '2026-07-31';
  }
  fs.writeFileSync(path.join(fixtureRoot, 'blog/articles.json'), JSON.stringify(manifest));
  fs.writeFileSync(path.join(fixtureRoot, 'scripts/article-official-verification-dates.json'), JSON.stringify(registry));
  fs.writeFileSync(path.join(fixtureRoot, 'en/articles/manual.html'), englishFixture());

  // メタ情報同期を繰り返しても、後日のPlay Pass改稿を旧固定日へ戻さない。
  syncMetadata(fixtureRoot);
  assert.ok(syncArticleDateContract(fixtureRoot, { checkOnly: true }).changed > 0);
  syncArticleDateContract(fixtureRoot);
  syncMetadata(fixtureRoot);
  assert.equal(syncArticleDateContract(fixtureRoot, { checkOnly: true }).changed, 0);
  const synchronizedManifest = JSON.parse(fs.readFileSync(path.join(fixtureRoot, 'blog/articles.json'), 'utf8'));
  const pass = synchronizedManifest.find(article => article.id === 'play-pass-worth-it');
  assert.equal(pass.modified, '2026-10-08');
  const passHtml = fs.readFileSync(path.join(fixtureRoot, 'articles/pass.html'), 'utf8');
  assert.match(passHtml, /last-modified" content="2026-10-08"/);
  assert.match(passHtml, /"dateModified":"2026-10-08"/);
  assert.match(passHtml, /article:modified_time[^>]*content="2026-10-08T00:00:00\+09:00"/);
  assert.match(passHtml, /data-article-date="modified" datetime="2026-10-08"/);
  assert.match(passHtml, /data-article-date="published" datetime="2025-12-25"/);
  assert.match(passHtml, /data-article-date="official-verified" datetime="2026-07-31"/);
  const feeds = buildBlogFeeds(synchronizedManifest);
  const passEntry = [...feeds.atom.matchAll(/<entry>[\s\S]*?<\/entry>/g)].find(match => match[0].includes('/articles/pass.html'))?.[0] || '';
  assert.match(passEntry, /<updated>2026-10-08T12:00:00\+09:00<\/updated>/);
  assert.equal(getBlogSitemapEntries(fixtureRoot).find(entry => entry.url.endsWith('/articles/pass.html')).lastmod, pass.modified);
  const international = fs.readFileSync(path.join(fixtureRoot, 'en/articles/manual.html'), 'utf8');
  assert.match(international, /last-modified" content="2026-08-21"/);
  assert.match(international, /data-article-date="modified" datetime="2026-08-21"/);
});

test('公開中の全記事が日付SSOTと同期済みである', () => {
  const expectedFiles = getArticleFiles(rootDir);
  const summary = syncArticleDateContract(rootDir, { checkOnly: true });
  assert.ok(expectedFiles.length > 0, 'article inventory must not be empty');
  assert.equal(summary.checked, expectedFiles.length, 'date contract must audit the complete article inventory');
  assert.equal(summary.changed, 0, `日付同期が必要な記事: ${summary.changedFiles.join(', ')}`);
});
