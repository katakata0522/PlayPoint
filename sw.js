'use strict';

const CACHE_PREFIX = 'playpoint-calc-v';
const CACHE_NAME = 'playpoint-calc-v20260823_1926-989fa033';
// 初回は計算機の必須シェルだけを先読みし、記事・日記などは実利用時にキャッシュする。
const ASSETS = [
  './',
  './style.css?v=66b5e78c99',
  './region-selector.css',
  './favicon.svg',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './js/analytics-core.js?v=42b5e82926',
  './js/config.js',
  './js/ui.js',
  './js/calculator.js',
  './js/share.js',
  './js/main-calculator-ui.js?v=1c7e562190',
  './js/main.js?v=f80cbefcf3',
  './js/web-vitals.js',
  './js/region-navigation.js',
  './js/region-expansion-config.js',
  './js/language-suggestion.js',
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

// HTMLはネットワーク優先で更新し、オフライン時だけキャッシュへ戻す
const OFFLINE_FALLBACK_URL = new URL('./', self.registration.scope).toString();

async function handleNavigationRequest(request, cacheKey) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
      await cache.put(cacheKey, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cachedResponse = await cache.match(cacheKey);
    return cachedResponse || cache.match(OFFLINE_FALLBACK_URL);
  }
}

// 版番号付きのCSS・JS・画像はStale-While-Revalidateで更新する
async function handleStaticRequest(request, cacheKey) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(cacheKey);
  const fetchedResponse = fetch(request).then((networkResponse) => {
    if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
      void cache.put(cacheKey, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => cachedResponse);

  return cachedResponse || fetchedResponse;
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !isCacheableRequest(event.request)) return;

  const cacheKey = getCacheKey(event.request);
  const isNavigation = event.request.mode === 'navigate' || event.request.destination === 'document';

  event.respondWith(
    isNavigation
      ? handleNavigationRequest(event.request, cacheKey)
      : handleStaticRequest(event.request, cacheKey)
  );
});
