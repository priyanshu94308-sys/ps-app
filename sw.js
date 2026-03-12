// PS Study App — Service Worker v1.0
var CACHE_NAME = 'ps-study-v1';
var STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install — cache static files
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_FILES);
    })
  );
  self.skipWaiting();
});

// Activate — delete old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch — network first, cache fallback
self.addEventListener('fetch', function(e) {
  // Skip non-GET and external requests (Firebase, Groq, Tavily)
  if (e.request.method !== 'GET') return;
  var url = e.request.url;
  if (url.includes('firestore.googleapis.com') ||
      url.includes('firebase') ||
      url.includes('groq.com') ||
      url.includes('tavily.com')) return;

  e.respondWith(
    fetch(e.request)
      .then(function(response) {
        // Cache fresh copy
        if (response && response.status === 200) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, copy);
          });
        }
        return response;
      })
      .catch(function() {
        // Offline — serve from cache
        return caches.match(e.request).then(function(cached) {
          return cached || caches.match('/index.html');
        });
      })
  );
});
