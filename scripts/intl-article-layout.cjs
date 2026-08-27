'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { LOCALES } = require('./intl-seo-content.cjs');
const { selectRelatedArticles } = require('./intl-related-guides.cjs');

const CHROME_START = '<!-- INTL_ARTICLE_CHROME_START -->';
const CHROME_END = '<!-- INTL_ARTICLE_CHROME_END -->';
const LAYOUT_START = '<!-- INTL_ARTICLE_LAYOUT_START -->';
const LAYOUT_END = '<!-- INTL_ARTICLE_LAYOUT_END -->';

// 国際記事は article-shared.css を視覚契約の正本とし、このCSSは言語・既存要素の差分だけを持つ。
// intl-seo-pages.cjs が正規生成時にこの内容を intl-article.css へ一度だけ書き出す。
const INTL_LAYOUT_CSS = `* { box-sizing: border-box; }

body {
font-family: "Noto Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
}

html:lang(ko) body {
font-family: "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", "맑은 고딕", sans-serif;
}

html:lang(zh-TW) body {
font-family: "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", "微軟正黑體", sans-serif;
}

.intl-article-breadcrumbs .intl-breadcrumb-current {
color: #475569;
}

.intl-layout-container .main-card {
flex: 1;
min-width: 0;
max-width: none;
margin: 0;
background: var(--cocoon-main-bg);
border: 1px solid var(--cocoon-border);
border-radius: 6px;
padding: 36px 40px;
box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
overflow: visible;
}

.intl-layout-container .hero {
background: transparent;
padding: 0;
text-align: left;
}

.intl-layout-container .hero-badge {
display: inline-block;
border: 1px solid #cbd5e1;
color: #64748b;
font-size: 11px;
font-weight: 700;
padding: 2px 7px;
border-radius: 3px;
margin-bottom: 12px;
background: #f8fafc;
letter-spacing: normal;
}

.intl-layout-container .hero h1 {
max-width: none;
}

.intl-layout-container .hero h1,
.intl-layout-container .content h2,
.intl-layout-container .content h3,
.intl-layout-container .sidebar-widget-title {
text-wrap: balance;
}

.intl-layout-container .sidebar-article-list li,
.intl-layout-container .content .cta-box .cta-btn,
.intl-article-breadcrumbs nav {
text-wrap: pretty;
}

.intl-layout-container .content {
padding: 0;
}

.intl-article-toc {
margin: 28px 0;
}

.comparison-table {
width: 100%;
min-width: 520px;
border-collapse: collapse;
font-size: 14.5px;
background: #ffffff;
}

.table-wrap {
max-width: 100%;
overflow-x: auto;
scrollbar-gutter: stable;
-webkit-overflow-scrolling: touch;
margin: 24px 0;
}

.comparison-table th,
.comparison-table td {
padding: 12px 16px;
border: 1px solid #e2e8f0;
text-align: left;
}

.comparison-table th {
background: #f1f5f9;
font-weight: 700;
color: #1e293b;
}

.decision-box,
.official-source-note {
margin: 24px 0;
padding: 18px 20px;
border: 1px solid #dbe2ea;
border-left: 4px solid var(--article-accent);
border-radius: 8px;
background: #f8fafc;
}

.decision-box strong {
color: var(--article-accent-dark);
}

.number-note,
.small {
font-size: 0.88rem;
color: var(--cocoon-muted);
}

.intl-layout-container > .main-card > .author-box {
display: block;
margin-top: 48px;
}

.intl-layout-container > .main-card > .author-box p + p {
margin-top: 6px;
}

.article-footer {
margin-top: 28px;
padding-top: 20px;
border-top: 1px solid var(--cocoon-border);
font-size: 0.88rem;
color: var(--cocoon-muted);
}

.article-footer a,
.intl-sidebar-policy a {
color: var(--cocoon-link);
text-decoration: none;
}

.article-footer a:hover,
.intl-sidebar-policy a:hover {
text-decoration: underline;
}


.intl-article-hub .intl-hub-intro {
margin: 0 0 28px;
padding: 18px 20px;
border: 1px solid #dbe2ea;
border-left: 4px solid var(--cocoon-nav-bg);
border-radius: 8px;
background: #f8fafc;
font-size: 15px;
}

.intl-article-hub .related-links-section {
margin: 34px 0 0;
}

.intl-article-hub .related-links-section h2 {
margin-top: 0;
}

.intl-article-hub .related-links-section ul {
display: grid;
grid-template-columns: repeat(2, minmax(0, 1fr));
gap: 12px;
}

.intl-article-hub .related-links-section ul {
list-style: none;
padding-left: 0;
margin-bottom: 0;
}

.intl-article-hub .related-links-section li {
margin: 0;
}

.intl-article-hub .related-links-section a {
display: flex;
align-items: center;
min-height: 68px;
padding: 14px 16px;
border: 1px solid #dbe2ea;
border-radius: 8px;
background: #ffffff;
color: #0f4c81;
font-weight: 700;
line-height: 1.55;
text-decoration: none !important;
box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
text-wrap: pretty;
}

.intl-article-hub .related-links-section a:hover {
border-color: #94a3b8;
box-shadow: 0 5px 14px rgba(15, 23, 42, 0.08);
transform: translateY(-1px);
}

@media (max-width: 680px) {
.intl-article-hub .related-links-section ul {
grid-template-columns: 1fr;
}

.intl-article-hub .related-links-section a {
min-height: 60px;
}
}

@media (max-width: 860px) {
.intl-layout-container .main-card {
width: 100%;
padding: 24px 16px;
border-radius: 0;
border-left: none;
border-right: none;
}
}
`;

