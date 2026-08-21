'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

test('PWA manifest does not lock users to a single screen orientation', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  assert.ok(!Object.prototype.hasOwnProperty.call(manifest, 'orientation'), 'manifest orientation lock must remain unset');
});
