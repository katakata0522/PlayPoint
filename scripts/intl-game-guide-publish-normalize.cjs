'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  ALL_GUIDES,
  writeLocalizedGameGuides
} = require('./intl-game-guide-expansion.cjs');

const SITE_ORIGIN = 'https://playpoint-sim.com';
const ARTICLE_IMAGE = `${SITE_ORIGIN}/ogp.png`;

const ENGLISH_TERM_REPLACEMENTS = Object.freeze({
  'ウマスク (Umasuku)': 'Umasuku subscription',
  '公式WEBショップ': 'official Japan Web Shop',
  '廻珠': 'paid in-game currency (Japan service)',
  'マイルpt': 'Web Shop miles'
});

function normalizeArticleJsonLd(html) {
  return html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (full, raw) => {
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return full;
    }
    if (data?.['@type'] !== 'Article') return full;
    data.image = ARTICLE_IMAGE;
    return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
  });
}

function normalizeEnglishTerms(html) {
  let next = html;
  for (const [source, replacement] of Object.entries(ENGLISH_TERM_REPLACEMENTS)) {
    next = next.replaceAll(source, replacement);
  }
  return next;
}

function normalizeGeneratedGuideFile(file, locale) {
  const current = fs.readFileSync(file, 'utf8');
  let next = normalizeArticleJsonLd(current);
  if (locale === 'en') next = normalizeEnglishTerms(next);
  if (next === current) return false;
  fs.writeFileSync(file, next, 'utf8');
  return true;
}

function publishLocalizedGameGuides(rootDir) {
  const generated = writeLocalizedGameGuides(rootDir);
  let normalized = 0;
  for (const locale of ['en', 'ko', 'tw']) {
    for (const guide of ALL_GUIDES) {
      const file = path.join(rootDir, locale, 'articles', `${guide.slug}.html`);
      if (!fs.existsSync(file)) throw new Error(`Localized game guide is missing after generation: ${path.relative(rootDir, file)}`);
      if (normalizeGeneratedGuideFile(file, locale)) normalized += 1;
    }
  }
  return { ...generated, normalized };
}

module.exports = {
  ARTICLE_IMAGE,
  ENGLISH_TERM_REPLACEMENTS,
  normalizeArticleJsonLd,
  normalizeEnglishTerms,
  publishLocalizedGameGuides
};
