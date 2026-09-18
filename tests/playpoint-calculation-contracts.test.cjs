const assert = require('assert');
const {
  createOption,
  createSelect,
  createInput,
  loadCalculatorContext,
  test,
} = require('./helpers/playpoint-calculator-test-context.cjs');

test('ステータス選択の初期値はブロンズになる', () => {
  const { PP_STATE, populateStatusSelects } = loadCalculatorContext();
  PP_STATE.currentRegion = 'JP';
  PP_STATE.dom.currentStatus = createSelect();
  PP_STATE.dom.reverseStatus = createSelect();

  populateStatusSelects();

  assert.strictEqual(PP_STATE.dom.currentStatus.value, '1');
  assert.strictEqual(PP_STATE.dom.reverseStatus.value, '1');
});

test('通常計算の目標候補は現在ランクから進める有効なランクを含む', () => {
  const { PP_STATE, PP_REGION_CONFIGS, updateBaseRateAndTarget } = loadCalculatorContext();
  PP_STATE.currentRegion = 'JP';
  PP_STATE.dom.currentStatus = createSelect();
  PP_STATE.dom.currentStatus.value = '1';
  PP_STATE.dom.baseRate = createInput();
  PP_STATE.dom.targetStatus = createSelect();
  PP_STATE.dom.neededPoints = createInput();

  updateBaseRateAndTarget();

  const config = PP_REGION_CONFIGS.JP;
  const labels = PP_STATE.dom.targetStatus.options.map(option => option.dataset.statusLabel);
  const allowedTargets = new Set(config.statusPointsMapping[1] || []);

  assert.ok(labels.includes('シルバー'));
  assert.strictEqual(new Set(labels).size, labels.length);
  assert.ok(labels.every(label => allowedTargets.has(label)));
  assert.strictEqual(PP_STATE.dom.neededPoints.max, String(config.thresholds['シルバー']));
  assert.strictEqual(PP_STATE.dom.neededPoints.placeholder, '例：250');
});

test('日本語のゴールド→プラチナ必要ポイント例は1728を維持する', () => {
  const { PP_STATE, updateBaseRateAndTarget, updateNeededPointsConstraint } = loadCalculatorContext();
  PP_STATE.currentRegion = 'JP';
  PP_STATE.dom.currentStatus = createSelect();
  PP_STATE.dom.currentStatus.value = '1.5';
  PP_STATE.dom.baseRate = createInput();
  PP_STATE.dom.targetStatus = createSelect();
  PP_STATE.dom.neededPoints = createInput();

  updateBaseRateAndTarget();

  const goldIndex = PP_STATE.dom.targetStatus.options.findIndex(option => option.dataset.statusLabel === 'ゴールド');
  const platinumIndex = PP_STATE.dom.targetStatus.options.findIndex(option => option.dataset.statusLabel === 'プラチナ');
  assert.ok(goldIndex >= 0);
  assert.ok(platinumIndex >= 0);

  PP_STATE.dom.targetStatus.selectedIndex = goldIndex;
  updateNeededPointsConstraint();
  assert.strictEqual(PP_STATE.dom.neededPoints.placeholder, '例：250');

  PP_STATE.dom.targetStatus.selectedIndex = platinumIndex;
  updateNeededPointsConstraint();
  assert.strictEqual(PP_STATE.dom.neededPoints.max, '4000');
  assert.strictEqual(PP_STATE.dom.neededPoints.placeholder, '例：1728');
});

test('前年からランクを引き継いだ場合も目標閾値全体を入力できる', () => {
  const { PP_REGION_CONFIGS, getMaxNeededPointsForTarget } = loadCalculatorContext();
  const config = PP_REGION_CONFIGS.JP;

  assert.strictEqual(getMaxNeededPointsForTarget(config, 1.5, 4000), 4000);
  assert.strictEqual(getMaxNeededPointsForTarget(config, 1.75, 15000), 15000);
  assert.strictEqual(getMaxNeededPointsForTarget(config, 1.5, 1000), 1000);
});

test('通常獲得率と特別獲得率は高い方を使い、ランク率へ掛け算しない', () => {
  const { PP_STATE, getRateDetails } = loadCalculatorContext();
  PP_STATE.currentRegion = 'JP';
  const status = createInput('1.5');

  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(getRateDetails(createInput('4'), status, createInput('2')))),
    {
      directRate: 4,
      multiplier: 2,
      promotionRate: 2,
      multipliedRate: 2,
      finalRate: 4,
      source: 'direct'
    }
  );
  assert.strictEqual(getRateDetails(createInput('1.5'), status, createInput('3')).finalRate, 3);
  assert.strictEqual(getRateDetails(createInput('1.5'), status, createInput('3')).source, 'multiplier');
  assert.strictEqual(getRateDetails(createInput('2'), status, createInput('2')).source, 'same');
});

