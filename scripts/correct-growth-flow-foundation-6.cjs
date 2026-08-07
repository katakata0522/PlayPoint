'use strict';

const fs = require('node:fs');
const path = require('node:path');

const target = path.resolve(__dirname, '..', 'tests', 'playpoint-regression.test.cjs');
let source = fs.readFileSync(target, 'utf8');

const oldText = `  const logic = fs.readFileSync(path.join(root, 'js', 'points-cost.js'), 'utf8');
  assert.ok(logic.includes("points_cost_calculation_completed"), '計算完了イベントがありません');
  assert.ok(logic.includes("PlayPointConsent.getStatus() !== 'granted'"), '同意前に計測しない制御がありません');
  assert.ok(logic.includes("Math.ceil"), '必要額を不足しない側へ丸める処理がありません');`;

const newText = `  const logic = fs.readFileSync(path.join(root, 'js', 'points-cost.js'), 'utf8');
  const analytics = fs.readFileSync(path.join(root, 'js', 'analytics.js'), 'utf8');
  assert.ok(logic.includes("points_cost_calculation_completed"), '計算完了イベントがありません');
  assert.ok(logic.includes("import('/js/analytics.js')"), '共通Analyticsを利用していません');
  assert.ok(analytics.includes("target.PlayPointConsent.getStatus() === 'granted'"), '共通Analyticsに同意判定がありません');
  assert.ok(analytics.includes('if (!this.hasConsent())'), '同意前のイベントを拒否していません');
  assert.ok(logic.includes("Math.ceil"), '必要額を不足しない側へ丸める処理がありません');`;

const count = source.split(oldText).length - 1;
if (count !== 1) throw new Error(`points-cost consent regression block: expected exactly one match, found ${count}`);
source = source.replace(oldText, newText);
fs.writeFileSync(target, source, 'utf8');
console.log('Points-cost consent regression moved to shared analytics checks.');
