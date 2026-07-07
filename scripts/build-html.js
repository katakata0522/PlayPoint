'use strict';

const path = require('path');
const { syncServiceWorkerAssets } = require('./asset-sync.cjs');
const { syncIndexMetadata } = require('./build-metadata.cjs');
const { createLocales } = require('./locale-config.cjs');
const { generateBlogFeeds } = require('./blog-feeds.cjs');
const { writeIntlSeoPages } = require('./intl-seo-pages.cjs');
const { writeLocalizedPages } = require('./language-page-builder.cjs');
const { syncedHtmlFiles } = require('./build-targets.cjs');
const { syncHtmlFiles } = require('./html-sync.cjs');
const { syncSitemap } = require('./sitemap-sync.cjs');

const rootDir = path.join(__dirname, '..');

const { assetVersion, indexHtml, todayStr } = syncIndexMetadata(rootDir);
const locales = createLocales(todayStr);

writeLocalizedPages(rootDir, indexHtml, locales);

const assetVersions = syncServiceWorkerAssets(rootDir, assetVersion, todayStr, indexHtml);

writeIntlSeoPages(rootDir, assetVersions, todayStr);

syncHtmlFiles(rootDir, syncedHtmlFiles, assetVersions, todayStr);

syncSitemap(rootDir, todayStr);

generateBlogFeeds(rootDir);
