const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'deploy.yml'), 'utf8');

const getStepBlock = stepName => {
  const marker = `- name: ${stepName}`;
  const start = workflow.indexOf(marker);
  assert.ok(start >= 0, `${stepName} must exist`);
  const nextStep = workflow.indexOf('\n      - name: ', start + marker.length);
  return workflow.slice(start, nextStep >= 0 ? nextStep : workflow.length);
};

test('rollback snapshotのSHAを本番変更前に検証してstep outputへ固定する', () => {
  assert.match(workflow, /- name: Verify rollback snapshot before production mutation\n\s+id: rollback-snapshot/);
  assert.match(workflow, /deploy-rsync\.sh --verify-snapshot/);
  assert.match(workflow, /ROLLBACK_SNAPSHOT_REVISION=\\\(\[0-9a-f\]\\\{40\\\}\\\)/);
  assert.match(workflow, /Rollback snapshot did not return one valid revision/);
  assert.match(workflow, /echo "revision=\$revision" >> "\$GITHUB_OUTPUT"/);

  const snapshotVerifyIndex = workflow.indexOf('- name: Verify rollback snapshot before production mutation');
  const mirrorIndex = workflow.indexOf('- name: Deploy strict public mirror via rsync');
  assert.ok(snapshotVerifyIndex >= 0 && mirrorIndex > snapshotVerifyIndex, 'snapshot SHA must be fixed before production mutation');
});

test('自動rollbackは本番mutationまたはcritical検証の失敗だけで発火する', () => {
  const criticalSteps = [
    ['Deploy strict public mirror via rsync', 'production-mirror'],
    ['Verify production deployment', 'production-http'],
    ['Verify production SEO health', 'production-seo'],
    ['Verify production sitemap registry', 'production-sitemap'],
    ['Verify production security headers', 'production-security'],
    ['Verify production in Chromium before verified status', 'production-browser'],
    ['Publish verified deployment status', 'publish-verified'],
  ];

  for (const [stepName, id] of criticalSteps) {
    assert.match(getStepBlock(stepName), new RegExp(`id: ${id}`), `${stepName} must expose ${id}`);
  }

  const autoRollbackStart = workflow.indexOf('- name: Auto-rollback failed production mutation');
  const mirrorStart = workflow.indexOf('- name: Deploy strict public mirror via rsync');
  const publishStart = workflow.indexOf('- name: Publish verified deployment status');
  assert.ok(autoRollbackStart > mirrorStart, 'auto rollback must be placed after production mutation');
  assert.ok(autoRollbackStart > publishStart, 'auto rollback must also catch verified-status publication failure');

  const rollbackSlice = getStepBlock('Auto-rollback failed production mutation');
  assert.ok(rollbackSlice.includes('failure()'), 'auto rollback must require an existing job failure');
  assert.ok(rollbackSlice.includes("steps.rollback-snapshot.outputs.revision != ''"), 'auto rollback requires a verified snapshot SHA');
  for (const [, id] of criticalSteps) {
    assert.ok(
      rollbackSlice.includes(`steps.${id}.outcome == 'failure'`),
      `auto rollback must explicitly recognize ${id} failure`
    );
  }
  assert.ok(!rollbackSlice.includes("outcome == 'skipped'"), 'pre-mutation/skipped work must not trigger rollback');
  assert.ok(!rollbackSlice.includes("outcome == 'success'"), 'successful production work alone must not trigger rollback');
});

test('本番ブラウザ証跡の保存失敗はrelease判定とrollback条件へ混ぜない', () => {
  const evidenceBlock = getStepBlock('Upload production browser evidence');
  const rollbackBlock = getStepBlock('Auto-rollback failed production mutation');

  assert.match(evidenceBlock, /continue-on-error:\s*true/);
  assert.match(evidenceBlock, /actions\/upload-artifact@/);
  assert.doesNotMatch(rollbackBlock, /browser evidence|upload-artifact|artifact/i);
});

test('自動rollbackは検証済みsnapshot SHAをrestoreへ完全一致で渡す', () => {
  assert.match(workflow, /EXPECTED_ROLLBACK_REVISION: \$\{\{ steps\.rollback-snapshot\.outputs\.revision \}\}/);
  assert.match(workflow, /run: bash \.github\/scripts\/deploy-rsync\.sh --restore-verified-snapshot/);
  assert.doesNotMatch(workflow, /EXPECTED_ROLLBACK_REVISION: \$\{\{ github\.sha \}\}/);
});

test('失敗したreleaseをrollback成功で成功扱いにしない', () => {
  const rollbackBlock = getStepBlock('Auto-rollback failed production mutation');
  assert.doesNotMatch(rollbackBlock, /continue-on-error:\s*true/);
  assert.match(rollbackBlock, /if: \$\{\{ failure\(\)/);

  const recoverySlice = workflow.slice(workflow.indexOf('- name: Checkout auto-rollback revision'));
  assert.match(recoverySlice, /if: \$\{\{ failure\(\)/);
});

test('復元後はsnapshot revision自身の検証コードでHTTPからChromiumまで確認する', () => {
  assert.match(workflow, /Checkout auto-rollback revision for matching verification logic/);
  assert.match(workflow, /ref: \$\{\{ steps\.rollback-snapshot\.outputs\.revision \}\}/);
  assert.match(workflow, /path: auto-rollback-verifier/);
  assert.match(workflow, /working-directory: auto-rollback-verifier/);
  assert.match(workflow, /EXPECTED_DEPLOY_REVISION: \$\{\{ steps\.rollback-snapshot\.outputs\.revision \}\}/);
  assert.match(workflow, /EXPECTED_DEPLOY_STATUS: verified/);

  for (const verifier of [
    'smoke-test.cjs',
    'verify-deploy-status.cjs',
    'seo-health-check.cjs',
    'sitemap-health-check.cjs',
    'security-health-check.cjs',
    'browser-smoke.cjs',
    'article-css-smoke.cjs',
    'article-design-smoke.cjs',
    'mobile-region-layout-smoke.cjs',
    'browser-revenue-smoke.cjs',
    'embed-widget-smoke.cjs',
  ]) {
    assert.ok(workflow.includes(verifier), `auto rollback verification is missing: ${verifier}`);
  }

  assert.match(workflow, /SMOKE_BASE_URL: https:\/\/playpoint-sim\.com\//);
  assert.match(workflow, /name: auto-rollback-browser-\$\{\{ github\.run_id \}\}/);
});

test('手動rollback workflowだけの変更は通常Deployを起動しない', () => {
  assert.match(workflow, /- '\.github\/workflows\/rollback\.yml'/);
});

test('SSH material cleanupは自動rollbackレーンより後でもalwaysで実行する', () => {
  const rollbackEvidenceIndex = workflow.indexOf('- name: Upload auto-rollback browser evidence');
  const cleanupIndex = workflow.indexOf('- name: Remove SSH material');
  assert.ok(cleanupIndex > rollbackEvidenceIndex, 'SSH cleanup must remain the final recovery boundary');
  assert.match(workflow.slice(cleanupIndex), /if: always\(\)/);
  assert.match(workflow.slice(cleanupIndex), /rm -f ~\/\.ssh\/id_ed25519 ~\/\.ssh\/known_hosts/);
});