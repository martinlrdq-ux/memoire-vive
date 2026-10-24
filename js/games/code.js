// Code secret : regrouper en blocs (niveau 1), puis système majeur (niveau 2).
import { h, screen, input, onEnter, digitScore, textarea } from '../core/ui.js';
import { S, save, pick } from '../core/store.js';
import { NAMES_F, NAMES_M } from '../data/people.js';
import { MAJOR_SOUNDS, majorWords } from '../data/major.js';
import { levelInfo, startBatch, createItem, recordReview } from '../core/engine.js';
import { intro, recallBreak, resultScreen, gradeFor } from './common.js';

const CONTEXTS = [
  () => `Le code du casier de ${pick(NAMES_F)}`,
  () => `Le numéro de téléphone de ${pick(NAMES_M)}`,
  () => 'Le numéro de ton dossier à la mairie',
  () => 'Le code de l’alarme du bureau',
  () => `Le numéro de membre de ${pick(NAMES_F)} à la médiathèque`,
  () => 'La référence de la commande',
  () => 'Le code du portail de la maison de vacances',
  () => `Le numéro de plaque de la voiture de ${pick(NAMES_M)}`,
];

const randomDigits = (n) => Array.from({ length: n }, (_, i) => (i === 0 ? 1 + Math.floor(Math.random() * 9) : Math.floor(Math.random() * 10))).join('');

export function majorTable() {
  return h('div', { class: 'major-table' }, MAJOR_SOUNDS.map(([d, s, tip]) => h('div', { class: 'major-cell' }, h('strong', null, d), h('span', null, s), h('small', { class: 'muted' }, tip))));
}

function encodeBlocks(stage, digits) {
  return stage.ask((done) => {
    const cuts = new Set();
    for (let i = 2; i < digits.length; i += 2) cuts.add(i);
    const row = h('div', { class: 'digit-row' });
    const meanings = h('div', { class: 'stack' });
    const blocks = () => {
      const out = [];
      let cur = '';
      [...digits].forEach((d, i) => { if (cuts.has(i)) { out.push(cur); cur = ''; } cur += d; });
      out.push(cur);
      return out;
    };
    const values = {};
    const render = () => {
      row.replaceChildren(...[...digits].flatMap((d, i) => [
        i > 0 ? h('button', { class: `cut ${cuts.has(i) ? 'on' : ''}`, 'aria-label': 'Couper ici', onclick: () => { cuts.has(i) ? cuts.delete(i) : cuts.add(i); render(); } }) : null,
        h('span', { class: 'digit' }, d),
      ]));
      meanings.replaceChildren(...blocks().map((b, k) => {
        const f = input({ placeholder: 'ce que ce bloc t’évoque (une date, un âge…)', value: values[k] || '' });
        f.addEventListener('input', () => { values[k] = f.value; });
        return h('label', { class: 'recall-row' }, h('span', { class: 'recall-cue mono' }, b), f);
      }));
    };
    render();
    return h('div', { class: 'screen' },
      h('h2', null, 'Découpe en blocs'),
      h('p', { class: 'muted' }, 'Touche entre deux chiffres pour couper ou recoller. Puis donne un sens à chaque bloc si tu peux.'),
      row, meanings,
      h('div', { class: 'screen-actions' }, h('button', { class: 'btn primary', onclick: () => done(blocks().map((b, k) => (values[k] ? `${b} = ${values[k]}` : b)).join(' · ')) }, 'J’ai mémorisé')),
    );
  });
}

