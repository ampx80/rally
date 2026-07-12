// ============================================================
// GENERATIVE UI - SAFE BINDING LAYER  (browser, store-bound)
// ------------------------------------------------------------
// Turns a validated ui_spec's DATA references into live rows/scalars by
// calling ONLY the whitelisted store selectors named in grammar.js.
// There is no eval and no dynamic property access from spec strings: a
// spec can name "deals.slipping" but the mapping from that name to a
// function lives here, in code, not in the spec. This is the only place
// generated specs touch the store, and it is read-only.
//
// Re-exports the grammar surface so callers import one module.
// ============================================================
import {
  getDeals, openDeals, slippingDeals, dealsClosingThisMonth,
  getCompanies, getContacts, getContactsForCompany, getDealsForCompany,
  getCompany, contactName, userName, stageById,
  pipelineValue, weightedForecast, winRate, wonThisMonth,
  myDayQueue, getCurrentUser, getDeal, getContact,
} from '../store.js';
import { computeReport } from '../reports-data.js';
import { REPORT_SOURCES, REPORT_METRICS, REPORT_DIMENSIONS } from './grammar.js';

export * from './grammar.js';

/* ---------- row mappers (plain objects, keys match SELECTORS columns) ---------- */
const dealRow = (d) => ({
  id: d.id,
  name: d.name,
  company: getCompany(d.companyId)?.name || '-',
  stage: stageById(d.stage)?.name || d.stage,
  status: (d.status || 'open').replace(/^\w/, c => c.toUpperCase()),
  value: d.value,
  probability: d.probability,
  closeDate: d.closeDate,
  owner: userName(d.ownerId),
});
const companyRow = (c) => ({
  id: c.id,
  name: c.name,
  industry: c.industry,
  size: c.size,
  health: (c.health || 'green').replace(/^\w/, x => x.toUpperCase()),
  owner: userName(c.ownerId),
  openPipeline: getDealsForCompany(c.id).filter(d => d.status === 'open').reduce((a, d) => a + d.value, 0),
  contacts: getContactsForCompany(c.id).length,
});
const contactRow = (c) => ({
  id: c.id,
  name: contactName(c),
  title: c.title || '-',
  company: getCompany(c.companyId)?.name || '-',
  email: c.email || '-',
  owner: userName(c.ownerId),
});
const activityRow = (a) => {
  let related = '-';
  if (a.relatedType === 'deal') related = getDeal(a.relatedId)?.name || 'Deal';
  else if (a.relatedType === 'contact') related = contactName(getContact(a.relatedId)) || 'Contact';
  else if (a.relatedType === 'company') related = getCompany(a.relatedId)?.name || 'Company';
  return { id: a.id, type: (a.type || 'task').replace(/^\w/, c => c.toUpperCase()), subject: a.subject, due: a.dueAt, related };
};

/* ---------- report() safe dispatch ---------- */
function runReport(args = {}) {
  const source = REPORT_SOURCES.includes(args.source) ? args.source : 'deals';
  const metric = REPORT_METRICS.includes(args.metric) ? args.metric : 'count';
  const groupBy = REPORT_DIMENSIONS.includes(args.groupBy) ? args.groupBy : 'stage';
  const out = computeReport({ source, metric, groupBy });
  // Expose the value format so charts/tables can render money vs percent.
  return { rows: out.rows.map(r => ({ label: r.label, value: r.value })), valueFormat: out.valueFormat, metricLabel: out.metricLabel };
}

/* ============================================================
   resolveData(ref) -> { rows, valueFormat? }
   The ONLY bridge from a spec data-ref to the store. Any selector not
   in this switch returns an empty result (defense in depth on top of
   grammar validation).
   ============================================================ */
export function resolveData(ref) {
  if (!ref || typeof ref !== 'object') return { rows: [] };
  switch (ref.selector) {
    case 'deals.open': return { rows: openDeals().map(dealRow) };
    case 'deals.all': return { rows: getDeals().map(dealRow) };
    case 'deals.slipping': return { rows: slippingDeals().map(dealRow) };
    case 'deals.closingThisMonth': return { rows: dealsClosingThisMonth().map(dealRow) };
    case 'deals.won': return { rows: getDeals().filter(d => d.status === 'won').map(dealRow) };
    case 'deals.lost': return { rows: getDeals().filter(d => d.status === 'lost').map(dealRow) };
    case 'companies.all': return { rows: getCompanies().map(companyRow) };
    case 'contacts.all': return { rows: getContacts().map(contactRow) };
    case 'activities.myDay': return { rows: myDayQueue().map(activityRow) };
    case 'report': return runReport(ref.args);
    default: return { rows: [] };
  }
}

/* ============================================================
   resolveKpi(name) -> number   (whitelisted scalars only)
   ============================================================ */
export function resolveKpi(name) {
  switch (name) {
    case 'pipeline': return pipelineValue();
    case 'forecast': return Math.round(weightedForecast());
    case 'winRate': return winRate();
    case 'wonThisMonth': return wonThisMonth().reduce((a, d) => a + d.value, 0);
    case 'openDeals': return openDeals().length;
    case 'avgDealSize': { const o = openDeals(); return o.length ? Math.round(o.reduce((a, d) => a + d.value, 0) / o.length) : 0; }
    case 'slipping': return slippingDeals().length;
    case 'closingThisMonth': return dealsClosingThisMonth().length;
    case 'totalContacts': return getContacts().length;
    case 'totalCompanies': return getCompanies().length;
    default: return 0;
  }
}

/* ============================================================
   buildAskSnapshot() - compact grounding payload for api/genui.js.
   Just headline metrics + a few names so Rook words the spec well and
   the deterministic fallback can phrase copy. No PII beyond what Rook
   already sees; the actual data still binds live at render time.
   ============================================================ */
export function buildAskSnapshot() {
  const cu = getCurrentUser();
  const deals = getDeals();
  const opens = openDeals();
  const topOpen = [...opens].sort((a, b) => b.value - a.value).slice(0, 6)
    .map(d => ({ name: d.name, company: getCompany(d.companyId)?.name, value: d.value, stage: stageById(d.stage)?.name }));
  return {
    currentUser: { name: cu?.name, title: cu?.title },
    counts: {
      deals: deals.length,
      openDeals: opens.length,
      wonDeals: deals.filter(d => d.status === 'won').length,
      lostDeals: deals.filter(d => d.status === 'lost').length,
      companies: getCompanies().length,
      contacts: getContacts().length,
      slipping: slippingDeals().length,
      closingThisMonth: dealsClosingThisMonth().length,
    },
    revenue: {
      pipeline: pipelineValue(),
      forecast: Math.round(weightedForecast()),
      winRate: winRate(),
      wonThisMonth: wonThisMonth().reduce((a, d) => a + d.value, 0),
    },
    topOpenDeals: topOpen,
  };
}
