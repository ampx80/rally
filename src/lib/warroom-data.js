// ============================================================
// RALLY - DEAL WAR ROOM  (warroom-data.js)
// A live collaboration cockpit for closing big deals. Enterprise
// deals are won in war rooms, not CRM fields: buying committee,
// mutual close plan, risks, competitive landscape, and a live team
// rail - all in one surface with Rook reading the room.
//
// Local-first + deterministic. A fixed-seed mulberry32 PRNG builds
// stable derived values; the war rooms themselves are hand-authored
// so the demo is rich and believable. Mutations (checking a plan
// step, posting a note, moving a committee member's sentiment)
// persist to localStorage and notify subscribers, so the room feels
// alive across reloads.
//
// HOISTING NOTE (TDZ safety): every helper used while `state` seeds
// at module-eval is a hoisted `function` declaration, never a const
// arrow defined lower in the file.
// ADDITIVE: brand-new module. No em-dash or en-dash anywhere.
// ============================================================
import { useEffect, useState } from 'react';

const WR_KEY = 'rally_warroom_v1';   // bump to force a clean reseed
const DAY = 86400000;

/* ---------- deterministic PRNG (hoisted) ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ============================================================
   STATIC CONFIG (roles, sentiment, stages)
   ============================================================ */
export const ROLE_META = {
  champion:   { label: 'Champion',        tone: 'ok',      hint: 'Sells for you internally' },
  economic:   { label: 'Economic buyer',  tone: 'accent',  hint: 'Controls the budget' },
  blocker:    { label: 'Blocker',         tone: 'risk',    hint: 'Can stall or kill the deal' },
  technical:  { label: 'Technical buyer', tone: 'info',    hint: 'Owns the evaluation' },
  influencer: { label: 'Influencer',      tone: 'default', hint: 'Shapes the decision' },
  user:       { label: 'End user',        tone: 'default', hint: 'Lives with the product' },
};

export const SENTIMENT_META = {
  positive: { label: 'Positive', color: 'var(--ok)',   dot: 'green'  },
  neutral:  { label: 'Neutral',  color: 'var(--warn)', dot: 'yellow' },
  negative: { label: 'At risk',  color: 'var(--risk)', dot: 'red'    },
};
const SENTIMENT_CYCLE = ['positive', 'neutral', 'negative'];

export const STAGE_META = {
  qualified:   { label: 'Qualified',   base: 25, color: '#2563a8' },
  discovery:   { label: 'Discovery',   base: 42, color: '#5b4bf5' },
  proposal:    { label: 'Proposal',    base: 62, color: '#b3721a' },
  negotiation: { label: 'Negotiation', base: 80, color: '#0ea5a3' },
  verbal:      { label: 'Verbal yes',  base: 90, color: '#1a7f52' },
};

export const PLAN_STATUS = {
  done:    { label: 'Done',        tone: 'ok'      },
  active:  { label: 'In progress', tone: 'accent'  },
  blocked: { label: 'Blocked',     tone: 'risk'    },
  todo:    { label: 'Not started', tone: 'default' },
};

export const NOTE_KINDS = {
  note:   { label: 'Note',        icon: 'fileText', color: 'var(--n-600)'   },
  update: { label: 'Update',      icon: 'activity', color: 'var(--accent-600)' },
  action: { label: 'Next action', icon: 'checkSquare', color: 'var(--info)' },
  risk:   { label: 'Flag risk',   icon: 'shield',   color: 'var(--risk)'   },
  win:    { label: 'Win',         icon: 'star',     color: 'var(--ok)'     },
};

/* ============================================================
   SEED  (hand-authored war rooms + PRNG-derived momentum)
   ============================================================ */
