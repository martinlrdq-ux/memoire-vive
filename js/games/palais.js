// Le Palais : déposer chaque élément d'un geste sur un lieu, puis refaire la promenade.
import { h, screen, input, onEnter, textarea, listScore, toast, sheet } from '../core/ui.js';
import { S, save, sample, uid, dayKey, fmtDay } from '../core/store.js';
import { GAME_WORDS } from '../data/words.js';
import { VIRTUAL_PALACES, lociOf } from '../data/palaces.js';
import { levelInfo, startBatch, createItem, recordReview, award } from '../core/engine.js';
import { intro, recallBreak, recallOrdered, listResultView, gradeFor, resultScreen } from './common.js';

export function allPalaces() {
  return [...VIRTUAL_PALACES, ...S.palaces];
}

export async function editPalace(existing) {
  const name = input({ placeholder: 'ex. : Mon appartement, le trajet du bureau', value: existing?.name || '' });
  const ta = textarea({ placeholder: 'Un lieu par ligne, dans l’ordre de la promenade :\nPorte d’entrée\nPaillasson\nPortemanteau…', rows: 8, value: existing?.loci.join('\n') || '' });
  const ok = await sheet({
    title: existing ? 'Modifier ton palais' : 'Créer ton palais',
    text: 'Choisis un lieu que tu connais par cœur. Note les endroits dans l’ordre où tu les croises : au moins 5, idéalement 20 ou plus.',
    body: h('div', { class: 'stack' }, name, ta),
    buttons: [{ label: 'Enregistrer', value: true, kind: 'primary' }, { label: 'Annuler', value: false }],
  });
  if (!ok) return null;
  const loci = ta.value.split('\n').map((s) => s.trim()).filter(Boolean);
  if (loci.length < 5 || !name.value.trim()) { toast('Il faut un nom et au moins 5 lieux.'); return null; }
  if (existing) { existing.name = name.value.trim(); existing.loci = loci; save(); return existing; }
  const p = { id: uid(), name: name.value.trim(), icon: '🏠', loci };
  S.palaces.push(p);
  save();
  return p;
}

async function choosePalace(stage, n) {
  for (;;) {
    const choice = await stage.ask((done) => h('div', { class: 'screen' },
      h('h2', null, 'Choisis ton palais'),
      h('p', { class: 'muted' }, `Il faut au moins ${n} lieux.`),
      h('div', { class: 'palace-list' }, allPalaces().map((p) => {
        const count = lociOf(p).length;
        const enough = count >= n;
        return h('button', { class: `palace-card ${S.records.lastPalace === p.id ? 'last' : ''}`, disabled: !enough, onclick: () => done(p) },
          h('span', { class: 'palace-icon' }, p.icon), h('span', null, h('strong', null, p.name), h('br'), h('small', { class: 'muted' }, enough ? `${count} lieux` : `${count} lieux, pas assez`)));
      })),
      h('button', { class: 'btn secondary', onclick: () => done('new') }, '+ Créer mon propre palais')));
    if (choice !== 'new') { S.records.lastPalace = choice.id; save(); return choice; }
    const p = await editPalace();
    if (p) return p;
  }
}

// Lieux utilisés : on fait tourner la pièce de départ pour limiter les interférences.
function lociFor(palace, n) {
  const all = lociOf(palace);
  if (!palace.rooms) return all.slice(0, n);
  const runs = (S.records.palaceRuns = (S.records.palaceRuns || 0) + 1);
  const start = ((runs - 1) % palace.rooms.length) * palace.rooms[0].loci.length;
  return Array.from({ length: n }, (_, i) => all[(start + i) % all.length]);
}

