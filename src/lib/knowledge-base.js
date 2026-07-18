// ============================================================
// ARDOVO KNOWLEDGE BASE  (local-first, Supabase-swappable)
// The native help-desk knowledge layer behind the Service Hub. A
// persisted slice of KB articles + categories with full-text search,
// helpful-vote scoring, and view tracking. Seeded with real, practical
// CRM/support articles so the manager + reader look alive on first run.
//
// This slice is ADDITIVE and self-contained. It owns its own
// localStorage key and pub/sub, mirroring the store.js / lists.js /
// marketing-campaigns.js pattern (deterministic seed, commit + notify,
// a useKb() reactive hook). Nothing here mutates any other slice.
//
// SUPABASE: a live build reads/writes rally_kb_articles (per workspace,
// realtime) + rally_kb_categories (config). The read/write API mirrors
// the eventual table columns 1:1 so the swap is mechanical.
//
// ASCII only. NO em-dash / en-dash. ASCII hyphen only.
// ============================================================
import { useEffect, useState } from 'react';

const LS_KEY = 'rally_kb_v1';   // bump to force a clean reseed
const nowIso = () => new Date().toISOString();

/* ============================================================
   CATEGORIES  (config; icons resolve against components/icons.jsx)
   ============================================================ */
export const KB_CATEGORIES = [
  { id: 'getting-started', name: 'Getting started', icon: 'rocket', blurb: 'Set up your workspace and learn the essentials.' },
  { id: 'data', name: 'Data and imports', icon: 'download', blurb: 'Bring your book of business into Ardovo cleanly.' },
  { id: 'deals', name: 'Deals and pipeline', icon: 'target', blurb: 'Move deals through stages and keep the forecast honest.' },
  { id: 'rook', name: 'Rook AI', icon: 'sparkles', blurb: 'Put the AI operator to work on your revenue data.' },
  { id: 'reports', name: 'Reports and dashboards', icon: 'pie', blurb: 'Build the views your team runs the business on.' },
  { id: 'automations', name: 'Automations', icon: 'workflow', blurb: 'Sequences, workflows, and hands-off follow-up.' },
  { id: 'billing', name: 'Quotes and billing', icon: 'receipt', blurb: 'Quotes, e-signature, invoices, and revenue.' },
  { id: 'integrations', name: 'Integrations', icon: 'plug', blurb: 'Connect the tools your revenue stack already runs on.' },
  { id: 'success', name: 'Customer success', icon: 'shield', blurb: 'Health scores, renewals, and save plays.' },
  { id: 'admin', name: 'Admin and security', icon: 'lock', blurb: 'Roles, permissions, and keeping data safe.' },
];
export const kbCategory = (id) => KB_CATEGORIES.find(c => c.id === id) || { id: id || 'other', name: id || 'Other', icon: 'fileText', blurb: '' };
export const getKbCategories = () => KB_CATEGORIES;

/* ============================================================
   DETERMINISTIC SEED NUMBERS  (stable views + votes per article)
   ============================================================ */
function hashStr(s = '') {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function seededStats(slug) {
  const h = hashStr('kb:' + slug);
  const views = 180 + (h % 8200);                 // 180 .. ~8400 lifetime views
  const up = 12 + ((h >> 4) % 240);               // helpful votes
  const down = (h >> 9) % Math.max(4, Math.round(up * 0.16)); // small not-helpful tail
  return { views, votes: { up, down } };
}
const slugify = (s = '') => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 72) || 'article';

/* ============================================================
   SEED ARTICLES  (real, practical guidance; ASCII only)
   Each: { title, category, summary, tags, sections:[{heading, body}] }
   body paragraphs are separated by a blank line.
   ============================================================ */
