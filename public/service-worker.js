const CACHE_NAME = 'manakirana-pos-shell-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => (
      Promise.all(
        keys
          .filter((key) => key.startsWith('manakirana-pos-shell-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  event.respondWith(fetch(request));
});
