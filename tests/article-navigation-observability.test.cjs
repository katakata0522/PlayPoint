'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const analyticsSource = fs.readFileSync(path.join(root, 'js/analytics-core.js'), 'utf8');

function createClassList(classes) {
  const set = new Set(classes);
  return { contains(name) { return set.has(name); } };
}

function createRuntime(japanese = false) {
  const listeners = new Map();
  const roleWidget = { className: 'sidebar-widget sidebar-widget--next sidebar-widget--role-reference' };
  const categoryLink = { getAttribute(name) { return name === 'href' ? '/en/articles/#intl-hub-account' : null; } };
  const rank = { textContent: '02' };
  const popularItem = { querySelector(selector) { return selector === '.sidebar-popular-rank' ? rank : null; } };
  const popularLink = {
    href: 'https://playpoint-sim.com/en/articles/google-play-points-cash-conversion.html',
    classList: createClassList(['sidebar-popular-link']),
    closest(selector) {
      if (selector === 'a[href]') return this;
      if (selector === '.sidebar-popular-item') return popularItem;
      return null;
    }
  };
  const context = {
    console: { warn() {} },
    URL,
    URLSearchParams,
    location: {
      href: 'https://playpoint-sim.com/en/articles/google-play-points-join-eligibility.html',
      origin: 'https://playpoint-sim.com',
      pathname: '/en/articles/google-play-points-join-eligibility.html',
      search: ''
    },
    sessionStorage: { getItem() { return null; }, removeItem() {}, setItem() {} },
    PlayPointConsent: { getStatus: () => 'granted' },
    dispatchEvent() {},
    CustomEvent: class CustomEvent { constructor(type) { this.type = type; } },
    document: {
      addEventListener(type, listener) {
        if (!listeners.has(type)) listeners.set(type, []);
        listeners.get(type).push(listener);
      },
      querySelector(selector) {
        if (selector === '.ja-article-sidebar' && japanese) return { getAttribute: key => ({ 'data-article-role': 'reference', 'data-article-category': 'account' })[key] };
        if (selector === '.intl-article-sidebar .sidebar-widget--next') return roleWidget;
        if (selector === '.intl-breadcrumb-category') return categoryLink;
        return null;
      },
      querySelectorAll(selector) {
        if (selector === '.sidebar-popular-link') return [popularLink];
        return [];
      }
    }
  };
  if (japanese) { context.location.pathname = '/articles/2025-12-25-check-balance.html'; context.location.href = context.location.origin + context.location.pathname; popularLink.href = context.location.origin + '/articles/2025-12-25-expiration.html'; }
  context.window = context;
  vm.createContext(context);
  vm.runInContext(analyticsSource, context, { filename: 'analytics-core.js' });
  context.PlayPointAnalytics.markAnalyticsReady();
  return { context, listeners, popularLink };
}

function eventCalls(context, eventName) {
  return context.dataLayer
    .filter(item => item && item[0] === 'event' && item[1] === eventName)
    .map(item => JSON.parse(JSON.stringify(item[2])));
}

test('international article navigation emits only finite classification values', () => {
  const { context, listeners, popularLink } = createRuntime();
  const click = listeners.get('click')[0];
  click({ target: popularLink });
  assert.deepEqual(JSON.parse(JSON.stringify(eventCalls(context, 'article_navigation_click'))), [{
    source_path: '/en/articles/google-play-points-join-eligibility.html',
    target_path: '/en/articles/google-play-points-cash-conversion.html',
    component: 'popular',
    locale: 'en',
    article_role: 'reference',
    article_category: 'account',
    destination_type: 'article',
    link_position: 2
  }]);
});

test('article navigation rejects unknown cardinality values and external target paths', () => {
  const { context } = createRuntime();
  const analytics = context.PlayPointAnalytics;
  assert.equal(analytics.sanitizeParams('article_navigation_click', {
    source_path: '/en/articles/a.html',
    target_path: 'https://example.com/private',
    component: 'arbitrary-widget',
    locale: 'en',
    article_role: 'reference',
    article_category: 'account',
    destination_type: 'article'
  }), null);
  const clean = analytics.sanitizeParams('article_navigation_click', {
    source_path: '/en/articles/a.html',
    target_path: 'https://example.com/private',
    component: 'katakatalab',
    locale: 'en',
    article_role: 'reference',
    article_category: 'account',
    destination_type: 'external_profile',
    link_position: 1,
    link_text: 'must not leak'
  });
  assert.deepEqual(JSON.parse(JSON.stringify(clean)), {
    source_path: '/en/articles/a.html',
    component: 'katakatalab',
    locale: 'en',
    article_role: 'reference',
    article_category: 'account',
    destination_type: 'external_profile',
    link_position: 1
  });
});

