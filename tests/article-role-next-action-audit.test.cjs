'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const test = require('node:test');
const {
  auditArticleRoleNextActions,
  printAudit
} = require('../scripts/article-role-next-action-audit.cjs');

const root = path.resolve(__dirname, '..');

test('全記事のArticle Roleとgenerated主CTAが一致する', () => {
  const result = auditArticleRoleNextActions(root);
  printAudit(result);

  const japanese = JSON.parse(fs.readFileSync(path.join(root, 'blog/articles.json'), 'utf8')).map(article => article.file.slice(3));
  const international = ['en', 'ko', 'tw'].flatMap(locale => fs.readdirSync(path.join(root, locale, 'articles'))
    .filter(file => file.endsWith('.html') && file !== 'index.html').map(file => locale + '/articles/' + file));
  assert.equal(result.articleCount, new Set([...japanese, ...international]).size, '登録記事を全件監査する');
  assert.deepEqual(result.failures, []);
  assert.ok(result.roleCounts.calculator_bridge > 0);
  assert.ok(result.roleCounts.troubleshooting > 0);
  assert.ok(result.roleCounts.retention > 0);
  assert.ok(result.roleCounts.decision_support > 0);
  assert.ok(result.roleCounts.reference > 0);
  assert.ok(result.roleCounts.game_decision > 0);
  assert.ok(result.roleCounts.hold > 0);
});
