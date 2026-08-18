'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content, 'utf8');
}

function replaceOnce(content, search, replacement, label) {
  const index = content.indexOf(search);
  if (index < 0) throw new Error(`置換対象が見つかりません: ${label}`);
  if (content.indexOf(search, index + search.length) >= 0) {
    throw new Error(`置換対象が複数あります: ${label}`);
  }
  return `${content.slice(0, index)}${replacement}${content.slice(index + search.length)}`;
}

function updateAnalyticsCore() {
  const file = 'js/analytics-core.js';
  let source = read(file);
  source = replaceOnce(
    source,
    "        reverse_calculation_completed: ['calculation_mode', 'region', 'entry_source', 'entry_medium', 'entry_campaign', 'entry_source_path', 'entry_link_context', 'calculator_preset'],\n        diary_entry_saved: ['region', 'entry_type'],",
    "        reverse_calculation_completed: ['calculation_mode', 'region', 'entry_source', 'entry_medium', 'entry_campaign', 'entry_source_path', 'entry_link_context', 'calculator_preset'],\n        calculator_form_started: ['calculation_mode', 'region', 'start_field'],\n        calculator_funnel_completed: ['calculation_mode', 'region'],\n        calculator_validation_error: ['calculation_mode', 'region', 'error_type'],\n        calculator_mode_changed: ['region', 'from_mode', 'to_mode'],\n        diary_tab_opened: ['region', 'open_surface'],\n        diary_entry_saved: ['region', 'entry_type'],",
    'analytics funnel allowlist'
  );
  write(file, source);
}

