'use strict';

const fs = require('node:fs');
const path = require('node:path');

const target = path.resolve(__dirname, '..', 'tests', 'playpoint-regression.test.cjs');
let source = fs.readFileSync(target, 'utf8');

function replaceOnce(searchValue, replacement, label) {
  const count = source.split(searchValue).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one match, found ${count}`);
  source = source.replace(searchValue, replacement);
}

replaceOnce(
  "  const config = fs.readFileSync(path.join(root, 'js', 'config.js'), 'utf8');\n  const calculator = fs.readFileSync(path.join(root, 'js', 'calculator.js'), 'utf8');",
  "  const analytics = fs.readFileSync(path.join(root, 'js', 'analytics.js'), 'utf8');\n  const calculator = fs.readFileSync(path.join(root, 'js', 'calculator.js'), 'utf8');",
  'analytics allowlist source'
);
replaceOnce(
  '    assert.ok(config.includes(eventName), `${eventName} is missing from analytics allowlist`);',
  '    assert.ok(analytics.includes(eventName), `${eventName} is missing from analytics allowlist`);',
  'analytics allowlist assertion'
);
replaceOnce(
  '    assert.ok(!config.includes(forbiddenParam), `${forbiddenParam} must not be allowlisted`);',
  '    assert.ok(!analytics.includes(forbiddenParam), `${forbiddenParam} must not be allowlisted`);',
  'analytics forbidden parameter assertion'
);
replaceOnce(
  "  assert.ok(config.includes('sanitizeParams'));\n  assert.ok(calculator.includes('getEntryContext()'));",
  "  assert.ok(analytics.includes('sanitizeParams'));\n  assert.ok(calculator.includes('getEntryContext({ consumeCalculatorEntry: true })'));",
  'analytics sanitizer and attribution assertion'
);

fs.writeFileSync(target, source, 'utf8');
console.log('Analytics allowlist regression checks moved to the shared module.');
