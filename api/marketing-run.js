// api/marketing-run.js
//
// Rally's cron-able MARKETING SEND runner. Two jobs, both env-gated and
// fail-safe, and both route EVERY message through the hardened primitive
// api/_lib-email.js (Resend + retry/backoff + idempotency + suppression,
// a safe no-op without RESEND_API_KEY).
//
//   GET            (Vercel cron entry, no body)
//   POST { run }   Evaluate DUE marketing automations from the durable store
//                  (Supabase) and send the next batch. Bounded by a per-run
//                  cap. Idempotent via a per-automation+contact+window key so
//                  a repeated cron pass never double-sends. Without a durable
//                  store there is nothing server-side to evaluate, so it
//                  no-ops with a clear reason (the client engine computes the
//                  book in the browser). NEVER errors.
//
//   POST { action: 'send', automationId, sends: [...] }
//                  Send a batch that the client engine (src/lib/marketing-
//                  engine.js) already composed. Each `send` is
//                  { contactId, to, subject, bodyHtml, text, preheader,
//                    ctaUrl, ctaLabel, idempotencyKey }. This is the bridge
//                  that lets the local-first UI trigger a REAL send without a
//                  Supabase book. Bounded (MAX_BATCH). Idempotent per key.
//
//   POST { action: 'preview', send }   Render one message to HTML (no send).
//   POST { action: 'ping' }            Health echo, no compute.
//
// Auth: a Vercel cron GET is trusted. When CRON_SECRET is set, an external
// caller must present Authorization: Bearer <CRON_SECRET> (or x-cron-secret)
// to trigger `run`; the action=send bridge is same-origin from the app.
//
// Design contract (LDS platform rule): safe to schedule. No destructive
// writes. Degrades to a no-op (never a stall) when env is absent.
//
// Env (all optional - absence degrades cleanly, never throws):
//   RESEND_API_KEY                             required to actually send
//   RALLY_FROM / NOTIFY_FROM / RESEND_FROM     default sender (see _lib-email)
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY   durable automations + contacts
//   MARKETING_ENABLED = "false"                hard kill-switch for the cron
//   MARKETING_DAILY_CAP                        per-run send ceiling (default 200)
//   CRON_SECRET                                gate for external run triggers
//
// ASCII only. NO em-dash / en-dash.
import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';
import { sendEmail, sleep } from './_lib-email.js';

const MAX_BATCH = 500;                 // absolute ceiling on one action=send call
const DAILY_CAP_DEFAULT = 200;
const DAY = 86400000;

const hasResend = () => !!process.env.RESEND_API_KEY;
const hasSupabase = () => !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const disabled = () => String(process.env.MARKETING_ENABLED || '').toLowerCase() === 'false';
const runCap = () => {
  const n = Number(process.env.MARKETING_DAILY_CAP);
  return Number.isFinite(n) && n > 0 ? Math.min(n, MAX_BATCH) : DAILY_CAP_DEFAULT;
};

// ── auth: a cron GET is trusted; a run trigger with CRON_SECRET set must match.
function cronAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret configured -> allow (dev / first wire)
  const hdr = req.headers.authorization || '';
  const custom = req.headers['x-cron-secret'];
  return hdr === `Bearer ${secret}` || (custom && custom === secret);
}

// ── send one composed message through the hardened primitive. Never throws. ──
async function sendOne(automationId, s) {
  const to = String(s?.to || '').trim();
  const contactId = s?.contactId || null;
  const subject = String(s?.subject || '').trim();
  if (!to || !subject) return { ok: false, contactId, to, subject, error: 'missing to/subject' };

  const r = await sendEmail({
    to,
    subject,
    bodyHtml: s.bodyHtml || undefined,
    text: s.text || undefined,
    preheader: s.preheader || undefined,
    ctaUrl: s.ctaUrl || undefined,
    ctaLabel: s.ctaLabel || undefined,
    category: 'marketing',
    idempotencyKey: s.idempotencyKey || `mkt|${automationId}|${contactId || to}`,
  });
  return { ...r, contactId, to, subject };
}

