'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function stripEsm(source) {
  return source
    .replace(/^import[^\n]+\n/gm, '')
    .replace(/^export\s+/gm, '');
}

test('日記ポイントは0以上の整数だけを正規化し、0を記録として保持する', () => {
  const source = stripEsm(fs.readFileSync(path.join(root, 'js/diary.js'), 'utf8'));
  const context = {
    console,
    CONFIGS: {},
    STATE: {},
    CONSTANTS: {},
    ANALYTICS: {},
    UI: {},
    SHARE: {},
    document: {},
    navigator: {},
    localStorage: {},
    setTimeout() {}
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(`${source}\nglobalThis.__PURE = DIARY_PURE;`, context, { filename: 'diary-pure.js' });
  const pure = context.__PURE;

  assert.equal(pure.normalizePointsValue('0'), '0');
  assert.equal(pure.normalizePointsValue(0), '0');
  assert.equal(pure.normalizePointsValue('0012'), '12');
  assert.equal(pure.normalizePointsValue('-1'), null);
  assert.equal(pure.normalizePointsValue('1.5'), null);
  assert.equal(pure.normalizePointsValue(''), '');
  assert.equal(pure.hasMeaningfulEntry({ points: '0', prize: '未選択' }, '未選択'), true);

  const summary = JSON.parse(JSON.stringify(pure.summarizeYear({
    1: {
      1: { points: '0' },
      2: { points: '10' },
      3: { points: '-5' },
      4: { points: '1.5' }
    }
  })));
  assert.deepEqual(summary.monthlyTotals.slice(0, 2), [10, 0]);
  assert.equal(summary.total, 10);
  assert.equal(summary.recordedWeeks, 2);
  assert.equal(summary.average, 5);
});

test('空・無関係な復元データは既存日記を上書きせず、有効な0pt記録はマージする', () => {
  const source = stripEsm(fs.readFileSync(path.join(root, 'js/diary.js'), 'utf8'));
  const toastCalls = [];
  let storageValue = JSON.stringify({ 2026: { 8: { 2: { points: '55', prize: '既存' } } } });
  const writes = [];
  const backup = { value: '{}' };
  const context = {
    console: { log() {}, warn() {}, error() {} },
    CONFIGS: {
      JP: {
        lang: 'ja-JP',
        uiText: {
          prizeOptions: ['未選択', 'シルバー'],
          errorEmptyBackup: '空です',
          importError: '復元できません',
          importSuccess: '復元しました'
        }
      }
    },
    STATE: {
      currentRegion: 'JP',
      diaryState: { currentYear: 2026, currentMonth: 8 },
      dom: { diaryBackupData: backup }
    },
    CONSTANTS: { DIARY_DATA_KEY: 'playpointDiaryData', CLASS_HIDDEN: 'hidden' },
    ANALYTICS: {},
    UI: { showToast(message, type) { toastCalls.push({ message, type }); } },
    SHARE: {},
    localStorage: {
      getItem() { return storageValue; },
      setItem(key, value) { writes.push({ key, value }); storageValue = value; }
    },
    document: {},
    navigator: {},
    setTimeout() {}
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(`${source}\nglobalThis.__DIARY = DIARY;`, context, { filename: 'diary-import.js' });
  const diary = context.__DIARY;
  diary.renderDiary = () => {};

  diary.executeImport();
  assert.equal(writes.length, 0, '空オブジェクトで既存データを書き換えてはいけない');
  assert.equal(JSON.parse(storageValue)[2026][8][2].points, '55');

  backup.value = JSON.stringify({ notDiary: true });
  diary.executeImport();
  assert.equal(writes.length, 0, '日記と無関係なJSONで既存データを書き換えてはいけない');

  backup.value = JSON.stringify({ 2026: { 8: { 1: { points: 0, prize: '未選択' } } } });
  diary.executeImport();
  assert.equal(writes.length, 1);
  const merged = JSON.parse(storageValue);
  assert.equal(merged[2026][8][1].points, '0');
  assert.equal(merged[2026][8][2].points, '55', '復元に含まれない既存週は保持する');
});

test('通常計算は0ptを達成済みとして完了し、購入導線を表示しない', () => {
  const source = stripEsm(fs.readFileSync(path.join(root, 'js/calculator.js'), 'utf8'));
  let resultHtml = '';
  let detailsHtml = null;
  const neededPoints = { value: '0', min: '1', max: '250', validity: { valid: true } };
  const context = {
    console,
    Option: class Option {},
    CONFIGS: {
      JP: {
        lang: 'ja-JP',
        spendUnit: 100,
        rateUnit: '100円',
        currencyPosition: 'suffix',
        currencySymbol: '円',
        statuses: { 'ブロンズ': 1, 'シルバー': 1.25 },
        statusRates: { 1: 1, 1.25: 1.25 },
        thresholds: { 'ブロンズ': 0, 'シルバー': 250 },
        uiText: {
          errorNeededPoints: 'invalid points',
          errorInput: 'invalid',
          errorTargetStatus: 'invalid target',
          errorRate: 'invalid rate',
          errorTargetConsistency: 'invalid consistency',
          resultLabelFreeClear: '課金不要',
          resultLabelNeededPoints: '必要ポイント',
          resultLabelTotalYen: '必要額',
          approxLabel: '約',
          calculationNote: '残り{months}か月',
          resultLabelRate: '獲得率',
          roundingNoteWithoutPack: '購入単位で差が出る場合があります。'
        }
      }
    },
    STATE: {
      currentRegion: 'JP',
      dom: {
        neededPoints,
        multiplier: { value: '1', min: '1', validity: { valid: true } },
        baseRate: { value: '1', validity: { valid: true } },
        currentStatus: { value: '1' },
        targetStatus: {
          selectedIndex: 0,
          options: [{ value: '250', dataset: { statusLabel: 'シルバー' } }]
        },
        result: { dataset: {} }
      }
    },
    CONSTANTS: {},
    ANALYTICS: {
      track() {},
      markEngaged() {},
      getEntryContext() { return {}; }
    },
    UI: {
      displayResult(element, html, isError) {
        if (isError) throw new Error(`unexpected error: ${html}`);
        resultHtml = html;
      },
      displayResultDetails(html) { detailsHtml = html; }
    },
    SHARE: { buildMainShareUrl() { return 'https://playpoint-sim.com/'; } },
    getResultNavigationConfig() { return {}; },
    document: {},
    navigator: {},
    window: null
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(`${source}\nglobalThis.__CALC = CALC;`, context, { filename: 'calculator-zero.js' });
  context.__CALC.renderResultGuidance = () => '';

  context.__CALC.calculate();

  assert.equal(neededPoints.min, '0');
  assert.match(resultHtml, /課金不要/);
  assert.doesNotMatch(resultHtml, /result-purchase-check/);
  assert.equal(detailsHtml, '');
  assert.equal(context.STATE.dom.result.dataset.requiredYen, 0);
});

test('ゲーム計算はパック複数購入を購入ごとに丸め、税抜き対象額を別入力できる', () => {
  const source = fs.readFileSync(path.join(root, 'games/game-sim.js'), 'utf8');
  const context = {
    console,
    URLSearchParams,
    document: {
      readyState: 'loading',
      addEventListener() {},
      documentElement: { lang: 'ja' }
    }
  };
  context.window = context;
  context.__TEST_ENV__ = true;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'game-sim.js' });
  const calculate = context.PP_GAME_SIM_TEST.calculateGamePoints;
  const cfg = { unitSpend: 100 };

  const perPurchase = calculate(6100, 5, 1, cfg, {
    purchaseCount: 10,
    amountPerPurchase: 610
  });
  assert.equal(perPurchase.pointsPerPurchase, 31);
  assert.equal(perPurchase.points, 310);
  assert.notEqual(perPurchase.points, Math.round((6100 / 100) * 5), '合計後の一括丸めへ戻してはいけない');

  const preTax = calculate(6100, 5, 1, cfg, {
    purchaseCount: 10,
    amountPerPurchase: 610,
    eligibleAmountPerPurchase: 550
  });
  assert.equal(preTax.usesEligibleAmount, true);
  assert.equal(preTax.pointsPerPurchase, 28);
  assert.equal(preTax.points, 280);
});

test('維持判断とトラブル記事の表示順は監査で決めた信頼境界を守る', () => {
  const maintenance = fs.readFileSync(path.join(root, 'maintenance/platinum/index.html'), 'utf8');
  assert.doesNotMatch(maintenance, /プラチナ（1\.75%）/);
  assert.doesNotMatch(maintenance, /3万円を超えるなら/);
  assert.doesNotMatch(maintenance, /経済的に絶対にお得/);
  assert.doesNotMatch(maintenance, /年間約1,500[〜-]3,000pt差/);
  assert.match(maintenance, /1\.75pt \/ 100円/);
  assert.match(maintenance, /全員に共通する「3万円を超えたら降格が得」/);

  const article = fs.readFileSync(path.join(root, 'articles/2026-03-10-play-points-reflection-timing.html'), 'utf8');
  const answerIndex = article.indexOf('class="answer-box editorial-answer"');
  const tocIndex = article.indexOf('class="inpage-toc"');
  assert.ok(answerIndex >= 0 && tocIndex >= 0 && answerIndex < tocIndex, '主回答は目次より先に表示する');
  assert.match(article, /href="#first-check">まず30秒で確認する4項目を見る/);
});
