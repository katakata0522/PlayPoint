'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/third-party.js'), 'utf8');

function createRuntime({ failCoreOnce = false, failGaOnce = false } = {}) {
  const timers = [];
  const ad = { dataset: {} };
  let coreAttempts = 0;
  let gaAttempts = 0;
  let readyCount = 0;

  const context = {
    console: { error() {}, warn() {}, log() {} },
    Date,
    Error,
    Promise,
    URL,
    navigator: {},
    dataLayer: [],
    matchMedia: () => ({ matches: false }),
    addEventListener() {},
    setTimeout(callback) {
      timers.push(callback);
      return timers.length;
    },
    clearTimeout() {},
    document: {
      readyState: 'complete',
      currentScript: {
        src: 'https://playpoint-sim.com/js/third-party.js?v=test',
        getAttribute() { return '/js/third-party.js?v=test'; }
      },
      querySelector() { return null; },
      querySelectorAll(selector) {
        return selector.includes('adsbygoogle') ? [ad] : [];
      },
      createElement(tag) {
        assert.equal(tag, 'script');
        return {
          async: false,
          dataset: {},
          src: '',
          setAttribute() {},
          remove() {}
        };
      },
      head: {
        appendChild(script) {
          const src = String(script.src);
          if (src.includes('js/analytics-core.js')) {
            coreAttempts += 1;
            if (failCoreOnce && coreAttempts === 1) {
              script.onerror?.(new Error('core transient failure'));
              return;
            }
            context.PlayPointAnalytics = {
              installGtagBridge() {
                context.gtag = function gtag() { context.dataLayer.push(arguments); };
              },
              markAnalyticsReady() { readyCount += 1; }
            };
            script.onload?.();
            return;
          }
          if (src.includes('js/consent.js')) {
            context.PlayPointConsent = {
              whenAdsAllowed(callback) { callback(); },
              whenAnalyticsGranted(callback) { callback(); },
              whenGranted(callback) { callback(); }
            };
            script.onload?.();
            return;
          }
          if (src.includes('googletagmanager.com/gtag/js')) {
            gaAttempts += 1;
            if (failGaOnce && gaAttempts === 1) {
              script.onerror?.(new Error('gtag transient failure'));
              return;
            }
            script.onload?.();
            return;
          }
          if (src.includes('pagead2.googlesyndication.com')) {
            script.onload?.();
            return;
          }
          throw new Error('unexpected script: ' + src);
        }
      }
    }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'third-party.js' });

  return {
    ad,
    context,
    get coreAttempts() { return coreAttempts; },
    get gaAttempts() { return gaAttempts; },
    get readyCount() { return readyCount; },
    timers
  };
}

async function settle() {
  await Promise.resolve();
  await new Promise(resolve => setImmediate(resolve));
}

async function drainTimers(runtime, limit = 20) {
  for (let i = 0; i < limit && runtime.timers.length > 0; i += 1) {
    const callback = runtime.timers.shift();
    callback();
    await settle();
  }
  await settle();
}

test('analytics coreの一時失敗後もpromiseを捨てて後続ロードで復旧する', async () => {
  const runtime = createRuntime({ failCoreOnce: true });
  await settle();

  assert.equal(runtime.coreAttempts, 1);
  assert.equal(runtime.ad.dataset.playpointAdRequested, 'true', '広告同意処理がanalytics core失敗に巻き込まれています');

  await drainTimers(runtime);
  assert.equal(runtime.coreAttempts, 2);
  assert.equal(runtime.gaAttempts, 1);
  assert.equal(runtime.readyCount, 1);
});

test('gtag外部スクリプトの一時失敗は一度だけ再試行して復旧する', async () => {
  const runtime = createRuntime({ failGaOnce: true });
  await settle();
  await drainTimers(runtime);

  assert.equal(runtime.gaAttempts, 2);
  assert.equal(runtime.readyCount, 1);
});
