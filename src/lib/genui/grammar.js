// ============================================================
// GENERATIVE UI - GRAMMAR + VALIDATION  (pure, no store, no DOM)
// ------------------------------------------------------------
// This is the trust boundary for Rook's runtime-authored micro-apps.
// Rook (or a deterministic fallback) returns a DECLARATIVE ui_spec: a
// small tree of whitelisted blocks (stats / tables / charts / text /
// actions) whose data comes ONLY from named, whitelisted store
// selectors. There is NO code, NO expressions, NO eval anywhere in a
// spec - just data. This module owns:
//   - the whitelist of selectors + KPIs a spec may reference,
//   - validateSpec(): coerces any incoming object into a SAFE spec,
//     dropping anything unknown or malformed,
//   - buildFallbackSpec(): a deterministic, keyword-routed spec so the
//     canvas assembles a real, grounded micro-app even with no API key,
//   - PROMPT_GRAMMAR: the human-readable contract handed to Rook.
// It imports nothing from the store or React, so both the browser
// renderer AND the serverless api/genui.js can import it safely.
// ============================================================

export const SPEC_VERSION = 1;

// ---- em/en dash scrub (platform-wide typography rule) ----
// Built from char codes so this source survives its own auto-scrub.
const EM = String.fromCharCode(0x2014);
const EN = String.fromCharCode(0x2013);
export function scrubDashes(s) {
  return typeof s === 'string' ? s.split(EM).join('-').split(EN).join('-') : s;
}

// ============================================================
// WHITELISTED DATA SELECTORS
// Each name maps to a store-bound resolver in spec.js. The grammar only
// knows the NAME + default column shape; the actual read happens client
// side against getState(). A spec that names anything not in here is
// rejected. `report` is the one parameterized selector (a live
// aggregation via reports-data.computeReport).
// ============================================================
const C = (key, label, format) => ({ key, label, format });

export const SELECTORS = {
  'deals.open': {
    label: 'Open deals',
    columns: [C('name', 'Deal', 'text'), C('company', 'Company', 'text'), C('stage', 'Stage', 'badge'), C('value', 'Value', 'money'), C('probability', 'Win %', 'percent'), C('closeDate', 'Close', 'date'), C('owner', 'Owner', 'text')],
  },
  'deals.all': {
    label: 'All deals',
    columns: [C('name', 'Deal', 'text'), C('company', 'Company', 'text'), C('stage', 'Stage', 'badge'), C('value', 'Value', 'money'), C('status', 'Status', 'text'), C('closeDate', 'Close', 'date'), C('owner', 'Owner', 'text')],
  },
  'deals.slipping': {
    label: 'Slipping deals (open, past close date)',
    columns: [C('name', 'Deal', 'text'), C('company', 'Company', 'text'), C('stage', 'Stage', 'badge'), C('value', 'Value', 'money'), C('closeDate', 'Was due', 'date'), C('owner', 'Owner', 'text')],
  },
  'deals.closingThisMonth': {
    label: 'Deals closing this month',
    columns: [C('name', 'Deal', 'text'), C('company', 'Company', 'text'), C('stage', 'Stage', 'badge'), C('value', 'Value', 'money'), C('probability', 'Win %', 'percent'), C('closeDate', 'Close', 'date')],
  },
  'deals.won': {
    label: 'Won deals',
    columns: [C('name', 'Deal', 'text'), C('company', 'Company', 'text'), C('value', 'Value', 'money'), C('closeDate', 'Closed', 'date'), C('owner', 'Owner', 'text')],
  },
  'deals.lost': {
    label: 'Lost deals',
    columns: [C('name', 'Deal', 'text'), C('company', 'Company', 'text'), C('value', 'Value', 'money'), C('closeDate', 'Closed', 'date'), C('owner', 'Owner', 'text')],
  },
  'companies.all': {
    label: 'Companies',
    columns: [C('name', 'Company', 'text'), C('industry', 'Industry', 'text'), C('size', 'Size', 'text'), C('health', 'Health', 'text'), C('owner', 'Owner', 'text'), C('openPipeline', 'Open pipeline', 'money'), C('contacts', 'Contacts', 'number')],
  },
  'contacts.all': {
    label: 'Contacts',
    columns: [C('name', 'Contact', 'text'), C('title', 'Title', 'text'), C('company', 'Company', 'text'), C('email', 'Email', 'text'), C('owner', 'Owner', 'text')],
  },
  'activities.myDay': {
    label: 'My day (open tasks)',
    columns: [C('type', 'Type', 'text'), C('subject', 'Task', 'text'), C('due', 'Due', 'date'), C('related', 'On', 'text')],
  },
  // Parameterized live aggregation. args: { source, metric, groupBy }.
  report: {
    label: 'Aggregation',
    params: true,
    columns: [C('label', 'Group', 'text'), C('value', 'Value', 'number')],
  },
};

