'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
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
  assert.deepEqual(new Set(regressions[0].a.slice(1)), new Set(['tests/example.test.cjs', 'tests/static-calculator-delivery.test.cjs', 'tests/runtime-module-guards.test.cjs']));
  assert.deepEqual(new Set(regressions[1].a.slice(1)), new Set(['tests/static-calculator-delivery.test.cjs', 'tests/runtime-module-guards.test.cjs']));
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
