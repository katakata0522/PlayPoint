'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'changelog.html'), 'utf8');

test('更新履歴はLatest表示を最新エントリ1件だけに持つ', () => {
  assert.equal((html.match(/class="timeline-badge">Latest<\/span>/g) || []).length, 1);
  assert.match(html, /<div class="timeline-item latest">[\s\S]*?<h2 class="timeline-version">v2\.4\.0 <span class="timeline-badge">Latest<\/span><\/h2>/);
  assert.doesNotMatch(html, /v2\.3\.2[^\n]*Latest/);
});

test('日本語の更新履歴へ韓国語助詞が混入しない', () => {
  assert.doesNotMatch(html, /iCal의/);
  assert.match(html, /GoogleカレンダーやiCalの登録件名や詳細説明文、ファイル名を多言語化。/);
});
