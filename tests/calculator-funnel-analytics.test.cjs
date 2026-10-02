'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const {
  createAnalyticsRuntime,
  latestEventParams
} = require('./helpers/analytics-runtime.cjs');

const root = path.resolve(__dirname, '..');
const mainSource = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');

function createRuntime() {
  return createAnalyticsRuntime({ consentStatus: 'granted', ready: true }).context;
}

test('計算ファネルイベントは分類値だけを許可し入力値を捨てる', () => {
  const context = createRuntime();
  const analytics = context.PlayPointAnalytics;

  analytics.track('calculator_form_started', {
    calculation_mode: 'rank_up', region: 'JP', start_field: 'needed_points', needed_points: 1728
  });
  analytics.track('calculator_funnel_completed', {
    calculation_mode: 'rank_up', region: 'JP', amount: 9800
  });
  analytics.track('calculator_validation_error', {
    calculation_mode: 'rank_up', region: 'JP', error_type: 'needed_points', raw_value: '1728'
  });
  analytics.track('calculator_mode_changed', { region: 'JP', from_mode: 'main', to_mode: 'reverse', secret: 'drop' });
  analytics.track('diary_tab_opened', { region: 'JP', open_surface: 'tab', diary_text: 'drop' });

  assert.deepEqual(latestEventParams(context, 'calculator_form_started'), { calculation_mode: 'rank_up', region: 'JP', start_field: 'needed_points' });
  assert.deepEqual(latestEventParams(context, 'calculator_funnel_completed'), { calculation_mode: 'rank_up', region: 'JP' });
  assert.deepEqual(latestEventParams(context, 'calculator_validation_error'), { calculation_mode: 'rank_up', region: 'JP', error_type: 'needed_points' });
  assert.deepEqual(latestEventParams(context, 'calculator_mode_changed'), { region: 'JP', from_mode: 'main', to_mode: 'reverse' });
  assert.deepEqual(latestEventParams(context, 'diary_tab_opened'), { region: 'JP', open_surface: 'tab' });
  for (const name of ['calculation_completed', 'reverse_calculation_completed', 'diary_entry_saved']) {
    analytics.track(name, { region: 'JP', needed_points: 1728, amount: 9800, earned_points: 200, diary_text: 'private@example.com' });
    assert.deepEqual(latestEventParams(context, name), { region: 'JP' });
  }
});

test("mainから実ファネルへ現在の同意状態と地域を渡す", () => {
  const context = createRuntime();
  const { calculatorFunnel } = loadMain(context);
  context.PlayPointConsent.getStatus = () => 'denied';
  assert.equal(calculatorFunnel.trackFormStarted('main', 'submit'), false);
  context.PlayPointConsent.getStatus = () => 'granted';
  context.STATE.currentRegion = 'TW';
  assert.equal(calculatorFunnel.trackFormStarted('main', 'submit'), true);
  assert.deepEqual(latestEventParams(context, 'calculator_form_started'), {
    calculation_mode: 'rank_up', region: 'TW', start_field: 'submit'
  });
});
test("結果リンク計測は外部URLを内部pathへ偽装せず遷移種別だけ残す", () => {
  const context = createRuntime();
  const { trackResultLinkClicks } = loadMain(context);
  for (const [href, type, targetPath] of [
    ['/en/articles/guide.html?amount=9800#private', 'internal', '/en/articles/guide.html'],
    ['https://support.google.com/googleplay/answer/9080348?amount=9800', 'official_google_support', undefined],
    ['https://support.google.com.example.com/googleplay/secret', 'external', undefined],
    ['http://support.google.com/googleplay/answer/9080348', 'external', undefined],
    ['https://support.google.com/other/secret', 'external', undefined]
  ]) {
    const link = { href: new URL(href, context.location.href).href, dataset: { linkPosition: '1' } };
    trackResultLinkClicks({ target: { closest(selector) { return selector === '[data-result-decision-link]' ? link : null; } } });
    const sent = latestEventParams(context, 'result_decision_link_clicked');
    assert.equal(sent.destination_type, type);
    assert.equal(sent.target_path, targetPath);
    assert.equal(sent.link_position, 1);
    assert.equal(sent.target_status, 'Platinum');
    assert.ok(!JSON.stringify(sent).includes('amount='));
  }
});
// main全体のトップレベルと実ファネルを実行する。DOM初期化・ESMリンクは既存ブラウザ検証が担当。
function loadMain(context) {
  context.ANALYTICS = context.PlayPointAnalytics;
  context.initWebVitalsMonitoring = () => {};
  context.initPwaInstallPrompt = () => {};
  context.STATE = { currentRegion: 'JP', dom: { result: { dataset: { targetStatusLabel: 'Platinum' } } } };
  context.CONSTANTS = { MODE_MAIN: 'main', MODE_REVERSE: 'reverse', MODE_DIARY: 'diary' };
  vm.runInContext(fs.readFileSync(path.join(root, 'js/calculator-funnel-analytics.js'), 'utf8').replace(/^export\s+/gm, ''), context);
  vm.runInContext(mainSource.replace(/^import[\s\S]*?;\s*$/gm, '').replace(/^export\s*\{[^}]*\};/gm, '').replace(/^export\s+/gm, ''), context, { filename: 'main.js' });
  return vm.runInContext('({calculatorFunnel, trackResultLinkClicks})', context);
}
