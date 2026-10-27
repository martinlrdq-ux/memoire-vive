// Visages fictifs générés à partir d'une graine. Chacun a des traits marquants (lunettes, barbe,
// coiffure, chapeau, cravate…) sur lesquels accrocher un prénom, et des repères nets d'homme
// ou de femme (mâchoire, coiffure, lèvres, cils) pour que le prénom aille avec le visage.
import { rng, pick } from './store.js';
import { faceSVGv1 } from './faces-v1.js';

export const FACE_V = 2;

const SKIN = ['#fbe1cb', '#f4caa6', '#e9b58d', '#d59c70', '#b97d55', '#91603f', '#6b432c'];
const HAIR = { noirs: '#1e1a19', bruns: '#45291b', châtains: '#7d4d2c', blonds: '#e2bb69', roux: '#c5552b', gris: '#9d9d9d', blancs: '#eeede8' };
const IRIS = ['#3b2a1f', '#5a3a22', '#4a6fa5', '#5c8a4a', '#6f7f8f'];
const BG = ['#e8e4fb', '#fbe7e4', '#e1f4ea', '#fbf1dc', '#e3eef9', '#f4e3f4', '#e6f3f6'];
// [couleur, nom au masculin, nom au féminin]
const CLOTH = [['#4f6bd8', 'bleu', 'bleue'], ['#e05a6d', 'rose', 'rose'], ['#3c9f74', 'vert', 'verte'], ['#e4a131', 'jaune', 'jaune'],
  ['#8a5be1', 'violet', 'violette'], ['#d9663b', 'orange', 'orange'], ['#3b4256', 'gris foncé', 'gris foncé'], ['#c03a3a', 'rouge', 'rouge'], ['#2a8fa8', 'bleu canard', 'bleu canard']];
const LIPS = { rose: '#d46f7c', corail: '#e0705a', rouge: '#c3263a', prune: '#8a3557', naturel: '#c98676' };
const FRAMES = ['#222222', '#7a1f3d', '#2b4c8c', '#8a6a3a', '#9a9a9a'];

