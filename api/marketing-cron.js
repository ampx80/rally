// api/marketing-cron.js
//
// Ardovo's SERVER-SIDE marketing scheduler + drip runner. This is the durable
// counterpart to the in-browser runners (src/lib/sequences-data.js
// useSequenceRunner + src/lib/marketing-engine.js runAutomation), which are now
// FALLBACKS ONLY: when this cron is wired (Supabase + RESEND_API_KEY) it drains
// due work server-side so a closed browser never stalls a cadence.
//
// It routes every message through the same hardened send pattern as
// api/broadcast.js -> api/_lib-email.js (Resend + retry/backoff + idempotency +
// suppression, a safe no-op without RESEND_API_KEY).
//
// Actions (GET query ?action= or POST { action }):
//   tick | drain | (bare GET)   Drain due drip work:
//                                  1) rally_sequence_outbox  (pending steps)
//                                  2) rally_scheduled_sends  (scheduled campaigns)
//                               Emits a HEARTBEAT within 5s (before any expensive
//                               op) and is fail-CLOSED: any crash is caught, a
//                               degraded_reason is persisted, and a summary is
//                               returned so the chain never stalls silently.
//   events                      List recent rally_email_events (feeds the
//                               engagement timeline UI). Env-gated on Supabase.
//   domain-status               Query Resend for domain SPF/DKIM/DMARC status
//                               (feeds the deliverability panel). Env-gated on
//                               RESEND_API_KEY.
//   suppression                 GET lists / POST { op:'add'|'remove', email,
//                               list:'excluded'|'unsubscribes' } the suppression
//                               tables. Env-gated on Supabase.
//   ping                        Health echo (no compute).
//
// vercel.json cron entry (report-only; apply during vercel.json assembly since
// this task may not edit vercel.json):
//   { "crons": [ { "path": "/api/marketing-cron", "schedule": "*/15 * * * *" } ] }
//
// Auth: a Vercel cron GET is trusted. When CRON_SECRET is set, an external
// trigger of the drain must present Authorization: Bearer <CRON_SECRET> (or
// x-cron-secret). The read-only actions (events / domain-status / ping) and the
// same-origin suppression manager are not gated by it.
//
// Env (all optional; absence degrades to a clean no-op, never throws):
//   RESEND_API_KEY                             required to actually send
//   ARDOVO_FROM / NOTIFY_FROM / RESEND_FROM     default sender (see _lib-email)
//   ARDOVO_UNSUBSCRIBE_EMAIL / NOTIFY_EMAIL     List-Unsubscribe mailbox
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY   durable outbox / schedule / events
//   MARKETING_ENABLED = "false"                hard kill-switch for the drain
//   MARKETING_DAILY_CAP                        per-run send ceiling (default 250)
//   CRON_SECRET                                gate for external drain triggers
//   APP_BASE_URL                               base for unsubscribe links
//
// ASCII only. NO em-dash / en-dash. ASCII hyphen only.
import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';
import { sendEmail, escapeHtml, idempotencyKey, sleep, EMAIL_RE } from './_lib-email.js';

const MAX_DRAIN = 200;                 // hard ceiling of rows drained per pass
const DAILY_CAP_DEFAULT = 250;
const PACE_MS = 100;

export const config = { maxDuration: 300 };

const hasResend = () => !!process.env.RESEND_API_KEY;
const hasSupabase = () => !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const disabled = () => String(process.env.MARKETING_ENABLED || '').toLowerCase() === 'false';
const runCap = () => {
  const n = Number(process.env.MARKETING_DAILY_CAP);
  return Number.isFinite(n) && n > 0 ? Math.min(n, MAX_DRAIN) : DAILY_CAP_DEFAULT;
};

function cronAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const hdr = req.headers.authorization || '';
  const custom = req.headers['x-cron-secret'];
  return hdr === `Bearer ${secret}` || (custom && custom === secret);
}

async function getSupa() {
  if (!hasSupabase()) return null;
  try {
    const { createClient } = await import('@supabase/supabase-js');
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  } catch { return null; }
}

// ── HEARTBEAT: prove the run started within 5s, before any expensive op. ─────
// Best-effort insert to rally_cron_heartbeat; console.log is the guaranteed
// floor so the SLA is visible even without a table. Never throws.
async function heartbeat(supa, note) {
  console.log(`[marketing-cron] heartbeat ${new Date().toISOString()} ${note || ''}`);
  if (!supa) return;
  try {
    await supa.from('rally_cron_heartbeat').insert({ source: 'marketing-cron', note: note || null, at: new Date().toISOString() });
  } catch { /* best-effort; console.log already satisfies the visible floor */ }
}

