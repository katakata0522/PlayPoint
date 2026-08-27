'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

const sharePath = path.join(root, 'js', 'share.js');
let share = fs.readFileSync(sharePath, 'utf8');
const wrong = "if (/gold|ゴールド|골드|黃金|黃金級/i.test(label)) return 'gold';";
const correct = "if (/gold|ゴールド|골드|黃金|金級/i.test(label)) return 'gold';";
if (!share.includes(wrong)) throw new Error('Expected shared Gold normalization regression was not found.');
share = share.replace(wrong, correct);
fs.writeFileSync(sharePath, share, 'utf8');

const testPath = path.join(root, 'tests', 'intl-localization-quality.test.cjs');
let tests = fs.readFileSync(testPath, 'utf8');
const anchor = "  assert.ok(!hk.includes('白金級'));\n});";
const replacement = "  assert.ok(!hk.includes('白金級'));\n  const share = fs.readFileSync(path.join(root, 'js', 'share.js'), 'utf8');\n  assert.ok(share.includes('黃金|金級'), 'shared target normalization must support both Taiwan and Hong Kong Gold labels');\n});";
if (!tests.includes(anchor)) throw new Error('Hong Kong regression test anchor was not found.');
tests = tests.replace(anchor, replacement);
fs.writeFileSync(testPath, tests, 'utf8');

console.log('Restored shared Taiwan/Hong Kong Gold normalization.');
