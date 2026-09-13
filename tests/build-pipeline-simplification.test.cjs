'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const build = fs.readFileSync(path.resolve(__dirname, '../scripts/build-html.js'), 'utf8');

function occurrences(token) {
  return build.split(token).length - 1;
}

test('hreflangは二段階を維持し、公開アセット全走査だけ一度にする', () => {
  assert.equal(
    occurrences('syncIntlArticleJapaneseHreflang(rootDir)'),
    2,
    'hreflangは中間生成物への同期と全生成後の最終修復を維持する'
  );
  assert.equal(
    occurrences('syncPublicAssetVersions(rootDir)'),
    1,
    '公開HTMLのアセット版同期は実差分が出る一度だけにする'
  );

  const regionalRatesAt = build.indexOf('syncGameSeoWave5RegionalRates(rootDir)');
  const gameHubAt = build.indexOf('syncGameGuideArticleHub(rootDir)');
  const sharedHtmlAt = build.indexOf('syncHtmlFiles(rootDir,');
  assert.ok(gameHubAt > regionalRatesAt && sharedHtmlAt > gameHubAt, 'ゲーム記事の登録は地域補正後・共通HTML同期前の独立工程にする');
  assert.equal(occurrences('syncGameGuideArticleHub(rootDir)'), 1);

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
  assert.ok(firstHreflangAt > expansionAt, '最初のhreflang同期は国際記事生成後に実行してください');
  assert.ok(layoutAt > firstHreflangAt, '国際記事レイアウトは最初のhreflang同期後に実行してください');
  assert.ok(assetVersionAt > japaneseNavigationAt, 'アセット版同期は主要HTML同期後に実行してください');
  assert.ok(sitemapAt > assetVersionAt, '既存の再現可能なアセット同期位置を維持してください');
  assert.ok(finalHreflangAt > discoveryAt, '最終hreflang同期は記事導線同期後に実行してください');
  assert.ok(finalHreflangAt > firstHreflangAt, '二段階hreflang同期の順序が崩れています');
  assert.ok(terminologyAuditAt > finalHreflangAt, '最終契約監査はhreflang最終化後に実行してください');
});

test('手動国際記事は退避復元せず生成側の所有権境界で保護する', () => {
  assert.equal(build.includes('snapshotManualIntlArticles'), false);
  assert.equal(build.includes('restoreManualIntlArticles'), false);
  assert.ok(build.includes('writeIntlSeoPages(rootDir, assetVersions)'));
});
