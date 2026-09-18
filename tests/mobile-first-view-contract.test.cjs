'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { APP_MODULE_FILES } = require('../scripts/asset-sync.cjs');
const { runEsmProbe, ORIGIN } = require('./helpers/runtime-esm.cjs');
const { createRuntime: createServiceWorkerRuntime } = require('./helpers/service-worker-runtime.cjs');

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
    .concat('\n;globalThis.__firstView = { shouldAutoOpenAdvancedSettings, enhanceCalculatorAdvancedSettings, getSuggestedRegionForBrowserLanguage, checkLanguageSuggestion, getLastMainCalculationForRegion, saveLastMainCalculationForRegion, sameCalculationContext, formatLastCalculationText };');
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


test('first-view runtimeは既存の計算入力DOMを再生成せず詳細設定だけを拡張する', () => {
  const fixture = loadFirstView({ search: '?mode=main&multiplier=3' });
  const existingInputs = new Map([
    ['currentStatus', { id: 'currentStatus' }],
    ['targetStatus', { id: 'targetStatus' }],
    ['neededPoints', { id: 'neededPoints' }],
    ['baseRate', { id: 'baseRate' }],
    ['multiplier', { id: 'multiplier' }]
  ]);
  for (const [id, element] of existingInputs) fixture.elements.set(id, element);
  installAdvancedSettings(fixture);

  fixture.api.enhanceCalculatorAdvancedSettings();

  for (const [id, element] of existingInputs) {
    assert.strictEqual(fixture.document.getElementById(id), element, `${id}: first-view runtime replaced the existing input node`);
  }
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


test('キャンペーン初期状態bootstrapはbody前で実行され、mainかつ倍率1超だけを開く', () => {
  const scenarios = [
    ['?mode=main&multiplier=3', 'open'],
    ['?mode=main&multiplier=1', undefined],
    ['?mode=reverse&multiplier=3', undefined],
    ['?mode=main&multiplier=bad', undefined]
  ];

  for (const indexPath of ['index.html', 'en/index.html', 'ko/index.html', 'tw/index.html', 'hk/index.html', 'in/index.html']) {
    const html = read(indexPath);
    const match = html.match(/<script id="playpoint-first-view-state">([\s\S]*?)<\/script>/);
    const body = html.indexOf('<body');
    assert.ok(match, `${indexPath}: first-view state script missing`);
    assert.ok(match.index < body, `${indexPath}: first-view state must run before body`);

    for (const [search, expected] of scenarios) {
      const context = {
        URLSearchParams,
        location: { search },
        document: { documentElement: { dataset: {} } }
      };
      vm.createContext(context);
      vm.runInContext(match[1], context, { filename: `${indexPath}:first-view-state` });
      assert.equal(context.document.documentElement.dataset.playpointAdvancedSettings, expected, `${indexPath}: ${search}`);
    }
  }
});


test('first-viewは実ESM依存・cache改訂・Service Worker先読みに含まれる', async () => {
  const graph = runEsmProbe({ kind: 'graph' });
  const firstViewUrl = `${ORIGIN}/js/first-view.js`;
  assert.ok(graph.some(item => item.url === firstViewUrl), 'first-view.js is not reachable from the active ESM graph');
  assert.ok(APP_MODULE_FILES.includes('js/first-view.js'), 'first-view.js is missing from app module revision inputs');

  const worker = createServiceWorkerRuntime();
  await worker.fireInstall();
  const precache = new Set(worker.addAllCalls.flat().map(item => new URL(item.url, `${ORIGIN}/`).href));
  assert.ok(precache.has(firstViewUrl), 'first-view.js is missing from the actual Service Worker install precache');
});

test('前回の通常計算は地域別に端末内へ1件だけ保持し、別地域を上書きしない', () => {
  const fixture = loadFirstView({ region: 'JP' });
  const jp = { region: 'JP', currentStatus: '1.5', currentStatusLabel: 'ゴールド', targetStatus: '4000', targetStatusLabel: 'プラチナ', neededPoints: '1728' };
  const us = { region: 'US', currentStatus: '1.2', currentStatusLabel: 'Gold', targetStatus: '4000', targetStatusLabel: 'Platinum', neededPoints: '900' };

  assert.equal(fixture.api.saveLastMainCalculationForRegion('JP', jp, fixture.localStorage), true);
  assert.equal(fixture.api.saveLastMainCalculationForRegion('US', us, fixture.localStorage), true);
  assert.equal(fixture.api.getLastMainCalculationForRegion('JP', fixture.localStorage).neededPoints, '1728');
  assert.equal(fixture.api.getLastMainCalculationForRegion('US', fixture.localStorage).neededPoints, '900');
});

test('同じランク条件の再計算だけ前回との差を表示する', () => {
  const fixture = loadFirstView({ region: 'JP' });
  const previous = { region: 'JP', currentStatus: '1.5', currentStatusLabel: 'ゴールド', targetStatus: '4000', targetStatusLabel: 'プラチナ', neededPoints: '1728' };
  const current = { ...previous, neededPoints: '1200' };
  const changedTarget = { ...current, targetStatus: '15000', targetStatusLabel: 'ダイヤモンド' };

  assert.equal(fixture.api.sameCalculationContext(previous, current), true);
  assert.match(fixture.api.formatLastCalculationText('JP', current, previous), /528pt減/);
  assert.match(fixture.api.formatLastCalculationText('JP', changedTarget, previous), /前回：1,200pt/);
});

test('公開トップは行動ベースのタブ名と、入力を邪魔しない前回値表示領域を持つ', () => {
  const expected = {
    'index.html': ['あといくら必要？', 'この課金で何pt？', '🎁 週次を記録'],
    'en/index.html': ['How much left?', 'Points from spend', '🎁 Log weekly'],
    'ko/index.html': ['얼마나 더 필요?', '이 결제로 몇 pt?', '🎁 주간 기록'],
    'tw/index.html': ['還差多少？', '這筆消費有幾點？', '🎁 每週記錄'],
    'hk/index.html': ['還差多少？', '這筆消費有幾點？', '🎁 每週記錄'],
    'in/index.html': ['How much left?', 'Points from spend', '🎁 Log weekly']
  };

  for (const [indexPath, labels] of Object.entries(expected)) {
    const html = read(indexPath);
    labels.forEach(label => assert.ok(html.includes(label), indexPath + ': missing ' + label));
    assert.ok(html.includes('id="calculator-last-value"'), indexPath + ': memory UI missing');
    const needed = html.indexOf('id="neededPoints"');
    const calculate = html.indexOf('id="calculateButton"');
    const advanced = html.indexOf('id="calculator-advanced-settings"');
    assert.ok(needed >= 0 && needed < calculate && calculate < advanced, indexPath + ': mobile primary action order');
  }

  const firstView = read('js/first-view.js');
  assert.doesNotMatch(firstView, /ANALYTICS|gtag|dataLayer/, 'raw previous values must not enter analytics code');
  assert.match(read('privacy.html'), /直近の通常計算で入力した現在・目標ステータスと必要ポイント/);
});
