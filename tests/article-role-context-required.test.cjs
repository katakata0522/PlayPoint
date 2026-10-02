'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { insertStaticPrompt } = require('../scripts/article-static-usability.cjs');
const {
  CONTEXTUAL_PROMPT_PATHS,
  hasVerifiedContextualPrompt,
  insertIntlArticlePrompt,
  shouldGenerateIntlArticlePrompt
} = require('../scripts/intl-article-reading-flow.cjs');

const root = path.resolve(__dirname, '..');
const articleHtml = '<article class="content"><section class="answer-box"><h2>Answer</h2><p>Summary.</p></section><section class="section"><h2>Details</h2></section></article>';

test('Role-aware prompt生成はrelativePathなしで旧一律CTAへフォールバックしない', () => {
  assert.throws(
    () => insertStaticPrompt(articleHtml),
    /insertStaticPrompt requires relativePath for Article Role classification/
  );
  assert.throws(
    () => insertIntlArticlePrompt(articleHtml, 'en'),
    /insertIntlArticlePrompt requires relativePath for Article Role classification/
  );
  assert.throws(
    () => shouldGenerateIntlArticlePrompt(articleHtml, 'en'),
    /shouldGenerateIntlArticlePrompt requires relativePath for Article Role classification/
  );
});

test('国際文脈CTA例外は現在のH1に対応し、対象外見出しを誤認しない', () => {
  for (const relativePath of Object.keys(CONTEXTUAL_PROMPT_PATHS)) {
    const locale = relativePath.split('/', 1)[0];
    const html = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.equal(
      hasVerifiedContextualPrompt(html, locale, relativePath),
      true,
      relativePath + ': contextual prompt contract no longer matches the published article'
    );
    const changedHeading = html.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/i,'<h1>Unrelated fixture heading</h1>');
    assert.notEqual(changedHeading,html,'H1変更のfixtureを実際に作る');
    assert.equal(hasVerifiedContextualPrompt(changedHeading,locale,relativePath),false,relativePath+': 対象外H1を旧文脈として認識しない');
    assert.equal(
      (html.match(/data-generated-intl-article-prompt="true"/g) || []).length,
      1,
      relativePath + ': contextual prompt must remain present exactly once'
    );
  }
});
