'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { markResponsiveTables } = require('../scripts/article-table-overflow-sync.cjs');

test('スマホ用の比較表も全セルの内容・リンクと見出し対応を保持する', () => {
  const before = `<table class='comparison-table'><thead><tr><th>症状</th><th>条件 &amp; 対処</th></tr></thead><tbody><tr><td><strong>未反映</strong></td><td><a href="/help/">対象条件</a>を確認</td></tr></tbody></table>`;
  const after = markResponsiveTables(before);
  const cells = value => [...value.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/g)].map(m => m[1]);
  assert.deepEqual(cells(after), cells(before));
  assert.match(after, /reading-responsive-table/);
  assert.match(after, /data-column-label="条件 &amp; 対処"/);
  assert.match(after, /role="table"/);
  assert.equal(markResponsiveTables(after), after);
});

test('結合セルや不揃いの行を持つ比較表は構造を変えない', () => {
  for (const table of [
    '<table><tr><th>A</th><th>B</th></tr><tr><td colspan="2">両方に適用</td></tr></table>',
    '<table><tr><th>A</th><th>B</th></tr><tr><td>列が不足</td></tr></table>',
    '<table><tr><th>A</th><th>B</th><th>C</th><th>D</th></tr><tr><td>1</td><td>2</td><td>3</td><td>4</td></tr></table>'
  ]) assert.equal(markResponsiveTables(table), table);
});
