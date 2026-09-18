'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('監査summary JSONとMarkdownはbaseline完了状態を一致させる', () => {
  const summary = JSON.parse(read('docs/TEST_AUDIT_PROGRESS_2026-09-18.json'));
  const markdown = read('docs/TEST_AUDIT_PROGRESS_2026-09-18.md');

  assert.equal(summary.baselineCommit, 'cdf5e2999719edf8e96cafeeca3a205cd9364fae');
  assert.equal(summary.baselineCases, 930);
  assert.equal(summary.reviewedBaselineCases, 930);
  assert.equal(summary.unreviewedBaselineCases, 0);
  assert.equal(summary.latestStage, 35);
  assert.equal(summary.latestReviewedBaselineCases, 930);
  assert.equal(summary.latestUnreviewedBaselineCases, 0);
  assert.equal(summary.auditCompleted, true);
  assert.match(markdown, /基準930ケース中930精査・0未精査（完了）/);
});

test('現行テストファイル台帳はtests配下の全ファイルを1回ずつ所有する', () => {
  const actual = fs.readdirSync(path.join(root, 'tests'))
    .filter(file => file.endsWith('.test.cjs'))
    .sort();
  const triage = read('docs/TEST_TRIAGE.md');
  const listed = [...triage.matchAll(/\|\s*`(?:tests\/)?([^`]+\.test\.cjs)`\s*\|/g)]
    .map(match => match[1]);
  const unique = [...new Set(listed)].filter(file => actual.includes(file)).sort();

  assert.deepEqual(unique, actual);
  assert.match(triage, new RegExp('tests/\\*\\.test\\.cjs` の' + actual.length + 'ファイルを全件分類'));
});
