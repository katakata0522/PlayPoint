'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { mapWithConcurrency, retry } = require('../.github/scripts/http-check-utils.cjs');

test('mapWithConcurrencyは指定した同時実行数を超えず入力順を保持する', async () => {
  let active = 0;
  let maximumActive = 0;

  const results = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (value) => {
    active += 1;
    maximumActive = Math.max(maximumActive, active);
    await new Promise(resolve => setTimeout(resolve, 5));
    active -= 1;
    return value * 10;
  });

  assert.ok(maximumActive <= 2);
  assert.deepStrictEqual(results.map(result => result.value), [10, 20, 30, 40, 50]);
});

test('mapWithConcurrencyは一件の失敗後も残りを検査する', async () => {
  const visited = [];
  const results = await mapWithConcurrency([1, 2, 3], 2, async (value) => {
    visited.push(value);
    if (value === 2) throw new Error('expected failure');
    return value;
  });

  assert.deepStrictEqual([...visited].sort(), [1, 2, 3]);
  assert.strictEqual(results[1].status, 'rejected');
  assert.strictEqual(results[2].status, 'fulfilled');
});

test('retryは失敗対象だけを指定回数まで再試行する', async () => {
  let attempts = 0;
  const result = await retry(async () => {
    attempts += 1;
    if (attempts < 3) throw new Error('temporary failure');
    return 'ok';
  }, { attempts: 3, delayMs: 0 });

  assert.strictEqual(result, 'ok');
  assert.strictEqual(attempts, 3);
});
