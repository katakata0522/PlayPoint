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
  PP_STATE.dom.packAmount = createInput('0');
  PP_STATE.dom.result = { dataset: {}, innerHTML: '', isError: false };

  populateStatusSelects();
  updateBaseRateAndTarget();
  calculate();

  assert.strictEqual(renderedResults[0].isError, false);
  assert.ok(renderedResults[0].content.includes('data-value="25000"'));
});

test('関連リンクは実在ファイルだけを返す', () => {
  const { PP_STATE, getRelatedArticles } = loadCalculatorContext();
  PP_STATE.currentRegion = 'JP';

  const items = getRelatedArticles('default');
  assert.ok(items.length > 0);
  for (const item of items) {
    const target = path.join(root, item.href);
    assert.ok(fs.existsSync(target), `Missing related target: ${item.href}`);
  }
});

test('robots.txtに記載したサイトマップはすべて存在する', () => {
  const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
  const files = [...robots.matchAll(/^Sitemap:\s+https:\/\/playpoint-sim\.com\/([^\s]+)$/gm)]
    .map(match => match[1]);
  assert.ok(files.length > 0);
  for (const file of files) {
    assert.ok(fs.existsSync(path.join(root, file)), `Missing sitemap: ${file}`);
  }
});

test('送信サイトマップのURLは重複しない', () => {
  const xml = readSubmittedSitemaps();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  const unique = new Set(urls);
  assert.strictEqual(urls.length, unique.size);
});

test('検索品質保留URLは送信サイトマップに含まれない', () => {
  const xml = readSubmittedSitemaps();
  assert.ok(!xml.includes('2026-08-17-diamond-valley-festival-guide.html'));
  assert.ok(!xml.includes('2026-08-17-tgs-google-play-vip.html'));
});

test('公開対象ファイルの一時ディレクトリは存在しない', () => {
  for (const name of ['tmp', 'temp', '.tmp']) {
    assert.ok(!fs.existsSync(path.join(root, name)), `Unexpected temp directory: ${name}`);
  }
});

test('一時ファイル名が公開対象へ紛れない', () => {
  const forbidden = [/\.bak$/i, /\.tmp$/i, /~$/];
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else for (const pattern of forbidden) assert.ok(!pattern.test(entry.name), `Unexpected temp file: ${full}`);
    }
  }
});

test('共有URLのクエリ値を復元しても計算対象外の値を混入しない', () => {
  const source = fs.readFileSync(path.join(root, 'js', 'share.js'), 'utf8');
  assert.ok(source.includes("params.set('multiplier'"));
  assert.ok(!source.includes("params.set('amountYen'"));
});

test('テスト専用グローバルは本番実行時に公開しない', () => {
  const source = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');
  assert.ok(source.includes("window.__TEST_ENV__"));
  assert.ok(source.includes('Object.freeze'));
});
