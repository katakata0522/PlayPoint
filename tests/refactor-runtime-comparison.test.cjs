'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const script = path.join(root, '.github/scripts/refactor-runtime-compatibility.cjs');
function fixture(t) {
  const baseline = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-runtime-contract-'));
  fs.cpSync(path.join(root, 'js'), path.join(baseline, 'js'), { recursive: true });
  t.after(() => fs.rmSync(baseline, { recursive: true, force: true }));
  return baseline;
}
function run(baseline) {
  return spawnSync(process.execPath, [script, baseline], { cwd: root, encoding: 'utf8', timeout: 20000,
    env: { ...process.env, REFACTOR_EVIDENCE_DIR: path.join(baseline, 'evidence') } });
}

test('runtime differential comparator executes full controller paths without modifying either source', t => {
  const baseline = fixture(t), file = path.join(baseline, 'js/calculator.js');
  const before = fs.readFileSync(file, 'utf8');
  const result = run(baseline);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(fs.readFileSync(path.join(baseline, 'evidence/runtime-differential-report.json')));
  assert.equal(report.mismatches, 0);
  assert.equal(report.configCases, 18);
  assert.ok(report.mainCases > 6000 && report.reverseCases > 2000 && report.pureCases > 1000);
  assert.equal(fs.readFileSync(file, 'utf8'), before);
});

test('changed regional numbers fail the differential comparator instead of updating its expected values', t => {
  const baseline = fixture(t), file = path.join(baseline, 'js/region-rules.js');
  const source = fs.readFileSync(file, 'utf8');
  assert.ok(source.includes("['シルバー', 1.25, 250]"));
  fs.writeFileSync(file, source.replace("['シルバー', 1.25, 250]", "['シルバー', 1.26, 250]"));
  const result = run(baseline);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /AssertionError/);
  assert.equal(fs.existsSync(path.join(baseline, 'evidence/runtime-differential-report.json')), false);
});

test('changed rendered markup and missing required modules fail the comparator', t => {
  const baseline = fixture(t), file = path.join(baseline, 'js/calculator-result-view.js');
  const source = fs.readFileSync(file, 'utf8');
  assert.ok(source.includes('<dl>'));
  fs.writeFileSync(file, source.replace('<dl>', '<dl class="unexpected-regression">'));
  assert.notEqual(run(baseline).status, 0);
  fs.writeFileSync(file, source);
  fs.rmSync(path.join(baseline, 'js/calculator.js'));
  const result = run(baseline);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing required/);
});

test('runtime refactoring uses the real base revision and both independent comparison gates inside required PR Gate', () => {
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/quality-check.yml'), 'utf8');
  assert.ok(workflow.includes('github.event.pull_request.base.sha'));
  assert.ok(workflow.includes('git archive "$REFACTOR_BASE_SHA"'));
  assert.ok(workflow.includes('node .github/scripts/refactor-runtime-compatibility.cjs "$baseline_dir"'));
  assert.ok(workflow.includes('node .github/scripts/refactor-visual-smoke.cjs "$baseline_dir"'));
  assert.ok(workflow.includes('contents: read'));
  assert.ok(workflow.includes('fetch-depth: 2'));
});
