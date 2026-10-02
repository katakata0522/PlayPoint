'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  INDEXNOW_ENDPOINT,
  INDEXNOW_KEY,
  INDEXNOW_KEY_FILE,
  INDEXNOW_KEY_LOCATION,
  buildIndexNowPayload,
  collectChangedPublicUrls,
  repositoryPathToPublicUrl,
  submitIndexNow,
} = require('../.github/scripts/indexnow-notify.cjs');
const { PUBLIC_ROOT_FILES } = require('../.github/scripts/public-paths.cjs');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n?/g, '\n');

test('IndexNow key is a public root artifact with exact verification contents', () => {
  assert.match(INDEXNOW_KEY, /^[A-Za-z0-9-]{8,128}$/);
  assert.equal(PUBLIC_ROOT_FILES.has(INDEXNOW_KEY_FILE), true);
  assert.equal(read(INDEXNOW_KEY_FILE).trim(), INDEXNOW_KEY);
  assert.equal(INDEXNOW_KEY_LOCATION, `https://playpoint-sim.com/${INDEXNOW_KEY_FILE}`);
});

test('repository HTML paths map to canonical public URLs without touching non-HTML assets', () => {
  assert.equal(repositoryPathToPublicUrl('index.html'), 'https://playpoint-sim.com/');
  assert.equal(repositoryPathToPublicUrl('latest/index.html'), 'https://playpoint-sim.com/latest/');
  assert.equal(repositoryPathToPublicUrl('articles/example.html'), 'https://playpoint-sim.com/articles/example.html');
  assert.equal(repositoryPathToPublicUrl('js/main.js'), null);
  assert.equal(repositoryPathToPublicUrl('robots.txt'), null);
  for (const file of ['docs/private.html', 'tests/fixture.html', 'tools/report.html',
    'unclassified/page.html', '../index.html', 'articles/../docs/private.html']) {
    assert.equal(repositoryPathToPublicUrl(file), null, file);
  }
});

test('changed public URLs include additions, modifications and deletions once', () => {
  const result = collectChangedPublicUrls({
    baseSha: 'a'.repeat(40),
    headSha: 'b'.repeat(40),
    execGit() {
      return [
        'M\tindex.html',
        'M\tlatest/index.html',
        'A\tdocs/private.html',
        'A\tarticles/new.html',
        'D\tarticles/old.html',
        'M\tjs/main.js',
        'M\tlatest/index.html',
      ].join('\n');
    },
  });
  assert.equal(result.skippedReason, null);
  assert.deepEqual(result.urls, [
    'https://playpoint-sim.com/',
    'https://playpoint-sim.com/articles/new.html',
    'https://playpoint-sim.com/articles/old.html',
    'https://playpoint-sim.com/latest/',
  ]);
});

test('missing or shallow-history base SHA skips discovery instead of flooding IndexNow', () => {
  assert.equal(collectChangedPublicUrls({ baseSha: '', headSha: 'b'.repeat(40) }).skippedReason, 'base-or-head-sha-unavailable');
  const result = collectChangedPublicUrls({
    baseSha: 'a'.repeat(40),
    headSha: 'b'.repeat(40),
    execGit() { throw new Error('unknown revision'); },
  });
  assert.match(result.skippedReason, /^git-diff-unavailable:/);
  assert.deepEqual(result.urls, []);
});

test('IndexNow payload is host-scoped and rejects foreign URLs', () => {
  assert.deepEqual(buildIndexNowPayload(['https://playpoint-sim.com/latest/']), {
    host: 'playpoint-sim.com',
    key: INDEXNOW_KEY,
    keyLocation: INDEXNOW_KEY_LOCATION,
    urlList: ['https://playpoint-sim.com/latest/'],
  });
  assert.throws(() => buildIndexNowPayload(['https://example.com/']));
  for (const url of ['http://playpoint-sim.com/', 'https://playpoint-sim.com:444/', 'https://u:p@playpoint-sim.com/']) {
    assert.throws(() => buildIndexNowPayload([url]), /outside canonical host/);
  }
});

test('IndexNow submission verifies the live key before posting the bounded JSON batch', async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (url === INDEXNOW_KEY_LOCATION) {
      return { ok: true, status: 200, async text() { return `${INDEXNOW_KEY}\n`; } };
    }
    assert.equal(url, INDEXNOW_ENDPOINT);
    return { ok: true, status: 202, async text() { return 'accepted'; } };
  };
  const result = await submitIndexNow([
    'https://playpoint-sim.com/latest/',
    'https://playpoint-sim.com/articles/example.html',
  ], { fetchImpl });
  assert.deepEqual(result, { submitted: 2, status: 202 });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.method, 'GET');
  assert.equal(calls[1].options.method, 'POST');
  const payload = JSON.parse(calls[1].options.body);
  assert.deepEqual(payload.urlList, [
    'https://playpoint-sim.com/latest/',
    'https://playpoint-sim.com/articles/example.html',
  ]);
  let posts = 0;
  await assert.rejects(submitIndexNow(['https://playpoint-sim.com/latest/'], { fetchImpl: async (url, options) => {
    if (options.method === 'POST') posts++;
    return { ok: true, status: 200, async text() { return 'incorrect-public-key'; } };
  } }), /key verification failed/);
  assert.equal(posts, 0, '鍵検証失敗で通知しない');
  await assert.rejects(submitIndexNow(['https://playpoint-sim.com/latest/'], { fetchImpl: async (url, options) => ({
    ok: options.method === 'GET', status: options.method === 'GET' ? 200 : 500,
    async text() { return options.method === 'GET' ? INDEXNOW_KEY : 'server error'; }
  }) }), /submission failed: HTTP 500/);
});

test('Deploy notifies IndexNow only after verified publication and never makes discovery failure a rollback trigger', () => {
  const workflow = read('.github/workflows/deploy.yml');
  const publishIndex = workflow.indexOf('- name: Publish verified deployment status');
  const notifyIndex = workflow.indexOf('- name: Notify IndexNow after verified deployment');
  const rollbackIndex = workflow.indexOf('- name: Auto-rollback failed production mutation');
  assert.ok(publishIndex >= 0 && notifyIndex > publishIndex, 'IndexNow must run after verified publication');
  assert.ok(rollbackIndex > notifyIndex, 'IndexNow should remain an auxiliary post-verify step');
  const blockStart = notifyIndex;
  const blockEnd = workflow.indexOf('\n      - name: ', notifyIndex + 1);
  const block = workflow.slice(blockStart, blockEnd >= 0 ? blockEnd : workflow.length);
  assert.match(block, /continue-on-error: true/);
  assert.match(block, /steps\.publish-verified\.outcome == 'success'/);
  assert.match(block, /INDEXNOW_BASE_SHA: \$\{\{ github\.event\.before \}\}/);
  assert.match(block, /INDEXNOW_HEAD_SHA: \$\{\{ github\.sha \}\}/);
  assert.match(block, /node \.github\/scripts\/indexnow-notify\.cjs/);
  const rollbackBlockEnd = workflow.indexOf('\n      - name: ', rollbackIndex + 1);
  const rollbackBlock = workflow.slice(rollbackIndex, rollbackBlockEnd >= 0 ? rollbackBlockEnd : workflow.length);
  assert.doesNotMatch(rollbackBlock, /indexnow|notify-indexnow/i);
});
