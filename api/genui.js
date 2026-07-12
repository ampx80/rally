// api/genui.js - Generative UI. Rook turns a natural-language request into a
// declarative ui_spec that Rally renders as a live, interactive micro-app bound
// to the user's real book of business. Rook AUTHORS the spec; it never touches
// data. The client validates the spec again before rendering and resolves every
// data reference against a whitelist of store selectors (no eval, ever).
//
// With ANTHROPIC_API_KEY set, Claude composes the spec via a forced tool call.
// Without it (or on any error), a deterministic keyword-routed fallback still
// assembles a real, grounded micro-app - the canvas never returns nothing.
import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';
import { callAnthropic } from './_lib-anthropic.js';
import {
  validateSpec, buildFallbackSpec, PROMPT_GRAMMAR,
  SELECTOR_NAMES, KPI_NAMES, CHART_TYPES,
  REPORT_SOURCES, REPORT_METRICS, REPORT_DIMENSIONS,
} from '../src/lib/genui/grammar.js';

export const config = { maxDuration: 30 };

// Loose JSON schema for the tool call. The client + grammar.validateSpec are
// the real trust boundary; this just steers Claude toward the right shape.
const SPEC_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Short title for the assembled micro-app.' },
    subtitle: { type: 'string' },
    blocks: {
      type: 'array',
      description: 'Ordered blocks. Max 14. Lead with the KPIs that answer the question, then a chart, then a supporting table, then 1-2 actions.',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['stat', 'statRow', 'table', 'chart', 'text', 'note', 'actions'] },
          kpi: { type: 'string', enum: KPI_NAMES },
          label: { type: 'string' },
          sub: { type: 'string' },
          stats: { type: 'array', items: { type: 'object', properties: { type: { type: 'string' }, kpi: { type: 'string', enum: KPI_NAMES }, label: { type: 'string' } } } },
          title: { type: 'string' },
          chart: { type: 'string', enum: CHART_TYPES },
          data: {
            type: 'object',
            properties: {
              selector: { type: 'string', enum: SELECTOR_NAMES },
              args: {
                type: 'object',
                properties: {
                  source: { type: 'string', enum: REPORT_SOURCES },
                  metric: { type: 'string', enum: REPORT_METRICS },
                  groupBy: { type: 'string', enum: REPORT_DIMENSIONS },
                },
              },
            },
          },
          limit: { type: 'number' },
          sortBy: { type: 'string' },
          sortDir: { type: 'string', enum: ['asc', 'desc'] },
          body: { type: 'string' },
          tone: { type: 'string', enum: ['info', 'ok', 'warn', 'risk', 'accent'] },
          actions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                kind: { type: 'string', enum: ['navigate', 'rook'] },
                label: { type: 'string' },
                to: { type: 'string' },
                prompt: { type: 'string' },
                variant: { type: 'string' },
              },
              required: ['kind', 'label'],
            },
          },
        },
        required: ['type'],
      },
    },
  },
  required: ['title', 'blocks'],
};

function snapshotToText(s) {
  if (!s) return 'No snapshot provided.';
  const c = s.counts || {}, r = s.revenue || {};
  const lines = [
    `User: ${s.currentUser?.name || 'a rep'} (${s.currentUser?.title || 'rep'}).`,
    `Counts: ${c.deals} deals (open ${c.openDeals}, won ${c.wonDeals}, lost ${c.lostDeals}), ${c.companies} companies, ${c.contacts} contacts. Slipping ${c.slipping}, closing this month ${c.closingThisMonth}.`,
    `Revenue: pipeline ${r.pipeline}, weighted forecast ${r.forecast}, win rate ${r.winRate}%, won this month ${r.wonThisMonth}.`,
  ];
  if (Array.isArray(s.topOpenDeals) && s.topOpenDeals.length) {
    lines.push('Top open deals: ' + s.topOpenDeals.map(d => `${d.name} (${d.company}, ${d.value}, ${d.stage})`).join('; ') + '.');
  }
  return lines.join('\n');
}

const SYSTEM = (snapText) => [
  'You are Rook, the AI operator inside Rally, an AI-native revenue platform. Instead of a text answer, you assemble a live, interactive micro-app: you return a ui_spec that Rally renders and binds to the user real, live data.',
  '',
  PROMPT_GRAMMAR,
  '',
  'GROUNDING SNAPSHOT (headline metrics - the blocks bind to live data at render time, so never paste these numbers into a table; reference selectors instead):',
  snapText,
].join('\n');

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  const body = readJsonBody(req);
  const question = typeof body.question === 'string' ? body.question.trim() : '';
  const snapshot = body.snapshot || null;
  if (!question) return res.status(400).json({ error: 'question required' });

  // No key configured -> deterministic fallback (still a real micro-app).
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(200).json({ ok: true, source: 'fallback', spec: buildFallbackSpec(question, snapshot) });
  }

  try {
    const out = await callAnthropic({
      system: SYSTEM(snapshotToText(snapshot)),
      prompt: `The user asks: "${question}"\n\nAuthor the ui_spec for the most useful interactive micro-app that answers this, using only whitelisted blocks, selectors, and KPIs.`,
      schema: SPEC_SCHEMA,
      maxTokens: 1800,
      model: 'claude-sonnet-4-6',
    });
    const v = validateSpec(out?.data || {});
    if (v.ok) return res.status(200).json({ ok: true, source: 'rook', spec: v.spec });
    // Model produced nothing renderable -> fall back rather than fail.
    return res.status(200).json({ ok: true, source: 'fallback', spec: buildFallbackSpec(question, snapshot) });
  } catch (e) {
    // Any upstream error -> deterministic fallback so the canvas still works.
    return res.status(200).json({ ok: true, source: 'fallback', degraded: true, spec: buildFallbackSpec(question, snapshot) });
  }
});
