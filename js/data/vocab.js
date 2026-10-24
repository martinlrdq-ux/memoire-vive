// Vocabulaire pour « Mots d'ailleurs » : [mot étranger, traduction(s) française(s)].
// Des mots du quotidien, rarement appris en premier, pour laisser la place à la méthode du mot-clé.

export const LANGUAGES = {
  en: {
    name: 'Anglais', flag: '🇬🇧', voice: 'en-GB',
    example: { word: 'a puddle', fr: 'une flaque', key: 'poudre', image: 'De la poudre de cacao tombe dans une flaque et la rend marron.' },
    words: [
      ['a puddle', 'flaque'], ['a ladle', 'louche'], ['a wrench', 'clé à molette'], ['a pebble', 'galet'], ['a hinge', 'charnière'],
      ['a thimble', 'dé à coudre'], ['a kettle', 'bouilloire'], ['a sleeve', 'manche'], ['a beak', 'bec'], ['a wheelbarrow', 'brouette'],
      ['a hedge', 'haie'], ['a gutter', 'gouttière'], ['a squirrel', 'écureuil'], ['a rake', 'râteau'], ['a seagull', 'mouette'],
      ['a shelf', 'étagère'], ['a stool', 'tabouret'], ['a cliff', 'falaise'], ['a lighthouse', 'phare'], ['a mole', 'taupe'],
      ['a hoof', 'sabot'], ['a blister', 'ampoule (sur la peau)|ampoule'], ['a dimple', 'fossette'], ['an eyebrow', 'sourcil'],
      ['a chin', 'menton'], ['a goose', 'oie'], ['a lawn', 'pelouse'], ['a moth', 'papillon de nuit|mite'], ['a wrist', 'poignet'],
      ['an ankle', 'cheville'], ['a heel', 'talon'], ['a needle', 'aiguille'], ['a broom', 'balai'], ['a bucket', 'seau'],
      ['a shovel', 'pelle'], ['a sink', 'évier'], ['a drawer', 'tiroir'], ['a nail', 'clou|ongle'], ['an owl', 'hibou|chouette'],
      ['a hedgehog', 'hérisson'], ['a toad', 'crapaud'], ['a swan', 'cygne'], ['a rooster', 'coq'], ['a pillowcase', 'taie d’oreiller|taie'],
    ],
  },
  es: {
    name: 'Espagnol', flag: '🇪🇸', voice: 'es-ES',
    example: { word: 'el cajón', fr: 'le tiroir', key: 'caisson', image: 'Un caisson en bois s’ouvre comme un tiroir et déborde de chaussettes.' },
    words: [
      ['el cajón', 'tiroir'], ['la almohada', 'oreiller'], ['el cubo', 'seau'], ['la escoba', 'balai'], ['el grifo', 'robinet'],
      ['la nevera', 'réfrigérateur|frigo'], ['la sartén', 'poêle'], ['la cuchara', 'cuillère'], ['el tenedor', 'fourchette'],
      ['el cuchillo', 'couteau'], ['la toalla', 'serviette'], ['el espejo', 'miroir'], ['la ventana', 'fenêtre'], ['el tejado', 'toit'],
      ['el suelo', 'sol'], ['la llave', 'clé'], ['el bolsillo', 'poche'], ['la manzana', 'pomme'], ['la fresa', 'fraise'],
      ['el pepino', 'concombre'], ['la zanahoria', 'carotte'], ['el ajo', 'ail'], ['la cebolla', 'oignon'], ['el queso', 'fromage'],
      ['el conejo', 'lapin'], ['la ardilla', 'écureuil'], ['el búho', 'hibou'], ['la mariposa', 'papillon'], ['el caballo', 'cheval'],
      ['la oveja', 'brebis|mouton'], ['el pájaro', 'oiseau'], ['la tortuga', 'tortue'], ['la rodilla', 'genou'], ['el codo', 'coude'],
      ['la muñeca', 'poignet|poupée'], ['el hombro', 'épaule'], ['la barbilla', 'menton'], ['la ceja', 'sourcil'], ['el ombligo', 'nombril'],
      ['el paraguas', 'parapluie'], ['la cartera', 'portefeuille'], ['el sobre', 'enveloppe'], ['el puente', 'pont'], ['la colina', 'colline'],
      ['la nube', 'nuage'], ['la lluvia', 'pluie'], ['el relámpago', 'éclair'],
    ],
  },
  it: {
    name: 'Italien', flag: '🇮🇹', voice: 'it-IT',
    example: { word: 'il cassetto', fr: 'le tiroir', key: 'cassette', image: 'Un tiroir rempli de vieilles cassettes audio qui chantent quand on l’ouvre.' },
    words: [
      ['il cassetto', 'tiroir'], ['il cuscino', 'coussin|oreiller'], ['il secchio', 'seau'], ['la scopa', 'balai'], ['il rubinetto', 'robinet'],
      ['la padella', 'poêle'], ['il cucchiaio', 'cuillère'], ['la forchetta', 'fourchette'], ['il coltello', 'couteau'],
      ['l’asciugamano', 'serviette'], ['lo specchio', 'miroir'], ['la finestra', 'fenêtre'], ['il tetto', 'toit'], ['il pavimento', 'sol'],
      ['la chiave', 'clé'], ['la tasca', 'poche'], ['la mela', 'pomme'], ['la fragola', 'fraise'], ['il cetriolo', 'concombre'],
      ['l’aglio', 'ail'], ['la cipolla', 'oignon'], ['il formaggio', 'fromage'], ['il coniglio', 'lapin'], ['lo scoiattolo', 'écureuil'],
      ['il gufo', 'hibou'], ['la farfalla', 'papillon'], ['il cavallo', 'cheval'], ['la pecora', 'brebis|mouton'], ['l’uccello', 'oiseau'],
      ['la tartaruga', 'tortue'], ['il ginocchio', 'genou'], ['il gomito', 'coude'], ['il polso', 'poignet'], ['la spalla', 'épaule'],
      ['il mento', 'menton'], ['il sopracciglio', 'sourcil'], ['l’ombelico', 'nombril'], ['l’ombrello', 'parapluie'],
      ['il portafoglio', 'portefeuille'], ['la busta', 'enveloppe'], ['il ponte', 'pont'], ['la collina', 'colline'], ['il fiume', 'rivière|fleuve'],
      ['la nuvola', 'nuage'], ['la pioggia', 'pluie'], ['il fulmine', 'éclair|foudre'],
    ],
  },
  de: {
    name: 'Allemand', flag: '🇩🇪', voice: 'de-DE',
    example: { word: 'der Eimer', fr: 'le seau', key: 'aimer', image: 'Deux amoureux s’embrassent, chacun un seau sur la tête.' },
    words: [
      ['die Schublade', 'tiroir'], ['das Kissen', 'coussin|oreiller'], ['der Eimer', 'seau'], ['der Besen', 'balai'], ['der Wasserhahn', 'robinet'],
      ['der Kühlschrank', 'réfrigérateur|frigo'], ['die Pfanne', 'poêle'], ['der Löffel', 'cuillère'], ['die Gabel', 'fourchette'],
      ['das Messer', 'couteau'], ['das Handtuch', 'serviette'], ['der Spiegel', 'miroir'], ['das Fenster', 'fenêtre'], ['das Dach', 'toit'],
      ['der Boden', 'sol'], ['der Schlüssel', 'clé'], ['die Tasche', 'poche|sac'], ['der Apfel', 'pomme'], ['die Erdbeere', 'fraise'],
      ['die Gurke', 'concombre'], ['der Knoblauch', 'ail'], ['die Zwiebel', 'oignon'], ['der Käse', 'fromage'], ['das Kaninchen', 'lapin'],
      ['das Eichhörnchen', 'écureuil'], ['die Eule', 'hibou|chouette'], ['der Schmetterling', 'papillon'], ['das Pferd', 'cheval'],
      ['das Schaf', 'mouton'], ['der Vogel', 'oiseau'], ['die Schildkröte', 'tortue'], ['das Knie', 'genou'], ['der Ellbogen', 'coude'],
      ['das Handgelenk', 'poignet'], ['die Schulter', 'épaule'], ['das Kinn', 'menton'], ['die Augenbraue', 'sourcil'], ['der Nabel', 'nombril'],
      ['der Regenschirm', 'parapluie'], ['die Geldbörse', 'portefeuille|porte-monnaie'], ['der Umschlag', 'enveloppe'], ['die Brücke', 'pont'],
      ['der Hügel', 'colline'], ['der Fluss', 'rivière|fleuve'], ['die Wolke', 'nuage'], ['der Regen', 'pluie'], ['der Blitz', 'éclair'],
    ],
  },
};
