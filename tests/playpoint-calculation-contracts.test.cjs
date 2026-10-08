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

test('目標変更後の必要ポイント例は選択中の上限内の整数になる', () => {
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
  function assertValidExample() {
    const examples = PP_STATE.dom.neededPoints.placeholder.match(/[-+]?\d[\d,.]*/g) || [];
    assert.strictEqual(examples.length, 1, '入力例には1つの数値を示す');
    const example = Number(examples[0].replaceAll(',', ''));
    assert.ok(Number.isInteger(example), '入力例には整数を示す');
    assert.ok(example >= 0 && example <= Number(PP_STATE.dom.neededPoints.max));
  }
  assert.strictEqual(PP_STATE.dom.neededPoints.max, '1000');
  assertValidExample();

  PP_STATE.dom.targetStatus.selectedIndex = platinumIndex;
  updateNeededPointsConstraint();
  assert.strictEqual(PP_STATE.dom.neededPoints.max, '4000');
  assertValidExample();
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

  const direct = getRateDetails(createInput('4'), status, createInput('2'));
  assert.strictEqual(direct.finalRate, 4);
  assert.strictEqual(direct.source, 'direct');
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

test('税抜対象額の指定・空欄・0と支払額の保持を各地域で確認する', () => {
  for (const region of ['JP', 'US', 'KR', 'TW']) {
    const { PP_STATE, PP_REGION_CONFIGS, reverseCalculate, renderedResults } = loadCalculatorContext();
    const config = PP_REGION_CONFIGS[region];
    const rate = config.statusRates[1];
    PP_STATE.currentRegion = region;
    Object.assign(PP_STATE.dom, {
      amountYen: createInput('1000'), reverseEligibleAmount: createInput('909'),
      reverseBaseRate: createInput(rate), reverseStatus: createInput('1'),
      reverseMultiplier: createInput('1'), reverseResult: { dataset: {} }
    });
    reverseCalculate();
    assert.strictEqual(renderedResults.at(-1).isError, false);
    assert.strictEqual(Number(PP_STATE.dom.reverseResult.dataset.earnedPoints), Math.round(909 / config.spendUnit * rate));
    assert.strictEqual(PP_STATE.dom.reverseResult.dataset.amountYen, 1000);
    assert.ok(renderedResults.at(-1).content.includes(config.uiText.resultBasisEligible));
    assert.ok(!renderedResults.at(-1).content.includes(config.uiText.pointsBasisNote), '長い共通説明を繰り返さない');
    PP_STATE.dom.reverseEligibleAmount.value = '';
    reverseCalculate();
    assert.strictEqual(Number(PP_STATE.dom.reverseResult.dataset.earnedPoints), Math.round(1000 / config.spendUnit * rate));
    assert.ok(renderedResults.at(-1).content.includes(config.uiText.resultBasisEstimate));
    PP_STATE.dom.reverseEligibleAmount.value = '0';
    reverseCalculate();
    assert.strictEqual(PP_STATE.dom.reverseResult.dataset.earnedPoints, '0');
  }
});

test('不正な対象額は概算に戻さず入力エラーにする', () => {
  for (const value of ['-1', '1001', 'invalid', 'Infinity']) {
    const { PP_STATE, reverseCalculate, renderedResults } = loadCalculatorContext();
    PP_STATE.currentRegion = 'JP';
    Object.assign(PP_STATE.dom, {
      amountYen: createInput('1000'), reverseEligibleAmount: createInput(value),
      reverseBaseRate: createInput('1'), reverseStatus: createInput('1'),
      reverseMultiplier: createInput('1'), reverseResult: { dataset: {} }
    });
    reverseCalculate();
    assert.strictEqual(renderedResults.at(-1).isError, true);
    assert.match(renderedResults.at(-1).content, /0〜支払額/);
  }
  const { PP_STATE, reverseCalculate, renderedResults } = loadCalculatorContext();
  PP_STATE.currentRegion = 'JP';
  Object.assign(PP_STATE.dom, {
    amountYen: createInput('1000'), reverseEligibleAmount: { value: '', validity: { badInput: true, valid: false } },
    reverseBaseRate: createInput('1'), reverseStatus: createInput('1'),
    reverseMultiplier: createInput('1'), reverseResult: { dataset: {} }
  });
  reverseCalculate();
  assert.strictEqual(renderedResults.at(-1).isError, true);
});

test('月平均の分母は当月を含む残り月数を使い、12月31日は表示を省く', () => {
  const { getRemainingMonths } = loadCalculatorContext();

  assert.strictEqual(getRemainingMonths(new Date(2026, 0, 1)), 12);
  assert.strictEqual(getRemainingMonths(new Date(2026, 4, 1)), 8);
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

function setupJpMain(neededValue) {
  const ctx = loadCalculatorContext();
  const { PP_STATE, populateStatusSelects, updateBaseRateAndTarget } = ctx;
  PP_STATE.currentRegion = 'JP';
  PP_STATE.dom.currentStatus = createSelect();
  PP_STATE.dom.reverseStatus = createSelect();
  PP_STATE.dom.baseRate = createInput();
  PP_STATE.dom.targetStatus = createSelect();
  PP_STATE.dom.neededPoints = createInput(neededValue);
  PP_STATE.dom.neededPoints.step = '1';
  PP_STATE.dom.multiplier = createInput('1');
  PP_STATE.dom.result = { dataset: {}, innerHTML: '', isError: false };
  populateStatusSelects();
  updateBaseRateAndTarget();
  return ctx;
}

test('必要ポイントの空欄は課金不要にせず入力エラーにする', () => {
  const { calculate, renderedResults } = setupJpMain('');
  calculate();
  assert.strictEqual(renderedResults[0].isError, true);
  assert.match(renderedResults[0].content, /0以上の整数/);
  assert.ok(!renderedResults[0].content.includes('課金不要'));
});

test('必要ポイント0は達成済みとして課金不要を出す', () => {
  const { PP_STATE, calculate, renderedResults, renderedResultDetails } = setupJpMain('0');
  PP_STATE.dom.neededPoints.min = '1';
  calculate();
  assert.strictEqual(renderedResults[0].isError, false);
  assert.ok(renderedResults[0].content.includes('課金不要'));
  assert.strictEqual(PP_STATE.dom.neededPoints.min, '0');
  assert.strictEqual(PP_STATE.dom.result.dataset.requiredYen, 0);
  assert.deepStrictEqual(renderedResultDetails, ['']);
  assert.ok(!renderedResults[0].content.includes('result-purchase-check'));
});

test('目標を超えた入力は選択中のランク・上限・修正方法を案内する', () => {
  const { PP_STATE, calculate, renderedResults, updateNeededPointsConstraint } = setupJpMain('251');
  PP_STATE.dom.neededPoints.max = '250';
  updateNeededPointsConstraint();
  PP_STATE.dom.neededPoints.value = '251';
  calculate();
  assert.strictEqual(renderedResults[0].isError, true);
  assert.match(renderedResults[0].content, /シルバー/);
  assert.match(renderedResults[0].content, /0〜250pt/);
  assert.match(renderedResults[0].content, /目標ステータス.*変更/);
  assert.strictEqual(PP_STATE.dom.neededPoints.value, '251', '入力を自動で書き換えない');

  PP_STATE.dom.targetStatus.selectedIndex = PP_STATE.dom.targetStatus.options.findIndex(option => option.dataset.statusLabel === 'ゴールド');
  updateNeededPointsConstraint();
  PP_STATE.dom.neededPoints.value = '1001';
  calculate();
  assert.match(renderedResults.at(-1).content, /ゴールド/);
  assert.match(renderedResults.at(-1).content, /0〜1,000pt/);
  PP_STATE.dom.neededPoints.value = '1000';
  calculate();
  assert.strictEqual(renderedResults.at(-1).isError, false, '上限内へ直すと計算できる');
});

test('目標変更は入力済み必要ポイントを黙って切り詰めない', () => {
  const { PP_STATE, updateNeededPointsConstraint } = setupJpMain('1000');
  const gold = PP_STATE.dom.targetStatus.options.findIndex(option => option.dataset.statusLabel === 'ゴールド');
  const silver = PP_STATE.dom.targetStatus.options.findIndex(option => option.dataset.statusLabel === 'シルバー');
  assert.ok(gold >= 0 && silver >= 0);
  PP_STATE.dom.targetStatus.selectedIndex = gold;
  updateNeededPointsConstraint();
  PP_STATE.dom.neededPoints.value = '1000';
  PP_STATE.dom.targetStatus.selectedIndex = silver;
  updateNeededPointsConstraint();
  assert.strictEqual(PP_STATE.dom.neededPoints.value, '1000');
  assert.ok(Number(PP_STATE.dom.neededPoints.max) < 1000);
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
  assert.match(renderedResults[0].content, /0以上の整数/);
});

test('通常計算は必要額と月日目安を主要結果へ出し、週平均と年末までの残り日数は出さない', () => {
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
  assert.ok(renderedResults[0].content.includes('月平均目安'));
  assert.ok(renderedResults[0].content.includes('1日あたり目安'));
  assert.ok(!renderedResults[0].content.includes('週平均目安'));
  assert.ok(!renderedResults[0].content.includes('年末までの残り日数'));
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

test('各地域でSSOTの全上位ランクを先に出し、維持は末尾へ重複なく提示する', () => {
  const { PP_STATE, PP_REGION_CONFIGS, updateBaseRateAndTarget } = loadCalculatorContext();

  for (const [region, config] of Object.entries(PP_REGION_CONFIGS)) {
    PP_STATE.currentRegion = region;
    PP_STATE.dom.currentStatus = createSelect();
    PP_STATE.dom.baseRate = createInput();
    PP_STATE.dom.targetStatus = createSelect();
    PP_STATE.dom.neededPoints = createInput();

    for (const [currentLabel, currentValue] of Object.entries(config.statuses)) {
      PP_STATE.dom.currentStatus.value = String(currentValue);
      updateBaseRateAndTarget();

      const expected = [
        ...(config.statusPointsMapping[currentValue] || []),
        ...(Number(currentValue) > 1 ? [currentLabel] : [])
      ];
      const options = PP_STATE.dom.targetStatus.options;
      for (const option of options) {
        if (!expected.length) continue; // 上位も維持もない場合は案内optionだけ。
        assert.ok(option.dataset.statusLabel, region + '/' + currentLabel + ': visible target needs a label');
        assert.strictEqual(option.dataset.rankKey, config.tierIdsByLabel[option.dataset.statusLabel],
          region + '/' + currentLabel + ': target rank ID must match region SSOT');
      }
      const labels = options.map(option => option.dataset.statusLabel).filter(Boolean);
      const kinds = PP_STATE.dom.targetStatus.options.map(option => option.dataset.targetKind).filter(Boolean);

      assert.deepStrictEqual(labels, expected, `${region}/${currentLabel}: target candidates must exactly follow region SSOT`);
      assert.strictEqual(new Set(labels).size, labels.length, `${region}/${currentLabel}: duplicate target candidates`);
      assert.deepStrictEqual(kinds, [
        ...(config.statusPointsMapping[currentValue] || []).map(() => 'upgrade'),
        ...(Number(currentValue) > 1 ? ['maintain'] : [])
      ], `${region}/${currentLabel}: upgrade and maintenance actions must match their labels`);
      if ((config.statusPointsMapping[currentValue] || []).length) {
        assert.strictEqual(kinds[0], 'upgrade', `${region}/${currentLabel}: default target must be the next upgrade`);
      }

      if (expected.length) {
        assert.strictEqual(
          PP_STATE.dom.neededPoints.max,
          String(config.thresholds[expected[0]]),
          `${region}/${currentLabel}: default constraint must match first visible target`
        );
      }
    }
  }
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

test('必要額概算は小数の必要額を通貨の整数へ切り上げる', () => {
  const { computeMainResult } = loadCalculatorContext();
  const result = computeMainResult({
    neededPoints: 12,
    finalRate: 1.1,
    spendUnit: 1,
    baseDate: new Date(2026, 6, 10)
  });

  assert.strictEqual(result.totalAmountNeeded, 11);
});
