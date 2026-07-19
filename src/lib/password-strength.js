// password-strength.js - kind, NIST SP 800-63B-aligned password guidance.
// Philosophy: length beats complexity. We do NOT demand uppercase/number/symbol
// mixes (they push people to "Password1!"). We reward length, gently discourage
// obvious/common choices, allow spaces + paste + any Unicode, and phrase every
// message as encouragement, never scolding. Optional breached-password check
// via Have I Been Pwned k-anonymity (the full password never leaves the device;
// only the first 5 chars of its SHA-1 hash are sent). Fail-open: a network
// hiccup never blocks a sign-up. NO em-dash / en-dash. ASCII only.

// A tiny local blocklist of the most obvious choices. The HIBP check (below)
// covers the long tail; this is the instant, offline first line.
const COMMON = new Set([
  'password', 'password1', 'password123', '12345678', '123456789', '1234567890',
  'qwerty', 'qwertyuiop', 'letmein', 'welcome', 'welcome1', 'admin', 'iloveyou',
  'abc12345', 'football', 'monkey', 'dragon', 'sunshine', 'princess', 'password!',
  'changeme', 'ardovo', 'ardovo123', 'salesforce', 'trustno1', 'starwars',
]);

// Encouraging label ladder. Score 0..4.
const LABELS = [
  { label: 'Too short', tone: 'risk', note: 'A few more characters and you are set.' },
  { label: 'Getting there', tone: 'warn', note: 'Add a couple more words to make it strong.' },
  { label: 'Good', tone: 'info', note: 'Solid. A little longer is even better.' },
  { label: 'Strong', tone: 'ok', note: 'Nice - that is a strong one.' },
  { label: 'Excellent', tone: 'ok', note: 'Excellent. This one is hard to crack.' },
];

// Real-time, offline strength. Returns { score, label, tone, note, ok, tips }.
export function scorePassword(pw) {
  const p = String(pw || '');
  const len = [...p].length; // code points, so emoji/unicode count as 1
  if (!len) return { score: 0, label: '', tone: 'muted', note: 'Use at least 12 characters. A short phrase works great.', ok: false, tips: [] };

  const lower = p.toLowerCase();
  const tips = [];
  let score = 0;

  // Length is the dominant signal (NIST: length over composition).
  if (len >= 12) score += 2; else if (len >= 8) score += 1;
  if (len >= 16) score += 1;
  if (len >= 24) score += 1;

  // Variety is a gentle bonus, never a requirement.
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter(re => re.test(p)).length;
  if (classes >= 3 && len >= 10) score += 1;

  // Discourage obvious patterns (but only nudge the score, never hard-block here).
  const isCommon = COMMON.has(lower);
  const isSequential = /^(.)\1{3,}$/.test(p) || /0123|1234|2345|3456|4567|5678|6789|abcd|qwer/i.test(p);
  if (isCommon || isSequential) { score = Math.min(score, 1); tips.push('That is a very common choice - a random phrase is much safer.'); }

  score = Math.max(0, Math.min(4, score));
  if (len < 8) score = 0;

  const meta = LABELS[score];
  const ok = len >= 8 && !isCommon; // minimum bar (8 with MFA available); we recommend 12+
  if (len < 12 && ok) tips.push('12+ characters is our sweet spot.');

  return { score, label: meta.label, tone: meta.tone, note: meta.note, ok, tips, length: len };
}

// SHA-1 hex (needed only for the HIBP range query; not used to store anything).
async function sha1Hex(str) {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// Breached-password check via HIBP k-anonymity. Sends ONLY the first 5 hex chars
// of the SHA-1 hash; matches the suffix locally. Returns { breached, count } or
// { breached: false, skipped: true } on any error (fail-open - never blocks).
export async function checkPwned(pw) {
  try {
    const p = String(pw || '');
    if ([...p].length < 8) return { breached: false, skipped: true };
    const hash = await sha1Hex(p);
    const prefix = hash.slice(0, 5); const suffix = hash.slice(5);
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
    });
    if (!res.ok) return { breached: false, skipped: true };
    const text = await res.text();
    for (const line of text.split('\n')) {
      const [suf, countRaw] = line.trim().split(':');
      if (suf === suffix) {
        const count = parseInt(countRaw, 10) || 0;
        return count > 0 ? { breached: true, count } : { breached: false };
      }
    }
    return { breached: false };
  } catch { return { breached: false, skipped: true }; }
}
