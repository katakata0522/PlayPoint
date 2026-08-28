'use strict';

const path = require('node:path');

const CATEGORY_KEYS = Object.freeze(['account', 'earn', 'levels', 'troubleshooting']);

const CATEGORY_LABELS = Object.freeze({
  en: Object.freeze({
    account: 'Account & basics',
    earn: 'Earning & spending',
    levels: 'Levels & rewards',
    troubleshooting: 'Troubleshooting'
  }),
  ko: Object.freeze({
    account: '계정·기본',
    earn: '적립·사용',
    levels: '등급·리워드',
    troubleshooting: '문제 해결'
  }),
  tw: Object.freeze({
    account: '帳號與基本',
    earn: '積點與使用',
    levels: '等級與回饋',
    troubleshooting: '問題排查'
  })
});

const START_HERE_SLUGS = Object.freeze([
  'google-play-points-not-showing',
  'google-play-points-levels',
  'google-play-points-100-value',
  'google-play-points-country-change',
  'google-play-points-use-coupons'
]);

const CATEGORY_OVERRIDES = Object.freeze({
  'google-play-balance-combine-payment': 'earn',
  'google-play-games-vs-play-points': 'account',
  'google-play-points-use-coupons': 'earn',
  'google-play-quests': 'earn',
  'google-play-points-device-change': 'account',
  'google-play-points-refund': 'earn',
  'google-play-points-expiration': 'account',
  'google-play-points-cash-conversion': 'earn',
  'google-play-points-coupon-not-applied': 'troubleshooting',
  'google-play-points-promotion-not-applied': 'troubleshooting',
  'google-play-points-play-credit-not-working': 'troubleshooting',
  'google-play-points-not-showing': 'troubleshooting'
});

function normalizeGuideSlug(value) {
  return path.posix.basename(String(value || '').split(/[?#]/, 1)[0], '.html')
    .replace(/^\d{4}-\d{2}-\d{2}-/, '')
    .toLowerCase();
}

function getIntlGuideCategory(value) {
  const slug = normalizeGuideSlug(value);
  if (CATEGORY_OVERRIDES[slug]) return CATEGORY_OVERRIDES[slug];

  if (/(?:not-showing|not-applied|not-working|locked|missing|cannot|error|problem)/.test(slug)) {
    return 'troubleshooting';
  }
  if (/(?:level|levels|silver|gold|platinum|diamond|weekly-reward|super-weekly|maintenance|rank|status)/.test(slug)) {
    return 'levels';
  }
  if (/(?:account|device|country|family|join|eligibility|balance|history|expiration|region)/.test(slug)) {
    return 'account';
  }
  return 'earn';
}

function getCategoryLabels(localeKey) {
  return CATEGORY_LABELS[localeKey] || CATEGORY_LABELS.en;
}

function getStartHereHrefs(localeKey) {
  return START_HERE_SLUGS.map(slug => `/${localeKey}/articles/${slug}.html`);
}

module.exports = {
  CATEGORY_KEYS,
  CATEGORY_LABELS,
  START_HERE_SLUGS,
  getCategoryLabels,
  getIntlGuideCategory,
  getStartHereHrefs,
  normalizeGuideSlug
};
