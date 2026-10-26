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
  let body = exists ? fs.readFileSync(file) : 'missing';
  const mode = process.env.FIXTURE_MODE;
  const inlineTarget = mode === 'inline-other' ? '/articles/2026-07-24-play-points-cash-conversion.html' : '/articles/2026-10-13-play-fest-deals.html';
  if (mode.startsWith('inline-') && url.pathname === inlineTarget) {
    let scripts = ['js/reading-library.js', 'js/reading-theme.js']
      .filter(file => mode !== 'inline-missing-library' || file !== 'js/reading-library.js')
      .map(file => '<script>' + fs.readFileSync(path.join(process.env.FIXTURE_ROOT, file), 'utf8') + '</script>').join('');
    if (mode !== 'inline-missing-adapter') scripts += '<script>document.addEventListener("DOMContentLoaded", () => { if (!window.PlayPointConsent) return; setupCalculatorLinkTracking(); setupArticleAdsense(); });</script>';
    if (mode === 'inline-spaced-end') scripts = scripts.replaceAll('</script>', '</script >');
    body = String(body).replace(/<script\b[^>]*\bsrc="\.\.\/blog\/article\.js\?v=[^"]+"[^>]*><\/script>/i, () => scripts);
    if (mode === 'inline-json-only') body = body.replace(/<script>/g, '<script type="application/ld+json">');
  }
  return new Response(body, { status, headers: { 'content-type': type } });
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
  for (const mode of ['inline-good', 'inline-spaced-end']) {
    const inline = run(mode);
    assert.equal(inline.status, 0, inline.stdout + inline.stderr);
  }
  for (const mode of ['inline-missing-adapter', 'inline-missing-library', 'inline-json-only', 'inline-other']) {
    const broken = run(mode);
    assert.equal(broken.status, 1, broken.stdout + broken.stderr);
    assert.match(broken.stderr, /shared article script missing/);
  }
});
