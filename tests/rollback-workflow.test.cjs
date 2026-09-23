const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const deployWorkflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'deploy.yml'), 'utf8').replace(/\r\n/g, '\n');
const rollbackWorkflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'rollback.yml'), 'utf8').replace(/\r\n/g, '\n');
const deployScript = fs.readFileSync(path.join(root, '.github', 'scripts', 'deploy-rsync.sh'), 'utf8');

test('通常Deployは本番を書き換える前に保存snapshotを再検証する', () => {
  const snapshotIndex = deployWorkflow.indexOf('- name: Snapshot current verified production');
  const verifyIndex = deployWorkflow.indexOf('- name: Verify rollback snapshot before production mutation');
  const deployIndex = deployWorkflow.indexOf('- name: Deploy strict public mirror via rsync');

  assert.ok(snapshotIndex >= 0, 'snapshot step missing');
  assert.ok(verifyIndex > snapshotIndex, 'saved snapshot must be verified after creation');
  assert.ok(deployIndex > verifyIndex, 'production mutation must start only after snapshot verification');
  assert.match(deployWorkflow, /deploy-rsync\.sh --verify-snapshot/);
});

test('rollback workflowは手動・main限定でDeployと同じ排他ロックを使う', () => {
  assert.match(rollbackWorkflow, /^name: Rollback verified production/m);
  assert.match(rollbackWorkflow, /on:\n  workflow_dispatch:/);
  assert.doesNotMatch(rollbackWorkflow, /\n  push:/);
  assert.doesNotMatch(rollbackWorkflow, /\n  pull_request:/);
  assert.match(rollbackWorkflow, /group: deploy-playpoint-main/);
  assert.match(rollbackWorkflow, /if: github\.ref == 'refs\/heads\/main'/);
  assert.match(rollbackWorkflow, /permissions:\n  contents: read/);
});

test('restoreはsnapshot SHAの明示一致なしでは実行できない', () => {
  assert.match(rollbackWorkflow, /expected_revision:/);
  assert.match(rollbackWorkflow, /Validate explicit rollback confirmation/);
  assert.match(rollbackWorkflow, /\^\[0-9a-f\]\{40\}\$/);
  assert.match(rollbackWorkflow, /EXPECTED_REVISION" != "\$SNAPSHOT_REVISION/);
  assert.match(rollbackWorkflow, /EXPECTED_ROLLBACK_REVISION: \$\{\{ inputs\.expected_revision \}\}/);
  assert.match(deployScript, /EXPECTED_ROLLBACK_REVISION="\$\{EXPECTED_ROLLBACK_REVISION:-\}"/);
  assert.match(deployScript, /EXPECTED_ROLLBACK_REVISION must be an exact lowercase 40-character commit SHA/);
  assert.match(deployScript, /Rollback snapshot changed: expected \$expected_revision but found \$revision/);
});

test('snapshot検証はmetadata・symlink・別所有領域をfail-closedに扱う', () => {
  assert.match(deployScript, /--verify-snapshot\)/);
  assert.match(deployScript, /Rollback snapshot is missing or has an unsafe directory shape/);
  assert.match(deployScript, /find "\$snapshot" -type l -print -quit/);
  assert.match(deployScript, /Rollback snapshot contains a symlink; refusing to trust it/);
  assert.match(deployScript, /for owned_elsewhere in manner kanji-slicer/);
  assert.match(deployScript, /Rollback snapshot contains separately owned path/);
  assert.match(deployScript, /Rollback snapshot revision metadata disagrees/);
  assert.match(deployScript, /ROLLBACK_SNAPSHOT_REVISION=\$revision/);
});

test('restoreは別所有領域を保護し、中断時にverifiedを偽装しない', () => {
  assert.match(deployScript, /--restore-verified-snapshot\)/);
  assert.match(deployScript, /"status":"rolling_back"/);
  assert.match(deployScript, /--filter='protect \/manner\/\*\*\*'/);
  assert.match(deployScript, /--filter='protect \/kanji-slicer\/\*\*\*'/);
  assert.match(deployScript, /rsync -a --delete-after --delay-updates/);
  assert.match(deployScript, /Rollback mirror completed but production verification metadata does not match the snapshot/);
  assert.match(deployScript, /RESTORED_REVISION=\$revision/);
  assert.match(deployScript, /Verifying remote cleanup after rollback/);
});

test('rollback成功後は復元版自身の検証コードでHTTPからChromiumまで確認する', () => {
  assert.match(rollbackWorkflow, /Checkout restored revision for matching verification logic/);
  assert.match(rollbackWorkflow, /ref: \$\{\{ steps\.snapshot\.outputs\.revision \}\}/);
  assert.match(rollbackWorkflow, /working-directory: rollback-verifier/);

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
    assert.ok(rollbackWorkflow.includes(verifier), `rollback verification is missing: ${verifier}`);
  }

  assert.match(rollbackWorkflow, /SMOKE_BASE_URL: https:\/\/playpoint-sim\.com\//);
  assert.match(rollbackWorkflow, /Upload rollback browser evidence/);
  assert.match(rollbackWorkflow, /Remove SSH material/);
  assert.match(rollbackWorkflow, /if: always\(\)/);
  assert.doesNotMatch(rollbackWorkflow, /continue-on-error:\s*true/);
});