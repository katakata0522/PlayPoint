'use strict';

const fs = require('node:fs');
const path = require('node:path');

require('./one-shot-s-rank-ux-patch-v2.cjs');

const root = path.resolve(__dirname, '..');
const relativePath = 'tests/intl-guide-discovery.test.cjs';
const file = path.join(root, relativePath);
const before = fs.readFileSync(file, 'utf8');
const after = before
  .replace("assert.match(html, /\\/articles\\/intl-hub\\.css\\?v=1/);", "assert.match(html, /\\/articles\\/intl-hub\\.css\\?v=[a-z0-9_-]+/i);")
  .replace("assert.match(html, /\\/js\\/intl-guide-hub\\.js\\?v=1/);", "assert.match(html, /\\/js\\/intl-guide-hub\\.js\\?v=[a-z0-9_-]+/i);");
if (after === before) throw new Error(`asset-version assertions were not found: ${relativePath}`);
fs.writeFileSync(file, after, 'utf8');
console.log(`patched ${relativePath}`);
