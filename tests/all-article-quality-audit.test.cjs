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

function sitePathToFile(sitePath) {
  const normalized = String(sitePath || '').replace(/^\/+/, '');
  return normalized.endsWith('/') ? `${normalized}index.html` : normalized;
}

function fileToSitePath(file) {
  return String(file || '').replace(/index\.html$/, '');
}

const { schemas, assertOfficialAnswers } = require('./helpers/intl-check.cjs');
const { openingTags } = require('./helpers/markup-contract.cjs');
const classes = node => (node.attrs.class || '').split(/\s+/);
const links = html => openingTags(html).filter(node => node.tag === 'link' && (node.attrs.rel || '').split(/\s+/).includes('alternate') && node.attrs.hreflang);

function visibleText(html) {
  return html
    .replace(/<!--[\s\S]*?(?:-->|$)/g, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:nbsp|amp|quot|#39);/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function articleBody(html, file) {
  const node = openingTags(html).find(node => node.tag === 'article' && classes(node).some(name => ['content', 'article-content'].includes(name)));
  assert.ok(node, `${file}: article.content is missing`);
  const start = html.indexOf('>', node.index) + 1, end = html.indexOf('</article>', start);
  assert.ok(end > start, `${file}: article.content is unclosed`);
  return html.slice(start, end);
}

test('registered Japanese and EN/KO/TW articles keep structural quality signals', () => {
  assert.ok(registry.length > 0, 'Japanese Play Points article registry is empty');
  assert.ok(articles.length > 0, 'published Play Points article corpus is empty');

  for (const file of articles) {
    const html = read(file);
    const tags = openingTags(html);
    const canonical = tags.filter(node => node.tag === 'link' && (node.attrs.rel || '').split(/\s+/).includes('canonical'));
    assert.equal(canonical.length, 1, file + ': canonical count');
    assert.equal(canonical[0].attrs.href, 'https://playpoint-sim.com/' + file.replace(/\/index\.html$/, '/'), file + ': canonical');
    assert.equal(tags.filter(node => node.tag === 'h1').length, 1, file + ': h1 count');
    assert.ok(tags.some(node => node.tag === 'a' && node.attrs.href && (node.attrs.rel || '').split(/\s+/).includes('author')), file + ': author link');
    assert.doesNotMatch(visibleText(html), /placeholder|lorem ipsum|\bTBD\b|\bTODO\b/i, `${file}: placeholder copy remains`);

    const description = tags.find(node => node.tag === 'meta' && node.attrs.name === 'description')?.attrs.content || '';
    const descriptionText = visibleText(description);
    assert.ok(descriptionText.length > 0, `${file}: meta description is missing`);
    assert.doesNotMatch(descriptionText, /placeholder|lorem ipsum|\bTBD\b|\bTODO\b|\{[^}]+\}/i, `${file}: meta description contains placeholder text`);

    const body = articleBody(html, file);
    const bodyText = visibleText(body);
    assert.ok(bodyText.length > 0, `${file}: article body is empty`);
    assert.ok(openingTags(body).filter(node => node.tag === 'p').length >= 1, `${file}: explanatory paragraph is missing`);
    assert.ok(tags.some(node => {
      if (node.tag !== 'a' || !node.attrs.href) return false;
      try { const url = new URL(node.attrs.href); return url.protocol === 'https:' && ((url.hostname === 'support.google.com' && url.pathname.startsWith('/googleplay/')) || (url.hostname === 'play.google.com' && url.pathname === '/store/apps/editorial')); } catch { return false; }
    }), file + ': actual Google source anchor');
    assert.ok(tags.some(node => classes(node).includes('related-links-section') || (node.tag === 'nav' && classes(node).includes('article-nav'))), file + ': related navigation');

    const paragraphs = [...body.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
      .map(match => visibleText(match[1]))
      .filter(text => text.length >= 30);
    for (let index = 1; index < paragraphs.length; index += 1) {
      assert.notEqual(paragraphs[index], paragraphs[index - 1], `${file}: duplicated consecutive paragraph`);
    }

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
    const html = read(file), alternates = links(html);
    if (!alternates.length) continue;
    const lang = openingTags(html).find(node => node.tag === 'html')?.attrs.lang;
    const own = 'https://playpoint-sim.com/' + fileToSitePath(file);
    assert.ok(alternates.some(node => node.attrs.hreflang === lang && node.attrs.href === own), file + ': own language reference');
    assert.equal(new Set(alternates.map(node => node.attrs.hreflang)).size, alternates.length, file + ': duplicate language');
    assert.ok(alternates.some(node => node.attrs.hreflang === 'x-default'), file + ': x-default');
    for (const { attrs } of alternates) {
      assert.notEqual(attrs.hreflang, 'zh-Hant', file + ': use zh-TW');
      const url = new URL(attrs.href); assert.equal(url.origin, 'https://playpoint-sim.com', file + ': alternate origin');
      const targetFile = sitePathToFile(url.pathname); assert.ok(articleSet.has(targetFile), file + ': alternate registered article');
      const target = read(targetFile);
      if (attrs.hreflang === 'x-default') continue;
      assert.equal(openingTags(target).find(node => node.tag === 'html')?.attrs.lang, attrs.hreflang, file + ': alternate language');
      assert.ok(links(target).some(node => node.attrs.hreflang === lang && node.attrs.href === own), file + ': reciprocal alternate');
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
    assertOfficialAnswers(html, file, ['3422734', '9077192']);
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