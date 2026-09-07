'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  STORAGE_KEY,
  createAnalyticsRuntime,
  eventCalls,
  latestEventParams,
  replaceGtagWithExternal
} = require('./helpers/analytics-runtime.cjs');

function createRuntimeWithStoredEntry() {
  return createAnalyticsRuntime({
    consentStatus: 'granted',
    ready: true,
    location: {
      href: 'https://playpoint-sim.com/',
      origin: 'https://playpoint-sim.com',
      pathname: '/',
      search: ''
    },
    storedEntries: [[STORAGE_KEY, JSON.stringify({
      recorded_at: Date.now(),
      entry_source_path: '/articles/2026-07-31-google-play-quests.html',
      entry_link_context: 'article_calculator_prompt',
      calculator_preset: 'blank'
    })]]
  });
}

test('外部タグがgtag関数を置き換えても記事起点を送信直前に付与する', () => {
  const { context, storage } = createRuntimeWithStoredEntry();

  // Tag Assistant / gtag.jsなどが初期bridge後にwindow.gtagを差し替える実ブラウザ条件を再現する。
  replaceGtagWithExternal(context);

  assert.equal(context.PlayPointAnalytics.track('calculator_form_started', {
    calculation_mode: 'rank_up',
    region: 'JP',
    start_field: 'current_status'
  }), true);

  assert.deepEqual(latestEventParams(context, 'calculator_form_started'), {
    calculation_mode: 'rank_up',
    region: 'JP',
    start_field: 'current_status',
    entry_source_path: '/articles/2026-07-31-google-play-quests.html',
    entry_link_context: 'article_calculator_prompt',
    calculator_preset: 'blank'
  });
  assert.equal(storage.has(STORAGE_KEY), false, '復元済みの一時情報がsessionStorageへ残っています');
});

test('gtag置換後も初回計算完了だけに記事起点を付与する', () => {
  const { context } = createRuntimeWithStoredEntry();
  replaceGtagWithExternal(context);

  context.PlayPointAnalytics.track('calculation_completed', {
    calculation_mode: 'rank_up',
    region: 'JP',
    target_status: 'platinum'
  });
  context.PlayPointAnalytics.track('calculation_completed', {
    calculation_mode: 'rank_up',
    region: 'JP',
    target_status: 'diamond'
  });

  const events = eventCalls(context, 'calculation_completed');
  assert.equal(events[0].entry_source_path, '/articles/2026-07-31-google-play-quests.html');
  assert.equal(events[0].entry_link_context, 'article_calculator_prompt');
  assert.equal(events[0].calculator_preset, 'blank');
  assert.equal(events[1].entry_source_path, undefined, '同じ記事起点が再計算へ重複付与されています');
});
