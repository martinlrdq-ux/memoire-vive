// Première génération de visages, gardée pour les visages déjà rangés dans le Coffre
// (sans `extra.v`) : ils doivent garder l'apparence sous laquelle on les a appris.
import { rng, pick } from './store.js';

const SKIN = ['#f9d7b9', '#f1c19b', '#e0a57c', '#c68660', '#a0674a', '#7a4b35'];
const HAIR = { noirs: '#1f1b1a', bruns: '#4a2e1f', châtains: '#7a4a2a', blonds: '#d9b25f', roux: '#c0522b', gris: '#9a9a9a', blancs: '#e8e6e0' };
const SHIRT = ['#5b6ee1', '#e15b6e', '#3fa37a', '#e0a23a', '#8a5be1', '#2b8fb3', '#d9763b', '#444a5c'];
const BG = ['#e8e4fb', '#fbe7e4', '#e1f4ea', '#fbf1dc', '#e3eef9', '#f4e3f4'];
const IRIS = ['#3b2a1f', '#4a6fa5', '#5c8a4a', '#7a5230'];

function faceTraits(seed, female) {
  const r = rng(seed);
  const hairName = pick(Object.keys(HAIR), r);
  return {
    skin: pick(SKIN, r),
    hairName,
    hair: HAIR[hairName],
    style: pick(female ? ['long', 'carré', 'chignon', 'queue', 'bouclés', 'court'] : ['court', 'court', 'chauve', 'bouclés', 'raie', 'longs'], r),
    shirt: pick(SHIRT, r),
    bg: pick(BG, r),
    iris: pick(IRIS, r),
    glasses: r() < 0.35 ? pick(['rondes', 'carrées'], r) : null,
    beard: !female && r() < 0.45 ? pick(['barbe', 'moustache', 'bouc'], r) : null,
    earrings: female && r() < 0.45,
    hat: r() < 0.12 ? pick(['béret', 'casquette'], r) : null,
    freckles: r() < 0.18,
    mole: r() < 0.15,
    brows: 2 + r() * 3,
    mouth: pick(['sourire', 'neutre', 'grand'], r),
    faceW: 34 + r() * 6,
    faceH: 42 + r() * 6,
  };
}

