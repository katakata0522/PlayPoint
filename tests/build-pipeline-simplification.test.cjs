'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const build = fs.readFileSync(path.resolve(__dirname, '../scripts/build-html.js'), 'utf8');

function occurrences(token) {
  return build.split(token).length - 1;
}

test('全生成後のhreflangと公開アセット同期はそれぞれ一度だけ最終化する', () => {
  assert.equal(
    occurrences('syncIntlArticleJapaneseHreflang(rootDir)'),
    1,
    '国際記事hreflangを複数回全走査しない'
  );
  assert.equal(
    occurrences('syncPublicAssetVersions(rootDir)'),
    1,
    '公開HTMLのアセット版同期を複数回全走査しない'
  );

  const gameGenerationAt = build.indexOf('syncGameSeoWave5RegionalRates(rootDir)');
  const discoveryAt = build.indexOf('syncArticleDiscovery(rootDir)');
  const hreflangAt = build.indexOf('syncIntlArticleJapaneseHreflang(rootDir)');
  const assetVersionAt = build.indexOf('syncPublicAssetVersions(rootDir)');
  const terminologyAuditAt = build.indexOf('assertTaiwanTerminology(rootDir)');

  assert.ok(gameGenerationAt >= 0, '最終ゲーム生成工程が見つかりません');
  assert.ok(discoveryAt > gameGenerationAt, '記事検索・保存導線はゲーム生成後に実行してください');
  assert.ok(hreflangAt > discoveryAt, 'hreflang最終化は全記事生成・導線同期後に実行してください');
  assert.ok(assetVersionAt > hreflangAt, 'アセット版同期は全HTML書換え後に実行してください');
  assert.ok(terminologyAuditAt > assetVersionAt, '最終契約監査は生成・版同期の後に実行してください');
});

test('手動国際記事は退避復元せず生成側の所有権境界で保護する', () => {
  assert.equal(build.includes('snapshotManualIntlArticles'), false);
  assert.equal(build.includes('restoreManualIntlArticles'), false);
  assert.ok(build.includes('writeIntlSeoPages(rootDir, assetVersions)'));
});