const CX = 60, CY = 60;

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [n >> 16, (n >> 8) & 255, n & 255].map((c) => Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k));
  return `#${ch.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

function wpick(weights, r) {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  let x = r() * entries.reduce((s, [, w]) => s + w, 0);
  for (const [v, w] of entries) if ((x -= w) < 0) return v;
  return entries[entries.length - 1][0];
}

const between = (r, a, b) => a + r() * (b - a);

export function faceTraits(seed, female) {
  const r = rng(seed);
  const age = wpick({ jeune: 4, adulte: 4, senior: 2 }, r);
  const hairName = age === 'senior' && r() < 0.65 ? pick(['gris', 'blancs'], r)
    : wpick({ noirs: 3, bruns: 4, châtains: 4, blonds: 3, roux: 1.2, gris: age === 'adulte' ? 0.6 : 0 }, r);
  const style = female
    ? wpick({ longs: 4, frange: 2, ondulés: 2.5, carré: 2.5, chignon: 1.5, queue: 2, courts: 1 }, r)
    : wpick({ court: 4, raie: 3, brosse: 2, bouclés: 1.5, banane: 1.5, dégarni: age === 'jeune' ? 0 : 2, chauve: age === 'jeune' ? 0.3 : 1.5 }, r);
  const cloth = pick(CLOTH, r);
  const t = {
    female, age, hairName, hair: HAIR[hairName], style, cloth,
    skin: pick(SKIN, r),
    bg: pick(BG, r),
    iris: pick(IRIS, r),
    eye: between(r, 0.92, 1.1),
    gap: between(r, 12.5, 14),
    W: female ? between(r, 26.5, 28.5) : between(r, 28.5, 31),
    H: female ? between(r, 34.5, 37) : between(r, 36, 38.5),
    jaw: female ? between(r, 0.6, 0.68) : between(r, 0.8, 0.9),
    chin: female ? between(r, 0.3, 0.4) : between(r, 0.5, 0.6),
    brow: female ? between(r, 1.6, 2.2) : between(r, 2.8, 3.8),
    nose: pick(['fin', 'droit', 'fort'], r),
    mouth: wpick({ sourire: 4, neutre: 3, rire: 1.5 }, r),
    lips: female ? wpick({ rose: 3, corail: 2, rouge: 1.5, prune: 1, naturel: 2.5 }, r) : null,
    glasses: r() < 0.32 ? pick(female ? ['rondes', 'papillon', 'fines', 'carrées'] : ['rondes', 'carrées', 'fines', 'carrées'], r) : null,
    frame: pick(FRAMES, r),
    beard: female ? null : wpick({ '': 4.5, barbe: 2, courte: 1.5, moustache: 1.2, bouc: 1 }, r) || null,
    earrings: female && r() < 0.6 ? pick(['perles', 'créoles', 'pendantes'], r) : null,
    hat: r() < 0.1 ? pick(female ? ['béret', 'chapeau', 'bonnet'] : ['casquette', 'bonnet', 'béret', 'chapeau'], r) : null,
    hatColor: pick(CLOTH, r)[0],
    top: female ? wpick({ 'col V': 3, 'col rond': 3, 'col roulé': 1.5, chemisier: 2 }, r)
      : wpick({ chemise: 3, cravate: 2, 'nœud papillon': 0.8, pull: 2.5, 'col roulé': 1.2, 'tee-shirt': 2.5 }, r),
    tie: pick(CLOTH, r),
    necklace: female && r() < 0.35 ? pick(['perles', 'pendentif'], r) : null,
    freckles: r() < 0.15,
    mole: r() < 0.15 ? pick([-1, 1], r) : 0,
  };
  if (t.age === 'senior' && t.glasses && r() < 0.5) t.glasses = 'demi-lune';
  if (female && t.style === 'carré') t.earrings = null; // le carré cache les oreilles
  if (female && t.style === 'courts') { t.earrings = t.earrings || 'créoles'; if (t.lips === 'naturel') t.lips = 'rose'; }
  if (t.necklace && t.top === 'col roulé') t.necklace = null;
  if (t.hat && t.style === 'chignon') t.style = 'longs';
  return t;
}

// Description des traits saillants, pour aider à choisir le « trait marquant ».
export function faceHighlights(t) {
  const c = t.hairName;
  const out = [];
  if (t.glasses) out.push(`lunettes ${t.glasses}`);
  if (t.beard) out.push({ barbe: 'barbe', courte: 'barbe de trois jours', moustache: 'moustache', bouc: 'bouc' }[t.beard]);
  if (t.hat) out.push(t.hat);
  out.push({
    longs: `longs cheveux ${c}`, frange: `frange, cheveux ${c}`, ondulés: `cheveux ${c} ondulés`, carré: `cheveux ${c} au carré`,
    chignon: `chignon, cheveux ${c}`, queue: `queue de cheval, cheveux ${c}`, courts: `cheveux ${c} très courts`,
    court: `cheveux ${c} courts`, raie: `cheveux ${c}, raie sur le côté`, brosse: `cheveux ${c} en brosse`, bouclés: `cheveux ${c} bouclés`,
    banane: `cheveux ${c} en banane`, dégarni: `front dégarni, cheveux ${c}`, chauve: 'crâne chauve',
  }[t.style]);
  if (t.earrings) out.push({ perles: 'boucles d’oreilles en perle', créoles: 'créoles', pendantes: 'boucles d’oreilles pendantes' }[t.earrings]);
  if (t.lips === 'rouge' || t.lips === 'prune') out.push(`rouge à lèvres ${t.lips === 'rouge' ? 'vif' : 'prune'}`);
  if (t.necklace) out.push(t.necklace === 'perles' ? 'collier de perles' : 'pendentif');
  if (t.top === 'cravate') out.push(`cravate ${t.tie[2]}`);
  if (t.top === 'nœud papillon') out.push(`nœud papillon ${t.tie[1]}`);
  if (t.top === 'col roulé') out.push(`col roulé ${t.cloth[1]}`);
  if (t.mouth === 'rire') out.push('grand sourire');
  if (t.age === 'senior') out.push('rides');
  if (t.freckles) out.push('taches de rousseur');
  if (t.mole) out.push('grain de beauté');
  return out;
}

// Les visages d'une même série doivent se distinguer au premier coup d'œil.
export function faceSignature(seed, female) {
  const t = faceTraits(seed, female);
  return `${female}|${t.hairName}|${t.style}`;
}

function headPath(t) {
  const { W, H } = t, top = CY - H, b = CY + H, jw = W * t.jaw;
  return `M${CX} ${top} C${CX + W * 0.62} ${top} ${CX + W} ${CY - H * 0.5} ${CX + W} ${CY - 2} C${CX + W} ${CY + H * 0.4} ${CX + jw + 3} ${CY + H * 0.62} ${CX + jw} ${CY + H * 0.78} Q${CX + W * t.chin} ${b} ${CX} ${b} Q${CX - W * t.chin} ${b} ${CX - jw} ${CY + H * 0.78} C${CX - jw - 3} ${CY + H * 0.62} ${CX - W} ${CY + H * 0.4} ${CX - W} ${CY - 2} C${CX - W} ${CY - H * 0.5} ${CX - W * 0.62} ${top} ${CX} ${top} Z`;
}

// Calotte de cheveux : dôme extérieur puis ligne d'implantation propre à la coiffure.
// `lift` : hauteur des cheveux au-dessus du crâne.
function cap(t, lift, hairline, side = CY - 4) {
  const { W, H } = t, top = CY - H;
  const ctrl = (top - lift - 0.25 * side) / 0.75;
  return `M${CX - W - 2} ${side} C${CX - W - 3} ${ctrl} ${CX + W + 3} ${ctrl} ${CX + W + 2} ${side} ${hairline} Z`;
}

function hairBack(t) {
  const { W, H, hair } = t, top = CY - H, b = CY + H;
  const dark = shade(hair, -0.18);
  const p = [];
  if (['longs', 'frange', 'ondulés'].includes(t.style)) {
    const low = t.style === 'frange' ? b + 18 : b + 30;
    const wide = t.style === 'ondulés' ? 15 : 10;
    if (t.style === 'ondulés') {
      let d = `M${CX - W - 3} ${CY - 8}`;
      for (let i = 1; i <= 5; i++) d += ` Q${CX - W - wide - (i % 2 ? 6 : 0)} ${CY - 8 + (i - 0.5) * (low - CY + 8) / 5} ${CX - W - 4 - wide * (i / 5)} ${CY - 8 + i * (low - CY + 8) / 5}`;
      d += ` L${CX + W + 4 + wide} ${low}`;
      for (let i = 4; i >= 0; i--) d += ` Q${CX + W + wide + (i % 2 ? 0 : 6)} ${CY - 8 + (i + 0.5) * (low - CY + 8) / 5} ${CX + W + 4 + wide * (i / 5)} ${CY - 8 + i * (low - CY + 8) / 5}`;
      p.push(`<path d="${d} Z" fill="${dark}"/>`);
    } else {
      p.push(`<path d="M${CX - W - 3} ${CY - 8} C${CX - W - 7} ${CY + 18} ${CX - W - wide} ${CY + 36} ${CX - W - wide - 3} ${low} L${CX + W + wide + 3} ${low} C${CX + W + wide} ${CY + 36} ${CX + W + 7} ${CY + 18} ${CX + W + 3} ${CY - 8} Z" fill="${dark}"/>`);
    }
    p.push(`<ellipse cx="${CX}" cy="${CY - 6}" rx="${W + 5}" ry="${H + 3}" fill="${dark}"/>`);
  }
  if (t.style === 'carré') {
    const low = CY + H * 0.72;
    p.push(`<path d="M${CX - W - 5} ${CY - 10} C${CX - W - 8} ${CY + 10} ${CX - W - 8} ${low - 6} ${CX - W - 6} ${low} L${CX + W + 6} ${low} C${CX + W + 8} ${low - 6} ${CX + W + 8} ${CY + 10} ${CX + W + 5} ${CY - 10} Z" fill="${dark}"/>`);
    p.push(`<ellipse cx="${CX}" cy="${CY - 6}" rx="${W + 6}" ry="${H + 4}" fill="${dark}"/>`);
  }
  if (t.style === 'queue') p.push(`<path d="M${CX + W - 4} ${top + 10} C${CX + W + 20} ${top + 6} ${CX + W + 20} ${CY + 28} ${CX + W + 9} ${CY + 48} Q${CX + W + 4} ${CY + 26} ${CX + W - 2} ${CY + 4} Z" fill="${dark}"/><circle cx="${CX + W + 4}" cy="${top + 12}" r="3.2" fill="${t.cloth[0]}"/>`);
  if (t.style === 'chignon') p.push(`<circle cx="${CX}" cy="${top - 7}" r="11.5" fill="${hair}"/><path d="M${CX - 9} ${top - 3} Q${CX} ${top - 13} ${CX + 9} ${top - 4}" stroke="${dark}" stroke-width="1.6" fill="none"/>`);
  return p.join('');
}

function hairFront(t) {
  const { W, H, hair } = t, top = CY - H;
  const dark = shade(hair, -0.2);
  const shine = `<path d="M${CX - W * 0.45} ${top - 1} Q${CX - 2} ${top - 6} ${CX + W * 0.35} ${top - 2}" stroke="${shade(hair, 0.28)}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".55"/>`;
  const R = CX + W + 2, L = CX - W - 2;
  switch (t.style) {
    case 'longs': // raie au milieu, mèches qui encadrent le visage jusqu'aux tempes
      return `<path d="${cap(t, 5, `L${R + 1} ${CY + 4} L${CX + W - 2} ${CY + 2} C${CX + W - 1} ${CY - 12} ${CX + W * 0.6} ${top + 3} ${CX + 1} ${top + 4} L${CX - 1} ${top + 4} C${CX - W * 0.6} ${top + 3} ${CX - W + 1} ${CY - 12} ${CX - W + 2} ${CY + 2} L${L - 1} ${CY + 4}`)}" fill="${hair}"/>${shine}`;
    case 'ondulés':
      return `<path d="${cap(t, 8, `L${R + 2} ${CY + 6} L${CX + W - 2} ${CY + 3} C${CX + W - 4} ${CY - 14} ${CX + W * 0.5} ${top + 2} ${CX - 4} ${top + 5} C${CX - W * 0.7} ${top + 6} ${CX - W + 1} ${CY - 12} ${CX - W + 2} ${CY + 3} L${L - 2} ${CY + 6}`)}" fill="${hair}"/>${shine}`;
    case 'frange':
      return `<path d="${cap(t, 5, `L${R + 1} ${CY + 4} L${CX + W - 2} ${CY + 2} L${CX + W - 3} ${CY - 13} Q${CX + W * 0.5} ${CY - 10} ${CX + W * 0.3} ${CY - 14} Q${CX} ${CY - 10} ${CX - W * 0.3} ${CY - 14} Q${CX - W * 0.5} ${CY - 10} ${CX - W + 3} ${CY - 13} L${CX - W + 2} ${CY + 2} L${L - 1} ${CY + 4}`)}" fill="${hair}"/>${shine}`;
    case 'carré': // raie sur le côté, mèche qui balaie le front
      return `<path d="${cap(t, 6, `L${R + 3} ${CY + 6} L${CX + W - 2} ${CY + 4} C${CX + W - 2} ${CY - 12} ${CX + W * 0.4} ${top + 3} ${CX - W * 0.3} ${top + 3} C${CX - W * 0.7} ${CY - 16} ${CX - W + 2} ${CY - 6} ${CX - W + 2} ${CY + 4} L${L - 3} ${CY + 6}`)}" fill="${hair}"/>${shine}`;
    case 'chignon':
    case 'queue': // cheveux tirés en arrière
      return `<path d="${cap(t, 2, `L${CX + W - 1} ${CY - 6} C${CX + W - 3} ${top + 8} ${CX + W * 0.5} ${top + 5} ${CX} ${top + 6} C${CX - W * 0.5} ${top + 5} ${CX - W + 3} ${top + 8} ${CX - W + 1} ${CY - 6}`, CY - 2)}" fill="${hair}"/><path d="M${CX - 4} ${top - 2} Q${CX - W * 0.6} ${top + 2} ${CX - W + 2} ${CY - 10}" stroke="${dark}" stroke-width="1.2" fill="none" opacity=".7"/><path d="M${CX + 4} ${top - 2} Q${CX + W * 0.6} ${top + 2} ${CX + W - 2} ${CY - 10}" stroke="${dark}" stroke-width="1.2" fill="none" opacity=".7"/>`;
    case 'courts': // coupe courte, mèche sur le côté
      return `<path d="${cap(t, 5, `L${CX + W - 1} ${CY - 4} C${CX + W - 4} ${top + 10} ${CX + W * 0.3} ${top + 16} ${CX - W * 0.3} ${CY - 13} C${CX - W * 0.7} ${CY - 11} ${CX - W + 1} ${CY - 8} ${CX - W + 1} ${CY - 2}`, CY)}" fill="${hair}"/>${shine}`;
    case 'court':
      return `<path d="${cap(t, 6, `L${CX + W - 3} ${CY + 3} L${CX + W - 3} ${CY - 8} Q${CX + W - 4} ${top + 9} ${CX + W * 0.5} ${top + 8} Q${CX} ${top + 6} ${CX - W * 0.5} ${top + 8} Q${CX - W + 4} ${top + 9} ${CX - W + 3} ${CY - 8} L${CX - W + 3} ${CY + 3}`, CY + 3)}" fill="${hair}"/>${shine}`;
    case 'raie':
      return `<path d="${cap(t, 8, `L${CX + W - 3} ${CY + 3} L${CX + W - 3} ${CY - 9} C${CX + W - 4} ${top + 12} ${CX + W * 0.2} ${top + 9} ${CX - W * 0.38} ${top + 4} Q${CX - W + 4} ${top + 10} ${CX - W + 3} ${CY - 8} L${CX - W + 3} ${CY + 3}`, CY + 3)}" fill="${hair}"/><path d="M${CX - W * 0.38} ${top + 4} Q${CX - W * 0.32} ${top - 4} ${CX - W * 0.2} ${top - 9}" stroke="${dark}" stroke-width="1.4" fill="none"/>${shine}`;
    case 'brosse':
      return `<path d="M${L} ${CY + 3} L${L + 1} ${top - 3} Q${CX} ${top - 11} ${R - 1} ${top - 3} L${R} ${CY + 3} L${CX + W - 3} ${CY + 3} L${CX + W - 3} ${CY - 8} Q${CX + W - 4} ${top + 7} ${CX} ${top + 6} Q${CX - W + 4} ${top + 7} ${CX - W + 3} ${CY - 8} L${CX - W + 3} ${CY + 3} Z" fill="${hair}"/>${[-0.6, -0.3, 0, 0.3, 0.6].map((k) => `<path d="M${CX + W * k} ${top - 7} L${CX + W * k} ${top - 1}" stroke="${dark}" stroke-width="1" opacity=".5"/>`).join('')}`;
    case 'banane':
      return `<path d="M${L} ${CY + 3} C${L - 1} ${(top - 6 - 0.25 * (CY + 3)) / 0.75} ${R + 6} ${(top - 14 - 0.25 * (CY + 3)) / 0.75} ${R} ${CY + 3} L${CX + W - 3} ${CY + 3} L${CX + W - 3} ${CY - 8} Q${CX + W - 4} ${top + 8} ${CX + W * 0.4} ${top + 7} Q${CX} ${top + 4} ${CX - W * 0.5} ${top + 8} Q${CX - W + 4} ${top + 9} ${CX - W + 3} ${CY - 8} L${CX - W + 3} ${CY + 3} Z" fill="${hair}"/><path d="M${CX - W * 0.3} ${top - 2} Q${CX + W * 0.2} ${top - 14} ${CX + W * 0.7} ${top - 8}" stroke="${shade(hair, 0.28)}" stroke-width="2" fill="none" opacity=".55"/>`;
    case 'bouclés': {
      const curls = [];
      for (let i = 0; i <= 10; i++) {
        const a = Math.PI * (1.04 + i * 0.092);
        curls.push(`<circle cx="${CX + Math.cos(a) * (W + 1)}" cy="${CY - 6 + Math.sin(a) * (H + 1)}" r="7" fill="${hair}"/>`);
      }
      return `<path d="${cap(t, 3, `L${CX + W - 3} ${CY + 3} L${CX + W - 3} ${CY - 8} Q${CX} ${top + 4} ${CX - W + 3} ${CY - 8} L${CX - W + 3} ${CY + 3}`, CY + 3)}" fill="${hair}"/>${curls.join('')}`;
    }
    case 'dégarni':
      return `<path d="${cap(t, 3, `L${CX + W - 3} ${CY + 3} L${CX + W - 3} ${CY - 10} Q${CX + W - 4} ${top - 1} ${CX + W * 0.45} ${top - 3} Q${CX + 6} ${top + 7} ${CX} ${top + 7} Q${CX - 6} ${top + 7} ${CX - W * 0.45} ${top - 3} Q${CX - W + 4} ${top - 1} ${CX - W + 3} ${CY - 10} L${CX - W + 3} ${CY + 3}`, CY + 3)}" fill="${hair}"/>`;
    case 'chauve':
      return `<path d="M${CX - W + 1} ${CY + 3} L${CX - W + 1} ${CY - 12} Q${CX - W - 3} ${CY - 10} ${CX - W - 2} ${CY + 3} Z" fill="${hair}"/><path d="M${CX + W - 1} ${CY + 3} L${CX + W - 1} ${CY - 12} Q${CX + W + 3} ${CY - 10} ${CX + W + 2} ${CY + 3} Z" fill="${hair}"/><ellipse cx="${CX - W * 0.3}" cy="${top + 7}" rx="7" ry="3.5" fill="#fff" opacity=".28" transform="rotate(-18 ${CX - W * 0.3} ${top + 7})"/>`;
    default: return '';
  }
}

