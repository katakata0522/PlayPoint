'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const analyticsCoreSource = fs.readFileSync(path.join(root, 'js/analytics-core.js'), 'utf8');
const thirdPartySource = fs.readFileSync(path.join(root, 'js/third-party.js'), 'utf8');

function createAd(dataset = {}) {
  return { dataset: { ...dataset } };
}

function createRuntime({
  analyticsConsent = 'granted',
  adsConsent = analyticsConsent,
  preconfigured = false,
  readyState = 'complete',
  standalone = false,
  managedAds = [],
  adsenseFailures = 0
} = {}) {
  const storage = new Map();
  const appendedScripts = [];
  const scriptsBySrc = new Map();
  const documentListeners = new Map();
  const windowListeners = new Map();
  const timers = [];
  const idleTasks = [];
  let remainingAdsenseFailures = adsenseFailures;

  const context = {
    console: { log() {}, warn() {}, error() {} },
    URL,
    URLSearchParams,
    location: { href: 'https://playpoint-sim.com/', origin: 'https://playpoint-sim.com', pathname: '/', search: '' },
    navigator: { standalone },
    matchMedia(query) { return { matches: standalone && query === '(display-mode: standalone)' }; },
    sessionStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      removeItem(key) { storage.delete(key); },
      setItem(key, value) { storage.set(key, String(value)); }
    },
    dispatchEvent() {},
    CustomEvent: class CustomEvent { constructor(type) { this.type = type; } },
    addEventListener(type, listener) { windowListeners.set(type, listener); },
    setTimeout(callback, delay) { timers.push({ callback, delay }); return timers.length; },
    requestIdleCallback(callback, options) { idleTasks.push({ callback, options }); return idleTasks.length; },
    adsbygoogle: []
  };

  context.document = {
    readyState,
    currentScript: {
      src: 'https://playpoint-sim.com/js/third-party.js?v=test',
      getAttribute(name) { return name === 'src' ? '/js/third-party.js?v=test' : null; }
    },
    addEventListener(type, listener) { documentListeners.set(type, listener); },
    dispatchEvent(event) { documentListeners.get(event.type)?.(event); },
    querySelector(selector) {
      const exactSrc = selector.match(/^script\[src="([^"]+)"\]$/)?.[1];
      if (exactSrc) return scriptsBySrc.get(exactSrc) || null;
      if (selector === 'script[src*="js/third-party.js"]') return this.currentScript;
      return null;
    },
    querySelectorAll(selector) {
      return selector === '.lp-ad-container ins.adsbygoogle, .game-ad-container ins.adsbygoogle'
        ? managedAds
        : [];
    },
    createElement(tagName) {
      assert.equal(tagName, 'script');
      const attrs = {};
      return {
        async: false,
        src: '',
        attrs,
        setAttribute(key, value) {
          attrs[key] = value;
          this[key] = value;
        },
        remove() {
          if (scriptsBySrc.get(this.src) === this) scriptsBySrc.delete(this.src);
        }
      };
    },
    head: {
      appendChild(script) {
        scriptsBySrc.set(script.src, script);
        appendedScripts.push({ script, src: script.src, attrs: { ...script.attrs } });
        const isAdsense = script.src.includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js');
        if (isAdsense && remainingAdsenseFailures > 0) {
          remainingAdsenseFailures -= 1;
          script.onerror?.();
        } else {
          script.onload?.();
        }
      }
    }
  };

  context.PlayPointConsent = {
    getStatus: () => analyticsConsent,
    whenAnalyticsGranted(callback) { if (analyticsConsent === 'granted') callback(); },
    whenAdsAllowed(callback) { if (adsConsent === 'granted') callback(); },
    whenGranted(callback) { if (analyticsConsent === 'granted') callback(); }
  };
  if (preconfigured) context.__playpointGaConfigured = true;

  context.window = context;
  vm.createContext(context);
  vm.runInContext(analyticsCoreSource, context, { filename: 'analytics-core.js' });
  vm.runInContext(thirdPartySource, context, { filename: 'third-party.js' });

  return {
    appendedScripts,
    context,
    fireDocument(type) { documentListeners.get(type)?.({ type }); },
    fireWindow(type) { windowListeners.get(type)?.({ type }); },
    get idleCount() { return idleTasks.length; },
    runNextIdle() {
      const task = idleTasks.shift();
      assert.ok(task, '実行できるidle taskがありません');
      task.callback();
      return task;
    },
    runNextTimer() {
      const task = timers.shift();
      assert.ok(task, '実行できるtimerがありません');
      task.callback();
      return task;
    },
    get timerCount() { return timers.length; }
  };
}

async function settleAsyncWork() {
  for (let index = 0; index < 4; index += 1) await new Promise(resolve => setImmediate(resolve));
}

async function advanceAnalytics(runtime) {
  if (runtime.timerCount > 0) runtime.runNextTimer();
  if (runtime.idleCount > 0) runtime.runNextIdle();
  await settleAsyncWork();
}

function gtagCalls(context) {
  return (context.dataLayer || []).map(item => Array.from(item));
}

function scriptsMatching(runtime, needle) {
  return runtime.appendedScripts.filter(item => item.src.includes(needle));
}

