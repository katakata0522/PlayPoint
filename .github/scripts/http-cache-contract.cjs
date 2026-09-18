'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { mapWithConcurrency, retry } = require('./http-check-utils.cjs');

// 設定文の形ではなく、ブラウザが受け取る応答を同じ基準で検証する。
function cacheCases({ fixture = false } = {}) {
  const targets = [
    ['/js/main.js', 'script'], ['/style.css', 'style'], ['/', 'html'], ['/en/', 'html'],
    ['/sw.js', 'worker'], ['/blog/articles.json', 'articles'], ['/blog/article-search-index.json', 'articles'], ['/status/deploy-status.json', 'revision'], ['/status/deploy-revision.txt', 'revision'],
    ['/manifest.json', 'manifest'], ['/feed.xml', 'feed'], ['/atom.xml', 'feed']
  ];
  if (fixture) targets.push(
    ['/nested/app.mjs', 'script'], ['/nested/app.js', 'script'], ['/nested/page.html', 'html'],
    ['/articles.json', 'articles'], ['/other.json', 'other']
  );
  const queries = [
    ['', false], ['?v=abc123', true], ['?x=1&v=abc_12-Z&y=2', true],
    ['?preview=abc123', false], ['?v=', false], ['?v=abc%2Fdef', false]
  ];
  const cases = targets.flatMap(([pathname, kind]) => queries.map(([query, versioned]) => ({
    path: pathname + query, status: 200,
    policy: versioned && ['script', 'style'].includes(kind) ? 'immutable' : kind
  })));
  if (fixture) cases.push(
    { path: '/missing.js?v=abc123', status: 404, policy: 'error' },
    { path: '/missing.html?v=abc123', status: 404, policy: 'error' },
    { path: '/index.html?v=abc123', status: 301, policy: 'redirect' }
  );
  return cases;
}

function assertCacheResponse(spec, response) {
  const label = spec.path;
  assert.equal(response.status, spec.status, `${label}: HTTP status`);
  const value = response.headers.get('cache-control') || '';
  const directives = new Map();
  for (const part of value.split(',').map(item => item.trim()).filter(Boolean)) {
    const match = /^([\w-]+)(?:\s*=\s*(.+))?$/.exec(part);
    assert.ok(match, `${label}: invalid Cache-Control: ${value}`);
    const key = match[1].toLowerCase();
    assert.ok(!directives.has(key), `${label}: duplicate ${key}: ${value}`);
    directives.set(key, (match[2] || '').replace(/^"(.*)"$/, '$1').toLowerCase());
  }
  for (const key of ['public', 'private', 'immutable', 'no-store', 'must-revalidate']) {
    assert.ok(!directives.has(key) || directives.get(key) === '', `${label}: invalid flag ${key}: ${value}`);
  }
  const has = key => directives.has(key);
  const requireFlag = key => assert.ok(has(key), `${label}: missing ${key}: ${value}`);
  const forbid = key => assert.ok(!has(key), `${label}: unexpected ${key}: ${value}`);
  const age = (limit, exact = false) => {
    const raw = directives.get('max-age');
    assert.ok(raw !== undefined && /^\d+$/.test(raw), `${label}: missing/invalid max-age: ${value}`);
    const actual = Number(raw);
    assert.ok(Number.isSafeInteger(actual) && (exact ? actual === limit : actual <= limit), `${label}: max-age ${actual} expected ${exact ? '=' : '<='}${limit}`);
  };
  assert.ok(!(has('public') && has('private')), `${label}: public/private conflict`);
  if (spec.policy === 'immutable') {
    requireFlag('public'); requireFlag('immutable'); age(31536000, true);
    forbid('no-cache'); forbid('no-store'); forbid('private');
    return;
  }
  forbid('immutable');
  switch (spec.policy) {
    case 'script': case 'worker': case 'articles':
      requireFlag('public'); requireFlag('must-revalidate'); age(300); break;
    case 'style': age(604800); break;
    case 'html': age(300); break;
    case 'manifest': age(86400); break;
    case 'feed': age(1800); break;
    case 'revision':
      requireFlag('no-store'); requireFlag('no-cache'); requireFlag('must-revalidate'); age(0, true);
      forbid('public'); break;
    case 'other': case 'error': case 'redirect': break;
    default: assert.fail(`${label}: unknown cache policy ${spec.policy}`);
  }
}

