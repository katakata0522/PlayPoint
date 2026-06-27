'use strict';

const fs = require('fs');
const path = require('path');

const TOP_PAGE_URLS = [
  'https://playpoint-sim.com/',
  'https://playpoint-sim.com/en/',
  'https://playpoint-sim.com/ko/',
  'https://playpoint-sim.com/tw/'
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

function syncSitemap(rootDir, todayStr) {
  const sitemapPath = path.join(rootDir, 'sitemap.xml');
  if (!fs.existsSync(sitemapPath)) {
    return false;
  }

  const content = syncSitemapContent(fs.readFileSync(sitemapPath, 'utf8'), todayStr);
  fs.writeFileSync(sitemapPath, content, 'utf8');
  console.log(`Successfully unified sitemap.xml line endings to LF and updated top-page lastmod to ${todayStr}.`);
  return true;
}

module.exports = {
  TOP_PAGE_URLS,
  escapeRegExp,
  syncSitemap,
  syncSitemapContent
};
