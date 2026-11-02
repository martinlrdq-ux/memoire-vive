// Petits outils d'interface : création d'éléments, scène plein écran, toasts, vérification des réponses.

export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (['value', 'checked', 'disabled', 'selected'].includes(k)) el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  append(el, kids);
  return el;
}

function append(el, kids) {
  for (const k of kids) {
    if (k == null || k === false) continue;
    if (Array.isArray(k)) append(el, k);
    else el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}

export const ABORT = Symbol('abort');

// Scène plein écran pour les jeux et les sessions : chaque étape attend une action.
export class Stage {
  constructor(title, { onClose, confirmClose = true } = {}) {
    this.aborted = false;
    this.pending = new Set();
    this.timers = new Set();
    this.onClose = onClose;
    this.titleEl = h('div', { class: 'stage-title' }, title);
    this.progressEl = h('div', { class: 'stage-progress' }, h('div'));
    this.body = h('div', { class: 'stage-body' });
    const close = h('button', {
      class: 'icon-btn', 'aria-label': 'Fermer',
      onclick: async () => {
        if (!confirmClose || (await sheet({ title: 'Quitter ?', text: 'Ce que tu as déjà appris est conservé dans le Coffre.', buttons: [{ label: 'Quitter', value: true, kind: 'danger' }, { label: 'Continuer', value: false }] }))) this.close();
      },
    }, '✕');
    this.el = h('div', { class: 'stage' }, h('div', { class: 'stage-head' }, close, this.titleEl, h('div', { style: { width: '40px' } })), this.progressEl, this.body);
    document.body.append(this.el);
    document.body.classList.add('stage-open');
    requestAnimationFrame(() => this.el.classList.add('in'));
  }
  setTitle(t) { this.titleEl.textContent = t; }
  setProgress(p) {
    this.progressEl.style.visibility = p == null ? 'hidden' : 'visible';
    this.progressEl.firstChild.style.width = `${Math.round((p || 0) * 100)}%`;
  }
  // `slide` : le nouvel écran glisse en place (pas le premier, la scène arrive déjà ;
  // ni les affichages minutés, qui appellent show directement et doivent apparaître d'un coup).
  show(node, slide = false) {
    if (slide && this.body.firstChild) node.classList?.add('step-in');
    this.body.replaceChildren(node);
    this.body.scrollTop = 0;
    const af = node.querySelector?.('[data-autofocus]');
    if (af) setTimeout(() => af.focus(), 60);
  }
  // Affiche `build(resolve)` et attend qu'il appelle resolve(valeur).
  ask(build) {
    if (this.aborted) return Promise.reject(ABORT);
    return new Promise((resolve, reject) => {
      const entry = { reject };
      this.pending.add(entry);
      const done = (v) => { this.pending.delete(entry); resolve(v); };
      this.show(build(done), true);
    });
  }
  wait(ms) {
    if (this.aborted) return Promise.reject(ABORT);
    return new Promise((resolve, reject) => {
      const entry = { reject };
      this.pending.add(entry);
      const id = setTimeout(() => { this.pending.delete(entry); this.timers.delete(id); resolve(); }, ms);
      this.timers.add(id);
    });
  }
  check() { if (this.aborted) throw ABORT; }
  close() {
    if (this.closed) return;
    this.closed = true;
    this.aborted = true;
    for (const id of this.timers) clearTimeout(id);
    for (const p of this.pending) p.reject(ABORT);
    this.pending.clear();
    window.speechSynthesis?.cancel();
    this.el.classList.remove('in');
    document.body.classList.remove('stage-open');
    setTimeout(() => this.el.remove(), 250);
    this.onClose?.();
  }
}

// Écran simple : titre, texte, boutons. Renvoie la valeur du bouton choisi.
export function screen(stage, { icon, title, text, body, buttons = [{ label: 'Continuer', value: true }] }) {
  return stage.ask((done) => h('div', { class: 'screen' },
    icon && h('div', { class: 'screen-icon' }, icon),
    title && h('h2', null, title),
    text && (Array.isArray(text) ? text.map((t) => h('p', null, t)) : h('p', null, text)),
    body,
    h('div', { class: 'screen-actions' }, buttons.map((b) => h('button', { class: `btn ${b.kind || (b === buttons[0] ? 'primary' : 'secondary')}`, onclick: () => done(b.value) }, b.label))),
  ));
}

export function toast(msg, kind = '') {
  const t = h('div', { class: `toast ${kind}` }, msg);
  document.body.append(t);
  requestAnimationFrame(() => t.classList.add('in'));
  setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 300); }, 2600);
}

export function sheet({ title, text, body, buttons }) {
  return new Promise((resolve) => {
    const close = (v) => { wrap.classList.remove('in'); setTimeout(() => wrap.remove(), 250); resolve(v); };
    const wrap = h('div', { class: 'sheet-wrap', onclick: (e) => { if (e.target === wrap) close(undefined); } },
      h('div', { class: 'sheet' },
        title && h('h3', null, title),
        text && h('p', { class: 'muted' }, text),
        body,
        h('div', { class: 'sheet-actions' }, (buttons || [{ label: 'OK', value: true }]).map((b) => h('button', { class: `btn ${b.kind || 'secondary'}`, id: b.id, onclick: () => close(b.value) }, b.label))),
      ));
    document.body.append(wrap);
    requestAnimationFrame(() => wrap.classList.add('in'));
  });
}

