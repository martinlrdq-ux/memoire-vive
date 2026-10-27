// Qui est-ce ? : la stratégie nom-visage en trois étapes (trait marquant, prénom en image, lien).
import { h, input, onEnter, matchAnswer, toast } from '../core/ui.js';
import { S, save, pick, shuffle } from '../core/store.js';
import { NAMES_F, NAMES_M, JOBS } from '../data/people.js';
import { faceSVG, faceTraits, faceHighlights, faceSignature, FACE_V } from '../core/faces.js';
import { levelInfo, startBatch, createItem, recordReview } from '../core/engine.js';
import { intro, recallBreak, resultScreen, askChecked } from './common.js';

// Autant de femmes que d'hommes, et pas deux visages avec la même coiffure dans une série.
export function makePeople(n, avoid = []) {
  const used = new Set([...(S.usedPools.names || []), ...avoid]);
  const looks = new Set();
  const first = Math.random() < 0.5;
  const out = [];
  while (out.length < n) {
    const female = out.length % 2 === 0 ? first : !first;
    const name = pick(female ? NAMES_F : NAMES_M);
    if (used.has(name) && used.size < NAMES_F.length + NAMES_M.length - 10) continue;
    used.add(name);
    let seed, tries = 0;
    do seed = Math.floor(Math.random() * 1e9); while (looks.has(faceSignature(seed, female)) && ++tries < 40);
    looks.add(faceSignature(seed, female));
    out.push({ name, female, job: pick(JOBS)[female ? 1 : 0], seed });
  }
  S.usedPools.names = [...(S.usedPools.names || []), ...out.map((p) => p.name)].slice(-120);
  save();
  return shuffle(out);
}

const EXAMPLE = { trait: 'ses grosses lunettes rondes', image: 'Paul → une poule', link: 'une poule picore ses lunettes rondes' };

export async function play(ctx) {
  const { stage } = ctx;
  await intro(ctx, 'quiestce');
  const n = ctx.size || levelInfo('names').size;
  const people = makePeople(n);
  const firstTime = !S.records.namesPlayed;

  for (let i = 0; i < n; i++) {
    const p = people[i];
    stage.setProgress(i / n);
    p.enc = await stage.ask((done) => {
      const traits = faceHighlights(faceTraits(p.seed, p.female));
      const fTrait = input({ placeholder: firstTime && i === 0 ? `ex. : ${EXAMPLE.trait}` : 'Ce qui frappe dans ce visage' });
      const fImage = input({ placeholder: firstTime && i === 0 ? `ex. : ${EXAMPLE.image}` : `${p.name} → une image` });
      const fLink = input({ placeholder: firstTime && i === 0 ? `ex. : ${EXAMPLE.link}` : 'Une scène qui relie les deux' });
      onEnter(fTrait, () => fImage.focus());
      onEnter(fImage, () => fLink.focus());
      const go = () => {
        if (!fImage.value.trim() && !fLink.value.trim()) toast('Même une image rapide aide beaucoup.');
        done({ trait: fTrait.value.trim(), image: fImage.value.trim(), link: fLink.value.trim() });
      };
      onEnter(fLink, go);
      return h('div', { class: 'screen' },
        h('div', { class: 'muted center' }, `${i + 1} / ${n}`),
        h('div', { class: 'face', html: faceSVG(p.seed, p.female, 150) }),
        h('p', { class: 'intro-line' }, `«\u00a0Bonjour, je m’appelle `, h('strong', null, p.name), `, je suis ${p.job}.\u00a0»`),
        h('label', { class: 'field' }, h('span', null, '1. Trait marquant'), fTrait),
        h('div', { class: 'chips small' }, traits.map((t) => h('button', { class: 'chip', onclick: () => { fTrait.value = t; fImage.focus(); } }, t))),
        h('label', { class: 'field' }, h('span', null, '2. Le prénom en image'), fImage),
        h('label', { class: 'field' }, h('span', null, '3. Le lien entre les deux'), fLink),
        h('div', { class: 'screen-actions' }, h('button', { class: 'btn primary', onclick: go }, i + 1 < n ? 'Visage suivant' : 'J’ai fini')),
      );
    });
  }
  S.records.namesPlayed = true;
  stage.setProgress(null);

  await recallBreak(ctx, 'Retrouve le prénom (et le métier) de chaque personne.');
  const order = shuffle(people);
  let ok = 0, pts = 0;
  const lines = [];
  const batch = startBatch('names', n);
  for (let i = 0; i < order.length; i++) {
    const p = order[i];
    stage.setProgress(i / n);
    const hint = [p.enc.trait, p.enc.image, p.enc.link].filter(Boolean).join(' · ');
    const r = await askChecked(stage, {
      top: h('div', { class: 'face', html: faceSVG(p.seed, p.female, 150) }),
      fields: [input({ placeholder: 'Prénom', autocapitalize: 'words' }), input({ placeholder: 'Métier (bonus)' })],
      check: ([name, job]) => {
        const good = matchAnswer(name, p.name), jobOk = matchAnswer(job, p.job);
        return {
          ok: good, jobOk,
          title: good ? `✓ C’est bien ${p.name}` : `✗ C’était ${p.name}`,
          detail: h('div', null,
            h('div', { class: 'muted' }, `${p.job}${jobOk ? ' ✓' : ''}`),
            !good && name.trim() ? h('div', { class: 'muted' }, `Tu as écrit « ${name.trim()} »`) : null,
            !good && hint ? h('div', { class: 'hint' }, `Ton image : ${hint}`) : null),
        };
      },
      next: i + 1 < order.length ? 'Visage suivant' : 'Voir le résultat',
    });
    const good = r.ok, jobOk = r.jobOk;
    if (good) ok++;
    const item = createItem({ type: 'face', src: 'names', prompt: 'Qui est-ce ?', answer: p.name, hint, extra: { seed: p.seed, female: p.female, job: p.job, v: FACE_V }, batch });
    pts += recordReview(item, good ? 3 : 1, { ctx: 'i', annex: ctx.annex }).pts;
    lines.push(h('li', { class: good ? 'ok' : 'ko' }, h('span', { class: 'mark' }, good ? '✓' : '✗'), h('strong', null, p.name), h('span', { class: 'muted' }, ` · ${p.job}${jobOk ? ' ✓' : ''}`)));
  }
  stage.setProgress(null);
  const score = ok / n;
  await resultScreen(stage, { score, pts, body: h('div', null, h('ul', { class: 'result-list' }, lines), h('p', { class: 'muted' }, 'Ces visages reviendront demain dans le Coffre.')) });
  return { score };
}
