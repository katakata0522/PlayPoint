'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function preprocessESM(code) {
  return code
    .replace(/^import\s*'[^']+';\s*$/gm, '')
    .replace(/import\s*\{\s*([^}]+)\s*\}\s*from\s*'[^']+'\s*;/g, (match, imports) => {
      const names = imports.split(',').map(value => value.trim());
      const needed = names.filter(name => name === 'UI' || name === 'SHARE');
      return needed.length ? `var { ${needed.join(', ')} } = PP_APP;` : '';
    })
    .replace(/^export\s+/gm, '');
}

function loadGetValidNumberInput() {
  const context = { console, __TEST_ENV__: true, Option: class Option {} };
  context.window = context;
  vm.createContext(context);
  const code = [
    fs.readFileSync(path.join(root, 'js/analytics-core.js'), 'utf8'),
    preprocessESM(fs.readFileSync(path.join(root, 'js/config.js'), 'utf8')),
    'PP_APP.UI = {}; PP_APP.SHARE = {};',
    preprocessESM(fs.readFileSync(path.join(root, 'js/calculator.js'), 'utf8')),
    'globalThis.__getValidNumberInput = PP_APP.CALC.getValidNumberInput.bind(PP_APP.CALC);'
  ].join('\n');
  vm.runInContext(code, context, { filename: 'calculator-validation-bundle.js' });
  return context.__getValidNumberInput;
}

function input(value, { min, max, valid = true } = {}) {
  return {
    value: String(value),
    min,
    max,
    validity: { valid }
  };
}

const getValidNumberInput = loadGetValidNumberInput();

test('有限な範囲内入力だけを計算値として受け入れる', () => {
  assert.equal(getValidNumberInput(input('5', { min: '1', max: '10' })), 5);
  assert.equal(getValidNumberInput(input('1', { min: '1', max: '10' })), 1);
  assert.equal(getValidNumberInput(input('10', { min: '1', max: '10' })), 10);

  assert.equal(getValidNumberInput(input('0', { min: '1', max: '10' })), null);
  assert.equal(getValidNumberInput(input('11', { min: '1', max: '10' })), null);
  assert.equal(getValidNumberInput(input('Infinity', { min: '1', max: '10' })), null);
  assert.equal(getValidNumberInput(input('NaN', { min: '1', max: '10' })), null);
});

test('HTML validity違反は数値に変換できても計算へ渡さない', () => {
  assert.equal(getValidNumberInput(input('5', { min: '1', max: '10', valid: false })), null);
});

test('呼び出し側の制約とHTML属性の厳しい方を採用する', () => {
  assert.equal(getValidNumberInput(input('5', { min: '3', max: '8' }), 1, 10), 5);
  assert.equal(getValidNumberInput(input('2', { min: '3', max: '8' }), 1, 10), null);
  assert.equal(getValidNumberInput(input('9', { min: '3', max: '8' }), 1, 10), null);
  assert.equal(getValidNumberInput(input('4', { min: '1', max: '10' }), 5, 7), null);
  assert.equal(getValidNumberInput(input('6', { min: '1', max: '10' }), 5, 7), 6);
  assert.equal(getValidNumberInput(input('8', { min: '1', max: '10' }), 5, 7), null);
});
