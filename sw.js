'use strict';

const CACHE_NAME = 'playpoint-calc-v20260621_1250';
const ASSETS = [
  './',
  './index.html',
  './style.css?v=20260618a',
  './favicon.svg',
  './ogp.png',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './about-playpoints.html',
  './info.html',
  './changelog.html',
  './attention.html',
  './privacy.html',
  './terms.html',
  './sitemap.html',
  './embed.html',
  './author/katakata.html',
  './js/config.js',
  './js/ui.js',
  './js/diary.js',
  './js/calculator.js',
  './js/share.js',
  './js/main.js',
  './js/consent.js?v=20260619a',
  './js/third-party.js?v=20260619c',
  './blog/style.css?v=20260619a',
  './blog/components.js?v=20260619c',
  './blog/script.js?v=20260619a',
  './articles/article-shared.css?v=20260619b',
  './en/',
  './en/index.html',
  './ko/',
  './ko/index.html',
  './tw/',
  './tw/index.html'
];

// インストール時に静的アセットをキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS);
      })
      .catch((err) => {
        console.error('Service Worker install cache failure:', err);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// アクティベート時に古いキャッシュを破棄
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
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

// 静的コンテンツだけをStale-While-Revalidateで更新する
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !isCacheableRequest(event.request)) return;

  const cacheKey = getCacheKey(event.request);

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(cacheKey).then((cachedResponse) => {
        const fetchedResponse = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
            void cache.put(cacheKey, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // ネットワークエラー時はキャッシュの有無に関わらずフェールセーフ
          return cachedResponse;
        });

        return cachedResponse || fetchedResponse;
      });
    })
  );
});
