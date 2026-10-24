// Palais virtuels prêts à l'emploi : 4 pièces de 13 lieux, soit 52 lieux par palais.
// Un décor virtuel exploré quelques minutes sert aussi bien qu'un lieu réel (Legge et al., 2012).

const room = (name, loci) => ({ name, loci: loci.split(';').map((s) => { const [e, ...l] = s.trim().split(' '); return { e, l: l.join(' ') }; }) });

export const VIRTUAL_PALACES = [
  {
    id: 'maison', name: 'La maison de famille', icon: '🏡',
    rooms: [
      room('Entrée', '📬 Boîte aux lettres; 🔔 Sonnette; 🚪 Porte d’entrée; 🧥 Portemanteau; 👞 Meuble à chaussures; 🪞 Miroir; 🔑 Vide-poche; 🌂 Porte-parapluie; 🖼️ Tableau; 🪴 Plante verte; 💡 Lustre; 🧹 Placard à balais; 🪜 Escalier'),
      room('Salon', '🛋️ Canapé; 📺 Télévision; 🕰️ Horloge; 📚 Bibliothèque; 🎹 Piano; 🔥 Cheminée; 🪑 Fauteuil; 🐟 Aquarium; 🪟 Grande fenêtre; 🧸 Coffre à jouets; 💐 Vase; 🎲 Table basse; 🕯️ Chandelier'),
      room('Cuisine', '🧊 Réfrigérateur; 🍳 Gazinière; 🚰 Évier; 🫖 Bouilloire; 🍽️ Vaisselier; 🧺 Corbeille de fruits; 🗑️ Poubelle; 🥖 Huche à pain; 🪑 Tabouret; ⏲️ Minuteur; 🧂 Étagère à épices; 🍷 Cave à vin; 🐈 Gamelle du chat'),
      room('Chambre', '🛏️ Lit; 💡 Lampe de chevet; ⏰ Réveil; 👗 Armoire; 💄 Coiffeuse; 🧸 Ours en peluche; 🪟 Volets; 🧦 Commode; 📖 Livre sur l’oreiller; 🖼️ Photo de famille; 🎒 Sac à dos; 🛁 Baignoire; 🚿 Douche'),
    ],
  },
  {
    id: 'chateau', name: 'Le château fort', icon: '🏰',
    rooms: [
      room('La cour', '🌉 Pont-levis; ⚔️ Herse; 💂 Garde; 🐴 Écurie; ⛲ Puits; 🛡️ Armurerie; ⚒️ Forge; 🐓 Poulailler; 🌳 Vieux chêne; 🪵 Tas de bois; 🎯 Cible de tir à l’arc; 🚩 Étendard; 🗿 Statue du fondateur'),
      room('La grande salle', '👑 Trône; 🍗 Table du banquet; 🎺 Trompettes; 🕯️ Candélabre; 🪕 Ménestrel; 🐕 Lévrier; 🧱 Grande cheminée; 🗡️ Épée au mur; 🛢️ Tonneau; 🎭 Bouffon; 🪟 Vitrail; 🧵 Tapisserie; 🔔 Cloche'),
      room('La bibliothèque', '📜 Parchemins; 🌍 Globe; 🔭 Télescope; 🪶 Plume et encrier; 🧪 Fiole d’alchimiste; 🗝️ Coffre secret; 🦉 Hibou empaillé; 📚 Échelle à livres; 🗺️ Carte au trésor; ⌛ Sablier; 🪑 Fauteuil de lecture; 🧙 Portrait du mage; 💎 Vitrine à bijoux'),
      room('Le donjon', '🌀 Escalier en colimaçon; 🕸️ Toile d’araignée; 🦇 Chauve-souris; 🔒 Cachot; ⛓️ Chaînes; 🏹 Meurtrière; 🛎️ Cloche d’alarme; 🐦‍⬛ Nid de corbeaux; 🔥 Torche; 🧭 Rose des vents; 🪃 Arbalète; 🌙 Lucarne; 🚩 Drapeau au sommet'),
    ],
  },
  {
    id: 'ville', name: 'La ville au bord de la mer', icon: '⛵',
    rooms: [
      room('La gare', '🚉 Quai; 🕰️ Grande horloge; 🎟️ Guichet; 🧳 Consigne à bagages; 🥐 Boulangerie; 📰 Kiosque à journaux; 🪑 Banc; 🚲 Parking à vélos; 🚕 Station de taxis; 🚌 Arrêt de bus; 🗺️ Plan de la ville; 🎷 Musicien de rue; ⛲ Fontaine'),
      room('Le marché', '🍅 Étal de tomates; 🧀 Fromager; 🐟 Poissonnier; 💐 Fleuriste; 🍯 Marchand de miel; 🥖 Boulanger; 🍇 Raisins; 🫒 Olives; 🧺 Vannier; 🎠 Manège; 🌭 Camion-restaurant; 🎈 Marchand de ballons; 🐕 Chien du quartier'),
      room('Le port', '⚓ Ancre géante; ⛵ Voilier; 🛥️ Yacht; 🦀 Casier à crabes; 🎣 Pêcheur; 🕊️ Mouettes; 🪢 Cordages; 🛟 Bouée; 🍦 Glacier; 🏠 Cabane de pêcheur; 🐙 Bassin aux poulpes; ⛴️ Ferry; 🧜 Statue de sirène'),
      room('Le phare', '🪨 Rochers; 🌊 Vagues; 🏖️ Petite plage; 🐚 Coquillages; 🦭 Phoque; 🌀 Tourbillon; 🪜 Échelle; 🚪 Porte du phare; 💡 Lanterne; 🔭 Longue-vue; 📯 Corne de brume; 🐋 Baleine au large; 🌅 Coucher de soleil'),
    ],
  },
];

// Liste plate des lieux d'un palais (virtuel ou personnel).
export function lociOf(palace) {
  if (palace.rooms) return palace.rooms.flatMap((r) => r.loci.map((x) => ({ ...x, room: r.name })));
  return palace.loci.map((l) => ({ e: '📍', l, room: palace.name }));
}
