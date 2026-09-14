'use strict';

const fs = require('node:fs');
const path = require('node:path');

const PUBLISHED_AT = '2026-09-13';
const MODIFIED_AT = '2026-09-13';
const SITE_ORIGIN = 'https://playpoint-sim.com';

const LOCALES = Object.freeze({
  en: Object.freeze({
    lang: 'en', region: 'United States', author: 'Katakata', siteName: 'Google Play Points Calculator',
    badge: 'Game purchase guide', scope: 'English · United States Google Play reference',
    toc: 'Contents', authorAria: 'Article author', authorLabel: 'Article author', commonRule: 'Play Points common rules', earningRuleLink: 'Google Play Points earning rules — United States', levelsRuleLink: 'Google Play Points levels — United States',
    official: 'What the official sources say', points: 'Google Play Points: what counts', decision: 'Which route makes sense?', before: 'Before you pay', sources: 'Official sources checked', faq: 'FAQ', related: 'Related guides',
    published: 'Published', updated: 'Updated', verified: 'Official sources checked', back: 'Back to guides', home: 'Calculator top',
    ctaTitle: 'Check the purchase in the game calculator', ctaBody: 'Use the amount and final earn rate shown on the Google Play account that will actually pay.', ctaButton: 'Open game calculator',
    googleRule: 'In the United States, Bronze earns 1 point per US$1 on eligible Google Play purchases. Higher levels raise the base rate; tax is excluded and the highest eligible promotional earn rate applies.',
    routeRule: 'Google Play Points are earned only when the purchase is processed as an eligible Google Play transaction. A publisher Web Store, PC client, console store or other external checkout may have its own discount or rewards, but that does not automatically make it eligible for Google Play Points.',
    googleUrl: 'https://support.google.com/googleplay/answer/9077192?co=GENIE.CountryCode%3DUS&hl=en',
    levelsUrl: 'https://support.google.com/googleplay/answer/9080348?co=GENIE.CountryCode%3DUS&hl=en',
    authorText: 'PlayPoint checks first-party game and Google sources before publishing purchase examples. Prices, store availability and promotions can change by region and account.',
    trademark: 'Google Play and Android are trademarks of Google LLC. Game names and product names belong to their respective rights holders. PlayPoint is an independent, unofficial calculator and guide.'
  }),
  ko: Object.freeze({
    lang: 'ko', region: '대한민국', author: 'Katakata', siteName: 'Google Play Points 계산기',
    badge: '게임 결제 가이드', scope: '한국어 · 대한민국 Google Play 기준',
    toc: '목차', authorAria: '글 작성자', authorLabel: '작성자', commonRule: 'Play Points 공통 규칙', earningRuleLink: 'Google Play Points 적립 규칙 — 대한민국', levelsRuleLink: 'Google Play Points 등급 기준 — 대한민국',
    official: '공식 정보에서 확인한 내용', points: 'Google Play 포인트 적립 기준', decision: '어느 결제 경로가 유리한가', before: '결제 전 확인', sources: '확인한 공식 출처', faq: '자주 묻는 질문', related: '관련 가이드',
    published: '게시', updated: '업데이트', verified: '공식 정보 확인', back: '가이드로 돌아가기', home: '계산기 홈',
    ctaTitle: '게임별 계산기로 실제 결제 금액 확인', ctaBody: '실제로 결제할 Google 계정에 표시된 금액과 최종 적립률을 입력해 비교하세요.', ctaButton: '게임별 계산기 열기',
    googleRule: '대한민국 Google Play Points는 브론즈 기준 1,000원당 1포인트, 실버 1.10, 골드 1.30, 플래티넘 1.60, 다이아몬드 2포인트가 기본 적립률입니다. 세금은 적립 계산에서 제외되고 더 높은 특별 적립률이 적용되면 그 적립률이 우선합니다.',
    routeRule: 'Google Play 포인트는 Google Play에서 처리되는 대상 구매에만 적립됩니다. 퍼블리셔 WEB SHOP이나 PC·콘솔의 외부 결제는 자체 할인이나 포인트가 있을 수 있지만 그것만으로 Google Play 포인트 적립 대상이 되는 것은 아닙니다.',
    googleUrl: 'https://support.google.com/googleplay/answer/9077192?co=GENIE.CountryCode%3DKR&hl=ko',
    levelsUrl: 'https://support.google.com/googleplay/answer/9080348?co=GENIE.CountryCode%3DKR&hl=ko',
    authorText: 'PlayPoint는 게임사와 Google의 1차 출처를 우선 확인합니다. 가격, 판매 경로, 프로모션은 국가·계정·시점에 따라 달라질 수 있습니다.',
    trademark: 'Google Play 및 Android는 Google LLC의 상표입니다. 게임명과 상품명에 관한 권리는 각 권리자에게 있습니다. PlayPoint는 각 회사와 제휴하지 않은 비공식 계산·정보 사이트입니다.'
  }),
  tw: Object.freeze({
    lang: 'zh-TW', region: '台灣', author: 'Katakata', siteName: 'Google Play Points 計算機',
    badge: '遊戲消費指南', scope: '繁體中文 · 台灣 Google Play 條件',
    toc: '目錄', authorAria: '文章作者', authorLabel: '文章作者', commonRule: 'Play Points 共通規則', earningRuleLink: 'Google Play Points 積點規則 — 台灣', levelsRuleLink: 'Google Play Points 等級規則 — 台灣',
    official: '官方資料確認到的重點', points: 'Google Play Points 積點條件', decision: '該選哪一種付款方式？', before: '付款前請確認', sources: '本頁核對的官方來源', faq: '常見問題', related: '相關指南',
    published: '發布', updated: '更新', verified: '官方資料確認', back: '返回指南', home: '計算機首頁',
    ctaTitle: '用遊戲專用計算機帶入實際金額', ctaBody: '請以實際付款帳號顯示的價格與最終積點率為準，再比較不同付款方式。', ctaButton: '開啟遊戲計算機',
    googleRule: '台灣 Google Play Points 以銅級每消費 NT$30 累積 1 點為基準；銀級 1.25 點、黃金級 1.5 點、白金級 1.75 點、鑽石級 2 點。點數依未稅商品價格計算，適用活動時採較高的積點率。',
    routeRule: '只有由 Google Play 處理且符合資格的購買才會累積 Google Play 點數。遊戲官方網路商店、PC 客戶端、主機商店等外部結帳可能有自己的折扣或回饋，但不能因此直接視為可累積 Google Play 點數。',
    googleUrl: 'https://support.google.com/googleplay/answer/9077192?co=GENIE.CountryCode%3DTW&hl=zh-Hant',
    levelsUrl: 'https://support.google.com/googleplay/answer/9080348?co=GENIE.CountryCode%3DTW&hl=zh-Hant',
    authorText: 'PlayPoint 優先核對遊戲官方與 Google 第一方資料。價格、商店可用地區、活動與帳號條件都可能變動。',
    trademark: 'Google Play 與 Android 為 Google LLC 的商標。遊戲名稱與商品名稱之權利屬各權利人所有。PlayPoint 為獨立的非官方計算與資訊網站。'
  })
});

function localized(en, ko, tw) { return Object.freeze({ en: Object.freeze(en), ko: Object.freeze(ko), tw: Object.freeze(tw) }); }
function entry(title, terms, market, decisions, caveat, faqQ, faqA) { return { title, terms, market, decisions, caveat, faqQ, faqA }; }

