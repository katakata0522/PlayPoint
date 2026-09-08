'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

function createClassList(initial = []) {
  const values = new Set(initial);
  return {
    add(...names) { names.forEach(name => values.add(name)); },
    remove(...names) { names.forEach(name => values.delete(name)); },
    contains(name) { return values.has(name); },
    toggle(name) {
      if (values.has(name)) {
        values.delete(name);
        return false;
      }
      values.add(name);
      return true;
    }
  };
}

function loadFirstView({ search = '', language = 'en-US', region = 'JP' } = {}) {
  const elements = new Map();
  const queryMap = new Map();
  const listeners = new Map();
  const mediaListeners = new Map();
  const document = {
    documentElement: { lang: 'en', dataset: {} },
    getElementById(id) { return elements.get(id) || null; },
    addEventListener(type, handler) { listeners.set(type, handler); },
    querySelector(selector) { return queryMap.get(selector) || null; },
    querySelectorAll(selector) {
      if (selector === '.region-switch [data-region-recommended="true"]') {
        return [...queryMap.values()].filter(element => element?.dataset?.regionRecommended === 'true');
      }
      return [];
    }
  };
  const window = {
    location: { search },
    matchMedia() {
      return {
        matches: true,
        addEventListener(type, handler) { mediaListeners.set(type, handler); }
      };
    }
  };
  const sessionValues = new Map();
  const localValues = new Map();
  const sessionStorage = {
    getItem(key) { return sessionValues.get(key) ?? null; },
    setItem(key, value) { sessionValues.set(key, String(value)); }
  };
  const localStorage = {
    getItem(key) { return localValues.get(key) ?? null; },
    setItem(key, value) { localValues.set(key, String(value)); }
  };
  const STATE = {
    currentRegion: region,
    dom: {
      languageSuggestionBanner: { classList: createClassList() },
      closeLangBannerBtn: null
    }
  };
  const CONSTANTS = {
    CLASS_HIDDEN: 'hidden',
    STORAGE_REGION_KEY: 'playpointRegion'
  };
  const context = {
    document,
    window,
    sessionStorage,
    localStorage,
    navigator: { language, userLanguage: '' },
    STATE,
    CONSTANTS,
    URLSearchParams,
    console: { error() {} }
  };
  const source = read('js/first-view.js')
    .replace(/^import\s+.*$/gm, '')
    .replace(/^export\s+/gm, '')
    .concat('\n;globalThis.__firstView = { shouldAutoOpenAdvancedSettings, enhanceCalculatorAdvancedSettings, getSuggestedRegionForBrowserLanguage, checkLanguageSuggestion };');
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'first-view.js' });

  return {
    api: context.__firstView,
    document,
    window,
    elements,
    queryMap,
    listeners,
    mediaListeners,
    STATE,
    sessionStorage,
    localStorage,
    navigator: context.navigator
  };
}

function installAdvancedSettings(fixture) {
  const toggleListeners = [];
  const toggle = {
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = String(value); },
    addEventListener(type, handler) { if (type === 'click') toggleListeners.push(handler); }
  };
  const body = {
    inert: false,
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = String(value); }
  };
  const container = {
    dataset: {},
    classList: createClassList(),
    querySelector(selector) {
      return selector === '.calculator-advanced-settings__toggle' ? toggle : null;
    }
  };
  fixture.elements.set('calculator-advanced-settings', container);
  fixture.elements.set('calculator-advanced-settings-body', body);
  return { container, body, toggle, toggleListeners };
}

