'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const build = fs.readFileSync(path.resolve(__dirname, '../scripts/build-html.js'), 'utf8');

function occurrences(token) {
  return build.split(token).length - 1;
}

test('生成pipelineは必要な最終化順序を保ち、同義な追加工程を許容する', () => {
  const regionalRatesAt = build.indexOf('syncGameSeoWave5RegionalRates(rootDir)');
  const gameHubAt = build.indexOf('syncGameGuideArticleHub(rootDir)');
  const sharedHtmlAt = build.indexOf('syncHtmlFiles(rootDir,');
  assert.ok(regionalRatesAt >= 0 && gameHubAt > regionalRatesAt && sharedHtmlAt > gameHubAt, 'ゲーム記事の登録は地域補正後・共通HTML同期前に行う');

  const expansionAt = build.indexOf('applyIntlContentExpansion(rootDir)');
  const firstHreflangAt = build.indexOf('syncIntlArticleJapaneseHreflang(rootDir)');
  const layoutAt = build.indexOf('synchronizeIntlArticleLayouts(rootDir)');
  const japaneseNavigationAt = build.indexOf('syncJapaneseNavigation(rootDir)');
  const assetVersionAt = build.indexOf('syncPublicAssetVersions(rootDir)');
  const sitemapAt = build.indexOf('syncSitemap(rootDir)');
  const discoveryAt = build.indexOf('syncArticleDiscovery(rootDir)');
  const finalHreflangAt = build.lastIndexOf('syncIntlArticleJapaneseHreflang(rootDir)');
  const terminologyAuditAt = build.indexOf('assertTaiwanTerminology(rootDir)');

  assert.ok(expansionAt >= 0, '国際記事拡張工程が見つかりません');
  assert.ok(firstHreflangAt > expansionAt, 'hreflang同期は国際記事生成後に始める');
  assert.ok(layoutAt > firstHreflangAt, '国際記事レイアウトは初回hreflang同期後に行う');
  assert.ok(assetVersionAt > japaneseNavigationAt, 'アセット版同期は主要HTML同期後に行う');
  assert.ok(sitemapAt > assetVersionAt, 'sitemapはアセット同期後に最終化する');
  assert.ok(finalHreflangAt > discoveryAt, '最終hreflang同期は記事導線同期後に行う');
  assert.ok(finalHreflangAt > firstHreflangAt, 'hreflangの中間同期と最終同期を区別する');
  assert.ok(terminologyAuditAt > finalHreflangAt, '台湾用語監査は最終hreflang後に行う');

  assert.ok(occurrences('syncIntlArticleJapaneseHreflang(rootDir)') >= 2, '中間同期と最終同期が必要');
  assert.ok(occurrences('syncPublicAssetVersions(rootDir)') >= 1, '公開アセット版同期が必要');
  assert.ok(occurrences('syncGameGuideArticleHub(rootDir)') >= 1, 'ゲーム記事ハブ同期が必要');
});

test('手動国際記事は退避復元せず生成側の所有権境界で保護する', () => {
  assert.equal(build.includes('snapshotManualIntlArticles'), false);
  assert.equal(build.includes('restoreManualIntlArticles'), false);
  assert.ok(build.includes('writeIntlSeoPages(rootDir, assetVersions)'));
});
