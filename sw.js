'use strict';

const CACHE_PREFIX = 'playpoint-calc-v';
const CACHE_NAME = 'playpoint-calc-v20260628_1120';
const ASSETS = [
  './',
  './style.css?v=20260628_1120a',
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
  './latest/',
  './author/katakata.html',
  './js/config.js',
  './js/ui.js',
  './js/diary.js',
  './js/calculator.js',
  './js/share.js',
  './js/main.js?v=20260628_1120a',
  './js/intent-tracking.js?v=20260628_1120a',
  './js/consent.js?v=20260619a',
  './js/third-party.js?v=20260628_1120a',
  './blog/style.css?v=20260619a',
  './blog/components.js?v=20260621a',
  './blog/script.js?v=20260628_1053a',
  './blog/article.js?v=20260628_1120a',
  './articles/article-shared.css?v=20260628_1120a',
  './en/',
  './ko/',
  './tw/',
  './articles/2026-06-20-discount-gift-cards.html',
  './en/articles/2026-06-20-discount-gift-cards.html',
  './ko/articles/2026-06-20-discount-gift-cards.html',
  './tw/articles/2026-06-20-discount-gift-cards.html'
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
