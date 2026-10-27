// Message reçu : écouter, reformuler, puis retrouver les informations.
import { h, input, matchAnswer, textarea, screen } from '../core/ui.js';
import { makeMessage } from '../data/messages.js';
import { speak, stopSpeaking, canSpeak, startNoise, stopNoise, voicesFor } from '../core/speech.js';
import { levelInfo, startBatch, createItem, recordReview, award } from '../core/engine.js';
import { intro, recallBreak, resultScreen, askChecked } from './common.js';

export async function play(ctx) {
  const { stage } = ctx;
  const hard = !!ctx.hard;
  await intro(ctx, 'message');
  const n = ctx.size || levelInfo('oral').size;
  const msg = makeMessage(n, { long: hard });
  const rate = hard ? 1.2 : 0.95;
  const voiceIndex = Math.floor(Math.random() * Math.max(1, voicesFor('fr-FR').length));
  const spoken = canSpeak();

  await stage.ask((done) => {
    let plays = 0;
    const maxPlays = hard ? 1 : 2;
    const status = h('p', { class: 'muted center' }, spoken ? 'Touche pour écouter. Tu pourras le réécouter une fois.' : 'Pas de voix disponible : le message va s’afficher quelques secondes.');
    const next = h('button', { class: 'btn primary', disabled: true, onclick: () => { stopSpeaking(); stopNoise(); done(); } }, 'Suivant');
    const play = h('button', { class: 'play-btn', onclick: async () => {
      if (plays >= maxPlays) return;
      plays++;
      play.classList.add('playing');
      if (!spoken) {
        status.replaceChildren(h('div', { class: 'reading' }, msg.text));
        await stage.wait(2500 + msg.text.length * 45);
        status.textContent = 'Le message a disparu.';
      } else {
        if (hard) startNoise(0.04);
        await speak(msg.text, { rate, voiceIndex });
        stopNoise();
      }
      play.classList.remove('playing');
      next.disabled = false;
      if (plays >= maxPlays) { play.disabled = true; status.textContent = 'Message écouté.'; } else status.textContent = 'Tu peux le réécouter une fois.';
    } }, '▶︎');
    return h('div', { class: 'screen' }, h('div', { class: 'screen-icon' }, '📞'), h('h2', null, 'Un message pour toi'), h('p', { class: 'muted center' }, hard ? 'Mode difficile : débit rapide, bruit de fond, une seule écoute.' : `Il y a ${msg.infos.length} information${msg.infos.length > 1 ? 's' : ''} à retenir.`), play, status, h('div', { class: 'screen-actions' }, next));
  });

  const reformulation = await stage.ask((done) => {
    const ta = textarea({ placeholder: 'Donc… (comme si tu répondais à la personne)', rows: 5, 'data-autofocus': '' });
    return h('div', { class: 'screen' }, h('h2', null, 'Reformule'), h('p', { class: 'muted' }, 'Redis le message avec tes mots, à l’écrit ou avec le micro du clavier. C’est ce réflexe qui fait vraiment enregistrer l’information.'), ta,
      h('div', { class: 'screen-actions' }, h('button', { class: 'btn primary', onclick: () => done(ta.value.trim()) }, 'Suivant')));
  });

  await recallBreak(ctx, 'Retrouve les informations du message, sans le réécouter.');
  const batch = hard ? null : startBatch('oral', msg.infos.length);
  let ok = 0, pts = 0;
  const lines = [];
  for (let i = 0; i < msg.infos.length; i++) {
    const info = msg.infos[i];
    stage.setProgress(i / msg.infos.length);
    const { values: [ans], ok: good } = await askChecked(stage, {
      top: [h('div', { class: 'tag' }, msg.context), h('h2', null, info.q)],
      fields: [input({ placeholder: 'Ta réponse' })],
      check: ([v]) => (matchAnswer(v, info.a)
        ? { ok: true, title: `✓ ${info.a.split('|')[0]}` }
        : { ok: false, title: `✗ C’était : ${info.a.split('|')[0]}` }),
      next: i + 1 < msg.infos.length ? 'Question suivante' : 'Voir le résultat',
    });
    if (good) ok++;
    if (!hard) {
      const item = createItem({ type: 'card', src: 'oral', prompt: `${msg.context} : ${info.q.charAt(0).toLowerCase()}${info.q.slice(1)}`, answer: info.a, hint: msg.text, batch });
      pts += recordReview(item, good ? 3 : 1, { ctx: 'i', annex: ctx.annex }).pts;
    }
    lines.push(h('li', { class: good ? 'ok' : 'ko' }, h('span', { class: 'mark' }, good ? '✓' : '✗'), `${info.q} `, h('strong', null, info.a.split('|')[0]), !good && ans ? h('span', { class: 'muted' }, ` (« ${ans} »)`) : null));
  }
  stage.setProgress(null);
  if (hard) pts = award(ok, { annex: true });
  const score = ok / msg.infos.length;
  await resultScreen(stage, { score, pts, body: h('div', null, h('ul', { class: 'result-list' }, lines), h('details', { class: 'why' }, h('summary', null, 'Le message complet'), h('p', null, msg.text), reformulation && h('p', { class: 'muted' }, `Ta reformulation : ${reformulation}`))) });
  return { score };
}
