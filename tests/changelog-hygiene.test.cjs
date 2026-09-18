'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'changelog.html'), 'utf8');

test('更新履歴はLatest表示を先頭エントリ1件だけに持つ', () => {
  const timelineStart = html.indexOf('<div class="timeline">');
  const firstItemStart = html.indexOf('<div class="timeline-item', timelineStart);
  const secondItemStart = html.indexOf('<div class="timeline-item', firstItemStart + 1);
  const firstItem = html.slice(firstItemStart, secondItemStart);

  assert.ok(timelineStart >= 0 && firstItemStart > timelineStart, 'timeline entry is missing');
  assert.match(firstItem, /^<div class="timeline-item[^"]*\blatest\b[^"]*">/);
  assert.match(firstItem, /class="timeline-badge">Latest<\/span>/);
  assert.equal((html.match(/class="timeline-badge">Latest<\/span>/g) || []).length, 1);
  assert.equal((html.match(/class="timeline-item[^"]*\blatest\b[^"]*"/g) || []).length, 1);
});

test('日本語の更新履歴へ韓国語助詞が混入しない', () => {
  assert.doesNotMatch(html, /iCal의/);
  assert.match(html, /Googleカレンダー/);
  assert.match(html, /iCal/);
});
