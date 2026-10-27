// Le Palais : déposer chaque élément d'un geste sur un lieu, puis refaire la promenade.
import { h, screen, input, onEnter, textarea, listScore, toast, sheet, norm } from '../core/ui.js';
import { S, save, sample, uid, dayKey, fmtDay } from '../core/store.js';
import { GAME_WORDS } from '../data/words.js';
import { VIRTUAL_PALACES, lociOf } from '../data/palaces.js';
import { levelInfo, startBatch, createItem, recordReview, award } from '../core/engine.js';
import { intro, recallBreak, recallOrdered, listResultView, gradeFor, resultScreen } from './common.js';

export function allPalaces() {
  return [...VIRTUAL_PALACES, ...S.palaces];
}

// Taille d'un remplissage hors campagne : 10 éléments au moins, sans dépasser le nombre de lieux.
export const fillSize = (p) => Math.min(Math.max(levelInfo('palace').size, 10), lociOf(p).length);

// --- Construction guidée -------------------------------------------------------------
// On fait parcourir le lieu pas à pas, comme Ed Cooke avec Joshua Foer (Moonwalking with Einstein).

const KINDS = {
  logement: { icon: '🏠', label: 'Mon logement', name: 'Mon logement', start: 'ta porte d’entrée', area: 'pièce', first: 'Entrée' },
  enfance: { icon: '🧸', label: 'La maison de mon enfance', name: 'La maison de mon enfance', start: 'la maison de ton enfance, dehors', area: 'pièce', first: 'Dehors' },
  trajet: { icon: '🚶', label: 'Un trajet que je fais souvent', name: 'Mon trajet', start: 'ton point de départ', area: 'étape', first: 'Départ' },
};

const NEXT_PROMPTS = ['Et juste après, en avançant ?', 'Quel est l’endroit suivant, dans le sens de la marche ?', 'Encore un pas : que vois-tu ensuite ?'];

// Conseils pour choisir les lieux (MnemoRoom4U, 2022 ; le mnémoniste de Luria dont l'œuf se fondait dans un mur blanc).
const LOCUS_TIPS = [
  'Choisis un objet de taille moyenne, au sol ou contre un mur : ce qui est au plafond se revoit mal.',
  'Évite les surfaces unies : une image posée sur un mur blanc s’y fond et disparaît.',
  'Chaque lieu doit être bien distinct des autres : deux chaises identiques se confondent.',
  'Avance toujours dans le même sens, comme si tu faisais vraiment le tour.',
];

const BLAND = new Set(['mur', 'murs', 'plafond', 'sol', 'parquet', 'carrelage', 'moquette', 'plancher']);
const isBland = (s) => {
  const w = norm(s).split(' ').filter((x) => x && !['le', 'la', 'les', 'l', 'un', 'une', 'du', 'de', 'blanc', 'blanche'].includes(x));
  return w.length > 0 && w.every((x) => BLAND.has(x));
};

export async function buildPalace(stage) {
  const kindId = await stage.ask((done) => h('div', { class: 'screen' },
    h('div', { class: 'screen-icon' }, '🏛️'),
    h('h2', null, 'Construis ton palais'),
    h('p', null, 'Un palais, c’est un trajet que tu connais par cœur. Ses endroits deviennent des crochets, toujours dans le même ordre, où tu accrocheras ce que tu veux retenir.'),
    h('p', { class: 'muted' }, 'Quel lieu choisis-tu ?'),
    h('div', { class: 'palace-list' }, Object.entries(KINDS).map(([id, k]) => h('button', { class: 'palace-card', onclick: () => done(id) },
      h('span', { class: 'palace-icon' }, k.icon), h('strong', null, k.label)))),
  ));
  const kind = KINDS[kindId];
  const walk = await walkPalace(stage, kind);
  const name = input({ value: kind.name, 'data-autofocus': '' });
  const rooms = new Set(walk.roomOf).size;
  await stage.ask((done) => {
    const ok = () => { if (name.value.trim()) done(); };
    onEnter(name, ok);
    return h('div', { class: 'screen' },
      h('div', { class: 'screen-icon' }, kind.icon),
      h('h2', null, 'Donne-lui un nom'),
      h('p', { class: 'muted' }, `${walk.loci.length} lieux, ${rooms} ${kind.area}${rooms > 1 ? 's' : ''}.`),
      name,
      h('div', { class: 'screen-actions' }, h('button', { class: 'btn primary', onclick: ok }, 'Enregistrer')));
  });
  const p = { id: uid(), name: name.value.trim(), icon: kind.icon, loci: walk.loci, roomOf: walk.roomOf };
  S.palaces.push(p);
  save();
  await screen(stage, {
    icon: '🚶', title: 'Refais la promenade',
    text: [`Ferme les yeux et parcours tes ${p.loci.length} lieux dans l’ordre, puis à l’envers.`, 'Plus le trajet est fluide dans ta tête, plus le palais sera facile à remplir.'],
    buttons: [{ label: 'C’est fait' }],
  });
  return p;
}

