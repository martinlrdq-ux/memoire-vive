# Mémoire vive

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
