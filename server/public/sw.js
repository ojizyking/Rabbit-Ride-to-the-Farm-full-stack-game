/**
 * Rabbit Ride to the Farm - Service Worker
 * Provides offline caching, lightning-fast boot, and seamless PWA capabilities.
 */

const CACHE_NAME = 'rabbit-farm-pwa-v1';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/assets/logo.svg',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/rabbits/starter_rabbit.svg',
  '/assets/bikes/starter_bike.svg',
  '/assets/items/carrot.svg',
  '/assets/items/star.svg',
  '/assets/items/crate.svg',
  '/assets/items/billboard.svg'
];

// Install: Precache vital assets and immediately activate
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up any stale outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Strategy based on request type
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. Bypass non-GET requests or backend API / telemetry calls
  if (req.method !== 'GET' || url.pathname.startsWith('/api') || url.hostname.includes('clerk')) {
    return;
  }

  // 2. Navigation (HTML): Network first, falling back to cached index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // 3. Static Assets (scripts, styles, images, fonts): Cache-first with stale-while-revalidate
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch background update for cache freshness
        fetch(req).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, responseToCache);
            });
          }
        }).catch(() => { /* silent fail for offline */ });

        return cachedResponse;
      }

      return fetch(req).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(req, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Fallback for image requests if offline
        if (req.destination === 'image') {
          return caches.match('/assets/logo.svg');
        }
      });
    })
  );
});
