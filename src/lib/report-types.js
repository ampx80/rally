// ============================================================
// ARDOVO CROSS-OBJECT REPORT TYPES  (additive to report-builder.js)
// The v2 Report Builder (src/lib/report-builder.js) reports over a
// SINGLE object at a time (deals OR contacts OR ...). This module adds
// a registry of JOINED report types - denormalized views that flatten
// a join across two objects into flat, reportable rows:
//   - deals-with-contacts   (one row per deal <-> contact link)
//   - deals-with-company    (each deal enriched with its account)
//   - activities-by-rep     (each activity enriched with owner + link)
//   - contacts-with-company (each contact enriched with its account)
// Each type exposes the same shape the builder already understands:
// dims (group-by), measures (aggregatable numbers) and a build() that
// materializes the joined rows off the LIVE store. runJoinedReport()
// then groups + aggregates them and returns a `computed` object that
// is drop-in compatible with the existing VizPreview component, so the
// charts, tables and CSV all render with zero new chart code.
//
// This is ADDITIVE + READ-ONLY. It imports (never mutates) store.js and
// REUSES formatValue + AGGREGATIONS from report-builder.js so formatting
// stays identical. Nothing in report-builder.js changes.
// SUPABASE: each build() maps to a SQL join / view (rally_deal_contacts,
// etc). ASCII only. NO em-dash / en-dash.
// ============================================================
import {
  getDeals, getContacts, getCompanies, getActivities,
  userName, stageById, getCompany, getContact,
} from './store.js';
import { formatValue, AGGREGATIONS } from './report-builder.js';

const cap = (s) => String(s || '').replace(/^\w/, c => c.toUpperCase());
const weighted = (d) => (Number(d.value) || 0) * ((d.probability ?? 0) / 100);

/* Deterministic per-deal lead source (same mix the Marketing Hub uses), kept
   self-contained so this module never hard-depends on markethub-data.js. */
