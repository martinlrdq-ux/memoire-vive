"""Régénère sw.js avec la liste des fichiers à mettre en cache et une version
calculée sur leur contenu. À relancer après chaque modification :
    python3 tools/build_sw.py
"""
import hashlib
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
FILES = ["./", "index.html", "manifest.webmanifest", "css/app.css", "fonts/outfit-latin.woff2",
         "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png"]
FILES += sorted(str(p.relative_to(ROOT)) for p in (ROOT / "js").rglob("*.js"))

digest = hashlib.sha1()
for f in FILES[1:]:
    digest.update((ROOT / f).read_bytes())
version = digest.hexdigest()[:10]

assets = ",\n  ".join(f"'{f}'" for f in FILES)
(ROOT / "sw.js").write_text(f"""// Généré par tools/build_sw.py : ne pas modifier à la main.
const VERSION = '{version}';
const CACHE = `memoire-${{VERSION}}`;
const ASSETS = [
  {assets},
];

self.addEventListener('install', (e) => {{
  // cache: 'reload' : jamais de fichier périmé tiré du cache HTTP (GitHub Pages le garde 10 minutes).
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS.map((a) => new Request(a, {{ cache: 'reload' }})))).then(() => self.skipWaiting()));
}});

self.addEventListener('activate', (e) => {{
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
}});

self.addEventListener('fetch', (e) => {{
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, {{ ignoreSearch: true }}).then((hit) => hit || fetch(e.request)));
}});

// Rappels envoyés par la fonction kikory-push (Supabase).
self.addEventListener('push', (e) => {{
  let n = {{}};
  try {{ n = e.data ? e.data.json() : {{}}; }} catch (err) {{ n = {{ body: e.data.text() }}; }}
  e.waitUntil(self.registration.showNotification(n.title || 'Kikory', {{ body: n.body || '', tag: n.tag, icon: 'icons/icon-192.png', data: {{ url: n.url || './' }} }}));
}});

self.addEventListener('notificationclick', (e) => {{
  e.notification.close();
  const url = new URL(e.notification.data?.url || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({{ type: 'window', includeUncontrolled: true }}).then((list) => {{
    const open = list.find((c) => c.url.startsWith(self.registration.scope));
    return open ? open.focus() : self.clients.openWindow(url);
  }}));
}});
""", encoding="utf-8")
print(f"sw.js : {len(FILES)} fichiers, version {version}")
