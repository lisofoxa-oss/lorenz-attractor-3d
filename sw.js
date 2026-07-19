const CACHE_NAME = 'lorenz-3d-v1';
const urlsToCache = [
  '/lorenz-attractor-3d/',
  '/lorenz-attractor-3d/index.html',
  '/lorenz-attractor-3d/app.js',
  '/lorenz-attractor-3d/assets/preview.png',
  '/lorenz-attractor-3d/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        return fetch(event.request);
      })
  );
});
