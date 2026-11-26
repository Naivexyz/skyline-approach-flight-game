// audio.js — all sound is synthesized with WebAudio: no audio files, no
// network. A soft engine hum that follows the throttle, a chime for a ring,
// a thud for a touchdown and a warning buzz. Silent until the first
// interaction, as browsers require.

export function createAudio() {
  let ctx = null;
  let hum = null;
  let humGain = null;
  let muted = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 52;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      humGain = ctx.createGain();
      humGain.gain.value = 0;
      osc.connect(filter).connect(humGain).connect(ctx.destination);
      osc.start();
      hum = osc;
      return true;
    } catch {
      return false;
    }
  }

  function blip(freq, dur, type, vol) {
    if (!ctx || muted) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol || 0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch { /* sound is decoration; never break the game */ }
  }

  return {
    unlock() { if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {}); },
    engine(throttle, speed) {
      if (!ctx || muted || !hum) return;
      hum.frequency.value = 46 + throttle * 44 + speed * 0.12;
      humGain.gain.value = 0.018 + throttle * 0.035;
    },
    ring() { blip(880, 0.35, 'sine', 0.14); setTimeout(() => blip(1318, 0.4, 'sine', 0.12), 90); },
    touchdown() { blip(140, 0.25, 'triangle', 0.2); },
    crash() { blip(70, 0.7, 'sawtooth', 0.22); },
    warning() { blip(440, 0.18, 'square', 0.06); },
    toggleMute() { muted = !muted; if (humGain) humGain.gain.value = 0; return muted; },
  };
}