function walkPalace(stage, kind) {
  return stage.ask((done) => {
    const loci = [];
    const roomOf = [];
    let room = kind.first;
    let fresh = true; // on vient d'entrer dans une nouvelle pièce
    let asking = false; // saisie du nom de la pièce suivante
    const wrap = h('div', { class: 'screen walk' });
    const render = () => {
      const f = input({ placeholder: loci.length ? 'Un endroit précis…' : 'ex. : le paillasson, la boîte aux lettres…', enterkeyhint: 'next' });
      const add = () => {
        const v = f.value.trim();
        if (!v) return;
        if (loci.some((l) => norm(l) === norm(v))) { toast(`« ${v} » est déjà dans ton palais : choisis un autre endroit.`); return; }
        if (isBland(v)) toast('Un mur ou un sol uni avale les images : préfère un objet posé contre.');
        loci.push(v);
        roomOf.push(room);
        fresh = false;
        render();
      };
      onEnter(f, add);
      const roomField = input({ placeholder: `Nom de la ${kind.area} suivante`, enterkeyhint: 'done' });
      const enterRoom = () => {
        const v = roomField.value.trim();
        if (!v) return;
        room = v;
        fresh = true;
        asking = false;
        render();
      };
      onEnter(roomField, enterRoom);
      const groups = [];
      loci.forEach((l, i) => {
        if (!groups.length || groups[groups.length - 1].room !== roomOf[i]) groups.push({ room: roomOf[i], items: [] });
        groups[groups.length - 1].items.push([i + 1, l]);
      });
      const prompt = loci.length ? NEXT_PROMPTS[loci.length % NEXT_PROMPTS.length] : `Tu es devant ${kind.start}. Quel est le premier endroit que tu remarques ?`;
      wrap.replaceChildren(...[
        h('div', { class: 'muted small' }, `Lieu ${loci.length + 1} · ${kind.area} : ${room}`),
        h('h2', null, prompt),
        fresh && loci.length > 0 ? h('p', { class: 'tip' }, `Avant d’avancer, rappelle-toi un moment vécu ici, dans « ${room} » : un lieu chargé de souvenirs se revoit mieux.`) : null,
        h('div', { class: 'row' }, f, h('button', { class: 'btn secondary small', onclick: add }, 'Ajouter')),
        h('p', { class: 'muted small' }, `💡 ${LOCUS_TIPS[loci.length % LOCUS_TIPS.length]}`),
        asking
          ? h('div', { class: 'row' }, roomField, h('button', { class: 'btn secondary small', onclick: enterRoom }, 'OK'))
          : h('button', { class: 'btn ghost small', onclick: () => { asking = true; render(); setTimeout(() => roomField.focus(), 60); } }, `Je passe dans une autre ${kind.area}`),
        groups.length ? h('div', { class: 'walk-list' }, groups.map((g) => h('div', null,
          h('div', { class: 'walk-room' }, g.room),
          h('ol', { start: g.items[0][0] }, g.items.map(([, l]) => h('li', null, l)))))) : null,
        loci.length ? h('button', { class: 'btn ghost small', onclick: () => { loci.pop(); room = roomOf.pop() || room; render(); } }, 'Retirer le dernier lieu') : null,
        h('div', { class: 'screen-actions' },
          h('p', { class: 'muted small center' }, loci.length < 5 ? `Encore ${5 - loci.length} lieu${5 - loci.length > 1 ? 'x' : ''} au minimum. 10 à 20, c’est l’idéal.` : 'Tu peux continuer : 10 à 20 lieux, c’est l’idéal.'),
          h('button', { class: 'btn primary', disabled: loci.length < 5, onclick: () => done({ loci, roomOf }) }, `J’ai fini (${loci.length} lieu${loci.length > 1 ? 'x' : ''})`)),
      ].filter(Boolean));
      if (!asking) setTimeout(() => f.focus(), 60);
    };
    render();
    return wrap;
  });
}