const SEED = [
  {
    title: 'Getting started with Ardovo',
    category: 'getting-started',
    summary: 'A five-minute tour of the workspace: the command center, the left rail, and how the demo data works.',
    tags: ['onboarding', 'basics', 'tour'],
    sections: [
      { heading: 'What you are looking at', body: 'Ardovo opens on the command center, your daily home base. It rolls up open pipeline, the deals that need attention today, and what Rook has already handled overnight.\n\nEverything in a fresh workspace is seeded with a realistic book of business so you can explore every feature before importing a single row of your own data.' },
      { heading: 'Finding your way around', body: 'The left rail groups the product into Overview, Customers, Pipeline, Marketing, Success and Delivery, Revenue, Analytics, Automation, and Admin. Collapse the groups you do not use and they stay collapsed per user.\n\nPress Cmd K (Ctrl K on Windows) anywhere to open the command palette and jump to any record or page by name.' },
      { heading: 'Your next three steps', body: '1. Import your contacts and companies, or keep exploring the demo data.\n2. Open a deal and watch how the timeline, health, and Rook suggestions come together.\n3. Ask Rook a question in plain language from the dock in the bottom right.' },
    ],
  },
  {
    title: 'Importing contacts and companies',
    category: 'data',
    summary: 'Upload a CSV, map your columns, and let Ardovo dedupe against the records you already have.',
    tags: ['import', 'csv', 'dedupe', 'data'],
    sections: [
      { heading: 'Start an import', body: 'Go to Admin then Import. Drop in a CSV of contacts, companies, or deals. Ardovo reads the header row and shows you a preview of the first records so you can confirm you uploaded the right file.' },
      { heading: 'Map your columns', body: 'Ardovo auto-matches common headers like Email, First Name, and Company to the right Ardovo fields. Anything it is unsure about is left for you to map by hand. Unmapped columns are skipped, never guessed.' },
      { heading: 'Deduplication', body: 'Before anything is written, Ardovo matches incoming rows against your existing book. Contacts match on email, companies match on domain. Matches are updated in place instead of creating a duplicate, and you see the exact create versus update counts before you commit.' },
      { heading: 'After the import', body: 'Every imported record is tagged with its source and import batch, so you can filter to exactly what came in and undo a bad load by list.' },
    ],
  },
  {
    title: 'Creating and working deals',
    category: 'deals',
    summary: 'Open a deal, tie it to the right company and contacts, and keep the timeline current so the forecast stays honest.',
    tags: ['deals', 'pipeline', 'basics'],
    sections: [
      { heading: 'Open a new deal', body: 'From the Deals page, use New deal in the top right. Give it a name, amount, close date, and the company it belongs to. The owning rep defaults to you and the stage defaults to the first open stage.' },
      { heading: 'Connect the people', body: 'Add the contacts involved and mark the roles that matter: champion, economic buyer, and any blocker. Ardovo uses these roles to score deal health and to warn you when a single-threaded deal has no backup relationship.' },
      { heading: 'Keep the timeline alive', body: 'Log calls, emails, meetings, and notes right on the deal. The most recent activity drives the deal freshness signal, and a deal that goes quiet is surfaced back to you before it slips.' },
    ],
  },
  {
    title: 'Pipeline stages and win probability',
    category: 'deals',
    summary: 'How the default stages map to probability, and how weighted pipeline is calculated for your forecast.',
    tags: ['pipeline', 'stages', 'forecast', 'probability'],
    sections: [
      { heading: 'The default stages', body: 'A deal moves through Lead, Qualified, Discovery, Proposal, and Negotiation before it lands in Closed Won or Closed Lost. Each open stage carries a default win probability, rising from 10 percent at Lead to 85 percent at Negotiation.' },
      { heading: 'Weighted pipeline', body: 'Weighted pipeline multiplies each open deal amount by its stage probability. It is the number your forecast leans on because it discounts early-stage optimism automatically.' },
      { heading: 'Customizing stages', body: 'Admins can rename stages, reorder them, and set the probability for each in pipeline settings. Changing a stage probability re-derives weighted pipeline everywhere it is shown, instantly.' },
    ],
  },
  {
    title: 'How Rook, your AI operator, works',
    category: 'rook',
    summary: 'Rook reads your live workspace and can answer questions, draft follow-ups, and take real actions on your data.',
    tags: ['rook', 'ai', 'operator', 'assistant'],
    sections: [
      { heading: 'Ask in plain language', body: 'Open the Rook dock from the bottom right and ask for what you need: which deals are at risk this quarter, draft a recap email to the Vertex champion, or what changed on my accounts since Friday. Rook answers from your live data, not a generic model.' },
      { heading: 'Rook can act, not just answer', body: 'With your confirmation, Rook can create activities, move a deal stage, start a sequence, or open a report. Every action Rook takes is written to the audit log with a clear before and after, so nothing happens silently.' },
      { heading: 'Grounding and trust', body: 'Rook cites the records behind an answer so you can click straight through and verify. When it is unsure, it says so and asks rather than inventing a number.' },
    ],
  },
  {
    title: 'Building your first report',
    category: 'reports',
    summary: 'Use the report builder to slice deals, contacts, or activities and save the view your team runs on.',
    tags: ['reports', 'analytics', 'builder'],
    sections: [
      { heading: 'Pick a subject', body: 'Start a new report from Analytics then Reports. Choose what you are reporting on, usually deals, then add the columns you care about: amount, stage, owner, close date, and any custom fields.' },
      { heading: 'Filter and group', body: 'Add filters to scope the set, for example open deals closing this quarter owned by a given rep. Group by stage or owner to get subtotals, and switch between a table, bar, or pie view without losing your filters.' },
      { heading: 'Save and share', body: 'Save the report so it recomputes every time it opens, and drop it onto a dashboard so the whole team sees the same numbers. Reports are live views over the book of business, never a stale snapshot.' },
    ],
  },
  {
    title: 'Automating follow-up with sequences',
    category: 'automations',
    summary: 'Build a multi-step outbound cadence with email, call, and task steps, then enroll contacts and let it run.',
    tags: ['sequences', 'cadence', 'outbound', 'automation'],
    sections: [
      { heading: 'What a sequence is', body: 'A sequence is an ordered set of steps spread over days: send an email on day one, a follow-up on day three, a call task on day five. Once a contact is enrolled, Ardovo schedules each step and reminds you when a manual step is due.' },
      { heading: 'Enroll the right people', body: 'Enroll individual contacts, everyone on a deal, or a whole list. A contact that replies is automatically removed so you never keep chasing someone who already answered.' },
      { heading: 'Measure and tune', body: 'Each sequence tracks open, reply, and meeting-booked rates by step, so you can see exactly which message is doing the work and cut the steps that are not.' },
    ],
  },
  {
    title: 'Workflows: hands-off automation',
    category: 'automations',
    summary: 'Trigger actions when records change: notify an owner, create a task, or update a field automatically.',
    tags: ['workflows', 'automation', 'triggers'],
    sections: [
      { heading: 'Trigger, condition, action', body: 'A workflow watches for an event such as a deal entering Negotiation, checks a condition such as amount over 50,000, and runs one or more actions such as notifying the manager and creating a legal-review task.' },
      { heading: 'Start from a template', body: 'The workflow library ships with ready-made recipes for the common revenue moments: new lead routing, at-risk deal alerts, and renewal reminders. Clone a template and adjust it rather than building from a blank canvas.' },
      { heading: 'Safe by design', body: 'Workflows run in the background and every action is logged. You can pause a workflow at any time, and test it against a single record before turning it on for the whole team.' },
    ],
  },
  {
    title: 'Creating quotes and sending for signature',
    category: 'billing',
    summary: 'Build a quote from your product catalog, then send it for legally binding e-signature without leaving Ardovo.',
    tags: ['quotes', 'esignature', 'cpq', 'billing'],
    sections: [
      { heading: 'Build the quote', body: 'From a deal, start a quote and add line items from your product catalog. Ardovo handles quantity, discounts, and totals, and keeps the quote tied to the deal so the amount stays in sync.' },
      { heading: 'Send for signature', body: 'Send the quote for e-signature from the same screen. The recipient signs in their browser, you see the status move from sent to viewed to signed in real time, and the signed document is filed against the deal.' },
      { heading: 'Turn it into revenue', body: 'A signed quote can be converted into an invoice in one step, carrying every line item forward so nothing is re-keyed.' },
    ],
  },
  {
    title: 'Managing invoices and getting paid',
    category: 'billing',
    summary: 'Send invoices, track their status, and see outstanding versus collected revenue at a glance.',
    tags: ['invoices', 'billing', 'revenue', 'ar'],
    sections: [
      { heading: 'Create and send', body: 'Create an invoice from a signed quote or from scratch. Set the due date and terms, then send it. Each invoice tracks its own status: draft, sent, paid, or overdue.' },
      { heading: 'Track what is outstanding', body: 'The billing view rolls up total billed, collected, and outstanding so you always know your accounts-receivable position. Overdue invoices float to the top so nothing is forgotten.' },
      { heading: 'Reconcile', body: 'Mark an invoice paid and the collected and outstanding totals update everywhere at once. Every invoice links back to its deal and company for a full audit trail.' },
    ],
  },
  {
    title: 'Connecting your first integration',
    category: 'integrations',
    summary: 'Link the tools your revenue team already uses so their data lands on the right Ardovo records automatically.',
    tags: ['integrations', 'connect', 'sync'],
    sections: [
      { heading: 'Browse the catalog', body: 'Open Admin then Integrations to see everything you can connect. Each integration explains what it pulls in and where that data shows up inside Ardovo before you connect it.' },
      { heading: 'Connect securely', body: 'Connecting an integration asks only for the keys it needs. Those keys are held server-side and are never stored in your browser. You can disconnect at any time and the pulled data stops refreshing.' },
      { heading: 'Identity matching', body: 'Incoming records are matched onto the right company and contact automatically. Anything that cannot be matched parks in an unlinked tray so nothing is silently dropped, and you can resolve it by hand.' },
    ],
  },
  {
    title: 'Connecting Resolve for support tickets',
    category: 'integrations',
    summary: 'Bring support tickets from Resolve onto the matching account so revenue sees the full post-sale story.',
    tags: ['resolve', 'support', 'tickets', 'integrations'],
    sections: [
      { heading: 'Why connect Resolve', body: 'Resolve is the sibling support platform. Connecting it surfaces every account open issue, AI-resolved win, and CSAT score right next to the deal, so the revenue team never walks into a renewal blind to a support fire.' },
      { heading: 'Connect the workspace', body: 'From Support tickets or the Service Hub, use Connect Resolve and provide your workspace URL and key. Until the server key is set you will see representative sample tickets so the panels are never empty.' },
      { heading: 'Where tickets show up', body: 'Once connected, tickets appear in the ticket inbox, on the matched company and contact, and feed the Service Hub SLA and CSAT metrics. Every ticket deep-links back into Resolve for the full thread.' },
    ],
  },
  {
    title: 'Customer health scores and save plays',
    category: 'success',
    summary: 'How Ardovo scores account health from real signals, and how to run a structured play when an account slips.',
    tags: ['success', 'health', 'churn', 'renewals'],
    sections: [
      { heading: 'What drives a health score', body: 'Each post-sale account gets a health score built from real signals: product usage trend, exec engagement recency, open support escalations, sentiment, and adoption. Scores land in three bands: Healthy, Watch, and At risk.' },
      { heading: 'Working the churn queue', body: 'The churn-risk queue orders accounts by weighted exposure, which is annual value times churn probability. It is the order a CSM should work the book, and Rook surfaces the same ranking.' },
      { heading: 'Running a play', body: 'When an account slips, run the matching play: a Save play for at-risk, a Re-engage play for Watch, a QBR to prove value, or an Expansion play for a thriving account. Starting a play logs a real task on the account timeline so the work is tracked, not just intended.' },
    ],
  },
  {
    title: 'Roles, permissions, and RBAC',
    category: 'admin',
    summary: 'Control who can see and change what with role-based access, field-level rules, and record ownership.',
    tags: ['permissions', 'rbac', 'roles', 'admin', 'security'],
    sections: [
      { heading: 'Roles set the baseline', body: 'Every user has a role such as rep, manager, or admin. Roles set the default of what a user can view and edit across deals, contacts, and settings. Managers see their team book, reps see their own, admins see everything.' },
      { heading: 'Record ownership', body: 'On top of roles, most records have an owner. Sharing rules decide whether a user can view or edit records they do not own, so you can keep a rep focused on their own pipeline without walling off the team.' },
      { heading: 'Field-level control', body: 'Sensitive fields such as amount or margin can be hidden or made read-only for specific roles, so the right people see the right numbers and nothing more.' },
    ],
  },
  {
    title: 'Data security and compliance',
    category: 'admin',
    summary: 'How Ardovo protects your data: encryption, access controls, audit logging, and export on demand.',
    tags: ['security', 'compliance', 'audit', 'privacy'],
    sections: [
      { heading: 'Encryption and access', body: 'Data is encrypted in transit and at rest. Access is gated by role-based permissions, and integration keys are held server-side, never exposed to the browser.' },
      { heading: 'Audit trail', body: 'Every meaningful change, whether made by a person, a workflow, or Rook, is written to the audit log with who, what, and when. The log is filterable and exportable so a review is a few clicks, not a support ticket.' },
      { heading: 'Your data stays yours', body: 'You can export your full workspace at any time. There is no lock-in: reports, records, and activity history all come out in open formats.' },
    ],
  },
  {
    title: 'Command palette and keyboard shortcuts',
    category: 'getting-started',
    summary: 'Move through Ardovo at the speed of thought with the command palette and the shortcuts that matter.',
    tags: ['shortcuts', 'command palette', 'productivity'],
    sections: [
      { heading: 'The command palette', body: 'Press Cmd K on Mac or Ctrl K on Windows to open the palette from anywhere. Type a record name to jump straight to it, or a page name to navigate. It is the fastest way to move around Ardovo.' },
      { heading: 'Everyday shortcuts', body: 'Use the palette to create a new deal, contact, or task without reaching for the mouse. The primary action button in the top right is always the most useful create action for the page you are on.' },
      { heading: 'Ask Rook from anywhere', body: 'The Rook dock is always one click away in the bottom right. Anything you can do by clicking, you can usually just ask Rook to do instead.' },
    ],
  },
];