function eyes(t) {
  const ey = CY - 1, e = t.eye, p = [];
  const lid = '#3a2a22';
  const browColor = ['blonds', 'gris', 'blancs'].includes(t.hairName) ? shade(t.hair, -0.35) : t.hair;
  for (const s of [-1, 1]) {
    const x = CX + s * t.gap;
    p.push(`<path d="M${x - 6 * e} ${ey} Q${x} ${ey - 4.8 * e} ${x + 6 * e} ${ey} Q${x} ${ey + 4 * e} ${x - 6 * e} ${ey} Z" fill="#fff"/>`);
    p.push(`<circle cx="${x}" cy="${ey - 0.2}" r="${2.9 * e}" fill="${t.iris}"/><circle cx="${x}" cy="${ey - 0.2}" r="${1.4 * e}" fill="#111"/><circle cx="${x + 0.9}" cy="${ey - 1.2}" r=".8" fill="#fff"/>`);
    p.push(`<path d="M${x - 6.4 * e} ${ey + 0.3} Q${x} ${ey - 5.4 * e} ${x + 6.4 * e} ${ey + 0.3}" stroke="${lid}" stroke-width="${t.female ? 1.9 : 1.1}" fill="none" stroke-linecap="round"/>`);
    if (t.female) {
      p.push(`<path d="M${x + s * 4.2 * e} ${ey - 3.2 * e} L${x + s * 5.6 * e} ${ey - 5.6 * e} M${x + s * 5.8 * e} ${ey - 1.5 * e} L${x + s * 7.8 * e} ${ey - 3.4 * e} M${x + s * 2 * e} ${ey - 4.2 * e} L${x + s * 2.6 * e} ${ey - 6.4 * e}" stroke="${lid}" stroke-width="1.1" stroke-linecap="round"/>`);
    }
    if (t.age === 'senior') p.push(`<path d="M${x + s * 7.5} ${ey - 1} l${s * 3} -1.5 M${x + s * 7.5} ${ey + 1.5} l${s * 3} 1 M${x - 4} ${ey + 4.5} Q${x} ${ey + 6.5} ${x + 4} ${ey + 4.5}" stroke="${shade(t.skin, -0.22)}" stroke-width=".9" fill="none" stroke-linecap="round"/>`);
    const by = ey - 8.5 * e - (t.female ? 1.2 : 0);
    if (t.female) p.push(`<path d="M${x - s * 6.5} ${by + 2.2} Q${x + s * 1} ${by - 3.2} ${x + s * 7.5} ${by + 0.8}" stroke="${browColor}" stroke-width="${t.brow}" fill="none" stroke-linecap="round"/>`);
    else p.push(`<path d="M${x - s * 7} ${by + 1.2} Q${x} ${by - 1.8} ${x + s * 7.5} ${by + 1.4}" stroke="${browColor}" stroke-width="${t.brow}" fill="none" stroke-linecap="round"/>`);
  }
  return p.join('');
}

