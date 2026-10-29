'use strict';

const { DESCRIPTIONS, getJapaneseCalculator, renderSpecialOffers } = require('./game-calculator-presentation.cjs');
const fs = require('node:fs');
const path = require('node:path');
const { VERIFIED_AT, SOURCES, GAME_SEO_WAVE5 } = require('./game-seo-wave5-data.cjs');
const { articleForPath } = require('./game-guide-article-catalog.cjs');

const LOCALES = Object.freeze(['ja', 'en', 'ko', 'tw']);
const GAME_ORDER = Object.freeze(['prospi-a', 'pokemon-go', 'efootball']);

const COPY = Object.freeze({
  ja: {
    htmlLang: 'ja', dir: '', home: 'ホーム', games: 'ゲーム別計算', guides: '記事一覧', operator: '運営者',
    badge: '🔎 公式情報を基準に検証', verified: '最終確認', input: 'Google Playの表示額を入力',
    pack: '課金額', count: '購入回数', amount: '課金予定合計額（円）', earnRate: 'キャンペーン特別獲得率', status: '現在の会員ランク',
    total: '課金合計金額', points: '獲得予定 Playポイント', value: '交換価値（Play画面で確認）', rank: '0ptから見た参考ランク', progress: '0ptから見た参考進捗',
    share: '𝕏 で計算結果をシェア', copy: '🔗 結果リンクをコピー', source: '公式確認ソース',
    boundary: 'Google Play以外のWebストア・独自ポイントは別の購入経路・制度です。Google Play Pointsとして合算しません。現行の商品価格は実際の購入画面を購入前に確認してください。',
    ad: '広告', open: '計算機を開く ➔', currentAmount: '現行価格をGoogle Playで確認して入力', related: 'このゲームを深掘り',
    faqQ: 'このゲームの課金でGoogle Play Pointsは貯まりますか？',
    faqA: 'Google Play上の対象購入として処理され、購入画面に獲得予定ポイントが表示される場合に計算対象として確認できます。Webストアなど別決済はGoogle Play Pointsと分けてください。'
  },
  en: {
    htmlLang: 'en', dir: 'en/', home: 'Home', games: 'Game calculators', guides: 'Guides', operator: 'About',
    badge: '🔎 Verified against official sources', verified: 'Last checked', input: 'Enter the amount shown by Google Play',
    pack: 'Purchase amount', count: 'Purchases', amount: 'Planned Google Play spend', earnRate: 'Special earn rate', status: 'Current Play Points tier',
    total: 'Total spend', points: 'Estimated Play Points', value: 'Redemption value (check Play)', rank: 'Reference tier from 0 pts', progress: 'Reference progress from 0 pts',
    share: 'Share result on 𝕏', copy: '🔗 Copy result link', source: 'Official sources',
    boundary: 'Web stores and publisher-specific reward programs are separate from Google Play. Do not add them to Google Play Points. Current prices are taken from the checkout screen rather than hard-coded here.',
    ad: 'Advertisement', open: 'Open calculator ➔', currentAmount: 'Check Google Play and enter the current amount', related: 'Decision guide',
    faqQ: 'Can purchases for this game earn Google Play Points?',
    faqA: 'Use the Google Play checkout as the final authority. If the purchase is processed as an eligible Google Play purchase and an expected-points amount is shown, use that amount. Web-store purchases are separate.'
  },
  ko: {
    htmlLang: 'ko', dir: 'ko/', home: '홈', games: '게임별 계산', guides: '가이드', operator: '운영자',
    badge: '🔎 공식 정보를 기준으로 검증', verified: '최종 확인', input: 'Google Play에 표시된 금액 입력',
    pack: '결제 금액', count: '구매 횟수', amount: 'Google Play 결제 예정 총액', earnRate: '특별 적립률', status: '현재 Play Points 등급',
    total: '총 결제 금액', points: '예상 Play Points', value: '교환 가치(Play에서 확인)', rank: '0pt 기준 참고 등급', progress: '0pt 기준 참고 진행도',
    share: '𝕏에 결과 공유', copy: '🔗 결과 링크 복사', source: '공식 확인 출처',
    boundary: '공식 웹 스토어와 퍼블리셔 자체 포인트는 Google Play와 별도 결제·보상 체계입니다. Google Play Points와 합산하지 않습니다. 현재 가격은 실제 결제 화면을 기준으로 합니다.',
    ad: '광고', open: '계산기 열기 ➔', currentAmount: 'Google Play에서 현재 가격 확인 후 입력', related: '관련 의사결정 가이드',
    faqQ: '이 게임 결제로 Google Play Points를 적립할 수 있나요?',
    faqA: 'Google Play 결제 화면을 최종 기준으로 확인하세요. 적격 Google Play 구매로 처리되고 예상 적립 포인트가 표시되는 경우 그 금액을 계산에 사용할 수 있습니다. 웹 스토어 결제는 별도입니다.'
  },
  tw: {
    htmlLang: 'zh-Hant', dir: 'tw/', home: '首頁', games: '遊戲計算', guides: '攻略', operator: '營運者',
    badge: '🔎 依官方資訊驗證', verified: '最後確認', input: '輸入 Google Play 顯示的金額',
    pack: '課金金額', count: '購買次數', amount: '預計 Google Play 課金總額', earnRate: '活動特殊積點率', status: '目前 Play Points 等級',
    total: '課金總額', points: '預估 Play Points', value: '兌換價值（請在 Play 確認）', rank: '從 0pt 起算的參考等級', progress: '從 0pt 起算的參考進度',
    share: '分享到 𝕏', copy: '🔗 複製結果連結', source: '官方確認來源',
    boundary: '官方 Web 商店與遊戲商自有點數屬於 Google Play 之外的付款／回饋制度，不可與 Google Play Points 合併計算。現行價格以實際結帳畫面為準。',
    ad: '廣告', open: '開啟計算器 ➔', currentAmount: '在 Google Play 確認現行價格後輸入', related: '延伸判斷指南',
    faqQ: '這款遊戲的課金可以累積 Google Play Points 嗎？',
    faqA: '請以 Google Play 結帳畫面為最終依據。若交易屬於符合資格的 Google Play 購買且顯示預估積點，即可用該金額計算；Web 商店付款屬於另一條路徑。'
  }
});

