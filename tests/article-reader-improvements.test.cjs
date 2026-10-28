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
const { syncArticleMetadata, QUESTIONS } = require('../scripts/reader-foundations.cjs');

test('検索・共有・本文の主題は台帳と一致し、短縮タイトルとFAQの内容は維持する', () => {
  for (const article of manifest) {
    const html = read(article.file.slice(3));
    assert.equal(syncArticleMetadata(html, article), html, article.id + ': metadata already synchronized');
  }
  const source = '<title>old</title><meta name="description" content="old"><h1>old</h1><script type="application/ld+json">{"@type":"Article","headline":"old"}</script><script type="application/ld+json">{"@type":"FAQPage","name":"質問","mainEntity":[]}</script>';
  const transformed = syncArticleMetadata(source, { title: 'A < B & C', description: '条件 "引用"' });
  assert.match(transformed, /A &lt; B &amp; C/);
  assert.match(transformed, /条件 &quot;引用&quot;/);
  assert.match(transformed, /"name":"質問"/);
  const hub = read('blog/index.html');
  for (const [question,,href] of QUESTIONS) {
    assert.ok(hub.includes(question));
    const url = new URL(href, 'https://playpoint-sim.com');
    const destination = read(url.pathname.slice(1));
    if (url.hash) assert.ok(destination.includes(`id="${url.hash.slice(1)}"`));
  }
});

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
    assert.ok(crumbs, article.id + ': パンくずを検索にも伝える');
    assert.equal(crumbs.itemListElement.length, 3, article.id);
    assert.equal(crumbs.itemListElement[1].name, article.browseCategory, article.id);
    assert.deepEqual(crumbs.itemListElement.map(item => item.position), [1, 2, 3], article.id);
    assert.equal(crumbs.itemListElement[0].item, 'https://playpoint-sim.com/blog/', article.id);
    assert.equal(crumbs.itemListElement[2].item, new URL(article.file.replace(/index\.html$/, ''), 'https://playpoint-sim.com/blog/').href, article.id);
    assert.match(html, /name="playpoint:anchor-ads" content="collapsed-bottom"/, article.id + ': 通常アンカーを下部に表示');
  }
  const hubSchemas = [...read('blog/index.html').matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
  assert.equal(hubSchemas.some(node => node['@type'] === 'BreadcrumbList'), false, '入口には表示のないパンくずを作らない');
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
    assert.match(summary, /(?:公開|更新) \d{4}-\d{2}-\d{2}/, article.id);
    assert.equal(summary.includes('公式確認'), false, article.id);
    assert.match(html, /data-article-date="official-verified" datetime="\d{4}-\d{2}-\d{2}"/, article.id);
    assert.equal(/旧固定価格|旧PlayPoint|最終正本|現行正本|結帳/.test(html), false, article.id);
  }
});

test('eFootball記事のFAQは目次から既存の見出しへ移動できる', () => {
  const html = read('games/efootball/google-play-points-vs-efootball-points/index.html');
  const toc = html.match(/<!-- reader-toc:start -->([\s\S]*?)<!-- reader-toc:end -->/)?.[1] || '';
  assert.equal((toc.match(/href="#article-section-7"/g) || []).length, 1);
  assert.match(toc, /href="#article-section-7">よくある質問<\/a>/);
  assert.match(html, /<h2 id="article-section-7">よくある質問<\/h2>/);
});

