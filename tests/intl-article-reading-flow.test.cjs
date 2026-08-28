'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const {
  INTL_PROMPT_COPY,
  insertIntlArticlePrompt
} = require(path.join(root, 'scripts', 'intl-article-reading-flow.cjs'));

const locales = ['en', 'ko', 'tw'];

test('international article prompt is localized, idempotent, and placed after the quick answer', () => {
  for (const locale of locales) {
    const input = '<main class="main-card"><article class="content"><section class="answer-box"><h2>Answer</h2><p>Summary.</p></section><section class="section"><h2>Details</h2></section></article></main>';
    const first = insertIntlArticlePrompt(input, locale);
    const second = insertIntlArticlePrompt(first, locale);
    const copy = INTL_PROMPT_COPY[locale];

    assert.equal(second, first, locale + ': prompt insertion must be idempotent');
    assert.equal((first.match(/data-generated-intl-article-prompt="true"/g) || []).length, 1, locale + ': exactly one generated prompt');
    assert.ok(first.indexOf('</section>') < first.indexOf('data-generated-intl-article-prompt="true"'), locale + ': prompt follows the quick answer');
    assert.ok(first.indexOf('data-generated-intl-article-prompt="true"') < first.indexOf('<section class="section">'), locale + ': prompt precedes the detailed article body');
    assert.ok(first.includes(copy.heading), locale + ': localized heading');
    assert.ok(first.includes(copy.cta), locale + ': localized CTA');
    assert.ok(first.includes('href="/' + locale + '/"'), locale + ': CTA returns to the locale calculator');
  }
});

test('international article prompt respects a knowledge boundary when one is present', () => {
  const input = '<main class="main-card"><article class="content"><section class="answer-box"><p>Answer.</p></section><section class="knowledge-boundary"><h2>Known</h2></section><section class="section"><h2>Details</h2></section></article></main>';
  const output = insertIntlArticlePrompt(input, 'en');
  const knowledgeEnd = output.indexOf('</section>', output.indexOf('knowledge-boundary')) + '</section>'.length;
  const promptIndex = output.indexOf('data-generated-intl-article-prompt="true"');
  assert.ok(promptIndex > knowledgeEnd, 'prompt must follow the article-specific knowledge boundary');
});

test('all published international article pages contain one localized reading-flow prompt', () => {
  for (const locale of locales) {
    const articleDir = path.join(root, locale, 'articles');
    const files = fs.readdirSync(articleDir).filter(file => file.endsWith('.html') && file !== 'index.html');
    assert.ok(files.length > 0, locale + ': article pages are missing');

    for (const file of files) {
      const html = fs.readFileSync(path.join(articleDir, file), 'utf8');
      assert.equal((html.match(/data-generated-intl-article-prompt="true"/g) || []).length, 1, locale + '/' + file + ': exactly one generated prompt');
      assert.ok(html.includes(INTL_PROMPT_COPY[locale].cta), locale + '/' + file + ': localized CTA copy');
      assert.ok(html.includes('href="/' + locale + '/"'), locale + '/' + file + ': localized calculator target');
    }
  }
});
