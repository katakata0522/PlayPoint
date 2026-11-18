'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { auditSeoHeads, ORIGIN } = require('../scripts/seo-head-audit.cjs');

const ROOT = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

test('full submitted SEO head, hreflang, OGP, JSON-LD, internal-link, and CLS image audit passes with zero errors and warnings', () => {
  const report = auditSeoHeads(ROOT);
  assert.ok(report.submittedUrlCount >= 450, `Expected at least 450 submitted URLs, got ${report.submittedUrlCount}`);
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.warnings, []);
});

test('international top pages declare exact x-default to /en/, localized lang, and og:locale:alternate sets', () => {
  for (const [file, expectedLang, expectedLocale] of [
    ['index.html', 'ja', 'ja_JP'],
    ['en/index.html', 'en', 'en_US'],
    ['ko/index.html', 'ko', 'ko_KR'],
    ['tw/index.html', 'zh-TW', 'zh_TW'],
    ['hk/index.html', 'zh-HK', 'zh_HK'],
    ['in/index.html', 'en-IN', 'en_IN']
  ]) {
    const html = read(file);
    assert.match(html, new RegExp(`<html\\b[^>]*lang="${expectedLang}"`, 'i'), file);
    assert.match(html, new RegExp(`<meta\\s+property="og:locale"\\s+content="${expectedLocale}"`, 'i'), file);
    assert.ok(html.includes(`<link rel="alternate" hreflang="x-default" href="${ORIGIN}/en/">`), `${file} x-default`);
    assert.ok(html.includes('<meta property="og:locale:alternate"'), `${file} og:locale:alternate`);
  }
});

test('Wave 5 game pages and attention.html contain zero Japanese metadata leaks and use zh-TW instead of zh-Hant', () => {
  const twEfootball = read('tw/games/efootball/index.html');
  assert.match(twEfootball, /^<!doctype html>\s*<html lang="zh-TW">/i);
  assert.ok(!/hreflang="zh-Hant"/i.test(twEfootball));
  assert.ok(!/"inLanguage":"zh-Hant"/i.test(twEfootball));
  assert.match(twEfootball, /<meta name="author" content="Katakata"\s*\/?>/i);
  assert.match(twEfootball, /<meta property="og:site_name" content="Google Play Points 計算器"\s*\/?>/i);
  assert.match(twEfootball, new RegExp(`<link rel="alternate" hreflang="x-default" href="${ORIGIN}/en/games/efootball/"\\s*/?>`));

  const attention = read('attention.html');
  assert.match(attention, /<html lang="en">/i);
  assert.ok(!/かたかた|利用上の注意点/.test(attention.split('</head>')[0]));
});

test('Gakuen Idolmaster Japanese and Taiwan articles maintain reciprocal hreflang alternates', () => {
  const ja = read('articles/2026-09-26-gakumas-webshop-google-play.html');
  const tw = read('tw/articles/gakuen-idolmaster-japan-google-play-vs-web-shop.html');
  const jaUrl = `${ORIGIN}/articles/2026-09-26-gakumas-webshop-google-play.html`;
  const twUrl = `${ORIGIN}/tw/articles/gakuen-idolmaster-japan-google-play-vs-web-shop.html`;

  assert.ok(ja.includes(`<link rel="alternate" hreflang="zh-TW" href="${twUrl}">`));
  assert.ok(tw.includes(`<link rel="alternate" hreflang="ja" href="${jaUrl}">`));
});

test('structural metadata, breadcrumbs, clean internal links, and sidebar image dimensions are present', () => {
  for (const file of [
    'points-cost/index.html',
    'blog/page/2/index.html',
    'latest/index.html',
    'author/katakata.html',
    'compare/earning-rates/index.html'
  ]) {
    const html = read(file);
    assert.ok(html.includes('max-image-preview:large'), `${file} robots`);
    assert.ok(html.includes('"@type":"BreadcrumbList"') || html.includes('"@type": "BreadcrumbList"'), `${file} BreadcrumbList`);
  }

  for (const file of ['blog/index.html', 'blog/page/2/index.html']) {
    const html = read(file);
    assert.ok(!/href="[^"]*index\.html"/i.test(html), `${file} contains index.html href`);
    assert.match(html, /class="sidebar-popular-thumb[^"]*"><img\b[^>]*\bwidth="\d+"\s+height="\d+"/i, `${file} sidebar img dimensions`);
  }
});
