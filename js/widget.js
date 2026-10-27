// Widget d'écran d'accueil via l'app Scriptable (une PWA ne peut pas avoir de widget iOS à elle).
// L'app joint à chaque synchronisation un petit résumé ; le widget le lit avec un code propre au compte
// (tools/supabase-widget.sql) et affiche la scène du hibou (widget/kikory-widget.js).
import { h, toast } from './core/ui.js';
import { S, dayKey, dayStart, addDays } from './core/store.js';
import { streakCount, pointsToday, isFullDay } from './core/engine.js';
import { SUPABASE_URL, SUPABASE_KEY } from './core/config.js';
import { rpc, push, session, setWidgetSummary, cloudEnabled } from './core/cloud.js';
import { sessionSteps } from './session.js';

const SCRIPTABLE_URL = 'https://apps.apple.com/app/scriptable/id1405459188';

export function widgetSummary(now = Date.now()) {
  const d = dayKey(now);
  const s = S.sessions[d];
  const steps = sessionSteps(s || { kind: isFullDay(d) ? 'full' : 'light' });
  // Échéances des 3 prochains jours : le widget compte lui-même ce qui est à revoir au fil des heures.
  const horizon = dayStart(addDays(d, 3));
  const dues = Object.values(S.items).map((i) => i.due).filter((t) => typeof t === 'number' && t < horizon).sort((a, b) => a - b).slice(0, 300);
  return {
    v: 1,
    day: d,
    done: Boolean(s?.done),
    steps: [steps.filter((k) => s?.steps[k]).length, steps.length],
    streak: streakCount(),
    points: S.points.total,
    today: pointsToday(),
    items: Object.keys(S.items).length,
    cap: S.profile.reviewCap,
    dues,
    at: now,
  };
}

setWidgetSummary(widgetSummary);

// Script à coller dans Scriptable : il télécharge la dernière version du widget à chaque rafraîchissement.
function loaderScript(code) {
  const cfg = {
    code,
    base: new URL('widget/', location.href).href,
    app: new URL('./', location.href).href,
    supabase: SUPABASE_URL,
    key: SUPABASE_KEY,
  };
  return `// Kikory : widget d'écran d'accueil. Script généré par l'app (Réglages → Widget), à coller tel quel.
const KIKORY = ${JSON.stringify(cfg, null, 2)};
const fm = FileManager.local();
const mod = fm.joinPath(fm.documentsDirectory(), 'kikory-widget-module.js');
try {
  const js = await new Request(KIKORY.base + 'kikory-widget.js?t=' + Date.now()).loadString();
  if (js.includes('module.exports.run')) fm.writeString(mod, js);
} catch (e) {}
if (!fm.fileExists(mod)) throw new Error('Kikory : connexion internet nécessaire pour le premier lancement.');
await importModule(mod).run(KIKORY);
`;
}

export function widgetBlock() {
  const box = h('div', { class: 'stack' });
  const intro = h('p', { class: 'muted small' }, 'Le hibou sur ton écran d’accueil : ta série, tes souvenirs à revoir, et une scène qui change avec l’heure. Il passe par Scriptable, une app gratuite.');
  if (!cloudEnabled() || !session()) {
    box.replaceChildren(intro, h('p', { class: 'small' }, 'Le widget a besoin d’un compte Kikory : connecte-toi d’abord.'));
    return box;
  }
  const steps = h('ol', { class: 'small' },
    h('li', null, 'Installe ', h('a', { href: SCRIPTABLE_URL, target: '_blank', rel: 'noopener' }, 'Scriptable'), ' depuis l’App Store.'),
    h('li', null, 'Touche « Copier le script » ci-dessous.'),
    h('li', null, 'Dans Scriptable, touche +, colle le script, puis renomme-le « Kikory » (touche son titre).'),
    h('li', null, 'Sur l’écran d’accueil : appui long, +, Scriptable, petit widget. Puis appui long sur le widget, « Modifier le widget », Script : Kikory.'));
  const prepare = h('button', { class: 'btn primary', onclick: async () => {
    prepare.disabled = true;
    try {
      await push();
      const code = await rpc('kikory_widget_code', { p_token: session().token });
      showCopy(loaderScript(code));
    } catch (e) {
      toast(e.message);
      prepare.disabled = false;
    }
  } }, '🦉 Préparer mon widget');
  const showCopy = (script) => {
    const area = h('textarea', { class: 'widget-script', readonly: true, rows: 4, value: script });
    const copy = h('button', { class: 'btn primary', onclick: async () => {
      try {
        await navigator.clipboard.writeText(script);
        toast('Script copié : colle-le dans Scriptable 📋', 'ok');
      } catch (e) {
        area.focus();
        area.select();
        toast('Copie impossible : sélectionne le texte et copie-le à la main.');
      }
    } }, '📋 Copier le script');
    box.replaceChildren(intro, steps, copy, area, h('p', { class: 'muted small' }, 'Ce script contient un code qui ne donne accès qu’au résumé du widget. Préparer un nouveau widget désactive l’ancien.'));
  };
  box.replaceChildren(intro, steps, prepare);
  return box;
}
