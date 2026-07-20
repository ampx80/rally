// POST /api/prequalify
//
// Ardova early-release qualifying capture. A prospect submits the /get-started
// flow whose hero question is "How badly do you want to leave Salesforce?"
// (1-10). urgency drives everything:
//   hot (>=7)      -> email + INSTANT SMS alert to Nate + persist + optional AI call
//   nurture (4-6)  -> email + persist (added to a sequence)
//   waitlist (<=3) -> email + persist
// urgency is stored as a first-class column so the pipeline sorts by how bad
// they want out. No channel can block the response. PII is never logged.
//
// Env:
//   RESEND_API_KEY, NOTIFY_EMAIL, NOTIFY_FROM        - email the team
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM, ALERT_SMS_TO - instant HOT SMS
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY          - durable lead table (rally_prequal)
//   RETELL_* or VAPI_*                               - optional outbound AI call on HOT
//   LDS_URL                                          - cross-app capture
// NO em-dash / en-dash. ASCII only.
import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const clean = (s, max = 200) => String(s == null ? '' : s).trim().slice(0, max);

const TOOL_LABEL = { salesforce: 'Salesforce', hubspot: 'HubSpot', gohighlevel: 'GoHighLevel', zoho: 'Zoho', spreadsheets: 'Spreadsheets', other: 'Something else' };
const ROUTE_UPPER = { hot: 'HOT', nurture: 'NURTURE', waitlist: 'WAITLIST' };
const toolName = (v) => TOOL_LABEL[v] || v || '';
function urgencyLabel(u) {
  if (u >= 10) return 'Get me the hell out'; if (u >= 9) return 'Ready to switch';
  if (u >= 7) return 'Actively looking'; if (u >= 4) return 'Frustrated'; return 'Just curious';
}
function routeFor(u) { return u >= 7 ? 'hot' : u >= 4 ? 'nurture' : 'waitlist'; }

async function emailTeam(f) {
  if (!process.env.RESEND_API_KEY) return { ok: false, skipped: 'no-api-key' };
  const to = (process.env.NOTIFY_EMAIL || process.env.NOTIFY_DEFAULT_TO || 'nate@amptekgrowth.com').trim();
  const from = process.env.NOTIFY_FROM || process.env.RESEND_FROM || 'Ardova Sales <onboarding@resend.dev>';
  const accent = f.route === 'hot' ? '#0e9f8f' : f.route === 'nurture' ? '#e0752d' : '#7c5cf7';
  const rows = [
    ['Urgency', `${f.urgency} / 10  (${urgencyLabel(f.urgency)})`],
    ['Name', f.name], ['Work email', f.email], ['Phone', f.phone], ['Company', f.company],
    ['Currently on', toolName(f.currentTool)], ['Seats', f.seats], ['Source', f.sourceUrl],
  ].filter(([, v]) => v != null && v !== '');
  const painBlock = f.pain
    ? `<div style="margin:18px 0 6px;padding:16px;background:#0e1119;border:1px solid ${accent};border-radius:12px;">
         <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:${accent};font-weight:800;margin-bottom:8px;">Why they want out (their words)</div>
         <div style="font-size:16px;line-height:1.5;color:#fff;font-style:italic;">"${esc(f.pain)}"</div>
       </div>` : '';
  const html = `
<!doctype html><html><body style="margin:0;background:#0b0d14;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#e7e9f0;">
  <div style="max-width:580px;margin:36px auto;padding:32px;background:#12141f;border:1px solid #262a3d;border-radius:16px;">
    <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:${accent};margin-bottom:14px;font-weight:800;">Ardova early-release lead</div>
    <h1 style="font-size:24px;line-height:1.2;margin:0 0 6px;color:#fff;">${esc(ROUTE_UPPER[f.route] || 'Lead')} - ${f.urgency}/10 out of Salesforce</h1>
    <p style="font-size:15px;color:#a3a7ba;margin:0 0 18px;">${esc(f.name || f.email)}${f.company ? ` at ${esc(f.company)}` : ''}, currently on ${esc(toolName(f.currentTool) || 'unknown')}.</p>
    ${painBlock}
    <table style="width:100%;border-collapse:collapse;font-size:15px;margin-top:8px;">
      ${rows.map(([k, v]) => `<tr><td style="padding:9px 0;color:#8a8fa3;width:150px;vertical-align:top;">${esc(k)}</td><td style="padding:9px 0;color:#fff;font-weight:600;">${esc(v)}</td></tr>`).join('')}
    </table>
    <hr style="border:none;border-top:1px solid #262a3d;margin:22px 0;">
    <p style="font-size:12px;color:#6b7085;margin:0;">Reply to reach them. Captured ${esc(new Date().toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short' }))} ET.</p>
  </div>
</body></html>`.trim();
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject: `Ardova ${ROUTE_UPPER[f.route] || 'lead'} ${f.urgency}/10: ${f.name || f.email}`, html, reply_to: f.email }),
  });
  if (!r.ok) { console.warn('[prequalify] resend', r.status); return { ok: false, status: r.status }; }
  return { ok: true };
}

// Instant SMS to Nate the moment a HOT lead lands. Twilio REST, never blocks.
async function alertNate(f) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM } = process.env;
  const to = (process.env.ALERT_SMS_TO || process.env.NATE_ALERT_PHONE || '').trim();
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM || !to) return { ok: false, skipped: 'no-twilio' };
  const body = `HOT Ardova lead ${f.urgency}/10: ${f.name || f.email}${f.company ? ` @ ${f.company}` : ''} on ${toolName(f.currentTool) || '?'} (${f.seats || '?'} seats).`
    + (f.pain ? ` Pain: "${f.pain.slice(0, 120)}".` : '')
    + ` ${f.email}${f.phone ? ' ' + f.phone : ''}`;
  try {
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    const params = new URLSearchParams({ From: TWILIO_FROM, To: to, Body: body.slice(0, 600) });
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: params,
    });
    if (!r.ok) { console.warn('[prequalify] twilio', r.status); return { ok: false, status: r.status }; }
    return { ok: true };
  } catch (e) { return { ok: false, error: e?.message }; }
}

