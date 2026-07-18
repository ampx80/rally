// ============================================================
// ARDOVO PLATFORM STORE (extension)
// The modules beyond the CRM core: Leads, Products, Quotes,
// Invoices, Campaigns, Sequences, Tickets, Workflows. Same
// local-first, deterministic-seed, Supabase-swappable pattern as
// store.js. Linked to the real companies/contacts so the whole
// platform feels like one system. Live tables would be rally_*.
// ============================================================
import { useEffect, useState } from 'react';
import { getCompanies, getContacts, getUsers, userName, contactName, getCompany } from './store.js';

const LS_KEY = 'rally_ext_v1';

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LEAD_SOURCES = ['Inbound', 'Outbound', 'Referral', 'Event', 'Webinar', 'Partner', 'Paid ads', 'Content'];
const LEAD_STATUS = ['new', 'working', 'qualified', 'unqualified'];
const FIRST = ['Alex', 'Jamie', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn', 'Drew', 'Skyler', 'Reese', 'Parker', 'Rowan', 'Sage', 'Emerson', 'Harper', 'Kai', 'Lena', 'Omar', 'Bianca'];
const LAST = ['Cohen', 'Ramirez', 'Walsh', 'Bauer', 'Nakamura', 'Osei', 'Petrov', 'Delgado', 'Fischer', 'Yoon', 'Marchetti', 'Abbas', 'Lindqvist', 'Barnes', 'Cho', 'Guerra', 'Novak', 'Reddy', 'Sato', 'Vaughn'];
const PRODUCTS = [
  { name: 'Ardovo CRM', category: 'Platform', price: 90, billing: 'monthly/seat' },
  { name: 'Ardovo CRM Enterprise', category: 'Platform', price: 165, billing: 'monthly/seat' },
  { name: 'Rook AI Operator', category: 'AI', price: 60, billing: 'monthly/seat' },
  { name: 'Ardovo Marketing', category: 'Marketing', price: 800, billing: 'monthly' },
  { name: 'Ardovo Sequences', category: 'Marketing', price: 40, billing: 'monthly/seat' },
  { name: 'Ardovo Service Cloud', category: 'Service', price: 75, billing: 'monthly/seat' },
  { name: 'Ardovo CPQ', category: 'Revenue', price: 120, billing: 'monthly/seat' },
  { name: 'Ardovo Billing', category: 'Revenue', price: 500, billing: 'monthly' },
  { name: 'Ardovo Analytics Plus', category: 'Intelligence', price: 300, billing: 'monthly' },
  { name: 'Ardovo Workflows', category: 'Automate', price: 250, billing: 'monthly' },
  { name: 'Implementation - Standard', category: 'Services', price: 12000, billing: 'one-time' },
  { name: 'Implementation - Enterprise', category: 'Services', price: 45000, billing: 'one-time' },
  { name: 'Premier Support', category: 'Services', price: 2000, billing: 'monthly' },
  { name: 'Data Migration', category: 'Services', price: 8000, billing: 'one-time' },
];
const CAMPAIGNS = [
  { name: 'Q3 Enterprise ABM', channel: 'ABM' }, { name: 'RevOps Newsletter', channel: 'Email' },
  { name: 'Ardovo vs Salesforce', channel: 'Paid ads' }, { name: 'AI in Revenue Webinar', channel: 'Webinar' },
  { name: 'Manufacturing Vertical Push', channel: 'Email' }, { name: 'Product Launch - Rook', channel: 'Event' },
  { name: 'Reengagement - Cold Accounts', channel: 'Email' }, { name: 'Partner Co-Marketing', channel: 'Partner' },
  { name: 'Field Dinner Series', channel: 'Event' }, { name: 'Free Trial Nurture', channel: 'Email' },
];
const SEQUENCES = [
  { name: 'New inbound - 7 touch', steps: 7 }, { name: 'Outbound cold - 12 touch', steps: 12 },
  { name: 'Demo no-show recovery', steps: 4 }, { name: 'Post-demo follow-up', steps: 5 },
  { name: 'Renewal 90 days out', steps: 6 }, { name: 'Champion left - re-map', steps: 5 },
];
const TICKET_SUBJECTS = ['Cannot sync pipeline', 'SSO login failing', 'Billing discrepancy', 'API rate limit questions', 'Report export blank', 'Data import stuck', 'Feature request: bulk edit', 'Rook not responding', 'Seat provisioning delay', 'Webhook not firing', 'Dashboard slow to load', 'Onboarding help needed'];
const WORKFLOWS = [
  { name: 'Round-robin lead assignment', trigger: 'New lead created' },
  { name: 'Slack alert on deal over 100k', trigger: 'Deal stage changed' },
  { name: 'Auto-create renewal 90 days out', trigger: 'Deal closed won' },
  { name: 'Overdue invoice reminder', trigger: 'Invoice past due' },
  { name: 'Enrich company on create', trigger: 'Company created' },
  { name: 'Task on stalled deal', trigger: 'No activity 14 days' },
  { name: 'Welcome email on trial start', trigger: 'Trial started' },
  { name: 'Escalate urgent ticket', trigger: 'Ticket priority = urgent' },
];

function buildSeed() {
  const rnd = mulberry32(20260709);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const range = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const chance = (p) => rnd() < p;
  const now = Date.now();
  const DAY = 86400000;
  const d = (n) => new Date(now + n * DAY).toISOString();

  const companies = getCompanies();
  const contacts = getContacts();
  const reps = getUsers().filter(u => u.role === 'rep');
  const repId = () => pick(reps).id;

  // Leads (top of funnel, not yet accounts)
  const leadCos = ['Brightwave', 'Halogen', 'Cindermark', 'Northgate', 'Silvertree', 'Everline', 'Foundry42', 'Blue Meridian', 'Ashford', 'Terradyne', 'Vireon', 'Quillette', 'Stonebridge', 'Marlowe', 'Oakhurst', 'Panorama', 'Wexford', 'Alderman', 'Cresta', 'Dunmore'];
  const leads = [];
  for (let i = 0; i < 54; i++) {
    const fn = pick(FIRST), ln = pick(LAST);
    const co = pick(leadCos) + ' ' + pick(['Inc', 'Labs', 'Group', 'Co', 'Systems', 'Digital']);
    const status = pick(LEAD_STATUS);
    leads.push({
      id: `l_${i + 1}`, firstName: fn, lastName: ln, name: `${fn} ${ln}`,
      company: co, title: pick(['VP Sales', 'RevOps Lead', 'CRO', 'Head of Growth', 'Director of Sales', 'COO', 'Founder']),
      email: `${fn.toLowerCase()}@${co.toLowerCase().replace(/[^a-z]/g, '')}.com`,
      source: pick(LEAD_SOURCES), status, score: status === 'qualified' ? range(70, 98) : status === 'working' ? range(40, 80) : range(5, 60),
      ownerId: repId(), createdAt: d(-range(0, 45)),
    });
  }

  const products = PRODUCTS.map((p, i) => ({ id: `p_${i + 1}`, sku: 'RLY-' + String(1000 + i), active: chance(0.92), ...p }));

  // Quotes tied to companies
  const quotes = [];
  for (let i = 0; i < 28; i++) {
    const co = pick(companies);
    const status = pick(['draft', 'sent', 'sent', 'accepted', 'accepted', 'expired']);
    const seats = range(15, 240);
    const amount = seats * pick([90, 165, 60]) * 12;
    quotes.push({
      id: `q_${i + 1}`, number: 'Q-' + String(2400 + i), companyId: co.id, companyName: co.name,
      amount, seats, status, ownerId: co.ownerId,
      createdAt: d(-range(1, 60)), expiresAt: d(range(-10, 30)),
    });
  }

  // Invoices (billing)
  const invoices = [];
  for (let i = 0; i < 44; i++) {
    const co = pick(companies);
    const roll = rnd();
    const status = roll < 0.6 ? 'paid' : roll < 0.8 ? 'open' : roll < 0.92 ? 'overdue' : 'draft';
    const amount = range(4, 90) * 1000;
    const issued = d(-range(2, 150));
    invoices.push({
      id: `inv_${i + 1}`, number: 'INV-' + String(10500 + i), companyId: co.id, companyName: co.name,
      amount, status, issuedAt: issued, dueAt: d(-range(-40, 90)),
    });
  }

  // Campaigns with funnel metrics
  const campaigns = CAMPAIGNS.map((c, i) => {
    const sent = range(1200, 42000);
    const opened = Math.round(sent * (0.28 + rnd() * 0.34));
    const clicked = Math.round(opened * (0.08 + rnd() * 0.22));
    const status = pick(['active', 'active', 'scheduled', 'completed', 'draft']);
    return {
      id: `cmp_${i + 1}`, ...c, status, sent, opened, clicked,
      leads: Math.round(clicked * (0.1 + rnd() * 0.3)),
      revenue: range(20, 900) * 1000, budget: range(5, 120) * 1000,
      startAt: d(-range(-14, 90)),
    };
  });

  const sequences = SEQUENCES.map((s, i) => {
    const enrolled = range(20, 480);
    return {
      id: `seq_${i + 1}`, ...s, active: chance(0.7), enrolled,
      openRate: Math.round((40 + rnd() * 40)), replyRate: Math.round((4 + rnd() * 22)),
      meetings: range(2, 40),
    };
  });

  // Support tickets tied to companies/contacts
  const tickets = [];
  for (let i = 0; i < 26; i++) {
    const co = pick(companies);
    const coContacts = contacts.filter(c => c.companyId === co.id);
    const ct = coContacts.length ? pick(coContacts) : null;
    const status = pick(['open', 'open', 'pending', 'solved', 'solved']);
    tickets.push({
      id: `tk_${i + 1}`, number: String(4800 + i), subject: pick(TICKET_SUBJECTS),
      companyId: co.id, companyName: co.name, contactId: ct?.id || null, contactName: ct ? contactName(ct) : 'Unknown',
      priority: pick(['low', 'medium', 'medium', 'high', 'urgent']), status,
      assigneeId: repId(), createdAt: d(-range(0, 30)),
    });
  }

  const workflows = WORKFLOWS.map((w, i) => ({
    id: `wf_${i + 1}`, ...w, active: chance(0.75),
    actions: range(1, 5), runs: range(12, 4200), lastRun: d(-range(0, 6)),
  }));

  return { seededAt: new Date(now).toISOString(), leads, products, quotes, invoices, campaigns, sequences, tickets, workflows };
}

/* persistence + pub/sub */
let state = load();
const subs = new Set();
function load() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) return JSON.parse(raw); } catch {}
  const seed = buildSeed();
  try { localStorage.setItem(LS_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}
function commit(next) {
  state = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}
export function resetExt() { try { localStorage.removeItem(LS_KEY); } catch {} state = load(); subs.forEach(fn => fn(state)); }
export function useExt(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => { const fn = (s) => setSnap(selector(s)); subs.add(fn); fn(state); return () => subs.delete(fn); }, []);
  return snap;
}
let idc = Date.now();
const newId = (p) => `${p}_${(idc++).toString(36)}`;