const LEAD_SOURCE_MIX = [
  { label: 'Organic Search', w: 18 }, { label: 'Paid Search', w: 14 },
  { label: 'Email', w: 12 }, { label: 'Social', w: 10 },
  { label: 'Events', w: 8 }, { label: 'Referral', w: 8 },
  { label: 'Content', w: 8 }, { label: 'Outbound Sales', w: 22 },
];
function strhash(s) {
  let h = 0; const str = String(s == null ? '' : s);
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function leadSourceFor(deal) {
  const total = LEAD_SOURCE_MIX.reduce((s, m) => s + m.w, 0);
  let r = strhash('src|' + (deal?.id || '')) % total;
  for (const m of LEAD_SOURCE_MIX) { if (r < m.w) return m.label; r -= m.w; }
  return 'Outbound Sales';
}
// Per-deal email + total activity counts (a real deal -> activities join).
function engagementByDeal() {
  const emails = new Map(), touches = new Map();
  try {
    for (const a of getActivities()) {
      if (a.relatedType !== 'deal' || !a.relatedId) continue;
      touches.set(a.relatedId, (touches.get(a.relatedId) || 0) + 1);
      if (a.type === 'email') emails.set(a.relatedId, (emails.get(a.relatedId) || 0) + 1);
    }
  } catch {}
  return { emails, touches };
}

/* ============================================================
   REGISTRY
   A report type flattens a join into rows carrying plain values, so
   grouping is just row[dim] and aggregating is just row[measure].
   `type` on a measure drives value formatting (money | number | percent).
   ============================================================ */
export const JOIN_TYPES = [
  {
    id: 'deals-with-contacts',
    label: 'Deals with contacts',
    desc: 'One row per deal-to-contact link. Report on who is attached to the pipeline.',
    icon: 'users', noun: 'deal-contact',
    dims: [
      { id: 'stage', label: 'Deal stage' },
      { id: 'status', label: 'Deal status' },
      { id: 'owner', label: 'Deal owner' },
      { id: 'contactTitle', label: 'Contact title' },
      { id: 'company', label: 'Company' },
      { id: 'industry', label: 'Industry' },
    ],
    measures: [
      { id: 'dealValue', label: 'Deal value (per link)', type: 'money' },
      { id: 'weighted', label: 'Weighted value (per link)', type: 'money' },
      { id: 'probability', label: 'Probability', type: 'percent' },
    ],
    build() {
      const rows = [];
      for (const d of getDeals()) {
        const co = d.companyId ? getCompany(d.companyId) : null;
        const links = (d.contactIds || []);
        if (!links.length) continue;
        for (const cid of links) {
          const c = getContact(cid);
          if (!c) continue;
          rows.push({
            id: `${d.id}:${cid}`,
            stage: stageById(d.stage)?.name || cap(d.stage),
            status: cap(d.status || 'open'),
            owner: userName(d.ownerId),
            contactTitle: c.title || 'Unknown',
            company: co?.name || 'Unknown',
            industry: co?.industry || 'Unknown',
            dealValue: Number(d.value) || 0,
            weighted: weighted(d),
            probability: Number(d.probability) || 0,
          });
        }
      }
      return rows;
    },
  },
  {
    id: 'deals-with-company',
    label: 'Deals with company',
    desc: 'Each deal enriched with its account. Slice pipeline by firmographics.',
    icon: 'building', noun: 'deal',
    dims: [
      { id: 'industry', label: 'Industry' },
      { id: 'size', label: 'Company size' },
      { id: 'health', label: 'Account health' },
      { id: 'location', label: 'Location' },
      { id: 'stage', label: 'Deal stage' },
      { id: 'status', label: 'Deal status' },
      { id: 'owner', label: 'Owner' },
    ],
    measures: [
      { id: 'value', label: 'Deal value', type: 'money' },
      { id: 'weighted', label: 'Weighted value', type: 'money' },
      { id: 'probability', label: 'Probability', type: 'percent' },
    ],
    build() {
      const rows = [];
      for (const d of getDeals()) {
        const co = d.companyId ? getCompany(d.companyId) : null;
        rows.push({
          id: d.id,
          industry: co?.industry || 'Unknown',
          size: co?.size || 'Unknown',
          health: cap(co?.health || 'green'),
          location: co?.location || 'Unknown',
          stage: stageById(d.stage)?.name || cap(d.stage),
          status: cap(d.status || 'open'),
          owner: userName(d.ownerId),
          value: Number(d.value) || 0,
          weighted: weighted(d),
          probability: Number(d.probability) || 0,
        });
      }
      return rows;
    },
  },
  {
    id: 'activities-by-rep',
    label: 'Activities by rep',
    desc: 'Every logged activity enriched with owner + the record it touches.',
    icon: 'activity', noun: 'activity',
    dims: [
      { id: 'owner', label: 'Rep (owner)' },
      { id: 'type', label: 'Activity type' },
      { id: 'relatedType', label: 'Related to' },
      { id: 'done', label: 'Completed' },
      { id: 'company', label: 'Company' },
    ],
    measures: [], // activities have no numeric field -> count only
    build() {
      const rows = [];
      for (const a of getActivities()) {
        const co = a.companyId ? getCompany(a.companyId) : null;
        rows.push({
          id: a.id,
          owner: userName(a.ownerId),
          type: cap(a.type || 'other'),
          relatedType: cap(a.relatedType || 'none'),
          done: a.done ? 'Completed' : 'Open',
          company: co?.name || 'Unassigned',
        });
      }
      return rows;
    },
  },
  {
    id: 'pipeline-source-engagement',
    label: 'Pipeline by source + engagement',
    desc: 'Each deal joined to its lead source and its email engagement. The cross-object view for "which channels drive pipeline, and how engaged are they".',
    icon: 'radar', noun: 'deal',
    dims: [
      { id: 'leadSource', label: 'Lead source' },
      { id: 'stage', label: 'Deal stage' },
      { id: 'status', label: 'Deal status' },
      { id: 'industry', label: 'Industry' },
      { id: 'owner', label: 'Owner' },
      { id: 'engagementBand', label: 'Engagement band' },
    ],
    measures: [
      { id: 'value', label: 'Pipeline value', type: 'money' },
      { id: 'weighted', label: 'Weighted value', type: 'money' },
      { id: 'emailTouches', label: 'Email touches', type: 'number' },
      { id: 'totalTouches', label: 'Total activities', type: 'number' },
    ],
    build() {
      const { emails, touches } = engagementByDeal();
      const rows = [];
      for (const d of getDeals()) {
        const co = d.companyId ? getCompany(d.companyId) : null;
        const et = emails.get(d.id) || 0;
        const band = et === 0 ? 'No engagement' : et <= 2 ? 'Low (1-2)' : et <= 5 ? 'Medium (3-5)' : 'High (6+)';
        rows.push({
          id: d.id,
          leadSource: leadSourceFor(d),
          stage: stageById(d.stage)?.name || cap(d.stage),
          status: cap(d.status || 'open'),
          industry: co?.industry || 'Unknown',
          owner: userName(d.ownerId),
          engagementBand: band,
          value: Number(d.value) || 0,
          weighted: weighted(d),
          emailTouches: et,
          totalTouches: touches.get(d.id) || 0,
        });
      }
      return rows;
    },
  },
  {
    id: 'contacts-with-company',
    label: 'Contacts with company',
    desc: 'Each contact enriched with its account for people-by-firmographic reports.',
    icon: 'user', noun: 'contact',
    dims: [
      { id: 'industry', label: 'Industry' },
      { id: 'size', label: 'Company size' },
      { id: 'health', label: 'Account health' },
      { id: 'title', label: 'Title' },
      { id: 'lifecycleStage', label: 'Lifecycle stage' },
      { id: 'owner', label: 'Owner' },
    ],
    measures: [], // count only
    build() {
      const rows = [];
      for (const c of getContacts()) {
        const co = c.companyId ? getCompany(c.companyId) : null;
        rows.push({
          id: c.id,
          industry: co?.industry || 'Unknown',
          size: co?.size || 'Unknown',
          health: cap(co?.health || 'green'),
          title: c.title || 'Unknown',
          lifecycleStage: cap(c.lifecycleStage || 'lead'),
          owner: userName(c.ownerId),
        });
      }
      return rows;
    },
  },
];

export const joinTypeById = (id) => JOIN_TYPES.find(t => t.id === id) || JOIN_TYPES[0];
export const dimsForJoin = (id) => joinTypeById(id).dims;
export const measuresForJoin = (id) => joinTypeById(id).measures;
// Only count works when a type has no numeric measure; otherwise all aggs apply.
export function aggsForJoin(id) {
  return measuresForJoin(id).length ? AGGREGATIONS : AGGREGATIONS.filter(a => a.id === 'count');
}

// A valid default definition for a join type (first dim, count/first-measure).
export function emptyJoinDef(typeId = JOIN_TYPES[0].id) {
  const t = joinTypeById(typeId);
  const hasMeasure = t.measures.length > 0;
  return {
    type: t.id,
    dim: t.dims[0].id,
    measure: hasMeasure ? t.measures[0].id : null,
    agg: hasMeasure ? 'sum' : 'count',
    viz: 'bar',
  };
}

// Keep a definition internally valid after the type changes.
export function reconcileJoinDef(def) {
  const t = joinTypeById(def.type);
  const dim = t.dims.some(d => d.id === def.dim) ? def.dim : t.dims[0].id;
  const measures = t.measures.map(m => m.id);
  let agg = def.agg || 'count';
  let measure = def.measure;
  if (agg !== 'count' && !measures.includes(measure)) {
    measure = measures[0] || null;
    if (!measure) agg = 'count';
  }
  if (agg === 'count') measure = null;
  return { type: t.id, dim, measure, agg, viz: def.viz || 'bar' };
}

/* ============================================================
   ENGINE
   Groups the joined rows by `dim`, aggregates `measure` under `agg`,
   and returns a `computed` object shaped EXACTLY like the one the
   existing VizPreview renders (rows / series / valueFormat /
   measureLabel / dimLabel / recordCount / kpi / total).
   ============================================================ */
function aggregate(values, agg) {
  if (!values.length) return 0;
  if (agg === 'sum') return values.reduce((s, v) => s + v, 0);
  if (agg === 'avg') return values.reduce((s, v) => s + v, 0) / values.length;
  if (agg === 'min') return Math.min(...values);
  if (agg === 'max') return Math.max(...values);
  return values.length; // count
}

export function runJoinedReport(def) {
  const d = reconcileJoinDef(def);
  const type = joinTypeById(d.type);
  const rows = type.build();

  const measureField = type.measures.find(m => m.id === d.measure);
  const valueFormat = d.agg === 'count' ? 'number' : (measureField?.type || 'number');
  const measureLabel = d.agg === 'count'
    ? 'Count'
    : `${(AGGREGATIONS.find(a => a.id === d.agg) || {}).label || 'Sum'} of ${measureField?.label || 'value'}`;
  const dimLabel = (type.dims.find(x => x.id === d.dim) || {}).label || 'Group';

  const buckets = new Map(); // label -> number[]
  for (const r of rows) {
    const key = r[d.dim] == null || r[d.dim] === '' ? 'Unknown' : String(r[d.dim]);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(d.agg === 'count' ? 1 : (Number(r[d.measure]) || 0));
  }

  const out = [];
  for (const [label, values] of buckets) {
    out.push({ label, value: aggregate(values, d.agg), count: values.length });
  }
  out.sort((a, b) => b.value - a.value);

  const total = valueFormat === 'percent'
    ? (out.length ? out.reduce((s, r) => s + r.value, 0) / out.length : 0)
    : out.reduce((s, r) => s + r.value, 0);

  return {
    rows: out, series: [], valueFormat, measureLabel, dimLabel,
    recordCount: rows.length, total, kpi: total, def: d,
  };
}

/* ---------- CSV export (mirrors report-builder's shape) ---------- */
export function joinedToCsv(computed) {
  const esc = (v) => {
    const s = String(v == null ? '' : v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [[computed.dimLabel, computed.measureLabel].map(esc).join(',')];
  for (const r of computed.rows) lines.push([esc(r.label), esc(Math.round(r.value))].join(','));
  return lines.join('\n');
}

// Re-export formatValue so the demo surface can format without a second import.
export { formatValue };
