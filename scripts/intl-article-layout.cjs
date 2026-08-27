'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { LOCALES } = require('./intl-seo-content.cjs');

const CHROME_START = '<!-- INTL_ARTICLE_CHROME_START -->';
const CHROME_END = '<!-- INTL_ARTICLE_CHROME_END -->';
const LAYOUT_START = '<!-- INTL_ARTICLE_LAYOUT_START -->';
const LAYOUT_END = '<!-- INTL_ARTICLE_LAYOUT_END -->';

// intl-seo-pages.cjs は生成途中で旧CSSを書き出すため、記事レイアウト同期を
// 最終的な正本としてここで日本語版の視覚契約へ戻す。
const INTL_LAYOUT_CSS = `* { box-sizing: border-box; }

body {
font-family: "Noto Sans", "Noto Sans KR", "Noto Sans TC", -apple-system, BlinkMacSystemFont, sans-serif;
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
    policy: 'Editorial policy',
    levels: 'Levels',
    troubleshooting: 'Troubleshooting'
  },
  ko: {
    navigation: '기사 탐색',
    breadcrumb: '탐색 경로',
    primary: '주요 탐색',
    sidebar: '기사 사이드바',
    policy: '운영 및 검증 방침',
    levels: '등급',
    troubleshooting: '문제 해결'
  },
  tw: {
    navigation: '文章導覽',
    breadcrumb: '導覽路徑',
    primary: '主要導覽',
    sidebar: '文章側欄',
    policy: '營運與驗證方針',
    levels: '等級',
    troubleshooting: '問題排查'
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

function renderArticleChrome(localeKey, title, newline) {
  const locale = LOCALES[localeKey];
  const labels = LOCALE_LAYOUT[localeKey];
  const homeHref = '/' + localeKey + '/';
  const guidesHref = homeHref + 'articles/';
  return [
    CHROME_START,
    '<header class="site-header intl-article-site-header">',
    '  <div class="site-header-inner">',
    '    <a class="site-logo" href="' + homeHref + '"><span aria-hidden="true">🎮</span><span class="site-logo-text">' + escapeHtml(locale.siteName) + '</span></a>',
    '    <nav class="site-header-links" aria-label="' + escapeHtml(labels.navigation) + '">',
    '      <a href="' + guidesHref + '">' + escapeHtml(locale.blog) + '</a>',
    '      <a href="/author/katakata.html">' + escapeHtml(labels.policy) + '</a>',
    '    </nav>',
    '  </div>',
    '</header>',
    '<nav class="global-nav intl-global-nav" aria-label="' + escapeHtml(labels.primary) + '">',
    '  <div class="global-nav-inner">',
    '    <a class="nav-item" href="' + homeHref + '"><span>' + escapeHtml(locale.home) + '</span></a>',
    '    <a class="nav-item active" href="' + guidesHref + '"><span>' + escapeHtml(locale.blog) + '</span></a>',
    '    <a class="nav-item" href="' + guidesHref + 'google-play-points-levels.html"><span>' + escapeHtml(labels.levels) + '</span></a>',
    '    <a class="nav-item" href="' + guidesHref + 'google-play-points-not-showing.html"><span>' + escapeHtml(labels.troubleshooting) + '</span></a>',
    '  </div>',
    '</nav>',
    '<div class="breadcrumbs-wrapper intl-article-breadcrumbs">',
    '  <nav aria-label="' + escapeHtml(labels.breadcrumb) + '">',
    '    <a href="' + homeHref + '">' + escapeHtml(locale.home) + '</a><span aria-hidden="true">&gt;</span>',
    '    <a href="' + guidesHref + '">' + escapeHtml(locale.blog) + '</a><span aria-hidden="true">&gt;</span>',
    '    <span class="intl-breadcrumb-current">' + escapeHtml(title) + '</span>',
    '  </nav>',
    '</div>',
    CHROME_END
  ].join(newline);
}

function renderSidebar(localeKey, newline) {
  const locale = LOCALES[localeKey];
  const labels = LOCALE_LAYOUT[localeKey];
  const homeHref = '/' + localeKey + '/';
  const articles = Array.isArray(locale.articles) ? locale.articles.slice(0, 4) : [];
  return [
    '<aside class="sidebar-column intl-article-sidebar" aria-label="' + escapeHtml(labels.sidebar) + '">',
    '  <section class="sidebar-widget">',
    '    <h2 class="sidebar-widget-title">' + escapeHtml(locale.siteName) + '</h2>',
    '    <div class="sidebar-widget-body">',
    '      <div class="sidebar-calc-banner">',
    '        <a class="sidebar-calc-btn" href="' + homeHref + '">' + escapeHtml(locale.home) + '</a>',
    '      </div>',
    '    </div>',
    '  </section>',
    '  <section class="sidebar-widget">',
    '    <h2 class="sidebar-widget-title">' + escapeHtml(locale.relatedTitle) + '</h2>',
    '    <div class="sidebar-widget-body">',
    '      <ul class="sidebar-article-list">',
    ...articles.map(([href, label]) => '        <li><a href="' + escapeHtml(href) + '">' + escapeHtml(label) + '</a></li>'),
    '      </ul>',
    '    </div>',
    '  </section>',
    '  <section class="sidebar-widget intl-sidebar-policy">',
    '    <h2 class="sidebar-widget-title">' + escapeHtml(labels.policy) + '</h2>',
    '    <div class="sidebar-widget-body"><a href="/author/katakata.html">' + escapeHtml(locale.policyLabel) + '</a></div>',
    '  </section>',
    '</aside>'
  ].join(newline);
}

function renderArticleLayout(localeKey, mainHtml, newline) {
  return [
    LAYOUT_START,
    '<div class="layout-container intl-layout-container">',
    mainHtml,
    renderSidebar(localeKey, newline),
    '</div>',
    LAYOUT_END
  ].join(newline);
}

function synchronizeArticle(html, localeKey, relativePath) {
  const newline = html.includes('\r\n') ? '\r\n' : '\n';
  const withoutChrome = html.replace(markerPattern(CHROME_START, CHROME_END), newline);
  const unwrapped = unwrapGeneratedLayout(withoutChrome, relativePath);
  const title = extractArticleTitle(unwrapped, relativePath);
  const main = findMainBlock(unwrapped, relativePath);
  const mainHtml = unwrapped.slice(main.start, main.end);
  const chrome = renderArticleChrome(localeKey, title, newline);
  const layout = renderArticleLayout(localeKey, mainHtml, newline);
  return unwrapped.slice(0, main.start).replace(/\s*$/, newline) + chrome + newline + layout + unwrapped.slice(main.end);
}

function synchronizeIntlArticleStylesheet(rootDir) {
  const cssPath = path.join(rootDir, 'en', 'articles', 'intl-article.css');
  fs.mkdirSync(path.dirname(cssPath), { recursive: true });
  const before = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
  if (before === INTL_LAYOUT_CSS) return false;
  fs.writeFileSync(cssPath, INTL_LAYOUT_CSS, 'utf8');
  return true;
}

function synchronizeIntlArticleLayouts(rootDir) {
  const summary = { checked: 0, changed: 0, stylesheetChanged: synchronizeIntlArticleStylesheet(rootDir) };
  for (const localeKey of Object.keys(LOCALE_LAYOUT)) {
    const articleDir = path.join(rootDir, localeKey, 'articles');
    if (!fs.existsSync(articleDir)) continue;
    const files = fs.readdirSync(articleDir).filter(file => file.endsWith('.html') && file !== 'index.html');
    for (const file of files) {
      const absolutePath = path.join(articleDir, file);
      const relativePath = path.posix.join(localeKey, 'articles', file);
      const before = fs.readFileSync(absolutePath, 'utf8');
      const after = synchronizeArticle(before, localeKey, relativePath);
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
  synchronizeIntlArticleLayouts,
  synchronizeIntlArticleStylesheet
};