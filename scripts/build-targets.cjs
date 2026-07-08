'use strict';

const { getIntlSeoFiles } = require('./intl-seo-pages.cjs');

const generatedLocaleFiles = [
  'en/index.html',
  'ko/index.html',
  'tw/index.html'
];

const syncedHtmlFiles = [
  'about-playpoints.html',
  'info.html',
  'changelog.html',
  'attention.html',
  'privacy.html',
  'terms.html',
  'sitemap.html',
  'embed.html',
  'latest/index.html',
  'status/diamond/index.html',
  'status/platinum/index.html',
  'status/gold/index.html',
  'status/silver/index.html',
  'maintenance/platinum/index.html',
  'maintenance/diamond/index.html',
  'campaign/2x/index.html',
  'campaign/3x/index.html',
  'campaign/wait/index.html',
  'amount/10000/index.html',
  'en/articles/2026-06-20-discount-gift-cards.html',
  'ko/articles/2026-06-20-discount-gift-cards.html',
  'tw/articles/2026-06-20-discount-gift-cards.html'
];

const generatedFiles = [
  'index.html',
  ...generatedLocaleFiles,
  ...getIntlSeoFiles(),
  'en/articles/intl-article.css',
  'feed.xml',
  'atom.xml',
  'sw.js',
  'js/third-party.js',
  'kindle-tracker/index.html',
  'kindle-tracker/sw.js',
  ...syncedHtmlFiles,
  'sitemap.xml'
];

module.exports = {
  generatedFiles,
  generatedLocaleFiles,
  syncedHtmlFiles
};