const GAME_COPY = Object.freeze({
  'prospi-a': {
    ja: { name: 'プロ野球スピリッツA (プロスピA)', short: 'プロスピA', description: 'プロスピAのAndroid/Google Play課金予定額からPlay Pointsを計算。KONAMI Gamesストアは別決済として分離し、パワスピ・ゴールドやdポイントとの違いも確認できます。', note: 'Androidのアプリ内エナジー購入はGoogleアカウントの支払い方法でストア決済されます。KONAMI Gamesストアは別のWEB決済です。', guide: 'Google PlayとKONAMI Gamesストアはどっちがお得？' },
    en: { name: 'Pro Yakyuu Spirits A (Japan reference)', short: 'Prospi A', description: 'Japan-reference Google Play Points calculator for Pro Yakyuu Spirits A. Enter the current Google Play checkout amount and keep KONAMI Games Store rewards separate.', note: 'This page documents the Japan Android purchase flow. The calculator below uses US dollars and US Play country rates; it does not convert Japanese prices. For yen purchases on a Japan Play account, use the <a href="/games/prospi-a/" hreflang="ja">Japan calculator</a>. Availability outside Japan is not guaranteed. KONAMI confirms in-app Energy purchases use the OS account payment method, while KONAMI Games Store is a separate web checkout.' },
    ko: { name: '프로야구 스피리츠 A (일본판 기준)', short: '프로스피 A', description: '일본판 프로스피 A의 Google Play 결제액으로 Play Points를 계산합니다. KONAMI Games 스토어의 자체 보상은 Google Play Points와 분리합니다.', note: '이 페이지는 일본판 Android 결제 흐름을 기준으로 합니다. 아래 계산기는 한국 Play 계정의 원화 기준이며 일본 가격을 환산하지 않습니다. 일본 계정의 엔화 결제는 <a href="/games/prospi-a/" hreflang="ja">일본어 계산기</a>를 사용하세요. 한국 계정에서의 구매 가능 여부는 보장하지 않습니다. 앱 내 에너지 구매와 KONAMI Games 스토어는 서로 다른 결제 경로입니다.' },
    tw: { name: '職業棒球之魂 A（日本版參考）', short: 'Prospi A', description: '以日本版職業棒球之魂 A 的 Google Play 實際結帳金額估算 Play Points，並將 KONAMI Games 商店的自有回饋分開處理。', note: '本頁以日本版 Android 購買流程作為參考。下方計算器採用台灣 Play 帳號與新台幣規則，不會換算日本售價。日本帳號的日圓購買請使用<a href="/games/prospi-a/" hreflang="ja">日本計算器</a>，本頁不保證台灣帳號可購買。App 內 Energy 購買與 KONAMI Games 商店是不同付款路徑。' }
  },
  'pokemon-go': {
    ja: { name: 'Pokémon GO', short: 'Pokémon GO', description: 'Pokémon GOのGoogle Play課金予定額からPlay Pointsを計算。AndroidはGoogle PlayとGalaxy Storeを区別し、Web Storeのボーナスポケコイン・Reward Roadも別軸で比較できます。', note: 'Androidのアプリ内購入はGoogle PlayまたはGalaxy Storeで完了します。Play Pointsを数えるのはGoogle Play決済として表示される購入だけです。', guide: 'Google PlayとWeb Storeはどっちがお得？' },
    en: { name: 'Pokémon GO', short: 'Pokémon GO', description: 'Calculate Google Play Points from your Pokémon GO Google Play checkout amount, while separating Galaxy Store and the Pokémon GO Web Store with its bonus PokéCoins and Reward Road.', note: 'On Android, Niantic says purchases can be completed through Google Play or Galaxy Store. Count Google Play Points only when Google Play is the actual checkout route.' },
    ko: { name: 'Pokémon GO', short: 'Pokémon GO', description: 'Pokémon GO의 실제 Google Play 결제 금액으로 Play Points를 계산하고 Galaxy Store 및 Web Store의 보너스 포켓코인·Reward Road는 별도로 비교합니다.', note: 'Android에서는 Google Play 또는 Galaxy Store로 결제될 수 있습니다. Google Play 결제로 표시된 경우에만 Play Points를 계산하세요.' },
    tw: { name: 'Pokémon GO', short: 'Pokémon GO', description: '以 Pokémon GO 的 Google Play 實際結帳金額估算 Play Points，並將 Galaxy Store 與 Web Store 的額外寶可幣、Reward Road 分開比較。', note: 'Android 購買可能經由 Google Play 或 Galaxy Store。只有實際由 Google Play 結帳的交易才應計入 Play Points。' }
  },
  efootball: {
    ja: { name: 'eFootball™', short: 'eFootball', description: 'eFootball™コインのGoogle Play課金予定額からPlay Pointsを計算。KONAMI独自のeFootball™ポイントとは別制度として整理し、混同を防ぎます。', note: 'AndroidのeFootball™コイン購入でGoogle Playが利用されることは公式確認済みです。eFootball™ポイントはKONAMI独自制度で、Google Play Pointsとは別物です。', guide: 'Google Play PointsとeFootballポイントの違い' },
    en: { name: 'eFootball™', short: 'eFootball', description: 'Calculate Google Play Points from your eFootball Coin Google Play spend and keep KONAMI eFootball Points clearly separate from Google Play Points.', note: 'KONAMI has official notices for Google Play users purchasing eFootball Coins. eFootball Points are a separate KONAMI reward currency, not Google Play Points.' },
    ko: { name: 'eFootball™', short: 'eFootball', description: 'eFootball 코인의 Google Play 결제액으로 Play Points를 계산하고 KONAMI의 eFootball 포인트와 Google Play Points를 명확히 구분합니다.', note: 'eFootball 코인의 Google Play 구매 경로는 공식 안내로 확인됩니다. eFootball 포인트는 KONAMI 자체 포인트로 Google Play Points와 별개입니다.' },
    tw: { name: 'eFootball™', short: 'eFootball', description: '以 eFootball 金幣的 Google Play 實際課金金額估算 Play Points，並明確區分 KONAMI 的 eFootball 點數與 Google Play Points。', note: '官方已確認 eFootball 金幣存在 Google Play 購買路徑；eFootball 點數是 KONAMI 自有制度，並非 Google Play Points。' }
  }
});

