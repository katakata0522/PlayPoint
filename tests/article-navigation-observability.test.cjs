'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const analyticsSource = fs.readFileSync(path.join(root, 'js/analytics-core.js'), 'utf8');
const workflowSource = fs.readFileSync(path.join(root, '.github/workflows/mobile-performance.yml'), 'utf8');
const budget = require('../.github/scripts/mobile-performance-budget.cjs');

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

test('P0 performance CI measures EN KO TW articles independently', () => {
  for (const locale of ['en', 'ko', 'tw']) {
    assert.match(workflowSource, new RegExp('international-article-' + locale));
    assert.match(workflowSource, new RegExp('/' + locale + '/articles/google-play-points-join-eligibility\\.html'));
    const profile = budget.getProfile('performance-artifacts/international-article-' + locale + '.json');
    const expected = 'internationalArticle' + locale[0].toUpperCase() + locale.slice(1);
    assert.equal(profile, expected);
    assert.equal(budget.HARD_BUDGETS[profile].largestContentfulPaintMs, 3000);
    assert.equal(budget.HARD_BUDGETS[profile].cumulativeLayoutShift, 0.15);
  }
  assert.match(workflowSource, /articles\/intl-shell-v1\.css/);
  assert.match(workflowSource, /articles\/intl-article\.css/);
  assert.equal(budget.TARGETS.largestContentfulPaintMs, 2500);
  assert.equal(budget.TARGETS.cumulativeLayoutShift, 0.10);
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

test('計算結果リンクは内部・外部・Google公式の既存分類を保持する', () => {
  const { context } = createRuntime();
  const analytics = context.PlayPointAnalytics;
  for (const eventName of ['result_related_article_clicked', 'result_decision_link_clicked']) {
    for (const type of ['internal', 'external', 'official_google_support']) {
      analytics.track(eventName, {
        source_path: '/', destination_type: type,
        target_path: type === 'internal' ? '/en/articles/a.html' : 'https://example.com/private?amount=10000'
      });
      const sent = eventCalls(context, eventName).at(-1);
      assert.equal(sent.destination_type, type);
      assert.equal(sent.target_path, type === 'internal' ? '/en/articles/a.html' : undefined);
    }
  }
});

test('必須項目付きイベントへ不正な引数を渡しても例外や送信を起こさない', () => {
  const { context } = createRuntime();
  const analytics = context.PlayPointAnalytics;
  for (const params of [null, undefined, false, 0, 'private input', [], {}]) {
    assert.equal(analytics.sanitizeParams('article_navigation_click', params), null);
    assert.equal(analytics.track('article_navigation_click', params), false);
  }
  assert.equal(eventCalls(context, 'article_navigation_click').length, 0);
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