export function pointsPop(pts) {
  if (!pts) return;
  const p = h('div', { class: 'points-pop' }, `⚡ +${pts} pts`);
  document.body.append(p);
  setTimeout(() => p.remove(), 1100);
}

export function input(props = {}) {
  return h('input', { type: 'text', autocomplete: 'off', autocorrect: 'off', autocapitalize: 'off', spellcheck: 'false', enterkeyhint: 'done', ...props });
}

export function textarea(props = {}) {
  return h('textarea', { rows: 5, autocapitalize: 'sentences', ...props });
}

export function onEnter(el, fn) {
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); fn(); } });
  return el;
}

// --- Vérification des réponses -------------------------------------------

export function norm(s) {
  return String(s || '').toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

const STOP = new Set(['le', 'la', 'les', 'l', 'un', 'une', 'des', 'de', 'du', 'd', 'au', 'aux', 'a', 'en', 'the', 'an', 'el', 'los', 'las', 'il', 'lo', 'gli', 'der', 'die', 'das', 'ein', 'eine', 'rue', 'avenue', 'boulevard', 'bd', 'av', 'place', 'allee', 'quai', 'chemin', 'impasse', 'mon', 'ma', 'mes']);

const core = (s) => norm(s).split(' ').filter((w) => w && !STOP.has(w)).join(' ');
export const digitsOf = (s) => String(s || '').replace(/\D+/g, '');

// Distance d'édition où l'inversion de deux lettres voisines compte pour une seule faute.
export function lev(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[m][n];
}

const tolerance = (len) => (len >= 9 ? 2 : len >= 5 ? 1 : 0);

// Les nombres d'une réponse, chiffres romains compris (Louis XIV, XVIIIe, François Ier).
const ROMAN = { i: 1, v: 5, x: 10, l: 50, c: 100 };
const roman = (w) => [...w].reduce((n, ch, i) => n + (ROMAN[ch] < (ROMAN[w[i + 1]] || 0) ? -ROMAN[ch] : ROMAN[ch]), 0);
// Côté réponse attendue, seuls les chiffres romains écrits en majuscules comptent.
const EXPECTED_ROMAN = /(?<![\p{L}\d])([IVXLC]+)(?:er|e|ème)?(?![\p{L}\d’'])/gu;
function expectedNumbers(s) {
  return [...(String(s).match(/\d+/g) || []).map(Number), ...[...String(s).matchAll(EXPECTED_ROMAN)].map((m) => roman(m[1].toLowerCase()))];
}
// Mots tapés, chiffres détachés des lettres (« 15h » → « 15 h », « 18ème » → « 18 »).
const typedWords = (s) => norm(s).replace(/(\d+)(?:er|ere|eme|e)\b/g, '$1').replace(/\d+/g, ' $& ').split(' ').filter(Boolean);
function numberOf(w) {
  if (/^\d+$/.test(w)) return Number(w);
  const m = w.match(/^([ivxlc]+)(?:er|ere|eme|e)?$/);
  return m ? roman(m[1]) : null;
}

// Compare une réponse libre à la réponse attendue (alternatives séparées par « | »).
// Un nombre ne tolère aucune faute : Louis XV n'est pas Louis XIV, 15 h n'est pas 16 h.
export function matchAnswer(user, expected) {
  const alts = String(expected).split('|').map((s) => s.trim()).filter(Boolean);
  for (const alt of alts) {
    const expDigits = digitsOf(alt);
    const letters = norm(alt).replace(/[0-9 ]/g, '');
    if (expDigits && letters.length <= 2) {
      if (digitsOf(user) === expDigits) return true;
      continue;
    }
    let a = core(user), b = core(alt);
    const need = expectedNumbers(alt);
    if (need.length) {
      // Les nombres doivent tous y être ; le reste se compare ensuite, avec la tolérance habituelle.
      const words = typedWords(user);
      if (!need.every((x) => words.some((w) => numberOf(w) === x))) continue;
      b = core(alt.replace(EXPECTED_ROMAN, ' ').replace(/\d+/g, ' '));
      if (!b) return true;
      a = core(words.filter((w) => !need.includes(numberOf(w))).join(' '));
    }
    if (norm(user) === norm(alt)) return true;
    if (!a) continue;
    if (a === b) return true;
    if (lev(a, b) <= tolerance(b.length)) return true;
    const at = new Set(a.split(' '));
    if (b && b.split(' ').every((w) => at.has(w) || [...at].some((x) => lev(x, w) <= tolerance(w.length)))) return true;
  }
  return false;
}

// Score positionnel pour une suite de chiffres.
export function digitScore(user, expected) {
  const u = digitsOf(user), e = digitsOf(expected);
  if (!e.length) return 0;
  return digitHits(u, e).filter(Boolean).length / Math.max(u.length, e.length);
}

// Aligne ce qui a été rendu sur ce qui était attendu, avec le moins de retouches possible (à égalité, le plus de
// réponses justes) : un élément oublié ou ajouté ne fait pas tomber tous les suivants. Rend, pour chaque attendu,
// l'indice du rendu placé en face (-1 s'il n'y en a pas) et si les deux sont identiques.
function alignSeq(n, m, same) {
  const W = n + m + 1;
  const c = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => ((n - i) + (m - j)) * W));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      c[i][j] = Math.min((same(i, j) ? -1 : W) + c[i + 1][j + 1], W + c[i + 1][j], W + c[i][j + 1]);
    }
  }
  const at = Array(n).fill(-1), hit = Array(n).fill(false);
  let i = 0, j = 0;
  while (i < n && j < m) {
    const s = same(i, j);
    if (c[i][j] === (s ? -1 : W) + c[i + 1][j + 1]) { at[i] = j; hit[i] = s; i++; j++; }
    else if (c[i][j] === W + c[i + 1][j]) i++;
    else j++;
  }
  return { at, hit };
}

