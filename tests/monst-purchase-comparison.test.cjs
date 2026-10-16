'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { compareMonstPurchases } = require('../js/monst-purchase-comparison.js');
const { renderMonstComparison } = require('../scripts/monst-purchase-comparison.cjs');
const { GAME_SEO } = require('../scripts/game-seo-data.cjs');
const data = GAME_SEO.monst;
const config = { price: data.appStoreReference.price, appOrbs: data.appStoreReference.orbs, webOrbs: data.webStore.orbs, monthlyOrbs: data.monthlyWebStore.orbs };

test('使わない特典は0円とし、月イチ購入枠がない時は通常Webだけを比較対象にする', () => {
  assert.deepEqual(compareMonstPurchases(config, 0, 0, false).winners, ['Web通常']);
  assert.deepEqual(compareMonstPurchases(config, 0, 0, true).winners, ['Web月イチ']);
  assert.equal(compareMonstPurchases(config, 0, 0, false).rows.length, 2);
});
test('受取個数と、特典を使い切った場合の比較単価を混同しない', () => {
  const result = compareMonstPurchases(config, 700, 0, false);
  assert.deepEqual(result.winners, ['Google Play']);
  assert.equal(result.rows[0].orbs, 180);
  assert.ok(Math.abs(result.rows[0].unit - 9300 / 180) < 1e-9);
  assert.deepEqual(compareMonstPurchases(config, 700, 0, true).winners, ['Web月イチ']);
});
test('月イチとの分岐点とWeb側還元による移動を、丸め前の値で判定する', () => {
  assert.deepEqual(compareMonstPurchases(config, 1000, 0, true).winners, ['Google Play', 'Web月イチ']);
  assert.deepEqual(compareMonstPurchases(config, 1000, 200, true).winners, ['Web月イチ']);
  assert.deepEqual(compareMonstPurchases(config, 1180, 200, true).winners, ['Google Play', 'Web月イチ']);
  assert.deepEqual(compareMonstPurchases(config, 999.99, 0, true).winners, ['Web月イチ']);
  assert.deepEqual(compareMonstPurchases(config, 1000.01, 0, true).winners, ['Google Play']);
});
test('不正な特典価値で結論を出さず、100%相当の価値も非負の単価にする', () => {
  for (const invalid of [-1, NaN, Infinity, 10000.01, '700', null]) {
    assert.throws(() => compareMonstPurchases(config, invalid, 0, true), RangeError);
    assert.throws(() => compareMonstPurchases(config, 0, invalid, true), RangeError);
  }
  assert.equal(compareMonstPurchases(config, 10000, 0, true).rows[0].unit, 0);
  assert.throws(() => compareMonstPurchases({ ...config, appOrbs: 0 }, 0, 0, true), TypeError);
});
test('台帳の確認済み商品だけを描画し、異なる予算の商品へ黙って流用しない', () => {
  const html = renderMonstComparison(data);
  for (const value of [config.appOrbs, config.webOrbs, config.monthlyOrbs]) assert.ok(html.includes(value + '個'));
  assert.throws(() => renderMonstComparison({ ...data, webStore: { ...data.webStore, price: 12000 } }));
});
