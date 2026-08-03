'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  MANUAL_INTL_ARTICLE_FILES,
  restoreManualIntlArticles,
  snapshotManualIntlArticles
} = require('../scripts/manual-intl-articles.cjs');

const root = path.resolve(__dirname, '..');
const expectedFiles = [
  'en/articles/google-play-points-100-value.html',
  'en/articles/google-play-points-country-differences.html',
  'en/articles/google-play-points-gift-cards.html',
  'en/articles/google-play-points-levels.html',
  'en/articles/google-play-points-not-showing.html',
  'en/articles/google-play-points-promotion-not-applied.html',
  'en/articles/google-play-points-subscriptions.html',
  'ko/articles/google-play-points-gift-cards.html',
  'ko/articles/google-play-points-levels.html',
  'ko/articles/google-play-points-super-weekly-reward.html',
  'tw/articles/google-play-points-gift-cards.html',
  'tw/articles/google-play-points-levels.html',
  'tw/articles/google-play-points-super-weekly-reward.html'
];

test('地域別に手動確認した記事の正本一覧を固定する', () => {
  assert.deepEqual([...MANUAL_INTL_ARTICLE_FILES], expectedFiles);
  for (const relativePath of MANUAL_INTL_ARTICLE_FILES) {
    assert.ok(fs.existsSync(path.join(root, relativePath)), `${relativePath}: 正本HTMLがありません`);
  }
});

test('ビルドは国際記事生成の直前に退避し直後に復元する', () => {
  const buildScript = fs.readFileSync(path.join(root, 'scripts/build-html.js'), 'utf8');
  const snapshotAt = buildScript.indexOf('snapshotManualIntlArticles(rootDir)');
  const generateAt = buildScript.indexOf('writeIntlSeoPages(rootDir, assetVersions, todayStr)');
  const restoreAt = buildScript.indexOf('restoreManualIntlArticles(rootDir, manualIntlSnapshots)');
  const assetSyncAt = buildScript.indexOf('syncPublicAssetVersions(rootDir)');

  assert.ok(snapshotAt >= 0, '手動記事の退避処理がビルドにありません');
  assert.ok(generateAt > snapshotAt, '記事生成より前に手動記事を退避していません');
  assert.ok(restoreAt > generateAt, '記事生成後に手動記事を復元していません');
  assert.ok(assetSyncAt > restoreAt, '復元後に共通アセット同期を適用していません');
  assert.ok(buildScript.includes('finally {'), '生成失敗時にも正本を復元するfinallyがありません');
});

test('生成処理で上書きされても手動記事を完全に復元できる', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-manual-intl-'));

  try {
    for (const [index, relativePath] of MANUAL_INTL_ARTICLE_FILES.entries()) {
      const absolutePath = path.join(tempRoot, relativePath);
      fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
      fs.writeFileSync(absolutePath, `canonical-${index}\n`, 'utf8');
    }

    const snapshots = snapshotManualIntlArticles(tempRoot);
    for (const relativePath of MANUAL_INTL_ARTICLE_FILES) {
      fs.writeFileSync(path.join(tempRoot, relativePath), 'generated-content\n', 'utf8');
    }

    restoreManualIntlArticles(tempRoot, snapshots);

    for (const [index, relativePath] of MANUAL_INTL_ARTICLE_FILES.entries()) {
      assert.equal(
        fs.readFileSync(path.join(tempRoot, relativePath), 'utf8'),
        `canonical-${index}\n`,
        `${relativePath}: 正本内容を復元できません`
      );
    }
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