async function persist(f) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { ok: false, skipped: 'no-db' };
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { error } = await supa.from('rally_prequal').insert({
      name: f.name, email: f.email, phone: f.phone, company: f.company,
      urgency_score: f.urgency, route: f.route, current_tool: f.currentTool, seats: f.seats,
      pain: f.pain, lead_source: 'get-started', source_url: f.sourceUrl,
    });
    if (error) { console.warn('[prequalify] db insert skipped:', error.message); return { ok: false, error: error.message }; }
    return { ok: true };
  } catch (e) { return { ok: false, error: e?.message }; }
}

async function forwardToLds(f) {
  const base = (process.env.LDS_URL || 'https://lds-command-center.vercel.app').replace(/\/$/, '');
  try {
    await fetch(`${base}/api/capture-user`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_slug: 'rally', email: f.email, source_url: f.sourceUrl,
        metadata: { name: f.name, phone: f.phone, company: f.company, prequal: true, urgency: f.urgency, route: f.route, current_tool: f.currentTool, seats: f.seats } }),
    });
    return { ok: true };
  } catch (e) { return { ok: false, error: e?.message }; }
}

function toE164(phone) {
  const digits = String(phone || '').replace(/[^\d+]/g, '');
  if (!digits) return '';
  return digits.startsWith('+') ? digits : `+1${digits.replace(/\D/g, '')}`;
}

// Optional outbound AI qualification call on HOT leads (Retell preferred, Vapi fallback).
async function triggerVoiceCall(f) {
  const number = toE164(f.phone);
  if (!number) return { ok: false, skipped: 'no-phone' };
  const vars = {
    name: f.name || '', company: f.company || '', email: f.email || '', phone: f.phone || '',
    urgency: String(f.urgency), currentCrm: toolName(f.currentTool), seats: f.seats || '', pain: f.pain || '',
    formSummary: `${f.urgency}/10 out of Salesforce, on ${toolName(f.currentTool) || 'unknown'}, ${f.seats || '?'} seats. Pain: ${f.pain || 'n/a'}`,
  };
  const { RETELL_API_KEY, RETELL_AGENT_ID, RETELL_FROM_NUMBER } = process.env;
  if (RETELL_API_KEY && RETELL_AGENT_ID && RETELL_FROM_NUMBER) {
    try {
      const r = await fetch('https://api.retellai.com/v2/create-phone-call', {
        method: 'POST', headers: { Authorization: `Bearer ${RETELL_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_number: RETELL_FROM_NUMBER, to_number: number, override_agent_id: RETELL_AGENT_ID, retell_llm_dynamic_variables: vars, metadata: { source: 'rally-prequal', email: f.email, route: f.route } }),
      });
      if (!r.ok) return { ok: false, provider: 'retell', status: r.status };
      const j = await r.json().catch(() => ({}));
      return { ok: true, provider: 'retell', callId: j?.call_id || null };
    } catch (e) { return { ok: false, provider: 'retell', error: e?.message }; }
  }
  const { VAPI_API_KEY, VAPI_ASSISTANT_ID, VAPI_PHONE_NUMBER_ID } = process.env;
  if (VAPI_API_KEY && VAPI_ASSISTANT_ID && VAPI_PHONE_NUMBER_ID) {
    try {
      const r = await fetch('https://api.vapi.ai/call', {
        method: 'POST', headers: { Authorization: `Bearer ${VAPI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistantId: VAPI_ASSISTANT_ID, phoneNumberId: VAPI_PHONE_NUMBER_ID, customer: { number, name: f.name || undefined }, assistantOverrides: { variableValues: vars } }),
      });
      if (!r.ok) return { ok: false, provider: 'vapi', status: r.status };
      const j = await r.json().catch(() => ({}));
      return { ok: true, provider: 'vapi', callId: j?.id || null };
    } catch (e) { return { ok: false, provider: 'vapi', error: e?.message }; }
  }
  return { ok: false, skipped: 'no-voice' };
}

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  const b = readJsonBody(req);
  const email = clean(b.email, 160).toLowerCase();
  if (!EMAIL_RE.test(email)) return res.status(400).json({ ok: false, error: 'A valid email is required.' });

  const urgency = Math.max(1, Math.min(10, Math.round(Number(b.urgency) || 1)));
  const route = routeFor(urgency);
  const f = {
    name: clean(b.name, 120), email, phone: clean(b.phone, 40), company: clean(b.company, 160),
    urgency, route,
    currentTool: clean(b.currentTool, 40), seats: clean(b.seats, 20), pain: clean(b.pain, 600),
    sourceUrl: clean(b.sourceUrl || req.headers?.referer, 300),
  };

  const tasks = [emailTeam(f), persist(f), forwardToLds(f)];
  if (route === 'hot') { tasks.push(alertNate(f), triggerVoiceCall(f)); }
  const settled = await Promise.allSettled(tasks);
  console.log(`[prequalify] captured ${route} lead (${urgency}/10) for rally`); // no PII

  const ok = (i) => settled[i]?.status === 'fulfilled' && settled[i].value?.ok === true;
  return res.status(200).json({
    ok: true, route, urgency,
    emailed: ok(0),
    alerted: route === 'hot' ? ok(3) : false,
    voiceQueued: route === 'hot' ? ok(4) : false,
  });
});
