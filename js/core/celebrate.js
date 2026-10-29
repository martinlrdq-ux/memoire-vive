// La fête de fin de mission : feux d'artifice, canons à confettis et serpentins, et le hibou qui surgit,
// lève un grand pouce et fait un clin d'œil. Une fois par jour, quand la mission atteint 100 %.
import { h } from './ui.js';

const BROWN = '#854F0B', DARK = '#633806', CREAM = '#FAEEDA', BELLY = '#F3D7A8', ORANGE = '#EF9F27', INK = '#412402';
const COLORS = ['#ffc21a', '#ff6b1a', '#22c55e', '#3d8bff', '#ff5fa2', '#8ccbff', '#ffffff', '#b07cff'];

// Hibou en pied (même dessin que les scènes du widget, tools/make_widget_scenes.py), origine aux pieds.
// La pose de base est la pose finale : sans animation (mouvements réduits), il fait déjà son pouce.
function owl() {
  const chevrons = [[-10, -46], [10, -46], [0, -34], [-12, -24], [12, -24]]
    .map(([x, y]) => `<path d="M${x - 5} ${y} L${x} ${y + 5} L${x + 5} ${y}" stroke="#D9A066" stroke-width="2.5" fill="none" stroke-linecap="round"/>`).join('');
  const eye = (cx) => `<circle cx="${cx}" cy="-80" r="17" fill="${CREAM}"/><circle cx="${cx}" cy="-79" r="9" fill="${INK}"/><circle cx="${cx + 3.5}" cy="-83" r="3" fill="#fff"/>`;
  const spark = (x, y, s) => `<path class="co-spark" d="M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s} Z" fill="#ffc21a"/>`;
  return `<svg viewBox="-100 -178 210 192" aria-hidden="true">
<ellipse cx="0" cy="2" rx="42" ry="6" fill="#000" opacity=".18"/>
<ellipse cx="-15" cy="-3" rx="10" ry="6" fill="${ORANGE}"/><ellipse cx="15" cy="-3" rx="10" ry="6" fill="${ORANGE}"/>
<g class="co-flap"><ellipse cx="-40" cy="-48" rx="12" ry="28" fill="${DARK}" transform="rotate(12 -40 -48)"/></g>
<polygon points="-40,-88 -34,-124 -14,-104" fill="${BROWN}"/><polygon points="40,-88 34,-124 14,-104" fill="${BROWN}"/>
<ellipse cx="0" cy="-58" rx="45" ry="56" fill="${BROWN}"/>
<ellipse cx="0" cy="-34" rx="28" ry="28" fill="${BELLY}"/>${chevrons}
<g class="co-eye">${eye(-17)}</g>
<g class="co-eye co-wink">${eye(17)}</g>
<path class="co-closed" d="M3 -76 Q17 -92 31 -76" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>
<ellipse cx="-33" cy="-62" rx="7" ry="4.5" fill="#F0997B" opacity=".7"/><ellipse cx="33" cy="-62" rx="7" ry="4.5" fill="#F0997B" opacity=".7"/>
<g class="co-grin">
<path d="M-23 -64 Q0 -60 23 -64 Q21 -38 0 -37 Q-21 -38 -23 -64 Z" fill="#5A1E08"/>
<ellipse cx="0" cy="-42" rx="11" ry="5" fill="#F0997B"/>
<path d="M-20 -63 Q0 -60 20 -63 L19 -58 Q0 -55.5 -19 -58 Z" fill="#fff"/></g>
<polygon points="-6,-70 6,-70 0,-60" fill="${ORANGE}"/>
<g class="co-arm">
<ellipse cx="54" cy="-82" rx="11" ry="27" fill="${DARK}" transform="rotate(38 54 -82)"/>
<g class="co-thumb">
<rect x="66" y="-151" width="14" height="36" rx="7" fill="${DARK}"/>
<rect x="60" y="-122" width="32" height="27" rx="10" fill="${DARK}"/>
<path d="M62 -113 H74 M62 -105 H74" stroke="#9C5F14" stroke-width="2.5" stroke-linecap="round"/>
</g></g>
${spark(98, -150, 9)}${spark(52, -160, 6)}${spark(102, -112, 5)}
</svg>`;
}

