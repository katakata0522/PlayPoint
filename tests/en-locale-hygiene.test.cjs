'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const enRoot = path.join(root, 'en');
const japaneseLeakPattern = /[\u3040-\u30ff\u3001\u3002\u300c\u300d\u300e\u300f\u3010\u3011\uff08\uff09]/u;

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(absolute);
    return entry.isFile() && entry.name.endsWith('.html') ? [absolute] : [];
  });
}

test('English HTML does not contain accidental Japanese-script UI or punctuation', () => {
  const failures = [];

  for (const file of htmlFiles(enRoot)) {
    const html = fs.readFileSync(file, 'utf8');
    const lines = html.split(/\r?\n/);

    lines.forEach((line, index) => {
      if (japaneseLeakPattern.test(line)) {
        failures.push(`${path.relative(root, file)}:${index + 1}: ${line.trim()}`);
      }
    });
  }

  assert.deepStrictEqual(failures, [], `Japanese text leaked into English HTML:\n${failures.join('\n')}`);
});
