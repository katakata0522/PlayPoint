'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  dependencyClosure,
  localDependencies,
  normalizeManualLocaleOwner,
  publicIndexAliases
} = require('../scripts/navigation-provenance-baseline.cjs');

test('public URL index treats directory URL and explicit index.html as the same deployed page', () => {
  const index = publicIndexAliases([
    'index.html',
    'en/index.html',
    'games/fgo/pity-cost/index.html'
  ]);
  assert.equal(index.get('/'), 'index.html');
  assert.equal(index.get('/index.html'), 'index.html');
  assert.equal(index.get('/en/'), 'en/index.html');
  assert.equal(index.get('/en'), 'en/index.html');
  assert.equal(index.get('/en/index.html'), 'en/index.html');
  assert.equal(index.get('/games/fgo/pity-cost/'), 'games/fgo/pity-cost/index.html');
  assert.equal(index.get('/games/fgo/pity-cost/index.html'), 'games/fgo/pity-cost/index.html');
});

test('localized manual LP directories receive an explicit provenance owner', () => {
  for (const file of [
    'en/points-cost/index.html',
    'ko/maintenance/diamond/index.html',
    'tw/status/gold/index.html'
  ]) {
    assert.equal(normalizeManualLocaleOwner({ file, primaryOwner: null }), 'tracked-locale-manual-lp');
  }
  assert.equal(normalizeManualLocaleOwner({ file: 'mystery/page.html', primaryOwner: null }), null);
  assert.equal(normalizeManualLocaleOwner({ file: 'en/index.html', primaryOwner: 'locale-home-generator' }), 'locale-home-generator');
});

test('dependency graph follows only local JS/CJS/MJS dependencies and terminates cycles', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pp-nav-source-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(root, 'scripts', 'a.cjs'), "require('./b.cjs'); require('node:fs');\n");
  fs.writeFileSync(path.join(root, 'scripts', 'b.cjs'), "const a = require('./a.cjs'); require('./c');\n");
  fs.writeFileSync(path.join(root, 'scripts', 'c.js'), "module.exports = {};\n");

  assert.deepEqual(localDependencies(root, 'scripts/a.cjs'), ['scripts/b.cjs']);
  assert.deepEqual(dependencyClosure(root, ['scripts/a.cjs']), [
    'scripts/a.cjs',
    'scripts/b.cjs',
    'scripts/c.js'
  ]);
});
