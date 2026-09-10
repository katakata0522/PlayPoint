'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { auditArticleDesignSystem } = require('../scripts/article-design-system-audit.cjs');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'articles', 'article-shared.css'), 'utf8');

test('Article Design System 2.0 is owned by article-shared.css', () => {
  assert.match(css, /ARTICLE_DESIGN_SYSTEM_V2_START/);
  assert.match(css, /body \.content > \.answer-box/);
  assert.match(css, /body \.content > \.intro > strong:first-child/);
  assert.match(css, /body \.content \.related-links-section > ul/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /:focus-visible/);
});

test('fluorescent marker primitives remain available', () => {
  assert.match(css, /\.marker-yellow[^{]*\{[\s\S]*?#fde68a/i);
  assert.match(css, /\.marker-blue[^{]*\{[\s\S]*?#bae6fd/i);
  assert.match(css, /\.marker-red[^{]*\{[\s\S]*?#fecdd3/i);
  assert.match(css, /box-decoration-break:\s*clone/i);
});

test('all current role-classified articles stay on the shared visual contract', () => {
  const result = auditArticleDesignSystem(root);
  const { articleCorpus } = require('../scripts/article-role-next-action-audit.cjs');
  const inventory = articleCorpus(root);
  assert.ok(inventory.length > 0, 'article inventory must not be empty');
  assert.equal(result.articleCount, inventory.length);
  assert.equal(Object.values(result.roleCounts).reduce((sum, count) => sum + count, 0), inventory.length);
  assert.deepEqual(result.failures, []);
  assert.ok(result.components.answer > 0);
  assert.ok(result.components.related > 0);
  assert.ok(result.components.stackedLead <= result.articleCount);
});

test('obsolete 49-article validator is removed', () => {
  assert.equal(fs.existsSync(path.join(root, 'scripts', 'validate_articles.py')), false);
});
