const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function readSubmittedSitemaps() {
  const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
  const files = [...robots.matchAll(/^Sitemap:\s+https:\/\/playpoint-sim\.com\/([^\s]+)$/gm)]
    .map(match => match[1]);
  return files.map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
}

function createOption(text, value) {
  return {
    text,
    value: String(value),
    dataset: {},
    disabled: false,
  };
}

function createSelect() {
  const select = {
    value: '',
    options: [],
    selectedIndex: 0,
    add(option) {
      this.options.push(option);
      if (!this.value) this.value = option.value;
    },
  };
  Object.defineProperty(select, 'innerHTML', {
    get() {
      return '';
    },
    set(value) {
      if (value === '') {
        this.options = [];
        this.selectedIndex = 0;
        this.value = '';
      }
    },
  });
  return select;
}

function createInput(value = '') {
  return {
    value: String(value),
    min: undefined,
    max: undefined,
    step: undefined,
    validity: { valid: true },
    removeAttribute(name) {
      delete this[name];
    },
  };
}

function preprocessESM(code) {
  return code
    .replace(/^import\s*'[^']+';\s*$/gm, '')
    .replace(/import\s*\{\s*([^}]+)\s*\}\s*from\s*'[^']+'\s*;/g, (match, imports) => {
      const names = imports.split(',').map(s => s.trim());
      const needed = names.filter(name => name === 'UI' || name === 'SHARE' || name === 'CALC' || name === 'DIARY');
      if (needed.length === 0) return '';
      if (needed.length === 1) {
        return `var ${needed[0]} = PP_APP.${needed[0]};`;
      }
      return `var { ${needed.join(', ')} } = PP_APP;`;
    })
    .replace(/^export\s+/gm, '');
}

function loadCalculatorContext(dateClass = Date) {
  const renderedResults = [];
  const renderedResultDetails = [];
  const context = {
    console,
    Option: createOption,
    Date: dateClass,
    displayResult(targetElement, content, isError = false) {
      targetElement.innerHTML = content;
      targetElement.isError = isError;
      targetElement.renderedContent = content;
      renderedResults.push({ targetElement, content, isError });
    },
    displayResultDetails(content) {
      renderedResultDetails.push(content);
    },
    renderedResults,
    renderedResultDetails,
  };
  context.window = context;
  context.__TEST_ENV__ = true;
  vm.createContext(context);
  const code = [
    fs.readFileSync(path.join(root, 'js', 'analytics-core.js'), 'utf8'),
    preprocessESM(fs.readFileSync(path.join(root, 'js', 'config.js'), 'utf8')),
    `
      PP_APP.UI = {
        displayResult,
        displayResultDetails
      };
    `,
    preprocessESM(fs.readFileSync(path.join(root, 'js', 'calculator.js'), 'utf8')),
    `
      globalThis.__pp = {
        PP_REGION_CONFIGS: PP_APP.CONFIGS,
        PP_STATE: PP_APP.STATE,
        populateStatusSelects: PP_APP.CALC.populateStatusSelects.bind(PP_APP.CALC),
        updateBaseRateAndTarget: PP_APP.CALC.updateBaseRateAndTarget.bind(PP_APP.CALC),
        updateNeededPointsConstraint: PP_APP.CALC.updateNeededPointsConstraint.bind(PP_APP.CALC),
        getMaxNeededPointsForTarget: PP_APP.CALC.getMaxNeededPointsForTarget.bind(PP_APP.CALC),
        getRateDetails: PP_APP.CALC.getRateDetails.bind(PP_APP.CALC),
        getRemainingMonths: PP_APP.CALC.getRemainingMonths.bind(PP_APP.CALC),
        getNextFridayCalendarWindow,
        getRelatedArticles: PP_APP.CALC.getRelatedArticles.bind(PP_APP.CALC),
        getDecisionLinks: PP_APP.CALC.getDecisionLinks.bind(PP_APP.CALC),
        computeMainResult: PP_APP.CALC_PURE.computeMainResult.bind(PP_APP.CALC_PURE),
        computeRateComparison: PP_APP.CALC_PURE.computeRateComparison.bind(PP_APP.CALC_PURE),
        calculate: PP_APP.CALC.calculate.bind(PP_APP.CALC),
        reverseCalculate: PP_APP.CALC.reverseCalculate.bind(PP_APP.CALC),
        renderedResults,
        renderedResultDetails
      };
    `,
  ].join('\n');
  vm.runInContext(code, context, { filename: 'calculator-bundle.js' });
  return context.__pp;
}

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test('ステータス選択の初期値はブロンズになる', () => {
  const { PP_STATE, populateStatusSelects } = loadCalculatorContext();
  PP_STATE.currentRegion = 'JP';
  PP_STATE.dom.currentStatus = createSelect();
  PP_STATE.dom.reverseStatus = createSelect();

  populateStatusSelects();

  assert.strictEqual(PP_STATE.dom.currentStatus.value, '1');
  assert.strictEqual(PP_STATE.dom.reverseStatus.value, '1');
});