/* ============================================================
   BUILD SEED STATE
   ============================================================ */
function buildSeed() {
  const now = Date.now();
  const DAY = 86400000;
  const articles = SEED.map((a, i) => {
    const slug = slugify(a.title);
    const stats = seededStats(slug);
    const created = new Date(now - (SEED.length - i) * 9 * DAY).toISOString();
    const updated = new Date(now - Math.floor((hashStr(slug) % 40)) * DAY).toISOString();
    return {
      id: `kb_${i + 1}`,
      slug,
      title: a.title,
      category: a.category,
      summary: a.summary,
      tags: a.tags || [],
      sections: a.sections,
      status: 'published',
      author: 'Ardovo team',
      views: stats.views,
      votes: stats.votes,
      createdAt: created,
      updatedAt: updated,
    };
  });
  return { articles };
}

/* ============================================================
   PERSISTENCE + PUB/SUB  (mirrors lists.js / store.js)
   ============================================================ */
let state = load();
const subs = new Set();

function load() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) { const v = JSON.parse(raw); if (v && Array.isArray(v.articles)) return v; } } catch {}
  const seed = buildSeed();
  try { localStorage.setItem(LS_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}
function commit(next) {
  state = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}
export function resetKnowledgeBase() { try { localStorage.removeItem(LS_KEY); } catch {} state = load(); subs.forEach(fn => fn(state)); }

// Reactive hook. Pass a selector to subscribe to a slice.
export function useKb(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => { const fn = (s) => setSnap(selector(s)); subs.add(fn); fn(state); return () => subs.delete(fn); }, []);
  return snap;
}

