'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/language-suggestion.js'), 'utf8');

test('保存ガードはUI・計算式へ触れず、既存first-view互換exportを維持する', () => {
  assert.match(source, /from\s+['"]\.\/first-view\.js['"]/);
  assert.match(source, /hokuhokuDiaryDataRecoveryV1/);
  assert.match(source, /playpointLastMainCalculationRecoveryV1/);
  assert.doesNotMatch(source, /document\.|innerHTML|classList|calculate\(/);
});
