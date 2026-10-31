// Les grades : 12 grades en 6 paliers. Chaque grade a son hibou en pied, de plus en plus savant,
// et son insigne, de plus en plus orné (galons de bronze, étoiles d'argent, ornements d'or) ;
// chaque palier donne sa palette à l'app (css/app.css, [data-palette]).
// Planche de référence : https://claude.ai/artifact/SeGgHXZYcF8iYhk3qrdHLQ

export const TIERS = [
  { id: 'nid', name: 'Le Nid', palette: 'ciel', metal: 'bronze' },
  { id: 'ecole', name: 'L’École', palette: 'lagon', metal: 'bronze' },
  { id: 'biblio', name: 'La Bibliothèque', palette: 'sapin', metal: 'argent' },
  { id: 'academie', name: 'L’Académie', palette: 'bordeaux', metal: 'argent' },
  { id: 'conseil', name: 'Le Conseil des sages', palette: 'pourpre', metal: 'or' },
  { id: 'legende', name: 'La Légende', palette: 'nuit', metal: 'or' },
];

export const GRADES = [
  { id: 'oisillon', name: 'Oisillon', min: 0, tier: 0, outfit: 'Encore un bout de coquille sur la tête' },
  { id: 'apprenti', name: 'Apprenti', min: 100, tier: 0, outfit: 'Écharpe rayée et cartable' },
  { id: 'initie', name: 'Initié', min: 300, tier: 1, outfit: 'Lunettes rondes et premier livre' },
  { id: 'eclaireur', name: 'Éclaireur', min: 700, tier: 1, outfit: 'Chapeau scout, foulard et lanterne' },
  { id: 'mnemoniste', name: 'Mnémoniste', min: 1500, tier: 2, outfit: 'Gilet, nœud papillon et clé du Coffre' },
  { id: 'lettre', name: 'Lettré', min: 2500, tier: 2, outfit: 'Monocle, plume d’oie et pile de livres' },
  { id: 'erudit', name: 'Érudit', min: 3500, tier: 3, outfit: 'Toge, mortier et diplôme' },
  { id: 'maitre', name: 'Maître', min: 5000, tier: 3, outfit: 'Étole d’or, médaille et pompon doré' },
  { id: 'sage', name: 'Sage', min: 7500, tier: 4, outfit: 'Barbe blanche, lunettes en demi-lune, bâton' },
  { id: 'grandmaitre', name: 'Grand maître', min: 11000, tier: 4, outfit: 'Cape à col d’hermine, laurier d’or, cristal' },
  { id: 'oracle', name: 'Oracle', min: 16000, tier: 5, outfit: 'Capuche étoilée, yeux d’or, orbe de lumière' },
  { id: 'legende', name: 'Légende', min: 25000, tier: 5, outfit: 'Couronne, auréole et plumes dorées' },
];

// Palettes : les jetons CSS sont dans css/app.css ; ici, ce qu'il faut au JS
// (couleur de la barre d'état, pastilles des Réglages, fond de l'écran de nouveau grade).
export const PALETTES = {
  ciel: { name: 'Ciel', top: '#0a3cff', bottom: '#3d8bff', darkTop: '#0b2fc9' },
  lagon: { name: 'Lagon', top: '#045a72', bottom: '#1594aa', darkTop: '#03445a' },
  sapin: { name: 'Sapin', top: '#0c4732', bottom: '#2a7f5d', darkTop: '#0a3828' },
  bordeaux: { name: 'Bordeaux', top: '#5c1128', bottom: '#9e334b', darkTop: '#4a0d20' },
  pourpre: { name: 'Pourpre', top: '#321256', bottom: '#66389a', darkTop: '#280e46' },
  nuit: { name: 'Nuit et or', top: '#0c1030', bottom: '#2a2f6e', darkTop: '#080b22' },
};

// Rang (0 à 11) du grade atteint avec ce total de points.
export function gradeOf(points) {
  let i = 0;
  while (i + 1 < GRADES.length && points >= GRADES[i + 1].min) i++;
  return i;
}

export const tierOf = (i) => TIERS[GRADES[i].tier];

let uid = 0; // dégradés propres à chaque dessin : deux hiboux sur la même page ne se marchent pas dessus

// --- Le hibou -------------------------------------------------------------------------

const C = { brown: '#854F0B', dark: '#633806', cream: '#FAEEDA', belly: '#F3D7A8', orange: '#EF9F27', ink: '#412402', chev: '#D9A066', blush: '#F0997B' };
const GOLD = '#E8B634', GOLD_D = '#A97A0E', GOLD_L = '#FFE49A';