// --- Modification (texte libre) ------------------------------------------------------
// Une ligne par lieu ; une ligne qui finit par « : » ouvre une nouvelle pièce.

function palaceText(p) {
  if (!p.roomOf) return p.loci.join('\n');
  const out = [];
  p.loci.forEach((l, i) => {
    if (p.roomOf[i] !== p.roomOf[i - 1]) out.push(`${p.roomOf[i]} :`);
    out.push(l);
  });
  return out.join('\n');
}

function parsePalaceText(text) {
  const loci = [];
  const roomOf = [];
  let room = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (/:$/.test(line) && line.length > 1) { room = line.slice(0, -1).trim(); continue; }
    loci.push(line);
    roomOf.push(room);
  }
  return { loci, roomOf: roomOf.some(Boolean) ? roomOf.map((r) => r || roomOf.find(Boolean)) : undefined };
}

export async function editPalace(existing) {
  const name = input({ placeholder: 'ex. : Mon appartement, le trajet du bureau', value: existing?.name || '' });
  const ta = textarea({ placeholder: 'Un lieu par ligne, dans l’ordre de la promenade.\nPour changer de pièce, une ligne qui finit par « : »\nEntrée :\nPaillasson\nPortemanteau…', rows: 10, value: existing ? palaceText(existing) : '' });
  const ok = await sheet({
    title: existing ? 'Modifier ton palais' : 'Créer ton palais',
    text: 'Note les endroits dans l’ordre où tu les croises : au moins 5, idéalement 20 ou plus. Une ligne qui finit par « : » ouvre une nouvelle pièce.',
    body: h('div', { class: 'stack' }, name, ta),
    buttons: [{ label: 'Enregistrer', value: true, kind: 'primary' }, { label: 'Annuler', value: false }],
  });
  if (!ok) return null;
  const { loci, roomOf } = parsePalaceText(ta.value);
  if (loci.length < 5 || !name.value.trim()) { toast('Il faut un nom et au moins 5 lieux.'); return null; }
  if (existing) {
    Object.assign(existing, { name: name.value.trim(), loci, roomOf });
    if (!roomOf) delete existing.roomOf;
    save();
    return existing;
  }
  const p = { id: uid(), name: name.value.trim(), icon: '🏠', loci, ...(roomOf ? { roomOf } : {}) };
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
      h('button', { class: 'btn secondary', onclick: () => done('new') }, '+ Construire mon propre palais')));
    if (choice !== 'new') { S.records.lastPalace = choice.id; save(); return choice; }
    const p = await buildPalace(stage);
    if (lociOf(p).length >= n) return p;
    toast(`Ton palais est enregistré, mais il faut ${n} lieux pour ce niveau.`);
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

// --- Dépôt, avec un coach d'images ------------------------------------------------------
// Les réflexes de la Rhetorica ad Herennium, tels qu'Ed Cooke les enseigne : taille, mouvement, parole, sens, absurde.

