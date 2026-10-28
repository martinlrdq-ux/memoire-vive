// Persistance locale (localStorage) et utilitaires de dates.
// La journée commence à 4 h du matin : une révision à 1 h compte pour la veille.

const KEY = 'memoire.v1';
export const DAY_MS = 86400000;
const DAY_START_HOUR = 4;

const pad = (n) => String(n).padStart(2, '0');

export function dayKey(ts = Date.now()) {
  const d = new Date(ts - DAY_START_HOUR * 3600000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Timestamp du début (4 h) d'une journée donnée par sa clé.
export function dayStart(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, DAY_START_HOUR).getTime();
}

export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n, 12);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

export function dayDiff(a, b) {
  return Math.round((dayStart(b) - dayStart(a)) / DAY_MS);
}

export function weekday(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12).getDay(); // 0 = dimanche
}

// Semaine ISO, pour les jokers de série.
export function weekKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((dt - yearStart) / DAY_MS + 1) / 7);
  return `${dt.getUTCFullYear()}-W${pad(week)}`;
}

export function fmtDay(key, opts = { weekday: 'long', day: 'numeric', month: 'long' }) {
  return new Date(dayStart(key)).toLocaleDateString('fr-FR', opts);
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function defaultState() {
  return {
    version: 1,
    seed: Math.floor(Math.random() * 1e9),
    profile: {
      name: '',
      onboarded: false,
      createdAt: Date.now(),
      anchor: 'Après mon café',
      reminderTime: '08:30',
      fullDays: [1, 3, 5, 6], // lundi, mercredi, vendredi, samedi
      retention: 0.9,
      reviewCap: 30,
      language: 'en',
      theme: 'auto', // auto (réglage de l'iPhone), light ou dark
    },
    items: {},
    batches: {},
    log: [], // { t, id, g, gap, age, ok, src }
    points: { total: 0, byDay: {}, annexByDay: {} },
    streak: { done: {}, jokers: {}, checkedUntil: null, best: 0 },
    sessions: {},
    levels: {},
    echo: { n: 1, span: 4 },
    ouestil: { objects: 4 },
    campaign: { chapter: 0, chapterStartedAt: Date.now(), completed: {}, sessionsInChapter: 0 },
    city: { stones: [] },
    badges: {},
    bilans: [],
    bilanPending: null,
    usedPools: { bilanSeries: 0, texts: [], vocab: {}, names: [] },
    prospective: {},
    checkins: [],
    seenIntro: {},
    palaces: [],
    palaceStats: {}, // palais → « pièce|lieu » → { ok, ko } aux rappels
    records: {},
    lastBackup: null,
    lastPlayed: {},
  };
}

function merge(base, saved) {
  for (const k of Object.keys(base)) {
    if (!(k in saved)) saved[k] = base[k];
    else if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]) && saved[k] && typeof saved[k] === 'object') {
      merge(base[k], saved[k]);
    }
  }
  return saved;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return merge(defaultState(), JSON.parse(raw));
  } catch (e) {
    console.warn('Lecture impossible, état neuf', e);
  }
  return defaultState();
}

export const S = load();

let saveTimer = null;
let frozen = false; // après un import ou une réinitialisation, plus rien n'écrase le stockage
const savedHooks = new Set();
// Appelé après chaque écriture locale (synchronisation du compte en ligne).
export function onSaved(fn) { savedHooks.add(fn); }
export function save(now = false) {
  if (frozen) return;
  clearTimeout(saveTimer);
  const write = () => {
    try {
      S.savedAt = Date.now();
      localStorage.setItem(KEY, JSON.stringify(S));
    } catch (e) {
      console.error('Sauvegarde impossible', e);
      alert("Impossible d'enregistrer : l'espace de stockage est plein. Exporte une sauvegarde depuis les Réglages.");
    }
    savedHooks.forEach((fn) => fn(now));
  };
  if (now) write();
  else saveTimer = setTimeout(write, 150);
}

window.addEventListener('pagehide', () => save(true));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') save(true);
});

export function exportJSON() {
  return JSON.stringify(S);
}

export function importJSON(text) {
  const data = JSON.parse(text);
  if (!data || data.version !== 1 || !data.items) throw new Error('Fichier non reconnu');
  frozen = true;
  clearTimeout(saveTimer);
  localStorage.setItem(KEY, JSON.stringify(merge(defaultState(), data)));
}

export function resetAll() {
  frozen = true;
  clearTimeout(saveTimer);
  localStorage.removeItem(KEY);
}

// Générateur pseudo-aléatoire reproductible (visages, séries de bilan).
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(arr, rand = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pick(arr, rand = Math.random) {
  return arr[Math.floor(rand() * arr.length)];
}

export function sample(arr, n, rand = Math.random) {
  return shuffle(arr, rand).slice(0, n);
}
