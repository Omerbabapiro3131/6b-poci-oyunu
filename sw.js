const CACHE = 'sixb-run-v17';

const CORE = [
  './index.html',
  './manifest-6b.webmanifest',
  './css/style.css',
  './js/config.js',
  './js/audio.js',
  './js/game.js',
  './assets/img/duran.png',
  './assets/img/kosan.png',
  './assets/img/poci.png',
  './assets/img/seyit.png',
  './assets/img/sinif.jpg',
  './assets/img/yakalanmis.png',
  './assets/img/sigma_jane.webp',
  './assets/img/sewete_abla.jpg'
];

function put(req, res) {
  if (!res || !res.ok || res.status !== 200 || res.headers.get('content-range')) return;
  caches.open(CACHE).then(c => c.put(req, res)).catch(() => {});
}

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(CORE.map(u => c.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
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
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.headers.has('range')) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(r => { put(req, r.clone()); return r; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  e.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) {
      if (/\.(?:js|css)$/.test(url.pathname)) {
        fetch(req).then(r => put(req, r.clone())).catch(() => {});
      }
      return hit;
    }
    try {
      const r = await fetch(req);
      put(req, r.clone());
      return r;
    } catch (err) {
      return Response.error();
    }
  })());
});