test('スマホ詳細設定は初回HTMLに存在し、first-view runtimeは入力DOMを作り直さない', () => {
  for (const indexPath of ['index.html', 'en/index.html', 'ko/index.html', 'tw/index.html', 'hk/index.html', 'in/index.html']) {
    const html = read(indexPath);
    assert.ok(html.includes('id="calculator-advanced-settings"'), `${indexPath}: advanced settings missing`);
    assert.ok(html.includes('id="calculator-advanced-settings-body"'), `${indexPath}: advanced body missing`);
    assert.ok(html.includes('id="playpoint-first-view-critical"'), `${indexPath}: critical style missing`);
    assert.ok(html.includes('id="playpoint-first-view-state"'), `${indexPath}: bootstrap state missing`);
  }

  // First-paint boundary: moving/creating calculator input DOM in this runtime would
  // reintroduce layout shift before interaction, so these narrow negative guards stay.
  const source = read('js/first-view.js');
  assert.doesNotMatch(source, /insertAdjacentElement/);
  assert.doesNotMatch(source, /append\(baseRateLabel/);
  assert.doesNotMatch(source, /document\.createElement\(['"](?:style|div)['"]\)/);
});

test('キャンペーン条件付きURLは詳細設定を実際に開き、モバイル折りたたみ状態を同期する', () => {
  const fixture = loadFirstView({ search: '?mode=main&multiplier=3' });
  const { container, body, toggle, toggleListeners } = installAdvancedSettings(fixture);

  const result = fixture.api.enhanceCalculatorAdvancedSettings();

  assert.equal(result, container);
  assert.equal(container.classList.contains('is-open'), true);
  assert.equal(container.dataset.playpointBound, 'true');
  assert.equal(toggle.attributes['aria-expanded'], 'true');
  assert.equal(body.attributes['aria-hidden'], 'false');
  assert.equal(body.inert, false);
  assert.equal(toggleListeners.length, 1);

  toggleListeners[0]();
  assert.equal(container.classList.contains('is-open'), false);
  assert.equal(toggle.attributes['aria-expanded'], 'false');
  assert.equal(body.attributes['aria-hidden'], 'true');
  assert.equal(body.inert, true);

  fixture.api.enhanceCalculatorAdvancedSettings();
  assert.equal(toggleListeners.length, 1, 'binding must stay idempotent');
});

test('詳細設定の自動展開判定はmainかつ倍率1超だけを許可する', () => {
  const { api } = loadFirstView();
  assert.equal(api.shouldAutoOpenAdvancedSettings('?mode=main&multiplier=2'), true);
  assert.equal(api.shouldAutoOpenAdvancedSettings('?mode=main&multiplier=1'), false);
  assert.equal(api.shouldAutoOpenAdvancedSettings('?mode=reverse&multiplier=3'), false);
  assert.equal(api.shouldAutoOpenAdvancedSettings('?mode=main&multiplier=bad'), false);
});

test('地域提案は国まで明示されたブラウザlocaleだけを既存ボタンへ反映する', () => {
  const fixture = loadFirstView({ language: 'en-US', region: 'JP' });
  const usButton = {
    dataset: {},
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; }
  };
  fixture.queryMap.set('.region-switch > button[data-region="US"]', usButton);

  fixture.api.checkLanguageSuggestion();

  assert.equal(fixture.STATE.dom.languageSuggestionBanner.classList.contains('hidden'), true);
  assert.equal(usButton.dataset.regionRecommended, 'true');
  assert.ok(usButton.attributes['aria-description']);

  const mappings = {
    'en-US': 'US',
    'en-IN': 'IN',
    'ko-KR': 'KR',
    'zh-TW': 'TW',
    'zh-HK': 'HK'
  };
  for (const [locale, expected] of Object.entries(mappings)) {
    assert.equal(fixture.api.getSuggestedRegionForBrowserLanguage(locale), expected);
  }
  for (const ambiguous of ['en', 'ko', 'zh', 'fr-FR']) {
    assert.equal(fixture.api.getSuggestedRegionForBrowserLanguage(ambiguous), null);
  }
});

test('キャンペーン初期状態bootstrapは公開HTMLでbodyより前に実行される', () => {
  for (const indexPath of ['index.html', 'en/index.html', 'ko/index.html', 'tw/index.html', 'hk/index.html', 'in/index.html']) {
    const html = read(indexPath);
    const bootstrap = html.indexOf('id="playpoint-first-view-state"');
    const body = html.indexOf('<body');
    assert.ok(bootstrap >= 0 && bootstrap < body, `${indexPath}: first-view state must run before body`);
    const snippet = html.slice(bootstrap, body);
    assert.match(snippet, /mode['"]?\)===['"]main['"]/);
    assert.match(snippet, /multiplier/);
    assert.match(snippet, /playpointAdvancedSettings=['"]open['"]/);
  }
});

test('ファーストビュー処理は互換モジュール経由で読み込まれ、Service Workerの必須シェルにも含まれる', () => {
  const languageSuggestion = read('js/language-suggestion.js');
  const assetSync = read('scripts/asset-sync.cjs');
  const serviceWorker = read('sw.js');

  // Delivery/cache ownership is intentionally static: a runtime unit test cannot
  // prove that the browser can fetch the module on the first offline shell load.
  assert.match(languageSuggestion, /from '\.\/first-view\.js'/);
  assert.ok(assetSync.includes("'js/first-view.js'"));
  assert.ok(serviceWorker.includes("'./js/first-view.js'"));
});
