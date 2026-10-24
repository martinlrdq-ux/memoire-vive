// Bilan : mesure séparée des jeux, sur du contenu jamais vu.
// 15 mots (immédiat puis 20 minutes plus tard), 6 paires nom-visage, empan de chiffres.
import { h, screen, input, onEnter, listScore, matchAnswer, digitsOf } from '../core/ui.js';
import { S, save, uid, dayKey, shuffle, rng } from '../core/store.js';
import { BILAN_WORDS } from '../data/words.js';
import { faceSVG } from '../core/faces.js';
import { bilanStatus, checkChapter } from '../core/engine.js';
import { makePeople } from './quiestce.js';
import { recallFree } from './common.js';

export const DELAY_MIN = 20;

function nextSeries() {
  const all = shuffle(BILAN_WORDS, rng(S.seed));
  const count = Math.floor(all.length / 15);
  const k = S.usedPools.bilanSeries % count;
  S.usedPools.bilanSeries++;
  save();
  return all.slice(k * 15, k * 15 + 15);
}

async function partWords(stage, words) {
  await screen(stage, { icon: '1️⃣', title: '15 mots', text: 'Des mots vont s’afficher un par un. Retiens-en le plus possible, comme tu veux. Tu les écriras juste après, puis une seconde fois dans 20 minutes.', buttons: [{ label: 'Commencer' }] });
  const big = h('div', { class: 'big-word' });
  const count = h('div', { class: 'muted center' });
  stage.show(h('div', { class: 'screen center-screen' }, count, big));
  for (let i = 0; i < words.length; i++) {
    count.textContent = `${i + 1} / ${words.length}`;
    big.textContent = words[i];
    await stage.wait(2000);
    big.textContent = '';
    await stage.wait(300);
  }
  const ans = await recallFree(stage, { title: 'Les mots', subtitle: 'Tous ceux dont tu te souviens, dans n’importe quel ordre.', n: 15 });
  return listScore(ans, words, false).score;
}

async function partFaces(stage) {
  const people = makePeople(6);
  await screen(stage, { icon: '2️⃣', title: '6 visages', text: 'Six personnes se présentent, quatre secondes chacune. Retiens leur prénom.', buttons: [{ label: 'Commencer' }] });
  for (const p of people) {
    stage.show(h('div', { class: 'screen center-screen' }, h('div', { class: 'face', html: faceSVG(p.seed, p.female, 160) }), h('div', { class: 'big-word' }, p.name)));
    await stage.wait(4000);
  }
  let ok = 0;
  for (const p of shuffle(people)) {
    const ans = await stage.ask((done) => {
      const f = input({ placeholder: 'Prénom', autocapitalize: 'words', 'data-autofocus': '' });
      onEnter(f, () => done(f.value));
      return h('div', { class: 'screen' }, h('div', { class: 'face', html: faceSVG(p.seed, p.female, 150) }), f, h('div', { class: 'screen-actions' }, h('button', { class: 'btn primary', onclick: () => done(f.value) }, 'Valider')));
    });
    if (matchAnswer(ans, p.name)) ok++;
  }
  return ok;
}

async function partSpan(stage) {
  await screen(stage, { icon: '3️⃣', title: 'Empan de chiffres', text: 'Une suite de chiffres s’affiche, un chiffre à la fois. Retape-la dans l’ordre. Elle s’allonge tant que tu réussis.', buttons: [{ label: 'Commencer' }] });
  let len = 4, best = 0, fails = 0;
  while (len <= 14) {
    const digits = Array.from({ length: len }, () => Math.floor(Math.random() * 10)).join('');
    const big = h('div', { class: 'big-digits mono' });
    stage.show(h('div', { class: 'screen center-screen' }, h('div', { class: 'muted center' }, `${len} chiffres`), big));
    await stage.wait(500);
    for (const d of digits) { big.textContent = d; await stage.wait(800); big.textContent = ''; await stage.wait(200); }
    const ans = await stage.ask((done) => {
      const f = input({ inputmode: 'numeric', placeholder: 'Les chiffres', 'data-autofocus': '' });
      onEnter(f, () => done(f.value));
      return h('div', { class: 'screen' }, h('h2', null, 'Retape la suite'), f, h('div', { class: 'screen-actions' }, h('button', { class: 'btn primary', onclick: () => done(f.value) }, 'Valider')));
    });
    if (digitsOf(ans) === digits) { best = len; len++; fails = 0; } else if (++fails >= 2) break;
  }
  return best;
}

export async function runBilan(stage) {
  const st = bilanStatus();
  await screen(stage, {
    icon: '📏', title: st.label,
    text: [
      'Trois petites épreuves, environ 6 minutes, puis un rappel de 1 minute dans 20 minutes.',
      st.trial ? 'Les deux premiers bilans servent d’essai : refaire un test fait toujours monter le score au début, même sans progrès réel. On compare ensuite avec le second.' : 'Le contenu est nouveau à chaque fois, pour mesurer ta mémoire et pas ton habitude du test.',
    ],
    buttons: [{ label: 'Commencer' }],
  });
  const words = nextSeries();
  const w1 = await partWords(stage, words);
  const faces = await partFaces(stage);
  const span = await partSpan(stage);
  const b = { id: uid(), day: dayKey(), t: Date.now(), trial: st.trial, kind: st.kind || 'trial', w1: Math.round(w1 * 15), faces, span, words, w2: null, done: true };
  S.bilans.push(b);
  S.bilanPending = { id: b.id, start: Date.now() };
  save();
  checkChapter();
  await screen(stage, {
    icon: '⏳', title: 'Rendez-vous dans 20 minutes',
    text: [`Mots : ${b.w1}/15 · Visages : ${faces}/6 · Empan : ${span || '—'}`, `Reviens dans ${DELAY_MIN} minutes pour le rappel différé des 15 mots : une bannière t’attendra sur l’accueil. Évite de les revoir d’ici là.`],
  });
}

export async function runDelayed(stage) {
  const p = S.bilanPending;
  const b = p && S.bilans.find((x) => x.id === p.id);
  if (!b) { S.bilanPending = null; save(); return; }
  const late = Date.now() - p.start > 3 * 3600000;
  await screen(stage, { icon: '⏰', title: 'Rappel différé', text: 'Retrouve les 15 mots du bilan, sans aide.', buttons: [{ label: 'Commencer' }] });
  const ans = await recallFree(stage, { title: 'Les 15 mots', subtitle: 'Ceux du bilan de tout à l’heure.', n: 15 });
  b.w2 = Math.round(listScore(ans, b.words, false).score * 15);
  b.late = late;
  S.bilanPending = null;
  save();
  await screen(stage, { icon: '📏', title: `${b.w2} / 15 après 20 minutes`, text: [`Juste après : ${b.w1}/15.`, 'Tes résultats sont dans l’onglet Progrès.'] });
}

export function delayedReady() {
  const p = S.bilanPending;
  if (!p) return null;
  const left = p.start + DELAY_MIN * 60000 - Date.now();
  if (Date.now() - p.start > 12 * 3600000) { S.bilanPending = null; save(); return null; }
  return { ready: left <= 0, minutes: Math.ceil(left / 60000) };
}
