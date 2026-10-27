// Déroulé de la mission du jour et lancement des jeux.
import { h, Stage, screen, ABORT, toast, sheet } from './core/ui.js';
import { S, save, dayKey, addDays, dayStart, weekday, weekKey, sample } from './core/store.js';
import { sessionToday, queue, completeSession, techniqueOfDay, TECHS, streakCount, jokersLeft, activeProspective, STAR_COLORS, retention7, CHAPTERS, MAINTENANCE, createItem, techUnlocked } from './core/engine.js';
import { runReviews, coffreSummary } from './games/coffre.js';
import { runBilan, runDelayed } from './games/bilan.js';
import { encodeStory } from './games/filrouge.js';
import { GAME_WORDS } from './data/words.js';
import * as filrouge from './games/filrouge.js';
import * as croquis from './games/croquis.js';
import * as quiestce from './games/quiestce.js';
import * as code from './games/code.js';
import * as palais from './games/palais.js';
import * as mots from './games/mots.js';
import * as lecture from './games/lecture.js';
import * as message from './games/message.js';
import * as ouestil from './games/ouestil.js';
import * as echo from './games/echo.js';

export const GAMES = { filrouge, croquis, quiestce, code, palais, mots, lecture, message, ouestil, echo };

let refresh = () => {};
export function onRefresh(fn) { refresh = fn; }

async function guard(fn) {
  try { await fn(); } catch (e) { if (e !== ABORT) { console.error(e); toast('Oups, une erreur est survenue.'); } }
  refresh();
}

const finalRecall = (stage) => (text) => screen(stage, { icon: '🔁', title: 'Rappel final', text: [text, 'Pas d’aide, pas de retour en arrière : c’est l’effort de rappel qui ancre le souvenir.'], buttons: [{ label: 'Je suis prêt' }] });

const STEP_LABEL = { warmup: ['〰️', 'Échauffement', '2 min'], coffre: ['🗝️', 'Le Coffre', '5 min'], technique: ['✨', 'Technique du jour', '6 min'], bilan: ['🌙', 'Bilan du jour', '1 min'] };

export function sessionSteps(s = sessionToday()) {
  if (s.kind === 'full') return ['warmup', 'coffre', 'technique', 'bilan'];
  return s.extra ? ['coffre', 'technique', 'bilan'] : ['coffre', 'bilan'];
}

export function techLabel(tech) {
  if (tech === 'bilan') return '📏 Bilan initial';
  return `${TECHS[tech].icon} ${TECHS[tech].name}`;
}

export function runSession() {
  return guard(async () => {
    const s = sessionToday();
    if (!s.tech) { s.tech = techniqueOfDay(); save(); }
    const stage = new Stage('Mission du jour', { onClose: refresh });
    try {
      const steps = sessionSteps(s);
      if (!steps.some((k) => s.steps[k])) {
        await screen(stage, {
          icon: '🎯', title: s.kind === 'full' ? 'Session complète' : 'Révisions du jour',
          text: s.kind === 'full' ? 'Environ 15 minutes, et toujours un rappel à la fin.' : 'Aujourd’hui, juste le Coffre : environ 5 minutes. Les jours de session complète sont réglables.',
          body: h('ol', { class: 'steps' }, steps.map((k) => h('li', null, `${STEP_LABEL[k][0]} ${STEP_LABEL[k][1]}`, k === 'technique' ? ` : ${techLabel(s.tech)}` : '', h('span', { class: 'muted' }, ` · ${STEP_LABEL[k][2]}`)))),
          buttons: [{ label: 'C’est parti' }],
        });
      }
      for (;;) {
        const step = sessionSteps(s).find((k) => !s.steps[k]);
        if (!step) break;
        if (step === 'warmup') await GAMES.echo.play({ stage, warmup: true });
        if (step === 'coffre') {
          const q = queue();
          if (q.items.length) {
            if (q.catchup) await screen(stage, { icon: '🧭', title: 'Mode rattrapage', text: `Ton retard est étalé sur les prochains jours. Aujourd’hui : ${q.items.length} révisions, les plus urgentes d’abord.` });
            const r = await runReviews(stage, q.items);
            await coffreSummary(stage, r);
          } else if (s.kind === 'light') {
            const more = await screen(stage, { icon: '🗝️', title: 'Rien à réviser', text: 'Le Coffre est à jour. Tu peux t’arrêter là ou faire une technique.', buttons: [{ label: 'Terminer', value: false }, { label: 'Faire une technique', value: true, kind: 'secondary' }] });
            if (more) { s.extra = true; save(); }
          } else {
            await screen(stage, { icon: '🗝️', title: 'Le Coffre est à jour', text: 'Aucune révision due pour l’instant. Place à la technique du jour.' });
          }
        }
        if (step === 'technique') {
          if (s.tech === 'bilan') await runBilan(stage);
          else await GAMES[TECHS[s.tech].game].play({ stage, session: true, beforeRecall: finalRecall(stage) });
        }
        if (step === 'bilan') await endOfSession(stage, s);
        s.steps[step] = true;
        save();
      }
    } finally {
      stage.close();
    }
  });
}

