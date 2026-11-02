// Briques communes aux jeux : présentation de la technique, pause avant rappel, saisie de listes.
import { h, screen, input, onEnter, matchAnswer, digitsOf, digitHits } from '../core/ui.js';
import { S, save } from '../core/store.js';
import { CATALOG } from './catalog.js';

export async function intro(ctx, id, { force = false } = {}) {
  const g = CATALOG[id];
  if (S.seenIntro[id] && !force) {
    await screen(ctx.stage, {
      icon: g.icon, title: g.name, text: g.desc,
      body: h('details', { class: 'why' }, h('summary', null, 'Rappel : pourquoi ça marche'), h('p', null, g.why), h('p', { class: 'muted' }, g.hard)),
      buttons: [{ label: 'Commencer' }],
    });
    return;
  }
  await screen(ctx.stage, {
    icon: g.icon, title: g.name,
    body: h('div', { class: 'intro' },
      h('div', { class: 'intro-block' }, h('h4', null, 'Pourquoi ça marche'), h('p', null, g.why)),
      h('div', { class: 'intro-block' }, h('h4', null, 'Pourquoi ça paraît difficile'), h('p', null, g.hard)),
      g.steps && h('div', { class: 'intro-block' }, h('h4', null, 'Comment faire'), h('ol', null, g.steps.map((s) => h('li', null, s))))),
    buttons: [{ label: 'C’est parti' }],
  });
  S.seenIntro[id] = true;
  save();
}

// Pause entre l'encodage et le rappel : interface vide, consigne claire.
export function recallBreak(ctx, text = 'Sans aide, restitue ce que tu viens d’apprendre.') {
  if (ctx.beforeRecall) return ctx.beforeRecall(text);
  return screen(ctx.stage, { icon: '🔁', title: 'Rappel', text, buttons: [{ label: 'Je suis prêt' }] });
}

// Rappel d'une liste dans l'ordre, avec des repères (lieux) ou des numéros.
export function recallOrdered(stage, { title, subtitle, n, cues }) {
  return stage.ask((done) => {
    const fields = Array.from({ length: n }, (_, i) => input({ placeholder: '…', 'aria-label': `Élément ${i + 1}` }));
    fields.forEach((f, i) => onEnter(f, () => (fields[i + 1] ? fields[i + 1].focus() : f.blur())));
    fields[0].setAttribute('data-autofocus', '');
    return h('div', { class: 'screen' },
      h('h2', null, title),
      subtitle && h('p', { class: 'muted' }, subtitle),
      h('div', { class: 'recall-list' }, fields.map((f, i) => h('label', { class: 'recall-row' },
        h('span', { class: 'recall-cue' }, cues ? h('span', null, h('span', { class: 'cue-emoji' }, cues[i].e), ' ', cues[i].l) : `${i + 1}.`), f))),
      h('div', { class: 'screen-actions' }, h('button', { class: 'btn primary', onclick: () => done(fields.map((f) => f.value)) }, 'Valider')),
    );
  });
}

// Rappel libre, dans n'importe quel ordre : on ajoute les mots un par un.
export function recallFree(stage, { title, subtitle, n }) {
  return stage.ask((done) => {
    const got = [];
    const chips = h('div', { class: 'chips' });
    const count = h('span', { class: 'muted' }, `0 / ${n}`);
    const f = input({ placeholder: 'Un mot, puis Entrée', 'data-autofocus': '' });
    const add = () => {
      const v = f.value.trim();
      if (!v) return;
      got.push(v);
      chips.append(h('span', { class: 'chip' }, v));
      f.value = '';
      count.textContent = `${got.length} / ${n}`;
      f.focus();
    };
    onEnter(f, add);
    return h('div', { class: 'screen' },
      h('h2', null, title),
      subtitle && h('p', { class: 'muted' }, subtitle),
      h('div', { class: 'row' }, f, h('button', { class: 'btn secondary small', onclick: add }, 'Ajouter')),
      count, chips,
      h('div', { class: 'screen-actions' }, h('button', { class: 'btn primary', onclick: () => { add(); done(got); } }, 'J’ai fini')),
    );
  });
}

