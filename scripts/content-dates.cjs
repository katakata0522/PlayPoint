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
const GENERATED_INTL_PAGE_CONTENT_DATE_OVERRIDES = Object.freeze({
  'diamond:ko': '2026-08-21',
  'platinum:en': '2026-08-21',
  'platinum:ko': '2026-08-21',
  'platinum:tw': '2026-08-21',
  'gold:en': '2026-08-21',
  'gold:ko': '2026-08-21',
  'gold:tw': '2026-08-21',
  'campaignWait:en': '2026-08-21',
  'campaignWait:ko': '2026-08-21',
  'campaignWait:tw': '2026-08-21'
});

function getGeneratedIntlPageContentDate(pageKey, localeKey) {
  return GENERATED_INTL_PAGE_CONTENT_DATE_OVERRIDES[`${pageKey}:${localeKey}`] || GENERATED_INTL_PAGE_CONTENT_DATE;
}

const GENERATED_GAME_PAGE_CONTENT_DATE = getGameContentDate(rootDir);
const GAME_PAGE_CONTENT_DATE_OVERRIDES = Object.freeze({
  'games/arknights/index.html': '2026-08-25',
  'games/genshin/index.html': '2026-08-25',
  'games/honkai3rd/index.html': '2026-08-25',
  'games/nikke/index.html': '2026-08-25',
  'games/pad/index.html': '2026-08-25',
  'games/phantomparade/index.html': '2026-08-25',
  'games/wutheringwaves/index.html': '2026-08-25'
});
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

function getGeneratedGamePageContentDate(file) {
  const normalized = String(file).replaceAll('\\', '/');
  return GAME_PAGE_CONTENT_DATE_OVERRIDES[normalized] || GENERATED_GAME_PAGE_CONTENT_DATE;
}

const gameContentDateOverrides = Object.fromEntries(
  getGamePageHtmlFiles(rootDir).map(file => [file, getGeneratedGamePageContentDate(file)])
);

const CONTENT_DATE_OVERRIDES = Object.freeze({
  'about-playpoints.html': '2026-08-12',
  'info.html': '2026-08-18',
  'changelog.html': '2026-08-12',
  'attention.html': '2026-08-23',
  'privacy.html': '2026-09-02',
  'terms.html': '2026-08-18',
  'sitemap.html': '2026-08-12',
  'embed.html': '2026-07-27',
  'latest/index.html': LATEST_HUB_VERIFICATION_DATE,
  'status/diamond/index.html': '2026-08-21',
  'status/platinum/index.html': '2026-08-21',
  'status/gold/index.html': '2026-08-21',
  'status/silver/index.html': '2026-08-21',
  'maintenance/platinum/index.html': '2026-08-12',
  'maintenance/diamond/index.html': '2026-08-12',
  'campaign/2x/index.html': '2026-08-21',
  'campaign/3x/index.html': '2026-08-21',
  'campaign/wait/index.html': '2026-08-21',
  'amount/10000/index.html': '2026-08-25',
  'compare/earning-rates/index.html': '2026-07-30',
  ...gameContentDateOverrides,
  'en/articles/2026-06-20-discount-gift-cards.html': '2026-08-05',
  'ko/articles/2026-06-20-discount-gift-cards.html': '2026-08-05',
  'tw/articles/2026-06-20-discount-gift-cards.html': '2026-08-05'
});

function getContentDateForFile(file) {
  if (isGeneratedGamePagePath(file)) {
    return getGeneratedGamePageContentDate(file);
  }
  return CONTENT_DATE_OVERRIDES[file];
}

module.exports = {
  CONTENT_DATE_OVERRIDES,
  GENERATED_GAME_PAGE_CONTENT_DATE,
  GAME_PAGE_CONTENT_DATE_OVERRIDES,
  GENERATED_INTL_PAGE_CONTENT_DATE,
  GENERATED_INTL_PAGE_CONTENT_DATE_OVERRIDES,
  LATEST_HUB_VERIFICATION_DATE,
  TOP_PAGE_CONTENT_DATES,
  getContentDateForFile,
  getGeneratedGamePageContentDate,
  getGeneratedIntlPageContentDate,
  isGeneratedGamePagePath
};
