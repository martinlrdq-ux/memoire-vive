// Générateur de messages oraux pour « Message reçu ».
// Chaque message renvoie un texte à lire et des informations à retrouver, de la plus à la moins importante.
import { NAMES_F, NAMES_M, SURNAMES, JOBS, CITIES, STREETS, DAYS } from './people.js';
import { pick } from '../core/store.js';

const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const hour = () => { const h = rint(8, 19); const m = pick([0, 0, 15, 30, 45]); return { say: m ? `${h} h ${m}` : `${h} h`, ans: m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h|${h}h00|${h}` }; };
const person = () => { const f = Math.random() < 0.5; return { f, first: pick(f ? NAMES_F : NAMES_M), last: pick(SURNAMES) }; };
const phone = () => `0${pick([6, 7])} ${Array.from({ length: 4 }, () => String(rint(10, 99))).join(' ')}`;

const TEMPLATES = [
  () => {
    const p = person();
    const job = pick(JOBS)[p.f ? 1 : 0];
    const city = pick(CITIES);
    const years = rint(2, 15);
    const kid = pick(NAMES_F.concat(NAMES_M));
    return {
      context: `${p.first} se présente`,
      text: `Bonjour, enchanté${p.f ? 'e' : ''} ! Je m'appelle ${p.first} ${p.last}. Je suis ${job}, et j'habite à ${city} depuis ${years} ans. Ma fille, ${kid}, est dans la même classe que votre neveu.`,
      infos: [
        { q: 'Quel est son prénom ?', a: p.first },
        { q: `Quel est le métier de ${p.first} ?`, a: job },
        { q: `Dans quelle ville habite ${p.first} ?`, a: city },
        { q: `Quel est le nom de famille de ${p.first} ?`, a: p.last },
        { q: `Comment s'appelle la fille de ${p.first} ?`, a: kid },
        { q: `Depuis combien d'années ${p.first} habite-t-${p.f ? 'elle' : 'il'} là ?`, a: String(years) },
      ],
    };
  },
  () => {
    const p = person();
    const day = pick(DAYS);
    const h = hour();
    const num = rint(2, 98);
    const street = pick(STREETS);
    const code = `${rint(1, 9)}${rint(0, 9)}${rint(0, 9)}${rint(0, 9)}`;
    const floor = rint(1, 6);
    return {
      context: `Rendez-vous avec ${p.first}`,
      text: `Salut, c'est ${p.first}. On se retrouve ${day} à ${h.say}, au ${num} ${street}. Le code de la porte, c'est le ${code.split('').join(' ')}, et c'est au ${floor === 1 ? 'premier' : floor + 'e'} étage.`,
      infos: [
        { q: `Quel jour est le rendez-vous avec ${p.first} ?`, a: day },
        { q: 'À quelle heure ?', a: h.ans },
        { q: 'Dans quelle rue ?', a: street },
        { q: 'À quel numéro de la rue ?', a: String(num) },
        { q: 'Quel est le code de la porte ?', a: code },
        { q: 'À quel étage ?', a: String(floor) },
      ],
    };
  },
  () => {
    const p = person();
    const h = hour();
    const tel = phone();
    const service = pick(['du cabinet du docteur Morel', 'de l’agence immobilière', 'du garage Fontaine', 'de la médiathèque', 'du service client de votre banque', 'de l’école de musique']);
    const topic = pick(['votre dossier', 'le devis', 'votre inscription', 'la réservation', 'le rendez-vous de jeudi', 'votre colis']);
    return {
      context: `Message de ${p.first}`,
      text: `Bonjour, ici ${p.first}, ${service}. Pouvez-vous me rappeler au ${tel}, avant ${h.say} ? C'est au sujet de ${topic}. Merci, bonne journée.`,
      infos: [
        { q: 'Quel numéro faut-il rappeler ?', a: tel.replace(/ /g, '') },
        { q: 'Avant quelle heure ?', a: h.ans },
        { q: 'Qui a appelé (prénom) ?', a: p.first },
        { q: 'À quel sujet ?', a: topic },
        { q: "D'où appelait la personne ?", a: service.replace(/^du |^de la |^de l’|^de /, '') },
      ],
    };
  },
  () => {
    const p = person();
    const items = [
      [rint(2, 4), pick(['baguettes', 'citrons', 'avocats', 'poivrons'])],
      [rint(2, 6), pick(['œufs', 'yaourts', 'pommes', 'tomates'])],
      [rint(1, 3), pick(['bouteilles d’eau', 'paquets de pâtes', 'pots de miel', 'melons'])],
    ];
    const shop = pick(['la pharmacie', 'la poste', 'le pressing', 'la cordonnerie', 'la librairie']);
    const h = hour();
    return {
      context: `Les courses pour ${p.first}`,
      text: `Coucou, c'est ${p.first}. Pour samedi, tu peux prendre ${items[0][0]} ${items[0][1]}, ${items[1][0]} ${items[1][1]} et ${items[2][0]} ${items[2][1]} ? Et passe à ${shop} avant ${h.say}, s'il te plaît.`,
      infos: [
        { q: `Combien de ${items[0][1]} ?`, a: String(items[0][0]) },
        { q: `Combien de ${items[1][1]} ?`, a: String(items[1][0]) },
        { q: `Combien de ${items[2][1]} ?`, a: String(items[2][0]) },
        { q: 'Où faut-il passer ?', a: shop },
        { q: 'Avant quelle heure ?', a: h.ans },
      ],
    };
  },
  () => {
    const day = pick(DAYS);
    const h = hour();
    const city = pick(CITIES);
    const track = rint(1, 22);
    const coach = rint(1, 18);
    const seat = rint(11, 98);
    return {
      context: `Ton train pour ${city}`,
      text: `Ton train pour ${city} part ${day} à ${h.say}. Il part voie ${track}. Tu es en voiture ${coach}, place ${seat}.`,
      infos: [
        { q: `Quel jour part le train pour ${city} ?`, a: day },
        { q: 'À quelle heure ?', a: h.ans },
        { q: 'Quel numéro de voiture ?', a: String(coach) },
        { q: 'Quelle place ?', a: String(seat) },
        { q: 'Quelle voie ?', a: String(track) },
      ],
    };
  },
  () => {
    const p = person();
    const room = pick(['cuisine', 'chambre', 'salle de bain', 'véranda']);
    const plant = pick(['orchidées', 'tomates', 'fougères', 'cactus']);
    const n = rint(1, 3);
    const neighbour = pick(NAMES_F.concat(NAMES_M));
    const floor = rint(1, 5);
    return {
      context: `Les consignes de ${p.first}`,
      text: `Merci de garder la maison ! En partant, ferme bien la fenêtre de la ${room}. Arrose les ${plant} ${n === 1 ? 'une fois' : n + ' fois'} par semaine. Et laisse la clé chez ${neighbour}, au ${floor === 1 ? 'premier' : floor + 'e'} étage. Signé : ${p.first}.`,
      infos: [
        { q: 'Chez qui faut-il laisser la clé ?', a: neighbour },
        { q: 'Quelle fenêtre faut-il fermer ?', a: room },
        { q: 'Quelles plantes faut-il arroser ?', a: plant },
        { q: 'Combien de fois par semaine ?', a: String(n) },
        { q: 'À quel étage habite le voisin ?', a: String(floor) },
      ],
    };
  },
];

export function makeMessage(nInfos, { long = false } = {}) {
  const m = pick(TEMPLATES)();
  const keep = long ? m.infos.length : Math.min(nInfos, m.infos.length);
  return { ...m, infos: m.infos.slice(0, keep) };
}
