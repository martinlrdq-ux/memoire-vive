// Interface principale : onglets, accueil, Coffre, jeux, parcours et ville, progrès, réglages.
import { h, toast, sheet, input, textarea, Stage, screen, ABORT, digitsOf, plural } from './core/ui.js';
import { S, save, dayKey, dayStart, addDays, fmtDay, exportJSON, importJSON, resetAll, dayDiff, rng } from './core/store.js';
import {
  TECHS, CHAPTERS, MAINTENANCE, DISTRICTS, RANKS, BADGES, rank, queue, forecast, levelInfo, sessionToday, techniqueOfDay,
  streakCount, jokersLeft, pointsToday, createItem, deleteItem, chapterProgress, techUnlocked, STAR_COLORS, tapStar,
  retention7, retentionByWeek, difficultyInsight, bilanStatus, checkinDue, updateStreak, checkChapter, checkBadges, districtOf, eveningDue,
} from './core/engine.js';
import { CATALOG, ANNEXES } from './games/catalog.js';
import {
  onRefresh, runSession, runCoffreOnly, playGame, runBilanStandalone, runDelayedRecall, runFreeReview, runWeekend,
  weekendAvailable, startTechnique, sessionSteps, techLabel, runPalaceBuilder, runPalaceStore, runPalaceView,
} from './session.js';
import { delayedReady } from './games/bilan.js';
import { editPalace, fillSize, palaceGuide, storedLists } from './games/palais.js';
import { VIRTUAL_PALACES } from './data/palaces.js';
import { LANGUAGES } from './data/vocab.js';
import { owlSVG } from './core/logo.js';
import { cloudEnabled, session, signup, login, logout, pullIfNewer, push } from './core/cloud.js';
import { notifStatus, enableNotifs, disableNotifs, testNotif, checkNotifs } from './core/notify.js';
import './reminders.js';
import { widgetBlock } from './widget.js';

const app = document.getElementById('app');
// Pictos des onglets : trait fin de 1,6px, couleur héritée de l'onglet.
const tabIcon = (body) => `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${body}</svg>`;
const TABS = [
  ['home', 'Accueil', tabIcon('<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z"/>')],
  ['coffre', 'Coffre', tabIcon('<path d="M4 10h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M4 10V8.5A4.5 4.5 0 0 1 8.5 4h7A4.5 4.5 0 0 1 20 8.5V10"/><rect x="10.5" y="12" width="3" height="4" rx="1"/>')],
  ['jeux', 'Jeux', tabIcon('<rect x="4" y="4" width="16" height="16" rx="3.5"/><g fill="currentColor" stroke="none"><circle cx="8.8" cy="8.8" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="15.2" cy="15.2" r="1.3"/></g>')],
  ['parcours', 'Parcours', tabIcon('<path d="M6 21V4"/><path d="M6 4h11.5l-2.5 4 2.5 4H6"/>')],
  ['progres', 'Progrès', tabIcon('<rect x="4.5" y="14" width="4" height="6" rx="1"/><rect x="10" y="9.5" width="4" height="10.5" rx="1"/><rect x="15.5" y="4.5" width="4" height="15.5" rx="1"/>')],
];
const STEP_INFO = { warmup: ['〰️', 'Échauffement'], coffre: ['🗝️', 'Le Coffre'], technique: ['✨', 'Technique'], bilan: ['🌙', 'Bilan du jour'] };
const SRC_NAMES = { mavie: 'Ma vie', story: 'Fil rouge', sketch: 'Croquis', names: 'Qui est-ce ?', digits: 'Code secret', palace: 'Palais', oral: 'Message reçu', reading: 'Lecture active', vocab: "Mots d'ailleurs", weekend: 'Défi du week-end' };
const TECH_ORDER = ['story', 'sketch', 'names', 'digits', 'palace', 'oral', 'reading', 'vocab'];

let swReg = null; // service worker (mises à jour)
let updateReady = false; // une nouvelle version a pris la main : recharger dès que possible
let tab = (location.hash.replace('#/', '') || 'home');
if (!TABS.some(([id]) => id === tab)) tab = 'home';

