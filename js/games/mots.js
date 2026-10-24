// Mots d'ailleurs : la méthode du mot-clé, avec un mot-clé inventé par l'utilisateur.
import { h, input, onEnter, matchAnswer, toast } from '../core/ui.js';
import { S, save, shuffle } from '../core/store.js';
import { LANGUAGES } from '../data/vocab.js';
import { speak } from '../core/speech.js';
import { levelInfo, startBatch, createItem, recordReview } from '../core/engine.js';
import { intro, recallBreak, resultScreen } from './common.js';

function pickWords(lang, n) {
  const L = LANGUAGES[lang];
  let used = S.usedPools.vocab[lang] || [];
  let free = L.words.map((_, i) => i).filter((i) => !used.includes(i));
  if (free.length < n) { used = []; free = L.words.map((_, i) => i); }
  const chosen = shuffle(free).slice(0, n);
  S.usedPools.vocab[lang] = [...used, ...chosen];
  save();
  return chosen.map((i) => L.words[i].slice());
}

export async function play(ctx) {
  const { stage } = ctx;
  await intro(ctx, 'mots');
  const lang = S.profile.language in LANGUAGES ? S.profile.language : 'en';
  const L = LANGUAGES[lang];
  const n = ctx.size || levelInfo('vocab').size;
  const words = pickWords(lang, n);
  const showExample = !S.records.vocabPlayed;

  for (let i = 0; i < n; i++) {
    const [w, fr] = words[i];
    stage.setProgress(i / n);
    words[i].enc = await stage.ask((done) => {
      const fKey = input({ placeholder: 'Un mot français qui sonne pareil' });
      const fImg = input({ placeholder: 'La scène qui relie ce mot-clé au sens' });
      onEnter(fKey, () => fImg.focus());
      const go = () => {
        if (!fKey.value.trim()) toast('Un mot-clé, même approximatif, aide beaucoup.');
        done({ key: fKey.value.trim(), img: fImg.value.trim() });
      };
      onEnter(fImg, go);
      setTimeout(() => speak(w, { lang: L.voice, rate: 0.85 }), 250);
      return h('div', { class: 'screen' },
        h('div', { class: 'muted center' }, `${L.flag} ${i + 1} / ${n}`),
        h('div', { class: 'prompt-row' }, h('div', { class: 'big-word' }, w), h('button', { class: 'icon-btn speak', onclick: () => speak(w, { lang: L.voice, rate: 0.85 }) }, '🔊')),
        h('div', { class: 'translation' }, '= ', fr.split('|')[0]),
        showExample && i === 0 && h('div', { class: 'example' }, h('strong', null, 'Exemple : '), `${L.example.word} (${L.example.fr}) → mot-clé « ${L.example.key} » → ${L.example.image}`),
        h('label', { class: 'field' }, h('span', null, 'Mot-clé sonore'), fKey),
        h('label', { class: 'field' }, h('span', null, 'Image'), fImg),
        h('div', { class: 'screen-actions' }, h('button', { class: 'btn primary', onclick: go }, i + 1 < n ? 'Mot suivant' : 'J’ai fini')));
    });
  }
  S.records.vocabPlayed = true;
  save();
  stage.setProgress(null);

  await recallBreak(ctx, 'Pour chaque mot étranger, retrouve le sens en français.');
  const batch = startBatch('vocab', n, { lang });
  let ok = 0, pts = 0;
  const lines = [];
  const order = shuffle(words);
  for (let i = 0; i < order.length; i++) {
    const wd = order[i];
    const [w, fr] = wd;
    stage.setProgress(i / n);
    const ans = await stage.ask((done) => {
      const f = input({ placeholder: 'En français', 'data-autofocus': '' });
      onEnter(f, () => done(f.value));
      return h('div', { class: 'screen' },
        h('div', { class: 'prompt-row' }, h('div', { class: 'big-word' }, w), h('button', { class: 'icon-btn speak', onclick: () => speak(w, { lang: L.voice, rate: 0.85 }) }, '🔊')),
        f, h('div', { class: 'screen-actions' }, h('button', { class: 'btn primary', onclick: () => done(f.value) }, 'Valider')));
    });
    const good = matchAnswer(ans, fr);
    if (good) ok++;
    const hint = [wd.enc.key && `mot-clé « ${wd.enc.key} »`, wd.enc.img].filter(Boolean).join(' · ');
    const item = createItem({ type: 'card', src: 'vocab', prompt: w, answer: fr, hint, extra: { lang, voice: L.voice }, batch });
    pts += recordReview(item, good ? 3 : 1, { ctx: 'i', annex: ctx.annex }).pts;
    lines.push(h('li', { class: good ? 'ok' : 'ko' }, h('span', { class: 'mark' }, good ? '✓' : '✗'), h('strong', null, w), ` = ${fr.split('|')[0]}`, !good && ans ? h('span', { class: 'muted' }, ` (tu as écrit « ${ans} »)`) : null));
  }
  stage.setProgress(null);
  const score = ok / n;
  await resultScreen(stage, { score, pts, body: h('ul', { class: 'result-list' }, lines) });
  return { score };
}
