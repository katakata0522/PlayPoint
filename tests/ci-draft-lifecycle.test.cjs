'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

function evaluate(expression, github) {
  return vm.runInNewContext(expression, { github }, { timeout: 100 });
}
function expand(value, github) {
  return value.replace(/\$\{\{([\s\S]*?)\}\}/g, (_, expr) => evaluate(expr, github));
}

for (const [file, job, requiredName] of [
  ['quality-check.yml', 'gate', 'PR Gate'],
  ['mobile-performance.yml', 'lighthouse', 'lighthouse'],
]) {
  test(`${requiredName}: Draftは必須名を上書きせず、readyで実検証する`, () => {
    const source = fs.readFileSync(path.join(__dirname, '../.github/workflows', file), 'utf8').replace(/\r\n/g, '\n');
    const body = source.split(`\n  ${job}:\n`)[1];
    assert.ok(body);
    const condition = body.match(/^    if: \$\{\{ (.*?) \}\}$/m)[1];
    const name = body.match(/^    name: (.+)$/m)[1];
    const group = source.match(/^  group: (.+)$/m)[1];
    for (const action of ['opened', 'synchronize', 'reopened', 'ready_for_review', 'converted_to_draft']) {
      assert.ok(source.match(/types: \[(.*?)\]/)[1].split(',').map(x => x.trim()).includes(action));
      for (const draft of [true, false]) {
        const github = { event_name: 'pull_request', head_ref: 'fix/example', ref: 'refs/pull/1/merge',
          run_id: 100, event: { action, pull_request: { number: 1, draft } } };
        assert.equal(evaluate(condition, github), !draft);
        assert.equal(expand(name, github) === requiredName, !draft);
        const next = { ...github, run_id: 101 };
        assert.equal(expand(group, github) === expand(group, next), !draft,
          '実検証だけ同じPRの旧実行をまとめ、Draftイベントで実検証をcancelしない');
        const ready = { ...github, event: { ...github.event, pull_request: { number: 1, draft: false } } };
        if (draft) assert.notEqual(expand(group, github), expand(group, ready));
      }
    }
    for (const event_name of ['workflow_dispatch', ...(file === 'mobile-performance.yml' ? ['schedule'] : [])]) {
      const github = { event_name, event: {}, ref: 'refs/heads/main', run_id: 102 };
      assert.equal(evaluate(condition, github), true);
      assert.equal(expand(name, github), requiredName);
    }
  });
}
