'use strict';

const fs = require('fs');
const path = require('path');
const { getIntlSitemapEntries } = require('./intl-seo-pages.cjs');

const SITE_ORIGIN = 'https://playpoint-sim.com';
const TOP_PAGE_URLS = [
  `${SITE_ORIGIN}/`,
  `${SITE_ORIGIN}/en/`,
  `${SITE_ORIGIN}/ko/`,
  `${SITE_ORIGIN}/tw/`
];

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function syncSitemapContent(sitemapContent, todayStr, urls = TOP_PAGE_URLS) {
  let content = sitemapContent.replace(/\r\n/g, '\n');

  if (!content.endsWith('\n')) {
    content += '\n';
  }

  for (const url of urls) {
    const pattern = new RegExp(`(<loc>${escapeRegExp(url)}</loc>\\s*<lastmod>)\\d{4}-\\d{2}-\\d{2}(</lastmod>)`);
    content = content.replace(pattern, `$1${todayStr}$2`);
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

    const entry = `  <url>\n    <loc>${url}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
    content = content.replace('</urlset>', `${entry}</urlset>`);
  }

  return content;
}

function getBlogSitemapEntries(rootDir) {
  const articlesPath = path.join(rootDir, 'blog', 'articles.json');
  if (!fs.existsSync(articlesPath)) return [];

  return JSON.parse(fs.readFileSync(articlesPath, 'utf8'))
    .filter(article => article && article.file && article.date)
    .map(article => ({
      url: `${SITE_ORIGIN}/${String(article.file).replace(/^\.\.\//, '')}`,
      lastmod: article.modified || article.date
    }));
}

function renderBlogSitemap(entries) {
  const latestDate = entries.reduce(
    (latest, entry) => String(entry.lastmod) > latest ? String(entry.lastmod) : latest,
    '2024-01-01'
  );
  const articleEntries = entries.map(({ url, lastmod }) => `  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_ORIGIN}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${SITE_ORIGIN}/blog/</loc>
    <lastmod>${latestDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
${articleEntries}
</urlset>
`;
}

function syncSitemap(rootDir, todayStr) {
  const sitemapPath = path.join(rootDir, 'sitemap.xml');
  if (!fs.existsSync(sitemapPath)) {
    return false;
  }

  const blogEntries = getBlogSitemapEntries(rootDir);
  const latestBlogDate = blogEntries.reduce(
    (latest, entry) => String(entry.lastmod) > latest ? String(entry.lastmod) : latest,
    todayStr
  );
  const discoverableBlogEntries = [
    { url: `${SITE_ORIGIN}/blog/`, lastmod: latestBlogDate },
    ...blogEntries
  ];
  const topPageSynced = syncSitemapContent(fs.readFileSync(sitemapPath, 'utf8'), todayStr);
  const content = syncSitemapEntries(topPageSynced, [
    ...getIntlSitemapEntries(todayStr),
    ...discoverableBlogEntries
  ]);

  fs.writeFileSync(sitemapPath, content, 'utf8');
  fs.writeFileSync(path.join(rootDir, 'blog', 'sitemap.xml'), renderBlogSitemap(blogEntries), 'utf8');
  console.log(`Updated sitemap.xml and blog/sitemap.xml with current article dates (${blogEntries.length} articles).`);
  return true;
}

module.exports = {
  SITE_ORIGIN,
  TOP_PAGE_URLS,
  escapeRegExp,
  getBlogSitemapEntries,
  renderBlogSitemap,
  syncSitemap,
  syncSitemapContent,
  syncSitemapEntries
};
