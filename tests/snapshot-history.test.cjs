const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const historyScriptPath = path.join(root, '.github', 'scripts', 'snapshot-history.sh');
const historyWorkflowPath = path.join(root, '.github', 'workflows', 'snapshot-history.yml');
const deployWorkflowPath = path.join(root, '.github', 'workflows', 'deploy.yml');
const rollbackWorkflowPath = path.join(root, '.github', 'workflows', 'rollback.yml');
const historyScript = fs.readFileSync(historyScriptPath, 'utf8');
const deployWorkflow = fs.readFileSync(deployWorkflowPath, 'utf8');
const rollbackWorkflow = fs.readFileSync(rollbackWorkflowPath, 'utf8');

test('verified履歴は公開領域外へSHA単位で有限世代だけ保持する', () => {
  assert.match(historyScript, /REMOTE_SNAPSHOT_ROOT="\/home\/hajikkoroom\/playpoint-sim\.com\/\.deploy-snapshots"/);
  const limitMatch = historyScript.match(/^HISTORY_LIMIT=(\d+)$/m);
  assert.ok(limitMatch, 'history retention limit must be explicit');
  const historyLimit = Number(limitMatch[1]);
  assert.ok(Number.isInteger(historyLimit) && historyLimit >= 2 && historyLimit <= 10, `unsafe history retention: ${historyLimit}`);
  assert.match(historyScript, /history_root="\$snapshot_root\/verified-history"/);
  assert.match(historyScript, /final="\$history_root\/\$commit"/);
  assert.match(historyScript, /Archived verified production \$commit in history/);
  assert.match(historyScript, /Pruned verified history snapshot \$name/);
  assert.match(historyScript, /touch "\$final"/);
  assert.match(historyScript, /\$root\/status\/deploy-status\.json/);
  assert.match(historyScript, /Current production is '\$status', not verified/);
});

test('SSH越しに末尾の任意引数が消えてもarchive/listはnounsetで落ちない', () => {
  assert.match(historyScript, /target_revision="\$\{5:-\}"/);
  assert.match(historyScript, /protected_revision="\$\{6:-\}"/);
  assert.doesNotMatch(historyScript, /^target_revision="\$5"$/m);
  assert.doesNotMatch(historyScript, /^protected_revision="\$6"$/m);
});

test('verified履歴はsymlink・別所有領域・metadata不一致をfail-closedにする', () => {
  assert.match(historyScript, /find "\$snapshot" -type l -print -quit/);
  assert.match(historyScript, /Verified history snapshot contains a symlink/);
  assert.match(historyScript, /for owned_elsewhere in manner kanji-slicer/);
  assert.match(historyScript, /Verified history snapshot contains separately owned path/);
  assert.match(historyScript, /Verified history snapshot revision metadata disagrees/);
  assert.match(historyScript, /--exclude '\/manner\/\*\*\*'/);
  assert.match(historyScript, /--exclude '\/kanji-slicer\/\*\*\*'/);
});

test('verified履歴は別runnerを起動せず成功した実DeployのSSHを再利用する', () => {
  assert.equal(fs.existsSync(historyWorkflowPath), false, 'standalone snapshot-history workflow must be removed');
  assert.match(deployWorkflow, /- name: Archive verified production history/);
  assert.match(deployWorkflow, /id: archive_verified_production_history/);
  assert.match(deployWorkflow, /if: steps\.deploy-impact\.outputs\.deploy_needed == 'true' && steps\.publish-verified\.outcome == 'success'/);
  assert.match(deployWorkflow, /continue-on-error: true/);
  assert.match(deployWorkflow, /snapshot-history\.sh --archive-live/);
  assert.match(deployWorkflow, /snapshot-history\.sh --list/);

  const setupSshIndex = deployWorkflow.indexOf('- name: Setup SSH');
  const publishIndex = deployWorkflow.indexOf('- name: Publish verified deployment status');
  const archiveIndex = deployWorkflow.indexOf('- name: Archive verified production history');
  const removeSshIndex = deployWorkflow.indexOf('- name: Remove SSH material');
  assert.ok(setupSshIndex >= 0 && setupSshIndex < publishIndex);
  assert.ok(publishIndex < archiveIndex, 'history must only archive after verified publication');
  assert.ok(archiveIndex < removeSshIndex, 'history must reuse the already prepared SSH session');
});