const GUIDES = Object.freeze([
  {
    slug: 'fgo-guaranteed-summon-play-points', jaPath: '/games/fgo/pity-cost/', gameId: 'fgo',
    source: ['Fate/Grand Order Official USA 9th Anniversary', 'https://fate-go.us/9th_anniversary/campaign/'],
    content: localized(
      entry('FGO 330-Summon Guarantee: Saint Quartz Cost and Google Play Points (2026)', ['Guaranteed Summon', 'Saint Quartz', 'Paid Saint Quartz'], 'FGO USA officially removed the one-time limit from the Guaranteed Summon effect on July 4, 2026; for eligible Limited Time Summons it now activates every 330 Summons. This is a server-specific rule, so another regional version must use its own current banner notice.', ['Read the current banner before using 330 as the target.', 'For Android purchases, calculate Play Points from the actual Google Play checkout amount.', 'Keep paid-only Guaranteed Summon campaigns separate from the normal 330-Summon safety rule.'], 'Do not convert Japanese pack prices into a US price table; use the live US Saint Quartz packs.', 'Does every FGO server already use the same 330 rule?', 'No. Server schedules can differ; use the current official notice for the version you play.'),
      entry('FGO 330회 확정 소환과 성정석 결제: Google Play 포인트까지 확인', ['확정 소환', '성정석', '유료 성정석'], '북미판은 2026년 7월 4일부터 대상 기간 한정 소환의 확정 효과가 330회마다 발동하도록 바뀌었습니다. 한국판은 업데이트 시점이 다를 수 있으므로 넷마블의 해당 소환 공지와 게임 내 설명을 우선합니다.', ['한국판에서 확정 소환 조건과 카운트 범위를 먼저 확인하세요.', '성정석을 한국 Google Play에서 결제할 때만 해당 원화 거래로 Play Points를 계산하세요.', '일본·북미판 가격을 환율로 바꿔 한국 공식 가격처럼 쓰지 않습니다.'], '복주머니 등 유료 성정석 전용 소환과 일반 330회 보장을 같은 제도로 계산하지 않습니다.', '북미판 330회 규칙을 한국판에 그대로 적용해도 되나요?', '아니요. 한국판 공식 공지와 게임 내 표시가 우선입니다.'),
      entry('FGO 330 抽確定召喚怎麼算？聖晶石與 Google Play 點數整理', ['確定召喚', '聖晶石', '付費聖晶石'], '美版官方已於 2026 年 7 月 4 日將適用的期間限定召喚改為每 330 次觸發 Guaranteed Summon。繁中版進度可能不同，因此本頁不把美版日期直接當成繁中版條件。', ['先看繁中版當期卡池是否明示確定召喚與計數方式。', '若由台灣 Google Play 結帳，再用實際 NT$ 價格估算 Play Points。', '福袋／付費聖晶石限定召喚要和一般 330 抽機制分開。'], '聖晶石價格以繁中版遊戲內目前顯示為準，不用日圓價格換算。', '繁中版一定已和美版同步嗎？', '不能只憑美版公告判定，請以繁中版當期公告為準。')
    )
  },
  {
    slug: 'genshin-welkin-moon-play-points', jaPath: '/games/genshin/welkin-value/', gameId: 'genshin', source: ['Genshin Impact official site', 'https://genshin.hoyoverse.com/'],
    content: localized(
      entry('Blessing of the Welkin Moon: Value, Genesis Crystals and Play Points', ['Blessing of the Welkin Moon', 'Genesis Crystals', 'Primogems'], 'Welkin is a time-based product: much of its value arrives through daily Primogem claims, so it should not be compared with an immediate Genesis Crystal top-up only by sticker price.', ['Value only the daily Primogems you expect to claim.', 'Compare direct Genesis Crystal top-ups separately when you need currency now.', 'An official HoYoverse web checkout is not automatically a Google Play transaction.'], 'Use the live US price shown in the game or official checkout; prices and payment routes can change.', 'Does an official HoYoverse website purchase automatically earn Play Points?', 'No. Play Points require an eligible Google Play transaction.'),
      entry('원신 공월 축복은 얼마나 이득일까? 창세의 결정·원석·Play Points', ['공월 축복', '창세의 결정', '원석'], '공월 축복은 즉시 재화만 보는 상품이 아니라 활성 기간 동안 매일 로그인해 원석을 받는 기간형 상품입니다. 한국 공식 용어인 공월 축복·창세의 결정·원석을 기준으로 판단합니다.', ['실제로 로그인해 받을 원석을 기준으로 가치 계산.', '즉시 재화가 필요하면 창세의 결정 충전과 별도 비교.', 'HoYoverse 외부 결제에는 Google Play 포인트를 자동으로 더하지 않습니다.'], '한국 클라이언트의 현재 원화 가격과 실제 결제 플랫폼을 확인하세요.', '공월 축복 웹 결제도 Play Points가 적립되나요?', 'Google Play에서 처리되는 대상 결제인지 확인해야 합니다.'),
      entry('《原神》空月祝福值不值得？創世結晶、原石與 Google Play 點數', ['空月祝福', '創世結晶', '原石'], '繁中官方常用「空月祝福」「創世結晶」「原石」。空月祝福屬期間型商品，價值取決於有效期間內實際登入領取的原石，不應只看第一天取得內容。', ['以實際可領取天數估值。', '需要立即取得貨幣時另看創世結晶。', 'HoYoverse 外部結帳與台灣 Google Play 分開計算。'], '請以台灣區遊戲內目前顯示的 NT$ 價格與結帳方式為準。', '官方網頁購買空月祝福會有 Play Points 嗎？', '不一定，只有符合資格的 Google Play 交易才會累積。')
    )
  },
  {
    slug: 'monster-strike-google-play-vs-web-shop', jaPath: '/games/monst/google-play-vs-webshop/', gameId: 'monst', source: ['Monster Strike Taiwan Web Shop', 'https://www.monster-strike.com.tw/news/web-shop/'],
    content: localized(
      entry('Monster Strike Google Play vs Web Shop: a region-aware comparison', ['Monster Strike', 'Orbs', 'Web Shop'], 'Monster Strike Web Shop offers are market-specific. Taiwan\'s active official shop publishes local Orb bonuses and prices, but that does not create a matching US shop or US Orb catalog.', ['Use the purchase route officially supported by your game version.', 'Count US Play Points only for eligible Google Play billing.', 'Do not currency-convert a Japan/Taiwan store into a fake US price list.'], 'Publisher shop bonuses and Play Points are separate benefits.', 'Is there one global Monster Strike Web Shop price list?', 'No. Official offers and supported markets differ.'),
      entry('몬스터 스트라이크 Google Play vs WEB SHOP: 지역별 조건을 분리해서 비교', ['Monster Strike', '오브', 'WEB SHOP'], '대만 번체중문판은 2026년에도 공식 웹샵을 운영하지만 그 가격·혜택을 한국 서비스에 그대로 옮기면 안 됩니다. 이용 중인 게임 버전의 공식 구매 경로가 기준입니다.', ['한국 Google Play 인앱 결제만 대한민국 Play Points를 계산합니다.', '다른 지역 웹샵의 추가 오브는 별도 혜택으로 표시합니다.', '지원 국가·통화를 먼저 확인합니다.'], '해외 가격의 원화 환산값을 한국 공식 가격처럼 쓰지 않습니다.', '대만 웹샵 가격을 원화로 바꾸면 한국 가격인가요?', '아니요. 서비스 지역과 상품 구성이 다릅니다.'),
      entry('《怪物彈珠》Google Play vs 網路商店：寶珠、怪彈點數與 Play Points', ['怪物彈珠', '寶珠', '怪物彈珠網路商店', '怪彈點數'], '台灣官方網路商店 2026 年 8 月調整部分價格：寶珠 35 個 NT$620、63 個 NT$1,160、86 個 NT$1,470、190 個 NT$2,960，並持續提供網路商店限定增量或怪彈點數活動。', ['比較實拿寶珠與當期怪彈點數。', '若選 Google Play，另外用台灣帳號積點率估算 Play Points。', '同一筆網路商店交易不要再加 Google Play 點數。'], '商品價格、限購與活動倍率以當期官方頁面為準。', '怪彈點數就是 Google Play 點數嗎？', '不是，兩者是不同發行者、不同用途的回饋。')
    )
  },
  {
    slug: 'honkai-star-rail-express-supply-pass', jaPath: '/games/starrail/supply-pass-value/', gameId: 'starrail', source: ['Honkai: Star Rail official site', 'https://hsr.hoyoverse.com/'],
    content: localized(
      entry('Express Supply Pass value: Stellar Jade and Google Play Points', ['Express Supply Pass', 'Stellar Jade', 'Oneiric Shards'], 'The Express Supply Pass is a time-based purchase; daily Stellar Jade claims matter. Treat immediate Oneiric Shards/top-ups separately from the delayed daily value.', ['Use actual claimed days when valuing the pass.', 'Compare immediate top-ups separately.', 'Only eligible Google Play billing earns Play Points.'], 'Use the live local price and current payment route.', 'Does the pass deliver all value immediately?', 'No. A major part is received through daily login rewards.'),
      entry('붕괴: 스타레일 열차 보급 허가증 가치: 성옥과 Play Points', ['열차 보급 허가증', '성옥', '고대몽화'], '한국 공식 용어인 열차 보급 허가증·성옥을 기준으로 씁니다. 기간 동안 매일 로그인해 받는 성옥이 포함되므로 실제 수령일수를 반영해야 합니다.', ['실제 로그인 일수로 가치 평가.', '즉시 재화는 고대몽화 충전과 별도 비교.', '한국 Google Play 거래만 Play Points에 포함.'], '원화 가격과 결제 플랫폼은 게임 내 현재 화면을 확인하세요.', '열차 보급 허가증은 한 번에 성옥을 전부 주나요?', '아니요. 기간형 일일 보상이 포함됩니다.'),
      entry('《崩壞：星穹鐵道》列車補給憑證值不值得？星瓊與 Play Points', ['列車補給憑證', '星瓊', '古老夢華'], '繁中官方用語採「列車補給憑證」「星瓊」。商品價值包含有效期間內每日登入領取的星瓊，因此不能把理論總量當成無條件一次到帳。', ['以實際登入天數估值。', '立即需要貨幣時另比較古老夢華。', '只有台灣 Google Play 適用付款才計入 Play Points。'], '請核對當下 NT$ 價格與結帳平台。', '列車補給憑證會一次給完全部星瓊嗎？', '不會，部分價值來自每日登入領取。')
    )
  },
  {
    slug: 'zenless-inter-knot-membership', jaPath: '/games/zzz/membership-value/', gameId: 'zzz', source: ['Zenless Zone Zero official HoYoLAB payment FAQ', 'https://www.hoyolab.com/article/39121290'],
    content: localized(
      entry('Zenless Zone Zero Inter-Knot Membership: Polychrome value and Play Points', ['Inter-Knot Membership', 'Polychrome', 'Monochromes'], 'Official ZZZ payment FAQs use Inter-Knot Membership and Monochromes and explain cross-platform top-up item access for linked accounts. Cross-platform access does not mean every payment route earns Play Points.', ['Value the membership by the Polychrome you actually collect.', 'Separate cross-platform item access from payment rewards.', 'Use only the amount billed by Google Play for Play Points.'], 'Confirm the paying platform and HoYoverse account/server.', 'If the membership works across platforms, do all purchases earn Play Points?', 'No. Item access and billing eligibility are separate.'),
      entry('젠레스 존 제로 Inter-Knot Membership: 폴리크롬과 Google Play 포인트', ['Inter-Knot Membership', '폴리크롬', '모노크롬'], '지역 번역을 추측하지 않기 위해 HoYoverse 공식 결제 FAQ에서 확인되는 Inter-Knot Membership을 기준점으로 사용합니다. 한국 클라이언트 표시명과 원화 가격은 실제 결제 화면이 우선입니다.', ['기간형 보상은 실제 수령량으로 평가합니다.', '플랫폼 간 아이템 사용과 Play Points를 분리합니다.', '한국 Google Play 대상 결제만 포인트 계산에 넣습니다.'], 'HoYoverse 계정·서버와 결제 플랫폼을 확인하세요.', '공식 웹 결제도 Play Points가 쌓이나요?', 'Google Play에서 처리되는 대상 결제가 아니면 자동 적립으로 보지 않습니다.'),
      entry('《絕區零》繩網會員值不值得？菲林底片與 Google Play 點數', ['繩網會員', '菲林底片', '單色母帶'], '繁中官方活動會使用「繩網會員」「菲林底片」等名稱。會員屬期間型回饋；儲值內容可跨已連結平台使用，也不代表每種付款平台都有 Google Play 點數。', ['以實際領到的菲林底片估值。', '跨平台道具同步與付款回饋分開。', '台灣 Google Play 適用交易才計點。'], '確認 HoYoverse 帳號、伺服器與結帳平台。', '跨平台可用就代表每個平台都有 Play Points 嗎？', '不是，這是兩個不同問題。')
    )
  },
  {
    slug: 'umamusume-umasuku-google-play-vs-webstore', jaPath: '/games/umamusume/umasuku-value/', gameId: 'umamusume', source: ['Umamusume official Japan site', 'https://umamusume.jp/'],
    content: localized(
      entry('Umamusume Umasuku subscription: Japan Web Store vs Google Play', ['Umamusume: Pretty Derby', 'ウマスク (Umasuku)', 'Cygames WebStore'], 'Umasuku is a Japan-version monthly service announced at ¥980/month and later supported by Cygames WebStore. That verified Japanese product must not be converted into a fake US subscription offer.', ['If you play the Japanese version, compare Cygames WebStore with its in-app checkout.', 'Do not add US Play Points to a Cygames WebStore transaction.', 'If the global client offers a different subscription, use its own official name, USD price and terms.'], 'Treat ¥980 as Japan-version information only.', 'Is Umasuku a US product at a converted ¥980 price?', 'No. The verified ¥980 Umasuku offer belongs to the Japanese service.'),
      entry('우마무스메 우마스쿠(ウマスク) 일본판 결제: Cygames WebStore와 Google Play', ['우마무스메 프리티 더비', 'ウマスク (우마스쿠)', 'Cygames WebStore'], 'ウマスク는 일본 서비스의 월 980엔 상품이며 Cygames WebStore에서도 구매할 수 있습니다. 이 980엔을 원화로 환산해 한국판 공식 가격처럼 쓰지 않습니다.', ['일본판은 일본판 공식 구매 화면과 웹스토어를 비교합니다.', 'Cygames WebStore 결제에 한국 Play Points를 더하지 않습니다.', '한국판에 별도 상품이 있으면 한국 공식 명칭·가격을 우선합니다.'], '플레이 중인 서버와 버전을 먼저 확인하세요.', '우마스쿠 980엔을 원화로 바꾸면 한국 가격인가요?', '아니요. 일본판 공식 가격일 뿐입니다.'),
      entry('《賽馬娘 Pretty Derby》「ウマスク」日版月費：WebStore 與 Google Play 怎麼分', ['賽馬娘 Pretty Derby', 'ウマスク (Umasuku)', 'Cygames WebStore'], '「ウマスク」是日版官方月費服務，日版價格為每月 980 日圓，之後也支援 Cygames WebStore。不能直接換算成 NT$ 後當成台灣版售價。', ['玩日版時比較日版 App 與 Cygames WebStore。', '外部 WebStore 不自動累積台灣 Play Points。', '其他地區版本若有獨立月費商品，使用其官方條件。'], '先確認遊戲版本與實際付款商店。', '980 日圓可以直接當台灣月費嗎？', '不可以，這是日版商品資訊。')
    )
  },
  {
    slug: 'colorful-stage-google-play-vs-web-store', jaPath: '/games/proseka/google-play-vs-webstore/', gameId: 'proseka', source: ['HATSUNE MIKU: COLORFUL STAGE! official Web Store announcement', 'https://www.colorfulstage.com/news/detail/000852.html'],
    content: localized(
      entry('COLORFUL STAGE! Google Play vs Web Store: Crystals and Play Points', ['HATSUNE MIKU: COLORFUL STAGE!', 'Crystals', 'Web Store', 'Premium Mission Pass'], 'The global official site launched a Web Store in July 2025 and says it can provide better Crystal deals than the app, while warning that the store is unavailable in some countries and regions.', ['If available, compare the Web Store Crystal amount with Play Points from Google Play.', 'The official Web Store is an external checkout, so do not stack Play Points automatically.', 'Compare the exact current SKU because passes and limited packs change.'], 'Verify country availability and the Player ID before purchase.', 'Is the Web Store available everywhere?', 'No. The official announcement explicitly says some countries and regions are unsupported.'),
      entry('프로젝트 세카이 결제 비교: 글로벌 Web Store와 한국 Google Play', ['프로젝트 세카이', '크리스탈', 'Web Store', '미션 패스'], '글로벌 COLORFUL STAGE 공식 사이트는 Web Store를 운영하며 앱보다 유리한 Crystal 상품이 있을 수 있다고 안내하지만 일부 국가·지역에서는 이용할 수 없다고 명시합니다. 한국 서비스와 글로벌 서비스를 같은 상품표로 합치지 않습니다.', ['글로벌 Web Store 사용 가능 여부부터 확인합니다.', '한국 Google Play 대상 결제만 Play Points를 계산합니다.', '외부 상점 혜택과 Play Points를 같은 거래에 중복 적용하지 않습니다.'], '서비스 버전·운영 지역·Player ID를 확인하세요.', '글로벌 Web Store가 있으면 한국에서도 무조건 쓸 수 있나요?', '아니요. 공식 공지 자체에 지역 제한이 있습니다.'),
      entry('《世界計畫 繽紛舞台！feat. 初音未來》Google Play 與 Web Store 怎麼比？', ['世界計畫 繽紛舞台！feat. 初音未來', '水晶', '水晶商店', '七彩通行證'], '全球英文版官方有 Web Store，但官方也明示部分國家／地區無法使用。繁中版玩家應以本地水晶商店與公告為準，不把英文版方案直接翻成台灣售價。', ['台灣 Google Play 內購可依本地積點率比較。', '全球版外部 Web Store 視為另一付款路徑。', '七彩通行證／水晶商品依版本當期內容核對。'], '先確認是繁中版還是全球英文版，再確認結帳是否支援台灣。', '英文版 Web Store 有商品，台灣版就一定有嗎？', '不一定，官方本身就有地區限制。')
    )
  },
  {
    slug: 'pokemon-tcg-pocket-premium-pass', jaPath: '/games/pokepoke/premium-pass-guide/', gameId: 'pokepoke', source: ['Pokémon Support Premium Pass FAQ', 'https://support.pokemon.com/hc/en-us/articles/30331739144596-Pok%C3%A9mon-TCG-Pocket-Purchase-and-Premium-Pass-FAQ'],
    content: localized(
      entry('Pokémon TCG Pocket Premium Pass: 14-day trial, renewal and Play Points', ['Pokémon Trading Card Game Pocket', 'Premium Pass', '14-day no-cost trial'], 'Pokémon Support states that Premium Pass is valid for one month, its no-cost trial lasts 14 days, and that trial is available once per Apple Account or Google Account. It auto-renews unless canceled at least 24 hours before the trial ends.', ['A paid Google Play renewal can be evaluated for Play Points.', 'The free trial has no paid amount to earn points from.', 'A fresh save does not reset trial eligibility on the same platform account.'], 'Check the Google Account that owns the subscription and the live local price.', 'Can I get another trial with a new save?', 'Not on the same Apple or Google platform account according to official support.'),
      entry('포켓몬 카드 게임 Pocket 프리미엄 패스: 14일 무료 체험·자동 갱신·Play Points', ['포켓몬 카드 게임 Pocket', '프리미엄 패스', '14일 무료 체험'], '공식 지원에 따르면 프리미엄 패스는 1개월 단위이며 무료 체험은 14일, Apple/Google 계정당 한 번입니다. 종료 24시간 전까지 취소하지 않으면 유료 정기 결제로 전환됩니다.', ['Google Play 유료 갱신은 대상 거래로 Play Points를 확인합니다.', '무료 체험 기간 자체는 결제액 0원입니다.', '새 세이브로 같은 Google 계정의 체험 횟수가 초기화되지 않습니다.'], '구독을 소유한 Google 계정과 현재 원화 월 가격을 확인하세요.', '새 게임 데이터면 무료 체험을 다시 받을 수 있나요?', '동일 플랫폼 계정에서는 한 번이라는 공식 조건이 우선입니다.'),
      entry('Pokémon TCG Pocket「Premium Pass」：14 天免費試用、自動續訂與 Play Points', ['Pokémon TCG Pocket', 'Premium Pass', '14 天免費試用'], 'Pokémon 官方支援說明 Premium Pass 每次有效一個月，免費試用為 14 天，而且每個 Apple Account 或 Google Account 僅能使用一次；若不續訂需至少提前 24 小時取消。', ['Google Play 付費續訂才有實際金額可評估點數。', '免費試用期間不虛構 Play Points。', '換遊戲存檔不等於重置同一 Google 帳號的試用資格。'], '確認訂閱綁定的 Google 帳號與台灣商店目前 NT$ 月費。', '換存檔可以再試用 14 天嗎？', '同一平台帳號不能因此重置試用資格。')
    )
  },
  {
    slug: 'puzzle-and-dragons-pass', jaPath: '/games/pad/pad-pass-value/', gameId: 'pad', source: ['Puzzle & Dragons North America P&D Pass FAQ', 'https://www.puzzleanddragons.us/single-post/2020/06/25/pd-pass-frequently-asked-questions'],
    content: localized(
      entry('P&D Pass: US$8.99 monthly price, one-week free trial and Play Points', ['Puzzle & Dragons', 'P&D Pass', 'one-week free trial'], 'The North American official site currently lists P&D Pass at US$8.99/month (US$11.99 CAD), available through Android Google Play, with a one-week free trial once per Puzzle & Dragons account.', ['Use US$8.99 as the current US reference, not a converted Japanese ¥980 figure.', 'The free week has no paid amount until it converts.', 'Cancel at least 24 hours before trial end if you do not want renewal.'], 'Recheck the live Play Store price and trial eligibility before subscribing.', 'Is P&D Pass US$8.99 or a converted ¥980?', 'The North American official price is US$8.99; do not convert the Japanese price.'),
      entry('퍼즐앤드래곤 P&D Pass: 북미 US$8.99·1주 체험을 한국 가격처럼 쓰지 않기', ['Puzzle & Dragons', 'P&D Pass', '1주 무료 체험'], '북미 공식 사이트는 P&D Pass를 월 US$8.99, 1주 무료 체험으로 안내합니다. 이 조건을 원화로 환산해 한국판 정식 가격처럼 표시하지 않습니다.', ['북미판은 북미 공식 약관 기준입니다.', '한국 Play Points는 한국 Google Play 실제 거래만 계산합니다.', '일본 ¥980·북미 US$8.99·한국 원화 상품을 단순 환산하지 않습니다.'], '게임 버전, 스토어 국가, 무료 체험 이력을 확인하세요.', 'US$8.99을 원화로 바꾸면 한국 P&D Pass 가격인가요?', '아니요. 북미판 공식 가격일 뿐입니다.'),
      entry('Puzzle & Dragons「P&D Pass」：北美 US$8.99／一週試用，不直接換成台灣售價', ['Puzzle & Dragons', 'P&D Pass', '一週免費試用'], '北美官方目前標示 P&D Pass 每月 US$8.99，並提供一次一週免費試用。這是北美版條件，不能直接換算成台灣官方售價。', ['北美版依北美官方條款。', '台灣 Play Points 只針對台灣 Google Play 適用交易。', '不同地區的月費與福利不能只用匯率換算。'], '確認遊戲版本、Play 國家／地區與試用使用紀錄。', '北美 US$8.99 可以直接當台灣月費嗎？', '不可以，台灣實際商品要看本地商店。')
    )
  },
  {
    slug: 'arknights-monthly-card-limited-headhunting', jaPath: '/games/arknights/monthly-pass-limited-scout/', gameId: 'arknights', source: ['Arknights Global 2026 Limited Headhunting notice', 'https://www.arknights.global/news/2926'],
    content: localized(
      entry('Arknights Monthly Card and 300-roll Limited Headhunting planning', ['Arknights', 'Monthly Card', 'Limited Headhunting', 'Headhunting Data Contract'], 'An April 2026 Global notice says the featured limited Operator is awarded after 300 rolls once, while the Data Contract Shop also shows some older limited Operators at 200 contracts. The banner notice, not a static old table, is the source of truth.', ['Separate a current 300-roll featured guarantee from Data Contract exchange targets.', 'Treat Monthly Card value as gradual resources, not instant 300-roll funding.', 'Play Points come from paid Google Play transactions, not spending Orundum.'], 'Check the exact banner series, dates and 200/300-contract target.', 'Is every limited Operator always 300 contracts?', 'No. Current official notices show some older limited Operators at 200.'),
      entry('명일방주 월정액·한정 헤드헌팅 300회 계획과 Google Play 포인트', ['명일방주', '월정액', '한정 헤드헌팅', '헤드헌팅 데이터 계약'], '글로벌 2026년 공식 한정 헤드헌팅 공지는 해당 한정 오퍼레이터를 300회 후 1회 지급하고, 일부 과거 한정 오퍼레이터의 계약 요구량은 200으로 표시합니다. 한국판 일정은 한국 공식 공지를 우선합니다.', ['현행 300회 보장과 계약 교환 목표를 분리합니다.', '월정액은 기간형 자원으로 계산합니다.', '한국 Google Play 실제 유료 거래만 포인트 계산에 넣습니다.'], '한국판 배너의 현재 모집 규칙과 상품 가격을 확인하세요.', '한정 오퍼레이터는 모두 계약 300개인가요?', '아니요. 공식 공지에도 일부 과거 한정은 200개 사례가 있습니다.'),
      entry('《明日方舟》月卡與限定尋訪 300 抽規劃：Play Points 怎麼算', ['明日方舟', '月卡', '限定尋訪', '尋訪資料契約'], '國際服 2026 官方限定 Headhunting 公告明示當期限定幹員累積 300 抽後可獲得一次，同時部分較早限定幹員已降為 200 契約，表示不同目標要分開算。', ['分清楚 300 抽當期保證與契約商店交換。', '月卡屬期間型資源。', '台灣 Play Points 只來自實際 Google Play 付費交易。'], '以目前版本的限定尋訪公告與台灣遊戲內價格為準。', '所有限定幹員都固定要 300 契約嗎？', '不是，官方公告已有部分較早限定降為 200。')
    )
  },
  {
    slug: 'dokkan-google-play-vs-web-store', jaPath: '/games/dokkan/google-play-vs-webstore/', gameId: 'dokkan', source: ['DRAGON BALL Z DOKKAN BATTLE official site', 'https://dbz-dokkan.bngames.net/'],
    content: localized(
      entry('Dokkan Battle Google Play vs official Web Store: Dragon Stones and rewards', ['DRAGON BALL Z DOKKAN BATTLE', 'Dragon Stone', 'Web Store Points'], 'Bandai Namco operates an official Dokkan Battle Web Store in supported markets. The Web Store can have different Dragon Stone bundles and its own rewards; that purchase route is separate from Google Play billing.', ['Compare the live Dragon Stone count, not only the price.', 'Use Play Points only on eligible Google Play billing.', 'Never add Web Store rewards and Google Play Points together unless checkout explicitly uses Google Play.'], 'Confirm country and currency support in the official Web Store.', 'Does the Dokkan Web Store automatically give Google Play Points?', 'No. It is a separate publisher purchase route.'),
      entry('드래곤볼 Z 폭렬격전 Google Play vs 공식 Web Store: 용석과 포인트 비교', ['드래곤볼 Z 폭렬격전', '용석', 'Web Store'], '공식 Dokkan Web Store는 지원 지역에서 앱과 다른 용석 구성이나 자체 보상을 제공할 수 있습니다. Google Play 결제와는 별도 경로입니다.', ['한국 Google Play 인앱 결제에는 현재 Play Points 적립률을 비교합니다.', 'Web Store가 한국을 지원하면 현재 용석 수량과 자체 보상을 따로 비교합니다.', '해외 달러 상품을 원화 공식 가격처럼 환산하지 않습니다.'], 'Web Store 지원 국가·통화와 현재 용석 수량을 확인하세요.', '공식 Web Store 결제에 한국 Play Points가 쌓이나요?', 'Google Play에서 처리되는 결제가 아니라면 자동 적립으로 보지 않습니다.'),
      entry('《七龍珠Z 爆裂激戰》Google Play vs 官方 Web Store：龍石與回饋分開算', ['DRAGON BALL Z DOKKAN BATTLE', '龍石', 'Web Store'], '官方 Dokkan Web Store 在支援市場可能提供不同龍石組合或商店回饋。是否支援台灣、使用何種幣別與 SKU，都要看當期商店。', ['台灣 Google Play 內購依帳號積點率比較。', 'Web Store 若支援台灣，另看龍石數量與商店回饋。', '不要把 Web Store 回饋和 Google Play 點數同時加到同一筆交易。'], '確認 Web Store 支援台灣與實際付款貨幣。', '官方 Web Store 一定會有 Google Play 點數嗎？', '不會，官方商店和 Google Play 是不同付款管道。')
    )
  },
  {
    slug: 'heaven-burns-red-google-play-vs-web-shop', jaPath: '/games/hbr/google-play-vs-webshop/', gameId: 'hbr', source: ['Heaven Burns Red Taiwan official WEBSHOP', 'https://tw.heaven-burns-red.com/serial-code/'],
    content: localized(
      entry('Heaven Burns Red Web Shop vs Google Play: a region-aware buying guide', ['Heaven Burns Red', 'Quartz', 'WEB SHOP'], 'Heaven Burns Red operates localized Web Shops in some Asian markets. The Taiwan shop currently lists NT$ Quartz packs and shop points and explicitly limits purchases to Taiwan, Hong Kong and Macao. That does not create a matching US shop.', ['Use US Play Points only when your version is billed through Google Play.', 'If an official Web Shop is supported for your region, compare its own current bonus separately.', 'Do not convert Taiwan/Japan Web Shop pricing into a US offer.'], 'Open the official site for the game region you actually use.', 'Can US players treat the Taiwan WEBSHOP as a US store?', 'No. The Taiwan shop explicitly limits its purchase region.'),
      entry('헤븐 번즈 레드 WEB SHOP vs Google Play: 한국판 지원 여부부터 확인', ['헤븐 번즈 레드', '쿼츠', 'WEB SHOP'], '대만 공식 WEBSHOP은 현재 NT$ 쿼츠와 자체 포인트를 제공하지만 구매 가능 지역을 대만·홍콩·마카오로 제한합니다. 한국판은 한국 공식 사이트와 게임 내 구매 안내가 우선입니다.', ['한국 Google Play 대상 결제는 대한민국 Play Points 계산.', '다른 지역 WEBSHOP을 한국 대체 경로로 단정하지 않음.', 'WEB SHOP 포인트와 Play Points는 별개.'], '한국판 공식 결제 경로와 현재 원화 가격을 확인하세요.', '대만 WEBSHOP이 있으니 한국에서도 같은 상점을 쓰면 되나요?', '아니요. 대만 상점은 구매 가능 지역을 명시적으로 제한합니다.'),
      entry('《緋染天空 Heaven Burns Red》Google Play vs 官方 WEBSHOP：石英、5% 優惠與點數', ['緋染天空 Heaven Burns Red', '石英', '緋染天空WEBSHOP', 'WEB SHOP點數'], '台灣官方 WEBSHOP 目前直接列出 NT$ 商品，2026 年 9 月多個石英／禮包標示 5% OFF，另有 WEB 限定石英與 WEB SHOP 點數；頁面也明示購買限台灣、香港、澳門。', ['比較 WEBSHOP 當期 5% OFF、WEB限定與自家點數。', 'WEBSHOP 交易不要再加台灣 Google Play 點數。', '若選 Google Play，則以遊戲內 NT$ 與帳號積點率估算。'], '確認付費石英的平台限制、活動倍率與上限。', '台灣 WEBSHOP 會同時累積 Google Play 點數嗎？', '不會因為是官方商店就自動累積；它是獨立的 WEB 結帳。')
    )
  },
  {
    slug: 'honkai-impact-3rd-google-play-vs-top-up-center', jaPath: '/games/honkai3rd/google-play-vs-charge-center/', gameId: 'honkai3rd', source: ['Honkai Impact 3rd official site', 'https://honkaiimpact3.hoyoverse.com/'],
    content: localized(
      entry('Honkai Impact 3rd Google Play vs Top-Up Center: Crystals and Monthly Card', ['Honkai Impact 3rd', 'Top-Up Center', 'Crystals', 'Monthly Card'], 'HoYoverse operates an official Top-Up Center for Honkai Impact 3rd, with payment methods and currencies varying by country/region. It is an official but separate checkout from Google Play.', ['Compare Top-Up Center bonuses with Play Points as separate benefit columns.', 'Do not add US Play Points to an external HoYoverse checkout.', 'Check Monthly Card validity before adding more time.'], 'Confirm server, HoYoverse account, country and currency.', 'Does official Top-Up Center mean Play Points too?', 'No. Official publisher checkout is not automatically Google Play billing.'),
      entry('붕괴3rd Google Play vs 공식 충전 센터: 수정·월정액·Play Points', ['붕괴3rd', '충전 센터', '수정', '월정액'], 'HoYoverse 공식 충전 센터는 국가·지역에 따라 결제수단과 통화가 달라질 수 있습니다. 공식 경로이지만 Google Play 결제와는 별도입니다.', ['충전 센터 보너스와 한국 Play Points를 별도 항목으로 비교합니다.', '외부 충전 센터 결제에 Play Points를 자동으로 추가하지 않습니다.', '월정액 추가 구매 전 유효기간 규칙을 확인합니다.'], '서버·HoYoverse 계정·지원 통화를 확인하세요.', '공식 충전 센터 결제에 Play Points가 적립되나요?', 'Google Play Billing이 아니라면 자동 적립으로 보지 않습니다.'),
      entry('《崩壞3rd》Google Play vs 官方儲值中心：水晶、月卡與 Play Points', ['崩壞3rd', '儲值中心', '水晶', '月卡'], 'HoYoverse 官方儲值中心依國家／地區提供不同付款方式與幣別。這是官方外部結帳，不代表每筆交易都由 Google Play 處理。', ['儲值中心優惠與 Google Play Points 分開比較。', '只有台灣 Google Play 適用交易才套用積點率。', '月卡追加購買前確認剩餘有效天數與官方限制。'], '確認伺服器、HoYoverse 帳號與台灣可用付款方式。', '官方儲值中心是否等於 Google Play？', '不是，它是 HoYoverse 官方外部付款管道。')
    )
  },
  {
    slug: 'jujutsu-kaisen-phantom-parade-google-play-vs-web-shop', jaPath: '/games/phantomparade/google-play-vs-webshop/', gameId: 'phantomparade', source: ['Jujutsu Kaisen Phantom Parade official Japan Web Shop', 'https://webshop.jujutsuphanpara.jp/'],
    content: localized(
      entry('Jujutsu Kaisen Phantom Parade Web Shop vs Google Play: Japan-version guide', ['Jujutsu Kaisen Phantom Parade', '公式WEBショップ', '廻珠', 'マイルpt'], 'The Japanese official Web Shop is active and sells Web-exclusive Kaiju packs, passes and shop miles in yen. This is a Japan-service storefront; its catalog should not be currency-converted into a US/global official offer.', ['Japanese-version users can compare the Web Shop extra currency/miles with that account\'s in-app route.', 'Do not count US Play Points on the Japanese Web Shop transaction.', 'A global version must use its own official store and currency.'], 'Confirm game version, account linking and age-verification requirements.', 'Is the Japanese Web Shop a US/global store?', 'No. It is a Japanese-service storefront.'),
      entry('주술회전 팬텀 퍼레이드 일본 공식 WEB SHOP vs Google Play', ['주술회전 팬텀 퍼레이드', '일본 공식 WEB SHOP', '廻珠', '마일pt'], '일본 공식 WEB SHOP은 현재 엔화로 WEB 한정 廻珠 상품, 패스, 마일pt를 판매합니다. 이를 환율로 원화 변환해 한국판 공식 가격처럼 표시하지 않습니다.', ['일본판은 일본 공식 상점의 추가 재화와 마일을 비교합니다.', '일본 WEB SHOP 결제에 한국 Play Points를 더하지 않습니다.', '한국/글로벌 서비스는 해당 버전 공식 구매 경로를 따릅니다.'], '게임 버전, 계정 연동, 연령 인증 조건을 확인하세요.', '일본 WEB SHOP 가격을 한국 가격표처럼 환산해도 되나요?', '아니요. 서비스 버전과 계정 조건이 다릅니다.'),
      entry('《咒術迴戰》Phantom Parade 日本官方 WEB SHOP vs Google Play', ['Jujutsu Kaisen Phantom Parade', '日本官方WEB SHOP', '廻珠', 'マイルpt'], '日本官方 WEB SHOP 目前以日圓販售 WEB 限定廻珠包、通行證等商品並提供マイルpt。這些條件屬日本服務，不應換算成 NT$ 後當成台灣官方價格。', ['玩日版時比較 WEB SHOP 追加廻珠／マイルpt 與日版 App 內購。', '日本 WEB SHOP 交易不要加台灣 Google Play 點數。', '其他地區版本使用各自官方付款方式。'], '確認遊戲版本、帳號連結與年齡驗證。', '把日圓售價換成 NT$ 就是台灣價格嗎？', '不是，那仍是日本版商品。')
    )
  },
  {
    slug: 'prospi-a-google-play-vs-konami-store', jaPath: '/games/prospi-a/google-play-vs-konami-store/', gameId: 'prospi-a', source: ['PROFESSIONAL BASEBALL SPIRITS A official KONAMI site', 'https://www.konami.com/games/prospi_a/'],
    content: localized(
      entry('PROFESSIONAL BASEBALL SPIRITS A: KONAMI Games Store vs Google Play', ['PROFESSIONAL BASEBALL SPIRITS A', 'Energy', 'KONAMI Games Store'], 'KONAMI\'s official Prospi A site promotes KONAMI Games Store products that provide more Energy than in-game purchases. Prospi A is a Japanese mobile title, so this guide does not fabricate a US Energy catalog.', ['Japanese-version users can compare official Store Energy with the app checkout.', 'Do not add US Play Points to a KONAMI Games Store transaction.', 'Do not confuse Prospi A with KONAMI\'s separate global baseball titles.'], 'Use Japanese-service prices only as Japanese-service references.', 'Is Prospi A KONAMI Games Store a US store?', 'No. Prospi A is a Japan-focused mobile title.'),
      entry('프로야구 스피리츠 A: KONAMI Games Store vs Google Play 일본판 가이드', ['프로야구 스피리츠 A', '에너지', 'KONAMI Games Store'], 'KONAMI 공식 프로스피A 사이트는 게임 내 구매보다 더 많은 에너지를 얻을 수 있는 KONAMI Games Store 상품을 안내합니다. 일본 엔화 상품을 한국 공식 가격으로 환산하지 않습니다.', ['일본판은 공식 Store의 에너지 수량과 앱 내 결제를 비교합니다.', 'KONAMI Games Store 외부 결제에 한국 Play Points를 더하지 않습니다.', '다른 글로벌 야구 타이틀과 프로스피A를 혼동하지 않습니다.'], '정확한 게임 버전과 일본 스토어 결제 조건을 확인하세요.', '일본 프로스피A 가격을 원화로 바꾸면 한국 가격인가요?', '아니요. 일본 서비스 상품일 뿐입니다.'),
      entry('PROFESSIONAL BASEBALL SPIRITS A：KONAMI Games Store 與 Google Play', ['PROFESSIONAL BASEBALL SPIRITS A', 'Energy', 'KONAMI Games Store'], 'KONAMI 的 Prospi A 官方網站會推薦 KONAMI Games Store，並表示有商品可取得比遊戲內購買更多的 Energy。這是日本版服務條件，不能直接轉成台灣版價格表。', ['玩日版時比較官方 Store 的 Energy 與日版 App 內購。', 'KONAMI Games Store 外部付款不要加台灣 Google Play 點數。', '不要把 Prospi A 與 KONAMI 其他全球棒球遊戲混在一起。'], '確認實際遊玩的版本與日本 Store 帳號／付款支援。', '日圓商品換成 NT$ 就能當台灣價格嗎？', '不行，這仍然是日本服務商品。')
    )
  },
  {
    slug: 'pokemon-go-google-play-vs-web-store', jaPath: '/games/pokemon-go/google-play-vs-webstore/', gameId: 'pokemon-go', source: ['Pokémon GO Web Store', 'https://store.pokemongolive.com/'],
    content: localized(
      entry('Pokémon GO Google Play vs Web Store: PokéCoins, Reward Road and Play Points', ['Pokémon GO Web Store', 'PokéCoins', 'Reward Road'], 'Niantic operates the official Pokémon GO Web Store, where bundles and PokéCoin offers can differ from the app. Reward Road is offered only under its current regional/account conditions and is separate from Google Play Points.', ['Use Google Play when the live Play Points rate is more valuable.', 'Use the Web Store when its extra PokéCoins, bundle or Reward Road progress is stronger.', 'Do not count one purchase as both Web Store and Google Play billing.'], 'Check whether Reward Road is currently available to your region/account.', 'Do Web Store purchases earn Google Play Points?', 'Not as Google Play purchases; the Web Store has its own offers and programs.'),
      entry('Pokémon GO Google Play vs Web Store: 포켓코인·리워드 로드·Play Points', ['Pokémon GO Web Store', '포켓코인', '리워드 로드'], 'Niantic 공식 한국어 지원은 Pokémon GO Web Store, 포켓코인, 리워드 로드를 별도 체계로 안내합니다. Web Store 구매와 Google Play 앱 내 결제는 다른 경로입니다.', ['Google Play 특별 적립률이 높으면 앱 내 결제의 Play Points를 비교합니다.', 'Web Store 추가 포켓코인·리워드 로드가 크면 외부 스토어를 비교합니다.', '한 거래에 두 보상을 중복 적용하지 않습니다.'], '한국 계정에서 리워드 로드가 현재 제공되는지 확인하세요.', 'Pokémon GO Web Store에서 사면 Play Points도 적립되나요?', 'Google Play 결제가 아니므로 자동 적립 대상이 아닙니다.'),
      entry('Pokémon GO：Google Play vs Web Store，寶可幣、獎勵之路與 Play Points', ['Pokémon GO Web Store', '寶可幣', '獎勵之路'], 'Niantic 官方繁中支援使用 Pokémon GO Web Store、寶可幣、獎勵之路等名稱。Web Store 的組合與活動可能不同於 App，獎勵之路也有地區／期間條件。', ['Google Play 積點活動高時比較 App 內購。', 'Web Store 多送寶可幣或能推進獎勵之路時比較外部商店。', '同一筆 Web Store 交易不要再加 Google Play 點數。'], '確認台灣帳號是否顯示獎勵之路與當期條件。', 'Web Store 買寶可幣會有 Google Play 點數嗎？', '不會把外部 Web Store 交易自動視為 Google Play 購買。')
    )
  },
  {
    slug: 'efootball-google-play-points-vs-efootball-points', jaPath: '/games/efootball/google-play-points-vs-efootball-points/', gameId: 'efootball', source: ['eFootball Points official overview', 'https://www.konami.com/wepes/efootball_point/en-us/'],
    content: localized(
      entry('Google Play Points vs eFootball Points: two completely different currencies', ['Google Play Points', 'eFootball Points', 'eFootball Coins', 'KONAMI ID'], 'KONAMI defines eFootball Points as the eFootball Point Program currency earned through eFootball activities/campaigns and redeemed for in-game items after linking a KONAMI ID. eFootball Coins are another separate virtual currency.', ['Eligible Google Play purchases of eFootball Coins can earn Google Play Points.', 'Google Play Points do not convert into eFootball Points.', 'KONAMI says claimed eFootball Points expire at the end of the month six months after claim.'], 'Keep Google Play Points, eFootball Points and eFootball Coins as three separate balances.', 'Can I convert Google Play Points directly to eFootball Points?', 'No. They are separate reward systems issued by different companies.'),
      entry('Google Play 포인트 vs eFootball™ 포인트: 서로 다른 포인트를 구분해서 계산', ['Google Play 포인트', 'eFootball™ 포인트', 'eFootball™ 코인', 'KONAMI ID'], 'KONAMI 공식 한국어 사이트는 eFootball™ 포인트를 게임 활동·캠페인 등으로 획득해 아이템으로 교환하는 프로그램 포인트로 안내합니다. Google Play 포인트와 eFootball™ 코인 모두 별개입니다.', ['Google Play에서 eFootball 코인을 유료 구매한 대상 거래는 Play Points를 확인할 수 있습니다.', 'Google Play 포인트가 eFootball™ 포인트로 자동 전환되지 않습니다.', 'KONAMI 포인트는 수령 후 6개월 뒤 해당 월 말에 만료되는 자체 규칙이 있습니다.'], '세 종류의 포인트/코인을 별도 잔액으로 관리하세요.', 'Google Play 포인트를 eFootball™ 포인트로 바꿀 수 있나요?', '직접 전환할 수 있는 같은 포인트 제도가 아닙니다.'),
      entry('Google Play 點數 vs eFootball™點數：兩套完全不同的回饋系統', ['Google Play 點數', 'eFootball™點數', 'eFootball™ Coins', 'KONAMI ID'], 'KONAMI 將 eFootball™點數定義為 eFootball Point Program 的點數，可透過遊戲活動／企劃取得並在連結 KONAMI ID 後兌換遊戲內道具。它不是 Google Play Points，也和 eFootball™ Coins 不同。', ['台灣 Google Play 付費購買 Coins 的適用交易可依積點率計算。', 'Google Play 點數不會自動變成 eFootball™點數。', 'KONAMI 官方說明已領取點數在六個月後該月月底到期。'], '把 Google Play 點數、eFootball™點數、Coins 三者分開。', 'Google Play 點數可以直接換 eFootball™點數嗎？', '不可以，它們是不同公司發行、不同用途的回饋系統。')
    )
  }
]);

