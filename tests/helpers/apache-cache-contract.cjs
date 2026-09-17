'use strict';
const assert = require('node:assert/strict');

// Apache全体の模倣ではない。現行のCache-Control宣言・適用条件を静的に読む。
// 複雑な式へ変更する場合はこの契約も再評価する。実HTTPの別検査は削らない。
function cacheHeaders(source) {
  const stack = [];
  const headers = [];
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const close = line.match(/^<\/([\w]+)>$/);
    if (close) {
      assert.equal(stack.pop()?.kind, close[1].toLowerCase(), 'Apache条件ブロックの不整合');
      continue;
    }
    const open = line.match(/^<([\w]+)\s+(.+)>$/);
    if (open) { stack.push({ kind: open[1].toLowerCase(), value: unquote(open[2]) }); continue; }
    const match = line.match(/^Header\s+(?:always\s+)?set\s+Cache-Control\s+(["'])(.*?)\1(?:\s+(["'])(.*?)\3)?\s*$/i);
    if (match) headers.push({ value: match[2], expression: match[4] || '', conditions: stack.map(item => ({ ...item })) });
  }
  assert.equal(stack.length, 0, '閉じていないApache条件ブロック');
  return headers;
}
function unquote(value) { return /^(["']).*\1$/.test(value) ? value.slice(1, -1) : value; }
function directives(value) { return new Set(value.toLowerCase().split(',').map(part => part.trim())); }
function assertCacheContract(source) {
  const headers = cacheHeaders(source).filter(h => h.conditions.some(c => c.kind === 'ifmodule' && c.value === 'mod_headers.c'));
  const short = headers.find(h => {
    const values = directives(h.value);
    if (!values.has('max-age=300') || !values.has('must-revalidate') || h.expression) return false;
    const files = h.conditions.filter(c => c.kind === 'filesmatch');
    if (files.length !== 1) return false;
    const pattern = new RegExp(files[0].value);
    return ['app.js', 'app.mjs'].every(p => pattern.test(p)) && ['style.css', 'index.html'].every(p => !pattern.test(p));
  });
  assert.ok(short, '未版管理JSに適用する有効な短期再検証宣言がない');
  const immutable = headers.find(h => {
    const values = directives(h.value);
    return values.has('max-age=31536000') && values.has('immutable') && !h.conditions.some(c => ['files', 'filesmatch'].includes(c.kind));
  });
  assert.ok(immutable, '版付き資産への有効なimmutable宣言がない');
  const expression = immutable.expression.match(/^expr=%\{QUERY_STRING\}\s*=~\s*m(.)(.*)\1$/);
  assert.ok(expression, 'immutableはQUERY_STRINGの正の版条件に限定する');
  const version = new RegExp(expression[2]);
  for (const [query, expected] of [['v=abc123', true], ['x=1&v=abc_12-Z&y=2', true], ['', false], ['x=1', false], ['preview=abc', false], ['v=', false]]) {
    assert.equal(version.test(query), expected, `版条件が不正: ${query}`);
  }
  return { checked: true, scope: 'active Cache-Control directives and current simple query condition; not Apache HTTP execution' };
}
module.exports = { assertCacheContract };
