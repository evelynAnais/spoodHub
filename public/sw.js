/**
 * Hand-written service worker.
 *
 * `@vite-pwa/astro` does not support Astro 7 yet, and the caching this site
 * needs is simple enough not to warrant the dependency:
 *
 *   - navigations      network-first, so an online visit always gets the
 *                      current build and the app can never get stuck on a
 *                      stale version
 *   - /_astro/ assets  cache-first, because those filenames contain a content
 *                      hash and therefore never change meaning
 *   - everything else  stale-while-revalidate
 *
 * Note that none of this touches tracker data. That lives in IndexedDB, which
 * is a separate store the service worker has no part in — clearing the cache
 * here does not lose a single feeding log.
 */

const VERSION = 'v1';
const SHELL_CACHE = `spoodhub-shell-${VERSION}`;
const RUNTIME_CACHE = `spoodhub-runtime-${VERSION}`;

const SHELL = ['/', '/track', '/log', '/species', '/care', '/about', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      // Individually, so one 404 cannot fail the whole install.
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  // Navigations: try the network, fall back to whatever was cached.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          // Ignore the query string so /log?s=<uuid> still resolves offline.
          const cached =
            (await caches.match(request)) ??
            (await caches.match(url.pathname)) ??
            (await caches.match('/track'));
          return cached ?? new Response('Offline', { status: 503 });
        }),
    );
    return;
  }

  // Build assets carry a content hash, so a cache hit is always correct.
  if (url.pathname.startsWith('/_astro/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            const copy = response.clone();
            void caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached ?? network;
    }),
  );
});