const LOCALE_LAYOUT = Object.freeze({
  en: {
    navigation: 'Article navigation',
    breadcrumb: 'Breadcrumb',
    primary: 'Primary navigation',
    sidebar: 'Article sidebar',
    policy: 'Editorial policy'
  },
  ko: {
    navigation: '기사 탐색',
    breadcrumb: '탐색 경로',
    primary: '주요 탐색',
    sidebar: '기사 사이드바',
    policy: '운영 및 검증 방침'
  },
  tw: {
    navigation: '文章導覽',
    breadcrumb: '導覽路徑',
    primary: '主要導覽',
    sidebar: '文章側欄',
    policy: '營運與驗證方針'
  }
});

const INTL_NAV = Object.freeze({
  en: { account: 'Account & basics', earn: 'Earn & spend', levels: 'Levels & rewards', troubleshooting: 'Troubleshooting' },
  ko: { account: '계정·기본', earn: '적립·사용', levels: '등급·리워드', troubleshooting: '문제 해결' },
  tw: { account: '帳號與基本', earn: '積點與使用', levels: '等級與回饋', troubleshooting: '問題排查' }
});

const INTL_SIDEBAR = Object.freeze({
  en: {
    calculatorHeading: 'Estimate your remaining cost',
    calculatorBody: 'Use the points still needed and the final earn rate shown for the account that will make the purchase.',
    calculatorCta: 'Open calculator',
    quickTitle: 'Levels & rewards',
    quickLinks: [
      ['/en/articles/google-play-points-levels.html', 'Levels', 'How the level system works'],
      ['/en/articles/google-play-points-platinum-diamond-cost.html', 'Platinum / Diamond', 'Plan the remaining cost'],
      ['/en/articles/google-play-points-weekly-reward.html', 'Weekly rewards', 'Eligibility and timing'],
      ['/en/articles/google-play-points-balance-history-progress.html', 'Progress', 'Balance and history']
    ],
    checkTitle: 'Before you buy',
    checkItems: [
      ['Account', 'Use the Play country and Google account that will actually make the purchase.'],
      ['Offer', 'Confirm eligible items, the offer period, and the final special earn rate shown in Google Play.'],
      ['After purchase', 'Recheck credited points and the remaining progress instead of assuming the estimate was exact.']
    ],
    tipTitle: 'Quick rule',
    tipBody: 'Page language does not change earning rules. Your Play country, account, eligible purchase, and current offer determine the conditions.',
    categoriesTitle: 'Browse guides',
    categories: [['Account & basics', 'intl-hub-account'], ['Earning & spending', 'intl-hub-earn'], ['Levels & rewards', 'intl-hub-levels'], ['Troubleshooting', 'intl-hub-trouble']]
  },
  ko: {
    calculatorHeading: '남은 필요 금액 계산',
    calculatorBody: '실제로 결제할 계정의 남은 포인트와 Google Play에 표시된 최종 적립률을 기준으로 계산하세요.',
    calculatorCta: '계산기 열기',
    quickTitle: '등급·리워드',
    quickLinks: [
      ['/ko/articles/google-play-points-levels.html', '등급', '등급 구조 확인'],
      ['/ko/articles/google-play-points-platinum-diamond-cost.html', '플래티넘·다이아', '남은 필요 금액 계획'],
      ['/ko/articles/google-play-points-weekly-reward.html', '주간 리워드', '대상과 시점 확인'],
      ['/ko/articles/google-play-points-balance-history-progress.html', '진행도', '잔액과 내역 확인']
    ],
    checkTitle: '결제 전 확인',
    checkItems: [
      ['계정', '실제로 결제할 Google 계정과 Play 국가를 기준으로 확인하세요.'],
      ['오퍼', '대상 상품, 기간, Google Play에 표시된 최종 특별 적립률을 확인하세요.'],
      ['결제 후', '예상치만 믿지 말고 실제 적립 포인트와 남은 진행도를 다시 확인하세요.']
    ],
    tipTitle: '핵심 기준',
    tipBody: '페이지 언어가 적립 규칙을 바꾸지 않습니다. Play 국가, 계정, 대상 결제, 현재 오퍼가 실제 조건을 결정합니다.',
    categoriesTitle: '가이드 찾아보기',
    categories: [['계정·기본', 'intl-hub-account'], ['적립·사용', 'intl-hub-earn'], ['등급·리워드', 'intl-hub-levels'], ['문제 해결', 'intl-hub-trouble']]
  },
  tw: {
    calculatorHeading: '估算剩餘所需金額',
    calculatorBody: '請使用實際付款帳號還差的點數，以及 Google Play 顯示的最終積點率來估算。',
    calculatorCta: '開啟計算機',
    quickTitle: '等級與回饋',
    quickLinks: [
      ['/tw/articles/google-play-points-levels.html', '等級', '確認等級制度'],
      ['/tw/articles/google-play-points-platinum-diamond-cost.html', '白金／鑽石', '規劃剩餘所需金額'],
      ['/tw/articles/google-play-points-weekly-reward.html', '每週回饋', '確認資格與時間'],
      ['/tw/articles/google-play-points-balance-history-progress.html', '進度', '查看點數與紀錄']
    ],
    checkTitle: '購買前確認',
    checkItems: [
      ['帳號', '以實際付款的 Google 帳號與 Play 國家或地區為準。'],
      ['活動', '確認適用商品、活動期間，以及 Google Play 顯示的最終活動特別積點率。'],
      ['購買後', '請重新確認實際入帳點數與剩餘進度，不要把估算值當成保證結果。']
    ],
    tipTitle: '快速判斷',
    tipBody: '頁面語言不會改變積點規則。Play 國家或地區、帳號、適用購買與目前活動才是實際條件。',
    categoriesTitle: '瀏覽指南',
    categories: [['帳號與基本', 'intl-hub-account'], ['積點與使用', 'intl-hub-earn'], ['等級與回饋', 'intl-hub-levels'], ['問題排查', 'intl-hub-trouble']]
  }
});

