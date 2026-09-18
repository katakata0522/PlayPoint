'use strict';

const CACHE_PREFIX = 'playpoint-calc-v';
const CACHE_NAME = 'playpoint-calc-v20260912_1015-9cee1a44';;
// 初回は計算機の必須シェルだけを先読みし、記事・日記などは実利用時にキャッシュする。
const ASSETS = [
  './',
  './style.css?v=62a03541b1',
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
  './js/main.js?v=3b3de5a2df',
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
    }).then(() => {
      return self.clients.claim();
    })
  );
});

const CACHEABLE_DESTINATIONS = new Set(['document', 'style', 'script', 'image', 'font', 'manifest']);

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
}

// HTMLはネットワーク優先。通信が失敗した時だけ同一ページ／トップへ戻す。
const OFFLINE_FALLBACK_URL = new URL('./', self.registration.scope).toString();

async function handleNavigationRequest(request, cacheKey) {
  const cache = await openRuntimeCache();
  try {
    const networkResponse = await fetch(request);
    await storeRuntimeResponse(cache, cacheKey, networkResponse);
    return networkResponse;
  } catch (error) {
    const cachedResponse = await matchRuntimeCache(cache, cacheKey);
    const fallback = cachedResponse || await matchRuntimeCache(cache, OFFLINE_FALLBACK_URL);
    if (fallback) return fallback;
    throw error;
  }
}

// 静的資産は既存cacheを先に返し、再取得と保存をイベントの寿命へ結び付ける。
function handleStaticRequest(request, cacheKey, event) {
  const cachePromise = openRuntimeCache();
  const refreshed = cachePromise.then(async (cache) => {
    const networkResponse = await fetch(request);
    await storeRuntimeResponse(cache, cacheKey, networkResponse);
    return networkResponse;
  });
  // cache hitでもworker終了で再取得が途中放棄されないよう、dispatch中に登録する。
  // background失敗は処理済みにするが、cache missの応答側には通信エラーを伝える。
  event.waitUntil(refreshed.then(() => undefined, () => undefined));
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
      ? handleNavigationRequest(event.request, cacheKey)
      : handleStaticRequest(event.request, cacheKey, event)
  );
});
