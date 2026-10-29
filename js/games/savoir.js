// Savoir du jour : quelques fiches d'histoire-géo par jour, encodées avec la technique qui leur va
// (système majeur pour une date, mot-clé sonore pour une capitale, image pour un fait), puis confiées au Coffre.
import { h, screen, input, onEnter, matchAnswer, toast } from '../core/ui.js';
import { S, save, shuffle, dayKey } from '../core/store.js';
import { createItem, deleteItem, recordReview, queue, techUnlocked } from '../core/engine.js';
import { THEMES, THEME_BY_ID, FACTS, factPrompt, factAnswer } from '../data/culture.js';
import { majorWords } from '../data/major.js';
import { majorTable } from './code.js';
import { intro, recallBreak, resultScreen, askChecked } from './common.js';

export const themeOn = (id) => !S.culture.off.includes(id);

export function setTheme(id, on) {
  S.culture.off = on ? S.culture.off.filter((x) => x !== id) : [...new Set([...S.culture.off, id])];
  save();
}

// Ce qui est déjà dans le Coffre (fiches et listes du palais), pour un thème ou pour tous.
export function cultureItems(theme) {
  return Object.values(S.items).filter((i) => i.src === 'culture' && (!theme || i.extra?.theme === theme));
}

// Retirer un thème du Coffre : ses fiches redeviennent « à découvrir ».
export function removeTheme(theme) {
  const items = cultureItems(theme);
  items.forEach((i) => deleteItem(i.id));
  return items.length;
}

export function themeStats() {
  const learned = new Set(cultureItems().map((i) => i.extra?.fid).filter(Boolean));
  return THEMES.map((t) => {
    const facts = FACTS.filter((f) => f.theme === t.id);
    return { ...t, total: facts.length, learned: facts.filter((f) => learned.has(f.id)).length, on: themeOn(t.id) };
  });
}

// Les prochaines fiches : les grands repères d'abord (le squelette sur lequel le reste s'accroche),
// puis un thème coché après l'autre, et dans chaque thème de l'essentiel vers le détail.
function nextFacts(n) {
  const learned = new Set(cultureItems().map((i) => i.extra?.fid));
  const pools = THEMES.filter((t) => themeOn(t.id)).map((t) => ({ id: t.id, left: FACTS.filter((f) => f.theme === t.id && !learned.has(f.id)) }));
  const out = [];
  const base = pools.find((p) => p.id === 'reperes');
  while (base?.left.length && out.length < n) out.push(base.left.shift());
  const rest = pools.filter((p) => p !== base);
  let turn = S.culture.turn || 0;
  while (out.length < n && rest.some((p) => p.left.length)) {
    const p = rest[turn % rest.length];
    turn++;
    if (p.left.length) out.push(p.left.shift());
  }
  return { facts: out, turn };
}

export function savoirStatus() {
  if (!S.culture.on) return { ready: false, reason: 'off' };
  if (S.culture.day === dayKey()) return { ready: false, reason: 'done' };
  if (!nextFacts(1).facts.length) return { ready: false, reason: 'empty' };
  // Tant que le Coffre a du retard, il passe avant : pas de nouvelles fiches.
  if (queue().backlog > 0) return { ready: false, reason: 'backlog' };
  return { ready: true };
}

export const STATUS_TEXT = {
  off: 'Le Savoir du jour est désactivé. Tu peux le réactiver dans les Réglages.',
  done: 'Tes fiches du jour sont faites. Les suivantes arrivent demain.',
  empty: 'Tu as appris toutes les fiches des thèmes cochés. Coches-en d’autres dans les Réglages.',
  backlog: 'Pas de nouvelles fiches aujourd’hui : ton Coffre a du retard, et il passe avant. Elles reviendront dès qu’il sera à jour.',
};

// --- Repères dans le temps ---------------------------------------------------