test('通常計算は購入ごとの丸めを仮定しない概算として表示する', () => {
  const { PP_STATE, populateStatusSelects, updateBaseRateAndTarget, calculate, renderedResults, renderedResultDetails } = loadCalculatorContext();
  PP_STATE.currentRegion = 'US';
  PP_STATE.dom.currentStatus = createSelect();
  PP_STATE.dom.reverseStatus = createSelect();
  PP_STATE.dom.baseRate = createInput();
  PP_STATE.dom.targetStatus = createSelect();
  PP_STATE.dom.neededPoints = createInput('6');
  PP_STATE.dom.multiplier = createInput('1');
  PP_STATE.dom.result = { dataset: {}, innerHTML: '', isError: false };

  populateStatusSelects();
  PP_STATE.dom.currentStatus.value = '1.1';
  updateBaseRateAndTarget();
  calculate();

  const content = renderedResults[0].content;
  assert.strictEqual(renderedResults[0].isError, false);
  assert.ok(content.includes('data-value="6"'));
  assert.ok(content.includes('does not apply purchase-by-purchase point rounding'));
  assert.ok(!content.includes('Enter an average amount per purchase'));
});

test('逆算モードは入力額を1回の購入として丸める前提を表示する', () => {
  const { PP_STATE, reverseCalculate, renderedResults } = loadCalculatorContext();
  PP_STATE.currentRegion = 'US';
  PP_STATE.dom.amountYen = createInput('10');
  PP_STATE.dom.reverseBaseRate = createInput('1.1');
  PP_STATE.dom.reverseStatus = createInput('1.1');
  PP_STATE.dom.reverseMultiplier = createInput('1');
  PP_STATE.dom.reverseResult = { dataset: {}, innerHTML: '', isError: false };

  reverseCalculate();

  const content = renderedResults[0].content;
  assert.strictEqual(renderedResults[0].isError, false);
  assert.ok(content.includes('data-value="11"'));
  assert.ok(content.includes('rounded as one purchase'));
});

test('金曜の開始時刻を過ぎたカレンダー登録は翌週を使う', () => {
  const { getNextFridayCalendarWindow } = loadCalculatorContext();

  assert.strictEqual(
    getNextFridayCalendarWindow(false, new Date('2026-07-24T00:30:00Z')).start,
    '20260724T010000Z'
  );
  assert.strictEqual(
    getNextFridayCalendarWindow(false, new Date('2026-07-24T01:30:00Z')).start,
    '20260731T010000Z'
  );
  assert.strictEqual(
    getNextFridayCalendarWindow(true, new Date('2026-07-24T14:30:00Z')).start,
    '20260731T140000Z'
  );
});

test('月平均の分母は年末までの残日数から切り上げ月数で計算する', () => {
  const { getRemainingMonths } = loadCalculatorContext();

  assert.strictEqual(getRemainingMonths(new Date(2026, 0, 1)), 12);
  assert.strictEqual(getRemainingMonths(new Date(2026, 4, 31)), 8);
  assert.strictEqual(getRemainingMonths(new Date(2026, 11, 31)), 0);
});

test('12月31日でも通常計算は合計必要額を表示する', () => {
  class FakeDate extends Date {
    constructor(...args) {
      if (args.length === 0) return new Date(2026, 11, 31);
      return new Date(...args);
    }
  }
  FakeDate.UTC = Date.UTC;
  FakeDate.parse = Date.parse;
  FakeDate.now = () => new Date(2026, 11, 31).getTime();

  const { PP_STATE, populateStatusSelects, updateBaseRateAndTarget, calculate, renderedResults } = loadCalculatorContext(FakeDate);
  PP_STATE.currentRegion = 'JP';
  PP_STATE.dom.currentStatus = createSelect();
  PP_STATE.dom.reverseStatus = createSelect();
  PP_STATE.dom.baseRate = createInput();
  PP_STATE.dom.targetStatus = createSelect();
  PP_STATE.dom.neededPoints = createInput('250');
  PP_STATE.dom.multiplier = createInput('1');
  PP_STATE.dom.result = { dataset: {}, innerHTML: '', isError: false };

  populateStatusSelects();
  updateBaseRateAndTarget();
  calculate();

  assert.strictEqual(renderedResults[0].isError, false);
  assert.ok(renderedResults[0].content.includes('data-value="25000"'));
  assert.ok(!renderedResults[0].content.includes('/月'));
});

