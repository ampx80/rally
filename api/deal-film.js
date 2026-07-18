// Deal Film narration - the optional "Rook cut".
//
// The film's scene graph and a full deterministic narration are built
// entirely client-side (src/lib/deal-film.js) and the page plays perfectly
// with zero network. This endpoint is a progressive enhancement: given the
// scene list + facts, Rook (Claude) re-authors the voiceover for every POV,
// one grounded line per scene. If ANTHROPIC_API_KEY is absent (the default
// local-first demo) it returns 503 and the page keeps the deterministic cut.
//
// Read-only: it mutates nothing. ASCII only, hyphen only.
import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';
import { callAnthropic } from './_lib-anthropic.js';

export const config = { maxDuration: 30 };

const SYSTEM = [
  'You are Rook, the AI operator inside Ardovo, re-cutting the voiceover for a cinematic film built from a real deal (or quarter). The scene graph, the facts, and the outcome are FIXED and true. Your only job is to re-write the spoken narration line for each scene, from each requested point of view.',
  'Rules:',
  '- One line per scene per POV. Punchy, cinematic, 1 to 2 sentences. Present-tense, confident, plain language.',
  '- GROUNDED: use only the facts, titles, headlines, and the deterministic base line provided. Never invent a number, name, date, or event that is not present.',
  '- Each POV is a different narrator framing the SAME facts (for example the rep, the champion, the CFO, the rival, the CRO, the board, the skeptic). Keep the facts identical; change only the voice and emphasis.',
  '- Return exactly one array per requested POV id, each array the same length as the scene list, in scene order.',
  '- Never use an em dash or en dash. Use a normal hyphen.',
].join('\n');

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  const body = readJsonBody(req) || {};
  const scenes = Array.isArray(body.scenes) ? body.scenes : [];
  const povs = Array.isArray(body.povs) && body.povs.length ? body.povs.filter((p) => typeof p === 'string').slice(0, 6) : ['rep'];
  if (!scenes.length) return res.status(400).json({ error: 'scenes required' });

  // dynamic schema: one string[] per requested POV id
  const props = {};
  for (const p of povs) props[p] = { type: 'array', items: { type: 'string' }, description: `Narration line per scene, in order, from the ${p} point of view.` };
  const schema = {
    type: 'object',
    properties: { narration: { type: 'object', properties: props, required: povs } },
    required: ['narration'],
  };

  const sceneText = scenes.map((s, i) =>
    `Scene ${i + 1} [${s.kind || 'scene'}] ${s.eyebrow ? '(' + s.eyebrow + ')' : ''}\n  Title: ${s.title || ''}\n  Headline: ${s.headline || ''}\n  Base line: ${s.base || ''}`
  ).join('\n\n');

  const factText = body.facts ? JSON.stringify(body.facts) : '{}';
  const prompt = [
    `FILM: ${body.title || 'Untitled'} (${body.subtitle || ''}) - kind: ${body.kind || 'deal'}, outcome: ${body.outcome || 'open'}.`,
    `FACTS (do not exceed these): ${factText}`,
    '',
    `POINTS OF VIEW to write: ${povs.join(', ')}.`,
    `There are ${scenes.length} scenes. Return exactly ${scenes.length} lines per POV, in order.`,
    '',
    'SCENES:',
    sceneText,
    '',
    'Re-write the narration now, one grounded line per scene per POV.',
  ].join('\n');

  const out = await callAnthropic({ system: SYSTEM, prompt, schema, maxTokens: 2200, model: 'claude-sonnet-4-6' });
  const data = out?.data || {};
  const nar = data.narration && typeof data.narration === 'object' ? data.narration : {};

  // normalize: guarantee each POV is an array of the right length (pad/truncate)
  const narration = {};
  for (const p of povs) {
    const arr = Array.isArray(nar[p]) ? nar[p].map((x) => String(x || '')) : [];
    const fixed = [];
    for (let i = 0; i < scenes.length; i++) fixed.push(arr[i] || scenes[i].base || '');
    narration[p] = fixed;
  }

  return res.status(200).json({ ok: true, narration });
});
