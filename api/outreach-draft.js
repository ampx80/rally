// api/outreach-draft.js
//
// Rally's AI OUTREACH DRAFTER. Given a contact and/or deal context, Rook
// (Claude, via api/_lib-anthropic.js) drafts a personalized email or short
// message in the rep's own voice, matched to a requested tone. Adapted from
// Class Reunly's api/outreach-draft.js and re-skinned for Rally's revenue
// context (deals, pipeline stages, buying committee) instead of reunion
// outreach.
//
//   POST /api/outreach-draft
//   Body:
//     channel       'email' | 'message'                  (default 'email')
//     tone          'warm' | 'direct' | 'formal' | 'friendly'  (default 'warm')
//     instructions  string, optional freeform steer ("mention the pilot")
//     context: {
//       contact: { firstName, lastName, title, email, company, tags, lifecycleStage },
//       deal:    { name, value, stage, status, probability, closeDate, company },
//       company: { name, industry, size },
//       sender:  { name, title },
//       goal:    string   e.g. "follow up after the demo"
//       notes:   string   any extra grounding the rep typed
//     }
//
//   Returns (ALWAYS 200 with a usable draft; never leaves the caller empty):
//     { ok: true, draft: { subject?, body }, channel, tone, source: 'ai' | 'fallback', reason? }
//
// This endpoint DRAFTS only - it never sends. Any real send goes through the
// hardened primitive api/_lib-email.js from a separate route. Without
// ANTHROPIC_API_KEY (or on any model error) it returns a deterministic,
// personalized template so the UI always has something to review.
//
// ASCII only. NO em-dash / en-dash. ASCII hyphen only.

import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';
import { callAnthropic } from './_lib-anthropic.js';

export const config = { maxDuration: 45 };

const CHANNELS = new Set(['email', 'message']);
const TONES = {
  warm: 'Warm and personable but professional. Genuine and human, never salesy or gushing.',
  direct: 'Direct and concise. Respect their time, lead with the point, keep it tight.',
  formal: 'Polished and professional. Complete sentences, courteous, no slang.',
  friendly: 'Friendly and easy, like a note to a peer you already know. Light but still credible.',
};

// ── helpers ───────────────────────────────────────────────────────────────────
function money(n) {
  if (n == null || !Number.isFinite(Number(n))) return '';
  const v = Number(n);
  if (Math.abs(v) >= 1e6) return '$' + (v / 1e6).toFixed(v % 1e6 === 0 ? 0 : 1) + 'M';
  if (Math.abs(v) >= 1e3) return '$' + Math.round(v / 1e3) + 'K';
  return '$' + v;
}
function firstName(ctx) {
  const c = ctx.contact || {};
  return (c.firstName || (c.name ? String(c.name).split(' ')[0] : '') || 'there').trim();
}
function senderSignoff(ctx) {
  const s = ctx.sender || {};
  const name = (s.name || 'Your account team').trim();
  const title = s.title ? `\n${s.title}` : '';
  return `${name}${title}\nRally`;
}
function longDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' });
}

// Compact, model-readable summary of the context.
function contextToText(ctx) {
  const lines = [];
  const c = ctx.contact || {};
  const d = ctx.deal || {};
  const co = ctx.company || {};
  const s = ctx.sender || {};
  if (c.firstName || c.lastName || c.name) {
    lines.push(`Recipient: ${(c.name || `${c.firstName || ''} ${c.lastName || ''}`).trim()}${c.title ? `, ${c.title}` : ''}${c.company ? ` at ${c.company}` : (co.name ? ` at ${co.name}` : '')}.`);
  }
  if (c.email) lines.push(`Recipient email: ${c.email}`);
  if (c.lifecycleStage) lines.push(`Lifecycle stage: ${c.lifecycleStage}`);
  if (Array.isArray(c.tags) && c.tags.length) lines.push(`Recipient tags: ${c.tags.join(', ')}`);
  if (co.name) lines.push(`Company: ${co.name}${co.industry ? ` (${co.industry}${co.size ? `, ${co.size}` : ''})` : ''}.`);
  if (d.name) {
    const bits = [`Deal: ${d.name}`];
    if (d.value != null) bits.push(`value ${money(d.value)}`);
    if (d.stage) bits.push(`stage ${d.stage}`);
    if (d.status && d.status !== 'open') bits.push(`status ${d.status}`);
    if (d.probability != null) bits.push(`${d.probability}% win probability`);
    if (d.closeDate) bits.push(`target close ${longDate(d.closeDate)}`);
    lines.push(bits.join(', ') + '.');
  }
  if (ctx.goal) lines.push(`Goal of this message: ${ctx.goal}`);
  if (ctx.notes) lines.push(`Extra context from the rep: ${ctx.notes}`);
  lines.push(`Sender (write as this person): ${s.name || 'the account owner'}${s.title ? `, ${s.title}` : ''} at Rally.`);
  return lines.length ? lines.join('\n') : 'No structured context was provided; write a brief, friendly professional check-in.';
}

