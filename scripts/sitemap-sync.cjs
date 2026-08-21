'use strict';

const fs = require('fs');
const path = require('path');
const { getGamePageHtmlFiles } = require('./game-page-targets.cjs');
const { getIntlSitemapEntries } = require('./intl-seo-pages.cjs');
const { createLocales } = require('./locale-config.cjs');
const { CONTENT_DATE_OVERRIDES, TOP_PAGE_CONTENT_DATES } = require('./content-dates.cjs');

const SITE_ORIGIN = 'https://playpoint-sim.com';
const TOP_PAGE_URLS = [
  `${SITE_ORIGIN}/`,
  `${SITE_ORIGIN}/en/`,
  `${SITE_ORIGIN}/ko/`,
  `${SITE_ORIGIN}/tw/`
];
const NON_PLAYPOINT_URLS = new Set([
  `${SITE_ORIGIN}/tools/gravity-todo/`,
  `${SITE_ORIGIN}/kids-smile-land/`,
  `${SITE_ORIGIN}/articles/2026-06-29-savings-game-fire.html`,
  `${SITE_ORIGIN}/doujin-shi-calculator/`
]);
const RETIRED_CONTENT_URLS = new Set([
  `${SITE_ORIGIN}/articles/2025-12-25-playpoints-not-reflected.html`,
  `${SITE_ORIGIN}/en/articles/google-play-points-reflection-timing.html`
]);
const SEARCH_QUALITY_HOLD_URLS = new Set([
  `${SITE_ORIGIN}/articles/2026-08-17-diamond-valley-festival-guide.html`,
  `${SITE_ORIGIN}/articles/2026-08-17-tgs-google-play-vip.html`
]);
const DEDICATED_SITEMAP_PATTERN = /^sitemap-intl-.*\.xml$/;
const GENERATED_LISTED_START = '<!-- generated-listed-articles:start -->';
const GENERATED_LISTED_END = '<!-- generated-listed-articles:end -->';

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toPublicUrl(file) {
  const normalized = String(file).replace(/\\/g, '/');
  const publicPath = normalized.endsWith('/index.html')
    ? normalized.slice(0, -'index.html'.length)
    : normalized;
  return `${SITE_ORIGIN}/${publicPath}`;
}

function getContentDateEntries() {
  const localeEntries = Object.entries(createLocales())
    .filter(([, config]) => config.modifiedAt)
    .map(([locale, config]) => ({
      url: `${SITE_ORIGIN}/${locale}/`,
      lastmod: config.modifiedAt
    }));
  const htmlEntries = Object.entries(CONTENT_DATE_OVERRIDES).map(([file, lastmod]) => ({
    url: toPublicUrl(file),
    lastmod
  }));
  return [...htmlEntries, ...localeEntries];
}

function getDedicatedSitemapUrls(rootDir) {
  const urls = new Set();
  for (const file of fs.readdirSync(rootDir).filter(name => DEDICATED_SITEMAP_PATTERN.test(name))) {
    const content = fs.readFileSync(path.join(rootDir, file), 'utf8');
    for (const match of content.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      urls.add(match[1]);
    }
  }
  return urls;
}