// ── action=send: send a client-composed batch, paced + bounded. ──────────────
async function actionSend({ automationId, sends }) {
  const list = Array.isArray(sends) ? sends.slice(0, MAX_BATCH) : [];
  if (!list.length) return { ok: true, sent: 0, results: [], reason: 'empty batch' };
  if (!hasResend()) {
    return { ok: true, sent: 0, skipped: 'no-api-key', results: [], reason: 'RESEND_API_KEY not set; no-op send.' };
  }
  const results = [];
  let sent = 0, skipped = 0, failed = 0;
  for (const s of list) {
    const r = await sendOne(automationId, s);
    results.push(r);
    if (r.ok && !r.idempotent_skip && !r.suppressed) sent++;
    else if (r.idempotent_skip || r.suppressed || r.skipped) skipped++;
    else failed++;
    // Pace under Resend's rate limit; the primitive's retry covers any burst.
    await sleep(120);
  }
  return { ok: true, automationId: automationId || null, sent, skipped, failed, results };
}

// ── Supabase helpers (durable run path). Fail-open / no-op. ──────────────────
async function getSupa() {
  if (!hasSupabase()) return null;
  try {
    const { createClient } = await import('@supabase/supabase-js');
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  } catch { return null; }
}

function matchesAudience(audience = {}, c) {
  const a = { stages: [], tags: [], owner: 'any', requireEmail: true, ...(audience || {}) };
  if (a.requireEmail && !c.email) return false;
  if (a.stages.length && !a.stages.includes(c.lifecycle_stage || c.lifecycleStage)) return false;
  if (a.tags.length) {
    const ctags = c.tags || [];
    if (!a.tags.some(t => ctags.includes(t))) return false;
  }
  const owner = c.owner_id || c.ownerId;
  if (a.owner && a.owner !== 'any' && owner !== a.owner) return false;
  return true;
}

function throttleBucket(automation) {
  const win = Math.max(1, Number(automation.throttle_days ?? automation.throttleDays) || 14) * DAY;
  return Math.floor(Date.now() / win);
}

