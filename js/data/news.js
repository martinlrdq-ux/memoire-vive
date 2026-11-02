// Nouveautés, montrées une fois à la première ouverture qui suit une mise à jour (la plus récente en tête).
// À chaque mise à jour visible, ajouter une entrée en tête avec un nouvel id. Les nouveaux venus ne la voient pas.
// items : [icône, titre, texte] ; tab et cta : l'onglet à ouvrir et le libellé du bouton (facultatifs).
export const NEWS = [
  {
    id: '2026-11-02-notation',
    title: 'Une note plus juste',
    items: [
      ['🎯', 'Un oubli ne coûte plus toute la suite', 'Si tu sautes un mot, les suivants comptent quand même : les bons mots, dans le bon ordre, juste décalés d’une case.'],
      ['🔢', 'Pareil pour les chiffres oubliés', 'Oublier les 2 premiers chiffres d’un code de 6, ça fait 67 %, plus 0 %. Ceux qui manquent s’affichent en rouge. Des chiffres mélangés, eux, restent faux.'],
      ['↕️', 'Le désordre compte pour moitié', 'Un mot retrouvé mais hors de l’ordre rapporte la moitié. Quand les lieux d’un palais sont demandés dans le désordre, seul le bon lieu compte.'],
    ],
  },
  {
    id: '2026-10-31-idees-savoir',
    title: 'Le hibou te souffle des idées',
    items: [
      ['🦉', 'Un moyen mnémo pour chaque fiche', 'Les 186 fiches du Savoir du jour ont maintenant leur idée : une rime, un jeu de mots, la forme des chiffres… Touche « Je la garde », ou invente la tienne.'],
      ['🔐', 'Il revient quand ça coince', 'Si une fiche t’échappe, dans la séance ou plus tard dans le Coffre, l’idée du hibou réapparaît avec la réponse.'],
    ],
  },
  {
    id: '2026-10-31-grades',
    title: 'Ton hibou prend du galon',
    items: [
      ['⭐', '12 grades à gagner', 'De l’Oisillon à la Légende. Chaque grade habille ton hibou un peu plus, avec une petite fête à la clé.'],
      ['🦉', 'Ton hibou t’attend dans Progrès', 'Il te fait signe quand tu arrives. Touche-le pour un deuxième coucou, et touche un insigne pour découvrir un grade.'],
      ['🎨', 'Les couleurs changent avec toi', 'Chaque palier donne sa couleur à l’app. Tu préfères le bleu ? Réglages, Couleurs de l’app.'],
    ],
    tab: 'progres',
    cta: 'Voir mon hibou',
  },
];
