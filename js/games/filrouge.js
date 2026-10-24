// Fil rouge : relier une liste d'objets en une histoire inventée, puis la restituer dans l'ordre.
import { h, screen, textarea, listScore } from '../core/ui.js';
import { sample, dayKey, fmtDay } from '../core/store.js';
import { GAME_WORDS } from '../data/words.js';
import { levelInfo, startBatch, createItem, recordReview, award } from '../core/engine.js';
import { intro, recallBreak, recallOrdered, listResultView, gradeFor, resultScreen, checkLive } from './common.js';

export async function encodeStory(stage, words) {
  return stage.ask((done) => {
    const ta = textarea({ placeholder: 'Il était une fois…', rows: 7 });
    const chips = words.map((w, i) => h('span', { class: 'chip' }, `${i + 1}. ${w}`));
    const update = () => checkLive(ta.value, words).forEach((ok, i) => chips[i].classList.toggle('on', ok));
    ta.addEventListener('input', update);
    return h('div', { class: 'screen' },
      h('h2', null, `${words.length} objets, dans l’ordre`),
      h('div', { class: 'chips' }, chips),
      h('p', { class: 'muted' }, 'Invente une histoire qui les relie dans cet ordre. Exagère, fais bouger les objets, mets-toi en scène. Tu peux dicter avec le micro du clavier, ou la raconter à voix haute.'),
      ta,
      h('div', { class: 'screen-actions' },
        h('button', { class: 'btn primary', onclick: () => done(ta.value.trim()) }, 'Mon histoire est prête'),
        h('button', { class: 'btn ghost small', onclick: () => done('(racontée à voix haute)') }, 'Je l’ai racontée à voix haute')),
    );
  });
}

export async function play(ctx) {
  const { stage } = ctx;
  await intro(ctx, 'filrouge');
  const lv = levelInfo('story');
  const n = ctx.size || lv.size;
  const words = sample(GAME_WORDS, n);
  const story = await encodeStory(stage, words);
  await recallBreak(ctx, 'Retrouve les objets dans l’ordre, en te racontant ton histoire.');
  const answers = await recallOrdered(stage, { title: 'Dans l’ordre', subtitle: 'Suis le fil de ton histoire.', n });
  const { res, score } = listScore(answers, words, true);
  const batch = startBatch('story', n);
  const item = createItem({ type: 'list', src: 'story', prompt: `Fil rouge du ${fmtDay(dayKey(), { day: 'numeric', month: 'long' })}`, answer: words, hint: story, extra: { ordered: true }, batch });
  const r = recordReview(item, gradeFor(score), { score, ctx: 'i', annex: ctx.annex });
  await resultScreen(stage, { score, pts: r.pts, body: h('div', null, listResultView(words, res, { answers }), h('p', { class: 'muted' }, 'Demain, le Coffre te redemandera cette liste.')) });
  return { score };
}
