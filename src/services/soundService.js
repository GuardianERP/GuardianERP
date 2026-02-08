/**
 * Guardian Desktop ERP - Sound Service
 * Generates and plays notification & call sounds using Web Audio API
 * No external audio files needed – all sounds are synthesized.
 */

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume if suspended (browsers require user interaction first)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/* ──────────────────────────────────────────────────────────
   1) Message notification – short pleasant chime
   ─────────────────────────────────────────────────────── */
function playMessageNotification() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Two-tone chime (C5 → E5)
    const frequencies = [523.25, 659.25];
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.12);
      gain.gain.setValueAtTime(0, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.3, now + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.4);
    });
  } catch (e) {
    console.warn('[Sound] Could not play message notification:', e);
  }
}

/* ──────────────────────────────────────────────────────────
   2) Message sent – subtle click/pop
   ─────────────────────────────────────────────────────── */
function playMessageSent() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  } catch (e) {
    console.warn('[Sound] Could not play sent sound:', e);
  }
}

/* ──────────────────────────────────────────────────────────
   3) Incoming call ringtone – repeating ring pattern
   Returns a stop() function to cancel the ringtone.
   ─────────────────────────────────────────────────────── */
let ringtoneInterval = null;
let ringtoneTimeout = null;

function playIncomingRing() {
  stopRingtone(); // stop any existing ringtone first

  const ctx = getAudioContext();

  function ringOnce() {
    try {
      const now = ctx.currentTime;
      // Ring pattern: two short bursts (like a phone ring)
      for (let burst = 0; burst < 2; burst++) {
        const offset = burst * 0.25;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(440, now + offset);   // A4
        osc2.frequency.setValueAtTime(480, now + offset);   // slightly detuned for "ring" warble

        gain.gain.setValueAtTime(0, now + offset);
        gain.gain.linearRampToValueAtTime(0.25, now + offset + 0.03);
        gain.gain.setValueAtTime(0.25, now + offset + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.22);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start(now + offset);
        osc1.stop(now + offset + 0.25);
        osc2.start(now + offset);
        osc2.stop(now + offset + 0.25);
      }
    } catch (e) {
      console.warn('[Sound] Ring burst error:', e);
    }
  }

  // Play immediately, then repeat every 2 seconds
  ringOnce();
  ringtoneInterval = setInterval(ringOnce, 2000);

  // Auto-stop after 30 seconds
  ringtoneTimeout = setTimeout(() => stopRingtone(), 30000);
}

function stopRingtone() {
  if (ringtoneInterval) { clearInterval(ringtoneInterval); ringtoneInterval = null; }
  if (ringtoneTimeout) { clearTimeout(ringtoneTimeout); ringtoneTimeout = null; }
}

/* ──────────────────────────────────────────────────────────
   4) Outgoing call ringing – gentle ringback tone
   Returns a stop function.
   ─────────────────────────────────────────────────────── */
let ringbackInterval = null;
let ringbackTimeout = null;

function playOutgoingRingback() {
  stopRingback();

  const ctx = getAudioContext();

  function toneOnce() {
    try {
      const now = ctx.currentTime;
      // Standard ringback: 440 Hz, 2s on, 4s off → we do 1s on, 2s off (shorter for UX)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.05);
      gain.gain.setValueAtTime(0.12, now + 0.8);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.1);
    } catch (e) {
      console.warn('[Sound] Ringback error:', e);
    }
  }

  toneOnce();
  ringbackInterval = setInterval(toneOnce, 3000);
  ringbackTimeout = setTimeout(() => stopRingback(), 30000);
}

function stopRingback() {
  if (ringbackInterval) { clearInterval(ringbackInterval); ringbackInterval = null; }
  if (ringbackTimeout) { clearTimeout(ringbackTimeout); ringbackTimeout = null; }
}

/* ──────────────────────────────────────────────────────────
   5) Call ended – short descending tone
   ─────────────────────────────────────────────────────── */
function playCallEnded() {
  stopRingtone();
  stopRingback();
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.3);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  } catch (e) {
    console.warn('[Sound] Call ended sound error:', e);
  }
}

/* ──────────────────────────────────────────────────────────
   6) Call rejected – two quick low tones
   ─────────────────────────────────────────────────────── */
function playCallRejected() {
  stopRingtone();
  stopRingback();
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(300, now + i * 0.2);
      gain.gain.setValueAtTime(0.1, now + i * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.2 + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.2);
      osc.stop(now + i * 0.2 + 0.18);
    }
  } catch (e) {
    console.warn('[Sound] Call rejected sound error:', e);
  }
}

const soundService = {
  playMessageNotification,
  playMessageSent,
  playIncomingRing,
  stopRingtone,
  playOutgoingRingback,
  stopRingback,
  playCallEnded,
  playCallRejected,
};

export default soundService;
