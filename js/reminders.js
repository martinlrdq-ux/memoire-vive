// Les rappels envoyés en notification : la mission du jour, « Ma vie » à retrouver, le rappel différé du bilan.
// La consigne du soir (l'étoile) n'en a pas : s'en souvenir sans aide, c'est l'exercice.
import { S, dayKey, addDays } from './core/store.js';
import { isFullDay } from './core/engine.js';
import { DELAY_MIN } from './games/bilan.js';
import { setPlanner } from './core/notify.js';

const HORIZON = 14; // jours programmés d'avance ; chaque ouverture de l'app prolonge le programme
const MIN = 60000;

function missions(now) {
  const [hh, mm] = (S.profile.reminderTime || '08:30').split(':').map(Number);
  const out = [];
  for (let k = 0; k < HORIZON; k++) {
    const d = addDays(dayKey(now), k);
    if (S.streak.done[d]) continue;
    const [y, m, day] = d.split('-').map(Number);
    out.push({
      at: new Date(y, m - 1, day, hh, mm).getTime(), tag: 'mission', title: '🔥 Mission du jour',
      body: `${S.profile.anchor} : ${isFullDay(d) ? 'ta session t’attend, environ 15 minutes.' : 'le Coffre t’attend, environ 5 minutes.'}`,
    });
  }
  return out;
}

// Première révision de ce qui a été saisi dans « Ma vie » (le soir même), regroupée par quart d'heure.
function maVie(now) {
  const groups = new Map();
  for (const i of Object.values(S.items)) {
    if (i.src !== 'mavie' || i.m.reps || i.due <= now) continue;
    const at = Math.ceil(i.due / (15 * MIN)) * 15 * MIN;
    if (!groups.has(at)) groups.set(at, []);
    groups.get(at).push(i);
  }
  return [...groups].map(([at, items]) => ({
    at, tag: 'mavie', title: '👤 Ma vie',
    body: items.length === 1 ? `« ${items[0].prompt} » : tu t’en souviens ? Viens le retrouver de tête.` : `${items.length} choses à retrouver de tête, dont « ${items[0].prompt} ».`,
  }));
}

function bilan() {
  const p = S.bilanPending;
  if (!p) return [];
  return [{ at: p.start + DELAY_MIN * MIN, tag: 'bilan', title: '⏰ Rappel différé du bilan', body: `${DELAY_MIN} minutes sont passées : retrouve les 15 mots du bilan.` }];
}

setPlanner(() => {
  const now = Date.now();
  return [...bilan(), ...maVie(now), ...missions(now)];
});
