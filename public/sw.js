// Minimal offline-support service worker.
//
// Strategy: this is a data-heavy dynamic app, not a static SPA, so the service worker does not
// try to precache every route. Instead:
//  - Static, content-hashed assets (_next/static, icons, fonts) are cached-first — they never change
//    for a given build, so serving them from cache is always safe and makes repeat loads instant.
//  - Page navigations are network-first with a cache fallback, so a page the technician already
//    opened once is still viewable offline; if it was never cached, we fall back to offline.html.
//  - API requests (/api/**) are always network-only. Offline editing is handled by the app's own
//    IndexedDB draft cache + mutation queue (see src/lib/offline/*), which needs to see real fetch
//    failures to decide when to queue — caching JSON responses here would fight that logic.

const STATIC_CACHE = "maltaman-static-v1";
const PAGE_CACHE = "maltaman-pages-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(["/offline.html", "/manifest.webmanifest"]))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== PAGE_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/fonts/");

  if (isStaticAsset) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(PAGE_CACHE);
          cache.put(request, response.clone());
          return response;
        } catch {
          const cache = await caches.open(PAGE_CACHE);
          const cached = await cache.match(request);
          return cached ?? (await caches.match("/offline.html"));
        }
      })()
    );
  }
});
