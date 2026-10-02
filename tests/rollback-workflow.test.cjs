const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const deployWorkflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'deploy.yml'), 'utf8').replace(/\r\n/g, '\n');
const rollbackWorkflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'rollback.yml'), 'utf8').replace(/\r\n/g, '\n');
const deployScript = fs.readFileSync(path.join(root, '.github', 'scripts', 'deploy-rsync.sh'), 'utf8');

// SSHを起動せず、正本heredocの検証本文だけを一時ローカル領域で実行する。
function snapshotFixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pp-rollback-local-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const live = path.join(dir, 'public'), snapshots = path.join(dir, 'snapshots');
  const snapshot = path.join(snapshots, 'previous-verified');
  fs.mkdirSync(path.join(snapshot, 'site/status'), { recursive: true });
  fs.mkdirSync(path.join(live, 'status'), { recursive: true });
  const sha = 'a'.repeat(40);
  const write = (file, data) => fs.writeFileSync(path.join(snapshot, file), data);
  write('revision.txt', sha + '\n'); write('status.txt', 'verified\n');
  write('site/status/deploy-revision.txt', sha + '\n');
  write('site/status/deploy-status.json', JSON.stringify({ status: 'verified', commit: sha }, null, 2));
  fs.writeFileSync(path.join(live, 'status/deploy-status.json'), 'original live marker');
  const shellPath = value => process.platform === 'win32'
    ? '/' + value.replaceAll('\\', '/').replace(/^([A-Za-z]):/, (_, drive) => drive.toLowerCase()) : value;
  const run = (operation, expected = sha, env = {}) => {
    const start = deployScript.indexOf(operation + '() {');
    assert.ok(start >= 0, operation + ': function missing');
    const block = deployScript.slice(start);
    const body = block.match(/<<'REMOTE'\r?\n([\s\S]*?)\r?\nREMOTE/)?.[1];
    assert.ok(body, operation + ': remote body missing');
    const input = body.replaceAll('/home/hajikkoroom/playpoint-sim.com/public_html', shellPath(live))
      .replaceAll('/home/hajikkoroom/playpoint-sim.com/.deploy-snapshots', shellPath(snapshots));
    const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash';
    const result = spawnSync(bash, ['-s', '--', shellPath(live), shellPath(snapshots), 'previous-verified', expected], {
      input, encoding: 'utf8', timeout: 5000, env: { ...process.env, ...env }
    });
    assert.ifError(result.error);
    return result;
  };
  return { dir, live, snapshot, sha, write, run };
}

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

test('snapshot検証はmetadata・symlink・別所有領域をfail-closedに扱う', t => {
  const fixture = snapshotFixture(t);
  const good = fixture.run('verify_snapshot_once');
  assert.equal(good.status, 0, good.stderr);
  assert.match(good.stdout, new RegExp('ROLLBACK_SNAPSHOT_REVISION=' + fixture.sha));
  fixture.write('site/status/deploy-revision.txt', 'b'.repeat(40));
  assert.equal(fixture.run('verify_snapshot_once').status, 2);
  fixture.write('site/status/deploy-revision.txt', fixture.sha);
  fixture.write('status.txt', 'deploying');
  assert.equal(fixture.run('verify_snapshot_once').status, 2);
  fixture.write('status.txt', 'verified');
  for (const name of ['manner', 'kanji-slicer']) {
    const owned = path.join(fixture.snapshot, 'site', name);
    fs.mkdirSync(owned);
    assert.equal(fixture.run('verify_snapshot_once').status, 2);
    fs.rmdirSync(owned);
  }
  if (process.platform !== 'win32') {
    const link = path.join(fixture.snapshot, 'site', 'link');
    fs.symlinkSync('/does-not-exist', link);
    assert.equal(fixture.run('verify_snapshot_once').status, 2);
    fs.unlinkSync(link);
  }
  fs.unlinkSync(path.join(fixture.snapshot, 'revision.txt'));
  assert.equal(fixture.run('verify_snapshot_once').status, 2);
});

test('restoreは別所有領域を保護し、中断時にverifiedを偽装しない', t => {
  const fixture = snapshotFixture(t);
  const wrong = fixture.run('restore_verified_snapshot_once', 'b'.repeat(40));
  assert.equal(wrong.status, 2);
  assert.equal(fs.readFileSync(path.join(fixture.live, 'status/deploy-status.json'), 'utf8'), 'original live marker');
  const bin = path.join(fixture.dir, 'bin'); fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'rsync'), '#!/bin/bash\nexit 23\n', { mode: 0o755 });
  const interrupted = fixture.run('restore_verified_snapshot_once', fixture.sha, { PATH: bin + path.delimiter + process.env.PATH });
  assert.equal(interrupted.status, 23, interrupted.stderr);
  assert.equal(JSON.parse(fs.readFileSync(path.join(fixture.live, 'status/deploy-status.json'))).status, 'rolling_back');
  if (process.platform !== 'win32') {
    for (const name of ['manner', 'kanji-slicer']) {
      fs.mkdirSync(path.join(fixture.live, name));
      fs.writeFileSync(path.join(fixture.live, name, 'keep.txt'), 'separate owner');
    }
    fs.writeFileSync(path.join(fixture.live, 'stale.html'), 'stale');
    fixture.write('site/index.html', 'restored');
    const restored = fixture.run('restore_verified_snapshot_once');
    assert.equal(restored.status, 0, restored.stderr);
    assert.match(restored.stdout, new RegExp('RESTORED_REVISION=' + fixture.sha));
    assert.equal(fs.existsSync(path.join(fixture.live, 'stale.html')), false);
    assert.equal(fs.readFileSync(path.join(fixture.live, 'index.html'), 'utf8'), 'restored');
    for (const name of ['manner', 'kanji-slicer']) assert.equal(fs.readFileSync(path.join(fixture.live, name, 'keep.txt'), 'utf8'), 'separate owner');
  }
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