// Thème choisi dans les Réglages ; « auto » suit le réglage de l'iPhone. Copie hors de S pour l'appliquer avant le premier affichage.
function applyTheme() {
  const t = S.profile.theme || 'auto';
  if (t === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
  try { localStorage.setItem('kikory.theme', t); } catch (e) { /* stockage indisponible */ }
}

// Les entrées (cartes qui montent, barres qui se remplissent) ne jouent qu'en arrivant sur un onglet
// ou à l'ouverture, pas à chaque rafraîchissement de l'écran.
let entering = true;
let fromTab = null;

// Barre d'onglets construite une seule fois : la pastille glisse d'un onglet à l'autre au lieu d'être redessinée.
const tabButtons = TABS.map(([id, label, icon]) => h('button', { class: 'tab', onclick: () => go(id) }, h('span', { class: 'tab-icon', html: icon }), h('span', null, label)));
const tabbar = h('nav', { class: 'tabbar', style: `--tabs: ${TABS.length}` }, h('span', { class: 'tab-pill', 'aria-hidden': 'true' }), tabButtons);

function go(id) {
  if (id !== tab) { fromTab = tab; entering = true; }
  tab = id;
  history.replaceState(null, '', `#/${id}`);
  const b = tabButtons[TABS.findIndex(([t]) => t === id)];
  b.classList.remove('bump');
  void b.offsetWidth; // relance l'animation de l'icône
  b.classList.add('bump');
  render();
  window.scrollTo(0, 0);
}

export function render() {
  if (!S.profile.onboarded) { app.replaceChildren(); onboarding(); return; }
  const views = { home, coffre: coffreView, jeux: jeuxView, parcours: parcoursView, progres: progresView };
  const [head, ...rest] = [...views[tab]().children];
  rest.forEach((el, i) => el.style.setProperty('--i', Math.min(i, 8)));
  const on = TABS.findIndex(([id]) => id === tab);
  tabButtons.forEach((b, i) => { b.classList.toggle('on', i === on); if (i === on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  tabbar.style.setProperty('--tab', on);
  for (const el of [...app.children]) if (el !== tabbar) el.remove();
  app.prepend(...[
    h('main', { class: `view ${entering ? 'enter' : ''}` }, head, h('div', { class: 'sheet-page' }, rest)),
    tab !== 'home' && h('button', { class: `fab ${entering && (!fromTab || fromTab === 'home') ? 'pop-in' : ''}`, 'aria-label': 'Retenir quelque chose', onclick: openCapture }, '＋'),
  ].filter(Boolean));
  if (!tabbar.isConnected) app.append(tabbar);
  entering = false;
}
onRefresh(render);

// Valeurs du dernier affichage : renvoie l'ancienne si elle a changé depuis (hors arrivée sur l'onglet), sinon null.
const shown = new Map();
function previous(key, value) {
  const old = shown.get(key);
  shown.set(key, value);
  return entering || old === undefined || old === value ? null : old;
}
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const AFTER_STAGE = 300; // laisse la scène d'exercice se refermer avant d'animer ce qui a changé

// Chiffre qui défile de l'ancienne valeur à la nouvelle (série, points), avec un petit gonflement de sa pastille.
function counter(key, value) {
  const el = h('span', null, value);
  const old = previous(key, value);
  if (old == null || calm()) return el;
  el.textContent = old;
  setTimeout(() => {
    el.parentElement?.classList.add('bump');
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / 700);
      el.textContent = Math.round(old + (value - old) * (1 - (1 - k) ** 3));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, AFTER_STAGE);
  return el;
}

// Remplissage de barre qui part de sa valeur au dernier affichage (la mission après une étape) au lieu de sauter.
function growing(key, pct) {
  const old = previous(key, pct);
  const fill = h('div', { style: { width: `${old ?? pct}%` } });
  if (old != null) setTimeout(() => { fill.style.width = `${pct}%`; }, AFTER_STAGE);
  return fill;
}

// --- Accueil ---------------------------------------------------------------------

const CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const PLAY_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" fill="currentColor"/></svg>';

// En-tête bleu des onglets : titre, et éventuellement un texte d'introduction.
function skyHeader(title, lead) {
  return h('header', { class: 'top' }, h('h1', null, title), lead && h('p', { class: 'lead' }, lead));
}

// La semaine autour d'aujourd'hui, en arc : jours de mission faits, jokers, à venir.
function weekStrip() {
  const today = dayKey();
  const TILT = [-16, -12, -8, -4, 0, 4, 8, 12, 16], DROP = [62, 34, 15, 4, -4, 4, 15, 34, 62];
  return h('div', { class: 'week' }, TILT.map((tilt, i) => {
    const k = i - 4;
    const d = addDays(today, k);
    const done = S.streak.done[d], joker = S.streak.jokers[d];
    const state = done ? 'mission faite' : joker ? 'joker utilisé' : k === 0 ? 'mission à faire' : k < 0 ? 'pas de mission' : 'à venir';
    return h('div', { class: `wday ${k === 0 ? 'today' : ''} ${done ? 'done' : ''}`, style: { transform: `translateY(${DROP[i]}px) rotate(${tilt}deg)` }, 'aria-label': `${fmtDay(d, { weekday: 'long', day: 'numeric' })} : ${state}` },
      fmtDay(d, { weekday: 'short' }), h('b', null, fmtDay(d, { day: 'numeric' })),
      h('span', { class: 'wday-dot', html: done ? CHECK_SVG : joker ? '🃏' : k === 0 ? '🔥' : '' }));
  }));
}

function streakSheet() {
  sheet({ title: 'Ta série 🔥', text: `Chaque mission terminée prolonge ta série. Un jour manqué ne casse pas une habitude : tu as 2 jokers par semaine, utilisés automatiquement (encore ${plural(jokersLeft(), 'joker')} cette semaine). Record : ${S.streak.best} jours.`, buttons: [{ label: 'Compris', value: true, kind: 'primary' }] });
}

function home() {
  const s = sessionToday();
  const steps = sessionSteps(s);
  const q = queue();
  const tech = s.tech || techniqueOfDay();
  const started = steps.some((k) => s.steps[k]);
  const next = steps.find((k) => !s.steps[k]);
  const today = pointsToday();
  // Une étape validée depuis le dernier affichage fait apparaître son ✓ avec un rebond.
  const stepClass = (k) => {
    const fresh = previous(`step:${k}`, Boolean(s.steps[k])) === false;
    return s.steps[k] ? `ok ${fresh ? 'just' : ''}` : k === next ? 'next' : '';
  };
  return h('div', null,
    h('header', { class: 'top' },
      h('div', { class: 'sky-bar' },
        h('span', { class: 'sky-owl', html: owlSVG(48) }),
        h('div', { class: 'sky-pills' },
          h('button', { class: 'pill flame', 'aria-label': `Série : ${plural(streakCount(), 'jour')}`, onclick: streakSheet }, h('span', { class: 'pill-icon' }, '🔥'), counter('streak', streakCount())),
          h('button', { class: 'pill xp', 'aria-label': `${S.points.total} points`, onclick: () => go('progres') }, h('span', { class: 'pill-icon' }, '⚡'), counter('points', S.points.total), h('small', null, 'pts')))),
      h('div', { class: 'sky-greet' },
        h('div', null,
          h('div', { class: 'sky-date cap' }, fmtDay(dayKey()), today ? ` · +${today} pts aujourd’hui` : ''),
          h('h1', null, `Bonjour${S.profile.name ? ' ' + S.profile.name : ''}`)),
        h('button', { class: 'icon-btn glass', 'aria-label': 'Réglages', onclick: openSettings }, '⚙️')),
      weekStrip()),
    updateBanner(),
    installBanner(),
    notifBanner(),
    delayedBanner(),
    backupBanner(),
    checkinCard(),
    h('section', { class: `card mission ${s.done ? 'done' : ''}` },
      h('div', { class: 'card-head' }, h('h2', null, 'Mission du jour'), h('span', { class: 'tag' }, s.kind === 'full' ? '≈ 15 min' : '≈ 5 min')),
      h('div', { class: `bar mission-bar ${s.done ? 'done' : ''}` }, growing('mission', (steps.filter((k) => s.steps[k]).length / steps.length) * 100)),
      h('ol', { class: 'mission-steps' }, steps.map((k) => h('li', { class: stepClass(k) },
        h('span', { class: 'step-icon' }, s.steps[k] ? '✓' : STEP_INFO[k][0]),
        h('span', null, STEP_INFO[k][1], k === 'technique' ? h('span', { class: 'muted' }, ` · ${techLabel(tech)}`) : null,
          k === 'coffre' ? h('span', { class: 'muted' }, ` · ${q.items.length ? plural(q.items.length, 'révision') : 'à jour'}`) : null)))),
      s.done
        ? h('p', { class: 'done-line' }, '✓ Mission terminée. À demain !')
        : h('button', { class: 'btn primary block', onclick: runSession, html: `${PLAY_SVG} ${started ? 'Continuer' : 'Commencer'}` }),
      !s.done && h('div', { class: 'row center wrap' },
        s.kind === 'light' && h('button', { class: 'btn ghost small', onclick: () => { s.kind = 'full'; save(); render(); } }, 'Faire une session complète'),
        (s.kind === 'full' || s.extra) && !s.steps.technique && tech !== 'bilan' && h('button', { class: 'btn ghost small', onclick: chooseTechnique }, 'Changer de technique'))),
    weekendAvailable() && h('section', { class: 'card accent' }, h('div', { class: 'card-head' }, h('h3', null, '🗓️ Défi du week-end'), h('span', { class: 'tag' }, 'bonus')), h('p', { class: 'muted' }, '15 objets à relier en une histoire, à restituer lundi.'), h('button', { class: 'btn secondary', onclick: runWeekend }, 'Relever le défi')),
    h('button', { class: 'card capture-card', onclick: openCapture },
      h('span', { class: 'capture-plus' }, '＋'),
      h('span', null, h('strong', null, 'Retenir quelque chose'), h('br'), h('small', { class: 'muted' }, 'Un prénom, un numéro, une consigne : saisis-le en 10 secondes.'))),
    h('section', { class: 'card tap', onclick: () => go('coffre') },
      h('div', { class: 'card-head' }, h('h3', null, '🗝️ Le Coffre'), h('span', { class: 'muted small' }, `${Object.keys(S.items).length} éléments`)),
      h('p', null, q.items.length ? `${plural(q.items.length, 'révision')} à faire maintenant` : 'Rien à réviser pour l’instant.', q.later ? h('span', { class: 'muted' }, ` · ${q.later} plus tard aujourd’hui`) : null)),
    parcoursMini(),
    sky(),
  );
}

function chooseTechnique() {
  const s = sessionToday();
  const options = TECH_ORDER.filter((t) => techUnlocked(t));
  if (!options.length) { toast('Les techniques se débloquent avec le parcours.'); return; }
  sheet({
    title: 'Technique du jour',
    text: 'Varier les techniques d’une session à l’autre aide à les ancrer.',
    buttons: [...options.map((t) => ({ label: `${TECHS[t].icon} ${TECHS[t].name}`, value: t })), { label: 'Annuler', value: null }],
  }).then((t) => { if (t) { s.tech = t; save(); render(); } });
}

function parcoursMini() {
  const ch = S.campaign.chapter;
  if (ch >= MAINTENANCE) return h('section', { class: 'card tap', onclick: () => go('parcours') }, h('div', { class: 'card-head' }, h('h3', null, '🎓 Entretien'), h('span', { class: 'muted small' }, 'parcours terminé')), h('p', { class: 'muted' }, 'Le Coffre au quotidien et des sessions de rappel espacées.'));
  const c = CHAPTERS[ch];
  return h('section', { class: 'card tap', onclick: () => go('parcours') },
    h('div', { class: 'card-head' }, h('h3', null, ch === 0 ? '🗺️ Prologue' : `🗺️ Chapitre ${ch}`), h('span', { class: 'muted small' }, c.title)),
    chapterProgress(ch).map((p) => progressLine(p)),
    h('p', { class: 'muted small' }, `Dans la vraie vie : ${c.life}`));
}

function progressLine(p) {
  return h('div', { class: 'progress-line' }, h('span', { class: 'small' }, p.label), h('div', { class: 'bar' }, h('div', { style: { width: `${(p.value / p.max) * 100}%` } })), h('span', { class: 'small muted' }, `${p.value}/${p.max}`));
}

function sky() {
  return h('section', { class: 'card sky' },
    h('div', { class: 'card-head' }, h('h3', null, 'Le ciel'), h('span', { class: 'muted small' }, '')),
    h('div', { class: 'stars' }, STAR_COLORS.map((c) => h('button', { class: 'star', style: { color: c.hex }, 'aria-label': `Étoile ${c.id}`, onclick: () => {
      const r = tapStar(c.id);
      if (r.kind === 'none') toast('Le ciel est calme. ✨');
      else if (r.kind === 'early') toast('Pas encore ! C’est pour plus tard.');
      else if (r.kind === 'ok') { toast(`Consigne tenue ⭐ +${r.pts}`, 'gold'); render(); }
      else { toast(`Ce n’était pas celle-là : c’était l’étoile ${r.p.color}.`); render(); }
    } }, '★'))));
}

function installBanner() {
  const standalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
  if (standalone || S.records.installDismissed) return null;
  return h('section', { class: 'card banner' },
    h('div', null, h('strong', null, '📲 Installe l’app sur ton iPhone'), h('p', { class: 'small muted' }, 'Dans Safari : touche le bouton Partager, puis « Sur l’écran d’accueil ». L’app s’ouvrira en plein écran, même hors ligne, et pourra t’envoyer tes rappels en notification.')),
    h('button', { class: 'icon-btn', onclick: () => { S.records.installDismissed = true; save(); render(); } }, '✕'));
}

function notifBanner() {
  if (notifStatus() !== 'off' || S.records.notifDismissed) return null;
  const btn = h('button', { class: 'btn primary small', onclick: async () => {
    btn.disabled = true;
    try { await enableNotifs(); toast('Notifications activées 🔔', 'ok'); } catch (e) { toast(e.message); }
    render();
  } }, 'Activer');
  return h('section', { class: 'card banner' },
    h('div', null, h('strong', null, '🔔 Reçois tes rappels'), h('p', { class: 'small muted' }, 'La mission du jour, « Ma vie » à retrouver le soir, le rappel du bilan : en notification, même app fermée.')),
    h('div', { class: 'row' }, btn, h('button', { class: 'icon-btn', 'aria-label': 'Plus tard', onclick: () => { S.records.notifDismissed = true; save(); render(); } }, '✕')));
}

function delayedBanner() {
  const d = delayedReady();
  if (!d) return null;
  if (!d.ready) return h('section', { class: 'card banner' }, h('div', null, h('strong', null, '⏳ Rappel différé du bilan'), h('p', { class: 'small muted' }, `Disponible dans ${d.minutes} min. Évite de revoir les mots d’ici là.`)));
  return h('section', { class: 'card banner accent' }, h('div', null, h('strong', null, '⏰ C’est l’heure du rappel différé'), h('p', { class: 'small muted' }, 'Retrouve les 15 mots du bilan.')), h('button', { class: 'btn primary small', onclick: runDelayedRecall }, 'Y aller'));
}

function backupBanner() {
  const n = Object.keys(S.items).length;
  if (n < 20) return null;
  if (S.lastBackup && Date.now() - S.lastBackup < 30 * 86400000) return null;
  return h('section', { class: 'card banner' }, h('div', null, h('strong', null, '💾 Pense à ta sauvegarde'), h('p', { class: 'small muted' }, 'Tes données sont sur cet iPhone uniquement. Exporte une copie de temps en temps.')), h('button', { class: 'btn secondary small', onclick: exportBackup }, 'Exporter'));
}

function checkinCard() {
  if (!checkinDue()) return null;
  const card = h('section', { class: 'card accent' });
  const ask = (q, opts, cb) => card.replaceChildren(h('h3', null, '💬 Petit point de la semaine'), h('p', null, q), h('div', { class: 'row wrap' }, opts.map(([l, v]) => h('button', { class: 'btn secondary small', onclick: () => cb(v) }, l))));
  ask('Cette semaine, as-tu retenu les informations qu’on t’a données (prénoms, rendez-vous, chiffres) ?', [['Souvent', 3], ['Parfois', 2], ['Rarement', 1]], (retained) => {
    ask('As-tu utilisé une technique dans la vraie vie ?', [['Oui', true], ['Non', false]], (used) => {
      S.checkins.push({ day: dayKey(), retained, used });
      save();
      card.replaceChildren(h('p', null, 'Merci ! C’est ton ressenti : utile à suivre, mais ce sont tes rappels réels qui mesurent les progrès.'));
      setTimeout(render, 2500);
    });
  });
  return card;
}

// --- Saisie « Ma vie » -----------------------------------------------------------

const CATS = [
  { id: 'prenom', icon: '👤', label: 'Un prénom', q: 'Qui est-ce ?', qph: 'La sœur de Julie, rencontrée au dîner', a: 'Son prénom', aph: 'Margaux', tip: 'Trouve un trait marquant, transforme le prénom en image et relie les deux.', prefix: 'Prénom : ' },
  { id: 'chiffre', icon: '🔢', label: 'Un numéro', q: 'C’est le numéro de quoi ?', qph: 'Le code du portail de Paul', a: 'Les chiffres', aph: '4721', numeric: true, tip: 'Découpe en blocs de deux et donne un sens à chaque bloc (une date, un âge…).' },
  { id: 'rdv', icon: '📅', label: 'Un rendez-vous', q: 'Avec qui, pour quoi ?', qph: 'Le dentiste', a: 'Quand et où ?', aph: 'jeudi 15 h, 12 rue des Lilas', tip: 'Reformule-le à voix haute (« donc jeudi 15 h… »), puis imagine la scène. Et note-le aussi dans ton agenda : c’est l’aide la plus fiable.' },
  { id: 'consigne', icon: '📝', label: 'Une consigne', q: 'Quelle consigne ?', qph: 'Ce que Claire m’a demandé pour le dossier', a: 'Son contenu', aph: 'envoyer le devis signé avant vendredi', tip: 'Fais-en une courte histoire. Si c’est à faire plus tard, mets aussi un rappel dans ton téléphone.' },
  { id: 'liste', icon: '🛒', label: 'Une liste', q: 'Quelle liste ?', qph: 'Les courses de samedi', a: 'Les éléments, séparés par des virgules', aph: 'farine, œufs, citrons', list: true, palace: true, tip: 'Range-la dans ton palais : chaque élément devient une image posée sur un meuble de ton logement. Ou relie les éléments en une petite histoire.' },
  { id: 'parole', icon: '🎤', label: 'Une prise de parole', q: 'Pour quelle occasion ?', qph: 'La réunion de lundi avec Claire', a: 'Tes points clés, dans l’ordre, en un ou deux mots chacun', aph: 'budget, planning, recrutement', list: true, ordered: true, palace: true, tip: 'Range-la dans ton palais : chaque point devient une image posée sur un meuble. Le jour J, tu refais le tour dans ta tête et tu parles sans notes, comme les orateurs romains.' },
  { id: 'citation', icon: '💬', label: 'Une phrase', q: 'Qui l’a dit, à quel propos ?', qph: 'Le conseil de mon grand-père', a: 'La phrase', aph: '…', tip: 'Relie-la à un souvenir personnel : ce qui te concerne s’ancre mieux.' },
  { id: 'autre', icon: '✳️', label: 'Autre chose', q: 'La question que tu te poseras', qph: 'Le restaurant conseillé par Léo', a: 'La réponse', aph: '…', tip: 'Relie l’information à toi : où l’as-tu entendue, qu’est-ce qu’elle t’évoque ?' },
];

export function openCapture(catId) {
  let cat = CATS.find((c) => c.id === catId) || CATS[0];
  const fQ = input({ autocapitalize: 'sentences' });
  const fA = input({ autocapitalize: 'sentences' });
  const fH = input({ placeholder: 'Ton image ou ton astuce (optionnel)', autocapitalize: 'sentences' });
  const qLabel = h('span'), aLabel = h('span'), tip = h('p', { class: 'tip' });
  const chips = h('div', { class: 'chips' });
  const setCat = (c) => {
    cat = c;
    qLabel.textContent = c.q; aLabel.textContent = c.a;
    fQ.placeholder = c.qph; fA.placeholder = c.aph;
    fA.inputMode = c.numeric ? 'numeric' : 'text';
    tip.textContent = `💡 ${c.tip}`;
    chips.replaceChildren(...CATS.map((x) => h('button', { class: `chip ${x === c ? 'on' : ''}`, onclick: () => setCat(x) }, `${x.icon} ${x.label}`)));
    // Une liste peut aller dans le palais : ce bouton devient alors le principal.
    const pal = document.getElementById('cap-palace'), cof = document.getElementById('cap-coffre');
    if (pal) { pal.style.display = c.palace ? '' : 'none'; cof.className = `btn ${c.palace ? 'secondary' : 'primary'}`; }
  };
  setTimeout(() => fQ.focus(), 250);
  const done = sheet({
    title: 'Retenir quelque chose',
    body: h('div', { class: 'stack' }, chips, h('label', { class: 'field' }, qLabel, fQ), h('label', { class: 'field' }, aLabel, fA), tip, fH),
    buttons: [{ label: '🏛️ Ranger dans mon palais', value: 'palace', kind: 'primary', id: 'cap-palace' }, { label: 'Ranger dans le Coffre', value: true, kind: 'primary', id: 'cap-coffre' }, { label: 'Annuler', value: false }],
  });
  setCat(cat);
  done.then((ok) => {
    if (!ok) return;
    const q = fQ.value.trim(), a = fA.value.trim();
    if (!q || !a) { toast('Il faut une question et une réponse.'); return; }
    const base = { src: 'mavie', hint: fH.value.trim(), extra: { cat: cat.id }, due: eveningDue() };
    if (cat.list) {
      const items = a.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
      if (ok === 'palace') { runPalaceStore({ title: q, items, hint: base.hint, cat: cat.id, talk: cat.id === 'parole' }); return; }
      createItem({ ...base, type: 'list', prompt: q, answer: items, extra: { ...base.extra, ordered: !!cat.ordered } });
    } else if (cat.numeric && digitsOf(a).length >= 3 && digitsOf(a).length === a.replace(/[\s.-]/g, '').length) {
      createItem({ ...base, type: 'code', prompt: q, answer: digitsOf(a) });
    } else {
      createItem({ ...base, type: 'card', prompt: (cat.prefix || '') + q, answer: a });
    }
    toast('Rangé dans le Coffre. Je te le redemande ce soir. 🗝️', 'ok');
    render();
  });
}

// --- Coffre -------------------------------------------------------------------------

function coffreView() {
  const q = queue();
  const fc = forecast(7);
  const maxF = Math.max(1, ...fc.map((x) => x.n));
  const bySrc = {};
  for (const i of Object.values(S.items)) bySrc[i.src] = (bySrc[i.src] || 0) + 1;
  const mavie = Object.values(S.items).filter((i) => i.src === 'mavie').sort((a, b) => b.created - a.created);
  return h('div', null,
    skyHeader('Le Coffre'),
    h('section', { class: 'card' },
      h('div', { class: 'big-number' }, q.items.length, h('small', null, q.items.length > 1 ? ' révisions maintenant' : ' révision maintenant')),
      q.later ? h('p', { class: 'muted' }, `${q.later} de plus plus tard aujourd’hui (Ma vie, ce soir).`) : null,
      q.catchup ? h('p', { class: 'muted small' }, `🧭 Mode rattrapage : ${q.dueTotal - q.items.length} révisions en retard sont étalées sur les prochains jours. Aucun stress.`) : null,
      h('button', { class: 'btn primary block', disabled: !q.items.length, onclick: runCoffreOnly }, 'Réviser'),
      h('p', { class: 'muted small' }, `Plafond : ${S.profile.reviewCap} révisions par jour · rétention visée : ${Math.round(S.profile.retention * 100)} %`)),
    h('section', { class: 'card' },
      h('h3', null, 'Les 7 prochains jours'),
      h('div', { class: 'forecast' }, fc.map((x, j) => h('div', { class: 'fc-col' }, h('div', { class: 'fc-bar', style: `height: ${(x.n / maxF) * 60 + 2}px; --j: ${j}` }), h('small', null, x.n), h('small', { class: 'muted' }, fmtDay(x.d, { weekday: 'narrow' })))))),
    h('section', { class: 'card' },
      h('div', { class: 'card-head' }, h('h3', null, '👤 Ma vie'), h('button', { class: 'btn secondary small', onclick: openCapture }, '＋ Ajouter')),
      h('p', { class: 'muted small' }, 'Ce que tu veux vraiment retenir : on entraîne directement la cible réelle. Les réponses restent cachées : on se teste, on ne relit pas.'),
      mavie.length ? h('ul', { class: 'item-list' }, mavie.slice(0, 40).map((i) => mavieRow(i))) : h('p', { class: 'muted' }, 'Rien pour l’instant. Touche « Ajouter » la prochaine fois qu’on te donne une information importante.')),
    h('section', { class: 'card' },
      h('h3', null, 'Contenu du Coffre'),
      Object.keys(bySrc).length ? h('ul', { class: 'kv' }, Object.entries(bySrc).map(([k, v]) => h('li', null, h('span', null, SRC_NAMES[k] || k), h('strong', null, v)))) : h('p', { class: 'muted' }, 'Le Coffre se remplit à chaque technique et chaque saisie « Ma vie ».'),
      h('button', { class: 'btn secondary', onclick: freeReviewSheet }, '🗂️ Révision libre d’un thème')),
  );
}

function mavieRow(i) {
  const cat = CATS.find((c) => c.id === i.extra?.cat) || CATS[CATS.length - 1];
  const due = i.due <= Date.now() ? 'à revoir' : i.due < dayStart(addDays(dayKey(), 1)) ? 'ce soir' : `dans ${dayDiff(dayKey(), dayKey(i.due))} j`;
  const ans = h('span', { class: 'answer hidden' }, Array.isArray(i.answer) ? i.answer.join(', ') : i.answer);
  return h('li', null,
    h('span', { class: 'item-icon' }, cat.icon),
    h('span', { class: 'item-main' }, h('span', null, i.prompt), h('br'), ans, h('small', { class: 'muted' }, ` ${due}`)),
    h('button', { class: 'icon-btn small', 'aria-label': 'Voir', onclick: () => ans.classList.toggle('hidden') }, '👁'),
    h('button', { class: 'icon-btn small', 'aria-label': 'Supprimer', onclick: async () => {
      if (await sheet({ title: 'Supprimer ?', text: i.prompt, buttons: [{ label: 'Supprimer', value: true, kind: 'danger' }, { label: 'Annuler', value: false }] })) { deleteItem(i.id); render(); }
    } }, '🗑'));
}

function freeReviewSheet() {
  const srcs = [...new Set(Object.values(S.items).map((i) => i.src))];
  if (!srcs.length) { toast('Le Coffre est vide pour l’instant.'); return; }
  sheet({
    title: 'Révision libre',
    text: 'Revoir un thème avant un rendez-vous, sans attendre la date prévue. Ça ne compte pas pour la série et rapporte peu de points.',
    buttons: [...srcs.map((s) => ({ label: SRC_NAMES[s] || s, value: s })), { label: 'Annuler', value: null }],
  }).then((s) => { if (s) runFreeReview(s); });
}

// --- Jeux ---------------------------------------------------------------------------

function levelChip(tech) {
  const lv = levelInfo(tech);
  const t = TECHS[tech];
  return h('span', { class: 'tag' }, lv.mastered ? `🏆 ${lv.size} ${t.unit}` : `Niv. ${lv.i + 1} · ${lv.size} ${t.unit} · ${lv.wins}/2`);
}

function unlockChapterOf(tech) {
  return CHAPTERS.findIndex((c) => c.techs.includes(tech));
}

function gameInfo(id) {
  const g = CATALOG[id];
  sheet({ title: `${g.icon} ${g.name}`, body: h('div', { class: 'intro' }, h('p', { class: 'muted' }, `Mémoire visée : ${g.memory}`), h('h4', null, 'Pourquoi ça marche'), h('p', null, g.why), h('h4', null, 'Pourquoi ça paraît difficile'), h('p', null, g.hard), g.steps && h('ol', null, g.steps.map((s) => h('li', null, s)))) });
}

// Tes palais, plus les palais fournis qui gardent une liste rangée.
const palaceRows = () => [...S.palaces, ...VIRTUAL_PALACES.filter((p) => storedLists(p).length)];
const lociCount = (p) => p.rooms.reduce((a, r) => a + r.loci.length, 0);

function jeuxView() {
  const ch = S.campaign.chapter;
  return h('div', null,
    skyHeader('Jeux', 'Chaque technique se termine par un rappel, et tout ce que tu apprends revient plus tard dans le Coffre. C’est cette boucle qui produit des résultats durables.'),
    h('section', { class: 'card game-card', onclick: () => go('coffre') }, h('span', { class: 'game-icon' }, '🗝️'), h('span', { class: 'game-main' }, h('strong', null, 'Le Coffre'), h('small', { class: 'muted' }, CATALOG.coffre.desc)), h('button', { class: 'icon-btn small', onclick: (e) => { e.stopPropagation(); gameInfo('coffre'); } }, 'ⓘ')),
    h('h2', { class: 'section-title' }, 'Techniques'),
    TECH_ORDER.map((tech) => {
      const id = TECHS[tech].game;
      const g = CATALOG[id];
      const open = techUnlocked(tech);
      const chap = unlockChapterOf(tech);
      return h('section', { class: `card game-card ${open ? '' : 'locked'}`, onclick: () => (open ? startTechnique(tech) : toast(`Se débloque au chapitre ${chap} : ${CHAPTERS[chap].title}`)) },
        h('span', { class: 'game-icon' }, open ? g.icon : '🔒'),
        h('span', { class: 'game-main' }, h('strong', null, g.name), h('small', { class: 'muted' }, g.desc), open ? levelChip(tech) : h('small', { class: 'muted' }, `Chapitre ${chap}`)),
        h('button', { class: 'icon-btn small', onclick: (e) => { e.stopPropagation(); gameInfo(id); } }, 'ⓘ'));
    }),
    h('h2', { class: 'section-title' }, 'Exercices annexes'),
    h('p', { class: 'muted small' }, 'Pour la variété. Ils rapportent peu (10 points maximum par jour) et ne comptent pas pour la série.'),
    ANNEXES.map((a) => {
      const open = ch >= a.chapter && (!a.weekend || weekendAvailable() || true);
      const run = () => {
        if (!open) return toast(`Se débloque avec le chapitre ${a.chapter}.`);
        if (a.id === 'echo') return playGame('echo', { title: 'Écho' });
        if (a.id === 'ouestil') return playGame('ouestil', { title: 'Où est-il ?' });
        if (a.id === 'libre') return freeReviewSheet();
        if (a.id === 'weekend') return runWeekend();
        if (a.id === 'chrono') return playGame('palais', { title: 'Défi chrono', chrono: true, size: levelInfo('palace').size });
        if (a.id === 'message-dur') return playGame('message', { title: 'Message reçu', hard: true });
      };
      return h('section', { class: `card game-card ${open ? '' : 'locked'}`, onclick: run },
        h('span', { class: 'game-icon' }, open ? a.icon : '🔒'),
        h('span', { class: 'game-main' }, h('strong', null, a.name), h('small', { class: 'muted' }, a.desc), a.weekend && open ? h('small', { class: 'muted' }, weekendAvailable() ? 'Disponible ce week-end' : 'Samedi et dimanche') : null),
        CATALOG[a.id] && h('button', { class: 'icon-btn small', onclick: (e) => { e.stopPropagation(); gameInfo(a.id); } }, 'ⓘ'));
    }),
    h('h2', { class: 'section-title' }, 'Mes palais'),
    h('section', { class: 'card' },
      h('button', { class: 'btn ghost small', onclick: palaceGuide }, 'ⓘ Le palais mental, c’est quoi ? À quoi ça sert ?'),
      palaceRows().length ? h('ul', { class: 'kv' }, palaceRows().map((p) => {
        const n = storedLists(p).length;
        const own = S.palaces.includes(p);
        return h('li', null,
          h('button', { class: 'palace-row-main', onclick: () => runPalaceView(p) },
            `${p.icon || '🏠'} ${p.name} ›`, h('br'), h('small', { class: 'muted' }, `${own ? p.loci.length : lociCount(p)} lieux${n ? ` · ${n} liste${n > 1 ? 's' : ''} rangée${n > 1 ? 's' : ''}` : ''}`)),
          h('span', { class: 'row' },
            own ? h('button', { class: 'btn ghost small', onclick: async () => { await editPalace(p); render(); } }, 'Modifier') : null,
            h('button', { class: 'btn secondary small', onclick: () => playGame('palais', { title: 'Le Palais', palace: p, size: fillSize(p) }) }, 'Remplir')));
      })) : h('p', { class: 'muted small' }, 'Pas encore de palais. Construis-en un à partir de ton logement : l’app te guide, ça prend 2 minutes.'),
      S.palaces.length ? h('ul', { class: 'legend' },
        h('li', null, h('strong', null, 'Remplir'), ' : t’entraîner avec des mots au hasard.'),
        h('li', null, h('strong', null, 'Ranger une liste'), ' : y mettre ce que tu dois vraiment retenir (courses, points d’une réunion). Le Coffre te le redemande ce soir.'),
        h('li', null, h('strong', null, 'Touche un palais'), ' pour voir ce qui y est rangé, et vider une pièce quand la liste ne sert plus.')) : null,
      h('div', { class: 'row wrap' },
        h('button', { class: 'btn secondary', onclick: runPalaceBuilder }, '+ Construire un palais'),
        S.palaces.length ? h('button', { class: 'btn secondary', onclick: () => openCapture('liste') }, '🛒 Ranger une liste') : null)),
  );
}

// --- Parcours et ville --------------------------------------------------------------

function cityView() {
  const stones = {};
  for (const s of S.city.stones) stones[s.d] = (stones[s.d] || 0) + 1;
  const building = {};
  for (const i of Object.values(S.items)) {
    if (i.stone || !i.m.reps) continue;
    if (dayDiff(dayKey(i.created), dayKey()) >= 7) { const d = districtOf(i.src); building[d] = (building[d] || 0) + 1; }
  }
  const total = S.city.stones.length;
  return h('section', { class: 'card city' },
    h('div', { class: 'card-head' }, h('h2', null, '🏙️ Ta ville de mémoire'), h('span', { class: 'tag' }, plural(total, 'pierre'))),
    h('p', { class: 'muted small' }, 'Chaque élément retrouvé 30 jours après l’avoir appris pose une pierre. La ville ne grandit qu’avec de vrais souvenirs.'),
    Object.entries(DISTRICTS).map(([id, d]) => {
      const open = S.campaign.chapter >= d.chapter;
      const n = stones[id] || 0;
      const wip = building[id] || 0;
      return h('div', { class: `district ${open ? '' : 'locked'}` },
        h('div', { class: 'district-head' }, h('strong', null, d.name), h('small', { class: 'muted' }, open ? (n || wip ? `${n} pierre${n > 1 ? 's' : ''}${wip ? ` · ${wip} en chantier` : ''}` : 'terrain à bâtir') : `ouvre au chapitre ${d.chapter}`)),
        (n || wip) ? h('div', { class: 'skyline', html: skylineSVG(id, n, wip, d.color, open) }) : null);
    }));
}

function skylineSVG(id, stones, wip, color, open) {
  const r = rng([...id].reduce((a, c) => a + c.charCodeAt(0), 0));
  const parts = [`<rect x="0" y="54" width="300" height="6" rx="3" fill="var(--line)"/>`];
  const per = 5;
  const full = Math.floor(stones / per);
  const partial = stones % per;
  let x = 4;
  const count = Math.min(14, full + (partial ? 1 : 0));
  for (let b = 0; b < count && x < 290; b++) {
    const w = 14 + Math.floor(r() * 10);
    const hgt = b < full ? 18 + Math.floor(r() * 30) : 6 + partial * 5;
    parts.push(`<rect x="${x}" y="${54 - hgt}" width="${w}" height="${hgt}" rx="2" fill="${color}" opacity="${b < full ? 0.9 : 0.5}"/>`);
    if (b < full) for (let wy = 54 - hgt + 4; wy < 50; wy += 7) for (let wx = x + 3; wx < x + w - 4; wx += 6) parts.push(`<rect x="${wx}" y="${wy}" width="3" height="3" fill="#fff8d6" opacity="${r() < 0.7 ? 0.9 : 0.25}"/>`);
    x += w + 3;
  }
  const wipShow = Math.min(8, Math.ceil(wip / 3));
  for (let k = 0; k < wipShow && x < 290; k++) {
    parts.push(`<rect x="${x}" y="40" width="14" height="14" rx="2" fill="none" stroke="${color}" stroke-dasharray="3 2" opacity="0.7"/>`);
    x += 17;
  }
  if (!count && !wipShow) parts.push(`<text x="150" y="40" text-anchor="middle" font-size="10" fill="var(--muted)">${open ? 'Terrain à bâtir' : 'Quartier fermé'}</text>`);
  return `<svg viewBox="0 0 300 62" width="100%" preserveAspectRatio="xMinYMid meet">${parts.join('')}</svg>`;
}

function parcoursView() {
  const ch = S.campaign.chapter;
  return h('div', null,
    skyHeader('Parcours', 'Un prologue et six chapitres, environ huit semaines. C’est le test de maîtrise qui fait avancer, pas le calendrier : un test raté prolonge simplement le chapitre.'),
    cityView(),
    CHAPTERS.map((c, i) => {
      const status = i < ch ? 'done' : i === ch ? 'current' : 'locked';
      return h('section', { class: `card chapter ${status}` },
        h('div', { class: 'card-head' }, h('h3', null, i === 0 ? 'Prologue' : `Chapitre ${i}`, h('span', { class: 'muted' }, ` · ${c.title}`)), h('span', { class: 'tag' }, status === 'done' ? `✓ ${fmtDay(S.campaign.completed[i] || dayKey(), { day: 'numeric', month: 'short' })}` : status === 'current' ? 'en cours' : '🔒')),
        status !== 'locked' && h('div', null,
          c.techs.length ? h('div', { class: 'chips' }, c.techs.map((t) => h('button', { class: 'chip', onclick: () => startTechnique(t) }, `${TECHS[t].icon} ${TECHS[t].name}`))) : null,
          status === 'current' && h('div', null,
            h('p', { class: 'small' }, h('strong', null, 'Test de maîtrise : '), c.goal),
            chapterProgress(i).map((p) => progressLine(p)),
            h('p', { class: 'small muted' }, h('strong', null, 'Dans la vraie vie : '), c.life),
            i === 0 && bilanStatus().available && bilanStatus().trial && !delayedReady() && h('button', { class: 'btn secondary', onclick: runBilanStandalone }, `📏 Passer le ${bilanStatus().label.toLowerCase()}`))));
    }),
    h('section', { class: `card chapter ${ch >= MAINTENANCE ? 'current' : 'locked'}` },
      h('div', { class: 'card-head' }, h('h3', null, 'Entretien'), h('span', { class: 'tag' }, ch >= MAINTENANCE ? 'en cours' : 'après le chapitre 6')),
      h('p', { class: 'small muted' }, 'Le Coffre au quotidien, des sessions de rappel espacées, et un bilan chaque mois, sur le modèle des séances de rappel de l’essai ACTIVE.')),
  );
}

// --- Progrès --------------------------------------------------------------------------

function retentionChart() {
  const weeks = retentionByWeek(12);
  const W = 300, H = 120, bw = W / weeks.length;
  const bars = weeks.map((w, i) => {
    if (w.rate == null) return `<rect x="${i * bw + 3}" y="${H - 4}" width="${bw - 6}" height="2" fill="var(--line)"/>`;
    const hh = Math.max(2, w.rate * (H - 20));
    return `<rect x="${i * bw + 3}" y="${H - hh}" width="${bw - 6}" height="${hh}" rx="3" fill="var(--accent)"><title>${Math.round(w.rate * 100)} % (${w.n} rappels)</title></rect>` + (w.n ? `<text x="${i * bw + bw / 2}" y="${H - hh - 4}" text-anchor="middle" font-size="9" fill="var(--muted)">${Math.round(w.rate * 100)}</text>` : '');
  }).join('');
  const target = H - S.profile.retention * (H - 20);
  return `<svg viewBox="0 0 ${W} ${H + 14}" width="100%"><line x1="0" x2="${W}" y1="${target}" y2="${target}" stroke="var(--gold)" stroke-dasharray="4 3"/><text x="${W - 2}" y="${target - 3}" text-anchor="end" font-size="9" fill="var(--gold)">cible ${Math.round(S.profile.retention * 100)} %</text>${bars}<text x="0" y="${H + 12}" font-size="9" fill="var(--muted)">il y a 12 semaines</text><text x="${W}" y="${H + 12}" text-anchor="end" font-size="9" fill="var(--muted)">cette semaine</text></svg>`;
}

function progresView() {
  const r = rank();
  const ret = retention7(30);
  const ins = difficultyInsight();
  const bilans = S.bilans.filter((b) => b.done);
  const baseline = bilans.filter((b) => b.trial)[1] || null;
  const latest = bilans[bilans.length - 1];
  const bs = bilanStatus();
  const lastCheck = S.checkins[S.checkins.length - 1];
  return h('div', null,
    skyHeader('Progrès'),
    h('section', { class: 'card' },
      h('div', { class: 'card-head' }, h('h2', null, `🏅 ${r.name}`), h('span', { class: 'tag' }, `${S.points.total} points`)),
      r.next ? h('div', null, h('div', { class: 'bar big' }, h('div', { style: { width: `${r.progress * 100}%` } })), h('p', { class: 'muted small' }, `${r.next.min - S.points.total} points avant ${r.next.name}`)) : h('p', null, 'Rang le plus haut atteint. Bravo !'),
      h('details', { class: 'why' }, h('summary', null, 'Comment gagne-t-on des points ?'),
        h('ul', { class: 'kv' }, [
          ['Rappel en fin de session (le jour même)', '2'], ['Rappel le lendemain', '5'], ['Rappel 7 jours ou plus après', '10'], ['Rappel 30 jours ou plus après', '20'],
          ['Réponse tapée (rappel libre)', '× 1,5'], ['« Ma vie » retrouvé le soir', '5'], ['Mission du jour terminée', '10'], ['Consigne du soir tenue', '5'],
          ['Test de maîtrise réussi', '50'], ['Exercice annexe', '1, max 10/jour'],
        ].map(([a, b]) => h('li', null, h('span', null, a), h('strong', null, b)))),
        h('p', { class: 'muted small' }, 'Aucun point n’est retiré pour une erreur : une erreur corrigée aide à apprendre.'),
        h('p', { class: 'muted small' }, RANKS.map((x) => `${x.name} ${x.min}`).join(' · ')))),
    h('section', { class: 'card' },
      h('div', { class: 'card-head' }, h('h2', null, '🎯 Rétention à 7 jours'), h('span', { class: 'tag' }, ret.rate == null ? '—' : `${Math.round(ret.rate * 100)} %`)),
      h('p', { class: 'muted small' }, 'L’indicateur principal : la part des éléments retrouvés lors d’une révision qui arrive au moins 7 jours après la précédente. Contrairement aux scores des jeux, il mesure ce que tu retiens vraiment.'),
      h('div', { class: 'chart', html: retentionChart() }),
      ret.n < 10 && h('p', { class: 'muted small' }, 'Il faut deux ou trois semaines de pratique pour que cette courbe ait du sens.')),
    ins && h('section', { class: 'card accent' }, h('h3', null, '💡 Ce qui t’a semblé difficile'),
      h('p', null, `Les éléments notés « difficiles » au premier rappel ont été retrouvés à ${Math.round(ins.hard * 100)} % une semaine plus tard, contre ${Math.round(ins.easy * 100)} % pour ceux notés « faciles ».`),
      h('p', { class: 'muted small' }, ins.hard >= ins.easy ? 'L’effort a payé : ce qui coûte à apprendre tient souvent mieux.' : 'Les éléments difficiles tiennent un peu moins bien : c’est pour ça qu’ils reviennent plus souvent.')),
    h('section', { class: 'card' },
      h('div', { class: 'card-head' }, h('h2', null, '📏 Bilans'), h('span', { class: 'tag' }, bs.available ? 'disponible' : `dans ${bs.inDays} j`)),
      h('p', { class: 'muted small' }, 'Une mesure séparée des jeux, sur du contenu jamais vu : 15 mots (tout de suite et 20 minutes après), 6 visages, empan de chiffres. Les deux premiers servent d’essai.'),
      bilans.length ? h('table', { class: 'table' },
        h('thead', null, h('tr', null, ['Date', 'Mots', '20 min', 'Visages', 'Empan'].map((t) => h('th', null, t)))),
        h('tbody', null, bilans.map((b) => h('tr', { class: b.trial ? 'trial' : '' }, h('td', null, fmtDay(b.day, { day: 'numeric', month: 'short' }), b.trial ? h('small', { class: 'muted' }, ' essai') : null), h('td', null, `${b.w1}/15`), h('td', null, b.w2 == null ? '—' : `${b.w2}/15`), h('td', null, `${b.faces}/6`), h('td', null, b.span || '—'))))) : h('p', { class: 'muted' }, 'Aucun bilan pour l’instant.'),
      baseline && latest && latest !== baseline && h('p', { class: 'small' }, `Depuis ton bilan de départ : mots ${signed(latest.w1 - baseline.w1)}, visages ${signed(latest.faces - baseline.faces)}, empan ${signed((latest.span || 0) - (baseline.span || 0))}.`),
      bs.available && !delayedReady() && h('button', { class: 'btn secondary', onclick: runBilanStandalone }, `Passer le ${bs.label.toLowerCase()}`)),
    h('section', { class: 'card' },
      h('h2', null, '🧩 Niveaux par technique'),
      h('p', { class: 'muted small' }, 'On monte d’un niveau après deux rappels du lendemain réussis à 80 % ou plus.'),
      h('ul', { class: 'kv' }, TECH_ORDER.map((t) => h('li', null, h('span', null, `${TECHS[t].icon} ${TECHS[t].name}`), techUnlocked(t) ? levelChip(t) : h('small', { class: 'muted' }, '🔒'))))),
    h('section', { class: 'card' },
      h('h2', null, '🎖️ Badges'),
      h('div', { class: 'badges' }, BADGES.map((b) => h('button', { class: `badge ${S.badges[b.id] ? 'on' : ''}`, onclick: () => sheet({ title: `${b.icon} ${b.name}`, text: `${b.desc}${S.badges[b.id] ? ` · obtenu le ${fmtDay(S.badges[b.id], { day: 'numeric', month: 'long' })}` : ''}` }) }, h('span', { class: 'badge-icon' }, b.icon), h('small', null, b.name))))),
    lastCheck && h('section', { class: 'card' },
      h('h3', null, '💬 Ton ressenti'),
      h('p', { class: 'small' }, `Dernier point : « ${['', 'rarement', 'parfois', 'souvent'][lastCheck.retained]} » retenu, technique utilisée : ${lastCheck.used ? 'oui' : 'non'}.`),
      h('p', { class: 'muted small' }, 'Le ressenti dépend beaucoup de l’humeur et peu des performances réelles. Il est suivi ici, mais n’est jamais présenté comme une preuve de progrès.')),
    h('section', { class: 'card note' },
      h('h3', null, 'Ce que l’app promet, et ce qu’elle ne promet pas'),
      h('p', { class: 'small' }, 'Elle t’apprend les techniques des champions de mémoire et mesure ce que tu retiens vraiment après une semaine. Elle ne rend pas plus intelligent, ne rajeunit pas le cerveau et ne protège pas contre une maladie : ces effets ne sont pas démontrés.'),
      h('p', { class: 'small muted' }, 'Si tu t’inquiètes d’une baisse de ta mémoire, le bon réflexe est d’en parler à ton médecin.')),
  );
}

const signed = (n) => (n > 0 ? `+${n}` : String(n));

// --- Réglages -----------------------------------------------------------------------------

// Bloc « Notifications » des Réglages ; se redessine après chaque action.
function notifBlock() {
  const box = h('div', { class: 'stack' });
  const run = async (btn, fn, done) => {
    btn.disabled = true;
    try { await fn(); if (done) toast(done, 'ok'); } catch (e) { toast(e.message); }
    draw();
    render();
  };
  const draw = () => {
    const st = notifStatus();
    const what = h('p', { class: 'muted small' }, 'Tu reçois : la mission du jour à l’heure choisie, ce que tu as rangé dans « Ma vie » quand vient le moment de le retrouver, le rappel différé du bilan, et un mot le lendemain matin si tu as raté l’étoile du ciel. La consigne elle-même reste sans rappel : t’en souvenir seul, c’est l’exercice.');
    if (st === 'install') box.replaceChildren(h('p', { class: 'small' }, '📲 Pour recevoir les notifications, installe d’abord l’app : dans Safari, Partager puis « Sur l’écran d’accueil ». Ouvre-la ensuite depuis son icône et reviens ici.'), what);
    else if (st === 'unsupported') box.replaceChildren(h('p', { class: 'small' }, 'Ce navigateur ne sait pas recevoir de notifications. Sur iPhone, il faut iOS 16.4 ou plus récent, avec l’app installée sur l’écran d’accueil.'));
    else if (st === 'denied') box.replaceChildren(h('p', { class: 'small' }, '🔕 Les notifications sont bloquées. Réautorise-les dans les Réglages de l’iPhone → Notifications → Kikory.'), what);
    else if (st === 'off') {
      const b = h('button', { class: 'btn primary', onclick: () => run(b, enableNotifs, 'Notifications activées 🔔') }, '🔔 Activer les notifications');
      box.replaceChildren(b, what);
    } else {
      const test = h('button', { class: 'btn secondary small', onclick: () => run(test, testNotif, 'Notification d’essai en route : elle arrive d’ici une minute.') }, 'Envoyer un essai');
      const off = h('button', { class: 'btn ghost small', onclick: () => run(off, disableNotifs, 'Notifications désactivées') }, 'Désactiver');
      box.replaceChildren(h('p', { class: 'small' }, '🔔 Notifications activées sur cet appareil.'), what, h('div', { class: 'row wrap' }, test, off));
    }
  };
  draw();
  return box;
}

async function shareFile(filename, text, mime) {
  const file = new File([text], filename, { type: mime });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: filename }); return true; } catch (e) { if (e.name === 'AbortError') return false; }
  }
  const url = URL.createObjectURL(file);
  const a = h('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return true;
}

async function exportBackup() {
  const ok = await shareFile(`kikory-${dayKey()}.json`, exportJSON(), 'application/json');
  if (ok) { S.lastBackup = Date.now(); save(); toast('Sauvegarde exportée 💾', 'ok'); render(); }
}

function openSettings() {
  const stage = new Stage('Réglages', { confirmClose: false, onClose: render });
  const P = S.profile;
  const fName = input({ value: P.name, placeholder: 'Ton prénom', autocapitalize: 'words' });
  const fAnchor = input({ value: P.anchor, placeholder: 'Après mon café', autocapitalize: 'sentences' });
  const fTime = h('input', { type: 'time', value: P.reminderTime });
  const days = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  const dayBtns = h('div', { class: 'day-picker' }, [1, 2, 3, 4, 5, 6, 0].map((d) => {
    const b = h('button', { class: `day ${P.fullDays.includes(d) ? 'on' : ''}`, onclick: () => {
      P.fullDays = P.fullDays.includes(d) ? P.fullDays.filter((x) => x !== d) : [...P.fullDays, d];
      b.classList.toggle('on');
      save();
    } }, days[d]);
    return b;
  }));
  const select = (value, options, onchange) => {
    const s = h('select', { onchange: (e) => onchange(e.target.value) }, options.map(([v, l]) => h('option', { value: v, selected: String(v) === String(value) }, l)));
    return s;
  };
  const fileIn = h('input', { type: 'file', accept: 'application/json,.json', style: { display: 'none' }, onchange: async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const text = await f.text();
      if (await sheet({ title: 'Importer cette sauvegarde ?', text: 'Elle remplacera toutes les données actuelles.', buttons: [{ label: 'Importer', value: true, kind: 'danger' }, { label: 'Annuler', value: false }] })) {
        importJSON(text);
        location.reload();
      }
    } catch (err) { toast(`Import impossible : ${err.message}`); }
  } });
  const saveProfile = () => { P.name = fName.value.trim(); P.anchor = fAnchor.value.trim() || 'Après mon café'; P.reminderTime = fTime.value || '08:30'; save(); };
  [fName, fAnchor, fTime].forEach((f) => f.addEventListener('change', saveProfile));

  const themes = [['auto', 'Automatique'], ['light', '☀️ Clair'], ['dark', '🌙 Foncé']];
  const themeChips = h('div', { class: 'chips' }, themes.map(([v, l]) => h('button', {
    class: `chip ${(P.theme || 'auto') === v ? 'on' : ''}`, 'aria-pressed': String((P.theme || 'auto') === v),
    onclick: (e) => {
      P.theme = v;
      save();
      applyTheme();
      for (const c of themeChips.children) { c.classList.toggle('on', c === e.currentTarget); c.setAttribute('aria-pressed', String(c === e.currentTarget)); }
    },
  }, l)));

  const account = session();
  stage.show(h('div', { class: 'screen settings' },
    account && h('h3', null, 'Compte'),
    account && h('div', { class: 'check-row account-row' },
      h('span', { class: 'account-avatar' }, account.pseudo.slice(0, 1).toUpperCase()),
      h('span', { class: 'item-main' }, h('strong', null, account.pseudo), h('br'), h('small', { class: 'muted' }, 'Données sauvegardées sur ton compte'))),
    account && h('button', { class: 'btn secondary', onclick: async () => { try { await push(); toast('Données envoyées sur ton compte ✓', 'ok'); } catch (e) { toast(e.message); } } }, 'Synchroniser maintenant'),
    account && h('button', { class: 'btn ghost', onclick: confirmLogout }, 'Se déconnecter'),
    h('h3', null, 'Apparence'),
    themeChips,
    h('p', { class: 'muted small' }, 'Automatique suit le réglage clair ou sombre de ton iPhone.'),
    h('h3', null, 'Toi'),
    h('label', { class: 'field' }, h('span', null, 'Prénom'), fName),
    h('h3', null, 'Habitude'),
    h('p', { class: 'muted small' }, 'Accrocher la session à une routine existante marche aussi bien qu’une heure fixe. Il faut en moyenne deux mois pour qu’une habitude devienne automatique.'),
    h('label', { class: 'field' }, h('span', null, 'Je fais ma session…'), fAnchor),
    h('label', { class: 'field' }, h('span', null, 'Heure du rappel'), fTime),
    h('label', { class: 'field' }, h('span', null, 'Jours de session complète (les autres jours : Coffre seul, 5 min)'), dayBtns),
    h('h3', null, 'Notifications'),
    notifBlock(),
    h('h3', null, 'Widget'),
    widgetBlock(),
    h('h3', null, 'Révisions'),
    h('label', { class: 'field' }, h('span', null, 'Rétention visée'), select(P.retention, [[0.8, '80 % (moins de révisions)'], [0.85, '85 %'], [0.9, '90 % (recommandé)'], [0.95, '95 % (beaucoup de révisions)']], (v) => { P.retention = Number(v); save(); })),
    h('label', { class: 'field' }, h('span', null, 'Plafond de révisions par jour'), select(P.reviewCap, [[15, '15'], [20, '20'], [30, '30 (recommandé)'], [45, '45'], [60, '60']], (v) => { P.reviewCap = Number(v); save(); })),
    h('label', { class: 'field' }, h('span', null, "Langue de « Mots d'ailleurs »"), select(P.language, Object.entries(LANGUAGES).map(([k, l]) => [k, `${l.flag} ${l.name}`]), (v) => { P.language = v; save(); })),
    h('h3', null, 'Sauvegarde'),
    h('p', { class: 'muted small' }, `${account ? 'Tes données sont aussi copiées sur ton compte.' : 'Tes données restent sur cet appareil.'} ${S.lastBackup ? `Dernière sauvegarde : ${fmtDay(dayKey(S.lastBackup), { day: 'numeric', month: 'long' })}.` : 'Aucune sauvegarde pour l’instant.'}`),
    h('div', { class: 'row wrap' }, h('button', { class: 'btn secondary', onclick: exportBackup }, '💾 Exporter'), h('button', { class: 'btn secondary', onclick: () => fileIn.click() }, '📂 Importer'), fileIn),
    h('h3', null, 'À propos'),
    h('details', { class: 'why' }, h('summary', null, 'Sur quoi repose l’app'),
      h('ul', null, [
        'Se tester bat relire, et espacer les révisions peut améliorer le rappel jusqu’à 150 % (FSRS calcule le bon moment).',
        'Les stratégies (palais de mémoire, mot-clé, nom-visage) sont l’entraînement qui change vraiment la donne : 26 → 62 mots en 40 jours chez des débutants (Dresler et al., 2017).',
        'Les jeux de mémoire de travail améliorent surtout… ces jeux : ici, ils servent d’échauffement.',
        'La gamification fait revenir, pas progresser : les points récompensent ce que tu retiens dans la durée.',
        'On mesure avec des contenus jamais vus ; l’indicateur clé est la rétention à 7 jours.',
      ].map((t) => h('li', { class: 'small' }, t))),
      h('p', { class: 'muted small' }, 'Ce n’est pas un outil médical ni de dépistage.')),
    h('h3', null, 'Zone sensible'),
    h('button', { class: 'btn danger', onclick: async () => {
      if (await sheet({ title: 'Tout effacer ?', text: 'Toutes tes données (Coffre, progrès, ville) seront supprimées de cet appareil. Exporte une sauvegarde avant si tu veux les garder.', buttons: [{ label: 'Tout effacer', value: true, kind: 'danger' }, { label: 'Annuler', value: false }] })) { resetAll(); location.reload(); }
    } }, 'Réinitialiser l’application'),
    h('div', { class: 'center', html: owlSVG(40) }),
    h('p', { class: 'muted small center' }, 'Kikory · v1'),
    swReg && h('div', { class: 'row center' }, h('button', { class: 'btn ghost small', onclick: async (e) => {
      const b = e.currentTarget;
      b.disabled = true;
      try { toast(await checkForUpdate() ? 'Nouvelle version trouvée : l’app va redémarrer…' : 'Tu as déjà la dernière version ✓', 'ok'); } catch (err) { toast('Impossible de vérifier : es-tu connecté à internet ?'); }
      b.disabled = false;
    } }, 'Rechercher une mise à jour')),
  ));
}

