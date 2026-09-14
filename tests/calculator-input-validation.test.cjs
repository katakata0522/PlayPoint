'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { loadCalculatorContext } = require('./helpers/playpoint-calculator-test-context.cjs');

function input(value, { min, max, valid = true } = {}) {
  return {
    value: String(value),
    min,
    max,
    validity: { valid }
  };
}

const { getValidNumberInput } = loadCalculatorContext();

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
