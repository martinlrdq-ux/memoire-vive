// Moteur : éléments du Coffre, révisions FSRS, points, niveaux, série, parcours, ville, badges.
import { S, save, uid, dayKey, dayStart, addDays, dayDiff, weekKey, weekday, DAY_MS } from './store.js';
import { review, scheduleDays, retrievability } from './fsrs.js';
import { toast } from './ui.js';
import { GRADES, gradeOf } from './grades.js';

// --- Techniques, niveaux, chapitres ----------------------------------------

export const TECHS = {
  story: { name: 'Fil rouge', game: 'filrouge', icon: '🧵', unit: 'objets', levels: [5, 8, 12, 20] },
  sketch: { name: 'Croquis', game: 'croquis', icon: '✏️', unit: 'mots', levels: [5, 8, 12] },
  names: { name: 'Prénoms', game: 'quiestce', icon: '🧑', unit: 'visages', levels: [3, 5, 10, 20] },
  digits: { name: 'Chiffres', game: 'code', icon: '🔢', unit: 'chiffres', levels: [6, 10, 20, 40] },
  palace: { name: 'Palais', game: 'palais', icon: '🏛️', unit: 'éléments', levels: [5, 10, 20, 50] },
  oral: { name: 'Oral', game: 'message', icon: '📞', unit: 'informations par message', levels: [1, 3, 5] },
  reading: { name: 'Lecture active', game: 'lecture', icon: '📖', unit: 'idées clés', levels: [3, 5, 8] },
  vocab: { name: "Mots d'ailleurs", game: 'mots', icon: '🌍', unit: 'mots', levels: [5, 8, 12, 20] },
};

export const CHAPTERS = [
  { title: 'Les fondations', techs: [], district: 'place',
    goal: 'Passer le bilan initial deux fois et faire le Coffre deux jours différents.',
    life: 'Saisis dans « Ma vie » trois informations qu’on t’a données cette semaine.' },
  { title: 'Donner du sens', techs: ['story', 'sketch'], test: ['story'], district: 'ateliers',
    goal: 'Fil rouge : deux rappels du lendemain à 80 % ou plus avec 5 objets.',
    life: 'Retiens ta prochaine liste de courses avec une histoire, sans la noter.' },
  { title: 'Les visages', techs: ['names'], test: ['names'], district: 'visages',
    goal: 'Qui est-ce ? : deux rappels du lendemain à 80 % ou plus avec 3 visages.',
    life: 'Retiens trois prénoms de personnes rencontrées cette semaine : redis chaque prénom tout de suite (« Enchanté, Margaux »), relie-le à une image, puis saisis-le dans « Ma vie ».' },
  { title: 'Les chiffres', techs: ['digits'], test: ['digits'], district: 'chiffres',
    goal: 'Code secret : deux rappels du lendemain à 80 % ou plus avec 6 chiffres.',
    life: 'Retiens un vrai numéro (code, téléphone, plaque) et ajoute-le à « Ma vie ».' },
  { title: 'Le palais', techs: ['palace'], test: ['palace'], district: 'palais',
    goal: 'Le Palais : deux rappels du lendemain à 80 % ou plus avec 5 éléments.',
    life: 'Range dans ton palais une liste réelle : tâches de la semaine, courses, points d’une réunion.' },
  { title: 'Message reçu', techs: ['oral'], test: ['oral'], district: 'port',
    goal: 'Message reçu : deux rappels du lendemain à 80 % ou plus.',
    life: 'Reformule à voix haute une consigne reçue à l’oral (« donc jeudi 15 h, c’est ça ? »), puis saisis-la dans « Ma vie ».' },
  { title: 'Lire et apprendre', techs: ['reading', 'vocab'], test: ['reading'], district: 'bibliotheque',
    goal: 'Lecture active : deux rappels à 80 % ou plus avec 3 idées clés.',
    life: 'Après une lecture (article, livre), restitue de tête trois idées clés le soir même.' },
];
export const MAINTENANCE = CHAPTERS.length; // chapitre « Entretien »

