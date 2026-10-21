/* GATE CSE 2027 Study Hub — offline service worker.
   Everything is cached on first visit; pages then load from the cache and refresh in the background.
   Bump VERSION whenever you change any file so installed copies pick up the update. */
const VERSION = 'v18';
const CACHE = 'gate2027-' + VERSION;
const PRECACHE = [
 "./",
 "alg-gate-2027.html",
 "cd-gate-2027.html",
 "cheatsheet-gate-2027.html",
 "cn-gate-2027.html",
 "coa-gate-2027.html",
 "dbms-gate-2027.html",
 "discrete-math-gate-2027.html",
 "dl-gate-2027.html",
 "em-gate-2027.html",
 "ga-gate-2027.html",
 "index.html",
 "mock-gate-2027.html",
 "os-gate-2027.html",
 "pds-gate-2027.html",
 "toc-gate-2027.html",
 "gate-test.js",
 "manifest.webmanifest",
 "bank-alg.js",
 "bank-cd.js",
 "bank-cn.js",
 "bank-coa.js",
 "bank-dbms.js",
 "bank-discrete-math.js",
 "bank-dl.js",
 "bank-em.js",
 "bank-ga.js",
 "bank-os.js",
 "bank-pds.js",
 "bank-toc.js",
 "icon-192.png",
 "icon-512.png",
 "icon-maskable-512.png",
 "apple-touch-icon.png",
 "favicon-64.png"
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    let ok = 0;
    await Promise.all(PRECACHE.map(async u => { try { await c.add(new Request(u, {cache: 'reload'})); ok++; } catch (_) {} }));
    if (ok === PRECACHE.length) await c.put(new Request(self.registration.scope + '__ready'), new Response('1'));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('gate2027-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

function keyFor(req) {
  const u = new URL(req.url);
  if (u.pathname.endsWith('.html') || u.pathname.endsWith('/')) return new Request(u.origin + u.pathname);
  return req;
}

async function rangeResponse(req, res) {
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '');
  if (!m) return res;
  const buf = await res.clone().arrayBuffer(), n = buf.byteLength;
  const start = m[1] ? parseInt(m[1], 10) : 0, end = m[2] ? Math.min(parseInt(m[2], 10), n - 1) : n - 1;
  return new Response(buf.slice(start, end + 1), {status: 206, statusText: 'Partial Content',
    headers: {'Content-Type': res.headers.get('Content-Type') || 'application/octet-stream',
              'Content-Range': 'bytes ' + start + '-' + end + '/' + n, 'Content-Length': String(end - start + 1)}});
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = keyFor(req);
    const hit = await cache.match(key, {ignoreSearch: false});
    const refresh = fetch(req.headers.has('range') ? new Request(req.url) : req).then(async res => {
      if (res && res.ok && res.status === 200) await cache.put(key, res.clone());
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(refresh); return req.headers.has('range') ? rangeResponse(req, hit) : hit; }
    const net = await refresh;
    if (net) return req.headers.has('range') ? rangeResponse(req, net) : net;
    if (req.mode === 'navigate') { const home = await cache.match(new Request(new URL('index.html', self.registration.scope).href)); if (home) return home; }
    return new Response('Offline and not cached yet. Open this page once while online.', {status: 503, headers: {'Content-Type': 'text/plain'}});
  })());
});