test('購入比較は即時の個数と将来の還元を分け、Pokémon GOのReward RoadをWeb専用として扱わない', () => {
  const pokemon = read('games/pokemon-go/google-play-vs-webstore/index.html');
  const table = pokemon.match(/<section class="section reader-comparison"[\s\S]*?<\/section>/)?.[0] || '';
  assert.match(table, /Google Play[\s\S]*?対象の現金購入はReward Roadも確認/);
  assert.match(table, /公式Web Store[\s\S]*?対象の現金購入はReward Roadも確認/);
  assert.match(table, /支払額 ÷ ボーナス込みの受取個数/);
  assert.match(table, /今すぐ受け取るポケコインに足しません/);
  assert.ok(pokemon.match(/<h1\b[^>]*>([^<]+)<\/h1>/)[1].length < 60);
  assert.match(pokemon, /<h2 id="article-section-2">AndroidはGoogle PlayとGalaxy Storeを区別する<\/h2>/, '既存の節への直リンクを新しい比較表でずらさない');
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
  assert.match(hub, /<title>Google Play Points 記事ガイド \| PlayPoint<\/title>/);
  assert.match(hub, /images\/guides\/article-guide.jpg/);
});
test('海外記事の長い表の前で、本文と到達先を残したまま目次を開ける', () => {
  const { compactIntlToc } = require('../scripts/site-reader-polish.cjs');
  const source = '<article class="content"><p>導入を残す</p><section class="section answer-box"><h2 id="answer">回答</h2><table><tr><td>条件1</td><td>100pt</td></tr></table></section><nav class="intl-article-toc" aria-label="Contents"><h2 id="toc">Contents</h2><ol><li><a href="#answer">回答へ</a></li></ol></nav></article>';
  const output = compactIntlToc(source);
  assert.ok(output.indexOf('<details') < output.indexOf('<table'));
  assert.match(output, /<summary><h2 id="toc">Contents<\/h2><\/summary>/);
  assert.match(output, /href="#answer"/);
  for (const value of ['導入を残す', 'id="answer"', '<td>条件1</td><td>100pt</td>']) assert.ok(output.includes(value));
  assert.equal(compactIntlToc(output), output);
  const wrapped = '<details class="reader-toc reader-toc--intl"><summary>On this page</summary>' + source.match(/<nav[\s\S]*?<\/nav>/)[0] + '</details>';
  assert.equal(compactIntlToc(wrapped), wrapped, '既存の折りたたみをもう一段増やさない');
  const nested = wrapped.replace('<nav', '<details').replace('</nav>', '</details>').replace('<h2 id="toc">Contents</h2>', '<summary><h2 id="toc">Contents</h2></summary>');
  assert.equal(compactIntlToc(nested), wrapped, '既に生成した二重の開閉も一段に戻す');
});

test('海外の主題バッジは題名と同じ意味だけを省き、固有の条件を残す', () => {
  const { polishPage } = require('../scripts/site-reader-polish.cjs');
  const page = (title, badge) => `<div class="hero"><span class="hero-badge">${badge}</span><h1>${title}</h1></div><p>Account conditions and article body.</p>`;
  for (const [title,badge] of [
    ['Google Play quest not working?', 'Google Play quests'],
    ['구글 플레이 퀘스트란? 안 뜸 원인', 'Google Play 퀘스트'],
    ['Google Play Fest 2026 is live! US rewards', 'Play Fest 2026 · US'],
    ['台灣 Play 盛典 2026 開跑！', 'Play 盛典 2026 · 台灣']
  ]) {
    const result = polishPage(page(title,badge), 'en/articles/example.html');
    assert.doesNotMatch(result, /hero-badge/);
    assert.ok(result.includes(`<h1>${title}</h1>`));
    assert.ok(result.includes('Account conditions and article body.'));
    assert.equal(polishPage(result, 'en/articles/example.html'), result);
  }
  for (const badge of ['Weekly prizes · installs · quests · Play Pass', 'Play Fest 2026 · Ends October 19', 'Game purchase guide · Japan edition']) {
    assert.ok(polishPage(page('Google Play quests and Play Fest 2026',badge), 'en/articles/example.html').includes(badge));
  }
});