function encodeMajor(stage, digits) {
  return stage.ask((done) => {
    const pairs = majorWords(digits);
    const fields = pairs.map((p) => {
      const f = input({ placeholder: `ex. : ${p.word}` });
      return { p, f };
    });
    fields.forEach(({ f }, i) => onEnter(f, () => (fields[i + 1] ? fields[i + 1].f.focus() : story.focus())));
    const story = textarea({ placeholder: 'Relie les images en une histoire (ou place-les dans ton palais)', rows: 3 });
    return h('div', { class: 'screen' },
      h('h2', null, 'Système majeur'),
      h('details', { class: 'why' }, h('summary', null, 'La table des sons'), majorTable(), h('p', { class: 'muted small' }, 'Seuls les sons consonnes comptent : 32 → m + n → « mine ».')),
      h('div', { class: 'recall-list' }, fields.map(({ p, f }) => h('label', { class: 'recall-row' }, h('span', { class: 'recall-cue mono' }, p.chunk), f,
        h('button', { class: 'btn ghost small', onclick: () => { f.value = p.word; } }, 'Idée')))),
      story,
      h('div', { class: 'screen-actions' }, h('button', { class: 'btn primary', onclick: () => {
        const words = fields.map(({ p, f }) => `${p.chunk} ${f.value.trim() || p.word}`).join(' · ');
        done(story.value.trim() ? `${words} — ${story.value.trim()}` : words);
      } }, 'J’ai mémorisé')),
    );
  });
}

export async function play(ctx) {
  const { stage } = ctx;
  await intro(ctx, 'code');
  const lv = levelInfo('digits');
  const n = ctx.size || lv.size;
  const recommended = n >= 20 ? 'major' : 'blocs';
  const mode = await screen(stage, {
    icon: '🔢', title: `${n} chiffres à retenir`,
    text: n >= 20 ? 'À cette longueur, le système majeur devient vraiment utile.' : 'Commence par les blocs. Le système majeur est là quand tu veux l’essayer.',
    body: !S.seenIntro.major ? h('details', { class: 'why' }, h('summary', null, 'C’est quoi, le système majeur ?'), h('p', null, 'Chaque chiffre devient un son : 0 = s, 1 = t, 2 = n, 3 = m, 4 = r, 5 = l, 6 = ch, 7 = k, 8 = f, 9 = p. On ajoute des voyelles pour former des mots : 14 = t + r = « tour », 92 = b + n = « bonnet ». Les mots se transforment en images faciles à retenir.'), majorTable()) : null,
    buttons: recommended === 'major'
      ? [{ label: 'Système majeur', value: 'major' }, { label: 'Blocs', value: 'blocs' }]
      : [{ label: 'Blocs', value: 'blocs' }, { label: 'Système majeur', value: 'major' }],
  });
  if (mode === 'major') { S.seenIntro.major = true; save(); }
  const digits = randomDigits(n);
  const context = pick(CONTEXTS)();
  await screen(stage, { icon: '🔐', title: context, body: h('div', { class: 'big-digits mono' }, digits.replace(/(\d{2})(?=\d)/g, '$1 ')), text: 'Regarde bien. Tu vas maintenant l’encoder.', buttons: [{ label: 'Encoder' }] });
  const hint = mode === 'major' ? await encodeMajor(stage, digits) : await encodeBlocks(stage, digits);
  await recallBreak(ctx, `Retape « ${context.toLowerCase()} » sans le regarder.`);
  const ans = await stage.ask((done) => {
    const f = input({ placeholder: 'Les chiffres', inputmode: 'numeric', 'data-autofocus': '' });
    onEnter(f, () => done(f.value));
    return h('div', { class: 'screen' }, h('h2', null, context), h('p', { class: 'muted' }, `${n} chiffres`), f, h('div', { class: 'screen-actions' }, h('button', { class: 'btn primary', onclick: () => done(f.value) }, 'Valider')));
  });
  const score = digitScore(ans, digits);
  const batch = startBatch('digits', n, { mode });
  const item = createItem({ type: 'code', src: 'digits', prompt: context, answer: digits, hint, batch });
  const g = score === 1 ? 3 : score >= 0.8 ? 2 : 1;
  const r = recordReview(item, g, { score, ctx: 'i', annex: ctx.annex });
  await resultScreen(stage, { score, pts: r.pts, body: h('div', null, h('div', { class: 'big-digits mono' }, digits.replace(/(\d{2})(?=\d)/g, '$1 ')), h('p', { class: 'muted' }, `Tu as écrit : ${ans || '—'}`), h('p', { class: 'hint' }, hint)) });
  return { score };
}

export { gradeFor };
