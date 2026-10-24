// Noms concrets et faciles à imaginer, pour les jeux.
const GAME = `pomme guitare parapluie éléphant bougie ciseaux chapeau tambour girafe citron échelle valise horloge ballon
fourchette crocodile trompette lampe cerise pingouin marteau couronne fusée tortue ananas violon chaussette dauphin bouteille
papillon cactus enclume perroquet brosse cerf-volant lunettes baleine croissant aimant toboggan clé sapin hibou sirène moustache
vélo banane piano escargot savon trottinette igloo poussette éventail dinosaure raquette pastèque boussole chameau coquillage
tournevis ours crayon fromage kangourou sablier cloche hérisson gâteau robot panier moulin chaussure lapin épée flamant tente
carotte phare grenouille accordéon oreiller zèbre tasse bateau champignon loupe cheval ampoule tigre saucisse arrosoir fantôme
aspirateur cravate citrouille abeille coussin harpe renard brouette miroir pieuvre guirlande tracteur mouton glace hamac serpent
casserole xylophone bonbon chevalier singe ventilateur cadenas autruche crêpe parachute homard ancre panda gant scooter cygne
tomate pinceau lion radis chaise vache canapé sous-marin cochon bague montgolfière souris flûte pirate ruche chocolat castor
mouette balai raisin koala bouée poupée cheminée coq tirelire avion chaton seau nuage tonneau écureuil pelle volcan sandale
dragon morse téléphone hache chenille trésor fraise plume loup peigne wagon rhinocéros chaudron pneu aigle haltère kiwi moto luge
lama cerf boomerang hippopotame cafetière bouclier ordinateur médaille toupie mammouth cornichon sifflet tabouret flocon
grille-pain ballerine paon tuba bretzel pyramide cymbale girouette lanterne jumelles tulipe tournesol marionnette catapulte
hélicoptère totem sardine perruque fourmi baguette épouvantail crabe aquarium puzzle mouchoir licorne trombone cartable
sombrero yaourt navet béret brioche tapir fléchette ukulélé luciole chariot tipi`;

// Mots réservés aux bilans : jamais utilisés dans les jeux, pour mesurer sur du contenu neuf.
const BILAN = `table fenêtre jardin rivière montagne cuisine voiture livre porte forêt église plage chemise bureau étoile journal
couteau village ruisseau bouton armoire tableau marché prairie colline rideau tapis pont fontaine lettre ceinture verre assiette
cahier vallée cabane grenier tiroir jupe manteau écharpe bijou collier marmite bassin sentier falaise rocher grotte désert île
océan lagon port gare quai trottoir carrefour mairie école usine château tour muraille jardinet verger vigne champ grange étable
ferme meule charrette écurie forge atelier boutique comptoir vitrine caisse balance farine sucre beurre miel confiture
soupe salade omelette tarte biscuit galette compote limonade bouillon sirop épice poivre moutarde vinaigre huile cannelle vanille
orage tempête neige brouillard arc-en-ciel éclair tonnerre grêle rosée givre aurore crépuscule soleil lune comète planète
sommet glacier torrent cascade marais étang dune récif pommier chêne bouleau saule roseau fougère lierre mousse ortie pâquerette
muguet lilas jonquille violette coquelicot bleuet lavande romarin thym persil basilic menthe sauge laurier olive amande noisette
châtaigne prune pêche abricot figue melon poire mûre groseille myrtille framboise cassis datte mangue papaye goyave grenade
lit commode étagère buffet fauteuil banc berceau coffre malle corbeille vase cadre
pendule réveil radio tambourin orgue violoncelle clairon cornemuse banjo mandoline triangle maracas
écrou boulon clou vis rabot scie pince lime truelle niveau équerre compas règle gomme agrafe classeur enveloppe timbre carnet`;

const clean = (s) => [...new Set(s.split(/\s+/).filter(Boolean))];

export const GAME_WORDS = clean(GAME);
export const BILAN_WORDS = clean(BILAN).filter((w) => !GAME_WORDS.includes(w));
