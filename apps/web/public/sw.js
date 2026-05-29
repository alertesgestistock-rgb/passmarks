
const CACHE_NAME = 'passmark-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Network First for API calls
  if (url.pathname.includes('/hcgi/api') || url.pathname.includes('/api/')) {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            if (e.request.method === 'GET') {
              cache.put(e.request, clonedResponse);
            }
          });
          return response;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // Cache First for other assets
    e.respondWith(
      caches.match(e.request)
        .then((response) => {
          if (response) return response;
          return fetch(e.request).then((networkResponse) => {
            if (e.request.method === 'GET') {
              const clonedResponse = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(e.request, clonedResponse);
              });
            }
            return networkResponse;
          });
        })
        .catch(() => {
          // Fallback if strictly offline and not in cache
          if (e.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        })
    );
  }
});
