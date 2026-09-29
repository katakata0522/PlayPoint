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
          const parsedSrc = new URL(src, 'https://playpoint-sim.com/');
          if (parsedSrc.origin === 'https://playpoint-sim.com' && parsedSrc.pathname.endsWith('/js/analytics-core.js')) {
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
          if (parsedSrc.origin === 'https://playpoint-sim.com' && parsedSrc.pathname.endsWith('/js/consent.js')) {
            context.PlayPointConsent = {
              whenAdsAllowed(callback) { callback(); },
              whenAnalyticsGranted(callback) { callback(); },
              whenGranted(callback) { callback(); }
            };
            script.onload?.();
            return;
          }
          if (parsedSrc.hostname === 'www.googletagmanager.com' && parsedSrc.pathname === '/gtag/js') {
            gaAttempts += 1;
            if (failGaOnce && gaAttempts === 1) {
              script.onerror?.(new Error('gtag transient failure'));
              return;
            }
            script.onload?.();
            return;
          }
          if (parsedSrc.hostname === 'pagead2.googlesyndication.com') {
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

// ブログ共通ランタイムの広告取得・同意分離。既存の共通runtime検証は変更しない。
// Googleへの実通信・広告クリック・本番の計測送信は行わない。
{
const source = fs.readFileSync(path.join(__dirname, '../blog/components.js'), 'utf8');
const ADS_URL = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3845885843809455';

function createAd(dataset = {}, isConnected = true) {
  return { dataset: { ...dataset }, isConnected };
}

function createRuntime({
  pathname = '/blog/', coreReady = true, consentReady = true,
  adsAllowed = true, analyticsAllowed = false, ads = [createAd()], existingAd = false,
  legacyConsent = false
} = {}) {
  const scripts = [];
  const appended = [];
  const timers = [];
  const idle = [];
  const documentListeners = new Map();
  const pendingConsent = [];
  const logs = [];
  const gtagCalls = [];
  const core = { installGtagBridge() {}, markAnalyticsReady() {} };
  const consent = {
    whenGranted(callback) { gate('analytics', callback); },
    whenAnalyticsGranted(callback) { gate('analytics', callback); },
    whenAdsAllowed(callback) { gate('ads', callback); }
  };
  if (legacyConsent) { delete consent.whenAdsAllowed; delete consent.whenAnalyticsGranted; }
  function gate(purpose, callback) {
    if (purpose === 'ads' ? adsAllowed : analyticsAllowed) callback();
    else pendingConsent.push({ purpose, callback });
  }
  function createScript() {
    const listeners = new Map();
    return {
      src: '', async: false, isConnected: false,
      addEventListener(type, callback) {
        const list = listeners.get(type) || [];
        list.push(callback);
        listeners.set(type, list);
      },
      fire(type) {
        const event = new Error(`fixture ${type}`);
        this[`on${type}`]?.(event);
        const list = listeners.get(type) || [];
        listeners.delete(type);
        list.forEach(callback => callback(event));
      },
      remove() { this.isConnected = false; }
    };
  }
  const context = {
    console: Object.fromEntries(['log', 'warn', 'error'].map(level => [level, (...args) => logs.push({ level, args })])),
    location: { pathname }, navigator: {},
    gtag(...args) { gtagCalls.push(args); },
    adsbygoogle: [],
    setTimeout(callback, delay) { const task = { callback, delay }; timers.push(task); return timers.length; },
    requestIdleCallback(callback) { idle.push(callback); },
    document: {
      documentElement: { dataset: {} }, body: { dataset: {} },
      querySelector(selector) {
        const needle = selector.match(/^script\[src\*="([^"]+)"\]$/)?.[1];
        if (needle) return scripts.find(script => script.isConnected && script.src.includes(needle)) || null;
        if (selector === 'header' || selector === 'footer' || selector === 'link[data-common-components-style]') return {};
        return null;
      },
      querySelectorAll() { return ads; },
      createElement(tag) { assert.equal(tag, 'script'); return createScript(); },
      head: { appendChild(script) { script.isConnected = true; scripts.push(script); appended.push(script); } },
      addEventListener(type, callback) { documentListeners.set(type, callback); }
    }
  };
  context.window = context;
  if (coreReady) context.PlayPointAnalytics = core;
  if (consentReady) context.PlayPointConsent = consent;
  function addExistingAd() {
    const script = createScript();
    script.src = ADS_URL;
    script.isConnected = true;
    scripts.push(script);
    return script;
  }
  const foreignScript = existingAd ? addExistingAd() : null;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'blog/components.js' });
  documentListeners.get('DOMContentLoaded')();
  return {
    context, ads, appended, scripts, timers, idle, logs, gtagCalls, foreignScript,
    adScripts() { return appended.filter(script => script.src === ADS_URL); },
    runTimer(delay) {
      const index = timers.findIndex(task => task.delay === delay);
      assert.notEqual(index, -1, `${delay}msの再試行がありません`);
      timers.splice(index, 1)[0].callback();
    },
    completeCore(success = true) {
      const script = scripts.find(item => item.src.includes('/js/analytics-core.js'));
      assert.ok(script);
      if (success) context.PlayPointAnalytics = core;
      script.fire(success ? 'load' : 'error');
    },
    setConsent({ ads: nextAds = adsAllowed, analytics: nextAnalytics = analyticsAllowed } = {}) {
      adsAllowed = nextAds; analyticsAllowed = nextAnalytics;
      const ready = pendingConsent.filter(item => item.purpose === 'ads' ? adsAllowed : analyticsAllowed);
      ready.forEach(item => { pendingConsent.splice(pendingConsent.indexOf(item), 1); item.callback(); });
    },
    addExistingAd
  };
}

async function settle() {
  // Promiseの入れ子とcatchを処理し、実時間の待機はしない。
  for (let i = 0; i < 3; i += 1) await new Promise(resolve => setImmediate(resolve));
}

test('blog広告: 解析モジュールが取得待ちでも広告許可後は既存枠を準備する', async () => {
  const r = createRuntime({ coreReady: false });
  await settle();
  assert.equal(r.context.adsbygoogle.length, 1);
  assert.equal(r.adScripts().length, 1);
  assert.equal(r.gtagCalls.length, 0);
});

test('blog広告: 解析モジュール取得失敗が広告や未処理Promise例外へ波及しない', async () => {
  const r = createRuntime({ coreReady: false });
  r.completeCore(false);
  await settle();
  assert.equal(r.context.adsbygoogle.length, 1);
  assert.ok(r.logs.some(entry => entry.level === 'warn'));
  assert.equal(r.gtagCalls.length, 0);
});

test('blog広告: 通信失敗時は自分のscriptを除去して一度だけ再試行する', async () => {
  const r = createRuntime();
  await settle();
  const first = r.adScripts()[0];
  first.fire('error');
  assert.equal(first.isConnected, false);
  assert.equal(r.adScripts().length, 1, '即時に再試行してはいけない');
  r.runTimer(3000);
  assert.equal(r.adScripts().length, 2);
  const second = r.adScripts()[1];
  assert.equal(second.async, true);
  assert.equal(second.crossOrigin, 'anonymous');
  assert.equal(second.src, first.src);
  assert.equal(r.context.adsbygoogle.length, 1, '取得再試行で広告枠を二重pushしてはいけない');
  second.fire('error');
  assert.equal(second.isConnected, false);
  assert.equal(r.timers.length, 0, '失敗の無制限再試行をしてはいけない');
});

test('blog広告: 成功時は追加の取得やタイマーを増やさない', async () => {
  const r = createRuntime();
  r.adScripts()[0].fire('load');
  await settle();
  assert.equal(r.adScripts().length, 1);
  assert.equal(r.timers.length, 0);
  assert.equal(r.context.adsbygoogle.length, 1);
});

test('blog広告: 再試行成功後も同じ広告枠を重複要求しない', async () => {
  const r = createRuntime();
  await settle();
  r.adScripts()[0].fire('error');
  r.runTimer(3000);
  r.adScripts()[1].fire('load');
  await r.context.PlayPointBlogAds.request();
  assert.equal(r.context.adsbygoogle.length, 1);
  assert.equal(r.timers.length, 0);
});

test('blog広告: 別コンポーネントが取得済みのscriptには干渉しない', async () => {
  const r = createRuntime({ existingAd: true });
  await settle();
  assert.equal(r.adScripts().length, 0);
  assert.equal(r.foreignScript.isConnected, true);
  assert.equal(r.foreignScript.onerror, undefined);
  assert.equal(r.context.adsbygoogle.length, 1);
});

test('blog広告: 再試行までに別scriptが追加されても重複取得しない', async () => {
  const r = createRuntime();
  await settle();
  r.adScripts()[0].fire('error');
  const other = r.addExistingAd();
  r.runTimer(3000);
  assert.equal(r.adScripts().length, 1);
  assert.equal(other.isConnected, true);
  assert.equal(r.context.adsbygoogle.length, 1);
});

test('blog広告: 広告同意がない場合もCMP用libraryの早期取得は維持する', async () => {
  const r = createRuntime({ adsAllowed: false });
  await settle();
  assert.equal(r.adScripts().length, 1);
  assert.equal(r.context.adsbygoogle.length, 0);
  r.adScripts()[0].fire('error');
  r.runTimer(3000);
  await settle();
  assert.equal(r.context.adsbygoogle.length, 0, '取得再試行で広告同意を迂回してはいけない');
  assert.equal(r.gtagCalls.length, 0);
});

test('blog広告: 同意管理の取得待ちでは広告枠も解析も要求しない', async () => {
  const r = createRuntime({ consentReady: false });
  await settle();
  assert.equal(r.adScripts().length, 1);
  assert.equal(r.context.adsbygoogle.length, 0);
  assert.equal(r.gtagCalls.length, 0);
});

test('blog広告: 後から広告を許可しても準備は一度で解析は開始しない', async () => {
  const r = createRuntime({ adsAllowed: false, coreReady: false });
  await settle();
  await r.context.PlayPointBlogAds.request();
  r.setConsent({ ads: true });
  r.setConsent({ ads: true });
  await settle();
  assert.equal(r.context.adsbygoogle.length, 1);
  assert.equal(r.gtagCalls.length, 0);
});

test('blog広告: 解析だけの許可で広告枠を準備しない', async () => {
  const r = createRuntime({ adsAllowed: false, analyticsAllowed: true });
  r.idle[0]();
  await settle();
  assert.equal(r.context.adsbygoogle.length, 0);
  assert.equal(r.gtagCalls.filter(call => call[0] === 'config').length, 1);
});

test('blog広告: 解析は依然として解析モジュール取得完了を待つ', async () => {
  const r = createRuntime({ coreReady: false, analyticsAllowed: true });
  r.idle[0]();
  await settle();
  assert.equal(r.gtagCalls.length, 0);
  r.completeCore();
  await settle();
  assert.equal(r.gtagCalls.filter(call => call[0] === 'config').length, 1);
  assert.equal(r.context.adsbygoogle.length, 1);
});

test('blog広告: 切断済み・要求済み・処理済みの枠は変更しない', async () => {
  const ads = [createAd(), createAd({}, false), createAd({ playpointAdRequested: 'true' }), createAd({ adsbygoogleStatus: 'done' })];
  const r = createRuntime({ ads });
  await settle();
  await r.context.PlayPointBlogAds.request();
  assert.equal(r.context.adsbygoogle.length, 1);
  assert.equal(ads[1].dataset.playpointAdRequested, undefined);
});

test('blog広告: 後から追加した枠も既存の広告同意の経路を使う', async () => {
  const r = createRuntime();
  await settle();
  const extra = createAd();
  const scope = { querySelectorAll() { return [extra]; } };
  r.setConsent({ ads: false });
  await r.context.PlayPointBlogAds.request(scope);
  assert.equal(extra.dataset.playpointAdRequested, undefined);
  r.setConsent({ ads: true });
  await r.context.PlayPointBlogAds.request(scope);
  assert.equal(r.context.adsbygoogle.length, 2);
});

test('blog広告: 旧同意APIでも許可なしの要求は増やさない', async () => {
  const r = createRuntime({ legacyConsent: true, analyticsAllowed: false });
  await settle();
  assert.equal(r.context.adsbygoogle.length, 0);
  r.setConsent({ analytics: true });
  await settle();
  assert.equal(r.context.adsbygoogle.length, 1);
});

test('blog広告: 記事のlibrary取得は維持しブログ専用枠の要求を混在させない', async () => {
  const r = createRuntime({ pathname: '/articles/example.html' });
  await settle();
  assert.equal(r.adScripts().length, 1);
  assert.equal(r.context.adsbygoogle.length, 0);
  r.adScripts()[0].fire('error');
  r.runTimer(3000);
  assert.equal(r.adScripts().length, 2);
});

test('blog広告: 対象外ページに新しい広告取得を追加しない', async () => {
  for (const pathname of ['/', '/latest/']) {
    const r = createRuntime({ pathname });
    await settle();
    assert.equal(r.adScripts().length, 0);
    assert.equal(r.context.adsbygoogle.length, 0);
  }
});
}