test('必要ポイントはHTMLの整数制約に違反する小数を拒否する', () => {
  const { PP_STATE, populateStatusSelects, updateBaseRateAndTarget, calculate, renderedResults } = loadCalculatorContext();
  PP_STATE.currentRegion = 'JP';
  PP_STATE.dom.currentStatus = createSelect();
  PP_STATE.dom.reverseStatus = createSelect();
  PP_STATE.dom.baseRate = createInput();
  PP_STATE.dom.targetStatus = createSelect();
  PP_STATE.dom.neededPoints = createInput('1.5');
  PP_STATE.dom.neededPoints.step = '1';
  PP_STATE.dom.neededPoints.validity = { valid: false, stepMismatch: true };
  PP_STATE.dom.multiplier = createInput('1');
  PP_STATE.dom.result = { dataset: {}, innerHTML: '', isError: false };

  populateStatusSelects();
  updateBaseRateAndTarget();
  calculate();

  assert.strictEqual(renderedResults[0].isError, true);
  assert.ok(renderedResults[0].content.includes('有効な数値'));
});

test('通常計算は主要結果と折りたたみ詳細を分け、週平均と年末までの残り日数を表示しない', () => {
  class FakeDate extends Date {
    constructor(...args) {
      if (args.length === 0) return new Date(2026, 0, 1);
      return new Date(...args);
    }
  }
  FakeDate.UTC = Date.UTC;
  FakeDate.parse = Date.parse;
  FakeDate.now = () => new Date(2026, 0, 1).getTime();

  const { PP_STATE, populateStatusSelects, updateBaseRateAndTarget, calculate, renderedResults, renderedResultDetails } = loadCalculatorContext(FakeDate);
  PP_STATE.currentRegion = 'JP';
  PP_STATE.dom.currentStatus = createSelect();
  PP_STATE.dom.reverseStatus = createSelect();
  PP_STATE.dom.baseRate = createInput();
  PP_STATE.dom.targetStatus = createSelect();
  PP_STATE.dom.neededPoints = createInput('250');
  PP_STATE.dom.multiplier = createInput('1');
  PP_STATE.dom.result = { dataset: {}, innerHTML: '', isError: false };

  populateStatusSelects();
  updateBaseRateAndTarget();
  calculate();

  assert.strictEqual(renderedResults[0].isError, false);
  assert.ok(renderedResults[0].content.includes('合計の必要課金額目安'));
  assert.ok(!renderedResults[0].content.includes('月平均目安'));
  assert.ok(!renderedResults[0].content.includes('1日あたり目安'));
  assert.strictEqual(renderedResultDetails.length, 1);
  assert.ok(renderedResultDetails[0].includes('<details'));
  assert.ok(renderedResultDetails[0].includes('計算の詳細を見る'));
  assert.ok(renderedResultDetails[0].includes('月平均目安'));
  assert.ok(renderedResultDetails[0].includes('1日あたり目安'));
  assert.ok(!renderedResultDetails[0].includes('週平均目安'));
  assert.ok(!renderedResultDetails[0].includes('年末までの残り日数'));
  assert.ok(renderedResultDetails[0].includes('data-value="2084"'));
  assert.ok(renderedResultDetails[0].includes('data-value="69"'));
});

test('必要ポイントの説明も削除した週平均を案内しない', () => {
  const { PP_REGION_CONFIGS: configs } = loadCalculatorContext();
  const disallowed = {
    JP: '月・週・日',
    US: 'weekly',
    KR: '월·주·일',
    TW: '月、週、日'
  };

  for (const [region, phrase] of Object.entries(disallowed)) {
    assert.ok(!configs[region].tooltips['tooltip-needed-points'].includes(phrase), region);
  }
});

test('ステータス選択の再生成で設定済みランクが重複しない', () => {
  const { PP_STATE, PP_REGION_CONFIGS, populateStatusSelects } = loadCalculatorContext();
  PP_STATE.currentRegion = 'JP';
  PP_STATE.dom.currentStatus = createSelect();
  PP_STATE.dom.reverseStatus = createSelect();

  populateStatusSelects();
  populateStatusSelects();

  const expectedCount = Object.keys(PP_REGION_CONFIGS.JP.statuses).length;
  for (const select of [PP_STATE.dom.currentStatus, PP_STATE.dom.reverseStatus]) {
    const values = select.options.map(option => String(option.value));
    assert.strictEqual(values.length, expectedCount);
    assert.strictEqual(new Set(values).size, expectedCount);
  }
});