// ── send one sequence-outbox step (mirrors api/sequence-tick.js sendStep). ───
function textToBodyHtml(text) {
  const safe = escapeHtml(String(text || ''));
  const paras = safe.split(/\n{2,}/).map(p => p.replace(/\n/g, '<br/>')).filter(Boolean);
  return paras.length ? paras.map(p => `<p style="margin:0 0 14px;">${p}</p>`).join('') : '';
}

async function drainSequenceOutbox(supa, budget) {
  let rows;
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supa
      .from('rally_sequence_outbox')
      .select('id,to_email,subject,body_text,sequence_name,idempotency_key')
      .eq('status', 'pending')
      .lte('scheduled_at', nowIso)
      .limit(Math.min(budget, MAX_DRAIN));
    if (error) return { drained: 0, sent: 0, failed: 0, skipped: 0, reason: 'no-outbox' };
    rows = Array.isArray(data) ? data : [];
  } catch {
    return { drained: 0, sent: 0, failed: 0, skipped: 0, reason: 'no-outbox' };
  }

  let sent = 0, failed = 0, skipped = 0;
  for (const r of rows) {
    const to = String(r.to_email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(to)) { skipped++; continue; }
    const out = await sendEmail({
      to,
      subject: String(r.subject || 'A quick note').slice(0, 300),
      bodyHtml: textToBodyHtml(r.body_text),
      text: r.body_text || undefined,
      category: 'sequence',
      eyebrow: String(r.sequence_name || 'Ardovo sequence').slice(0, 80),
      idempotencyKey: r.idempotency_key || undefined,
    });
    const status = out.ok ? 'sent' : (out.skipped ? 'skipped' : 'failed');
    if (out.ok && !out.suppressed && !out.idempotent_skip) sent++;
    else if (out.skipped || out.suppressed || out.idempotent_skip) skipped++;
    else failed++;
    try {
      await supa.from('rally_sequence_outbox')
        .update({ status, sent_at: new Date().toISOString(), error_message: out.error || null })
        .eq('id', r.id);
    } catch { /* best-effort; idempotency key still guards a re-drain */ }
    await sleep(PACE_MS);
  }
  return { drained: rows.length, sent, failed, skipped };
}

// ── drain scheduled campaigns (mirrors api/broadcast.js per-recipient send). ─
// A rally_scheduled_sends row carries an already-resolved recipient list so the
// cron never has to reach into the client-only book of business:
//   { id, campaign_id, subject, body_text, design_html, design_text,
//     recipients: [{ email, firstName, company }], scheduled_at, status }
function bodyToHtml(text) {
  const blocks = String(text || '').replace(/\r\n/g, '\n').split(/\n{2,}/);
  return blocks
    .map((b) => `<p style="margin:0 0 16px;">${escapeHtml(b).replace(/\n/g, '<br/>')}</p>`)
    .filter(Boolean)
    .join('');
}
function applyTokens(text, vars = {}) {
  if (text == null) return '';
  const first = (vars.firstName && String(vars.firstName).trim()) || 'there';
  const company = (vars.company && String(vars.company).trim()) || 'your team';
  return String(text)
    .replace(/\{\s*firstName\s*\}/gi, first)
    .replace(/\{\s*company\s*\}/gi, company);
}

