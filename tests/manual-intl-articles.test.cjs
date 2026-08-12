'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  MANUAL_INTL_ARTICLE_FILES,
  readManualIntlArticleDates,
  restoreManualIntlArticles,
  snapshotManualIntlArticles
} = require('../scripts/manual-intl-articles.cjs');
const { getPublishedIntlArticles } = require('../scripts/intl-seo-pages.cjs');

const root = path.resolve(__dirname, '..');
const expectedFiles = [
  "en/articles/2026-06-20-discount-gift-cards.html",
  "en/articles/google-play-points-100-value.html",
  "en/articles/google-play-points-country-change.html",
  "en/articles/google-play-points-country-differences.html",
  "en/articles/google-play-points-earn-free.html",
  "en/articles/google-play-points-fastest-silver.html",
  "en/articles/google-play-points-gift-cards.html",
  "en/articles/google-play-points-join-eligibility.html",
  "en/articles/google-play-points-levels.html",
  "en/articles/google-play-points-not-showing.html",
  "en/articles/google-play-points-platinum-diamond-cost.html",
  "en/articles/google-play-points-promotion-not-applied.html",
  "en/articles/google-play-points-promotion-stacking.html",
  "en/articles/google-play-points-subscriptions.html",
  "en/articles/google-play-points-super-weekly-reward.html",
  "en/articles/google-play-points-weekly-reward.html",
  "ko/articles/2026-06-20-discount-gift-cards.html",
  "ko/articles/google-play-points-country-change.html",
  "ko/articles/google-play-points-country-differences.html",
  "ko/articles/google-play-points-earn-free.html",
  "ko/articles/google-play-points-fastest-silver.html",
  "ko/articles/google-play-points-gift-cards.html",
  "ko/articles/google-play-points-join-eligibility.html",
  "ko/articles/google-play-points-levels.html",
  "ko/articles/google-play-points-platinum-diamond-cost.html",
  "ko/articles/google-play-points-promotion-stacking.html",
  "ko/articles/google-play-points-super-weekly-reward.html",
  "ko/articles/google-play-points-weekly-reward.html",
  "tw/articles/2026-06-20-discount-gift-cards.html",
  "tw/articles/google-play-points-country-change.html",
  "tw/articles/google-play-points-country-differences.html",
  "tw/articles/google-play-points-earn-free.html",
  "tw/articles/google-play-points-fastest-silver.html",
  "tw/articles/google-play-points-gift-cards.html",
  "tw/articles/google-play-points-join-eligibility.html",
  "tw/articles/google-play-points-levels.html",
  "tw/articles/google-play-points-platinum-diamond-cost.html",
  "tw/articles/google-play-points-promotion-stacking.html",
  "tw/articles/google-play-points-super-weekly-reward.html",
  "tw/articles/google-play-points-weekly-reward.html",
];
const manualFilesOutsideIntlRegistry = [
  "en/articles/2026-06-20-discount-gift-cards.html",
  "en/articles/google-play-points-country-change.html",
  "en/articles/google-play-points-earn-free.html",
  "en/articles/google-play-points-fastest-silver.html",
  "en/articles/google-play-points-join-eligibility.html",
  "en/articles/google-play-points-promotion-stacking.html",
  "en/articles/google-play-points-super-weekly-reward.html",
  "en/articles/google-play-points-weekly-reward.html",
  "ko/articles/2026-06-20-discount-gift-cards.html",
  "ko/articles/google-play-points-country-change.html",
  "ko/articles/google-play-points-earn-free.html",
  "ko/articles/google-play-points-fastest-silver.html",
  "ko/articles/google-play-points-join-eligibility.html",
  "ko/articles/google-play-points-promotion-stacking.html",
  "ko/articles/google-play-points-super-weekly-reward.html",
  "ko/articles/google-play-points-weekly-reward.html",
  "tw/articles/2026-06-20-discount-gift-cards.html",
  "tw/articles/google-play-points-country-change.html",
  "tw/articles/google-play-points-earn-free.html",
  "tw/articles/google-play-points-fastest-silver.html",
  "tw/articles/google-play-points-join-eligibility.html",
  "tw/articles/google-play-points-promotion-stacking.html",
  "tw/articles/google-play-points-super-weekly-reward.html",
  "tw/articles/google-play-points-weekly-reward.html",
];

test('地域別に手動確認した記事の正本一覧を固定する', () => {
  assert.deepEqual([...MANUAL_INTL_ARTICLE_FILES], expectedFiles);
  for (const relativePath of MANUAL_INTL_ARTICLE_FILES) {
    assert.ok(fs.existsSync(path.join(root, relativePath)), `${relativePath}: 正本HTMLがありません`);
  }
});

test('手動正本の公開日・更新日・last-modifiedを一致させる', () => {
  for (const relativePath of MANUAL_INTL_ARTICLE_FILES) {
    const dates = readManualIntlArticleDates(root, relativePath);
    assert.match(dates.publishedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(dates.modifiedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(dates.publishedAt <= dates.modifiedAt, `${relativePath}: 公開日が更新日より後です`);
  }
});

test('国際記事台帳は手動正本の日付を自動採用する', () => {
  const registry = new Map(getPublishedIntlArticles().map(article => [article.file, article]));
  const outsideRegistry = MANUAL_INTL_ARTICLE_FILES.filter(relativePath => !registry.has(relativePath));
  assert.deepEqual(outsideRegistry, manualFilesOutsideIntlRegistry);

  for (const relativePath of MANUAL_INTL_ARTICLE_FILES) {
    const article = registry.get(relativePath);
    if (!article) continue;
    assert.deepEqual(
      { publishedAt: article.publishedAt, modifiedAt: article.modifiedAt },
      readManualIntlArticleDates(root, relativePath),
      `${relativePath}: 記事台帳と正本HTMLの日付が一致しません`
    );
  }
});

test('ビルドは国際記事生成の直前に退避し直後に復元する', () => {
  const buildScript = fs.readFileSync(path.join(root, 'scripts/build-html.js'), 'utf8');
  const snapshotAt = buildScript.indexOf('snapshotManualIntlArticles(rootDir)');
  const generateAt = buildScript.indexOf('writeIntlSeoPages(rootDir, assetVersions)');
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