test('DOMContentLoaded後はAdSenseを先に取得しAnalyticsはload・delay・idle後まで待つ', async () => {
  const runtime = createRuntime({ readyState: 'loading' });

  assert.equal(runtime.appendedScripts.length, 0);
  runtime.fireDocument('DOMContentLoaded');
  await settleAsyncWork();

  const adsenseScripts = scriptsMatching(runtime, 'adsbygoogle.js');
  assert.equal(adsenseScripts.length, 1, 'DOMContentLoaded後にAdSenseを早期取得していません');
  assert.equal(scriptsMatching(runtime, 'googletagmanager.com/gtag/js').length, 0);
  assert.equal(adsenseScripts[0].attrs.crossorigin, 'anonymous');
  assert.equal(adsenseScripts[0].attrs.fetchpriority, undefined, 'AdSense取得を低優先度化しています');

  runtime.fireWindow('load');
  assert.ok(runtime.timerCount > 0, 'window load後のAnalytics遅延がありません');
  assert.equal(scriptsMatching(runtime, 'googletagmanager.com/gtag/js').length, 0);

  runtime.runNextTimer();
  assert.ok(runtime.idleCount > 0, '遅延後にidle待ちをしていません');
  assert.equal(scriptsMatching(runtime, 'googletagmanager.com/gtag/js').length, 0);

  runtime.runNextIdle();
  await settleAsyncWork();
  const analyticsScripts = scriptsMatching(runtime, 'googletagmanager.com/gtag/js');
  assert.equal(analyticsScripts.length, 1);
  assert.equal(analyticsScripts[0].attrs.fetchpriority, 'low');
});

test('Analytics許可後はconfigしてから初回page_viewを一度だけ送る', async () => {
  const runtime = createRuntime();
  await advanceAnalytics(runtime);
  const calls = gtagCalls(runtime.context);
  const configIndex = calls.findIndex(call => call[0] === 'config');
  const pageViewIndexes = calls.map((call, index) => call[0] === 'event' && call[1] === 'page_view' ? index : -1).filter(index => index >= 0);
  assert.ok(configIndex >= 0, 'GA4 configが実行されていません');
  assert.deepEqual(JSON.parse(JSON.stringify(calls[configIndex][2])), { send_page_view: false });
  assert.equal(pageViewIndexes.length, 1, '初回page_viewが一度だけ送られていません');
  assert.ok(configIndex < pageViewIndexes[0], 'GA4 configより前にpage_viewが送られています');
  assert.equal(runtime.context.__playpointGaConfigured, true);
});

test('Analyticsと広告枠のConsent境界を独立して守る', async () => {
  const analyticsOnlyAd = createAd();
  const analyticsOnly = createRuntime({ analyticsConsent: 'granted', adsConsent: 'denied', managedAds: [analyticsOnlyAd] });
  await settleAsyncWork();
  await advanceAnalytics(analyticsOnly);
  assert.equal(scriptsMatching(analyticsOnly, 'adsbygoogle.js').length, 1, 'CMP初期化用のAdSense library取得まで止めています');
  assert.equal(analyticsOnly.context.adsbygoogle.length, 0, '広告Consentなしで広告枠をrequestしています');
  assert.equal(scriptsMatching(analyticsOnly, 'googletagmanager.com/gtag/js').length, 1);

  const adsOnlyAd = createAd();
  const adsOnly = createRuntime({ analyticsConsent: 'denied', adsConsent: 'granted', managedAds: [adsOnlyAd] });
  await settleAsyncWork();
  await advanceAnalytics(adsOnly);
  assert.equal(adsOnly.context.adsbygoogle.length, 1, '広告Consentありでも広告枠を初期化していません');
  assert.ok(adsOnlyAd.dataset.adSlot, '管理広告枠のslotが設定されていません');
  assert.equal(adsOnlyAd.dataset.playpointAdRequested, 'true');
  assert.equal(scriptsMatching(adsOnly, 'googletagmanager.com/gtag/js').length, 0, 'Analytics拒否中にGAを取得しています');
});

test('既にrequest済みまたは初期化済みの広告枠は二重pushしない', async () => {
  const fresh = createAd();
  const requested = createAd({ playpointAdRequested: 'true' });
  const initialized = createAd({ adsbygoogleStatus: 'done' });
  const runtime = createRuntime({ managedAds: [fresh, requested, initialized] });
  await settleAsyncWork();

  assert.equal(runtime.context.adsbygoogle.length, 1);
  assert.equal(fresh.dataset.playpointAdRequested, 'true');
});

test('AdSense取得失敗時は失敗scriptを再利用せず実際に一度だけ再取得する', async () => {
  const runtime = createRuntime({ readyState: 'loading', adsenseFailures: 1 });
  runtime.fireDocument('DOMContentLoaded');
  await settleAsyncWork();

  assert.equal(scriptsMatching(runtime, 'adsbygoogle.js').length, 1);
  assert.ok(runtime.timerCount > 0, 'AdSense失敗後の再試行が予約されていません');

  runtime.runNextTimer();
  await settleAsyncWork();
  assert.equal(scriptsMatching(runtime, 'adsbygoogle.js').length, 2, '失敗済みscriptを既存扱いして再取得していません');

  assert.equal(runtime.timerCount, 0, '成功後も追加のAdSense再試行を予約しています');
});

test('別経路でGA4初期化済みなら二重configしない', async () => {
  const runtime = createRuntime({ preconfigured: true });
  await advanceAnalytics(runtime);
  const calls = gtagCalls(runtime.context);
  assert.equal(calls.some(call => call[0] === 'config'), false, 'GA4を二重configしています');
  assert.equal(scriptsMatching(runtime, 'googletagmanager.com/gtag/js').length, 0);
});

test('standalone表示ではGA4へdisplay modeをstandaloneとして送る', async () => {
  const runtime = createRuntime({ standalone: true });
  await advanceAnalytics(runtime);
  const setCall = gtagCalls(runtime.context).find(call => call[0] === 'set');
  assert.deepEqual(JSON.parse(JSON.stringify(setCall?.[1])), { app_display_mode: 'standalone' });
});