export const SELECTOR_NAMES = Object.keys(SELECTORS);

// ---- report() argument whitelist (mirrors reports-data.js) ----
export const REPORT_SOURCES = ['deals', 'contacts', 'companies', 'activities'];
export const REPORT_METRICS = ['count', 'sum', 'winRate'];
export const REPORT_DIMENSIONS = ['stage', 'owner', 'industry', 'month', 'status', 'type', 'title', 'size', 'health'];

// ============================================================
// WHITELISTED SCALAR KPIs (for stat blocks)
// ============================================================
export const KPIS = {
  pipeline: { label: 'Open pipeline', format: 'money' },
  forecast: { label: 'Weighted forecast', format: 'money' },
  winRate: { label: 'Win rate', format: 'percent' },
  wonThisMonth: { label: 'Won this month', format: 'money' },
  openDeals: { label: 'Open deals', format: 'number' },
  avgDealSize: { label: 'Avg open deal', format: 'money' },
  slipping: { label: 'Slipping deals', format: 'number' },
  closingThisMonth: { label: 'Closing this month', format: 'number' },
  totalContacts: { label: 'Contacts', format: 'number' },
  totalCompanies: { label: 'Companies', format: 'number' },
};
export const KPI_NAMES = Object.keys(KPIS);

export const BLOCK_TYPES = ['stat', 'statRow', 'table', 'chart', 'text', 'note', 'actions'];
export const CHART_TYPES = ['bar', 'line', 'area', 'pie'];
const FORMATS = ['money', 'moneyK', 'percent', 'number', 'date', 'text', 'badge'];
const ACTION_KINDS = ['navigate', 'rook'];
const ROUTE_RE = /^\/[a-z0-9/_-]*$/i; // internal routes only, no protocol

/* ---------- small sanitizers ---------- */
const str = (v, max = 220) => (typeof v === 'string' ? scrubDashes(v).slice(0, max) : undefined);
const oneOf = (v, allowed, fallback) => (allowed.includes(v) ? v : fallback);
const clampInt = (v, lo, hi, dflt) => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return dflt;
  return Math.max(lo, Math.min(hi, n));
};

function sanitizeDataRef(ref) {
  if (!ref || typeof ref !== 'object') return null;
  const selector = ref.selector;
  if (!SELECTOR_NAMES.includes(selector)) return null;
  if (selector === 'report') {
    const a = ref.args || {};
    return {
      selector,
      args: {
        source: oneOf(a.source, REPORT_SOURCES, 'deals'),
        metric: oneOf(a.metric, REPORT_METRICS, 'count'),
        groupBy: oneOf(a.groupBy, REPORT_DIMENSIONS, 'stage'),
      },
    };
  }
  return { selector };
}

function sanitizeColumns(cols, selector) {
  if (!Array.isArray(cols) || !cols.length) return null; // renderer falls back to selector defaults
  const allowedKeys = new Set((SELECTORS[selector]?.columns || []).map(c => c.key));
  const out = [];
  for (const c of cols) {
    if (!c || typeof c !== 'object') continue;
    if (!allowedKeys.has(c.key)) continue; // never surface an unknown field
    out.push({ key: c.key, label: str(c.label, 60) || c.key, format: oneOf(c.format, FORMATS, undefined) });
    if (out.length >= 8) break;
  }
  return out.length ? out : null;
}

