// data-export.js - whole-workspace data portability. Answers the enterprise
// "can we get ALL our data out if we leave?" question with a real, working
// export: a complete JSON backup plus per-entity CSV. Reads the live stores
// (works local-first today; when the Supabase backend is active the same
// getters back onto server data). NO em-dash / en-dash. ASCII only.
import {
  getUsers, getCompanies, getContacts, getDeals, getActivities, getStages,
} from './store.js';
import {
  getLeads, getProducts, getQuotes, getInvoices, getCampaigns, getSequences, getTickets, getWorkflows,
} from './store-ext.js';

// The full set of exportable collections, in a stable order.
export const EXPORTS = [
  { key: 'companies', label: 'Companies', get: getCompanies },
  { key: 'contacts', label: 'Contacts', get: getContacts },
  { key: 'deals', label: 'Deals', get: getDeals },
  { key: 'activities', label: 'Activities', get: getActivities },
  { key: 'leads', label: 'Leads', get: getLeads },
  { key: 'products', label: 'Products', get: getProducts },
  { key: 'quotes', label: 'Quotes', get: getQuotes },
  { key: 'invoices', label: 'Invoices', get: getInvoices },
  { key: 'campaigns', label: 'Campaigns', get: getCampaigns },
  { key: 'sequences', label: 'Sequences', get: getSequences },
  { key: 'tickets', label: 'Tickets', get: getTickets },
  { key: 'workflows', label: 'Workflows', get: getWorkflows },
  { key: 'users', label: 'Users', get: getUsers },
  { key: 'stages', label: 'Pipeline stages', get: getStages },
];

function safeGet(fn) {
  try { const v = fn(); return Array.isArray(v) ? v : []; } catch { return []; }
}

export function counts() {
  const out = {};
  for (const e of EXPORTS) out[e.key] = safeGet(e.get).length;
  return out;
}

// Complete, re-importable backup of the workspace.
export function buildFullExport() {
  const data = {};
  for (const e of EXPORTS) data[e.key] = safeGet(e.get);
  return {
    format: 'ardovo.export.v1',
    exportedAt: new Date().toISOString(),
    source: 'Ardovo',
    counts: counts(),
    data,
  };
}

/* ---------- CSV ---------- */
function cell(v) {
  if (v == null) return '';
  const s = (typeof v === 'object') ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function toCsv(rows) {
  if (!rows || !rows.length) return '';
  const cols = Array.from(rows.reduce((set, r) => { Object.keys(r || {}).forEach(k => set.add(k)); return set; }, new Set()));
  const head = cols.join(',');
  const body = rows.map(r => cols.map(c => cell(r ? r[c] : '')).join(',')).join('\n');
  return head + '\n' + body;
}

/* ---------- download helpers ---------- */
function stamp() { return new Date().toISOString().slice(0, 10); }
function download(filename, text, type) {
  const blob = new Blob([text], { type: type || 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function downloadFullJson() {
  download(`ardovo-export-${stamp()}.json`, JSON.stringify(buildFullExport(), null, 2), 'application/json');
}
export function downloadEntityCsv(key) {
  const entry = EXPORTS.find(e => e.key === key);
  if (!entry) return;
  download(`ardovo-${key}-${stamp()}.csv`, toCsv(safeGet(entry.get)), 'text/csv;charset=utf-8');
}
export function downloadAllCsv() {
  // One CSV per non-empty collection, fired sequentially.
  EXPORTS.filter(e => safeGet(e.get).length).forEach((e, i) => setTimeout(() => downloadEntityCsv(e.key), i * 250));
}
