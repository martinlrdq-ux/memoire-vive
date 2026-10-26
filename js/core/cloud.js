// Comptes en ligne : identifiant + mot de passe, et copie des données de chaque personne sur Supabase.
// Le téléphone reste la référence pendant l'usage ; le serveur sert à retrouver ses données ailleurs.
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';
import { S, onSaved, importJSON, resetAll } from './store.js';

const SESSION = 'kikory.session'; // { token, pseudo }
const PUSH_DELAY = 3000;

export const cloudEnabled = () => Boolean(SUPABASE_URL && SUPABASE_KEY);

export function session() {
  try { return JSON.parse(localStorage.getItem(SESSION)); } catch (e) { return null; }
}
const setSession = (s) => localStorage.setItem(SESSION, JSON.stringify(s));
const clearSession = () => localStorage.removeItem(SESSION);

const MESSAGES = {
  pseudo_invalide: 'L’identifiant doit faire 3 à 24 caractères : lettres sans accent, chiffres, point, tiret.',
  mdp_court: 'Le mot de passe doit faire au moins 6 caractères.',
  pseudo_pris: 'Cet identifiant est déjà pris. Essaie une variante.',
  identifiants: 'Identifiant ou mot de passe incorrect.',
  session: 'Ta session a expiré. Reconnecte-toi.',
};

export class CloudError extends Error {
  constructor(code) {
    super(MESSAGES[code] || code);
    this.code = code;
  }
}

export async function rpc(fn, args, { keepalive = false } = {}) {
  let r;
  try {
    r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
      keepalive,
    });
  } catch (e) {
    throw new CloudError('Pas de connexion internet. Réessaie dans un instant.');
  }
  const body = r.status === 204 ? null : await r.json().catch(() => null);
  if (!r.ok) throw new CloudError(body?.message || `Le serveur ne répond pas (${r.status}).`);
  return body;
}

// --- Inscription, connexion, déconnexion -------------------------------------------------

// Nouveau compte : les données déjà présentes sur ce téléphone deviennent celles du compte.
export async function signup(pseudo, password) {
  const res = await rpc('kikory_signup', { p_pseudo: pseudo, p_password: password });
  setSession({ token: res.token, pseudo: res.pseudo });
  await push();
  return res.pseudo;
}

// Renvoie true si les données du compte ont remplacé celles du téléphone (il faut recharger l'app).
export async function login(pseudo, password) {
  const res = await rpc('kikory_login', { p_pseudo: pseudo, p_password: password });
  setSession({ token: res.token, pseudo: res.pseudo });
  if (res.data) { importJSON(JSON.stringify(res.data)); return true; }
  await push();
  return false;
}

// Envoie une dernière fois les données, ferme la session et vide ce téléphone pour la personne suivante.
export async function logout() {
  const s = session();
  if (s) {
    await push().catch(() => {});
    await rpc('kikory_logout', { p_token: s.token }).catch(() => {});
  }
  clearSession();
  resetAll();
}

// --- Synchronisation ----------------------------------------------------------------------

let timer = null;
let inflight = null;

export async function push({ keepalive = false } = {}) {
  const s = session();
  if (!s) return;
  clearTimeout(timer);
  const body = JSON.stringify(S);
  // Une requête keepalive (fermeture de l'app) est limitée à 64 Ko.
  const run = () => rpc('kikory_save', { p_token: s.token, p_data: S }, { keepalive: keepalive && body.length < 60000 });
  inflight = (inflight || Promise.resolve()).catch(() => {}).then(run);
  try { await inflight; } catch (e) { if (e.code === 'session') clearSession(); throw e; }
}

onSaved((now) => {
  if (!cloudEnabled() || !session()) return;
  clearTimeout(timer);
  if (now) push({ keepalive: true }).catch(() => {});
  else timer = setTimeout(() => push().catch(() => {}), PUSH_DELAY);
});
window.addEventListener('online', () => { if (session()) push().catch(() => {}); });

// À l'ouverture : si le compte a été utilisé plus récemment ailleurs, on reprend ses données.
// Renvoie true quand l'app doit être rechargée.
export async function pullIfNewer() {
  const s = session();
  if (!s) return false;
  let res;
  try {
    res = await rpc('kikory_load', { p_token: s.token });
  } catch (e) {
    if (e.code === 'session') clearSession();
    throw e;
  }
  const remote = res?.data;
  if (remote && (remote.savedAt || 0) > (S.savedAt || 0)) { importJSON(JSON.stringify(remote)); return true; }
  if (!remote || (S.savedAt || 0) > (remote.savedAt || 0)) await push();
  return false;
}
