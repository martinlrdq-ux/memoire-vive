// Widget Kikory pour Scriptable : le hibou mis en scène selon le moment de la journée.
// Ce module est téléchargé à chaque rafraîchissement par le petit script que l'app fait copier
// (Réglages → Widget), qui l'appelle avec { code, base, app, supabase, key }.
// Scènes : widget/scenes/*.png, produites par tools/make_widget_scenes.py.

const SCENES_VERSION = 1; // à augmenter quand les images changent, pour vider le cache du téléphone
const DAY_START_HOUR = 4; // comme dans l'app : une mission à 1 h compte pour la veille
const DAY_MS = 86400000;

// Couleur du texte, assortie au fond de chaque scène.
const INK = { matin: '#633806', journee: '#0C447C', soir: '#712B13', victoire: '#27500A', nuit: '#EEEDFE' };

const pad = (n) => String(n).padStart(2, '0');

function dayKey(ts) {
  const d = new Date(ts - DAY_START_HOUR * 3600000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dayStart(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, DAY_START_HOUR).getTime();
}

const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;

// --- Ce que le widget raconte -------------------------------------------------------------

function pickScene(w, now) {
  const h = new Date(now).getHours();
  const doneToday = w && w.day === dayKey(now) && w.done;
  if (doneToday) return h >= 21 || h < DAY_START_HOUR ? 'nuit' : 'victoire';
  if (h >= DAY_START_HOUR && h < 11) return 'matin';
  if (h >= 11 && h < 18) return 'journee';
  return 'soir';
}

function describe(w, now) {
  if (!w) return { scene: 'matin', streak: 0, text: 'Ouvre Kikory pour relier ton widget' };
  const today = dayKey(now);
  const fresh = w.day === today;
  const age = Math.round((dayStart(today) - dayStart(w.day)) / DAY_MS);
  // Les jokers peuvent couvrir un jour manqué : l'app recalcule la série exacte à la prochaine ouverture.
  const streak = age <= 2 ? w.streak || 0 : 0;
  const due = Math.min((w.dues || []).filter((t) => t <= now).length, w.cap || Infinity);
  const dueText = due ? `${plural(due, 'souvenir')} à revoir` : 'Ta mission t’attend';
  const scene = pickScene(w, now);
  let text;
  if (scene === 'matin') text = dueText;
  else if (scene === 'journee') text = fresh && w.steps && w.steps[0] ? `Mission ${w.steps[0]}/${w.steps[1]}` : dueText;
  else if (scene === 'soir') {
    const left = Math.ceil((dayStart(today) + DAY_MS - now) / 3600000);
    if (!streak) text = 'Lance une nouvelle série ce soir';
    else if (left <= 6) text = `Encore ${left} h pour ta série`;
    else text = 'Ta série t’attend ce soir';
  } else if (scene === 'victoire') text = w.today ? `+${w.today} pts aujourd’hui` : 'Mission faite, bravo';
  else text = w.items ? `Je veille sur tes ${plural(w.items, 'souvenir')}` : 'Je veille sur ta mémoire';
  return { scene, streak, text, points: w.points || 0 };
}

// Prochain changement de scène, pour demander un rafraîchissement à ce moment-là.
function nextRefresh(now) {
  const d = new Date(now);
  const marks = [DAY_START_HOUR, 11, 18, 21, 22].map((h) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h).getTime());
  marks.push(marks[0] + DAY_MS);
  const next = marks.filter((t) => t > now + 60000).sort((a, b) => a - b)[0];
  return new Date(Math.min(next, now + 30 * 60000));
}

// --- Données et images (avec copie locale pour fonctionner hors connexion) ----------------

const fm = FileManager.local();
const local = (name) => fm.joinPath(fm.documentsDirectory(), name);

async function loadSummary(cfg) {
  const cache = local('kikory-widget-data.json');
  try {
    const r = new Request(`${cfg.supabase}/rest/v1/rpc/kikory_widget`);
    r.method = 'POST';
    r.headers = { apikey: cfg.key, 'Content-Type': 'application/json' };
    r.body = JSON.stringify({ p_code: cfg.code });
    r.timeoutInterval = 10;
    const res = await r.loadJSON();
    if (r.response.statusCode === 200 && res) {
      fm.writeString(cache, JSON.stringify(res));
      return res.widget;
    }
  } catch (e) {
    console.log(`Kikory : données hors ligne (${e})`);
  }
  return fm.fileExists(cache) ? JSON.parse(fm.readString(cache)).widget : null;
}

// Version carrée (petit et grand widget) ou large (moyen).
async function loadScene(cfg, name, wide) {
  const file = local(`kikory-scene-${name}${wide ? '-wide' : ''}-v${SCENES_VERSION}.png`);
  if (fm.fileExists(file)) return fm.readImage(file);
  const img = await new Request(`${cfg.base}scenes/${name}${wide ? '-wide' : ''}.png?v=${SCENES_VERSION}`).loadImage();
  fm.writeImage(file, img);
  return img;
}

// --- Dessin ------------------------------------------------------------------------------

function header(stack, d, ink, size) {
  const row = stack.addStack();
  row.centerAlignContent();
  const flame = row.addText('🔥');
  flame.font = Font.systemFont(size * 0.8);
  row.addSpacer(2);
  const n = row.addText(String(d.streak));
  n.font = Font.heavyRoundedSystemFont(size);
  n.textColor = ink;
}

function caption(stack, text, ink, width, size = 12.5) {
  const box = stack.addStack();
  box.size = new Size(width, 0);
  const t = box.addText(text);
  t.font = Font.semiboldRoundedSystemFont(size);
  t.textColor = ink;
  t.lineLimit = 2;
  t.minimumScaleFactor = 0.8;
  box.addSpacer();
}

async function build(cfg, family, now) {
  const w = await loadSummary(cfg);
  const d = describe(w, now);
  const ink = new Color(INK[d.scene]);
  const img = await loadScene(cfg, d.scene, family === 'medium');
  const widget = new ListWidget();
  widget.backgroundImage = img;
  widget.url = cfg.app;
  widget.refreshAfterDate = nextRefresh(now);

  if (family === 'medium') {
    // Texte à gauche, la scène occupe la droite de l'image large.
    widget.setPadding(14, 16, 0, 0);
    header(widget, d, ink, 34);
    widget.addSpacer(4);
    caption(widget, d.text, ink, 150, 14);
    if (w) {
      widget.addSpacer(6);
      const pts = widget.addText(`⚡ ${d.points} pts`);
      pts.font = Font.semiboldRoundedSystemFont(12);
      pts.textColor = ink;
      pts.textOpacity = 0.75;
    }
    widget.addSpacer();
    return widget;
  }

  const big = family === 'large';
  widget.setPadding(big ? 18 : 11, big ? 20 : 13, 0, 0);
  header(widget, d, ink, big ? 46 : 30);
  widget.addSpacer(big ? 4 : 2);
  caption(widget, d.text, ink, big ? 190 : 96, big ? 18 : 12.5);
  widget.addSpacer();
  return widget;
}

module.exports.run = async (cfg) => {
  const family = config.widgetFamily || 'small';
  const widget = await build(cfg, family, Date.now());
  if (config.runsInWidget) Script.setWidget(widget);
  else await widget.presentSmall();
  Script.complete();
};

// Pour les tests hors Scriptable.
module.exports.describe = describe;
module.exports.nextRefresh = nextRefresh;
