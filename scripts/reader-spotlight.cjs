'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { INTERNATIONAL_LOCALES } = require('./locale-ids.cjs');
const PICKS = Object.freeze({
  ja: ['今の特典', '/latest/', '特典・キャンペーンの対象と期限を確認する', '開催中・開始予定・終了を分けて掲載', null],
  en: ['Before you buy', '/en/articles/google-play-points-promotion-not-applied.html', 'Check whether your Play Points offer applies', 'Eligibility, activation and deadlines', null],
  ko: ['구매 전 확인', '/ko/articles/google-play-points-promotion-not-applied.html', '내 구매에 포인트 프로모션이 적용되는지 확인하기', '대상·활성화·기한 확인', null],
  tw: ['購買前確認', '/tw/articles/google-play-points-promotion-not-applied.html', '確認你的購買是否符合點數優惠條件', '適用資格、啟用方式與期限', null]
});
function renderSpotlight(locale) {
  const [label, href, title, until, expires] = PICKS[locale];
  const timing = expires ? ` data-expires="${expires}" hidden` : '';
  return `<!-- reader-spotlight:start --><aside class="reader-spotlight" data-reader-spotlight${timing}><span class="reader-spotlight-label">${label}</span><a href="${href}">${title}</a><span class="reader-spotlight-until">${until}</span></aside><!-- reader-spotlight:end -->`;
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
