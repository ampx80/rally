// POST /api/form-submit
//
// Public submission endpoint for Ardovo hosted forms (/f/:formId). The hosted
// page writes the submission locally (creates/updates a contact + logs it) and
// ALSO fires this endpoint fire-and-forget so there is a server-side capture
// point: it runs the same spam screen the client does (honeypot + time-trap),
// applies an in-memory per-form rate limit, sanitizes the payload, and is the
// seam where a real backend would persist the row + hand off to automations.
//
// ADDITIVE + safe by default: with no database configured the route validates,
// screens spam, and responds 200 { ok: true, persisted: false }. The client
// remains the source of truth for contact creation, so nothing here can block
// or break a visitor's submit. PII (answer values) is never logged.
//
// Env (all optional):
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY - to persist rally_form_submissions
//
// ASCII only. NO em-dash / en-dash. ASCII hyphen only.
import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';

const MIN_FILL_MS = 2500;          // matches the client time-trap
const RATE_MAX = 8;                // submissions per form per window
const RATE_WINDOW_MS = 60000;

// Best-effort in-memory rate limit. Serverless instances are ephemeral, so
// this is a soft backstop layered on top of the client-side limiter, not a
// hard guarantee. Keyed by form id.
const hits = new Map();
function rateLimited(formId) {
  if (!formId) return false;
  const now = Date.now();
  const arr = (hits.get(formId) || []).filter((t) => now - t < RATE_WINDOW_MS);
  arr.push(now);
  hits.set(formId, arr);
  return arr.length > RATE_MAX;
}

const clean = (s, max = 2000) => String(s == null ? '' : s).trim().slice(0, max);

function sanitizeValues(values) {
  if (!values || typeof values !== 'object') return {};
  const out = {};
  let count = 0;
  for (const [k, v] of Object.entries(values)) {
    if (count++ >= 100) break;
    const key = clean(k, 80);
    if (!key) continue;
    if (Array.isArray(v)) out[key] = v.slice(0, 50).map((x) => clean(x, 500));
    else if (typeof v === 'boolean' || typeof v === 'number') out[key] = v;
    else out[key] = clean(v, 5000);
  }
  return out;
}

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  const b = readJsonBody(req);

  const formId = clean(b.formId || b.slug, 120);
  if (!formId) return res.status(400).json({ ok: false, error: 'A formId is required.' });

  // Honeypot: a real visitor never fills the hidden field.
  if (clean(b.honeypot, 200)) {
    console.log('[form-submit] rejected: honeypot');
    return res.status(200).json({ ok: true, accepted: false, reason: 'honeypot' });
  }

  // Time-trap: a real visitor takes more than a couple of seconds.
  const startedAt = Number(b.startedAt);
  if (Number.isFinite(startedAt) && startedAt > 0) {
    const dt = Date.now() - startedAt;
    if (dt >= 0 && dt < MIN_FILL_MS) {
      console.log('[form-submit] rejected: too-fast');
      return res.status(200).json({ ok: true, accepted: false, reason: 'too-fast' });
    }
  }

  if (rateLimited(formId)) {
    return res.status(429).json({ ok: false, error: 'Too many submissions. Please wait a minute and try again.' });
  }

  const values = sanitizeValues(b.values);

  // SUPABASE: const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  // SUPABASE: await supabase.from('rally_form_submissions').insert({ form_id: formId, values, source_url: clean(b.sourceUrl, 300), created_at: new Date().toISOString() })
  // SUPABASE: (then enqueue automations / webhooks off the inserted row)
  const persisted = false;

  console.log('[form-submit] accepted submission', JSON.stringify({ formId, fieldCount: Object.keys(values).length })); // no PII
  return res.status(200).json({ ok: true, accepted: true, persisted });
});
