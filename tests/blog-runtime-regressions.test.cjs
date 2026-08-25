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
