'use strict';

/**
 * 日本語記事の「今月よく読まれている記事」。
 * Source: PlayPoint Analytics / 📄ページ別分析
 * Window: 2026-08-15 through 2026-09-13 (直近30日)
 * Refreshed: 2026-09-19
 *
 * PV数はUIに出さず、順位だけを週1回更新する。
 */
const POPULAR_GUIDES_SNAPSHOT = '2026-09-19';
const POPULAR_GUIDES_WINDOW = '直近30日';

const JAPANESE_POPULAR_GUIDES = Object.freeze([
  Object.freeze(['/articles/2026-07-31-google-play-quests.html', 'Google Playのクエストとは？']),
  Object.freeze(['/articles/2026-06-20-discount-gift-cards.html', 'Google Playギフトコードをお得に買う方法']),
  Object.freeze(['/articles/2026-07-31-super-weekly-reward.html', 'スーパーウィークリーリワードとは？']),
  Object.freeze(['/articles/2026-07-24-play-points-cash-conversion.html', 'Play Pointsは現金化・PayPay交換できる？']),
  Object.freeze(['/articles/2025-12-25-best-use.html', 'Play Pointsの交換先・使い道を比較'])
]);

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
