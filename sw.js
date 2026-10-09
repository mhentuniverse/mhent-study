const CACHE_NAME = 'mhent-study-v1.2.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/lyrics.html',
  '/login.html',
  '/download.html',
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
  '/js/speech.js',
  '/js/offline-manager.js',
  '/js/vocab-sheet.js',
  '/js/deck-selector.js',
  '/js/lyrics-hub.js',
  '/data/sample-ko.js',
  '/data/sample-ja.js',
  '/data/sample-zh.js',
  '/data/sample-en.js',
  '/ko/index.html',
  '/ja/index.html',
  '/zh/index.html',
  '/en/index.html',
  '/ko/practice/vocab.html',
  '/ja/practice/vocab.html',
  '/zh/practice/vocab.html',
  '/en/practice/vocab.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of STATIC_ASSETS) {
        try {
          const res = await fetch(asset);
          if (res && res.status === 200 && !res.redirected) {
            await cache.put(asset, res);
          }
        } catch (err) {
          console.warn('[ServiceWorker] Could not pre-cache:', asset, err);
        }
      }
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

  // Let cloud/API/external requests go directly to network
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  // Navigation requests (HTML pages)
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkRes = await fetch(req);
          // If server responded with a redirect, hand it to the browser properly
          if (networkRes.redirected) {
            return Response.redirect(networkRes.url, 302);
          }
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkRes;
        } catch (err) {
          // Offline fallback
          const cached = await caches.match(req);
          if (cached && !cached.redirected) {
            return cached;
          }
          const fallback = (await caches.match('/')) || (await caches.match('/index.html'));
          if (fallback && !fallback.redirected) {
            return fallback;
          }
          throw err;
        }
      })()
    );
    return;
  }

  // Static assets (CSS, JS, images, audio, data): Cache-first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached && !cached.redirected) {
        return cached;
      }
      return fetch(req).then((networkRes) => {
        if (networkRes && networkRes.status === 200 && !networkRes.redirected) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return networkRes;
      });
    })
  );
});
