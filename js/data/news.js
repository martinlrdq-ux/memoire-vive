// Nouveautés, montrées une fois à la première ouverture qui suit une mise à jour (la plus récente en tête).
// À chaque mise à jour visible, ajouter une entrée en tête avec un nouvel id. Les nouveaux venus ne la voient pas.
// items : [icône, titre, texte] ; tab et cta : l'onglet à ouvrir et le libellé du bouton (facultatifs).
export const NEWS = [
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
