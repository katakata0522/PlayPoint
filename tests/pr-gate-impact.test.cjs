'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { classifyPrGateImpact } = require('../.github/scripts/detect-pr-gate-impact.cjs');

test('docs/testsだけの変更はfull preflightを残しつつApache/Chromiumを省略できる', () => {
  const result = classifyPrGateImpact([
    'docs/TEST_TRIAGE.md',
    'tests/example.test.cjs',
    'README.md',
  ]);
  assert.equal(result.browserRequired, false);
  assert.equal(result.apacheRequired, false);
});

test('公開成果物やruntime変更はChromiumを必須にする', () => {
  for (const file of ['index.html', 'style.css', 'js/main.js', 'articles/example.html', 'en/articles/example.html']) {
    assert.equal(classifyPrGateImpact([file]).browserRequired, true, file);
  }
});

test('browser検証基盤自身の変更もChromiumを必須にする', () => {
  for (const file of [
    '.github/workflows/quality-check.yml',
    '.github/scripts/browser-smoke.cjs',
    '.github/scripts/setup-browser-runtime.sh',
    '.github/ci-runtime/package-lock.json',
  ]) {
    assert.equal(classifyPrGateImpact([file]).browserRequired, true, file);
  }
});

test('Apache実HTTPは.htaccess/cache contract変更時だけ必須にする', () => {
  assert.equal(classifyPrGateImpact(['.htaccess']).apacheRequired, true);
  assert.equal(classifyPrGateImpact(['tests/helpers/apache-cache-contract.cjs']).apacheRequired, true);
  assert.equal(classifyPrGateImpact(['.github/scripts/http-cache-contract.cjs']).apacheRequired, true);
  assert.equal(classifyPrGateImpact(['index.html']).apacheRequired, false);
});

test('混在変更は安全側の強い検証へ昇格する', () => {
  const result = classifyPrGateImpact(['docs/note.md', 'tests/example.test.cjs', 'js/main.js']);
  assert.equal(result.browserRequired, true);
  assert.equal(result.apacheRequired, false);
  assert.deepEqual(result.browserPaths, ['js/main.js']);
});
