// Solaas Stock service worker.
// Keeps a copy of the app's own files so it opens quickly and still loads on a bad signal.
// Stock data always comes live from Supabase and is never cached here.
const CACHE = 'solaas-stock-v1';
const SHELL = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;   // Supabase, CDNs: straight to network

  // Pages: try the network first so updates show up straight away, fall back to the saved copy offline.
  if (req.mode === 'navigate'){
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('/', copy)); return res; })
        .catch(() => caches.match('/'))
    );
    return;
  }
  // Icons and the manifest: saved copy first.
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