// ── deterministic fallback (no ANTHROPIC_API_KEY or model error) ──────────────
// Personalized to whatever context is present. Never throws.
function fallbackDraft(channel, tone, ctx) {
  const first = firstName(ctx);
  const d = ctx.deal || {};
  const co = ctx.company || {};
  const coName = (d.company || co.name || (ctx.contact && ctx.contact.company) || 'your team').trim();
  const goal = (ctx.goal || '').trim();

  if (channel === 'message') {
    let body;
    if (d.name) {
      body = `Hi ${first}, quick note on ${d.name}. Wanted to keep our momentum going and make the next step easy on your side. Do you have a few minutes this week for a quick call? Happy to work around your schedule.`;
    } else if (goal) {
      body = `Hi ${first}, reaching out to ${goal}. Would love a few minutes this week if you can spare it. Let me know what works and I will send an invite.`;
    } else {
      body = `Hi ${first}, great connecting. Wanted to stay in touch and see how things are going on your end. Open to a quick call this week?`;
    }
    // Formal tone gets a touch more courtesy; direct trims the opener.
    if (tone === 'direct') body = body.replace(/^Hi [^,]+, /, `${first} - `);
    return { body };
  }

  // email
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

  const body =
`Hi ${first},

${opener}

${dealBlock}My goal is to make the next step easy. I am happy to pull together a tailored summary for your stakeholders, answer any open questions on scope or pricing, or set up a short working session with the right people on both sides.

Is there a good time this week for a quick call? I will work around your schedule.

Best regards,
${senderSignoff(ctx)}`;

  return { subject, body };
}

// ── main ──────────────────────────────────────────────────────────────────────
export default withErrorHandling(async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  const body = readJsonBody(req);

  const channel = CHANNELS.has(String(body.channel)) ? String(body.channel) : 'email';
  const tone = TONES[body.tone] ? String(body.tone) : 'warm';
  const ctx = (body.context && typeof body.context === 'object') ? body.context : {};
  const instructions = typeof body.instructions === 'string' ? body.instructions.slice(0, 800) : '';

  // No key configured -> deterministic template. Same shape, source flagged.
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(200).json({
      ok: true, channel, tone, source: 'fallback',
      reason: 'ANTHROPIC_API_KEY not set; returned a deterministic personalized template.',
      draft: fallbackDraft(channel, tone, ctx),
    });
  }

  const schema = {
    type: 'object',
    properties: {
      subject: { type: 'string', description: 'Subject line, 4 to 9 words, specific, no clickbait. Email only.' },
      body: { type: 'string', description: 'The message body in the sender voice, plain text with real line breaks. No signature placeholders like [Name] - use the sender name provided.' },
    },
    required: channel === 'email' ? ['subject', 'body'] : ['body'],
  };

  const system = [
    'You are Rook, the AI operator inside Rally, an AI-native revenue platform.',
    'You draft outreach that a real revenue rep would be proud to send: personalized, grounded in the specific record, and written in the SENDER voice (first person, as the account owner named in the context).',
    channel === 'email'
      ? 'Draft ONE email: a specific subject line plus a body of roughly 90 to 150 words.'
      : 'Draft ONE short message (SMS or LinkedIn style): 40 to 70 words, no subject, no greeting block, just a tight personal note.',
    `Tone: ${TONES[tone]}`,
    'Rules: Reference the real details from the context (name, company, deal, stage) - never invent facts not present. One clear ask or next step. No emoji. At most one exclamation point across the whole message. Never use an em dash or en dash; use a normal hyphen. Do not use placeholder tokens like [First name] or {{company}} - fill everything in from the context. Sign with the sender name provided (email only).',
  ].join('\n');

  const prompt = [
    'CONTEXT:',
    contextToText(ctx),
    instructions ? `\nADDITIONAL INSTRUCTION FROM THE REP (follow it): ${instructions}` : '',
    `\nDraft the ${channel} now.`,
  ].join('\n');

  try {
    const out = await callAnthropic({ system, prompt, schema, maxTokens: 900, model: 'claude-sonnet-4-6' });
    const data = out?.data || {};
    const draft = channel === 'email'
      ? { subject: String(data.subject || '').trim(), body: String(data.body || '').trim() }
      : { body: String(data.body || '').trim() };
    // Strip any stray dashes the model slipped in (belt-and-suspenders on the platform rule).
    for (const k of Object.keys(draft)) {
      draft[k] = draft[k].split(String.fromCharCode(0x2014)).join('-').split(String.fromCharCode(0x2013)).join('-');
    }
    if (!draft.body) throw new Error('empty body from model');
    return res.status(200).json({ ok: true, channel, tone, source: 'ai', draft });
  } catch (e) {
    // Any model / network failure falls back to the deterministic template so the
    // rep always gets a usable draft to review.
    return res.status(200).json({
      ok: true, channel, tone, source: 'fallback',
      reason: `Model unavailable (${(e && e.message) || 'error'}); returned a deterministic personalized template.`,
      draft: fallbackDraft(channel, tone, ctx),
    });
  }
});
