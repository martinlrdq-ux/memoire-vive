// Briques communes aux jeux : présentation de la technique, pause avant rappel, saisie de listes.
import { h, screen, input, onEnter, matchAnswer } from '../core/ui.js';
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

export function listResultView(expected, res, { cues, answers } = {}) {
  return h('ul', { class: 'result-list' }, expected.map((e, i) => h('li', { class: res[i] ? 'ok' : 'ko' },
    h('span', { class: 'mark' }, res[i] ? '✓' : '✗'),
    cues && h('span', { class: 'muted' }, `${cues[i].e} ${cues[i].l} · `),
    h('strong', null, e),
    !res[i] && answers && answers[i] ? h('span', { class: 'muted' }, ` (tu as écrit « ${answers[i]} »)`) : null)));
}

export const gradeFor = (score) => (score >= 0.9 ? 3 : score >= 0.6 ? 2 : 1);

export function resultScreen(stage, { score, pts, body, title }) {
  const pct = Math.round(score * 100);
  const msg = pct >= 85 ? 'Excellent : demain, on vérifie que ça tient.' : pct >= 60 ? 'Bien joué. Les erreurs corrigées maintenant reviendront plus tôt.' : 'C’est difficile, et c’est normal au début. L’effort compte plus que le score.';
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