// Aile gauche (à gauche à l'écran), accrochée à l'épaule (-34,-84) ; la droite en est le miroir.
const WING = 'M-34 -84 C-52 -78 -58 -60 -57 -44 Q-54 -36 -49 -42 Q-45 -34 -41 -41 Q-37 -34 -33 -43 C-31 -58 -30 -70 -34 -84 Z';
const TIPS = 'M-58 -50 C-63 -37 -61 -23 -55 -16 C-51 -23 -50 -37 -52 -50 Z M-52 -48 C-55 -34 -52 -19 -46 -13 C-43 -20 -43 -35 -45 -48 Z M-45 -47 C-46 -33 -43 -21 -38 -16 C-36 -23 -37 -35 -39 -47 Z';
const CUFF = 'M-57 -44 Q-54 -36 -49 -42 Q-45 -34 -41 -41 Q-37 -34 -33 -43';

function wing({ fill = C.dark, cuff = null, tips = C.belly, lines = C.chev } = {}) {
  return `<path d="${TIPS}" fill="${tips}"/><path d="M-55 -44 L-55 -24 M-48.5 -42 L-46.5 -21" stroke="${lines}" stroke-width="1.8" stroke-linecap="round" fill="none"/><path d="${WING}" fill="${fill}"/>`
    + (cuff ? `<path d="${CUFF}" stroke="${cuff}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` : '');
}

const star4 = (x, y, s, fill) => `<path d="M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s} Z" fill="${fill}"/>`;
function star5(x, y, r, fill, extra = '') {
  const p = [];
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r;
    p.push(`${(x + Math.cos(a) * rr).toFixed(1)} ${(y + Math.sin(a) * rr).toFixed(1)}`);
  }
  return `<path d="M${p.join(' L')} Z" fill="${fill}"${extra}/>`;
}