async function drainScheduledSends(supa, budget, baseUrl) {
  let rows;
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supa
      .from('rally_scheduled_sends')
      .select('id,campaign_id,subject,body_text,design_html,design_text,recipients,reply_to')
      .eq('status', 'scheduled')
      .lte('scheduled_at', nowIso)
      .limit(20);
    if (error) return { campaigns: 0, sent: 0, failed: 0, skipped: 0, reason: 'no-schedule' };
    rows = Array.isArray(data) ? data : [];
  } catch {
    return { campaigns: 0, sent: 0, failed: 0, skipped: 0, reason: 'no-schedule' };
  }

  const unsubMail = process.env.ARDOVO_UNSUBSCRIBE_EMAIL || process.env.NOTIFY_EMAIL || 'unsubscribe@ardovo.com';
  let sent = 0, failed = 0, skipped = 0, remaining = budget, done = 0;

  for (const row of rows) {
    if (remaining <= 0) break;
    const campaignId = String(row.campaign_id || row.id || 'adhoc').slice(0, 64);
    const subject = String(row.subject || '').trim();
    const recipients = Array.isArray(row.recipients) ? row.recipients : [];
    const isDesign = !!(row.design_html && String(row.design_html).trim());
    let cSent = 0, cFailed = 0;

    for (const r of recipients) {
      if (remaining <= 0) break;
      const email = String(r?.email || '').trim();
      if (!EMAIL_RE.test(email)) { skipped++; continue; }
      const vars = { firstName: r.firstName, company: r.company };
      const renderedSubject = applyTokens(subject, vars);
      const unsubUrl = `mailto:${unsubMail}?subject=${encodeURIComponent(`Unsubscribe ${email}`)}`;
      const idem = idempotencyKey([campaignId, email.toLowerCase(), renderedSubject]);
      const common = {
        to: email, subject: renderedSubject, idempotencyKey: idem,
        category: 'marketing-broadcast',
        headers: { 'List-Unsubscribe': `<${unsubUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
        replyTo: row.reply_to || undefined,
      };
      let out;
      if (isDesign) {
        out = await sendEmail({ ...common, html: applyTokens(row.design_html, vars), text: `${applyTokens(row.design_text || subject, vars)}\n\nUnsubscribe: ${unsubUrl}`, wrap: false });
      } else {
        out = await sendEmail({ ...common, bodyHtml: bodyToHtml(applyTokens(row.body_text, vars)), text: `${applyTokens(row.body_text, vars)}\n\nUnsubscribe: ${unsubUrl}`, preheader: renderedSubject });
      }
      if (out.ok && !out.suppressed && !out.idempotent_skip) { sent++; cSent++; remaining--; }
      else if (out.skipped || out.suppressed || out.idempotent_skip) skipped++;
      else { failed++; cFailed++; }
      await sleep(PACE_MS);
    }

    try {
      await supa.from('rally_scheduled_sends')
        .update({ status: 'sent', sent_at: new Date().toISOString(), sent_count: cSent, failed_count: cFailed })
        .eq('id', row.id);
    } catch { /* best-effort; idempotency guards a re-drain */ }
    done++;
  }
  return { campaigns: done, sent, failed, skipped };
}

// ── action=tick: the durable drip drain. Heartbeat first, fail-closed. ───────
async function actionTick(baseUrl) {
  if (disabled()) return { ok: true, ran: false, reason: 'MARKETING_ENABLED=false.' };
  const supa = await getSupa();
  // Heartbeat BEFORE anything expensive (postgres connect above is the only
  // cold-start tail; console.log floor already fired inside heartbeat()).
  await heartbeat(supa, 'tick');

  if (!hasResend()) {
    return { ok: true, ran: false, sent: 0, reason: 'RESEND_API_KEY not set; nothing sent. Browser runner is the fallback.' };
  }
  if (!supa) {
    return {
      ok: true, ran: false, sent: 0,
      reason: 'No durable store configured. Sequences + campaigns run in the browser (fallback runner); the cron is a no-op here by design.',
      at: new Date().toISOString(),
    };
  }

  const budget = runCap();
  try {
    const seq = await drainSequenceOutbox(supa, budget);
    const camp = await drainScheduledSends(supa, Math.max(0, budget - seq.sent), baseUrl);
    return {
      ok: true, ran: true,
      sequence: seq, campaigns: camp,
      sent: seq.sent + camp.sent, failed: seq.failed + camp.failed, skipped: seq.skipped + camp.skipped,
      at: new Date().toISOString(),
    };
  } catch (e) {
    // Fail-CLOSED: persist a degraded reason + return a summary so the chain
    // never stalls silently. The idempotency keys make a re-drain safe.
    const degraded_reason = (e && e.message) || 'drain_failed';
    try { await supa.from('rally_cron_heartbeat').insert({ source: 'marketing-cron', note: `degraded: ${degraded_reason}`, at: new Date().toISOString() }); } catch {}
    console.error('[marketing-cron] drain failed:', degraded_reason);
    return { ok: false, ran: true, sent: 0, degraded_reason, at: new Date().toISOString() };
  }
}

// ── action=events: recent engagement events for the timeline UI. ─────────────
async function actionEvents(limit) {
  const supa = await getSupa();
  if (!supa) return { ok: true, configured: false, events: [], reason: 'No durable store; UI uses local demo events.' };
  try {
    const { data, error } = await supa
      .from('rally_email_events')
      .select('id,resend_id,email,type,link,created_at')
      .order('created_at', { ascending: false })
      .limit(Math.min(Number(limit) || 200, 1000));
    if (error) return { ok: true, configured: false, events: [], reason: error.message };
    return { ok: true, configured: true, events: Array.isArray(data) ? data : [] };
  } catch (e) {
    return { ok: true, configured: false, events: [], reason: (e && e.message) || 'events_read_failed' };
  }
}

// ── action=domain-status: Resend domain SPF/DKIM/DMARC verification state. ───
async function actionDomainStatus() {
  if (!hasResend()) return { ok: true, configured: false, domains: [], reason: 'RESEND_API_KEY not set; showing DNS setup guidance only.' };
  try {
    const res = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    });
    if (!res.ok) return { ok: true, configured: true, domains: [], reason: `Resend HTTP ${res.status}` };
    const json = await res.json().catch(() => ({}));
    const list = Array.isArray(json?.data) ? json.data : [];
    const domains = list.map(d => ({
      id: d.id, name: d.name, status: d.status, region: d.region || null,
      records: Array.isArray(d.records) ? d.records.map(r => ({
        record: r.record || r.type, type: r.type, name: r.name, value: r.value, status: r.status, ttl: r.ttl,
      })) : [],
    }));
    return { ok: true, configured: true, domains };
  } catch (e) {
    return { ok: true, configured: true, domains: [], reason: (e && e.message) || 'domain_status_failed' };
  }
}

// ── action=suppression: list / add / remove suppression entries. ─────────────
const SUPP_TABLE = { excluded: 'rally_email_excluded', unsubscribes: 'rally_email_unsubscribes' };

async function suppressionList(supa) {
  const out = { excluded: [], unsubscribes: [] };
  for (const key of Object.keys(SUPP_TABLE)) {
    try {
      const { data } = await supa.from(SUPP_TABLE[key]).select('email,reason,created_at').order('created_at', { ascending: false }).limit(500);
      out[key] = Array.isArray(data) ? data : [];
    } catch { out[key] = []; }
  }
  return out;
}

async function actionSuppression(req, body) {
  const supa = await getSupa();
  if (!supa) return { ok: true, configured: false, excluded: [], unsubscribes: [], reason: 'No durable store; suppression is local-only in this environment.' };

  const method = (req.method || 'GET').toUpperCase();
  if (method === 'GET') {
    const lists = await suppressionList(supa);
    return { ok: true, configured: true, ...lists };
  }

  const op = String(body.op || '').toLowerCase();
  const email = String(body.email || '').trim().toLowerCase();
  const table = SUPP_TABLE[body.list] || SUPP_TABLE.excluded;
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'A valid email is required.' };

  try {
    if (op === 'remove') {
      await supa.from(table).delete().eq('email', email);
    } else {
      try { await supa.from(table).upsert({ email, reason: body.reason || 'manual', created_at: new Date().toISOString() }, { onConflict: 'email' }); }
      catch { await supa.from(table).insert({ email, reason: body.reason || 'manual' }); }
    }
  } catch (e) {
    return { ok: false, error: (e && e.message) || 'suppression_write_failed' };
  }
  const lists = await suppressionList(supa);
  return { ok: true, configured: true, op: op || 'add', email, ...lists };
}

export default withErrorHandling(async (req, res) => {
  const method = (req.method || 'GET').toUpperCase();
  const body = method === 'POST' ? readJsonBody(req) : {};
  const action = String((req.query && req.query.action) || body.action || (method === 'GET' ? 'tick' : '')).toLowerCase();
  const baseUrl = (process.env.APP_BASE_URL || (req.headers?.host ? `https://${req.headers.host}` : 'https://ardovo.com')).replace(/\/+$/, '');

  switch (action) {
    case 'ping':
      return res.status(200).json({ ok: true, service: 'marketing-cron', resend: hasResend(), durable: hasSupabase() });
    case 'events':
      return res.status(200).json(await actionEvents((req.query && req.query.limit) || body.limit));
    case 'domain-status':
    case 'domains':
      return res.status(200).json(await actionDomainStatus());
    case 'suppression':
      return res.status(200).json(await actionSuppression(req, body));
    case 'tick':
    case 'drain':
    case '':
      if (!cronAuthorized(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });
      return res.status(200).json(await actionTick(baseUrl));
    default:
      if (method !== 'GET' && method !== 'POST') return methodNotAllowed(res, ['GET', 'POST']);
      return res.status(400).json({ ok: false, error: 'Unknown action. Use tick | events | domain-status | suppression | ping.' });
  }
});
