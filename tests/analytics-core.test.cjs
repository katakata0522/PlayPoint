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

function eventItems(context, eventName) {
  return context.dataLayer
    .filter(item => item && item[0] === 'event' && item[1] === eventName);
}

function eventCalls(context, eventName) {
  return eventItems(context, eventName)
    .map(item => JSON.parse(JSON.stringify(item[2])));
}

test('GA4初期化前のイベントは保持し、準備完了後に一度だけ送信する', () => {
  const { context } = createRuntime('granted');
  const analytics = context.PlayPointAnalytics;

  assert.equal(analytics.track('calculation_completed', {
    calculation_mode: 'main',
    region: 'JP'
  }), false);
  assert.equal(eventCalls(context, 'calculation_completed').length, 0);

  analytics.markAnalyticsReady();

  const flushed = eventCalls(context, 'calculation_completed');
  assert.equal(flushed.length, 1);
  assert.deepEqual(flushed[0], {
    calculation_mode: 'main',
    region: 'JP'
  });
  assert.equal(
    Array.isArray(eventItems(context, 'calculation_completed')[0]),
    false,
    'gtag公式形と異なる通常配列がdataLayerへ積まれています'
  );

  analytics.markAnalyticsReady();
  assert.equal(eventCalls(context, 'calculation_completed').length, 1);
});

test('手動page_viewモードでは保留イベントより先に一度だけpage_viewを送る', () => {
  const { context } = createRuntime('granted');
  const analytics = context.PlayPointAnalytics;
  context.__playpointManualPageView = true;
  analytics.track('theme_change', { theme_mode: 'dark' });

  analytics.markAnalyticsReady();

  const sentNames = context.dataLayer
    .filter(item => item && item[0] === 'event')
    .map(item => item[1]);
  assert.equal(sentNames[0], 'page_view');
  assert.equal(sentNames[1], 'theme_change');
  assert.equal(eventCalls(context, 'page_view').length, 1);

  analytics.markAnalyticsReady();
  analytics.flushPending();
  assert.equal(eventCalls(context, 'page_view').length, 1, '初回page_viewが重複送信されています');
});

test('記事・LPからの流入は開始・初回成功へ引き継ぎ、計算完了には一度だけ付与する', () => {
  const { context, storage } = createRuntime('granted');
  const analytics = context.PlayPointAnalytics;
  analytics.markAnalyticsReady();

  assert.equal(analytics.rememberCalculatorEntry('/?mode=main', {
    source_path: '/articles/guide.html',
    link_context: 'article_cta'
  }), true);

  analytics.track('calculator_form_started', {
    calculation_mode: 'rank_up',
    region: 'JP',
    start_field: 'needed_points'
  });
  assert.deepEqual(eventCalls(context, 'calculator_form_started')[0], {
    calculation_mode: 'rank_up',
    region: 'JP',
    start_field: 'needed_points',
    entry_source_path: '/articles/guide.html',
    entry_link_context: 'article_cta',
    calculator_preset: 'preset'
  });
  assert.equal(storage.size, 0, '計算機到着後も流入情報がsessionStorageに残っています');

  analytics.track('calculation_completed', {
    calculation_mode: 'rank_up',
    region: 'JP',
    target_status: 'platinum',
    needed_points: '送信してはいけない値'
  });
  assert.deepEqual(eventCalls(context, 'calculation_completed')[0], {
    calculation_mode: 'rank_up',
    region: 'JP',
    target_status: 'platinum',
    entry_source_path: '/articles/guide.html',
    entry_link_context: 'article_cta',
    calculator_preset: 'preset'
  });

  analytics.track('calculator_funnel_completed', {
    calculation_mode: 'rank_up',
    region: 'JP'
  });
  assert.deepEqual(eventCalls(context, 'calculator_funnel_completed')[0], {
    calculation_mode: 'rank_up',
    region: 'JP',
    entry_source_path: '/articles/guide.html',
    entry_link_context: 'article_cta',
    calculator_preset: 'preset'
  });

  analytics.track('calculation_completed', { calculation_mode: 'rank_up', region: 'JP' });
  const completions = eventCalls(context, 'calculation_completed');
  assert.equal(completions.length, 2);
  assert.equal(completions[1].entry_source_path, undefined, '同じ流入が複数回の計算完了へ付与されています');
});

test('計算完了が初回成功イベントより先でも記事起点を失わない', () => {
  const { context } = createRuntime('granted');
  const analytics = context.PlayPointAnalytics;
  analytics.markAnalyticsReady();
  analytics.rememberCalculatorEntry('/', {
    source_path: '/tw/articles/google-play-quests.html',
    link_context: 'article_calculator_prompt'
  });

  analytics.track('calculation_completed', { calculation_mode: 'rank_up', region: 'TW' });
  analytics.track('calculator_funnel_completed', { calculation_mode: 'rank_up', region: 'TW' });

  assert.equal(eventCalls(context, 'calculation_completed')[0].entry_source_path, '/tw/articles/google-play-quests.html');
  assert.equal(eventCalls(context, 'calculator_funnel_completed')[0].entry_source_path, '/tw/articles/google-play-quests.html');
});

test('許可外イベント・パラメータ・外部遷移は送信または保存しない', () => {
  const { context, storage } = createRuntime('granted');
  const analytics = context.PlayPointAnalytics;
  analytics.markAnalyticsReady();

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

test('同意後でもGA4準備前はflushせず、拒否時は保存情報も破棄する', () => {
  const queued = createRuntime();
  queued.context.PlayPointAnalytics.track('theme_change', { theme_mode: 'dark' });
  assert.equal(eventCalls(queued.context, 'theme_change').length, 0);

  queued.context.PlayPointConsent = { getStatus: () => 'granted' };
  queued.context.document.dispatchEvent({ type: 'playpoint:consent-ready' });
  assert.equal(
    eventCalls(queued.context, 'theme_change').length,
    0,
    'GA4のconfig前に同意イベントだけで送信されています'
  );

  queued.context.PlayPointAnalytics.markAnalyticsReady();
  assert.equal(eventCalls(queued.context, 'theme_change').length, 1);

  const denied = createRuntime('granted');
  denied.context.PlayPointAnalytics.markAnalyticsReady();
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
  context.PlayPointAnalytics.markAnalyticsReady();
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


test('同意pending中はイベントを捨てず、明示拒否時だけ破棄する', () => {
  const pending = createRuntime('pending');
  pending.context.PlayPointAnalytics.markAnalyticsReady();
  pending.context.PlayPointAnalytics.track('theme_change', { theme_mode: 'dark' });
  assert.equal(eventCalls(pending.context, 'theme_change').length, 0);

  pending.context.PlayPointConsent = { getStatus: () => 'granted' };
  pending.context.document.dispatchEvent({ type: 'playpoint:consent-updated' });
  assert.equal(eventCalls(pending.context, 'theme_change').length, 1);

  const denied = createRuntime('pending');
  denied.context.PlayPointAnalytics.markAnalyticsReady();
  denied.context.PlayPointAnalytics.track('theme_change', { theme_mode: 'dark' });
  denied.context.PlayPointConsent = { getStatus: () => 'denied' };
  denied.context.document.dispatchEvent({ type: 'playpoint:consent-updated' });
  denied.context.PlayPointConsent = { getStatus: () => 'granted' };
  denied.context.document.dispatchEvent({ type: 'playpoint:consent-updated' });
  assert.equal(eventCalls(denied.context, 'theme_change').length, 0);
});
