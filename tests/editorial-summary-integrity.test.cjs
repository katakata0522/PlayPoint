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

// 空行の完全一致は利用者向け契約ではない。本文保持と冪等性は上の検査が担当。

test('編集対象の記事は生成・個別編集どちらでも壊れたマーカーと重複IDを持たない', () => {
  const targets = Object.entries(EDITORIAL_TARGETS);
  assert.ok(targets.length > 0, 'editorial targets missing');

  for (const [relativePath, config] of targets) {
    const html = fs.readFileSync(path.join(root, relativePath), 'utf8');
    const withoutCanonicalMarkers = html
      .replaceAll(COMMENT_START, '')
      .replaceAll(COMMENT_END, '');

    const starts = count(html, COMMENT_START);
    assert.equal(count(html, COMMENT_END), starts, `${relativePath}: マーカーは対になる必要があります`);
    if (config.manualStructure) assert.ok(starts <= 1, `${relativePath}: 個別編集の旧ブロックは重複させません`);
    else assert.equal(starts, 1, `${relativePath}: 生成ブロックは1つです`);
    assert.doesNotMatch(
      withoutCanonicalMarkers,
      /editorial-summary:(?:start|end)/,
      `${relativePath}: legacy plain editorial marker remains`
    );
    assert.ok(countId(html, 'known-unknown') <= 1, `${relativePath}: duplicate #known-unknown`);
    assert.ok(countId(html, 'quick-answer') <= 1, `${relativePath}: duplicate #quick-answer`);
  }
});
