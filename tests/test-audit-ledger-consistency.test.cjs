'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('現行テストファイル台帳はtests配下の全検査を分類する', () => {
  const actual = fs.readdirSync(path.join(root, 'tests'))
    .filter(file => file.endsWith('.test.cjs'))
    .sort();
  const triage = read('docs/TEST_TRIAGE.md');
  const listed = [...triage.matchAll(/\|\s*`(?:tests\/)?([^`]+\.test\.cjs)`\s*\|/g)]
    .map(match => match[1]);
  const unique = [...new Set(listed)].filter(file => actual.includes(file)).sort();

  assert.deepEqual(unique, actual);
});
