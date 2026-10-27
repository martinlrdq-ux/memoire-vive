# Kikory

Application web (PWA) d'entraînement de la mémoire, fondée sur la synthèse « Entraîner sa mémoire : ce que dit la science » :
rappel actif, répétition espacée (FSRS-5), stratégies mnémotechniques, mesure de la rétention à 7 jours.

- Aucune dépendance, aucun serveur : HTML, CSS et JavaScript natifs.
- Les données restent sur l'appareil (localStorage). Sauvegarde : Réglages → Exporter.
- Installation sur iPhone : ouvrir le site dans Safari → Partager → « Sur l'écran d'accueil ».

## Après une modification

```bash
python3 tools/build_sw.py   # met à jour la liste des fichiers hors ligne et la version
```

Tester en local : `node tools/serve.mjs . 8642` puis http://127.0.0.1:8642.

## Structure

- `js/core/` : stockage, FSRS, moteur (points, niveaux, série, parcours, ville, badges), interface, visages, voix
- `js/games/` : le Coffre et les 11 jeux, le bilan
- `js/data/` : mots, prénoms, textes, vocabulaire, palais, système majeur, scènes, messages
- `js/session.js` : déroulé de la mission du jour ; `js/app.js` : écrans
- `js/reminders.js` : les rappels envoyés en notification ; `js/core/notify.js` : abonnement push et envoi du programme

## Notifications (Supabase)

Les rappels arrivent en notification (Web Push, iOS 16.4+ avec l'app sur l'écran d'accueil). L'app envoie son programme
des 14 prochains jours à Supabase ; pg_cron appelle chaque minute la fonction qui envoie ce qui est échu.

1. SQL Editor : exécuter `tools/supabase-push.sql` (après `tools/supabase.sql`).
2. Edge Functions : déployer `supabase/functions/kikory-push/index.ts` sous le nom `kikory-push`, avec « Verify JWT » désactivé.
   La paire de clés VAPID est créée par la fonction à son premier appel et rangée en base : rien à configurer.

## Widget d'écran d'accueil (Scriptable)

Une PWA ne peut pas avoir de widget iOS : le widget passe par l'app gratuite Scriptable. À chaque synchronisation, l'app
joint à ses données un petit résumé (`data.widget` : série, mission du jour, échéances des révisions) ; le widget le lit
avec un code propre au compte (`tools/supabase-widget.sql`, à coller une fois dans le SQL Editor).

- Réglages → Widget : génère le code et le script à coller dans Scriptable (il télécharge `widget/kikory-widget.js` à
  chaque rafraîchissement, donc les mises à jour du widget arrivent sans rien recopier).
- Scènes du hibou : `python3 tools/make_widget_scenes.py` écrit `widget/scenes/*.png`. Si les images changent,
  augmenter `SCENES_VERSION` dans `widget/kikory-widget.js` pour vider le cache des téléphones.
