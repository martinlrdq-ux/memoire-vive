// Notifications : cet appareil s'abonne au push (Web Push), puis l'app envoie à Supabase son programme
// de rappels à venir. La fonction kikory-push les envoie à l'heure dite, même app fermée.
// Sur iPhone, il faut iOS 16.4 ou plus et l'app installée sur l'écran d'accueil.
import { SUPABASE_URL } from './config.js';
import { onSaved } from './store.js';
import { rpc, cloudEnabled } from './cloud.js';

const STATE = 'kikory.push'; // { endpoint, sub, sent, testAt } : abonnement de cet appareil et dernier programme envoyé
const KEY_CACHE = 'kikory.pushKey';
const FN_URL = `${SUPABASE_URL}/functions/v1/kikory-push`;
const SYNC_DELAY = 2000;

let planner = () => [];
// L'app fournit la liste des rappels à venir : [{ at, tag, title, body }].
export function setPlanner(fn) { planner = fn; }

const read = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } };

const standalone = () => window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// 'on', 'off', 'denied', 'install' (à installer sur l'écran d'accueil d'abord) ou 'unsupported'.
export function notifStatus() {
  if (!cloudEnabled() || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return isIOS() && !standalone() ? 'install' : 'unsupported';
  }
  if (Notification.permission === 'denied') return 'denied';
  return Notification.permission === 'granted' && read(STATE)?.endpoint ? 'on' : 'off';
}

async function publicKey() {
  const cached = localStorage.getItem(KEY_CACHE);
  if (cached) return cached;
  let r;
  try { r = await fetch(FN_URL); } catch (e) { throw new Error('Pas de connexion internet. Réessaie dans un instant.'); }
  if (!r.ok) throw new Error(`Le serveur de notifications ne répond pas (${r.status}).`);
  const { publicKey: k } = await r.json();
  localStorage.setItem(KEY_CACHE, k);
  return k;
}

const keyBytes = (b64) => Uint8Array.from(atob(b64.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const sameKey = (sub, k) => {
  const a = sub.options?.applicationServerKey;
  return !a || new Uint8Array(a).join() === keyBytes(k).join();
};

// À appeler directement depuis un toucher : iOS n'affiche la demande d'autorisation qu'à ce moment-là.
export async function enableNotifs() {
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error(perm === 'denied' ? 'Notifications refusées. Tu peux les réautoriser dans les Réglages de l’iPhone → Notifications → Kikory.' : 'Notifications non autorisées.');
  const [reg, key] = await Promise.all([navigator.serviceWorker.ready, publicKey()]);
  let sub = await reg.pushManager.getSubscription();
  if (sub && !sameKey(sub, key)) { await sub.unsubscribe(); sub = null; }
  sub ||= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) });
  write(STATE, { endpoint: sub.endpoint, sub: sub.toJSON(), sent: null });
  await syncNotifs({ force: true });
}

export async function disableNotifs() {
  const st = read(STATE);
  localStorage.removeItem(STATE);
  const reg = await navigator.serviceWorker.ready;
  await (await reg.pushManager.getSubscription())?.unsubscribe().catch(() => {});
  if (st?.endpoint) await rpc('kikory_push_off', { p_endpoint: st.endpoint }).catch(() => {});
}

// Une notification d'essai, une minute plus tard au plus (pg_cron passe chaque minute).
export async function testNotif() {
  const st = read(STATE);
  if (!st) return;
  st.testAt = Date.now() + 3000;
  write(STATE, st);
  await syncNotifs({ force: true });
}

function plan() {
  const now = Date.now();
  const st = read(STATE);
  const list = planner().filter((n) => n.at > now);
  if (st?.testAt > now) list.push({ at: st.testAt, tag: 'test', title: 'Kikory 🦉', body: 'Les notifications marchent. À demain pour ta mission !' });
  return list.sort((a, b) => a.at - b.at).slice(0, 60);
}

// Envoie le programme s'il a changé depuis le dernier envoi.
export async function syncNotifs({ force = false, keepalive = false } = {}) {
  const st = read(STATE);
  if (!st || notifStatus() !== 'on') return;
  const schedule = plan();
  const sig = JSON.stringify(schedule);
  if (!force && sig === st.sent) return;
  await rpc('kikory_push_sync', { p_sub: st.sub, p_schedule: schedule }, { keepalive });
  write(STATE, { ...read(STATE), sent: sig });
}

// À l'ouverture : l'iPhone peut avoir renouvelé ou perdu l'abonnement. On efface aussi les notifications
// déjà affichées, qui n'ont plus de raison d'être une fois l'app ouverte.
export async function checkNotifs() {
  if (notifStatus() !== 'on') return;
  const reg = await navigator.serviceWorker.ready;
  for (const n of (await reg.getNotifications?.()) || []) n.close();
  const sub = await reg.pushManager.getSubscription();
  if (!sub) { localStorage.removeItem(STATE); return; }
  const st = read(STATE);
  if (sub.endpoint !== st.endpoint) {
    write(STATE, { ...st, endpoint: sub.endpoint, sub: sub.toJSON(), sent: null });
    rpc('kikory_push_off', { p_endpoint: st.endpoint }).catch(() => {});
  }
  await syncNotifs();
}

let timer = null;
onSaved((now) => {
  clearTimeout(timer);
  if (now) syncNotifs({ keepalive: true }).catch(() => {});
  else timer = setTimeout(() => syncNotifs().catch(() => {}), SYNC_DELAY);
});
