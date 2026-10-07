'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { GAME_EVIDENCE, REVIEWED_AT, locales, isReference } = require('./intl-game-evidence.cjs');
const { getRegionRule } = require('../js/region-rules.js');
const { ALL_GUIDES, hrefFor } = require('./intl-game-guide-expansion.cjs');
const ORIGIN = 'https://playpoint-sim.com';
const COPY = {
  en: {
    region: 'United States · USD', code: 'US', lang: 'en', hreflang: 'en-US',
    heading: 'Before you top up', offers: 'Passes & special purchases', skip: 'Go to calculator ↓', action: 'Enter checkout amount',
    type: 'Offer details', subscription: 'Subscription · auto-renews', price: 'Use the Google Play checkout price',
    lead: 'Choose the reward you actually need, then check the points on your purchase.',
    noOffer: 'The regional sources below confirm the edition or purchase route. Specific local pass benefits are not confirmed here; the Japanese guide stays available separately.',
    input: 'Enter one Google Play transaction in US dollars. The optional eligible-amount field lets you exclude tax or amounts paid with promotional Play credit.',
    source: 'Sources & regional scope', checked: 'Public information reviewed', reference: 'Japanese edition reference',
    referenceNote: 'A current US edition and its Google Play products could not be confirmed. Use the Japanese page for Japan purchases. The USD calculator below is a general US estimate, not a verified local product catalog.',
    japan: 'Open the Japanese calculator & guide', boundary: 'Product contents and checkout prices are checked separately. Publisher Web Stores, Epic, console stores and Apple purchases do not earn Google Play Points merely because they offer the same item.',
    faqQ: 'What should I check before buying?', faqPayQ: 'Which payment amount earns Google Play Points?',
    faqPay: 'Use an eligible Google Play transaction on your US Play account. Enter the amount excluding tax and promotional Play-credit payments when known. Spending currency already owned in the game is not a new payment. Subscription renewals normally use your base level rate; first-time and selected-subscription bonuses have their own conditions in Google Play.',
    bodyTitle: 'Choose the purchase, then calculate', guide: 'Game calculators', more: 'Other game calculators',
    labels: { 'publisher-help': 'Publisher help', 'publisher-notice': 'Publisher announcement', 'publisher-store-content': 'Publisher store description — contents only', 'publisher-ios-listing': 'Publisher iOS listing — names only', 'publisher-site': 'Regional publisher / edition' },
    regionNames: { US: 'United States', KR: 'South Korea', TW: 'Taiwan', global: 'International edition', Japan: 'Japan' }
  },
  ko: {
    region: '대한민국 · KRW', code: 'KR', lang: 'ko', hreflang: 'ko-KR',
    heading: '충전 전에 먼저 확인', offers: '패스와 특별 상품', skip: '계산기로 이동 ↓', action: '결제 금액으로 계산',
    type: '상품 안내', subscription: '구독 · 자동 갱신', price: 'Google Play 결제 화면의 가격 사용',
    lead: '지금 필요한 보상이 무엇인지 고른 다음, 이번 결제로 쌓이는 포인트를 확인하세요.',
    noOffer: '아래 지역별 출처로 서비스 버전이나 구매 경로를 확인했습니다. 이 페이지에서 확인하지 못한 현지 패스 특전은 일본어 가이드와 분리해 둡니다.',
    input: 'Google Play 거래 한 건의 원화 금액을 입력하세요. 선택 입력란에서는 세금이나 프로모션 Play 크레딧으로 낸 금액을 제외할 수 있습니다.',
    source: '출처와 지역별 확인 범위', checked: '공개 정보 확인', reference: '일본판 참고 안내',
    referenceNote: '현재 한국판과 해당 Google Play 상품을 확인하지 못했습니다. 일본 계정의 구매는 일본어 페이지를 이용하세요. 아래 원화 계산기는 한국 계정의 일반 예상치이며 일본 가격을 환산한 상품표가 아닙니다.',
    japan: '일본어 계산기와 가이드 보기', boundary: '상품 내용과 결제 가격은 따로 확인합니다. 공식 Web Store·Epic·콘솔·Apple에서 같은 상품을 판매해도 Google Play Points가 적립되는 거래라는 뜻은 아닙니다.',
    faqQ: '구매 전에 어떤 내용을 확인하면 되나요?', faqPayQ: '어떤 결제 금액으로 Google Play Points를 계산하나요?',
    faqPay: '한국 Play 계정의 적격 Google Play 거래를 사용하세요. 확인할 수 있다면 세금과 프로모션 Play 크레딧 결제액을 제외합니다. 이미 보유한 게임 재화의 사용은 새로운 결제가 아닙니다. 구독 갱신은 기본 적립률로 계산하되 첫 구독·특정 구독 보너스는 Google Play의 개별 조건을 확인하세요.',
    bodyTitle: '상품을 고른 뒤 결제액으로 계산', guide: '게임별 계산기', more: '다른 게임 계산기',
    labels: { 'publisher-help': '공식 도움말', 'publisher-notice': '공식 공지', 'publisher-store-content': '공식 스토어 상품 설명 — 내용 확인용', 'publisher-ios-listing': '발행사 iOS 상품 목록 — 명칭 확인용', 'publisher-site': '지역별 운영사·서비스 안내' },
    regionNames: { US: '미국판', KR: '한국판', TW: '대만판', global: '국제판', Japan: '일본판' }
  },
  tw: {
    region: '台灣 · TWD', code: 'TW', lang: 'zh-TW', hreflang: 'zh-TW',
    heading: '儲值前，先看看', offers: '通行證與特別商品', skip: '前往計算器 ↓', action: '輸入結帳金額計算',
    type: '商品內容', subscription: '訂閱・自動續訂', price: '採用Google Play結帳畫面的價格',
    lead: '先挑需要的獎勵，再看看這次購買能累積多少點數。',
    noOffer: '下方地區來源可確認版本或購買管道。本頁未核實的當地通行證特典，不會直接套用日本版；日文指南可另外參考。',
    input: '輸入一筆Google Play交易的新台幣金額。選填欄位可排除稅額，以及使用促銷Play抵用金支付的部分。',
    source: '來源與地區核對範圍', checked: '公開資訊核對', reference: '日本版參考資訊',
    referenceNote: '尚未確認目前有台灣版及對應Google Play商品。日本帳號的購買請看日文頁。下方新台幣計算器是台灣帳號的一般估算，不是日本售價的換算商品表。',
    japan: '開啟日本計算器與指南', boundary: '商品內容與結帳價格分開核對。官方Web商店、Epic、主機及Apple即使販售相同商品，也不代表交易能累積Google Play Points。',
    faqQ: '購買前，應先確認哪些內容？', faqPayQ: '哪一部分付款可以計算Google Play Points？',
    faqPay: '採用台灣Play帳號符合資格的Google Play交易。若可確認，排除稅額及促銷Play抵用金支付的部分。使用已持有的遊戲貨幣不是一筆新付款。訂閱續費通常採一般積點率；首次訂閱或指定訂閱的額外點數，請看Google Play各別條件。',
    bodyTitle: '選好商品，再計算付款金額', guide: '遊戲計算器', more: '其他遊戲計算器',
    labels: { 'publisher-help': '官方說明', 'publisher-notice': '官方公告', 'publisher-store-content': '官方商店商品頁・僅核對內容', 'publisher-ios-listing': '發行商iOS商品列表・僅核對名稱', 'publisher-site': '地區營運方與版本資訊' },
    regionNames: { US: '美國版', KR: '韓國版', TW: '台灣版', global: '國際版', Japan: '日本版' }
  }
};
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const json = value => JSON.stringify(value).replace(/</g, '\\u003c');