async function endOfSession(stage, s) {
  const pts = completeSession();
  const today = dayKey();
  const lastWeek = S.log.filter((l) => l.ok && l.age >= 7 && dayKey(l.t) >= addDays(today, -6)).length;
  const p = activeProspective();
  const colorHex = p && STAR_COLORS.find((c) => c.id === p.color)?.hex;
  const ret = retention7();
  await screen(stage, {
    icon: '🌙', title: 'Mission terminée',
    body: h('div', { class: 'stack' },
      h('div', { class: 'summary-grid' },
        h('div', null, h('strong', null, `+${S.points.byDay[today] || 0}`), h('span', null, 'points aujourd’hui')),
        h('div', null, h('strong', null, `🔥 ${streakCount()}`), h('span', null, `jours · ${jokersLeft()} joker${jokersLeft() > 1 ? 's' : ''}`)),
        h('div', null, h('strong', null, lastWeek), h('span', null, 'souvenirs de 7 j+ retrouvés cette semaine')),
        h('div', null, h('strong', null, ret.rate == null ? '—' : `${Math.round(ret.rate * 100)} %`), h('span', null, 'rétention à 7 jours'))),
      p && p.day === today && h('div', { class: 'prospective-card' },
        h('div', { class: 'star big', style: { color: colorHex } }, '★'),
        h('div', null, h('strong', null, 'Consigne pour plus tard'), h('p', null, `${p.when}, en ouvrant l’application, touche l’étoile ${p.color} dans le ciel de l’accueil.`), h('p', { class: 'muted small' }, 'Je ne te le rappellerai pas : c’est l’exercice. Une aide externe (une alarme, un rappel) reste la meilleure solution dans la vraie vie, mais ici on entraîne la mémoire.'))),
      S.campaign.chapter < MAINTENANCE && h('p', { class: 'muted' }, `Chapitre en cours : ${CHAPTERS[S.campaign.chapter].title}. ${CHAPTERS[S.campaign.chapter].life}`)),
    buttons: [{ label: 'Terminer' }],
  });
}

export function runCoffreOnly() {
  return guard(async () => {
    const stage = new Stage('Le Coffre', { onClose: refresh });
    try {
      const q = queue();
      if (!q.items.length) { await screen(stage, { icon: '🗝️', title: 'Rien à réviser', text: q.later ? `${q.later} révision${q.later > 1 ? 's' : ''} plus tard dans la journée.` : 'Reviens demain !' }); return; }
      if (q.catchup) await screen(stage, { icon: '🧭', title: 'Mode rattrapage', text: `Ton retard est étalé sur les prochains jours. Aujourd’hui : ${q.items.length} révisions, les plus urgentes d’abord.` });
      const r = await runReviews(stage, q.items);
      const s = sessionToday();
      s.steps.coffre = true;
      save();
      await coffreSummary(stage, r, !s.done ? h('p', { class: 'muted' }, 'Pense à terminer ta mission du jour depuis l’accueil.') : null);
    } finally { stage.close(); }
  });
}

