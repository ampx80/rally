// ============================================================
// ARDOVO REPORTS ENGINE
// Pure, deterministic computation over the live store, plus a
// tiny persistence layer for user-saved report definitions.
// This module owns: (1) the aggregation engine that turns a
// report definition {source, metric, groupBy} into chart rows,
// (2) the seed gallery of standard revenue reports, and (3) the
// localStorage read/write for custom saved reports.
// SUPABASE: saved defs would live in from('rally_reports').
// ============================================================
import {
  getDeals, getContacts, getCompanies, getActivities,
  getUsers, userName, STAGES, stageById,
} from './store';

const LS_KEY = 'rally_reports_v1';

/* ---------- option vocabulary (drives the builder menus) ---------- */
export const SOURCES = [
  { id: 'deals', label: 'Deals' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'companies', label: 'Companies' },
  { id: 'activities', label: 'Activities' },
];

export const METRICS = [
  { id: 'count', label: 'Count of records' },
  { id: 'sum', label: 'Sum of deal value' },
  { id: 'winRate', label: 'Win rate %' },
];

// Which group-by dimensions make sense for each source.
export const DIMENSIONS = {
  deals: [
    { id: 'stage', label: 'Stage' },
    { id: 'owner', label: 'Owner' },
    { id: 'industry', label: 'Industry' },
    { id: 'month', label: 'Close month' },
    { id: 'status', label: 'Status' },
  ],
  contacts: [
    { id: 'owner', label: 'Owner' },
    { id: 'industry', label: 'Industry' },
    { id: 'title', label: 'Title' },
    { id: 'month', label: 'Created month' },
  ],
  companies: [
    { id: 'industry', label: 'Industry' },
    { id: 'owner', label: 'Owner' },
    { id: 'size', label: 'Company size' },
    { id: 'health', label: 'Health' },
  ],
  activities: [
    { id: 'type', label: 'Type' },
    { id: 'owner', label: 'Owner' },
    { id: 'month', label: 'Month' },
  ],
};

export const CHART_TYPES = ['bar', 'line', 'pie', 'area'];

// Metrics that are valid per source. Sum-of-value and win-rate only mean
// anything for deals; other sources support record count only.
export function metricsFor(source) {
  if (source === 'deals') return METRICS;
  return METRICS.filter(m => m.id === 'count');
}

export function dimensionsFor(source) {
  return DIMENSIONS[source] || DIMENSIONS.deals;
}

/* ---------- helpers ---------- */
const monthKey = (iso) => {
  if (!iso) return 'Unknown';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};
const monthSort = (iso) => {
  const d = new Date(iso || 0);
  return d.getFullYear() * 12 + d.getMonth();
};

function companyIndustry(companyId, companyMap) {
  const co = companyMap.get(companyId);
  return co ? co.industry : 'Unknown';
}

// Resolve the group-key for a single row given a dimension.
function keyFor(row, source, dim, ctx) {
  switch (dim) {
    case 'stage': return stageById(row.stage)?.name || row.stage || 'Unknown';
    case 'owner': return userName(row.ownerId);
    case 'industry':
      if (source === 'companies') return row.industry || 'Unknown';
      return companyIndustry(row.companyId, ctx.companyMap);
    case 'month':
      return monthKey(row.closeDate || row.createdAt);
    case 'status': return (row.status || 'open').replace(/^\w/, c => c.toUpperCase());
    case 'type': return (row.type || 'other').replace(/^\w/, c => c.toUpperCase());
    case 'title': return row.title || 'Unknown';
    case 'size': return row.size || 'Unknown';
    case 'health': return (row.health || 'green').replace(/^\w/, c => c.toUpperCase());
    default: return 'All';
  }
}

/* ---------- the aggregation engine ----------
   Returns { rows: [{ label, value, sortKey }], metricLabel, valueFormat } */
