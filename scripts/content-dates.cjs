'use strict';

// Content dates only change when the corresponding page receives a meaningful
// editorial update. Build timestamps and asset cache versions are kept separate.
const TOP_PAGE_CONTENT_DATES = Object.freeze({
  ja: '2026-08-12',
  en: '2026-08-12',
  ko: '2026-07-26',
  tw: '2026-08-12'
});

const GENERATED_INTL_PAGE_CONTENT_DATE = '2026-08-12';

const CONTENT_DATE_OVERRIDES = Object.freeze({
  'about-playpoints.html': '2026-08-12',
  'info.html': '2026-07-26',
  'changelog.html': '2026-08-12',
  'attention.html': '2026-08-04',
  'privacy.html': '2026-08-12',
  'terms.html': '2026-08-12',
  'sitemap.html': '2026-08-12',
  'embed.html': '2026-07-27',
  'latest/index.html': '2026-08-11',
  'status/diamond/index.html': '2026-08-12',
  'status/platinum/index.html': '2026-08-12',
  'status/gold/index.html': '2026-08-12',
  'status/silver/index.html': '2026-08-12',
  'maintenance/platinum/index.html': '2026-08-12',
  'maintenance/diamond/index.html': '2026-08-12',
  'campaign/2x/index.html': '2026-08-12',
  'campaign/3x/index.html': '2026-08-12',
  'campaign/wait/index.html': '2026-08-12',
  'amount/10000/index.html': '2026-08-12',
  'compare/earning-rates/index.html': '2026-07-30',
  'games/index.html': '2026-08-16',
  'games/genshin/index.html': '2026-08-16',
  'games/starrail/index.html': '2026-08-16',
  'games/zzz/index.html': '2026-08-16',
  'games/bluearchive/index.html': '2026-08-16',
  'games/pokepoke/index.html': '2026-08-16',
  'games/fgo/index.html': '2026-08-16',
  'games/umamusume/index.html': '2026-08-16',
  'games/monst/index.html': '2026-08-16',
  'games/gakumas/index.html': '2026-08-16',
  'games/proseka/index.html': '2026-08-16',
  'en/games/index.html': '2026-08-16',
  'en/games/genshin/index.html': '2026-08-16',
  'en/games/starrail/index.html': '2026-08-16',
  'en/games/zzz/index.html': '2026-08-16',
  'en/games/bluearchive/index.html': '2026-08-16',
  'en/games/pokepoke/index.html': '2026-08-16',
  'en/games/fgo/index.html': '2026-08-16',
  'en/games/umamusume/index.html': '2026-08-16',
  'en/games/monst/index.html': '2026-08-16',
  'en/games/gakumas/index.html': '2026-08-16',
  'en/games/proseka/index.html': '2026-08-16',
  'ko/games/index.html': '2026-08-16',
  'ko/games/genshin/index.html': '2026-08-16',
  'ko/games/starrail/index.html': '2026-08-16',
  'ko/games/zzz/index.html': '2026-08-16',
  'ko/games/bluearchive/index.html': '2026-08-16',
  'ko/games/pokepoke/index.html': '2026-08-16',
  'ko/games/fgo/index.html': '2026-08-16',
  'ko/games/umamusume/index.html': '2026-08-16',
  'ko/games/monst/index.html': '2026-08-16',
  'ko/games/gakumas/index.html': '2026-08-16',
  'ko/games/proseka/index.html': '2026-08-16',
  'tw/games/index.html': '2026-08-16',
  'tw/games/genshin/index.html': '2026-08-16',
  'tw/games/starrail/index.html': '2026-08-16',
  'tw/games/zzz/index.html': '2026-08-16',
  'tw/games/bluearchive/index.html': '2026-08-16',
  'tw/games/pokepoke/index.html': '2026-08-16',
  'tw/games/fgo/index.html': '2026-08-16',
  'tw/games/umamusume/index.html': '2026-08-16',
  'tw/games/monst/index.html': '2026-08-16',
  'tw/games/gakumas/index.html': '2026-08-16',
  'tw/games/proseka/index.html': '2026-08-16',
  'en/articles/2026-06-20-discount-gift-cards.html': '2026-08-05',
  'ko/articles/2026-06-20-discount-gift-cards.html': '2026-08-05',
  'tw/articles/2026-06-20-discount-gift-cards.html': '2026-08-05'
});

module.exports = {
  CONTENT_DATE_OVERRIDES,
  GENERATED_INTL_PAGE_CONTENT_DATE,
  TOP_PAGE_CONTENT_DATES
};
