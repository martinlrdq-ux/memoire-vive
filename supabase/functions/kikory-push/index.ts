// Notifications de Kikory (Web Push), sans dépendance : tout passe par WebCrypto.
// GET : renvoie la clé publique VAPID (créée et rangée en base au premier appel).
// POST : envoie les notifications arrivées à échéance. pg_cron l'appelle chaque minute (tools/supabase-push.sql).
// À déployer avec « Verify JWT » désactivé : l'app et pg_cron l'appellent sans jeton.

const CONTACT = 'https://martinlrdq-ux.github.io/memoire-vive/';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type, apikey, authorization' };
const enc = new TextEncoder();

export const b64u = {
  encode: (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  decode: (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)),
};

const concat = (...parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) { out.set(p, i); i += p.length; }
  return out;
};

async function hmac(key, data) {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data));
}

// Chiffrement du message pour un abonné (RFC 8291, aes128gcm). `salt` et `local` ne servent qu'aux tests.
export async function encrypt(text, p256dh, auth, { salt = crypto.getRandomValues(new Uint8Array(16)), local } = {}) {
  const uaPublic = b64u.decode(p256dh);
  local ||= await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey));
  const peer = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: peer }, local.privateKey, 256));
  const ikm = await hmac(await hmac(b64u.decode(auth), shared), concat(enc.encode('WebPush: info\0'), uaPublic, asPublic, [1]));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, concat(enc.encode('Content-Encoding: aes128gcm\0'), [1]))).slice(0, 16);
  const nonce = (await hmac(prk, concat(enc.encode('Content-Encoding: nonce\0'), [1]))).slice(0, 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, concat(enc.encode(text), [2])));
  const head = new Uint8Array(21);
  head.set(salt);
  new DataView(head.buffer).setUint32(16, 4096);
  head[20] = asPublic.length;
  return concat(head, asPublic, cipher);
}

// Jeton VAPID : prouve au service de push (Apple, Google, Mozilla) que l'envoi vient bien de nous.
export async function vapid(endpoint, keys) {
  const part = (o) => b64u.encode(enc.encode(JSON.stringify(o)));
  const unsigned = `${part({ typ: 'JWT', alg: 'ES256' })}.${part({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: CONTACT })}`;
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, keys.privateKey, enc.encode(unsigned)));
  return `vapid t=${unsigned}.${b64u.encode(sig)}, k=${keys.publicKey}`;
}

export async function send(sub, message, keys) {
  const r = await fetch(sub.endpoint, {
    method: 'POST',
    headers: { Authorization: await vapid(sub.endpoint, keys), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '3600', Urgency: 'high' },
    body: await encrypt(JSON.stringify(message), sub.p256dh, sub.auth),
  });
  if (r.status >= 400 && r.status !== 404 && r.status !== 410) console.error(`Push refusé (${r.status}) : ${await r.text()}`);
  return r.status;
}

// --- Base de données (rôle service) ------------------------------------------------------

function serviceKey() {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) return legacy;
  const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
  return keys.default || Object.values(keys)[0];
}

async function rpc(fn, args = {}) {
  const key = serviceKey();
  const r = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: key, ...(key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}), 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`${fn} : ${r.status} ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}

// La paire de clés VAPID est créée une fois pour toutes : la changer couperait tous les abonnements.
async function loadKeys() {
  let row = await rpc('kikory_push_keys');
  if (!row) {
    const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    row = await rpc('kikory_push_keys_init', {
      p_public: b64u.encode(new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey))),
      p_private: await crypto.subtle.exportKey('jwk', pair.privateKey),
    });
  }
  return { publicKey: row.public, privateKey: await crypto.subtle.importKey('jwk', row.private, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']) };
}

let keysP = null;

async function handle(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  keysP ||= loadKeys().catch((e) => { keysP = null; throw e; });
  const keys = await keysP;
  if (req.method === 'GET') return Response.json({ publicKey: keys.publicKey }, { headers: CORS });
  const due = await rpc('kikory_push_claim');
  const status = await Promise.all(due.map((n) => send(n, { title: n.title, body: n.body, tag: n.tag, url: n.url }, keys).catch((e) => { console.error(e); return 0; })));
  const gone = [...new Set(due.filter((n, i) => status[i] === 404 || status[i] === 410).map((n) => n.endpoint))];
  if (gone.length) await rpc('kikory_push_gone', { p_endpoints: gone });
  return Response.json({ due: due.length, sent: status.filter((s) => s >= 200 && s < 300).length, gone: gone.length });
}

if (globalThis.Deno?.serve) {
  Deno.serve((req) => handle(req).catch((e) => {
    console.error(e);
    return Response.json({ error: String(e.message || e) }, { status: 500, headers: CORS });
  }));
}
