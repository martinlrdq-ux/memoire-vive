// Lecture active : lire une fois, restituer librement, cocher les idées clés.
// Les questions reviennent dans le Coffre trois jours plus tard.
import { h, textarea, norm } from '../core/ui.js';
import { S, save, shuffle } from '../core/store.js';
import { TEXTS } from '../data/texts.js';
import { levelInfo, startBatch, createItem, award } from '../core/engine.js';
import { intro, recallBreak, resultScreen } from './common.js';

function pickText() {
  let used = S.usedPools.texts || [];
  let free = TEXTS.filter((t) => !used.includes(t.id));
  if (!free.length) { used = []; free = TEXTS; }
  const t = shuffle(free)[0];
  S.usedPools.texts = [...used, t.id];
  save();
  return t;
}

export async function play(ctx) {
  const { stage } = ctx;
  await intro(ctx, 'lecture');
  const n = ctx.size || levelInfo('reading').size;
  const text = pickText();
  const ideas = text.ideas.slice(0, Math.max(n, 3));
  const t0 = Date.now();
  await stage.ask((done) => h('div', { class: 'screen' },
    h('h2', null, text.title),
    h('p', { class: 'muted small' }, 'Lis une seule fois, attentivement : tu ne pourras pas revenir en arrière.'),
    h('div', { class: 'reading' }, text.text),
    h('div', { class: 'screen-actions' }, h('button', { class: 'btn primary', onclick: () => done() }, 'J’ai lu'))));
  const readSec = Math.round((Date.now() - t0) / 1000);

  await recallBreak(ctx, 'Sans relire, écris ou dicte tout ce dont tu te souviens.');
  const recall = await stage.ask((done) => {
    const ta = textarea({ placeholder: 'Tout ce qui te revient, avec tes mots…', rows: 9, 'data-autofocus': '' });
    return h('div', { class: 'screen' }, h('h2', null, text.title), ta, h('div', { class: 'screen-actions' }, h('button', { class: 'btn primary', onclick: () => done(ta.value) }, 'J’ai fini')));
  });

  const nr = norm(recall);
  const checked = ideas.map((idea) => idea.k.some((k) => nr.includes(norm(k))));
  const final = await stage.ask((done) => {
    const boxes = ideas.map((idea, i) => {
      const cb = h('input', { type: 'checkbox', checked: checked[i] });
      return { cb, row: h('label', { class: 'check-row' }, cb, h('span', null, idea.s)) };
    });
    return h('div', { class: 'screen' },
      h('h2', null, 'Les idées clés'),
      h('p', { class: 'muted' }, 'Coche celles que tu avais retrouvées, même dites autrement. J’ai pré-coché ce que j’ai reconnu dans ton texte : corrige si besoin.'),
      h('div', { class: 'stack' }, boxes.map((b) => b.row)),
      h('div', { class: 'screen-actions' }, h('button', { class: 'btn primary', onclick: () => done(boxes.map((b) => b.cb.checked)) }, 'Valider')));
  });

  const got = final.filter(Boolean).length;
  const score = got / ideas.length;
  const batch = startBatch('reading', ideas.length, { text: text.id });
  ideas.forEach((idea) => createItem({ type: 'card', src: 'reading', prompt: idea.q, answer: idea.a, hint: `${text.title} : ${idea.s}`, batch, firstDelay: 3 }));
  const pts = ctx.annex ? award(got, { annex: true }) : award(got * 3);
  await resultScreen(stage, {
    score, pts,
    title: `${got} idée${got > 1 ? 's' : ''} clé${got > 1 ? 's' : ''} sur ${ideas.length}`,
    body: h('p', { class: 'muted' }, `Lecture en ${readSec} s. Les questions sur ce texte reviendront dans trois jours, dans le Coffre.`),
  });
  return { score };
}
