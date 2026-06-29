// Service Worker — cache-first for all static assets so the app works fully offline.
// Bump CACHE_NAME when assets change.
const CACHE_NAME = 'gabbai-v1-12';
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/config.js',
  './js/util.js',
  './js/calendar.js',
  './js/kavodot.js',
  './js/minhagim.js',
  './js/reminders.js',
  './js/db.js',
  './js/auth.js',
  './js/permissions.js',
  './js/sync.js',
  './js/api.js',
  './js/state.js',
  './js/ui.js',
  './js/router.js',
  './js/app.js',
  './js/pages/login.js',
  './js/pages/dashboard.js',
  './js/pages/live.js',
  './js/pages/members.js',
  './js/pages/member_card.js',
  './js/pages/tribes.js',
  './js/pages/events.js',
  './js/pages/reports.js',
  './js/pages/settings.js',
  './js/pages/print.js',
  './js/pages/audit.js',
  './js/pages/users.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(c) {
      return c.addAll(STATIC_ASSETS).catch(function() {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE_NAME; })
        .map(function(k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Never cache GitHub API or raw data — these are live
  if (url.hostname === 'api.github.com' || url.hostname === 'raw.githubusercontent.com') return;
  // Don't cache the data file itself
  if (url.pathname.indexOf('/data/db.json') >= 0) return;
  // For our own origin: cache-first
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        if (cached) return cached;
        return fetch(e.request).then(function(resp) {
          if (resp.ok && resp.type === 'basic') {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then(function(c) { c.put(e.request, clone); });
          }
          return resp;
        }).catch(function() { return cached; });
      })
    );
    return;
  }
  // For CDN assets (Bootstrap, Heebo, etc.): network-first, fall back to cache
  e.respondWith(
    fetch(e.request).then(function(resp) {
      if (resp.ok) {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(function(c) { c.put(e.request, clone); });
      }
      return resp;
    }).catch(function() {
      return caches.match(e.request);
    })
  );
});
