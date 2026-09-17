'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function loadUi({ lang = 'ja', reducedMotion = false, configs = {}, region = 'JP', pathname = '/', elements = [] } = {}) {
  const listeners = new Map();
  const rafCallbacks = [];
  const document = {
    documentElement: { lang },
    addEventListener(type, handler) { listeners.set(type, handler); },
    getElementById() { return null; },
    querySelectorAll(selector) { return selector === '[data-lang-key]' ? elements : []; }
  };
  const window = {
    __TEST_ENV__: true,
    PP_APP: {},
    location: { pathname },
    matchMedia() { return { matches: reducedMotion }; },
    requestAnimationFrame(callback) {
      rafCallbacks.push(callback);
      return rafCallbacks.length;
    }
  };
  const context = {
    document,
    window,
    CONFIGS: configs,
    STATE: { currentRegion: region, dom: {} },
    CONSTANTS: {
      CLASS_HIDDEN: 'hidden',
      CLASS_HAS_RESULT: 'has-result',
      CLASS_ACTIVE: 'active',
      CLASS_VISIBLE: 'visible',
      MODE_MAIN: 'main',
      MODE_REVERSE: 'reverse',
      MODE_DIARY: 'diary',
      SELECTOR_TOOLTIP_BOX: '.tooltip-box',
      SELECTOR_INFO_BTN: '.info-btn'
    },
    getNextFridayCalendarWindow() { return { start: '', end: '' }; },
    console: { error() {}, log() {} },
    setTimeout() { return 1; },
    clearTimeout() {}
  };

  const source = fs.readFileSync(path.join(root, 'js', 'ui.js'), 'utf8')
    .replace(/^import\s+.*$/gm, '')
    .replace(/^export\s+/gm, '');
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'ui.js' });

  return {
    UI: window.PP_APP.UI,
    window,
    document,
    listeners,
    rafCallbacks
  };
}

function createTabList(disabledIndexes = []) {
  const tabs = [0, 1, 2].map(index => ({
    index,
    disabled: disabledIndexes.includes(index),
    focused: 0,
    clicked: 0,
    getAttribute(name) {
      return name === 'aria-disabled' && this.disabled ? 'true' : null;
    },
    focus() { this.focused += 1; },
    click() { this.clicked += 1; },
    closest(selector) {
      if (selector === '.tab-switch [role="tab"]') return this;
      if (selector === '[role="tablist"]') return tabList;
      return null;
    }
  }));
  const tabList = {
    querySelectorAll(selector) {
      return selector === '[role="tab"]' ? tabs : [];
    }
  };
  return { tabs, tabList };
}

function keyboardEvent(target, key) {
  return {
    target,
    key,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    prevented: false,
    preventDefault() { this.prevented = true; }
  };
}

test('calculator tab keyboard navigation moves focus/click by WAI-ARIA order and skips disabled tabs', () => {
  const { listeners } = loadUi();
  const handler = listeners.get('keydown');
  assert.equal(typeof handler, 'function');

  const { tabs } = createTabList([1]);
  const right = keyboardEvent(tabs[0], 'ArrowRight');
  handler(right);
  assert.equal(right.prevented, true);
  assert.equal(tabs[2].focused, 1);
  assert.equal(tabs[2].clicked, 1);

  const left = keyboardEvent(tabs[0], 'ArrowLeft');
  handler(left);
  assert.equal(tabs[2].focused, 2);
  assert.equal(tabs[2].clicked, 2);

  const end = keyboardEvent(tabs[0], 'End');
  handler(end);
  assert.equal(tabs[2].focused, 3);

  const ignored = keyboardEvent(tabs[0], 'Enter');
  handler(ignored);
  assert.equal(ignored.prevented, false);
});

test('calculator count-up renders the final value immediately when reduced motion is requested', () => {
  const { UI, rafCallbacks } = loadUi({ reducedMotion: true });
  const target = { textContent: '' };

  UI.animateValue(target, 0, 1234, 800, 'en-US');

  assert.equal(target.textContent, (1234).toLocaleString('en-US'));
  assert.equal(rafCallbacks.length, 0);
});

test('global error toast follows the static document language at runtime', () => {
  const expected = {
    ja: '予期せぬエラーが発生しました。ページをリロードしてみてください。',
    en: 'An unexpected error occurred. Please try reloading the page.',
    ko: '예기치 않은 오류가 발생했습니다. 페이지를 새로고침해 주세요.',
    'zh-TW': '發生未預期的錯誤。請嘗試重新載入頁面。'
  };

  for (const [lang, message] of Object.entries(expected)) {
    const { UI, window } = loadUi({ lang });
    const calls = [];
    UI.showToast = (...args) => calls.push(args);

    const handled = window.onerror('boom', 'test.js', 1, 1, new Error('boom'));

    assert.equal(handled, true, `${lang}: global error should be handled`);
    assert.deepEqual(calls, [[message, 'error']], `${lang}: localized error toast`);
  }
});


