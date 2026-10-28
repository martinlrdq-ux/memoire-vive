// Les rappels envoyés en notification : la mission du jour, « Ma vie » à retrouver, le rappel différé du bilan.
// La consigne du soir (l'étoile) n'a pas de rappel, s'en souvenir sans aide est l'exercice : seulement
// une notification après coup, le matin suivant, si elle a été ratée.
import { S, dayKey, addDays } from './core/store.js';
import { isFullDay } from './core/engine.js';
import { DELAY_MIN } from './games/bilan.js';
import { setPlanner } from './core/notify.js';

const HORIZON = 14; // jours programmés d'avance ; chaque ouverture de l'app prolonge le programme
const MIN = 60000;

// L'heure du rappel quotidien, le jour d (clé AAAA-MM-JJ).
function reminderAt(d) {
  const [hh, mm] = (S.profile.reminderTime || '08:30').split(':').map(Number);
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day, hh, mm).getTime();
}

function missions(now) {
  const out = [];
  for (let k = 0; k < HORIZON; k++) {
    const d = addDays(dayKey(now), k);
    if (S.streak.done[d]) continue;
    out.push({
      at: reminderAt(d), tag: 'mission', title: '🔥 Mission du jour',
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

// Étoile pas touchée à temps : la consigne expire à 4 h, on le dit à l'heure du rappel de ce matin-là.
// Si elle est touchée avant, son statut change et la notification disparaît du programme.
function ciel() {
  return Object.values(S.prospective).filter((p) => p.status === 'pending').map((p) => ({
    at: Math.max(p.expires, reminderAt(dayKey(p.expires))), tag: 'ciel', title: '🌌 Étoile ratée',
    body: `Hier, il fallait toucher l’étoile ${p.color} dans le ciel de l’accueil. Pas grave : une nouvelle consigne t’attend à la fin de ta prochaine session.`,
  }));
}

setPlanner(() => {
  const now = Date.now();
  return [...bilan(), ...ciel(), ...maVie(now), ...missions(now)];
});
