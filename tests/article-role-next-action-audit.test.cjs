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
  assert.equal(
    Object.values(result.roleCounts).reduce((sum, count) => sum + count, 0),
    result.articleCount,
    'every audited article must be counted in exactly one Article Role'
  );
});
