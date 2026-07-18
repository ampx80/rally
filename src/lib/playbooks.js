// ============================================================
// ARDOVO SALES PLAYBOOKS  (guided sales motions on records)
// HubSpot-style playbook cards for the sell side. Ardovo already
// ships CS playbooks (src/lib/success-data.js -> PLAYBOOKS +
// runPlaybook); this is the sales counterpart: methodology-driven
// guided scripts (discovery, MEDDIC, BANT, demo, negotiation,
// closing) with per-section prompts and property-capture fields
// that a rep steps through on a live deal or contact.
//
// Two persisted stores, both local-first and Supabase-swappable:
//   1. Custom playbooks   -> localStorage rally_playbooks_v1
//   2. Per-record run log  -> localStorage rally_playbook_runs_v1
// System playbooks are seeded read-only (the editor duplicates them
// into an editable custom copy). Completing a run logs a real
// activity via createActivity() so the notes land on the record
// timeline, exactly like runPlaybook() does for CS.
//
// SUPABASE: a live build reads rally_sales_playbooks (config) +
// rally_playbook_runs (per-record). Here they synthesize locally.
// ASCII hyphens only. No em-dash / en-dash anywhere.
// ============================================================
import { useEffect, useState } from 'react';
import { createActivity, getDeal, getContact, getCompany } from './store.js';

/* ============================================================
   CAPTURE FIELD TYPES
   The runner renders one input per type. registryKey (optional)
   maps a captured answer onto a real field-registry field so the
   answer patches the record through the normal update writers.
   ============================================================ */
export const PB_FIELD_TYPES = ['text', 'textarea', 'picklist', 'currency', 'number', 'percent', 'date', 'rating'];

/* ============================================================
   SEED PLAYBOOKS  (the real, substantive sales motions)
   Each section carries guidance the rep reads out, prompts the
   rep works through as a checklist, and fields that capture the
   answers back onto the record.
   ============================================================ */
export const PLAYBOOK_CATEGORIES = ['Discovery', 'Qualification', 'Demo', 'Negotiation', 'Closing'];