// Une réponse, puis la correction tout de suite sur le même écran, avant de passer à la suite.
// check(valeurs) renvoie { ok, kind?, title, detail? } ; la promesse rend { values, ...check }.
export function askChecked(stage, { top, fields, check, next = 'Suivant' }) {
  return stage.ask((done) => {
    const feedback = h('div', { class: 'stack' });
    let locked = false;
    const validate = () => {
      if (locked) return;
      locked = true;
      const values = fields.map((f) => f.value);
      const r = check(values);
      fields.forEach((f) => { f.disabled = true; });
      btn.remove();
      const go = h('button', { class: 'btn primary', onclick: () => done({ values, ...r }) }, next);
      feedback.replaceChildren(
        h('div', { class: `feedback ${r.kind || (r.ok ? 'ok' : 'ko')}` }, h('div', { class: 'fb-title' }, r.title), r.detail),
        h('div', { class: 'screen-actions' }, go));
      go.focus();
      feedback.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };
    fields.forEach((f, i) => onEnter(f, () => (fields[i + 1] ? fields[i + 1].focus() : validate())));
    fields[0].setAttribute('data-autofocus', '');
    const btn = h('button', { class: 'btn primary', onclick: validate }, 'Valider');
    return h('div', { class: 'screen' }, top, fields, h('div', { class: 'screen-actions' }, btn), feedback);
  });
}

// Suite de chiffres attendue, les chiffres non retrouvés en rouge, et ce qui a été tapé.
// pairs : groupés par deux, comme à l'apprentissage ; cls : le style du grand affichage.
export function digitDiff(expected, typed, { pairs = false, cls = 'fb-answer' } = {}) {
  const t = digitsOf(typed);
  const hits = digitHits(t, expected);
  return h('div', null,
    h('div', { class: `${cls} mono digit-diff` }, [...expected].flatMap((d, i) => [pairs && i && i % 2 === 0 ? ' ' : null, h('span', { class: hits[i] ? null : 'bad' }, d)])),
    h('div', { class: 'muted' }, `Tu as tapé : ${t || '—'}`));
}

const PLACE_NOTE = {
  shift: 'Décalé : le bon mot, dans le bon ordre, mais pas dans la bonne case. Il compte quand même.',
  moved: 'Pas à sa place : retrouvé, mais hors de l’ordre. Il compte pour moitié.',
};

export function listResultView(expected, res, { cues, places } = {}) {
  const notes = ['shift', 'moved'].filter((k) => places?.some((p) => p.state === k));
  const list = h('ul', { class: 'result-list' }, expected.map((e, i) => {
    const { state, typed } = places?.[i] || {};
    return h('li', { class: res[i] ? 'ok' : state === 'moved' ? 'mid' : 'ko' },
      h('span', { class: 'mark' }, res[i] ? '✓' : state === 'moved' ? '↕' : '✗'),
      cues && h('span', { class: 'muted' }, `${cues[i].e} ${cues[i].l} · `),
      h('strong', null, e),
      state === 'shift' && h('span', { class: 'muted' }, ' · décalé'),
      state === 'moved' && h('span', { class: 'muted' }, ' · pas à sa place'),
      typed ? h('span', { class: 'muted' }, ` (tu as écrit « ${typed} »)`) : null);
  }));
  return notes.length ? h('div', { class: 'stack' }, notes.map((k) => h('p', { class: 'muted small' }, PLACE_NOTE[k])), list) : list;
}

export const gradeFor = (score) => (score >= 0.9 ? 3 : score >= 0.6 ? 2 : 1);

export function resultScreen(stage, { score, pts, body, title, text }) {
  const pct = Math.round(score * 100);
  const msg = text || (pct >= 85 ? 'Excellent : demain, on vérifie que ça tient.' : pct >= 60 ? 'Bien joué. Les erreurs corrigées maintenant reviendront plus tôt.' : 'C’est difficile, et c’est normal au début. L’effort compte plus que le score.');
  return screen(stage, {
    icon: pct >= 85 ? '🌟' : pct >= 60 ? '👍' : '🌱',
    title: title || `${pct} % retrouvés`,
    text: [msg, pts ? `+${pts} points de mémoire` : null].filter(Boolean),
    body,
  });
}

export function checkLive(text, words) {
  return words.map((w) => matchAnswer(text, w));
}
