'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const {
  DEFAULT_ATTEMPTS,
  DEFAULT_DELAY_MS,
  verifyDeployRevisionWithRetry
} = require('../.github/scripts/verify-deploy-revision.cjs');

function startRevisionServer(handler) {
  const server = http.createServer(handler);
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({
        url: `http://127.0.0.1:${address.port}/status/deploy-revision.txt`,
        close: () => new Promise((done, fail) => server.close(error => error ? fail(error) : done()))
      });
    });
  });
}

test('post-deploy revision readiness tolerates bounded stale reads but still requires the exact SHA', async () => {
  const expected = 'expected-sha';
  let requests = 0;
  const seenHeaders = [];
  const seenQueries = [];
  const server = await startRevisionServer((request, response) => {
    requests += 1;
    seenHeaders.push({
      cacheControl: request.headers['cache-control'],
      pragma: request.headers.pragma
    });
    seenQueries.push(new URL(request.url, 'http://127.0.0.1').searchParams.get('browser_smoke'));
    response.writeHead(200, { 'content-type': 'text/plain' });
    response.end(requests < 3 ? 'previous-sha\n' : `${expected}\n`);
  });

  try {
    const retries = [];
    const result = await verifyDeployRevisionWithRetry({
      url: server.url,
      expectedRevision: expected,
      attempts: 4,
      delayMs: 1,
      timeoutMs: 1000,
      onRetry: (error, attempt, attempts) => retries.push({ message: error.message, attempt, attempts })
    });

    assert.deepEqual(result, {
      checked: true,
      expected,
      actual: expected,
      attempts: 3
    });
    assert.equal(requests, 3);
    assert.equal(retries.length, 2);
    assert.ok(retries.every(entry => entry.message.includes('revision mismatch')));
    assert.ok(seenHeaders.every(headers => headers.cacheControl === 'no-cache' && headers.pragma === 'no-cache'));
    assert.equal(new Set(seenQueries).size, 3, 'every readiness request must be cache-busted');
  } finally {
    await server.close();
  }
});

test('post-deploy revision readiness fails after its explicit retry budget', async () => {
  const server = await startRevisionServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/plain' });
    response.end('stale-sha\n');
  });

  try {
    await assert.rejects(
      verifyDeployRevisionWithRetry({
        url: server.url,
        expectedRevision: 'expected-sha',
        attempts: 3,
        delayMs: 1,
        timeoutMs: 1000,
        onRetry: () => {}
      }),
      /failed after 3 attempts: expected expected-sha, got stale-sha/
    );
  } finally {
    await server.close();
  }
});

test('production defaults provide a bounded propagation window without becoming an unbounded wait', () => {
  assert.equal(DEFAULT_ATTEMPTS, 8);
  assert.equal(DEFAULT_DELAY_MS, 2500);
  const scheduledDelayMs = Array.from({ length: DEFAULT_ATTEMPTS - 1 }, (_, index) => DEFAULT_DELAY_MS * (index + 1))
    .reduce((sum, delay) => sum + delay, 0);
  assert.equal(scheduledDelayMs, 70000);
  assert.ok(scheduledDelayMs < 120000, 'readiness backoff alone must stay below two minutes');
});
