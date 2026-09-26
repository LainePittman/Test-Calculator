const CACHE = 'calculator-v2';
const ASSETS = ['./', 'index.html', 'style.css', 'themes.js', 'calculator.js', 'app.js',
  'manifest.webmanifest', 'icons/icon.svg', 'fonts/PressStart2P-latin.woff2'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
