'use strict';

const { GAME_EVIDENCE } = require('./intl-game-evidence.cjs');
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const COPY = {
  en: {
    answer: 'The quick answer',
    product: 'What each option includes',
    compare: 'Compare using your own budget',
    points: 'Where Play Points fit in',
    sources: 'Sources and regional references',
    detail: 'Publisher pack details',
    edition: 'Official site for this game version',
    scope: 'Based on official product listings and regional Google Play rules—always verify live local pricing on your Android checkout screen.',
    calculate: 'Compare in the game calculator',
    price: 'Always plug in the live price shown on your own Android checkout screen. App Store, PC, or console pages are helpful for double-checking what is inside a bundle, but pricing often varies across platforms and regions.',
    budget: 'Start with the budget you already had in mind, then separate what lands in your account right away from what trickles in over the next few weeks. Counting only the rewards you will actually collect before your banner or event ends makes it clear which option helps today—and which one is really for later.',
    rule: 'Only eligible Google Play purchases earn Play Points. Spending in-game currency you already own will not earn new points, and purchases made through a publisher’s web store are billed outside Google Play. Base your estimate on the final earn rate shown on your Google account, and keep those future points separate from the in-game items you receive today.'
  },
  ko: {
    answer: '핵심 결론부터 보기',
    product: '먼저 살펴볼 상품 구성',
    compare: '내 예산으로 직접 비교하기',
    points: 'Play Points는 어디에 더할까?',
    sources: '출처와 지역별 참고 자료',
    detail: '발행사 상품 정보',
    edition: '이 버전의 공식 서비스',
    scope: '공식 상품 안내와 지역별 규칙을 바탕으로 정리한 참고 자료입니다. 실제 결제 금액은 Android 구매 화면에서 바로 볼 수 있습니다.',
    calculate: '게임별 계산기로 상품 비교',
    price: '비교할 때는 현재 Android 구매 화면에 뜨는 결제 금액을 기준으로 삼는 편이 정확합니다. 다른 스토어 자료는 상품 구성을 파악하는 데 도움이 되지만, 플랫폼이나 지역에 따라 금액이 다를 수 있습니다.',
    budget: '원래 쓰려던 예산을 기준으로 당장 받는 재화와 목표 날짜 전까지 모이는 보상을 따로 적어 두면 한눈에 들어옵니다. 그중 이번 목표에 실제로 쓸 수 있는 것만 추려 비교한 뒤 Play Points를 더하면 선택이 훨씬 깔끔해집니다.',
    rule: 'Play Points는 대상 Google Play 결제에만 적립됩니다. 이미 보유한 게임 재화를 쓰는 것은 새 구매가 아니며, 공식 웹 결제도 별도 경로로 처리됩니다. 결제할 Google 계정의 최종 적립률을 기준으로 계산하고, 나중에 쓸 포인트와 오늘 바로 쓰는 게임 재화를 섞지 않는 것이 좋습니다.'
  },
  tw: {
    answer: '先看結論：怎麼選最適合？',
    product: '先看各方案內容',
    compare: '帶入自己的預算比比看',
    points: 'Play Points 要算在哪一邊？',
    sources: '官方出處與地區參考',
    detail: '發行商商品資料',
    edition: '此版本官方服務',
    scope: '以上整理自官方商品說明與地區規則，實際售價仍以 Android 結帳畫面為準。',
    calculate: '用遊戲計算機比較商品',
    price: '比價時請看目前 Android 結帳畫面顯示的實際金額。其他商店的頁面可以用來核對商品名稱與內容，不過不同平台或地區的定價未必相同，不能直接拿來換算。',
    budget: '先從原本打算花的預算開始，把「買完當下拿到的資源」和「目標日期前實際領得到的獎勵」分開記下來。只把這次派得上用場的部分放進比較，再算入適用通路的點數回饋，哪個方案比較順手就一目了然了。',
    rule: '只有在 Google Play 完成且符合資格的消費，才會累積 Google Play Points；花掉帳號裡原本就有的遊戲貨幣不算新消費，官方網頁結帳也屬於另一條付款管道。估算點數時請看付款 Google 帳號顯示的最終積點率，並把之後才能用的點數與今天就能拿到的遊戲資源分開來看。'
  }
};

