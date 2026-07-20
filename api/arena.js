// api/arena.js
//
// OPTIONAL LLM enhancement for the Ardovo Practice Arena.
// The Arena is fully playable WITHOUT this endpoint: src/lib/arena.js runs a
// deterministic buyer persona engine and rubric grader on the client. This
// route only makes the experience richer when ANTHROPIC_API_KEY is present:
//   - a more natural, in-character buyer reply during ROLE-PLAY
//   - sharper, personalized coaching feedback on the graded transcript
//
// Env-gated and fail-safe: with no key (or any model error) it returns
//   { ok: false, source: 'fallback', reason }
// and the client silently uses its own deterministic output. It never sends,
// never mutates data, and never throws past withErrorHandling.
//
//   POST /api/arena
//   Body (action: 'reply'):
//     { action, persona: {name,title,company,tone,difficulty}, history:[{role,text}], repText, mood }
//     -> { ok: true, source: 'ai', reply: string }
//   Body (action: 'grade'):
//     { action, persona: {name,title,company}, history:[{role,text}], metrics, baseScore }
//     -> { ok: true, source: 'ai', feedback: string[] }
//
// ASCII only. NO em-dash / en-dash. ASCII hyphen only.

import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';
import { callAnthropic } from './_lib-anthropic.js';

export const config = { maxDuration: 30 };

// Strip any stray long dashes a model might emit (platform hard rule).
function scrub(s) {
  return String(s || '')
    .split(String.fromCharCode(0x2014)).join('-')
    .split(String.fromCharCode(0x2013)).join('-')
    .trim();
}

function historyToText(history) {
  if (!Array.isArray(history)) return '';
  return history
    .filter(h => h && typeof h.text === 'string')
    .map(h => `${h.role === 'rep' ? 'Rep' : 'Buyer'}: ${h.text}`)
    .join('\n');
}

async function handleReply(body, res) {
  const p = (body.persona && typeof body.persona === 'object') ? body.persona : {};
  const repText = typeof body.repText === 'string' ? body.repText.slice(0, 1200) : '';
  const mood = Number.isFinite(Number(body.mood)) ? Number(body.mood) : 50;

  const system = [
    'You are role-playing as a B2B buyer in a live sales training simulation inside Ardovo, an AI-native revenue platform.',
    `You are ${p.name || 'the buyer'}, ${p.title || 'a decision maker'}${p.company ? ` at ${p.company}` : ''}.`,
    `Your demeanor: ${p.tone || 'professional and a little guarded'}.`,
    `Difficulty setting: ${p.difficulty || 'Medium'}. Harder means more skeptical and harder to win over.`,
    'Stay fully in character as the BUYER. Never break character, never coach, never narrate.',
    'React realistically to what the rep just said. Reward genuine discovery questions and well-handled objections by warming up; punish weak pitches or premature closes by staying guarded.',
    `The buyer current warmth is ${mood} out of 100. Let it color your tone.`,
    'Reply with ONE short spoken turn, 1 to 3 sentences. No stage directions, no quotation marks, no emoji.',
    'Never use an em dash or en dash. Use a plain hyphen.',
  ].join('\n');

  const prompt = [
    'Conversation so far:',
    historyToText(body.history) || '(the conversation is just beginning)',
    '',
    `The rep just said: ${repText || '(the rep said nothing substantive)'}`,
    '',
    'Give your next in-character buyer reply now.',
  ].join('\n');

  const out = await callAnthropic({ system, prompt, maxTokens: 220, model: 'claude-sonnet-4-6' });
  const reply = scrub(out && out.text);
  if (!reply) throw new Error('empty reply from model');
  return res.status(200).json({ ok: true, source: 'ai', reply });
}

async function handleGrade(body, res) {
  const p = (body.persona && typeof body.persona === 'object') ? body.persona : {};
  const m = (body.metrics && typeof body.metrics === 'object') ? body.metrics : {};
  const baseScore = Number.isFinite(Number(body.baseScore)) ? Number(body.baseScore) : null;

  const schema = {
    type: 'object',
    properties: {
      feedback: {
        type: 'array',
        items: { type: 'string' },
        description: '2 to 4 specific, actionable coaching notes on the rep performance. Each is one sentence, direct and constructive, referencing what actually happened in the transcript.',
      },
    },
    required: ['feedback'],
  };

  const system = [
    'You are an elite B2B sales coach reviewing a rep practice conversation from the Ardovo Practice Arena.',
    'Grade against three dimensions: discovery depth (open questions before pitching), objection handling (acknowledge then reframe with value), and earning a concrete next step.',
    'Be specific and constructive. Cite what the rep actually did. No fluff, no praise sandwiches, no disclaimers.',
    'Never use an em dash or en dash. Use a plain hyphen.',
  ].join('\n');

  const prompt = [
    `Buyer persona: ${p.name || 'buyer'}${p.title ? `, ${p.title}` : ''}${p.company ? ` at ${p.company}` : ''}.`,
    baseScore != null ? `A deterministic rubric already scored this a ${baseScore} out of 100. Align your notes with that level.` : '',
    `Engine signals: discovery questions ${m.discoveryQuestions || 0}, objection raised ${!!m.objectionRaised}, objection handled ${!!m.objectionHandled}, next step accepted ${!!m.nextStepAccepted}.`,
    '',
    'Transcript:',
    historyToText(body.history) || '(no transcript)',
    '',
    'Return 2 to 4 coaching notes.',
  ].filter(Boolean).join('\n');

  const out = await callAnthropic({ system, prompt, schema, maxTokens: 500, model: 'claude-sonnet-4-6' });
  const data = (out && out.data) || {};
  const feedback = Array.isArray(data.feedback)
    ? data.feedback.map(scrub).filter(Boolean).slice(0, 4)
    : [];
  if (!feedback.length) throw new Error('no feedback from model');
  return res.status(200).json({ ok: true, source: 'ai', feedback });
}

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  const body = readJsonBody(req);
  const action = String(body.action || 'reply');

  // No key configured -> tell the client to use its deterministic engine.
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(200).json({
      ok: false, source: 'fallback',
      reason: 'ANTHROPIC_API_KEY not set; client uses the deterministic Arena engine.',
    });
  }

  try {
    if (action === 'grade') return await handleGrade(body, res);
    return await handleReply(body, res);
  } catch (e) {
    // Any model / network error: client falls back to deterministic output.
    return res.status(200).json({
      ok: false, source: 'fallback',
      reason: `Model unavailable (${(e && e.message) || 'error'}); client uses the deterministic Arena engine.`,
    });
  }
});
