// Le Coffre : révision en rappel libre, correction immédiate, note honnête.
import { h, screen, input, onEnter, matchAnswer, digitScore, listScore, pointsPop, esc } from '../core/ui.js';
import { dayKey, dayDiff } from '../core/store.js';
import { recordReview } from '../core/engine.js';
import { faceSVG } from '../core/faces.js';
import { speak } from '../core/speech.js';
import { gradeFor, listResultView } from './common.js';

const SRC_LABEL = { mavie: 'Ma vie', story: 'Fil rouge', sketch: 'Croquis', names: 'Qui est-ce ?', digits: 'Code secret', palace: 'Palais', oral: 'Message reçu', reading: 'Lecture active', vocab: "Mots d'ailleurs", weekend: 'Défi du week-end' };

function ageLabel(item) {
  const d = dayDiff(dayKey(item.created), dayKey());
  return d === 0 ? 'appris aujourd’hui' : d === 1 ? 'appris hier' : `appris il y a ${d} jours`;
}

function header(item) {
  return h('div', { class: 'review-meta' }, h('span', { class: 'tag' }, SRC_LABEL[item.src] || 'Coffre'), h('span', { class: 'muted' }, ageLabel(item)));
}

function gradeButtons(done, { okDefault = true } = {}) {
  return h('div', { class: 'grade-row' },
    h('button', { class: 'btn grade hard', onclick: () => done(2) }, 'Difficile'),
    h('button', { class: `btn grade good ${okDefault ? 'primary' : ''}`, onclick: () => done(3) }, 'Bien'),
    h('button', { class: 'btn grade easy', onclick: () => done(4) }, 'Facile'));
}

function hintBlock(item) {
  if (!item.hint) return null;
  return h('div', { class: 'hint' }, h('span', { class: 'muted' }, 'Ton astuce : '), item.hint);
}

function speakBtn(item) {
  if (!item.extra?.voice) return null;
  return h('button', { class: 'icon-btn speak', onclick: () => speak(item.prompt, { lang: item.extra.voice, rate: 0.9 }) }, '🔊');
}

// Une question simple : taper la réponse, ou y répondre de tête.
function reviewCard(stage, item) {
  return stage.ask((done) => {
    const wrap = h('div', { class: 'screen review' });
    const f = input({ placeholder: 'Ta réponse', 'data-autofocus': '' });
    const feedback = h('div');
    let locked = false;
    const validate = (giveUp = false) => {
      if (locked) return;
      locked = true;
      const ok = !giveUp && matchAnswer(f.value, item.answer);
      f.disabled = true;
      actions.remove();
      const expected = item.answer.split('|')[0];
      feedback.replaceChildren(
        h('div', { class: `feedback ${ok ? 'ok' : 'ko'}` }, h('div', { class: 'fb-title' }, ok ? '✓ Bien retrouvé' : giveUp ? 'La réponse était :' : '✗ Pas tout à fait'), h('div', { class: 'fb-answer' }, expected)),
        hintBlock(item),
        ok ? gradeButtons((g) => done({ g, typed: true }))
          : h('div', { class: 'stack' },
            h('button', { class: 'btn primary', onclick: () => done({ g: 1, typed: true }) }, 'Compris, suivant'),
            !giveUp && h('button', { class: 'btn ghost small', onclick: () => feedback.replaceChildren(h('p', { class: 'muted' }, 'D’accord, c’était juste. Comment c’était ?'), gradeButtons((g) => done({ g, typed: true }), { okDefault: false })) }, 'En fait, j’avais bon')),
      );
    };
    const mental = () => {
      if (locked) return;
      locked = true;
      actions.remove();
      f.remove();
      feedback.replaceChildren(
        h('div', { class: 'feedback neutral' }, h('div', { class: 'fb-title' }, 'Réponse'), h('div', { class: 'fb-answer' }, item.answer.split('|')[0])),
        hintBlock(item),
        h('p', { class: 'muted center' }, 'L’avais-tu retrouvée de tête ?'),
        h('div', { class: 'grade-row' }, h('button', { class: 'btn grade again', onclick: () => done({ g: 1, typed: false }) }, 'Non'), h('button', { class: 'btn grade hard', onclick: () => done({ g: 2, typed: false }) }, 'Difficile'), h('button', { class: 'btn grade good', onclick: () => done({ g: 3, typed: false }) }, 'Bien'), h('button', { class: 'btn grade easy', onclick: () => done({ g: 4, typed: false }) }, 'Facile')));
    };
    onEnter(f, () => (f.value.trim() ? validate() : null));
    const actions = h('div', { class: 'stack' },
      h('button', { class: 'btn primary', onclick: () => validate() }, 'Valider'),
      h('div', { class: 'row center' },
        h('button', { class: 'btn ghost small', onclick: () => validate(true) }, 'Je ne sais pas'),
        h('button', { class: 'btn ghost small', onclick: mental }, 'Répondre de tête')));
    wrap.append(header(item), h('div', { class: 'prompt-row' }, h('div', { class: 'prompt' }, item.prompt), speakBtn(item)), f, actions, feedback);
    return wrap;
  });
}

