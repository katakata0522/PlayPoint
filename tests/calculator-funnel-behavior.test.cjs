'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.resolve(__dirname, '../js/calculator-funnel-analytics.js'), 'utf8')
  .replace(/^export\s+/gm, '');

function createRuntime(initialConsent = 'granted') {
  const events = [];
  let consent = initialConsent;
  let region = 'JP';
  const context = { console };
  vm.createContext(context);
  vm.runInContext(`${source}\nglobalThis.__create = createCalculatorFunnelAnalytics;`, context, {
    filename: 'calculator-funnel-analytics.js'
  });

  const tracker = context.__create({
    analytics: { track(name, params) { events.push({ name, params: JSON.parse(JSON.stringify(params)) }); } },
    getConsentStatus: () => consent,
    getRegion: () => region,
    modeMain: 'main',
    modeReverse: 'reverse',
    modeDiary: 'diary'
  });

  return {
    events,
    tracker,
    setConsent(value) { consent = value; },
    setRegion(value) { region = value; }
  };
}

function eventsNamed(runtime, name) {
  return runtime.events.filter(event => event.name === name);
}

test('開始イベントは計算モードごとに最初の操作だけを記録する', () => {
  const runtime = createRuntime();

  assert.equal(runtime.tracker.trackFormStarted('main', 'needed_points'), true);
  assert.equal(runtime.tracker.trackFormStarted('main', 'base_rate'), false);
  assert.equal(runtime.tracker.trackFormStarted('reverse', 'amount'), true);

  assert.deepEqual(eventsNamed(runtime, 'calculator_form_started'), [
    { name: 'calculator_form_started', params: { calculation_mode: 'rank_up', region: 'JP', start_field: 'needed_points' } },
    { name: 'calculator_form_started', params: { calculation_mode: 'spend_to_points', region: 'JP', start_field: 'amount' } }
  ]);
});

test('完了イベントはモードごとに一度だけ記録する', () => {
  const runtime = createRuntime();

  assert.equal(runtime.tracker.trackCompleted('main'), true);
  assert.equal(runtime.tracker.trackCompleted('main'), false);
  assert.equal(runtime.tracker.trackCompleted('reverse'), true);

  assert.deepEqual(eventsNamed(runtime, 'calculator_funnel_completed').map(event => event.params), [
    { calculation_mode: 'rank_up', region: 'JP' },
    { calculation_mode: 'spend_to_points', region: 'JP' }
  ]);
});

test('入力エラーは分類値だけをイベントへ渡し生入力を受け取るAPIを持たない', () => {
  const runtime = createRuntime();

  assert.equal(runtime.tracker.trackValidationError('main', 'needed_points'), true);
  assert.equal(runtime.tracker.trackValidationError('reverse', 'amount_or_rate_input'), true);
  assert.equal(runtime.tracker.trackValidationError('main', ''), false);

  assert.deepEqual(eventsNamed(runtime, 'calculator_validation_error').map(event => event.params), [
    { calculation_mode: 'rank_up', region: 'JP', error_type: 'needed_points' },
    { calculation_mode: 'spend_to_points', region: 'JP', error_type: 'amount_or_rate_input' }
  ]);
  assert.deepEqual(Object.keys(runtime.tracker).sort(), [
    'resetIfDenied',
    'trackCompleted',
    'trackFormStarted',
    'trackModeChange',
    'trackValidationError'
  ]);
});

test('拒否中は送信だけでなく開始・完了のdedupe状態も汚さない', () => {
  const runtime = createRuntime('denied');

  assert.equal(runtime.tracker.trackFormStarted('main', 'submit'), false);
  assert.equal(runtime.tracker.trackCompleted('main'), false);
  assert.deepEqual(runtime.events, []);

  runtime.setConsent('granted');
  assert.equal(runtime.tracker.trackFormStarted('main', 'submit'), true);
  assert.equal(runtime.tracker.trackCompleted('main'), true);
  assert.equal(eventsNamed(runtime, 'calculator_form_started').length, 1);
  assert.equal(eventsNamed(runtime, 'calculator_funnel_completed').length, 1);
});

test('pending中のdedupeは拒否確定時にリセットし、後の許可で再計測できる', () => {
  const runtime = createRuntime('pending');

  assert.equal(runtime.tracker.trackFormStarted('main', 'needed_points'), true);
  assert.equal(runtime.tracker.trackCompleted('main'), true);

  runtime.setConsent('denied');
  assert.equal(runtime.tracker.resetIfDenied(), true);

  runtime.setConsent('granted');
  runtime.setRegion('US');
  assert.equal(runtime.tracker.trackFormStarted('main', 'submit'), true);
  assert.equal(runtime.tracker.trackCompleted('main'), true);

  assert.equal(eventsNamed(runtime, 'calculator_form_started').length, 2);
  assert.equal(eventsNamed(runtime, 'calculator_funnel_completed').length, 2);
  assert.equal(eventsNamed(runtime, 'calculator_funnel_completed').at(-1).params.region, 'US');
});

test('モード変更は実際に変わった時だけ記録し日記openはページ内一度に絞る', () => {
  const runtime = createRuntime();

  assert.equal(runtime.tracker.trackModeChange('main'), false);
  assert.equal(runtime.tracker.trackModeChange('reverse'), true);
  assert.equal(runtime.tracker.trackModeChange('diary'), true);
  assert.equal(runtime.tracker.trackModeChange('main'), true);
  assert.equal(runtime.tracker.trackModeChange('diary'), true);

  assert.equal(eventsNamed(runtime, 'calculator_mode_changed').length, 4);
  assert.equal(eventsNamed(runtime, 'diary_tab_opened').length, 1);
});

test('拒否中の日記操作はopen済み扱いにせず、許可後の次回openを記録できる', () => {
  const runtime = createRuntime('denied');

  runtime.tracker.trackModeChange('diary');
  assert.deepEqual(runtime.events, []);

  runtime.setConsent('granted');
  runtime.tracker.trackModeChange('main');
  runtime.tracker.trackModeChange('diary');

  assert.equal(eventsNamed(runtime, 'diary_tab_opened').length, 1);
  assert.deepEqual(eventsNamed(runtime, 'diary_tab_opened')[0].params, { region: 'JP', open_surface: 'tab' });
});
