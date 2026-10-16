'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const core = fs.readFileSync(path.join(root, 'js/analytics-core.js'), 'utf8');

function harness(initialConsent = 'granted', pathname = '/articles/example.html') {
  let consent = initialConsent;
  const listeners = new Map(), storage = new Map(), elements = new Map();
  const sidebar = { getAttribute: name => ({ 'data-article-role': 'reference', 'data-article-category': 'account' })[name] };
  const window = {
    location: { origin: 'https://playpoint-sim.com', href: 'https://playpoint-sim.com' + pathname, pathname, search: '' },
    dataLayer: [], PlayPointConsent: { getStatus: () => consent },
    sessionStorage: {
      getItem: key => storage.has(key) ? storage.get(key) : null,
      setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key)
    },
    document: {
      addEventListener(name, listener) { if (!listeners.has(name)) listeners.set(name, []); listeners.get(name).push(listener); },
      querySelector: selector => selector === '.ja-article-sidebar' ? sidebar : null,
      querySelectorAll: selector => elements.get(selector) || []
    }
  };
  vm.runInNewContext(core, { window, URL, URLSearchParams, Date, console, CustomEvent: function() {} });
  const dispatch = (name, event = {}) => (listeners.get(name) || []).forEach(listener => listener(event));
  window.PlayPointAnalytics.markAnalyticsReady();
  return {
    api: window.PlayPointAnalytics, window, elements, dispatch,
    consent(value) { consent = value; dispatch('playpoint:consent-updated'); },
    events: () => window.dataLayer.map(item => Array.from(item)).filter(item => item[0] === 'event')
  };
}

function link(href, selector, className = '') {
  const value = { href, classList: { contains: name => name === className }, closest: name => name === selector ? {} : null };
  return value;
}

function click(h, value) { h.dispatch('click', { target: { closest: selector => selector === 'a[href]' ? value : null } }); }

const decision = { source_path: '/?private=value', target_path: '/latest/?q=private#section', destination_type: 'internal', link_position: 'purchase-check' };

test('購入確認位置は対象イベントだけに保持し、クエリと任意の属性は送らない', () => {
  const h = harness();
  const result = h.api.sanitizeParams('result_decision_link_clicked', { ...decision, email: 'test@example.invalid' });
  assert.equal(result.link_position, 'purchase-check');
  assert.equal(result.source_path, '/');
  assert.equal(result.target_path, '/latest/');
  assert.equal(result.email, undefined);
  assert.equal(h.api.sanitizeParams('result_related_article_clicked', decision).link_position, undefined);
  for (const position of ['arbitrary', 'purchase-check?secret=1', 0, 11, 1.5]) {
    assert.equal(h.api.sanitizeParams('result_decision_link_clicked', { ...decision, link_position: position }).link_position, undefined);
  }
  for (const position of [1, 10, '2']) {
    assert.equal(h.api.sanitizeParams('result_decision_link_clicked', { ...decision, link_position: position }).link_position, Number(position));
  }
});

test('外部の遷移先URLは送信パラメータに残さない', () => {
  const h = harness();
  const result = h.api.sanitizeParams('result_decision_link_clicked', { ...decision, target_path: 'https://example.invalid/private?q=secret', destination_type: 'external' });
  assert.equal(result.target_path, undefined);
  assert.equal(result.destination_type, 'external');
});

test('同意拒否時に購入確認イベントを送信しない', () => {
  const h = harness('denied');
  assert.equal(h.api.track('result_decision_link_clicked', decision), false);
  assert.equal(h.events().length, 0);
});

test('未確定から同意した場合、保留イベントは一度だけ送信する', () => {
  const h = harness('pending');
  h.api.track('result_decision_link_clicked', decision);
  assert.equal(h.events().length, 0);
  h.consent('granted'); h.consent('granted');
  assert.equal(h.events().length, 1);
  assert.equal(h.events()[0][2].link_position, 'purchase-check');
});

test('未確定後に拒否したイベントは、後から同意しても復活させない', () => {
  const h = harness('pending');
  h.api.track('result_decision_link_clicked', decision);
  h.consent('denied'); h.consent('granted');
  assert.equal(h.events().length, 0);
});

for (const scenario of [
  { label: '日本語パンくず', selector: '.breadcrumbs-wrapper', href: '/blog/', component: 'breadcrumb', destination: 'guide_hub', list: '.breadcrumbs-wrapper a' },
  { label: '本文末関連記事', selector: 'article .related-links-section', href: '/articles/other.html?utm_source=test', component: 'related', destination: 'article', list: 'article .related-links-section a' },
  ...['category', 'topic', 'game', 'q'].map(query => ({ label: 'カテゴリ選択 ' + query, selector: '', className: 'sidebar-browse-category', href: '/blog/?' + query + '=private', component: 'browse', destination: 'category', list: '.sidebar-browse-category' }))
]) {
  test(scenario.label + 'を1クリック1イベントで分類する', () => {
    const h = harness();
    const a = link(h.window.location.origin + scenario.href, scenario.selector, scenario.className);
    h.elements.set(scenario.list, [a]);
    click(h, a);
    const events = h.events();
    assert.equal(events.length, 1);
    assert.equal(events[0][1], 'article_navigation_click');
    assert.equal(events[0][2].component, scenario.component);
    assert.equal(events[0][2].destination_type, scenario.destination);
    assert.equal(events[0][2].locale, 'ja');
    assert.equal(events[0][2].link_position, 1);
    assert.equal(events[0][2].target_path, new URL(a.href).pathname);
    assert.equal(JSON.stringify(events).includes('private'), false);
  });
}

test('対象外の通常本文リンクに新しい計測を勝手に追加しない', () => {
  const h = harness();
  click(h, link(h.window.location.origin + '/latest/', '.untracked'));
  assert.equal(h.events().length, 0);
});

test('同意拒否時は追加した日本語ナビゲーションも送信しない', () => {
  const h = harness('denied');
  click(h, link(h.window.location.origin + '/blog/', '.breadcrumbs-wrapper'));
  assert.equal(h.events().length, 0);
});

test('逆算対象額・既存エラー・正常系を表示文から固定分類する', () => {
  const source = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
  const start = source.indexOf('function getValidationErrorType(');
  const end = source.indexOf('\nfunction ', start + 1);
  assert.ok(start >= 0 && end > start, '実装関数が見つからない');
  const texts = { errorEligibleAmount: '対象額を確認してください', errorInputReverse: '入力を確認してください', errorRateReverse: '獲得率を確認してください', errorTargetConsistency: '目標を確認してください' };
  let message = '';
  const scope = {
    STATE: { currentRegion: 'JP', dom: { reverseResult: { querySelector: () => ({ textContent: message }) }, result: { querySelector: () => ({ textContent: message }) } } },
    CONFIGS: { JP: { uiText: texts } }, CONSTANTS: { MODE_REVERSE: 'reverse' }
  };
  vm.createContext(scope);
  vm.runInContext(source.slice(start, end) + '\nthis.classify = getValidationErrorType;', scope);
  for (const [text, expected] of [[texts.errorEligibleAmount, 'eligible_amount'], [texts.errorInputReverse, 'amount_or_rate_input'], [texts.errorRateReverse, 'rate'], ['', null], ['未分類の文言', 'unknown']]) {
    message = text; assert.equal(scope.classify('reverse'), expected);
  }
  message = texts.errorTargetConsistency + '（上限の説明）';
  assert.equal(scope.classify('main'), 'target_consistency');
});
