// Croquis : dessiner chaque mot du doigt, puis les rappeler librement.
import { h, listScore } from '../core/ui.js';
import { sample, dayKey, fmtDay } from '../core/store.js';
import { GAME_WORDS } from '../data/words.js';
import { levelInfo, startBatch, createItem, recordReview } from '../core/engine.js';
import { intro, recallBreak, recallFree, listResultView, gradeFor, resultScreen } from './common.js';

const SECONDS = 12;

function sketchPad() {
  const canvas = h('canvas', { class: 'sketch' });
  const ratio = window.devicePixelRatio || 1;
  let ctx2d, drawing = false, last = null;
  const setup = () => {
    const w = canvas.clientWidth || 300;
    canvas.width = w * ratio;
    canvas.height = w * ratio;
    ctx2d = canvas.getContext('2d');
    ctx2d.scale(ratio, ratio);
    ctx2d.lineWidth = 4;
    ctx2d.lineCap = 'round';
    ctx2d.lineJoin = 'round';
    ctx2d.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--ink') || '#222';
  };
  const pos = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  canvas.addEventListener('pointerdown', (e) => { if (!ctx2d) setup(); drawing = true; last = pos(e); canvas.setPointerCapture(e.pointerId); e.preventDefault(); });
  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const p = pos(e);
    ctx2d.beginPath(); ctx2d.moveTo(...last); ctx2d.lineTo(...p); ctx2d.stroke();
    last = p;
  });
  const end = () => { drawing = false; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  requestAnimationFrame(setup);
  return { canvas, clear: () => { if (ctx2d) ctx2d.clearRect(0, 0, canvas.width, canvas.height); } };
}

export async function play(ctx) {
  const { stage } = ctx;
  await intro(ctx, 'croquis');
  const n = ctx.size || levelInfo('sketch').size;
  const words = sample(GAME_WORDS, n);
  for (let i = 0; i < n; i++) {
    stage.setProgress(i / n);
    await stage.ask((done) => {
      const pad = sketchPad();
      const bar = h('div', { class: 'timer' }, h('div'));
      let finished = false;
      const next = () => { if (!finished) { finished = true; clearTimeout(t); done(); } };
      const t = setTimeout(next, SECONDS * 1000);
      requestAnimationFrame(() => { bar.firstChild.style.transition = `width ${SECONDS}s linear`; bar.firstChild.style.width = '0%'; });
      return h('div', { class: 'screen sketch-screen' },
        h('div', { class: 'muted center' }, `${i + 1} / ${n}`),
        h('div', { class: 'big-word' }, words[i]),
        bar, pad.canvas,
        h('div', { class: 'row center' }, h('button', { class: 'btn ghost small', onclick: pad.clear }, 'Effacer'), h('button', { class: 'btn secondary small', onclick: next }, 'Suivant')));
    });
  }
  stage.setProgress(null);
  await recallBreak(ctx, 'Retrouve tous les mots que tu as dessinés, dans n’importe quel ordre.');
  const answers = await recallFree(stage, { title: 'Les mots dessinés', subtitle: 'Revois tes dessins dans ta tête.', n });
  const { res, score } = listScore(answers, words, false);
  const batch = startBatch('sketch', n);
  const item = createItem({ type: 'list', src: 'sketch', prompt: `Croquis du ${fmtDay(dayKey(), { day: 'numeric', month: 'long' })}`, answer: words, extra: { ordered: false }, batch });
  const r = recordReview(item, gradeFor(score), { score, ctx: 'i', annex: ctx.annex });
  await resultScreen(stage, { score, pts: r.pts, body: listResultView(words, res) });
  return { score };
}