function sanitizeBlock(b) {
  if (!b || typeof b !== 'object') return null;
  const type = b.type;
  if (!BLOCK_TYPES.includes(type)) return null;

  switch (type) {
    case 'stat': {
      const kpi = KPI_NAMES.includes(b.kpi) ? b.kpi : null;
      const value = typeof b.value === 'number' && Number.isFinite(b.value) ? b.value : null;
      if (!kpi && value == null) return null;
      return { type, kpi, value, label: str(b.label, 60), format: oneOf(b.format, FORMATS, undefined), sub: str(b.sub, 80), accent: str(b.accent, 24) };
    }
    case 'statRow': {
      const stats = Array.isArray(b.stats) ? b.stats.map(s => sanitizeBlock({ ...s, type: 'stat' })).filter(Boolean).slice(0, 4) : [];
      if (!stats.length) return null;
      return { type, stats };
    }
    case 'table': {
      const data = sanitizeDataRef(b.data);
      if (!data) return null;
      return { type, title: str(b.title, 90), data, columns: sanitizeColumns(b.columns, data.selector), limit: clampInt(b.limit, 1, 50, 8), sortBy: str(b.sortBy, 40), sortDir: oneOf(b.sortDir, ['asc', 'desc'], 'desc') };
    }
    case 'chart': {
      const data = sanitizeDataRef(b.data);
      if (!data) return null;
      return { type, chart: oneOf(b.chart, CHART_TYPES, 'bar'), title: str(b.title, 90), data, x: str(b.x, 40), y: str(b.y, 40), limit: clampInt(b.limit, 1, 24, 12) };
    }
    case 'text':
      if (!str(b.body, 1200)) return null;
      return { type, title: str(b.title, 90), body: str(b.body, 1200) };
    case 'note':
      if (!str(b.body, 400)) return null;
      return { type, tone: oneOf(b.tone, ['info', 'ok', 'warn', 'risk', 'accent'], 'info'), body: str(b.body, 400) };
    case 'actions': {
      const actions = (Array.isArray(b.actions) ? b.actions : []).map(a => {
        if (!a || typeof a !== 'object') return null;
        const kind = oneOf(a.kind, ACTION_KINDS, null);
        const label = str(a.label, 48);
        if (!kind || !label) return null;
        if (kind === 'navigate') {
          const to = typeof a.to === 'string' && ROUTE_RE.test(a.to) ? a.to : null;
          if (!to) return null;
          return { kind, label, to, variant: oneOf(a.variant, ['primary', 'accent', 'ghost', 'quiet'], 'ghost') };
        }
        // rook: re-prompt the operator (user still confirms any write in RookDock)
        const prompt = str(a.prompt, 240);
        if (!prompt) return null;
        return { kind, label, prompt, variant: oneOf(a.variant, ['primary', 'accent', 'ghost', 'quiet'], 'accent') };
      }).filter(Boolean).slice(0, 6);
      if (!actions.length) return null;
      return { type, actions };
    }
    default:
      return null;
  }
}

/* ============================================================
   validateSpec - coerce ANY object into a safe, renderable spec.
   Returns { ok, spec, error }. Never throws.
   ============================================================ */
export function validateSpec(input) {
  try {
    const raw = input && typeof input === 'object' && input.ui_spec ? input.ui_spec : input;
    if (!raw || typeof raw !== 'object') return { ok: false, error: 'spec is not an object' };
    const blocks = (Array.isArray(raw.blocks) ? raw.blocks : []).map(sanitizeBlock).filter(Boolean).slice(0, 14);
    if (!blocks.length) return { ok: false, error: 'spec has no valid blocks' };
    return {
      ok: true,
      spec: {
        version: SPEC_VERSION,
        title: str(raw.title, 120) || 'Your micro-app',
        subtitle: str(raw.subtitle, 200),
        blocks,
      },
    };
  } catch (e) {
    return { ok: false, error: 'validation error' };
  }
}

