/* オフラインでも動くようにするための簡単なキャッシュ。
   ファイルを更新したら、下の VERSION の数字を上げてください。 */
const VERSION = 'v3';
const CORE = 'dodge-core-' + VERSION;
const FONTS = 'dodge-fonts';
const CORE_FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CORE).then(function (c) { return c.addAll(CORE_FILES); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) {
        return k.indexOf('dodge-core-') === 0 && k !== CORE;
      }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* キャッシュを先に返し、裏で最新版を取り直す */
function staleWhileRevalidate(cacheName, request) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(request).then(function (hit) {
      const fresh = fetch(request).then(function (res) {
        if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone());
        return res;
      }).catch(function () { return hit; });
      return hit || fresh;
    });
  });
}

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    e.respondWith(
      staleWhileRevalidate(CORE, req).then(function (res) {
        return res || caches.match('index.html');
      })
    );
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(staleWhileRevalidate(FONTS, req));
  }
});
