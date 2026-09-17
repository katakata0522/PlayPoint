'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.resolve(__dirname, '../../sw.js'), 'utf8');
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
  networkHandler = async () => basicResponse('network'),
  openFailure = false,
  matchFailure = false,
  putHandler = async () => {},
  workerSource = source
} = {}) {
  const listeners = new Map();
  const addAllCalls = [];
  const deletedCaches = [];
  const openedCaches = [];
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
      await putHandler(key, response);
      cacheEntries.set(String(key), response);
    },
    async match(key) {
      if (matchFailure) throw new Error('cache read unavailable');
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
      async open(name) { openedCaches.push(String(name)); if (openFailure) throw new Error('cache open unavailable'); return cache; },
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
  vm.runInContext(workerSource, context, { filename: 'sw.js' });

  function lifecycle(type) {
    let promise;
    listeners.get(type)({ waitUntil(value) { promise = Promise.resolve(value); } });
    assert.ok(promise, `${type}: waitUntil が呼ばれていません`);
    return promise;
  }

  const background = [];
  async function fireFetch(request) {
    let responded = false;
    let responsePromise;
    listeners.get('fetch')({
      request,
      waitUntil(value) { background.push(Promise.resolve(value)); },
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
    background,
    cacheEntries,
    async settleBackground() { await Promise.all(background); },
    deletedCaches,
    fetchCalls,
    fireActivate: () => lifecycle('activate'),
    fireFetch,
    fireInstall: () => lifecycle('install'),
    get claimCalls() { return claimCalls; },
    get skipWaitingCalls() { return skipWaitingCalls; },
    matchCalls,
    openedCaches,
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


module.exports = { createRuntime, basicResponse, request, ORIGIN };
