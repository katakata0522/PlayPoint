'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  fetchLiveVerifiedRevisionOnce,
  normalizeRevision,
  validateLiveVerifiedRevision
} = require('../.github/scripts/resolve-live-deploy-base.cjs');

const SHA = '0123456789abcdef0123456789abcdef01234567';

function statusPayload(overrides = {}) {
  return {
    schemaVersion: 1,
    status: 'verified',
    environment: 'production',
    commit: SHA,
    branch: 'main',
    deployedAt: '2026-09-30T00:00:00Z',
    verifiedAt: '2026-09-30T00:01:00Z',
    checks: {
      preflight: 'passed',
      smokeTest: 'passed',
      seoHealth: 'passed'
    },
    workflow: {
      repository: 'katakata0522/PlayPoint',
      runId: '1',
      runNumber: '1'
    },
    ...overrides
  };
}

function response({ ok = true, status = 200, json, text }) {
  return {
    ok,
    status,
    async json() { return typeof json === 'function' ? json() : json; },
    async text() { return typeof text === 'function' ? text() : text; }
  };
}

test('verified statusとrevisionが一致する場合だけ本番基準SHAとして採用する', () => {
  assert.equal(validateLiveVerifiedRevision(statusPayload(), SHA + '\n'), SHA);
  assert.equal(normalizeRevision(SHA.toUpperCase() + '\r\n'), SHA);
});

test('statusとrevisionのSHA不一致は本番基準として採用しない', () => {
  const other = '89abcdef0123456789abcdef0123456789abcdef';
  assert.throws(
    () => validateLiveVerifiedRevision(statusPayload(), other),
    /Deployment commit mismatch/
  );
});

test('verifiedでないstatusは本番基準として採用しない', () => {
  const deploying = statusPayload({
    status: 'deploying',
    verifiedAt: null,
    checks: {
      preflight: 'passed',
      smokeTest: 'pending',
      seoHealth: 'pending'
    }
  });
  assert.throws(
    () => validateLiveVerifiedRevision(deploying, SHA),
    /Deployment status mismatch/
  );
});

test('不正なrevision文字列はfail-closedにする', () => {
  assert.throws(() => normalizeRevision('not-a-sha'), /40-character Git SHA/);
});

test('status/revisionの両endpointをno-cacheで取得して一致SHAを返す', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return calls.length === 1
      ? response({ json: statusPayload() })
      : response({ text: SHA + '\n' });
  };
  const revision = await fetchLiveVerifiedRevisionOnce({
    fetchImpl,
    cacheBust: 'test',
    timeoutMs: 1000
  });
  assert.equal(revision, SHA);
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.match(call.url, /check=test/);
    assert.equal(call.options.headers['cache-control'], 'no-cache');
  }
});

test('どちらかのendpointがHTTP失敗なら本番基準を推測しない', async () => {
  let count = 0;
  const fetchImpl = async () => {
    count += 1;
    return count === 1
      ? response({ ok: false, status: 503, json: {} })
      : response({ text: SHA });
  };
  await assert.rejects(
    fetchLiveVerifiedRevisionOnce({ fetchImpl, cacheBust: 'test', timeoutMs: 1000 }),
    /HTTP 503\/200/
  );
});
