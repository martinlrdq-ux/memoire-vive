// Synthèse vocale (messages oraux, prononciation des mots étrangers) et bruit de fond.

let voices = [];
const synth = window.speechSynthesis;
function loadVoices() { voices = synth ? synth.getVoices() : []; }
if (synth) {
  loadVoices();
  synth.addEventListener?.('voiceschanged', loadVoices);
}

export const canSpeak = () => !!synth;

export function voicesFor(lang) {
  if (!voices.length) loadVoices();
  const base = lang.slice(0, 2);
  return voices.filter((v) => v.lang && v.lang.replace('_', '-').toLowerCase().startsWith(base));
}

export function speak(text, { lang = 'fr-FR', rate = 1, voiceIndex = null } = {}) {
  return new Promise((resolve) => {
    if (!synth) return resolve(false);
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = rate;
    const vs = voicesFor(lang);
    if (vs.length) u.voice = vs[(voiceIndex ?? Math.floor(Math.random() * vs.length)) % vs.length];
    u.onend = () => resolve(true);
    u.onerror = () => resolve(false);
    synth.speak(u);
    // Sécurité : certains navigateurs n'envoient jamais « onend ».
    setTimeout(() => resolve(true), 1500 + text.length * 120 / rate);
  });
}

export function stopSpeaking() { synth?.cancel(); }

// Bruit de fond (mode difficile de « Message reçu »).
let noise = null;
export function startNoise(volume = 0.05) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; data[i] = last * 3.5; }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = volume * 6;
    src.connect(gain).connect(ctx.destination);
    src.start();
    noise = ctx;
  } catch { noise = null; }
}
export function stopNoise() { try { noise?.close(); } catch {} noise = null; }