function reviewFace(stage, item) {
  const { seed, female, job, v = 1 } = item.extra;
  return stage.ask((done) => {
    const fName = input({ placeholder: 'Prénom', 'data-autofocus': '', autocapitalize: 'words' });
    const fJob = input({ placeholder: 'Métier (bonus)' });
    onEnter(fName, () => fJob.focus());
    const feedback = h('div');
    let locked = false;
    const validate = () => {
      if (locked) return;
      locked = true;
      const ok = matchAnswer(fName.value, item.answer);
      const jobOk = matchAnswer(fJob.value, job);
      btn.remove();
      feedback.replaceChildren(
        h('div', { class: `feedback ${ok ? 'ok' : 'ko'}` }, h('div', { class: 'fb-title' }, ok ? '✓ C’est bien ' + item.answer : '✗ C’était ' + item.answer), h('div', { class: 'muted' }, `${job}${jobOk ? ' ✓' : ''}`)),
        hintBlock(item),
        ok ? gradeButtons((g) => done({ g, typed: true })) : h('button', { class: 'btn primary', onclick: () => done({ g: 1, typed: true }) }, 'Compris, suivant'));
    };
    onEnter(fJob, validate);
    const btn = h('button', { class: 'btn primary', onclick: validate }, 'Valider');
    return h('div', { class: 'screen review' }, header(item), h('div', { class: 'face', html: faceSVG(seed, female, 150, v) }), h('p', { class: 'center' }, 'Qui est-ce ?'), fName, fJob, btn, feedback);
  });
}

function reviewCode(stage, item) {
  return stage.ask((done) => {
    const f = input({ placeholder: 'Les chiffres', inputmode: 'numeric', 'data-autofocus': '' });
    const feedback = h('div');
    let locked = false;
    const validate = () => {
      if (locked) return;
      locked = true;
      const score = digitScore(f.value, item.answer);
      btn.remove();
      const ok = score === 1;
      feedback.replaceChildren(
        h('div', { class: `feedback ${ok ? 'ok' : score >= 0.8 ? 'mid' : 'ko'}` }, h('div', { class: 'fb-title' }, ok ? '✓ Parfait' : `${Math.round(score * 100)} % des chiffres à la bonne place`), h('div', { class: 'fb-answer mono' }, item.answer.replace(/(\d{2})(?=\d)/g, '$1 '))),
        hintBlock(item),
        ok ? gradeButtons((g) => done({ g, typed: true, score })) : h('button', { class: 'btn primary', onclick: () => done({ g: gradeFor(score) === 3 ? 2 : gradeFor(score), typed: true, score }) }, 'Suivant'));
    };
    onEnter(f, validate);
    const btn = h('button', { class: 'btn primary', onclick: validate }, 'Valider');
    return h('div', { class: 'screen review' }, header(item), h('div', { class: 'prompt' }, item.prompt), h('p', { class: 'muted center' }, `${item.answer.length} chiffres`), f, btn, feedback);
  });
}