// --- Premier lancement ------------------------------------------------------------------------

async function onboarding() {
  const stage = new Stage('Bienvenue', { confirmClose: false });
  stage.el.querySelector('.stage-head .icon-btn').style.visibility = 'hidden';
  stage.setProgress(null);
  try {
    await screen(stage, {
      icon: h('span', { html: owlSVG(88) }), title: 'Kikory',
      text: ['Retiens mieux ce qu’on te dit, et ce que tu choisis d’apprendre.', 'L’app s’appuie sur ce que la recherche a démontré : se tester plutôt que relire, espacer les révisions, et apprendre les stratégies des champions de mémoire.'],
      body: h('div', { class: 'promise' }, h('p', null, '✓ Retenir les prénoms, les chiffres, les consignes'), h('p', null, '✓ Mesurer ce que tu retiens vraiment après une semaine'), h('p', { class: 'muted' }, '✗ Pas de « cerveau plus jeune » ni de promesse médicale')),
      buttons: [{ label: 'Commencer' }],
    });
    const fName = input({ placeholder: 'Ton prénom', autocapitalize: 'words', 'data-autofocus': '' });
    const fAnchor = input({ placeholder: 'Après mon café', value: S.profile.anchor, autocapitalize: 'sentences' });
    const fTime = h('input', { type: 'time', value: S.profile.reminderTime });
    await screen(stage, {
      icon: '☕', title: 'Une habitude',
      text: '10 à 15 minutes par jour, accrochées à un moment de ta routine. L’objectif : tenir 60 jours, avec deux jokers par semaine.',
      body: h('div', { class: 'stack' }, h('label', { class: 'field' }, h('span', null, 'Comment t’appelles-tu ?'), fName), h('label', { class: 'field' }, h('span', null, 'Je ferai ma session…'), fAnchor), h('label', { class: 'field' }, h('span', null, 'Vers quelle heure ?'), fTime)),
      buttons: [{ label: 'Suivant' }],
    });
    S.profile.name = fName.value.trim();
    S.profile.anchor = fAnchor.value.trim() || 'Après mon café';
    S.profile.reminderTime = fTime.value || '08:30';
    await screen(stage, {
      icon: '🗝️', title: 'Comment ça marche',
      body: h('ul', { class: 'how' },
        h('li', null, h('strong', null, 'Ma vie : '), 'tu saisis en 10 secondes ce qu’on te dit d’important. L’app te le redemande le soir, puis à intervalles croissants.'),
        h('li', null, h('strong', null, 'Le Coffre : '), 'tes révisions du jour, en rappel libre, juste avant l’oubli.'),
        h('li', null, h('strong', null, 'Les techniques : '), 'palais de mémoire, prénoms, chiffres, messages oraux… une par session, avec un rappel le lendemain.'),
        h('li', null, h('strong', null, 'Le parcours : '), 'un prologue et six chapitres sur environ 8 semaines. On commence par un bilan, passé deux fois.')),
      buttons: [{ label: 'Suivant' }],
    });
    await screen(stage, {
      icon: '📲', title: 'Sur ton iPhone',
      text: ['Dans Safari, touche Partager puis « Sur l’écran d’accueil » : l’app s’ouvre en plein écran, marche hors ligne et peut t’envoyer tes rappels en notification (à activer depuis l’accueil ou les Réglages).', session() ? 'Tes données sont sauvegardées sur ton compte : tu les retrouves en te connectant sur un autre téléphone.' : 'Tes données restent sur ton téléphone. Pense à exporter une sauvegarde de temps en temps (Réglages).'],
      buttons: [{ label: 'C’est parti !' }],
    });
    S.profile.onboarded = true;
    save(true);
  } catch (e) { if (e !== ABORT) console.error(e); }
  stage.close();
  render();
}