function nose(t) {
  const ny = CY + 12, ink = shade(t.skin, -0.28);
  if (t.nose === 'fin') return `<path d="M${CX - 0.5} ${CY + 3} Q${CX - 3.5} ${ny - 1} ${CX - 2.8} ${ny} Q${CX} ${ny + 2} ${CX + 2.8} ${ny}" stroke="${ink}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
  if (t.nose === 'droit') return `<path d="M${CX + 1.5} ${CY + 2} L${CX + 2.8} ${ny - 2.5}" stroke="${ink}" stroke-width="1.3" stroke-linecap="round" opacity=".7"/><path d="M${CX - 4.5} ${ny} Q${CX - 2} ${ny + 2.6} ${CX} ${ny + 1.4} Q${CX + 2} ${ny + 2.6} ${CX + 4.5} ${ny}" stroke="${ink}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
  return `<path d="M${CX + 2} ${CY + 1} Q${CX + 4} ${ny - 6} ${CX + 4.5} ${ny - 2}" stroke="${ink}" stroke-width="1.3" fill="none" stroke-linecap="round" opacity=".7"/><path d="M${CX - 6} ${ny - 1} Q${CX - 6.5} ${ny + 3} ${CX - 2.5} ${ny + 2.5} Q${CX} ${ny + 4} ${CX + 2.5} ${ny + 2.5} Q${CX + 6.5} ${ny + 3} ${CX + 6} ${ny - 1}" stroke="${ink}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
}

function mouth(t) {
  const my = CY + (t.female ? 22 : 23), mw = t.female ? 8.5 : 9.5;
  if (t.female) {
    const c = LIPS[t.lips], lo = shade(c, 0.12);
    const up = t.mouth === 'neutre' ? 0 : 1.6;
    if (t.mouth === 'rire') return `<path d="M${CX - mw - 1} ${my - 1.5} Q${CX} ${my + 11} ${CX + mw + 1} ${my - 1.5} Q${CX} ${my - 1} ${CX - mw - 1} ${my - 1.5} Z" fill="#5a1f22" stroke="${c}" stroke-width="2.4" stroke-linejoin="round"/><path d="M${CX - mw + 1} ${my - 0.5} Q${CX} ${my + 3} ${CX + mw - 1} ${my - 0.5} Z" fill="#fff"/>`;
    return `<path d="M${CX - mw} ${my - up} Q${CX} ${my + 6.5 + up} ${CX + mw} ${my - up} Q${CX} ${my + 1.5 + up} ${CX - mw} ${my - up} Z" fill="${lo}"/><path d="M${CX - mw} ${my - up} Q${CX - mw * 0.5} ${my - 3.8} ${CX} ${my - 2} Q${CX + mw * 0.5} ${my - 3.8} ${CX + mw} ${my - up} Q${CX} ${my + 1 + up * 0.6} ${CX - mw} ${my - up} Z" fill="${c}"/>`;
  }
  const ink = shade(t.skin, -0.45);
  const lip = t.beard === 'barbe' || t.beard === 'bouc' ? `<ellipse cx="${CX}" cy="${my + 1.5}" rx="${mw - 1}" ry="3.2" fill="${shade(t.skin, -0.1)}"/>` : '';
  if (t.mouth === 'rire') return `${lip}<path d="M${CX - mw - 1} ${my - 1.5} Q${CX} ${my + 10} ${CX + mw + 1} ${my - 1.5} Q${CX} ${my - 0.5} ${CX - mw - 1} ${my - 1.5} Z" fill="#5a1f22" stroke="${ink}" stroke-width="1.2" stroke-linejoin="round"/><path d="M${CX - mw + 1} ${my - 0.5} Q${CX} ${my + 3} ${CX + mw - 1} ${my - 0.5} Z" fill="#fff"/>`;
  const up = t.mouth === 'sourire' ? 1.8 : 0;
  return `${lip}<path d="M${CX - mw} ${my - up} Q${CX} ${my + 1.2 + up * 2.2} ${CX + mw} ${my - up}" stroke="${ink}" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M${CX - 4.5} ${my + 4.5} Q${CX} ${my + 6} ${CX + 4.5} ${my + 4.5}" stroke="${shade(t.skin, -0.16)}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
}

