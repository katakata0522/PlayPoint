'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  MANUAL_INTL_ARTICLE_FILES,
  readManualIntlArticleDates
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

test('国際記事台帳は登録済みの手動正本の日付と所有権を自動採用する', () => {
  const registry = new Map(getPublishedIntlArticles().map(article => [article.file, article]));
  const registeredManualFiles = MANUAL_INTL_ARTICLE_FILES.filter(relativePath => registry.has(relativePath));
  assert.ok(registeredManualFiles.length > 0, '国際記事台帳に登録された手動正本がありません');

  for (const relativePath of registeredManualFiles) {
    const article = registry.get(relativePath);
    assert.deepEqual(
      { publishedAt: article.publishedAt, modifiedAt: article.modifiedAt, manual: article.manual },
      readManualIntlArticleDates(root, relativePath),
      `${relativePath}: 記事台帳と正本HTMLの日付・所有権が一致しません`
    );
  }
});

test('国際記事生成は手動正本をmanual所有権で除外する', () => {
  const articles = getPublishedIntlArticles();
  const registry = new Map(articles.map(article => [article.file, article]));
  const generatedFiles = new Set(
    articles.filter(article => article.manual !== true).map(article => article.file)
  );
  const registeredManualFiles = MANUAL_INTL_ARTICLE_FILES.filter(relativePath => registry.has(relativePath));

  assert.ok(registeredManualFiles.length > 0, 'manual所有権を検証できる登録記事がありません');
  for (const relativePath of MANUAL_INTL_ARTICLE_FILES) {
    assert.equal(generatedFiles.has(relativePath), false, `${relativePath}: 自動生成対象へ混入しています`);
    const article = registry.get(relativePath);
    if (article) assert.equal(article.manual, true, `${relativePath}: manual所有権がありません`);
  }

  const generator = fs.readFileSync(path.join(root, 'scripts/intl-seo-pages.cjs'), 'utf8');
  assert.match(generator, /if \(article\.manual\) continue;/, '生成処理がmanual記事を明示的に除外していません');
});
