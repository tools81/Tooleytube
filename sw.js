// Tooleytube — minimal service worker
// Caches the app shell so it opens instantly even with no network.
// The YouTube API and video thumbnails are still fetched live.

const CACHE = 'tooleytube-shell-v1';
const SHELL = ['./', './index.html', './manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Never cache API calls or YouTube — always go to network
  if (url.hostname.includes('googleapis.com') ||
      url.hostname.includes('youtube.com') ||
      url.hostname.includes('ytimg.com') ||
      url.hostname.includes('youtube-nocookie.com') ||
      url.hostname.includes('ggpht.com')) {
    return;
  }

  // App shell: cache-first
  event.respondWith(
    caches.match(req).then(cached =>
      cached || fetch(req).then(res => {
        // Cache successful same-origin GETs
        if (req.method === 'GET' && res.ok && url.origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached)
    )
  );
});
