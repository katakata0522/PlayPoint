'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { assertOrderedAttributes } = require('./helpers/markup-contract.cjs');
const { assertCacheContract } = require('./helpers/apache-cache-contract.cjs');

test('静的順序の検査は存在を必須にし、コメントやscript内の偽タグで補完しない', () => {
  const first = '<h2 data-key="first">説明</h2>';
  const last = "<h2 title='a > b' data-key='last'>記事</h2>";
  const check = html => assertOrderedAttributes(html, 'data-key', ['first', 'last'], 'fixture');
  check(first + last);
  check(first.replace('data-key="first"', "class='title' data-key = 'first'") + '<!-- marker変更 -->' + last);
  for (const broken of [last, first, last + first, first + first + last, `<!-- ${first} -->${last}`, `<script>const x = '${first}'</script>${last}`]) assert.throws(() => check(broken));
});

const cache = `<IfModule mod_headers.c>
<FilesMatch "\\.(js|mjs)$">
Header set Cache-Control "public, max-age=300, must-revalidate"
</FilesMatch>
Header set Cache-Control "public, max-age=31536000, immutable" "expr=%{QUERY_STRING} =~ m#(^|&)v=[a-zA-Z0-9_-]+(&|$)#"
</IfModule>`;

test('キャッシュ宣言は整形・コメント追加を許し、コメントだけや適用条件の反転を拒否する', () => {
  assertCacheContract(cache);
  assertCacheContract('# 設定資料\n' + cache.replaceAll('\n', '\n  '));
  for (const broken of [
    cache.split('\n').map(line => '# ' + line).join('\n'),
    cache.replace('=~', '!~'),
    cache.replace('mod_headers.c', '!mod_headers.c'),
    cache.replace('\\.(js|mjs)$', '\\.css$'),
    cache.replace(/ "expr=[^\n]+/, '')
  ]) assert.throws(() => assertCacheContract(broken));
});
