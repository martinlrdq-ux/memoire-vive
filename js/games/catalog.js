// Fiches des jeux : à quoi ils servent, pourquoi ils marchent, pourquoi ils paraissent difficiles.

export const CATALOG = {
  coffre: {
    name: 'Le Coffre', icon: '🗝️', tech: null, kind: 'core', memory: 'Toutes',
    desc: 'Tes révisions du jour, en rappel libre, qui reviennent juste avant l’oubli.',
    why: 'Se tester bat relire : chaque fois que tu retrouves une information, elle devient plus solide et plus facile à retrouver. Le Coffre espace les révisions avec l’algorithme FSRS, qui ramène chaque élément juste avant que tu ne l’oublies.',
    hard: 'Chercher une réponse demande un effort, et c’est cet effort qui ancre le souvenir. Un trou de mémoire n’est pas un échec : l’élément revient simplement plus tôt.',
    steps: ['Lis la question.', 'Tape la réponse de mémoire, ou dicte-la avec le micro du clavier.', 'Compare, puis dis honnêtement si c’était facile ou difficile.'],
  },
  palais: {
    name: 'Le Palais', icon: '🏛️', tech: 'palace', kind: 'main', memory: 'Épisodique, listes',
    desc: 'Range une liste sur les meubles d’un endroit que tu connais par cœur, puis refais le tour dans ta tête.',
    why: 'Ta mémoire retient mal une liste de mots, mais très bien les images et les lieux. Le palais transforme chaque mot en image posée sur un meuble : pour retrouver la liste, tu refais le tour. C’est la méthode des champions de mémoire : en 40 jours, des débutants sont passés de 26 à 62 mots retenus, et en gardaient encore une bonne partie quatre mois plus tard.',
    hard: 'Au début, inventer une image pour chaque mot paraît lent et un peu bête. Ça devient vite un réflexe, et ce sont justement les images énormes, absurdes et qui bougent qui tiennent le mieux.',
    steps: ['Choisis ton palais : ton logement (tu le construis en 2 minutes) ou un décor fourni.', 'Pour chaque mot, imagine une scène énorme, qui bouge, un peu folle, sur l’endroit indiqué. L’encadré 💡 te donne une idée. Puis touche l’endroit.', 'Un mot abstrait ? Change-le en objet : « baromètre » devient un bar.', 'Refais le tour dans ta tête et retrouve le mot posé sur chaque endroit.'],
  },
  quiestce: {
    name: 'Qui est-ce ?', icon: '🧑', tech: 'names', kind: 'main', memory: 'Associative',
    desc: 'Retiens des prénoms et des métiers avec une stratégie en trois étapes.',
    why: 'Une stratégie en trois étapes (un trait du visage, le prénom transformé en image, un lien entre les deux) fait mieux retenir les prénoms que de simples répétitions, avec un effet encore présent un mois plus tard.',
    hard: 'Les prénoms sont abstraits : ils ne veulent rien dire en soi. C’est justement pour ça qu’il faut les transformer en image. Une image un peu ridicule marche très bien.',
    steps: ['Repère un trait marquant du visage.', 'Transforme le prénom en image (Paul → une poule, Léa → un lion).', 'Relie les deux : la poule picore ses grosses lunettes.'],
  },
  mots: {
    name: "Mots d'ailleurs", icon: '🌍', tech: 'vocab', kind: 'main', memory: 'Sémantique',
    desc: 'Du vocabulaire étranger avec la méthode du mot-clé.',
    why: 'La méthode du mot-clé, combinée à des rappels, fait mieux retenir le vocabulaire que la relecture, même quatre semaines plus tard. Un mot-clé que tu inventes toi-même marche aussi bien qu’un mot-clé fourni, et tu le retiens mieux.',
    hard: 'Trouver un mot-clé sonore demande de jouer avec les sons, ce qui semble enfantin. Mais c’est l’image mentale qui fait tout le travail.',
    steps: ['Écoute et lis le mot étranger.', 'Trouve un mot français qui sonne pareil (le mot-clé).', 'Imagine une scène qui relie le mot-clé au sens.'],
  },
  code: {
    name: 'Code secret', icon: '🔢', tech: 'digits', kind: 'main', memory: 'Travail, chiffres',
    desc: 'Numéros, codes et dates : en blocs, puis avec le système majeur.',
    why: 'La mémoire de travail ne garde qu’environ quatre éléments à la fois. Regrouper les chiffres en blocs qui ont du sens contourne cette limite. Le système majeur va plus loin : il change les chiffres en sons, puis en mots faciles à imaginer.',
    hard: 'Le système majeur demande d’apprendre une table de dix sons. Les premières fois, c’est laborieux. Ensuite, des suites de 20 ou 40 chiffres deviennent accessibles.',
    steps: ['Découpe le nombre en blocs.', 'Donne un sens à chaque bloc (une date, un âge, un mot-image).', 'Restitue le nombre sans le regarder.'],
  },
  croquis: {
    name: 'Croquis', icon: '✏️', tech: 'sketch', kind: 'main', memory: 'Épisodique',
    desc: 'Dessine chaque mot du doigt en quelques secondes, puis rappelle-les.',
    why: 'Dessiner ce qu’on veut retenir bat le fait de l’écrire, dans sept expériences, et l’effet est encore plus net chez les seniors. Le dessin oblige à traiter le sens, l’image et le geste en même temps.',
    hard: 'Pas besoin de savoir dessiner : un gribouillis rapide suffit. Ce qui compte, c’est de chercher comment représenter le mot.',
    steps: ['Lis le mot.', 'Dessine-le du doigt, vite, sans viser la beauté.', 'À la fin, retrouve tous les mots.'],
  },
  filrouge: {
    name: 'Fil rouge', icon: '🧵', tech: 'story', kind: 'main', memory: 'Épisodique',
    desc: 'Relie une liste d’objets en une histoire que tu inventes.',
    why: 'Une histoire sert d’échafaudage : chaque objet appelle le suivant. Générer soi-même les liens renforce l’encodage, et raconter à voix haute aide encore.',
    hard: 'Inventer une histoire sur commande demande un effort. Les histoires absurdes, exagérées, pleines de mouvement sont plus faciles à retenir que les histoires logiques.',
    steps: ['Lis la liste des objets.', 'Invente une histoire qui les relie dans l’ordre, écrite ou dictée.', 'Restitue les objets dans l’ordre.'],
  },
  ouestil: {
    name: 'Où est-il ?', icon: '📍', tech: null, kind: 'annex', memory: 'Visuo-spatiale',
    desc: 'Mémorise la place des objets dans une scène, puis replace-les.',
    why: 'La mémoire des lieux et des objets est celle qu’on sollicite pour retrouver ses clés ou se repérer. Changer de scène d’une manche à l’autre (l’entrelacement) aide pour ce type de mémoire.',
    hard: 'La difficulté s’adapte pour que tu réussisses environ trois manches sur quatre : assez dur pour progresser, assez facile pour continuer.',
    steps: ['Observe la scène.', 'Elle s’efface.', 'Replace chaque objet à sa place.'],
  },
  lecture: {
    name: 'Lecture active', icon: '📖', tech: 'reading', kind: 'main', memory: 'Sémantique',
    desc: 'Lis un texte court, puis restitue l’essentiel sans le relire.',
    why: 'Restituer librement ce qu’on a lu est l’une des façons les plus efficaces de le retenir, bien plus que relire. Les questions reviennent trois jours plus tard pour ancrer les idées clés.',
    hard: 'Sans relire, on a l’impression d’avoir tout oublié. C’est normal : l’effort de rappel est ce qui fera tenir les idées dans une semaine.',
    steps: ['Lis le texte une seule fois, attentivement.', 'Écris ou dicte tout ce dont tu te souviens.', 'Coche les idées clés que tu as retrouvées.'],
  },
  echo: {
    name: 'Écho', icon: '〰️', tech: null, kind: 'annex', memory: 'Mémoire de travail',
    desc: 'Deux minutes de concentration : n-back et empan de chiffres.',
    why: 'C’est un échauffement pour se mettre en condition. Soyons honnêtes : ce type d’exercice améliore surtout… cet exercice. Il ne rend pas plus intelligent, mais il aide à se concentrer avant la suite.',
    hard: 'La difficulté monte dès que tu réussis, pour ne jamais rester trop facile.',
    steps: ['n-back : touche le bouton quand le carré s’allume au même endroit qu’il y a n coups.', 'Empan : retiens une suite de chiffres et retape-la.'],
  },
  message: {
    name: 'Message reçu', icon: '📞', tech: 'oral', kind: 'main', memory: 'Associative, oral',
    desc: 'Écoute un message, reformule-le, puis retrouve les informations.',
    why: 'Beaucoup d’oublis viennent d’une information jamais vraiment enregistrée. Reformuler (« donc jeudi 15 h, c’est ça ? ») oblige à faire attention, à produire et à donner du sens au message.',
    hard: 'À l’oral, l’information passe une seule fois. C’est exactement la situation de la vie réelle que ce jeu entraîne.',
    steps: ['Écoute le message.', 'Reformule-le avec tes mots, à l’écrit ou en dictée.', 'Réponds aux questions sans réécouter.'],
  },
};

export const ANNEXES = [
  { id: 'echo', name: 'Écho', icon: '〰️', desc: 'n-back et empans, pour le plaisir ou en échauffement.', chapter: 0 },
  { id: 'ouestil', name: 'Où est-il ?', icon: '📍', desc: 'La place des objets dans une scène.', chapter: 1 },
  { id: 'libre', name: 'Révision libre du Coffre', icon: '🗂️', desc: 'Revoir un thème précis avant un rendez-vous.', chapter: 0 },
  { id: 'weekend', name: 'Défi du week-end', icon: '🗓️', desc: 'Une liste plus longue, à restituer lundi.', chapter: 1, weekend: true },
  { id: 'chrono', name: 'Défi chrono du palais', icon: '⏱️', desc: 'Remplis ton palais le plus vite possible.', chapter: 5 },
  { id: 'message-dur', name: 'Message reçu, mode difficile', icon: '📻', desc: 'Messages plus longs, bruit de fond, débit rapide.', chapter: 6 },
];
