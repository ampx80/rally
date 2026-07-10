// POST /api/waitlist
//
// Coming-soon waitlist capture for Rally. When someone requests early access
// we (1) email Nate the full signup via Resend, (2) best-effort persist the
// row to Supabase for durability, and (3) best-effort forward it into the LDS
// cross-app capture system. None of the downstream channels can block or fail
// the signer - the form always gets a clean response as long as the payload is
// valid. PII (emails, phones) is never logged. NO em-dash / en-dash.
//
// Env:
//   RESEND_API_KEY   - required for the email to actually send (studio-wide key)
//   NOTIFY_EMAIL     - recipient (defaults to nate@amptekgrowth.com)
//   NOTIFY_FROM      - sender (defaults to Rally Waitlist <onboarding@resend.dev>)
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY - optional durable storage
import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const clean = (s, max = 200) => String(s == null ? '' : s).trim().slice(0, max);

async function emailNate(f) {
  if (!process.env.RESEND_API_KEY) return { ok: false, skipped: 'no-api-key' };
  const to = (process.env.NOTIFY_EMAIL || process.env.NOTIFY_DEFAULT_TO || 'nate@amptekgrowth.com').trim();
  const from = process.env.NOTIFY_FROM || process.env.RESEND_FROM || 'Rally Waitlist <onboarding@resend.dev>';
  const rows = [
    ['Name', f.name], ['Email', f.email], ['Phone', f.phone], ['Company', f.company],
    ['Company size', f.companySize], ['Industry', f.industry], ['Source', f.sourceUrl],
  ].filter(([, v]) => v);
  const html = `
<!doctype html><html><body style="margin:0;background:#0b0d14;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#e7e9f0;">
  <div style="max-width:560px;margin:36px auto;padding:32px;background:#12141f;border:1px solid #262a3d;border-radius:16px;">
    <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#8b8ff5;margin-bottom:14px;font-weight:700;">Rally waitlist</div>
    <h1 style="font-size:24px;line-height:1.2;margin:0 0 6px;color:#fff;">New early-access request</h1>
    <p style="font-size:15px;color:#a3a7ba;margin:0 0 22px;">${esc(f.name || f.email)} just asked to get into Rally.</p>
    <table style="width:100%;border-collapse:collapse;font-size:15px;">
      ${rows.map(([k, v]) => `<tr><td style="padding:9px 0;color:#8a8fa3;width:130px;vertical-align:top;">${esc(k)}</td><td style="padding:9px 0;color:#fff;font-weight:600;">${esc(v)}</td></tr>`).join('')}
    </table>
    <hr style="border:none;border-top:1px solid #262a3d;margin:22px 0;">
    <p style="font-size:12px;color:#6b7085;margin:0;">Reply directly to reach them. Captured ${esc(new Date().toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short' }))} ET.</p>
  </div>
</body></html>`.trim();
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject: `New Rally waitlist signup: ${f.name || f.email}`, html, reply_to: f.email }),
  });
  if (!r.ok) { console.warn('[waitlist] resend', r.status); return { ok: false, status: r.status }; }
  const j = await r.json().catch(() => ({}));
  return { ok: true, id: j?.id || null };
}

async function persist(f) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { ok: false, skipped: 'no-db' };
  const { createClient } = await import('@supabase/supabase-js');
  const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { error } = await supa.from('rally_waitlist').insert({
    name: f.name, email: f.email, phone: f.phone, company: f.company,
    company_size: f.companySize, industry: f.industry, source_url: f.sourceUrl, user_agent: f.userAgent,
  });
  if (error) { console.warn('[waitlist] db insert skipped:', error.message); return { ok: false, error: error.message }; }
  return { ok: true };
}

async function forwardToLds(f) {
  const base = (process.env.LDS_URL || 'https://lds-command-center.vercel.app').replace(/\/$/, '');
  try {
    await fetch(`${base}/api/capture-user`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_slug: 'rally', email: f.email, source_url: f.sourceUrl,
        metadata: { name: f.name, phone: f.phone, company: f.company, company_size: f.companySize, industry: f.industry, waitlist: true },
      }),
    });
    return { ok: true };
  } catch (e) { return { ok: false, error: e?.message }; }
}

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  const b = readJsonBody(req);
  const email = clean(b.email, 160).toLowerCase();
  const name = clean(b.name, 120);
  if (!EMAIL_RE.test(email)) return res.status(400).json({ ok: false, error: 'A valid email is required.' });

  const f = {
    name, email,
    phone: clean(b.phone, 40),
    company: clean(b.company, 160),
    companySize: clean(b.companySize, 40),
    industry: clean(b.industry, 80),
    sourceUrl: clean(b.sourceUrl || req.headers?.referer, 300),
    userAgent: clean(req.headers?.['user-agent'], 300),
  };

  const [mail] = await Promise.allSettled([emailNate(f), persist(f), forwardToLds(f)]);
  console.log('[waitlist] captured signup for rally'); // no PII
  const emailed = mail.status === 'fulfilled' && mail.value?.ok === true;
  return res.status(200).json({ ok: true, emailed });
});
