'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const test = require('node:test');
const { createRevisionSession } = require('../.github/scripts/browser-revision-evidence.cjs');
const { bindEvidence, verifyManifest, checkReport } = require('../.github/scripts/bind-browser-evidence.cjs');
const root = path.resolve(__dirname, '..');
const SHA = 'a'.repeat(40), OTHER = 'b'.repeat(40);
const readiness = { attempts: 1, delayMs: 0, timeoutMs: 1000, onRetry() {} };
async function server(t, handler) {
  const instance = http.createServer(handler);
  await new Promise(resolve => instance.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { instance.closeAllConnections(); instance.close(resolve); }));
  return `http://127.0.0.1:${instance.address().port}/`;
}
function report(baseUrl) {
  return { mode: 'production', baseUrl, passed: true, revision: { checked: true, expected: SHA, actual: SHA, match: true } };
}
function fixture(t, value) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-browser-evidence-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(value));
  fs.writeFileSync(path.join(dir, 'example.png'), 'image evidence fixture');
  return dir;
}

test('本番SHA未指定・短縮・不正値を拒否し、ローカル未検査とは区別する', async () => {
  for (const expectedRevision of ['', 'main', 'abc123', 'A'.repeat(40)]) {
    const session = createRevisionSession({ required: true, expectedRevision });
    await assert.rejects(session.check('https://invalid.invalid/', 'before-browser'), /exact lowercase 40-character SHA/);
    assert.equal(session.evidence.checked, false);
    assert.equal(session.evidence.match, false);
    assert.equal(session.evidence.expected, expectedRevision || null);
    assert.deepEqual(session.evidence.observations, []);
  }
  const local = createRevisionSession();
  await local.check('http://127.0.0.1/', 'before-browser');
  assert.equal(local.evidence.checked, false);
  assert.equal(local.evidence.match, null);
  assert.match(local.evidence.reason, /local-source/);
});

test('検証の前後で同じ実SHAを観測し、途中で変わったら元の観測も残して失敗する', async t => {
  let current = SHA;
  const base = await server(t, (_req, res) => res.end(current + '\n'));
  const session = createRevisionSession({ required: true, expectedRevision: SHA });
  await session.check(base, 'before-browser', readiness);
  await session.check(base, 'after-browser', readiness);
  assert.equal(session.evidence.match, true);
  assert.deepEqual(session.evidence.observations.map(x => x.phase), ['before-browser', 'after-browser']);
  assert.ok(session.evidence.observations.every(x => x.checked && x.expected === SHA && x.actual === SHA && x.checkedAt));
  current = OTHER;
  await assert.rejects(session.check(base, 'after-complete-browser-suite', readiness), /deployed revision check failed/);
  assert.equal(session.evidence.actual, OTHER);
  assert.equal(session.evidence.match, false);
  assert.equal(session.evidence.observations[0].actual, SHA);
});

test('HTTPエラー・空のrevisionでも失敗証跡を残す', async t => {
  let code = 503;
  const base = await server(t, (_req, res) => { res.writeHead(code); res.end(''); });
  for (code of [503, 200]) {
    const session = createRevisionSession({ required: true, expectedRevision: SHA });
    await assert.rejects(session.check(base, 'before-browser', readiness));
    assert.equal(session.evidence.match, false);
    assert.equal(session.evidence.actual, null);
    assert.equal(session.evidence.observations.length, 1);
    assert.match(session.evidence.observations[0].error, /failed after 1 attempts/);
  }
});

test('本番report・checkout・suite終了時のSHAと全証跡digestを結合し、改変を検出する', async t => {
  const baseUrl = await server(t, (_req, res) => res.end(SHA));
  const directory = fixture(t, report(baseUrl));
  const manifest = await bindEvidence({ directory, expected: SHA, checkoutRevision: SHA, verifierRevision: OTHER,
    baseUrl, run: { id: 'fixture-run', attempt: '2', eventSha: OTHER }, readiness });
  assert.equal(manifest.expectedRevision, SHA);
  assert.equal(manifest.observedRevision, SHA);
  assert.equal(manifest.verifierRevision, OTHER, '復旧の対象SHAをtrigger SHAと取り違えない');
  assert.equal(manifest.run.id, 'fixture-run');
  assert.ok(manifest.files.some(x => x.path === 'report.json' && /^[a-f0-9]{64}$/.test(x.sha256)));
  assert.equal(verifyManifest(directory, manifest, SHA), true);
  fs.writeFileSync(path.join(directory, 'deployment-evidence.json'), JSON.stringify(manifest));
  assert.equal(verifyManifest(directory, manifest, SHA), true, 'manifest自身は循環hashへ含めない');
  fs.writeFileSync(path.join(directory, 'example.png'), 'changed');
  assert.throws(() => verifyManifest(directory, manifest, SHA), /changed or are missing/);
  assert.throws(() => verifyManifest(directory, manifest, OTHER), /mismatch/);
});