const ALL_GUIDES = GUIDES;

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function descriptionFor(content, localeKey) {
  const prefix = localeKey === 'en' ? 'Region-aware game purchase guide. ' : localeKey === 'ko' ? '지역별 공식 조건을 확인하는 게임 결제 가이드. ' : '依地區官方條件整理的遊戲消費指南。';
  return (prefix + content.market).slice(0, 180);
}
function hrefFor(localeKey, slug) { return `/${localeKey}/articles/${slug}.html`; }
function getLocalizedGameGuideLinks(localeKey) { return ALL_GUIDES.map(guide => [hrefFor(localeKey, guide.slug), guide.content[localeKey].title]); }
function getLocalizedGameGuideJapaneseAlternates() { return Object.fromEntries(ALL_GUIDES.map(guide => [`${guide.slug}.html`, guide.jaPath])); }
function isLocalizedGameGuideArticlePath(value) { return /^(?:en|ko|tw)\/articles\/[^/]+\.html$/.test(String(value || '')) && ALL_GUIDES.some(guide => String(value).endsWith(`/${guide.slug}.html`)); }
function assertCatalog() {
  if (ALL_GUIDES.length !== 17) throw new Error(`Expected 17 localized game guides, got ${ALL_GUIDES.length}`);
  const slugs = new Set();
  for (const guide of ALL_GUIDES) {
    if (slugs.has(guide.slug)) throw new Error(`Duplicate localized game guide slug: ${guide.slug}`);
    slugs.add(guide.slug);
    for (const localeKey of Object.keys(LOCALES)) {
      const content = guide.content[localeKey];
      if (!content?.title || !content?.market || content.terms.length < 2 || content.decisions.length < 3) throw new Error(`${guide.slug}/${localeKey}: incomplete localized content`);
    }
  }
}
function renderJsonLd(localeKey, guide, content, description) {
  const url = SITE_ORIGIN + hrefFor(localeKey, guide.slug);
  return JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: content.title, description, url, inLanguage: LOCALES[localeKey].lang, datePublished: PUBLISHED_AT, dateModified: MODIFIED_AT, author: { '@type': 'Person', name: 'Katakata', url: `${SITE_ORIGIN}/${localeKey}/author/katakata.html` }, publisher: { '@type': 'Organization', name: LOCALES[localeKey].siteName, url: SITE_ORIGIN } }).replace(/</g, '\\u003c');
}
function renderFaqJsonLd(content) { return JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: content.faqQ, acceptedAnswer: { '@type': 'Answer', text: content.faqA } }] }).replace(/</g, '\\u003c'); }
function renderGuide(localeKey, guide) {
  const locale = LOCALES[localeKey];
  const content = guide.content[localeKey];
  const description = descriptionFor(content, localeKey);
  const canonical = SITE_ORIGIN + hrefFor(localeKey, guide.slug);
  const parent = `/${localeKey}/games/${guide.gameId}/`;
  const terms = content.terms.map(term => `<li><strong>${escapeHtml(term)}</strong></li>`).join('');
  const decisions = content.decisions.slice(1).map(item => `<li>${escapeHtml(item)}</li>`).join('');
  return `<!DOCTYPE html>\n<html lang="${locale.lang}">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>${escapeHtml(content.title)}</title>\n<meta name="description" content="${escapeHtml(description)}">\n<meta name="robots" content="index, follow, max-image-preview:large">\n<meta name="author" content="Katakata">\n<meta name="playpoint:official-verified" content="${MODIFIED_AT}">\n<meta name="last-modified" content="${MODIFIED_AT}">\n<link rel="canonical" href="${canonical}">\n<link rel="alternate" hreflang="ja" href="${SITE_ORIGIN}${guide.jaPath}">\n<link rel="alternate" hreflang="en" href="${SITE_ORIGIN}${hrefFor('en', guide.slug)}">\n<link rel="alternate" hreflang="ko" href="${SITE_ORIGIN}${hrefFor('ko', guide.slug)}">\n<link rel="alternate" hreflang="zh-TW" href="${SITE_ORIGIN}${hrefFor('tw', guide.slug)}">\n<link rel="alternate" hreflang="x-default" href="${SITE_ORIGIN}${hrefFor('en', guide.slug)}">\n<link rel="icon" href="/favicon.svg" type="image/svg+xml">\n<link rel="stylesheet" href="/articles/article-shared.css">\n<meta property="og:type" content="article">\n<meta property="og:title" content="${escapeHtml(content.title)}">\n<meta property="og:description" content="${escapeHtml(description)}">\n<meta property="og:url" content="${canonical}">\n<meta property="og:image" content="${SITE_ORIGIN}/ogp.png">\n<meta name="twitter:card" content="summary_large_image">\n<script type="application/ld+json">${renderJsonLd(localeKey, guide, content, description)}</script>\n<script type="application/ld+json">${renderFaqJsonLd(content)}</script>\n</head>\n<body>\n<main id="main-content" class="main-card">\n<div class="hero"><span class="hero-badge">${escapeHtml(locale.badge)}</span><h1 id="article-title">${escapeHtml(content.title)}</h1><p class="article-region-scope">${escapeHtml(locale.scope)}</p><p class="hero-meta">${locale.published} <time data-article-date="published" datetime="${PUBLISHED_AT}">${PUBLISHED_AT}</time> · ${locale.updated} <time data-article-date="modified" datetime="${MODIFIED_AT}">${MODIFIED_AT}</time> · ${locale.verified} <time data-article-date="official-verified" datetime="${MODIFIED_AT}">${MODIFIED_AT}</time></p></div>\n<article class="content">\n<div class="intro">${escapeHtml(content.market)}</div>\n<div class="decision-box"><strong>${escapeHtml(locale.decision)}</strong><p>${escapeHtml(content.decisions[0])}</p></div>\n<nav class="intl-article-toc" aria-label="${escapeHtml(locale.toc)}"><h2>${escapeHtml(locale.toc)}</h2><ol><li><a href="#official-source-scope">${escapeHtml(locale.official)}</a></li><li><a href="#decision-guide">${escapeHtml(locale.decision)}</a></li><li><a href="#before-paying">${escapeHtml(locale.before)}</a></li></ol></nav>\n<section class="section" id="official-source-scope"><h2>${escapeHtml(locale.official)}</h2><p>${escapeHtml(content.market)}</p><p>${escapeHtml(localeKey === 'en' ? 'Official terminology used on this page:' : localeKey === 'ko' ? '이 페이지에서 사용하는 공식 용어:' : '本頁採用的官方用語：')}</p><ul>${terms}</ul></section>\n<aside class="decision-box article-common-rule" aria-label="${escapeHtml(locale.commonRule)}"><strong>${escapeHtml(locale.commonRule)}</strong><ul><li>${escapeHtml(locale.googleRule)}</li><li>${escapeHtml(locale.routeRule)}</li></ul></aside>\n<section class="section" id="decision-guide"><h2>${escapeHtml(locale.decision)}</h2><ul>${decisions}</ul></section>\n<section class="section" id="before-paying"><h2>${escapeHtml(locale.before)}</h2><p>${escapeHtml(content.caveat)}</p><p>${escapeHtml(localeKey === 'en' ? 'Recheck the live price, supported country, account and checkout provider immediately before payment.' : localeKey === 'ko' ? '결제 직전에 현재 가격, 지원 국가, 계정, 실제 결제 사업자를 다시 확인하세요.' : '付款前請再次確認即時價格、支援地區、帳號與實際結帳服務商。')}</p></section>\n<div class="cta-box"><h3>${escapeHtml(locale.ctaTitle)}</h3><p>${escapeHtml(locale.ctaBody)}</p><a class="cta-btn" href="${parent}">${escapeHtml(locale.ctaButton)}</a></div>\n<aside class="official-source-note"><h2>${escapeHtml(locale.sources)}</h2><ul><li><a href="${escapeHtml(locale.googleUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(locale.earningRuleLink)}</a></li><li><a href="${escapeHtml(locale.levelsUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(locale.levelsRuleLink)}</a></li><li><a href="${escapeHtml(guide.source[1])}" target="_blank" rel="noopener noreferrer">${escapeHtml(guide.source[0])}</a></li></ul></aside>\n<section class="section"><h2>${escapeHtml(locale.faq)}</h2><h3>${escapeHtml(content.faqQ)}</h3><p>${escapeHtml(content.faqA)}</p></section>\n<section class="section related-links-section"><h2>${escapeHtml(locale.related)}</h2><ul><li><a href="/${localeKey}/articles/">${escapeHtml(locale.back)}</a></li><li><a href="/${localeKey}/articles/google-play-points-promotion-stacking.html">Google Play Points</a></li><li><a href="${parent}">${escapeHtml(locale.ctaButton)}</a></li></ul></section>\n</article>\n<aside class="author-box" aria-label="${escapeHtml(locale.authorAria)}"><p class="author-box-label">${escapeHtml(locale.authorLabel)}</p><p class="author-box-name"><a href="/${localeKey}/author/katakata.html" rel="author">Katakata</a></p><p>${escapeHtml(locale.authorText)}</p></aside>\n<footer class="article-footer"><p><a href="/${localeKey}/articles/">${escapeHtml(locale.back)}</a> | <a href="/${localeKey}/">${escapeHtml(locale.home)}</a></p><p class="site-footer-trademark">${escapeHtml(locale.trademark)}</p></footer>\n</main>\n<script src="/js/analytics-core.js"></script>\n<script src="/js/intent-tracking.js"></script>\n<script src="/js/third-party.js"></script>\n<script src="/blog/article.js"></script>\n</body>\n</html>\n`;
}
function writeLocalizedGameGuides(rootDir) {
  assertCatalog();
  const summary = { checked: 0, changed: 0, files: [] };
  for (const localeKey of Object.keys(LOCALES)) {
    const dir = path.join(rootDir, localeKey, 'articles');
    fs.mkdirSync(dir, { recursive: true });
    for (const guide of ALL_GUIDES) {
      const file = path.join(dir, `${guide.slug}.html`);
      const next = renderGuide(localeKey, guide);
      const before = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
      summary.checked++;
      if (before === next) continue;
      fs.writeFileSync(file, next, 'utf8');
      summary.changed++;
      summary.files.push(path.relative(rootDir, file).replaceAll('\\', '/'));
    }
  }
  return summary;
}

assertCatalog();

module.exports = { ALL_GUIDES, LOCALES, PUBLISHED_AT, MODIFIED_AT, getLocalizedGameGuideLinks, getLocalizedGameGuideJapaneseAlternates, hrefFor, isLocalizedGameGuideArticlePath, renderGuide, writeLocalizedGameGuides };