// forObject: which record types a playbook can run on. 'any' shows
// on every record. Sales playbooks default to deals; discovery also
// makes sense on a contact.
export const SALES_PLAYBOOKS = [
  {
    id: 'pb_discovery',
    name: 'Discovery Call',
    icon: 'search',
    category: 'Discovery',
    methodology: 'Discovery',
    forObject: 'any',
    blurb: 'Run a structured first call that uncovers pain, impact, and the path to a decision.',
    system: true,
    sections: [
      {
        id: 's_frame',
        title: 'Set the frame',
        guidance: 'Open with a clear agenda and earn the right to ask questions. Confirm how much time you have and what a good outcome looks like for both sides.',
        prompts: [
          'Confirm time available and agenda',
          'State the goal: understand their world, not pitch',
          'Ask permission to take notes',
        ],
        fields: [],
      },
      {
        id: 's_current',
        title: 'Current state',
        guidance: 'Map how they solve this today. Tools, workflow, owners, and what is working before you look for what is broken.',
        prompts: [
          'What tool or process do they use today?',
          'Who owns it and who touches it daily?',
          'What made them take this call now?',
        ],
        fields: [
          { key: 'currentSolution', label: 'Current solution / tooling', type: 'text', placeholder: 'e.g. Spreadsheets + legacy CRM' },
          { key: 'triggerEvent', label: 'Why now (trigger event)', type: 'textarea', placeholder: 'What changed that opened this conversation' },
        ],
      },
      {
        id: 's_pain',
        title: 'Pain and impact',
        guidance: 'Quantify the cost of the status quo. Move from a surface complaint to a business impact with a number attached.',
        prompts: [
          'What breaks or slows down because of this?',
          'What does that cost in time, money, or risk?',
          'What happens if nothing changes in 6 months?',
        ],
        fields: [
          { key: 'primaryPain', label: 'Primary pain', type: 'textarea', placeholder: 'The single problem that matters most' },
          { key: 'painImpact', label: 'Quantified impact', type: 'text', placeholder: 'e.g. 12 hours/week of manual work' },
        ],
      },
      {
        id: 's_process',
        title: 'Decision path',
        guidance: 'Understand who else needs to weigh in and roughly when they want this solved. You are not closing, you are mapping.',
        prompts: [
          'Who else would be involved in a decision?',
          'Have they set aside budget or is this exploratory?',
          'What is their ideal timeline to solve it?',
        ],
        fields: [
          { key: 'timeline', label: 'Timeline', type: 'picklist', options: ['This quarter', 'Next quarter', '6-12 months', 'No timeline yet'] },
          { key: 'nextStep', label: 'Agreed next step', type: 'text', registryKey: 'nextStep', placeholder: 'The concrete next action you both agreed on' },
        ],
      },
    ],
  },
  {
    id: 'pb_meddic',
    name: 'MEDDIC Qualification',
    icon: 'shield',
    category: 'Qualification',
    methodology: 'MEDDIC',
    forObject: 'deal',
    blurb: 'Qualify an enterprise deal against the six MEDDIC pillars so forecast confidence is earned, not guessed.',
    system: true,
    sections: [
      {
        id: 's_metrics',
        title: 'Metrics',
        guidance: 'The economic value of solving this, in the customer own numbers. If you cannot state the metric, the deal has no business case.',
        prompts: [
          'What measurable outcome do they expect?',
          'What is the baseline today vs the target?',
        ],
        fields: [
          { key: 'meddicMetrics', label: 'Metrics (quantified value)', type: 'textarea', placeholder: 'e.g. Cut ramp time from 90 to 45 days' },
        ],
      },
      {
        id: 's_eb',
        title: 'Economic buyer',
        guidance: 'The one person who can approve spend outside an existing budget line. Have you met them, or only their proxy?',
        prompts: [
          'Who controls the money for this?',
          'Have you had direct access to them?',
        ],
        fields: [
          { key: 'meddicEconomicBuyer', label: 'Economic buyer', type: 'text', placeholder: 'Name and title' },
          { key: 'meddicEbAccess', label: 'Access level', type: 'picklist', options: ['Direct access', 'Via champion', 'Not yet identified'] },
        ],
      },
      {
        id: 's_criteria',
        title: 'Decision criteria',
        guidance: 'The stated requirements the solution is measured against. Shape these early or you inherit a competitor scorecard.',
        prompts: [
          'What are the must-have requirements?',
          'How are they weighting each one?',
        ],
        fields: [
          { key: 'meddicCriteria', label: 'Decision criteria', type: 'textarea', placeholder: 'The scorecard they will judge against' },
        ],
      },
      {
        id: 's_dprocess',
        title: 'Decision process',
        guidance: 'The actual steps from here to signature: approvals, legal, security, procurement. Surprises here kill quarters.',
        prompts: [
          'What are the steps to a signed contract?',
          'Who signs and what reviews are required?',
        ],
        fields: [
          { key: 'meddicProcess', label: 'Decision process', type: 'textarea', placeholder: 'Steps, approvals, and owners to close' },
        ],
      },
      {
        id: 's_ipain',
        title: 'Identify pain',
        guidance: 'The compelling reason to act. Without acute pain, the default is do nothing and the deal slips forever.',
        prompts: [
          'What is the compelling event driving urgency?',
          'What is the cost of inaction?',
        ],
        fields: [
          { key: 'meddicPain', label: 'Identified pain', type: 'textarea', placeholder: 'The reason they must act now' },
        ],
      },
      {
        id: 's_champion',
        title: 'Champion',
        guidance: 'An insider who sells for you when you are not in the room and has the power to mobilize. Test their influence, do not assume it.',
        prompts: [
          'Who benefits most from you winning?',
          'Have they proven they can drive internal action?',
        ],
        fields: [
          { key: 'meddicChampion', label: 'Champion', type: 'text', placeholder: 'Name and why they back you' },
          { key: 'meddicScore', label: 'Overall qualification', type: 'rating' },
        ],
      },
    ],
  },
  {
    id: 'pb_bant',
    name: 'BANT Qualification',
    icon: 'funnel',
    category: 'Qualification',
    methodology: 'BANT',
    forObject: 'deal',
    blurb: 'A fast four-point qualification for inbound and mid-market deals: budget, authority, need, and timeline.',
    system: true,
    sections: [
      {
        id: 's_budget',
        title: 'Budget',
        guidance: 'Confirm there is money, roughly how much, and whether it is allocated or aspirational.',
        prompts: [
          'Is there a budget set aside for this?',
          'What range are they working within?',
        ],
        fields: [
          { key: 'bantBudget', label: 'Budget signal', type: 'text', placeholder: 'e.g. 50-80k approved for this year' },
        ],
      },
      {
        id: 's_authority',
        title: 'Authority',
        guidance: 'Identify who makes the call and who can block it. A yes from the wrong person is a maybe.',
        prompts: [
          'Who makes the final decision?',
          'Who could veto or slow it down?',
        ],
        fields: [
          { key: 'bantAuthority', label: 'Decision maker', type: 'text', placeholder: 'Name and title' },
        ],
      },
      {
        id: 's_need',
        title: 'Need',
        guidance: 'Confirm the problem is real and material. Tie it back to something the business already cares about.',
        prompts: [
          'What problem are they solving?',
          'How urgent is it on a scale of 1 to 5?',
        ],
        fields: [
          { key: 'bantNeed', label: 'Core need', type: 'textarea', placeholder: 'The problem in their words' },
        ],
      },
      {
        id: 's_timing',
        title: 'Timeline',
        guidance: 'Anchor a realistic date and the events that gate it. A deal with no date is a deal with no urgency.',
        prompts: [
          'When do they need this live?',
          'What has to happen before they buy?',
        ],
        fields: [
          { key: 'bantTimeline', label: 'Target timeline', type: 'picklist', options: ['Immediate', '30 days', 'This quarter', 'Next quarter', 'Exploratory'] },
          { key: 'bantScore', label: 'BANT fit', type: 'rating' },
        ],
      },
    ],
  },
  {
    id: 'pb_demo',
    name: 'Tailored Demo',
    icon: 'eye',
    category: 'Demo',
    methodology: 'Demo',
    forObject: 'deal',
    blurb: 'Run a demo that maps every click to a pain you already uncovered, then trial closes before you leave.',
    system: true,
    sections: [
      {
        id: 's_confirm',
        title: 'Confirm and recap',
        guidance: 'Never open the product cold. Recap the pains from discovery and get a head nod before you share your screen.',
        prompts: [
          'Recap the top pains you will address',
          'Confirm who is on the call and their role',
          'State what a good outcome looks like today',
        ],
        fields: [
          { key: 'demoAttendees', label: 'Who attended', type: 'text', placeholder: 'Names and roles on the call' },
        ],
      },
      {
        id: 's_walk',
        title: 'Tailored walkthrough',
        guidance: 'Show only what maps to their pain. Tell them what you are about to show, show it, then tie it back to the impact.',
        prompts: [
          'Lead with the highest-pain workflow',
          'Pause for reactions after each key moment',
          'Avoid feature dumping the full product',
        ],
        fields: [
          { key: 'demoResonated', label: 'What resonated most', type: 'textarea', placeholder: 'The moment they leaned in' },
        ],
      },
      {
        id: 's_objections',
        title: 'Questions and objections',
        guidance: 'Objections are buying signals. Capture them verbatim so you can address them cleanly in the follow up.',
        prompts: [
          'What concerns came up?',
          'Any comparisons to another tool?',
        ],
        fields: [
          { key: 'demoObjections', label: 'Objections raised', type: 'textarea', placeholder: 'What you will need to overcome' },
        ],
      },
      {
        id: 's_trial',
        title: 'Trial close',
        guidance: 'Test the temperature before you hang up. A clear next step is the only acceptable outcome.',
        prompts: [
          'Ask: does this solve the problem you described?',
          'Ask: what would stop this from moving forward?',
          'Book the specific next meeting live',
        ],
        fields: [
          { key: 'demoOutcome', label: 'Demo outcome', type: 'picklist', options: ['Strong interest', 'Interested, needs more', 'Lukewarm', 'Not a fit'] },
          { key: 'nextStep', label: 'Agreed next step', type: 'text', registryKey: 'nextStep', placeholder: 'The concrete next action' },
        ],
      },
    ],
  },
  {
    id: 'pb_negotiation',
    name: 'Negotiation',
    icon: 'target',
    category: 'Negotiation',
    methodology: 'Negotiation',
    forObject: 'deal',
    blurb: 'Trade, never cave. Defend value, exchange concessions for commitments, and land terms that hold.',
    system: true,
    sections: [
      {
        id: 's_priorities',
        title: 'Understand priorities',
        guidance: 'Find out what they actually care about beyond price: timing, terms, scope, risk. Price is rarely the only lever.',
        prompts: [
          'What matters most to them in the terms?',
          'What is a deal-breaker vs a nice-to-have?',
        ],
        fields: [
          { key: 'negPriorities', label: 'Their priorities', type: 'textarea', placeholder: 'What they are really optimizing for' },
        ],
      },
      {
        id: 's_trade',
        title: 'Trade concessions',
        guidance: 'Every give gets a get. If they ask for a discount, exchange it for term length, a case study, or a faster signature.',
        prompts: [
          'What are they asking for?',
          'What will you ask for in return?',
        ],
        fields: [
          { key: 'negAsk', label: 'Discount requested', type: 'percent', placeholder: '0' },
          { key: 'negConcessions', label: 'Trades on the table', type: 'textarea', placeholder: 'What you give and what you get for it' },
        ],
      },
      {
        id: 's_defend',
        title: 'Defend value',
        guidance: 'Reground on the metrics from qualification. Anchor to ROI so the conversation is about value, not just cost.',
        prompts: [
          'Restate the quantified value',
          'Hold your walk-away line',
        ],
        fields: [
          { key: 'negRedlines', label: 'Legal / redline items', type: 'textarea', placeholder: 'Open contract items to resolve' },
        ],
      },
      {
        id: 's_terms',
        title: 'Close the terms',
        guidance: 'Summarize agreed terms in writing and set the date. Ambiguity now becomes a slipped quarter later.',
        prompts: [
          'Confirm final price and terms out loud',
          'Set the signature date',
        ],
        fields: [
          { key: 'targetClose', label: 'Target close date', type: 'date', registryKey: 'closeDate' },
        ],
      },
    ],
  },
  {
    id: 'pb_closing',
    name: 'Closing',
    icon: 'check',
    category: 'Closing',
    methodology: 'Closing',
    forObject: 'deal',
    blurb: 'Drive the last mile: confirm the decision, run the paper process, and set up a clean handoff.',
    system: true,
    sections: [
      {
        id: 's_decision',
        title: 'Confirm the decision',
        guidance: 'Get explicit verbal commitment from the economic buyer before you send paper. Assume nothing.',
        prompts: [
          'Confirm they have chosen you',
          'Confirm there are no open blockers',
        ],
        fields: [
          { key: 'closeConfidence', label: 'Close confidence', type: 'rating' },
        ],
      },
      {
        id: 's_paper',
        title: 'Paper process',
        guidance: 'Map the exact path to signature: order form, security review, procurement, and who owns each step.',
        prompts: [
          'Who signs on their side?',
          'What review steps remain (security, legal, procurement)?',
        ],
        fields: [
          { key: 'closeSignatory', label: 'Signatory', type: 'text', placeholder: 'Who signs the contract' },
          { key: 'closeContractSent', label: 'Contract sent date', type: 'date' },
        ],
      },
      {
        id: 's_handoff',
        title: 'Set up the handoff',
        guidance: 'A closed deal is the start of the relationship. Line up onboarding so the customer feels momentum from day one.',
        prompts: [
          'Introduce the CS / onboarding owner',
          'Set the kickoff date',
          'Capture success criteria for the first 90 days',
        ],
        fields: [
          { key: 'closePriority', label: 'Onboarding priority', type: 'picklist', options: ['High', 'Medium', 'Low'], registryKey: 'priority' },
        ],
      },
    ],
  },
];

