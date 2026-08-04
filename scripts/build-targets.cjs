'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { getIntlContentExpansionFiles } = require('./intl-content-expansion.cjs');
const { getIntlSeoFiles } = require('./intl-seo-pages.cjs');
const { EDITORIAL_TARGETS } = require('./article-editorial-structure.cjs');

const rootDir = path.resolve(__dirname, '..');
const excludedPublicDirectories = new Set(['.git', '.github', 'docs', 'node_modules', 'scripts', 'tests']);

function getPublicHtmlFiles(currentDir = rootDir) {
  return fs.readdirSync(currentDir, { withFileTypes: true }).flatMap(entry => {
    if (entry.isDirectory() && excludedPublicDirectories.has(entry.name)) return [];
    const absolutePath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) return getPublicHtmlFiles(absolutePath);
    if (!entry.isFile() || !entry.name.endsWith('.html')) return [];
    return [path.relative(rootDir, absolutePath).replaceAll('\\', '/')];
  });
}

const publicHtmlFiles = getPublicHtmlFiles();
const articleHtmlFiles = ['articles', 'en/articles', 'ko/articles', 'tw/articles']
  .flatMap(directory => {
    const absoluteDirectory = path.join(rootDir, directory);
    if (!fs.existsSync(absoluteDirectory)) return [];
    return fs.readdirSync(absoluteDirectory)
      .filter(file => file.endsWith('.html'))
      .map(file => `${directory}/${file}`);
  });

const generatedLocaleFiles = [
  'en/index.html',
  'ko/index.html',
  'tw/index.html'
];

const syncedHtmlFiles = [
  'about-playpoints.html',
  'info.html',
  'changelog.html',
  'attention.html',
  'privacy.html',
  'terms.html',
  'sitemap.html',
  'embed.html',
  'latest/index.html',
  'status/diamond/index.html',
  'status/platinum/index.html',
  'status/gold/index.html',
  'status/silver/index.html',
  'maintenance/platinum/index.html',
  'maintenance/diamond/index.html',
  'campaign/2x/index.html',
  'campaign/3x/index.html',
  'campaign/wait/index.html',
  'amount/10000/index.html',
  'compare/earning-rates/index.html',
  'en/articles/2026-06-20-discount-gift-cards.html',
  'ko/articles/2026-06-20-discount-gift-cards.html',
  'tw/articles/2026-06-20-discount-gift-cards.html'
];

const generatedFiles = [
  'index.html',
  ...generatedLocaleFiles,
  ...getIntlSeoFiles(),
  ...getIntlContentExpansionFiles(),
  'en/articles/intl-article.css',
  'feed.xml',
  'atom.xml',
  'sw.js',
  'js/third-party.js',
  'blog/articles.json',
  ...articleHtmlFiles,
  ...Object.keys(EDITORIAL_TARGETS),
  ...syncedHtmlFiles,
  'sitemap.xml'
];

const uniqueGeneratedFiles = [...new Set([...generatedFiles, ...publicHtmlFiles])];

module.exports = {
  articleHtmlFiles,
  generatedFiles: uniqueGeneratedFiles,
  generatedLocaleFiles,
  syncedHtmlFiles
};