const COACH = [
  'Exagère la taille : l’objet devient géant et écrase le lieu.',
  'Fais-le bouger : il saute, tourne, déborde de partout.',
  'Fais-le parler : que dit-il au lieu ? Ils se disputent ?',
  'Ajoute une odeur, un goût, une texture : chaud, collant, piquant ?',
  'Rends la scène absurde ou drôle : plus c’est bizarre, mieux ça tient.',
  'Abîme-le : couvert de peinture rouge, de boue, en miettes.',
  'Fais-le agir sur le lieu : il le casse, le remplit, le fait fondre.',
  'Un seul détail frappant suffit : sa couleur, son bruit, son éclat.',
];

function placeItems(stage, items, loci, { chrono }) {
  return stage.ask((done) => {
    let k = 0;
    let tip = Math.floor(Math.random() * COACH.length);
    const images = [];
    const t0 = Date.now();
    const wrap = h('div', { class: 'screen palace-screen' });
    const render = () => {
      const target = loci[k];
      const roomName = target.room;
      const roomLoci = loci.map((l, i) => ({ ...l, i })).filter((l) => l.room === roomName);
      const f = chrono ? null : input({ placeholder: 'Ta scène en quelques mots (facultatif)' });
      const place = () => {
        images[k] = f ? f.value.trim() : '';
        const cell = wrap.querySelector(`[data-i="${k}"]`);
        cell?.classList.add('placed');
        k++;
        if (k >= items.length) setTimeout(() => done({ images, ms: Date.now() - t0 }), 350);
        else setTimeout(render, 300);
      };
      if (f) onEnter(f, () => f.blur());
      tip = (tip + 1) % COACH.length;
      const tipText = h('span', null, chrono ? COACH[COACH.length - 1] : COACH[tip]);
      const other = () => { tip = (tip + 1) % COACH.length; tipText.textContent = COACH[tip]; };
      wrap.replaceChildren(
        h('div', { class: 'palace-top' },
          h('div', { class: 'muted' }, `${k + 1} / ${items.length} · ${roomName}`),
          h('div', { class: 'carry' }, h('span', { class: 'muted' }, 'À déposer : '), h('strong', null, items[k])),
          h('div', { class: 'muted' }, `sur « ${target.l} »`),
          h('div', { class: 'tip coach' }, h('p', null, '💡 ', tipText), chrono ? null : h('button', { class: 'btn ghost small', onclick: other }, 'Autre idée')),
          f,
          h('div', { class: 'muted small' }, 'Quand tu vois la scène, touche le lieu qui brille.')),
        h('div', { class: 'room-grid' }, roomLoci.map((l) => h('button', {
          class: `locus ${l.i < k ? 'done' : ''} ${l.i === k ? 'target' : ''}`, 'data-i': l.i, disabled: l.i !== k,
          onclick: place,
        }, h('span', { class: 'locus-emoji' }, l.e), h('span', { class: 'locus-label' }, l.l), l.i < k ? h('span', { class: 'locus-item' }, items[l.i]) : null))),
      );
    };
    render();
    return wrap;
  });
}

export async function play(ctx) {
  const { stage } = ctx;
  await intro(ctx, 'palais');
  const n = ctx.size || levelInfo('palace').size;
  const palace = ctx.palace || await choosePalace(stage, n);
  if (ctx.palace) { S.records.lastPalace = palace.id; save(); }
  const items = sample(GAME_WORDS, n);
  const loci = lociFor(palace, n);
  if (ctx.chrono) await screen(stage, { icon: '⏱️', title: 'Défi chrono', text: `${n} éléments à déposer le plus vite possible, puis à restituer. Le chrono démarre maintenant.`, buttons: [{ label: 'Go !' }] });
  else if (ctx.palace) await screen(stage, { icon: palace.icon, title: palace.name, text: [`${n} objets à déposer, un par lieu, dans l’ordre de ta promenade.`, 'Pour chacun, suis l’idée du coach et prends le temps de voir la scène.'], buttons: [{ label: 'C’est parti' }] });
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