export const playbookIcon = (pb) => pb?.icon || 'book';

/* ============================================================
   CUSTOM PLAYBOOK PERSISTENCE + PUB/SUB
   Shape in storage: { [id]: playbook }. Merged after the seeds in
   getPlaybooks() so a custom playbook is a first-class citizen.
   SUPABASE: rally_sales_playbooks (config table).
   ============================================================ */
const PB_LS = 'rally_playbooks_v1';
let customPbs = loadPbs();
const pbSubs = new Set();

function loadPbs() {
  try { const raw = localStorage.getItem(PB_LS); if (raw) return JSON.parse(raw) || {}; } catch {}
  return {};
}
function commitPbs(next) {
  customPbs = next;
  try { localStorage.setItem(PB_LS, JSON.stringify(customPbs)); } catch {}
  pbSubs.forEach(fn => fn(customPbs));
}
export function resetPlaybooks() { try { localStorage.removeItem(PB_LS); } catch {} customPbs = {}; pbSubs.forEach(fn => fn(customPbs)); }

export function usePlaybooks(selector = (list) => list) {
  const [snap, setSnap] = useState(() => selector(getPlaybooks()));
  useEffect(() => {
    const fn = () => setSnap(selector(getPlaybooks()));
    pbSubs.add(fn); fn();
    return () => pbSubs.delete(fn);
  }, []);
  return snap;
}

