'use strict';

const path = require('node:path');
const {
  getGameContentDate,
  getGamePageHtmlFiles
} = require('./game-page-targets.cjs');
const { GAME_LOCALE_DIRECTORIES } = require('./locale-ids.cjs');
const { getLatestHubVerificationDate } = require('./latest-hub-audit.cjs');

// Content dates only change when the corresponding page receives a meaningful
// editorial update. Build timestamps and asset cache versions are kept separate.
const TOP_PAGE_CONTENT_DATES = Object.freeze({
  ja: '2026-08-12',
  en: '2026-08-12',
  ko: '2026-07-26',
  tw: '2026-08-12'
});

const rootDir = path.resolve(__dirname, '..');
const GENERATED_INTL_PAGE_CONTENT_DATE = '2026-08-18';
const GENERATED_GAME_PAGE_CONTENT_DATE = getGameContentDate(rootDir);
const LATEST_HUB_VERIFICATION_DATE = getLatestHubVerificationDate(rootDir);

function isGeneratedGamePagePath(file) {
  const normalized = String(file).replaceAll('\\', '/');

  return GAME_LOCALE_DIRECTORIES.some(localeDirectory => {
    const gamesPrefix = localeDirectory ? `${localeDirectory}/games/` : 'games/';
    if (!normalized.startsWith(gamesPrefix)) return false;

    const relativeGamePath = normalized.slice(gamesPrefix.length);
    return relativeGamePath === 'index.html' || /^[^/]+\/index\.html$/.test(relativeGamePath);
  });
}

const gameContentDateOverrides = Object.fromEntries(
  getGamePageHtmlFiles(rootDir).map(file => [file, GENERATED_GAME_PAGE_CONTENT_DATE])
);

const CONTENT_DATE_OVERRIDES = Object.freeze({
  'about-playpoints.html': '2026-08-12',
  'info.html': '2026-08-18',
  'changelog.html': '2026-08-12',
  'attention.html': '2026-08-04',
  'privacy.html': '2026-08-18',
  'terms.html': '2026-08-18',
  'sitemap.html': '2026-08-12',
  'embed.html': '2026-07-27',
  'latest/index.html': LATEST_HUB_VERIFICATION_DATE,
  'status/diamond/index.html': '2026-08-19',
  'status/platinum/index.html': '2026-08-21',
  'status/gold/index.html': '2026-08-12',
  'status/silver/index.html': '2026-08-12',
  'maintenance/platinum/index.html': '2026-08-12',
  'maintenance/diamond/index.html': '2026-08-12',
  'campaign/2x/index.html': '2026-08-18',
  'campaign/3x/index.html': '2026-08-18',
  'campaign/wait/index.html': '2026-08-12',
  'amount/10000/index.html': '2026-08-12',
  'compare/earning-rates/index.html': '2026-07-30',
  ...gameContentDateOverrides,
  'en/articles/2026-06-20-discount-gift-cards.html': '2026-08-05',
  'ko/articles/2026-06-20-discount-gift-cards.html': '2026-08-05',
  'tw/articles/2026-06-20-discount-gift-cards.html': '2026-08-05'
});

function getContentDateForFile(file) {
  if (isGeneratedGamePagePath(file)) {
    return GENERATED_GAME_PAGE_CONTENT_DATE;
  }
  return CONTENT_DATE_OVERRIDES[file];
}

module.exports = {
  CONTENT_DATE_OVERRIDES,
  GENERATED_GAME_PAGE_CONTENT_DATE,
  GENERATED_INTL_PAGE_CONTENT_DATE,
  LATEST_HUB_VERIFICATION_DATE,
  TOP_PAGE_CONTENT_DATES,
  getContentDateForFile,
  isGeneratedGamePagePath
};
