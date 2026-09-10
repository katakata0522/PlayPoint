'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const {
  auditArticleRoleNextActions,
  printAudit
} = require('../scripts/article-role-next-action-audit.cjs');

const root = path.resolve(__dirname, '..');

test('全記事のArticle Roleとgenerated主CTAが一致する', () => {
  const result = auditArticleRoleNextActions(root);
  printAudit(result);

  assert.equal(result.articleCount, 161, '2026-09-10の監査対象161記事をすべて通す');
  assert.deepEqual(result.failures, []);
  assert.ok(result.roleCounts.calculator_bridge > 0);
  assert.ok(result.roleCounts.troubleshooting > 0);
  assert.ok(result.roleCounts.retention > 0);
  assert.ok(result.roleCounts.decision_support > 0);
  assert.ok(result.roleCounts.reference > 0);
  assert.ok(result.roleCounts.game_decision > 0);
  assert.ok(result.roleCounts.hold > 0);
});
