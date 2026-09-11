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

function createRuntime() {
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
