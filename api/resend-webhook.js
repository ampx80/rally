// api/resend-webhook.js
//
// Ardovo's Resend WEBHOOK receiver - real open / click / bounce / complaint
// tracking for every email the platform sends. Resend signs its webhooks with
// Svix, so this route:
//
//   1) reads the RAW request body (Svix signs the exact bytes),
//   2) verifies the signature against RESEND_WEBHOOK_SECRET (whsec_...),
//   3) handles the engagement + deliverability event types:
//        email.opened      -> stamp opened_at on the matching log row
//        email.clicked     -> stamp clicked_at + record the clicked link
//        email.bounced     -> record + add a hard bounce to the suppression list
//        email.complained  -> record + add the address to unsubscribes
//   4) persists to two tables (both best-effort, both fail-OPEN):
//        rally_email_log     (opened_at / clicked_at columns, keyed by resend_id)
//        rally_email_events  (append-only per-event log: type, email, link, raw)
//
// Everything is env-gated. With no RESEND_WEBHOOK_SECRET the route returns
// { configured: false } with a 200 (so Resend does not hammer retries at an
// unconfigured endpoint) and does not attempt verification. With no Supabase
// env the route verifies + acknowledges but skips persistence. A DB error is
// swallowed (best-effort) so a transient blip never turns into a Resend retry
// storm. The ONLY non-2xx path is a genuine bad signature (401), which is what
// tells Resend the request was not authentic.
//
// The client timeline UI (src/components/email/EmailActivityTimeline.jsx) reads
// these events through /api/marketing-cron?action=events when Supabase is wired,
// and falls back to a local demo store otherwise.
//
// Env:
//   RESEND_WEBHOOK_SECRET                      Svix signing secret (whsec_...)
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY   optional durable persistence
//
// ASCII only. NO em-dash / en-dash. ASCII hyphen only.
import crypto from 'node:crypto';

// Svix signs the exact request bytes, so Vercel's JSON body parser must be off.
export const config = { api: { bodyParser: false } };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOLERANCE_SEC = 300; // reject events whose timestamp is > 5 min skewed

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Constant-time compare of two base64 signatures. Returns false on any length
// mismatch instead of throwing (timingSafeEqual requires equal-length buffers).
function safeEqual(a, b) {
  const ba = Buffer.from(String(a || ''), 'utf8');
  const bb = Buffer.from(String(b || ''), 'utf8');
  if (ba.length !== bb.length) return false;
  try { return crypto.timingSafeEqual(ba, bb); } catch { return false; }
}

// Verify a Svix-signed webhook (the scheme Resend uses). The signed content is
// `${svix-id}.${svix-timestamp}.${rawBody}` HMAC-SHA256'd with the secret bytes
// (the part after the whsec_ prefix, base64-decoded), base64-encoded. The
// svix-signature header is a space-delimited list of `v1,<sig>` entries; a match
// against ANY entry passes. Returns { ok, reason }.
function verifySvix(rawBody, headers, secret) {
  const id = headers['svix-id'] || headers['webhook-id'];
  const timestamp = headers['svix-timestamp'] || headers['webhook-timestamp'];
  const signature = headers['svix-signature'] || headers['webhook-signature'];
  if (!id || !timestamp || !signature) return { ok: false, reason: 'missing signature headers' };

  // Replay guard: reject stale timestamps.
  const ts = Number(timestamp);
  if (Number.isFinite(ts)) {
    const skew = Math.abs(Math.floor(Date.now() / 1000) - ts);
    if (skew > TOLERANCE_SEC) return { ok: false, reason: 'timestamp out of tolerance' };
  }

  const secretBytes = Buffer.from(String(secret).replace(/^whsec_/, ''), 'base64');
  const signedContent = `${id}.${timestamp}.${rawBody.toString('utf8')}`;
  const expected = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64');

  const passed = String(signature)
    .split(' ')
    .map((part) => part.includes(',') ? part.split(',')[1] : part)
    .some((sig) => safeEqual(sig, expected));

  return passed ? { ok: true } : { ok: false, reason: 'signature mismatch' };
}

