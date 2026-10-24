// Système majeur, version française : chaque chiffre est un son consonne,
// les voyelles (et h, w, y) sont libres. On lit les sons, pas l'orthographe.

export const MAJOR_SOUNDS = [
  ['0', 's, z', 'comme « scie »'],
  ['1', 't, d', 'un jambage'],
  ['2', 'n, gn', 'deux jambages'],
  ['3', 'm', 'trois jambages'],
  ['4', 'r', 'quatRe'],
  ['5', 'l', 'L = 50 en chiffres romains'],
  ['6', 'j, ch, g doux', 'le 6 ressemble à un G'],
  ['7', 'k, q, c dur, g dur', 'deux 7 tête-bêche forment un K'],
  ['8', 'f, v', 'le f manuscrit a deux boucles'],
  ['9', 'p, b', 'le 9 retourné est un P'],
];

export const MAJOR_1 = ['scie', 'thé', 'nez', 'mât', 'roi', 'lit', 'chou', 'quai', 'fée', 'pie'];

export const MAJOR_2 = `sauce soda cygne sumo Zorro saule sushi sac sofa soupe
tasse tutu dune dame tour toile douche taco tofu tipi
noce natte nounou nem nord Nil niche nuque navet nappe
mousse mite mine mamie mer mule mouche moka mafia Moby
rose radeau reine rame rire ruelle ruche roc rêve robe
lasso loto lune lime lyre Lola louche lac lave loupe
chaise judo chaîne chameau char châle chouchou chèque chef jupe
gaz cadeau canne gomme car colle cajou coq cave cape
fusée fête faune fumée four fil vache phoque fève VIP
bus botte bonnet pomme poire pelle biche bouc bœuf bébé`.split(/\s+/);

// Découpe une suite de chiffres en mots-images suggérés (paires, puis chiffre isolé).
export function majorWords(digits) {
  const out = [];
  for (let i = 0; i < digits.length; i += 2) {
    const chunk = digits.slice(i, i + 2);
    out.push({ chunk, word: chunk.length === 2 ? MAJOR_2[Number(chunk)] : MAJOR_1[Number(chunk)] });
  }
  return out;
}