function updateMain() {
  const file = 'js/main.js';
  let source = read(file);

  source = replaceOnce(
    source,
    'let diaryModulePromise = null;\n',
    `let diaryModulePromise = null;\nconst calculatorFunnelStartedModes = new Set();\nconst calculatorFunnelCompletedModes = new Set();\nlet activeCalculatorMode = CONSTANTS.MODE_MAIN;\nlet diaryTabOpenedThisPage = false;\n`,
    'funnel state'
  );

  const bindEnterBlock = `function bindEnterAction(elements, action) {\n    for (const element of elements) {\n        bindEvent(element, 'keydown', (event) => {\n            if (event.key !== 'Enter') return;\n            event.preventDefault();\n            action();\n        });\n    }\n}\n`;

  const funnelHelpers = `${bindEnterBlock}\nfunction getAnalyticsCalculationMode(mode) {\n    return mode === CONSTANTS.MODE_REVERSE ? 'spend_to_points' : 'rank_up';\n}\n\nfunction trackCalculatorFormStarted(mode, startField) {\n    if (mode !== CONSTANTS.MODE_MAIN && mode !== CONSTANTS.MODE_REVERSE) return;\n    if (calculatorFunnelStartedModes.has(mode)) return;\n    calculatorFunnelStartedModes.add(mode);\n    ANALYTICS.track('calculator_form_started', {\n        calculation_mode: getAnalyticsCalculationMode(mode),\n        region: STATE.currentRegion,\n        start_field: startField\n    });\n}\n\nfunction getValidationErrorType(mode) {\n    const target = mode === CONSTANTS.MODE_REVERSE ? STATE.dom.reverseResult : STATE.dom.result;\n    const message = target?.querySelector('.error-text')?.textContent || '';\n    if (!message) return null;\n\n    const texts = CONFIGS[STATE.currentRegion]?.uiText || {};\n    const candidates = mode === CONSTANTS.MODE_REVERSE\n        ? [\n            ['errorInputReverse', 'amount_or_rate_input'],\n            ['errorRateReverse', 'rate']\n        ]\n        : [\n            ['errorNeededPoints', 'needed_points'],\n            ['errorTargetStatus', 'target_status'],\n            ['errorRate', 'rate'],\n            ['errorTargetConsistency', 'target_consistency'],\n            ['errorZeroPointPurchase', 'zero_point_purchase'],\n            ['errorInput', 'invalid_input']\n        ];\n\n    const matched = candidates.find(([key]) => texts[key] && texts[key] === message);\n    return matched ? matched[1] : 'unknown';\n}\n\nfunction runTrackedCalculation(mode) {\n    const calculationMode = getAnalyticsCalculationMode(mode);\n    const target = mode === CONSTANTS.MODE_REVERSE ? STATE.dom.reverseResult : STATE.dom.result;\n    trackCalculatorFormStarted(mode, 'submit');\n\n    if (mode === CONSTANTS.MODE_REVERSE) {\n        CALC.reverseCalculate();\n    } else {\n        CALC.calculate();\n    }\n\n    const errorType = getValidationErrorType(mode);\n    if (errorType) {\n        ANALYTICS.track('calculator_validation_error', {\n            calculation_mode: calculationMode,\n            region: STATE.currentRegion,\n            error_type: errorType\n        });\n        return;\n    }\n\n    if (!target?.classList.contains(CONSTANTS.CLASS_HAS_RESULT) || calculatorFunnelCompletedModes.has(mode)) return;\n    calculatorFunnelCompletedModes.add(mode);\n    ANALYTICS.track('calculator_funnel_completed', {\n        calculation_mode: calculationMode,\n        region: STATE.currentRegion\n    });\n}\n\nfunction bindCalculatorFunnelStart(element, mode, startField, eventName = 'input') {\n    bindEvent(element, eventName, () => trackCalculatorFormStarted(mode, startField));\n}\n\nfunction trackCalculatorModeChange(nextMode) {\n    const previousMode = activeCalculatorMode;\n    if (!nextMode || previousMode === nextMode) return;\n\n    ANALYTICS.track('calculator_mode_changed', {\n        region: STATE.currentRegion,\n        from_mode: previousMode,\n        to_mode: nextMode\n    });\n    activeCalculatorMode = nextMode;\n\n    if (nextMode === CONSTANTS.MODE_DIARY && !diaryTabOpenedThisPage) {\n        diaryTabOpenedThisPage = true;\n        ANALYTICS.track('diary_tab_opened', {\n            region: STATE.currentRegion,\n            open_surface: 'tab'\n        });\n    }\n}\n\nfunction resetFunnelDedupIfDenied() {\n    const status = window.PlayPointConsent?.getStatus?.();\n    if (status !== 'denied') return;\n    calculatorFunnelStartedModes.clear();\n    calculatorFunnelCompletedModes.clear();\n    diaryTabOpenedThisPage = false;\n}\n`;

  source = replaceOnce(source, bindEnterBlock, funnelHelpers, 'funnel helpers');

  source = replaceOnce(
    source,
    `    bindEvent(STATE.dom.calculateButton, 'click', () => CALC.calculate());\n    bindEvent(STATE.dom.copyButton, 'click', () => CALC.copyResult());\n    bindEvent(STATE.dom.tweetButton, 'click', () => CALC.handleTweet());\n    bindEvent(STATE.dom.reverseCalculateButton, 'click', () => CALC.reverseCalculate());\n    bindEvent(STATE.dom.shareTwitterReverse, 'click', () => CALC.handleTweetReverse());\n    bindEvent(STATE.dom.currentStatus, 'change', () => CALC.updateBaseRateAndTarget());\n    bindEvent(STATE.dom.targetStatus, 'change', () => CALC.updateNeededPointsConstraint());\n    bindEvent(STATE.dom.reverseStatus, 'change', () => CALC.updateReverseBaseRate());`,
    `    bindEvent(STATE.dom.calculateButton, 'click', () => runTrackedCalculation(CONSTANTS.MODE_MAIN));\n    bindEvent(STATE.dom.copyButton, 'click', () => CALC.copyResult());\n    bindEvent(STATE.dom.tweetButton, 'click', () => CALC.handleTweet());\n    bindEvent(STATE.dom.reverseCalculateButton, 'click', () => runTrackedCalculation(CONSTANTS.MODE_REVERSE));\n    bindEvent(STATE.dom.shareTwitterReverse, 'click', () => CALC.handleTweetReverse());\n    bindEvent(STATE.dom.currentStatus, 'change', () => {\n        trackCalculatorFormStarted(CONSTANTS.MODE_MAIN, 'current_status');\n        CALC.updateBaseRateAndTarget();\n    });\n    bindEvent(STATE.dom.targetStatus, 'change', () => {\n        trackCalculatorFormStarted(CONSTANTS.MODE_MAIN, 'target_status');\n        CALC.updateNeededPointsConstraint();\n    });\n    bindEvent(STATE.dom.reverseStatus, 'change', () => {\n        trackCalculatorFormStarted(CONSTANTS.MODE_REVERSE, 'status');\n        CALC.updateReverseBaseRate();\n    });`,
    'tracked calculator actions'
  );

  source = replaceOnce(
    source,
    `    bindLanguageSuggestionDismiss();\n    bindCalendarReminderEvents();\n\n    // Enterキー押下での計算実行\n    bindEnterAction([STATE.dom.neededPoints, STATE.dom.baseRate, STATE.dom.multiplier], () => CALC.calculate());\n    bindEnterAction([STATE.dom.amountYen, STATE.dom.reverseBaseRate, STATE.dom.reverseMultiplier], () => CALC.reverseCalculate());`,
    `    bindLanguageSuggestionDismiss();\n    bindCalendarReminderEvents();\n\n    bindCalculatorFunnelStart(STATE.dom.neededPoints, CONSTANTS.MODE_MAIN, 'needed_points');\n    bindCalculatorFunnelStart(STATE.dom.baseRate, CONSTANTS.MODE_MAIN, 'base_rate');\n    bindCalculatorFunnelStart(STATE.dom.multiplier, CONSTANTS.MODE_MAIN, 'promotion_rate');\n    bindCalculatorFunnelStart(STATE.dom.amountYen, CONSTANTS.MODE_REVERSE, 'amount');\n    bindCalculatorFunnelStart(STATE.dom.reverseBaseRate, CONSTANTS.MODE_REVERSE, 'base_rate');\n    bindCalculatorFunnelStart(STATE.dom.reverseMultiplier, CONSTANTS.MODE_REVERSE, 'promotion_rate');\n    document.addEventListener('playpoint:consent-ready', resetFunnelDedupIfDenied);\n    document.addEventListener('playpoint:consent-updated', resetFunnelDedupIfDenied);\n\n    // Enterキー押下での計算実行\n    bindEnterAction([STATE.dom.neededPoints, STATE.dom.baseRate, STATE.dom.multiplier], () => runTrackedCalculation(CONSTANTS.MODE_MAIN));\n    bindEnterAction([STATE.dom.amountYen, STATE.dom.reverseBaseRate, STATE.dom.reverseMultiplier], () => runTrackedCalculation(CONSTANTS.MODE_REVERSE));`,
    'funnel input bindings'
  );

  source = replaceOnce(
    source,
    `    document.querySelectorAll(".tab-switch button").forEach(button => {\n        button.addEventListener('click', () => {\n            const mode = button.dataset.mode;\n            UI.switchMode(mode);\n            if (mode === CONSTANTS.MODE_DIARY) {\n                queueDiaryAction((DIARY) => DIARY.renderDiary());\n            }\n        });\n    });`,
    `    document.querySelectorAll(".tab-switch button").forEach(button => {\n        button.addEventListener('click', () => {\n            const mode = button.dataset.mode;\n            trackCalculatorModeChange(mode);\n            UI.switchMode(mode);\n            if (mode === CONSTANTS.MODE_DIARY) {\n                queueDiaryAction((DIARY) => DIARY.renderDiary());\n            }\n        });\n    });`,
    'mode tracking'
  );

  write(file, source);
}

