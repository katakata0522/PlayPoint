'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { assertOrderedAttributes } = require('./helpers/markup-contract.cjs');

test('静的順序の検査は存在を必須にし、コメントやscript内の偽タグで補完しない', () => {
  const first = '<h2 data-key="first">説明</h2>';
  const last = "<h2 title='a > b' data-key='last'>記事</h2>";
  const check = html => assertOrderedAttributes(html, 'data-key', ['first', 'last'], 'fixture');
  check(first + last);
  check(first.replace('data-key="first"', "class='title' data-key = 'first'") + '<!-- marker変更 -->' + last);
  for (const broken of [last, first, last + first, first + first + last, `<!-- ${first} -->${last}`, `<script>const x = '${first}'</script>${last}`]) assert.throws(() => check(broken));
});

// Cache-ControlはHTTP応答の単体検査とPR Gateの実Apache検査へ移行した。
