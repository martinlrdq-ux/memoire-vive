// Le Palais : déposer chaque élément d'un geste sur un lieu, puis refaire la promenade.
import { h, screen, input, onEnter, textarea, listScore, toast, sheet, norm } from '../core/ui.js';
import { S, save, sample, uid, dayKey, fmtDay } from '../core/store.js';
import { GAME_WORDS } from '../data/words.js';
import { VIRTUAL_PALACES, lociOf } from '../data/palaces.js';
import { levelInfo, startBatch, createItem, recordReview, award, eveningDue, recordLoci, recallChance, deleteItem } from '../core/engine.js';
import { intro, recallBreak, recallOrdered, listResultView, gradeFor, resultScreen } from './common.js';

export function allPalaces() {
  return [...VIRTUAL_PALACES, ...S.palaces];
}

// --- Guide : le palais mental expliqué simplement ------------------------------------------

export function guideBody() {
  const block = (title, ...kids) => h('div', { class: 'intro-block' }, h('h4', null, title), ...kids);
  return h('div', { class: 'intro guide' },
    block('🏛️ C’est quoi ?',
      h('p', null, 'Un endroit que tu connais par cœur, ton logement par exemple. Ses meubles deviennent des cases de rangement, toujours dans le même ordre : la porte, puis le paillasson, puis le portemanteau…')),
    block('🧠 Pourquoi ça marche ?',
      h('p', null, 'Ta mémoire retient mal une liste de mots, mais très bien les images et les lieux. Alors tu transformes chaque chose à retenir en une image un peu folle, posée sur un meuble. Pour la retrouver, tu refais le tour dans ta tête et tu regardes ce qu’il y a sur chaque meuble.')),
    block('🛒 Un exemple',
      h('p', null, 'Courses : farine, œufs, piles.'),
      h('ul', null,
        h('li', null, 'Un sac de farine explose sur ton paillasson.'),
        h('li', null, 'Des œufs font éclore des poussins sur le portemanteau.'),
        h('li', null, 'Des piles font clignoter le miroir comme un sapin.')),
      h('p', null, 'Au magasin, tu refais le tour : le paillasson… la farine ! Le portemanteau… les œufs !')),
    block('📍 Quand s’en servir ?',
      h('ul', null,
        h('li', null, 'Quand tu ne peux pas noter : au volant, sous la douche, en pleine conversation.'),
        h('li', null, 'Quand tu dois parler sans notes : une réunion, un oral, un discours.'),
        h('li', null, 'Quand tu veux savoir quelque chose par cœur.')),
      h('p', { class: 'muted' }, 'Une liste que tu peux noter sur ton téléphone ? Garde le téléphone, c’est très bien aussi.')),
    block('🪜 Dans Kikory, 3 étapes',
      h('ol', null,
        h('li', null, h('strong', null, 'Construire ton palais'), ' (une seule fois, 2 minutes) : l’app te fait faire le tour de ton logement et tu notes 10 à 20 endroits dans l’ordre.'),
        h('li', null, h('strong', null, 'T’entraîner avec « Remplir »'), ' : l’app pose des mots au hasard dans ton palais. C’est pour prendre le coup de main.'),
        h('li', null, h('strong', null, 'T’en servir avec « Ranger une liste »'), ' : tu y ranges ce que tu dois vraiment retenir (des courses, les points d’une réunion). Le soir même, l’app te le redemande.'),
        h('li', null, h('strong', null, 'Vider la pièce'), ' quand la liste ne sert plus (les courses sont faites) : la place est libre pour la suivante. Touche ton palais dans « Mes palais » pour voir ce qui y est rangé.'))),
    block('💡 Une bonne image',
      h('ul', null,
        h('li', null, 'Énorme, qui bouge, bizarre ou drôle.'),
        h('li', null, 'Avec une odeur, un bruit, une sensation.'),
        h('li', null, 'Un mot abstrait ? Change-le en objet : « appeler la banque » devient un téléphone en or.'))),
  );
}

