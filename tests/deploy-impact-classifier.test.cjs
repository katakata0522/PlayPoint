'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  DEPLOYMENT_INPUTS,
  detectDeployImpact,
  isDirectPublicMirrorPath,
  normalizeRepositoryPath,
} = require('../.github/scripts/detect-deploy-impact.cjs');

test('公開ミラーへ実際に入る変更は本番Deploy対象にする', () => {
  for (const filePath of [
    'index.html',
    'style.css',
    'js/main.js',
    'articles/example.html',
    'en/articles/example.html',
    'status/deploy-status.json',
  ]) {
    assert.equal(isDirectPublicMirrorPath(filePath), true, filePath);
    assert.equal(detectDeployImpact([filePath]).deployNeeded, true, filePath);
  }
});

test('品質検査・文書・非公開ツールだけの変更では本番Deployしない', () => {
  const changedPaths = [
    'tests/ci-guardrails.test.cjs',
    'docs/DEPLOY.md',
    'tools/ai-sync-preflight.cjs',
    'scripts/article-design-system-audit.cjs',
    'scripts/article-role-next-action-audit.cjs',
    '.github/scripts/article-css-smoke.cjs',
    '.github/scripts/article-design-smoke.cjs',
    '.github/scripts/browser-smoke.cjs',
    '.github/scripts/mobile-performance-budget.cjs',
    '.github/scripts/seo-health-check.cjs',
    '.github/scripts/verify-deploy-status.cjs',
    '.github/workflows/browser-smoke.yml',
    '.github/workflows/mobile-performance.yml',
    '.github/workflows/quality-check.yml',
    '.github/workflows/seo-healthcheck.yml',
  ];

  const result = detectDeployImpact(changedPaths);
  assert.equal(result.deployNeeded, false);
  assert.deepEqual(result.deploymentPaths, []);
  assert.equal(result.ignoredPaths.length, changedPaths.length);
});

test('配信成果物を実行時に変える非公開ビルド入力はDeploy対象にする', () => {
  for (const filePath of DEPLOYMENT_INPUTS) {
    assert.equal(
      detectDeployImpact([filePath]).deployNeeded,
      true,
      `${filePath} must remain a deploy input`
    );
  }
});

test('品質検査と公開変更が混在する場合は安全側でDeployする', () => {
  const result = detectDeployImpact([
    '.github/scripts/article-css-smoke.cjs',
    'tests/ci-guardrails.test.cjs',
    'articles/2026-08-16-fastest-gold.html',
  ]);
  assert.equal(result.deployNeeded, true);
  assert.deepEqual(result.deploymentPaths.map(({ path }) => path), [
    'articles/2026-08-16-fastest-gold.html',
  ]);
});

test('rsyncで除外するルート管理ファイルはDeploy対象にしない', () => {
  for (const filePath of [
    '.gitignore',
    '.gitattributes',
    'README.md',
    'AGENTS.md',
    'みんな用URL.txt',
    'CNAME',
  ]) {
    assert.equal(isDirectPublicMirrorPath(filePath), false, filePath);
    assert.equal(detectDeployImpact([filePath]).deployNeeded, false, filePath);
  }
});

test('Windows形式と相対パス表記を正規化する', () => {
  assert.equal(normalizeRepositoryPath('.\\articles\\sample.html'), 'articles/sample.html');
  assert.equal(detectDeployImpact(['.\\articles\\sample.html']).deployNeeded, true);
  assert.equal(detectDeployImpact(['.\\tests\\sample.test.cjs']).deployNeeded, false);
});

test('不正な入力は黙って判定しない', () => {
  assert.throws(() => detectDeployImpact('index.html'), /配列/);
  assert.throws(() => detectDeployImpact(['index.html', null]), /文字列/);
});
