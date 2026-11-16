'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  STORAGE_KEY,
  createAnalyticsRuntime,
  eventCalls,
  eventItems,
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

test('共有URLの入力値を初期設定と全イベントのURL文脈から除き、復元用URLと流入元を保持する', () => {
  const queries = [
    '?mode=reverse&status=1&multiplier=1&amount=23456&eligible=22000&baseRate=2.5',
    '?mode=main&status=1&target=silver&points=137&multiplier=3',
    '?a%6dount=23456&amount=99999&note=diary-test&points=137'
  ];
  for (const search of queries) {
    for (const external of [false, true]) {
      const href = `https://playpoint-sim.com/${search}&utm_source=qa&utm_medium=test&utm_campaign=issue180&gclid=fictional-click#amount=23456`;
      const { context } = createAnalyticsRuntime({
        consentStatus: 'granted', ready: true,
        location: { href, origin: 'https://playpoint-sim.com', pathname: '/', search: new URL(href).search },
        referrer: 'https://playpoint-sim.com/?points=137&amount=23456#diary-test'
      });
      const safeLocation = 'https://playpoint-sim.com/?utm_source=qa&utm_medium=test&utm_campaign=issue180&gclid=fictional-click';
      context.gtag('config', 'G-TEST');
      const config = Array.from(context.dataLayer).find(item => item[0] === 'config')[2];
      assert.equal(config?.page_location, safeLocation);
      assert.equal(config.page_referrer, 'https://playpoint-sim.com/');
      const defaults = Array.from(context.dataLayer).find(item => item[0] === 'set' && item[1]?.page_location)?.[1];
      assert.equal(defaults?.page_location, safeLocation, 'Googleタグの読み込み前にも既定URLを保護する');
      if (external) replaceGtagWithExternal(context);
      for (const name of ['page_view', 'calculation_completed', 'reverse_calculation_completed', 'share_url_copied', 'share_x_clicked', 'result_related_article_clicked', 'result_decision_link_clicked', 'diary_entry_saved']) {
        assert.equal(context.PlayPointAnalytics.track(name, { region: 'JP', amount: 23456, points: 137, page_location: href, page_referrer: href }), true);
        const params = eventItems(context, name).at(-1)[2];
        assert.equal(params.page_location, safeLocation, `${name}: location`);
        assert.equal(params.page_referrer, 'https://playpoint-sim.com/', `${name}: referrer`);
        assert.doesNotMatch(JSON.stringify(params), /23456|99999|137|22000|diary-test/);
      }
      assert.equal(context.location.href, href, '共有条件の復元に使うブラウザURLは変更しない');
      assert.equal(context.location.search, new URL(href).search);
      assert.deepEqual(JSON.parse(JSON.stringify(context.PlayPointAnalytics.getEntryContext())), { entry_source: 'qa', entry_medium: 'test', entry_campaign: 'issue180' });
    }
  }
});

test('参照元の認証情報・クエリ・断片と不正URLを既定値へ戻さず除く', () => {
  for (const [referrer, expected] of [
    ['https://test-user:fictional-password@example.org/guide?amount=23456#points=137', 'https://example.org/guide'],
    ['javascript:amount=23456', ''], ['not a URL', ''], ['', '']
  ]) {
    const { context } = createAnalyticsRuntime({ consentStatus: 'granted', ready: true, referrer });
    context.PlayPointAnalytics.track('share_url_copied', { region: 'JP' });
    assert.equal(eventItems(context, 'share_url_copied')[0][2].page_referrer, expected);
  }
});

test('直接のconfig・set・eventでもURL上書きを拒否しArgumentsと既存オプションを維持する', () => {
  const { context } = createAnalyticsRuntime({ consentStatus: 'granted', ready: true });
  const raw = 'https://playpoint-sim.com/?amount=23456';
  context.gtag('config', 'G-TEST', { send_page_view: false, page_location: raw, page_referrer: raw });
  context.gtag('set', { app_display_mode: 'browser', page_location: raw });
  context.gtag('set', 'page_referrer', raw);
  context.gtag('event', 'page_view');
  const calls = Array.from(context.dataLayer);
  const config = calls.find(item => item[0] === 'config');
  assert.equal(Object.prototype.toString.call(config), '[object Arguments]');
  assert.equal(config.length, 3);
  assert.equal(config[2].send_page_view, false);
  assert.equal(config[2].page_location, 'https://playpoint-sim.com/articles/guide.html');
  assert.equal(config[2].page_referrer, '');
  const objectSet = calls.find(item => item[0] === 'set' && item[1]?.app_display_mode);
  assert.equal(objectSet[1].app_display_mode, 'browser');
  assert.equal(objectSet[1].page_location, 'https://playpoint-sim.com/articles/guide.html');
  assert.equal(calls.find(item => item[0] === 'set' && item[1] === 'page_referrer')[2], '');
  const event = eventItems(context, 'page_view')[0];
  assert.equal(event.length, 3, '第3引数省略でもGoogleタグが受け取れる引数長にする');
  assert.equal(event[2].page_location, 'https://playpoint-sim.com/articles/guide.html');
});