export const DISTRICTS = {
  place: { name: 'La Grand-Place', color: '#e9b44c', chapter: 0 },
  ateliers: { name: 'Les Ateliers', color: '#e07a5f', chapter: 1 },
  visages: { name: 'La Place des Visages', color: '#81b29a', chapter: 2 },
  chiffres: { name: 'Le Quartier des Chiffres', color: '#5b8bd9', chapter: 3 },
  palais: { name: 'Le Palais', color: '#9c6ade', chapter: 4 },
  port: { name: 'Le Port des Messages', color: '#3fa7b5', chapter: 5 },
  bibliotheque: { name: 'La Bibliothèque', color: '#c9733a', chapter: 6 },
};
const SRC_DISTRICT = { mavie: 'place', weekend: 'place', story: 'ateliers', sketch: 'ateliers', names: 'visages', digits: 'chiffres', palace: 'palais', oral: 'port', reading: 'bibliotheque', vocab: 'bibliotheque', major: 'chiffres' };
export const districtOf = (src) => SRC_DISTRICT[src] || 'place';

// Grade atteint avec les points (les 12 grades et leurs hiboux : grades.js).
export function rank(total = S.points.total) {
  const i = gradeOf(total);
  const next = GRADES[i + 1];
  return { ...GRADES[i], index: i, next, progress: next ? (total - GRADES[i].min) / (next.min - GRADES[i].min) : 1 };
}

// --- Points -----------------------------------------------------------------

export function award(pts, { annex = false } = {}) {
  if (!pts) return 0;
  const today = dayKey();
  if (annex) {
    const used = S.points.annexByDay[today] || 0;
    pts = Math.max(0, Math.min(pts, 10 - used));
    if (!pts) return 0;
    S.points.annexByDay[today] = used + pts;
  }
  S.points.total += pts;
  S.points.byDay[today] = (S.points.byDay[today] || 0) + pts;
  save(); // un nouveau grade se fête en revenant aux onglets (festivities, app.js)
  return pts;
}

export const pointsToday = () => S.points.byDay[dayKey()] || 0;

// --- Éléments du Coffre ---------------------------------------------------------

// Première révision d'une saisie « Ma vie » : le soir même (ou dans 2 h 30 en fin de journée).
export function eveningDue() {
  const t = new Date();
  const hr = t.getHours();
  if (hr < 4) return new Date(t.getFullYear(), t.getMonth(), t.getDate(), 8).getTime();
  if (hr < 15) return new Date(t.getFullYear(), t.getMonth(), t.getDate(), 18).getTime();
  if (hr < 21) return t.getTime() + 2.5 * 3600000;
  return dayStart(addDays(dayKey(), 1)) + 4 * 3600000;
}

/**
 * Crée un élément à réviser.
 * type : card (question → réponse), face, list, code
 * firstDelay : jours avant la première révision différée (1 par défaut)
 */
export function createItem({ type = 'card', src, prompt, answer, hint = '', extra = {}, batch = null, due = null, firstDelay = 1 }) {
  const id = uid();
  const item = {
    id, type, src, prompt, answer, hint, extra, batch, firstDelay,
    created: Date.now(),
    due: due ?? dayStart(addDays(dayKey(), firstDelay)),
    m: {},
  };
  S.items[id] = item;
  if (batch && S.batches[batch]) S.batches[batch].items.push(id);
  save();
  return item;
}

export function deleteItem(id) {
  delete S.items[id];
  save();
}

// Réussites et oublis lieu par lieu, pour repérer les endroits d'un palais qui flanchent.
export function recordLoci(palaceId, cues, res) {
  if (!palaceId || !cues) return;
  const st = (S.palaceStats[palaceId] = S.palaceStats[palaceId] || {});
  cues.forEach((c, i) => {
    const k = `${c.room}|${c.l}`;
    const x = (st[k] = st[k] || { ok: 0, ko: 0 });
    if (res[i]) x.ok++; else x.ko++;
  });
  save();
}

