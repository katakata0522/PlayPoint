'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('calculator tabs expose roving tabindex and tab semantics in every locale', () => {
  for (const relativePath of ['index.html', 'en/index.html', 'ko/index.html', 'tw/index.html']) {
    const html = read(relativePath);
    assert.match(html, /class="tab-switch" role="tablist"/, `${relativePath}: tablist is missing`);
    assert.match(html, /id="tab-main" role="tab" aria-selected="true"[^>]*tabindex="0"/, `${relativePath}: active tab semantics are missing`);
    assert.match(html, /id="tab-reverse" role="tab" aria-selected="false"[^>]*tabindex="-1"/, `${relativePath}: reverse tab roving tabindex is missing`);
    assert.match(html, /id="tab-diary" role="tab" aria-selected="false"[^>]*tabindex="-1"/, `${relativePath}: diary tab roving tabindex is missing`);
  }
});

test('calculator tabs support WAI-ARIA horizontal keyboard navigation', () => {
  const source = read('js/ui.js');

  for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) {
    assert.ok(source.includes(`'${key}'`), `keyboard handler is missing ${key}`);
  }

  assert.match(source, /currentTab\.closest\('\[role="tablist"\]'\)/);
  assert.match(source, /querySelectorAll\('\[role="tab"\]'\)/);
  assert.match(source, /event\.preventDefault\(\)/);
  assert.match(source, /nextTab\.focus\(\)/);
  assert.match(source, /nextTab\.click\(\)/);
  assert.match(source, /document\.addEventListener\('keydown', handleTabListKeydown\)/);
});
