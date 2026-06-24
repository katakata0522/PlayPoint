const CACHE_PREFIX = 'smile-land-v';
const CACHE_NAME = 'smile-land-v2-20260520';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './tailwind-built.css',
  './app.js',
  './kiwimaru-400.woff2',
  './kiwimaru-500.woff2',
  './icon-192.png',
  './icon-512.png'
];

// インストール時にキャッシュを生成
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// アクティベート時に古いキャッシュをクリア
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// ネットワーク優先、失敗時にキャッシュにフォールバック
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // ネットワーク成功時：キャッシュも更新
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // オフライン時：キャッシュから返す
        return caches.match(event.request);
      })
  );
});