let idc = Date.now();
const newId = (p) => `${p}_${(idc++).toString(36)}`;

/* ---------- reads ---------- */
export function getPlaybooks() {
  const custom = Object.values(customPbs);
  return [...SALES_PLAYBOOKS, ...custom];
}
export const getPlaybook = (id) => getPlaybooks().find(p => p.id === id);
export const isCustomPlaybook = (id) => Object.prototype.hasOwnProperty.call(customPbs, id);

// Playbooks that can run on a given record type. 'any' always matches.
export function playbooksFor(objectType) {
  return getPlaybooks().filter(p => p.forObject === 'any' || p.forObject === objectType);
}

// Total capture-field count across a playbook (for library card stats).
export function playbookFieldCount(pb) {
  return (pb?.sections || []).reduce((n, s) => n + (s.fields ? s.fields.length : 0), 0);
}

/* ---------- normalizers (keep editor input well-formed) ---------- */
function normalizeField(f = {}) {
  const type = PB_FIELD_TYPES.includes(f.type) ? f.type : 'text';
  return {
    key: (f.key && String(f.key)) || newId('f'),
    label: (f.label || '').trim() || 'Untitled field',
    type,
    options: type === 'picklist' ? (Array.isArray(f.options) ? f.options.filter(Boolean) : []) : undefined,
    placeholder: f.placeholder || '',
    registryKey: f.registryKey || undefined,
    help: f.help || '',
  };
}
function normalizeSection(s = {}) {
  return {
    id: (s.id && String(s.id)) || newId('s'),
    title: (s.title || '').trim() || 'Untitled section',
    guidance: s.guidance || '',
    prompts: Array.isArray(s.prompts) ? s.prompts.map(p => String(p)).filter(p => p.trim()) : [],
    fields: Array.isArray(s.fields) ? s.fields.map(normalizeField) : [],
  };
}

