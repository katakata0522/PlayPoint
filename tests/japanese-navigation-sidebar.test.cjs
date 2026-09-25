'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { BROWSE_CATEGORIES, transformArticle, nextFor } = require('../scripts/japanese-navigation-sidebar.cjs');
const { JAPANESE_POPULAR_GUIDES, POPULAR_GUIDES_SNAPSHOT } = require('../scripts/japanese-popular-guides.cjs');
const root = path.resolve(__dirname, '..');
const articles = JSON.parse(fs.readFileSync(path.join(root, 'blog/articles.json'), 'utf8')).filter(a => a.listed !== false)
  .map(a => ({ ...a, path: a.file.replace(/^\.\.\//, ''), href: '/' + a.file.replace(/^\.\.\//, ''), label: a.title }));

test('日本語の全公開記事は検索・人気5件・次行動1件を持ち、関連記事は本文に集約する', () => {
  const publicPaths = new Set(articles.map(a => a.href));
  for (const article of articles) {
    const html = fs.readFileSync(path.join(root, article.path), 'utf8');
    const sidebar = html.match(/<aside class="sidebar-column ja-article-sidebar"[\s\S]*?<\/aside>/)?.[0];
    assert.ok(sidebar, article.path);
    assert.match(sidebar, /class="sidebar-search-form" action="\/blog\/" method="get"/, article.path);
    assert.match(sidebar, /class="sidebar-search-input"[^>]*name="q"/, article.path);
    assert.equal((sidebar.match(/class="sidebar-browse-category"/g) || []).length, BROWSE_CATEGORIES.length, article.path);
    assert.ok(sidebar.includes('/blog/?topic='), article.path);
    assert.equal((sidebar.match(/class="sidebar-popular-item(?: sidebar-popular-item--featured)?(?: is-current)?"/g) || []).length, 5, article.path);
    assert.equal((sidebar.match(/sidebar-popular-item--featured/g) || []).length, 1, article.path);
    assert.ok(sidebar.includes('今月よく読まれている記事'), article.path);
    assert.ok(sidebar.includes('直近30日・' + POPULAR_GUIDES_SNAPSHOT + '更新'), article.path);
    assert.ok(!/\bPV\b|ページビュー/.test(sidebar), article.path + ': PV数は公開しない');
    assert.equal((sidebar.match(/class="sidebar-next-link"/g) || []).length, 1, article.path);
    const links = [...sidebar.matchAll(/class="sidebar-related-link" href="([^"]+)"/g)].map(m => m[1]);
    assert.equal(links.length, 0, article.path + ': 本文の関連記事をサイドバーに重複させない');
    assert.match(html, /related-links-section|contextual-guide-links|article-related-guides/, article.path);
    for (const href of links) { assert.notEqual(href, article.href); assert.ok(publicPaths.has(href)); }
    assert.ok(sidebar.includes('運営者情報'), article.path);
    assert.ok(sidebar.includes('2026年9月、ついにGoogle Play Pointsのダイヤモンドに到達'), article.path);
    assert.ok(sidebar.includes('湯葉と納豆'), article.path);
    assert.ok(html.includes('/articles/japanese-shell.css?v='), article.path);
    assert.ok(!html.includes('/articles/japanese-sidebar-v2.css'), article.path + ': sidebar CSSは共通CSSへ統合');
    assert.equal(transformArticle(html, article, articles), html, article.path + ': 再生成は冪等');
  }
});

test('サイドバー用7分類は公開80記事を重複なく覆い、件数は台帳から導出できる', () => {
  const expected = new Map([
    ['はじめて・基本', 6],
    ['ランク・ステータス', 13],
    ['貯める・キャンペーン', 17],
    ['使う・交換', 3],
    ['トラブル・アカウント', 15],
    ['ゲーム別課金', 22],
    ['最新情報・イベント', 4]
  ]);
  assert.deepEqual(BROWSE_CATEGORIES, [...expected.keys()]);
  assert.equal(articles.length, 80);
  for (const [label, count] of expected) {
    assert.equal(articles.filter(article => article.browseCategory === label).length, count, label);
  }
  assert.ok(articles.every(article => expected.has(article.browseCategory)));
});

test('人気ランキングの保存データは公開日本語記事5件と実在する日付を持つ', () => {
  assert.match(POPULAR_GUIDES_SNAPSHOT, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(JAPANESE_POPULAR_GUIDES.length, 5);
  assert.equal(new Set(JAPANESE_POPULAR_GUIDES.map(item => item[0])).size, 5);
  const publicPaths = new Set(articles.map(article => article.href));
  for (const [href, label] of JAPANESE_POPULAR_GUIDES) {
    assert.ok(publicPaths.has(href)); assert.ok(label.trim());
  }
});

test('本文とSEO情報は変更せず、サイドバーがない記事にも導線を追加できる', () => {
  const article = articles.find(a => /check-balance/.test(a.path));
  const content = '<article class="content"><h1>元の題名</h1><p>本文と主CTAを保持</p></article>';
  for (const sidebar of ['', '<aside class="sidebar-column"><p>旧案内</p></aside>']) {
    const html = '<html><head><title>元のtitle</title></head><body><nav class="global-nav">旧ナビ</nav><div class="layout-container">' + content + sidebar + '</div></body></html>';
    const result = transformArticle(html, article, articles);
    assert.ok(result.includes(content));
    assert.ok(result.includes('<title>元のtitle</title>'));
    assert.equal((result.match(/ja-article-sidebar/g) || []).length, 1);
    assert.equal(transformArticle(result, article, articles), result);
  }
});

test('問題解決や基礎記事を一律に計算機へ誘導しない', () => {
  const related = [{ href: '/articles/check.html', label: '残高を確認する' }];
  for (const role of ['troubleshooting', 'reference', 'decision_support']) assert.deepEqual(nextFor(role, related), [related[0].href, related[0].label]);
  assert.equal(nextFor('calculator_bridge', related)[0], '/');
  assert.equal(nextFor('retention', related)[0], '/latest/');
});


test('検索・人気記事のスタイルは既存の日本語共通CSSへ統合する', () => {
  const css = fs.readFileSync(path.join(root, 'articles', 'japanese-shell.css'), 'utf8');
  assert.match(css, /\.sidebar-search-form/);
  assert.match(css, /\.sidebar-popular-item/);
  assert.match(css, /\.sidebar-widget--author/);
  assert.ok(!fs.existsSync(path.join(root, 'articles', 'japanese-sidebar-v2.css')));
});

test('記事一覧・最新情報・本文は同じ6つの行き先を持つ', () => {
  const pages = ['blog/index.html', 'latest/index.html', articles[0].path];
  const targets = pages.map(file => {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.equal((html.match(/class="site-header guide-header"/g) || []).length, 1, file);
    const nav = html.match(/<nav class="global-nav ja-global-nav"[\s\S]*?<\/nav>/)?.[0];
    assert.ok(nav, file);
    assert.ok(!html.includes('id="sidebar-toggle"'), file + ': 主導線をメニュー内に隠さない');
    return [...nav.matchAll(/href="([^"]+)"/g)].map(match => match[1]);
  });
  assert.equal(targets[0].length, 6);
  assert.deepEqual(targets[1], targets[0]);
  assert.deepEqual(targets[2], targets[0]);
  assert.ok(targets[0].includes('/latest/'));
  for (const file of pages.slice(0, 2)) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.ok(html.includes(`data-popular-snapshot="${POPULAR_GUIDES_SNAPSHOT}"`), file);
    assert.equal((html.match(/<main\b/g) || []).length, 1, file);
    assert.equal((html.match(/<h1\b/g) || []).length, 1, file);
  }
});
