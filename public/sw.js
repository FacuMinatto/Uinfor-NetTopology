const CACHE_NAME = 'nettopology-shell-v6';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest?v=4',
  './uinfor-icon-192.png?v=4',
  './uinfor-icon-512.png?v=4',
  './apple-touch-icon.png?v=4'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        APP_SHELL.map((url) =>
          fetch(new Request(url, { cache: 'no-store' }))
            .then((resp) => (resp && resp.ok ? cache.put(url, resp) : null))
            .catch(() => null)
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
    );
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (request.headers.has('Authorization')) return;

  const url = new URL(request.url);
  if (
    url.pathname.includes('/__/auth/') ||
    url.hostname.includes('identitytoolkit') ||
    url.hostname.includes('securetoken')
  ) {
    return;
  }

  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then((resp) => {
          if (resp && resp.ok) {
            const copyForIndex = resp.clone();
            const copyForRoot = resp.clone();
            caches.open(CACHE_NAME).then((c) => {
              c.put('./index.html', copyForIndex).catch(() => {});
              c.put('./', copyForRoot).catch(() => {});
            }).catch(() => {});
          }
          return resp;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  event.respondWith(
    fetch(request, { cache: 'no-store' })
      .then((resp) => {
        if (resp && resp.ok && resp.type === 'basic') {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, copy)).catch(() => {});
        }
        return resp;
      })
      .catch(() => caches.match(request))
  );
});
