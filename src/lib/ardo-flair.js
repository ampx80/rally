// ardo-flair.js - little joys for the login concierge: a date/URL-driven outfit
// for Ardo, a login-streak counter, and an opt-in success chime. All local-first
// and side-effect-free until called. NO em-dash / en-dash. ASCII only.

// Which outfit Ardo wears. Override for demos with ?ardo=santa|party|spooky|night|shades|none
export function currentAccessory() {
  try {
    const p = new URLSearchParams(window.location.search).get('ardo');
    if (p) return p;
  } catch {}
  const d = new Date();
  const m = d.getMonth(), day = d.getDate(), h = d.getHours();
  if (m === 11 && day >= 15) return 'santa';                      // mid-late December
  if ((m === 0 && day === 1) || (m === 11 && day === 31)) return 'party'; // new year
  if (m === 9 && day >= 24) return 'spooky';                      // Halloween week
  if (h >= 22 || h < 5) return 'night';                           // late night
  if (h >= 11 && h < 15) return 'shades';                         // midday
  return '';
}

const STREAK_KEY = 'ardovo_streak';

// Current streak for display (survives through "yesterday", breaks after a gap).
export function readStreak() {
  try {
    const r = JSON.parse(localStorage.getItem(STREAK_KEY) || 'null');
    if (!r || !r.last) return 0;
    const diff = Math.round((new Date(new Date().toDateString()) - new Date(r.last)) / 86400000);
    return diff <= 1 ? (r.count || 0) : 0;
  } catch { return 0; }
}

// Record a sign-in today; returns the new streak count.
export function bumpStreak() {
  try {
    const today = new Date().toDateString();
    const r = JSON.parse(localStorage.getItem(STREAK_KEY) || 'null');
    let count = 1;
    if (r && r.last) {
      const diff = Math.round((new Date(today) - new Date(r.last)) / 86400000);
      if (diff === 0) count = r.count || 1;
      else if (diff === 1) count = (r.count || 0) + 1;
      else count = 1;
    }
    localStorage.setItem(STREAK_KEY, JSON.stringify({ last: today, count }));
    return count;
  } catch { return 1; }
}

// A short, cheerful rising arpeggio synthesized in the browser (no audio asset).
// Must be triggered from a user gesture (it is - fires on successful sign-in).
export function playChime() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      o.connect(g); g.connect(ctx.destination);
      const t = now + i * 0.085;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
      o.start(t); o.stop(t + 0.4);
    });
    setTimeout(() => { try { ctx.close(); } catch {} }, 1300);
  } catch {}
}

const SOUND_KEY = 'ardovo_sound';
export function soundEnabled() { try { return localStorage.getItem(SOUND_KEY) === '1'; } catch { return false; } }
export function setSoundEnabled(on) { try { localStorage.setItem(SOUND_KEY, on ? '1' : '0'); } catch {} }
