'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { runEsmProbe } = require('./helpers/runtime-esm.cjs');

test('保存ガードのcompatibility moduleはfirst-viewへだけUI責務を委譲する', () => {
  const graph = runEsmProbe({ kind: 'graph' });
  const module = graph.find(item => new URL(item.url).pathname === '/js/language-suggestion.js');
  assert.ok(module, 'language-suggestion.js is missing from the active ESM graph');

  const dependencies = new Set(module.imports.map(url => new URL(url).pathname));
  assert.ok(dependencies.has('/js/first-view.js'), 'first-view compatibility export is no longer connected');
  assert.equal(dependencies.has('/js/calculator.js'), false, 'storage guard must not directly depend on calculator runtime');
  assert.equal(dependencies.has('/js/ui.js'), false, 'storage guard must not directly depend on UI runtime');
});