test('手動rollbackは履歴一覧・明示SHA検証・現本番保全・activateの順で復元する', () => {
  for (const operation of ['list', 'verify', 'restore']) {
    assert.ok(rollbackWorkflow.includes(`          - ${operation}`), `missing rollback operation: ${operation}`);
  }
  assert.match(rollbackWorkflow, /List retained verified snapshots/);
  assert.match(rollbackWorkflow, /snapshot-history\.sh --list/);
  assert.match(rollbackWorkflow, /Verify selected history snapshot/);
  assert.match(rollbackWorkflow, /snapshot-history\.sh --verify "\$SELECTED_REVISION"/);
  assert.match(rollbackWorkflow, /PROTECTED_HISTORY_REVISION: \$\{\{ inputs\.expected_revision \}\}/);
  assert.match(rollbackWorkflow, /snapshot-history\.sh --archive-live/);
  assert.match(rollbackWorkflow, /Activate selected history snapshot as rollback source/);
  assert.match(rollbackWorkflow, /snapshot-history\.sh --activate "\$\{\{ inputs\.expected_revision \}\}"/);
  assert.match(rollbackWorkflow, /deploy-rsync\.sh --verify-snapshot/);
  assert.match(rollbackWorkflow, /deploy-rsync\.sh --restore-verified-snapshot/);

  const verifyIndex = rollbackWorkflow.indexOf('- name: Verify selected history snapshot');
  const preserveIndex = rollbackWorkflow.indexOf('- name: Preserve current verified production in history');
  const activateIndex = rollbackWorkflow.indexOf('- name: Activate selected history snapshot as rollback source');
  const restoreIndex = rollbackWorkflow.indexOf('- name: Restore verified snapshot');
  assert.ok(verifyIndex >= 0 && verifyIndex < preserveIndex);
  assert.ok(preserveIndex < activateIndex);
  assert.ok(activateIndex < restoreIndex);
});

test('履歴activateはproductionを直接書き換えずcanonical previous snapshotだけを原子的に切り替える', () => {
  assert.match(historyScript, /previous_snapshot="\$snapshot_root\/previous-verified"/);
  assert.match(historyScript, /cp -a "\$selected" "\$tmp"/);
  assert.match(historyScript, /mv "\$previous_snapshot" "\$old"/);
  assert.match(historyScript, /mv "\$tmp" "\$previous_snapshot"/);
  assert.match(historyScript, /previous rollback source restored when available/);
  assert.doesNotMatch(historyScript, /rsync[^\n]*"\$selected\/site\/"[^\n]*"\$root\/"/);
});

test('snapshot history helperのBash構文が有効である', (t) => {
  const bashScriptPath = process.platform === 'win32'
    ? `/${historyScriptPath.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, drive) => drive.toLowerCase())}`
    : historyScriptPath;
  const result = spawnSync('bash', ['-n', bashScriptPath], { encoding: 'utf8' });
  if (result.error && result.error.code === 'ENOENT') {
    t.skip('bashがない環境ではGitHub Actions上の検査に委ねます');
    return;
  }
  if (result.status !== 0 && process.platform === 'win32') {
    const detail = `${result.stderr || ''}${result.stdout || ''}`;
    if (/No such file or directory|cannot open/i.test(detail)) {
      t.skip(`Windows 上の bash がスクリプトパスを解決できないためスキップ: ${detail.trim()}`);
      return;
    }
  }
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
