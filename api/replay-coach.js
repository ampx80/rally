// api/replay-coach.js
//
// Ardovo REPLAY & COACH - optional AI enrichment pass. The client computes
// deterministic coaching cards locally (src/lib/replay.js) and can send a
// compact, PII-FREE summary of the session here to have Rook (Claude, via
// api/_lib-anthropic.js) rewrite them into warmer, more personal, more
// specific coaching. This endpoint is OPTIONAL and ENV-GATED: without
// ANTHROPIC_API_KEY it returns the client's own heuristic cards unchanged,
// so the feature always works with zero configuration.
//
//   POST /api/replay-coach
//   Body:
//     summary: {
//       totalMinutes, coverage:{touched,total},
//       stops:        [{ label, route, minutes, visits }],
//       untouched:    [{ label, route, hint }],
//       mostRevisited:[{ label, route, visits }],
//       bounces
//     }
//     cards:         [{ id?, tone, icon, title, body, cta:{label,to} }]  (seed)
//     allowedRoutes: [string]   deep-link routes the model may use for cta.to
//
//   Returns (ALWAYS 200 with usable cards; never leaves the caller empty):
//     { ok:true, source:'ai'|'fallback', cards:[...], reason? }
//
// The summary carries ONLY feature labels, routes, minutes, and counts. No
// keystrokes, no record contents, no names, no emails. cta.to is validated
// against allowedRoutes server-side so the model cannot invent dead links.
//
// ASCII only. NO em-dash / en-dash. ASCII hyphen only.

import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';
import { callAnthropic } from './_lib-anthropic.js';

export const config = { maxDuration: 30 };

const TONES = new Set(['accent', 'ok', 'warn', 'info']);
const ICONS = new Set([
  'sparkles', 'pin', 'clock', 'rocket', 'search', 'check', 'radar',
  'target', 'deals', 'users', 'activity', 'zap', 'bolt', 'star', 'chart',
]);
const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

function scrub(s) {
  return String(s == null ? '' : s).split(EM_DASH).join('-').split(EN_DASH).join('-');
}

// Normalize any card (seed or model output) into the safe shape the client
// renders. Drops a cta whose route is not in the allowed set.
function sanitizeCard(card, allowed, i) {
  if (!card || typeof card !== 'object') return null;
  const tone = TONES.has(card.tone) ? card.tone : 'accent';
  const icon = ICONS.has(card.icon) ? card.icon : 'sparkles';
  const title = scrub(card.title).slice(0, 140).trim();
  const body = scrub(card.body).slice(0, 320).trim();
  if (!title || !body) return null;
  let cta = null;
  const raw = card.cta && typeof card.cta === 'object' ? card.cta : null;
  if (raw && raw.to && allowed.has(String(raw.to))) {
    cta = { label: scrub(raw.label || 'Open').slice(0, 40).trim() || 'Open', to: String(raw.to) };
  }
  return { id: card.id || `ai-${i}`, tone, icon, title, body, cta };
}

function sanitizeList(list, allowed) {
  if (!Array.isArray(list)) return [];
  return list.map((c, i) => sanitizeCard(c, allowed, i)).filter(Boolean).slice(0, 6);
}

