// POST /api/unlock   { code }
//
// Gates the Rally product app behind a private access code held ONLY in a
// Vercel environment variable (never shipped in the client bundle). The
// operator enters the code once on the coming-soon gate; on a match the
// client stores an unlock flag so it does not have to ask again on that
// device. This is a soft gate over a client-side demo app - it keeps the
// public out of the product while the waitlist fills, it is not a substitute
// for real auth. NO em-dash / en-dash.
//
// Env: ACCESS_CODE (or RALLY_ACCESS_CODE) - the shared passcode.
import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';

// Constant-time-ish compare so response timing does not leak the code length.
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  let diff = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i % b.length);
  return diff === 0;
}

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  const expected = (process.env.ACCESS_CODE || process.env.RALLY_ACCESS_CODE || '').trim();
  if (!expected) return res.status(503).json({ ok: false, error: 'Access is not configured yet.' });

  const { code } = readJsonBody(req);
  const ok = safeEqual(String(code || '').trim(), expected);
  // Small fixed delay to blunt brute-forcing of a short code.
  await new Promise((r) => setTimeout(r, 350));
  if (!ok) return res.status(401).json({ ok: false, error: 'That code is not right.' });

  return res.status(200).json({ ok: true, token: 'granted' });
});
