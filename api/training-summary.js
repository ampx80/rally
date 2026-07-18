// POST /api/training-summary
//
// Turns a raw training-session log into a Zoom-style recap: a crisp one-liner
// managers can skim, plus fuller structured notes (what was covered, what the
// learner tried, suggested next steps). Env-gated: without ANTHROPIC_API_KEY
// it returns { ok:false, disabled:true } and the client keeps its deterministic
// summary. No PII beyond a first name. NO em-dash / en-dash. ASCII only.
import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';
import { callAnthropic } from './_lib-anthropic.js';

export const config = { maxDuration: 30 };

const SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'One or two crisp sentences a manager can skim: what was covered and how it went.' },
    notes: { type: 'string', description: 'Fuller recap: bullet-style plain text covering topics covered, what the learner practiced, gaps or open questions, and 1-3 suggested next modules.' },
  },
  required: ['summary', 'notes'],
};

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!process.env.ANTHROPIC_API_KEY) return res.status(200).json({ ok: false, disabled: true, reason: 'no-key' });

  const b = readJsonBody(req);
  const raw = String(b?.notes || b?.summary || '').slice(0, 6000);
  if (!raw.trim()) return res.status(400).json({ ok: false, error: 'notes required' });
  const user = String(b?.user || 'the learner').slice(0, 80);

  const out = await callAnthropic({
    system: 'You are an assistant that recaps an Ardovo product training session like an advanced meeting note-taker. Be accurate to the log, concise, and useful to a manager reviewing what was covered. Never invent activities not in the log. Never use an em dash or en dash; use a plain hyphen.',
    prompt: `Training session log for ${user}:\n\n${raw}\n\nWrite the recap.`,
    schema: SCHEMA,
    maxTokens: 700,
    model: 'claude-sonnet-4-6',
  });
  const data = out?.data || {};
  return res.status(200).json({ ok: true, summary: data.summary || '', notes: data.notes || '' });
});
