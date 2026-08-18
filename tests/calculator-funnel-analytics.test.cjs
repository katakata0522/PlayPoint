'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const analyticsSource = fs.readFileSync(path.join(root, 'js/analytics-core.js'), 'utf8');
const mainSource = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');

function createAnalyticsRuntime() {
  const context = {
    console: { warn() {} },
    URL,
    URLSearchParams,
    location: {
      href: 'https://playpoint-sim.com/',
      origin: 'https://playpoint-sim.com',
      pathname: '/',
      search: ''
    },
    sessionStorage: { getItem() { return null; }, removeItem() {}, setItem() {} },
    PlayPointConsent: { getStatus: () => 'granted' },
    document: { addEventListener() {} },
    dispatchEvent() {},
    CustomEvent: class CustomEvent {}
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(analyticsSource, context, { filename: 'analytics-core.js' });
  context.PlayPointAnalytics.markAnalyticsReady();
  return context;
}

function lastEvent(context, eventName) {
  const items = context.dataLayer.filter((item) => item && item[0] === 'event' && item[1] === eventName);
  return items.length ? JSON.parse(JSON.stringify(items.at(-1)[2])) : null;
}

test('計算ファネルイベントは分類値だけを許可し入力値を捨てる', () => {
  const context = createAnalyticsRuntime();
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

  assert.deepEqual(lastEvent(context, 'calculator_form_started'), { calculation_mode: 'rank_up', region: 'JP', start_field: 'needed_points' });
  assert.deepEqual(lastEvent(context, 'calculator_funnel_completed'), { calculation_mode: 'rank_up', region: 'JP' });
  assert.deepEqual(lastEvent(context, 'calculator_validation_error'), { calculation_mode: 'rank_up', region: 'JP', error_type: 'needed_points' });
  assert.deepEqual(lastEvent(context, 'calculator_mode_changed'), { region: 'JP', from_mode: 'main', to_mode: 'reverse' });
  assert.deepEqual(lastEvent(context, 'diary_tab_opened'), { region: 'JP', open_surface: 'tab' });
});

test('通常計算と逆算は開始・初回成功・入力エラーを別イベントで計測する', () => {
  for (const token of [
    "ANALYTICS.track('calculator_form_started'",
    "ANALYTICS.track('calculator_funnel_completed'",
    "ANALYTICS.track('calculator_validation_error'",
    "ANALYTICS.track('calculator_mode_changed'",
    "ANALYTICS.track('diary_tab_opened'"
  ]) {
    assert.ok(mainSource.includes(token), token);
  }

  assert.ok(mainSource.includes('calculatorFunnelStartedModes.has(mode)'));
  assert.ok(mainSource.includes('calculatorFunnelCompletedModes.has(mode)'));
  assert.ok(mainSource.includes('start_field: startField'));
  assert.ok(mainSource.includes('error_type: errorType'));
  assert.ok(mainSource.includes('bindCalculatorFunnelStart(STATE.dom.neededPoints'));
  assert.ok(mainSource.includes('bindCalculatorFunnelStart(STATE.dom.amountYen'));
});

test('新しいファネル送信処理は入力した数値そのものをイベントパラメータにしない', () => {
  const start = mainSource.indexOf('function getAnalyticsCalculationMode');
  const end = mainSource.indexOf('function getResultLinkAnalyticsParams');
  assert.ok(start >= 0 && end > start);
  const funnelSection = mainSource.slice(start, end);
  assert.doesNotMatch(funnelSection, /STATE\.dom\.(?:neededPoints|amountYen|baseRate|multiplier)\.value/);
  assert.doesNotMatch(funnelSection, /needed_points:\s*STATE\./);
  assert.doesNotMatch(funnelSection, /amount:\s*STATE\./);
});
