// src/lib/outreach.js
//
// Browser helper for Ardovo's AI outreach drafter. The browser posts a
// contact/deal context to the same-origin /api/outreach-draft endpoint and
// gets back a personalized email or short message in the rep's voice. If the
// network call fails, a local deterministic composer produces the same shape
// so the UI ALWAYS has a draft to show. NEVER throws.
//
//   draftOutreach({ channel, tone, context, instructions }) -> Promise<{ ok, draft, source, ... }>
//   contextFromContact(contact, opts)                       -> context object
//   contextFromDeal(deal, opts)                             -> context object
//   localDraft(channel, tone, context)                      -> { subject?, body }
//   TONES                                                   -> ordered tone chips
//
// This helper DRAFTS only; sending is a separate, hardened server path.
// ASCII only. No em-dash / en-dash.

export const TONES = [
  { key: 'warm', label: 'Warm' },
  { key: 'direct', label: 'Direct' },
  { key: 'formal', label: 'Formal' },
  { key: 'friendly', label: 'Friendly' },
];
const TONE_KEYS = new Set(TONES.map(t => t.key));

function money(n) {
  if (n == null || !Number.isFinite(Number(n))) return '';
  const v = Number(n);
  if (Math.abs(v) >= 1e6) return '$' + (v / 1e6).toFixed(v % 1e6 === 0 ? 0 : 1) + 'M';
  if (Math.abs(v) >= 1e3) return '$' + Math.round(v / 1e3) + 'K';
  return '$' + v;
}
function longDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' });
}

// ── context builders: turn Ardovo records into the endpoint's context shape ────
// Keep these small so a page can mount <DraftWithAI> with a single record.
export function contextFromContact(contact = {}, opts = {}) {
  const { company, sender, deal, goal, notes } = opts;
  return {
    contact: {
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      name: contact.firstName || contact.lastName ? undefined : (contact.name || ''),
      title: contact.title || '',
      email: contact.email || '',
      company: company?.name || contact.company || '',
      tags: Array.isArray(contact.tags) ? contact.tags : [],
      lifecycleStage: contact.lifecycleStage || '',
    },
    company: company ? { name: company.name, industry: company.industry, size: company.size } : undefined,
    deal: deal ? dealCtx(deal, company) : undefined,
    sender: sender ? { name: sender.name, title: sender.title } : undefined,
    goal: goal || '',
    notes: notes || '',
  };
}

function dealCtx(deal = {}, company) {
  return {
    name: deal.name || '',
    value: deal.value,
    stage: deal.stage || '',
    status: deal.status || '',
    probability: deal.probability,
    closeDate: deal.closeDate || null,
    company: company?.name || '',
  };
}

export function contextFromDeal(deal = {}, opts = {}) {
  const { company, contact, sender, goal, notes } = opts;
  return {
    deal: dealCtx(deal, company),
    company: company ? { name: company.name, industry: company.industry, size: company.size } : undefined,
    contact: contact ? {
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      title: contact.title || '',
      email: contact.email || '',
      company: company?.name || '',
    } : undefined,
    sender: sender ? { name: sender.name, title: sender.title } : undefined,
    goal: goal || '',
    notes: notes || '',
  };
}

// ── local deterministic composer (mirror of the server fallback) ──────────────
export function localDraft(channel = 'email', tone = 'warm', ctx = {}) {
  const c = ctx.contact || {};
  const d = ctx.deal || {};
  const co = ctx.company || {};
  const s = ctx.sender || {};
  const first = (c.firstName || (c.name ? String(c.name).split(' ')[0] : '') || 'there').trim();
  const coName = (d.company || co.name || c.company || 'your team').trim();
  const goal = (ctx.goal || '').trim();

  if (channel === 'message') {
    let bodyMsg;
    if (d.name) {
      bodyMsg = `Hi ${first}, quick note on ${d.name}. Wanted to keep our momentum going and make the next step easy on your side. Do you have a few minutes this week for a quick call? Happy to work around your schedule.`;
    } else if (goal) {
      bodyMsg = `Hi ${first}, reaching out to ${goal}. Would love a few minutes this week if you can spare it. Let me know what works and I will send an invite.`;
    } else {
      bodyMsg = `Hi ${first}, great connecting. Wanted to stay in touch and see how things are going on your end. Open to a quick call this week?`;
    }
    if (tone === 'direct') bodyMsg = bodyMsg.replace(/^Hi [^,]+, /, `${first} - `);
    return { body: bodyMsg };
  }

  const subject = goal
    ? goal.charAt(0).toUpperCase() + goal.slice(1)
    : (d.name ? `Following up on ${d.name}` : `Great connecting, ${first}`);

  const stageLine = d.stage ? `- Current stage: ${d.stage}\n` : '';
  const valueLine = d.value != null ? `- Investment under discussion: ${money(d.value)}\n` : '';
  const closeLine = d.closeDate ? `- Target timeline: ${longDate(d.closeDate)}\n` : '';
  const dealBlock = d.name
    ? `Where things stand:\n- Opportunity: ${d.name}\n${stageLine}${valueLine}${closeLine}\n`
    : '';
  const opener = goal
    ? `I wanted to follow up and ${goal}.`
    : (d.name
        ? `Thank you for the time your team${coName ? ` at ${coName}` : ''} has spent exploring how we can help. I wanted to follow up and keep our momentum going.`
        : `It was great connecting. I wanted to follow up and see how I can be useful as you think through next steps.`);
  const signName = (s.name || 'Your account team').trim();
  const signTitle = s.title ? `\n${s.title}` : '';

  const body =
`Hi ${first},

${opener}

${dealBlock}My goal is to make the next step easy. I am happy to pull together a tailored summary for your stakeholders, answer any open questions on scope or pricing, or set up a short working session with the right people on both sides.

Is there a good time this week for a quick call? I will work around your schedule.

Best regards,
${signName}${signTitle}
Ardovo`;

  return { subject, body };
}

// ── the network call. Never throws; always resolves to a usable draft. ────────
export async function draftOutreach({ channel = 'email', tone = 'warm', context = {}, instructions = '' } = {}) {
  const ch = channel === 'message' ? 'message' : 'email';
  const tn = TONE_KEYS.has(tone) ? tone : 'warm';
  if (typeof fetch !== 'function') {
    return { ok: true, channel: ch, tone: tn, source: 'fallback', draft: localDraft(ch, tn, context) };
  }
  try {
    const r = await fetch('/api/outreach-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: ch, tone: tn, context, instructions }),
    });
    const json = await r.json().catch(() => null);
    if (json && json.draft && json.draft.body) return json;
    // Endpoint reachable but shape was off -> local fallback.
    return { ok: true, channel: ch, tone: tn, source: 'fallback', draft: localDraft(ch, tn, context) };
  } catch {
    return { ok: true, channel: ch, tone: tn, source: 'fallback', draft: localDraft(ch, tn, context) };
  }
}
