"""Régénère sw.js avec la liste des fichiers à mettre en cache et une version
calculée sur leur contenu. À relancer après chaque modification :
    python3 tools/build_sw.py
"""
import hashlib
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
FILES = ["./", "index.html", "manifest.webmanifest", "css/app.css",
         "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png"]
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
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
}});

self.addEventListener('activate', (e) => {{
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
}});

self.addEventListener('fetch', (e) => {{
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, {{ ignoreSearch: true }}).then((hit) => hit || fetch(e.request)));
}});
""", encoding="utf-8")
print(f"sw.js : {len(FILES)} fichiers, version {version}")