// Chance de se souvenir d'un élément aujourd'hui (null s'il n'a jamais été révisé).
export function recallChance(item, t = Date.now()) {
  return item.m?.reps ? retrievability((t - item.m.last) / DAY_MS, item.m.s) : null;
}

export function startBatch(tech, size, extra = {}) {
  const id = uid();
  const lv = levelInfo(tech);
  S.batches[id] = { id, tech, size, li: lv.i, day: dayKey(), items: [], res: {}, ...extra };
  S.lastPlayed[tech] = dayKey();
  save();
  return id;
}

/**
 * Enregistre une révision.
 * ctx : 'i' rappel immédiat (fin de jeu), 'c' Coffre, 'f' révision libre
 * score : 0..1 pour les listes et codes
 */
export function recordReview(item, g, { score, typed = true, ctx = 'c', annex = false } = {}) {
  const t = Date.now();
  const today = dayKey(t);
  const prev = item.m || {};
  const sameDay = !!prev.last && dayKey(prev.last) === today;
  const gap = prev.last ? dayDiff(dayKey(prev.last), today) : null;
  const age = dayDiff(dayKey(item.created), today);
  const ok = g >= 2;
  if (score == null) score = ok ? 1 : 0;

  item.m = review(prev, g, t, sameDay);
  if (ctx === 'i') item.due = dayStart(addDays(today, item.firstDelay || 1));
  else item.due = dayStart(addDays(today, scheduleDays(item.m.s, S.profile.retention, g)));

  let pts = 0;
  if (ok && ctx !== 'r') {
    if (ctx === 'f' || annex) pts = award(1, { annex: true });
    else {
      let base = age >= 30 ? 20 : age >= 7 ? 10 : age >= 1 ? 5 : item.src === 'mavie' ? 5 : 2;
      if (typed) base *= 1.5;
      if (item.type === 'list' || item.type === 'code') base *= score;
      pts = award(Math.max(1, Math.round(base)));
    }
  }

  if (item.batch && !item.bDone && age >= 1 && ctx !== 'i') {
    item.bDone = true;
    batchResult(item.batch, item.id, score);
  }

  if (ok && age >= 30 && !item.stone) {
    item.stone = today;
    S.city.stones.push({ id: item.id, d: districtOf(item.src), day: today });
    toast('Une pierre de plus pour ta ville 🧱', 'gold');
  }

  S.log.push({ t, id: item.id, g, gap, age, ok, sc: Math.round(score * 100) / 100, src: item.src, c: ctx });
  save();
  checkBadges();
  return { pts, ok };
}

// Révisions « Savoir du jour » permises par jour : de quoi suivre le rythme choisi, sans envahir le Coffre.
export const cultureCap = () => (S.culture.perDay || 3) * 6;

// File de révision du jour, plafonnée.
// Les fiches du Savoir du jour passent après tout le reste et ont leur propre plafond :
// elles ne prennent jamais la place de « Ma vie » ni des techniques.
export function queue() {
  const t = Date.now();
  const today = dayKey(t);
  const end = dayStart(addDays(today, 1));
  const doneLog = S.log.filter((l) => l.c === 'c' && dayKey(l.t) === today);
  const doneToday = doneLog.length;
  const cap = Math.max(0, S.profile.reviewCap - doneToday);
  const due = Object.values(S.items).filter((i) => i.due <= end);
  const now = due.filter((i) => i.due <= t);
  const risk = (i) => (i.m.reps ? retrievability((t - i.m.last) / DAY_MS, i.m.s) : 0);
  now.sort((a, b) => (b.src === 'mavie') - (a.src === 'mavie') || risk(a) - risk(b));
  const main = now.filter((i) => i.src !== 'culture').slice(0, cap);
  const cultureRoom = Math.min(cap - main.length, cultureCap() - doneLog.filter((l) => l.src === 'culture').length);
  const culture = now.filter((i) => i.src === 'culture').slice(0, Math.max(0, cultureRoom));
  const items = [...main, ...culture];
  return {
    items, dueTotal: now.length, later: due.length - now.length, cap, doneToday,
    catchup: now.filter((i) => i.src !== 'culture').length > cap,
    backlog: now.length - items.length, // révisions dues qui ne tiennent pas aujourd'hui
  };
}

