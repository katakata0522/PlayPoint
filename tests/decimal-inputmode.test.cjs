'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

function inputTagById(html, id) {
  const match = html.match(new RegExp(`<input\\b[^>]*\\bid="${id}"[^>]*>`, 'i'));
  assert.ok(match, `missing input#${id}`);
  return match[0];
}

test('fractional spending inputs request a decimal mobile keyboard in every calculator locale', () => {
  for (const relativePath of ['index.html', 'en/index.html', 'ko/index.html', 'tw/index.html']) {
    const html = read(relativePath);
    const amountInput = inputTagById(html, 'amountYen');

    assert.match(amountInput, /type="number"/i, `${relativePath}: amountYen must remain a number input`);
    assert.match(amountInput, /step="0\.01"/i, `${relativePath}: amountYen must keep fractional step support`);
    assert.match(amountInput, /inputmode="decimal"/i, `${relativePath}: amountYen should request a decimal keyboard`);
  }
});

test('integer-only points input keeps the numeric keyboard hint', () => {
  for (const relativePath of ['index.html', 'en/index.html', 'ko/index.html', 'tw/index.html']) {
    const html = read(relativePath);
    const pointsInput = inputTagById(html, 'neededPoints');

    assert.match(pointsInput, /step="1"/i, `${relativePath}: neededPoints must remain integer-only`);
    assert.match(pointsInput, /inputmode="numeric"/i, `${relativePath}: neededPoints should keep the numeric keyboard`);
  }
});
