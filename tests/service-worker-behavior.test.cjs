'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.resolve(__dirname, '../sw.js'), 'utf8');
const ORIGIN = 'https://playpoint-sim.com';

class FakeRequest {
  constructor(url, options = {}) {
    this.url = String(url);
    this.cache = options.cache;
  }
}

function basicResponse(label) {
  return {
    label,
    ok: true,
    type: 'basic',
    clone() { return basicResponse(`${label}:clone`); }
  };
}

function createRuntime({
  cacheNames = [],
  cacheEntries = new Map(),
  installFailure = false,
  networkHandler = async () => basicResponse('network')
} = {}) {
  const listeners = new Map();
  const addAllCalls = [];
  const deletedCaches = [];
  const putCalls = [];
  const matchCalls = [];
  const fetchCalls = [];
  let skipWaitingCalls = 0;
  let claimCalls = 0;

  const cache = {
    async addAll(requests) {
      addAllCalls.push(requests);
      if (installFailure) throw new Error('precache failed');
    },
    async put(key, response) {
      putCalls.push({ key, response });
      cacheEntries.set(String(key), response);
    },
    async match(key) {
      const normalized = String(key);
      matchCalls.push(normalized);
      return cacheEntries.get(normalized) || null;
    }
  };

  const context = {
    console: { log() {}, warn() {}, error() {} },
    URL,
    Set,
    Request: FakeRequest,
    caches: {
      async open() { return cache; },
      async keys() { return [...cacheNames]; },
      async delete(name) { deletedCaches.push(name); return true; }
    },
    async fetch(request) {
      fetchCalls.push(request);
      return networkHandler(request);
    }
  };

  context.self = {
    location: { origin: ORIGIN },
    registration: { scope: `${ORIGIN}/` },
    clients: {
      async claim() { claimCalls += 1; }
    },
    async skipWaiting() { skipWaitingCalls += 1; },
    addEventListener(type, listener) { listeners.set(type, listener); }
  };

  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'sw.js' });

  function lifecycle(type) {
    let promise;
    listeners.get(type)({ waitUntil(value) { promise = Promise.resolve(value); } });
    assert.ok(promise, `${type}: waitUntil が呼ばれていません`);
    return promise;
  }

  async function fireFetch(request) {
    let responded = false;
    let responsePromise;
    listeners.get('fetch')({
      request,
      respondWith(value) {
        responded = true;
        responsePromise = Promise.resolve(value);
      }
    });
    return {
      responded,
      response: responded ? await responsePromise : undefined
    };
  }

  return {
    addAllCalls,
    deletedCaches,
    fetchCalls,
    fireActivate: () => lifecycle('activate'),
    fireFetch,
    fireInstall: () => lifecycle('install'),
    get claimCalls() { return claimCalls; },
    get skipWaitingCalls() { return skipWaitingCalls; },
    matchCalls,
    putCalls
  };
}

function request(url, {
  method = 'GET',
  destination = 'document',
  mode = destination === 'document' ? 'navigate' : 'cors'
} = {}) {
  return { url, method, destination, mode };
}

test('precache成功時だけ最新版をreload取得してskipWaitingする', async () => {
  const success = createRuntime();
  await success.fireInstall();

  assert.equal(success.addAllCalls.length, 1);
  assert.ok(success.addAllCalls[0].length > 0);
  assert.ok(success.addAllCalls[0].every(item => item instanceof FakeRequest && item.cache === 'reload'));
  assert.equal(success.skipWaitingCalls, 1);

  const failure = createRuntime({ installFailure: true });
  await assert.rejects(failure.fireInstall(), /precache failed/);
  assert.equal(failure.skipWaitingCalls, 0, 'precache失敗を握りつぶして有効化しています');
});

test('activateはPlayPointの古い世代だけを削除し他アプリのcacheを残す', async () => {
  const runtime = createRuntime({
    cacheNames: [
      'playpoint-calc-vold',
      'playpoint-calc-v20260819_1117-1e52215a',
      'other-app-cache'
    ]
  });

  await runtime.fireActivate();

  assert.deepEqual(runtime.deletedCaches, ['playpoint-calc-vold']);
  assert.equal(runtime.claimCalls, 1);
});

test('GETかつ同一originの許可destinationだけをfetch処理する', async () => {
  const runtime = createRuntime();

  for (const unsafe of [
    request(`${ORIGIN}/api`, { method: 'POST', destination: 'document' }),
    request('https://example.com/app.js', { destination: 'script' }),
    request(`${ORIGIN}/sw.js`, { destination: 'script' }),
    request(`${ORIGIN}/nested/service-worker.js`, { destination: 'script' })
  ]) {
    const result = await runtime.fireFetch(unsafe);
    assert.equal(result.responded, false, unsafe.url);
  }

  assert.equal(runtime.fetchCalls.length, 0);
});

test('画面遷移はcacheがあってもnetwork-firstで更新し追跡queryをcache keyから外す', async () => {
  const pageKey = `${ORIGIN}/articles/guide.html`;
  const cached = basicResponse('cached');
  const network = basicResponse('fresh');
  const runtime = createRuntime({
    cacheEntries: new Map([[pageKey, cached]]),
    networkHandler: async () => network
  });

  const result = await runtime.fireFetch(
    request(`${pageKey}?utm_source=x&v=ignored#section`, { destination: 'document', mode: 'navigate' })
  );

  assert.equal(result.responded, true);
  assert.equal(result.response, network);
  assert.equal(runtime.fetchCalls.length, 1, 'cacheがある時もnetwork取得を先に試す必要があります');
  assert.equal(runtime.putCalls.length, 1);
  assert.equal(runtime.putCalls[0].key, pageKey);
});

test('画面遷移のnetwork失敗時は同一ページcache、なければトップへfallbackする', async () => {
  const cachedKey = `${ORIGIN}/cached/`;
  const fallbackKey = `${ORIGIN}/`;
  const cached = basicResponse('cached-page');
  const fallback = basicResponse('fallback');
  const runtime = createRuntime({
    cacheEntries: new Map([[cachedKey, cached], [fallbackKey, fallback]]),
    networkHandler: async () => { throw new Error('offline'); }
  });

  const cachedResult = await runtime.fireFetch(request(`${cachedKey}?utm_source=x`));
  assert.equal(cachedResult.response, cached);

  const fallbackResult = await runtime.fireFetch(request(`${ORIGIN}/missing/?utm_source=x`));
  assert.equal(fallbackResult.response, fallback);
  assert.ok(runtime.matchCalls.includes(fallbackKey));
});

test('静的assetのcache keyは版番号vだけを残し追跡queryを捨てる', async () => {
  const runtime = createRuntime();
  const result = await runtime.fireFetch(
    request(`${ORIGIN}/js/main.js?v=abc123&utm_source=x&ref=share`, { destination: 'script', mode: 'cors' })
  );

  assert.equal(result.responded, true);
  assert.ok(runtime.matchCalls.includes(`${ORIGIN}/js/main.js?v=abc123`));
  assert.equal(runtime.putCalls[0].key, `${ORIGIN}/js/main.js?v=abc123`);
});
