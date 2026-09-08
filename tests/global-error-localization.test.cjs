'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('each calculator entry page has a stable static lang for pre-init errors', () => {
  const entries = [
    ['index.html', 'ja'],
    ['en/index.html', 'en'],
    ['ko/index.html', 'ko'],
    ['tw/index.html', 'zh-TW']
  ];

  for (const [relativePath, lang] of entries) {
    assert.ok(read(relativePath).includes(`<html lang="${lang}">`), `${relativePath}: missing lang=${lang}`);
  }
});
