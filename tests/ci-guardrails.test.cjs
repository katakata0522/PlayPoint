'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { runPreflight } = require('./helpers/preflight-fixture.cjs');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n?/g, '\n');

const getStepBlock = (workflow, stepName) => {
  const marker = `- name: ${stepName}`;
  const start = workflow.indexOf(marker);
  assert.ok(start >= 0, `${stepName} must exist`);
  const nextStep = workflow.indexOf('\n      - name: ', start + marker.length);
  return workflow.slice(start, nextStep >= 0 ? nextStep : workflow.length);
};

test('必須PR GateがローカルChromium検証を所有し、Standalone Browser SmokeをActions登録しない', () => {
  const qualityWorkflow = read('.github/workflows/quality-check.yml');
  const archivedBrowserRecipe = read('.github/manual-workflows/browser-smoke.yml');

  for (const script of [
    'browser-smoke.cjs',
    'article-css-smoke.cjs',
    'article-design-smoke.cjs',
    'mobile-region-layout-smoke.cjs',
    'browser-revenue-smoke.cjs',
    'embed-widget-smoke.cjs'
  ]) {
    assert.ok(qualityWorkflow.includes(`node .github/scripts/${script}`), `PR Gate missing ${script}`);
  }
  assert.match(qualityWorkflow, /name: Install required browser driver/);
  assert.match(qualityWorkflow, /bash \.github\/scripts\/setup-browser-runtime\.sh/);
  assert.match(qualityWorkflow, /browser-smoke-artifacts\//);
  assert.equal(fs.existsSync(path.join(root, '.github/workflows/browser-smoke.yml')), false);
  assert.match(archivedBrowserRecipe, /workflow_dispatch:/);
  assert.doesNotMatch(archivedBrowserRecipe, /^\s*pull_request:\s*$/m);
  assert.doesNotMatch(archivedBrowserRecipe, /^\s*push:\s*$/m);
  assert.doesNotMatch(archivedBrowserRecipe, /workflow_run:/);
});

test('PR Gateは失敗を隠さない検査専用ゲートで、Deployだけが配信用アセットを保持する', () => {
  const qualityWorkflow = read('.github/workflows/quality-check.yml');
  const deployWorkflow = read('.github/workflows/deploy.yml');

  assert.match(qualityWorkflow, /shell: bash/);
  assert.match(qualityWorkflow, /set -euo pipefail/);
  assert.match(qualityWorkflow, /^\s+node \.github\/scripts\/preflight\.cjs 2>&1 \| tee "\$RUNNER_TEMP\/playpoint-preflight\.log"\s*$/m);
  assert.doesNotMatch(qualityWorkflow, /continue-on-error|\|\|\s*true/);
  assert.match(qualityWorkflow, /if: always\(\)/);
  assert.match(qualityWorkflow, /retention-days: 7/);
  assert.match(qualityWorkflow, /timeout-minutes: 15/);
  assert.doesNotMatch(qualityWorkflow, /preflight\.cjs --prepare-deploy/);
  assert.match(deployWorkflow, /preflight\.cjs --prepare-deploy/);
});

test('Deployは本番非公開のtests・docs・tools変更だけでは起動しない', () => {
  const workflow = read('.github/workflows/deploy.yml');
  assert.match(workflow, /- 'tests\/\*\*'/);
  assert.match(workflow, /- 'docs\/\*\*'/);
  assert.match(workflow, /- 'tools\/\*\*'/);
  assert.match(workflow, /- 'scripts\/ai-sync-preflight\.cjs'/);
});

test('AI同期プリフライト本体は非公開toolsに置き、公開ミラーから除外する', () => {
  const wrapper = read('scripts/ai-sync-preflight.cjs');
  const deployScript = read('.github/scripts/deploy-rsync.sh');

  assert.match(wrapper, /require\('\.\.\/tools\/ai-sync-preflight\.cjs'\)/);
  assert.ok(fs.existsSync(path.join(root, 'tools/ai-sync-preflight.cjs')));
  assert.match(deployScript, /--exclude '\/tools\/\*\*\*'/);
});

test('preflightは本番同期前に鮮度・記事正規化・全送信URL Headを検証する', t => {
  const result = runPreflight(t);
  assert.equal(result.exitCode, 0);
  const commands = result.calls.map(call => call.args);
  const minify = commands.findIndex(args => args[0] === '.github/scripts/minify.cjs');
  assert.ok(minify >= 0);
  for (const expected of [
    ['scripts/latest-hub-audit.cjs', '--fresh'],
    ['scripts/article-content-navigation-normalize.cjs', '--check'],
    ['scripts/article-seo-normalize.cjs', '--check'],
    ['scripts/seo-head-audit.cjs']
  ]) {
    const index = commands.findIndex(args => args[0] === expected[0]);
    assert.ok(index >= 0 && index < minify, expected[0]);
    assert.deepEqual(commands[index], expected, '書換えではなく指定の検査モードを実行する');
  }
});

test('Deployはproduction Chromiumをverified前に所有し、ブラウザ準備失敗では本番を触らない', () => {
  const deployWorkflow = read('.github/workflows/deploy.yml');

  const installIndex = deployWorkflow.indexOf('- name: Install production browser verifier');
  const mirrorIndex = deployWorkflow.indexOf('- name: Deploy strict public mirror via rsync');
  const securityIndex = deployWorkflow.indexOf('- name: Verify production security headers');
  const browserIndex = deployWorkflow.indexOf('- name: Verify production in Chromium before verified status');
  const publishIndex = deployWorkflow.indexOf('- name: Publish verified deployment status');

  assert.ok(installIndex >= 0, 'production browser verifier setup is missing');
  assert.ok(mirrorIndex >= 0, 'production mirror is missing');
  assert.ok(securityIndex >= 0, 'production security verification is missing');
  assert.ok(browserIndex >= 0, 'production Chromium verification is missing');
  assert.ok(publishIndex >= 0, 'verified status publication is missing');
  assert.ok(installIndex < mirrorIndex, 'browser dependencies must be ready before production mutation');
  assert.ok(mirrorIndex < securityIndex, 'HTTP/security checks must follow production mutation');
  assert.ok(securityIndex < browserIndex, 'Chromium must run after basic live health checks');
  assert.ok(browserIndex < publishIndex, 'verified status must wait for production Chromium');
  assert.match(getStepBlock(deployWorkflow, 'Install production browser verifier'), /bash \.github\/scripts\/setup-browser-runtime\.sh/);
  assert.match(deployWorkflow, /SMOKE_BASE_URL: https:\/\/playpoint-sim\.com\//);
});

test('検証・復旧専用workflowの変更だけでは本番Deployを起動しない', () => {
  const workflow = read('.github/workflows/deploy.yml');

  for (const workflowPath of [
    '.github/workflows/browser-smoke.yml',
    '.github/workflows/mobile-performance.yml',
    '.github/workflows/quality-check.yml',
    '.github/workflows/seo-healthcheck.yml',
    '.github/workflows/rollback.yml',
    '.github/workflows/deploy-recovery-watchdog.yml'
  ]) {
    assert.ok(workflow.includes(`- '${workflowPath}'`), `${workflowPath} must be ignored by Deploy push trigger`);
  }
  assert.equal(fs.existsSync(path.join(root, '.github/workflows/snapshot-history.yml')), false);
});

test('Deployは変更影響を判定して本番処理を一括でゲートする', () => {
  const workflow = read('.github/workflows/deploy.yml');

  assert.match(workflow, /name: Detect production deploy impact/);
  assert.match(workflow, /node \.github\/scripts\/detect-deploy-impact\.cjs/);
  assert.match(workflow, /fetch-depth: 2/);
  assert.match(workflow, /git diff --name-only --no-renames/);

  for (const stepName of [
    'Run complete preflight and prepare deploy assets',
    'Create deploying status marker',
    'Install production browser verifier',
    'Setup SSH',
    'Deploy strict public mirror via rsync',
    'Verify production deployment',
    'Verify production SEO health',
    'Verify production in Chromium before verified status',
    'Publish verified deployment status',
  ]) {
    const block = getStepBlock(workflow, stepName);
    assert.match(
      block,
      /^\s+if: steps\.deploy-impact\.outputs\.deploy_needed == 'true'\s*$/m,
      `${stepName} must be gated by deploy impact`
    );
  }
});

test('本番Chromium失敗はverified前かつproduction mutation後なので自動rollback対象になる', () => {
  const workflow = read('.github/workflows/deploy.yml');
  const mirrorIndex = workflow.indexOf('- name: Deploy strict public mirror via rsync');
  const browserIndex = workflow.indexOf('- name: Verify production in Chromium before verified status');
  const publishIndex = workflow.indexOf('- name: Publish verified deployment status');
  const rollbackIndex = workflow.indexOf('- name: Auto-rollback failed production mutation');

  assert.ok([mirrorIndex, browserIndex, publishIndex, rollbackIndex].every(index => index >= 0), '復旧対象の実行工程が欠落している');
  assert.ok(mirrorIndex < browserIndex && browserIndex < publishIndex && publishIndex < rollbackIndex);
  assert.match(getStepBlock(workflow, 'Verify production in Chromium before verified status'), /id: production-browser/);

  const rollbackBlock = getStepBlock(workflow, 'Auto-rollback failed production mutation');
  assert.match(rollbackBlock, /failure\(\)/);
  assert.match(rollbackBlock, /steps\.production-mirror\.outcome == 'failure'/);
  assert.match(rollbackBlock, /steps\.production-browser\.outcome == 'failure'/);
  assert.match(rollbackBlock, /steps\.publish-verified\.outcome == 'failure'/);
  assert.doesNotMatch(rollbackBlock, /steps\.production-mirror\.outcome == 'success'/);
  assert.match(workflow, /name: Upload production browser evidence/);
});

test('退避したBrowser Smokeレシピはlocal・productionの手動再確認手順を保持する', () => {
  const workflow = read('.github/manual-workflows/browser-smoke.yml');

  assert.equal(fs.existsSync(path.join(root, '.github/workflows/browser-smoke.yml')), false);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /- local/);
  assert.match(workflow, /- production/);
  assert.doesNotMatch(workflow, /workflow_run:/);
  assert.doesNotMatch(workflow, /^\s*push:\s*$/m);
  assert.doesNotMatch(workflow, /Detect whether production browser smoke is needed/);
  assert.doesNotMatch(workflow, /detect-deploy-impact\.cjs/);
  assert.match(workflow, /if: inputs\.target == 'local'/);
  assert.match(workflow, /if: inputs\.target == 'production'/);
});
