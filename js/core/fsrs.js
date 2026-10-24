// FSRS-5 (Free Spaced Repetition Scheduler), paramètres par défaut.
// Notes : 1 = raté, 2 = difficile, 3 = bien, 4 = facile.
// Réf. : https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm

const W = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192,
  1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621,
];
const DECAY = -0.5;
const FACTOR = 19 / 81;

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const clampD = (d) => clamp(d, 1, 10);
const clampS = (s) => clamp(s, 0.1, 36500);

export function retrievability(elapsedDays, s) {
  return Math.pow(1 + (FACTOR * Math.max(0, elapsedDays)) / s, DECAY);
}

// Intervalle (jours) pour lequel la probabilité de rappel tombe à `r`.
export function intervalFor(s, r) {
  return (s / FACTOR) * (Math.pow(r, 1 / DECAY) - 1);
}

const initS = (g) => clampS(W[g - 1]);
const initD = (g) => clampD(W[4] - Math.exp(W[5] * (g - 1)) + 1);

function nextD(d, g) {
  const delta = -W[6] * (g - 3);
  const dp = d + (delta * (10 - d)) / 9;
  return clampD(W[7] * initD(4) + (1 - W[7]) * dp);
}

function recallS(d, s, r, g) {
  const hard = g === 2 ? W[15] : 1;
  const easy = g === 4 ? W[16] : 1;
  return clampS(s * (1 + Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp((1 - r) * W[10]) - 1) * hard * easy));
}

function forgetS(d, s, r) {
  const sf = W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp((1 - r) * W[14]);
  return clampS(Math.min(s, sf));
}

const shortTermS = (s, g) => clampS(s * Math.exp(W[17] * (g - 3 + W[18])));

/**
 * Met à jour la mémoire d'un élément après une révision.
 * @param {{s?:number,d?:number,reps?:number,lapses?:number,last?:number}} m
 * @param {number} g note 1..4
 * @param {number} t timestamp de la révision
 * @param {boolean} sameDay révision le même jour que la précédente
 */
export function review(m, g, t, sameDay) {
  const out = { ...m };
  if (!m.reps) {
    out.s = initS(g);
    out.d = initD(g);
  } else if (sameDay) {
    out.s = shortTermS(m.s, g);
    out.d = nextD(m.d, g);
  } else {
    const elapsed = (t - m.last) / 86400000;
    const r = retrievability(elapsed, m.s);
    out.s = g === 1 ? forgetS(m.d, m.s, r) : recallS(m.d, m.s, r, g);
    out.d = nextD(m.d, g);
  }
  out.reps = (m.reps || 0) + 1;
  out.lapses = (m.lapses || 0) + (g === 1 ? 1 : 0);
  out.last = t;
  return out;
}

// Nombre de jours avant la prochaine révision, avec un léger flou pour étaler la charge.
export function scheduleDays(s, retention, g) {
  if (g === 1) return 1;
  let days = intervalFor(s, retention);
  if (days >= 3) days *= 0.95 + Math.random() * 0.1;
  return clamp(Math.round(days), 1, 365);
}
