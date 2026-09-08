'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const readText = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n');
const browserSmoke = readText('.github/scripts/browser-smoke.cjs');
const deployRevisionReadiness = readText('.github/scripts/verify-deploy-revision.cjs');

test('browser smoke reuses the shared revision verifier and keeps the production IPv4 transport boundary', () => {
  // The retry count/delay/timeout behavior is owned by deploy-revision-readiness.test.cjs.
  // Keep only the integration/destructive-boundary facts that cannot be inferred from
  // the helper's unit behavior alone.
  assert.match(browserSmoke, /verifyDeployRevisionWithRetry/);
  assert.doesNotMatch(browserSmoke, /function requestRevisionText\(url\)/);
  assert.match(deployRevisionReadiness, /family:\s*4/);
});
