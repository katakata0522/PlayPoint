'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const readText = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n');
const browserSmoke = readText('.github/scripts/browser-smoke.cjs');

function functionBody(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(start, -1, `missing start marker: ${startMarker}`);
  assert.notEqual(end, -1, `missing end marker: ${endMarker}`);
  return source.slice(start, end);
}

test('ブログ一覧の操作回帰はBrowser smokeを主担当にする', () => {
  assert.match(browserSmoke, /async function verifyBlogPage\(/);
  assert.match(browserSmoke, /new URL\('blog\/', baseUrl\)/);
  assert.match(browserSmoke, /Blog initial article cards were not rendered/);
  assert.match(browserSmoke, /Blog pagination did not advance/);
  assert.match(browserSmoke, /Blog reset state is inconsistent/);
  assert.match(browserSmoke, /Blog category active state did not update/);
  assert.match(browserSmoke, /Blog sidebar open ARIA state mismatch/);
  assert.match(browserSmoke, /Blog sidebar close ARIA state mismatch/);
  assert.match(browserSmoke, /browserState\.verify\('Blog browser errors'\)/);
});

test('production revision verification retries IPv4 network errors', () => {
  assert.match(browserSmoke, /family: 4/);
  assert.match(browserSmoke, /function requestRevisionText\(url\)/);
  const body = functionBody(
    browserSmoke,
    'async function verifyRevision(baseUrl) {',
    'async function main() {'
  );
  assert.match(body, /attempt <= 4/);
  assert.match(body, /catch \(error\)/);
  assert.match(body, /lastError = error/);
});
