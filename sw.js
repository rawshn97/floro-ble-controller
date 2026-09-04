const CACHE_NAME = 'floro-controller-v59';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './fonts/MaterialSymbolsOutlined.woff2',
  './js/app.js',
  './js/ble.js',
  './js/color-picker.js',
  './js/colors.js',
  './js/ui.js',
  './js/pwa-install.js',
  './js/state.js',
  './js/mode-names.js',
  './js/protocol.js',
  './js/errors.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

function isNetworkFirstRequest(request) {
  const path = new URL(request.url).pathname;
  return path.endsWith('/manifest.webmanifest') || path.endsWith('/sw.js');
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    const networkResponse = fetch(event.request).then((response) => {
      if (!response.ok) return response;
      const copy = response.clone();
      return caches.open(CACHE_NAME)
        .then((cache) => cache.put('./index.html', copy))
        .then(() => response);
    });

    event.waitUntil(networkResponse.then(() => undefined).catch(() => undefined));
    event.respondWith(
      caches.match('./index.html').then((cached) => cached || networkResponse)
    );
    return;
  }

  if (isNetworkFirstRequest(event.request)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          if (response.ok && event.request.url.startsWith(self.location.origin)) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request));
    })
  );
});
