'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/analytics-core.js'), 'utf8');

function createRuntime(consentStatus) {
  const storage = new Map();
  const listeners = new Map();
  const context = {
    console: { warn() {} },
    URL,
    URLSearchParams,
    location: {
      href: 'https://playpoint-sim.com/articles/guide.html',
      origin: 'https://playpoint-sim.com',
      pathname: '/articles/guide.html',
      search: ''
    },
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
      addEventListener(type, listener) { listeners.set(type, listener); },
      dispatchEvent(event) {
        const listener = listeners.get(event.type);
        if (listener) listener(event);
      }
    }
  };
  if (consentStatus !== undefined) {
    context.PlayPointConsent = { getStatus: () => consentStatus };
  }
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'analytics-core.js' });
  return { context, storage };
}

function eventCalls(context, eventName) {
  return context.dataLayer
    .filter(item => Array.isArray(item) && item[0] === 'event' && item[1] === eventName)
    .map(item => JSON.parse(JSON.stringify(item[2])));
}

test('記事・LPからの計算機流入は次の計算完了へ一度だけ引き継ぐ', () => {
  const { context, storage } = createRuntime('granted');
  const analytics = context.PlayPointAnalytics;

  assert.equal(analytics.rememberCalculatorEntry('/?mode=main', {
    source_path: '/articles/guide.html',
    link_context: 'article_cta'
  }), true);
  analytics.track('calculation_completed', {
    calculation_mode: 'main',
    region: 'JP',
    target_status: 'platinum',
    needed_points: '送信してはいけない値'
  });

  const first = eventCalls(context, 'calculation_completed');
  assert.equal(first.length, 1);
  assert.deepEqual(first[0], {
    calculation_mode: 'main',
    region: 'JP',
    target_status: 'platinum',
    entry_source_path: '/articles/guide.html',
    entry_link_context: 'article_cta',
    calculator_preset: 'preset'
  });
  assert.equal(storage.size, 0, '流入情報が計算後も残っています');

  analytics.track('calculation_completed', { calculation_mode: 'main', region: 'JP' });
  const second = eventCalls(context, 'calculation_completed');
  assert.equal(second.length, 2);
  assert.equal(second[1].entry_source_path, undefined, '同じ流入が複数回の計算へ付与されています');
});

test('許可外イベント・パラメータ・外部遷移は送信または保存しない', () => {
  const { context, storage } = createRuntime('granted');
  const analytics = context.PlayPointAnalytics;

  assert.equal(analytics.track('unknown_event', { region: 'JP' }), false);
  assert.equal(analytics.rememberCalculatorEntry('https://example.com/', {
    source_path: '/articles/guide.html'
  }), false);
  analytics.track('search', {
    search_term: '<script>very long</script>',
    results_count: -1,
    secret: 'drop'
  });

  assert.equal(eventCalls(context, 'unknown_event').length, 0);
  assert.deepEqual(eventCalls(context, 'search')[0], { search_term: 'scriptvery long/script' });
  assert.equal(storage.size, 0);
});

test('同意前キューは許可後だけflushし、拒否時は保存情報も破棄する', () => {
  const queued = createRuntime();
  queued.context.PlayPointAnalytics.track('theme_change', { theme_mode: 'dark' });
  assert.equal(eventCalls(queued.context, 'theme_change').length, 0);
  queued.context.PlayPointConsent = { getStatus: () => 'granted' };
  queued.context.document.dispatchEvent({ type: 'playpoint:consent-ready' });
  assert.equal(eventCalls(queued.context, 'theme_change').length, 1);

  const denied = createRuntime('granted');
  denied.context.PlayPointAnalytics.rememberCalculatorEntry('/', {
    source_path: '/campaign/2x/',
    link_context: 'hero_cta'
  });
  denied.context.PlayPointConsent = { getStatus: () => 'denied' };
  denied.context.PlayPointAnalytics.track('theme_change', { theme_mode: 'light' });
  assert.equal(denied.storage.size, 0);
  assert.equal(eventCalls(denied.context, 'theme_change').length, 0);
});

test('期限切れ・改ざん済み流入情報は計算値を上書きしない', () => {
  const { context, storage } = createRuntime('granted');
  const key = 'playpointCalculatorEntryContext';
  storage.set(key, JSON.stringify({
    recorded_at: Date.now() - 31 * 60 * 1000,
    entry_source_path: '/old/',
    region: 'KR'
  }));
  context.PlayPointAnalytics.track('calculation_completed', { region: 'JP' });
  assert.deepEqual(eventCalls(context, 'calculation_completed')[0], { region: 'JP' });
  assert.equal(storage.size, 0);

  storage.set(key, JSON.stringify({
    recorded_at: Date.now(),
    entry_source_path: '/articles/guide.html',
    entry_link_context: 'article_link',
    region: 'KR'
  }));
  context.PlayPointAnalytics.track('calculation_completed', { region: 'JP' });
  assert.deepEqual(eventCalls(context, 'calculation_completed')[1], {
    region: 'JP',
    entry_source_path: '/articles/guide.html',
    entry_link_context: 'article_link'
  });
});
