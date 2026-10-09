const CACHE_NAME = 'mhent-study-v2.0.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/lyrics',
  '/login',
  '/download',
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
  '/ko',
  '/ja',
  '/zh',
  '/en',
  '/shared',
  '/ko/practice/vocab',
  '/ja/practice/vocab',
  '/zh/practice/vocab',
  '/en/practice/vocab'
];

// Helper để làm sạch response (loại bỏ cờ redirected: true để tránh lỗi browser navigation)
async function cleanResponse(res) {
  if (!res || !res.redirected) return res;
  const blob = await res.blob();
  return new Response(blob, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of STATIC_ASSETS) {
        try {
          const res = await fetch(asset);
          if (res && res.status === 200) {
            const clean = await cleanResponse(res);
            await cache.put(asset, clean);
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

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  // Navigation requests (Tải trang HTML)
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Ưu tiên mạng trực tiếp cho điều hướng trang (Network-First)
          const networkRes = await fetch(req);
          // Làm sạch response nếu Vercel hoặc Cloud chuyển hướng Clean URL
          const cleanRes = await cleanResponse(networkRes);
          if (cleanRes.status === 200) {
            const clone = cleanRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return cleanRes;
        } catch (err) {
          // Dự phòng ngoại tuyến (Offline fallback)
          let cached = await caches.match(req);
          if (!cached) {
            const cleanPath = url.pathname.replace(/\/index\.html$/, '').replace(/\.html$/, '') || '/';
            cached = (await caches.match(cleanPath)) || (await caches.match(cleanPath + '/'));
          }
          if (cached) {
            return await cleanResponse(cached);
          }
          const fallback = (await caches.match('/')) || (await caches.match('/index.html'));
          if (fallback) {
            return await cleanResponse(fallback);
          }
          throw err;
        }
      })()
    );
    return;
  }

  // Static assets (CSS, JS, Fonts, Images, Audio): Cache-First
  event.respondWith(
    caches.match(req).then(async (cached) => {
      if (cached) {
        return await cleanResponse(cached);
      }
      return fetch(req).then(async (networkRes) => {
        const cleanRes = await cleanResponse(networkRes);
        if (cleanRes && cleanRes.status === 200) {
          const clone = cleanRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return cleanRes;
      });
    })
  );
});