function renderGuideBody(localeKey, guide, locale) {
  const content = guide.content[localeKey], c = COPY[localeKey];
  // 正式名と現地名を冒頭の自然な文に含め、表示名と検索名を結び付ける。
  let answer = content.answer;
  if (guide.gameId === 'fgo' && localeKey === 'ko') answer = answer.replace('목표 소환', '페이트/그랜드 오더(FGO)의 목표 소환');
  if (guide.gameId === 'pad') answer = answer.replace(...({
    en: ['Consider P&D Pass', 'Consider Puzzle & Dragons’ P&D Pass'],
    ko: ['전용 던전', '퍼즐앤드래곤의 전용 던전'],
    tw: ['會固定打通行證專用關卡', '若會固定打《龍族拼圖》通行證專用關卡']
  })[localeKey]);
  const parent = `/${localeKey}/games/${guide.gameId}/`;
  const sourceAnchor = (url, title) => `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(title)}</a>`;
  const offerMarkup = content.offers.map(offer => `<h3>${escape(offer.names[localeKey])}</h3><p>${escape(offer.details[localeKey])}</p>`).join('\n');
  const chapters = content.chapters.map((item, i) => `<section class="section" id="product-detail-${i + 1}"><h2>${escape(item.title)}</h2>${item.paragraphs.map(paragraph => `<p>${escape(paragraph)}</p>`).join('')}</section>`).join('\n');
  const sources = new Map();
  sources.set(content.edition, c.edition);
  for (const offer of content.offers) sources.set(offer.evidence.url, offer.names[localeKey] + ' — ' + offer.evidence.scope);
  for (const source of GAME_EVIDENCE[guide.gameId].extraSources || []) sources.set(source.url, c.detail);
  for (const source of GAME_EVIDENCE[guide.gameId].regionalSources?.[localeKey] || []) sources.set(source.url, c.detail);
  // 主役が現地商品へ変わった記事では、無関係な日本・台湾の商品説明を再掲しない。
  if (!['umamusume', 'phantomparade'].includes(guide.gameId) && !(guide.gameId === 'hbr' && localeKey !== 'tw')) sources.set(guide.source[1], guide.source[0]);
  sources.set(locale.googleUrl, locale.earningRuleLink);
  sources.set(locale.levelsUrl, locale.levelsRuleLink);
  return `<section class="section answer-box" id="purchase-answer"><h2>${escape(c.answer)}</h2><p>${escape(answer)}</p><p><a class="cta-btn" href="${parent}">${escape(c.calculate)}</a></p></section>
<nav class="intl-article-toc" aria-label="${escape(locale.toc)}"><h2>${escape(locale.toc)}</h2><ol>${content.offers.length ? `<li><a href="#official-source-scope">${escape(c.product)}</a></li>` : ''}${content.chapters.map((item, i) => `<li><a href="#product-detail-${i + 1}">${escape(item.title)}</a></li>`).join('')}<li><a href="#decision-guide">${escape(c.compare)}</a></li><li><a href="#play-points">${escape(c.points)}</a></li></ol></nav>
${content.offers.length ? `<section class="section" id="official-source-scope"><h2>${escape(c.product)}</h2>${offerMarkup}</section>` : ''}
${chapters}
<section class="section" id="decision-guide"><h2>${escape(c.compare)}</h2><p>${escape(c.budget)}</p><p id="before-paying">${escape(c.price)}</p></section>
<section class="section" id="play-points"><h2>${escape(c.points)}</h2><p>${escape(c.rule)}</p></section>
<section class="section"><h2>${escape(locale.faq)}</h2><h3>${escape(content.faqQ)}</h3><p>${escape(content.faqA)}</p></section>
<details class="article-source-details"><summary>${escape(c.sources)}</summary><ul>${[...sources].map(([url, title]) => `<li>${sourceAnchor(url, title)}</li>`).join('')}</ul><p>${escape(c.scope)}</p><p>${escape(locale.verified)}: ${escape(guide.verifiedAt)}</p></details>
<section class="section related-links-section"><h2>${escape(locale.related)}</h2><ul><li><a href="/${localeKey}/articles/google-play-points-promotion-stacking.html">${escape({en:'Play Points boosts: which rate applies?',ko:'Play Points 배율 중복 적용 규칙',tw:'Play Points 加倍活動的疊加規則'}[localeKey])}</a></li><li><a href="${parent}">${escape(c.calculate)}</a></li></ul></section>`;
}

module.exports = { renderGuideBody };