// Pour chaque chiffre attendu, s'il a été retrouvé. À longueur égale, on compare case par case : des chiffres mal placés sont
// faux, même s'ils forment un bout de la suite. Un décalage ne s'accepte que s'il vient de chiffres oubliés ou en trop :
// on saute exactement cette différence, là où elle rend le plus de chiffres justes.
export function digitHits(user, expected) {
  const u = digitsOf(user), e = digitsOf(expected);
  const typedShort = u.length <= e.length;
  const a = typedShort ? u : e, b = typedShort ? e : u;
  const gap = b.length - a.length;
  const best = Array.from({ length: a.length + 1 }, () => Array(gap + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let g = 0; g <= gap; g++) {
      const face = (a[i] === b[i + gap - g] ? 1 : 0) + best[i + 1][g];
      best[i][g] = g ? Math.max(face, best[i][g - 1]) : face;
    }
  }
  const hits = Array(e.length).fill(false);
  for (let i = 0, g = gap; i < a.length;) {
    const j = i + gap - g;
    const same = a[i] === b[j];
    if ((same ? 1 : 0) + best[i + 1][g] === best[i][g]) { if (same) hits[typedShort ? j : i] = true; i++; }
    else g--;
  }
  return hits;
}

// Score d'une liste rappelée, libre ou ordonnée. Dans l'ordre, un mot oublié ne fait pas tomber les suivants : décalés, ils
// comptent quand même (res vrai), et un mot retrouvé hors de l'ordre compte pour moitié (res faux, pour que son lieu reste à revoir).
// places dit pour chaque attendu ce qui s'est passé : ok, shift (décalé), moved (hors de l'ordre) ou miss, avec le mot écrit à la place.
// byPlace : les lieux sont demandés dans le désordre, il n'y a pas de suite à aligner et seul compte ce qui est écrit en face de chacun.
export function listScore(answers, expected, ordered, { byPlace = false } = {}) {
  const res = expected.map(() => false);
  const total = Math.max(1, expected.length);
  if (!ordered) {
    const pool = answers.filter((a) => a && a.trim());
    expected.forEach((e, i) => {
      const k = pool.findIndex((a) => matchAnswer(a, e));
      if (k >= 0) { res[i] = true; pool.splice(k, 1); }
    });
    return { res, score: res.filter(Boolean).length / total };
  }
  if (byPlace) {
    const places = expected.map((e, i) => {
      res[i] = matchAnswer(answers[i] || '', e);
      return res[i] ? { state: 'ok' } : { state: 'miss', typed: answers[i] };
    });
    return { res, places, score: res.filter(Boolean).length / total };
  }
  const given = answers.map((a, j) => ({ a, j })).filter(({ a }) => a && a.trim());
  const same = expected.map((e) => given.map(({ a }) => matchAnswer(a, e)));
  const { at, hit } = alignSeq(expected.length, given.length, (i, j) => same[i][j]);
  const used = new Set(at.filter((_, i) => hit[i]));
  const places = expected.map((_, i) => {
    res[i] = hit[i];
    return { state: !hit[i] ? 'miss' : given[at[i]].j === i ? 'ok' : 'shift' };
  });
  places.forEach((p, i) => {
    if (p.state !== 'miss') return;
    const k = given.findIndex((_, j) => same[i][j] && !used.has(j));
    if (k >= 0) { p.state = 'moved'; used.add(k); }
  });
  places.forEach((p, i) => {
    if (p.state === 'miss' && at[i] >= 0 && !used.has(at[i])) p.typed = given[at[i]].a;
  });
  const moved = places.filter((p) => p.state === 'moved').length;
  return { res, places, score: (res.filter(Boolean).length + moved / 2) / total };
}

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function plural(n, one, many) {
  return `${n} ${n > 1 ? many || one + 's' : one}`;
}