async function fetchSnapshot(url) {
  const response = await fetch(url, {
    redirect: 'manual', cache: 'no-store', headers: { 'cache-control': 'no-cache', pragma: 'no-cache' },
    signal: AbortSignal.timeout(12000)
  });
  // 既知の小さい公開ファイルだけを取得し、本文は検証後のreportへ保存しない。
  const body = await response.text();
  assert.ok(Buffer.byteLength(body) <= 2 * 1024 * 1024, `${url}: response too large`);
  return { status: response.status, headers: response.headers, body };
}

async function verifyHttpCache({ baseUrl, fixture = false, request = fetchSnapshot, expectedRevision = '', outputFile = '', attempts = 2, fixtureRuntime = null } = {}) {
  const base = new URL(baseUrl);
  assert.equal(base.protocol, 'https:', 'HTTP cache verification requires HTTPS');
  if (!fixture) assert.match(expectedRevision, /^[0-9a-f]{40}$/, 'Production cache verification requires an exact revision');
  const nonce = randomUUID();
  const urlFor = pathname => {
    const url = new URL(pathname, base);
    url.searchParams.set('cache_check', nonce);
    return url;
  };
  const report = { mode: fixture ? 'apache-fixture' : 'production', baseUrl: base.origin, expectedRevision,
    startedAt: new Date().toISOString(), fixtureRuntime, observations: [], passed: false };
  const obtain = url => retry(() => request(url), { attempts, delayMs: 500 });
  const observeRevision = async () => {
    const result = await obtain(urlFor('/status/deploy-revision.txt'));
    assertCacheResponse({ path: '/status/deploy-revision.txt', status: 200, policy: 'revision' }, result);
    const observed = result.body.trim();
    assert.equal(observed, expectedRevision, 'Production revision changed or differs from the expected revision');
    return observed;
  };
  try {
    if (!fixture) report.beforeRevision = await observeRevision();
    const results = await mapWithConcurrency(cacheCases({ fixture }), 3, async spec => {
      const response = await obtain(urlFor(spec.path));
      const observation = { ...spec, observedStatus: response.status, cacheControl: response.headers.get('cache-control'), passed: false };
      report.observations.push(observation);
      assertCacheResponse(spec, response);
      if (fixture && spec.status === 200) {
        const pathname = new URL(spec.path, base).pathname;
        assert.equal(response.body, `fixture:${pathname.endsWith('/') ? pathname + 'index.html' : pathname}\n`, `${spec.path}: fixture body mismatch`);
      }
      observation.passed = true;
    });
    report.observations.sort((a, b) => a.path.localeCompare(b.path));
    report.failures = results.filter(item => item.status === 'rejected').map(item => ({ path: item.item.path, error: item.reason.message }));
    if (!fixture) report.afterRevision = await observeRevision();
    assert.equal(report.failures.length, 0, `HTTP cache contract failed:\n${report.failures.map(item => item.error).join('\n')}`);
    report.passed = true;
    return report;
  } catch (error) {
    report.error = error.message;
    throw error;
  } finally {
    report.finishedAt = new Date().toISOString();
    if (outputFile) {
      fs.mkdirSync(path.dirname(outputFile), { recursive: true });
      fs.writeFileSync(outputFile, JSON.stringify(report, null, 2) + '\n');
    }
  }
}

module.exports = { cacheCases, assertCacheResponse, verifyHttpCache };
