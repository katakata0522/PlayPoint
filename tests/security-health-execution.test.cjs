'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { writeDeployStatusFromEnvironment } = require('../.github/scripts/deploy-status.cjs');

const root = path.resolve(__dirname, '..');
const revision = 'a'.repeat(40);

// 検査対象リストから公開ファイルを逆生成しない。実際の本番marker writerを使用する。
// HTTPだけを隔離し、security entrypoint・cache checker・状態生成の本物を一緒に動かす。
function runSecurity(t, { expectedRevision = '', mode = '' } = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pp-security-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const publicRoot = path.join(directory, 'public');
  const write = (name, text) => {
    const file = path.join(publicRoot, name);
    fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text);
  };
  for (const name of ['index.html', 'en/index.html', 'games/prospi-a/index.html', 'games/pokemon-go/index.html',
    'js/main.js', 'style.css', 'sw.js', 'blog/articles.json', 'blog/article-search-index.json', 'manifest.json', 'feed.xml', 'atom.xml']) write(name, 'fixture');
  writeDeployStatusFromEnvironment({ DEPLOY_PUBLIC_STATUS: 'deploying', GITHUB_SHA: revision,
    GITHUB_REF_NAME: 'main', DEPLOY_STARTED_AT: '2026-09-18T00:00:00Z',
    GITHUB_REPOSITORY: 'fixture/fixture', GITHUB_RUN_ID: '1', GITHUB_RUN_NUMBER: '1' }, publicRoot);
  assert.equal(fs.existsSync(path.join(publicRoot, 'deploy-revision.txt')), false);
  assert.equal(fs.existsSync(path.join(publicRoot, 'deploy-status.json')), false);
  const preload = path.join(directory, 'offline-fetch.cjs');
  fs.writeFileSync(preload, String.raw`
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const requests = [];
process.on('exit', () => fs.writeFileSync(path.join(process.env.RUNNER_TEMP, 'requests.json'), JSON.stringify(requests)));
global.fetch = async input => {
  const url = new URL(input);
  if (url.origin !== 'https://playpoint-sim.com') throw new Error('Unexpected fixture origin');
  requests.push(url.pathname);
  let file = path.join(process.env.FIXTURE_PUBLIC_ROOT, url.pathname.replace(/^\//, ''));
  if (url.pathname.endsWith('/')) file = path.join(file, 'index.html');
  const exists = fs.existsSync(file) && fs.statSync(file).isFile();
  const marker = url.pathname.startsWith('/status/deploy-');
  let status = exists ? 200 : 404;
  let body = exists ? fs.readFileSync(file, 'utf8') : 'fixture not found';
  if (process.env.FIXTURE_MODE === 'marker-404' && marker) status = 404;
  if (process.env.FIXTURE_MODE === 'invalid-revision' && url.pathname.endsWith('/deploy-revision.txt')) body = 'not a revision';
  let cache = 'max-age=300';
  if (/\.(?:js|mjs|css)$/.test(url.pathname) && /^[a-zA-Z0-9_-]+$/.test(url.searchParams.get('v') || '')) cache = 'public, max-age=31536000, immutable';
  else if (/\.(?:js|mjs)$/.test(url.pathname)) cache = 'public, max-age=300, must-revalidate';
  else if (url.pathname.endsWith('.css')) cache = 'max-age=604800';
  if (url.pathname === '/sw.js' || url.pathname === '/blog/articles.json' || url.pathname === '/blog/article-search-index.json') cache = 'public, max-age=300, must-revalidate';
  if (url.pathname === '/manifest.json') cache = 'public, max-age=86400';
  if (url.pathname === '/feed.xml' || url.pathname === '/atom.xml') cache = 'public, max-age=1800';
  if (marker) cache = 'no-store, no-cache, must-revalidate, max-age=0';
  const csp = ["default-src 'self'", "script-src-attr 'none'", "style-src 'self'", "font-src 'self'",
    "worker-src 'self'", "manifest-src 'self'", "media-src 'self'", "object-src 'none'", "base-uri 'self'",
    "form-action 'self'", "frame-ancestors 'self'", 'upgrade-insecure-requests'].join('; ');
  return new Response(body, { status, headers: {
    'cache-control': cache, 'strict-transport-security': 'max-age=31536000; includeSubDomains',
    'x-content-type-options': 'nosniff', 'x-frame-options': 'SAMEORIGIN',
    'referrer-policy': 'strict-origin-when-cross-origin', 'x-xss-protection': '0',
    'x-permitted-cross-domain-policies': 'none',
    'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'content-security-policy': csp
  } });
};
`);
  const result = spawnSync(process.execPath, ['--require', preload, '.github/scripts/security-health-check.cjs'], {
    cwd: root, encoding: 'utf8', timeout: 10000,
    env: { PATH: process.env.PATH || '', RUNNER_TEMP: directory, FIXTURE_PUBLIC_ROOT: publicRoot,
      FIXTURE_MODE: mode, EXPECTED_DEPLOY_REVISION: expectedRevision }
  });
  assert.ifError(result.error);
  return { ...result, directory, requests: JSON.parse(fs.readFileSync(path.join(directory, 'requests.json'), 'utf8')) };
}

for (const expectedRevision of ['', revision]) {
  test(`本番security CLIは実marker生成先を検査し誤った直下URLを使わない（期待SHA${expectedRevision ? '指定' : '自動取得'}）`, t => {
    const result = runSecurity(t, { expectedRevision });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const report = JSON.parse(fs.readFileSync(path.join(result.directory, 'playpoint-ci-evidence', `http-cache-${revision}.json`), 'utf8'));
    assert.equal(report.passed, true);
    assert.equal(report.beforeRevision, revision); assert.equal(report.afterRevision, revision);
    for (const marker of ['deploy-status.json', 'deploy-revision.txt']) {
      assert.ok(result.requests.includes('/status/' + marker));
      assert.ok(!result.requests.includes('/' + marker));
    }
    assert.ok(report.observations.filter(item => item.path.startsWith('/status/')).every(item => item.passed && item.policy === 'revision'));
  });
}

test('本番security CLIは200以外・不正markerを失敗にし、SHAらしい404本文も受理しない', t => {
  for (const [mode, message] of [['marker-404', /\/status\/deploy-revision\.txt: HTTP 404/], ['invalid-revision', /Cache verification revision is invalid/]]) {
    const result = runSecurity(t, { mode });
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, message);
    assert.doesNotMatch(result.stdout, /Production security health check passed/);
  }
});

test('本番security CLIは指定SHAとの差異を失敗reportに保存し、公開確定へ進ませない', t => {
  const expectedRevision = 'b'.repeat(40);
  const result = runSecurity(t, { expectedRevision });
  assert.equal(result.status, 1);
  const report = JSON.parse(fs.readFileSync(path.join(result.directory, 'playpoint-ci-evidence', `http-cache-${expectedRevision}.json`), 'utf8'));
  assert.equal(report.passed, false);
  assert.match(report.error, /revision changed or differs/);
});
