'use strict';

const { GAME_EVIDENCE } = require('./intl-game-evidence.cjs');
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const COPY = {
  en: { answer: 'What to choose', product: 'Start with the product', compare: 'Put your own budget into the comparison', points: 'Where Play Points fit', sources: 'Sources and regional references', detail: 'Publisher product information', edition: 'Official site for this game version', scope: 'Publication or edition reference; not an Android price quote', calculate: 'Compare products in the game calculator', price: 'Use the current Android checkout price for this comparison. A listing from another store can help identify the product, but its price may belong to a different platform or region.', budget: 'Start with the amount you already planned to spend. For each product, list what arrives now and what you can collect before your deadline. That shows which rewards actually help your next purchase or banner.', rule: 'Eligible Google Play purchases earn Play Points. Spending game currency you already own does not create another purchase, and an official web checkout is billed separately. Use the final earn rate shown on your Google account; future points are a separate benefit from the game resources delivered today.' },
  ko: { answer: '어떤 선택이 맞을까?', product: '먼저 볼 상품', compare: '내 예산으로 비교하기', points: 'Play Points는 어디에 더할까?', sources: '출처와 지역별 참고 자료', detail: '발행사 상품 정보', edition: '이 버전의 공식 서비스', scope: '상품·서비스 확인 자료이며 Android 가격표가 아닙니다', calculate: '게임별 계산기로 상품 비교', price: '비교할 가격은 현재 Android 구매 화면에서 확인하세요. 다른 스토어 자료는 상품 이름과 내용을 알아보는 데 참고할 수 있지만, 가격은 플랫폼과 지역에 따라 다를 수 있습니다.', budget: '원래 쓸 계획이던 금액을 기준으로, 지금 받는 재화와 목표 날짜 전까지 받을 보상을 나눠 적어 보세요. 그중 실제로 사용할 보상으로 상품을 비교한 뒤 Play Points를 더하면 선택이 쉬워집니다.', rule: '대상 Google Play 구매에 Play Points가 적립됩니다. 이미 가진 게임 재화를 쓰는 것은 새 구매가 아니며 공식 웹 결제도 별도 경로입니다. 결제할 Google 계정의 최종 적립률을 사용하고, 나중에 쓸 포인트와 오늘 받은 게임 재화를 나눠 비교하세요.' },
  tw: { answer: '該怎麼選？', product: '先看商品', compare: '用自己的預算比較', points: 'Play Points放在哪一邊？', sources: '出處與地區參考', detail: '發行商商品資料', edition: '此版本官方服務', scope: '商品或服務版本參考，非 Android售價', calculate: '用遊戲計算機比較商品', price: '比較價格時，使用目前 Android 購買畫面的金額。其他商店資料可以幫助核對商品名稱與內容，但售價可能屬於不同平台或地區。', budget: '先用原本的預算，分別記下現在拿到的資源與目標日期前領得到的獎勵。只比較這次會用到的部分，再加入適用的點數回饋，就能看出哪個方案更合適。', rule: '適用的 Google Play購買可累積 Play Points。消耗原有遊戲貨幣不是新的購買，官方網頁結帳也屬另一條管道。用付款 Google帳號顯示的最終積點率估算；之後可用的點數，與今天拿到的遊戲資源分開比較。' }
};

function renderGuideBody(localeKey, guide, locale) {
  const content = guide.content[localeKey], c = COPY[localeKey];
  const parent = `/${localeKey}/games/${guide.gameId}/`;
  const sourceAnchor = (url, title) => `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(title)}</a>`;
  const offerMarkup = content.offers.map(offer => `<h3>${escape(offer.names[localeKey])}</h3><p>${escape(offer.details[localeKey])}</p>`).join('\n');
  const chapters = content.chapters.map((item, i) => `<section class="section" id="product-detail-${i + 1}"><h2>${escape(item.title)}</h2>${item.paragraphs.map(paragraph => `<p>${escape(paragraph)}</p>`).join('')}</section>`).join('\n');
  const sources = new Map();
  sources.set(content.edition, c.edition);
  for (const offer of content.offers) sources.set(offer.evidence.url, offer.names[localeKey] + ' — ' + offer.evidence.scope);
  for (const source of GAME_EVIDENCE[guide.gameId].extraSources || []) sources.set(source.url, c.detail);
  // 主役が現地商品へ変わった記事では、無関係な日本・台湾の商品説明を再掲しない。
  if (!['umamusume', 'phantomparade'].includes(guide.gameId) && !(guide.gameId === 'hbr' && localeKey !== 'tw')) sources.set(guide.source[1], guide.source[0]);
  sources.set(locale.googleUrl, locale.earningRuleLink);
  sources.set(locale.levelsUrl, locale.levelsRuleLink);
  return `<section class="section answer-box" id="purchase-answer"><h2>${escape(c.answer)}</h2><p>${escape(content.answer)}</p><p><a class="cta-btn" href="${parent}">${escape(c.calculate)}</a></p></section>
<nav class="intl-article-toc" aria-label="${escape(locale.toc)}"><h2>${escape(locale.toc)}</h2><ol>${content.offers.length ? `<li><a href="#official-source-scope">${escape(c.product)}</a></li>` : ''}${content.chapters.map((item, i) => `<li><a href="#product-detail-${i + 1}">${escape(item.title)}</a></li>`).join('')}<li><a href="#decision-guide">${escape(c.compare)}</a></li><li><a href="#play-points">${escape(c.points)}</a></li></ol></nav>
${content.offers.length ? `<section class="section" id="official-source-scope"><h2>${escape(c.product)}</h2>${offerMarkup}</section>` : ''}
${chapters}
<section class="section" id="decision-guide"><h2>${escape(c.compare)}</h2><p>${escape(c.budget)}</p><p id="before-paying">${escape(c.price)}</p></section>
<section class="section" id="play-points"><h2>${escape(c.points)}</h2><p>${escape(c.rule)}</p></section>
<section class="section"><h2>${escape(locale.faq)}</h2><h3>${escape(content.faqQ)}</h3><p>${escape(content.faqA)}</p></section>
<details class="article-source-details"><summary>${escape(c.sources)}</summary><ul>${[...sources].map(([url, title]) => `<li>${sourceAnchor(url, title)}</li>`).join('')}</ul><p>${escape(c.scope)}</p><p>${escape(locale.verified)}: ${escape(guide.verifiedAt)}</p></details>
<section class="section related-links-section"><h2>${escape(locale.related)}</h2><ul><li><a href="/${localeKey}/articles/">${escape(locale.back)}</a></li><li><a href="/${localeKey}/articles/google-play-points-promotion-stacking.html">Google Play Points</a></li><li><a href="${parent}">${escape(c.calculate)}</a></li></ul></section>`;
}

module.exports = { renderGuideBody };
