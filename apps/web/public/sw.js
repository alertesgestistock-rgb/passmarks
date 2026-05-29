/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'passmark-v4';
const STATIC_ASSETS = ['/index.html', '/manifest.json', '/offline.html'];

// --- Lifecycle ---

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(STATIC_ASSETS.map((url) => cache.add(url)))
    )
  );
});

// App can send SKIP_WAITING to activate new SW without a full page reload
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.map((n) => n !== CACHE_NAME && caches.delete(n)))
    )
  );
  self.clients.claim();
});

// --- Fetch: Network-first with offline fallback ---

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip cross-origin requests (Supabase, Claude API, CDNs)
  if (url.origin !== self.location.origin) return;
  // Skip API routes
  if (url.pathname.startsWith('/api')) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache successful same-origin responses dynamically
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // Navigation request while offline → show offline page
          if (
            event.request.mode === 'navigate' ||
            (event.request.headers.get('accept') || '').includes('text/html')
          ) {
            return caches.match('/offline.html');
          }
          return new Response('', { status: 408, statusText: 'Request Timeout' });
        })
      )
  );
});
