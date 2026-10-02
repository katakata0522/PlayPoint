const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  root,
  createInput,
  createSelect,
  loadCalculatorContext,
  test,
} = require('./helpers/playpoint-calculator-test-context.cjs');

test('入力した必要ポイントを自動的に差し引かず、そのまま必要額へ換算する', () => {
  // ランク率・閾値の設定整合とは別に、入力10ptの換算額を既知値で確認する。
  for (const [region, expectedAmount] of Object.entries({JP: 1000, US: 10, KR: 10000, TW: 300})) {
    const {PP_STATE, populateStatusSelects, updateBaseRateAndTarget, calculate, renderedResults} = loadCalculatorContext();
    PP_STATE.currentRegion = region;
    PP_STATE.dom.currentStatus = createSelect();
    PP_STATE.dom.reverseStatus = createSelect();
    PP_STATE.dom.targetStatus = createSelect();
    PP_STATE.dom.baseRate = createInput();
    PP_STATE.dom.neededPoints = createInput('10');
    PP_STATE.dom.multiplier = createInput('1');
    PP_STATE.dom.result = {dataset: {}};
    populateStatusSelects();
    updateBaseRateAndTarget();
    calculate();
    assert.strictEqual(renderedResults[0].isError, false, region);
    assert.strictEqual(PP_STATE.dom.result.dataset.requiredYen, expectedAmount, region);
    assert.ok(renderedResults[0].content.includes('data-value="10"'), region + ': input points stay unchanged');
  }
});

test('公開LPは削除済みのウィークリーリワード差し引き操作を案内しない', () => {
  const publicPages = [
    'status/platinum/index.html',
    'maintenance/platinum/index.html',
    'maintenance/diamond/index.html'
  ];

  for (const relativePath of publicPages) {
    const html = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.doesNotMatch(html, /差し引き設定|差し引く設定|差し引く前|週次リワード差し引き|リワード見込みを差し引く/, relativePath);
  }
});