function facialHair(t) {
  if (!t.beard) return '';
  const { W, H, hair } = t, b = CY + H, jw = W * t.jaw, my = CY + 23;
  const moustache = `<path d="M${CX - 11} ${my - 0.5} Q${CX - 6} ${my - 6.5} ${CX} ${my - 4.8} Q${CX + 6} ${my - 6.5} ${CX + 11} ${my - 0.5} Q${CX + 6} ${my - 3} ${CX} ${my - 2.4} Q${CX - 6} ${my - 3} ${CX - 11} ${my - 0.5} Z" fill="${hair}"/>`;
  const full = `M${CX - W} ${CY + 2} C${CX - W} ${CY + H * 0.45} ${CX - jw - 3} ${CY + H * 0.65} ${CX - jw} ${CY + H * 0.8} Q${CX - W * t.chin} ${b + 5} ${CX} ${b + 5} Q${CX + W * t.chin} ${b + 5} ${CX + jw} ${CY + H * 0.8} C${CX + jw + 3} ${CY + H * 0.65} ${CX + W} ${CY + H * 0.45} ${CX + W} ${CY + 2} L${CX + W - 4} ${CY + 4} Q${CX + W * 0.55} ${CY + 15} ${CX + 12} ${my - 3} Q${CX} ${my - 7} ${CX - 12} ${my - 3} Q${CX - W * 0.55} ${CY + 15} ${CX - W + 4} ${CY + 4} Z`;
  if (t.beard === 'barbe') return `<path d="${full}" fill="${hair}"/>${moustache}`;
  if (t.beard === 'courte') return `<path d="${full}" fill="${hair}" opacity=".3"/>`;
  if (t.beard === 'moustache') return moustache;
  return `${moustache}<path d="M${CX - 6} ${my + 5} Q${CX} ${my + 3.5} ${CX + 6} ${my + 5} L${CX + 5} ${b + 2} Q${CX} ${b + 5} ${CX - 5} ${b + 2} Z" fill="${hair}"/>`;
}

