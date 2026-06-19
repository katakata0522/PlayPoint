'use strict';

const CACHE_NAME = 'playpoint-calc-v20260619';
const ASSETS = [
  './',
  './index.html',
  './style.css?v=20260618a',
  './favicon.svg',
  './js/config.js',
  './js/ui.js',
  './js/diary.js',
  './js/calculator.js',
  './js/share.js',
  './js/main.js',
  './js/third-party.js?v=20260618a',
  './blog/style.css?v=20260619a',
  './blog/components.js?v=20260619a',
  './blog/script.js?v=20260619a',
  './articles/article-shared.css?v=20260619a',
  './en/',
  './en/index.html'
];

// インストール時に静的アセットをキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS);
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

// フェッチ時にキャッシュがあれば返し、裏でネットワークから最新版を取得して更新する (Stale-While-Revalidate)
self.addEventListener('fetch', (event) => {
  // 外部アフィリエイトやAnalyticsなどのリクエストはキャッシュから除外
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchedResponse = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
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