// ── Supabase (service-role). Fail-open / best-effort. ────────────────────────
async function getSupa() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    const { createClient } = await import('@supabase/supabase-js');
    return createClient(url, key, { auth: { persistSession: false } });
  } catch {
    return null;
  }
}

// Normalize the various shapes Resend puts an event into. Different event types
// nest the recipient + link in slightly different places; be liberal.
function parseEvent(evt) {
  const type = String(evt?.type || '').toLowerCase();
  const data = evt?.data || {};
  const emailId = data.email_id || data.id || null;
  let to = data.to;
  if (Array.isArray(to)) to = to[0];
  to = String(to || data.recipient || '').trim().toLowerCase();
  const link = (data.click && (data.click.link || data.click.url)) || data.link || null;
  const createdAt = evt?.created_at || data.created_at || new Date().toISOString();
  return { type, emailId, to: EMAIL_RE.test(to) ? to : null, link, createdAt };
}

async function stampLog(supa, emailId, patch) {
  if (!supa || !emailId) return;
  try { await supa.from('rally_email_log').update(patch).eq('resend_id', emailId); } catch { /* best-effort */ }
}

async function recordEvent(supa, row) {
  if (!supa) return;
  try {
    await supa.from('rally_email_events').insert({
      resend_id: row.emailId || null,
      email: row.to || null,
      type: row.type || null,
      link: row.link || null,
      created_at: row.createdAt || new Date().toISOString(),
      raw: row.raw || null,
    });
  } catch { /* best-effort; the log-row stamp is the durable signal */ }
}

// Add a recipient to a suppression table (idempotent-ish upsert). Used to close
// the deliverability loop on hard bounces + complaints so future sends skip them.
async function suppress(supa, table, email, reason) {
  if (!supa || !email) return;
  try {
    await supa.from(table).upsert({ email, reason: reason || null, created_at: new Date().toISOString() }, { onConflict: 'email' });
  } catch {
    try { await supa.from(table).insert({ email, reason: reason || null }); } catch { /* best-effort */ }
  }
}

export default async function handler(req, res) {
  // Deliberately not using withErrorHandling: a webhook must answer with an
  // explicit 2xx/4xx the provider understands and never surface secrets.
  try {
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }

    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret) {
      // Unconfigured: acknowledge so Resend does not retry, but do nothing.
      return res.status(200).json({ configured: false, reason: 'no-webhook-secret' });
    }

    const raw = await readRawBody(req);
    const verified = verifySvix(raw, req.headers, secret);
    if (!verified.ok) {
      console.warn('[resend-webhook] signature verification failed:', verified.reason);
      return res.status(401).json({ error: 'invalid signature' });
    }

    let evt;
    try { evt = JSON.parse(raw.toString('utf8') || '{}'); } catch { evt = {}; }
    const parsed = parseEvent(evt);
    if (!parsed.type) return res.status(200).json({ received: true, ignored: 'no-type' });

    const supa = await getSupa();
    // Persist the append-only event first (works for every type, even ones we
    // do not specially handle) so the timeline is complete.
    await recordEvent(supa, { ...parsed, raw: evt });

    switch (parsed.type) {
      case 'email.opened':
        await stampLog(supa, parsed.emailId, { opened_at: parsed.createdAt });
        break;
      case 'email.clicked':
        await stampLog(supa, parsed.emailId, { clicked_at: parsed.createdAt });
        break;
      case 'email.bounced':
        await stampLog(supa, parsed.emailId, { status: 'bounced', bounced_at: parsed.createdAt });
        if (parsed.to) await suppress(supa, 'rally_email_excluded', parsed.to, 'hard-bounce');
        break;
      case 'email.complained':
        await stampLog(supa, parsed.emailId, { status: 'complained', complained_at: parsed.createdAt });
        if (parsed.to) await suppress(supa, 'rally_email_unsubscribes', parsed.to, 'complaint');
        break;
      default:
        // delivered / sent / delivery_delayed etc. are recorded above; no extra work.
        break;
    }

    return res.status(200).json({ received: true, type: parsed.type, persisted: !!supa });
  } catch (e) {
    console.error('[resend-webhook] handler error', e?.message);
    // 200 so Resend does not retry a bug forever; we have logged it.
    return res.status(200).json({ received: true, error: 'handled' });
  }
}