function syncDedicatedSitemapDates(rootDir, entries) {
  for (const file of fs.readdirSync(rootDir).filter(name => DEDICATED_SITEMAP_PATTERN.test(name))) {
    const filePath = path.join(rootDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const relevantEntries = entries.filter(entry => content.includes(`<loc>${entry.url}</loc>`));
    if (!relevantEntries.length) continue;
    fs.writeFileSync(filePath, syncSitemapEntries(content, relevantEntries).replace(/\r\n/g, '\n'), 'utf8');
  }
}

function removeSitemapEntries(sitemapContent, urls) {
  return sitemapContent.replace(/\s*<url>\s*<loc>([^<]+)<\/loc>[\s\S]*?<\/url>/g, (entry, url) => (
    urls.has(url) ? '' : entry
  ));
}

function removeIgnoredSitemapHints(sitemapContent) {
  return sitemapContent
    .replace(/^[ \t]*<changefreq>[^<]*<\/changefreq>[ \t]*\n/gm, '')
    .replace(/^[ \t]*<priority>[^<]*<\/priority>[ \t]*\n/gm, '');
}

function syncSitemapContent(sitemapContent, contentDates = TOP_PAGE_CONTENT_DATES, urls = TOP_PAGE_URLS) {
  let content = sitemapContent.replace(/\r\n/g, '\n');

  if (!content.endsWith('\n')) {
    content += '\n';
  }

  const datesByUrl = new Map([
    [`${SITE_ORIGIN}/`, contentDates.ja],
    [`${SITE_ORIGIN}/en/`, contentDates.en],
    [`${SITE_ORIGIN}/ko/`, contentDates.ko],
    [`${SITE_ORIGIN}/tw/`, contentDates.tw]
  ]);

  for (const url of urls) {
    const pattern = new RegExp(`(<loc>${escapeRegExp(url)}</loc>\\s*<lastmod>)\\d{4}-\\d{2}-\\d{2}(</lastmod>)`);
    content = content.replace(pattern, `$1${datesByUrl.get(url)}$2`);
  }

  return content;
}

function syncSitemapEntries(sitemapContent, entries) {
  let content = sitemapContent;

  for (const { url, lastmod } of entries) {
    const pattern = new RegExp(`(<url>\\s*<loc>${escapeRegExp(url)}</loc>\\s*<lastmod>)\\d{4}-\\d{2}-\\d{2}(</lastmod>[\\s\\S]*?</url>)`);
    if (pattern.test(content)) {
      content = content.replace(pattern, `$1${lastmod}$2`);
      continue;
    }

    const entry = `  <url>\n    <loc>${url}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>\n`;
    content = content.replace('</urlset>', `${entry}</urlset>`);
  }

  return content;
}

function getBlogSitemapEntries(rootDir) {
  const articlesPath = path.join(rootDir, 'blog', 'articles.json');
  if (!fs.existsSync(articlesPath)) return [];

  return JSON.parse(fs.readFileSync(articlesPath, 'utf8'))
    .filter(article => article && article.file && article.date && article.listed !== false)
    .map(article => ({
      url: `${SITE_ORIGIN}/${String(article.file).replace(/^\.\.\//, '')}`,
      lastmod: article.modified || article.date
    }))
    .filter(entry => !SEARCH_QUALITY_HOLD_URLS.has(entry.url));
}

function listedJapaneseSitemapEntries(rootDir) {
  const articlesPath = path.join(rootDir, 'blog', 'articles.json');
  if (!fs.existsSync(articlesPath)) return [];

  return JSON.parse(fs.readFileSync(articlesPath, 'utf8'))
    .filter(article => article && article.listed !== false && article.file && article.title && article.date)
    .filter(article => /^\.\.\/articles\/[^/]+\.html$/.test(article.file))
    .sort((left, right) => String(right.modified || right.date).localeCompare(String(left.modified || left.date)))
    .map(article => ({
      href: String(article.file).replace(/^\.\.\//, ''),
      title: article.title
    }));
}

function stripGeneratedListedArticles(html) {
  const start = html.indexOf(GENERATED_LISTED_START);
  const end = html.indexOf(GENERATED_LISTED_END);
  if (start < 0 || end < start) return html;
  return html.slice(0, start) + html.slice(end + GENERATED_LISTED_END.length);
}

function renderGeneratedListedArticles(items) {
  if (items.length === 0) return '';
  const newline = '\n';
  const list = items
    .map(item => `        <li><a href="${escapeHtml(item.href)}">${escapeHtml(item.title)}</a></li>`)
    .join(newline);
  return `${GENERATED_LISTED_START}
    <section class="group" data-generated-listed-articles="true">
      <h2>公開中の解説記事</h2>
      <ul>
${list}
      </ul>
    </section>
    ${GENERATED_LISTED_END}`;
}

function upsertGeneratedListedArticles(html, block) {
  let next = stripGeneratedListedArticles(html);
  next = next.replace(/\n{3,}/g, '\n\n');
  if (!block) return next;

  const policyHeading = next.indexOf('<h2>ポリシー</h2>');
  if (policyHeading < 0) {
    throw new Error('sitemap.html にポリシー欄がありません');
  }
  const sectionStart = next.lastIndexOf('<section', policyHeading);
  const prefix = next.slice(0, sectionStart).replace(/\s+$/, '\n\n    ');
  return `${prefix}${block}\n\n    ${next.slice(sectionStart)}`;
}

function syncHumanSitemapListedArticles(rootDir) {
  const sitemapPath = path.join(rootDir, 'sitemap.html');
  if (!fs.existsSync(sitemapPath)) return 0;

  const original = fs.readFileSync(sitemapPath, 'utf8');
  const listed = listedJapaneseSitemapEntries(rootDir);
  const outsideGenerated = stripGeneratedListedArticles(original);
  const existing = new Set(
    [...outsideGenerated.matchAll(/href="(articles\/[^"]+\.html)"/g)].map(match => match[1])
  );
  const missing = listed.filter(item => !existing.has(item.href));
  const next = upsertGeneratedListedArticles(original, renderGeneratedListedArticles(missing));
  if (next !== original) fs.writeFileSync(sitemapPath, next, 'utf8');
  return missing.length;
}

function renderBlogSitemap(entries) {
  const latestDate = entries.reduce(
    (latest, entry) => String(entry.lastmod) > latest ? String(entry.lastmod) : latest,
    '2024-01-01'
  );
  const articleEntries = entries.map(({ url, lastmod }) => `  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_ORIGIN}/</loc>
  </url>
  <url>
    <loc>${SITE_ORIGIN}/blog/</loc>
    <lastmod>${latestDate}</lastmod>
  </url>
${articleEntries}
</urlset>
`;
}

function getGameSitemapEntries(rootDir) {
  const dateFor = (relativePath) => CONTENT_DATE_OVERRIDES[relativePath] || TOP_PAGE_CONTENT_DATES.ja;
  const htmlDateFor = (filePath, relativePath) => {
    try {
      const html = fs.readFileSync(filePath, 'utf8');
      const match = html.match(/<meta name=\"last-modified\" content=\"(\d{4}-\d{2}-\d{2})\"/);
      if (match) return match[1];
    } catch (error) {
      // Fall through to the editorial date table when the page cannot be read.
    }
    return dateFor(relativePath);
  };

  return getGamePageHtmlFiles(rootDir).map(relativePath => ({
    url: toPublicUrl(relativePath),
    lastmod: htmlDateFor(path.join(rootDir, relativePath), relativePath)
  }));
}

function syncSitemap(rootDir) {
  const sitemapPath = path.join(rootDir, 'sitemap.xml');
  if (!fs.existsSync(sitemapPath)) {
    return false;
  }

  const blogEntries = getBlogSitemapEntries(rootDir);
  syncDedicatedSitemapDates(rootDir, blogEntries);
  const latestBlogDate = blogEntries.reduce(
    (latest, entry) => String(entry.lastmod) > latest ? String(entry.lastmod) : latest,
    TOP_PAGE_CONTENT_DATES.ja
  );
  const discoverableBlogEntries = [
    { url: `${SITE_ORIGIN}/blog/`, lastmod: latestBlogDate },
    ...blogEntries
  ];
  const gameEntries = getGameSitemapEntries(rootDir);
  const topPageSynced = syncSitemapContent(fs.readFileSync(sitemapPath, 'utf8'));
  let content = syncSitemapEntries(topPageSynced, [
    ...getIntlSitemapEntries(),
    ...discoverableBlogEntries,
    ...gameEntries,
    ...getContentDateEntries()
  ]);
  const excludedUrls = new Set([
    ...NON_PLAYPOINT_URLS,
    ...RETIRED_CONTENT_URLS,
    ...SEARCH_QUALITY_HOLD_URLS,
    ...getDedicatedSitemapUrls(rootDir)
  ]);
  content = removeSitemapEntries(content, excludedUrls);
  content = removeIgnoredSitemapHints(content);

  fs.writeFileSync(sitemapPath, content, 'utf8');
  fs.writeFileSync(path.join(rootDir, 'blog', 'sitemap.xml'), renderBlogSitemap(blogEntries), 'utf8');
  const humanSitemapCount = syncHumanSitemapListedArticles(rootDir);
  console.log(`Updated sitemap.xml and blog/sitemap.xml with current article dates (${blogEntries.length} articles).`);
  console.log(`[sitemap.html] synchronized listed article links: ${humanSitemapCount}`);
  return true;
}

module.exports = {
  SITE_ORIGIN,
  TOP_PAGE_URLS,
  NON_PLAYPOINT_URLS,
  RETIRED_CONTENT_URLS,
  SEARCH_QUALITY_HOLD_URLS,
  escapeRegExp,
  getBlogSitemapEntries,
  getGameSitemapEntries,
  listedJapaneseSitemapEntries,
  syncDedicatedSitemapDates,
  getContentDateEntries,
  getDedicatedSitemapUrls,
  removeIgnoredSitemapHints,
  removeSitemapEntries,
  renderBlogSitemap,
  syncHumanSitemapListedArticles,
  syncSitemap,
  syncSitemapContent,
  syncSitemapEntries,
  toPublicUrl
};