// --- Compte ----------------------------------------------------------------------------------

// Écran d'entrée : créer un compte ou se connecter, avec un identifiant et un mot de passe.
function authView(mode = 'signup') {
  const signupMode = mode === 'signup';
  const fPseudo = input({ placeholder: 'martin', autocomplete: 'username', 'aria-label': 'Identifiant', 'data-autofocus': '' });
  const fPass = h('input', { type: 'password', placeholder: '6 caractères minimum', autocomplete: signupMode ? 'new-password' : 'current-password', 'aria-label': 'Mot de passe' });
  const err = h('p', { class: 'auth-error', role: 'alert' });
  const btn = h('button', { class: 'btn primary block', type: 'submit' }, signupMode ? 'Créer mon compte' : 'Me connecter');
  const submit = async (e) => {
    e.preventDefault();
    err.textContent = '';
    const pseudo = fPseudo.value.trim().toLowerCase(), pass = fPass.value;
    if (pseudo.length < 3) { err.textContent = 'Choisis un identifiant d’au moins 3 caractères.'; fPseudo.focus(); return; }
    if (pass.length < 6) { err.textContent = 'Le mot de passe doit faire au moins 6 caractères.'; fPass.focus(); return; }
    btn.disabled = true;
    btn.textContent = signupMode ? 'Création…' : 'Connexion…';
    try {
      if (signupMode) { await signup(pseudo, pass); start(); return; }
      if (await login(pseudo, pass)) { location.reload(); return; }
      start();
    } catch (ex) {
      err.textContent = ex.message;
      btn.disabled = false;
      btn.textContent = signupMode ? 'Créer mon compte' : 'Me connecter';
    }
  };
  [fPseudo, fPass].forEach((f) => f.addEventListener('input', () => { err.textContent = ''; }));
  app.replaceChildren(h('main', { class: 'view auth' },
    h('div', { class: 'auth-head' },
      h('div', { class: 'auth-owl', html: owlSVG(84) }),
      h('h1', null, 'Kikory'),
      h('p', { class: 'lead' }, 'Entraîne ta mémoire avec ce que la science a démontré.')),
    h('form', { class: 'card auth-card', onsubmit: submit, novalidate: true },
      h('div', { class: 'chips auth-tabs' },
        h('button', { type: 'button', class: `chip ${signupMode ? 'on' : ''}`, 'aria-pressed': String(signupMode), onclick: () => authView('signup') }, 'Créer un compte'),
        h('button', { type: 'button', class: `chip ${signupMode ? '' : 'on'}`, 'aria-pressed': String(!signupMode), onclick: () => authView('login') }, 'J’ai déjà un compte')),
      h('label', { class: 'field' }, h('span', null, 'Identifiant'), fPseudo),
      h('label', { class: 'field' }, h('span', null, 'Mot de passe'), fPass),
      err,
      btn,
      h('p', { class: 'muted small center' }, signupMode ? 'Tes données seront sauvegardées sur ton compte : tu les retrouves sur n’importe quel téléphone.' : 'Les données de ton compte remplaceront celles de ce téléphone.'))));
  setTimeout(() => fPseudo.focus(), 60);
}

