'use strict';

// 正常な実測データを検証して更新する。更新元は update-popular-guides.cjs。
const snapshot = require('./intl-popular-guides.snapshot.json');
const POPULAR_GUIDES_SNAPSHOT = snapshot.snapshot;
const POPULAR_GUIDES_WINDOW_START = snapshot.start;
const POPULAR_GUIDES_WINDOW_END = snapshot.end;

const INTL_POPULAR_GUIDES = Object.freeze(snapshot.guides);

function normalizePath(value) {
  const normalized = String(value || '').replaceAll('\\', '/').replace(/^https:\/\/playpoint-sim\.com/i, '');
  return normalized.startsWith('/') ? normalized : '/' + normalized;
}

function getPopularGuides(localeKey, currentPath = '', limit = 5) {
  const current = normalizePath(currentPath);
  return (INTL_POPULAR_GUIDES[localeKey] || [])
    .slice(0, limit)
    .map(([href, label], index) => ({
      href,
      label,
      rank: index + 1,
      isCurrent: normalizePath(href) === current
    }));
}

module.exports = {
  INTL_POPULAR_GUIDES,
  POPULAR_GUIDES_SNAPSHOT,
  POPULAR_GUIDES_WINDOW_START,
  POPULAR_GUIDES_WINDOW_END,
  getPopularGuides
};