function buildSeed() {
  const rnd = mulberry32(20260713);
  // momentum: a believable win-probability trend line per deal, ending near now
  function trend(startP, endP, n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const base = startP + (endP - startP) * t;
      const jitter = (rnd() - 0.5) * 6;
      out.push(Math.max(4, Math.min(97, Math.round(base + jitter))));
    }
    out[out.length - 1] = endP;
    return out;
  }

  const deals = [
    {
      id: 'wr_vertex',
      name: 'Enterprise platform rollout',
      company: 'Vertex Robotics',
      industry: 'Manufacturing',
      region: 'Austin, TX',
      value: 420000,
      arr: true,
      stage: 'negotiation',
      owner: 'Jordan Avery',
      ownerTitle: 'Senior Account Executive',
      closeInDays: 21,
      createdAgoDays: 64,
      flagship: true,
      history: trend(30, 82, 10),
      committee: [
        { id: 'm1', name: 'Dana Whitfield', title: 'VP of Operations', role: 'champion',  influence: 'high', sentiment: 'positive', note: 'Built the internal business case, wants this live by Q3.' },
        { id: 'm2', name: 'Raymond Cole',   title: 'Chief Financial Officer', role: 'economic', influence: 'high', sentiment: 'neutral', note: 'Focused on payback period. Needs the ROI model tightened.' },
        { id: 'm3', name: 'Priya Nair',     title: 'Director of IT Security', role: 'blocker', influence: 'high', sentiment: 'negative', note: 'Open SOC 2 questions. Has killed two vendors before.' },
        { id: 'm4', name: 'Marcus Feld',    title: 'Head of RevOps', role: 'technical', influence: 'med', sentiment: 'positive', note: 'Ran the pilot, loves the automation depth.' },
        { id: 'm5', name: 'Elena Ross',     title: 'COO', role: 'influencer', influence: 'high', sentiment: 'neutral', note: 'Final signer. Will follow the CFO and the champion.' },
      ],
      plan: [
        { id: 'p1', label: 'Mutual action plan signed by both sides', owner: 'Dana Whitfield', dueInDays: -18, phase: 'Align', status: 'done' },
        { id: 'p2', label: 'Technical pilot success criteria met', owner: 'Marcus Feld', dueInDays: -9, phase: 'Evaluate', status: 'done' },
        { id: 'p3', label: 'ROI model reviewed with finance', owner: 'Jordan Avery', dueInDays: -2, phase: 'Justify', status: 'active' },
        { id: 'p4', label: 'Security review + SOC 2 evidence delivered', owner: 'Priya Nair', dueInDays: 3, phase: 'Justify', status: 'blocked' },
        { id: 'p5', label: 'Redlined MSA back from legal', owner: 'Jordan Avery', dueInDays: 6, phase: 'Close', status: 'active' },
        { id: 'p6', label: 'Executive review with COO', owner: 'Elena Ross', dueInDays: 10, phase: 'Close', status: 'todo' },
        { id: 'p7', label: 'Procurement + signature', owner: 'Raymond Cole', dueInDays: 18, phase: 'Close', status: 'todo' },
      ],
      risks: [
        { id: 'r1', label: 'Security review unresolved with a known hard grader', severity: 'high', mitigation: 'Bring our CISO into a live SOC 2 walkthrough this week.', mitigated: false },
        { id: 'r2', label: 'CFO not yet sold on payback period', severity: 'med', mitigation: 'Send the tightened 9-month ROI model with a reference call.', mitigated: false },
        { id: 'r3', label: 'Close date sits inside their fiscal freeze window', severity: 'med', mitigation: 'Confirm the freeze exception with procurement early.', mitigated: false },
      ],
      competitors: [
        { id: 'c1', name: 'Salesforce', threat: 'high', us: 'even', note: 'Incumbent for their support org. Bundle discount on the table.' },
        { id: 'c2', name: 'Status quo (spreadsheets)', threat: 'med', us: 'ahead', note: 'Pilot already proved the time savings against this.' },
      ],
      notes: [
        { id: 'n1', author: 'Jordan Avery',  kind: 'update', body: 'Champion confirmed the COO will join the exec review if we clear security first. Everything routes through Priya now.', agoMin: 55 },
        { id: 'n2', author: 'Nina Kapoor',   kind: 'note',   body: 'Looped in our CISO. She can do a live SOC 2 walkthrough Thursday. @Jordan Avery want me to send the invite?', agoMin: 180, mentions: ['Jordan Avery'] },
        { id: 'n3', author: 'Jordan Avery',  kind: 'action', body: 'Send redlined MSA to Vertex legal', agoMin: 220, done: false },
        { id: 'n4', author: 'Elena Ross',    kind: 'risk',   body: 'Heads up, their fiscal freeze starts the 24th. If we slip past the 20th we lose the quarter.', agoMin: 320 },
        { id: 'n5', author: 'Marcus Feld',   kind: 'note',   body: 'Pilot numbers are locked: 41% less manual routing, 2.3x faster handoffs. Great proof for the CFO.', agoMin: 700 },
      ],
    },
    {
      id: 'wr_northwind',
      name: 'Multi-year platform + migration',
      company: 'Northwind Logistics',
      industry: 'Logistics',
      region: 'Chicago, IL',
      value: 680000,
      arr: true,
      stage: 'proposal',
      owner: 'Nina Kapoor',
      ownerTitle: 'Enterprise AE',
      closeInDays: 44,
      createdAgoDays: 88,
      history: trend(20, 58, 10),
      committee: [
        { id: 'm1', name: 'Curtis Yao',    title: 'SVP Supply Chain', role: 'economic', influence: 'high', sentiment: 'neutral', note: 'Wants a multi-year price lock before he commits budget.' },
        { id: 'm2', name: 'Bianca Ortiz',  title: 'Director of Logistics Ops', role: 'champion', influence: 'high', sentiment: 'positive', note: 'Driving urgency, their legacy tool sunsets this year.' },
        { id: 'm3', name: 'Sam Delgado',   title: 'Head of Data Platform', role: 'technical', influence: 'med', sentiment: 'neutral', note: 'Worried about the migration lift from the old system.' },
        { id: 'm4', name: 'Grace Lin',     title: 'Procurement Lead', role: 'blocker', influence: 'med', sentiment: 'neutral', note: 'By-the-book. Will slow-walk anything without a full RFP trail.' },
      ],
      plan: [
        { id: 'p1', label: 'Discovery workshop with ops + data teams', owner: 'Bianca Ortiz', dueInDays: -22, phase: 'Align', status: 'done' },
        { id: 'p2', label: 'Migration assessment of legacy system', owner: 'Sam Delgado', dueInDays: -6, phase: 'Evaluate', status: 'done' },
        { id: 'p3', label: 'Formal proposal + multi-year pricing delivered', owner: 'Nina Kapoor', dueInDays: -1, phase: 'Justify', status: 'active' },
        { id: 'p4', label: 'Reference call with a peer logistics customer', owner: 'Nina Kapoor', dueInDays: 5, phase: 'Justify', status: 'todo' },
        { id: 'p5', label: 'RFP responses submitted to procurement', owner: 'Grace Lin', dueInDays: 12, phase: 'Close', status: 'todo' },
        { id: 'p6', label: 'Migration plan + timeline approved', owner: 'Sam Delgado', dueInDays: 20, phase: 'Close', status: 'todo' },
        { id: 'p7', label: 'Contract signature', owner: 'Curtis Yao', dueInDays: 40, phase: 'Close', status: 'todo' },
      ],
      risks: [
        { id: 'r1', label: 'Migration complexity could stall technical sign-off', severity: 'high', mitigation: 'Offer a funded migration sprint with a named solutions architect.', mitigated: false },
        { id: 'r2', label: 'Procurement RFP process adds weeks of drag', severity: 'med', mitigation: 'Get the RFP template early and pre-fill it with the champion.', mitigated: false },
        { id: 'r3', label: 'No executive sponsor above the SVP yet', severity: 'med', mitigation: 'Ask the champion to broker a 20-minute CIO intro.', mitigated: false },
      ],
      competitors: [
        { id: 'c1', name: 'Oracle NetSuite', threat: 'high', us: 'behind', note: 'Existing ERP relationship. Pushing a bundled logistics add-on.' },
        { id: 'c2', name: 'In-house build', threat: 'med', us: 'even', note: 'Data team floated building it. Timeline risk is our angle.' },
      ],
      notes: [
        { id: 'n1', author: 'Nina Kapoor',  kind: 'update', body: 'Champion says the legacy tool officially sunsets in November, that is our compelling event. Anchoring the timeline around it.', agoMin: 120 },
        { id: 'n2', author: 'Nina Kapoor',  kind: 'action', body: 'Line up a reference call with a peer logistics account', agoMin: 240, done: false },
        { id: 'n3', author: 'Theo Bennett', kind: 'note',   body: 'NetSuite is quoting a heavy bundle discount. We win on migration speed and the AI routing, not on price. Do not chase the discount.', agoMin: 900 },
      ],
    },
    {
      id: 'wr_cobalt',
      name: 'Renewal + platform expansion',
      company: 'Cobalt Financial',
      industry: 'Financial Services',
      region: 'New York, NY',
      value: 540000,
      arr: true,
      stage: 'negotiation',
      owner: 'Simone Diaz',
      ownerTitle: 'Account Executive',
      closeInDays: 12,
      createdAgoDays: 51,
      history: trend(45, 74, 10),
      committee: [
        { id: 'm1', name: 'Harold Meunier', title: 'VP Revenue Operations', role: 'champion', influence: 'high', sentiment: 'positive', note: 'Existing power user. Wants to expand to two more teams.' },
        { id: 'm2', name: 'Denise Park',    title: 'CFO', role: 'economic', influence: 'high', sentiment: 'positive', note: 'Approved the expansion in principle, watching the uplift.' },
        { id: 'm3', name: 'Owen Sato',      title: 'Head of InfoSec', role: 'blocker', influence: 'med', sentiment: 'neutral', note: 'Annual security re-review is routine but must be scheduled.' },
        { id: 'm4', name: 'Reyna Cross',    title: 'Director of Sales', role: 'user', influence: 'med', sentiment: 'positive', note: 'Team already lives in the product daily.' },
      ],
      plan: [
        { id: 'p1', label: 'Expansion business case reviewed', owner: 'Harold Meunier', dueInDays: -14, phase: 'Align', status: 'done' },
        { id: 'p2', label: 'Usage + value review with the CFO', owner: 'Simone Diaz', dueInDays: -5, phase: 'Justify', status: 'done' },
        { id: 'p3', label: 'Annual security re-review scheduled', owner: 'Owen Sato', dueInDays: 2, phase: 'Justify', status: 'active' },
        { id: 'p4', label: 'Renewal + expansion quote accepted', owner: 'Denise Park', dueInDays: 6, phase: 'Close', status: 'active' },
        { id: 'p5', label: 'Order form signed', owner: 'Denise Park', dueInDays: 10, phase: 'Close', status: 'todo' },
      ],
      risks: [
        { id: 'r1', label: 'Uplift on renewal could draw procurement scrutiny', severity: 'med', mitigation: 'Frame the expansion seats separately from the renewal uplift.', mitigated: false },
        { id: 'r2', label: 'Security re-review not yet on the calendar', severity: 'low', mitigation: 'Have InfoSec book the standard annual slot this week.', mitigated: false },
      ],
      competitors: [
        { id: 'c1', name: 'None active', threat: 'low', us: 'ahead', note: 'Incumbent with strong usage. This is ours to lose.' },
      ],
      notes: [
        { id: 'n1', author: 'Simone Diaz', kind: 'win',    body: 'CFO verbally approved the expansion on todays value review. Now it is execution, not selling.', agoMin: 90 },
        { id: 'n2', author: 'Simone Diaz', kind: 'action', body: 'Send the split quote: renewal line + expansion seats broken out', agoMin: 150, done: false },
        { id: 'n3', author: 'Elena Ross',  kind: 'note',   body: 'Clean renewal with net expansion. Keep the security re-review from slipping and this closes early.', agoMin: 400 },
      ],
    },
    {
      id: 'wr_meridian',
      name: 'Department rollout (pilot to production)',
      company: 'Meridian Health',
      industry: 'Healthcare',
      region: 'Boston, MA',
      value: 265000,
      arr: true,
      stage: 'discovery',
      owner: 'Theo Bennett',
      ownerTitle: 'Account Executive',
      closeInDays: 58,
      createdAgoDays: 33,
      history: trend(15, 40, 10),
      committee: [
        { id: 'm1', name: 'Dr. Aisha Bello', title: 'Chief Medical Officer', role: 'economic', influence: 'high', sentiment: 'neutral', note: 'Cares about clinician time saved, not features.' },
        { id: 'm2', name: 'Paul Rennick',    title: 'Director of Patient Ops', role: 'champion', influence: 'med', sentiment: 'positive', note: 'Found us, running the internal pilot on one unit.' },
        { id: 'm3', name: 'Tara Voss',       title: 'Compliance Officer', role: 'blocker', influence: 'high', sentiment: 'negative', note: 'HIPAA + BAA are non-negotiable gates. Skeptical of new vendors.' },
      ],
      plan: [
        { id: 'p1', label: 'Discovery on clinician workflow pain', owner: 'Paul Rennick', dueInDays: -8, phase: 'Align', status: 'done' },
        { id: 'p2', label: 'Single-unit pilot scoped + launched', owner: 'Paul Rennick', dueInDays: 3, phase: 'Evaluate', status: 'active' },
        { id: 'p3', label: 'HIPAA + BAA compliance package delivered', owner: 'Theo Bennett', dueInDays: 7, phase: 'Justify', status: 'blocked' },
        { id: 'p4', label: 'Clinician time-savings measured on pilot unit', owner: 'Paul Rennick', dueInDays: 24, phase: 'Justify', status: 'todo' },
        { id: 'p5', label: 'CMO business review', owner: 'Theo Bennett', dueInDays: 40, phase: 'Close', status: 'todo' },
        { id: 'p6', label: 'Department rollout proposal', owner: 'Theo Bennett', dueInDays: 52, phase: 'Close', status: 'todo' },
      ],
      risks: [
        { id: 'r1', label: 'Compliance officer is a hard blocker and currently negative', severity: 'high', mitigation: 'Deliver the signed BAA + HIPAA package before any expansion talk.', mitigated: false },
        { id: 'r2', label: 'No economic buyer commitment yet, only clinical interest', severity: 'high', mitigation: 'Convert pilot metrics into a clinician-hours-saved number for the CMO.', mitigated: false },
        { id: 'r3', label: 'Long sales cycle risks losing pilot momentum', severity: 'med', mitigation: 'Set a fixed pilot end date with a decision review attached.', mitigated: false },
      ],
      competitors: [
        { id: 'c1', name: 'Epic add-on module', threat: 'high', us: 'behind', note: 'They already run Epic. Integration story is our must-win.' },
      ],
      notes: [
        { id: 'n1', author: 'Theo Bennett', kind: 'risk',   body: 'Compliance is the whole deal here. Until Tara has the BAA in hand, nothing else moves. Prioritizing the compliance package.', agoMin: 200 },
        { id: 'n2', author: 'Theo Bennett', kind: 'action', body: 'Get the signed BAA + HIPAA evidence pack to compliance', agoMin: 260, done: false },
        { id: 'n3', author: 'Nina Kapoor',  kind: 'note',   body: 'For the Epic overlap, lead with the integration demo. That is where the add-on module falls down.', agoMin: 1400 },
      ],
    },
    {
      id: 'wr_summit',
      name: 'New logo pilot to production',
      company: 'Summit Aerospace',
      industry: 'Aerospace',
      region: 'Denver, CO',
      value: 310000,
      arr: true,
      stage: 'qualified',
      owner: 'Marcus Hale',
      ownerTitle: 'Account Executive',
      closeInDays: 72,
      createdAgoDays: 19,
      history: trend(10, 28, 10),
      committee: [
        { id: 'm1', name: 'Gwen Ashby',   title: 'VP Program Management', role: 'champion', influence: 'med', sentiment: 'positive', note: 'Impressed by the demo, needs to build internal support.' },
        { id: 'm2', name: 'Victor Hahn',  title: 'CFO', role: 'economic', influence: 'high', sentiment: 'neutral', note: 'Unengaged so far. Champion has not reached him yet.' },
        { id: 'm3', name: 'Lena Frost',   title: 'Head of Program IT', role: 'technical', influence: 'med', sentiment: 'neutral', note: 'Wants to see security posture before committing time.' },
      ],
      plan: [
        { id: 'p1', label: 'Qualification call + mutual fit confirmed', owner: 'Marcus Hale', dueInDays: -6, phase: 'Align', status: 'done' },
        { id: 'p2', label: 'Multi-thread into finance + IT', owner: 'Gwen Ashby', dueInDays: 4, phase: 'Align', status: 'active' },
        { id: 'p3', label: 'Tailored demo for the program team', owner: 'Marcus Hale', dueInDays: 11, phase: 'Evaluate', status: 'todo' },
        { id: 'p4', label: 'Security overview with program IT', owner: 'Lena Frost', dueInDays: 18, phase: 'Evaluate', status: 'todo' },
        { id: 'p5', label: 'Paid pilot scoped', owner: 'Marcus Hale', dueInDays: 34, phase: 'Justify', status: 'todo' },
        { id: 'p6', label: 'Business case to the CFO', owner: 'Victor Hahn', dueInDays: 58, phase: 'Close', status: 'todo' },
      ],
      risks: [
        { id: 'r1', label: 'Single-threaded on the champion, no economic buyer yet', severity: 'high', mitigation: 'Ask the champion for a warm intro to the CFO this week.', mitigated: false },
        { id: 'r2', label: 'Aerospace security bar is very high', severity: 'med', mitigation: 'Prep the security overview deck before IT engages.', mitigated: false },
        { id: 'r3', label: 'Early stage, close date is soft', severity: 'low', mitigation: 'Lock a pilot start date to create a real timeline.', mitigated: false },
      ],
      competitors: [
        { id: 'c1', name: 'Microsoft Dynamics', threat: 'med', us: 'even', note: 'Enterprise agreement in place but no active push yet.' },
      ],
      notes: [
        { id: 'n1', author: 'Marcus Hale', kind: 'update', body: 'Great demo with the program team. Now the job is multi-threading. If this stays single-threaded on Gwen it will stall.', agoMin: 140 },
        { id: 'n2', author: 'Marcus Hale', kind: 'action', body: 'Ask Gwen for a warm intro to the CFO (Victor Hahn)', agoMin: 300, done: false },
      ],
    },
  ];

  return { seededAt: new Date().toISOString(), deals };
}

