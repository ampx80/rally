// POST /api/prequalify
//
// Sales pre-qualification capture. A prospect submits the /get-started form;
// this (1) emails the team the full submission with the computed fit tier via
// Resend, (2) best-effort persists to Supabase, (3) forwards into the LDS
// cross-app capture system, and (4) when the lead is qualified AND a voice
// provider is configured, fires an outbound AI qualification call. None of the
// downstream channels can block the response. PII is never logged.
//
// Env:
//   RESEND_API_KEY   - email the team (studio-wide key)
//   NOTIFY_EMAIL     - recipient (defaults to nate@amptekgrowth.com)
//   NOTIFY_FROM      - sender
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY - optional durable storage
//   VAPI_API_KEY / VAPI_ASSISTANT_ID / VAPI_PHONE_NUMBER_ID - optional voice qualifier
// NO em-dash / en-dash. ASCII only.
import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const clean = (s, max = 200) => String(s == null ? '' : s).trim().slice(0, max);

const TIER_LABEL = { qualified: 'QUALIFIED', review: 'Review', low: 'Not a fit (self-serve)' };

async function emailTeam(f) {
  if (!process.env.RESEND_API_KEY) return { ok: false, skipped: 'no-api-key' };
  const to = (process.env.NOTIFY_EMAIL || process.env.NOTIFY_DEFAULT_TO || 'nate@amptekgrowth.com').trim();
  const from = process.env.NOTIFY_FROM || process.env.RESEND_FROM || 'Rally Sales <onboarding@resend.dev>';
  const answerRows = Object.entries(f.answers || {}).map(([k, v]) => [k, v]);
  const rows = [
    ['Name', f.name], ['Work email', f.email], ['Phone', f.phone], ['Company', f.company],
    ['Fit tier', TIER_LABEL[f.tier] || f.tier], ['Fit score', String(f.score)], ['Source', f.sourceUrl],
    ...answerRows,
  ].filter(([, v]) => v != null && v !== '');
  const accent = f.tier === 'qualified' ? '#0e9f8f' : f.tier === 'review' ? '#e0752d' : '#7c5cf7';
  const html = `
<!doctype html><html><body style="margin:0;background:#0b0d14;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#e7e9f0;">
  <div style="max-width:560px;margin:36px auto;padding:32px;background:#12141f;border:1px solid #262a3d;border-radius:16px;">
    <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:${accent};margin-bottom:14px;font-weight:700;">Rally pre-qualification</div>
    <h1 style="font-size:24px;line-height:1.2;margin:0 0 6px;color:#fff;">New ${esc(TIER_LABEL[f.tier] || f.tier)} lead</h1>
    <p style="font-size:15px;color:#a3a7ba;margin:0 0 22px;">${esc(f.name || f.email)} just pre-qualified for Rally.</p>
    <table style="width:100%;border-collapse:collapse;font-size:15px;">
      ${rows.map(([k, v]) => `<tr><td style="padding:9px 0;color:#8a8fa3;width:140px;vertical-align:top;">${esc(k)}</td><td style="padding:9px 0;color:#fff;font-weight:600;">${esc(v)}</td></tr>`).join('')}
    </table>
    <hr style="border:none;border-top:1px solid #262a3d;margin:22px 0;">
    <p style="font-size:12px;color:#6b7085;margin:0;">Reply directly to reach them. Captured ${esc(new Date().toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short' }))} ET.</p>
  </div>
</body></html>`.trim();
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject: `Rally ${TIER_LABEL[f.tier] || 'lead'}: ${f.name || f.email}`, html, reply_to: f.email }),
  });
  if (!r.ok) { console.warn('[prequalify] resend', r.status); return { ok: false, status: r.status }; }
  return { ok: true };
}

async function persist(f) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { ok: false, skipped: 'no-db' };
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { error } = await supa.from('rally_prequal').insert({
      name: f.name, email: f.email, phone: f.phone, company: f.company,
      fit_tier: f.tier, fit_score: f.score, answers: f.answers, source_url: f.sourceUrl,
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
      body: JSON.stringify({
        app_slug: 'rally', email: f.email, source_url: f.sourceUrl,
        metadata: { name: f.name, phone: f.phone, company: f.company, prequal: true, fit_tier: f.tier, fit_score: f.score },
      }),
    });
    return { ok: true };
  } catch (e) { return { ok: false, error: e?.message }; }
}

// Fire an outbound AI qualification call via Vapi (only when qualified + configured).
async function triggerVoiceCall(f) {
  const { VAPI_API_KEY, VAPI_ASSISTANT_ID, VAPI_PHONE_NUMBER_ID } = process.env;
  if (!VAPI_API_KEY || !VAPI_ASSISTANT_ID || !VAPI_PHONE_NUMBER_ID) return { ok: false, skipped: 'no-voice' };
  const digits = String(f.phone || '').replace(/[^\d+]/g, '');
  if (!digits) return { ok: false, skipped: 'no-phone' };
  const number = digits.startsWith('+') ? digits : `+1${digits.replace(/\D/g, '')}`;
  try {
    const r = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: { Authorization: `Bearer ${VAPI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assistantId: VAPI_ASSISTANT_ID,
        phoneNumberId: VAPI_PHONE_NUMBER_ID,
        customer: { number, name: f.name || undefined },
        assistantOverrides: {
          variableValues: { name: f.name, company: f.company, fitTier: f.tier, fitScore: f.score },
        },
      }),
    });
    if (!r.ok) { console.warn('[prequalify] vapi', r.status); return { ok: false, status: r.status }; }
    const j = await r.json().catch(() => ({}));
    return { ok: true, callId: j?.id || null };
  } catch (e) { return { ok: false, error: e?.message }; }
}

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  const b = readJsonBody(req);
  const email = clean(b.email, 160).toLowerCase();
  if (!EMAIL_RE.test(email)) return res.status(400).json({ ok: false, error: 'A valid email is required.' });

  const answers = {};
  if (b.answers && typeof b.answers === 'object') {
    for (const [k, v] of Object.entries(b.answers)) answers[clean(k, 40)] = clean(v, 400);
  }
  const tier = ['qualified', 'review', 'low'].includes(b.tier) ? b.tier : 'review';
  const f = {
    name: clean(b.name, 120), email,
    phone: clean(b.phone, 40),
    company: clean(b.company, 160),
    tier,
    score: Math.max(0, Math.min(1000, Number(b.score) || 0)),
    answers,
    sourceUrl: clean(b.sourceUrl || req.headers?.referer, 300),
  };

  const tasks = [emailTeam(f), persist(f), forwardToLds(f)];
  if (tier === 'qualified') tasks.push(triggerVoiceCall(f));
  const settled = await Promise.allSettled(tasks);
  console.log(`[prequalify] captured ${tier} lead for rally`); // no PII

  const emailed = settled[0].status === 'fulfilled' && settled[0].value?.ok === true;
  const voice = tier === 'qualified' && settled[3]?.status === 'fulfilled' && settled[3].value?.ok === true;
  return res.status(200).json({ ok: true, emailed, voiceQueued: voice, tier });
});
