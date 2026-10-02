'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { auditArticleDesignSystem } = require('../scripts/article-design-system-audit.cjs');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'articles', 'article-shared.css'), 'utf8');

test("Article Design System 2.0 is owned by article-shared.css", () => {
  for(const primitive of ['answer-box','intro','related-links-section'])assert.match(css,new RegExp('\\.'+primitive+'\\b'));
  assert.match(css,/@media\s*\(prefers-reduced-motion:\s*reduce\)/);assert.match(css,/:focus-visible/);
  // 適用後の描画・focus・motionはarticle-design-smokeが所有する。
});

test('fluorescent marker primitives remain available', () => {
  for (const marker of ['yellow', 'blue', 'red']) {
    assert.match(
      css,
      new RegExp('\\.marker-' + marker + '[^{]*\\{[^}]*background(?:-image)?\\s*:\\s*linear-gradient', 'is'),
      `marker-${marker}: fluorescent emphasis primitive is missing`
    );
  }
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
  assert.equal(result.components.stackedLead, 0, 'legacy answer + intro + summary stacks must not return');
});