/* ---------- custom playbook writers ---------- */
export function addPlaybook(def = {}) {
  const name = (def.name || '').trim();
  if (!name) return { error: 'name', message: 'A playbook name is required.' };
  const id = newId('pb');
  const pb = {
    id,
    name,
    icon: def.icon || 'book',
    category: PLAYBOOK_CATEGORIES.includes(def.category) ? def.category : 'Discovery',
    methodology: (def.methodology || '').trim() || 'Custom',
    forObject: ['deal', 'contact', 'company', 'any'].includes(def.forObject) ? def.forObject : 'deal',
    blurb: (def.blurb || '').trim(),
    system: false,
    sections: Array.isArray(def.sections) ? def.sections.map(normalizeSection) : [],
    createdAt: new Date().toISOString(),
  };
  commitPbs({ ...customPbs, [id]: pb });
  return { playbook: pb };
}

// Duplicate any playbook (seed or custom) into an editable custom copy.
export function duplicatePlaybook(id) {
  const src = getPlaybook(id);
  if (!src) return { error: 'missing', message: 'Playbook not found.' };
  return addPlaybook({ ...src, name: `${src.name} (copy)`, system: false });
}

export function updatePlaybook(id, patch = {}) {
  if (!isCustomPlaybook(id)) return { error: 'system', message: 'System playbooks are read only. Duplicate it to edit.' };
  const cur = customPbs[id];
  const next = { ...cur };
  if (patch.name !== undefined) { const n = String(patch.name).trim(); if (!n) return { error: 'name', message: 'A playbook name is required.' }; next.name = n; }
  if (patch.icon !== undefined) next.icon = patch.icon || 'book';
  if (patch.category !== undefined && PLAYBOOK_CATEGORIES.includes(patch.category)) next.category = patch.category;
  if (patch.methodology !== undefined) next.methodology = String(patch.methodology).trim() || 'Custom';
  if (patch.forObject !== undefined && ['deal', 'contact', 'company', 'any'].includes(patch.forObject)) next.forObject = patch.forObject;
  if (patch.blurb !== undefined) next.blurb = String(patch.blurb);
  if (patch.sections !== undefined) next.sections = (patch.sections || []).map(normalizeSection);
  commitPbs({ ...customPbs, [id]: next });
  return { playbook: next };
}

