'use strict';

const CACHE_PREFIX = 'playpoint-calc-v';
const CACHE_NAME = 'playpoint-calc-v20261001_2256-3c9f2a90';;
// 初回は計算機の必須シェルだけを先読みし、記事・日記などは実利用時にキャッシュする。
const ASSETS = [
  './',
  './style.css?v=ccc64d5fb6',
  './region-selector.css',
  './favicon.svg',
  './manifest.json',
  './pwa-launch.html',
  './icon-192.png',
  './icon-512.png',
  './js/analytics-core.js?v=96fa25c428',
  './js/config.js',
  './js/ui.js',
  './js/calculator.js',
  './js/calculator-core.js',
  './js/calculator-result-view.js',
  './js/region-rules.js',
  './js/share.js',
  './js/main-calculator-ui.js?v=59493be776',
  './js/main.js?v=9f9669086c',
  './js/web-vitals.js',
  './js/region-navigation.js',
  './js/region-expansion-config.js',
  './js/result-navigation-config.js',
  './js/language-suggestion.js',
  './js/first-view.js',
  './js/calendar-reminder.js',
  './js/pwa-install.js',
  './js/widget-referral.js',
  './js/service-worker-registration.js',
  './js/calculator-funnel-analytics.js',
  './en/',
  './ko/',
  './tw/',
  './hk/',
  './in/'
];

// インストール時に静的アセットをキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // キャッシュインストール時にHTTPキャッシュをバイパスし、必ずサーバーから最新版を取得
        const bypassRequests = ASSETS.map(url => new Request(url, { cache: 'reload' }));
        return cache.addAll(bypassRequests).then(() => self.skipWaiting());
      })
  );
});

// アクティベート時に古いキャッシュを破棄
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache.startsWith(CACHE_PREFIX) && cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(async () => {
      // 以前の版で多く保存された端末も、起動資産を残して上限へ揃える。
      await trimRuntimeCache(await openRuntimeCache());
      return self.clients.claim();
    })
  );
});

const CACHEABLE_DESTINATIONS = new Set(['document', 'style', 'script', 'image', 'font', 'manifest']);
// 記事・画像の補助保存は上限を設け、起動に必要な先読み資産を残す。
const CORE_CACHE_KEYS = new Set(ASSETS.map(asset => new URL(asset, self.registration.scope).href));
const MAX_RUNTIME_ENTRIES = 100;

function isCacheableRequest(request) {
  if (request.method !== 'GET') return false;
  const url = new URL(request.url);

  // サービスワーカー自身やサブアプリのSWスクリプトはキャッシュしない
  if (url.pathname.endsWith('sw.js') || url.pathname.endsWith('service-worker.js')) {
    return false;
  }

  return url.origin === self.location.origin && CACHEABLE_DESTINATIONS.has(request.destination);
}

// 共有・計測用クエリをキャッシュキーから除き、静的アセットの版番号だけを保持する
function getCacheKey(request) {
  const url = new URL(request.url);
  const version = request.destination === 'document' ? null : url.searchParams.get('v');
  url.search = version ? `?v=${encodeURIComponent(version)}` : '';
  url.hash = '';
  return url.toString();
}

// 閲覧中のCache APIは補助保存。初回installの必須先読みとは失敗方針を分ける。
async function openRuntimeCache() {
  try { return await caches.open(CACHE_NAME); } catch { return null; }
}

async function matchRuntimeCache(cache, key) {
  try { return cache ? await cache.match(key) : undefined; } catch { return undefined; }
}

async function storeRuntimeResponse(cache, key, response) {
  if (!cache || !response || !response.ok || response.type !== 'basic') return;
  try { await cache.put(key, response.clone()); } catch {
    // 容量不足などの保存失敗で、取得済みの正常な応答を失わせない。
  }
  await trimRuntimeCache(cache);
}

async function trimRuntimeCache(cache) {
  if (!cache) return;
  try {
    const extra = (await cache.keys()).filter(request => !CORE_CACHE_KEYS.has(request.url));
    for (const request of extra.slice(0, Math.max(0, extra.length - MAX_RUNTIME_ENTRIES))) {
      await cache.delete(request);
    }
  } catch {
    // 補助保存の整理が失敗しても、応答と有効化を妨げない。
  }
}

// HTMLはネットワーク優先。通信が失敗した時だけ同一ページ／トップへ戻す。
const OFFLINE_FALLBACK_URL = new URL('./', self.registration.scope).toString();

// 応答ヘッダーだけでなく本文の読み込みにも待機上限を設ける。
async function fetchWithTimeout(request, timeoutMs = 4000) {
  const controller = new AbortController();
  let timer;
  try {
    return await Promise.race([
      (async () => {
        const response = await fetch(request, { signal: controller.signal });
        if (typeof response.clone().arrayBuffer === 'function') await response.clone().arrayBuffer();
        return response;
      })(),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error('PWA通信待ちの上限に達しました'));
        }, timeoutMs);
      })
    ]);
  } finally { clearTimeout(timer); }
}

function trackResponseStorage(event) {
  let finish;
  event.waitUntil(new Promise(resolve => { finish = resolve; }));
  return finish;
}

async function handleNavigationRequest(request, cacheKey, event) {
  const finish = trackResponseStorage(event);
  const cache = await openRuntimeCache();
  try {
    const networkResponse = await fetchWithTimeout(request);
    // 通信できてもサーバー障害なら、保存済みの正常画面を使う。404はそのまま返す。
    if (networkResponse.status >= 500) {
      const cached = await matchRuntimeCache(cache, cacheKey);
      const fallback = cached || await matchRuntimeCache(cache, OFFLINE_FALLBACK_URL);
      finish();
      return fallback || networkResponse;
    }
    storeRuntimeResponse(cache, cacheKey, networkResponse).finally(finish);
    return networkResponse;
  } catch (error) {
    finish();
    const cachedResponse = await matchRuntimeCache(cache, cacheKey);
    const fallback = cachedResponse || await matchRuntimeCache(cache, OFFLINE_FALLBACK_URL);
    if (fallback) return fallback;
    throw error;
  }
}

// 静的資産は既存cacheを先に返し、再取得と保存をイベントの寿命へ結び付ける。
function handleStaticRequest(request, cacheKey, event) {
  const finish = trackResponseStorage(event);
  const cachePromise = openRuntimeCache();
  const refreshed = cachePromise.then(async (cache) => {
    const networkResponse = await fetchWithTimeout(request);
    storeRuntimeResponse(cache, cacheKey, networkResponse).finally(finish);
    return networkResponse;
  });
  // cache hitでもworker終了で再取得が途中放棄されないよう、dispatch中に登録する。
  // background失敗は処理済みにするが、cache missの応答側には通信エラーを伝える。
  event.waitUntil(refreshed.then(() => undefined, () => { finish(); }));
  return cachePromise.then(async (cache) => {
    const cachedResponse = await matchRuntimeCache(cache, cacheKey);
    return cachedResponse || refreshed;
  });
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !isCacheableRequest(event.request)) return;

  const cacheKey = getCacheKey(event.request);
  const isNavigation = event.request.mode === 'navigate' || event.request.destination === 'document';

  event.respondWith(
    isNavigation
      ? handleNavigationRequest(event.request, cacheKey, event)
      : handleStaticRequest(event.request, cacheKey, event)
  );
});