/* READ API */
export const getLeads = () => state.leads;
export const getProducts = () => state.products;
export const getQuotes = () => state.quotes;
export const getInvoices = () => state.invoices;
export const getCampaigns = () => state.campaigns;
export const getSequences = () => state.sequences;
export const getTickets = () => state.tickets;
export const getWorkflows = () => state.workflows;

/* derived */
export const arOutstanding = () => state.invoices.filter(i => i.status === 'open' || i.status === 'overdue').reduce((s, i) => s + i.amount, 0);
export const arOverdue = () => state.invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount, 0);
export const arPaid = () => state.invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
export const campaignRevenue = () => state.campaigns.reduce((s, c) => s + c.revenue, 0);
export const campaignLeads = () => state.campaigns.reduce((s, c) => s + c.leads, 0);
export const openTickets = () => state.tickets.filter(t => t.status !== 'solved');
export const qualifiedLeads = () => state.leads.filter(l => l.status === 'qualified');

/* light writers for interactivity */
export function updateTicket(id, patch) {
  const t = state.tickets.find(x => x.id === id); if (!t) return { error: 'missing' };
  Object.assign(t, patch); commit({ ...state }); return { ticket: t };
}
export function toggleWorkflow(id) {
  const w = state.workflows.find(x => x.id === id); if (!w) return { error: 'missing' };
  w.active = !w.active; commit({ ...state }); return { workflow: w };
}
export function updateLead(id, patch) {
  const l = state.leads.find(x => x.id === id); if (!l) return { error: 'missing' };
  Object.assign(l, patch); commit({ ...state }); return { lead: l };
}
export function createLead({ firstName, lastName, company, title, email, source = 'Inbound' }) {
  if (!firstName) return { error: 'firstName', message: 'First name is required.' };
  const l = { id: newId('l'), firstName, lastName: lastName || '', name: `${firstName} ${lastName || ''}`.trim(), company: company || '', title: title || '', email: email || '', source, status: 'new', score: 20, ownerId: getUsers()[0].id, createdAt: new Date().toISOString() };
  commit({ ...state, leads: [l, ...state.leads] }); return { lead: l };
}
export function updateQuote(id, patch) {
  const q = state.quotes.find(x => x.id === id); if (!q) return { error: 'missing' };
  Object.assign(q, patch); commit({ ...state }); return { quote: q };
}
// SUPABASE: rally_quotes.insert(row).select().single()
export function createQuote({ companyId, dealId = null, ownerId, amount = 0, seats = 0, status = 'draft', expiresAt } = {}) {
  if (!companyId) return { error: 'companyId', message: 'Pick an account for the quote.' };
  const co = getCompany(companyId);
  const nums = state.quotes.map(q => parseInt(String(q.number).replace(/\D/g, ''), 10)).filter(Number.isFinite);
  const next = (nums.length ? Math.max(...nums) : 2400) + 1;
  const q = {
    id: newId('q'), number: 'Q-' + next, companyId,
    companyName: co ? co.name : 'Unknown account', dealId,
    amount: Number(amount) || 0, seats: Number(seats) || 0, status,
    ownerId: ownerId || (co ? co.ownerId : getUsers()[0].id),
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt || new Date(Date.now() + 30 * 86400000).toISOString(),
  };
  commit({ ...state, quotes: [q, ...state.quotes] });
  return { quote: q };
}
export function updateInvoice(id, patch) {
  const i = state.invoices.find(x => x.id === id); if (!i) return { error: 'missing' };
  Object.assign(i, patch); commit({ ...state }); return { invoice: i };
}