const ROMAN = [[100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
const toRoman = (n) => ROMAN.reduce((s, [v, r]) => { while (n >= v) { s += r; n -= v; } return s; }, '');

function centuryOf(y) {
  const c = Math.floor((Math.abs(y) - 1) / 100) + 1;
  return `${toRoman(c)}${c === 1 ? 'er' : 'e'} siècle${y < 0 ? ' av. J.-C.' : ''}`;
}

function periodOf(y) {
  if (y < -3300) return 'Préhistoire';
  if (y < 476) return 'Antiquité';
  if (y < 1492) return 'Moyen Âge';
  if (y < 1789) return 'Temps modernes';
  return 'Époque contemporaine';
}

const yearLabel = (y) => (y < 0 ? `${-y} av. J.-C.` : String(y));
const shown = (f) => (f.k === 'date' ? yearLabel(f.y) : f.a.split('|')[0]);

// --- Choix des thèmes ----------------------------------------------------------

// Les thèmes à cocher, en deux groupes. Sert aussi dans les Réglages.
export function themeChips(onChange) {
  return ['Histoire', 'Géographie'].map((g) => h('div', null,
    h('h4', null, g),
    h('div', { class: 'chips themes' }, THEMES.filter((t) => t.group === g).map((t) => {
      const b = h('button', { class: `chip ${themeOn(t.id) ? 'on' : ''}`, 'aria-pressed': String(themeOn(t.id)), onclick: () => {
        const on = !themeOn(t.id);
        setTheme(t.id, on);
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', String(on));
        onChange?.(t.id, on);
      } }, `${t.icon} ${t.name}`);
      return b;
    }))));
}

async function chooseThemes(stage) {
  const go = await screen(stage, {
    icon: '🗂️', title: 'Tes thèmes',
    text: 'Touche un thème pour le retirer ou le remettre. Tu pourras changer d’avis à tout moment dans les Réglages.',
    body: h('div', { class: 'stack' }, themeChips(), h('p', { class: 'muted small' }, 'Conseil : garde « Les grands repères ». Ce sont les premières fiches, et tout le reste s’y accroche.')),
    buttons: [{ label: 'C’est parti', value: true }, { label: 'Pas pour moi', value: false, kind: 'ghost' }],
  });
  S.culture.picked = true;
  if (!go) { S.culture.on = false; toast('Savoir du jour désactivé. Tu peux le réactiver dans les Réglages.'); }
  save();
  return go;
}

// --- Encodage d'une fiche ------------------------------------------------------

function majorCoach(digits) {
  return h('div', { class: 'tip' },
    h('strong', null, 'Système majeur : '), majorWords(digits).map((p) => `${p.chunk} → ${p.word}`).join(' · '),
    h('br'), 'Mets ces images dans la scène de l’événement (tu peux en choisir d’autres).',
    h('details', { class: 'why' }, h('summary', null, 'La table des sons'), majorTable()));
}

function encodeFact(stage, f, i, n, major) {
  const theme = THEME_BY_ID[f.theme];
  return stage.ask((done) => {
    const fKey = f.k === 'capitale' ? input({ placeholder: `Un mot qui sonne comme « ${shown(f)} »` }) : null;
    const fImg = input({ placeholder: f.k === 'capitale' ? 'La scène qui relie ce mot-clé au lieu' : f.k === 'date' ? 'La scène qui relie l’événement et la date' : 'La scène qui relie la question et la réponse', autocapitalize: 'sentences' });
    if (fKey) onEnter(fKey, () => fImg.focus());
    const go = () => {
      if (!fImg.value.trim() && !fKey?.value.trim()) toast('Une image, même rapide, aide beaucoup à retenir.');
      done({ key: fKey?.value.trim() || '', img: fImg.value.trim() });
    };
    onEnter(fImg, go);
    const digits = f.k === 'date' ? String(Math.abs(f.y)) : '';
    let card, coach;
    if (f.k === 'date') {
      card = [h('div', { class: 'big-word' }, yearLabel(f.y)), h('p', { class: 'muted center' }, `${centuryOf(f.y)} · ${periodOf(f.y)}`), h('div', { class: 'prompt' }, f.ev)];
      coach = major ? majorCoach(digits) : h('p', { class: 'tip' }, `💡 Donne un sens à ${digits} : découpe-le en blocs (un âge, une heure, un nombre qui se répète), puis glisse-le dans la scène de l’événement.`);
    } else if (f.k === 'capitale') {
      card = [h('div', { class: 'big-word' }, f.place), h('div', { class: 'translation' }, '→ ', shown(f))];
      coach = !S.records.capitalExample
        ? h('div', { class: 'tip' }, h('strong', null, 'Exemple : '), 'Canberra → « canne » et « bras » → un kangourou s’appuie sur une canne avec ses petits bras.')
        : h('p', { class: 'tip' }, `💡 Trouve un mot qui sonne comme « ${shown(f)} », puis imagine-le avec un symbole ${f.of}.`);
    } else {
      card = [h('div', { class: 'prompt' }, f.q), h('div', { class: 'translation' }, shown(f))];
      coach = h('p', { class: 'tip' }, '💡 Imagine une scène qui relie la question et la réponse : exagère, fais bouger, mets-toi dedans.');
    }
    return h('div', { class: 'screen' },
      h('div', { class: 'muted center' }, `${theme.icon} ${theme.name} · ${i + 1} / ${n}`),
      card,
      h('div', { class: 'example' }, h('strong', null, 'Pourquoi ça compte : '), f.why),
      coach,
      fKey && h('label', { class: 'field' }, h('span', null, 'Mot-clé sonore'), fKey),
      h('label', { class: 'field' }, h('span', null, 'Ton image'), fImg),
      h('div', { class: 'screen-actions' }, h('button', { class: 'btn primary', onclick: go }, i + 1 < n ? 'Fiche suivante' : 'J’ai fini')));
  });
}

function hintOf(f, enc, major) {
  const parts = [];
  if (f.k === 'date' && major) parts.push(majorWords(String(Math.abs(f.y))).map((p) => `${p.chunk} ${p.word}`).join(' · '));
  if (enc.key) parts.push(`mot-clé « ${enc.key} »`);
  if (enc.img) parts.push(enc.img);
  return parts.join(' · ');
}

// --- La séance -------------------------------------------------------------------

export async function play(ctx) {
  const { stage } = ctx;
  const st = savoirStatus();
  if (!st.ready) {
    await screen(stage, { icon: '📚', title: 'Savoir du jour', text: STATUS_TEXT[st.reason] });
    return { skipped: true };
  }
  await intro(ctx, 'savoir');
  if (!S.culture.picked && !(await chooseThemes(stage))) return { skipped: true };
  const { facts, turn } = nextFacts(S.culture.perDay || 3);
  if (!facts.length) {
    await screen(stage, { icon: '📚', title: 'Aucun thème choisi', text: 'Coche au moins un thème dans les Réglages pour recevoir des fiches.' });
    return { skipped: true };
  }
  const major = techUnlocked('digits') || !!S.seenIntro.major;
  const n = facts.length;
  const encs = [];
  for (let i = 0; i < n; i++) {
    stage.setProgress(i / n);
    encs.push(await encodeFact(stage, facts[i], i, n, major));
    if (facts[i].k === 'capitale') S.records.capitalExample = true;
  }
  stage.setProgress(null);

  await recallBreak(ctx, 'Retrouve chaque réponse, sans regarder.');
  const order = shuffle(facts.map((f, i) => ({ f, enc: encs[i] })));
  let ok = 0, pts = 0;
  const lines = [];
  for (let i = 0; i < order.length; i++) {
    const { f, enc } = order[i];
    stage.setProgress(i / n);
    const prompt = factPrompt(f), answer = factAnswer(f), hint = hintOf(f, enc, major);
    const { values: [typed], ok: good } = await askChecked(stage, {
      top: h('div', { class: 'prompt' }, prompt),
      fields: [input(f.k === 'date' ? { placeholder: 'L’année', inputmode: 'numeric' } : { placeholder: 'Ta réponse', autocapitalize: 'sentences' })],
      check: ([v]) => (matchAnswer(v, answer)
        ? { ok: true, title: `✓ ${shown(f)}` }
        : { ok: false, title: `✗ C’était : ${shown(f)}`, detail: hint ? h('div', { class: 'hint' }, h('span', { class: 'muted' }, 'Ton astuce : '), hint) : null }),
      next: i + 1 < order.length ? 'Suivant' : 'Voir le résultat',
    });
    if (good) ok++;
    const item = createItem({ type: 'card', src: 'culture', prompt, answer, hint, extra: { fid: f.id, theme: f.theme, why: f.why, kind: f.k } });
    pts += recordReview(item, good ? 3 : 1, { ctx: 'i', annex: ctx.annex }).pts;
    lines.push(h('li', { class: good ? 'ok' : 'ko' }, h('span', { class: 'mark' }, good ? '✓' : '✗'), h('strong', null, shown(f)), ` · ${f.k === 'date' ? f.ev : f.k === 'capitale' ? f.place : f.q}`, !good && typed ? h('span', { class: 'muted' }, ` (tu as écrit « ${typed} »)`) : null));
  }
  stage.setProgress(null);
  S.culture.day = dayKey();
  S.culture.turn = turn;
  save();
  await resultScreen(stage, {
    score: ok / n, pts,
    title: `${ok} fiche${ok > 1 ? 's' : ''} sur ${n} retrouvée${ok > 1 ? 's' : ''}`,
    text: 'Elles reviendront demain dans le Coffre, puis de plus en plus espacées, juste avant l’oubli.',
    body: h('ul', { class: 'result-list' }, lines),
  });
  return { score: ok / n };
}