/* ============================================================
   PERSISTENCE + PUB/SUB
   ============================================================ */
let state = load();
const subs = new Set();

function load() {
  try {
    const raw = localStorage.getItem(WR_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const seed = buildSeed();
  try { localStorage.setItem(WR_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}
function commit(next) {
  state = next;
  try { localStorage.setItem(WR_KEY, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}
export function resetWarRoom() { try { localStorage.removeItem(WR_KEY); } catch {} state = load(); subs.forEach(fn => fn(state)); }

let idc = 1;
function newId(p) { return `${p}_${Date.now().toString(36)}_${(idc++).toString(36)}`; }

export function useWarRoom(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => {
    const fn = (s) => setSnap(selector(s));
    subs.add(fn); fn(state);
    return () => subs.delete(fn);
  }, []);
  return snap;
}

/* ============================================================
   READ API
   ============================================================ */
export function getWarDeals() { return state.deals; }
export function getWarDeal(id) { return state.deals.find(d => d.id === id) || null; }

export function noteAt(n) { return n.at ? new Date(n.at) : new Date(Date.now() - (n.agoMin || 0) * 60000); }
export function planDueDate(step) { return new Date(Date.now() + (step.dueInDays || 0) * DAY); }
export function closeDate(deal) { return new Date(Date.now() + (deal.closeInDays || 0) * DAY); }

export function planProgress(deal) {
  const total = deal.plan.length || 1;
  const done = deal.plan.filter(s => s.status === 'done').length;
  return { done, total, pct: Math.round((done / total) * 100) };
}

export function openRisks(deal) {
  const rank = { high: 3, med: 2, low: 1 };
  return deal.risks.filter(r => !r.mitigated).sort((a, b) => (rank[b.severity] || 0) - (rank[a.severity] || 0));
}

export function committeeSentiment(deal) {
  const v = { positive: 1, neutral: 0.5, negative: 0 };
  let s = 0;
  for (const m of deal.committee) s += (v[m.sentiment] ?? 0.5);
  return Math.round((s / (deal.committee.length || 1)) * 100);
}

/* Win-probability model: a real function of the room, not a stored field.
   Checking a plan step, moving sentiment, or mitigating a risk all change it
   live. Deterministic and pure over the deal. */
export function computeWinProb(deal) {
  let p = STAGE_META[deal.stage]?.base ?? 40;

  const sv = { positive: 1, neutral: 0, negative: -1 };
  const iw = { high: 1, med: 0.6, low: 0.3 };
  const rw = { champion: 1.4, economic: 1.5, technical: 0.8, influencer: 0.7, user: 0.5, blocker: 1.6 };
  let cs = 0, cw = 0;
  for (const m of deal.committee) {
    const w = (rw[m.role] ?? 0.6) * (iw[m.influence] ?? 0.6);
    cw += w;
    cs += (sv[m.sentiment] ?? 0) * w;
  }
  const sentimentDelta = cw ? (cs / cw) * 12 : 0;              // -12 .. +12

  const pr = planProgress(deal).pct / 100;
  const planDelta = (pr - 0.5) * 16;                          // -8 .. +8

  let riskDelta = 0;
  for (const r of deal.risks) {
    if (r.mitigated) continue;
    riskDelta -= r.severity === 'high' ? 3.5 : r.severity === 'med' ? 1.8 : 0.6;
  }

  let compDelta = 0;
  for (const c of deal.competitors) {
    compDelta += c.us === 'behind' ? -4 : c.us === 'even' ? -1.2 : 1;
  }

  const raw = p + sentimentDelta + planDelta + riskDelta + compDelta;
  return Math.max(6, Math.min(96, Math.round(raw)));
}

/* Rook's read: the single biggest risk + the recommended next move. */
export function biggestRisk(deal) {
  const risks = openRisks(deal);
  if (risks.length) return { title: risks[0].label, detail: risks[0].mitigation, kind: 'risk', targetId: risks[0].id };
  const negBlocker = deal.committee.find(m => m.role === 'blocker' && m.sentiment === 'negative');
  if (negBlocker) return { title: `${negBlocker.name} (blocker) is at risk`, detail: negBlocker.note, kind: 'sentiment', targetId: negBlocker.id };
  const behind = deal.competitors.find(c => c.us === 'behind');
  if (behind) return { title: `Losing ground to ${behind.name}`, detail: behind.note, kind: 'competitor', targetId: behind.id };
  return { title: 'No critical risk open', detail: 'The room is healthy. Keep the plan moving and protect the close date.', kind: 'none' };
}

export function recommendedMove(deal) {
  const negBlocker = deal.committee.find(m => m.role === 'blocker' && m.sentiment === 'negative');
  if (negBlocker) {
    return { title: `Neutralize ${negBlocker.name}`, detail: `${negBlocker.title} can stall this. ${negBlocker.note}`, cta: 'Ask Rook for a plan' };
  }
  const blocked = deal.plan.find(s => s.status === 'blocked');
  if (blocked) {
    return { title: `Unblock: ${blocked.label}`, detail: `Owned by ${blocked.owner}. A blocked step is where the deal is actually stuck.`, cta: 'Ask Rook to unblock' };
  }
  const noEcon = !deal.committee.some(m => m.role === 'economic' && m.sentiment === 'positive');
  const econ = deal.committee.find(m => m.role === 'economic');
  if (noEcon && econ) {
    return { title: `Win over ${econ.name}`, detail: `The economic buyer is not yet positive. No signature without them.`, cta: 'Ask Rook to draft the ROI story' };
  }
  const active = deal.plan.find(s => s.status === 'active');
  if (active) {
    return { title: `Advance: ${active.label}`, detail: `This is the next step in motion. Owned by ${active.owner}.`, cta: 'Ask Rook to draft the follow-up' };
  }
  const next = deal.plan.find(s => s.status === 'todo');
  if (next) return { title: `Kick off: ${next.label}`, detail: `Owned by ${next.owner}. Start it to keep momentum.`, cta: 'Ask Rook to schedule it' };
  return { title: 'Drive to signature', detail: 'Every step is complete. Confirm the paperwork and close it.', cta: 'Ask Rook to draft the close note' };
}

/* "What will move this deal": ranked levers with the modeled point lift,
   computed by simulating each change against computeWinProb on a clone.
   Levers are actionable - the UI maps kind -> a writer via applyLever. */
function cloneDeal(deal) { return JSON.parse(JSON.stringify(deal)); }

export function whatWillMove(deal) {
  const base = computeWinProb(deal);
  const levers = [];

  // Turn the most influential non-positive committee member positive.
  const iwr = { high: 3, med: 2, low: 1 };
  const upgradeable = deal.committee
    .filter(m => m.sentiment !== 'positive')
    .sort((a, b) => (iwr[b.influence] || 0) - (iwr[a.influence] || 0));
  if (upgradeable[0]) {
    const m = upgradeable[0];
    const cl = cloneDeal(deal);
    const t = cl.committee.find(x => x.id === m.id);
    if (t) t.sentiment = 'positive';
    levers.push({
      id: `lv_sent_${m.id}`, kind: 'sentiment', targetId: m.id,
      label: `Move ${m.name} to positive`,
      sub: `${ROLE_META[m.role]?.label || m.role} - ${SENTIMENT_META[m.sentiment].label} today`,
      delta: computeWinProb(cl) - base,
    });
  }

  // Complete the current blocked or active plan step.
  const step = deal.plan.find(s => s.status === 'blocked') || deal.plan.find(s => s.status === 'active');
  if (step) {
    const cl = cloneDeal(deal);
    const t = cl.plan.find(x => x.id === step.id);
    if (t) t.status = 'done';
    levers.push({
      id: `lv_plan_${step.id}`, kind: 'plan', targetId: step.id,
      label: `Complete "${step.label}"`,
      sub: `${PLAN_STATUS[step.status].label} - owned by ${step.owner}`,
      delta: computeWinProb(cl) - base,
    });
  }

  // Mitigate the top open risk.
  const risks = openRisks(deal);
  if (risks[0]) {
    const cl = cloneDeal(deal);
    const t = cl.risks.find(x => x.id === risks[0].id);
    if (t) t.mitigated = true;
    levers.push({
      id: `lv_risk_${risks[0].id}`, kind: 'risk', targetId: risks[0].id,
      label: `Mitigate: ${risks[0].label}`,
      sub: risks[0].mitigation,
      delta: computeWinProb(cl) - base,
    });
  }

  return levers.filter(l => l.delta > 0).sort((a, b) => b.delta - a.delta);
}

/* ============================================================
   WRITE API  (validated writers; return record or { error, message })
   ============================================================ */
function findDeal(id) { return state.deals.find(d => d.id === id); }

export function setPlanStatus(dealId, stepId, status) {
  if (!PLAN_STATUS[status]) return { error: 'status', message: 'Unknown status.' };
  const d = findDeal(dealId);
  if (!d) return { error: 'missing', message: 'War room not found.' };
  const step = d.plan.find(s => s.id === stepId);
  if (!step) return { error: 'missing', message: 'Step not found.' };
  step.status = status;
  commit({ ...state });
  return { step };
}

export function togglePlanStep(dealId, stepId) {
  const d = findDeal(dealId);
  const step = d?.plan.find(s => s.id === stepId);
  if (!step) return { error: 'missing', message: 'Step not found.' };
  return setPlanStatus(dealId, stepId, step.status === 'done' ? 'active' : 'done');
}

export function cycleSentiment(dealId, memberId) {
  const d = findDeal(dealId);
  if (!d) return { error: 'missing', message: 'War room not found.' };
  const m = d.committee.find(x => x.id === memberId);
  if (!m) return { error: 'missing', message: 'Member not found.' };
  const i = SENTIMENT_CYCLE.indexOf(m.sentiment);
  m.sentiment = SENTIMENT_CYCLE[(i + 1) % SENTIMENT_CYCLE.length];
  commit({ ...state });
  return { member: m };
}

export function setSentiment(dealId, memberId, sentiment) {
  if (!SENTIMENT_META[sentiment]) return { error: 'sentiment', message: 'Unknown sentiment.' };
  const d = findDeal(dealId);
  const m = d?.committee.find(x => x.id === memberId);
  if (!m) return { error: 'missing', message: 'Member not found.' };
  m.sentiment = sentiment;
  commit({ ...state });
  return { member: m };
}

export function mitigateRisk(dealId, riskId) {
  const d = findDeal(dealId);
  const r = d?.risks.find(x => x.id === riskId);
  if (!r) return { error: 'missing', message: 'Risk not found.' };
  r.mitigated = true;
  commit({ ...state });
  return { risk: r };
}

export function reopenRisk(dealId, riskId) {
  const d = findDeal(dealId);
  const r = d?.risks.find(x => x.id === riskId);
  if (!r) return { error: 'missing', message: 'Risk not found.' };
  r.mitigated = false;
  commit({ ...state });
  return { risk: r };
}

export function postNote(dealId, { author = 'You', kind = 'note', body, mentions = [] }) {
  if (!body || !body.trim()) return { error: 'body', message: 'Write something to post.' };
  const d = findDeal(dealId);
  if (!d) return { error: 'missing', message: 'War room not found.' };
  const note = {
    id: newId('n'), author, kind,
    body: body.trim(), mentions,
    at: new Date().toISOString(),
    done: kind === 'action' ? false : undefined,
  };
  d.notes = [note, ...d.notes];
  commit({ ...state });
  return { note };
}

export function toggleNoteDone(dealId, noteId) {
  const d = findDeal(dealId);
  const n = d?.notes.find(x => x.id === noteId);
  if (!n) return { error: 'missing', message: 'Note not found.' };
  n.done = !n.done;
  commit({ ...state });
  return { note: n };
}

/* One entry point the UI uses to apply a Rook lever from "what will move". */
export function applyLever(dealId, lever) {
  if (!lever) return { error: 'lever', message: 'No lever.' };
  if (lever.kind === 'sentiment') return setSentiment(dealId, lever.targetId, 'positive');
  if (lever.kind === 'plan') return setPlanStatus(dealId, lever.targetId, 'done');
  if (lever.kind === 'risk') return mitigateRisk(dealId, lever.targetId);
  return { error: 'lever', message: 'Unknown lever kind.' };
}
