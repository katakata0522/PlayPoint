'use strict';
const { openingTags, parseAttributes } = require('./markup-contract.cjs');

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const SITE = 'https://playpoint-sim.com';

const LOCALES_3 = Object.freeze([
  { dir: 'en', lang: 'en', siteName: 'Google Play Points Calculator' },
  { dir: 'ko', lang: 'ko', siteName: 'Google Play Points 계산기' },
  { dir: 'tw', lang: 'zh-TW', siteName: 'Google Play Points 計算器' }
]);

const LOCALES_4 = Object.freeze([
  { key: 'ja', dir: '', lang: 'ja', siteName: 'Google Play Points 計算機' },
  { key: 'en', dir: 'en', lang: 'en', siteName: 'Google Play Points Calculator' },
  { key: 'ko', dir: 'ko', lang: 'ko', siteName: 'Google Play Points 계산기' },
  { key: 'tw', dir: 'tw', lang: 'zh-TW', siteName: 'Google Play Points 計算器' }
]);

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function withoutComments(html) {
  return html.replace(/<!--[\s\S]*?(?:-->|$)/g, '');
}

function staticMarkup(html) {
  return withoutComments(html).replace(/<(script|style)\b[^>]*>[\s\S]*?(?:<\/\1(?=[\s/>])[^>]*>|$)/gi, '');
}

function schemas(html) {
  const result = [];
  for (const match of withoutComments(html).matchAll(/<script\b((?:"[^"]*"|'[^']*'|[^'">])*)>([\s\S]*?)<\/script(?=[\s/>])[^>]*>/gi)) {
    if (parseAttributes('script ' + match[1]).type?.toLowerCase() === 'application/ld+json') result.push(JSON.parse(match[2]));
  }
  return result;
}

function assertBasicSeo(html, relativePath, { lang, siteName, requireFaq = true } = {}) {
  const tags = openingTags(html);
  const title = staticMarkup(html).match(/<title\b[^>]*>([^<]+)<\/title\s*>/i)?.[1] || '';
  const description = tags.find(node => node.tag === 'meta' && node.attrs.name === 'description')?.attrs.content || '';
  const canonical = `${SITE}/${relativePath}`;
  const jsonLd = schemas(html);

  assert.strictEqual(tags.find(node => node.tag === 'html')?.attrs.lang, lang, `${relativePath}: lang`);
  assert.ok(tags.some(node => node.tag === 'link' && (node.attrs.rel || '').split(/\s+/).includes('canonical') && node.attrs.href === canonical), `${relativePath}: canonical`);
  assert.ok(title.trim(), `${relativePath}: title`);
  assert.ok(description.trim(), `${relativePath}: description`);
  assert.equal(tags.filter(node => node.tag === 'h1').length, 1, `${relativePath}: h1`);
  if (siteName) {
    assert.ok(tags.some(node => node.tag === 'meta' && node.attrs.property === 'og:site_name' && node.attrs.content === siteName), `${relativePath}: siteName`);
  }
  assert.ok(jsonLd.some((schema) => schema['@type'] === 'Article'), `${relativePath}: Article`);
  if (requireFaq) {
    assert.ok(jsonLd.some((schema) => schema['@type'] === 'FAQPage'), `${relativePath}: FAQPage`);
  }
  const anchors = tags.filter(node => node.tag === 'a');
  assert.ok(anchors.some(node => (node.attrs.class || '').split(/\s+/).includes('cta-btn') && node.attrs.href), `${relativePath}: CTA`);
  assert.ok(!anchors.some(node => (node.attrs.href || '').includes('utm_medium=internal')), `${relativePath}: internal UTM`);
  assert.ok(anchors.some(node => (node.attrs.href || '').endsWith('/author/katakata.html')), `${relativePath}: author`);
}

function assertHreflang(html, relativePath, expected = ['ja', 'en', 'ko', 'zh-TW', 'x-default']) {
  const tags = openingTags(html);
  for (const code of expected) {
    assert.ok(tags.some(node => node.tag === 'link' && (node.attrs.rel || '').split(/\s+/).includes('alternate') && node.attrs.hreflang === code && node.attrs.href), `${relativePath}: hreflang ${code}`);
  }
}

function assertOfficialAnswers(html, relativePath, officialIds = []) {
  const links = openingTags(html).filter(node => node.tag === 'a').map(node => node.attrs.href).filter(Boolean);
  for (const id of officialIds) {
    assert.ok(links.some(href => {
      try { const url = new URL(href, SITE); return url.protocol === 'https:' && url.hostname === 'support.google.com' && url.pathname === `/googleplay/answer/${id}`; }
      catch { return false; }
    }), `${relativePath}: official ${id}`);
  }
}

function assertPhrases(html, relativePath, phrases = []) {
  // 本文の語句を確認する。CSSによる可視性と内容の意味はブラウザ／記事精査が担当する。
  const text = staticMarkup(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  for (const phrase of phrases) {
    assert.ok(text.includes(phrase), `${relativePath}: phrase ${phrase}`);
  }
}

function assertLocalAnchorsExist(html, relativePath) {
  const hrefs = openingTags(html).filter(node => node.tag === 'a').map(node => node.attrs.href)
    .filter(href => href?.startsWith('/') && !href.startsWith('//')).map(href => new URL(href, SITE).pathname);
  for (const href of hrefs) {
    let target = href.replace(/^\//, '');
    if (!target || target.endsWith('/')) target += 'index.html';
    assert.ok(exists(target), `${relativePath}: broken local link ${href}`);
  }
}

function assertSitemapListed(sitemapRelativePath, urls, robotsEntry) {
  const sitemap = read(sitemapRelativePath);
  const robots = read('robots.txt');
  if (robotsEntry) {
    assert.ok(robots.includes(robotsEntry), `robots missing ${robotsEntry}`);
  }
  for (const url of urls) {
    assert.ok(sitemap.includes(`<loc>${url}</loc>`), `sitemap missing ${url}`);
  }
  return sitemap;
}

module.exports = {
  SITE,
  LOCALES_3,
  LOCALES_4,
  root,
  read,
  exists,
  schemas,
  assertBasicSeo,
  assertHreflang,
  assertOfficialAnswers,
  assertPhrases,
  assertLocalAnchorsExist,
  assertSitemapListed
};
