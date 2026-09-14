'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  PRIMARY_NAV,
  renderGlobalNav,
  renderHeaderLinks,
  syncArticlePrimaryNav,
  syncLatestPrimaryNav,
  syncTopPrimaryNav
} = require('../scripts/japanese-primary-navigation.cjs');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const expectedHrefs = ['/games/', '/blog/', '/latest/', '/author/katakata.html'];

function assertPrimaryLinks(html, activeHref = '') {
  assert.match(html, /data-site-primary-nav="true"/);
  assert.match(html, /aria-label="メインナビゲーション"/);
  for (const href of expectedHrefs) assert.ok(html.includes(`href="${href}"`), `missing primary href ${href}`);
  if (activeHref) assert.ok(html.includes(`href="${activeHref}" aria-current="page"`) || html.includes(`active" href="${activeHref}" aria-current="page"`));
}

test('Primary Navの正本はゲーム・記事・最新情報・検証方針の4導線だけを所有する', () => {
  assert.deepEqual(PRIMARY_NAV.map(item => item.href), expectedHrefs);
  assert.deepEqual(PRIMARY_NAV.map(item => item.label), [
    '🎮 ゲーム別計算',
    '📝 記事一覧',
    '🆕 最新情報',
    '運営者・検証方針'
  ]);
});

test('記事Primary Navは上段site-headerだけを統一し目的別global-navは触らない', () => {
  const input = '<header class="site-header"><div class="site-header-inner"><a class="site-logo" href="/">Brand</a><div class="site-header-links"><a href="/old">Old</a></div></div></header><nav class="global-nav ja-global-nav"><a href="/secondary">Secondary</a></nav>';
  const output = syncArticlePrimaryNav(input, 'articles/example.html');
  assertPrimaryLinks(output, '/blog/');
  assert.ok(output.includes('/secondary'), 'secondary purpose navigation must remain intact');
  assert.ok(!output.includes('href="/old"'));
});

test('ゲームPrimary Navは共通4導線をnav-itemとして描画する', () => {
  const html = renderGlobalNav('/games/');
  assertPrimaryLinks(html, '/games/');
  assert.match(html, /class="nav-item active" href="\/games\/" aria-current="page"/);
});

test('最新情報Primary Navは既存eng-navのレイアウトclassを保つ', () => {
  const input = '<nav class="eng-nav"><a class="eng-nav-logo" href="../">Playポイント計算機</a><div class="eng-nav-links"><a href="../blog/">旧</a></div></nav>';
  const output = syncLatestPrimaryNav(input);
  assertPrimaryLinks(output, '/latest/');
  assert.match(output, /class="eng-nav-links site-primary-nav"/);
});

test('計算機トップは地域注意とKatakataLabを保持しつつPrimary Navを補完する', () => {
  const input = '<div class="header-links"><a href="attention.html" data-country-notes-link data-lang-key="linkAttention">注意</a><a href="games/" data-lang-key="linkGames">旧ゲーム</a><a href="blog/" data-lang-key="linkArticles">旧記事</a><a href="https://katakatalab.com/" data-lang-key="linkKatakata">KatakataLab</a></div>';
  const output = syncTopPrimaryNav(input);
  assert.match(output, /data-site-primary-nav="true"/);
  assert.match(output, /data-country-notes-link/);
  assert.match(output, /data-lang-key="linkLatest"/);
  assert.match(output, /data-lang-key="linkAuthor"/);
  assert.match(output, /data-lang-key="linkKatakata"/);
});

test('生成済み日本語主要導線は同じPrimary Nav契約を持つ', () => {
  const top = read('index.html');
  assert.match(top, /class="header-links" data-site-primary-nav="true"/);
  for (const token of ['linkGames', 'linkArticles', 'linkLatest', 'linkAuthor']) assert.ok(top.includes(`data-lang-key="${token}"`));

  const latest = read('latest/index.html');
  assertPrimaryLinks(latest, '/latest/');

  const game = read('games/efootball/index.html');
  assertPrimaryLinks(game, '/games/');

  const article = read('articles/2025-12-25-refund.html');
  assertPrimaryLinks(article, '/blog/');
  assert.match(article, /class="global-nav ja-global-nav" aria-label="目的から探す"/);
});

test('header/plain rendererも同じ正本を使う', () => {
  assertPrimaryLinks(renderHeaderLinks('/blog/'), '/blog/');
});
