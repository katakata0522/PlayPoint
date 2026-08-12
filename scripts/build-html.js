'use strict';

const path = require('path');
const { applyEditorialStructure } = require('./article-editorial-structure.cjs');
const { synchronizeArticleStaticUsability } = require('./article-static-usability.cjs');
const {
  syncPublicAssetVersions,
  syncDynamicArticleStylesheetVersion
} = require('./article-asset-versioning.cjs');
const { syncServiceWorkerAssets } = require('./asset-sync.cjs');
const { syncIndexMetadata } = require('./build-metadata.cjs');
const { createLocales } = require('./locale-config.cjs');
const { generateBlogFeeds } = require('./blog-feeds.cjs');
const { applyIntlContentExpansion } = require('./intl-content-expansion.cjs');
const { syncIntlManualContent } = require('./intl-manual-content-sync.cjs');
const { writeIntlSeoPages } = require('./intl-seo-pages.cjs');
const { writeLocalizedPages } = require('./language-page-builder.cjs');
const {
  restoreManualIntlArticles,
  snapshotManualIntlArticles
} = require('./manual-intl-articles.cjs');
const { syncedHtmlFiles } = require('./build-targets.cjs');
const { syncHtmlFiles } = require('./html-sync.cjs');
const { sanitizeInternalLinks } = require('./internal-link-attribution.cjs');
const { syncAnalyticsRuntimeScripts } = require('./analytics-runtime-sync.cjs');
const { syncSitemap } = require('./sitemap-sync.cjs');
const { stripExternalGoogleFonts } = require('./external-fonts.cjs');

const rootDir = path.join(__dirname, '..');

const { assetVersion, indexHtml, todayStr } = syncIndexMetadata(rootDir);
const locales = createLocales(todayStr);

const editorialArticleCount = applyEditorialStructure(rootDir, todayStr);
console.log(`[build-html] synchronized editorial structure: ${editorialArticleCount}`);

const staticUsabilityArticleCount = synchronizeArticleStaticUsability(rootDir);
console.log(`[build-html] synchronized static article usability: ${staticUsabilityArticleCount}`);

writeLocalizedPages(rootDir, indexHtml, locales);

syncDynamicArticleStylesheetVersion(rootDir);
const assetVersions = syncServiceWorkerAssets(rootDir, assetVersion, todayStr, indexHtml);

const manualIntlSnapshots = snapshotManualIntlArticles(rootDir);
try {
  writeIntlSeoPages(rootDir, assetVersions, todayStr);
} finally {
  restoreManualIntlArticles(rootDir, manualIntlSnapshots);
}
syncIntlManualContent(rootDir);
applyIntlContentExpansion(rootDir);

syncHtmlFiles(rootDir, syncedHtmlFiles, assetVersions, todayStr);
syncAnalyticsRuntimeScripts(rootDir);
syncPublicAssetVersions(rootDir);

syncSitemap(rootDir, todayStr);

generateBlogFeeds(rootDir);

const strippedFontFiles = stripExternalGoogleFonts(rootDir);
console.log(`[build-html] stripped external Google Fonts: ${strippedFontFiles}`);

const sanitizedInternalLinkFiles = sanitizeInternalLinks(rootDir);
console.log(`[build-html] sanitized internal attribution links: ${sanitizedInternalLinkFiles}`);
