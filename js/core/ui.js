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

// Compare une réponse libre à la réponse attendue (alternatives séparées par « | »).
export function matchAnswer(user, expected) {
  const alts = String(expected).split('|').map((s) => s.trim()).filter(Boolean);
  for (const alt of alts) {
    const expDigits = digitsOf(alt);
    const letters = norm(alt).replace(/[0-9 ]/g, '');
    if (expDigits && letters.length <= 2) {
      if (digitsOf(user) === expDigits) return true;
      continue;
    }
    const a = core(user), b = core(alt);
    if (!a) continue;
    if (a === b || norm(user) === norm(alt)) return true;
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
  let ok = 0;
  for (let i = 0; i < e.length; i++) if (u[i] === e[i]) ok++;
  return ok / e.length;
}

// Score d'une liste rappelée : ordonnée (position par position) ou libre.
export function listScore(answers, expected, ordered) {
  const res = expected.map(() => false);
  if (ordered) {
    expected.forEach((e, i) => { res[i] = matchAnswer(answers[i] || '', e); });
  } else {
    const pool = answers.filter((a) => a && a.trim());
    expected.forEach((e, i) => {
      const k = pool.findIndex((a) => matchAnswer(a, e));
      if (k >= 0) { res[i] = true; pool.splice(k, 1); }
    });
  }
  return { res, score: res.filter(Boolean).length / Math.max(1, expected.length) };
}

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function plural(n, one, many) {
  return `${n} ${n > 1 ? many || one + 's' : one}`;
}
