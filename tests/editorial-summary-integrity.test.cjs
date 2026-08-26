'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  EDITORIAL_TARGETS,
  stripEditorialSummaryBlocks
} = require('../scripts/article-editorial-structure.cjs');

const root = path.resolve(__dirname, '..');
const COMMENT_START = '<!-- editorial-summary:start -->';
const COMMENT_END = '<!-- editorial-summary:end -->';

function count(text, needle) {
  return text.split(needle).length - 1;
}

function countId(html, id) {
  return (html.match(new RegExp(`\\bid=["']${id}["']`, 'g')) || []).length;
}

test('壊れた平文マーカーと複数の正規ブロックをまとめて除去できる', () => {
  const html = `<article>
<p>before</p>
<!-- editorial-summary:start -->
<section id="old-commented">old 1</section>
<!-- editorial-summary:end -->
<!---->
 editorial-summary:start
<section id="old-plain">old 2</section>
 editorial-summary:end
<!-- editorial-summary:start -->
<section id="old-commented-2">old 3</section>
<!-- editorial-summary:end -->
<p>after</p>
</article>`;

  const cleaned = stripEditorialSummaryBlocks(html);
  assert.doesNotMatch(cleaned, /editorial-summary:(?:start|end)/);
  assert.doesNotMatch(cleaned, /old-commented|old-plain/);
  assert.match(cleaned, /<p>before<\/p>/);
  assert.match(cleaned, /<p>after<\/p>/);
  assert.equal(stripEditorialSummaryBlocks(cleaned), cleaned, 'cleanup must be idempotent');
});

test('編集要約を除去した跡の空行を1つへ正規化する', () => {
  const html = `<p>before</p>\n<!-- editorial-summary:start -->\n<section>summary</section>\n<!-- editorial-summary:end -->\n\n\n\n            <!---->\n<section>after</section>`;

  assert.equal(
    stripEditorialSummaryBlocks(html),
    '<p>before</p>\n<!---->\n<section>after</section>'
  );
});
test('自動生成対象の記事はeditorial summaryを1ブロックだけ持つ', () => {
  const automaticTargets = Object.entries(EDITORIAL_TARGETS)
    .filter(([, config]) => !config.manualStructure)
    .map(([relativePath]) => relativePath);

  assert.ok(automaticTargets.length > 0, 'automatic editorial targets missing');

  for (const relativePath of automaticTargets) {
    const html = fs.readFileSync(path.join(root, relativePath), 'utf8');
    const withoutCanonicalMarkers = html
      .replaceAll(COMMENT_START, '')
      .replaceAll(COMMENT_END, '');

    assert.equal(count(html, COMMENT_START), 1, `${relativePath}: editorial-summary:start must appear once`);
    assert.equal(count(html, COMMENT_END), 1, `${relativePath}: editorial-summary:end must appear once`);
    assert.doesNotMatch(
      withoutCanonicalMarkers,
      /editorial-summary:(?:start|end)/,
      `${relativePath}: legacy plain editorial marker remains`
    );
    assert.ok(countId(html, 'known-unknown') <= 1, `${relativePath}: duplicate #known-unknown`);
    assert.ok(countId(html, 'quick-answer') <= 1, `${relativePath}: duplicate #quick-answer`);
  }
});
