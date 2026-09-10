'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { insertStaticPrompt } = require('../scripts/article-static-usability.cjs');
const {
  insertIntlArticlePrompt,
  shouldGenerateIntlArticlePrompt
} = require('../scripts/intl-article-reading-flow.cjs');

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
