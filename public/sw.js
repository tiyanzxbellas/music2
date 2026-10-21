/**
 * Service worker Musicall.
 * Versi lama: cache-first untuk SEMUA request -> aplikasi tidak pernah update
 * (index.html/player.js basi selamanya) dan respons /api ikut di-cache sehingga
 * hasil pencarian & URL audio kadaluarsa tetap dipakai.
 *
 * Versi ini:
 *  - navigasi/HTML  : network-first (fallback cache saat offline)
 *  - aset statis    : stale-while-revalidate (cepat, tetap ter-update)
 *  - /api/*         : SELALU network (tidak pernah di-cache)
 *  - audio/video/stream & request Range: lewati service worker
 */
const VERSION = 'musicall-v4';
const SHELL = [
  '/', '/index.html',
  '/app.js', '/player.js', '/home.js', '/search.js',
  '/miniplayer.js', '/fullplayer.js', '/artist.js',
  '/manifest.json', '/logo.png', '/dev.png', '/jansen_avatar.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // Simpan satu per satu supaya satu 404 tidak menggagalkan seluruh instalasi.
    await Promise.all(SHELL.map(async (url) => {
      try { await cache.add(new Request(url, { cache: 'reload' })); } catch (e) { /* abaikan */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

function isApi(url) {
  return url.pathname.startsWith('/api/') || url.pathname.startsWith('/api');
}
function isMedia(url) {
  return /\.(mp3|m4a|mp4|webm|ogg|wav)$/i.test(url.pathname);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;      // biarkan CDN/gambar eksternal
  if (isApi(url) || isMedia(url)) return;               // API & media: langsung jaringan
  if (req.headers.get('range')) return;                 // request Range: jangan di-cache

  const accept = req.headers.get('accept') || '';
  const isNavigation = req.mode === 'navigate' || accept.includes('text/html');

  if (isNavigation) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(VERSION);
        cache.put('/', fresh.clone());
        return fresh;
      } catch (e) {
        const cached = await caches.match('/') || await caches.match('/index.html');
        return cached || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(req);
    const network = fetch(req).then((res) => {
      if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    return cached || (await network) || new Response('', { status: 504 });
  })());
});
