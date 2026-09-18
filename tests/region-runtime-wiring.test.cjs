'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { APP_MODULE_FILES } = require('../scripts/asset-sync.cjs');
const { runEsmProbe, ORIGIN } = require('./helpers/runtime-esm.cjs');
const { createRuntime } = require('./helpers/service-worker-runtime.cjs');

const rootDir = path.resolve(__dirname, '..');

test('expanded-region runtime stays on the active ESM graph and install precache', async () => {
  const graph = runEsmProbe({ kind: 'graph' });
  const byPath = new Map(graph.map(item => [new URL(item.url).pathname, item]));
  const importPaths = pathname => new Set((byPath.get(pathname)?.imports || []).map(url => new URL(url).pathname));

  assert.ok(byPath.has('/js/region-navigation.js'));
  assert.ok(byPath.has('/js/region-expansion-config.js'));
  assert.ok(byPath.has('/js/result-navigation-config.js'));

  assert.ok(importPaths('/js/region-navigation.js').has('/js/region-expansion-config.js'));
  assert.ok(importPaths('/js/region-navigation.js').has('/js/result-navigation-config.js'));
  assert.ok(importPaths('/js/calculator.js').has('/js/result-navigation-config.js'));

  for (const file of ['js/region-navigation.js', 'js/region-expansion-config.js', 'js/result-navigation-config.js']) {
    assert.ok(APP_MODULE_FILES.includes(file), `cache revision input missing: ${file}`);
  }
  assert.ok(!APP_MODULE_FILES.includes('js/region-result-navigation.js'));
  assert.equal(fs.existsSync(path.join(rootDir, 'js/region-result-navigation.js')), false);

  const worker = createRuntime();
  await worker.fireInstall();
  const precache = new Set(
    worker.addAllCalls.flat().map(item => new URL(item.url, `${ORIGIN}/`).pathname)
  );
  assert.ok(precache.has('/hk/'), 'Hong Kong top page is missing from install precache');
  assert.ok(precache.has('/in/'), 'India top page is missing from install precache');
});