function placeItems(stage, items, loci, { chrono }) {
  return stage.ask((done) => {
    let k = 0;
    const images = [];
    const t0 = Date.now();
    const wrap = h('div', { class: 'screen palace-screen' });
    const render = () => {
      const target = loci[k];
      const roomName = target.room;
      const roomLoci = loci.map((l, i) => ({ ...l, i })).filter((l) => l.room === roomName);
      const f = chrono ? null : input({ placeholder: 'Ton image vivante (optionnel)' });
      const place = () => {
        images[k] = f ? f.value.trim() : '';
        const cell = wrap.querySelector(`[data-i="${k}"]`);
        cell?.classList.add('placed');
        k++;
        if (k >= items.length) setTimeout(() => done({ images, ms: Date.now() - t0 }), 350);
        else setTimeout(render, 300);
      };
      if (f) onEnter(f, () => f.blur());
      wrap.replaceChildren(
        h('div', { class: 'palace-top' },
          h('div', { class: 'muted' }, `${k + 1} / ${items.length} · ${roomName}`),
          h('div', { class: 'carry' }, h('span', { class: 'muted' }, 'À déposer : '), h('strong', null, items[k])),
          h('div', { class: 'muted small' }, `Imagine ${items[k]} sur « ${target.l} », vivant, en mouvement. Puis touche le lieu qui brille.`),
          f),
        h('div', { class: 'room-grid' }, roomLoci.map((l) => h('button', {
          class: `locus ${l.i < k ? 'done' : ''} ${l.i === k ? 'target' : ''}`, 'data-i': l.i, disabled: l.i !== k,
          onclick: place,
        }, h('span', { class: 'locus-emoji' }, l.e), h('span', { class: 'locus-label' }, l.l), l.i < k ? h('span', { class: 'locus-item' }, items[l.i]) : null))),
      );
      if (f && !chrono && k === 0) setTimeout(() => f.focus(), 80);
    };
    render();
    return wrap;
  });
}

export async function play(ctx) {
  const { stage } = ctx;
  await intro(ctx, 'palais');
  const n = ctx.size || levelInfo('palace').size;
  const palace = await choosePalace(stage, n);
  const items = sample(GAME_WORDS, n);
  const loci = lociFor(palace, n);
  if (ctx.chrono) await screen(stage, { icon: '⏱️', title: 'Défi chrono', text: `${n} éléments à déposer le plus vite possible, puis à restituer. Le chrono démarre maintenant.`, buttons: [{ label: 'Go !' }] });
  const { images, ms } = await placeItems(stage, items, loci, { chrono: ctx.chrono });
  await screen(stage, { icon: '🚶', title: 'La promenade', text: 'Ferme les yeux quelques secondes et refais la promenade dans ta tête, lieu après lieu.', buttons: [{ label: 'C’est fait' }] });
  await recallBreak(ctx, 'Refais la promenade et retrouve l’élément déposé sur chaque lieu.');
  const answers = await recallOrdered(stage, { title: palace.name, subtitle: 'Qu’as-tu déposé ici ?', n, cues: loci });
  const { res, score } = listScore(answers, items, true);
  let pts = 0;
  let extra = null;
  if (ctx.chrono) {
    const sec = Math.round(ms / 1000);
    const key = `chrono${n}`;
    const best = S.records[key];
    if (score >= 0.8 && (!best || sec < best)) { S.records[key] = sec; save(); }
    pts = award(Math.round(score * n), { annex: true });
    extra = h('p', null, `Temps de placement : ${sec} s${best ? ` (record : ${Math.min(best, score >= 0.8 ? sec : best)} s)` : ''}`);
  } else {
    const batch = startBatch('palace', n, { palace: palace.id });
    const item = createItem({ type: 'list', src: 'palace', prompt: `${palace.name} · ${fmtDay(dayKey(), { day: 'numeric', month: 'long' })}`, answer: items, hint: images.filter(Boolean).join(' · '), extra: { ordered: true, cues: loci, palace: palace.id }, batch });
    pts = recordReview(item, gradeFor(score), { score, ctx: 'i', annex: ctx.annex }).pts;
    if (n >= 20 && score >= 0.8) S.records.palace20 = true;
    if (n >= 50 && score >= 0.8) S.records.palace50 = true;
    save();
  }
  await resultScreen(stage, { score, pts, body: h('div', null, extra, listResultView(items, res, { cues: loci, answers })) });
  return { score };
}
