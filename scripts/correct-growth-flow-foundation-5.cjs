'use strict';

const fs = require('node:fs');
const path = require('node:path');

const target = path.resolve(__dirname, '..', 'tests', 'playpoint-regression.test.cjs');
let source = fs.readFileSync(target, 'utf8');

const pattern = /test\('記事末尾CTAは記事文脈ごとに次アクションを出し分ける', \(\) => \{[\s\S]*?\n\}\);/;
const matches = [...source.matchAll(new RegExp(pattern.source, 'g'))];
if (matches.length !== 1) {
  throw new Error(`article CTA regression block: expected exactly one match, found ${matches.length}`);
}

const replacement = `test('記事末尾CTAは記事固有の静的導線を優先し、共通JSで重ねない', () => {
  const articleScript = fs.readFileSync(path.join(root, 'blog', 'article.js'), 'utf8');
  const articleCss = fs.readFileSync(path.join(root, 'articles', 'article-shared.css'), 'utf8');
  const valueArticle = fs.readFileSync(path.join(root, 'articles', '2026-07-24-play-points-1-value.html'), 'utf8');

  assert.ok(!articleScript.includes('setupArticleNextStepCta'));
  assert.ok(!articleScript.includes('getArticleNextStepCta'));
  assert.ok(articleScript.includes('hasEditorialCalculatorLink'));
  assert.ok(valueArticle.includes('article-next-step-cta'));
  assert.ok(valueArticle.includes('../points-cost/?points=1'));
  assert.ok(articleCss.includes('.article-next-step-cta'));
  assert.ok(articleCss.includes('.article-next-step-cta__links'));
});`;

source = source.replace(pattern, replacement);
fs.writeFileSync(target, source, 'utf8');
console.log('Article CTA regression updated for editorial-first behavior.');