export function forecast(days = 7) {
  const today = dayKey();
  const out = [];
  for (let k = 1; k <= days; k++) {
    const d = addDays(today, k);
    const s = dayStart(d), e = dayStart(addDays(d, 1));
    out.push({ d, n: Object.values(S.items).filter((i) => i.due >= s && i.due < e).length });
  }
  return out;
}

// --- Niveaux par technique ------------------------------------------------------

export function levelInfo(tech) {
  const L = TECHS[tech].levels;
  const st = S.levels[tech] || { i: 0, wins: 0 };
  return { i: st.i, wins: st.wins, size: L[st.i], max: st.i === L.length - 1, mastered: !!st.mastered, levels: L };
}

function batchResult(bid, itemId, score) {
  const b = S.batches[bid];
  if (!b || b.done) return;
  b.res[itemId] = score;
  if (Object.keys(b.res).length < b.items.length) return;
  b.done = true;
  const vals = Object.values(b.res);
  b.score = vals.reduce((a, x) => a + x, 0) / vals.length;
  const pct = Math.round(b.score * 100);
  const tech = TECHS[b.tech];
  if (!tech) return;

  if (b.tech === 'digits' && b.size >= 20 && b.score >= 0.8) S.records.digits20 = true;
  if (b.tech === 'oral' && b.size >= 5 && b.score >= 0.99) S.records.oral5 = true;
  if (b.tech === 'palace' && b.size >= 20 && b.score >= 0.8) S.records.palace20 = true;
  if (b.tech === 'palace' && b.size >= 50 && b.score >= 0.8) S.records.palace50 = true;

  const lv = levelInfo(b.tech);
  if (b.li !== lv.i || b.size !== lv.size || b.chrono) {
    toast(`${tech.name} : ${pct} % au rappel différé`);
    return;
  }
  const st = (S.levels[b.tech] = S.levels[b.tech] || { i: 0, wins: 0 });
  if (b.score >= 0.8) {
    st.wins++;
    if (st.wins >= 2) {
      if (lv.max) {
        st.mastered = true;
        st.wins = 2;
        toast(`${tech.name} : niveau maximum maîtrisé 🏆`, 'gold');
      } else {
        st.i++;
        st.wins = 0;
        toast(`${tech.name} : niveau ${st.i + 1} débloqué (${tech.levels[st.i]} ${tech.unit}) 🎉`, 'gold');
      }
    } else {
      toast(`${tech.name} : ${pct} % le lendemain ✓ (1/2 vers le niveau suivant)`, 'ok');
    }
  } else {
    toast(`${tech.name} : ${pct} % au rappel du lendemain. Le niveau se valide à 80 %.`);
  }
  save();
  checkChapter();
}

// --- Parcours ------------------------------------------------------------------

export function chapterTestDone(ch) {
  if (ch === 0) {
    const trials = S.bilans.filter((b) => b.trial && b.done).length;
    const coffreDays = new Set(S.log.filter((l) => l.c === 'c').map((l) => dayKey(l.t))).size;
    return trials >= 2 && coffreDays >= 2;
  }
  const c = CHAPTERS[ch];
  return c.test.every((t) => levelInfo(t).i >= 1 || levelInfo(t).mastered);
}

export function chapterProgress(ch) {
  if (ch === 0) {
    const trials = S.bilans.filter((b) => b.trial && b.done).length;
    const coffreDays = new Set(S.log.filter((l) => l.c === 'c').map((l) => dayKey(l.t))).size;
    return [
      { label: 'Bilans initiaux', value: Math.min(trials, 2), max: 2 },
      { label: 'Jours de Coffre', value: Math.min(coffreDays, 2), max: 2 },
    ];
  }
  return CHAPTERS[ch].test.map((t) => {
    const lv = levelInfo(t);
    return { label: `${TECHS[t].name} : rappels réussis`, value: lv.i >= 1 ? 2 : lv.wins, max: 2 };
  });
}

