'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { VERIFIED_AT, SOURCES, GAME_SEO_WAVE5 } = require('./game-seo-wave5-data.cjs');

const LOCALES = Object.freeze(['ja', 'en', 'ko', 'tw']);
const GAME_ORDER = Object.freeze(['prospi-a', 'pokemon-go', 'efootball']);

const COPY = Object.freeze({
  ja: {
    htmlLang: 'ja', dir: '', home: 'ホーム', games: 'ゲーム別計算', guides: '記事一覧', operator: '運営者',
    badge: '🔎 公式情報を基準に検証', verified: '最終確認', input: 'Google Playの表示額を入力',
    pack: '課金額', count: '購入回数', amount: '課金予定合計額（円）', earnRate: 'キャンペーン特別獲得率', status: '現在の会員ランク',
    total: '課金合計金額', points: '獲得予定 Playポイント', value: '交換価値（Play画面で確認）', rank: '0ptから見た参考ランク', progress: '0ptから見た参考進捗',
    share: '𝕏 で計算結果をシェア', copy: '🔗 結果リンクをコピー', source: '公式確認ソース',
    boundary: 'Google Play以外のWebストア・独自ポイントは別の購入経路・制度です。Google Play Pointsとして合算しません。現行の商品価格は実際の購入画面を最終正本とします。',
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
    en: { name: 'Pro Yakyuu Spirits A (Japan reference)', short: 'Prospi A', description: 'Japan-reference Google Play Points calculator for Pro Yakyuu Spirits A. Enter the current Google Play checkout amount and keep KONAMI Games Store rewards separate.', note: 'This page documents the Japan Android purchase flow. KONAMI confirms in-app Energy purchases use the OS account payment method, while KONAMI Games Store is a separate web checkout.' },
    ko: { name: '프로야구 스피리츠 A (일본판 기준)', short: '프로스피 A', description: '일본판 프로스피 A의 Google Play 결제액으로 Play Points를 계산합니다. KONAMI Games 스토어의 자체 보상은 Google Play Points와 분리합니다.', note: '이 페이지는 일본판 Android 결제 흐름을 기준으로 합니다. 앱 내 에너지 구매와 KONAMI Games 스토어는 서로 다른 결제 경로입니다.' },
    tw: { name: '職業棒球之魂 A（日本版參考）', short: 'Prospi A', description: '以日本版職業棒球之魂 A 的 Google Play 實際結帳金額估算 Play Points，並將 KONAMI Games 商店的自有回饋分開處理。', note: '本頁以日本版 Android 購買流程作為參考。App 內 Energy 購買與 KONAMI Games 商店是不同付款路徑。' }
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
  return cfg.sources.map((url, index) => `<li><a href="${url}" target="_blank" rel="noopener noreferrer">${locale === 'ja' ? `公式ソース ${index + 1}` : locale === 'ko' ? `공식 출처 ${index + 1}` : locale === 'tw' ? `官方來源 ${index + 1}` : `Official source ${index + 1}`}</a></li>`).join('');
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
  return `<div class="game-ad-slot"><div class="game-ad-label">${c.ad}</div><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-3845885843809455" data-ad-slot="8250492620" data-ad-format="auto" data-full-width-responsive="true"></ins></div>`;
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
    <header class="game-header"><span class="game-badge">${c.badge}</span><h1 class="game-title">${g.name}</h1><p class="game-meta">${c.verified}: ${VERIFIED_AT} ｜ Google Play Points</p></header>
    <p>${g.description}</p>
    <p>${g.note}</p>
    <section class="game-sim-card"><h2 class="game-sim-title">🧮 ${g.short}</h2>
      <p class="preset-heading">▼ ${c.input}</p>
      <div class="preset-buttons"><button type="button" class="preset-btn active" data-amount="0" data-mult="1" aria-pressed="true">${c.input}</button></div>
      <form id="game-sim-form"><div class="input-grid">
        <div class="input-field"><label for="sim-pack-select">${c.pack}:</label><select id="sim-pack-select"><option value="custom" selected>${c.currentAmount}</option></select></div>
        <div class="input-field"><label for="sim-pack-count">${c.count}:</label><input type="number" id="sim-pack-count" value="1" min="1" max="999" inputmode="numeric"></div>
        <div class="input-field"><label for="sim-custom-amount">${c.amount}:</label><input type="number" id="sim-custom-amount" value="0" min="0" step="any" inputmode="decimal"></div>
        <div class="input-field"><label for="sim-multiplier">${c.earnRate}:</label><select id="sim-multiplier">${earnRateOptions(locale)}</select></div>
        <div class="input-field"><label for="sim-status">${c.status}:</label><select id="sim-status">${statusOptions(locale)}</select></div>
      </div></form>
      <div class="game-result-container"><div class="result-main-grid">
        <div class="result-stat-box"><span class="result-stat-label">${c.total}</span><strong id="res-total-amount" class="result-stat-value">-</strong></div>
        <div class="result-stat-box"><span class="result-stat-label">${c.points}</span><strong id="res-earned-points" class="result-stat-value highlight">- pt</strong></div>
        <div class="result-stat-box"><span class="result-stat-label">${c.value}</span><strong id="res-point-value-yen" class="result-stat-value">-</strong></div>
        <div class="result-stat-box"><span class="result-stat-label">${c.rank}</span><strong id="res-reached-rank" class="result-stat-value">-</strong></div>
      </div><div class="rank-progress-wrapper"><div class="rank-progress-header"><span>${c.progress}</span><span id="res-next-progress">-</span></div><div class="rank-bar-bg"><div id="res-rank-bar" class="rank-bar-fill" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div></div></div>
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
<body><header class="site-header"><div class="site-header-inner"><a class="site-logo" href="../../../"><span class="site-logo-icon">🎮</span><span class="site-logo-text">Playポイント計算機</span></a></div></header><nav class="global-nav" aria-label="メインナビゲーション"><div class="global-nav-inner"><a class="nav-item" href="../../../">ホーム</a><a class="nav-item active" href="../../">ゲーム別計算</a><a class="nav-item" href="../../../blog/">記事一覧</a><a class="nav-item" href="../../../author/katakata.html">運営者</a></div></nav><div class="breadcrumbs-wrapper"><nav aria-label="パンくずリスト"><a href="../../../">ホーム</a> <span>&gt;</span> <a href="../../">ゲーム別計算</a> <span>&gt;</span> <a href="../">ゲーム本体</a> <span>&gt;</span> <span>${title}</span></nav></div><div class="game-page-container"><main class="game-main-content"><header class="game-header"><span class="game-badge">🔎 公式情報を基準に検証</span><h1 class="game-title">${title}</h1><p class="game-meta">最終確認：${VERIFIED_AT}</p></header><p>${lead}</p>${body}${adMarkup('ja')}<section class="section"><h2>このページの確認方針</h2><p>Google Playと公式Web決済・ゲーム会社独自ポイントは別制度です。金額やキャンペーンは変動するため、現在の購入画面を最終正本とし、異なるポイント制度を同じ還元として足し合わせません。</p></section><p><a href="../">ゲーム本体のPlay Points計算機へ戻る ➔</a></p></main></div><footer class="site-footer"><p>© 2026 Playポイント計算機 / 非公式の独立した計算・解説サイトです。</p></footer><script src="../../../js/analytics-core.js?v=96fa25c428"></script><script src="../../../js/third-party.js?v=742c5cb45a"></script></body></html>\n`;
}

function renderProspiGuide() {
  const body = `<section class="section"><h2>結論：安さとGoogle Play Pointsは別軸で比べる</h2><p>プロスピA公式はKONAMI Gamesストアについて「ゲーム内のご購入よりお得」と案内しています。一方、Androidのアプリ内エナジー購入はGoogleアカウントに設定した支払い方法でストア決済されます。Google Play Pointsを重視する場合は、Google Play結帳画面の獲得予定ポイントとKONAMI Gamesストア側の条件を別々に比較します。</p></section><section class="section"><h2>KONAMI GamesストアはGoogle Play外のWEB決済</h2><p>Gamesストアで購入したエナジー等はKONAMI IDに連携したゲームアカウントへ追加されます。Google Play上の決済ではないため、Gamesストア購入をGoogle Play Pointsの対象として数えません。</p></section><section class="section"><h2>独自還元：パワスピ・ゴールドとdポイント</h2><p>公式案内ではGamesストアで税込100円の支払いにつきパワスピ・ゴールド1Gを獲得し、dアカウント連携時は税込200円につきdポイント1ptを獲得できます。ポイントで支払った部分などは付与対象外になる条件があるため、購入時の表示を確認してください。</p></section><section class="section"><h2>固定エナジー価格を載せない理由</h2><p>セールや商品構成は変動します。本サイトは「現在のGoogle Play表示額」を計算機へ入力する方式にし、古い価格表を残しません。Gamesストアについても、その時点の公式商品表示を優先します。</p></section><section class="section"><h2>公式ソース</h2><ul><li><a href="${SOURCES.prospiOfficial}" target="_blank" rel="noopener noreferrer">プロスピA公式サイト</a></li><li><a href="${SOURCES.prospiPurchaseHelp}" target="_blank" rel="noopener noreferrer">KONAMI：エナジー購入方法</a></li><li><a href="${SOURCES.prospiKonamiStore}" target="_blank" rel="noopener noreferrer">KONAMI Gamesストアとは</a></li><li><a href="${SOURCES.googlePlayEarn}" target="_blank" rel="noopener noreferrer">Google Play：Play Pointsの計算</a></li></ul></section>`;
  return guideShell({ gameId: 'prospi-a', slug: GUIDE_PATHS['prospi-a'], title: 'プロスピAはGoogle PlayとKONAMI Gamesストアどっちがお得？Play Points・パワスピG・dポイント比較【2026年】', description: 'プロスピAのGoogle Play課金とKONAMI Gamesストアを、Google Play Points、パワスピ・ゴールド、dポイント、購入経路の違いから比較します。', lead: '「Webストアの方が安い」と「Google Play Pointsが貯まる」は別の話です。公式情報だけで、どの軸を比べればよいか整理します。', body, faq: [
    { q: 'KONAMI GamesストアでGoogle Play Pointsは貯まりますか？', a: 'KONAMI GamesストアはGoogle Playとは別のWEB決済です。Google Play Pointsとしては数えず、Gamesストア側の独自還元と分けて比較してください。' },
    { q: 'AndroidのプロスピAアプリ内課金はGoogle Play経由ですか？', a: 'KONAMIはAndroid利用者について、Googleアカウントに設定された支払い方法に基づきストア上で決済すると案内しています。購入時はGoogle Play結帳画面を確認してください。' }
  ] });
}

function renderPokemonGoGuide() {
  const body = `<section class="section"><h2>結論：Web Storeは公式に「アプリ内よりお得」と案内</h2><p>日本向けPokémon GO Web Storeの公式ヘルプは、標準バンドルへのボーナスポケコインやWeb限定商品など、アプリ内ショップよりお得な購入機会を案内しています。一方、Google Play PointsはGoogle Play決済の対象購入で確認する制度です。</p></section><section class="section"><h2>AndroidはGoogle PlayとGalaxy Storeを区別する</h2><p>Niantic公式はAndroidでポケコイン購入を完了する経路としてGoogle PlayまたはGalaxy Storeを案内しています。Play Pointsを計算する前に、実際の結帳がGoogle Playになっているか確認してください。</p></section><section class="section"><h2>Web StoreにはReward Roadがある</h2><p>Web Storeでは対象の現金購入でReward Roadのポイントが進み、追加リワードを受け取れる場合があります。ただしポケコインを使った購入やPokémon GOギフトカードを使った購入など、対象外条件も公式に示されています。Reward RoadポイントはGoogle Play Pointsではありません。</p></section><section class="section"><h2>無料ポケコインも先に考える</h2><p>公式ヘルプはジム防衛で無料ポケコインを獲得できる仕組みも案内しています。必要なポケコイン全量を課金前提にせず、無料分・Web Store特典・Google Play Pointsを分けて判断すると実負担を比較しやすくなります。</p></section><section class="section"><h2>公式ソース</h2><ul><li><a href="${SOURCES.pokemonGoPurchaseHelp}" target="_blank" rel="noopener noreferrer">Niantic：ポケコインの購入方法</a></li><li><a href="${SOURCES.pokemonGoWebStoreJapan}" target="_blank" rel="noopener noreferrer">Pokémon GO Web Storeサポート（日本）</a></li><li><a href="${SOURCES.pokemonGoRewardRoad}" target="_blank" rel="noopener noreferrer">Reward Road公式ヘルプ</a></li><li><a href="${SOURCES.googlePlayEarn}" target="_blank" rel="noopener noreferrer">Google Play：Play Pointsの計算</a></li></ul></section>`;
  return guideShell({ gameId: 'pokemon-go', slug: GUIDE_PATHS['pokemon-go'], title: 'Pokémon GOはGoogle PlayとWeb Storeどっちがお得？ボーナスポケコイン・Reward Road・Play Points比較【2026年】', description: 'Pokémon GOのGoogle Play課金と公式Web Storeを、ボーナスポケコイン、Reward Road、Galaxy Storeとの違い、Google Play Pointsの観点から比較します。', lead: 'Pokémon GOは購入場所によって特典が違います。Google PlayのポイントとWeb Store独自メリットを混ぜずに比較します。', body, faq: [
    { q: 'Pokémon GO Web StoreでGoogle Play Pointsは貯まりますか？', a: 'Web StoreはGoogle Playとは別の購入経路です。Google Play PointsはGoogle Playで処理される対象購入の結帳画面で確認してください。' },
    { q: 'Reward RoadのポイントはGoogle Play Pointsですか？', a: '別制度です。Reward RoadはPokémon GO Web Store側のプログラムで、Google Play Pointsとは合算しません。' }
  ] });
}

function renderEfootballGuide() {
  const body = `<section class="section"><h2>結論：名前が似ていても完全に別のポイント</h2><p><strong>Google Play Points</strong>はGoogle Playの対象購入で貯まるGoogleの制度です。<strong>eFootball™ポイント</strong>はKONAMIの制度で、ゲーム内アイテムや選手などとの交換に利用します。同じ「ポイント」でも残高・獲得条件・期限は別です。</p></section><section class="section"><h2>eFootball™コインはGoogle Play購入経路を公式確認</h2><p>KONAMIはAndroid向けに「Google Playをご利用の方」へのeFootball™コイン購入案内を公開しています。Google Play Pointsを計算する場合は、実際のGoogle Play結帳画面に表示された課金額と獲得予定ポイントを使います。</p></section><section class="section"><h2>eFootball™ポイントはKONAMI IDと連携して使う</h2><p>公式説明では、eFootball™ポイントを特典と交換するにはKONAMI IDとゲームアカウントの連携が必要です。ポイントは受け取り後6か月後の月末に期限を迎えるルールも案内されています。Google Play Pointsの期限・利用先とは別管理です。</p></section><section class="section"><h2>コイン・GP・eFootballポイントも分ける</h2><p>公式Overviewでは、eFootball™コイン、GP、eFootball™ポイントをそれぞれ別のゲーム内資産として定義しています。課金計画では「Google Playで支払う金額」「購入するeFootballコイン」「KONAMIのeFootballポイント」「Google Play Points」を4つに分けて見ると混乱しません。</p></section><section class="section"><h2>公式ソース</h2><ul><li><a href="${SOURCES.efootballGooglePlay}" target="_blank" rel="noopener noreferrer">eFootball公式：Google Play利用者向けコイン購入案内</a></li><li><a href="${SOURCES.efootballOverview}" target="_blank" rel="noopener noreferrer">eFootball公式：ゲーム内資産の説明</a></li><li><a href="${SOURCES.efootballPoints}" target="_blank" rel="noopener noreferrer">eFootballポイント公式</a></li><li><a href="${SOURCES.googlePlayEarn}" target="_blank" rel="noopener noreferrer">Google Play：Play Pointsの計算</a></li></ul></section>`;
  return guideShell({ gameId: 'efootball', slug: GUIDE_PATHS.efootball, title: 'eFootballコイン購入でGoogle Play Pointsは貯まる？eFootballポイントとの違い【2026年】', description: 'eFootballコインのGoogle Play課金と、KONAMI独自のeFootballポイント、GP、Google Play Pointsの違いを公式情報で整理します。', lead: 'eFootballには「コイン」「GP」「eFootballポイント」があり、さらにGoogle Play Pointsがあります。名前が似た制度を分けて、課金時に何が貯まるのか整理します。', body, faq: [
    { q: 'eFootballポイントとGoogle Play Pointsは同じですか？', a: '同じではありません。eFootballポイントはKONAMI独自の制度、Google Play PointsはGoogle Playのロイヤルティ制度です。' },
    { q: 'eFootballコイン購入でGoogle Play Pointsは貯まりますか？', a: 'Google Playで処理される対象購入であれば、購入前のGoogle Play結帳画面に表示される獲得予定ポイントを確認してください。現行コイン価格はその画面を正本とします。' }
  ] });
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
