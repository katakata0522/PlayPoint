'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/analytics-core.js'), 'utf8');
const storageKey = 'playpointCalculatorEntryContext';

function createRuntimeWithStoredEntry() {
  const storage = new Map([
    [storageKey, JSON.stringify({
      recorded_at: Date.now(),
      entry_source_path: '/articles/2026-07-31-google-play-quests.html',
      entry_link_context: 'article_calculator_prompt',
      calculator_preset: 'blank'
    })]
  ]);
  const listeners = new Map();
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
    PlayPointConsent: { getStatus: () => 'granted' },
    sessionStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      removeItem(key) { storage.delete(key); },
      setItem(key, value) { storage.set(key, String(value)); }
    },
    dispatchEvent() {},
    CustomEvent: class CustomEvent {
      constructor(type) { this.type = type; }
    },
    document: {
      addEventListener(type, listener) { listeners.set(type, listener); }
    }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'analytics-core.js' });
  context.PlayPointAnalytics.markAnalyticsReady();
  return { context, storage };
}

function latestEventParams(context, eventName) {
  const item = context.dataLayer
    .filter(entry => entry && entry[0] === 'event' && entry[1] === eventName)
    .at(-1);
  return item ? JSON.parse(JSON.stringify(item[2])) : null;
}

test('外部タグがgtag関数を置き換えても記事起点を送信直前に付与する', () => {
  const { context, storage } = createRuntimeWithStoredEntry();

  // Tag Assistant / gtag.jsなどが初期bridge後にwindow.gtagを差し替える実ブラウザ条件を再現する。
  context.gtag = function externalGtag() {
    context.dataLayer.push(arguments);
  };

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
  assert.equal(storage.has(storageKey), false, '復元済みの一時情報がsessionStorageへ残っています');
});

test('gtag置換後も初回計算完了だけに記事起点を付与する', () => {
  const { context } = createRuntimeWithStoredEntry();
  context.gtag = function externalGtag() {
    context.dataLayer.push(arguments);
  };

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

  const events = context.dataLayer
    .filter(entry => entry && entry[0] === 'event' && entry[1] === 'calculation_completed')
    .map(entry => JSON.parse(JSON.stringify(entry[2])));

  assert.equal(events[0].entry_source_path, '/articles/2026-07-31-google-play-quests.html');
  assert.equal(events[0].entry_link_context, 'article_calculator_prompt');
  assert.equal(events[0].calculator_preset, 'blank');
  assert.equal(events[1].entry_source_path, undefined, '同じ記事起点が再計算へ重複付与されています');
});