// 本文と一覧カードに同じ日本語紹介文を使う。
for (const slug of GAME_ORDER) GAME_COPY[slug].ja.description = DESCRIPTIONS[slug];

const GUIDE_PATHS = Object.freeze({
  'prospi-a': 'google-play-vs-konami-store',
  'pokemon-go': 'google-play-vs-webstore',
  efootball: 'google-play-points-vs-efootball-points'
});

function writeIfChanged(rootDir, relativePath, content) {
  const filePath = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const normalized = content.replace(/\r\n/g, '\n');
  const previous = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
  // 個別に編集した登録記事の本文は、汎用生成で旧版へ戻さない。
  if (articleForPath(relativePath) && previous?.includes('data-editorial-flow="2026-10"')) return false;
  if (previous === normalized) return false;
  fs.writeFileSync(filePath, normalized, 'utf8');
  return true;
}

function localePrefix(locale) {
  return locale === 'ja' ? '' : `${locale}/`;
}

function pageRootPrefix(locale) {
  return locale === 'ja' ? '../../' : '../../../';
}

function canonicalFor(locale, slug) {
  return `https://playpoint-sim.com/${localePrefix(locale)}games/${slug}/`;
}

function alternates(slug) {
  return `<link rel="alternate" hreflang="ja" href="https://playpoint-sim.com/games/${slug}/" />\n  <link rel="alternate" hreflang="en" href="https://playpoint-sim.com/en/games/${slug}/" />\n  <link rel="alternate" hreflang="ko" href="https://playpoint-sim.com/ko/games/${slug}/" />\n  <link rel="alternate" hreflang="zh-TW" href="https://playpoint-sim.com/tw/games/${slug}/" />\n  <link rel="alternate" hreflang="x-default" href="https://playpoint-sim.com/games/${slug}/" />`;
}

function sourceLinks(slug, locale) {
  const cfg = GAME_SEO_WAVE5[slug];
  const country = { ja: 'JP', en: 'US', ko: 'KR', tw: 'TW' }[locale];
  const language = { ja: 'ja', en: 'en', ko: 'ko', tw: 'zh-Hant' }[locale];
  return cfg.sources.map(url => url.includes('support.google.com/googleplay/')
    ? url.replace('CountryCode%3DJP', 'CountryCode%3D' + country).replace('hl=ja', 'hl=' + language) : url).map((url, index) => `<li><a href="${url}" target="_blank" rel="noopener noreferrer">${locale === 'ja' ? `公式ソース ${index + 1}` : locale === 'ko' ? `공식 출처 ${index + 1}` : locale === 'tw' ? `官方來源 ${index + 1}` : `Official source ${index + 1}`}</a></li>`).join('');
}

function statusOptions(locale) {
  const labels = {
    ja: ['ブロンズ', 'シルバー', 'ゴールド', 'プラチナ', 'ダイヤモンド'],
    en: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'],
    ko: ['브론즈', '실버', '골드', '플래티넘', '다이아몬드'],
    tw: ['銅級', '銀級', '金級', '白金級', '鑽石級']
  }[locale];
  return [1, 1.25, 1.5, 1.75, 2].map((value, i) => `<option value="${value}">${labels[i]}（100${locale === 'en' ? ' JPY' : '円'}=${value}pt）</option>`).join('');
}

function earnRateOptions(locale) {
  const base = locale === 'ja' ? '通常' : locale === 'ko' ? '기본' : locale === 'tw' ? '一般' : 'Standard';
  const special = locale === 'ja' ? '特別獲得率' : locale === 'ko' ? '특별 적립률' : locale === 'tw' ? '特殊積點率' : 'Special earn rate';
  return `<option value="1">${base} / 100円あたり1pt</option>${[2,3,4,5,7].map(rate => `<option value="${rate}">${special}: 100円あたり${rate}pt</option>`).join('')}`;
}

function adMarkup(locale) {
  const c = COPY[locale];
  return `<div class="game-ad-container" tabindex="0" role="region" aria-label="${c.ad}"><span class="game-ad-label">${c.ad}</span><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-3845885843809455" data-ad-slot="8250492620" data-full-width-responsive="false"></ins></div>`;
}