test('著者導線は実ランタイムの文言更新後も各言語版を保ち、静的HTMLと一致する', () => {
  const { loadConfigs } = require('./helpers/playpoint-calculator-test-context.cjs');
  const configs = loadConfigs(true);
  const cases = [
    ['JP', '/', '/author/katakata.html'],
    ['US', '/en/', '/en/author/katakata.html'],
    ['KR', '/ko/', '/ko/author/katakata.html'],
    ['TW', '/tw/', '/tw/author/katakata.html'],
    ['HK', '/hk/', '/tw/author/katakata.html'],
    ['IN', '/in/', '/en/author/katakata.html']
  ];
  for (const [region, pathname, target] of cases) {
    const link = { tagName: 'A', dataset: { langKey: 'linkAuthor' }, textContent: '', href: '' };
    const { UI } = loadUi({ configs, region, pathname, elements: [link] });
    UI.updateUIText();
    assert.equal(new URL(link.href, 'https://playpoint-sim.com' + pathname).pathname, target, region);
    const html = fs.readFileSync(path.join(root, pathname.slice(1), 'index.html'), 'utf8');
    const staticLink = html.match(/<a\b[^>]*href="([^"]+)"[^>]*data-lang-key="linkAuthor"[^>]*>([^<]+)<\/a>/);
    assert.ok(staticLink, `${region}: static author link must remain present`);
    assert.equal(new URL(staticLink[1], 'https://playpoint-sim.com' + pathname).pathname, target, region);
    assert.equal(staticLink[2], link.textContent, `${region}: static/runtime author label`);
    if (region === 'HK') assert.match(link.textContent, /繁體中文/);
    if (region === 'IN') assert.match(link.textContent, /English/);
    if (['US', 'KR', 'TW'].includes(region)) assert.doesNotMatch(link.textContent, /Japanese|일본어|日文/);
  }
});

test('絶対パス・外部URL・既存の相対リンクを文言更新で混同しない', () => {
  for (const [pathname, href, expected] of [
    ['/en/', '/en/author/katakata.html?from=footer#policy', '/en/author/katakata.html?from=footer#policy'],
    ['/', '/ko/author/katakata.html', '/ko/author/katakata.html'],
    ['/tw/', 'https://example.com/author/', 'https://example.com/author/'],
    ['/ko/', '//example.com/guide', '//example.com/guide'],
    ['/en/', 'privacy.html', '../privacy.html'],
    ['/en/', 'articles/example.html', './articles/example.html'],
    ['/', 'author/katakata.html', './author/katakata.html']
  ]) {
    const link = { tagName: 'A', dataset: { langKey: 'linkAuthor' } };
    const configs = { JP: { lang: 'ja', uiText: { linkAuthor: { text: 'Author', href } }, tooltips: {} } };
    loadUi({ configs, pathname, elements: [link] }).UI.updateUIText();
    assert.equal(link.href, expected, `${pathname}: ${href}`);
  }
});

test('日本語の埋め込み案内へのリンクは6地域で静的・実行後のURLと表示が一致する', () => {
  const { loadConfigs } = require('./helpers/playpoint-calculator-test-context.cjs');
  const { hasExplicitTargetMarker } = require('../scripts/navigation-source-map.cjs');
  const configs = loadConfigs(true);
  for (const [region, pathname] of [['JP', '/'], ['US', '/en/'], ['KR', '/ko/'], ['TW', '/tw/'], ['HK', '/hk/'], ['IN', '/in/']]) {
    const link = { tagName: 'A', dataset: { langKey: 'linkWidget' }, textContent: '', href: '' };
    loadUi({ configs, region, pathname, elements: [link] }).UI.updateUIText();
    const html = fs.readFileSync(path.join(root, pathname.slice(1), 'index.html'), 'utf8');
    const staticLink = html.match(/<a\b[^>]*href="([^"]+)"[^>]*data-lang-key="linkWidget"[^>]*>([^<]+)<\/a>/);
    assert.ok(staticLink, `${region}: widget link must remain present`);
    assert.equal(new URL(link.href, 'https://playpoint-sim.com' + pathname).pathname, '/embed.html');
    assert.equal(new URL(staticLink[1], 'https://playpoint-sim.com' + pathname).pathname, '/embed.html');
    assert.equal(staticLink[2], link.textContent, `${region}: no runtime loss of language notice`);
    if (region !== 'JP') assert.ok(hasExplicitTargetMarker(link.textContent, 'ja'), region);
  }
});
