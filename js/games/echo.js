// Écho : échauffement de mémoire de travail (n-back de position, empan de chiffres), adaptatif.
import { h, screen, input, digitsOf } from '../core/ui.js';
import { S, save } from '../core/store.js';
import { award } from '../core/engine.js';
import { intro, askChecked, digitDiff } from './common.js';

async function nback(stage) {
  const n = S.echo.n;
  const trials = 16 + n;
  const seq = [];
  for (let i = 0; i < trials; i++) {
    if (i >= n && Math.random() < 0.3) seq.push(seq[i - n]);
    else { let p; do { p = Math.floor(Math.random() * 9); } while (i >= n && p === seq[i - n]); seq.push(p); }
  }
  await screen(stage, { icon: '〰️', title: `${n}-back`, text: `Un carré s’allume. Touche « Même place » quand il s’allume au même endroit qu’il y a ${n === 1 ? '1 coup (le précédent)' : `${n} coups`}.`, buttons: [{ label: 'Démarrer' }] });

  let hits = 0, misses = 0, fa = 0, cr = 0;
  let pressed = false, cur = -1;
  const isTarget = (i) => i >= n && seq[i] === seq[i - n];
  const cells = [...Array(9)].map(() => h('div', { class: 'nb-cell' }));
  // Le bouton dit tout de suite si l'appui était juste (vert) ou une fausse alerte (rouge).
  const btn = h('button', { class: 'btn primary big', onclick: () => {
    if (pressed || cur < 0) return;
    pressed = true;
    btn.classList.add('flash', isTarget(cur) ? 'hit' : 'miss');
    setTimeout(() => btn.classList.remove('flash', 'hit', 'miss'), 350);
  } }, 'Même place');
  const counter = h('div', { class: 'muted center' });
  const good = h('span', { class: 'good' }, '✓ 0'), bad = h('span', { class: 'bad' }, '✗ 0');
  stage.show(h('div', { class: 'screen' }, counter, h('div', { class: 'nb-score' }, good, bad), h('div', { class: 'nb-grid' }, cells), btn));
  for (let i = 0; i < trials; i++) {
    counter.textContent = `${i + 1} / ${trials}`;
    pressed = false;
    cur = i;
    cells[seq[i]].classList.add('on');
    await stage.wait(700);
    cells[seq[i]].classList.remove('on');
    await stage.wait(1300);
    if (i >= n) {
      const target = isTarget(i);
      if (target && pressed) hits++;
      else if (target) misses++;
      else if (pressed) fa++;
      else cr++;
      good.textContent = `✓ ${hits}`;
      bad.textContent = `✗ ${misses + fa}`;
      // Cible ratée : la case clignote en rouge.
      if (target && !pressed) cells[seq[i]].classList.add('missed');
    }
    cur = -1;
    await stage.wait(300);
    cells[seq[i]].classList.remove('missed');
  }
  const acc = (hits + cr) / Math.max(1, trials - n);
  if (acc >= 0.85 && misses + fa <= 2) S.echo.n = Math.min(6, n + 1);
  else if (acc < 0.65) S.echo.n = Math.max(1, n - 1);
  save();
  return { acc, label: `${n}-back : ${hits} cibles trouvées, ${misses} manquées, ${fa} fausses alertes` };
}

async function span(stage) {
  let len = S.echo.span;
  let ok = 0;
  const results = [];
  for (let t = 0; t < 3; t++) {
    const digits = Array.from({ length: len }, () => Math.floor(Math.random() * 10)).join('');
    const big = h('div', { class: 'big-digits mono' }, '');
    stage.show(h('div', { class: 'screen' }, h('div', { class: 'muted center' }, `Empan · ${len} chiffres`), big));
    await stage.wait(600);
    for (const d of digits) {
      big.textContent = d;
      await stage.wait(800);
      big.textContent = '';
      await stage.wait(200);
    }
    const { ok: good } = await askChecked(stage, {
      top: [h('div', { class: 'muted center' }, `Suite ${t + 1} / 3`), h('h2', null, 'Retape la suite')],
      fields: [input({ placeholder: 'Les chiffres, dans l’ordre', inputmode: 'numeric' })],
      check: ([v]) => (digitsOf(v) === digits
        ? { ok: true, title: `✓ ${len} chiffres réussis`, detail: h('div', { class: 'fb-answer mono' }, digits) }
        : { ok: false, title: '✗ Pas tout à fait', detail: digitDiff(digits, v) }),
      next: t < 2 ? 'Suite suivante' : 'Voir le résultat',
    });
    results.push(good);
    if (good) { ok++; len = Math.min(14, len + 1); } else len = Math.max(3, len - 1);
  }
  S.echo.span = len;
  save();
  return { acc: ok / 3, label: `Empan : ${ok} / 3 suites réussies, prochaine longueur ${len}` };
}

export async function play(ctx) {
  const { stage } = ctx;
  if (!ctx.warmup) await intro(ctx, 'echo');
  let mode = ctx.mode;
  if (!mode) {
    mode = ctx.warmup ? (Math.random() < 0.5 ? 'nback' : 'span') : await screen(stage, { icon: '〰️', title: 'Écho', text: 'Choisis ton exercice.', buttons: [{ label: 'n-back', value: 'nback' }, { label: 'Empan de chiffres', value: 'span' }] });
  }
  if (ctx.warmup) await screen(stage, { icon: '〰️', title: 'Échauffement', text: 'Deux minutes pour se concentrer. C’est un exercice de concentration, pas une promesse de meilleure mémoire au quotidien.', buttons: [{ label: 'Commencer' }] });
  const r = mode === 'nback' ? await nback(stage) : await span(stage);
  const pts = award(r.acc >= 0.7 ? 1 : 0, { annex: true });
  await screen(stage, { icon: r.acc >= 0.85 ? '⚡' : '〰️', title: `${Math.round(r.acc * 100)} %`, text: [r.label, pts ? `+${pts} point` : null].filter(Boolean), buttons: [{ label: ctx.warmup ? 'Passer au Coffre' : 'Terminer' }] });
  return { score: r.acc };
}
