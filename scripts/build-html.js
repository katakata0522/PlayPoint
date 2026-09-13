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
const { syncJapaneseGuideBrand } = require('./japanese-guide-brand.cjs');
const { applyIntlContentExpansion } = require('./intl-content-expansion.cjs');
const { syncIntlManualContent } = require('./intl-manual-content-sync.cjs');
const { publishLocalizedGameGuides } = require('./intl-game-guide-publish-normalize.cjs');
const { syncIntlArticleJapaneseHreflang } = require('./intl-article-hreflang-sync.cjs');
const { syncJapaneseAuthorHreflang } = require('./author-hreflang-sync.cjs');
const { assertTaiwanTerminology } = require('./tw-terminology-contract.cjs');
const { writeIntlSeoPages } = require('./intl-seo-pages.cjs');
const { synchronizeIntlArticleLayouts } = require('./intl-article-layout.cjs');
const { syncJapaneseNavigation } = require('./japanese-navigation-sidebar.cjs');
const { syncIntlNavigationSidebarV1 } = require('./intl-navigation-sidebar-v1.cjs');
const { syncIntlHubDiscovery } = require('./intl-hub-discovery.cjs');
const {
  applyIntlSemanticSourceOverrides,
  normalizeIntlGeneratedCopy
} = require('./intl-localization-normalize.cjs');
const { writeLocalizedPages } = require('./language-page-builder.cjs');
const { syncVisitorThanks } = require('./visitor-thanks-sync.cjs');
const { syncRegionPages, syncRegionSitemap } = require('./region-page-sync.cjs');
const { syncRegionHreflang } = require('./region-hreflang-sync.cjs');
const { applyLpMonetization } = require('./insert-lp-monetization.cjs');
const { syncManualLpFaqFiles } = require('./lp-faq-sync.cjs');
const { syncManualLpHreflangFiles } = require('./manual-lp-hreflang-sync.cjs');
const { getSyncedHtmlFiles } = require('./build-targets.cjs');
const { syncHtmlFiles } = require('./html-sync.cjs');
const { sanitizeInternalLinks } = require('./internal-link-attribution.cjs');
const { syncAnalyticsRuntimeScripts } = require('./analytics-runtime-sync.cjs');
const { syncSitemap } = require('./sitemap-sync.cjs');
const { stripExternalGoogleFonts } = require('./external-fonts.cjs');
const { normalizeArticleFiles } = require('./article-seo-normalize.cjs');
const { run: normalizeArticleContentNavigation } = require('./article-content-navigation-normalize.cjs');
const { syncArticleDateContract } = require('./article-date-contract.cjs');
const { syncSpeculationRules } = require('./speculation-rules-sync.cjs');
const { syncGameSeo } = require('./game-seo-sync.cjs');
const { syncGameSeoSafety } = require('./game-seo-safety-sync.cjs');
const { syncGameSeoExpanded } = require('./game-seo-expanded-sync.cjs');
const { syncGameSeoWave3 } = require('./game-seo-wave3-sync.cjs');
const { syncGameSeoWave4 } = require('./game-seo-wave4-sync.cjs');
const { syncGameSeoWave5 } = require('./game-seo-wave5-sync.cjs');
const { syncGameSeoWave5RegionalRates } = require('./game-seo-wave5-regional-sync.cjs');

const rootDir = path.join(__dirname, '..');

const { assetVersion, indexHtml, todayStr } = syncIndexMetadata(rootDir);
const locales = createLocales();
const intlSemanticSourceSummary = applyIntlSemanticSourceOverrides(locales);
console.log(`[build-html] applied international semantic overrides: ${intlSemanticSourceSummary.statusPages} query groups / ${intlSemanticSourceSummary.campaignPages} campaign copy groups`);

const editorialArticleCount = applyEditorialStructure(rootDir, todayStr);
console.log(`[build-html] synchronized editorial structure: ${editorialArticleCount}`);

const staticUsabilityArticleCount = synchronizeArticleStaticUsability(rootDir);
console.log(`[build-html] synchronized static article usability: ${staticUsabilityArticleCount}`);

writeLocalizedPages(rootDir, indexHtml, locales);
syncVisitorThanks(rootDir);
syncRegionPages(rootDir);
syncRegionHreflang(rootDir);

syncDynamicArticleStylesheetVersion(rootDir);
const assetVersions = syncServiceWorkerAssets(rootDir, assetVersion, todayStr, indexHtml);

writeIntlSeoPages(rootDir, assetVersions);
const intlGameGuidePublishSummary = publishLocalizedGameGuides(rootDir);
console.log(`[build-html] published localized game guides: ${intlGameGuidePublishSummary.changed}/${intlGameGuidePublishSummary.checked} generated, ${intlGameGuidePublishSummary.normalized} normalized`);
syncIntlManualContent(rootDir);
applyIntlContentExpansion(rootDir);
// The international expansion writes locale variants that downstream layout and
// navigation passes need to see with their reciprocal JA/EN/KO/TW identity.
const intlJaHreflangSummary = syncIntlArticleJapaneseHreflang(rootDir);
console.log(`[build-html] synchronized international/Japanese hreflang: ${intlJaHreflangSummary.changed}/${intlJaHreflangSummary.checked} updated`);
const intlArticleLayoutSummary = synchronizeIntlArticleLayouts(rootDir);
console.log(`[build-html] synchronized international article layouts: ${intlArticleLayoutSummary.changed}/${intlArticleLayoutSummary.checked} updated`);
const intlHubDiscoverySummary = syncIntlHubDiscovery(rootDir);
console.log(`[build-html] synchronized international guide discovery: ${intlHubDiscoverySummary.changed}/${intlHubDiscoverySummary.checked} updated`);
const intlShellSummary = syncIntlNavigationSidebarV1(rootDir);
console.log(`[build-html] synchronized international navigation/sidebar v1: ${intlShellSummary.changed}/${intlShellSummary.checked} updated`);

