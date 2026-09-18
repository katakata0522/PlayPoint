'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const {
  auditArticleRoleNextActions,
  printAudit
} = require('../scripts/article-role-next-action-audit.cjs');
const { getArticleFiles } = require('../scripts/article-date-contract.cjs');

const root = path.resolve(__dirname, '..');

test('全記事のArticle Roleとgenerated主CTAが一致する', () => {
  const result = auditArticleRoleNextActions(root);
  printAudit(result);

  const expectedArticleFiles = getArticleFiles(root);
  assert.equal(result.articleCount, expectedArticleFiles.length, '登録記事inventoryと同じ全件を監査する');
  assert.deepEqual(result.failures, []);
  assert.equal(
    Object.values(result.roleCounts).reduce((sum, count) => sum + count, 0),
    result.articleCount,
    'every audited article must be counted in exactly one Article Role'
  );
});
