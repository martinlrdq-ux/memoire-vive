// Généré par tools/build_sw.py : ne pas modifier à la main.
const VERSION = '6b4d3980ba';
const CACHE = `memoire-${VERSION}`;
const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'fonts/outfit-latin.woff2',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'js/app.js',
  'js/core/cloud.js',
  'js/core/config.js',
  'js/core/engine.js',
  'js/core/faces-v1.js',
  'js/core/faces.js',
  'js/core/fsrs.js',
  'js/core/logo.js',
  'js/core/notify.js',
  'js/core/speech.js',
  'js/core/store.js',
  'js/core/ui.js',
  'js/data/major.js',
  'js/data/messages.js',
  'js/data/palaces.js',
  'js/data/people.js',
  'js/data/scenes.js',
  'js/data/texts.js',
  'js/data/vocab.js',
  'js/data/words.js',
  'js/games/bilan.js',
  'js/games/catalog.js',
  'js/games/code.js',
  'js/games/coffre.js',
  'js/games/common.js',
  'js/games/croquis.js',
  'js/games/echo.js',
  'js/games/filrouge.js',
  'js/games/lecture.js',
  'js/games/message.js',
  'js/games/mots.js',
  'js/games/ouestil.js',
  'js/games/palais.js',
  'js/games/quiestce.js',
  'js/reminders.js',
  'js/session.js',
  'js/widget.js',
];

self.addEventListener('install', (e) => {
  // cache: 'reload' : jamais de fichier périmé tiré du cache HTTP (GitHub Pages le garde 10 minutes).
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS.map((a) => new Request(a, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request)));
});

// Rappels envoyés par la fonction kikory-push (Supabase).
self.addEventListener('push', (e) => {
  let n = {};
  try { n = e.data ? e.data.json() : {}; } catch (err) { n = { body: e.data.text() }; }
  e.waitUntil(self.registration.showNotification(n.title || 'Kikory', { body: n.body || '', tag: n.tag, icon: 'icons/icon-192.png', data: { url: n.url || './' } }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const open = list.find((c) => c.url.startsWith(self.registration.scope));
    return open ? open.focus() : self.clients.openWindow(url);
  }));
});
