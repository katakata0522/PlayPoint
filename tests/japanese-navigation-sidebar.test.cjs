'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { transformArticle, nextFor } = require('../scripts/japanese-navigation-sidebar.cjs');
const root = path.resolve(__dirname, '..');
const articles = JSON.parse(fs.readFileSync(path.join(root, 'blog/articles.json'), 'utf8')).filter(a => a.listed !== false)
  .map(a => ({ ...a, path: a.file.replace(/^\.\.\//, ''), href: '/' + a.file.replace(/^\.\.\//, ''), label: a.title }));

test('日本語の全公開記事は次行動1件・関連記事3件を持ち、自己リンクと非公開記事を除外する', () => {
  const publicPaths = new Set(articles.map(a => a.href));
  for (const article of articles) {
    const html = fs.readFileSync(path.join(root, article.path), 'utf8');
    const sidebar = html.match(/<aside class="sidebar-column ja-article-sidebar"[\s\S]*?<\/aside>/)?.[0];
    assert.ok(sidebar, article.path);
    assert.equal((sidebar.match(/class="sidebar-next-link"/g) || []).length, 1, article.path);
    const links = [...sidebar.matchAll(/class="sidebar-related-link" href="([^"]+)"/g)].map(m => m[1]);
    assert.equal(links.length, 3, article.path);
    assert.equal(new Set(links).size, 3, article.path);
    for (const href of links) { assert.notEqual(href, article.href); assert.ok(publicPaths.has(href)); }
    assert.equal(transformArticle(html, article, articles), html, article.path + ': 再生成は冪等');
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