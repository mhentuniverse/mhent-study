const CACHE_NAME = 'mhent-study-v1.0.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/lyrics.html',
  '/login.html',
  '/manifest.json',
  '/assets/study-logo.png',
  '/assets/icon-logo.png',
  '/assets/icon-web.png',
  '/css/study-core.css',
  '/css/mhent-ui.css',
  '/css/mhent-mobile.css',
  '/css/lyrics-hub.css',
  '/js/config.js',
  '/js/storage.js',
  '/js/mhent-ui.js',
  '/js/ui-kit.js',
  '/js/lyrics-hub.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Caching warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Let cloud/API/external requests go to network
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return networkRes;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
