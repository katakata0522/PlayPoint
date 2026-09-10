'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const {
  ROLE_DEFINITIONS,
  classifyArticleRole,
  getArticleRoleContract
} = require('../scripts/article-role-registry.cjs');

const registry = JSON.parse(fs.readFileSync(path.join(root, 'blog/articles.json'), 'utf8'));

function publishedArticleInventory() {
  const japanese = registry.map(article => ({
    file: String(article.file || '').replace(/^\.\.\//, ''),
    listed: article.listed !== false
  }));
  const international = ['en', 'ko', 'tw'].flatMap(locale =>
    fs.readdirSync(path.join(root, locale, 'articles'))
      .filter(file => file.endsWith('.html') && file !== 'index.html')
      .map(file => ({ file: `${locale}/articles/${file}`, listed: true }))
  );
  return [...japanese, ...international];
}

test('記事Roleは仕事・成功KPI・誤最適化防止まで定義する', () => {
  for (const [role, contract] of Object.entries(ROLE_DEFINITIONS)) {
    assert.ok(contract.label, `${role}: label is missing`);
    assert.ok(contract.job, `${role}: job is missing`);
    assert.ok(contract.primaryKpi, `${role}: primaryKpi is missing`);
    assert.ok(Array.isArray(contract.secondaryKpis), `${role}: secondaryKpis must be an array`);
    assert.ok(contract.measurementStatus, `${role}: measurementStatus is missing`);
    assert.ok(Array.isArray(contract.doNotOptimizeBy) && contract.doNotOptimizeBy.length > 0, `${role}: doNotOptimizeBy is missing`);
  }
});

test('現在の日本語・EN・KO・TW記事は全件、役割を持つ', () => {
  const missing = publishedArticleInventory()
    .filter(article => !classifyArticleRole(article.file, { listed: article.listed }))
    .map(article => article.file);
  assert.deepEqual(missing, [], `役割未定義の記事があります: ${missing.join(', ')}`);
});

test('代表記事を検索意図ではなくプロダクト上の仕事で分類する', () => {
  const cases = [
    ['articles/2025-12-25-best-use.html', true, 'decision_support'],
    ['articles/2026-03-10-play-points-reflection-timing.html', true, 'troubleshooting'],
    ['articles/2025-12-25-weekly-reward.html', true, 'retention'],
    ['articles/2026-07-31-google-play-quests.html', true, 'retention'],
    ['articles/2026-08-25-pad-puzzle-and-dragons-play-points.html', true, 'game_decision'],
    ['en/articles/google-play-points-platinum-diamond-cost.html', true, 'calculator_bridge'],
    ['tw/articles/google-play-points-levels.html', true, 'reference'],
    ['tw/articles/google-play-points-country-differences.html', true, 'reference'],
    ['articles/2026-08-17-tgs-google-play-vip.html', false, 'hold']
  ];

  for (const [file, listed, expected] of cases) {
    assert.equal(classifyArticleRole(file, { listed }), expected, file);
    assert.equal(getArticleRoleContract(file, { listed }).role, expected, file);
  }
});

test('levels記事は等級制度の参照点であり、CTAがあってもcalculator_bridgeにしない', () => {
  for (const file of [
    'articles/2026-08-05-play-points-levels-guide.html',
    'en/articles/google-play-points-levels.html',
    'ko/articles/google-play-points-levels.html',
    'tw/articles/google-play-points-levels.html'
  ]) {
    assert.equal(classifyArticleRole(file), 'reference', file);
  }
});

test('未知の記事を暗黙にreference扱いしない', () => {
  assert.equal(classifyArticleRole('articles/2099-01-01-unknown-new-topic.html'), null);
});