// Feux d'artifice et confettis sur deux toiles : derrière le hibou (fusées, gerbes) et devant (papiers, serpentins).
function fireworks(back, front) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let W = 0, H = 0;
  const size = () => {
    W = window.innerWidth; H = window.innerHeight;
    for (const c of [back, front]) { c.width = W * dpr; c.height = H * dpr; c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0); }
  };
  size();
  window.addEventListener('resize', size);
  const bx = back.getContext('2d'), fx = front.getContext('2d');
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const rockets = [], sparks = [], papers = [];
  const u = Math.min(W, 500) / 400; // échelle : un peu plus grand sur un grand écran

  const G = 0.5; // pesanteur des fusées : la vitesse de départ les fait éclater pile à leur hauteur
  const launch = () => {
    const top = rand(0.1, 0.4) * H;
    rockets.push({ x: rand(0.15, 0.85) * W, y: H + 10, vx: rand(-0.8, 0.8), vy: -Math.sqrt(2 * G * (H + 10 - top)) * 1.02, top, color: pick(COLORS) });
  };
  const burst = (x, y, color) => {
    const n = 70, ring = Math.random() < 0.35;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand(-0.05, 0.05), v = (ring ? 5.4 : rand(1.5, 6)) * u;
      sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, decay: rand(0.011, 0.018), color: Math.random() < 0.2 ? '#ffffff' : color, r: rand(1.6, 2.6) * u });
    }
  };
  const paper = (x, y, vx, vy) => papers.push({
    x, y, vx, vy, rot: rand(0, 6.3), vr: rand(-0.2, 0.2), phase: rand(0, 6.3), color: pick(COLORS),
    kind: Math.random() < 0.16 ? 'ribbon' : Math.random() < 0.25 ? 'dot' : 'rect', w: rand(6, 11) * u, h: rand(9, 15) * u,
  });
  // Les deux canons à cotillons, depuis les coins du bas.
  const cannons = () => {
    for (let i = 0; i < 70; i++) for (const side of [-1, 1]) {
      const a = rand(0.8, 1.35), v = rand(9, 17) * Math.sqrt(H / 800); // vers le haut et vers le centre
      paper(side < 0 ? -10 : W + 10, H * 0.92, -side * Math.cos(a) * v, -Math.sin(a) * v);
    }
  };
  const plan = [[0, cannons], [0, launch], [200, launch], [500, launch], [900, launch], [1150, launch], [1500, launch], [1900, launch], [2200, launch], [2600, launch], [3000, launch], [3500, launch]];
  const t0 = performance.now();
  let last = t0, raf = 0, stopped = false;

  const frame = (now) => {
    const k = Math.min(3, (now - last) / 16.7), t = now - t0;
    last = now;
    while (plan.length && plan[0][0] <= t) plan.shift()[1]();
    if (t > 700 && t < 4200) for (let i = 0; i < 2; i++) if (Math.random() < 0.6) paper(rand(0, W), -20, rand(-1, 1), rand(1, 3));

    bx.globalCompositeOperation = 'destination-out';
    bx.fillStyle = 'rgba(0,0,0,0.28)';
    bx.fillRect(0, 0, W, H);
    bx.globalCompositeOperation = 'lighter';
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i];
      r.x += r.vx * k; r.y += r.vy * k; r.vy += G * k;
      bx.fillStyle = r.color;
      bx.beginPath(); bx.arc(r.x, r.y, 2.6 * u, 0, 7); bx.fill();
      if (r.y <= r.top || r.vy >= 0) { burst(r.x, r.y, r.color); rockets.splice(i, 1); }
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.x += s.vx * k; s.y += s.vy * k; s.vx *= 0.985 ** k; s.vy = s.vy * 0.985 ** k + 0.05 * k;
      s.life -= s.decay * k;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      bx.globalAlpha = Math.min(1, s.life * 1.4) * (Math.random() < 0.1 ? 0.4 : 1);
      bx.fillStyle = s.color;
      bx.beginPath(); bx.arc(s.x, s.y, s.r, 0, 7); bx.fill();
    }
    bx.globalAlpha = 1;

    fx.clearRect(0, 0, W, H);
    for (let i = papers.length - 1; i >= 0; i--) {
      const p = papers[i];
      p.vx *= 0.97 ** k; p.vy = Math.min(p.vy * 0.97 ** k + 0.16 * k, 2.6 * u + 1);
      p.phase += 0.09 * k; p.rot += p.vr * k;
      p.x += (p.vx + Math.sin(p.phase) * 0.9) * k; p.y += p.vy * k;
      if (p.y > H + 30) { papers.splice(i, 1); continue; }
      fx.save();
      fx.translate(p.x, p.y);
      fx.fillStyle = fx.strokeStyle = p.color;
      if (p.kind === 'ribbon') {
        // Serpentin : une petite vague qui ondule en tombant.
        fx.rotate(p.rot * 0.3);
        fx.lineWidth = 3 * u; fx.lineCap = 'round';
        fx.beginPath();
        for (let j = 0; j <= 10; j++) fx.lineTo(Math.sin(p.phase + j * 0.8) * 5 * u, (j - 5) * 3.4 * u);
        fx.stroke();
      } else {
        fx.rotate(p.rot);
        fx.scale(1, Math.cos(p.phase * 1.3)); // le papier se retourne
        if (p.kind === 'dot') { fx.beginPath(); fx.arc(0, 0, p.w * 0.5, 0, 7); fx.fill(); } else fx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      fx.restore();
    }
    if (!stopped && (plan.length || rockets.length || sparks.length || papers.length || t < 4200)) raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => { stopped = true; cancelAnimationFrame(raf); window.removeEventListener('resize', size); };
}

export function celebrate({ streak = 0, name = '' } = {}) {
  if (document.querySelector('.celebrate')) return;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const back = h('canvas', { class: 'co-canvas' }), front = h('canvas', { class: 'co-canvas front' });
  let stop = () => {};
  let closing = false, auto = 0;
  const opened = performance.now();
  const close = () => {
    if (closing || performance.now() - opened < 700) return; // laisse le temps de voir, évite le tap involontaire
    closing = true;
    clearTimeout(auto);
    el.classList.add('out');
    setTimeout(() => { stop(); el.remove(); }, 320);
  };
  const el = h('div', { class: 'celebrate', role: 'dialog', 'aria-label': 'Mission du jour terminée à 100 %', onclick: close },
    back,
    h('div', { class: 'co-content' },
      h('div', { class: 'co-title' }, '100 %'),
      h('div', { class: 'co-owl', html: owl() }),
      h('p', { class: 'co-sub' }, `Journée bouclée${name ? `, ${name}` : ''} !`),
      streak > 0 && h('p', { class: 'co-streak' }, `🔥 ${streak} jour${streak > 1 ? 's' : ''} d’affilée`),
      h('button', { class: 'co-btn', onclick: (e) => { e.stopPropagation(); close(); } }, 'À demain !')),
    front);
  document.body.append(el);
  if (!calm) stop = fireworks(back, front);
  auto = setTimeout(close, 9000);
}