let idc = Date.now();
const newId = () => `kb_${(idc++).toString(36)}`;

/* ============================================================
   READ API
   ============================================================ */
export const getArticles = () => state.articles;
export const getArticle = (id) => state.articles.find(a => a.id === id) || null;
export const getArticleBySlug = (slug) => state.articles.find(a => a.slug === slug) || null;
export const publishedArticles = () => state.articles.filter(a => a.status === 'published');

export function articlesByCategory(categoryId, { publishedOnly = false } = {}) {
  return state.articles.filter(a => a.category === categoryId && (!publishedOnly || a.status === 'published'));
}

// helpful score: up / (up + down), null when nobody has voted.
export function helpfulScore(a) {
  const up = a?.votes?.up || 0;
  const down = a?.votes?.down || 0;
  const total = up + down;
  if (!total) return null;
  return Math.round((up / total) * 100);
}

// Lightweight full-text search over title, summary, tags, and section text.
// Ranked: title hit beats summary beats body. Returns up to `limit`.
export function searchArticles(query, limit = 20, { publishedOnly = false } = {}) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);
  const scored = [];
  for (const a of state.articles) {
    if (publishedOnly && a.status !== 'published') continue;
    const title = a.title.toLowerCase();
    const summary = (a.summary || '').toLowerCase();
    const tags = (a.tags || []).join(' ').toLowerCase();
    const body = (a.sections || []).map(s => `${s.heading} ${s.body}`).join(' ').toLowerCase();
    let score = 0;
    for (const t of terms) {
      if (title.includes(t)) score += 8;
      if (tags.includes(t)) score += 5;
      if (summary.includes(t)) score += 4;
      if (body.includes(t)) score += 1;
    }
    if (score > 0) scored.push({ a, score });
  }
  scored.sort((x, y) => y.score - x.score || y.a.views - x.a.views);
  return scored.slice(0, limit).map(s => s.a);
}