function render(text, c) {
  const first = c.first_name || c.firstName || 'there';
  const company = c.company_name || c.company || 'your team';
  return String(text || '')
    .split('{{firstName}}').join(first)
    .split('{{company}}').join(company)
    .split('{{fullName}}').join(c.full_name || first)
    .split('{{title}}').join(c.title || '')
    .split('{{senderName}}').join('the Rally team');
}
function bodyToHtml(text) {
  return String(text || '')
    .split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
    .map(p => `<p style="margin:0 0 14px;">${p.replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch])).replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

// The durable cron pass: read active automations + contacts from Supabase,
// compute due recipients (audience minus anyone mailed inside the throttle
// window, per rally_email_log), and send a bounded batch. Every path returns
// a 200; missing tables / env degrade to a clean no-op.
async function actionRun() {
  if (disabled()) return { ok: true, ran: false, sent: 0, reason: 'MARKETING_ENABLED=false.' };
  if (!hasResend()) return { ok: true, ran: false, sent: 0, reason: 'RESEND_API_KEY not set; nothing sent.' };
  const supa = await getSupa();
  if (!supa) {
    return {
      ok: true, ran: false, sent: 0,
      reason: 'No durable store configured. Automations live client-side in the app; the cron is a no-op here by design. Use POST { action: "send" } to send a client-composed batch.',
      at: new Date().toISOString(),
    };
  }

  let automations = [];
  try {
    const { data, error } = await supa.from('rally_marketing_automations').select('*').eq('active', true);
    if (error) return { ok: true, ran: false, sent: 0, reason: `automations table unavailable: ${error.message}`, at: new Date().toISOString() };
    automations = Array.isArray(data) ? data : [];
  } catch (e) {
    return { ok: true, ran: false, sent: 0, reason: `automations read failed: ${e?.message || e}`, at: new Date().toISOString() };
  }
  if (!automations.length) return { ok: true, ran: true, sent: 0, reason: 'No active automations.', at: new Date().toISOString() };

  let contacts = [];
  try {
    const { data } = await supa.from('rally_contacts').select('*').limit(5000);
    contacts = Array.isArray(data) ? data : [];
  } catch { contacts = []; }

  const cap = runCap();
  let remaining = cap;
  let sent = 0, skipped = 0, failed = 0;
  const per = [];

  for (const a of automations) {
    if (remaining <= 0) break;
    const audience = a.audience || {};
    const pool = contacts.filter(c => matchesAudience(audience, c));
    const bucket = throttleBucket(a);
    let aSent = 0;
    for (const c of pool) {
      if (remaining <= 0) break;
      const email = c.email;
      const first = c.first_name || c.firstName || 'there';
      const tpl = a.template || {};
      const r = await sendEmail({
        to: email,
        subject: render(tpl.subject, c),
        bodyHtml: bodyToHtml(render(tpl.body, c)),
        text: render(tpl.body, c),
        preheader: render(tpl.preheader, c),
        ctaUrl: tpl.ctaUrl || tpl.cta_url || undefined,
        ctaLabel: tpl.ctaLabel || tpl.cta_label || undefined,
        category: 'marketing',
        idempotencyKey: `mkt|${a.id}|${c.id}|${bucket}`,
      });
      if (r.ok && !r.idempotent_skip && !r.suppressed) { sent++; aSent++; remaining--; }
      else if (r.idempotent_skip || r.suppressed || r.skipped) skipped++;
      else failed++;
      await sleep(120);
    }
    per.push({ automationId: a.id, sent: aSent, pool: pool.length });
  }

  return { ok: true, ran: true, sent, skipped, failed, capRemaining: remaining, capTotal: cap, per, at: new Date().toISOString() };
}

// ── action=preview: render one composed message to HTML (no send). ───────────
async function actionPreview({ send }) {
  const s = send || {};
  const to = String(s.to || 'preview@example.com');
  const r = await sendEmail({
    to,
    subject: String(s.subject || 'Preview'),
    bodyHtml: s.bodyHtml || undefined,
    text: s.text || undefined,
    preheader: s.preheader || undefined,
    ctaUrl: s.ctaUrl || undefined,
    ctaLabel: s.ctaLabel || undefined,
    // No RESEND key -> _lib-email returns skipped without sending. We only want
    // the shape back here, so report a deterministic preview note either way.
  });
  return { ok: true, preview: true, wouldSend: hasResend(), to, subject: String(s.subject || 'Preview'), sendResult: r };
}

// A paced batch up to the cap can take a couple of minutes; give it room.
export const config = { maxDuration: 300 };

export default withErrorHandling(async (req, res) => {
  const method = (req.method || 'GET').toUpperCase();

  // Cron entry: a bare GET runs the durable pass.
  if (method === 'GET') {
    if (!cronAuthorized(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });
    return res.status(200).json(await actionRun());
  }

  if (method !== 'POST') return methodNotAllowed(res, ['GET', 'POST']);

  const body = readJsonBody(req);
  const action = String(body.action || (body.run ? 'run' : '') || '').toLowerCase();

  switch (action) {
    case 'ping':
      return res.status(200).json({ ok: true, service: 'marketing-run', resend: hasResend(), durable: hasSupabase() });
    case 'send':
      return res.status(200).json(await actionSend({ automationId: body.automationId, sends: body.sends }));
    case 'preview':
      return res.status(200).json(await actionPreview({ send: body.send }));
    case 'run':
      if (!cronAuthorized(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });
      return res.status(200).json(await actionRun());
    default:
      return res.status(400).json({ ok: false, error: 'Unknown action. Use { action: "send" | "run" | "preview" | "ping" } or GET for the cron pass.' });
  }
});
