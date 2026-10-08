/**
 * Web Audio API Sound Synthesizer
 * 100% procedural, 0 external mp3 dependencies, zero loading latency.
 */

let ctx = null;
let enabled = true;

// Check localStorage
try {
  const saved = localStorage.getItem("lumeria_sound");
  if (saved !== null) {
    enabled = saved === "true";
  }
} catch (e) {
  // ignore
}

function getAudioContext() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      ctx = new AudioCtx();
    }
  }
  if (ctx && ctx.state === "suspended") {
    ctx.resume();
  }
  return ctx;
}

export function isSoundEnabled() {
  return enabled;
}

export function toggleSound() {
  enabled = !enabled;
  try {
    localStorage.setItem("lumeria_sound", String(enabled));
  } catch (e) {}
  if (enabled) {
    playPop();
  }
  return enabled;
}

/** Play a crisp, crumbly cookie bite / crunch sound */
export function playBite() {
  if (!enabled) return;
  const audio = getAudioContext();
  if (!audio) return;

  const now = audio.currentTime;
  const bufferSize = audio.sampleRate * 0.16;
  const buffer = audio.createBuffer(1, bufferSize, audio.sampleRate);
  const data = buffer.getChannelData(0);

  // Brown / pinkish noise for pastry crunch
  let lastOut = 0.0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    data[i] = (lastOut + 0.02 * white) / 1.02;
    lastOut = data[i];
    data[i] *= 3.5;
  }

  const noise = audio.createBufferSource();
  noise.buffer = buffer;

  const filter = audio.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(1400, now);
  filter.frequency.exponentialRampToValueAtTime(350, now + 0.14);
  filter.Q.setValueAtTime(3.0, now);

  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.01, now);
  gain.gain.linearRampToValueAtTime(0.35, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(audio.destination);

  noise.start(now);
  noise.stop(now + 0.16);

  // Add subtle sub-pop
  const osc = audio.createOscillator();
  const oscGain = audio.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(50, now + 0.08);
  oscGain.gain.setValueAtTime(0.2, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  osc.connect(oscGain);
  oscGain.connect(audio.destination);
  osc.start(now);
  osc.stop(now + 0.09);
}

/** Play a playful cartoon pop / bubble sound */
export function playPop(highPitch = false) {
  if (!enabled) return;
  const audio = getAudioContext();
  if (!audio) return;

  const now = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();

  const startFreq = highPitch ? 520 : 380;
  const endFreq = highPitch ? 960 : 780;

  osc.type = "sine";
  osc.frequency.setValueAtTime(startFreq, now);
  osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.09);

  gain.gain.setValueAtTime(0.28, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

  osc.connect(gain);
  gain.connect(audio.destination);

  osc.start(now);
  osc.stop(now + 0.12);
}

/** Play a delicate glass jar / chime sound */
export function playChime() {
  if (!enabled) return;
  const audio = getAudioContext();
  if (!audio) return;

  const now = audio.currentTime;
  const freqs = [1046.5, 1567.98, 2093.0]; // C6, G6, C7
  freqs.forEach((freq, idx) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + idx * 0.04);

    gain.gain.setValueAtTime(0.12 / (idx + 1), now + idx * 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.45);

    osc.connect(gain);
    gain.connect(audio.destination);

    osc.start(now + idx * 0.04);
    osc.stop(now + idx * 0.04 + 0.5);
  });
}

/** Play a smooth whoosh / swoosh sound */
export function playWhoosh() {
  if (!enabled) return;
  const audio = getAudioContext();
  if (!audio) return;

  const now = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(540, now + 0.1);
  osc.frequency.exponentialRampToValueAtTime(140, now + 0.22);

  gain.gain.setValueAtTime(0.01, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

  osc.connect(gain);
  gain.connect(audio.destination);

  osc.start(now);
  osc.stop(now + 0.26);
}
