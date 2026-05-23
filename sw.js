// FocusFlow Service Worker
// Cache-first for shell, network-first for Supabase
const CACHE_NAME = 'focusflow-v5';
const SHELL = [
  '/focusflow/',
  '/focusflow/index.html',
  '/focusflow/icon-192.png',
  '/focusflow/icon-512.png',
  '/focusflow/apple-touch-icon.png',
  '/focusflow/manifest.json',
];

// ── Install: pre-cache the app shell ─────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

// ── Activate: purge stale caches ─────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch strategy ────────────────────────────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Let Supabase, CDN, and fonts go straight to network — never cache
  const passThrough = [
    'supabase.co',
    'cdn.jsdelivr.net',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
  ];
  if (passThrough.some(h => url.hostname.includes(h))) return;

  // For same-origin requests: cache-first, network fallback
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;

      return fetch(e.request)
        .then(res => {
          // Only cache valid same-origin GET responses
          if (
            res.ok &&
            e.request.method === 'GET' &&
            url.origin === self.location.origin
          ) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() =>
          // Offline fallback — return the cached shell
          caches.match('/focusflow/')
        );
    })
  );
});
