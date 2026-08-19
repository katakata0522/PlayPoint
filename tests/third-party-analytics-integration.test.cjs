'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const analyticsCoreSource = fs.readFileSync(path.join(root, 'js/analytics-core.js'), 'utf8');
const thirdPartySource = fs.readFileSync(path.join(root, 'js/third-party.js'), 'utf8');

function createRuntime(consentStatus = 'granted', { preconfigured = false } = {}) {
  const storage = new Map();
  const appendedScripts = [];
  const documentListeners = new Map();
  const context = {
    console: { log() {}, warn() {}, error() {} },
    URL,
    URLSearchParams,
    location: { href: 'https://playpoint-sim.com/', origin: 'https://playpoint-sim.com', pathname: '/', search: '' },
    navigator: { standalone: false },
    matchMedia() { return { matches: false }; },
    sessionStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      removeItem(key) { storage.delete(key); },
      setItem(key, value) { storage.set(key, String(value)); }
    },
    dispatchEvent() {},
    CustomEvent: class CustomEvent { constructor(type) { this.type = type; } },
    addEventListener() {},
    setTimeout(callback) { callback(); return 1; },
    requestIdleCallback(callback) { callback(); return 1; }
  };

  context.document = {
    readyState: 'complete',
    currentScript: { src: 'https://playpoint-sim.com/js/third-party.js?v=test', getAttribute(name) { return name === 'src' ? '/js/third-party.js?v=test' : null; } },
    addEventListener(type, listener) { documentListeners.set(type, listener); },
    dispatchEvent(event) { documentListeners.get(event.type)?.(event); },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement(tagName) {
      assert.equal(tagName, 'script');
      return { async: false, src: '', setAttribute(key, value) { this[key] = value; } };
    },
    head: { appendChild(script) { appendedScripts.push(script.src); Promise.resolve().then(() => script.onload?.()); } }
  };

  context.PlayPointConsent = {
    getStatus: () => consentStatus,
    whenAnalyticsGranted(callback) { if (consentStatus === 'granted') callback(); },
    whenAdsAllowed(callback) { if (consentStatus === 'granted') callback(); },
    whenGranted(callback) { if (consentStatus === 'granted') callback(); }
  };
  if (preconfigured) context.__playpointGaConfigured = true;

  context.window = context;
  vm.createContext(context);
  vm.runInContext(analyticsCoreSource, context, { filename: 'analytics-core.js' });
  vm.runInContext(thirdPartySource, context, { filename: 'third-party.js' });
  return { context, appendedScripts };
}

async function settleAsyncWork() {
  for (let index = 0; index < 4; index += 1) await new Promise(resolve => setImmediate(resolve));
}

function gtagCalls(context) {
  return (context.dataLayer || []).map(item => Array.from(item));
}

test('Analytics許可後はconfigしてから初回page_viewを一度だけ送る', async () => {
  const { context, appendedScripts } = createRuntime('granted');
  await settleAsyncWork();
  const calls = gtagCalls(context);
  const configIndex = calls.findIndex(call => call[0] === 'config');
  const pageViewIndexes = calls.map((call, index) => call[0] === 'event' && call[1] === 'page_view' ? index : -1).filter(index => index >= 0);
  assert.ok(configIndex >= 0, 'GA4 configが実行されていません');
  assert.deepEqual(JSON.parse(JSON.stringify(calls[configIndex][2])), { send_page_view: false });
  assert.equal(pageViewIndexes.length, 1, '初回page_viewが一度だけ送られていません');
  assert.ok(configIndex < pageViewIndexes[0], 'GA4 configより前にpage_viewが送られています');
  assert.equal(context.__playpointGaConfigured, true);
  assert.ok(appendedScripts.some(src => src.includes('googletagmanager.com/gtag/js')));
});

test('Analytics未許可ではGA4 configもpage_viewも送らない', async () => {
  const { context, appendedScripts } = createRuntime('denied');
  await settleAsyncWork();
  const calls = gtagCalls(context);
  assert.equal(calls.some(call => call[0] === 'config'), false);
  assert.equal(calls.some(call => call[0] === 'event' && call[1] === 'page_view'), false);
  assert.equal(appendedScripts.some(src => src.includes('googletagmanager.com/gtag/js')), false);
});

test('別経路でGA4初期化済みなら二重configしない', async () => {
  const { context, appendedScripts } = createRuntime('granted', { preconfigured: true });
  await settleAsyncWork();
  const calls = gtagCalls(context);
  assert.equal(calls.some(call => call[0] === 'config'), false, 'GA4を二重configしています');
  assert.equal(appendedScripts.some(src => src.includes('googletagmanager.com/gtag/js')), false);
});