test('通常計算では現在ステータスから次のランクだけを目標にする', () => {
  const { PP_STATE, updateBaseRateAndTarget } = loadCalculatorContext();
  PP_STATE.currentRegion = 'JP';
  PP_STATE.dom.currentStatus = createSelect();
  PP_STATE.dom.currentStatus.value = '1';
  PP_STATE.dom.baseRate = createInput();
  PP_STATE.dom.targetStatus = createSelect();
  PP_STATE.dom.neededPoints = createInput();

  updateBaseRateAndTarget();

  assert.strictEqual(PP_STATE.dom.targetStatus.options.length, 1);
  assert.strictEqual(PP_STATE.dom.targetStatus.options[0].dataset.statusLabel, 'シルバー');
  assert.strictEqual(PP_STATE.dom.neededPoints.max, '250');
  assert.strictEqual(PP_STATE.dom.neededPoints.placeholder, '例：250');
});

test('日本語の必要ポイント例はゴールドからプラチナの時だけ1728になる', () => {
  const { PP_STATE, updateBaseRateAndTarget, updateNeededPointsConstraint } = loadCalculatorContext();
  PP_STATE.currentRegion = 'JP';
  PP_STATE.dom.currentStatus = createSelect();
  PP_STATE.dom.currentStatus.value = '1.5';
  PP_STATE.dom.baseRate = createInput();
  PP_STATE.dom.targetStatus = createSelect();
  PP_STATE.dom.neededPoints = createInput();

  updateBaseRateAndTarget();
  assert.strictEqual(PP_STATE.dom.targetStatus.options[0].dataset.statusLabel, 'ゴールド');
  assert.strictEqual(PP_STATE.dom.neededPoints.placeholder, '例：250');

  PP_STATE.dom.targetStatus.selectedIndex = 1;
  updateNeededPointsConstraint();
  assert.strictEqual(PP_STATE.dom.targetStatus.options[1].dataset.statusLabel, 'プラチナ');
  assert.strictEqual(PP_STATE.dom.neededPoints.max, '4000');
  assert.strictEqual(PP_STATE.dom.neededPoints.placeholder, '例：1728');

  PP_STATE.dom.targetStatus.selectedIndex = 0;
  updateNeededPointsConstraint();
  assert.strictEqual(PP_STATE.dom.neededPoints.placeholder, '例：250');
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

test('パック額未入力では購入ごとの丸めを仮定しない概算として表示する', () => {
  const { PP_STATE, populateStatusSelects, updateBaseRateAndTarget, calculate, renderedResults, renderedResultDetails } = loadCalculatorContext();
  PP_STATE.currentRegion = 'US';
  PP_STATE.dom.currentStatus = createSelect();
  PP_STATE.dom.reverseStatus = createSelect();
  PP_STATE.dom.baseRate = createInput();
  PP_STATE.dom.targetStatus = createSelect();
  PP_STATE.dom.neededPoints = createInput('6');
  PP_STATE.dom.multiplier = createInput('1');
  PP_STATE.dom.packAmount = createInput('0');
  PP_STATE.dom.result = { dataset: {}, innerHTML: '', isError: false };

  populateStatusSelects();
  PP_STATE.dom.currentStatus.value = '1.1';
  updateBaseRateAndTarget();
  calculate();

  const content = renderedResults[0].content;
  assert.strictEqual(renderedResults[0].isError, false);
  assert.ok(content.includes('data-value="6"'));
  assert.ok(renderedResultDetails[0].includes('does not apply purchase-by-purchase point rounding'));
});

test('パック額入力時は購入ごとの四捨五入で必要回数と合計額を計算する', () => {
  const { PP_STATE, populateStatusSelects, updateBaseRateAndTarget, calculate, renderedResults, renderedResultDetails } = loadCalculatorContext();
  PP_STATE.currentRegion = 'US';
  PP_STATE.dom.currentStatus = createSelect();
  PP_STATE.dom.reverseStatus = createSelect();
  PP_STATE.dom.baseRate = createInput();
  PP_STATE.dom.targetStatus = createSelect();
  PP_STATE.dom.neededPoints = createInput('12');
  PP_STATE.dom.multiplier = createInput('1');
  PP_STATE.dom.packAmount = createInput('5');
  PP_STATE.dom.result = { dataset: {}, innerHTML: '', isError: false };

  populateStatusSelects();
  PP_STATE.dom.currentStatus.value = '1.1';
  updateBaseRateAndTarget();
  calculate();

  const content = renderedResults[0].content;
  assert.strictEqual(renderedResults[0].isError, false);
  assert.ok(content.includes('data-value="2"'));
  assert.ok(content.includes('data-value="10"'));
  assert.ok(renderedResultDetails[0].includes('Points are rounded for each entered purchase amount'));
});

test('1回0ポイントになる購入額は概算へフォールバックせずエラーにする', () => {
  const { PP_STATE, populateStatusSelects, updateBaseRateAndTarget, calculate, renderedResults } = loadCalculatorContext();
  PP_STATE.currentRegion = 'US';
  PP_STATE.dom.currentStatus = createSelect();
  PP_STATE.dom.reverseStatus = createSelect();
  PP_STATE.dom.baseRate = createInput();
  PP_STATE.dom.targetStatus = createSelect();
  PP_STATE.dom.neededPoints = createInput('6');
  PP_STATE.dom.multiplier = createInput('1');
  PP_STATE.dom.packAmount = createInput('0.01');
  PP_STATE.dom.result = { dataset: {}, innerHTML: '', isError: false };

  populateStatusSelects();
  PP_STATE.dom.currentStatus.value = '1.1';
  updateBaseRateAndTarget();
  calculate();

  assert.strictEqual(renderedResults[0].isError, true);
  assert.ok(renderedResults[0].content.includes('each purchase rounds to 0 points'));
  assert.ok(!renderedResults[0].content.includes('data-value="6"'));
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

test('通常計算の補足導線は1グループに統合し最大3件だけ表示する', () => {
  const { PP_STATE, populateStatusSelects, updateBaseRateAndTarget, calculate, renderedResultDetails } = loadCalculatorContext();
  PP_STATE.currentRegion = 'JP';
  PP_STATE.dom.currentStatus = createSelect();
  PP_STATE.dom.reverseStatus = createSelect();
  PP_STATE.dom.baseRate = createInput();
  PP_STATE.dom.targetStatus = createSelect();
  PP_STATE.dom.neededPoints = createInput('3000');
  PP_STATE.dom.multiplier = createInput('3');
  PP_STATE.dom.result = { dataset: {}, innerHTML: '', isError: false };

  populateStatusSelects();
  PP_STATE.dom.currentStatus.value = '1.75';
  updateBaseRateAndTarget();
  PP_STATE.dom.targetStatus.selectedIndex = 1;
  calculate();

  const content = renderedResultDetails[0];
  const guidanceBlock = content.match(/<div class="result-guidance-links">[\s\S]*?<\/div>/)?.[0] || '';
  const links = [...guidanceBlock.matchAll(/<a href="([^"]+)"/g)].map(match => match[1]);

  assert.ok(content.includes('次に確認すること'));
  assert.ok(content.includes('result-guidance-links'));
  assert.ok(!content.includes('result-related-links'));
  assert.ok(!content.includes('result-decision-links'));
  assert.ok(links.length > 0 && links.length <= 3);
  assert.ok(links.includes('articles/2025-12-25-campaign.html'));
  links.forEach((href) => {
    assert.ok(fs.existsSync(path.join(root, href)), `関連記事リンクが存在しません: ${href}`);
  });
});

test('計算結果の統合導線は検索意図別LPを優先する', () => {
  const { PP_STATE, populateStatusSelects, updateBaseRateAndTarget, calculate, renderedResultDetails } = loadCalculatorContext();
  PP_STATE.currentRegion = 'JP';
  PP_STATE.dom.currentStatus = createSelect();
  PP_STATE.dom.reverseStatus = createSelect();
  PP_STATE.dom.baseRate = createInput();
  PP_STATE.dom.targetStatus = createSelect();
  PP_STATE.dom.neededPoints = createInput('1000');
  PP_STATE.dom.multiplier = createInput('1');
  PP_STATE.dom.result = { dataset: {}, innerHTML: '', isError: false };

  populateStatusSelects();
  PP_STATE.dom.currentStatus.value = '1.75';
  updateBaseRateAndTarget();
  PP_STATE.dom.targetStatus.selectedIndex = 0;
  calculate();

  const content = renderedResultDetails[0];
  const links = [...content.matchAll(/<a href="([^"]+)"/g)].map(match => match[1]);

  assert.ok(links.includes('maintenance/platinum/'), 'プラチナ維持LPへの導線がありません');
});

test('計算結果の統合導線には金額や条件に応じた次の判断が含まれる', () => {
  const { PP_STATE, populateStatusSelects, updateBaseRateAndTarget, calculate, renderedResultDetails } = loadCalculatorContext();
  PP_STATE.currentRegion = 'JP';
  PP_STATE.dom.currentStatus = createSelect();
  PP_STATE.dom.reverseStatus = createSelect();
  PP_STATE.dom.baseRate = createInput();
  PP_STATE.dom.targetStatus = createSelect();
  PP_STATE.dom.neededPoints = createInput('3000');
  PP_STATE.dom.multiplier = createInput('1');
  PP_STATE.dom.result = { dataset: {}, innerHTML: '', isError: false };

  populateStatusSelects();
  PP_STATE.dom.currentStatus.value = '1.75';
  updateBaseRateAndTarget();
  PP_STATE.dom.targetStatus.selectedIndex = 1;
  calculate();

  const content = renderedResultDetails[0];
  assert.ok(content.includes('result-guidance-links'), '統合導線のコンテナがありません');
  assert.ok(content.includes('次に確認すること'), '判断導線の見出しがありません');
  assert.ok(content.includes('campaign/3x/'), '高額時の3倍キャンペーン導線がありません');
  assert.ok([...content.matchAll(/<a href="([^"]+)"/g)].length <= 3, '統合導線は3件以内にしてください');
});

test('ステータス選択の再生成でoptionが重複しない', () => {
  const { PP_STATE, populateStatusSelects } = loadCalculatorContext();
  PP_STATE.currentRegion = 'JP';
  PP_STATE.dom.currentStatus = createSelect();
  PP_STATE.dom.reverseStatus = createSelect();

  populateStatusSelects();
  populateStatusSelects();

  assert.strictEqual(PP_STATE.dom.currentStatus.options.length, 5);
  assert.strictEqual(PP_STATE.dom.reverseStatus.options.length, 5);
});

test('計算条件を共有URLへ保存し再訪時に復元できる', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const englishHtml = fs.readFileSync(path.join(root, 'en', 'index.html'), 'utf8');
  const shareScript = fs.readFileSync(path.join(root, 'js', 'share.js'), 'utf8');
  const calculator = fs.readFileSync(path.join(root, 'js', 'calculator.js'), 'utf8');
  const main = fs.readFileSync(path.join(root, 'js', 'main.js'), 'utf8');

  assert.ok(html.includes('js/main.js'));
  assert.ok(englishHtml.includes('../js/main.js'));
  assert.ok(shareScript.includes('buildMainShareUrl'));
  assert.ok(shareScript.includes('applyFromUrl'));
  assert.ok(shareScript.includes('URLSearchParams'));
  assert.ok(shareScript.includes("url.searchParams.set('target'"));
  assert.ok(shareScript.includes("params.get('target')"));
  assert.ok(shareScript.includes('setTargetFromParam(dom.targetStatus, target)'));
  assert.ok(calculator.includes('dataset.shareUrl'));
  assert.ok(main.includes('SHARE.applyFromUrl()'));
});

test('共有URLは実在するステータス値だけを復元する', () => {
  const script = fs.readFileSync(path.join(root, 'js', 'share.js'), 'utf8');

  assert.ok(script.includes('isAllowedStatusValue'));
  assert.ok(script.includes('params.has(name)'));
});

test('ブロンズ以外のステータスでは、同ランク維持と次のランク昇格が目標に設定される', () => {
  const { PP_STATE, updateBaseRateAndTarget } = loadCalculatorContext();
  PP_STATE.currentRegion = 'JP';
  PP_STATE.dom.currentStatus = createSelect();
  
  // 1. ゴールド（1.5）の場合
  PP_STATE.dom.currentStatus.value = '1.5';
  PP_STATE.dom.baseRate = createInput();
  PP_STATE.dom.targetStatus = createSelect();
  PP_STATE.dom.neededPoints = createInput();

  updateBaseRateAndTarget();

  // ゴールド(維持) と プラチナ(昇格) の2つが選択肢に入るはず
  assert.strictEqual(PP_STATE.dom.targetStatus.options.length, 2);
  assert.strictEqual(PP_STATE.dom.targetStatus.options[0].dataset.statusLabel, 'ゴールド');
  assert.strictEqual(PP_STATE.dom.targetStatus.options[1].dataset.statusLabel, 'プラチナ');

  // ゴールド（維持）選択時の neededPoints.max は 1000 に制限されること
  assert.strictEqual(PP_STATE.dom.neededPoints.max, '1000');

  // 2. ダイヤモンド（2.0）の場合
  PP_STATE.dom.currentStatus.value = '2';
  PP_STATE.dom.baseRate = createInput();
  PP_STATE.dom.targetStatus = createSelect();
  PP_STATE.dom.neededPoints = createInput();

  updateBaseRateAndTarget();

  // ダイヤモンドは最高ランクなので、ダイヤモンド(維持) の1つだけが選択肢に入るはず
  assert.strictEqual(PP_STATE.dom.targetStatus.options.length, 1);
  assert.strictEqual(PP_STATE.dom.targetStatus.options[0].dataset.statusLabel, 'ダイヤモンド');
  assert.strictEqual(PP_STATE.dom.neededPoints.max, '15000');
});

test('韓国（KR）リージョンの spendUnit 正確性検証', () => {
  const { PP_STATE, calculate, reverseCalculate, renderedResults } = loadCalculatorContext();
  PP_STATE.currentRegion = 'KR';
  
  // 逆算テスト (10,000ウォン課金)
  PP_STATE.dom.amountYen = createInput('10000');
  PP_STATE.dom.reverseStatus = createSelect();
  PP_STATE.dom.reverseStatus.value = '1'; // ブロンズ
  PP_STATE.dom.reverseBaseRate = createInput('1.0');
  PP_STATE.dom.reverseMultiplier = createInput('1');
  PP_STATE.dom.reverseResult = { dataset: {}, innerHTML: '', isError: false };

  reverseCalculate();

  // 10000 / 1000 * 1.0 = 10pt であるべき
  assert.ok(renderedResults[0].content.includes('data-value="10"'), `Expected 10pt for 10000 KRW, got: ${renderedResults[0].content}`);
});

test('削除済みのウィークリーリワード自動差し引きは設定にも計算処理にも残さない', () => {
  const configSource = fs.readFileSync(path.join(root, 'js', 'config.js'), 'utf8');
  const calculatorSource = fs.readFileSync(path.join(root, 'js', 'calculator.js'), 'utf8');
  const localeSource = fs.readFileSync(path.join(root, 'scripts', 'locale-config.cjs'), 'utf8');

  assert.ok(!configSource.includes('weeklyRewardEstimates'), '旧リワード推定設定が残っています');
  assert.ok(!configSource.includes('subtractRewardsLabel'), '旧リワード差し引き文言が残っています');
  assert.ok(!calculatorSource.includes('subtractRewards'), '旧リワード差し引き分岐が残っています');
  assert.ok(!localeSource.includes('subtractRewardsLabel'), '言語ページ生成設定に旧文言が残っています');
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

test('主要結果、共有、折りたたみ詳細の順で4言語ページに配置する', () => {
  for (const relativePath of ['index.html', 'en/index.html', 'ko/index.html', 'tw/index.html']) {
    const html = fs.readFileSync(path.join(root, relativePath), 'utf8');
    const resultPosition = html.indexOf('id="result"');
    const actionsPosition = html.indexOf('id="result-actions"');
    const detailsPosition = html.indexOf('id="result-details"');
    assert.ok(resultPosition >= 0 && actionsPosition > resultPosition && detailsPosition > actionsPosition, relativePath);
  }
});

test('折りたたみ詳細の見出しを4言語で用意する', () => {
  const configSource = fs.readFileSync(path.join(root, 'js', 'config.js'), 'utf8');
  for (const label of ['計算の詳細を見る', 'View calculation details', '계산 상세 보기', '查看計算詳情']) {
    assert.ok(configSource.includes(label), `折りたたみ見出しがありません: ${label}`);
  }
});

test('平均パック課金額シミュレーションの検証', () => {
  const { PP_STATE, calculate, renderedResults } = loadCalculatorContext();
  PP_STATE.currentRegion = 'JP';
  PP_STATE.dom.currentStatus = createSelect();
  PP_STATE.dom.currentStatus.value = '1.5'; // ゴールド (還元率1.5pt/100円)
  PP_STATE.dom.baseRate = createInput('1.5');
  PP_STATE.dom.targetStatus = createSelect();
  const option2 = createOption('プラチナ', 4000);
  option2.dataset.statusLabel = 'プラチナ';
  PP_STATE.dom.targetStatus.add(option2);
  PP_STATE.dom.neededPoints = createInput('300'); // あと300pt必要
  PP_STATE.dom.multiplier = createInput('1');
  PP_STATE.dom.result = { dataset: {}, innerHTML: '', isError: false };
  
  // パック額 = 9800円 (9800円 / 100 = 98回。 98 * 1.5 = 147pt獲得)
  // 300pt ➔ 147pt × 3パック = 441pt ➔ 29400円必要
  PP_STATE.dom.packAmount = createInput('9800');

  calculate();

  assert.ok(renderedResults[0].content.includes('data-value="3"'), '必要購入パック数が3パックとなること');
  assert.ok(renderedResults[0].content.includes('data-value="29400"'), '合計課金額が29,400円になること');
});

test('通常還元とキャンペーン還元の差額は既存の購入単位で比較する', () => {
  const { computeRateComparison } = loadCalculatorContext();
  const samePack = computeRateComparison({
    neededPoints: 50,
    selectedRate: 2,
    baseRate: 1,
    packAmount: 9800,
    spendUnit: 100
  });
  assert.deepEqual(
    JSON.parse(JSON.stringify(samePack)),
    { baseAmount: 9800, selectedAmount: 9800, savedAmount: 0 }
  );

  const withoutPack = computeRateComparison({
    neededPoints: 100,
    selectedRate: 2,
    baseRate: 1,
    spendUnit: 100
  });
  assert.deepEqual(
    JSON.parse(JSON.stringify(withoutPack)),
    { baseAmount: 10000, selectedAmount: 5000, savedAmount: 5000 }
  );
});

test('米国のパック計算は購入ごとのポイントを最も近い整数へ丸める', () => {
  const { computeMainResult } = loadCalculatorContext();
  const result = computeMainResult({
    neededPoints: 12,
    finalRate: 1.1,
    packAmount: 5,
    spendUnit: 1,
    baseDate: new Date(2026, 6, 10)
  });

  assert.strictEqual(result.packsNeeded, 2, 'Silverの$5は1パック6ptとして扱うこと');
  assert.strictEqual(result.totalAmountNeeded, 10, '12ptには$5パックが2回で足りること');
});

test('米国の小数パック額は金額全体に還元率を掛けてから購入ごとに丸める', () => {
  const { computeMainResult } = loadCalculatorContext();
  const result = computeMainResult({
    neededPoints: 60,
    finalRate: 1.1,
    packAmount: 5.99,
    spendUnit: 1,
    baseDate: new Date(2026, 6, 10)
  });

  assert.strictEqual(result.packsNeeded, 9, 'Silverの$5.99は1パック7ptとして扱うこと');
  assert.strictEqual(result.totalAmountNeeded, 53.91, '60ptには$5.99パックが9回で足りること');
});

test('海外版の計算結果導線は各言語の実在ページだけを使う', () => {
  const { PP_STATE, getRelatedArticles, getDecisionLinks } = loadCalculatorContext();

  for (const [region, dir] of [['US', 'en'], ['KR', 'ko'], ['TW', 'tw']]) {
    PP_STATE.currentRegion = region;
    const links = [
      ...getRelatedArticles(region === 'TW' ? '鑽石級' : (region === 'KR' ? '다이아몬드' : 'Diamond'), 3),
      ...getDecisionLinks(60000, region === 'TW' ? '鑽石級' : (region === 'KR' ? '다이아몬드' : 'Diamond'), 1, 100)
    ];

    assert.ok(links.length > 0, `${region} の結果導線がありません`);
    links.forEach(({ href, title }) => {
      if (region === 'US') {
        assert.ok(!/[ぁ-んァ-ヶ一-龠]/.test(title), `${region} の結果導線に日本語タイトルが残っています: ${title}`);
      }
      assert.ok(fs.existsSync(path.join(root, dir, href)), `${region} の結果導線が存在しません: ${href}`);
    });
  }
});

test('カレンダー登録は固定済みの過去日時を使わない', () => {
  const main = fs.readFileSync(path.join(root, 'js', 'main.js'), 'utf8');
  const ui = fs.readFileSync(path.join(root, 'js', 'ui.js'), 'utf8');
  assert.ok(!main.includes('20260626T'), 'iCalが固定の過去日時を使っています');
  assert.ok(!ui.includes('20260626T'), 'Google Calendarが固定の過去日時を使っています');
});

test('計算結果のエラー表示とクリアは前回の共有用データを破棄する', () => {
  let source = fs.readFileSync(path.join(root, 'js', 'ui.js'), 'utf8')
    .replace(/^import .*;\s*$/m, '')
    .replace('export const UI =', 'const UI =');
  const windowMock = { __TEST_ENV__: true };
  const classNames = new Set();
  const target = {
    appendChild(child) { this.children.push(child); },
    children: [],
    classList: {
      add(name) { classNames.add(name); },
      remove(name) { classNames.delete(name); }
    },
    dataset: { earnedPoints: '50', requiredYen: '1000' },
    innerHTML: '<strong>old</strong>',
    querySelectorAll() { return []; }
  };
  const context = {
    CONFIGS: { JP: { lang: 'ja' } },
    CONSTANTS: { CLASS_HAS_RESULT: 'has-result', CLASS_HIDDEN: 'hidden' },
    STATE: { currentRegion: 'JP', dom: {} },
    clearTimeout,
    console,
    document: {
      createElement() {
        return { className: '', textContent: '' };
      }
    },
    getNextFridayCalendarWindow() { return { start: '', end: '' }; },
    setTimeout,
    window: windowMock
  };

  vm.runInNewContext(source, context);
  const UI = windowMock.PP_APP.UI;
  UI.displayResult(target, '入力内容を確認してください', true);
  assert.deepStrictEqual(Object.keys(target.dataset), []);
  assert.strictEqual(target.children[0].textContent, '入力内容を確認してください');

  target.dataset.earnedPoints = '80';
  UI.clearResult(target);
  assert.deepStrictEqual(Object.keys(target.dataset), []);
  assert.ok(!classNames.has('has-result'));
});
