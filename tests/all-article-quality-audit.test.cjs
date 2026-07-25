'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const registry = JSON.parse(read('blog/articles.json'));
const japanese = registry.map(article => article.file.replace(/^\.\.\//, ''));
const international = ['en', 'ko', 'tw'].flatMap(locale =>
  fs.readdirSync(path.join(root, locale, 'articles'))
    .filter(file => file.endsWith('.html') && file !== 'index.html')
    .map(file => `${locale}/articles/${file}`)
);
const articles = [...new Set([...japanese, ...international])].sort();
const articleSet = new Set(articles);

function schemas(html, file) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => {
    try {
      return JSON.parse(match[1]);
    } catch (error) {
      assert.fail(`${file}: invalid JSON-LD: ${error.message}`);
    }
  });
}

test('the complete published article corpus keeps structural quality signals', () => {
  assert.ok(registry.length >= 29, `expected at least 29 Japanese articles, found ${registry.length}`);
  assert.ok(articles.length >= 90, `expected at least 90 published articles, found ${articles.length}`);

  for (const file of articles) {
    const html = read(file);
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/);
    assert.equal(canonical && canonical[1], `https://playpoint-sim.com/${file}`, `${file}: canonical mismatch`);
    assert.equal((html.match(/<h1\b/g) || []).length, 1, `${file}: expected exactly one h1`);
    assert.ok(/rel="author"/.test(html), `${file}: visible author link is missing`);
    assert.doesNotMatch(html, /placeholder|lorem ipsum|\bTBD\b|\bTODO\b/i, `${file}: placeholder copy remains`);

    const data = schemas(html, file);
    const articleSchemas = data.filter(item => item['@type'] === 'Article');
    assert.equal(articleSchemas.length, 1, `${file}: expected exactly one Article JSON-LD block`);
    const article = articleSchemas[0];
    for (const key of ['datePublished', 'dateModified', 'author', 'image']) {
      assert.ok(article[key], `${file}: Article.${key} is missing`);
    }

    const visibleFaq = /<h2[^>]*>\s*(?:よくある質問|Frequently asked questions|자주 묻는 질문|常見問題|FAQ)/i.test(html);
    if (visibleFaq) {
      assert.ok(data.some(item => item['@type'] === 'FAQPage'), `${file}: visible FAQ has no FAQPage JSON-LD`);
    }
  }
});

test('article hreflang links are reciprocal and use the Taiwan locale code', () => {
  for (const file of articles) {
    const html = read(file);
    assert.doesNotMatch(html, /hreflang="zh-Hant"/, `${file}: use zh-TW for the Taiwan alternate`);
    const alternates = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="https:\/\/playpoint-sim\.com\/([^"]+)" ?\/?>/g)]
      .map(match => ({ lang: match[1], file: match[2] }));
    if (!alternates.length) continue;
    assert.ok(alternates.some(item => item.file === file), `${file}: hreflang self reference is missing`);
    assert.ok(alternates.some(item => item.lang === 'x-default'), `${file}: x-default is missing`);
    for (const alternate of alternates.filter(item => item.lang !== 'x-default' && articleSet.has(item.file))) {
      const target = read(alternate.file);
      assert.ok(target.includes(`href="https://playpoint-sim.com/${file}"`), `${file}: ${alternate.file} does not link back`);
    }
  }
});

test('rewritten gift-card guides contain verifiable checks, not permanent discount claims', () => {
  const files = [
    'articles/2026-06-20-discount-gift-cards.html',
    'en/articles/2026-06-20-discount-gift-cards.html',
    'ko/articles/2026-06-20-discount-gift-cards.html',
    'tw/articles/2026-06-20-discount-gift-cards.html',
  ];
  const forbidden = ['Slickdeals', 'RedCard', '해피머니', '컬쳐랜드', '街口', 'IDARE', 'Kyash', '5%에서 최대 15%', '5% 至 15%', '誰にでもおすすめ'];
  assert.match(read('tw/articles/2026-06-20-discount-gift-cards.html'), /未列出台灣/, 'Taiwan discount guide must state current official availability');
  assert.match(read('tw/articles/google-play-points-gift-cards.html'), /未列出台灣/, 'Taiwan gift-card guide must state current official availability');
  for (const file of files) {
    const html = read(file);
    assert.match(html, /answer\/3422734/, `${file}: authorized seller and country source is missing`);
    assert.match(html, /answer\/9077192/, `${file}: Play Points earning source is missing`);
    for (const phrase of forbidden) assert.ok(!html.includes(phrase), `${file}: stale claim remains: ${phrase}`);
  }
});

test('known overstatements do not return to published copy', () => {
  const corpus = articles.map(read).join('\n');
  for (const phrase of [
    '私（わたくし）',
    'アプリ・映画・書籍など何でも使える',
    '「増えてない！」の大半は',
    '還元率を最大化',
  ]) {
    assert.ok(!corpus.includes(phrase), `overstatement remains: ${phrase}`);
  }
});
