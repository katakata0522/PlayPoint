'use strict';

const fs = require('node:fs');
const path = require('node:path');

const target = path.resolve(__dirname, '..', 'tests', 'playpoint-regression.test.cjs');
let source = fs.readFileSync(target, 'utf8');

const marker = "test('流入施策はLPと結果画面の主要導線を個人情報なしで計測する'";
const start = source.indexOf(marker);
const endMarker = '\n});';
const end = source.indexOf(endMarker, start);
if (start < 0 || end < 0) {
  throw new Error('analytics allowlist regression block was not found');
}

let block = source.slice(start, end + endMarker.length);

function replaceInBlock(searchValue, replacement, label) {
  const count = block.split(searchValue).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one match, found ${count}`);
  block = block.replace(searchValue, replacement);
}

replaceInBlock(
  "  const config = fs.readFileSync(path.join(root, 'js', 'config.js'), 'utf8');",
  "  const analytics = fs.readFileSync(path.join(root, 'js', 'analytics.js'), 'utf8');",
  'analytics allowlist source'
);
replaceInBlock(
  '    assert.ok(config.includes(eventName), `${eventName} is missing from analytics allowlist`);',
  '    assert.ok(analytics.includes(eventName), `${eventName} is missing from analytics allowlist`);',
  'analytics allowlist assertion'
);
replaceInBlock(
  '    assert.ok(!config.includes(forbiddenParam), `${forbiddenParam} must not be allowlisted`);',
  '    assert.ok(!analytics.includes(forbiddenParam), `${forbiddenParam} must not be allowlisted`);',
  'analytics forbidden parameter assertion'
);
replaceInBlock(
  "  assert.ok(config.includes('sanitizeParams'));",
  "  assert.ok(analytics.includes('sanitizeParams'));",
  'analytics sanitizer assertion'
);
replaceInBlock(
  "  assert.ok(calculator.includes('getEntryContext()'));",
  "  assert.ok(calculator.includes('getEntryContext({ consumeCalculatorEntry: true })'));",
  'calculator attribution assertion'
);

source = source.slice(0, start) + block + source.slice(end + endMarker.length);
fs.writeFileSync(target, source, 'utf8');
console.log('Analytics allowlist regression checks moved to the shared module.');
