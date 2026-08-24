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

test('地域別に手動確認した記事の正本一覧は重複せず実在する', () => {
  assert.ok(MANUAL_INTL_ARTICLE_FILES.length > 0, '手動正本一覧が空です');
  assert.equal(
    new Set(MANUAL_INTL_ARTICLE_FILES).size,
    MANUAL_INTL_ARTICLE_FILES.length,
    '手動正本一覧に重複があります'
  );

  for (const relativePath of MANUAL_INTL_ARTICLE_FILES) {
    assert.match(relativePath, /^(?:en|ko|tw)\/articles\/[^/]+\.html$/);
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

test('国際記事台帳は登録済みの手動正本の日付を自動採用する', () => {
  const registry = new Map(getPublishedIntlArticles().map(article => [article.file, article]));
  const registeredManualFiles = MANUAL_INTL_ARTICLE_FILES.filter(relativePath => registry.has(relativePath));
  assert.ok(registeredManualFiles.length > 0, '国際記事台帳に登録された手動正本がありません');

  for (const relativePath of registeredManualFiles) {
    const article = registry.get(relativePath);
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