// ============================================================
// DETERMINISTIC FALLBACK
// Keyword-routes the question into a real, grounded micro-app so the
// canvas works with zero AI (no ANTHROPIC_API_KEY, or a network error).
// `snap` is the compact snapshot the client sends (counts + revenue);
// it is only used to word the copy, never to fabricate data - the
// blocks bind to live selectors that recompute at render time.
// ============================================================
export function buildFallbackSpec(question = '', snap = {}) {
  const q = String(question || '').toLowerCase();
  const has = (...ws) => ws.some(w => q.includes(w));
  const rev = snap.revenue || {};
  const overview = () => ({
    title: 'Pipeline command view',
    subtitle: 'Assembled from your live book of business.',
    blocks: [
      { type: 'statRow', stats: [
        { type: 'stat', kpi: 'pipeline' }, { type: 'stat', kpi: 'forecast' },
        { type: 'stat', kpi: 'winRate' }, { type: 'stat', kpi: 'openDeals' },
      ] },
      { type: 'chart', chart: 'bar', title: 'Open pipeline by stage', data: { selector: 'report', args: { source: 'deals', metric: 'sum', groupBy: 'stage' } } },
      { type: 'table', title: 'Top open deals', data: { selector: 'deals.open' }, limit: 8, sortBy: 'value', sortDir: 'desc' },
      { type: 'actions', actions: [
        { kind: 'navigate', label: 'Open Deals', to: '/deals', variant: 'ghost' },
        { kind: 'navigate', label: 'Open Forecasting', to: '/forecasting', variant: 'ghost' },
      ] },
    ],
  });

  let spec;
  if (has('slip', 'stalled', 'stuck', 'overdue', 'at risk', 'at-risk')) {
    spec = {
      title: 'Slipping deals watchlist',
      subtitle: 'Open deals whose close date is already in the past.',
      blocks: [
        { type: 'statRow', stats: [{ type: 'stat', kpi: 'slipping' }, { type: 'stat', kpi: 'pipeline' }, { type: 'stat', kpi: 'forecast' }] },
        { type: 'table', title: 'Slipping deals', data: { selector: 'deals.slipping' }, limit: 20, sortBy: 'value', sortDir: 'desc' },
        { type: 'note', tone: 'warn', body: 'These are the deals bleeding forecast. Work the largest values first.' },
        { type: 'actions', actions: [{ kind: 'rook', label: 'Ask Rook for a save play', prompt: 'Give me a one-click save play for my slipping deals', variant: 'accent' }] },
      ],
    };
  } else if (has('win rate', 'win %', 'won', 'lost', 'conversion')) {
    spec = {
      title: 'Win-rate breakdown',
      blocks: [
        { type: 'statRow', stats: [{ type: 'stat', kpi: 'winRate' }, { type: 'stat', kpi: 'wonThisMonth' }] },
        { type: 'chart', chart: 'bar', title: 'Win rate by stage reached', data: { selector: 'report', args: { source: 'deals', metric: 'winRate', groupBy: 'stage' } } },
        { type: 'chart', chart: 'bar', title: 'Won value by owner', data: { selector: 'report', args: { source: 'deals', metric: 'sum', groupBy: 'owner' } } },
      ],
    };
  } else if (has('owner', 'rep', 'team', 'leaderboard', 'who')) {
    spec = {
      title: 'Team pipeline view',
      blocks: [
        { type: 'chart', chart: 'bar', title: 'Open pipeline by owner', data: { selector: 'report', args: { source: 'deals', metric: 'sum', groupBy: 'owner' } } },
        { type: 'table', title: 'Open deals', data: { selector: 'deals.open' }, limit: 12, sortBy: 'value', sortDir: 'desc' },
      ],
    };
  } else if (has('industry', 'segment', 'vertical')) {
    spec = {
      title: 'Pipeline by industry',
      blocks: [
        { type: 'chart', chart: 'pie', title: 'Open deals by industry', data: { selector: 'report', args: { source: 'deals', metric: 'count', groupBy: 'industry' } } },
        { type: 'chart', chart: 'bar', title: 'Deal value by industry', data: { selector: 'report', args: { source: 'deals', metric: 'sum', groupBy: 'industry' } } },
      ],
    };
  } else if (has('closing', 'this month', 'this quarter', 'commit')) {
    spec = {
      title: 'Closing this month',
      blocks: [
        { type: 'statRow', stats: [{ type: 'stat', kpi: 'closingThisMonth' }, { type: 'stat', kpi: 'forecast' }] },
        { type: 'table', title: 'Deals closing this month', data: { selector: 'deals.closingThisMonth' }, limit: 20 },
      ],
    };
  } else if (has('compan', 'account')) {
    spec = {
      title: 'Account book',
      blocks: [
        { type: 'statRow', stats: [{ type: 'stat', kpi: 'totalCompanies' }, { type: 'stat', kpi: 'pipeline' }] },
        { type: 'table', title: 'Companies by open pipeline', data: { selector: 'companies.all' }, limit: 20, sortBy: 'openPipeline', sortDir: 'desc' },
      ],
    };
  } else if (has('contact', 'people', 'champion')) {
    spec = {
      title: 'Contacts',
      blocks: [
        { type: 'statRow', stats: [{ type: 'stat', kpi: 'totalContacts' }] },
        { type: 'table', title: 'Contacts', data: { selector: 'contacts.all' }, limit: 20 },
      ],
    };
  } else if (has('today', 'my day', 'task', 'plate', 'to do', 'todo')) {
    spec = {
      title: 'Your day',
      blocks: [
        { type: 'table', title: 'Open tasks', data: { selector: 'activities.myDay' }, limit: 20 },
        { type: 'actions', actions: [{ kind: 'navigate', label: 'Open My day', to: '/activities', variant: 'ghost' }] },
      ],
    };
  } else {
    spec = overview();
  }

  const v = validateSpec(spec);
  return v.ok ? v.spec : validateSpec(overview()).spec;
}