function inferIntlSection(relativePath) {
  const slug = path.posix.basename(String(relativePath || ''), '.html').replace(/^\d{4}-\d{2}-\d{2}-/, '').toLowerCase();
  if (/(?:not-showing|not-applied|not-working|locked|missing|cannot|refund)/.test(slug)) return 'troubleshooting';
  if (/(?:level|levels|silver|gold|platinum|diamond|weekly-reward|super-weekly|maintenance)/.test(slug)) return 'levels';
  if (/(?:account|device|country|family|join|eligibility|balance-history|expiration)/.test(slug)) return 'account';
  if (/(?:gift|payment|purchase|subscription|discount|promo|coupon|quest|earn|earning|cash|credit|value|cost|spend|rounding|tax)/.test(slug)) return 'earn';
  return 'guides';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function decodeHtmlEntities(value) {
  return String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&(amp|lt|gt|quot|#39);/g, entity => ({
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'"
    })[entity]);
}

function markerPattern(start, end) {
  const escapePattern = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('\\s*' + escapePattern(start) + '[\\s\\S]*?' + escapePattern(end) + '\\s*', 'g');
}

function extractArticleTitle(html, relativePath) {
  const match = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (!match) throw new Error(relativePath + ': article h1 is missing');
  const rawTitle = match[1].trim();
  if (/[<>]/.test(rawTitle)) throw new Error(relativePath + ': article h1 must contain plain text');
  return decodeHtmlEntities(rawTitle.replace(/\s+/g, ' '));
}