function nameFrom(html, entry, locale) {
  return entry.names?.[locale] || html.match(/<h1\b[^>]*>([^<]+)<\/h1>/)?.[1] || '';
}
function description(name, entry, locale, id) {
  const names = entry.offers[locale].map(item => item.names[locale]).join(locale === 'en' ? ', ' : '・');
  if (isReference(locale, id)) return locale === 'en' ? `${name}: Japanese edition reference and Japan calculator link. Regional products are unconfirmed; no converted yen prices are published.` : locale === 'ko' ? `${name} 일본판 안내와 일본 계산기 링크. 현지 상품은 미확인으로, 일본 가격을 원화로 환산하지 않습니다.` : `${name}日本版參考與日本計算器連結。當地商品未確認，不會把日圓價格換算為新台幣商品表。`;
  return locale === 'en' ? `${name}: ${names ? `compare ${names}, then ` : ''}estimate Google Play Points from your US dollar checkout amount. Official sources and payment-channel differences included.` : locale === 'ko' ? `${name}${names ? ` ${names}` : ''} 구매 전 확인과 한국 원화 Google Play Points 계산. 공식 출처, 결제 경로 차이, 실제 결제액으로 포인트를 확인하세요.` : `${name}${names ? `的${names}` : ''}購買前確認，依台灣新台幣Google Play結帳金額計算積點。附官方來源與付款管道差異。`;
}
function sourceLink(s, c) {
  return `<a href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">${escape(c.labels[s.kind])}</a> — ${escape(c.regionNames[s.scope])}`;
}
function offersHtml(entry, name, locale) {
  const c = COPY[locale], items = entry.offers[locale];
  if (!items.length) return '';
  const cards = items.map(item => `<article class="game-offer-card"><span class="game-offer-kind">${escape(item.subscription ? c.subscription : c.type)}</span><h3>${escape(item.names[locale])}</h3><p>${escape(item.details[locale])}</p><div class="game-offer-bottom"><strong>${escape(c.price)}</strong><a class="game-offer-action" href="#game-calculator" data-offer-input="amount"${item.subscription ? ' data-offer-subscription="true"' : ''}>${escape(c.action)} →</a><p class="game-offer-source">${sourceLink(item.evidence, c)}</p></div></article>`).join('\n');
  return `<section class="game-offers" aria-labelledby="game-offers-title"><div class="game-offers-heading"><div><span class="game-offers-eyebrow">${c.heading}</span><h2 id="game-offers-title">${escape(name)}: ${c.offers}</h2></div><a class="game-offers-skip" href="#game-calculator">${c.skip}</a></div><p class="game-offers-lead">${c.lead}</p><div class="game-offers-grid">${cards}</div></section>`;
}
function normalizeCalculator(calc, c) {
  let result = calc.replace(/<p class="preset-heading">[\s\S]*?<\/div>/, '');
  result = result.replace(/<p class="game-sim-lead">[\s\S]*?<\/p>/g, '');
  for (const id of ['sim-pack-select', 'sim-pack-count']) result = result.replace(new RegExp(`<div class="input-field">\\s*<label for="${id}">[\\s\\S]*?<\\/div>`), '');
  result = result.replace(/<form id="game-sim-form"[^>]*>/, '<form id="game-sim-form" data-input-mode="amount">');
  result = result.replace(/(<input[^>]*\bid="sim-custom-amount"[^>]*\bvalue=")[^"]*(")/, (_m, a, b) => a + '0' + b);
  result = result.replace(/(<h2 class="game-sim-title">[\s\S]*?<\/h2>)/, (_m, h) => `${h}<p class="game-sim-lead">${escape(c.input)}</p>`);
  return result.replace(/^[\t ]+$/gm, '');
}
function hreflangs(html, id) {
  const available = locales.filter(locale => !isReference(locale, id));
  const tags = [`<link rel="alternate" hreflang="ja" href="${ORIGIN}/games/${id}/" />`, ...available.map(locale => `<link rel="alternate" hreflang="${COPY[locale].hreflang}" href="${ORIGIN}/${locale}/games/${id}/" />`), `<link rel="alternate" hreflang="x-default" href="${ORIGIN}/games/${id}/" />`].join('\n  ');
  return html.replace(/\s*<link\b[^>]*rel="alternate"[^>]*hreflang="[^"]+"[^>]*>/g, '').replace(/(<link rel="canonical"[^>]*>)/, (_m, canonical) => `${canonical}\n  ${tags}`);
}
function updateMetadata(html, name, desc, locale, id, questions) {
  const c = COPY[locale], reference = isReference(locale, id);
  const title = `${name} — ${reference ? c.reference : `Google Play Points (${c.region})`}`;
  let next = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(title)}</title>`);
  next = next.replace(/(<meta\s+(?:name|property)="(?:description|og:description|twitter:description)"\s+content=")[^"]*("[^>]*>)/g, (_m, a, b) => a + escape(desc) + b);
  next = next.replace(/(<meta\s+(?:name|property)="(?:og:title|twitter:title|og:image:alt)"\s+content=")[^"]*("[^>]*>)/g, (_m, a, b) => a + escape(title) + b);
  next = next.replace(/(<meta name="robots" content=")[^"]*("[^>]*>)/, (_m, a, b) => a + (reference ? 'noindex, follow' : 'index, follow, max-image-preview:large') + b);
  next = next.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (_m, raw) => {
    const object = JSON.parse(raw);
    if (object['@type'] === 'WebApplication') {
      object.name = title; object.description = desc; object.inLanguage = c.hreflang; object.dateModified = REVIEWED_AT;
      // 0は無料の計算ツールの価格。ゲーム内商品の価格ではない。
      object.offers = { '@type': 'Offer', price: '0', priceCurrency: getRegionRule(c.code).currencyCode };
    }
    if (object['@type'] === 'BreadcrumbList') object.itemListElement.at(-1).name = name;
    if (object['@type'] === 'FAQPage') object.mainEntity = questions.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } }));
    return `<script type="application/ld+json">${json(object)}</script>`;
  });
  return reference ? next.replace(/\s*<link\b[^>]*rel="alternate"[^>]*hreflang="[^"]+"[^>]*>/g, '') : hreflangs(next, id);
}
function replaceCards(html, locale, entries) {
  const c = COPY[locale];
  return html.replace(/<a class="game-portal-card" href="(?:\.\/|\.\.\/)([^/]+)\/">([\s\S]*?)<\/a>/g, (card, id, body) => {
    if (!entries[id]) return card;
    const entry = GAME_EVIDENCE[id];
    body = body.replace(/(<p class="game-card-desc">)[\s\S]*?(<\/p>)/, (_m, a, b) => a + escape(entries[id].desc) + b);
    body = body.replace(/(<h[23] class="game-card-title">)[\s\S]*?(<\/h[23]>)/, (_m, a, b) => a + escape(entries[id].name) + b);
    return `<a class="game-portal-card" href="${isReference(locale, id) ? `/games/${id}/` : `/${locale}/games/${id}/`}"${isReference(locale, id) ? ' hreflang="ja"' : ''}>${body}${isReference(locale, id) ? `<span class="game-reference-label">${c.reference}</span>` : ''}</a>`;
  });
}
function syncIntlGameEvidence(rootDir) {
  const changedFiles = [], summaries = {};
  const write = (file, content) => {
    const full = path.join(rootDir, file), old = fs.readFileSync(full, 'utf8');
    if (old !== content) { fs.writeFileSync(full, content, 'utf8'); changedFiles.push(file); }
  };
  for (const locale of locales) {
    const c = COPY[locale]; summaries[locale] = {};
    for (const [id, entry] of Object.entries(GAME_EVIDENCE)) {
      const file = `${locale}/games/${id}/index.html`, html = fs.readFileSync(path.join(rootDir, file), 'utf8');
      const name = nameFrom(html, entry, locale), desc = description(name, entry, locale, id);
      summaries[locale][id] = { name, desc };
      const reference = isReference(locale, id), items = entry.offers[locale];
      const calculator = html.match(/<section class="game-sim-card" id="game-calculator">[\s\S]*?<\/section>/)?.[0];
      if (!calculator) throw new Error(`[intl-game-evidence] missing calculator: ${file}`);
      const ads = html.match(/<div class="game-ad-container">[\s\S]*?<\/div>/g) || [];
      // メイン欄だけを編集し、サイドバー・広告・共通資産の共有契約を保持する。
      const inside = html.match(/<main class="game-main-content">([\s\S]*?)<\/main>/)?.[1];
      if (!inside) throw new Error(`[intl-game-evidence] missing main: ${file}`);
      const header = inside.match(/<header class="game-header">[\s\S]*?<\/header>/)?.[0].replace(/(<h1[^>]*>)[^<]+(<\/h1>)/, (_m, a, b) => a + escape(name) + b).replace(/(<p class="game-meta">)[\s\S]*?(<\/p>)/, (_m, a, b) => a + escape(c.region) + b);
      const focus = entry.focus?.[locale] || items[0]?.details[locale] || c.noOffer;
      const questions = [[c.faqQ, reference ? c.referenceNote : focus], [c.faqPayQ, c.faqPay]];
      const edition = { url: entry.editions[locale], kind: 'publisher-site', scope: reference ? 'Japan' : c.code };
      const sources = [...new Map([edition, ...items.map(item => item.evidence), ...(entry.extraSources || [])].map(s => [s.url, s])).values()];
      const sourceBlock = `<section class="section game-source-section"><h2>${c.source}</h2><p>${c.boundary}</p><ul>${sources.map(s => `<li>${sourceLink(s, c)}</li>`).join('')}<li><a href="https://support.google.com/googleplay/answer/9077192?co=GENIE.CountryCode%3D${c.code}&amp;hl=${c.lang}" target="_blank" rel="noopener noreferrer">Google Play Points — ${c.region}</a></li></ul><p>${c.checked}: <time datetime="${REVIEWED_AT}">${REVIEWED_AT}</time></p></section>`;
      const faq = `<section class="section"><h2>FAQ</h2>${questions.map(([q, a]) => `<details><summary>${escape(q)}</summary><p>${escape(a)}</p></details>`).join('')}</section>`;
      const guides = reference ? [] : ALL_GUIDES.filter(guide => guide.gameId === id);
      const reading = guides.length ? `<section class="section game-reading-guides"><h2>${locale === 'en' ? 'Read before buying' : locale === 'ko' ? '구매 전 읽어볼 가이드' : '購買前的指南'}</h2><ul>${guides.map(guide => `<li><a href="${hrefFor(locale, guide.slug)}">${escape(guide.content[locale].title)}</a></li>`).join('')}</ul></section>` : '';
      const note = reference ? `<section class="section game-reference-note"><h2>${c.reference}</h2><p>${c.referenceNote}</p><p><a href="/games/${id}/" hreflang="ja">${c.japan}</a></p></section>` : items.length ? '' : `<section class="section"><h2>${c.bodyTitle}</h2><p>${escape(focus)}</p><p><a href="/games/${id}/" hreflang="ja">${c.japan}</a></p></section>`;
      const main = `${header}\n<p>${escape(desc)}</p>\n${note}\n${reference ? '' : offersHtml(entry, name, locale)}\n${normalizeCalculator(calculator, c)}\n${ads.join('\n')}\n${reading}\n${faq}\n${sourceBlock}\n<p><a href="/${locale}/games/">${c.more} →</a></p>`;
      let next = html.replace(/(<main class="game-main-content">)[\s\S]*?(<\/main>)/, (_m, a, b) => a + main + b);
      next = next.replace(/(<p class="site-tagline">)[\s\S]*?(<\/p>)/, (_m, a, b) => a + c.lead + b);
      next = updateMetadata(next, name, desc, locale, id, questions);
      write(file, next);
    }
    // 関連カードにも同じ説明を使い、旧「天井価格」や未確認の海外商品へ誘導しない。
    for (const id of Object.keys(GAME_EVIDENCE)) {
      const file = `${locale}/games/${id}/index.html`;
      write(file, replaceCards(fs.readFileSync(path.join(rootDir, file), 'utf8'), locale, summaries[locale]));
    }
    const portalFile = `${locale}/games/index.html`;
    let portal = replaceCards(fs.readFileSync(path.join(rootDir, portalFile), 'utf8'), locale, summaries[locale]);
    portal = portal.replace(/(<p class="site-tagline">)[\s\S]*?(<\/p>)/, (_m, a, b) => a + c.lead + b);
    portal = portal.replace(/<p class="(?:game-meta|game-portal-lead)">[\s\S]*?<\/p>/g, '');
    // 一覧の検索説明も計算機が提供する機能に合わせる。
    const portalDesc = locale === 'en' ? 'Game-by-game Google Play Points calculators for US dollar purchases. Compare verified regional passes and special products, with official sources and Japanese reference links.' : locale === 'ko' ? '한국 원화 Google Play Points 게임별 계산기. 지역별 패스·특별 상품과 공식 출처를 확인하고 실제 결제액으로 계산하세요. 일본판 참고 링크는 별도로 표시합니다.' : '台灣新台幣Google Play Points遊戲計算器。先看各版本通行證與特別商品、官方來源，再依實際結帳金額計算；日本版參考另行標示。';
    portal = portal.replace(/(<meta\s+(?:name|property)="(?:description|og:description|twitter:description)"\s+content=")[^"]*("[^>]*>)/g, (_m, a, b) => a + escape(portalDesc) + b);
    portal = portal.replace(/(<header class="game-header">[\s\S]*?<\/header>)/, (_m, h) => `${h}<p class="game-meta">${c.region}</p><p class="game-portal-lead">${escape(portalDesc)}</p>`);
    portal = portal.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (_m, raw) => {
      const object = JSON.parse(raw);
      if (object['@type'] === 'WebPage') { object.description = portalDesc; object.inLanguage = c.hreflang; object.dateModified = REVIEWED_AT; }
      return `<script type="application/ld+json">${json(object)}</script>`;
    });
    write(portalFile, portal.replace(/^[\t ]+$/gm, ''));
  }
  // 日本語本文は維持し、実在する海外版との相互参照だけを同期する。
  for (const id of Object.keys(GAME_EVIDENCE)) {
    const file = `games/${id}/index.html`;
    write(file, hreflangs(fs.readFileSync(path.join(rootDir, file), 'utf8'), id));
  }
  return { checked: 99, changedFiles: [...new Set(changedFiles)] };
}
module.exports = { COPY, syncIntlGameEvidence };
