const CACHE_NAME = 'smile-land-v2-20260520';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './tailwind.js',
  './kiwimaru-400.ttf',
  './kiwimaru-500.ttf',
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
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// ネットワーク優先、失敗時にキャッシュにフォールバック
self.addEventListener('fetch', event => {
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