test('保留中にURLが変わっても送信時の安全な文脈を使い、拒否中のイベントを再送しない', () => {
  for (const initial of ['pending', 'denied']) {
    const { context } = createAnalyticsRuntime({ consentStatus: initial, ready: true });
    context.PlayPointAnalytics.track('share_url_copied', { region: 'JP' });
    assert.equal(eventItems(context, 'share_url_copied').length, 0);
    context.location.href = 'https://playpoint-sim.com/?mode=reverse&amount=23456#points=137';
    context.PlayPointConsent = { getStatus: () => 'granted' };
    context.document.dispatchEvent({ type: 'playpoint:consent-updated' });
    const events = eventItems(context, 'share_url_copied');
    assert.equal(events.length, initial === 'pending' ? 1 : 0);
    if (events.length) assert.equal(events[0][2].page_location, 'https://playpoint-sim.com/');
  }
});

test('自動検索の全既定キーを計測開始前に移し、旧qの値・重複・計算条件・履歴stateを保つ', () => {
  const href = 'https://playpoint-sim.com/blog/?%71=Play+Pass&q=second&s=typed&search=typed2&query=typed3&keyword=typed4&amount=23456&points=137&utm_source=qa#reading-library';
  const state = { reader: 'keep', page: 2 };
  const { context, historyUpdates } = createAnalyticsRuntime({ consentStatus: 'granted', ready: true, historyState: state,
    location: { href, origin: 'https://playpoint-sim.com', pathname: '/blog/', search: new URL(href).search } });
  const url = new URL(context.location.href);
  for (const key of ['q', 's', 'search', 'query', 'keyword']) assert.equal(url.searchParams.has(key), false, key);
  assert.deepEqual(url.searchParams.getAll('pp_q'), ['Play Pass', 'second']);
  assert.equal(url.searchParams.get('pp_s'), 'typed');
  assert.equal(url.searchParams.get('pp_keyword'), 'typed4');
  assert.equal(url.searchParams.get('amount'), '23456');
  assert.equal(url.searchParams.get('points'), '137');
  assert.equal(url.searchParams.get('utm_source'), 'qa');
  assert.equal(url.hash, '#reading-library');
  assert.equal(context.history.state, state);
  assert.equal(historyUpdates.length, 1);
  context.PlayPointAnalytics.track('search', { intent_id: 'other', results_count: 0 });
  const payload = eventItems(context, 'search')[0][2];
  assert.equal(payload.page_location, 'https://playpoint-sim.com/blog/?utm_source=qa');
  assert.doesNotMatch(JSON.stringify(payload), /Play|typed|23456|137/);
});

test('明示的な空の新検索値を旧qで復活させず、戻る・再表示された旧URLも移す', () => {
  const href = 'https://playpoint-sim.com/blog/?pp_q=&q=obsolete';
  const { context } = createAnalyticsRuntime({ consentStatus: 'granted', ready: true,
    location: { href, origin: 'https://playpoint-sim.com', pathname: '/blog/', search: new URL(href).search } });
  assert.equal(new URL(context.location.href).searchParams.get('pp_q'), '');
  for (const type of ['popstate', 'pageshow']) {
    context.location.href = 'https://playpoint-sim.com/blog/?q=restored';
    context.dispatchEvent({ type });
    const url = new URL(context.location.href);
    assert.equal(url.searchParams.has('q'), false);
    assert.equal(url.searchParams.get('pp_q'), 'restored');
  }
});

test('検索URLの保護ができなければbridgeも送信も開始しない', () => {
  const href = 'https://playpoint-sim.com/blog/?q=private-test';
  const { context, warnings } = createAnalyticsRuntime({ consentStatus: 'granted', ready: true, historyFailure: true,
    location: { href, origin: 'https://playpoint-sim.com', pathname: '/blog/', search: '?q=private-test' } });
  assert.equal(context.PlayPointAnalytics.installGtagBridge(), false);
  assert.equal(context.PlayPointAnalytics.track('search', { results_count: 1 }), false);
  assert.equal(context.__playpointGtagBridgeInstalled, undefined);
  assert.equal(context.dataLayer, undefined);
  assert.ok(warnings.length > 0);
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