function updateAnalyticsDocs() {
  const file = 'docs/ANALYTICS.md';
  let source = read(file);
  source = replaceOnce(
    source,
    "| `reverse_calculation_completed` | 逆算が成功した時 | `calculation_mode`, `region`, 流入属性（該当時のみ） | 逆算機能の需要と記事・LPからの完了率を判断する |\n| `diary_entry_saved` | 週次日記の保存が成功した時 | `region`, `entry_type` | 継続利用の有無を判断する |",
    "| `reverse_calculation_completed` | 逆算が成功した時 | `calculation_mode`, `region`, 流入属性（該当時のみ） | 逆算機能の需要と記事・LPからの完了率を判断する |\n| `calculator_form_started` | 通常計算・逆算で最初の入力/変更/送信があった時（各モード1ページ1回） | `calculation_mode`, `region`, `start_field` | 計算開始数を取得し、流入変動とフォーム離脱を分離する |\n| `calculator_funnel_completed` | 各モードで最初の計算成功時（各モード1ページ1回） | `calculation_mode`, `region` | 再計算による水増しを避けて開始→初回成功率を判断する |\n| `calculator_validation_error` | 明示的な計算操作が入力エラーで失敗した時 | `calculation_mode`, `region`, `error_type` | どの種類の入力エラーが計算完了を妨げているか判断する |\n| `calculator_mode_changed` | 通常計算・逆算・日記のタブを実際に切り替えた時 | `region`, `from_mode`, `to_mode` | モード間の移動需要を判断する |\n| `diary_tab_opened` | 日記タブをそのページで初めて開いた時 | `region`, `open_surface` | 日記を開いた人のうち保存へ進む割合を判断する |\n| `diary_entry_saved` | 週次日記の保存が成功した時 | `region`, `entry_type` | 継続利用の有無を判断する |",
    'analytics docs event rows'
  );
  source = replaceOnce(
    source,
    "`calculation_completed` と `reverse_calculation_completed` には、外部キャンペーンURLに `utm_source`, `utm_medium`, `utm_campaign` がある場合のみ `entry_source`, `entry_medium`, `entry_campaign` を追加する。",
    "`calculator_form_started` と `calculator_funnel_completed` は通常計算・逆算ごとに1ページ1回だけ送る。`calculation_completed` / `reverse_calculation_completed` は従来どおり再計算のたびに送るため、利用回数は既存イベント、開始→初回成功率はファネル専用イベントで判断する。入力した金額・ポイント数そのものはファネルイベントへ送らない。\n\n`calculation_completed` と `reverse_calculation_completed` には、外部キャンペーンURLに `utm_source`, `utm_medium`, `utm_campaign` がある場合のみ `entry_source`, `entry_medium`, `entry_campaign` を追加する。",
    'analytics docs funnel semantics'
  );
  write(file, source);
}

