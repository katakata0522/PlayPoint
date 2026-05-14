const APP_SHELL_CACHE = 'gravity-todo-app-v18';
const RUNTIME_CACHE = 'gravity-todo-runtime-v18';
const APP_SHELL_URLS = [
  './',
  './index.html',
  './manifest.json',
  './style.css',
  './icon.svg',
  './src/main.js',
  './src/taskText.js',
  './src/PhysicsEngine.js',
  './src/ParticleSystem.js',
  './src/SoundManager.js',
  './src/StorageManager.js',
  './src/UIManager.js',
  './src/TaskRenderer.js',
  './src/InteractionManager.js',
  './src/SettingsManager.js',
  './src/TaskDetailPanel.js',
  './src/BGMManager.js',
  './src/GyroManager.js',
  './src/TimeTheme.js',
  './src/consent-manager.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames
        .filter((cacheName) => ![APP_SHELL_CACHE, RUNTIME_CACHE].includes(cacheName))
        .map((cacheName) => caches.delete(cacheName))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        if (networkResponse.ok) {
          const copy = networkResponse.clone();
          caches.open(APP_SHELL_CACHE).then((cache) => cache.put(event.request, copy));
        }
        return networkResponse;
      }).catch(() => caches.match(event.request).then((cachedResponse) => cachedResponse || caches.match('./index.html')))
    );
    return;
  }

  // 同一オリジン: stale-while-revalidate
  // キャッシュを即座に返しつつ、裏でネットワークから最新版を取得してキャッシュ更新
  if (requestUrl.origin === self.location.origin) {
    event.respondWith(
      caches.open(APP_SHELL_CACHE).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 外部オリジン: stale-while-revalidate (Runtime Cache)
  event.respondWith(
    caches.open(RUNTIME_CACHE).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse.ok) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      });
    })
  );
});