export function checkChapter() {
  let ch = S.campaign.chapter;
  while (ch < MAINTENANCE && chapterTestDone(ch)) {
    S.campaign.completed[ch] = dayKey();
    award(50);
    ch++;
    S.campaign.chapter = ch;
    S.campaign.chapterStartedAt = Date.now();
    S.campaign.sessionsInChapter = 0;
    toast(ch < MAINTENANCE ? `Chapitre débloqué : ${CHAPTERS[ch].title} 🗝️` : 'Parcours terminé ! Place à l’entretien 🎓', 'gold');
  }
  save();
  checkBadges();
}

export function unlockedTechs() {
  const ch = S.campaign.chapter;
  const out = [];
  for (let i = 1; i <= Math.min(ch, CHAPTERS.length - 1); i++) out.push(...CHAPTERS[i].techs);
  return out;
}

export function techUnlocked(tech) {
  return unlockedTechs().includes(tech) || S.campaign.chapter >= MAINTENANCE;
}

function leastRecent(techs) {
  return techs.slice().sort((a, b) => (S.lastPlayed[a] || '').localeCompare(S.lastPlayed[b] || ''))[0];
}

// Technique proposée pour la session du jour : celle du chapitre, entrelacée avec les précédentes.
export function techniqueOfDay() {
  const ch = S.campaign.chapter;
  if (ch === 0) {
    if (S.bilans.filter((b) => b.trial && b.done).length < 2 && !S.bilanPending) return 'bilan';
    return 'story';
  }
  const n = S.campaign.sessionsInChapter;
  if (ch >= MAINTENANCE) return leastRecent(Object.keys(TECHS));
  const cur = CHAPTERS[ch].techs;
  const prev = unlockedTechs().filter((t) => !cur.includes(t));
  if (prev.length && n % 3 === 2) return leastRecent(prev);
  return cur[n % cur.length];
}

// --- Session du jour et série -------------------------------------------------------

export function isFullDay(key = dayKey()) {
  if (S.campaign.chapter === 0) return true;
  return S.profile.fullDays.includes(weekday(key));
}

export function sessionToday() {
  const d = dayKey();
  if (!S.sessions[d]) S.sessions[d] = { kind: isFullDay(d) ? 'full' : 'light', steps: {}, done: false };
  return S.sessions[d];
}

export function completeSession() {
  const d = dayKey();
  const s = sessionToday();
  if (s.done) return 0;
  s.done = true;
  S.streak.done[d] = true;
  if (s.kind === 'full') S.campaign.sessionsInChapter++;
  S.streak.best = Math.max(S.streak.best, streakCount());
  const pts = award(10);
  setProspective();
  save();
  checkChapter();
  return pts;
}

export function updateStreak() {
  const st = S.streak;
  const days = Object.keys(st.done).sort();
  if (!days.length) return;
  const yesterday = addDays(dayKey(), -1);
  let d = st.checkedUntil ? addDays(st.checkedUntil, 1) : days[0];
  while (d <= yesterday) {
    const before = addDays(d, -1);
    if (!st.done[d] && !st.jokers[d] && (st.done[before] || st.jokers[before])) {
      const wk = weekKey(d);
      const used = Object.keys(st.jokers).filter((k) => weekKey(k) === wk).length;
      if (used < 2) st.jokers[d] = true;
    }
    st.checkedUntil = d;
    d = addDays(d, 1);
  }
  save();
}

export function streakCount() {
  let n = 0;
  let d = dayKey();
  if (!S.streak.done[d]) d = addDays(d, -1);
  while (S.streak.done[d] || S.streak.jokers[d]) {
    if (S.streak.done[d]) n++;
    d = addDays(d, -1);
  }
  return n;
}

export function jokersLeft() {
  const wk = weekKey(dayKey());
  return 2 - Object.keys(S.streak.jokers).filter((k) => weekKey(k) === wk).length;
}

export const missionsDone = () => Object.keys(S.streak.done).length;

// --- Consigne du soir (mémoire prospective) ----------------------------------------------

