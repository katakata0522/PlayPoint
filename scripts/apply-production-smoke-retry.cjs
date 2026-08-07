'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const smokePath = path.join(root, '.github/scripts/browser-smoke.cjs');
const testPath = path.join(root, 'tests/blog-runtime-regressions.test.cjs');

function replaceOnce(content, before, after, label) {
  const count = content.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  return content.replace(before, after);
}

let smoke = fs.readFileSync(smokePath, 'utf8');
smoke = replaceOnce(
  smoke,
  "const http = require('node:http');\nconst path = require('node:path');",
  "const http = require('node:http');\nconst https = require('node:https');\nconst path = require('node:path');",
  'add HTTPS client'
);

const oldRevision = `async function verifyRevision(baseUrl) {\n  if (!EXPECTED_REVISION) return { checked: false };\n  const url = new URL('status/deploy-revision.txt', baseUrl);\n  let actual = '';\n  for (let attempt = 1; attempt <= 4; attempt += 1) {\n    const response = await fetch(\`${'${url.href}'}?browser_smoke=${'${Date.now()}'}\`, {\n      headers: { 'cache-control': 'no-cache' },\n      signal: AbortSignal.timeout(15_000)\n    });\n    if (response.ok) actual = (await response.text()).trim();\n    if (actual === EXPECTED_REVISION) return { checked: true, expected: EXPECTED_REVISION, actual };\n    if (attempt < 4) await new Promise(resolve => setTimeout(resolve, attempt * 1_500));\n  }\n  throw new Error(\`deployed revision mismatch: expected ${'${EXPECTED_REVISION}'}, got ${'${actual}'}\`);\n}`;

const newRevision = `function requestRevisionText(url) {\n  const client = url.protocol === 'https:' ? https : http;\n  return new Promise((resolve, reject) => {\n    const request = client.get(url, {\n      family: 4,\n      headers: { 'cache-control': 'no-cache' }\n    }, response => {\n      let body = '';\n      response.setEncoding('utf8');\n      response.on('data', chunk => { body += chunk; });\n      response.on('end', () => {\n        resolve({\n          ok: response.statusCode >= 200 && response.statusCode < 300,\n          status: response.statusCode || 0,\n          text: body\n        });\n      });\n    });\n    request.setTimeout(15_000, () => request.destroy(new Error('revision request timeout')));\n    request.on('error', reject);\n  });\n}\n\nasync function verifyRevision(baseUrl) {\n  if (!EXPECTED_REVISION) return { checked: false };\n  const url = new URL('status/deploy-revision.txt', baseUrl);\n  let actual = '';\n  let lastError = null;\n  for (let attempt = 1; attempt <= 4; attempt += 1) {\n    const requestUrl = new URL(url);\n    requestUrl.searchParams.set('browser_smoke', String(Date.now()));\n    try {\n      const response = await requestRevisionText(requestUrl);\n      if (response.ok) actual = response.text.trim();\n      else lastError = new Error(\`revision request returned HTTP ${'${response.status}'}\`);\n      if (actual === EXPECTED_REVISION) {\n        return { checked: true, expected: EXPECTED_REVISION, actual, attempts: attempt };\n      }\n    } catch (error) {\n      lastError = error;\n    }\n    if (attempt < 4) await new Promise(resolve => setTimeout(resolve, attempt * 1_500));\n  }\n  const reason = lastError ? \`: ${'${lastError.message}'}\` : '';\n  throw new Error(\`deployed revision check failed: expected ${'${EXPECTED_REVISION}'}, got ${'${actual || "no response"}'}${'${reason}'}\`);\n}`;

smoke = replaceOnce(smoke, oldRevision, newRevision, 'replace revision verification');
fs.writeFileSync(smokePath, smoke, 'utf8');

let tests = fs.readFileSync(testPath, 'utf8');
const addition = `\n\ntest('production revision verification retries IPv4 network errors', () => {\n  assert.match(browserSmoke, /family: 4/);\n  assert.match(browserSmoke, /function requestRevisionText\\(url\\)/);\n  const body = functionBody(\n    browserSmoke,\n    'async function verifyRevision(baseUrl) {',\n    '\\n\\nasync function main() {'\n  );\n  assert.match(body, /attempt <= 4/);\n  assert.match(body, /catch \\(error\\)/);\n  assert.match(body, /lastError = error/);\n});\n`;
if (tests.includes("production revision verification retries IPv4 network errors")) {
  throw new Error('retry regression test already exists');
}
tests += addition;
fs.writeFileSync(testPath, tests, 'utf8');

console.log('Applied production smoke IPv4 retry handling.');
