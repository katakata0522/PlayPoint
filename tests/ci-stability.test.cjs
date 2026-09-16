'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const { createPhaseRunner } = require('../.github/scripts/ci-phase-runner.cjs');
const { classifyPhase, classifyJob, cleanError, finalize } = require('../.github/scripts/ci-evidence.cjs');
const { withNavigationRetry } = require('../.github/scripts/browser-navigation-retry.cjs');
const { classifyDeployImpact } = require('../.github/scripts/detect-deploy-impact.cjs');
const root = path.resolve(__dirname, '..');
function temporary(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-ci-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('上流失敗は依存工程だけを止め、独立工程を続行し全体を失敗にする', t => {
  const outputPath = path.join(temporary(t), 'phases.json');
  const runner = createPhaseRunner({ outputPath });
  const ran = [];
  runner.run({ id: 'build', name: 'build', deterministic: true }, () => ({ status: 1 }));
  runner.run({ id: 'minify', name: 'minify', dependsOn: ['build'] }, () => { throw new Error('must not run'); });
  runner.run({ id: 'post', name: 'post', dependsOn: ['minify'] }, () => { throw new Error('must not run'); });
  runner.run({ id: 'regression', name: 'regression' }, () => { ran.push('regression'); return { status: 0 }; });
  assert.deepEqual(ran, ['regression']);
  const report = runner.finish();
  assert.equal(report.passed, false);
  assert.deepEqual(report.phases.map(p => p.classification), ['DETERMINISTIC_FAIL', 'UPSTREAM_SKIPPED', 'UPSTREAM_SKIPPED', 'PASS']);
  assert.deepEqual(report.phases[1].blockedBy, ['build']);
  assert.deepEqual(JSON.parse(fs.readFileSync(outputPath)), report);
});
test('全工程成功と空の実行を区別し、未定義・重複の工程IDを拒否する', () => {
  const runner = createPhaseRunner({});
  assert.equal(runner.finish().passed, false);
  assert.throws(() => runner.run({ id: 'child', dependsOn: ['missing'] }, () => ({ status: 0 })), /未定義/);
  runner.run({ id: 'one', name: 'one' }, () => ({ status: 0 }));
  runner.run({ id: 'two', name: 'two', dependsOn: ['one'] }, () => ({ status: 0 }));
  assert.throws(() => runner.run({ id: 'one' }, () => ({ status: 0 })), /重複/);
  assert.equal(runner.finish().passed, true);
});
test('通常の検査例外を環境故障と断定せず、起動不能・中断を区別する', () => {
  assert.equal(classifyPhase({ status: 1 }), 'CHECK_FAIL');
  assert.equal(classifyPhase({ error: new Error('assertion') }), 'CHECK_FAIL');
  assert.equal(classifyPhase({ error: { code: 'ENOENT' } }), 'ENVIRONMENT_FAIL');
  assert.equal(classifyPhase({ signal: 'SIGTERM' }), 'CANCELLED');
  assert.equal(classifyJob('cancelled', {}), 'CANCELLED');
  assert.equal(classifyJob('cancelled', {}, true), 'CANCELLED_BY_NEW_COMMIT');
  assert.equal(classifyJob('failure', { ci_browser: { outcome: 'failure' } }), 'ENVIRONMENT_FAIL');
  assert.equal(classifyJob('failure', { test: { outcome: 'failure' } }), 'CHECK_FAIL');
  assert.equal(classifyJob('success', { test: { outcome: 'failure', conclusion: 'success' } }), 'CHECK_FAIL');
});
test('例外で中断した工程もjournalに残り成功しない', t => {
  const outputPath = path.join(temporary(t), 'phases.json');
  const runner = createPhaseRunner({ outputPath });
  runner.run({ id: 'throw', name: 'throw' }, () => { throw new Error('unexpected failure'); });
  const report = runner.finish();
  assert.equal(report.passed, false);
  assert.equal(report.phases[0].error, 'unexpected failure');
  assert.equal(report.phases[0].classification, 'CHECK_FAIL');
});
test('初回navigation失敗と再試行成功を両方保存する', async () => {
  const events = [], delays = [];
  let calls = 0;
  const result = await withNavigationRetry({ url: 'https://user:password@example.com/test?q=secret#fragment',
    operation: async () => { if (++calls === 1) throw new Error('timeout'); return 'page'; },
    delay: async ms => delays.push(ms), onAttempt: item => events.push(item) });
  assert.equal(result, 'page');
  assert.equal(calls, 2);
  assert.deepEqual(delays, [1000]);
  assert.deepEqual(events.map(e => e.classification), ['CHECK_FAIL', 'FLAKY_RECOVERED']);
  assert.deepEqual(events.map(e => e.attempt), [1, 2]);
  assert.ok(events.every(e => e.url === 'https://example.com/test'));
});
test('navigationは最大3回で失敗を伝播し、初回成功を再試行しない', async () => {
  const events = [];
  await assert.rejects(withNavigationRetry({ url: 'https://example.com/', operation: async () => { throw new Error('still failing'); },
    delay: async () => {}, onAttempt: item => events.push(item) }), /still failing/);
  assert.equal(events.length, 3);
  const success = [];
  await withNavigationRetry({ url: 'https://example.com/', operation: async () => true, delay: async () => { throw new Error('unexpected retry'); }, onAttempt: item => success.push(item) });
  assert.equal(success.length, 1);
  assert.equal(success[0].classification, 'PASS');
});
test('証跡保存の失敗をnavigationの失敗として再試行しない', async () => {
  let calls = 0;
  await assert.rejects(withNavigationRetry({ url: 'https://example.com/', operation: async () => ++calls,
    delay: async () => {}, onAttempt: () => { throw new Error('disk full'); } }), /disk full/);
  assert.equal(calls, 1);
  await assert.rejects(withNavigationRetry({ maxAttempts: 4 }), /1..3/);
  assert.equal(cleanError(new Error('timeout https://u:pw@example.com/path?q=token\nsecond line')), 'timeout https://example.com/path');
});
test('job証跡は任意の環境変数・step outputs・event本文を記録しない', t => {
  const dir = temporary(t);
  const eventFile = path.join(dir, 'event.json');
  fs.writeFileSync(eventFile, JSON.stringify({ secret: 'private-event-value', pull_request: { head: { sha: 'a'.repeat(40) }, base: { sha: 'b'.repeat(40) } } }));
  const env = { ...process.env, CI_EVIDENCE_DIR: dir, GITHUB_EVENT_PATH: eventFile, GITHUB_SHA: 'c'.repeat(40),
    GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '2', GITHUB_JOB: 'test', CI_JOB_STATUS: 'failure',
    GITHUB_STEP_SUMMARY: path.join(dir, 'summary.md'), SECRET_SENTINEL: 'private-environment-value',
    CI_STEPS_JSON: JSON.stringify({ gate: { outcome: 'failure', conclusion: 'failure', outputs: { token: 'private-output-value' } } }) };
  const result = finalize(env);
  assert.equal(result.source.prHeadSha, 'a'.repeat(40));
  assert.equal(result.source.eventSha, 'c'.repeat(40));
  assert.equal(result.run.attempt, '2');
  assert.equal(result.classification, 'CHECK_FAIL');
  const text = fs.readFileSync(path.join(dir, 'job-result.json'), 'utf8');
  assert.doesNotMatch(text, /private-(event|environment|output)-value/);
  assert.equal(result.fingerprint.length, 64);
});
test('共通CI runtimeの入力を配信判定へ含め、性能専用依存を分離する', () => {
  for (const file of ['.github/ci-runtime/package.json', '.github/ci-runtime/package-lock.json', '.github/ci-runtime/node-version',
    '.github/scripts/ci-evidence.cjs', '.github/scripts/ci-phase-runner.cjs', '.github/scripts/browser-navigation-retry.cjs']) {
    assert.equal(classifyDeployImpact(file).deploy, true, file);
  }
  assert.equal(classifyDeployImpact('.github/ci-runtime/lighthouse/package-lock.json').deploy, false);
});

// shell自体を実行するが、apt/npm/browserは一時PATHのstubで置き換える。
for (const [label, scenario, extra, expected] of [
  ['通常jobは性能依存をinstallしない', '', [], 0],
  ['性能jobだけ独立lockをinstallする', '', ['--performance'], 0],
  ['Node不一致はinstall前に停止する', 'node-mismatch', [], 2],
  ['lockのinstall失敗を隠さない', 'npm-failure', [], 7],
  ['Chromium取得失敗をPATHのChromeで代替しない', 'browser-failure', [], 9]
]) {
  test(label, t => {
    if (process.platform === 'win32') return t.skip('shell stubはPOSIXのCIで検証する');
    const dir = temporary(t), bin = path.join(dir, 'bin'), runtime = path.join(dir, '.github/ci-runtime');
    fs.mkdirSync(bin); fs.mkdirSync(runtime, { recursive: true });
    fs.writeFileSync(path.join(runtime, 'package-lock.json'), '{}');
    fs.writeFileSync(path.join(runtime, 'node-version'), '22.23.2\n');
    const log = path.join(dir, 'commands.txt');
    for (const name of ['sudo', 'npm', 'fc-match', 'fake-chrome']) {
      const body = name === 'npm' ? 'if [ "$SCENARIO" = npm-failure ]; then exit 7; fi\n' : '';
      fs.writeFileSync(path.join(bin, name), `#!/bin/bash\nprintf '%s\\n' "${name} $*" >> "$MOCK_LOG"\n${body}exit 0\n`, { mode: 0o755 });
    }
    fs.writeFileSync(path.join(bin, 'node'), `#!/bin/bash
printf '%s\\n' "node $*" >> "$MOCK_LOG"
if [ "$1" = -p ]; then
  if [[ "$2" == *process.versions.node* ]]; then
    if [ "$SCENARIO" = node-mismatch ]; then echo 0.0.0; else echo 22.23.2; fi
  else echo "$MOCK_BIN/fake-chrome"; fi
elif [[ "$1" == */cli.js ]] && [ "$SCENARIO" = browser-failure ]; then exit 9; fi
`, { mode: 0o755 });
    const result = spawnSync('bash', [path.join(root, '.github/scripts/setup-browser-runtime.sh'), ...extra], {
      encoding: 'utf8', env: { ...process.env, PATH: bin + path.delimiter + process.env.PATH, MOCK_BIN: bin, MOCK_LOG: log,
        SCENARIO: scenario, GITHUB_ENV: path.join(dir, 'env'), GITHUB_WORKSPACE: dir, RUNNER_TEMP: dir } });
    assert.equal(result.status, expected, result.stderr);
    const commands = fs.readFileSync(log, 'utf8');
    if (expected === 0) {
      assert.equal((commands.match(/^npm ci/gm) || []).length, extra.length ? 2 : 1);
      assert.match(commands, /install --with-deps --no-shell chromium/);
      assert.match(fs.readFileSync(path.join(dir, 'env'), 'utf8'), /CHROME_PATH=.*fake-chrome/);
    } else {
      assert.equal(fs.existsSync(path.join(dir, 'env')), false);
      if (scenario === 'node-mismatch') assert.doesNotMatch(commands, /npm|sudo/);
    }
  });
}

test('構文検査は取得したnode_modulesを除外するが正本の壊れたJSは落とす', t => {
  const dir = temporary(t), scripts = path.join(dir, '.github/scripts');
  fs.mkdirSync(scripts, { recursive: true });
  const checker = path.join(scripts, 'verify-js-syntax.cjs');
  fs.copyFileSync(path.join(root, '.github/scripts/verify-js-syntax.cjs'), checker);
  for (const name of ['smoke-test.cjs', 'verify-build-output.cjs']) fs.writeFileSync(path.join(scripts, name), 'const valid = true;');
  const dependency = path.join(dir, '.github/ci-runtime/node_modules/fixture');
  fs.mkdirSync(dependency, { recursive: true });
  fs.writeFileSync(path.join(dependency, 'not-node-fixture.js'), 'this is invalid js !');
  const before = spawnSync(process.execPath, [checker], { encoding: 'utf8' });
  assert.equal(before.status, 0, before.stderr);
  fs.writeFileSync(path.join(scripts, 'owned-broken.cjs'), 'const = ;');
  const after = spawnSync(process.execPath, [checker], { encoding: 'utf8' });
  assert.notEqual(after.status, 0);
  assert.match(after.stderr, /owned-broken\.cjs/);
});