async function confirmLogout() {
  if (!(await sheet({ title: 'Se déconnecter ?', text: 'Tes données restent sur ton compte. Elles seront effacées de ce téléphone, pour qu’une autre personne puisse s’y connecter.', buttons: [{ label: 'Se déconnecter', value: true, kind: 'danger' }, { label: 'Annuler', value: false }] }))) return;
  await logout();
  location.reload();
}

// À l'ouverture, et au retour dans l'app : reprend les données du compte si elles sont plus récentes ailleurs.
async function syncFromCloud() {
  if (!cloudEnabled() || !session()) return;
  try {
    if (await pullIfNewer() && !document.body.classList.contains('stage-open')) location.reload();
  } catch (e) {
    if (e.code === 'session') { toast(e.message); authView('login'); }
  }
}

// --- Démarrage --------------------------------------------------------------------------------

function start() {
  updateStreak();
  checkChapter();
  checkBadges();
  render();
}

applyTheme();
addEventListener('scroll', () => document.documentElement.style.setProperty('--edge', `${Math.max(0, Math.min(scrollY, 32))}px`), { passive: true });
document.addEventListener('touchstart', () => {}, { passive: true }); // sans écouteur tactile, Safari iOS n'applique pas :active
navigator.storage?.persist?.();
if (cloudEnabled() && !session()) authView();
else { start(); syncFromCloud(); checkNotifs().catch(() => {}); }
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || document.body.classList.contains('stage-open') || (cloudEnabled() && !session())) return;
  updateStreak();
  render();
  syncFromCloud();
  checkNotifs().catch(() => {});
});

