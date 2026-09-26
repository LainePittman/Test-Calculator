// Offline support: cache the app's files on install and serve them cache-first.
// Bump CACHE whenever the file list or file contents change.
const CACHE = 'pocket-tools-v6';
const ASSETS = [
  './', 'index.html', 'style.css', 'themes.js', 'app.js',
  'lib/store.js', 'lib/format.js', 'lib/fit.js', 'lib/calculator.js', 'lib/stopwatch.js', 'lib/timer.js', 'lib/units.js',
  'tools/calculator.js', 'tools/stopwatch.js', 'tools/timer.js', 'tools/convert.js',
  'manifest.webmanifest', 'icons/icon.svg', 'fonts/PressStart2P-latin.woff2',
];

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
