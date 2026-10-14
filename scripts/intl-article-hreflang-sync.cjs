'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { getLocalizedGameGuideJapaneseAlternates } = require('./intl-game-guide-expansion.cjs');

const SITE_ORIGIN = 'https://playpoint-sim.com';
const INTL_LOCALES = Object.freeze([
  ['en', 'en'],
  ['ko', 'ko'],
  ['tw', 'zh-TW']
]);
const ARTICLE_JA_ALTERNATES = Object.freeze({
  ...getLocalizedGameGuideJapaneseAlternates(),
  ...Object.fromEntries(require('./intl-topic-expansion-content.cjs').TOPICS.map(topic => [topic.slug + '.html', topic.jaAlternate])),
  'google-play-points-500-1000-cost.html': '/articles/2026-07-24-play-points-500-1000-value.html',
  'google-play-points-discounts-promo-codes.html': '/articles/2025-12-25-promo-code.html',
  'index.html': '/blog/',
  '2026-10-12-google-play-fest-2026.html': '/articles/2026-10-10-google-play-fest-2026.html',
  '2026-10-12-play-pass-double-points-6x.html': '/articles/2026-10-10-play-pass-double-points-6x.html',
  'google-play-games-vs-play-points.html': '/articles/2025-12-25-play-games.html',
  'google-play-points-apps-books-purchases.html': '/articles/2025-12-25-movies-books.html',
  'google-play-points-balance-history-progress.html': '/articles/2025-12-25-check-balance.html',
  'google-play-points-device-change.html': '/articles/2026-08-03-play-points-device-change.html',
  'google-play-points-earn-free.html': '/articles/2026-07-24-earn-play-points-free.html'
});
const ARTICLE_JA_PARTIAL_ALTERNATES = Object.freeze({
  'google-play-pass-guide.html': { jaPath: '/articles/2026-08-16-play-pass-worth-it.html', locales: ['en'] },
  'google-play-points-account-locked.html': { jaPath: '/articles/2026-08-19-play-points-locked.html', locales: ['en'] },
  'google-play-points-install-offer-not-received.html': { jaPath: '/articles/2026-08-19-install-offer-points-not-received.html', locales: ['en'] }
});

function getJapaneseAlternateForSlug(slug) {
  return ARTICLE_JA_ALTERNATES[slug] || ARTICLE_JA_PARTIAL_ALTERNATES[slug]?.jaPath || null;
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
  let next = html.replace(/^[\t ]*<link\b[^>]*\brel=["']alternate["'][^>]*\bhreflang=["']ja["'][^>]*>[\t ]*\r?\n?/gim, '');
  const anchor = /(^[\t ]*<link\b[^>]*\brel=["']alternate["'][^>]*\bhreflang=["']en["'][^>]*>)/im;
  if (!anchor.test(next)) throw new Error('International article is missing en hreflang anchor.');
  return next.replace(anchor, tag + '\n$1');
}
function upsertJapaneseIntlSet(html, slug, jaPath, locales = INTL_LOCALES) {
  let next = html.replace(/^[\t ]*<link\b[^>]*\brel=["']alternate["'][^>]*\bhreflang=["'](?:ja|en|ko|zh-TW|x-default)["'][^>]*>[\t ]*\r?\n?/gim, '');
  const tags = [
    '    <link rel="alternate" hreflang="ja" href="' + SITE_ORIGIN + jaPath + '">',
    ...locales.map(([locale, lang]) => '    <link rel="alternate" hreflang="' + lang + '" href="' + intlUrl(locale, slug) + '">'),
    '    <link rel="alternate" hreflang="x-default" href="' + intlUrl(locales[0][0], slug) + '">'
  ].join('\n');
  const canonical = /<link\b[^>]*\brel=["']canonical["'][^>]*>/i;
  const match = next.match(canonical);
  if (!match) throw new Error('Japanese counterpart is missing canonical link: ' + jaPath);
  return next.replace(canonical, match[0] + '\n' + tags);
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
  const groups = [
    ...Object.entries(ARTICLE_JA_ALTERNATES).map(([slug, jaPath]) => [slug, jaPath, INTL_LOCALES]),
    ...Object.entries(ARTICLE_JA_PARTIAL_ALTERNATES).map(([slug, config]) => [slug, config.jaPath, INTL_LOCALES.filter(([locale]) => config.locales.includes(locale))])
  ];
  for (const [slug, jaPath, locales] of groups) {
    const jaFile = sitePathToFile(rootDir, jaPath);
    if (!fs.existsSync(jaFile)) throw new Error('Japanese hreflang target is missing: ' + jaPath);
    for (const [locale] of locales) {
      const intlFile = path.join(rootDir, locale, 'articles', slug);
      if (!fs.existsSync(intlFile)) throw new Error('International hreflang source is missing: ' + path.relative(rootDir, intlFile));
      checked += 1;
      const current = fs.readFileSync(intlFile, 'utf8');
      if (writeIfChanged(intlFile, upsertIntlJa(current, jaPath))) changed += 1;
    }
    checked += 1;
    const jaCurrent = fs.readFileSync(jaFile, 'utf8');
    if (writeIfChanged(jaFile, upsertJapaneseIntlSet(jaCurrent, slug, jaPath, locales))) changed += 1;
  }
  return { checked, changed };
}

module.exports = {
  ARTICLE_JA_ALTERNATES,
  ARTICLE_JA_PARTIAL_ALTERNATES,
  INTL_LOCALES,
  SITE_ORIGIN,
  getJapaneseAlternateForSlug,
  intlUrl,
  syncIntlArticleJapaneseHreflang,
  upsertJapaneseIntlSet
};
