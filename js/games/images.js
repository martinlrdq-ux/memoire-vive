// Mes 100 images : apprendre par cœur le mot-image de chaque nombre du système majeur, 10 par jour,
// puis les confier au Coffre. Une fois sues, elles rendent le Code secret et les dates presque immédiats.
import { h, screen, input, onEnter, matchAnswer, norm } from '../core/ui.js';
import { S, save, shuffle, dayKey } from '../core/store.js';
import { createItem, recordReview, queue } from '../core/engine.js';
import { MAJOR_ORDER, defaultMajorWord, majorWord, majorSounds, majorLearned } from '../data/major.js';
import { majorTable } from './code.js';
import { intro, recallBreak, resultScreen, askChecked } from './common.js';

const PER_DAY = 10;

const nextNums = () => {
  const learned = majorLearned();
  return MAJOR_ORDER.filter((n) => !learned.has(n)).slice(0, PER_DAY);
};

export function imagesStatus() {
  const learned = majorLearned().size;
  const base = { learned, total: MAJOR_ORDER.length };
  if (!nextNums().length) return { ...base, ready: false, reason: 'complete' };
  if (S.major.day === dayKey()) return { ...base, ready: false, reason: 'done' };
  // Comme pour le Savoir du jour : tant que le Coffre a du retard, il passe avant.
  if (queue().backlog > 0) return { ...base, ready: false, reason: 'backlog' };
  return { ...base, ready: true };
}

const STATUS_TEXT = {
  complete: 'Tu connais toutes tes images. Elles reviennent dans le Coffre, de plus en plus espacées.',
  done: 'Ton lot du jour est fait. Le suivant arrive demain.',
  backlog: 'Pas de nouveau lot aujourd’hui : ton Coffre a du retard, et il passe avant.',
};

export const imagesTag = (st = imagesStatus()) =>
  st.reason === 'complete' ? `${st.total} / ${st.total} ✓` : `${st.learned} / ${st.total} apprises${st.ready ? ' · lot du jour prêt' : ''}`;

function learnCard(stage, num, i, n) {
  return stage.ask((done) => {
    const proposed = majorWord(num);
    const f = input({ placeholder: `Garde « ${proposed} » ou choisis ton mot` });
    const go = () => done(f.value.trim());
    onEnter(f, go);
    return h('div', { class: 'screen' },
      h('div', { class: 'muted center' }, `${i + 1} / ${n}`),
      h('div', { class: 'big-digits mono' }, num),
      h('p', { class: 'muted center' }, majorSounds(num)),
      h('div', { class: 'big-word' }, proposed),
      h('p', { class: 'tip' }, '💡 Vois-le quelques secondes : énorme, en couleur, en mouvement. C’est cette image qui remplacera le nombre.'),
      h('label', { class: 'field' }, h('span', null, 'Ton mot à toi (facultatif)'), f),
      h('p', { class: 'muted small' }, 'Il doit garder les mêmes sons consonnes, dans le même ordre. Un mot que tu choisis toi-même se retient mieux.'),
      h('div', { class: 'screen-actions' }, h('button', { class: 'btn primary', onclick: go }, i + 1 < n ? 'Suivant' : 'J’ai fini')));
  });
}

export async function play(ctx) {
  const { stage } = ctx;
  const st = imagesStatus();
  if (!st.ready) {
    await screen(stage, { icon: '🔟', title: 'Mes 100 images', text: STATUS_TEXT[st.reason] });
    return { skipped: true };
  }
  await intro(ctx, 'images');
  const nums = nextNums();
  const n = nums.length;
  await screen(stage, {
    icon: '🔟', title: `Lot du jour : ${nums[0]} à ${nums[n - 1]}`,
    text: [`${st.learned} image${st.learned > 1 ? 's' : ''} sur ${st.total} déjà dans ton Coffre.`, 'Rappel : chaque chiffre est un son consonne, les voyelles sont libres.'],
    body: st.learned ? h('details', { class: 'why' }, h('summary', null, 'La table des sons'), majorTable()) : majorTable(),
    buttons: [{ label: 'C’est parti' }],
  });

  for (let i = 0; i < n; i++) {
    stage.setProgress(i / n);
    const mine = await learnCard(stage, nums[i], i, n);
    if (mine && norm(mine) !== norm(defaultMajorWord(nums[i]))) S.major.words[nums[i]] = mine;
    else if (mine) delete S.major.words[nums[i]];
  }
  save();
  stage.setProgress(null);

  await recallBreak(ctx, 'Pour chaque nombre, retrouve ton mot-image.');
  const order = shuffle(nums);
  let ok = 0, pts = 0;
  const lines = [];
  for (let i = 0; i < order.length; i++) {
    const num = order[i];
    const word = majorWord(num);
    stage.setProgress(i / n);
    const { values: [typed], ok: good } = await askChecked(stage, {
      top: h('div', null, h('div', { class: 'big-digits mono' }, num), h('p', { class: 'muted center' }, 'Son mot-image ?')),
      fields: [input({ placeholder: 'Le mot', autocapitalize: 'none' })],
      check: ([v]) => (matchAnswer(v, word)
        ? { ok: true, title: `✓ ${num} = ${word}` }
        : { ok: false, title: `✗ ${num} = ${word}`, detail: h('div', { class: 'muted' }, majorSounds(num)) }),
      next: i + 1 < order.length ? 'Suivant' : 'Voir le résultat',
    });
    if (good) ok++;
    const item = createItem({ type: 'card', src: 'major', prompt: `Le mot-image de ${num}`, answer: word, hint: majorSounds(num), extra: { num } });
    pts += recordReview(item, good ? 3 : 1, { ctx: 'i', annex: ctx.annex }).pts;
    lines.push(h('li', { class: good ? 'ok' : 'ko' }, h('span', { class: 'mark' }, good ? '✓' : '✗'), h('strong', null, `${num} = ${word}`), !good && typed ? h('span', { class: 'muted' }, ` (tu as écrit « ${typed} »)`) : null));
  }
  stage.setProgress(null);
  S.major.day = dayKey();
  save();
  const left = MAJOR_ORDER.length - majorLearned().size;
  await resultScreen(stage, {
    score: ok / n, pts,
    title: `${ok} image${ok > 1 ? 's' : ''} sur ${n} retrouvée${ok > 1 ? 's' : ''}`,
    text: left ? `Elles reviendront dans le Coffre, de plus en plus espacées. Demain, le lot suivant : encore ${left} à apprendre.` : 'C’était le dernier lot : tu as maintenant une image pour chaque nombre. Le Code secret va devenir bien plus rapide.',
    body: h('ul', { class: 'result-list' }, lines),
  });
  return { score: ok / n };
}