export function faceSVGv1(seed, female, size = 160) {
  const t = faceTraits(seed, female);
  const cx = 60, cy = 62;
  const W = t.faceW, H = t.faceH;
  const p = [];
  p.push(`<rect width="120" height="140" rx="18" fill="${t.bg}"/>`);
  // cheveux arrière
  if (t.style === 'long' || t.style === 'longs') p.push(`<path d="M${cx - W - 4} ${cy} Q${cx - W - 8} ${cy + 50} ${cx - W + 4} ${cy + 58} L${cx + W - 4} ${cy + 58} Q${cx + W + 8} ${cy + 50} ${cx + W + 4} ${cy} Z" fill="${t.hair}"/>`);
  if (t.style === 'carré') p.push(`<path d="M${cx - W - 5} ${cy - 6} L${cx - W - 5} ${cy + 30} L${cx + W + 5} ${cy + 30} L${cx + W + 5} ${cy - 6} Z" fill="${t.hair}"/>`);
  if (t.style === 'queue') p.push(`<ellipse cx="${cx + W + 6}" cy="${cy + 10}" rx="8" ry="20" fill="${t.hair}"/>`);
  if (t.style === 'chignon') p.push(`<circle cx="${cx}" cy="${cy - H - 6}" r="12" fill="${t.hair}"/>`);
  // cou et épaules
  p.push(`<rect x="${cx - 10}" y="${cy + H - 8}" width="20" height="22" fill="${t.skin}"/>`);
  p.push(`<path d="M14 140 Q18 ${cy + H + 12} ${cx} ${cy + H + 10} Q102 ${cy + H + 12} 106 140 Z" fill="${t.shirt}"/>`);
  // oreilles
  p.push(`<ellipse cx="${cx - W}" cy="${cy + 4}" rx="6" ry="9" fill="${t.skin}"/><ellipse cx="${cx + W}" cy="${cy + 4}" rx="6" ry="9" fill="${t.skin}"/>`);
  if (t.earrings) p.push(`<circle cx="${cx - W}" cy="${cy + 15}" r="3" fill="#f2c94c"/><circle cx="${cx + W}" cy="${cy + 15}" r="3" fill="#f2c94c"/>`);
  // visage
  p.push(`<ellipse cx="${cx}" cy="${cy}" rx="${W}" ry="${H}" fill="${t.skin}"/>`);
  // cheveux avant
  const top = cy - H;
  if (t.style === 'court' || t.style === 'raie' || t.style === 'carré' || t.style === 'long' || t.style === 'longs' || t.style === 'queue' || t.style === 'chignon') {
    const part = t.style === 'raie' ? `<path d="M${cx - 8} ${top + 2} L${cx - 6} ${top + 14}" stroke="${t.skin}" stroke-width="2"/>` : '';
    p.push(`<path d="M${cx - W - 2} ${cy - 4} Q${cx - W} ${top - 8} ${cx} ${top - 6} Q${cx + W} ${top - 8} ${cx + W + 2} ${cy - 4} Q${cx + 10} ${top + 10} ${cx - W - 2} ${cy - 4} Z" fill="${t.hair}"/>${part}`);
  }
  if (t.style === 'bouclés') {
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i / 8) * Math.PI;
      p.push(`<circle cx="${cx + Math.cos(a) * (W + 2)}" cy="${cy - 6 + Math.sin(a) * (H + 2)}" r="10" fill="${t.hair}"/>`);
    }
  }
  if (t.style === 'chauve') p.push(`<path d="M${cx - W + 1} ${cy - 2} Q${cx - W - 3} ${cy - 14} ${cx - W + 4} ${cy - 18}" stroke="${t.hair}" stroke-width="5" fill="none"/><path d="M${cx + W - 1} ${cy - 2} Q${cx + W + 3} ${cy - 14} ${cx + W - 4} ${cy - 18}" stroke="${t.hair}" stroke-width="5" fill="none"/>`);
  // chapeau
  if (t.hat === 'béret') p.push(`<ellipse cx="${cx - 4}" cy="${top + 2}" rx="${W + 6}" ry="11" fill="#2d2d44"/><circle cx="${cx - 4}" cy="${top - 9}" r="3" fill="#2d2d44"/>`);
  if (t.hat === 'casquette') p.push(`<path d="M${cx - W - 2} ${top + 12} Q${cx} ${top - 22} ${cx + W + 2} ${top + 12} Z" fill="#d64545"/><path d="M${cx} ${top + 10} L${cx + W + 22} ${top + 14} L${cx + W} ${top + 6} Z" fill="#b53030"/>`);
  // sourcils
  p.push(`<path d="M${cx - 21} ${cy - 13} Q${cx - 14} ${cy - 18} ${cx - 7} ${cy - 13}" stroke="${t.style === 'chauve' ? '#555' : t.hair}" stroke-width="${t.brows}" fill="none" stroke-linecap="round"/>`);
  p.push(`<path d="M${cx + 7} ${cy - 13} Q${cx + 14} ${cy - 18} ${cx + 21} ${cy - 13}" stroke="${t.style === 'chauve' ? '#555' : t.hair}" stroke-width="${t.brows}" fill="none" stroke-linecap="round"/>`);
  // yeux
  for (const dx of [-14, 14]) p.push(`<ellipse cx="${cx + dx}" cy="${cy - 3}" rx="5.5" ry="4" fill="#fff"/><circle cx="${cx + dx}" cy="${cy - 3}" r="2.8" fill="${t.iris}"/><circle cx="${cx + dx}" cy="${cy - 3}" r="1.3" fill="#111"/>`);
  // lunettes
  if (t.glasses === 'rondes') p.push(`<circle cx="${cx - 14}" cy="${cy - 3}" r="10" stroke="#222" stroke-width="2.4" fill="none"/><circle cx="${cx + 14}" cy="${cy - 3}" r="10" stroke="#222" stroke-width="2.4" fill="none"/><path d="M${cx - 4} ${cy - 4} L${cx + 4} ${cy - 4}" stroke="#222" stroke-width="2.4"/>`);
  if (t.glasses === 'carrées') p.push(`<rect x="${cx - 25}" y="${cy - 11}" width="21" height="15" rx="3" stroke="#7a1f3d" stroke-width="3" fill="none"/><rect x="${cx + 4}" y="${cy - 11}" width="21" height="15" rx="3" stroke="#7a1f3d" stroke-width="3" fill="none"/><path d="M${cx - 4} ${cy - 5} L${cx + 4} ${cy - 5}" stroke="#7a1f3d" stroke-width="3"/>`);
  // nez
  p.push(`<path d="M${cx} ${cy - 1} Q${cx - 5} ${cy + 12} ${cx} ${cy + 13} Q${cx + 3} ${cy + 13} ${cx + 4} ${cy + 11}" stroke="rgba(0,0,0,.28)" stroke-width="2" fill="none" stroke-linecap="round"/>`);
  // taches de rousseur, grain de beauté
  if (t.freckles) for (const [x, y] of [[-18, 8], [-14, 11], [-21, 12], [18, 8], [14, 11], [21, 12]]) p.push(`<circle cx="${cx + x}" cy="${cy + y}" r="1.2" fill="#a0603a" opacity=".7"/>`);
  if (t.mole) p.push(`<circle cx="${cx + 16}" cy="${cy + 20}" r="1.8" fill="#4a2e1f"/>`);
  // barbe / moustache
  if (t.beard === 'barbe') p.push(`<path d="M${cx - W + 2} ${cy + 14} Q${cx - W + 4} ${cy + H + 10} ${cx} ${cy + H + 8} Q${cx + W - 4} ${cy + H + 10} ${cx + W - 2} ${cy + 14} Q${cx + 14} ${cy + 22} ${cx} ${cy + 35} Q${cx - 14} ${cy + 22} ${cx - W + 2} ${cy + 14} Z" fill="${t.hair}"/>`);
  if (t.beard === 'moustache' || t.beard === 'barbe') p.push(`<path d="M${cx - 13} ${cy + 20} Q${cx} ${cy + 13} ${cx + 13} ${cy + 20} Q${cx} ${cy + 17} ${cx - 13} ${cy + 20} Z" fill="${t.hair}" stroke="${t.hair}" stroke-width="3"/>`);
  if (t.beard === 'bouc') p.push(`<path d="M${cx - 7} ${cy + 30} Q${cx} ${cy + H + 8} ${cx + 7} ${cy + 30} Z" fill="${t.hair}"/>`);
  // bouche
  const my = cy + 25;
  if (t.mouth === 'sourire') p.push(`<path d="M${cx - 9} ${my} Q${cx} ${my + 7} ${cx + 9} ${my}" stroke="#9b3b3b" stroke-width="2.6" fill="none" stroke-linecap="round"/>`);
  if (t.mouth === 'neutre') p.push(`<path d="M${cx - 8} ${my + 2} L${cx + 8} ${my + 2}" stroke="#9b3b3b" stroke-width="2.6" stroke-linecap="round"/>`);
  if (t.mouth === 'grand') p.push(`<path d="M${cx - 11} ${my - 1} Q${cx} ${my + 12} ${cx + 11} ${my - 1} Z" fill="#7a2626"/><path d="M${cx - 8} ${my} L${cx + 8} ${my}" stroke="#fff" stroke-width="2"/>`);
  return `<svg viewBox="0 0 120 140" width="${size}" height="${Math.round(size * 140 / 120)}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="visage">${p.join('')}</svg>`;
}