test('ステータス変更時は維持と有効な昇格先だけを重複なく提示する', () => {
  const { PP_STATE, PP_REGION_CONFIGS, updateBaseRateAndTarget } = loadCalculatorContext();
  PP_STATE.currentRegion = 'JP';
  PP_STATE.dom.currentStatus = createSelect();
  PP_STATE.dom.baseRate = createInput();
  PP_STATE.dom.targetStatus = createSelect();
  PP_STATE.dom.neededPoints = createInput();

  const config = PP_REGION_CONFIGS.JP;
  const assertTargets = (currentValue, requiredLabels) => {
    PP_STATE.dom.currentStatus.value = String(currentValue);
    updateBaseRateAndTarget();

    const labels = PP_STATE.dom.targetStatus.options.map(option => option.dataset.statusLabel);
    const currentLabel = Object.keys(config.statuses).find(label => config.statuses[label] === currentValue);
    const allowed = new Set([
      ...(currentValue > 1 && currentLabel ? [currentLabel] : []),
      ...(config.statusPointsMapping[currentValue] || [])
    ]);

    for (const label of requiredLabels) assert.ok(labels.includes(label), `${currentValue}: ${label}`);
    assert.strictEqual(new Set(labels).size, labels.length);
    assert.ok(labels.every(label => allowed.has(label)));
  };

  assertTargets(1.5, ['ゴールド', 'プラチナ']);
  assert.strictEqual(PP_STATE.dom.neededPoints.max, '1000');

  assertTargets(2, ['ダイヤモンド']);
  assert.strictEqual(PP_STATE.dom.neededPoints.max, '15000');
});

test('韓国（KR）リージョンの spendUnit 正確性検証', () => {
  const { PP_STATE, reverseCalculate, renderedResults } = loadCalculatorContext();
  PP_STATE.currentRegion = 'KR';

  PP_STATE.dom.amountYen = createInput('10000');
  PP_STATE.dom.reverseStatus = createSelect();
  PP_STATE.dom.reverseStatus.value = '1';
  PP_STATE.dom.reverseBaseRate = createInput('1.0');
  PP_STATE.dom.reverseMultiplier = createInput('1');
  PP_STATE.dom.reverseResult = { dataset: {}, innerHTML: '', isError: false };

  reverseCalculate();

  assert.ok(renderedResults[0].content.includes('data-value="10"'), `Expected 10pt for 10000 KRW, got: ${renderedResults[0].content}`);
});

test('通常計算はパック額なしの必要額概算だけを返す', () => {
  const { PP_STATE, calculate, renderedResults } = loadCalculatorContext();
  PP_STATE.currentRegion = 'JP';
  PP_STATE.dom.currentStatus = createSelect();
  PP_STATE.dom.currentStatus.value = '1.5';
  PP_STATE.dom.baseRate = createInput('1.5');
  PP_STATE.dom.targetStatus = createSelect();
  const option2 = createOption('プラチナ', 4000);
  option2.dataset.statusLabel = 'プラチナ';
  PP_STATE.dom.targetStatus.add(option2);
  PP_STATE.dom.neededPoints = createInput('300');
  PP_STATE.dom.multiplier = createInput('1');
  PP_STATE.dom.result = { dataset: {}, innerHTML: '', isError: false };

  calculate();

  assert.ok(renderedResults[0].content.includes('data-value="20000"'), '300ptはゴールド1.5pt/100円で20,000円になること');
  assert.ok(!renderedResults[0].content.includes('必要購入パック数'));
});

test('通常還元と特別獲得率の差額は必要額概算で比較する', () => {
  const { computeRateComparison } = loadCalculatorContext();
  const comparison = computeRateComparison({
    neededPoints: 100,
    selectedRate: 2,
    baseRate: 1,
    spendUnit: 100
  });
  assert.deepEqual(
    JSON.parse(JSON.stringify(comparison)),
    { baseAmount: 10000, selectedAmount: 5000, savedAmount: 5000 }
  );
});

test('computeMainResultはパック額を使わず必要額だけを返す', () => {
  const { computeMainResult } = loadCalculatorContext();
  const result = computeMainResult({
    neededPoints: 12,
    finalRate: 1.1,
    spendUnit: 1,
    baseDate: new Date(2026, 6, 10)
  });

  assert.strictEqual(result.packsNeeded, undefined);
  assert.strictEqual(result.totalAmountNeeded, 11);
});