// Roll-up KPIs for the hub header.
export function kbStats() {
  const arr = state.articles;
  const published = arr.filter(a => a.status === 'published');
  const totalViews = arr.reduce((s, a) => s + (a.views || 0), 0);
  const scored = arr.map(helpfulScore).filter(v => v != null);
  const avgHelpful = scored.length ? Math.round(scored.reduce((s, v) => s + v, 0) / scored.length) : 0;
  const totalVotes = arr.reduce((s, a) => s + (a.votes?.up || 0) + (a.votes?.down || 0), 0);
  return {
    total: arr.length,
    published: published.length,
    drafts: arr.filter(a => a.status === 'draft').length,
    archived: arr.filter(a => a.status === 'archived').length,
    categories: KB_CATEGORIES.length,
    totalViews,
    avgHelpful,
    totalVotes,
  };
}

// The most-viewed published articles (for the Service Hub quick links).
export function topArticles(limit = 5) {
  return publishedArticles().slice().sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, limit);
}

/* ============================================================
   WRITE API  (validated writers; return { error, message } or record)
   ============================================================ */
const VALID_STATUS = new Set(['published', 'draft', 'archived']);
function normSections(sections) {
  if (!Array.isArray(sections)) return [];
  return sections
    .map(s => ({ heading: String(s.heading || '').trim(), body: String(s.body || '').trim() }))
    .filter(s => s.heading || s.body);
}
function uniqueSlug(base, ignoreId = null) {
  let slug = slugify(base);
  let n = 2;
  while (state.articles.some(a => a.slug === slug && a.id !== ignoreId)) { slug = `${slugify(base)}-${n++}`; }
  return slug;
}

