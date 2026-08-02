'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const ogpHtaccess = fs.readFileSync(path.join(root, 'articles', 'ogp', '.htaccess'), 'utf8');
const seoHealth = fs.readFileSync(path.join(root, '.github', 'scripts', 'seo-health-check.cjs'), 'utf8');

test('JPEG実体の既存OGP URLをimage/jpegとして配信する', () => {
  assert.match(ogpHtaccess, /<FilesMatch "\\\.png\$">/);
  assert.match(ogpHtaccess, /ForceType image\/jpeg/);
});

test('デプロイ後のSEO検査は実際のOGP Content-Typeを確認する', () => {
  assert.match(seoHealth, /REPRESENTATIVE_OGP_URL/);
  assert.match(seoHealth, /response\.headers\.get\('content-type'\)/);
  assert.match(seoHealth, /\^image\\\/jpeg/);
  assert.match(seoHealth, /await retry\(checkOgpMime/);
});
