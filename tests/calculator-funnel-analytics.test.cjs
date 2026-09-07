'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  createAnalyticsRuntime,
  latestEventParams
} = require('./helpers/analytics-runtime.cjs');

const root = path.resolve(__dirname, '..');
const mainSource = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
const funnelSource = fs.readFileSync(path.join(root, 'js/calculator-funnel-analytics.js'), 'utf8');

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
});

test('計算ファネルの状態管理は専用モジュールへ集約する', () => {
  assert.match(mainSource, /from '\.\/calculator-funnel-analytics\.js'/, 'mainが専用ファネルモジュールを利用していません');
  assert.match(mainSource, /createCalculatorFunnelAnalytics/, 'mainがファネルトラッカーを初期化していません');
  assert.doesNotMatch(mainSource, /calculatorFunnelStartedModes|calculatorFunnelCompletedModes|diaryTabOpenedThisPage/, 'mainにファネルdedupe状態が再実装されています');

  assert.doesNotMatch(funnelSource, /STATE\.|document\.|\.value\b/, 'ファネルモジュールがDOMや生入力値へ直接依存しています');
  assert.match(funnelSource, /getConsentStatus/, 'Consent状態がファネル境界へ注入されていません');
  assert.match(funnelSource, /getRegion/, '地域分類がファネル境界へ注入されていません');
});

test('結果リンク計測は外部URLを内部pathへ偽装せず遷移種別だけ残す', () => {
  const context = createRuntime();
  const analytics = context.PlayPointAnalytics;

  analytics.track('result_decision_link_clicked', {
    source_path: '/hk/',
    target_path: 'https://support.google.com/googleplay/answer/9080348',
    destination_type: 'official_google_support',
    target_status: '鑽石級',
    calculation_mode: 'rank_up',
    link_position: 1
  });
  assert.deepEqual(latestEventParams(context, 'result_decision_link_clicked'), {
    source_path: '/hk/',
    destination_type: 'official_google_support',
    target_status: '鑽石級',
    calculation_mode: 'rank_up',
    link_position: 1
  });

  analytics.track('result_related_article_clicked', {
    source_path: '/en/',
    target_path: '/en/articles/google-play-points-levels.html',
    destination_type: 'internal',
    target_status: 'Platinum',
    calculation_mode: 'rank_up',
    link_position: 2
  });
  assert.deepEqual(latestEventParams(context, 'result_related_article_clicked'), {
    source_path: '/en/',
    target_path: '/en/articles/google-play-points-levels.html',
    destination_type: 'internal',
    target_status: 'Platinum',
    calculation_mode: 'rank_up',
    link_position: 2
  });

  assert.match(mainSource, /targetUrl\.origin === window\.location\.origin/);
  assert.match(mainSource, /targetUrl\.hostname === 'support\.google\.com'/);
  assert.match(mainSource, /destination_type:\s*destinationType/);
  assert.match(mainSource, /target_path:\s*destinationType === 'internal' \? targetUrl\.pathname : undefined/);
});