// --- Mises à jour -----------------------------------------------------------------------------
// L'iPhone reprend l'app sans la recharger : on cherche une nouvelle version à chaque retour dans l'app,
// et dès qu'elle est installée on recharge, sauf au milieu d'un exercice (une bannière attend alors sur l'accueil).

function updateBanner() {
  if (!updateReady) return null;
  return h('section', { class: 'card banner accent' },
    h('div', null, h('strong', null, '✨ Nouvelle version prête'), h('p', { class: 'small muted' }, 'Touche « Mettre à jour » : l’app redémarre en gardant toutes tes données.')),
    h('button', { class: 'btn primary small', onclick: () => location.reload() }, 'Mettre à jour'));
}

// Depuis les Réglages : renvoie true si une nouvelle version est en cours d'installation.
async function checkForUpdate() {
  if (!swReg) return false;
  await swReg.update();
  return Boolean(swReg.installing || swReg.waiting);
}

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const hadController = Boolean(navigator.serviceWorker.controller); // au tout premier lancement, pas de « mise à jour »
  navigator.serviceWorker.register('./sw.js').then((reg) => { swReg = reg; }).catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || updateReady) return;
    updateReady = true;
    if (!document.body.classList.contains('stage-open')) location.reload();
    else toast('Nouvelle version prête : elle s’installera à la fin de l’exercice.');
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (updateReady && !document.body.classList.contains('stage-open')) location.reload();
    else swReg?.update().catch(() => {});
  });
}
