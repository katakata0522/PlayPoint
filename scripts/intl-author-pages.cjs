'use strict';

const { LOCALES } = require('./intl-seo-content.cjs');
const { renderArticleChrome, renderSidebar } = require('./intl-article-layout.cjs');

const UPDATED_AT = '2026-08-28';

const AUTHOR_CONTENT = Object.freeze({
  en: {
    title: 'About Katakata & editorial standards',
    eyebrow: 'Operator profile',
    lead: 'Katakata operates the Google Play Points Calculator and edits guides about Play Points calculations, usage, regional differences, and troubleshooting.',
    verificationTitle: 'How guides are verified',
    verification: [
      'Google Play Help and other first-party sources are checked first.',
      'Rules that can vary by country, account, or time are described with those limits instead of being presented as universal.',
      'Calculation examples are checked against the calculator settings used on this site.',
      'When an important rule changes, the affected guide and its verification date are reviewed.'
    ],
    workflowTitle: 'Checks before publication',
    workflow: [
      'Match the claim, source, and verification date against first-party information.',
      'Reproduce calculation examples in the calculator and confirm the result.',
      'Run automated checks for calculations, internal links, structured data, and generated pages.',
      'After deployment, verify that key production pages and assets are serving the intended revision.'
    ],
    correctionsTitle: 'Corrections and updates',
    correctionsBody: 'Google Play Points benefits and rules can change. If a guide is incorrect or outdated, the page is reviewed and corrected rather than silently relying on old assumptions.',
    regionalTitle: 'Regional rule',
    regionalBody: 'The language of a page does not determine Play Points rules. Your Google Play country, account, current level, eligible purchase, and the offer shown in Google Play are the final conditions to check.',
    linksTitle: 'More about the operator',
    contact: 'Contact form',
    lab: 'KatakataLab profile',
    note: 'note profile',
    back: 'Back to guides'
  },
  ko: {
    title: '운영자 Katakata와 기사 검증 기준',
    eyebrow: '운영자 프로필',
    lead: 'Katakata는 Google Play Points 계산기를 운영하며 Play Points 계산, 사용법, 국가별 차이, 문제 해결 가이드를 편집합니다.',
    verificationTitle: '기사 검증 원칙',
    verification: [
      'Google Play 공식 도움말 등 1차 정보를 우선 확인합니다.',
      '국가·계정·시기에 따라 달라질 수 있는 조건은 공통 규칙처럼 단정하지 않습니다.',
      '계산 예시는 사이트 계산기의 입력 조건과 결과가 일치하는지 확인합니다.',
      '중요한 규칙 변경을 확인하면 관련 기사와 검증 날짜를 다시 점검합니다.'
    ],
    workflowTitle: '공개 전 확인 절차',
    workflow: [
      '기사의 주장, 근거, 확인 날짜를 공식 정보와 대조합니다.',
      '계산 예시를 실제 계산기에 입력해 결과를 확인합니다.',
      '계산, 내부 링크, 구조화 데이터, 생성 페이지의 자동 회귀 검사를 실행합니다.',
      '배포 후 주요 운영 페이지와 정적 파일이 의도한 리비전을 제공하는지 확인합니다.'
    ],
    correctionsTitle: '수정 및 업데이트',
    correctionsBody: 'Google Play Points 혜택과 조건은 변경될 수 있습니다. 잘못되었거나 오래된 내용을 확인하면 기존 가정을 그대로 두지 않고 해당 페이지를 검토해 수정합니다.',
    regionalTitle: '국가별 기준',
    regionalBody: '페이지 언어가 Play Points 규칙을 결정하지 않습니다. 실제 Google Play 국가, 계정, 현재 등급, 대상 결제, Google Play에 표시된 오퍼 조건을 최종 기준으로 확인하세요.',
    linksTitle: '운영자 관련 링크',
    contact: '문의하기',
    lab: 'KatakataLab 프로필',
    note: 'note 프로필',
    back: '가이드로 돌아가기'
  },
  tw: {
    title: '營運者 Katakata 與文章驗證標準',
    eyebrow: '營運者簡介',
    lead: 'Katakata 維護 Google Play Points 計算器，並編輯 Play Points 計算、使用方式、地區差異與問題排查指南。',
    verificationTitle: '文章驗證原則',
    verification: [
      '優先確認 Google Play 官方說明等第一手資訊。',
      '會因國家、帳號或時間改變的條件，不會寫成所有人都相同的固定規則。',
      '計算範例會與本站計算器的輸入條件與結果互相核對。',
      '確認重要規則變更後，會重新檢查相關文章與驗證日期。'
    ],
    workflowTitle: '發布前檢查流程',
    workflow: [
      '把文章主張、來源與確認日期和官方資訊逐一核對。',
      '將計算範例實際輸入計算器，確認結果一致。',
      '執行計算、站內連結、結構化資料與產生頁面的自動回歸檢查。',
      '部署後確認主要正式環境頁面與靜態檔案已提供預期版本。'
    ],
    correctionsTitle: '更正與更新',
    correctionsBody: 'Google Play Points 的回饋與規則可能改變。若發現文章內容錯誤或過時，會重新檢查並修正，而不是沿用舊的假設。',
    regionalTitle: '地區規則',
    regionalBody: '頁面語言不會決定 Play Points 規則。請以實際 Google Play 國家或地區、帳號、目前等級、適用購買，以及 Google Play 顯示的活動條件為最終確認基準。',
    linksTitle: '營運者相關連結',
    contact: '聯絡我們',
    lab: 'KatakataLab 個人頁',
    note: 'note 個人頁',
    back: '返回指南'
  }
});

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderList(items) {
  return '<ul>' + items.map(item => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul>';
}

function renderIntlAuthorPage(localeKey, assetVersions = {}) {
  const locale = LOCALES[localeKey];
  const content = AUTHOR_CONTENT[localeKey];
  if (!locale || !content) throw new Error('Unsupported author locale: ' + localeKey);
  const canonical = `https://playpoint-sim.com/${localeKey}/author/katakata.html`;
  const articleCssVersion = assetVersions.articleCssVersion || '';
  const intlCssVersion = assetVersions.cssVersion || '';
  const chrome = renderArticleChrome(localeKey, content.title, '\n', { isPolicy: true, section: 'policy' });
  const sidebar = renderSidebar(localeKey, '\n');
  const sharedHref = '/articles/article-shared.css' + (articleCssVersion ? `?v=${articleCssVersion}` : '');
  const intlHref = '/articles/intl-article.css' + (intlCssVersion ? `?v=${intlCssVersion}` : '');
  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    name: content.title,
    url: canonical,
    dateModified: UPDATED_AT,
    mainEntity: {
      '@type': 'Person',
      name: 'Katakata',
      url: canonical,
      sameAs: ['https://katakatalab.com/who-is-katakata.html', 'https://note.com/cozy_snipe6552'],
      worksFor: { '@type': 'Organization', name: locale.siteName, url: `https://playpoint-sim.com/${localeKey}/` }
    }
  }, null, 2).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="${locale.lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta name="author" content="Katakata">
  <meta name="last-modified" content="${UPDATED_AT}">
  <title>${escapeHtml(content.title)} | ${escapeHtml(locale.siteName)}</title>
  <meta name="description" content="${escapeHtml(content.lead)}">
  <link rel="canonical" href="${canonical}">
  <link rel="alternate" hreflang="ja" href="https://playpoint-sim.com/author/katakata.html">
  <link rel="alternate" hreflang="en" href="https://playpoint-sim.com/en/author/katakata.html">
  <link rel="alternate" hreflang="ko" href="https://playpoint-sim.com/ko/author/katakata.html">
  <link rel="alternate" hreflang="zh-TW" href="https://playpoint-sim.com/tw/author/katakata.html">
  <link rel="alternate" hreflang="x-default" href="https://playpoint-sim.com/en/author/katakata.html">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${sharedHref}">
  <link rel="stylesheet" href="${intlHref}">
  <meta property="og:type" content="profile">
  <meta property="og:site_name" content="${escapeHtml(locale.siteName)}">
  <meta property="og:title" content="${escapeHtml(content.title)}">
  <meta property="og:description" content="${escapeHtml(content.lead)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="https://playpoint-sim.com/ogp.png">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">${schema}</script>