test('未確認・失敗・別本番・別checkout・欠損reportを成功へ補完しない', async t => {
  const baseUrl = 'https://playpoint-sim.com/';
  const expected = { expected: SHA, checkoutRevision: SHA, baseUrl };
  for (const value of [
    { ...report(baseUrl), mode: 'local' }, { ...report(baseUrl), passed: false },
    { ...report(baseUrl), baseUrl: 'https://different.example/' },
    { ...report(baseUrl), revision: { checked: false } },
    { ...report(baseUrl), revision: { checked: true, expected: SHA, actual: OTHER } }
  ]) assert.throws(() => checkReport(value, expected));
  assert.throws(() => checkReport(report(baseUrl), { ...expected, checkoutRevision: OTHER }));
  const directory = fixture(t, report(baseUrl));
  fs.unlinkSync(path.join(directory, 'report.json'));
  await assert.rejects(bindEvidence({ directory, ...expected, readiness }), /ENOENT/);
});

test('以前のsnapshotのchecked/expected/actual形式をそのまま厳密検証できる', () => {
  const baseUrl = 'https://playpoint-sim.com/';
  const old = report(baseUrl);
  delete old.revision.match;
  assert.doesNotThrow(() => checkReport(old, { expected: SHA, checkoutRevision: SHA, baseUrl }));
  old.revision.actual = OTHER;
  assert.throws(() => checkReport(old, { expected: SHA, checkoutRevision: SHA, baseUrl }));
});

test('4つの本番・復旧レーンはHTTPと同じSHAを渡し、全browser suite後に証跡を結合する', () => {
  let count = 0;
  for (const file of ['deploy.yml', 'rollback.yml', 'deploy-recovery-watchdog.yml']) {
    const source = fs.readFileSync(path.join(root, '.github/workflows', file), 'utf8');
    let httpRevision;
    for (const block of source.split(/^      - /m)) {
      const expectedHttp = block.match(/EXPECTED_DEPLOY_REVISION:\s*(.+)/);
      if (expectedHttp) httpRevision = expectedHttp[1].trim();
      if (!block.includes('SMOKE_BASE_URL:')) continue;
      count++;
      assert.equal(block.match(/SMOKE_EXPECT_REVISION:\s*(.+)/)?.[1].trim(), httpRevision, file);
      assert.ok(block.indexOf('bind-browser-evidence.cjs') > block.indexOf('embed-widget-smoke.cjs'), file);
      if (block.includes('working-directory:')) assert.ok(block.includes('$GITHUB_WORKSPACE/.github/scripts/bind-browser-evidence.cjs'), '復旧先に新helperを要求しない');
    }
  }
  assert.equal(count, 4);
});

test('CLIはブラウザとDeployの2成果物へ同一manifestを保存し機械照合できる', async t => {
  const { execFileSync, execFile } = require('node:child_process');
  const { promisify } = require('node:util');
  const execute = promisify(execFile);
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-evidence-cli-'));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd: workspace, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init', '-q');
  git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-q', '--allow-empty', '-m', 'Fixture');
  const expected = git('rev-parse', 'HEAD');
  const baseUrl = await server(t, (_req, res) => res.end(expected));
  const directory = path.join(workspace, 'browser-smoke-artifacts');
  fs.mkdirSync(directory);
  const value = report(baseUrl);
  value.revision.expected = value.revision.actual = expected;
  fs.writeFileSync(path.join(directory, 'report.json'), JSON.stringify(value));
  const evidence = path.join(workspace, 'deploy-evidence');
  const env = { ...process.env, CI_EVIDENCE_DIR: evidence, SMOKE_BASE_URL: baseUrl, SMOKE_EXPECT_REVISION: expected, GITHUB_SHA: OTHER, GITHUB_RUN_ID: 'fixture-run' };
  const script = path.join(root, '.github/scripts/bind-browser-evidence.cjs');
  await execute(process.execPath, [script], { cwd: workspace, env, timeout: 5000 });
  const browser = fs.readFileSync(path.join(directory, 'deployment-evidence.json'), 'utf8');
  assert.equal(browser, fs.readFileSync(path.join(evidence, 'browser-deployment-evidence.json'), 'utf8'));
  assert.equal(JSON.parse(browser).expectedRevision, expected);
  await execute(process.execPath, [script, 'verify'], { cwd: workspace, env, timeout: 5000 });
});