// ============================================================
// PROMPT CONTRACT handed to Rook so its output matches the whitelist.
// ============================================================
export const PROMPT_GRAMMAR = [
  'You author a ui_spec: a small JSON tree Rally renders as a live, interactive micro-app bound to the user data. NO code, NO expressions, NO formulas - only declarative blocks that reference WHITELISTED selectors. Anything off-whitelist is dropped.',
  '',
  'Top level: { "title": string, "subtitle"?: string, "blocks": Block[] } (max 14 blocks).',
  '',
  'BLOCK TYPES:',
  '- { "type":"stat", "kpi": <KPI>, "label"?, "sub"? }  a single scalar tile.',
  '- { "type":"statRow", "stats":[ {"type":"stat","kpi":<KPI>} ... up to 4 ] }  a KPI row.',
  '- { "type":"table", "title"?, "data": <DataRef>, "limit"?, "sortBy"?, "sortDir":"asc"|"desc" }',
  '- { "type":"chart", "chart":"bar"|"line"|"area"|"pie", "title"?, "data": <DataRef>, "limit"? }',
  '- { "type":"text", "title"?, "body": string }  short grounded prose.',
  '- { "type":"note", "tone":"info"|"ok"|"warn"|"risk"|"accent", "body": string }  a callout.',
  '- { "type":"actions", "actions":[ {"kind":"navigate","label","to":"/deals"} | {"kind":"rook","label","prompt":"..."} ] }',
  '',
  'KPI (for stat): ' + KPI_NAMES.join(', ') + '.',
  '',
  'DataRef is ONE of:',
  '  { "selector": one of [' + SELECTOR_NAMES.filter(n => n !== 'report').join(', ') + '] }',
  '  { "selector":"report", "args": { "source": deals|contacts|companies|activities, "metric": count|sum|winRate, "groupBy": stage|owner|industry|month|status|type|title|size|health } }',
  '  (report returns rows of {label,value} - use it for every chart and any grouped table. sum/winRate only mean anything for source=deals.)',
  '',
  'RULES: Assemble a genuinely useful tool for the exact question - lead with the KPIs that answer it, then a chart, then a supporting table, then 1-2 actions. Never invent selectors, columns, KPIs, or routes. Navigate actions may only target real app routes (/deals, /forecasting, /contacts, /companies, /activities, /leads, /reports, /dashboards). Use "rook" actions for anything that would change data, so the user confirms it. Never use an em dash or en dash; use a plain hyphen.',
].join('\n');