test('海外本文の句だけを強調・リンクし、文字・段落・地域条件と既存リンクを保つ', () => {
  const {applyEditorialCues,CUES}=require('../scripts/intl-editorial-cues.cjs');
  const strip=s=>s.replace(/<[^>]*>/g,'');
  const source='<article class="content"><header><p>item price</p></header><p>Points use item price, not taxes, then the nearest whole point.</p><p><a href="/existing/">item price</a> stays here.</p><aside><p>item price</p></aside></article>';
  const output=applyEditorialCues(source,'en/articles/google-play-points-rounding-tax.html');
  assert.equal(strip(output),strip(source));
  assert.equal((output.match(/data-editorial-cue/g)||[]).length,1);
  assert.equal((output.match(/data-editorial-link/g)||[]).length,1);
  assert.ok(output.includes('<header><p>item price</p></header>'));
  assert.ok(output.includes('<a href="/existing/">item price</a>'));
  assert.ok(output.includes('<aside><p>item price</p></aside>'));
  assert.equal(applyEditorialCues(output,'en/articles/google-play-points-rounding-tax.html'),output);
  assert.equal(applyEditorialCues(source,'articles/example.html'),source);
  for(const [slug,locales] of Object.entries(CUES)) for(const [locale,cue]of Object.entries(locales)) if(cue.link){
    const html=read(`${locale}/articles/${slug}.html`);
    assert.equal((html.match(/data-editorial-link/g)||[]).length,1,locale+'/'+slug);
    assert.ok(fs.existsSync(path.join(root,locale,'articles',cue.link[1]+'.html')));
  }
});

test('手書きの日本語目次はリンクと見出しIDを残して一つの開閉にまとめる', () => {
  const { polishPage } = require('../scripts/site-reader-polish.cjs');
  const source = '<nav class="article-toc" aria-label="この記事の目次"><h2 id="toc">この記事の目次</h2><ol><li><a href="#orders">購入履歴</a></li></ol></nav><h2 id="orders">購入履歴</h2><p>本文と条件</p>';
  const output = polishPage(source, 'articles/purchase-history.html');
  assert.match(output, /<summary class="inpage-toc-title" id="toc">この記事の目次<\/summary>/);
  assert.match(output, /href="#orders"/);
  assert.match(output, /<h2 id="orders">購入履歴<\/h2><p>本文と条件<\/p>/);
  assert.equal((output.match(/class="inpage-toc reader-toc"/g) || []).length, 1);
  assert.equal(polishPage(output, 'articles/purchase-history.html'), output);
});

test('長い海外実用記事は本文を変えず見出しへ移動でき、短いニュースへ目次を増やさない', () => {
  const { addPracticalToc } = require('../scripts/site-reader-polish.cjs');
  const source = '<article class="content"><p>Short answer &amp; condition.</p><section class="answer-box">' + Array.from({length:6}, (_,i) => `<h2 id="section-${i}">Topic ${i}</h2><p>Body ${i}</p>`).join('') + '</section></article>';
  const result = addPracticalToc(source, 'en/articles/google-play-points-earn-free.html', 'en');
  assert.equal(result.replace(/<details[\s\S]*?<\/details>\n/, ''), source);
  assert.ok(result.indexOf('<details') < result.indexOf('<section class="answer-box">'));
  for (let i=0;i<6;i++) assert.ok(result.includes(`href="#section-${i}"`));
  assert.equal(addPracticalToc(result, 'en/articles/google-play-points-earn-free.html', 'en'), result);
  assert.equal(addPracticalToc(source, 'en/articles/2026-10-12-google-play-fest-2026.html', 'en'), source);
  for (const locale of ['en','ko','tw']) {
    const html = read(`${locale}/articles/google-play-points-earn-free.html`);
    assert.equal((html.match(/class="intl-article-toc reader-toc"/g) || []).length, 1);
    const links = [...html.matchAll(/<a href="#(article-section-\d+)"/g)];
    assert.ok(links.length >= 5);
    for (const [,id] of links) assert.ok(html.includes(`id="${id}"`));
  }
});