function parentPage(slug, locale) {
  const c = COPY[locale];
  const g = GAME_COPY[slug][locale];
  const cfg = GAME_SEO_WAVE5[slug];
  const root = pageRootPrefix(locale);
  const canonical = canonicalFor(locale, slug);
  const guide = locale === 'ja' ? `<section class="section"><h2>${c.related}</h2><p><a href="./${GUIDE_PATHS[slug]}/">${g.guide} ➔</a></p></section>` : '';
  const faq = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: c.faqQ, acceptedAnswer: { '@type': 'Answer', text: c.faqA } }] };
  const app = { '@context': 'https://schema.org', '@type': 'WebApplication', name: `${g.name} Google Play Points Calculator`, url: canonical, applicationCategory: 'UtilityApplication', operatingSystem: 'All', inLanguage: c.htmlLang, offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' }, author: { '@type': 'Person', name: 'かたかた', url: 'https://playpoint-sim.com/author/katakata.html' } };
  const breadcrumb = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: c.home, item: `https://playpoint-sim.com/${localePrefix(locale)}` },
    { '@type': 'ListItem', position: 2, name: c.games, item: `https://playpoint-sim.com/${localePrefix(locale)}games/` },
    { '@type': 'ListItem', position: 3, name: g.name, item: canonical }
  ] };
  return `<!doctype html>
<html lang="${c.htmlLang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <meta name="last-modified" content="${VERIFIED_AT}" />
  <meta name="author" content="かたかた" />
  <link rel="icon" href="${root}favicon.svg" type="image/svg+xml" />
  <title>${g.name} - Google Play Points Calculator | PlayPoint</title>
  <meta name="description" content="${g.description}" />
  <link rel="canonical" href="${canonical}" />
  ${alternates(slug)}
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Playポイント計算機" />
  <meta property="og:title" content="${g.name} - Google Play Points Calculator" />
  <meta property="og:description" content="${g.description}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="https://playpoint-sim.com/ogp.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="stylesheet" href="${root}articles/article-shared.css?v=1f3377e639" />
  <link rel="stylesheet" href="${root}games/games.css?v=09016b3c58" />
  <script type="application/ld+json">${JSON.stringify(app)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>
  <script type="application/ld+json">${JSON.stringify(faq)}</script>
</head>
<body>
  <header class="site-header"><div class="site-header-inner"><a class="site-logo" href="${root}"><span class="site-logo-icon">🎮</span><span class="site-logo-text">PlayPoint</span></a></div></header>
  <nav class="global-nav" aria-label="${c.games}"><div class="global-nav-inner"><a class="nav-item" href="${root}"><span>${c.home}</span></a><a class="nav-item active" href="../"><span>${c.games}</span></a><a class="nav-item" href="${root}${locale === 'ja' ? 'blog/' : `${locale}/articles/`}"><span>${c.guides}</span></a><a class="nav-item" href="${root}${locale === 'ja' ? 'author/katakata.html' : `${locale}/author/katakata.html`}"><span>${c.operator}</span></a></div></nav>
  <div class="breadcrumbs-wrapper"><nav aria-label="Breadcrumb"><a href="${root}">${c.home}</a> <span>&gt;</span> <a href="../">${c.games}</a> <span>&gt;</span> <span>${g.name}</span></nav></div>
  <div class="game-page-container"><main class="game-main-content">
    <header class="game-header"><span class="game-badge">${c.badge}</span><h1 class="game-title">${g.name}</h1><p class="game-meta">${locale === 'ja' ? 'Google Playでの購入額からPlayポイントを計算' : `${c.verified}: ${VERIFIED_AT} ｜ Google Play Points`}</p></header>
    <p>${g.description}</p>
    <p>${g.note}</p>
${locale === 'ja' ? renderSpecialOffers(getJapaneseCalculator({ id: slug }).offers, g.short) : ''}
    <section class="game-sim-card" id="game-calculator"><h2 class="game-sim-title">🧮 ${g.short}</h2>
${locale === 'ja' ? '      <p class="game-sim-lead">Google Play購入画面の金額を入力すると、貯まるポイントが分かります。</p>' : `      <p class="preset-heading">▼ ${c.input}</p>
      <div class="preset-buttons"><button type="button" class="preset-btn active" data-amount="0" data-mult="1" aria-pressed="true">${c.input}</button></div>
`}
      <form id="game-sim-form"${locale === 'ja' ? ' data-input-mode="amount"' : ''}><div class="input-grid">
${locale === 'ja' ? '' : `        <div class="input-field"><label for="sim-pack-select">${c.pack}:</label><select id="sim-pack-select"><option value="custom" selected>${c.currentAmount}</option></select></div>
        <div class="input-field"><label for="sim-pack-count">${c.count}:</label><input type="number" id="sim-pack-count" value="1" min="1" max="999" inputmode="numeric"></div>
`}
        <div class="input-field"><label for="sim-custom-amount">${c.amount}:</label><input type="number" id="sim-custom-amount" value="0" min="0" step="any" inputmode="decimal"></div>
        <div class="input-field"><label for="sim-multiplier">${c.earnRate}:</label><select id="sim-multiplier">${earnRateOptions(locale)}</select></div>
        <div class="input-field"><label for="sim-status">${c.status}:</label><select id="sim-status">${statusOptions(locale)}</select></div>
      </div></form>
      <div class="game-result-container"><div class="result-main-grid">
        <div class="result-stat-box"><span class="result-stat-label">${c.total}</span><strong id="res-total-amount" class="result-stat-value">-</strong></div>
        <div class="result-stat-box"><span class="result-stat-label">${c.points}</span><strong id="res-earned-points" class="result-stat-value highlight">- pt</strong><span id="res-calculation-basis" class="game-basis-badge"></span></div>
        <div class="result-stat-box"><span class="result-stat-label">${c.value}</span><strong id="res-point-value-yen" class="result-stat-value">-</strong></div>
        <div class="result-stat-box"><span class="result-stat-label">${c.rank}</span><strong id="res-reached-rank" class="result-stat-value">-</strong></div>
      </div><div class="rank-progress-wrapper"><div class="rank-progress-header"><span id="res-progress-label">${c.progress}</span><span id="res-next-progress">-</span></div><div class="rank-bar-bg"><div id="res-rank-bar" class="rank-bar-fill" role="progressbar" aria-labelledby="res-progress-label" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div></div></div>
      <div class="game-share-actions"><button type="button" id="btn-share-x" class="game-share-btn x-btn"><span>${c.share}</span></button><button type="button" id="btn-copy-link" class="game-share-btn copy-btn"><span>${c.copy}</span></button></div></div>
    </section>
    ${adMarkup(locale)}
    <section class="section"><h2>${c.source}</h2><p>${c.boundary}</p><ul>${sourceLinks(slug, locale)}</ul></section>
    ${guide}
    <section class="section"><h2>FAQ</h2><details><summary>${c.faqQ}</summary><p>${c.faqA}</p></details></section>
  </main></div>
  <footer class="site-footer"><p>© 2026 PlayPoint / Independent unofficial calculator.</p></footer>
  <script src="${root}js/analytics-core.js?v=96fa25c428"></script>
  <script src="${root}js/third-party.js?v=742c5cb45a"></script>
  <script src="${root}games/game-sim.js?v=7d3ab36020"></script>
</body>
</html>\n`;
}

function portalCard(slug, locale) {
  const g = GAME_COPY[slug][locale];
  const icon = GAME_SEO_WAVE5[slug].icon;
  const heading = locale === 'ja' ? 'h2' : 'h2';
  return `<a class="game-portal-card" href="./${slug}/"><div><div class="game-card-icon">${icon}</div><${heading} class="game-card-title">${g.name}</${heading}><p class="game-card-desc">${g.description}</p></div><div class="game-card-action">${COPY[locale].open}</div></a>`;
}

