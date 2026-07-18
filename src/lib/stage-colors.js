// ============================================================
// PIPELINE STAGE COLORS  (single source of truth for the product)
// One deliberate, sequential palette used by every stage-colored surface:
// kanban columns, deal badges, command-center pulse, dashboards charts,
// and forecasting. The scale runs cool-to-teal so a deal visibly "warms"
// toward Ardovo's brand teal as it advances to the close.
//
//   lead        slate   just entered, dormant
//   qualified   blue    a real opportunity
//   discovery   cyan    warming up
//   proposal    teal    the close is in sight
//   negotiation deep    at the table, brand teal
//   won         green   closed won
//   lost        red     closed lost
//
// There is NO violet anywhere in this file on purpose. Violet (--ai) is
// reserved exclusively for Rook / AI surfaces. Data visualization is a
// product surface, so it stays teal-family. NO em-dash / en-dash.
// ============================================================

export const STAGE_COLOR = {
  lead: '#94a3b8',
  qualified: '#3b82f6',
  discovery: '#06b6d4',
  proposal: '#14b8a6',
  negotiation: '#0e9f8f',
  won: '#1a9f6d',
  lost: '#d0503f',
};

// Order of the open pipeline, cool -> teal.
export const OPEN_STAGE_ORDER = ['lead', 'qualified', 'discovery', 'proposal', 'negotiation'];

export function stageColor(id) {
  return STAGE_COLOR[id] || '#94a3b8';
}

// Convert any of the palette hex values to an rgba() string at a given alpha.
export function hexToRgba(hex, alpha = 1) {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 6) return hex;
  const n = parseInt(h, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Soft tint of a stage color (column backgrounds, badges, hover fills).
export function stageTint(id, alpha = 0.1) {
  return hexToRgba(stageColor(id), alpha);
}

// Brand-teal chart primitives for non-stage series (leaderboards, single
// forecast series, tooltip cursors, grid lines). Keeps every chart on-brand.
export const CHART_ACCENT = '#0e9f8f';
export const CHART_ACCENT_SOFT = 'rgba(14, 159, 143, 0.08)';
export const CHART_NEUTRAL = '#d7dce3';
export const CHART_GRID = '#e7e9ee';
