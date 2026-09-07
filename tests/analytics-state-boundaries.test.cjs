'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  STORAGE_KEY,
  createAnalyticsRuntime,
  eventCalls
} = require('./helpers/analytics-runtime.cjs');

test('未来日時・壊れたJSONの流入情報は破棄し、イベント送信を止めない', () => {
  const future = createAnalyticsRuntime({
    consentStatus: 'granted',
    ready: true,
    storedEntries: [[STORAGE_KEY, JSON.stringify({
      recorded_at: Date.now() + 61 * 1000,
      entry_source_path: '/articles/future.html'
    })]]
  });
  assert.equal(future.context.PlayPointAnalytics.track('calculation_completed', { region: 'JP' }), true);
  assert.deepEqual(eventCalls(future.context, 'calculation_completed')[0], { region: 'JP' });
  assert.equal(future.storage.size, 0);

  const malformed = createAnalyticsRuntime({
    consentStatus: 'granted',
    ready: true,
    storedEntries: [[STORAGE_KEY, '{not-json']]
  });
  assert.equal(malformed.context.PlayPointAnalytics.track('calculation_completed', { region: 'JP' }), true);
  assert.deepEqual(eventCalls(malformed.context, 'calculation_completed')[0], { region: 'JP' });
  assert.equal(malformed.storage.size, 0);
  assert.equal(malformed.warnings.length, 1);
});

test('保留キューは上限20件を維持し、古いイベントから落とす', () => {
  const { context } = createAnalyticsRuntime({ consentStatus: 'pending', ready: true });

  for (let index = 0; index < 25; index += 1) {
    context.PlayPointAnalytics.track('theme_change', { theme_mode: `mode_${index}` });
  }
  assert.equal(eventCalls(context, 'theme_change').length, 0);

  context.PlayPointConsent = { getStatus: () => 'granted' };
  context.document.dispatchEvent({ type: 'playpoint:consent-updated' });

  const events = eventCalls(context, 'theme_change');
  assert.equal(events.length, 20);
  assert.equal(events[0].theme_mode, 'mode_5');
  assert.equal(events.at(-1).theme_mode, 'mode_24');
});
