'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { INTERNATIONAL_LOCALES } = require('../scripts/locale-ids.cjs');

const root = path.resolve(__dirname, '..');

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(absolute);
    return entry.isFile() && /\.(?:js|cjs|mjs)$/.test(entry.name) ? [absolute] : [];
  });
}

test('production/CI scripts do not redefine the canonical EN/KO/TW locale tuple', () => {
  assert.deepEqual([...INTERNATIONAL_LOCALES], ['en', 'ko', 'tw']);
  const allowed = new Set([path.join(root, 'scripts', 'locale-ids.cjs')]);
  const files = [
    ...walk(path.join(root, 'scripts')),
    ...walk(path.join(root, '.github', 'scripts'))
  ].filter(file => !allowed.has(file));

  const offenders = [];
  const tuple = /\[\s*['"]en['"]\s*,\s*['"]ko['"]\s*,\s*['"]tw['"]\s*\]/g;
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    if (tuple.test(source)) offenders.push(path.relative(root, file).replaceAll('\\', '/'));
    tuple.lastIndex = 0;
  }
  assert.deepEqual(offenders, [], 'canonical international locale tuple was redefined');
});
