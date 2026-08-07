'use strict';

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

function schemas(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((match) => JSON.parse(match[1]));
}

function assertBasicSeo(html, relativePath, { lang, siteName, requireFaq = true, minHtml = 0 } = {}) {
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1] || '';
  const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1] || '';
  const canonical = `${SITE}/${relativePath}`;
  const jsonLd = schemas(html);

  assert.ok(html.includes(`<html lang="${lang}">`), `${relativePath}: lang`);
  assert.ok(html.includes(`<link rel="canonical" href="${canonical}">`), `${relativePath}: canonical`);
  assert.ok(title.length >= 20 && title.length <= 65, `${relativePath}: title len ${title.length}`);
  assert.ok(description.length >= 45 && description.length <= 170, `${relativePath}: description len ${description.length}`);
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${relativePath}: h1`);
  if (siteName) {
    assert.ok(html.includes(`<meta property="og:site_name" content="${siteName}">`), `${relativePath}: siteName`);
  }
  assert.ok(jsonLd.some((schema) => schema['@type'] === 'Article'), `${relativePath}: Article`);
  if (requireFaq) {
    assert.ok(jsonLd.some((schema) => schema['@type'] === 'FAQPage'), `${relativePath}: FAQPage`);
  }
  assert.ok(html.includes('class="cta-btn"') || html.includes("class='cta-btn'"), `${relativePath}: CTA`);
  assert.ok(!html.includes('utm_medium=internal'), `${relativePath}: internal UTM`);
  assert.ok(html.includes('/author/katakata.html'), `${relativePath}: author`);
  if (minHtml > 0) {
    assert.ok(html.length >= minHtml, `${relativePath}: thin content ${html.length}`);
  }
}

function assertHreflang(html, relativePath, expected = ['ja', 'en', 'ko', 'zh-TW', 'x-default']) {
  for (const code of expected) {
    assert.ok(html.includes(`hreflang="${code}"`), `${relativePath}: hreflang ${code}`);
  }
}

function assertOfficialAnswers(html, relativePath, officialIds = []) {
  for (const id of officialIds) {
    assert.ok(
      html.includes(`support.google.com/googleplay/answer/${id}`),
      `${relativePath}: official ${id}`
    );
  }
}

function assertPhrases(html, relativePath, phrases = []) {
  for (const phrase of phrases) {
    assert.ok(html.includes(phrase), `${relativePath}: phrase ${phrase}`);
  }
}

function assertLocalAnchorsExist(html, relativePath) {
  const hrefs = [...html.matchAll(/<a\b[^>]*href="(\/[^"#?]*)(?:[?#][^"]*)?"/g)].map((m) => m[1]);
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