export function computeReport(def) {
  const source = def.source || 'deals';
  const metric = def.metric || 'count';
  const dim = def.groupBy || dimensionsFor(source)[0].id;

  const companyMap = new Map(getCompanies().map(c => [c.id, c]));
  const ctx = { companyMap };

  let records;
  if (source === 'deals') records = getDeals();
  else if (source === 'contacts') records = getContacts();
  else if (source === 'companies') records = getCompanies();
  else records = getActivities();

  // bucket the rows
  const buckets = new Map(); // key -> { rows: [], sortKey }
  for (const row of records) {
    const key = keyFor(row, source, dim, ctx);
    if (!buckets.has(key)) {
      buckets.set(key, {
        rows: [],
        sortKey: dim === 'month' ? monthSort(row.closeDate || row.createdAt) : null,
      });
    }
    buckets.get(key).rows.push(row);
  }

  // reduce each bucket by the chosen metric
  const rows = [];
  for (const [label, b] of buckets) {
    let value;
    if (metric === 'sum') {
      value = b.rows.reduce((s, r) => s + (Number(r.value) || 0), 0);
    } else if (metric === 'winRate') {
      const won = b.rows.filter(r => r.status === 'won').length;
      const closed = b.rows.filter(r => r.status === 'won' || r.status === 'lost').length;
      value = closed ? Math.round((won / closed) * 100) : 0;
    } else {
      value = b.rows.length;
    }
    rows.push({ label, value, sortKey: b.sortKey });
  }

  // sort: months chronologically, everything else by value desc
  if (dim === 'month') rows.sort((a, b) => (a.sortKey || 0) - (b.sortKey || 0));
  else if (dim === 'stage') {
    const order = new Map(STAGES.map((s, i) => [s.name, i]));
    rows.sort((a, b) => (order.get(a.label) ?? 99) - (order.get(b.label) ?? 99));
  } else rows.sort((a, b) => b.value - a.value);

  const valueFormat = metric === 'sum' ? 'money' : metric === 'winRate' ? 'percent' : 'number';
  const metricLabel = metric === 'sum' ? 'Deal value'
    : metric === 'winRate' ? 'Win rate' : 'Count';

  return { rows, metricLabel, valueFormat };
}

/* ---------- CSV export ---------- */
export function reportToCsv(def, computed) {
  const dimLabel = (dimensionsFor(def.source).find(d => d.id === def.groupBy) || {}).label || 'Group';
  const head = [dimLabel, computed.metricLabel];
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [head.map(esc).join(',')];
  for (const r of computed.rows) lines.push([esc(r.label), esc(r.value)].join(','));
  return lines.join('\n');
}

export function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- seed gallery (standard revenue reports) ---------- */
const SEED_REPORTS = [
  { id: 'r_pipeline_stage', title: 'Pipeline by stage', desc: 'Open + closed deal value across every stage.', icon: 'funnel', source: 'deals', metric: 'sum', groupBy: 'stage', chart: 'bar' },
  { id: 'r_revenue_month', title: 'Revenue by month', desc: 'Total deal value bucketed by close month.', icon: 'dollar', source: 'deals', metric: 'sum', groupBy: 'month', chart: 'area' },
  { id: 'r_winrate_rep', title: 'Win rate by rep', desc: 'Closed-won conversion for each rep.', icon: 'target', source: 'deals', metric: 'winRate', groupBy: 'owner', chart: 'bar' },
  { id: 'r_deals_industry', title: 'Deals by industry', desc: 'Where the pipeline concentrates, by vertical.', icon: 'building', source: 'deals', metric: 'count', groupBy: 'industry', chart: 'pie' },
  { id: 'r_activity_type', title: 'Activity by type', desc: 'Calls, emails, meetings and tasks logged.', icon: 'activity', source: 'activities', metric: 'count', groupBy: 'type', chart: 'pie' },
  { id: 'r_forecast_rep', title: 'Forecast by rep', desc: 'Open pipeline each rep is carrying.', icon: 'trendUp', source: 'deals', metric: 'sum', groupBy: 'owner', chart: 'bar' },
  { id: 'r_new_contacts', title: 'New contacts trend', desc: 'Contacts created, month over month.', icon: 'users', source: 'contacts', metric: 'count', groupBy: 'month', chart: 'line' },
  { id: 'r_deals_status', title: 'Deal outcomes', desc: 'Open, won and lost across the book.', icon: 'chart', source: 'deals', metric: 'count', groupBy: 'status', chart: 'pie' },
];

export function seedReports() {
  return SEED_REPORTS.map(r => ({ ...r, seed: true }));
}

/* ---------- persistence (custom saved reports) ---------- */
export function loadSaved() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}
function persist(list) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch {}
}

export function saveReport(def) {
  const list = loadSaved();
  const id = def.id && !def.seed ? def.id : `r_custom_${Date.now().toString(36)}`;
  const clean = {
    id, title: def.title || 'Untitled report',
    desc: def.desc || `${def.metric} of ${def.source} by ${def.groupBy}`,
    icon: def.icon || 'chart',
    source: def.source, metric: def.metric, groupBy: def.groupBy, chart: def.chart,
    custom: true, savedAt: new Date().toISOString(),
  };
  const idx = list.findIndex(r => r.id === id);
  if (idx >= 0) list[idx] = clean; else list.unshift(clean);
  persist(list);
  return clean;
}

export function duplicateReport(def) {
  return saveReport({
    ...def, id: null, seed: false, custom: true,
    title: `${def.title} (copy)`,
  });
}

export function deleteReport(id) {
  persist(loadSaved().filter(r => r.id !== id));
}

/* ---------- all reports (seed + custom), custom first ---------- */
export function allReports() {
  return [...loadSaved(), ...seedReports()];
}