</head>
<body>
${chrome}
<div class="layout-container intl-layout-container">
<main class="main-card intl-policy-page">
  <header class="hero">
    <span class="hero-badge">${escapeHtml(content.eyebrow)}</span>
    <h1>${escapeHtml(content.title)}</h1>
    <p class="hero-meta">${escapeHtml(locale.lastUpdatedLabel)} ${UPDATED_AT}</p>
    <p>${escapeHtml(content.lead)}</p>
  </header>
  <article class="content">
    <section class="section"><h2>${escapeHtml(content.verificationTitle)}</h2>${renderList(content.verification)}</section>
    <section class="section"><h2>${escapeHtml(content.workflowTitle)}</h2><ol>${content.workflow.map(item => '<li>' + escapeHtml(item) + '</li>').join('')}</ol></section>
    <section class="section"><h2>${escapeHtml(content.correctionsTitle)}</h2><p>${escapeHtml(content.correctionsBody)}</p></section>
    <section class="section"><h2>${escapeHtml(content.regionalTitle)}</h2><div class="sidebar-tip-box">${escapeHtml(content.regionalBody)}</div></section>
    <section class="section"><h2>${escapeHtml(content.linksTitle)}</h2><ul>
      <li><a href="https://docs.google.com/forms/d/e/1FAIpQLSe0HDPLt-jfNXuiGmJ3gxlxUtgeGJ5-AM16Bz2yNw5bk3irNw/viewform" target="_blank" rel="noopener noreferrer">${escapeHtml(content.contact)}</a></li>
      <li><a href="https://katakatalab.com/who-is-katakata.html" target="_blank" rel="me noopener noreferrer">${escapeHtml(content.lab)}</a></li>
      <li><a href="https://note.com/cozy_snipe6552" target="_blank" rel="me noopener noreferrer">${escapeHtml(content.note)}</a></li>
    </ul></section>
  </article>
  <footer class="article-footer">
    <p><a href="/${localeKey}/articles/">${escapeHtml(content.back)}</a></p>
    <p><a href="/privacy.html">${escapeHtml(locale.privacyLabel)}</a> · <a href="/terms.html">${escapeHtml(locale.termsLabel)}</a></p>
    <p class="site-footer-trademark">${escapeHtml(locale.trademarkNotice)}</p>
  </footer>
</main>
${sidebar}
</div>
</body>
</html>\n`;
}

function getIntlAuthorPageFiles() {
  return Object.keys(AUTHOR_CONTENT).map(localeKey => `${localeKey}/author/katakata.html`);
}

function getIntlAuthorSitemapEntries() {
  return Object.keys(AUTHOR_CONTENT).map(localeKey => ({
    url: `https://playpoint-sim.com/${localeKey}/author/katakata.html`,
    lastmod: UPDATED_AT
  }));
}

function writeIntlAuthorPages(rootDir, assetVersions, writeFile) {
  for (const localeKey of Object.keys(AUTHOR_CONTENT)) {
    writeFile(rootDir, `${localeKey}/author/katakata.html`, renderIntlAuthorPage(localeKey, assetVersions));
  }
}

module.exports = {
  AUTHOR_CONTENT,
  getIntlAuthorPageFiles,
  getIntlAuthorSitemapEntries,
  renderIntlAuthorPage,
  writeIntlAuthorPages
};
