/* CricketIQ Service Worker — offline-first for static assets */
const CACHE_NAME = 'cricketiq-v1';
const STATIC = [
  '/',
  '/index.html',
  '/predict',
  '/teams',
  '/players',
  '/analytics',
  '/live',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(STATIC))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // API calls — network first, no cache
  if (url.pathname.startsWith('/api/') || url.hostname === 'localhost' && url.port === '5000') {
    e.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ success: false, message: 'Offline — no cached data available' }),
          { headers: { 'Content-Type': 'application/json' } })
      )
    );
    return;
  }

  // Static assets — cache first
  e.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(request, copy));
        return res;
      });
    })
  );
});