function skinMarks(t) {
  const { W, H } = t, top = CY - H, p = [];
  const line = shade(t.skin, -0.2);
  if (t.female) for (const s of [-1, 1]) p.push(`<ellipse cx="${CX + s * W * 0.6}" cy="${CY + 11}" rx="5.5" ry="3.4" fill="#ff7a8a" opacity=".22"/>`);
  if (t.age === 'senior') {
    p.push(`<path d="M${CX - 10} ${top + 9} Q${CX} ${top + 7} ${CX + 10} ${top + 9} M${CX - 8} ${top + 13} Q${CX} ${top + 11} ${CX + 8} ${top + 13}" stroke="${line}" stroke-width=".9" fill="none" stroke-linecap="round"/>`);
    p.push(`<path d="M${CX - 8} ${CY + 14} Q${CX - 12.5} ${CY + 21} ${CX - 11} ${CY + 27} M${CX + 8} ${CY + 14} Q${CX + 12.5} ${CY + 21} ${CX + 11} ${CY + 27}" stroke="${line}" stroke-width="1" fill="none" stroke-linecap="round"/>`);
  }
  if (t.freckles) for (const [x, y] of [[-17, 8], [-13, 11], [-20, 12], [-9, 9], [17, 8], [13, 11], [20, 12], [9, 9], [-2, 7], [2, 7]]) p.push(`<circle cx="${CX + x}" cy="${CY + y}" r="1.1" fill="#a0603a" opacity=".65"/>`);
  if (t.mole) p.push(`<circle cx="${CX + t.mole * 14}" cy="${CY + 20}" r="1.8" fill="#4a2e1f"/>`);
  return p.join('');
}

