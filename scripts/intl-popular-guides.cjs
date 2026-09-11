'use strict';

/**
 * International popular-guide ordering.
 * Source snapshot: docs/INTL_CONTENT_AUDIT_2026-09-03.md
 * GA4 landing/page window: 2026-08-04 through 2026-09-02.
 *
 * This is deliberately an editorial SSOT rather than a fake real-time chart.
 * The UI shows rank/order but not session counts. Update the snapshot and
 * ordering together when the demand baseline is refreshed.
 */
const POPULAR_GUIDES_SNAPSHOT = '2026-09-02';

const INTL_POPULAR_GUIDES = Object.freeze({
  en: Object.freeze([
    Object.freeze(['/en/articles/google-play-quests.html', 'Google Play Quests']),
    Object.freeze(['/en/articles/google-play-points-cash-conversion.html', 'Can Play Points be converted to cash?']),
    Object.freeze(['/en/articles/google-play-points-country-differences.html', 'How Play Points rules differ by country']),
    Object.freeze(['/en/articles/google-play-points-not-showing.html', 'Points missing after a purchase']),
    Object.freeze(['/en/articles/google-play-points-levels.html', 'US Play Points levels'])
  ]),
  ko: Object.freeze([
    Object.freeze(['/ko/articles/google-play-points-cash-conversion.html', 'Play Points 현금화 가능 여부']),
    Object.freeze(['/ko/articles/google-play-points-expiration.html', 'Play Points 유효기간']),
    Object.freeze(['/ko/articles/google-play-points-super-weekly-reward.html', 'Super Weekly Reward']),
    Object.freeze(['/ko/articles/google-play-points-levels.html', '한국 Play Points 등급']),
    Object.freeze(['/ko/articles/google-play-points-use-coupons.html', '포인트·쿠폰 사용법'])
  ]),
  tw: Object.freeze([
    Object.freeze(['/tw/articles/google-play-points-coupon-not-applied.html', '優惠券沒有套用時']),
    Object.freeze(['/tw/articles/google-play-points-platinum-diamond-cost.html', '白金／鑽石需要多少消費']),
    Object.freeze(['/tw/articles/google-play-points-levels.html', '台灣 Play Points 等級']),
    Object.freeze(['/tw/articles/google-play-points-weekly-reward.html', '每週回饋']),
    Object.freeze(['/tw/articles/google-play-quests.html', 'Google Play Quests'])
  ])
});

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
  getPopularGuides
};