export const STAR_COLORS = [
  { id: 'bleue', hex: '#4f7bff' },
  { id: 'rouge', hex: '#ef4f4f' },
  { id: 'verte', hex: '#2fb36d' },
  { id: 'jaune', hex: '#f5c33b' },
  { id: 'violette', hex: '#9d5cf0' },
  { id: 'orange', hex: '#f58a3b' },
];

function setProspective() {
  if (activeProspective()) return;
  const t = new Date();
  const color = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)].id;
  const today = dayKey();
  let after, when, target;
  if (t.getHours() < 16) {
    after = new Date(t.getFullYear(), t.getMonth(), t.getDate(), 18).getTime();
    when = 'Ce soir, à partir de 18 h';
    target = today;
  } else {
    target = addDays(today, 1);
    after = dayStart(target) + 4 * 3600000; // 8 h
    when = 'Demain matin';
  }
  S.prospective[today] = { color, after, expires: dayStart(addDays(target, 1)), when, status: 'pending' };
  save();
}

export function activeProspective() {
  const t = Date.now();
  for (const [day, p] of Object.entries(S.prospective)) {
    if (p.status === 'pending' && t < p.expires) return { day, ...p };
    if (p.status === 'pending' && t >= p.expires) { p.status = 'missed'; save(); }
  }
  return null;
}

export function tapStar(color) {
  const p = activeProspective();
  if (!p) return { kind: 'none' };
  if (Date.now() < p.after) return { kind: 'early', p };
  const rec = S.prospective[p.day];
  rec.status = color === p.color ? 'ok' : 'fail';
  rec.tapped = color;
  const pts = rec.status === 'ok' ? award(5) : 0;
  save();
  checkBadges();
  return { kind: rec.status, p, pts };
}

// --- Mesures ----------------------------------------------------------------------------

// Rétention à 7 jours : rappels intervenant au moins 7 jours après la révision précédente.
// Le Savoir du jour a sa propre rétention : la courbe principale reste comparable à ce qu'elle était.
export function retention7(sinceDays = 30, { culture = false } = {}) {
  const since = Date.now() - sinceDays * DAY_MS;
  const rows = S.log.filter((l) => l.gap != null && l.gap >= 7 && l.t >= since && l.c !== 'f' && (l.src === 'culture') === culture);
  return { n: rows.length, rate: rows.length ? rows.filter((l) => l.ok).length / rows.length : null };
}

export function retentionByWeek(weeks = 12) {
  const out = [];
  const today = dayKey();
  for (let w = weeks - 1; w >= 0; w--) {
    const end = dayStart(addDays(today, 1 - w * 7));
    const start = end - 7 * DAY_MS;
    const rows = S.log.filter((l) => l.gap != null && l.gap >= 7 && l.t >= start && l.t < end && l.c !== 'f' && l.src !== 'culture');
    out.push({ start, n: rows.length, rate: rows.length ? rows.filter((l) => l.ok).length / rows.length : null });
  }
  return out;
}

// « Ce qui t'a semblé difficile » : rétention ultérieure selon la note du premier rappel.
export function difficultyInsight() {
  const first = {};
  const later = { hard: [0, 0], easy: [0, 0] };
  for (const l of S.log) {
    if (!(l.id in first)) { first[l.id] = l.g; continue; }
    if (l.gap == null || l.gap < 7 || l.c === 'f') continue;
    const k = first[l.id] <= 2 ? 'hard' : first[l.id] === 4 ? 'easy' : null;
    if (!k) continue;
    later[k][0] += l.ok ? 1 : 0;
    later[k][1]++;
  }
  if (later.hard[1] < 10 || later.easy[1] < 10) return null;
  return { hard: later.hard[0] / later.hard[1], easy: later.easy[0] / later.easy[1], n: later.hard[1] + later.easy[1] };
}

// --- Badges -----------------------------------------------------------------------------