test('海外ナビ専用ENUMは日本語ブログの既存カテゴリを消さない', () => {
  const { context } = createRuntime();
  const analytics = context.PlayPointAnalytics;
  const categories = new Set(JSON.parse(fs.readFileSync(path.join(root, 'blog/articles.json'), 'utf8')).map(article => article.category));
  for (const category of categories) {
    analytics.track('article_click', { article_title: '公開記事', article_category: category });
    assert.equal(eventCalls(context, 'article_click').at(-1).article_category, category);
    assert.equal(analytics.sanitizeParams('article_navigation_click', {
      source_path: '/en/articles/a.html', component: 'related', locale: 'en',
      article_role: 'reference', article_category: category, destination_type: 'article'
    }), null, '日本語カテゴリを海外ナビの分類へ混入させない');
  }
});

test('同じ記事内のアンカー移動は別記事への遷移と区別する', () => {
  const { context, listeners, popularLink } = createRuntime();
  popularLink.href = context.location.href + '#answer';
  listeners.get('click')[0]({ target: popularLink });
  const sent = eventCalls(context, 'article_navigation_click').at(-1);
  assert.equal(sent.destination_type, 'section');
  assert.equal(sent.target_path, context.location.pathname);
});

test('海外ナビの外部遷移を内部遷移と誤記録せずURLも送らない', () => {
  const { context, listeners, popularLink } = createRuntime();
  popularLink.href = 'https://example.com/private?amount=10000';
  listeners.get('click')[0]({ target: popularLink });
  const sent = eventCalls(context, 'article_navigation_click').at(-1);
  assert.equal(sent.destination_type, 'external');
  assert.equal(sent.target_path, undefined);
});

test('海外記事の行動計測も既存の同意境界で保留・送信・拒否する', () => {
  const { context, listeners, popularLink } = createRuntime();
  let consent = 'pending';
  context.PlayPointConsent.getStatus = () => consent;
  const click = listeners.get('click')[0];
  click({ target: popularLink });
  assert.equal(eventCalls(context, 'article_navigation_click').length, 0);
  consent = 'granted';
  context.PlayPointAnalytics.flushPending();
  assert.equal(eventCalls(context, 'article_navigation_click').length, 1);
  consent = 'denied';
  click({ target: popularLink });
  assert.equal(eventCalls(context, 'article_navigation_click').length, 1);
});

test('日本語の関連記事を同じ有限分類と同意境界で記録する', () => {
  const { context, listeners, popularLink } = createRuntime(true);
  listeners.get('click')[0]({ target: popularLink });
  const events = eventCalls(context, 'article_navigation_click');
  assert.equal(events.length, 1);
  assert.equal(events[0].locale, 'ja');
  assert.equal(events[0].destination_type, 'article');
  assert.equal(events[0].source_path, '/articles/2025-12-25-check-balance.html');
  context.PlayPointConsent.getStatus = () => 'denied';
  listeners.get('click')[0]({ target: popularLink });
  assert.equal(eventCalls(context, 'article_navigation_click').length, 1);
});
test('diary entry is separate from calculator attribution', () => {
 const {context,listeners,popularLink}=createRuntime();
 popularLink.href=context.location.origin+'/?mode=diary&week=current';
 assert.equal(context.PlayPointAnalytics.isCalculatorDestination(popularLink),false);
 assert.equal(context.PlayPointAnalytics.rememberCalculatorEntry(popularLink),false);
 listeners.get('click')[0]({target:popularLink});
 assert.equal(eventCalls(context,'article_navigation_click').at(-1).destination_type,'diary');
});

// 2026-10-16 計測優先修正：同意・分類の境界を既存suiteで検証する。
(() => {
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

})();
