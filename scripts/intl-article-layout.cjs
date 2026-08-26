'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { LOCALES } = require('./intl-seo-content.cjs');

const CHROME_START = '<!-- INTL_ARTICLE_CHROME_START -->';
const CHROME_END = '<!-- INTL_ARTICLE_CHROME_END -->';
const LOCALE_ACCESSIBILITY = Object.freeze({
  en: { navigation: 'Article navigation', breadcrumb: 'Breadcrumb', policy: 'Editorial policy' },
  ko: { navigation: '기사 탐색', breadcrumb: '탐색 경로', policy: '운영 및 검증 방침' },
  tw: { navigation: '文章導覽', breadcrumb: '導覽路徑', policy: '營運與驗證方針' }
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

function extractArticleTitle(html, relativePath) {
  const match = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (!match) throw new Error(relativePath + ': article h1 is missing');
  const rawTitle = match[1].trim();
  if (/[<>]/.test(rawTitle)) throw new Error(relativePath + ': article h1 must contain plain text');
  return decodeHtmlEntities(rawTitle.replace(/\s+/g, ' '));
}

function renderArticleChrome(localeKey, title, newline) {
  const locale = LOCALES[localeKey];
  const accessibility = LOCALE_ACCESSIBILITY[localeKey];
  const homeHref = '/' + localeKey + '/';
  const guidesHref = homeHref + 'articles/';
  const lines = [
    CHROME_START,
    '<header class="site-header intl-article-site-header">',
    '  <div class="site-header-inner">',
    '    <a class="site-logo" href="' + homeHref + '"><span aria-hidden="true">🎮</span><span class="site-logo-text">' + escapeHtml(locale.siteName) + '</span></a>',
    '    <nav class="site-header-links" aria-label="' + escapeHtml(accessibility.navigation) + '">',
    '      <a href="' + homeHref + '">' + escapeHtml(locale.home) + '</a>',
    '      <a href="' + guidesHref + '">' + escapeHtml(locale.blog) + '</a>',
    '      <a href="/author/katakata.html">' + escapeHtml(accessibility.policy) + '</a>',
    '    </nav>',
    '  </div>',
    '</header>',
    '<div class="breadcrumbs-wrapper intl-article-breadcrumbs">',
    '  <nav aria-label="' + escapeHtml(accessibility.breadcrumb) + '">',
    '    <a href="' + homeHref + '">' + escapeHtml(locale.home) + '</a><span aria-hidden="true">&gt;</span>',
    '    <a href="' + guidesHref + '">' + escapeHtml(locale.blog) + '</a><span aria-hidden="true">&gt;</span>',
    '    <span class="intl-breadcrumb-current">' + escapeHtml(title) + '</span>',
    '  </nav>',
    '</div>',
    CHROME_END
  ];
  return lines.join(newline);
}

function synchronizeArticle(html, localeKey, relativePath) {
  const mainMatches = html.match(/<main\s+class="main-card">/g) || [];
  if (mainMatches.length !== 1) {
    throw new Error(relativePath + ': expected exactly one main-card, found ' + mainMatches.length);
  }

  const newline = html.includes('\r\n') ? '\r\n' : '\n';
  const withoutChrome = html.replace(
    new RegExp('\\s*' + CHROME_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?' + CHROME_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*', 'g'),
    newline
  );
  const title = extractArticleTitle(withoutChrome, relativePath);
  const chrome = renderArticleChrome(localeKey, title, newline);
  return withoutChrome.replace(
    /\s*<main class="main-card">/,
    newline + chrome + newline + '<main class="main-card">'
  );
}

function synchronizeIntlArticleLayouts(rootDir) {
  const summary = { checked: 0, changed: 0 };
  for (const localeKey of Object.keys(LOCALE_ACCESSIBILITY)) {
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
  synchronizeIntlArticleLayouts
};
