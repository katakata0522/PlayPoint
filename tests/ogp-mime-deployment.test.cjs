'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const ogpHtaccess = fs.readFileSync(path.join(root, 'articles', 'ogp', '.htaccess'), 'utf8');

test('JPEG実体の既存OGP URLをimage/jpegとして配信する', () => {
  assert.match(ogpHtaccess, /<FilesMatch "\\\.png\$">/);
  assert.match(ogpHtaccess, /ForceType image\/jpeg/);
});

test('デプロイ後のSEO検査は実際のOGP Content-Typeを確認する', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pp-ogp-cli-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const preload = path.join(directory, 'offline-fetch.cjs');
  fs.writeFileSync(preload, String.raw`
const fs = require('node:fs'), path = require('node:path');
global.fetch = async input => {
  const url = new URL(input);
  if (url.origin !== 'https://playpoint-sim.com') throw new Error('Unexpected fixture origin');
  const relative = url.pathname.replace(/^\//, '') + (url.pathname.endsWith('/') ? 'index.html' : '');
  const file = path.join(process.env.FIXTURE_ROOT, relative);
  const exists = fs.existsSync(file) && fs.statSync(file).isFile();
  const ogp = url.pathname === '/articles/ogp/weekly-reward.png';
  const status = ogp && process.env.FIXTURE_MODE === '404' ? 404 : exists ? 200 : 404;
  const type = ogp ? process.env.FIXTURE_MODE === 'bad-type' ? 'image/png' : 'image/jpeg; fixture=1' : 'text/html';
  return new Response(exists ? fs.readFileSync(file) : 'missing', { status, headers: { 'content-type': type } });
};`);
  const run = mode => spawnSync(process.execPath, ['--require', preload, '.github/scripts/seo-health-check.cjs'], {
    cwd: root, encoding: 'utf8', timeout: 15000,
    env: { PATH: process.env.PATH || '', FIXTURE_ROOT: root, FIXTURE_MODE: mode }
  });
  const good = run('good');
  assert.equal(good.status, 0, good.stdout + good.stderr);
  assert.match(good.stdout, /ok - OGP MIME/);
  for (const [mode, pattern] of [['bad-type', /expected image\/jpeg/], ['404', /weekly-reward\.png: HTTP 404/]]) {
    const broken = run(mode);
    assert.equal(broken.status, 1, broken.stdout + broken.stderr);
    assert.match(broken.stderr, pattern);
    assert.doesNotMatch(broken.stdout, /SEO health check passed/);
  }
});