function addFunnelTest() {
  const file = 'tests/calculator-funnel-analytics.test.cjs';
  const content = `'use strict';\n\nconst assert = require('node:assert/strict');\nconst fs = require('node:fs');\nconst path = require('node:path');\nconst test = require('node:test');\nconst vm = require('node:vm');\n\nconst root = path.resolve(__dirname, '..');\nconst analyticsSource = fs.readFileSync(path.join(root, 'js/analytics-core.js'), 'utf8');\nconst mainSource = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');\n\nfunction createAnalyticsRuntime() {\n  const context = {\n    console: { warn() {} },\n    URL,\n    URLSearchParams,\n    location: {\n      href: 'https://playpoint-sim.com/',\n      origin: 'https://playpoint-sim.com',\n      pathname: '/',\n      search: ''\n    },\n    sessionStorage: { getItem() { return null; }, removeItem() {}, setItem() {} },\n    PlayPointConsent: { getStatus: () => 'granted' },\n    document: { addEventListener() {} },\n    dispatchEvent() {},\n    CustomEvent: class CustomEvent {}\n  };\n  context.window = context;\n  vm.createContext(context);\n  vm.runInContext(analyticsSource, context, { filename: 'analytics-core.js' });\n  context.PlayPointAnalytics.markAnalyticsReady();\n  return context;\n}\n\nfunction lastEvent(context, eventName) {\n  const items = context.dataLayer.filter((item) => item && item[0] === 'event' && item[1] === eventName);\n  return items.length ? JSON.parse(JSON.stringify(items.at(-1)[2])) : null;\n}\n\ntest('計算ファネルイベントは分類値だけを許可し入力値を捨てる', () => {\n  const context = createAnalyticsRuntime();\n  const analytics = context.PlayPointAnalytics;\n\n  analytics.track('calculator_form_started', {\n    calculation_mode: 'rank_up', region: 'JP', start_field: 'needed_points', needed_points: 1728\n  });\n  analytics.track('calculator_funnel_completed', {\n    calculation_mode: 'rank_up', region: 'JP', amount: 9800\n  });\n  analytics.track('calculator_validation_error', {\n    calculation_mode: 'rank_up', region: 'JP', error_type: 'needed_points', raw_value: '1728'\n  });\n  analytics.track('calculator_mode_changed', { region: 'JP', from_mode: 'main', to_mode: 'reverse', secret: 'drop' });\n  analytics.track('diary_tab_opened', { region: 'JP', open_surface: 'tab', diary_text: 'drop' });\n\n  assert.deepEqual(lastEvent(context, 'calculator_form_started'), { calculation_mode: 'rank_up', region: 'JP', start_field: 'needed_points' });\n  assert.deepEqual(lastEvent(context, 'calculator_funnel_completed'), { calculation_mode: 'rank_up', region: 'JP' });\n  assert.deepEqual(lastEvent(context, 'calculator_validation_error'), { calculation_mode: 'rank_up', region: 'JP', error_type: 'needed_points' });\n  assert.deepEqual(lastEvent(context, 'calculator_mode_changed'), { region: 'JP', from_mode: 'main', to_mode: 'reverse' });\n  assert.deepEqual(lastEvent(context, 'diary_tab_opened'), { region: 'JP', open_surface: 'tab' });\n});\n\ntest('通常計算と逆算は開始・初回成功・入力エラーを別イベントで計測する', () => {\n  for (const token of [\n    \"ANALYTICS.track('calculator_form_started'\",\n    \"ANALYTICS.track('calculator_funnel_completed'\",\n    \"ANALYTICS.track('calculator_validation_error'\",\n    \"ANALYTICS.track('calculator_mode_changed'\",\n    \"ANALYTICS.track('diary_tab_opened'\"\n  ]) {\n    assert.ok(mainSource.includes(token), token);\n  }\n\n  assert.ok(mainSource.includes('calculatorFunnelStartedModes.has(mode)'));\n  assert.ok(mainSource.includes('calculatorFunnelCompletedModes.has(mode)'));\n  assert.ok(mainSource.includes("start_field: startField"));\n  assert.ok(mainSource.includes("error_type: errorType"));\n  assert.ok(mainSource.includes("bindCalculatorFunnelStart(STATE.dom.neededPoints"));\n  assert.ok(mainSource.includes("bindCalculatorFunnelStart(STATE.dom.amountYen"));\n});\n\ntest('新しいファネル送信処理は入力した数値そのものをイベントパラメータにしない', () => {\n  const start = mainSource.indexOf('function getAnalyticsCalculationMode');\n  const end = mainSource.indexOf('function getResultLinkAnalyticsParams');\n  assert.ok(start >= 0 && end > start);\n  const funnelSection = mainSource.slice(start, end);\n  assert.doesNotMatch(funnelSection, /STATE\\.dom\\.(?:neededPoints|amountYen|baseRate|multiplier)\\.value/);\n  assert.doesNotMatch(funnelSection, /needed_points:\\s*STATE\\./);\n  assert.doesNotMatch(funnelSection, /amount:\\s*STATE\\./);\n});\n`;
  write(file, content);
}

updateAnalyticsCore();
updateMain();
updateAnalyticsDocs();
addFunnelTest();

const workflowPath = path.join(root, '.github/workflows/funnel-v2-apply.yml');
const selfPath = path.join(root, 'scripts/apply-calculator-funnel-v2.cjs');
if (fs.existsSync(workflowPath)) fs.rmSync(workflowPath);
if (fs.existsSync(selfPath)) fs.rmSync(selfPath);

console.log('計算ファネルv2のソース・テスト・ドキュメントを更新しました。');
