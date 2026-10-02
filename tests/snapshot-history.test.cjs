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
const os = require('node:os');
const deployWorkflow = fs.readFileSync(deployWorkflowPath, 'utf8');
const rollbackWorkflow = fs.readFileSync(rollbackWorkflowPath, 'utf8');

function localHistory(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pp-history-local-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const sha = 'a'.repeat(40), live = path.join(dir, 'public'), snapshots = path.join(dir, 'snapshots');
  const selected = path.join(snapshots, 'verified-history', sha);
  fs.mkdirSync(path.join(selected, 'site/status'), { recursive: true });
  fs.mkdirSync(live);
  fs.writeFileSync(path.join(live, 'keep.txt'), 'live unchanged');
  const write = (file, text) => fs.writeFileSync(path.join(selected, file), text);
  write('revision.txt', sha); write('status.txt', 'verified');
  write('site/status/deploy-revision.txt', sha);
  write('site/status/deploy-status.json', JSON.stringify({ status: 'verified', commit: sha }, null, 2));
  const shellPath = value => process.platform === 'win32'
    ? '/' + value.replaceAll('\\', '/').replace(/^([A-Za-z]):/, (_, drive) => drive.toLowerCase()) : value;
  const body = historyScript.match(/<<'REMOTE'\r?\n([\s\S]*?)\r?\nREMOTE/)?.[1];
  assert.ok(body, 'remote history body missing');
  const input = body.replaceAll('/home/hajikkoroom/playpoint-sim.com/public_html', shellPath(live))
    .replaceAll('/home/hajikkoroom/playpoint-sim.com/.deploy-snapshots', shellPath(snapshots));
  const run = (mode, target) => {
    const args = ['-s', '--', shellPath(live), shellPath(snapshots), '5', mode];
    if (target !== undefined) args.push(target);
    const result = spawnSync(process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash', args, { input, encoding: 'utf8', timeout: 5000 });
    assert.ifError(result.error);
    return result;
  };
  return { dir, sha, selected, live, snapshots, write, run };
}

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

test('SSH越しに末尾の任意引数が消えてもarchive/listはnounsetで落ちない', t => {
  const fixture = localHistory(t);
  const result = fixture.run('--list');
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout.includes(fixture.sha));
  assert.equal(fixture.run('--archive-live').status, 2, '実metadata欠損で停止しnounsetで落ちない');
});

test('verified履歴はsymlink・別所有領域・metadata不一致をfail-closedにする', t => {
  const fixture = localHistory(t);
  assert.equal(fixture.run('--verify', fixture.sha).status, 0);
  fixture.write('site/status/deploy-revision.txt', 'b'.repeat(40));
  assert.equal(fixture.run('--verify', fixture.sha).status, 2);
  fixture.write('site/status/deploy-revision.txt', fixture.sha);
  for (const name of ['manner', 'kanji-slicer']) {
    const owned = path.join(fixture.selected, 'site', name); fs.mkdirSync(owned);
    assert.equal(fixture.run('--verify', fixture.sha).status, 2);
    fs.rmdirSync(owned);
  }
  if (process.platform !== 'win32') {
    const link = path.join(fixture.selected, 'site', 'link'); fs.symlinkSync('/missing-fixture', link);
    assert.equal(fixture.run('--verify', fixture.sha).status, 2);
    fs.unlinkSync(link);
  }
  fs.unlinkSync(path.join(fixture.selected, 'revision.txt'));
  assert.equal(fixture.run('--verify', fixture.sha).status, 2);
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

test('履歴activateはproductionを直接書き換えずcanonical previous snapshotだけを原子的に切り替える', t => {
  const fixture = localHistory(t);
  const previous = path.join(fixture.snapshots, 'previous-verified');
  fs.mkdirSync(previous); fs.writeFileSync(path.join(previous, 'old.txt'), 'previous source');
  const activated = fixture.run('--activate', fixture.sha);
  assert.equal(activated.status, 0, activated.stderr);
  assert.equal(fs.readFileSync(path.join(previous, 'revision.txt'), 'utf8'), fixture.sha);
  assert.equal(fs.existsSync(path.join(previous, 'old.txt')), false);
  assert.equal(fs.readFileSync(path.join(fixture.live, 'keep.txt'), 'utf8'), 'live unchanged');
  assert.equal(fs.readFileSync(path.join(fixture.selected, 'revision.txt'), 'utf8'), fixture.sha);
  assert.equal(fixture.run('--activate', 'b'.repeat(40)).status, 2);
  assert.equal(fs.readFileSync(path.join(previous, 'revision.txt'), 'utf8'), fixture.sha, '欠損候補で前rollback sourceを破棄しない');
});

test('snapshot history helperのBash構文が有効である', (t) => {
  const bashScriptPath = process.platform === 'win32'
    ? `/${historyScriptPath.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, drive) => drive.toLowerCase())}`
    : historyScriptPath;
  const bash = process.platform === 'win32' && fs.existsSync('C:/Program Files/Git/bin/bash.exe') ? 'C:/Program Files/Git/bin/bash.exe' : 'bash';
  const result = spawnSync(bash, ['-n', bashScriptPath], { encoding: 'utf8' });
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
