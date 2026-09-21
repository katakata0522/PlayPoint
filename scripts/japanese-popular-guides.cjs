'use strict';

// 順位だけを保存する。更新手順は docs/JAPANESE_NAVIGATION_SIDEBAR.md を参照。
const snapshot = require('./japanese-popular-guides.snapshot.json');
const POPULAR_GUIDES_SNAPSHOT = snapshot.snapshot;
const POPULAR_GUIDES_WINDOW = '直近30日';
const JAPANESE_POPULAR_GUIDES = Object.freeze(snapshot.guides.map(item => Object.freeze([...item])));

function normalizePath(value) {
  const normalized = String(value || '').replaceAll('\\', '/').replace(/^https:\/\/playpoint-sim\.com/i, '');
  return normalized.startsWith('/') ? normalized : '/' + normalized;
}

function getJapanesePopularGuides(currentPath = '', limit = 5) {
  const current = normalizePath(currentPath);
  return JAPANESE_POPULAR_GUIDES.slice(0, limit).map(([href, label], index) => ({
    href,
    label,
    rank: index + 1,
    isCurrent: normalizePath(href) === current
  }));
}

module.exports = { JAPANESE_POPULAR_GUIDES, POPULAR_GUIDES_SNAPSHOT, POPULAR_GUIDES_WINDOW, getJapanesePopularGuides };