function clothes(t) {
  const { W, H } = t, b = CY + H, sy = b + 10, sw = t.female ? 44 : 50;
  const c = t.cloth[0], dark = shade(c, -0.2), p = [];
  p.push(`<path d="M${CX - 9} ${b - 14} L${CX - 9.5} ${sy + 6} L${CX + 9.5} ${sy + 6} L${CX + 9} ${b - 14} Z" fill="${shade(t.skin, -0.12)}"/>`);
  p.push(`<path d="M${CX - sw} 142 C${CX - sw} ${sy + 8} ${CX - sw * 0.6} ${sy} ${CX - 12} ${sy - 2} L${CX + 12} ${sy - 2} C${CX + sw * 0.6} ${sy} ${CX + sw} ${sy + 8} ${CX + sw} 142 Z" fill="${c}"/>`);
  const white = '#f3f3ef';
  switch (t.top) {
    case 'col V': p.push(`<path d="M${CX - 11} ${sy - 2} L${CX} ${sy + 15} L${CX + 11} ${sy - 2} Z" fill="${t.skin}"/>`); break;
    case 'col rond': p.push(`<path d="M${CX - 12} ${sy - 2} Q${CX} ${sy + 10} ${CX + 12} ${sy - 2} Z" fill="${t.skin}"/>`); break;
    case 'tee-shirt': p.push(`<path d="M${CX - 12} ${sy - 2} Q${CX} ${sy + 9} ${CX + 12} ${sy - 2} Z" fill="${t.skin}"/><path d="M${CX - 12} ${sy - 2} Q${CX} ${sy + 9} ${CX + 12} ${sy - 2}" stroke="${dark}" stroke-width="2" fill="none"/>`); break;
    case 'pull': p.push(`<path d="M${CX - 12} ${sy - 2} Q${CX} ${sy + 8} ${CX + 12} ${sy - 2} Z" fill="${t.skin}"/><path d="M${CX - 13} ${sy - 3} Q${CX} ${sy + 9} ${CX + 13} ${sy - 3}" stroke="${dark}" stroke-width="3.5" fill="none"/>`); break;
    case 'col roulé': p.push(`<path d="M${CX - 11} ${b - 4} L${CX + 11} ${b - 4} L${CX + 13} ${sy + 5} Q${CX} ${sy + 8} ${CX - 13} ${sy + 5} Z" fill="${dark}"/>${[-6, -2, 2, 6].map((x) => `<path d="M${CX + x} ${b - 2} L${CX + x * 1.15} ${sy + 4}" stroke="${shade(c, -0.35)}" stroke-width=".8" opacity=".6"/>`).join('')}`); break;
    case 'chemisier':
    case 'chemise': {
      const col = t.top === 'chemise' ? shade(c, 0.35) : shade(c, 0.25);
      p.push(`<path d="M${CX - 10} ${sy - 2} L${CX} ${sy + 12} L${CX + 10} ${sy - 2} Z" fill="${t.skin}"/><path d="M${CX - 12} ${sy - 4} L${CX - 1} ${sy + 11} L${CX - 15} ${sy + 7} Z" fill="${col}"/><path d="M${CX + 12} ${sy - 4} L${CX + 1} ${sy + 11} L${CX + 15} ${sy + 7} Z" fill="${col}"/>`);
      if (t.top === 'chemise') p.push(`<circle cx="${CX}" cy="${sy + 18}" r="1" fill="${dark}"/><circle cx="${CX}" cy="${sy + 25}" r="1" fill="${dark}"/>`);
      break;
    }
    case 'cravate':
    case 'nœud papillon': {
      p.push(`<path d="M${CX - 12} ${sy - 2} L${CX} ${sy + 30} L${CX + 12} ${sy - 2} Z" fill="${white}"/>`);
      p.push(`<path d="M${CX - 12} ${sy - 3} L${CX - 1} ${sy + 8} L${CX - 14} ${sy + 5} Z" fill="#fff" stroke="#dcdcd6" stroke-width=".6"/><path d="M${CX + 12} ${sy - 3} L${CX + 1} ${sy + 8} L${CX + 14} ${sy + 5} Z" fill="#fff" stroke="#dcdcd6" stroke-width=".6"/>`);
      p.push(`<path d="M${CX - 13} ${sy - 1} L${CX - 2} ${sy + 30} M${CX + 13} ${sy - 1} L${CX + 2} ${sy + 30}" stroke="${dark}" stroke-width="2.4"/>`);
      const tc = t.tie[0];
      if (t.top === 'cravate') p.push(`<path d="M${CX - 3.2} ${sy + 1} L${CX + 3.2} ${sy + 1} L${CX + 2.5} ${sy + 6} L${CX - 2.5} ${sy + 6} Z" fill="${shade(tc, -0.15)}"/><path d="M${CX - 2.5} ${sy + 6} L${CX + 2.5} ${sy + 6} L${CX + 5} ${sy + 25} L${CX} ${sy + 30} L${CX - 5} ${sy + 25} Z" fill="${tc}"/>`);
      else p.push(`<path d="M${CX} ${sy + 4} L${CX - 9} ${sy - 1} L${CX - 9} ${sy + 9} Z M${CX} ${sy + 4} L${CX + 9} ${sy - 1} L${CX + 9} ${sy + 9} Z" fill="${tc}"/><circle cx="${CX}" cy="${sy + 4}" r="2.4" fill="${shade(tc, -0.2)}"/>`);
      break;
    }
    default: break;
  }
  if (t.necklace === 'perles') {
    for (let i = 0; i <= 10; i++) { const k = i / 10, x = CX - 13 + 26 * k, y = sy - 1 + 9 * (1 - (2 * k - 1) ** 2); p.push(`<circle cx="${x}" cy="${y}" r="1.6" fill="#f7f3e8" stroke="#d8cfb8" stroke-width=".4"/>`); }
  }
  if (t.necklace === 'pendentif') p.push(`<path d="M${CX - 12} ${sy - 2} Q${CX} ${sy + 12} ${CX + 12} ${sy - 2}" stroke="#d9b45a" stroke-width=".9" fill="none"/><path d="M${CX} ${sy + 5} l2.4 3.4 l-2.4 3.4 l-2.4 -3.4 Z" fill="#d9b45a"/>`);
  return p.join('');
}

function ears(t) {
  const x = t.W - 0.5, ey = CY + 3, p = [];
  for (const s of [-1, 1]) p.push(`<ellipse cx="${CX + s * x}" cy="${ey}" rx="5" ry="8" fill="${t.skin}"/><path d="M${CX + s * (x + 1)} ${ey - 4} Q${CX + s * (x + 3)} ${ey} ${CX + s * (x + 1)} ${ey + 4}" stroke="${shade(t.skin, -0.2)}" stroke-width="1.2" fill="none"/>`);
  return p.join('');
}

function earrings(t) {
  if (!t.earrings) return '';
  const x = t.W - 0.5, y = CY + 11, gold = '#e2b74a', p = [];
  for (const s of [-1, 1]) {
    const ex = CX + s * x;
    if (t.earrings === 'perles') p.push(`<circle cx="${ex}" cy="${y}" r="2.3" fill="#f7f3e8" stroke="#cfc6ad" stroke-width=".5"/>`);
    if (t.earrings === 'créoles') p.push(`<circle cx="${ex}" cy="${y + 3}" r="3.8" stroke="${gold}" stroke-width="1.4" fill="none"/>`);
    if (t.earrings === 'pendantes') p.push(`<path d="M${ex} ${y - 1} L${ex} ${y + 4}" stroke="${gold}" stroke-width="1"/><path d="M${ex} ${y + 4} l2.4 3.2 l-2.4 3.2 l-2.4 -3.2 Z" fill="${t.cloth[0]}"/>`);
  }
  return p.join('');
}

