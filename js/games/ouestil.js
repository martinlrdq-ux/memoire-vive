// Où est-il ? : mémoriser l'emplacement d'objets, puis les replacer. Difficulté adaptative.
import { h, screen } from '../core/ui.js';
import { S, save, sample, shuffle } from '../core/store.js';
import { SCENES } from '../data/scenes.js';
import { award } from '../core/engine.js';
import { intro } from './common.js';
import { CATALOG } from './catalog.js';

const ROUNDS = 3;

function gridSize(k) { return k <= 5 ? 3 : k <= 9 ? 4 : 5; }

async function round(stage, k, scene, r) {
  const size = gridSize(k);
  const cells = size * size;
  const objects = sample(scene.objects, k);
  const positions = sample([...Array(cells).keys()], k);
  const showMs = 2500 + k * 900;

  const grid = (content, opts = {}) => h('div', { class: 'scene-grid', style: { gridTemplateColumns: `repeat(${size}, 1fr)`, background: scene.bg } },
    [...Array(cells).keys()].map((c) => content(c, opts)));

  await stage.ask((done) => {
    const bar = h('div', { class: 'timer' }, h('div'));
    requestAnimationFrame(() => { bar.firstChild.style.transition = `width ${showMs}ms linear`; bar.firstChild.style.width = '0%'; });
    stage.wait(showMs).then(done).catch(() => {});
    return h('div', { class: 'screen' }, h('div', { class: 'muted center' }, `Manche ${r + 1} / ${ROUNDS} · ${scene.name}`), h('h2', null, 'Observe'), bar,
      grid((c) => { const i = positions.indexOf(c); return h('div', { class: 'scene-cell' }, i >= 0 ? objects[i] : ''); }));
  });

  const placed = await stage.ask((done) => {
    const at = {}; // cellule -> index d'objet
    let selected = null;
    const wrap = h('div', { class: 'screen' });
    const render = () => {
      const placedIdx = new Set(Object.values(at));
      wrap.replaceChildren(
        h('div', { class: 'muted center' }, `Manche ${r + 1} / ${ROUNDS} · ${scene.name}`),
        h('h2', null, 'Replace les objets'),
        h('p', { class: 'muted small center' }, 'Touche un objet, puis la case où il était.'),
        grid((c) => h('button', { class: `scene-cell ${at[c] != null ? 'filled' : ''}`, onclick: () => {
          if (at[c] != null) { delete at[c]; render(); return; }
          if (selected == null) return;
          at[c] = selected; selected = null; render();
        } }, at[c] != null ? objects[at[c]] : '')),
        h('div', { class: 'tray' }, shuffle(objects.map((o, i) => i), () => 0.5).map((i) => h('button', { class: `tray-obj ${selected === i ? 'sel' : ''}`, disabled: placedIdx.has(i), onclick: () => { selected = i; render(); } }, objects[i]))),
        h('div', { class: 'screen-actions' }, h('button', { class: 'btn primary', disabled: placedIdx.size < k, onclick: () => done({ ...at }) }, 'Valider')),
      );
    };
    render();
    return wrap;
  });

  let ok = 0;
  for (const [c, i] of Object.entries(placed)) if (positions[i] === Number(c)) ok++;
  const score = ok / k;
  await screen(stage, {
    icon: score >= 0.85 ? '🎯' : score >= 0.6 ? '👍' : '🌱', title: `${ok} / ${k} bien placés`,
    body: grid((c) => {
      const i = positions.indexOf(c);
      const mine = placed[c];
      const cls = i >= 0 ? (mine === i ? 'good' : 'missed') : mine != null ? 'wrong' : '';
      return h('div', { class: `scene-cell ${cls}` }, i >= 0 ? objects[i] : mine != null ? objects[mine] : '');
    }),
    buttons: [{ label: r + 1 < ROUNDS ? 'Manche suivante' : 'Terminer' }],
  });
  return score;
}

export async function play(ctx) {
  const { stage } = ctx;
  await intro(ctx, 'ouestil');
  const scenes = sample(SCENES, ROUNDS);
  let total = 0;
  for (let r = 0; r < ROUNDS; r++) {
    const k = S.ouestil.objects;
    const score = await round(stage, k, scenes[r], r);
    total += score;
    if (score >= 0.85) S.ouestil.objects = Math.min(14, k + 1);
    else if (score < 0.7) S.ouestil.objects = Math.max(3, k - 1);
    save();
    award(score >= 0.85 ? 1 : 0, { annex: true });
  }
  const avg = total / ROUNDS;
  await screen(stage, { icon: '📍', title: `${Math.round(avg * 100)} % en moyenne`, text: [`Prochaine partie : ${S.ouestil.objects} objets. La difficulté s’ajuste pour que tu réussisses environ trois manches sur quatre.`, `💡 ${CATALOG.ouestil.steps.at(-1)}`] });
  return { score: avg };
}