export function playGame(id, opts = {}) {
  return guard(async () => {
    const stage = new Stage(opts.title || '', { onClose: refresh });
    try { await GAMES[id].play({ stage, annex: true, ...opts }); } finally { stage.close(); }
  });
}

export function runBilanStandalone() {
  return guard(async () => {
    const stage = new Stage('Bilan', { onClose: refresh });
    try { await runBilan(stage); } finally { stage.close(); }
  });
}

export function runDelayedRecall() {
  return guard(async () => {
    const stage = new Stage('Bilan', { onClose: refresh });
    try { await runDelayed(stage); } finally { stage.close(); }
  });
}

export function runFreeReview(src) {
  return guard(async () => {
    const items = Object.values(S.items).filter((i) => !src || i.src === src).sort((a, b) => (a.m.last || 0) - (b.m.last || 0)).slice(0, 20);
    const stage = new Stage('Révision libre', { onClose: refresh });
    try {
      if (!items.length) { await screen(stage, { icon: '🗂️', title: 'Rien ici', text: 'Aucun élément dans ce thème pour l’instant.' }); return; }
      const r = await runReviews(stage, items, { ctx: 'f', title: 'Révision libre' });
      await coffreSummary(stage, r);
    } finally { stage.close(); }
  });
}

export function weekendAvailable() {
  const wd = weekday(dayKey());
  return (wd === 6 || wd === 0) && S.campaign.chapter >= 1 && S.records.weekend !== weekKey(dayKey());
}

export function runWeekend() {
  return guard(async () => {
    const stage = new Stage('Défi du week-end', { onClose: refresh });
    try {
      if (!weekendAvailable()) { await screen(stage, { icon: '🗓️', title: 'Revenez samedi', text: 'Le défi se joue le samedi ou le dimanche, et se restitue le lundi.' }); return; }
      await screen(stage, { icon: '🗓️', title: 'Défi du week-end', text: ['15 objets à relier en une histoire (ou à ranger dans ton palais mental).', 'Pas de rappel aujourd’hui : la liste reviendra lundi dans le Coffre. Deux nuits de sommeil entre les deux !'], buttons: [{ label: 'Relever le défi' }] });
      const words = sample(GAME_WORDS, 15);
      const story = await encodeStory(stage, words);
      const wd = weekday(dayKey());
      const delay = wd === 6 ? 2 : 1;
      createItem({ type: 'list', src: 'weekend', prompt: 'Défi du week-end', answer: words, hint: story, extra: { ordered: true }, firstDelay: delay });
      S.records.weekend = weekKey(dayKey());
      save();
      await screen(stage, { icon: '📅', title: 'Rendez-vous lundi', text: 'La liste t’attendra dans le Coffre.' });
    } finally { stage.close(); }
  });
}

// Construction guidée d'un palais, puis un premier remplissage tout de suite (accessible dès le jour 1).
export function runPalaceBuilder() {
  return guard(async () => {
    const stage = new Stage('Ton palais', { onClose: refresh });
    try {
      const p = await palais.buildPalace(stage);
      const now = await screen(stage, {
        icon: '🏛️', title: 'Ton palais est prêt',
        text: [`${p.name} : ${p.loci.length} lieux.`, 'Le meilleur moyen de l’ancrer : y déposer tout de suite quelques objets, puis refaire la promenade.'],
        buttons: [{ label: 'Le remplir maintenant', value: true }, { label: 'Plus tard', value: false }],
      });
      if (!now) return;
      stage.setTitle('Le Palais');
      await palais.play({ stage, annex: true, palace: p, size: palais.fillSize(p) });
    } finally { stage.close(); }
  });
}

export function startTechnique(tech) {
  const unlocked = techUnlocked(tech);
  return playGame(TECHS[tech].game, { title: TECHS[tech].name, annex: true, locked: !unlocked });
}

export { dayStart, sheet };
