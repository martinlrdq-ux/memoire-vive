// Petit serveur statique pour tester l'app en local : node tools/serve.mjs [dossier] [port]
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.argv[2] || path.join(import.meta.dirname, '..'));
const port = Number(process.argv[3] || 8642);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

http.createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(root, p);
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': (TYPES[path.extname(file)] || 'application/octet-stream') + '; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(data);
  } catch {
    res.writeHead(404).end('Introuvable');
  }
}).listen(port, '127.0.0.1', () => console.log(`http://127.0.0.1:${port} → ${root}`));
