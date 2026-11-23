const CACHE = 'materia-1';
const FILES = [
  'index.html',
  'favicon.svg',
  'css/style.css',
  'js/app.js',
  'js/vendor/xlsx.full.min.js',
  'fonts/geist-latin.woff2',
  'fonts/geist-latin-ext.woff2',
  'fonts/fraunces-latin.woff2',
  'fonts/fraunces-latin-ext.woff2',
  'fonts/fraunces-latin-italic.woff2',
  'fonts/fraunces-latin-ext-italic.woff2'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())))
  );
});