require('./generate-game-simulators.cjs');
const gameSeoSummary = syncGameSeo(rootDir);
console.log(`[build-html] synchronized verified game SEO: ${gameSeoSummary.changedFiles.length}/${gameSeoSummary.checked} updated`);
const gameSeoSafetySummary = syncGameSeoSafety(rootDir);
console.log(`[build-html] synchronized game SEO safety: ${gameSeoSafetySummary.changedFiles.length}/${gameSeoSafetySummary.checked} updated`);
const gameSeoExpandedSummary = syncGameSeoExpanded(rootDir);
console.log(`[build-html] synchronized expanded game SEO: ${gameSeoExpandedSummary.changedFiles.length}/${gameSeoExpandedSummary.checked} updated`);
const gameSeoWave3Summary = syncGameSeoWave3(rootDir);
console.log(`[build-html] synchronized game SEO wave 3: ${gameSeoWave3Summary.changedFiles.length}/${gameSeoWave3Summary.checked} updated`);
const gameSeoWave4Summary = syncGameSeoWave4(rootDir);
console.log(`[build-html] synchronized game SEO wave 4: ${gameSeoWave4Summary.changedFiles.length}/${gameSeoWave4Summary.checked} updated`);
const gameSeoWave5Summary = syncGameSeoWave5(rootDir);
console.log(`[build-html] synchronized game SEO wave 5: ${gameSeoWave5Summary.changedFiles.length}/${gameSeoWave5Summary.checked} updated`);
const gameSeoWave5RegionalSummary = syncGameSeoWave5RegionalRates(rootDir);
console.log(`[build-html] synchronized game SEO wave 5 regional rates: ${gameSeoWave5RegionalSummary.changedFiles.length}/${gameSeoWave5RegionalSummary.checked} updated`);

syncHtmlFiles(rootDir, getSyncedHtmlFiles(rootDir), assetVersions, todayStr);
applyLpMonetization(rootDir);
const lpFaqSummary = syncManualLpFaqFiles(rootDir, { checkOnly: false });
console.log(`[build-html] synchronized manual LP FAQ schema: ${lpFaqSummary.changed} updated`);
const lpHreflangSummary = syncManualLpHreflangFiles(rootDir, { checkOnly: false });
console.log(`[build-html] synchronized manual LP hreflang: ${lpHreflangSummary.changed}/${lpHreflangSummary.checked} updated`);
const authorHreflangSummary = syncJapaneseAuthorHreflang(rootDir, { checkOnly: false });
console.log(`[build-html] synchronized Japanese author hreflang: ${authorHreflangSummary.changed}/${authorHreflangSummary.checked} updated`);
syncAnalyticsRuntimeScripts(rootDir);

const intlLocalizationSummary = normalizeIntlGeneratedCopy(rootDir);
console.log(`[build-html] normalized international copy/semantics: ${intlLocalizationSummary.changedFiles.length} updated`);
syncJapaneseNavigation(rootDir);
// This pass produces the real content-hash updates. A second full-tree pass at
// the end of the build was empirically a no-op, so keep the proven position and
// avoid rescanning every public HTML file twice.
syncPublicAssetVersions(rootDir);

syncSitemap(rootDir);
syncRegionSitemap(rootDir);

generateBlogFeeds(rootDir);

const seoSummary = normalizeArticleFiles(rootDir, { checkOnly: false });
console.log(`[build-html] synchronized article SEO: ${seoSummary.changed} updated`);

const guideBrandSummary = syncJapaneseGuideBrand(rootDir);
console.log(`[build-html] synchronized Japanese complete-guide brand: ${guideBrandSummary.changedFiles.length}/${guideBrandSummary.articleCount + 1} updated`);

const articleDateSummary = syncArticleDateContract(rootDir);
console.log(`[build-html] synchronized article dates: ${articleDateSummary.changed}/${articleDateSummary.checked} updated`);

const strippedFontFiles = stripExternalGoogleFonts(rootDir);
console.log(`[build-html] stripped external Google Fonts: ${strippedFontFiles}`);

const sanitizedInternalLinkFiles = sanitizeInternalLinks(rootDir);
console.log(`[build-html] sanitized internal attribution links: ${sanitizedInternalLinkFiles}`);

const speculationRulesChanged = syncSpeculationRules(rootDir);
console.log(`[build-html] synchronized speculation rules: ${speculationRulesChanged} updated`);

const articleNavigationSummary = normalizeArticleContentNavigation({ root: rootDir, check: false });
if (articleNavigationSummary.failures.length > 0) {
  throw new Error(`Article content/navigation normalization failed:\n${articleNavigationSummary.failures.join('\n')}`);
}
console.log(`[build-html] synchronized article intent/navigation: ${articleNavigationSummary.stats.changed} updated`);

const { syncArticleDiscovery } = require('./article-discovery-sync.cjs');
console.log('[build-html] synchronized article search and reading tools:', syncArticleDiscovery(rootDir));

// Game SEO and later article finalizers run after the first hreflang pass.
// Re-apply the reciprocal set so the committed output cannot retain stale links.
const finalIntlJaHreflangSummary = syncIntlArticleJapaneseHreflang(rootDir);
console.log(`[build-html] finalized international/Japanese hreflang: ${finalIntlJaHreflangSummary.changed}/${finalIntlJaHreflangSummary.checked} updated`);

const twTerminologySummary = assertTaiwanTerminology(rootDir);
console.log(`[build-html] verified Taiwan terminology contract: ${twTerminologySummary.htmlFilesChecked} HTML files + ${twTerminologySummary.sourceFilesChecked} source assets checked`);