function findMainBlock(html, relativePath) {
  const matches = [...html.matchAll(/<main\b[^>]*class=["'][^"']*\bmain-card\b[^"']*["'][^>]*>/gi)];
  if (matches.length !== 1) {
    throw new Error(relativePath + ': expected exactly one main-card, found ' + matches.length);
  }
  const start = matches[0].index;
  const openEnd = start + matches[0][0].length;
  const closeStart = html.indexOf('</main>', openEnd);
  if (closeStart < 0) throw new Error(relativePath + ': main-card closing tag is missing');
  return { start, end: closeStart + '</main>'.length };
}

function unwrapGeneratedLayout(html, relativePath) {
  const start = html.indexOf(LAYOUT_START);
  if (start < 0) return html;
  const endStart = html.indexOf(LAYOUT_END, start);
  if (endStart < 0) throw new Error(relativePath + ': generated layout end marker is missing');
  const end = endStart + LAYOUT_END.length;
  const generatedBlock = html.slice(start, end);
  const main = findMainBlock(generatedBlock, relativePath);
  const mainHtml = generatedBlock.slice(main.start, main.end);
  return html.slice(0, start) + mainHtml + html.slice(end).replace(/^\s*/, '');
}

function renderArticleChrome(localeKey, title, newline, options = {}) {
  const locale = LOCALES[localeKey];
  const labels = LOCALE_LAYOUT[localeKey];
  const navLabels = INTL_NAV[localeKey];
  const isHub = options.isHub === true;
  const isPolicy = options.isPolicy === true;
  const section = options.section || 'guides';
  const homeHref = '/' + localeKey + '/';
  const guidesHref = homeHref + 'articles/';
  const policyHref = homeHref + 'author/katakata.html';
  const navClass = key => 'nav-item' + (section === key ? ' active' : '');
  return [
    CHROME_START,
    '<header class="site-header intl-article-site-header">',
    '  <div class="site-header-inner">',
    '    <a class="site-logo" href="' + homeHref + '"><span aria-hidden="true">🎮</span><span class="site-logo-text">' + escapeHtml(locale.siteName) + '</span></a>',
    '    <nav class="site-header-links" aria-label="' + escapeHtml(labels.navigation) + '">',
    '      <a href="' + guidesHref + '">' + escapeHtml(locale.blog) + '</a>',
    '      <a href="' + policyHref + '">' + escapeHtml(labels.policy) + '</a>',
    '    </nav>',
    '  </div>',
    '</header>',
    '<nav class="global-nav intl-global-nav" aria-label="' + escapeHtml(labels.primary) + '">',
    '  <div class="global-nav-inner">',
    '    <a class="' + navClass('home') + '" href="' + homeHref + '"><span>' + escapeHtml(locale.home) + '</span></a>',
    '    <a class="' + navClass('guides') + '" href="' + guidesHref + '"><span>' + escapeHtml(locale.blog) + '</span></a>',
    '    <a class="' + navClass('account') + '" href="' + guidesHref + '#intl-hub-account"><span>' + escapeHtml(navLabels.account) + '</span></a>',
    '    <a class="' + navClass('earn') + '" href="' + guidesHref + '#intl-hub-earn"><span>' + escapeHtml(navLabels.earn) + '</span></a>',
    '    <a class="' + navClass('levels') + '" href="' + guidesHref + '#intl-hub-levels"><span>' + escapeHtml(navLabels.levels) + '</span></a>',
    '    <a class="' + navClass('troubleshooting') + '" href="' + guidesHref + '#intl-hub-trouble"><span>' + escapeHtml(navLabels.troubleshooting) + '</span></a>',
    '  </div>',
    '</nav>',
    '<div class="breadcrumbs-wrapper intl-article-breadcrumbs">',
    '  <nav aria-label="' + escapeHtml(labels.breadcrumb) + '">',
    '    <a href="' + homeHref + '">' + escapeHtml(locale.home) + '</a><span aria-hidden="true">&gt;</span>',
    ...(isPolicy
      ? ['    <span class="intl-breadcrumb-current">' + escapeHtml(title) + '</span>']
      : [
        '    <a href="' + guidesHref + '">' + escapeHtml(locale.blog) + '</a>' + (isHub ? '' : '<span aria-hidden="true">&gt;</span>'),
        ...(isHub ? [] : ['    <span class="intl-breadcrumb-current">' + escapeHtml(title) + '</span>'])
      ]),
    '  </nav>',
    '</div>',
    CHROME_END
  ].join(newline);
}

function renderSidebar(localeKey, newline, relatedArticles = null) {
  const locale = LOCALES[localeKey];
  const labels = LOCALE_LAYOUT[localeKey];
  const sidebar = INTL_SIDEBAR[localeKey];
  const homeHref = '/' + localeKey + '/';
  const guidesHref = homeHref + 'articles/';
  const policyHref = homeHref + 'author/katakata.html';
  const articles = Array.isArray(relatedArticles)
    ? relatedArticles
    : (Array.isArray(locale.articles) ? locale.articles.slice(0, 4) : []);
  return [
    '<aside class="sidebar-column intl-article-sidebar" aria-label="' + escapeHtml(labels.sidebar) + '">',
    '  <section class="sidebar-widget">',
    '    <h2 class="sidebar-widget-title">🧮 ' + escapeHtml(locale.siteName) + '</h2>',
    '    <div class="sidebar-widget-body">',
    '      <div class="sidebar-calc-banner">',
    '        <h4>' + escapeHtml(sidebar.calculatorHeading) + '</h4>',
    '        <p>' + escapeHtml(sidebar.calculatorBody) + '</p>',
    '        <a class="sidebar-calc-btn" href="' + homeHref + '">' + escapeHtml(sidebar.calculatorCta) + ' ➔</a>',
    '      </div>',
    '    </div>',
    '  </section>',
    '  <section class="sidebar-widget">',
    '    <h2 class="sidebar-widget-title">🎯 ' + escapeHtml(sidebar.quickTitle) + '</h2>',
    '    <div class="sidebar-widget-body">',
    '      <div class="sidebar-rank-grid">',
    ...sidebar.quickLinks.map(([href, name, detail]) => '        <a class="sidebar-rank-link" href="' + escapeHtml(href) + '"><span class="sidebar-rank-name">' + escapeHtml(name) + '</span><span class="sidebar-rank-pt">' + escapeHtml(detail) + '</span></a>'),
    '      </div>',
    '    </div>',
    '  </section>',
    '  <section class="sidebar-widget">',
    '    <h2 class="sidebar-widget-title">📅 ' + escapeHtml(sidebar.checkTitle) + '</h2>',
    '    <div class="sidebar-widget-body">',
    ...sidebar.checkItems.map(([tag, text]) => '      <div class="sidebar-event-item"><span class="sidebar-event-tag">' + escapeHtml(tag) + '</span><span>' + escapeHtml(text) + '</span></div>'),
    '    </div>',
    '  </section>',
    '  <section class="sidebar-widget">',
    '    <h2 class="sidebar-widget-title">💡 ' + escapeHtml(sidebar.tipTitle) + '</h2>',
    '    <div class="sidebar-widget-body"><div class="sidebar-tip-box">' + escapeHtml(sidebar.tipBody) + '</div></div>',
    '  </section>',
    '  <section class="sidebar-widget">',
    '    <h2 class="sidebar-widget-title">📁 ' + escapeHtml(sidebar.categoriesTitle) + '</h2>',
    '    <div class="sidebar-widget-body"><ul class="sidebar-category-list">',
    ...sidebar.categories.map(([label, anchor]) => '      <li><a href="' + guidesHref + '#' + escapeHtml(anchor) + '">' + escapeHtml(label) + '</a></li>'),
    '    </ul></div>',
    '  </section>',
    '  <section class="sidebar-widget">',
    '    <h2 class="sidebar-widget-title">🔥 ' + escapeHtml(locale.relatedTitle) + '</h2>',
    '    <div class="sidebar-widget-body">',
    '      <ul class="sidebar-article-list">',
    ...articles.map(([href, label]) => '        <li><a href="' + escapeHtml(href) + '">' + escapeHtml(label) + '</a></li>'),
    '      </ul>',
    '    </div>',
    '  </section>',
    '  <section class="sidebar-widget intl-sidebar-policy">',
    '    <h2 class="sidebar-widget-title">✍️ ' + escapeHtml(labels.policy) + '</h2>',
    '    <div class="sidebar-widget-body"><a href="' + policyHref + '">' + escapeHtml(locale.policyLabel) + '</a></div>',
    '  </section>',
    '</aside>'
  ].join(newline);
}

function renderArticleLayout(localeKey, mainHtml, newline, relatedArticles = null) {
  return [
    LAYOUT_START,
    '<div class="layout-container intl-layout-container">',
    mainHtml,
    renderSidebar(localeKey, newline, relatedArticles),
    '</div>',
    LAYOUT_END
  ].join(newline);
}

function normalizeIntlArticleStylesheets(html, newline, relativePath) {
  let next = html.replace(/\s*<link\b[^>]*href=["'][^"']*article-gift-card\.css(?:\?[^"']*)?["'][^>]*\/?>\s*/gi, newline);
  next = next.replace(/\s*<link\b[^>]*href=["'][^"']*(?:\/en\/articles\/intl-article\.css|\/articles\/intl-article\.css)(?:\?[^"']*)?["'][^>]*\/?>\s*/gi, newline);
  const shared = next.match(/<link\b[^>]*href=["'][^"']*\/articles\/article-shared\.css(?:\?[^"']*)?["'][^>]*\/?>/i);
  if (!shared) return next;
  return next.replace(shared[0], shared[0] + newline + '  <link rel="stylesheet" href="/articles/intl-article.css">');
}

function synchronizeArticle(html, localeKey, relativePath, relatedArticles = null) {
  const newline = html.includes('\r\n') ? '\r\n' : '\n';
  const styledHtml = normalizeIntlArticleStylesheets(html, newline, relativePath);
  const localAuthorHref = '/' + localeKey + '/author/katakata.html';
  const localAuthorUrl = 'https://playpoint-sim.com' + localAuthorHref;
  const localizedHtml = styledHtml
    .replace(/href=(["'])(?:\.\.\/|\/)?author\/katakata\.html\1/gi, 'href=$1' + localAuthorHref + '$1')
    .replace(/https:\/\/playpoint-sim\.com\/author\/katakata\.html/g, localAuthorUrl);
  const withoutChrome = localizedHtml.replace(markerPattern(CHROME_START, CHROME_END), newline);
  const unwrapped = unwrapGeneratedLayout(withoutChrome, relativePath);
  const title = extractArticleTitle(unwrapped, relativePath);
  const main = findMainBlock(unwrapped, relativePath);
  const mainHtml = unwrapped.slice(main.start, main.end);
  const chrome = renderArticleChrome(localeKey, title, newline, { section: inferIntlSection(relativePath) });
  const layout = renderArticleLayout(localeKey, mainHtml, newline, relatedArticles);
  const trailingHtml = unwrapped.slice(main.end).replace(/^\s*/, '');
  return unwrapped.slice(0, main.start).replace(/\s*$/, newline) + chrome + newline + layout
    + (trailingHtml ? newline + trailingHtml : '');
}

function synchronizeIntlArticleLayouts(rootDir) {
  const summary = { checked: 0, changed: 0 };
  for (const localeKey of Object.keys(LOCALE_LAYOUT)) {
    const articleDir = path.join(rootDir, localeKey, 'articles');
    if (!fs.existsSync(articleDir)) continue;
    const files = fs.readdirSync(articleDir)
      .filter(file => file.endsWith('.html') && file !== 'index.html')
      .sort();
    const catalog = files.map(file => {
      const absolutePath = path.join(articleDir, file);
      const relativePath = path.posix.join(localeKey, 'articles', file);
      const html = fs.readFileSync(absolutePath, 'utf8');
      return {
        path: relativePath,
        href: '/' + relativePath,
        label: extractArticleTitle(html, relativePath)
      };
    });
    for (const file of files) {
      const absolutePath = path.join(articleDir, file);
      const relativePath = path.posix.join(localeKey, 'articles', file);
      const before = fs.readFileSync(absolutePath, 'utf8');
      const relatedArticles = selectRelatedArticles(catalog, relativePath, 4);
      const after = synchronizeArticle(before, localeKey, relativePath, relatedArticles);
      summary.checked++;
      if (after === before) continue;
      fs.writeFileSync(absolutePath, after, 'utf8');
      summary.changed++;
    }
  }
  return summary;
}

module.exports = {
  CHROME_END,
  CHROME_START,
  INTL_LAYOUT_CSS,
  LAYOUT_END,
  LAYOUT_START,
  inferIntlSection,
  renderArticleChrome,
  renderSidebar,
  synchronizeIntlArticleLayouts
};