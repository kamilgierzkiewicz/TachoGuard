/* TachoStróż — service worker (offline + instalacja Android) */
const CACHE = 'tachostroz-v1';
const CORE = ['./tachostroz.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    for (const u of CORE) { try { await c.add(u); } catch (_) {} }
    try { await c.add('./'); } catch (_) {}
    try { await c.add('./index.html'); } catch (_) {}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const ks = await caches.keys();
    await Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return; // API Anthropic itp. bez ingerencji
  if (req.mode === 'navigate') {
    // online: zawsze świeży plik (aktualizacje z GitHuba); offline: kopia z cache
    e.respondWith(
      fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r; })
        .catch(async () =>
          (await caches.match(req)) || (await caches.match('./tachostroz.html')) ||
          (await caches.match('./index.html')) || (await caches.match('./')))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
      return r;
    }))
  );
});
