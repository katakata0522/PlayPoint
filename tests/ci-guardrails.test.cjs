'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n?/g, '\n');

const getStepBlock = (workflow, stepName) => {
  const marker = `- name: ${stepName}`;
  const start = workflow.indexOf(marker);
  assert.ok(start >= 0, `${stepName} must exist`);
  const nextStep = workflow.indexOf('\n      - name: ', start + marker.length);
  return workflow.slice(start, nextStep >= 0 ? nextStep : workflow.length);
};

test('必須PR GateがローカルChromium検証を所有し、Standalone Browser Smokeは手動専用にする', () => {
  const qualityWorkflow = read('.github/workflows/quality-check.yml');
  const browserWorkflow = read('.github/workflows/browser-smoke.yml');

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
  assert.match(qualityWorkflow, /playwright-core@1\.55\.0/);
  assert.match(qualityWorkflow, /browser-smoke-artifacts\//);
  assert.doesNotMatch(browserWorkflow, /^\s*pull_request:\s*$/m);
  assert.match(browserWorkflow, /workflow_dispatch:/);
  assert.doesNotMatch(browserWorkflow, /workflow_run:/);
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

test('preflightは本番同期前に鮮度・記事正規化・全送信URL Headを検証する', () => {
  const preflight = read('.github/scripts/preflight.cjs');
  const freshCommand = "['scripts/latest-hub-audit.cjs', '--fresh']";
  const navigationCheck = "['scripts/article-content-navigation-normalize.cjs', '--check']";
  const seoCheck = "['scripts/article-seo-normalize.cjs', '--check']";
  const headAudit = "['scripts/seo-head-audit.cjs']";

  assert.ok(preflight.includes(freshCommand), 'latest hub freshness check is missing');
  assert.ok(preflight.includes(navigationCheck), 'article navigation check-only phase is missing');
  assert.ok(preflight.includes(seoCheck), 'article SEO check-only phase is missing');
  assert.ok(preflight.includes(headAudit), 'submitted URL head audit is missing');
  assert.ok(
    !preflight.includes("['scripts/article-content-navigation-normalize.cjs']"),
    'preflight must not rewrite article navigation'
  );
  assert.ok(
    !preflight.includes("['scripts/article-seo-normalize.cjs']"),
    'preflight must not rewrite article SEO'
  );

  const freshIndex = preflight.indexOf(freshCommand);
  const navigationIndex = preflight.indexOf(navigationCheck);
  const seoIndex = preflight.indexOf(seoCheck);
  const headAuditIndex = preflight.indexOf(headAudit);
  const minifyIndex = preflight.indexOf("['.github/scripts/minify.cjs']");

  assert.ok(minifyIndex >= 0, 'minify phase is missing');
  assert.ok(freshIndex < minifyIndex, 'latest hub freshness must be checked before deploy preparation');
  assert.ok(navigationIndex < minifyIndex, 'article navigation must be checked before deploy preparation');
  assert.ok(seoIndex < minifyIndex, 'article SEO must be checked before deploy preparation');
  assert.ok(headAuditIndex < minifyIndex, 'submitted URL head audit must run before deploy preparation');
});

test('Deployはproduction Chromiumをverified前に所有し、ブラウザ準備失敗では本番を触らない', () => {
  const deployWorkflow = read('.github/workflows/deploy.yml');
  const browserWorkflow = read('.github/workflows/browser-smoke.yml');

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
  assert.match(deployWorkflow, /playwright-core@1\.55\.0/);
  assert.match(deployWorkflow, /SMOKE_BASE_URL: https:\/\/playpoint-sim\.com\//);
  assert.doesNotMatch(browserWorkflow, /workflow_run:/);
});

test('検証専用workflowの変更だけでは本番Deployを起動しない', () => {
  const workflow = read('.github/workflows/deploy.yml');

  for (const path of [
    '.github/workflows/browser-smoke.yml',
    '.github/workflows/mobile-performance.yml',
    '.github/workflows/quality-check.yml',
    '.github/workflows/seo-healthcheck.yml'
  ]) {
    assert.ok(workflow.includes(`- '${path}'`), `${path} must be ignored by Deploy`);
  }
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

  assert.ok(mirrorIndex < browserIndex && browserIndex < publishIndex && publishIndex < rollbackIndex);
  assert.match(getStepBlock(workflow, 'Verify production in Chromium before verified status'), /id: production-browser/);
  assert.match(
    getStepBlock(workflow, 'Auto-rollback failed production mutation'),
    /failure\(\).*steps\.production-mirror\.outcome == 'success'.*steps\.production-mirror\.outcome == 'failure'/s
  );
  assert.match(workflow, /name: Upload production browser evidence/);
});

test('Standalone Browser Smokeはlocal・productionの手動再確認だけを提供する', () => {
  const workflow = read('.github/workflows/browser-smoke.yml');

  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /- local/);
  assert.match(workflow, /- production/);
  assert.doesNotMatch(workflow, /workflow_run:/);
  assert.doesNotMatch(workflow, /Detect whether production browser smoke is needed/);
  assert.doesNotMatch(workflow, /detect-deploy-impact\.cjs/);
  assert.match(workflow, /if: inputs\.target == 'local'/);
  assert.match(workflow, /if: inputs\.target == 'production'/);
});