function glasses(t) {
  if (!t.glasses) return '';
  const ey = CY - 1, g = t.gap, f = t.frame, x1 = CX - g, x2 = CX + g, W = t.W;
  const lens = 'fill="#fff" fill-opacity=".14"';
  const arms = (y, w) => `<path d="M${x1 - 9} ${y} L${CX - W + 1} ${y - 1.5} M${x2 + 9} ${y} L${CX + W - 1} ${y - 1.5}" stroke="${f}" stroke-width="${w}"/>`;
  switch (t.glasses) {
    case 'rondes': return `<circle cx="${x1}" cy="${ey}" r="8.6" stroke="${f}" stroke-width="2.2" ${lens}/><circle cx="${x2}" cy="${ey}" r="8.6" stroke="${f}" stroke-width="2.2" ${lens}/><path d="M${x1 + 8.6} ${ey - 1} Q${CX} ${ey - 4} ${x2 - 8.6} ${ey - 1}" stroke="${f}" stroke-width="2" fill="none"/>${arms(ey - 1, 2)}`;
    case 'carrées': return `<rect x="${x1 - 9.5}" y="${ey - 7}" width="19" height="13.5" rx="2.5" stroke="${f}" stroke-width="3" ${lens}/><rect x="${x2 - 9.5}" y="${ey - 7}" width="19" height="13.5" rx="2.5" stroke="${f}" stroke-width="3" ${lens}/><path d="M${x1 + 9.5} ${ey - 2} L${x2 - 9.5} ${ey - 2}" stroke="${f}" stroke-width="2.6"/>${arms(ey - 3, 2.6)}`;
    case 'fines': return `<rect x="${x1 - 9}" y="${ey - 6}" width="18" height="11.5" rx="4.5" stroke="#8d8d8d" stroke-width="1.3" ${lens}/><rect x="${x2 - 9}" y="${ey - 6}" width="18" height="11.5" rx="4.5" stroke="#8d8d8d" stroke-width="1.3" ${lens}/><path d="M${x1 + 9} ${ey - 2} Q${CX} ${ey - 4} ${x2 - 9} ${ey - 2}" stroke="#8d8d8d" stroke-width="1.2" fill="none"/>${arms(ey - 2, 1.2)}`;
    case 'papillon': {
      const lensPath = (x, s) => `M${x - s * 9} ${ey - 3} Q${x - s * 10} ${ey + 6} ${x} ${ey + 6} Q${x + s * 9} ${ey + 6} ${x + s * 10} ${ey - 4} L${x + s * 12} ${ey - 9} Q${x} ${ey - 9} ${x - s * 9} ${ey - 3} Z`;
      return `<path d="${lensPath(x1, -1)}" stroke="${f}" stroke-width="2.6" ${lens} stroke-linejoin="round"/><path d="${lensPath(x2, 1)}" stroke="${f}" stroke-width="2.6" ${lens} stroke-linejoin="round"/><path d="M${x1 + 9} ${ey - 3} L${x2 - 9} ${ey - 3}" stroke="${f}" stroke-width="2.2"/>`;
    }
    case 'demi-lune': return `<path d="M${x1 - 9} ${ey + 1} Q${x1 - 9} ${ey + 8} ${x1} ${ey + 8} Q${x1 + 9} ${ey + 8} ${x1 + 9} ${ey + 1} Z M${x2 - 9} ${ey + 1} Q${x2 - 9} ${ey + 8} ${x2} ${ey + 8} Q${x2 + 9} ${ey + 8} ${x2 + 9} ${ey + 1} Z" stroke="#c9a24a" stroke-width="1.6" ${lens}/><path d="M${x1 + 9} ${ey + 1} Q${CX} ${ey - 2} ${x2 - 9} ${ey + 1}" stroke="#c9a24a" stroke-width="1.4" fill="none"/>${arms(ey + 1, 1.3)}`;
    default: return '';
  }
}

function hat(t) {
  if (!t.hat) return '';
  const { W, H } = t, top = CY - H, c = t.hatColor, dark = shade(c, -0.25);
  switch (t.hat) {
    case 'béret': return `<ellipse cx="${CX - 5}" cy="${top + 1}" rx="${W + 9}" ry="10" fill="${dark}" transform="rotate(-8 ${CX - 5} ${top + 1})"/><circle cx="${CX - 3}" cy="${top - 9}" r="2.4" fill="${dark}"/>`;
    case 'casquette': return `<path d="M${CX - W - 2} ${top + 11} C${CX - W - 2} ${top - 18} ${CX + W + 2} ${top - 18} ${CX + W + 2} ${top + 11} Z" fill="${c}"/><path d="M${CX - W - 1} ${top + 10} Q${CX} ${top + 24} ${CX + W + 1} ${top + 10} Q${CX} ${top + 14} ${CX - W - 1} ${top + 10} Z" fill="${dark}"/><circle cx="${CX}" cy="${top - 10}" r="2" fill="${dark}"/>`;
    case 'bonnet': return `<path d="M${CX - W - 3} ${top + 12} C${CX - W - 3} ${top - 20} ${CX + W + 3} ${top - 20} ${CX + W + 3} ${top + 12} Z" fill="${c}"/><rect x="${CX - W - 4}" y="${top + 3}" width="${2 * W + 8}" height="10" rx="4" fill="${dark}"/><circle cx="${CX}" cy="${top - 15}" r="6" fill="${shade(c, 0.4)}"/>`;
    case 'chapeau': return `<ellipse cx="${CX}" cy="${top + 7}" rx="${W + 17}" ry="6.5" fill="${dark}"/><path d="M${CX - W + 4} ${top + 7} L${CX - W + 7} ${top - 16} Q${CX} ${top - 21} ${CX + W - 7} ${top - 16} L${CX + W - 4} ${top + 7} Z" fill="${dark}"/><path d="M${CX - W + 5} ${top + 1} L${CX + W - 5} ${top + 1} L${CX + W - 4.6} ${top + 6} L${CX - W + 4.6} ${top + 6} Z" fill="${c}"/>`;
    default: return '';
  }
}

export function faceSVG(seed, female, size = 160, v = FACE_V) {
  if (v < 2) return faceSVGv1(seed, female, size);
  const t = faceTraits(seed, female);
  const svg = [
    `<rect width="120" height="140" rx="18" fill="${t.bg}"/>`,
    hairBack(t), clothes(t), ears(t),
    `<path d="${headPath(t)}" fill="${t.skin}"/>`,
    skinMarks(t), facialHair(t), eyes(t), nose(t), mouth(t), hairFront(t), earrings(t), glasses(t), hat(t),
  ].join('').replace(/-?\d+\.\d{2,}/g, (m) => String(+(+m).toFixed(1)));
  return `<svg viewBox="0 0 120 140" width="${size}" height="${Math.round(size * 140 / 120)}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${t.female ? 'visage de femme' : 'visage d’homme'}">${svg}</svg>`;
}