export function palaceGuide() {
  S.seenIntro.palaceGuide = true;
  save();
  return sheet({ title: 'Le palais mental', body: guideBody(), buttons: [{ label: 'J’ai compris', value: true, kind: 'primary' }] });
}

// Au premier usage, le guide s'affiche dans l'écran en cours.
async function guideOnce(stage, label) {
  if (S.seenIntro.palaceGuide) return;
  await screen(stage, { title: 'Le palais mental', body: guideBody(), buttons: [{ label }] });
  S.seenIntro.palaceGuide = true;
  save();
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
  await guideOnce(stage, 'J’ai compris, on construit');
  const kindId = await stage.ask((done) => h('div', { class: 'screen' },
    h('div', { class: 'screen-icon' }, '🏛️'),
    h('h2', null, 'Construis ton palais'),
    h('p', null, 'Tu vas faire le tour d’un endroit dans ta tête et noter, dans l’ordre, ce que tu croises : la porte, le paillasson, le portemanteau… Ce seront tes cases de rangement.'),
    h('p', { class: 'muted' }, 'Quel endroit connais-tu le mieux ?'),
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

async function choosePalace(stage, n, { title = 'Choisis ton palais' } = {}) {
  for (;;) {
    const choice = await stage.ask((done) => h('div', { class: 'screen' },
      h('h2', null, title),
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

// Lieux utilisés pour l'entraînement : on fait tourner la pièce de départ (palais fournis) et on évite
// les lieux qui gardent une vraie liste, pour ne pas mélanger les images.
function lociFor(palace, n) {
  const all = lociOf(palace);
  let start = 0;
  if (palace.rooms) {
    const runs = (S.records.palaceRuns = (S.records.palaceRuns || 0) + 1);
    start = ((runs - 1) % palace.rooms.length) * palace.rooms[0].loci.length;
  }
  const order = all.map((_, i) => (start + i) % all.length);
  const used = occupancy(palace);
  const free = order.filter((i) => !used[i]);
  return (free.length >= n ? free : order).slice(0, n).map((i) => all[i]);
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

// Pour une vraie liste : d'abord rendre concret ce qui ne l'est pas ; pour une prise de parole, une scène par idée.
const CONCRETE = 'C’est abstrait ? Remplace-le par un objet, ou un mot qui sonne pareil : « appeler la banque » devient un téléphone en lingot d’or.';
const TALK = 'Une seule scène pour toute l’idée : résume ce point en une image, puis pose-la sur le lieu.';

function placeItems(stage, items, loci, { chrono, real, talk } = {}) {
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
      const first = talk ? TALK : real && /\s/.test(items[k]) ? CONCRETE : null;
      const tipText = h('span', null, chrono ? COACH[COACH.length - 1] : first || COACH[tip]);
      const other = () => { tip = (tip + 1) % COACH.length; tipText.textContent = COACH[tip]; };
      wrap.replaceChildren(
        h('div', { class: 'palace-top' },
          h('div', { class: 'muted' }, `${k + 1} / ${items.length} · ${roomName}`),
          h('div', { class: `carry ${items[k].length > 24 ? 'long' : ''}` }, h('span', { class: 'muted' }, talk ? 'Idée à déposer : ' : 'À déposer : '), h('strong', null, items[k])),
          h('div', { class: 'muted' }, `sur « ${target.l} »`),
          h('div', { class: 'tip coach' }, h('p', null, '💡 ', tipText), chrono ? null : h('button', { class: 'btn ghost small', onclick: other }, 'Autre idée')),
          f,
          h('div', { class: 'muted small' }, 'Imagine la scène quelques secondes, puis touche l’endroit qui brille.')),
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

// --- Ranger une vraie liste ou une prise de parole -------------------------------------
// Chaque liste rangée occupe des lieux précis (extra.loc) : on la met dans une pièce choisie, de préférence libre.

function roomsOf(p) {
  const rooms = [];
  lociOf(p).forEach((l, i) => {
    let r = rooms[rooms.length - 1];
    if (!r || r.name !== l.room) rooms.push((r = { name: l.room, start: i, n: 0 }));
    r.n++;
  });
  return rooms;
}

// Lieu → titre de la liste qui l'occupe encore dans le Coffre.
function occupancy(p) {
  const used = {};
  for (const it of Object.values(S.items)) {
    if (it.extra?.stored && it.extra.palace === p.id) for (const i of it.extra.loc || []) used[i] = it.prompt;
  }
  return used;
}

async function chooseRoom(stage, palace, n) {
  const rooms = roomsOf(palace);
  if (rooms.length < 2) return 0;
  const used = occupancy(palace);
  // Ce qui occupe déjà les lieux de la pièce elle-même (le débordement éventuel sur la suivante est signalé à part).
  const info = rooms.map((r) => {
    const busy = new Set();
    for (let i = r.start; i < r.start + r.n; i++) if (used[i]) busy.add(used[i]);
    return { ...r, busy: [...busy] };
  });
  const best = info.find((r) => !r.busy.length && r.n >= n) || info.find((r) => !r.busy.length) || info[0];
  return stage.ask((done) => h('div', { class: 'screen' },
    h('h2', null, 'Dans quelle pièce ?'),
    h('p', { class: 'muted' }, `Range chaque liste dans sa propre pièce : les images ne se mélangent pas. Choisis de préférence une pièce libre (✨). Il faut ${n} endroit${n > 1 ? 's' : ''}.`),
    h('div', { class: 'palace-list' }, info.map((r) => h('button', { class: `palace-card ${r === best ? 'last' : ''}`, onclick: () => done(r.start) },
      h('span', { class: 'palace-icon' }, r.busy.length ? '🧳' : '✨'),
      h('span', null, h('strong', null, r.name), h('br'),
        h('small', { class: 'muted' }, `${r.n} lieu${r.n > 1 ? 'x' : ''} · ${r.busy.length ? `déjà occupée : « ${r.busy.join(' », « ')} »` : 'libre'}${r.n < n ? ' · trop petite, on continue dans la suivante' : ''}`))))),
  ));
}

// src « culture » : une liste toute prête du Savoir du jour (theme dit laquelle de ses thématiques).
export async function storeInPalace(stage, { title, items, hint = '', cat = 'liste', talk = false, src = 'mavie', theme = null }) {
  const n = items.length;
  await guideOnce(stage, 'J’ai compris');
  const palace = await choosePalace(stage, n, { title: talk ? 'Dans quel palais ranger ta prise de parole ?' : 'Dans quel palais ranger ta liste ?' });
  const start = await chooseRoom(stage, palace, n);
  const all = lociOf(palace);
  const loc = Array.from({ length: n }, (_, i) => (start + i) % all.length);
  const loci = loc.map((i) => all[i]);
  await screen(stage, {
    icon: talk ? '🎤' : palace.icon, title,
    text: talk
      ? [`Tes ${n} idées vont être posées une par une sur les endroits de ton palais, dans l’ordre où tu veux les dire.`, 'Pour chaque idée, imagine une scène sur l’endroit indiqué, puis touche cet endroit.', 'Le jour J, tu refais le tour dans ta tête : chaque endroit te rappelle l’idée suivante. Plus besoin de notes.']
      : [`Tes ${n} éléments vont être posés un par un sur les endroits de ton palais.`, 'Pour chacun, imagine une scène sur l’endroit indiqué (l’encadré 💡 te donne une idée), puis touche cet endroit.', 'Au moment où tu en auras besoin, refais le tour dans ta tête : chaque endroit te rend ce que tu y as posé.'],
    buttons: [{ label: 'C’est parti' }],
  });
  const { images } = await placeItems(stage, items, loci, { real: true, talk });
  await screen(stage, { icon: '🚶', title: 'La promenade', text: 'Ferme les yeux et refais la promenade dans ta tête, lieu après lieu.', buttons: [{ label: 'C’est fait' }] });
  if (talk) {
    await screen(stage, {
      icon: '🎤', title: 'Répète à voix haute',
      text: ['Fais ta prise de parole à voix haute, sans notes : parcours ton palais, et chaque lieu te donne l’idée suivante.', 'Si une idée ne revient pas, sa scène était trop faible : tu le verras juste après.'],
      buttons: [{ label: 'C’est fait' }],
    });
  }
  const answers = await recallOrdered(stage, { title, subtitle: 'Qu’as-tu rangé ici ?', n, cues: loci });
  const { res, score } = listScore(answers, items, true);
  recordLoci(palace.id, loci, res);
  createItem({
    type: 'list', src, prompt: title, answer: items, hint: [hint, ...images].filter(Boolean).join(' · '),
    extra: { cat, ordered: true, cues: loci, palace: palace.id, loc, stored: true, theme }, due: eveningDue(),
  });
  await resultScreen(stage, {
    score,
    text: 'Rangé dans le Coffre. Ce soir, je te redemande la promenade, puis elle reviendra juste avant l’oubli.',
    body: listResultView(items, res, { cues: loci, answers }),
  });
}

// --- Mon palais : ce qui est rangé où, et vider une pièce ------------------------------------

// Les vraies listes rangées dans ce palais (les entraînements « Remplir » n'occupent pas de lieu).
export function storedLists(p) {
  return Object.values(S.items).filter((it) => it.extra?.stored && it.extra.palace === p.id);
}

const STRENGTH = [
  { min: 0.9, dot: '🟢', label: 'solide' },
  { min: 0.7, dot: '🟠', label: 'à revoir bientôt' },
  { min: 0, dot: '🔴', label: 's’efface' },
];
function strength(item) {
  const r = recallChance(item);
  if (r == null) return { dot: '⚪', label: 'nouveau, revient ce soir' };
  return STRENGTH.find((x) => r >= x.min);
}

// Lieux où l'on se trompe au moins une fois sur deux (3 rappels au moins).
function flaky(p) {
  const st = S.palaceStats[p.id] || {};
  return new Set(Object.entries(st).filter(([, x]) => x.ok + x.ko >= 3 && x.ko / (x.ok + x.ko) >= 0.5).map(([k]) => k));
}

function palaceViewScreen(palace, done) {
  const all = lociOf(palace);
  const lists = storedLists(palace);
  const at = {}; // lieu → { item, k }
  for (const it of lists) (it.extra.loc || []).forEach((i, k) => { at[i] = { item: it, k }; });
  const bad = flaky(palace);
  const badNames = all.filter((l) => bad.has(`${l.room}|${l.l}`)).map((l) => l.l);
  return h('div', { class: 'screen' },
    h('div', { class: 'screen-icon' }, palace.icon),
    h('h2', null, palace.name),
    h('p', { class: 'muted center' }, `${all.length} lieux · ${lists.length ? `${lists.length} liste${lists.length > 1 ? 's' : ''} rangée${lists.length > 1 ? 's' : ''}` : 'rien de rangé pour l’instant'}`),
    h('p', { class: 'tip' }, 'Ici, tu vois ce qui est rangé sur chaque endroit, et si le souvenir tient encore. Les réponses sont cachées : essaie d’abord de les retrouver de tête, puis touche une ligne pour vérifier.'),
    h('p', { class: 'muted small center' }, '🟢 solide · 🟠 à revoir bientôt · 🔴 s’efface · ⚪ nouveau'),
    roomsOf(palace).map((r) => {
      const idx = Array.from({ length: r.n }, (_, i) => r.start + i);
      const busy = [...new Set(idx.map((i) => at[i]?.item).filter(Boolean))];
      return h('div', { class: 'room-card' },
        h('div', { class: 'room-head' },
          h('span', null, h('strong', null, r.name), ' ', h('small', { class: 'muted' }, busy.length ? '· occupée' : '· libre ✨')),
          busy.length ? h('button', { class: 'btn ghost small', onclick: () => done({ empty: r }) }, 'Vider cette pièce') : null),
        h('ol', { class: 'locus-rows', start: r.start + 1 }, idx.map((i) => {
          const l = all[i];
          const a = at[i];
          const hint = bad.has(`${l.room}|${l.l}`) ? h('small', { class: 'warn-text' }, ' ⚠️ souvent oublié') : null;
          if (!a) return h('li', null, h('span', null, l.l, hint), h('small', { class: 'muted' }, ' · libre'));
          const st = strength(a.item);
          const ans = h('span', { class: 'answer hidden' }, a.item.answer[a.k]);
          return h('li', { class: 'busy', onclick: () => ans.classList.toggle('hidden') },
            h('span', null, l.l, hint, h('br'), ans),
            h('small', { class: 'muted right' }, `${st.dot} ${a.item.prompt}`));
        })));
    }),
    badNames.length ? h('p', { class: 'tip' }, `⚠️ Ces endroits te font souvent défaut : ${badNames.join(', ')}. Rends-les plus marquants (revois-les en détail, avec un souvenir), ou remplace-les par un endroit plus distinct avec « Modifier ».`) : null,
    h('div', { class: 'screen-actions' }, h('button', { class: 'btn primary', onclick: () => done('close') }, 'Fermer')),
  );
}

async function emptyRoom(stage, palace, room) {
  const lists = storedLists(palace).filter((it) => (it.extra.loc || []).some((i) => i >= room.start && i < room.start + room.n));
  const ok = await screen(stage, {
    icon: '🧽', title: `Vider « ${room.name} » ?`,
    text: [
      `Les listes rangées ici vont être retirées du Coffre, en entier : ${lists.map((it) => `« ${it.prompt} »`).join(', ')}.`,
      'Fais-le quand tu n’en as plus besoin : les courses sont faites, la réunion est passée. La pièce sera libre pour la prochaine liste.',
    ],
    buttons: [{ label: 'Vider la pièce', value: true, kind: 'danger' }, { label: 'Annuler', value: false }],
  });
  if (!ok) return;
  await screen(stage, {
    icon: '🧽', title: 'Efface les images',
    text: ['Ferme les yeux et refais le tour de la pièce. Sur chaque endroit, passe un coup d’éponge sur l’image : l’endroit redevient comme d’habitude.', 'C’est ce que font les champions de mémoire avant de réutiliser un palais : les vieilles images ne viennent plus brouiller les nouvelles.'],
    buttons: [{ label: 'C’est fait' }],
  });
  for (const it of lists) deleteItem(it.id);
  toast(`« ${room.name} » est libre ✨`, 'ok');
}

export async function showPalace(stage, palace) {
  for (;;) {
    const a = await stage.ask((done) => palaceViewScreen(palace, done));
    if (a === 'close') return;
    if (a.empty) await emptyRoom(stage, palace, a.empty);
  }
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
  else if (ctx.palace) await screen(stage, { icon: palace.icon, title: palace.name, text: [`C’est l’entraînement : ${n} mots au hasard, un sur chaque endroit de ton palais.`, 'Pour chacun, imagine une scène un peu folle sur l’endroit indiqué (l’encadré 💡 te donne une idée), puis touche cet endroit.', 'À la fin, tu refais le tour dans ta tête et tu retrouves les mots.'], buttons: [{ label: 'C’est parti' }] });
  const { images, ms } = await placeItems(stage, items, loci, { chrono: ctx.chrono });
  await screen(stage, { icon: '🚶', title: 'La promenade', text: 'Ferme les yeux quelques secondes et refais la promenade dans ta tête, lieu après lieu.', buttons: [{ label: 'C’est fait' }] });
  await recallBreak(ctx, 'Refais la promenade et retrouve l’élément déposé sur chaque lieu.');
  const answers = await recallOrdered(stage, { title: palace.name, subtitle: 'Qu’as-tu déposé ici ?', n, cues: loci });
  const { res, score } = listScore(answers, items, true);
  recordLoci(palace.id, loci, res);
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
