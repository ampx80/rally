/* ============================================================
   ARDOVO SERVICE WORKER
   Conservative, offline-tolerant, SEO-safe.

   Strategy (never cache-trap HTML):
   - Navigations (mode==='navigate') : NETWORK-FIRST, fall back to
     cached app shell (/app) only when offline. Content stays fresh.
   - /api/*                          : NETWORK-ONLY (never cached),
     so live data is never stale.
   - /pages/* (prerendered SEO)      : NETWORK-FIRST, fall back to
     cache offline. SEO/content stays fresh for crawlers + humans.
   - Same-origin static assets       : CACHE-FIRST with background
     refresh (hashed /assets/* are immutable).
   - Cross-origin (fonts, etc.)      : pass through, never cached.

   Only GET + same-origin + 200 (basic) responses are ever stored.
   Versioned cache with cleanup. skipWaiting + clientsClaim.
   NO em-dash / en-dash. ASCII hyphen only.
   ============================================================ */

var VERSION = 'rally-v1';
var SHELL_CACHE = VERSION + '-shell';
var ASSET_CACHE = VERSION + '-assets';
var APP_SHELL = '/app';

/* Minimal precache: the app shell so offline navigations still boot
   the SPA (which has a local-store fallback). Kept tiny on purpose. */
var PRECACHE = [APP_SHELL];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(function (cache) {
      // Ignore precache failures so a single bad fetch never blocks install.
      return Promise.all(PRECACHE.map(function (url) {
        return cache.add(new Request(url, { cache: 'reload' })).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        // Drop any cache that is not part of the current version.
        if (key.indexOf(VERSION) !== 0) return caches.delete(key);
        return null;
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* Allow the page to trigger an immediate activation of a waiting SW. */
self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function networkFirst(request, cacheName, fallbackToShell) {
  return fetch(request).then(function (response) {
    // Cache a fresh copy of good, same-origin, basic responses only.
    if (response && response.status === 200 && response.type === 'basic') {
      var copy = response.clone();
      caches.open(cacheName).then(function (cache) { cache.put(request, copy); });
    }
    return response;
  }).catch(function () {
    return caches.match(request).then(function (cached) {
      if (cached) return cached;
      if (fallbackToShell) return caches.match(APP_SHELL);
      return Response.error();
    });
  });
}

function cacheFirst(request, cacheName) {
  return caches.match(request).then(function (cached) {
    if (cached) {
      // Background refresh so a redeploy with new hashed assets self-heals.
      fetch(request).then(function (response) {
        if (response && response.status === 200 && response.type === 'basic') {
          caches.open(cacheName).then(function (cache) { cache.put(request, response.clone()); });
        }
      }).catch(function () {});
      return cached;
    }
    return fetch(request).then(function (response) {
      if (response && response.status === 200 && response.type === 'basic') {
        var copy = response.clone();
        caches.open(cacheName).then(function (cache) { cache.put(request, copy); });
      }
      return response;
    });
  });
}

self.addEventListener('fetch', function (event) {
  var request = event.request;

  // Only handle GET. Everything else (POST/PUT/etc.) goes straight to network.
  if (request.method !== 'GET') return;

  var url;
  try { url = new URL(request.url); } catch (e) { return; }

  // Ignore non-http(s) schemes (chrome-extension, data, etc.).
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Never touch the API. Let it hit the network untouched.
  if (isSameOrigin(url) && url.pathname.indexOf('/api/') === 0) return;

  // Cross-origin (Google Fonts, CDNs, etc.): pass through, no caching.
  if (!isSameOrigin(url)) return;

  // Navigations: network-first, offline-fallback to the app shell.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, SHELL_CACHE, true));
    return;
  }

  // Prerendered SEO pages: keep them FRESH (network-first).
  if (url.pathname.indexOf('/pages') === 0) {
    event.respondWith(networkFirst(request, SHELL_CACHE, false));
    return;
  }

  // SEO/meta text files: always fresh when online.
  if (url.pathname === '/sitemap.xml' || url.pathname === '/robots.txt' || url.pathname === '/llms.txt') {
    event.respondWith(networkFirst(request, SHELL_CACHE, false));
    return;
  }

  // Everything else same-origin (hashed assets, icons, manifest): cache-first.
  event.respondWith(cacheFirst(request, ASSET_CACHE));
});
