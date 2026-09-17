'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { runPreflight } = require('./helpers/preflight-fixture.cjs');

for (const missing of ['static-calculator-delivery.test.cjs', 'runtime-module-guards.test.cjs']) {
  test(`必須配信境界 ${missing} が欠けたら検査を黙って減らさない`, t => {
    const result = runPreflight(t, { missing: [missing] });
    assert.equal(result.exitCode, 1);
    assert.equal(result.report.passed, false);
    assert.ok(result.report.phases.some(p => p.error?.includes(missing)), '不足した検査を特定する');
    assert.ok(!result.calls.some(c => c.args[0] === '--test'), '不足時に残りだけで成功させない');
    assert.ok(!result.calls.some(c => c.args[0] === '.github/scripts/minify.cjs'));
  });
}

test('回帰集合が空でもNodeの既定探索へ落ちず明示的に失敗する', t => {
  const result = runPreflight(t, { empty: true });
  assert.equal(result.exitCode, 1);
  assert.ok(!result.calls.some(c => c.args[0] === '--test'));
});

test('全回帰は圧縮前、配信境界は圧縮後の構文検査に続けて実行する', t => {
  const result = runPreflight(t);
  assert.equal(result.exitCode, 0);
  assert.equal(result.report.passed, true);
  const commands = result.calls.map(c => c.args);
  const minify = commands.findIndex(a => a[0] === '.github/scripts/minify.cjs');
  const regressions = commands.map((a, i) => ({ a, i })).filter(({ a }) => a[0] === '--test');
  assert.equal(regressions.length, 2, '同じ全量を二重実行しない');
  assert.ok(regressions[0].i < minify && regressions[1].i > minify);
  assert.deepEqual(new Set(regressions[0].a.filter(arg => !arg.startsWith('--'))), new Set(['tests/example.test.cjs', 'tests/static-calculator-delivery.test.cjs', 'tests/runtime-module-guards.test.cjs']));
  assert.deepEqual(new Set(regressions[1].a.filter(arg => !arg.startsWith('--'))), new Set(['tests/static-calculator-delivery.test.cjs', 'tests/runtime-module-guards.test.cjs']));
  assert.ok(commands.slice(minify + 1, regressions[1].i).some(a => a[0] === '.github/scripts/verify-js-syntax.cjs'));
  assert.equal(result.css, '/* original */', '通常検証は配信用差分を残さない');
});

test('圧縮後の構文エラーは配信境界を止め、全体を失敗にする', t => {
  const result = runPreflight(t, { commandResult(call, calls) {
    return { status: call.args[0] === '.github/scripts/verify-js-syntax.cjs' && calls.some(c => c.args[0] === '.github/scripts/minify.cjs') ? 1 : 0 };
  } });
  assert.equal(result.exitCode, 1);
  assert.equal(result.report.passed, false);
  assert.equal(result.calls.filter(c => c.args[0] === '--test').length, 1);
  assert.equal(result.css, '/* original */');
});

test('配信用モードだけ変換済みアセットを保持する', t => {
  const result = runPreflight(t, { prepareDeploy: true });
  assert.equal(result.exitCode, 0);
  assert.equal(result.css, '/* prepared */');
});

// 小さな隔離fixtureだけを実Nodeで実行する。本リポジトリの全回帰を再帰起動しない。
function executeFixtureTests(call, options) {
  return spawnSync(call.command, call.args, {
    ...options, stdio: 'pipe', encoding: 'utf8', timeout: 4000
  });
}

function reportPath(call) {
  const prefix = '--test-reporter-destination=';
  const destinations = call.args.filter(arg => arg.startsWith(prefix)).map(arg => arg.slice(prefix.length));
  assert.ok(destinations.includes('stdout'), '既存の端末出力を残す');
  const files = destinations.filter(value => !['stdout', 'stderr'].includes(value));
  assert.equal(files.length, 1, '一回の実行につき証跡は一つ');
  return files[0];
}

for (const prepareDeploy of [false, true]) {
  test(`実Nodeの結果を端末と別々の証跡に保存し二重実行しない（prepareDeploy=${prepareDeploy}）`, t => {
    const executions = [];
    const result = runPreflight(t, { prepareDeploy, commandResult(call, calls, options) {
      if (call.args[0] !== '--test') return { status: 0 };
      const executed = executeFixtureTests(call, options);
      executions.push({ file: reportPath(call), executed });
      return executed;
    } });
    assert.equal(result.exitCode, 0);
    assert.equal(result.report.passed, true);
    assert.equal(executions.length, 2, '全量1回＋圧縮後の配信境界1回');
    assert.notEqual(executions[0].file, executions[1].file, '圧縮後の結果で全回帰の証跡を上書きしない');
    for (const [index, { file, executed }] of executions.entries()) {
      const saved = fs.readFileSync(file, 'utf8');
      assert.equal(executed.status, 0);
      assert.equal(saved, executed.stdout, '保存内容は実際の端末TAPと一致する');
      assert.match(saved, new RegExp(`^# tests ${index === 0 ? 3 : 2}$`, 'm'));
      assert.match(saved, /^# fail 0$/m);
    }
    assert.equal(result.css, prepareDeploy ? '/* prepared */' : '/* original */');
  });
}

test('全回帰の失敗名・assertionを保存し、後続工程が成功しても失敗を隠さない', t => {
  let failed;
  const result = runPreflight(t, { prepareDeploy: true, commandResult(call, calls, options) {
    if (call.args[0] !== '--test') return { status: 0 };
    if (!failed) {
      fs.writeFileSync(path.join(options.cwd, 'tests/example.test.cjs'),
        "require('node:test')('broken fixture', () => { require('node:assert/strict').equal(1, 2, 'evidence assertion'); });\n");
    }
    const executed = executeFixtureTests(call, options);
    if (!failed) failed = { file: reportPath(call), executed };
    return executed;
  } });
  assert.equal(failed.executed.status, 1);
  assert.equal(result.exitCode, 1);
  assert.equal(result.report.passed, false);
  assert.equal(result.report.phases.find(p => p.id === 'regression').classification, 'CHECK_FAIL');
  assert.equal(result.report.phases.find(p => p.id === 'post-minify-tests').classification, 'PASS');
  const saved = fs.readFileSync(failed.file, 'utf8');
  assert.match(saved, /not ok \d+ - broken fixture/);
  assert.match(saved, /evidence assertion/);
  assert.match(saved, /^# fail 1$/m);
});

test('結果の保存先が書き込めない場合も成功として本番へ進ませない', t => {
  let first = true;
  let failed;
  const result = runPreflight(t, { commandResult(call, calls, options) {
    if (call.args[0] !== '--test') return { status: 0 };
    if (first) {
      first = false;
      fs.mkdirSync(reportPath(call)); // ファイルと同名のディレクトリで実I/Oを失敗させる。
      failed = executeFixtureTests(call, options);
      return failed;
    }
    return { status: 0 };
  } });
  assert.notEqual(failed.status, 0);
  assert.equal(result.exitCode, 1);
  assert.equal(result.report.passed, false);
  assert.equal(result.report.phases.find(p => p.id === 'regression').classification, 'CHECK_FAIL');
});
