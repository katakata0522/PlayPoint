'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { INTERNATIONAL_LOCALES } = require('./locale-ids.cjs');
const PICKS = Object.freeze({
  ja: ['注目', '/articles/2026-10-10-google-play-fest-2026.html', 'Playフェス開催中！限定交換品と書籍15倍をチェック', '10/19まで', '2026-10-20T00:00:00+09:00'],
  en: ['Featured', '/en/articles/2026-10-12-google-play-fest-2026.html', 'Play Fest is live! US rewards, boosts and key dates', 'Through Oct 19', '2026-10-20T00:00:00-07:00'],
  ko: ['주목', '/ko/articles/2026-10-12-google-play-fest-2026.html', 'Play 페스타 시작! 교환 상품·해피 아워', '10/19까지', '2026-10-20T00:00:00+09:00'],
  tw: ['焦點', '/tw/articles/2026-10-12-google-play-fest-2026.html', 'Play 盛典開跑！聯賽、任務與每日點數優惠', '至 10/19', '2026-10-20T00:00:00+08:00']
});
function renderSpotlight(locale) {
  const [label, href, title, until, expires] = PICKS[locale];
  return `<!-- reader-spotlight:start --><aside class="reader-spotlight" data-reader-spotlight data-expires="${expires}" hidden><span class="reader-spotlight-label">${label}</span><a href="${href}">${title}</a><span class="reader-spotlight-until">${until}</span></aside><!-- reader-spotlight:end -->`;
}
function syncReaderSpotlights(root) {
  for (const locale of ['ja', ...INTERNATIONAL_LOCALES]) {
    const file = path.join(root, locale === 'ja' ? 'blog/index.html' : locale + '/articles/index.html');
    let html = fs.readFileSync(file, 'utf8').replace(/<!-- reader-spotlight:start -->[\s\S]*?<!-- reader-spotlight:end -->\s*/g, '');
    const anchor = locale === 'ja' ? '<div class="hub-result-toolbar">' : '<section class="intl-hub-browser"';
    if (!html.includes(anchor)) throw Error('注目記事の表示先がありません: ' + file);
    html = html.replace(anchor, renderSpotlight(locale) + '\n' + anchor);
    fs.writeFileSync(file, html);
  }
}
module.exports = { PICKS, renderSpotlight, syncReaderSpotlights };
