'use strict';
const fs = require('node:fs');
const path = require('node:path');
const BlogUtils = require('../blog/utils.js');
const { escapeHtml } = require('./blog-feeds.cjs');
const { ensureAnalyticsCoreScript } = require('./analytics-runtime-sync.cjs');
const { createRevision } = require('./article-asset-versioning.cjs');
const PAGE_SIZE = 12;
const ORIGIN = 'https://playpoint-sim.com';
function listed(root) {
  return BlogUtils.sortListedArticles(JSON.parse(fs.readFileSync(path.join(root, 'blog/articles.json'), 'utf8')).map(BlogUtils.normalizeArticle)
    .filter(article => article.file !== '#' && article.listed !== false && !/side[ -]?fire|サイドfire/i.test(article.title + ' ' + article.description + ' ' + article.tags.join(' '))), { mode: 'newest' });
}
function pagePath(page) { return page === 1 ? '/blog/' : `/blog/page/${page}/`; }
function staticPageFiles(root) { return Array.from({ length: Math.max(0, Math.ceil(listed(root).length / PAGE_SIZE) - 1) }, (_, index) => `blog/page/${index + 2}/index.html`); }
function absoluteBlogLinks(html) {
  html = html.replace(/\b(href|src|action|data-src)="([^"<>]+)"/g, (whole, attr, value) => {
    if (/^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(value)) return whole;
    const url = new URL(value.replaceAll('&amp;', '&'), ORIGIN + '/blog/');
    return `${attr}="${escapeHtml(url.pathname + url.search + url.hash)}"`;
  });
  return html.replace(/\b(srcset|data-srcset)="([^"]+)"/g, (whole, attr, value) => `${attr}="${value.replace(/\.\.\//g, '/')}"`);
}
function pagination(page, count) {
  const link = (number, label, direction) => `<a class="pagination-nav pagination-box pagination-${direction}" href="${pagePath(number)}">${label}</a>`;
  return `<!-- static-pagination:start --><div class="pagination-compact-wrapper">${page > 1 ? link(page - 1, '← 前へ', 'prev') : '<span class="pagination-nav pagination-box" aria-disabled="true">← 前へ</span>'}<span aria-current="page">${page} / ${count}ページ</span>${page < count ? link(page + 1, '次へ →', 'next') : '<span class="pagination-nav pagination-box" aria-disabled="true">次へ →</span>'}</div><!-- static-pagination:end -->`;
}
function renderStaticPage(template, articles, page, coreVersion = '') {
  const count = Math.ceil(articles.length / PAGE_SIZE), items = articles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const description = `Google Play Pointsの記事一覧（${page}ページ目）。${(page - 1) * PAGE_SIZE + 1}〜${Math.min(page * PAGE_SIZE, articles.length)}件目、全${articles.length}件。${items.slice(0, 2).map(article => article.listTitle || article.title).join('、')}などの記事を掲載しています。`;
  let html = template.replace(/\s*<!-- static-pagination:start -->[\s\S]*?<!-- static-pagination:end -->/g, '');
  const cards = items.map((article, i) => `<a class="article-card${article.thumbnailKind !== 'app-icon' ? ' article-card--visual' : ''}" data-blog-initial-card="true" data-blog-initial-signature="${escapeHtml(BlogUtils.articleCardIdentity(article))}" href="${escapeHtml(article.file)}" aria-label="${escapeHtml(article.title)}">${BlogUtils.articleCardMarkup(article, { first: i === 0, staticCard: true })}</a>`).join('\n');
  html = html.replace(/(<div\b[^>]*id="article-grid"[^>]*>)[\s\S]*?(?=<noscript>)/, '$1\n' + cards + '\n');
  html = html.replace(/(<div\b[^>]*id="pagination"[^>]*>)\s*(?:<!-- Populated by JS -->\s*)?(<\/div>)/, '$1' + pagination(page, count) + '$2');
  html = html.replace(/(<p\b[^>]*id="article-page-summary"[^>]*>)[\s\S]*?(<\/p>)/, `$1${(page - 1) * PAGE_SIZE + 1}〜${Math.min(page * PAGE_SIZE, articles.length)}件目 / ${articles.length}件 · ${page} / ${count}ページ$2`);
  html = html.replace(/<body\b[^>]*>/, tag => tag.replace(/\sdata-blog-page="\d+"/, '').replace('>', ` data-blog-page="${page}">`));
  if (page > 1) html = html.replace(/\s*<link\b(?=[^>]*\bhreflang=)[^>]*>/g, '').replace(/(<script\b[^>]*type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/g, (whole, start, json, end) => {
    const data = JSON.parse(json);
    if (data['@type'] === 'Blog') return start + JSON.stringify({ '@context': 'https://schema.org', '@type': 'CollectionPage', url: ORIGIN + pagePath(page), name: `Google Play Points 記事一覧（${page}ページ目）`, description, inLanguage: 'ja', isPartOf: { '@type': 'Blog', url: ORIGIN + '/blog/' } }) + end;
    if (data['@type'] === 'BreadcrumbList') data.itemListElement.push({ '@type': 'ListItem', position: data.itemListElement.length + 1, name: `${page}ページ目`, item: ORIGIN + pagePath(page) });
    return start + JSON.stringify(data) + end;
  });
  const title = 'Google Play Points 記事一覧' + (page > 1 ? `（${page}ページ目）` : '') + ' | PlayPoint';
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
    .replace(/(<link\b[^>]*rel="canonical"[^>]*href=")[^"]*(")/, '$1' + ORIGIN + pagePath(page) + '$2')
    .replace(/(<meta\b[^>]*(?:property|name)="(?:og:url)"[^>]*content=")[^"]*(")/, '$1' + ORIGIN + pagePath(page) + '$2')
    .replace(/(<meta\b[^>]*(?:property|name)="(?:og:title|twitter:title)"[^>]*content=")[^"]*(")/g, '$1' + title + '$2');
  if (page === 1) return html;
  html = html.replace(/(<meta\b[^>]*(?:property|name)="(?:description|og:description|twitter:description)"[^>]*content=")[^"]*(")/g, '$1' + escapeHtml(description) + '$2');
  const normalized = ensureAnalyticsCoreScript(absoluteBlogLinks(html));
  return coreVersion ? normalized.replace('src="/js/analytics-core.js"', `src="/js/analytics-core.js?v=${coreVersion}"`) : normalized;
}
function syncBlogStaticPages(root) {
  const file = path.join(root, 'blog/index.html'), articles = listed(root), template = fs.readFileSync(file, 'utf8');
  const coreVersion = createRevision(path.join(root, 'js/analytics-core.js'));
  fs.writeFileSync(file, renderStaticPage(template, articles, 1));
  const files = staticPageFiles(root);
  for (const [i, relative] of files.entries()) {
    const target = path.join(root, relative); fs.mkdirSync(path.dirname(target), { recursive: true });
    const html = renderStaticPage(template, articles, i + 2, coreVersion);
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== html) fs.writeFileSync(target, html);
  }
  return { pages: files.length + 1, articles: articles.length };
}
function staticPageEntries(root) { return staticPageFiles(root).map(file => ({ url: ORIGIN + '/' + file.replace(/index\.html$/, ''), lastmod: '2026-10-04' })); }
module.exports = { PAGE_SIZE, listed, pagePath, staticPageFiles, staticPageEntries, absoluteBlogLinks, pagination, renderStaticPage, syncBlogStaticPages };