function reviewList(stage, item) {
  const { ordered, cues } = item.extra;
  const n = item.answer.length;
  return stage.ask((done) => {
    const wrap = h('div', { class: 'screen review' }, header(item), h('div', { class: 'prompt' }, item.prompt), h('p', { class: 'muted center' }, ordered ? `${n} éléments, dans l’ordre` : `${n} éléments, dans n’importe quel ordre`));
    const fields = Array.from({ length: n }, (_, i) => input({ placeholder: '…', 'aria-label': `Élément ${i + 1}` }));
    fields.forEach((f, i) => onEnter(f, () => (fields[i + 1] ? fields[i + 1].focus() : f.blur())));
    fields[0].setAttribute('data-autofocus', '');
    const list = h('div', { class: 'recall-list' }, fields.map((f, i) => h('label', { class: 'recall-row' }, h('span', { class: 'recall-cue' }, cues ? h('span', null, h('span', { class: 'cue-emoji' }, cues[i].e), ' ', cues[i].l) : `${i + 1}.`), f)));
    const feedback = h('div');
    const btn = h('button', { class: 'btn primary', onclick: () => {
      const answers = fields.map((f) => f.value);
      const { res, score } = listScore(answers, item.answer, ordered);
      list.remove();
      btn.remove();
      const g = gradeFor(score);
      feedback.replaceChildren(
        h('div', { class: `feedback ${score >= 0.9 ? 'ok' : score >= 0.6 ? 'mid' : 'ko'}` }, h('div', { class: 'fb-title' }, `${Math.round(score * 100)} % retrouvés`)),
        listResultView(item.answer, res, { cues, answers: ordered ? answers : null }),
        hintBlock(item),
        g === 3 ? gradeButtons((gg) => done({ g: gg, typed: true, score })) : h('button', { class: 'btn primary', onclick: () => done({ g, typed: true, score }) }, 'Suivant'));
    } }, 'Valider');
    wrap.append(list, btn, feedback);
    return wrap;
  });
}

export function reviewItem(stage, item) {
  if (item.type === 'face') return reviewFace(stage, item);
  if (item.type === 'code') return reviewCode(stage, item);
  if (item.type === 'list') return reviewList(stage, item);
  return reviewCard(stage, item);
}

/**
 * Enchaîne les révisions. Un élément raté revient une fois en fin de série, après correction.
 * ctx 'c' (Coffre du jour) ou 'f' (révision libre).
 */
export async function runReviews(stage, items, { ctx = 'c', title = 'Le Coffre' } = {}) {
  const queue = items.slice();
  const retried = new Set();
  let total = 0, ok = 0, pts = 0, i = 0;
  const planned = queue.length;
  while (queue.length) {
    const item = queue.shift();
    stage.setTitle(`${title} · ${Math.min(i + 1, planned)}/${planned}`);
    stage.setProgress(i / planned);
    const r = await reviewItem(stage, item);
    const retry = retried.has(item.id);
    const res = recordReview(item, r.g, { score: r.score, typed: r.typed, ctx: retry ? 'r' : ctx });
    if (!retry) { total++; if (res.ok) ok++; }
    pts += res.pts;
    pointsPop(res.pts);
    if (!res.ok && !retried.has(item.id) && item.type !== 'list') {
      retried.add(item.id);
      queue.push(item);
    } else i++;
  }
  stage.setProgress(1);
  stage.setTitle(title);
  return { total, ok, pts };
}

export function coffreSummary(stage, { total, ok, pts }, extra) {
  return screen(stage, {
    icon: '🗝️', title: 'Coffre refermé',
    text: [`${ok} rappels réussis sur ${total}.`, pts ? `+${pts} points de mémoire` : null, 'Les éléments ratés reviendront dès demain.'].filter(Boolean),
    body: extra,
  });
}

export { esc };