export function removePlaybook(id) {
  if (!isCustomPlaybook(id)) return { error: 'system', message: 'System playbooks cannot be deleted.' };
  const next = { ...customPbs };
  delete next[id];
  commitPbs(next);
  return { ok: true };
}

/* ============================================================
   PER-RECORD RUN LOG PERSISTENCE + PUB/SUB
   Shape in storage: an array of run rows, newest first.
   SUPABASE: rally_playbook_runs (per-record execution history).
   ============================================================ */
const RUN_LS = 'rally_playbook_runs_v1';
let runs = loadRuns();
const runSubs = new Set();

function loadRuns() {
  try { const raw = localStorage.getItem(RUN_LS); if (raw) return JSON.parse(raw) || []; } catch {}
  return [];
}
function commitRuns(next) {
  runs = next;
  try { localStorage.setItem(RUN_LS, JSON.stringify(runs)); } catch {}
  runSubs.forEach(fn => fn(runs));
}
export function resetPlaybookRuns() { try { localStorage.removeItem(RUN_LS); } catch {} runs = []; runSubs.forEach(fn => fn(runs)); }

export function usePlaybookRuns(selector = (list) => list) {
  const [snap, setSnap] = useState(() => selector(runs));
  useEffect(() => {
    const fn = (r) => setSnap(selector(r));
    runSubs.add(fn); fn(runs);
    return () => runSubs.delete(fn);
  }, []);
  return snap;
}

export function getRuns() { return runs; }
export function getRunsForRecord(objectType, recordId) {
  return runs.filter(r => r.objectType === objectType && r.recordId === recordId)
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
}
export function runCountForRecord(objectType, recordId) {
  return runs.reduce((n, r) => n + (r.objectType === objectType && r.recordId === recordId ? 1 : 0), 0);
}

/* Resolve the companyId that should anchor the logged activity so it
   threads onto the right timeline regardless of the record type. */
function companyIdFor(objectType, recordId) {
  if (objectType === 'company') return recordId;
  if (objectType === 'deal') return getDeal(recordId)?.companyId || null;
  if (objectType === 'contact') return getContact(recordId)?.companyId || null;
  return null;
}

/* Human-readable body for the logged activity: the guidance the rep
   worked through plus every captured answer. ASCII only. */
function buildRunBody(pb, answers = {}, checked = {}) {
  const lines = [];
  for (const sec of pb.sections || []) {
    const done = (checked[sec.id] || []).length;
    const total = (sec.prompts || []).length;
    lines.push(`# ${sec.title}${total ? ` (${done}/${total} prompts)` : ''}`);
    for (const f of sec.fields || []) {
      const v = answers[f.key];
      if (v == null || v === '') continue;
      const shown = f.type === 'rating' ? `${v}/5` : f.type === 'percent' ? `${v}%` : String(v);
      lines.push(`- ${f.label}: ${shown}`);
    }
  }
  return lines.join('\n');
}

/* Record a completed run: persist the run row AND log a real activity
   on the record timeline (mirrors success-data.runPlaybook). patched
   is the list of field labels written back onto the record, if any. */
export function recordPlaybookRun({ playbookId, objectType, recordId, answers = {}, checked = {}, patched = [] }) {
  const pb = getPlaybook(playbookId);
  if (!pb) return { error: 'missing', message: 'Playbook not found.' };
  const now = new Date().toISOString();
  const body = buildRunBody(pb, answers, checked);

  const act = createActivity({
    type: 'note',
    subject: `${pb.name} playbook completed`,
    body,
    done: true,
    relatedType: objectType,
    relatedId: recordId,
    companyId: companyIdFor(objectType, recordId),
  });

  const run = {
    id: newId('run'),
    playbookId,
    playbookName: pb.name,
    methodology: pb.methodology,
    objectType,
    recordId,
    completedAt: now,
    answers,
    checked,
    patched,
    activityId: act && act.activity ? act.activity.id : null,
  };
  commitRuns([run, ...runs]);
  return { ok: true, run, activity: act && act.activity };
}