function syncPortal(rootDir, locale) {
  const file = `${localePrefix(locale)}games/index.html`;
  const full = path.join(rootDir, file);
  let html = fs.readFileSync(full, 'utf8');
  const marker = 'data-game-seo-wave5="true"';
  if (html.includes(marker)) return false;
  const cards = `<div ${marker} hidden></div>\n${GAME_ORDER.map(slug => portalCard(slug, locale)).join('\n')}`;
  const needle = '\n          </div>\n\n          <div class="game-giftcard-cta game-portal-purchase-check">';
  if (!html.includes(needle)) throw new Error(`[game-seo-wave5] ${file}: games-grid closing marker not found`);
  html = html.replace(needle, `\n${cards}${needle}`);
  fs.writeFileSync(full, html, 'utf8');
  return true;
}

function guideShell({ gameId, slug, title, description, lead, body, faq }) {
  const canonical = `https://playpoint-sim.com/games/${gameId}/${slug}/`;
  const article = { '@context': 'https://schema.org', '@type': 'Article', headline: title, dateModified: VERIFIED_AT, author: { '@type': 'Person', name: 'かたかた', url: 'https://playpoint-sim.com/author/katakata.html' }, publisher: { '@type': 'Organization', name: 'Playポイント計算機', url: 'https://playpoint-sim.com/' }, mainEntityOfPage: canonical };
  const faqJson = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(item => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })) };
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><meta name="robots" content="index, follow, max-image-preview:large" /><meta name="last-modified" content="${VERIFIED_AT}" /><meta name="author" content="かたかた" /><link rel="icon" href="../../../favicon.svg" type="image/svg+xml" /><title>${title} | Playポイント計算機</title><meta name="description" content="${description}" /><link rel="canonical" href="${canonical}" /><meta property="og:type" content="article" /><meta property="og:site_name" content="Playポイント計算機" /><meta property="og:title" content="${title}" /><meta property="og:description" content="${description}" /><meta property="og:url" content="${canonical}" /><meta property="og:image" content="https://playpoint-sim.com/ogp.png" /><meta name="twitter:card" content="summary_large_image" /><link rel="stylesheet" href="../../../articles/article-shared.css?v=1f3377e639" /><link rel="stylesheet" href="../../games.css?v=09016b3c58" /><script type="application/ld+json">${JSON.stringify(article)}</script><script type="application/ld+json">${JSON.stringify(faqJson)}</script></head>
<body><header class="site-header"><div class="site-header-inner"><a class="site-logo" href="../../../"><span class="site-logo-icon">🎮</span><span class="site-logo-text">Playポイント計算機</span></a></div></header><nav class="global-nav" aria-label="メインナビゲーション"><div class="global-nav-inner"><a class="nav-item" href="../../../">ホーム</a><a class="nav-item active" href="../../">ゲーム別計算</a><a class="nav-item" href="../../../blog/">記事一覧</a><a class="nav-item" href="../../../author/katakata.html">運営者</a></div></nav><div class="breadcrumbs-wrapper"><nav aria-label="パンくずリスト"><a href="../../../">ホーム</a> <span>&gt;</span> <a href="../../">ゲーム別計算</a> <span>&gt;</span> <a href="../">ゲーム本体</a> <span>&gt;</span> <span>${title}</span></nav></div><div class="game-page-container"><main class="game-main-content"><header class="game-header"><span class="game-badge">🔎 公式情報を基準に検証</span><h1 class="game-title">${title}</h1><p class="game-meta">最終確認：${VERIFIED_AT}</p></header><p>${lead}</p>${body}${adMarkup('ja')}<section class="section"><h2>購入前に確認すること</h2><p>Google Playと公式Web決済・ゲーム会社独自ポイントは別制度です。金額やキャンペーンは変動するため、購入直前に表示された支払額と対象条件を確認し、異なるポイント制度を同じ還元として足し合わせません。</p></section><p><a href="../">ゲーム本体のPlay Points計算機へ戻る ➔</a></p></main></div><footer class="site-footer"><p>© 2026 Playポイント計算機 / 非公式の独立した計算・解説サイトです。</p></footer><script src="../../../js/analytics-core.js?v=96fa25c428"></script><script src="../../../js/third-party.js?v=742c5cb45a"></script></body></html>\n`;
}

function renderProspiGuide() {
  const body = `<section class="section"><h2>エナジーを買うなら、まずKONAMIストアも見てみよう</h2><p>欲しい選手のスカウトに向けてエナジーを買うとき、Google Playだけで決める前に、公式のKONAMI Gamesストアも見てみましょう。プロスピA公式は「ゲーム内のご購入よりお得」にエナジーを入手できる商品を多数販売していると案内しています。</p><p>ただし、<strong>商品ごとの現在のエナジー数と価格は、どちらの購入画面でも確認できていません。</strong> Gamesストアには増量対象外の商品や回数・期間の制限もあるため、欲しい商品を同じ予算で比べてください。</p><p>Gamesストアのパワスピ・ゴールドとdポイント、Google Play側のPlay Pointsは別の特典。使う予定も含めて、どちらが自分に合うか考えてみましょう。</p></section>