function summaryToText(s) {
  const lines = [];
  lines.push(`Session length: about ${s.totalMinutes} minutes tracked on this device.`);
  if (s.coverage) lines.push(`Coverage: touched ${s.coverage.touched} of ${s.coverage.total} product surfaces.`);
  if (Array.isArray(s.stops) && s.stops.length) {
    lines.push('Where time went (feature, minutes, visit count):');
    for (const st of s.stops) lines.push(`- ${st.label} (${st.route}): ${st.minutes} min across ${st.visits} visit(s).`);
  }
  if (Array.isArray(s.mostRevisited) && s.mostRevisited.length) {
    lines.push('Revisited often: ' + s.mostRevisited.map(f => `${f.label} x${f.visits}`).join(', ') + '.');
  }
  if (Array.isArray(s.untouched) && s.untouched.length) {
    lines.push('Never opened this session (label -> why it helps):');
    for (const u of s.untouched.slice(0, 12)) lines.push(`- ${u.label} (${u.route})${u.hint ? `: ${u.hint}` : ''}`);
  }
  if (s.bounces) lines.push(`Quick in-and-out screens (under 4 seconds): ${s.bounces}.`);
  return lines.join('\n');
}

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  const body = readJsonBody(req);

  const summary = body.summary && typeof body.summary === 'object' ? body.summary : {};
  const allowed = new Set(Array.isArray(body.allowedRoutes) ? body.allowedRoutes.map(String) : []);
  const seed = sanitizeList(body.cards, allowed);

  // No key -> hand back the client's own deterministic cards, cleaned.
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(200).json({
      ok: true, source: 'fallback',
      reason: 'ANTHROPIC_API_KEY not set; returned your local heuristic coaching.',
      cards: seed,
    });
  }

  const schema = {
    type: 'object',
    properties: {
      cards: {
        type: 'array',
        description: '3 to 5 coaching cards, most useful first.',
        items: {
          type: 'object',
          properties: {
            tone: { type: 'string', enum: ['accent', 'ok', 'warn', 'info'], description: 'accent = try this, ok = encouragement, warn = heads up, info = tip.' },
            icon: { type: 'string', description: 'One of: sparkles, pin, clock, rocket, search, check, radar, target, zap, star.' },
            title: { type: 'string', description: 'One personal sentence about what THIS user did. No more than 14 words.' },
            body: { type: 'string', description: 'One or two warm, specific, actionable sentences. Kind, never scolding.' },
            cta: {
              type: 'object',
              properties: {
                label: { type: 'string', description: 'Short button label, e.g. "Open Intelligence".' },
                to: { type: 'string', description: 'A route from the allowed list only.' },
              },
              required: ['label', 'to'],
            },
          },
          required: ['tone', 'icon', 'title', 'body', 'cta'],
        },
      },
    },
    required: ['cards'],
  };

  const system = [
    'You are Rook, the AI operator inside Ardovo, an AI-native revenue platform.',
    'You are reviewing a single users OWN product session to coach them to work faster. This is self-improvement from their real behavior, so be personal, warm, and specific to what they actually did.',
    'Rules: Ground every card in the session data provided; never invent activity that is not there. Be kind and encouraging, never scolding. Each card needs one clear next step. cta.to MUST be one of the allowed routes given; do not invent routes. Prefer nudging the user toward high-value features they have not opened, pinning features they revisit, and faster paths for slow stops. No emoji. At most one exclamation point total. Never use an em dash or en dash; use a normal hyphen. Return 3 to 5 cards.',
  ].join('\n');

  const prompt = [
    'SESSION SUMMARY:',
    summaryToText(summary),
    '',
    'ALLOWED cta.to ROUTES (use only these):',
    [...allowed].join(', ') || '(none provided)',
    '',
    'For reference, here are the deterministic cards the app already generated. Improve on them, keep what is good, make them warmer and more specific:',
    JSON.stringify(seed.map(c => ({ tone: c.tone, title: c.title, body: c.body, to: c.cta && c.cta.to })), null, 2),
    '',
    'Write the coaching cards now.',
  ].join('\n');

  try {
    const out = await callAnthropic({ system, prompt, schema, maxTokens: 1100, model: 'claude-sonnet-4-6' });
    const cards = sanitizeList(out && out.data && out.data.cards, allowed);
    if (!cards.length) throw new Error('model returned no usable cards');
    return res.status(200).json({ ok: true, source: 'ai', cards });
  } catch (e) {
    return res.status(200).json({
      ok: true, source: 'fallback',
      reason: `Model unavailable (${(e && e.message) || 'error'}); returned your local heuristic coaching.`,
      cards: seed,
    });
  }
});
