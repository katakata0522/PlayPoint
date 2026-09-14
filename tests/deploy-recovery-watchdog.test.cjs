'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  MIRROR_STEP_NAME,
  decideRecovery,
  wasProductionMirrorAttempted
} = require('../.github/scripts/recovery-watchdog.cjs');

const root = path.resolve(__dirname, '..');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/deploy-recovery-watchdog.yml'), 'utf8').replace(/\r\n?/g, '\n');
const sha = 'a'.repeat(40);
const otherSha = 'b'.repeat(40);

function jobsPayload({ status = 'completed', conclusion = 'success' } = {}) {
  return {
    jobs: [{
      name: 'deploy',
      steps: [{ name: MIRROR_STEP_NAME, status, conclusion }]
    }]
  };
}

test('元Deployのproduction mirrorが実際に試行された時だけattemptedと判定する', () => {
  assert.equal(wasProductionMirrorAttempted(jobsPayload()), true);
  assert.equal(wasProductionMirrorAttempted(jobsPayload({ conclusion: 'failure' })), true);
  assert.equal(wasProductionMirrorAttempted(jobsPayload({ conclusion: 'cancelled' })), true);
  assert.equal(wasProductionMirrorAttempted(jobsPayload({ conclusion: 'skipped' })), false);
  assert.equal(wasProductionMirrorAttempted({ jobs: [{ name: 'deploy', steps: [] }] }), false);
});

test('pre-mutation失敗・復旧済みverified・別Deploy進行中では外部restoreしない', () => {
  assert.deepEqual(decideRecovery({ sourceConclusion: 'failure', sourceHeadSha: sha, mirrorAttempted: false, live: { kind: 'verified', commit: otherSha } }), { needed: false, reason: 'mirror_not_attempted' });
  assert.deepEqual(decideRecovery({ sourceConclusion: 'cancelled', sourceHeadSha: sha, mirrorAttempted: true, live: { kind: 'verified', commit: sha } }), { needed: false, reason: 'live_verified' });
  assert.deepEqual(decideRecovery({ sourceConclusion: 'failure', sourceHeadSha: sha, mirrorAttempted: true, live: { kind: 'deploying', commit: otherSha } }), { needed: false, reason: 'different_deploy_in_progress' });
});

test('mirror試行後に元SHAがdeploying・unverified・unreachableなら外部restore対象にする', () => {
  for (const live of [
    { kind: 'deploying', commit: sha },
    { kind: 'unverified', commit: sha },
    { kind: 'unreachable', commit: null }
  ]) {
    assert.equal(decideRecovery({ sourceConclusion: 'timed_out', sourceHeadSha: sha, mirrorAttempted: true, live }).needed, true);
  }
});

test('watchdogはDeploy completed/mainだけを監視し、同じ本番排他ロックと最小権限を使う', () => {
  assert.match(workflow, /workflow_run:/);
  assert.match(workflow, /- Deploy to Xserver/);
  assert.match(workflow, /- completed/);
  assert.match(workflow, /branches:\n\s+- main/);
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /actions: read/);
  assert.match(workflow, /group: deploy-playpoint-main/);
  assert.match(workflow, /failure.*cancelled.*timed_out.*action_required.*stale.*startup_failure/);
});

test('watchdogはtrusted mainを制御面にし、元runのmirror試行とlive状態をrestore前に検査する', () => {
  const checkout = workflow.indexOf('- name: Checkout trusted recovery control plane');
  const inspect = workflow.indexOf('- name: Inspect failed deploy and live production');
  const ssh = workflow.indexOf('- name: Setup recovery SSH');
  const restore = workflow.indexOf('- name: Restore previous verified production externally');
  assert.ok(checkout >= 0 && checkout < inspect && inspect < ssh && ssh < restore);
  assert.match(workflow, /ref: main/);
  assert.match(workflow, /SOURCE_RUN_ID: \$\{\{ github\.event\.workflow_run\.id \}\}/);
  assert.match(workflow, /SOURCE_HEAD_SHA: \$\{\{ github\.event\.workflow_run\.head_sha \}\}/);
  assert.match(workflow, /node \.github\/scripts\/recovery-watchdog\.cjs/);
});

test('外部restoreは検証済みsnapshot SHAだけを使い、復元後は旧revision自身で検証する', () => {
  assert.match(workflow, /deploy-rsync\.sh --verify-snapshot/);
  assert.match(workflow, /EXPECTED_ROLLBACK_REVISION: \$\{\{ steps\.snapshot\.outputs\.revision \}\}/);
  assert.match(workflow, /deploy-rsync\.sh --restore-verified-snapshot/);
  assert.match(workflow, /ref: \$\{\{ steps\.snapshot\.outputs\.revision \}\}/);
  assert.match(workflow, /EXPECTED_DEPLOY_REVISION: \$\{\{ steps\.snapshot\.outputs\.revision \}\}/);
  assert.match(workflow, /EXPECTED_DEPLOY_STATUS: verified/);
});

test('外部restoreを先に完了してHTTP検証し、その後だけbrowser依存とChromiumを実行する', () => {
  const restore = workflow.indexOf('- name: Restore previous verified production externally');
  const http = workflow.indexOf('- name: Verify external recovery HTTP, SEO, sitemap, and security');
  const install = workflow.indexOf('- name: Install browser verifier after external restore');
  const chromium = workflow.indexOf('- name: Verify external recovery in Chromium');
  assert.ok(restore >= 0 && restore < http && http < install && install < chromium);
  assert.match(workflow, /playwright-core@1\.55\.0/);
  assert.match(workflow, /SMOKE_BASE_URL: https:\/\/playpoint-sim\.com\//);
  assert.match(workflow, /continue-on-error: true/);
});