export const BADGES = [
  { id: 'first', icon: '🌱', name: 'Premier pas', desc: 'Terminer sa première mission du jour', test: () => missionsDone() >= 1 },
  { id: 'week', icon: '🔥', name: 'Une semaine', desc: 'Une série de 7 jours', test: () => S.streak.best >= 7 },
  { id: 'month', icon: '🌕', name: 'Un mois', desc: 'Une série de 30 jours', test: () => S.streak.best >= 30 },
  { id: 'sixty', icon: '🏔️', name: 'Soixante jours', desc: '60 missions terminées : l’habitude est installée', test: () => missionsDone() >= 60 },
  { id: 'stone1', icon: '🧱', name: 'Première pierre', desc: 'Retrouver un élément 30 jours après l’avoir appris', test: () => S.city.stones.length >= 1 },
  { id: 'stone100', icon: '🏛️', name: '100 éléments tenus 30 jours', desc: '100 éléments retrouvés 30 jours après', test: () => S.city.stones.length >= 100 },
  { id: 'palace20', icon: '🏰', name: 'Premier palais de 20', desc: 'Restituer à 80 % un palais de 20 éléments', test: () => !!S.records.palace20 },
  { id: 'palace50', icon: '👑', name: 'Palais de 50', desc: 'Restituer à 80 % un palais de 50 éléments', test: () => !!S.records.palace50 },
  { id: 'names10', icon: '🤝', name: '10 prénoms du quotidien', desc: '10 prénoms saisis dans « Ma vie » retrouvés le lendemain ou plus tard', test: () => mavieNamesKept() >= 10 },
  { id: 'digits20', icon: '🔐', name: '20 chiffres', desc: 'Retrouver 20 chiffres le lendemain à 80 %', test: () => !!S.records.digits20 },
  { id: 'oral5', icon: '👂', name: 'Oreille fine', desc: 'Retrouver le lendemain les 5 informations d’un message', test: () => !!S.records.oral5 },
  { id: 'prosp7', icon: '⭐', name: 'Rendez-vous tenus', desc: 'Réussir 7 consignes du soir', test: () => Object.values(S.prospective).filter((p) => p.status === 'ok').length >= 7 },
  { id: 'ret80', icon: '🎯', name: 'Rétention solide', desc: '80 % de rétention à 7 jours sur au moins 30 rappels', test: () => { const r = retention7(60); return r.n >= 30 && r.rate >= 0.8; } },
  { id: 'campaign', icon: '🎓', name: 'Parcours terminé', desc: 'Terminer les six chapitres', test: () => S.campaign.chapter >= MAINTENANCE },
];

function mavieNamesKept() {
  const ids = new Set(Object.values(S.items).filter((i) => i.src === 'mavie' && i.extra?.cat === 'prenom').map((i) => i.id));
  return new Set(S.log.filter((l) => ids.has(l.id) && l.ok && l.age >= 1).map((l) => l.id)).size;
}

export function checkBadges() {
  for (const b of BADGES) {
    if (!S.badges[b.id] && b.test()) {
      S.badges[b.id] = dayKey();
      toast(`Badge obtenu : ${b.icon} ${b.name}`, 'gold');
    }
  }
  save();
}

// --- Bilans -----------------------------------------------------------------------------

export function bilanStatus() {
  const done = S.bilans.filter((b) => b.done);
  const trials = done.filter((b) => b.trial).length;
  if (trials < 2) return { available: true, trial: true, label: `Bilan initial ${trials + 1}/2` };
  const last = done[done.length - 1];
  const since = dayDiff(last.day, dayKey());
  const first = done[0];
  const week8 = dayDiff(first.day, dayKey()) >= 49 && !done.some((b) => b.kind === 'week8');
  if (week8) return { available: true, trial: false, kind: 'week8', label: 'Bilan de la semaine 8' };
  if (since >= 30) return { available: true, trial: false, kind: 'monthly', label: 'Bilan mensuel' };
  return { available: false, inDays: 30 - since, label: 'Bilan mensuel' };
}

export function checkinDue() {
  const last = S.checkins[S.checkins.length - 1];
  if (missionsDone() < 5) return false;
  return !last || dayDiff(last.day, dayKey()) >= 7;
}
