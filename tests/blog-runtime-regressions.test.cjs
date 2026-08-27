'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const readText = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n');
const browserSmoke = readText('.github/scripts/browser-smoke.cjs');
const deployRevisionReadiness = readText('.github/scripts/verify-deploy-revision.cjs');

function functionBody(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(start, -1, `missing start marker: ${startMarker}`);
  assert.notEqual(end, -1, `missing end marker: ${endMarker}`);
  return source.slice(start, end);
}

test('production revision verification uses bounded IPv4 readiness retries', () => {
  assert.match(browserSmoke, /verifyDeployRevisionWithRetry/);
  assert.doesNotMatch(browserSmoke, /function requestRevisionText\(url\)/);
  assert.match(deployRevisionReadiness, /family: 4/);
  assert.match(deployRevisionReadiness, /DEFAULT_ATTEMPTS = 8/);
  assert.match(deployRevisionReadiness, /DEFAULT_DELAY_MS = 2500/);
  assert.match(deployRevisionReadiness, /'cache-control': 'no-cache'/);
  assert.match(deployRevisionReadiness, /pragma: 'no-cache'/);
  assert.match(deployRevisionReadiness, /verifyDeployRevisionWithRetry/);
});
