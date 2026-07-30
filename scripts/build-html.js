'use strict';

const path = require('path');
const { applyEditorialStructure } = require('./article-editorial-structure.cjs');
const { syncServiceWorkerAssets } = require('./asset-sync.cjs');
const { syncIndexMetadata } = require('./build-metadata.cjs');
const { createLocales } = require('./locale-config.cjs');
const { generateBlogFeeds } = require('./blog-feeds.cjs');
const { writeIntlSeoPages } = require('./intl-seo-pages.cjs');
const { writeLocalizedPages } = require('./language-page-builder.cjs');
const { syncedHtmlFiles } = require('./build-targets.cjs');
const { syncHtmlFiles } = require('./html-sync.cjs');
const { sanitizeInternalLinks } = require('./internal-link-attribution.cjs');
const { syncSitemap } = require('./sitemap-sync.cjs');
const { stripExternalGoogleFonts } = require('./external-fonts.cjs');

const rootDir = path.join(__dirname, '..');

const { assetVersion, indexHtml, todayStr } = syncIndexMetadata(rootDir);
const locales = createLocales(todayStr);

const editorialArticleCount = applyEditorialStructure(rootDir, todayStr);
console.log(`[build-html] synchronized editorial structure: ${editorialArticleCount}`);

writeLocalizedPages(rootDir, indexHtml, locales);

const assetVersions = syncServiceWorkerAssets(rootDir, assetVersion, todayStr, indexHtml);

writeIntlSeoPages(rootDir, assetVersions, todayStr);

syncHtmlFiles(rootDir, syncedHtmlFiles, assetVersions, todayStr);

syncSitemap(rootDir, todayStr);

generateBlogFeeds(rootDir);

const strippedFontFiles = stripExternalGoogleFonts(rootDir);
console.log(`[build-html] stripped external Google Fonts: ${strippedFontFiles}`);

const sanitizedInternalLinkFiles = sanitizeInternalLinks(rootDir);
console.log(`[build-html] sanitized internal attribution links: ${sanitizedInternalLinkFiles}`);
