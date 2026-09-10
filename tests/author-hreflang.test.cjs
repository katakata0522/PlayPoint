'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  AUTHOR_ALTERNATES,
  extractAuthorAlternates,
  synchronizeJapaneseAuthorHreflang
} = require('../scripts/author-hreflang-sync.cjs');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('日本語運営者ページへ完全なhreflangクラスターを一度だけ同期する', () => {
  const source = '<html><head>\n  <link rel="canonical" href="https://playpoint-sim.com/author/katakata.html">\n</head></html>';
  const result = synchronizeJapaneseAuthorHreflang(source);
  assert.equal(result.changed, true);
  assert.deepEqual(extractAuthorAlternates(result.html), AUTHOR_ALTERNATES);

  const stable = synchronizeJapaneseAuthorHreflang(result.html);
  assert.equal(stable.changed, false);
  assert.equal(stable.html, result.html);
});

test('日本語と生成3言語の運営者ページは同じ相互hreflangクラスターを持つ', () => {
  for (const relativePath of [
    'author/katakata.html',
    'en/author/katakata.html',
    'ko/author/katakata.html',
    'tw/author/katakata.html'
  ]) {
    assert.deepEqual(
      extractAuthorAlternates(read(relativePath)),
      AUTHOR_ALTERNATES,
      `${relativePath}: author alternate cluster differs`
    );
  }
});
