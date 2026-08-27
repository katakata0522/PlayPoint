'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SITE_ORIGIN = 'https://playpoint-sim.com';
const INTL_LOCALES = Object.freeze([
  ['en', 'en'],
  ['ko', 'ko'],
  ['tw', 'zh-TW']
]);
const ARTICLE_JA_ALTERNATES = Object.freeze({
  'index.html': '/blog/',
  'google-play-games-vs-play-points.html': '/articles/2025-12-25-play-games.html',
  'google-play-points-apps-books-purchases.html': '/articles/2025-12-25-movies-books.html',
  'google-play-points-balance-history-progress.html': '/articles/2025-12-25-check-balance.html',
  'google-play-points-device-change.html': '/articles/2026-08-03-play-points-device-change.html',
  'google-play-points-earn-free.html': '/articles/2026-07-24-earn-play-points-free.html'
});

function getJapaneseAlternateForSlug(slug) {
  return ARTICLE_JA_ALTERNATES[slug] || null;
}
function sitePathToFile(rootDir, sitePath) {
  const relative = sitePath.replace(/^\//, '');
  return path.join(rootDir, relative.endsWith('/') ? relative + 'index.html' : relative);
}
function intlUrl(locale, slug) {
  return slug === 'index.html'
    ? SITE_ORIGIN + '/' + locale + '/articles/'
    : SITE_ORIGIN + '/' + locale + '/articles/' + slug;
}
function upsertIntlJa(html, jaPath) {
  const tag = '    <link rel="alternate" hreflang="ja" href="' + SITE_ORIGIN + jaPath + '">';
  let next = html.replace(/^[\t ]*<link rel="alternate" hreflang="ja"[^>]*>[\t ]*\r?\n?/gm, '');
  const anchor = /(^[\t ]*<link rel="alternate" hreflang="en"[^>]*>)/m;
  if (!anchor.test(next)) throw new Error('International article is missing en hreflang anchor.');
  return next.replace(anchor, tag + '\n$1');
}
function upsertJapaneseIntlSet(html, slug, jaPath) {
  let next = html.replace(/^[\t ]*<link rel="alternate" hreflang="(?:ja|en|ko|zh-TW|x-default)"[^>]*>[\t ]*\r?\n?/gm, '');
  const tags = [
    '    <link rel="alternate" hreflang="ja" href="' + SITE_ORIGIN + jaPath + '">',
    '    <link rel="alternate" hreflang="en" href="' + intlUrl('en', slug) + '">',
    '    <link rel="alternate" hreflang="ko" href="' + intlUrl('ko', slug) + '">',
    '    <link rel="alternate" hreflang="zh-TW" href="' + intlUrl('tw', slug) + '">',
    '    <link rel="alternate" hreflang="x-default" href="' + intlUrl('en', slug) + '">'
  ].join('\n');
  const canonical = /(^[\t ]*<link rel="canonical"[^>]*>)/m;
  if (!canonical.test(next)) throw new Error('Japanese counterpart is missing canonical link.');
  return next.replace(canonical, '$1\n' + tags);
}
function writeIfChanged(file, content) {
  const current = fs.readFileSync(file, 'utf8');
  if (current === content) return false;
  fs.writeFileSync(file, content, 'utf8');
  return true;
}
function syncIntlArticleJapaneseHreflang(rootDir) {
  let checked = 0;
  let changed = 0;
  for (const [slug, jaPath] of Object.entries(ARTICLE_JA_ALTERNATES)) {
    const jaFile = sitePathToFile(rootDir, jaPath);
    if (!fs.existsSync(jaFile)) throw new Error('Japanese hreflang target is missing: ' + jaPath);
    for (const [locale] of INTL_LOCALES) {
      const intlFile = path.join(rootDir, locale, 'articles', slug);
      if (!fs.existsSync(intlFile)) throw new Error('International hreflang source is missing: ' + path.relative(rootDir, intlFile));
      checked += 1;
      const current = fs.readFileSync(intlFile, 'utf8');
      if (writeIfChanged(intlFile, upsertIntlJa(current, jaPath))) changed += 1;
    }
    checked += 1;
    const jaCurrent = fs.readFileSync(jaFile, 'utf8');
    if (writeIfChanged(jaFile, upsertJapaneseIntlSet(jaCurrent, slug, jaPath))) changed += 1;
  }
  return { checked, changed };
}

module.exports = {
  ARTICLE_JA_ALTERNATES,
  INTL_LOCALES,
  SITE_ORIGIN,
  getJapaneseAlternateForSlug,
  intlUrl,
  syncIntlArticleJapaneseHreflang
};