<section class="section"><h2>Gamesストアで買うと、どこに届く？</h2><p>Gamesストアの購入はGoogle Play上の決済ではないため、Play Pointsの対象になりません。購入したアイテムはKONAMI IDに連携したゲームアカウントに追加されます。購入前に連携先を確認しましょう。</p><p>Gamesストアの利用にはパワスピ・ポイントクラブへの登録またはログインが必要です。公式案内では購入できるのは16歳以上で、アプリでの年齢確認も必要とされています。年齢による購入上限はアプリ内とGamesストアの利用額を合算します。</p></section>
<section class="section"><h2>1万円なら、パワスピ・ゴールドとdポイントは？</h2><p>公式案内ではGamesストアで税込100円の支払いにつきパワスピ・ゴールド1G、KONAMI IDとdアカウントを連携した場合は税込200円につきdポイント1ptが貯まります。</p><p>たとえば、<strong>税込10,000円すべてが付与対象</strong>なら100G。dアカウントを連携していれば、dポイント50ptも得られる計算です。ポイントで支払った分は両方の付与対象外なので、実際の支払い条件を確認してください。</p><p>dポイントは1pt＝1円としてGamesストアで使えます。パワスピ・ゴールドは別の交換制度なので、100Gを100円と決めつけず、欲しい交換品があるか見てみましょう。</p></section>
<section class="section"><h2>Google Playとどちらを選ぶ？</h2><p>同じ商品でGamesストアのエナジーが多く、独自の特典も使う予定なら、Gamesストアは有力な候補です。一方、Google Play側で使えるクーポンやポイント増量があり、貯めたPlay Pointsの交換先にも欲しいものがあるなら、そちらも確認する価値があります。</p><p>Gamesストアの購入はGoogle Play Pointsの対象ではありません。両方の支払額とエナジー数を確認し、Gamesストアの特典とGoogle Playの獲得予定ポイントを、それぞれ使い道まで含めて比べてください。</p></section>
<section class="section"><h2>公式ソース</h2><ul><li><a href="${SOURCES.prospiOfficial}" target="_blank" rel="noopener noreferrer">プロスピA公式サイト</a></li><li><a href="${SOURCES.prospiKonamiStore}" target="_blank" rel="noopener noreferrer">KONAMI Gamesストアとは</a></li><li><a href="${SOURCES.googlePlayEarn}" target="_blank" rel="noopener noreferrer">Google Play：Play Pointsの計算</a></li></ul></section>`;
  return guideShell({ gameId: 'prospi-a', slug: GUIDE_PATHS['prospi-a'], title: 'プロスピAはGoogle PlayとKONAMI Gamesストアどっちがお得？Play Points・パワスピG・dポイント比較【2026年】', description: 'プロスピAのGoogle Play課金とKONAMI Gamesストアを、Google Play Points、パワスピ・ゴールド、dポイント、購入経路の違いから比較します。', lead: '「Webストアの方が安い」と「Google Play Pointsが貯まる」は別の話です。公式情報だけで、どの軸を比べればよいか整理します。', body, faq: [
    { q: 'KONAMI GamesストアでGoogle Play Pointsは貯まりますか？', a: 'KONAMI GamesストアはGoogle Playとは別のWEB決済です。Google Play Pointsとしては数えず、Gamesストア側の独自還元と分けて比較してください。' },
    { q: 'AndroidのプロスピAアプリ内課金はGoogle Play経由ですか？', a: 'KONAMIはAndroid利用者について、Googleアカウントに設定された支払い方法に基づきストア上で決済すると案内しています。購入時はGoogle Play決済画面を確認してください。' }
  ] });
}

function renderPokemonGoGuide() {
  const body = `<section class="section"><h2>結論：Web Storeは公式に「アプリ内よりお得」と案内</h2><p>日本向けPokémon GO Web Storeの公式ヘルプは、標準バンドルへのボーナスポケコインやWeb限定商品など、アプリ内ショップよりお得な購入機会を案内しています。一方、Google Play PointsはGoogle Play決済の対象購入で確認する制度です。</p></section><section class="section"><h2>AndroidはGoogle PlayとGalaxy Storeを区別する</h2><p>Niantic公式はAndroidでポケコイン購入を完了する経路としてGoogle PlayまたはGalaxy Storeを案内しています。Play Pointsを計算する前に、実際の決済がGoogle Playになっているか確認してください。</p></section><section class="section"><h2>Reward Roadはアプリ内の対象購入でも進む</h2><p>Reward Roadは、公式Web Storeとゲーム内ショップの対象となる現金購入の両方でポイントを獲得できます。リワードはWeb Storeで受け取ります。利用できる地域・アカウント・当月の条件を確認してください。ただしポケコインを使った購入やPokémon GOギフトカードを使った購入など、対象外条件も公式に示されています。Reward RoadポイントはGoogle Play Pointsではありません。</p></section><section class="section"><h2>無料ポケコインも先に考える</h2><p>公式ヘルプはジム防衛で無料ポケコインを獲得できる仕組みも案内しています。必要なポケコイン全量を課金前提にせず、無料分・Web Store特典・Google Play Pointsを分けて判断すると実負担を比較しやすくなります。</p></section><section class="section"><h2>公式ソース</h2><ul><li><a href="${SOURCES.pokemonGoPurchaseHelp}" target="_blank" rel="noopener noreferrer">Niantic：ポケコインの購入方法</a></li><li><a href="${SOURCES.pokemonGoWebStoreJapan}" target="_blank" rel="noopener noreferrer">Pokémon GO Web Storeサポート（日本）</a></li><li><a href="${SOURCES.pokemonGoRewardRoad}" target="_blank" rel="noopener noreferrer">Reward Road公式ヘルプ</a></li><li><a href="${SOURCES.googlePlayEarn}" target="_blank" rel="noopener noreferrer">Google Play：Play Pointsの計算</a></li></ul></section>`;
  return guideShell({ gameId: 'pokemon-go', slug: GUIDE_PATHS['pokemon-go'], title: 'Pokémon GOの課金はどこがお得？Google PlayとWeb Storeを比較', description: 'Pokémon GOのGoogle Play課金と公式Web Storeを、ボーナスポケコイン、Reward Road、Galaxy Storeとの違い、Google Play Pointsの観点から比較します。', lead: 'Pokémon GOは購入場所によって特典が違います。Google PlayのポイントとWeb Store独自メリットを混ぜずに比較します。', body, faq: [
    { q: 'Pokémon GO Web StoreでGoogle Play Pointsは貯まりますか？', a: 'Web StoreはGoogle Playとは別の購入経路です。Google Play PointsはGoogle Playで処理される対象購入の決済画面で確認してください。' },
    { q: 'Reward RoadのポイントはGoogle Play Pointsですか？', a: '別制度です。Reward Roadは公式Web Storeとゲーム内の対象購入で進む別制度です。Google Play決済の対象購入ではPlay Pointsとそれぞれの条件で獲得できる場合がありますが、残高は合算しません。' }
  ] });
}

function renderEfootballGuide() {
  const faq = [{"q":"eFootballポイントとGoogle Play Pointsは同じですか？","a":"同じではありません。eFootballポイントはKONAMI独自の制度、Google Play PointsはGoogle Playのロイヤルティ制度です。"},{"q":"eFootballコイン購入でGoogle Play Pointsは貯まりますか？","a":"Google Playを通じた対象購入なら貯まります。Play Pointsに参加したアカウントで、購入画面の価格と獲得予定ポイントを確認してください。"}];
  const escapeFaq = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const visibleFaq = `<section class="section game-guide-visible-faq"><h2 id="article-section-7">よくある質問</h2>${faq.map((item, i) => `<div class="faq-item"><h3 id="article-section-${i + 8}">Q. ${escapeFaq(item.q)}</h3><p>A. ${escapeFaq(item.a)}</p></div>`).join('')}</section>`;
  const body = `<section class="section answer-box"><h2 id="article-section-1">コインを買ったら、どのポイントが貯まる？</h2><p>欲しい選手に向けて、eFootballコインを購入する。その支払いがGoogle Play経由の対象購入なら、<strong>Google Play Points</strong>を貯められます。これはGoogle側のポイントです。</p><p>一方、ゲームで見かける<strong>eFootball™ポイント</strong>はKONAMIの別の制度。名前は似ていますが、残高も使い道も管理先も別です。まず「どこで貯まったポイントか」を分けてみましょう。</p><p class="reader-source">出典：<a href="https://www.konami.com/efootball/ja/page/overview" target="_blank" rel="noopener noreferrer">eFootball公式：ゲーム内資産の説明</a> ／ <a href="https://support.google.com/googleplay/answer/9077192?co=GENIE.CountryCode%3DJP&amp;hl=ja" target="_blank" rel="noopener noreferrer">Google Playの獲得条件</a></p><p class="reader-game-action"><a class="cta-btn" href="/games/efootball/">このゲームの購入額とポイントを計算する</a></p></section><details class="inpage-toc reader-toc"><summary class="inpage-toc-title">目次を開く</summary><nav aria-label="この記事の目次"><ol><li><a href="#article-section-1">コインを買ったら、どのポイントが貯まる？</a></li><li><a href="#article-section-2">Google Play経由のコイン購入で貯まるもの</a></li><li><a href="#article-section-3">eFootball™ポイントの交換と有効期限</a></li><li><a href="#article-section-4">コイン・GP・2種類のポイントの違い</a></li><li><a href="#article-section-6">購入前に確認すること</a></li></ol></nav></details><section class="section"><h2 id="article-section-2">Google Play経由のコイン購入で貯まるもの</h2><p>AndroidのeFootballでコインを買うとき、Google Playを通じた対象購入なら、ゲーム内で使うコインとは別にPlay Pointsを獲得できます。<strong>Play Pointsへの参加が前提</strong>です。</p><p>貯まる数は、ステータスや表示された獲得率、ポイント計算の対象額によって変わります。税金は計算対象に含まれないため、支払額に獲得率をそのまま掛けた数字と一致しないことも。購入前にGoogle Playの画面で獲得予定ポイントを確認しましょう。</p><p>ゲーム内で手に入れた無料コインやGPは、Google Playでの購入ではありません。コインを手に入れるたびにPlay Pointsが貯まるわけではない、と覚えておくと迷いません。</p></section><section class="section"><h2 id="article-section-3">eFootball™ポイントの交換と有効期限</h2><p>eFootball™ポイントは、ゲーム内での獲得やゲーム外のキャンペーンなどで貯まるKONAMIのポイント。対象の選手やゲーム内アイテムとの交換などに使えます。<strong>特典との交換にはKONAMI IDとゲームアカウントの連携が必要</strong>です。eFootballではゲームアカウントとKONAMI IDの連携は原則解除できません。ポイント利用規約に同意した連携済みゲームアカウントや、同意済みのKONAMI IDと連携したゲームアカウントは解除できないため、連携するIDを確認してから進めましょう。</p><p>公式案内によると、Android版はeFootball™ポイント公式サイトの交換所を利用します。交換したい特典があるときは、<a href="https://efootball-point.konami.net/" target="_blank" rel="noopener noreferrer">eFootball™ポイント公式サイト</a>に、ゲームと連携したKONAMI IDでログインし、対象や条件を確認してください。交換できるアイテムは、ゲーム内やKONAMI ID作成時に選んだ国・地域によって異なる場合があります。</p><p>ポイントの期限は<strong>獲得した日から6か月後の月末まで</strong>。月末の判定はUTC（協定世界時）で、月末23時59分59秒を過ぎると失効します。受取箱に入っているポイントは、受け取った時点から数えます。期限はMy KONAMIやゲーム内の詳細で確認できます。Google Play Pointsの期限とは別なので、それぞれの画面で見ておくと安心です。</p></section><section class="section"><h2 id="article-section-4">コイン・GP・2種類のポイントの違い</h2><p>画面に並ぶ名前を、用途と一緒に整理すると見分けやすくなります。</p><div class="pack-table-wrap" tabindex="0" role="region" aria-label="コイン・GP・ポイントの違い：比較表（左右矢印キーでスクロール）"><table class="pack-table reading-responsive-table"><thead><tr><th scope="col">名前</th><th scope="col">主な入手方法</th><th scope="col">主な使い道</th></tr></thead><tbody><tr><th scope="row">eFootballコイン</th><td data-column-label="主な入手方法">ゲーム内で獲得、またはショップで入手</td><td data-column-label="主な使い道">選手の獲得、アイテムの購入など</td></tr><tr><th scope="row">GP</th><td data-column-label="主な入手方法">ゲーム内でさまざまな条件を満たして獲得</td><td data-column-label="主な使い道">選手や監督の獲得など</td></tr><tr><th scope="row">eFootball™ポイント</th><td data-column-label="主な入手方法">ゲーム内やゲーム外のキャンペーンなどで獲得</td><td data-column-label="主な使い道">対象の選手やアイテムとの交換など</td></tr><tr><th scope="row">Google Play Points</th><td data-column-label="主な入手方法">参加したアカウントでGoogle Playの対象購入などを行う</td><td data-column-label="主な使い道">Google Playで表示されるクーポンやクレジットなどへの交換</td></tr></tbody></table></div><p>たとえばGoogle Playで対象のコインを購入したときは、<strong>コインはeFootballで使い、Play PointsはGoogle Play側で貯まる</strong>、という関係です。GPやeFootball™ポイントの残高とは、それぞれ分けて確認できます。</p><p class="reader-source">出典：<a href="https://www.konami.com/efootball/ja/page/overview" target="_blank" rel="noopener noreferrer">eFootball公式：ゲーム内資産</a> ／ <a href="https://support.google.com/googleplay/answer/9079840?co=GENIE.Platform%3DAndroid&amp;hl=ja" target="_blank" rel="noopener noreferrer">Google Play公式：ポイントの使い道</a></p><p class="reader-source">出典：<a href="https://www.konami.com/wepes/efootball_point/ja/" target="_blank" rel="noopener noreferrer">eFootballポイント公式</a> ／ <a href="https://support.google.com/googleplay/answer/9077192?co=GENIE.CountryCode%3DJP&amp;hl=ja" target="_blank" rel="noopener noreferrer">Google Playの獲得条件</a></p></section><details class="source-list-toggle"><summary>出典と確認情報</summary><section class="section source-list"><h2 id="article-section-5">公式ソース</h2><ul><li><a href="https://www.konami.com/efootball/ja/topic/news/5074" target="_blank" rel="noopener noreferrer">eFootball公式：2026年4月の通貨追加告知（モンゴル）</a></li><li><a href="https://www.konami.com/efootball/ja/page/overview" target="_blank" rel="noopener noreferrer">eFootball公式：ゲーム内資産の説明</a></li><li><a href="https://www.konami.com/wepes/efootball_point/ja/" target="_blank" rel="noopener noreferrer">eFootballポイント公式</a></li><li><a href="https://support.google.com/googleplay/answer/9077192?co=GENIE.CountryCode%3DJP&hl=ja" target="_blank" rel="noopener noreferrer">Google Play：Play Pointsの計算</a></li><li><a href="https://play.google.com/store/apps/details?hl=ja&amp;gl=JP&amp;id=jp.konami.pesam" target="_blank" rel="noopener noreferrer">Google Play公式：eFootball アプリ掲載</a></li></ul></section></details>`;
  const followthrough = `<section aria-labelledby="next-action" class="cta-box game-guide-next-action"><h2 id="next-action">次にやること</h2><p>購入予定額が決まったら、同じゲームの計算機でGoogle Play Pointsの目安を確認できます。</p><a class="cta-btn" href="../">ゲーム本体のPlay Points計算機へ戻る</a></section>` + visibleFaq + `<section class="section related-links-section"><h2 id="article-section-10">あわせて読みたい</h2><ul><li><a href="/articles/2025-12-25-campaign.html">Play Pointsキャンペーンの確認方法を見る</a></li><li><a href="/articles/2025-12-25-best-use.html">Google Play Pointsの使い道を比較する</a></li><li><a href="/articles/2026-03-10-play-points-reflection-timing.html">購入後のPlay Pointsが見えないときの確認順</a></li></ul></section><div class="author-profile-box"><div class="author-avatar">✍️</div><div class="author-info"><p class="author-profile-title">この記事の著者：<a href="/author/katakata.html" rel="author">かたかた</a></p><p>Google Play Points 計算機 運営・編集。ゲーム内課金とGoogle Play Pointsを、公式情報と現在の購入経路を分けて検証しています。<a href="/author/katakata.html" rel="author">詳しい検証方針を見る</a></p></div></div>`;
  const file = 'games/efootball/google-play-points-vs-efootball-points/index.html';
  const article = articleForPath(file);
  const checkedAt = require('./article-official-verification-dates.json')[file];
  if (!article || !checkedAt) throw new Error('eFootball記事の更新日・公式確認日が必要です。');
  return guideShell({ gameId: 'efootball', slug: GUIDE_PATHS.efootball, title: article.title, description: article.description, lead: 'eFootballには「コイン」「GP」「eFootballポイント」があり、さらにGoogle Play Pointsがあります。名前が似た制度を分けて、課金時に何が貯まるのか整理します。', body, faq })
    .replace(`<meta name="last-modified" content="${VERIFIED_AT}"`, `<meta name="last-modified" content="${article.modified}"`)
    .replace(`"dateModified":"${VERIFIED_AT}"`, `"dateModified":"${article.modified}"`)
    .replace(`最終確認：${VERIFIED_AT}`, `最終確認：${checkedAt}`)
    .replace('<h1 class="game-title">', '<h1 class="game-title" id="article-title">')
    .replace('<h2>購入前に確認すること</h2>', '<h2 id="article-section-6">購入前に確認すること</h2>')
    .replace('<p><a href="../">ゲーム本体のPlay Points計算機へ戻る ➔</a></p>', followthrough);
}

function syncGameSeoWave5(rootDir) {
  const changedFiles = [];
  let checked = 0;
  for (const slug of GAME_ORDER) {
    for (const locale of LOCALES) {
      checked += 1;
      const file = `${localePrefix(locale)}games/${slug}/index.html`;
      if (writeIfChanged(rootDir, file, parentPage(slug, locale))) changedFiles.push(file);
    }
  }
  for (const locale of LOCALES) {
    checked += 1;
    if (syncPortal(rootDir, locale)) changedFiles.push(`${localePrefix(locale)}games/index.html`);
  }
  const guides = [
    ['games/prospi-a/google-play-vs-konami-store/index.html', renderProspiGuide()],
    ['games/pokemon-go/google-play-vs-webstore/index.html', renderPokemonGoGuide()],
    ['games/efootball/google-play-points-vs-efootball-points/index.html', renderEfootballGuide()]
  ];
  for (const [file, html] of guides) {
    checked += 1;
    if (writeIfChanged(rootDir, file, html)) changedFiles.push(file);
  }
  return { checked, changedFiles };
}

module.exports = {
  GAME_COPY,
  GAME_ORDER,
  GUIDE_PATHS,
  LOCALES,
  syncGameSeoWave5
};
