'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const sandbox = {
  window: { __TEST_ENV__: true },
  document: { readyState: 'loading', addEventListener() {} },
  console
};
vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../games/game-sim.js'), 'utf8'), sandbox);
const { calculateGamePoints: calculate, getInputLimits, localeConfigs } = sandbox.window.PP_GAME_SIM_TEST;

for (const [lang, cfg] of Object.entries(localeConfigs)) {
  test(`${lang}: 通貨別の0・小数・上限と通常獲得率を保持する`, () => {
    const max = getInputLimits(cfg).amount;
    for (const amount of [0, .01, 1000, max - .01, max]) {
      const result = calculate(amount, 3, 1, cfg);
      assert.equal(result.valid, true, String(amount));
      assert.equal(result.points, Math.round(amount / cfg.unitSpend * 3));
    }
    assert.equal(calculate(1000, 1, 2, cfg).rate, 2, '低い特別獲得率で通常率を下げない');
  });
  test(`${lang}: 負数・空・部分一致・非有限値・過大値を正常な0に見せない`, () => {
    for (const amount of [-1, '', ' ', null, false, '100bad', '0x10', '1e308', Infinity, -Infinity, NaN, getInputLimits(cfg).amount + .01]) {
      const result = calculate(amount, 3, 1, cfg);
      assert.equal(result.valid, false, String(amount));
      assert.equal(result.error.field, 'amount');
      assert.equal(result.points, undefined);
    }
  });
  test(`${lang}: 購入回数は1〜999の整数だけを受理する`, () => {
    for (const count of [1, 2, 999]) {
      const result = calculate(100 * count, 3, 1, cfg, { purchaseCount: count, amountPerPurchase: 100 });
      assert.equal(result.valid, true);
      assert.equal(result.points, Math.round(100 / cfg.unitSpend * 3) * count);
    }
    for (const count of [-1, 0, '', 1.2, '2abc', 1000, 1e308, Infinity]) {
      const result = calculate(1000, 3, 1, cfg, { purchaseCount: count });
      assert.equal(result.valid, false, String(count));
      assert.equal(result.error.field, 'count');
    }
  });
  test(`${lang}: 任意対象額の未入力と明示0を区別し、不正な対象額は拒否する`, () => {
    for (const eligible of [undefined, null, '', ' ']) {
      const result = calculate(1000, 3, 1, cfg, { eligibleAmountPerPurchase: eligible });
      assert.equal(result.valid, true);
      assert.equal(result.usesEligibleAmount, false);
    }
    assert.equal(calculate(1000, 3, 1, cfg, { eligibleAmountPerPurchase: 0 }).points, 0);
    for (const eligible of [-1, 1001, '500abc', '1e308', Infinity]) {
      const result = calculate(1000, 3, 1, cfg, { eligibleAmountPerPurchase: eligible });
      assert.equal(result.valid, false);
      assert.equal(result.error.field, 'eligible');
    }
  });
}

test('獲得率・パック単価・合計の不整合を無言で補正しない', () => {
  const cfg = localeConfigs.ja;
  for (const rate of ['', 0, -1, '1abc', Infinity, 101]) assert.equal(calculate(1000, rate, 1, cfg).valid, false);
  for (const status of ['', 0, -1, '1abc', Infinity, 101]) assert.equal(calculate(1000, 1, status, cfg).valid, false);
  assert.equal(calculate(1000, 3, 1, cfg, { amountPerPurchase: -1 }).valid, false);
  assert.equal(calculate(1000, 3, 1, cfg, { amountPerPurchase: 500, purchaseCount: 1 }).valid, false);
  assert.equal(calculate(0.3, 3, 1, cfg, { amountPerPurchase: 0.1, purchaseCount: 3 }).valid, true);
});
