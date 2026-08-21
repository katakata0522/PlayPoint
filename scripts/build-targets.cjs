'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { getIntlContentExpansionFiles } = require('./intl-content-expansion.cjs');
const { getIntlSeoFiles } = require('./intl-seo-pages.cjs');
const { EDITORIAL_TARGETS } = require('./article-editorial-structure.cjs');
const { getGamePageHtmlFiles } = require('./game-page-targets.cjs');
const { createLocales } = require('./locale-config.cjs');
const {
  CONTENT_DATE_OVERRIDES,
  isGeneratedGamePagePath
} = require('./content-dates.cjs');

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

const generatedLocaleFiles = Object.keys(createLocales())
  .map(locale => `${locale}/index.html`);

function getStaticSyncedHtmlFiles() {
  return Object.keys(CONTENT_DATE_OVERRIDES)
    .filter(file => !isGeneratedGamePagePath(file));
}

const staticSyncedHtmlFiles = getStaticSyncedHtmlFiles();

function getSyncedHtmlFiles(currentRootDir = rootDir) {
  return [
    ...staticSyncedHtmlFiles,
    ...getGamePageHtmlFiles(currentRootDir)
  ];
}

const syncedHtmlFiles = getSyncedHtmlFiles();

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
  getStaticSyncedHtmlFiles,
  getSyncedHtmlFiles,
  syncedHtmlFiles
};