// Feuilles de laurier le long d'un arc d'ellipse (angles en degrés).
function laurel(cx, cy, rx, ry, a0, a1, n, fill, size = 1) {
  let s = '';
  for (let k = 0; k < n; k++) {
    const a = ((a0 + ((a1 - a0) * k) / (n - 1)) * Math.PI) / 180;
    const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
    const t = (Math.atan2(Math.cos(a) * ry, -Math.sin(a) * rx) * 180) / Math.PI + (a1 > a0 ? 0 : 180);
    s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${6 * size}" ry="${2.7 * size}" transform="rotate(${(t + (k % 2 ? 28 : -28)).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${fill}"/>`;
  }
  return s;
}

const eye = (cx, iris) => `<circle cx="${cx}" cy="-80" r="17" fill="${C.cream}"/>`
  + (iris ? `<circle cx="${cx}" cy="-79" r="12" fill="${iris}"/>` : '')
  + `<circle cx="${cx}" cy="-79" r="9" fill="${C.ink}"/><circle cx="${cx + 3.5}" cy="-83" r="3" fill="#fff"/>`;

// Pièces de costume. Chaque grade empile des pièces rangées par couche :
// back (derrière le corps), torso (sur le corps), under (sous l'aile gauche), held (devant l'aile gauche),
// face (sur le visage, sous le bec), top (chapeaux), front (au premier plan, à droite).
const P = {
  shell: { top: `<g transform="rotate(-9 0 -112)"><path d="M-21 -104 C-22 -126 -12 -137 0 -137 C12 -137 22 -126 21 -104 L15 -98 L9 -105 L3 -98 L-3 -105 L-9 -98 L-15 -105 Z" fill="#FFFBF0" stroke="#E2D2AE" stroke-width="2" stroke-linejoin="round"/><ellipse cx="-8" cy="-124" rx="2.4" ry="1.6" fill="#E9DCBF"/><ellipse cx="9" cy="-116" rx="1.8" ry="1.3" fill="#E9DCBF"/><path d="M-13 -125 Q-9 -131 -3 -132" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/></g>` },
  fluff: { torso: `<path d="M-44 -50 q-9 1 -8 8 M-45 -36 q-8 2 -6 8 M44 -50 q9 1 8 8 M45 -36 q8 2 6 8" stroke="${C.brown}" stroke-width="4" stroke-linecap="round" fill="none"/>` },
  scarf: { torso: `<path d="M-43 -66 Q0 -47 43 -66 L45 -55 Q0 -35 -45 -55 Z" fill="#E0503A"/><path d="M-30 -59 l2 8 M-15 -55 l1 9 M15 -55 l-1 9 M30 -59 l-2 8" stroke="#FFE3C2" stroke-width="3" stroke-linecap="round"/><path d="M9 -50 L27 -51 L31 -17 L18 -15 Z" fill="#D2412C"/><path d="M12 -38 L29 -39 M14 -28 L30 -29" stroke="#FFE3C2" stroke-width="3"/><path d="M20 -15 l-1 6 M24 -15.5 l0 6 M28 -16 l1 6" stroke="#D2412C" stroke-width="2" stroke-linecap="round"/>` },
  satchel: { held: `<path d="M34 -64 L-26 -28" stroke="#7A4A1E" stroke-width="5" stroke-linecap="round"/><rect x="-46" y="-36" width="30" height="24" rx="5" fill="#A8652C"/><path d="M-46 -31 Q-46 -36 -41 -36 L-21 -36 Q-16 -36 -16 -31 L-16 -24 Q-31 -18 -46 -24 Z" fill="#8A4F20"/><rect x="-34" y="-25" width="6" height="6" rx="1.5" fill="${GOLD}"/>` },
  glasses: { face: `<circle cx="-18" cy="-80" r="18" fill="#fff" fill-opacity=".14" stroke="#2E2A33" stroke-width="3.2"/><circle cx="18" cy="-80" r="18" fill="#fff" fill-opacity=".14" stroke="#2E2A33" stroke-width="3.2"/><path d="M-36 -83 L-44 -87 M36 -83 L44 -87" stroke="#2E2A33" stroke-width="3" stroke-linecap="round"/>` },
  book: { under: `<g transform="rotate(-16 -62 -56)"><rect x="-74" y="-76" width="22" height="34" rx="2.5" fill="#B83A4B"/><rect x="-55" y="-74" width="4" height="30" fill="#FFF3DC"/><path d="M-70 -68 h12 M-70 -63 h12" stroke="#F6C9A0" stroke-width="2"/></g>` },
  scoutHat: { top: `<path d="M-19 -112 L-15 -137 Q-8 -131 0 -141 Q8 -131 15 -137 L19 -112 Z" fill="#B48E52"/><path d="M-8 -131 L-4 -116 M8 -131 L4 -116" stroke="#9C7A45" stroke-width="2" stroke-linecap="round"/><ellipse cx="0" cy="-111" rx="41" ry="8" fill="#9C7A45"/><path d="M-19.5 -119 L19.5 -119 L19 -113 L-19 -113 Z" fill="#5B3A1C"/>` },
  foulard: { torso: `<path d="M-42 -66 Q0 -50 42 -66" stroke="#2F8F5B" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M-26 -60 Q0 -52 26 -60 L0 -26 Z" fill="#2F8F5B"/><path d="M-26 -60 L0 -26 L26 -60" stroke="#F2C14E" stroke-width="2.5" fill="none" stroke-linejoin="round"/><circle cx="0" cy="-53" r="5.5" fill="#C58B4E" stroke="#8C5524" stroke-width="1.5"/>` },
  lantern: { back: `<circle cx="-76" cy="-18" r="24" fill="#FFD27A" opacity=".35"/>`, under: `<g transform="translate(-76 2)"><rect x="-9" y="-5" width="18" height="5" rx="1.5" fill="#4A3A2A"/><rect x="-7.5" y="-24" width="15" height="19" rx="2" fill="#FFE7A3" stroke="#4A3A2A" stroke-width="2.5"/><ellipse cx="0" cy="-13" rx="3" ry="5.5" fill="#FF9F1A"/><path d="M-10 -24 L10 -24 L0 -33 Z" fill="#4A3A2A"/><circle cx="0" cy="-36" r="3.5" fill="none" stroke="#4A3A2A" stroke-width="2"/></g>` },
  waistcoat: { torso: `<path d="M-37 -62 C-45 -40 -39 -20 -25 -9 L-5 -6 L0 -12 L5 -6 L25 -9 C39 -20 45 -40 37 -62 L13 -62 L0 -38 L-13 -62 Z" fill="#26406B"/><path d="M-13 -62 L0 -38 L13 -62" stroke="#1B2F52" stroke-width="2" fill="none"/><circle cx="0" cy="-31" r="2.6" fill="${GOLD}"/><circle cx="0" cy="-22" r="2.6" fill="${GOLD}"/><path d="M-27 -30 q6 2 11 0 M27 -30 q-6 2 -11 0" stroke="#1B2F52" stroke-width="2" stroke-linecap="round" fill="none"/>`, face: `<path d="M0 -55 L-14 -62 L-14 -47 Z M0 -55 L14 -62 L14 -47 Z" fill="#C0392B"/><circle cx="0" cy="-55" r="4" fill="#9E2B20"/>` },
  key: { held: `<g transform="rotate(14 -48 -30)"><circle cx="-48" cy="-50" r="8" fill="none" stroke="${GOLD}" stroke-width="4.5"/><path d="M-48 -42 L-48 -6 M-48 -8 h8 M-48 -15 h6" stroke="${GOLD}" stroke-width="4.5" stroke-linecap="round"/><circle cx="-48" cy="-50" r="8" fill="none" stroke="${GOLD_D}" stroke-width="1" opacity=".6"/></g>` },
  monocle: { face: `<circle cx="18" cy="-80" r="18.5" fill="#fff" fill-opacity=".14" stroke="${GOLD}" stroke-width="3.2"/><path d="M34 -71 Q44 -52 26 -34" stroke="${GOLD}" stroke-width="1.6" stroke-dasharray="2.5 2" fill="none"/>` },
  quill: { back: `<g transform="translate(-30 -100) rotate(-32)"><path d="M0 -6 C-11 -20 -11 -40 0 -58 C11 -40 11 -20 0 -6 Z" fill="#F4EBD9" stroke="#A8977A" stroke-width="2"/><path d="M-7 -26 L0 -33 M-7 -38 L0 -45 M7 -20 L0 -27 M7 -32 L0 -39" stroke="#C9BBA0" stroke-width="1.5"/><path d="M0 4 L0 -56" stroke="#6E604B" stroke-width="2"/><path d="M-2 4 L0 10 L2 4 Z" fill="#2E2A33"/></g>` },
  books: { front: `<g transform="translate(76 2)"><rect x="-16" y="-9" width="34" height="9" rx="1.5" fill="#2F6B4F"/><rect x="-13" y="-18" width="28" height="9" rx="1.5" fill="#B83A4B"/><rect x="-15" y="-27" width="31" height="9" rx="1.5" fill="#26406B"/><path d="M-12 -4.5 h27 M-9 -13.5 h21 M-11 -22.5 h24" stroke="#FFF3DC" stroke-width="1.4" opacity=".7"/></g>` },
  robeBlack: { torso: robe('#24212C', '#3A3646') },
  sleevesBlack: { wing: { fill: '#2D2938', cuff: '#4A4458' } },
  mortar: { top: mortar('#C0392B') },
  diploma: { under: `<g transform="rotate(-22 -60 -56)"><rect x="-82" y="-62" width="38" height="12" rx="6" fill="#FFF6E2" stroke="#E2D3B0" stroke-width="1.5"/><ellipse cx="-82" cy="-56" rx="2.6" ry="6" fill="#EADBB8"/><rect x="-67" y="-63.5" width="5" height="15" fill="#C0392B"/></g>` },
  stole: { torso: `<path d="M-25 -63 L-21 -6 M25 -63 L21 -6" stroke="${GOLD}" stroke-width="7" stroke-linecap="round"/><path d="M-21 -20 L-21 -12 M21 -20 L21 -12" stroke="${GOLD_D}" stroke-width="7" opacity=".35"/>` },
  medal: { face: `<path d="M-9 -60 L0 -42 L9 -60 L4 -60 L0 -51 L-4 -60 Z" fill="#B5283B"/><circle cx="0" cy="-36" r="8.5" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="1.6"/>${star5(0, -36, 5, '#FFF3C4')}` },
  sleevesGold: { wing: { fill: '#2D2938', cuff: GOLD } },
  mortarGold: { top: mortar(GOLD) },
  staff: { under: `<path d="M-68 3 L-61 -128" stroke="#6E4824" stroke-width="5.5" stroke-linecap="round"/><path d="M-61 -128 q-3 -13 8 -15 q9 1 5 10" stroke="#6E4824" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M-65.6 -40 l5 1 M-63.6 -80 l5 1" stroke="#4E3218" stroke-width="2" stroke-linecap="round"/>` },
  tunic: { torso: robe('#6C7A93', '#56637B') + `<path d="M-40 -30 Q0 -21 40 -30" stroke="#C9A26B" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M14 -26 l3 14 M18 -27 l6 12" stroke="#C9A26B" stroke-width="3" stroke-linecap="round"/>` },
  sleevesSlate: { wing: { fill: '#6C7A93', cuff: '#56637B' } },
  beard: { face: `<path d="M-24 -66 C-31 -48 -23 -32 -15 -24 C-11 -14 -5 -8 0 -1 C5 -8 11 -14 15 -24 C23 -32 31 -48 24 -66 C14 -59 -14 -59 -24 -66 Z" fill="#F5F2EA"/><path d="M-13 -52 Q-11 -38 -7 -25 M0 -56 L0 -12 M13 -52 Q11 -38 7 -25" stroke="#DAD3C3" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M-1 -62 Q-12 -59 -20 -66 M1 -62 Q12 -59 20 -66" stroke="#F5F2EA" stroke-width="5" stroke-linecap="round" fill="none"/>`,
    brows: `<path d="M-34 -97 Q-24 -107 -7 -100 M34 -97 Q24 -107 7 -100" stroke="#F5F2EA" stroke-width="5.5" stroke-linecap="round" fill="none"/><path d="M-30 -101 l-5 -4 M30 -101 l5 -4" stroke="#F5F2EA" stroke-width="3" stroke-linecap="round"/>`,
    ears: '#EFE6D6' },
  halfMoon: { glasses: `<path d="M-35 -76 L-1 -76 A17 13 0 0 1 -35 -76 Z M1 -76 L35 -76 A17 13 0 0 1 1 -76 Z" fill="#DCEFFF" fill-opacity=".3" stroke="#B08D3C" stroke-width="2.4" stroke-linejoin="round"/><path d="M-1 -76 Q0 -79 1 -76 M-35 -77 L-44 -84 M35 -77 L44 -84" stroke="#B08D3C" stroke-width="2.2" fill="none" stroke-linecap="round"/>` },
  cape: { back: `<path d="M-40 -80 C-64 -62 -72 -24 -68 2 L68 2 C72 -24 64 -62 40 -80 Z" fill="#8E1D35"/><path d="M-68 2 L68 2" stroke="${GOLD}" stroke-width="3"/>` },
  royalRobe: { torso: robe('#2A3F8F', '#203277', GOLD) },
  sleevesRoyal: { wing: { fill: '#2A3F8F', cuff: GOLD } },
  ermine: { collar: `<path d="M-47 -71 Q0 -45 47 -71 Q51 -58 42 -52 Q0 -31 -42 -52 Q-51 -58 -47 -71 Z" fill="#FBF8F1"/><path d="M-35 -60 l1.5 4 l1.5 -4 Z M-20 -53 l1.5 4 l1.5 -4 Z M18 -53 l1.5 4 l1.5 -4 Z M33 -60 l1.5 4 l1.5 -4 Z" fill="#2A2A2A"/>` },
  laurelCrown: { top: laurel(0, -100, 34, 22, 200, 268, 6, GOLD, 1.1) + laurel(0, -100, 34, 22, 340, 272, 6, GOLD, 1.1) },
  crystal: { under: `<circle cx="-56" cy="-145" r="15" fill="#BFF0FF" opacity=".45"/><path d="M-56 -160 L-48 -146 L-56 -131 L-64 -146 Z" fill="#7FD6F5" stroke="#2F95BF" stroke-width="2" stroke-linejoin="round"/><path d="M-56 -160 L-56 -131 M-64 -146 L-48 -146" stroke="#E6FAFF" stroke-width="1.2"/>` },
  hood: { back: `<path d="M-50 -64 C-62 -112 -34 -152 0 -154 C34 -152 62 -112 50 -64 Z" fill="#1F2B6B"/>`,
    top: `<path d="M-45 -84 C-46 -118 -24 -134 0 -134 C24 -134 46 -118 45 -84" stroke="#2E3D8F" stroke-width="11" fill="none" stroke-linecap="round"/><path d="M-45 -84 C-46 -118 -24 -134 0 -134 C24 -134 46 -118 45 -84" stroke="${GOLD}" stroke-width="2" fill="none" stroke-dasharray="1 7" stroke-linecap="round"/>${star4(-22, -142, 5, GOLD_L)}${star4(26, -140, 4, GOLD_L)}`, noEars: true },
  starRobe: { torso: robe('#2E3D8F', '#24317A', GOLD) + star4(-30, -40, 4, GOLD_L) + star4(32, -22, 3.5, GOLD_L) + star4(-24, -14, 3, GOLD_L) + star4(30, -48, 3, GOLD_L) },
  sleevesStar: { wing: { fill: '#2E3D8F', cuff: GOLD } },
  goldEyes: { iris: '#E8B634' },
  orb: { front: `<circle cx="76" cy="-50" r="26" fill="#9FE7FF" opacity=".25"/><circle cx="76" cy="-50" r="14" fill="url(#orb)"/><ellipse cx="71" cy="-56" rx="4.5" ry="3" fill="#fff" opacity=".85"/>${star4(92, -76, 5, '#BFF0FF')}${star4(60, -78, 3.5, '#BFF0FF')}`,
    defs: '<radialGradient id="orb" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#8FD9FF"/><stop offset="1" stop-color="#3C6FD9"/></radialGradient>' },
  sparkles: { front: star4(-80, -118, 6, GOLD_L) + star4(70, -132, 5, GOLD_L) + star4(84, -96, 4, GOLD_L) + star4(-70, -150, 3.5, GOLD_L) },
  aura: { back: `<circle cx="0" cy="-78" r="88" fill="url(#aura)"/>${Array.from({ length: 16 }, (_, k) => `<path d="M-3 -78 L3 -78 L0 -170 Z" fill="${GOLD}" opacity=".28" transform="rotate(${k * 22.5} 0 -78)"/>`).join('')}`,
    defs: `<radialGradient id="aura"><stop offset="0" stop-color="${GOLD_L}" stop-opacity=".9"/><stop offset=".6" stop-color="${GOLD}" stop-opacity=".25"/><stop offset="1" stop-color="${GOLD}" stop-opacity="0"/></radialGradient>` },
  nightCape: { back: `<path d="M-40 -80 C-66 -62 -74 -24 -70 2 L70 2 C74 -24 66 -62 40 -80 Z" fill="#1A2260" stroke="${GOLD}" stroke-width="3" stroke-linejoin="round"/>${star4(-60, -30, 3.5, GOLD_L)}${star4(60, -18, 3.5, GOLD_L)}` },
  goldRobe: { torso: robe('#D9A938', '#B88A1E', '#FFF1C2') + `<path d="M-30 -36 l3 3 l-3 3 l-3 -3 Z M30 -20 l3 3 l-3 3 l-3 -3 Z M-22 -16 l3 3 l-3 3 l-3 -3 Z" fill="#FFF1C2"/>` },
  sleevesGoldTips: { wing: { fill: '#D9A938', cuff: '#FFF1C2', tips: '#FFE08A', lines: '#E8B634' } },
  crown: { top: `<path d="M-26 -107 L-29 -133 L-15 -120 L-7 -142 L0 -124 L7 -142 L15 -120 L29 -133 L26 -107 Z" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="2" stroke-linejoin="round"/><path d="M-26 -113 L26 -113" stroke="${GOLD_D}" stroke-width="2"/><circle cx="0" cy="-110" r="4" fill="#D7263D"/><circle cx="-15" cy="-110" r="3" fill="#2E86DE"/><circle cx="15" cy="-110" r="3" fill="#2E86DE"/><circle cx="-29" cy="-135" r="2.8" fill="${GOLD_L}"/><circle cx="29" cy="-135" r="2.8" fill="${GOLD_L}"/><circle cx="-7" cy="-144" r="2.8" fill="${GOLD_L}"/><circle cx="7" cy="-144" r="2.8" fill="${GOLD_L}"/>` },
};

function robe(fill, shade, trim) {
  return `<path d="M-44 -66 C-51 -40 -49 -17 -41 -5 L41 -5 C49 -17 51 -40 44 -66 L14 -62 L0 -30 L-14 -62 Z" fill="${fill}"/>`
    + `<path d="M-41 -5 L41 -5 M-20 -8 C-24 -26 -24 -44 -22 -60 M20 -8 C24 -26 24 -44 22 -60" stroke="${shade}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`
    + (trim ? `<path d="M-14 -62 L0 -30 L14 -62 M-41 -5 L41 -5" stroke="${trim}" stroke-width="3" fill="none" stroke-linejoin="round" stroke-linecap="round"/>` : '');
}

function mortar(tassel) {
  return `<path d="M-24 -117 L-24 -105 Q0 -97 24 -105 L24 -117 Z" fill="#1E1B24"/><path d="M-41 -118 L0 -132 L41 -118 L0 -105 Z" fill="#2B2733"/><path d="M-41 -118 L0 -132 L41 -118" stroke="#45404F" stroke-width="2" fill="none" stroke-linejoin="round"/><circle cx="0" cy="-118" r="3" fill="${tassel}"/><path d="M0 -118 Q20 -117 34 -116 L34 -101" stroke="${tassel}" stroke-width="2.2" fill="none"/><path d="M31 -102 L37 -102 L39 -89 L29 -89 Z" fill="${tassel}"/>`;
}

const OUTFITS = [
  ['shell'],
  ['scarf', 'satchel'],
  ['glasses', 'book'],
  ['glasses', 'foulard', 'scoutHat', 'lantern'],
  ['waistcoat', 'key'],
  ['waistcoat', 'key', 'monocle', 'quill', 'books'],
  ['robeBlack', 'sleevesBlack', 'mortar', 'diploma'],
  ['robeBlack', 'sleevesGold', 'stole', 'medal', 'mortarGold', 'diploma'],
  ['tunic', 'sleevesSlate', 'beard', 'halfMoon', 'staff'],
  ['cape', 'royalRobe', 'sleevesRoyal', 'ermine', 'beard', 'halfMoon', 'staff', 'crystal', 'laurelCrown'],
  ['hood', 'starRobe', 'sleevesStar', 'beard', 'goldEyes', 'orb', 'sparkles'],
  ['aura', 'nightCape', 'goldRobe', 'sleevesGoldTips', 'beard', 'goldEyes', 'crown', 'sparkles'],
];

/**
 * Le hibou du grade i, en pied, origine aux pieds.
 * L'aile droite (à droite à l'écran), dans .owl-wave, pivote autour de l'épaule : le cadre invisible
 * de 160 × 160 centré sur l'épaule la met au milieu de la boîte (transform-box: fill-box ; origin 50% 50%).
 */
export function gradeOwl(i) {
  const parts = OUTFITS[i].map((k) => P[k]);
  const all = (layer) => parts.map((p) => p[layer] || '').join('');
  const pick = (key) => parts.reduce((v, p) => p[key] ?? v, undefined);
  const w = { ...(pick('wing') || {}) };
  const ears = parts.some((p) => p.noEars) ? '' : `<polygon points="-40,-88 -34,-124 -14,-104" fill="${C.brown}"/><polygon points="40,-88 34,-124 14,-104" fill="${C.brown}"/>`
    + (pick('ears') ? `<polygon points="-36.5,-109 -34,-124 -28,-118" fill="${pick('ears')}"/><polygon points="36.5,-109 34,-124 28,-118" fill="${pick('ears')}"/>` : '');
  const chevrons = [[-10, -46], [10, -46], [0, -34], [-12, -24], [12, -24]]
    .map(([x, y]) => `<path d="M${x - 5} ${y} L${x} ${y + 5} L${x + 5} ${y}" stroke="${C.chev}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`).join('');
  const iris = pick('iris');
  const right = `<g transform="translate(34 -84)"><g class="owl-wave"><rect x="-80" y="-80" width="160" height="160" fill="none"/><g transform="translate(-34 84) scale(-1 1)">${wing(w)}</g></g></g>`;
  const body = [
    `<ellipse cx="0" cy="2" rx="44" ry="6" fill="#000" opacity=".16"/>`,
    all('back'),
    `<ellipse cx="-15" cy="-3" rx="10" ry="6" fill="${C.orange}"/><ellipse cx="15" cy="-3" rx="10" ry="6" fill="${C.orange}"/>`,
    ears,
    `<ellipse cx="0" cy="-58" rx="45" ry="56" fill="${C.brown}"/><ellipse cx="0" cy="-34" rx="28" ry="28" fill="${C.belly}"/>${chevrons}`,
    all('torso'),
    all('under'),
    wing(w),
    all('held'),
  ].join('');
  const face = [
    all('collar'),
    `${eye(-17, iris)}${eye(17, iris)}`,
    `<ellipse cx="-33" cy="-62" rx="7" ry="4.5" fill="${C.blush}" opacity=".7"/><ellipse cx="33" cy="-62" rx="7" ry="4.5" fill="${C.blush}" opacity=".7"/>`,
    all('face'),
    `<polygon points="-6,-70 6,-70 0,-60" fill="${C.orange}"/>`,
    all('brows'),
    all('glasses'),
    all('top'),
    all('front'),
  ].join('');
  const defs = parts.map((p) => p.defs || '').join('');
  const k = ++uid;
  return `<svg viewBox="-100 -180 200 196" aria-hidden="true">${defs ? `<defs>${defs}</defs>` : ''}${body}${right}${face}</svg>`
    .replace(/(id="|url\(#)(orb|aura)/g, `$1$2-${k}`);
}

// --- L'insigne ------------------------------------------------------------------------

const METALS = {
  bronze: { light: '#F2BE87', mid: '#C07A35', dark: '#6E3D12', mark: '#5A300B' },
  argent: { light: '#FFFFFF', mid: '#BAC5D0', dark: '#5D6B79', mark: '#3C4855' },
  or: { light: '#FFF2B0', mid: '#E2AC2C', dark: '#875E00', mark: '#6B4700' },
};
const SHIELD = 'M0 -38 L30 -29 L30 4 C30 23 16 35 0 41 C-16 35 -30 23 -30 4 L-30 -29 Z';

export function gradeBadge(i) {
  const m = METALS[tierOf(i).metal];
  const id = `metal-${++uid}`;
  const chev = (y) => `<path d="M-17 ${y + 7} L0 ${y - 5} L17 ${y + 7}" stroke="${m.mark}" stroke-width="6.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  const out = [], back = [];
  let inner = '';
  if (i <= 3) {
    const n = Math.min(i + 1, 3), y0 = i === 3 ? -14 : -6 - (n - 1) * 6;
    for (let k = 0; k < n; k++) inner += chev(y0 + k * 12);
    if (i === 3) inner += `<path d="M-17 20 Q0 31 17 20" stroke="${m.mark}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  } else if (i <= 7) {
    const pos = [[[0, 0]], [[-10, 2], [10, 2]], [[0, -11], [-11, 8], [11, 8]], [[0, -11], [-11, 8], [11, 8]]][i - 4];
    inner = pos.map(([x, y]) => star5(x, y, i === 4 ? 13 : 9, m.mark)).join('');
  } else {
    inner = `<g transform="rotate(-38)"><circle cx="0" cy="-17" r="5.5" fill="none" stroke="${m.mark}" stroke-width="3.5"/><path d="M0 -11 L0 21 M0 19 h5.5 M0 13 h4.5" stroke="${m.mark}" stroke-width="3.5" stroke-linecap="round"/></g>`
      + `<g transform="rotate(38)"><path d="M0 -22 C-6 -12 -6 6 0 18 C6 6 6 -12 0 -22 Z" fill="${m.mark}"/><path d="M0 18 L0 25" stroke="${m.mark}" stroke-width="2.5" stroke-linecap="round"/></g>`;
    if (i === 11) inner += `<circle cx="0" cy="-1" r="5.5" fill="#D7263D" stroke="${m.light}" stroke-width="1.5"/>`;
  }
  if (i >= 7) back.push(laurel(0, 6, 40, 40, 115, 205, 7, '#E2AC2C', 1.05), laurel(0, 6, 40, 40, 65, -25, 7, '#E2AC2C', 1.05));
  if (i >= 10) {
    const wingPath = 'M30 -14 C44 -30 60 -32 70 -28 C62 -22 66 -16 60 -10 C66 -6 60 0 54 2 C58 8 50 12 44 12 C46 18 38 20 32 18 Z';
    back.unshift(`<path d="${wingPath}" fill="url(#${id})" stroke="${m.dark}" stroke-width="2" stroke-linejoin="round"/><path d="${wingPath}" transform="scale(-1 1)" fill="url(#${id})" stroke="${m.dark}" stroke-width="2" stroke-linejoin="round"/>`);
  }
  if (i >= 11) back.unshift(Array.from({ length: 12 }, (_, k) => `<path d="M-4 0 L4 0 L0 -64 Z" fill="${m.mid}" opacity=".55" transform="rotate(${k * 30 + 15})"/>`).join(''));
  if (i >= 9) out.push(`<path d="M-17 -40 L-20 -56 L-10 -48 L0 -62 L10 -48 L20 -56 L17 -40 Z" fill="url(#${id})" stroke="${m.dark}" stroke-width="2" stroke-linejoin="round"/><circle cx="0" cy="-47" r="2.8" fill="#D7263D"/>`);
  return `<svg viewBox="-72 -68 144 136" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${m.light}"/><stop offset="1" stop-color="${m.mid}"/></linearGradient></defs>`
    + back.join('')
    + `<path d="${SHIELD}" fill="url(#${id})" stroke="${m.dark}" stroke-width="3" stroke-linejoin="round"/><path d="M0 -31 L24 -24 L24 3 C24 18 13 28 0 33 C-13 28 -24 18 -24 3 L-24 -24 Z" fill="none" stroke="${m.light}" stroke-width="1.5" opacity=".7"/>`
    + inner + out.join('') + '</svg>';
}