// SUPABASE: from('rally_kb_articles').insert(row).select().single()
export function createArticle({ title, category = 'getting-started', summary = '', tags = [], sections = [], status = 'draft', author = 'You' } = {}) {
  if (!title || !title.trim()) return { error: 'title', message: 'Give the article a title.' };
  const st = VALID_STATUS.has(status) ? status : 'draft';
  const a = {
    id: newId(),
    slug: uniqueSlug(title),
    title: title.trim(),
    category: kbCategory(category).id,
    summary: String(summary || '').trim(),
    tags: Array.isArray(tags) ? tags.map(t => String(t).trim()).filter(Boolean) : String(tags).split(',').map(t => t.trim()).filter(Boolean),
    sections: normSections(sections),
    status: st,
    author: author || 'You',
    views: 0,
    votes: { up: 0, down: 0 },
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  commit({ ...state, articles: [a, ...state.articles] });
  return { article: a };
}

export function updateArticle(id, patch = {}) {
  const a = getArticle(id);
  if (!a) return { error: 'missing', message: 'Article not found.' };
  const next = { ...a };
  if (patch.title != null) {
    const t = String(patch.title).trim();
    if (!t) return { error: 'title', message: 'Title cannot be empty.' };
    if (t !== a.title) { next.title = t; next.slug = uniqueSlug(t, id); }
  }
  if (patch.category != null) next.category = kbCategory(patch.category).id;
  if (patch.summary != null) next.summary = String(patch.summary).trim();
  if (patch.tags != null) next.tags = Array.isArray(patch.tags) ? patch.tags.map(t => String(t).trim()).filter(Boolean) : String(patch.tags).split(',').map(t => t.trim()).filter(Boolean);
  if (patch.sections != null) next.sections = normSections(patch.sections);
  if (patch.status != null && VALID_STATUS.has(patch.status)) next.status = patch.status;
  if (patch.author != null) next.author = String(patch.author);
  next.updatedAt = nowIso();
  commit({ ...state, articles: state.articles.map(x => x.id === id ? next : x) });
  return { article: next };
}

export function setArticleStatus(id, status) { return updateArticle(id, { status }); }

export function deleteArticle(id) {
  const a = getArticle(id);
  if (!a) return { error: 'missing', message: 'Article not found.' };
  commit({ ...state, articles: state.articles.filter(x => x.id !== id) });
  return { ok: true, id };
}

// Count a read. Fire-once per open from the reader; safe to call repeatedly.
export function recordView(id) {
  const a = getArticle(id);
  if (!a) return { error: 'missing' };
  const next = { ...a, views: (a.views || 0) + 1 };
  commit({ ...state, articles: state.articles.map(x => x.id === id ? next : x) });
  return { article: next };
}

// Was this helpful? dir is 'up' or 'down'. Idempotent-ish per session is the
// caller's job (a reader guards with local state); this always records a vote.
export function voteArticle(id, dir) {
  const a = getArticle(id);
  if (!a) return { error: 'missing' };
  const votes = { up: a.votes?.up || 0, down: a.votes?.down || 0 };
  if (dir === 'up') votes.up += 1; else if (dir === 'down') votes.down += 1; else return { error: 'dir' };
  const next = { ...a, votes };
  commit({ ...state, articles: state.articles.map(x => x.id === id ? next : x) });
  return { article: next };
}
