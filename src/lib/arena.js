// ============================================================
// ARDOVO PRACTICE ARENA  (local-first: content + scoring + certification)
//
// "Learn by doing, scored instantly." Certification by simulation, not seat-time.
// Scoring is deterministic and offline by default; AI is an optional enhancement.
// This module owns every Arena data shape and the deterministic engines:
//   1) ROLE-PLAY   turn-based buyer persona sim + rubric grader
//   2) SPEED DRILL timed checklist tasks + best-time leaderboard
//   3) KNOWLEDGE   adaptive quiz on Ardovo concepts
// Passing all three modes for a role grants an "Ardovo Certified <Role>" badge.
//
// Everything is deterministic so the Arena is fully playable with NO API keys.
// api/arena.js (Anthropic) is an OPTIONAL enhancement layered on top; when it
// is unavailable every path falls back to the logic in this file.
//
// Persistence + pub/sub follow the same shape as src/lib/store.js and
// src/lib/recent-pages.js (a subs Set + notify). store.js is imported
// READ-ONLY (getUsers) to seed leaderboard rivals from the real team.
//
// ASCII only. NO em-dash / en-dash. ASCII hyphen only.
// ============================================================
import { useEffect, useState } from 'react';
import { getUsers } from './store.js';

const PROGRESS_KEY = 'rally_arena_progress_v1';

/* ---------- small deterministic helpers ---------- */
const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
function hash(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}
const pass = (n) => n >= PASS_MARK;
export const PASS_MARK = 70;

export function gradeLetter(score) {
  if (score >= 95) return 'S';
  if (score >= 88) return 'A';
  if (score >= 78) return 'B';
  if (score >= 70) return 'C';
  if (score >= 55) return 'D';
  return 'F';
}
export function gradeTone(score) {
  if (score >= 88) return 'ok';
  if (score >= 70) return 'accent';
  if (score >= 55) return 'warn';
  return 'risk';
}

/* ============================================================
   ROLES  (a role is certified by passing all three modes)
   ============================================================ */
export const ROLES = [
  {
    id: 'sdr', name: 'SDR', full: 'Sales Development Rep', icon: 'signal',
    blurb: 'Book quality meetings. Qualify fast, handle brush-offs, earn the next step.',
    accent: 'var(--accent-teal, var(--accent))',
  },
  {
    id: 'ae', name: 'Account Executive', full: 'Account Executive', icon: 'target',
    blurb: 'Run discovery, defend value against a skeptical buyer, drive deals to close.',
    accent: 'var(--accent)',
  },
  {
    id: 'manager', name: 'Revenue Manager', full: 'Revenue Manager', icon: 'roleShield',
    blurb: 'Read the pipeline, coach the number, know every forecast category cold.',
    accent: 'var(--accent-purple, var(--accent))',
  },
];
export const roleById = (id) => ROLES.find(r => r.id === id) || ROLES[1];

/* ============================================================
   MODE 1: ROLE-PLAY  (AI buyer personas + deterministic engine)
   ============================================================ */
export const PERSONAS = [
  {
    id: 'cfo',
    name: 'Diane Okafor',
    title: 'Chief Financial Officer',
    company: 'Northwind Capital',
    difficulty: 'Hard',
    tone: 'Skeptical, numbers-first, guards the budget.',
    opening: "I have got fifteen minutes. My team says your platform is interesting, but I have seen a lot of tools promise the world. What am I actually going to get for the money?",
    objection: {
      line: "Here is my problem. We already pay for a CRM. Ripping it out is expensive and risky, and I have not seen a dollar figure that says this pays for itself. Convince me this is not just another line item.",
    },
    objectionPush: "That is a nice story, but it is still a story. I need to understand the return, not the features. What specifically changes on my P&L?",
    replies: {
      discovery: [
        "Fair question. Right now revenue is unpredictable, forecasts miss by twenty percent, and my board hates surprises.",
        "Honestly, my reps spend more time on data entry than selling. That is real money walking out the door.",
        "We measure success on forecast accuracy and cost of sale. Those are the two numbers I live and die by.",
      ],
      value: [
        "Okay, that is more concrete than most pitches I hear.",
        "If that held up, it would matter to me. Keep going.",
        "I can see the shape of an argument there.",
      ],
      satisfied: [
        "Alright. That framing actually maps to how I think about return. You are speaking my language now.",
        "Good. That is the kind of number I can take to the board. Keep it grounded like that.",
      ],
      price: [
        "Price is not my issue. Justifying the switching cost is my issue. Tie it to an outcome.",
        "I do not need a discount. I need to know the payback period.",
      ],
      generic: [
        "Okay. And why should that matter to me specifically?",
        "I hear a lot of vendors say that. What makes you different?",
      ],
    },
    stallLine: "I am not ready to put time on the calendar until I understand the return. Come back to that.",
    acceptLine: "Fine. Put thirty minutes with me and my controller next week and bring the ROI model. If the math holds, we will talk seriously.",
  },
  {
    id: 'champion',
    name: 'Marcus Vance',
    title: 'VP of Revenue Operations',
    company: 'Meridian Systems',
    difficulty: 'Medium',
    tone: 'Friendly and bought-in, but slammed and has to sell it internally.',
    opening: "Hey, thanks for hopping on. I will be honest, I like what I have seen so far. The challenge is I am buried, and I still have to get my CFO and my head of sales on board. So help me help you.",
    objection: {
      line: "The thing is, I cannot be the one who has to explain this to leadership from scratch. If I bring this forward and get grilled on why now, I need answers ready. How do I sell this internally?",
    },
    objectionPush: "I get that it is good. I need the words I can paste into a Slack to my exec team. Give me the one-liner that gets a yes.",
    replies: {
      discovery: [
        "Right now our stack is duct-taped together. Reps live in spreadsheets and my ops team rebuilds the same report every Monday.",
        "The big pain is visibility. Leadership asks where are we going to land and we are guessing.",
        "If I am honest, adoption is my fear. We bought a tool last year nobody used.",
      ],
      value: [
        "Oh that is good, I can use that.",
        "Yeah, that would land with my head of sales.",
        "See, that is the kind of thing that gets me excited.",
      ],
      satisfied: [
        "Perfect, that is exactly the ammo I needed. I can walk into that meeting now.",
        "That is the one-liner. You just made my internal pitch for me.",
      ],
      price: [
        "Budget exists if I can show impact. Help me make the case, not just the price.",
        "I can find the money. I cannot find the political capital unless the story is tight.",
      ],
      generic: [
        "Makes sense. What else should I have in my back pocket?",
        "Cool. How do other teams like mine roll this out without chaos?",
      ],
    },
    stallLine: "I want to, but I cannot commit my exec team until I have the story straight. Let me get there first.",
    acceptLine: "Love it. Let us do a thirty minute working session with me and my head of sales on Thursday. Bring the rollout plan and I will get the calendar hold out today.",
  },
  {
    id: 'price',
    name: 'Sofia Reyes',
    title: 'Director of Procurement',
    company: 'Cascade Retail Group',
    difficulty: 'Medium',
    tone: 'Transactional, comparison-shopping, anchors hard on price.',
    opening: "So I am evaluating three vendors and, frankly, you are the most expensive on the list. Walk me through why I would not just take the cheaper option.",
    objection: {
      line: "Your competitor quoted me almost forty percent less for what looks like the same feature list. Unless you are going to match that, I am not sure we have a conversation.",
    },
    objectionPush: "Feature lists all look the same on a slide. I am looking at two numbers side by side and yours is bigger. Give me a reason that is not just trust me.",
    replies: {
      discovery: [
        "What matters to us is total cost over three years, not the sticker price. But nobody has shown me that math yet.",
        "We got burned by a cheap tool that needed six months of consulting to actually work. Hidden costs scare me more than list price.",
        "Our real problem is that deals leak. If something actually fixed that, the price conversation changes.",
      ],
      value: [
        "Okay, that is a differentiator I had not considered.",
        "Hm. That would factor into total cost. Noted.",
        "That is a fair point. The cheap option cannot say that.",
      ],
      satisfied: [
        "Alright, when you frame it as value over three years instead of sticker price, that lands differently. I can work with that.",
        "Okay. You just moved this from a price conversation to a value conversation. That is the right instinct.",
      ],
      price: [
        "I still need to see the numbers, but I am open if you can prove the value gap.",
        "Do not just drop the price. Show me why the price is what it is.",
      ],
      generic: [
        "Right. And how does that compare to the others I am looking at?",
        "Okay. What else separates you from the cheaper quote?",
      ],
    },
    stallLine: "I am not putting anything on the calendar until the pricing gap makes sense to me. Close that first.",
    acceptLine: "Okay. Send me a three year total cost comparison and let us get thirty minutes with my finance partner. If the value gap is real, you are back in the running at the top.",
  },
];
export const personaById = (id) => PERSONAS.find(p => p.id === id) || PERSONAS[0];

/* ---------- intent classifier (deterministic, keyword based) ---------- */
const DISCOVERY_WORDS = ['what', 'how', 'why', 'when', 'tell me', 'walk me', 'currently', 'today', 'challenge', 'goal', 'priority', 'timeline', 'budget', 'process', 'decision', 'team', 'pain', 'struggling', 'looking for', 'hoping', 'success', 'measure', 'metric', 'kpi', 'who else', 'help me understand', 'curious'];
const OBJECTION_WORDS = ['understand', 'hear you', 'makes sense', 'fair', 'appreciate', 'great question', 'good question', 'other customers', 'roi', 'return', 'payback', 'value', 'save', 'saves', 'reduce', 'because', 'however', 'that said', 'what if', 'would it help', 'total cost', 'over three years', 'outcome', 'i understand', 'to your point', 'the reason'];
const NEXTSTEP_WORDS = ['next step', 'follow up', 'follow-up', 'schedule', 'calendar', 'book', 'meeting', 'demo', 'workshop', 'working session', 'send you', 'send over', 'proposal', 'pilot', 'trial', 'introduce', 'connect you', 'loop in', 'thursday', 'tuesday', 'monday', 'next week', 'time that works', 'put time', 'set up', 'get on a call'];
const VALUE_WORDS = ['we help', 'our platform', 'ardovo', 'forecast accuracy', 'automate', 'automation', 'save time', 'increase', 'boost', 'grow', 'pipeline', 'visibility', 'faster', 'proven', 'customers like', 'results', 'impact', 'you can', 'you will be able'];
const PRICE_WORDS = ['price', 'pricing', 'cost', 'discount', 'expensive', 'afford', 'quote', 'cheaper', 'budget', 'per seat', 'per user'];

function countHits(text, words) {
  let n = 0;
  for (const w of words) if (text.includes(w)) n++;
  return n;
}
export function classifyTurn(raw = '') {
  const text = String(raw).toLowerCase();
  const discoveryHits = countHits(text, DISCOVERY_WORDS);
  return {
    isQuestion: text.includes('?'),
    discoveryHits,
    objectionAddress: countHits(text, OBJECTION_WORDS) > 0,
    nextStep: countHits(text, NEXTSTEP_WORDS) > 0,
    value: countHits(text, VALUE_WORDS) > 0,
    price: countHits(text, PRICE_WORDS) > 0,
    length: text.trim().split(/\s+/).filter(Boolean).length,
  };
}

/* ---------- role-play engine (pure, deterministic) ---------- */
export function newRolePlay(personaId) {
  const persona = personaById(personaId);
  return {
    personaId: persona.id,
    mood: 50,
    turn: 0,
    done: false,
    history: [{ role: 'buyer', text: persona.opening }],
    metrics: {
      turns: 0, discoveryQuestions: 0, discoveryHits: 0, valueStatements: 0,
      objectionRaised: false, objectionHandled: false,
      nextStepProposed: false, nextStepAccepted: false,
    },
  };
}

const pickLine = (arr, turn) => arr[turn % arr.length];

// Produce the buyer reply for a rep turn. Returns { reply, mood, metrics, done }.
// Exported so api/arena.js can reuse the SAME state machine and only swap the
// reply TEXT with a richer model line when a key is present.
export function computeBuyerTurn(state, repText) {
  const persona = personaById(state.personaId);
  const f = classifyTurn(repText);
  const m = { ...state.metrics };
  m.turns++;
  if (f.discoveryHits > 0 && f.isQuestion) { m.discoveryQuestions++; m.discoveryHits += f.discoveryHits; }
  else if (f.discoveryHits > 0) { m.discoveryHits += Math.min(f.discoveryHits, 1); }
  if (f.value) m.valueStatements++;

  let mood = state.mood;
  let reply;
  let done = state.done;

  if (m.objectionRaised && !m.objectionHandled) {
    // Rep is expected to acknowledge and reframe the standing objection.
    if (f.objectionAddress || f.value) {
      m.objectionHandled = true; mood += 16;
      reply = pickLine(persona.replies.satisfied, state.turn);
    } else if (f.isQuestion && f.discoveryHits > 0) {
      mood += 4; reply = pickLine(persona.replies.discovery, state.turn);
    } else if (f.price) {
      mood -= 2; reply = pickLine(persona.replies.price, state.turn);
    } else {
      mood -= 8; reply = persona.objectionPush;
    }
  } else if (f.nextStep) {
    m.nextStepProposed = true;
    if (mood >= 58) { m.nextStepAccepted = true; mood += 6; reply = persona.acceptLine; done = true; }
    else { reply = persona.stallLine; }
  } else if (!m.objectionRaised && m.turns >= 2) {
    m.objectionRaised = true; mood -= 4; reply = persona.objection.line;
  } else if (f.isQuestion && f.discoveryHits > 0) {
    mood += 6; reply = pickLine(persona.replies.discovery, state.turn);
  } else if (f.value) {
    mood += 3; reply = pickLine(persona.replies.value, state.turn);
  } else if (f.price) {
    reply = pickLine(persona.replies.price, state.turn);
  } else {
    reply = pickLine(persona.replies.generic, state.turn);
  }

  mood = clamp(mood);
  if (m.turns >= 9) done = true;
  return { reply, mood, metrics: m, done };
}

export function advanceRolePlay(state, repText, override) {
  const t = computeBuyerTurn(state, repText);
  // override lets the optional LLM supply a richer reply line while the
  // deterministic metrics + mood machine stays authoritative for scoring.
  const replyText = (override && override.reply) ? String(override.reply) : t.reply;
  return {
    ...state,
    mood: t.mood,
    metrics: t.metrics,
    turn: state.turn + 1,
    done: t.done,
    history: [...state.history, { role: 'rep', text: repText }, { role: 'buyer', text: replyText }],
  };
}

// Deterministic rubric grader. discovery 40 / objection 35 / next step 25.
export function gradeRolePlay(state) {
  const m = state.metrics || {};
  const q = m.discoveryQuestions || 0;
  const hits = m.discoveryHits || 0;
  const discovery = clamp(Math.round(q * 9 + Math.min(hits, 9) * 1.8), 0, 40);
  const objection = m.objectionHandled ? 35 : (m.objectionRaised ? 12 : 20);
  const nextStep = m.nextStepAccepted ? 25 : (m.nextStepProposed ? 14 : 0);
  const total = clamp(discovery + objection + nextStep, 0, 100);

  const feedback = [];
  if (discovery >= 32) feedback.push('Strong discovery. You asked open questions and dug into their world before pitching.');
  else if (discovery >= 18) feedback.push('Decent discovery, but go deeper. Ask more open "what / how / why" questions before presenting.');
  else feedback.push('Thin discovery. You pitched before you diagnosed. Lead with questions about their goals, pain, and process.');

  if (m.objectionHandled) feedback.push('You handled the objection well by acknowledging it and reframing around value.');
  else if (m.objectionRaised) feedback.push('The buyer raised a real objection you never fully addressed. Acknowledge it, then reframe with an outcome.');
  else feedback.push('No hard objection surfaced. In real deals, invite the pushback so you can handle it live.');

  if (m.nextStepAccepted) feedback.push('You earned a concrete next step. That is how you keep a deal moving.');
  else if (m.nextStepProposed) feedback.push('You asked for a next step but had not earned it yet. Build enough value first, then ask.');
  else feedback.push('You never proposed a clear next step. Always close the conversation with a specific, time-bound ask.');

  return {
    mode: 'roleplay',
    score: total,
    grade: gradeLetter(total),
    pass: pass(total),
    breakdown: [
      { label: 'Discovery depth', value: discovery, max: 40 },
      { label: 'Objection handling', value: objection, max: 35 },
      { label: 'Next step', value: nextStep, max: 25 },
    ],
    feedback,
    meta: { personaId: state.personaId, mood: state.mood, turns: m.turns },
  };
}

/* ============================================================
   MODE 2: SPEED DRILLS  (timed checklist tasks + leaderboard)
   ============================================================ */
export const DRILLS = [
  {
    id: 'create-deal', title: 'Create a deal', icon: 'deals', targetMs: 40000,
    scenario: 'A new opportunity just came in from Vertex Robotics. Log it before the sync call in 40 seconds.',
    steps: [
      'Open the New Deal form',
      'Name the deal after the account and use case',
      'Enter the deal value',
      'Set the pipeline stage to Discovery',
      'Choose a realistic close date',
      'Assign the deal owner',
      'Save the deal',
    ],
  },
  {
    id: 'log-call', title: 'Log a call', icon: 'phone', targetMs: 30000,
    scenario: 'You just wrapped a discovery call. Capture it while it is fresh, in 30 seconds.',
    steps: [
      'Open the contact record',
      'Add a Call activity',
      'Write a one line summary of what was said',
      'Capture the agreed next step',
      'Set a follow up task with a due date',
      'Save the activity',
    ],
  },
  {
    id: 'build-report', title: 'Build a report', icon: 'chart', targetMs: 55000,
    scenario: 'Your manager wants pipeline by stage before the forecast call. Build it in under a minute.',
    steps: [
      'Open the Report Builder',
      'Choose Deals as the data source',
      'Group the rows by pipeline stage',
      'Add deal value as the measured metric',
      'Filter to open deals only',
      'Pick a bar chart visualization',
      'Save and name the report',
    ],
  },
  {
    id: 'qualify-lead', title: 'Qualify a lead', icon: 'target', targetMs: 35000,
    scenario: 'An inbound lead needs qualifying. Run the checklist and route it in 35 seconds.',
    steps: [
      'Open the new contact record',
      'Confirm the company and title',
      'Set the lifecycle stage',
      'Add the right qualification tags',
      'Assign an owner',
      'Create the first outreach task',
    ],
  },
  {
    id: 'move-stage', title: 'Advance a deal', icon: 'trendUp', targetMs: 28000,
    scenario: 'A deal just got verbal approval. Move it and keep the record clean in 28 seconds.',
    steps: [
      'Open the deal record',
      'Move the stage to Negotiation',
      'Update the close date',
      'Log the reason for the stage change as a note',
      'Set the next task for the champion',
    ],
  },
];
export const drillById = (id) => DRILLS.find(d => d.id === id) || DRILLS[0];

// Grade a drill attempt. completeness 60 (steps checked) + speed 40 (vs target).
export function gradeDrill(drill, elapsedMs, checkedCount) {
  const totalSteps = drill.steps.length;
  const checked = clamp(checkedCount, 0, totalSteps);
  const completeness = Math.round((checked / totalSteps) * 60);
  // Full speed credit at or under target, decaying as it runs long. Never negative.
  const ratio = elapsedMs > 0 ? drill.targetMs / elapsedMs : 1;
  const speed = Math.round(clamp(ratio, 0, 1) * 40);
  const total = clamp(completeness + speed, 0, 100);
  const complete = checked === totalSteps;

  const feedback = [];
  if (complete) feedback.push('Every step done. Complete records are what make the pipeline trustworthy.');
  else feedback.push(`You skipped ${totalSteps - checked} step(s). Incomplete records break forecasting and hand-offs.`);
  if (elapsedMs <= drill.targetMs) feedback.push(`Fast. You beat the ${Math.round(drill.targetMs / 1000)}s target with time to spare.`);
  else feedback.push(`Over the ${Math.round(drill.targetMs / 1000)}s target. Speed is a skill, and it compounds across a full day of admin.`);

  return {
    mode: 'drill',
    score: total,
    grade: gradeLetter(total),
    pass: pass(total) && complete,
    breakdown: [
      { label: 'Completeness', value: completeness, max: 60 },
      { label: 'Speed', value: speed, max: 40 },
    ],
    feedback,
    meta: { drillId: drill.id, elapsedMs, checked, totalSteps, complete },
  };
}

// Best-time leaderboard: deterministic rival times seeded from the real team
// plus the player's personal best (from progress). Only fully-completed runs
// count. Rivals are stable per drill so the board feels like a real ranking.
export function drillLeaderboard(drillId, progress) {
  const drill = drillById(drillId);
  const rivals = getUsers().filter(u => u.role === 'rep').slice(0, 5).map(u => {
    const seed = hash(u.id + drillId);
    const factor = 0.72 + (seed % 55) / 100; // 0.72x .. 1.27x of target
    return { name: u.name, ms: Math.round(drill.targetMs * factor), you: false };
  });
  const best = progress?.drillBest?.[drillId];
  const rows = [...rivals];
  if (best && best.ms != null) rows.push({ name: 'You', ms: best.ms, you: true });
  return rows.sort((a, b) => a.ms - b.ms).map((r, i) => ({ ...r, rank: i + 1 }));
}

/* ============================================================
   MODE 3: KNOWLEDGE CHECK  (adaptive quiz on Ardovo concepts)
   ============================================================ */
export const QUIZ_LENGTH = 8;
const DIFF_WEIGHT = { easy: 1, med: 1.5, hard: 2 };
const harder = (d) => (d === 'easy' ? 'med' : 'hard');
const easier = (d) => (d === 'hard' ? 'med' : 'easy');

export const QUIZ = [
  { id: 'q1', topic: 'Pipeline', difficulty: 'easy', q: 'Which of these is the FIRST stage of the Ardovo sales pipeline?', choices: ['Proposal', 'Lead', 'Negotiation', 'Closed Won'], answer: 1, explain: 'The pipeline runs Lead, Qualified, Discovery, Proposal, Negotiation, then Closed Won or Lost.' },
  { id: 'q2', topic: 'Pipeline', difficulty: 'easy', q: 'A deal marked "Closed Won" has what win probability in Ardovo?', choices: ['85%', '50%', '100%', '0%'], answer: 2, explain: 'Closed Won is 100% and Closed Lost is 0%. Everything in between is an open stage with a rolling probability.' },
  { id: 'q3', topic: 'Lifecycle', difficulty: 'easy', q: 'When a company has an open deal, what lifecycle stage does Ardovo assign it?', choices: ['Customer', 'Opportunity', 'Lead', 'Churned'], answer: 1, explain: 'An open deal makes the account an Opportunity. A won deal makes it a Customer.' },
  { id: 'q4', topic: 'Activities', difficulty: 'easy', q: 'Which of these is NOT one of the core Ardovo activity types?', choices: ['Call', 'Meeting', 'Invoice', 'Note'], answer: 2, explain: 'The activity types are Task, Call, Email, Meeting, and Note. Invoices live in billing, not the activity timeline.' },
  { id: 'q5', topic: 'Forecasting', difficulty: 'med', q: 'What does "weighted forecast" mean in Ardovo?', choices: ['Sum of all open deal values', 'Deal value times win probability, summed', 'Only deals marked Commit', 'Last quarter closed revenue'], answer: 1, explain: 'Weighted forecast multiplies each open deal by its stage probability and sums the result.' },
  { id: 'q6', topic: 'Forecasting', difficulty: 'med', q: 'Which forecast category means the rep is confident the deal will close this period?', choices: ['Pipeline', 'Omitted', 'Commit', 'Best Case'], answer: 2, explain: 'Commit is the rep standing behind the deal. Best Case is upside, Pipeline is early, Omitted is excluded.' },
  { id: 'q7', topic: 'Metrics', difficulty: 'med', q: 'How is win rate calculated?', choices: ['Won deals divided by all deals ever', 'Won divided by (won plus lost)', 'Open deals divided by closed', 'Revenue divided by quota'], answer: 1, explain: 'Win rate is won divided by total closed (won plus lost). Open deals are not counted yet.' },
  { id: 'q8', topic: 'Pipeline', difficulty: 'med', q: 'A deal sits in "Discovery". Roughly what probability does Ardovo attach to that stage?', choices: ['10%', '45%', '85%', '100%'], answer: 1, explain: 'Discovery carries about 45%. Probability climbs as the deal advances toward Negotiation (85%).' },
  { id: 'q9', topic: 'Lifecycle', difficulty: 'med', q: 'A brand new inbound contact with no company link starts at which lifecycle stage?', choices: ['Customer', 'Opportunity', 'Lead', 'SQL'], answer: 2, explain: 'An orphan contact starts as a Lead. Contacts tied to a company inherit that company stage.' },
  { id: 'q10', topic: 'Forecasting', difficulty: 'hard', q: 'Committed forecast is $600K, quota is $750K. What is the gap and attainment?', choices: ['$150K gap, 80% attainment', '$150K gap, 125% attainment', '$0 gap, 100% attainment', '$1.35M gap, 44% attainment'], answer: 0, explain: 'Gap is quota minus committed ($150K). Attainment is committed over quota (600/750 = 80%).' },
  { id: 'q11', topic: 'Forecasting', difficulty: 'hard', q: 'Two open deals: $100K at 25% and $200K at 85%. What is the weighted forecast?', choices: ['$300K', '$195K', '$255K', '$85K'], answer: 1, explain: '100K x 0.25 = 25K, plus 200K x 0.85 = 170K, total 195K.' },
  { id: 'q12', topic: 'Metrics', difficulty: 'hard', q: 'A deal in Negotiation slips its close date into the past but is still open. Ardovo classifies it as what?', choices: ['Closed Lost', 'A slipping deal', 'A won deal', 'A new lead'], answer: 1, explain: 'An open deal whose close date is already past is a slipping deal. It needs attention, not an automatic loss.' },
  { id: 'q13', topic: 'Pipeline', difficulty: 'hard', q: 'You move a deal from Proposal to Negotiation. What does Ardovo update automatically?', choices: ['Only the stage', 'Stage, probability, and it logs a note', 'Nothing until you save', 'It closes the deal'], answer: 1, explain: 'Moving stage updates stage, resets probability to the new stage default, and drops a system note on the timeline.' },
  { id: 'q14', topic: 'Activities', difficulty: 'med', q: 'What belongs in the "next step" of a logged call?', choices: ['A summary of the whole call', 'The specific, time-bound action agreed with the buyer', 'The deal value', 'The buyer job title'], answer: 1, explain: 'The next step is the concrete, time-bound commitment. Vague next steps are how deals stall.' },
  { id: 'q15', topic: 'Lifecycle', difficulty: 'hard', q: 'A company had a won deal last year and now has a new open deal. What is the most useful current lifecycle label?', choices: ['Lead', 'Customer', 'Churned', 'Unknown'], answer: 1, explain: 'A won deal makes them a Customer. Expansion opportunities do not demote them back to Lead.' },
  { id: 'q16', topic: 'Metrics', difficulty: 'easy', q: 'What is "pipeline value" in Ardovo?', choices: ['Total value of all OPEN deals', 'Closed revenue this month', 'Number of contacts', 'Weighted forecast'], answer: 0, explain: 'Pipeline value is the raw sum of every open deal value, unweighted.' },
];

export function newQuizSession() {
  return { served: [], answers: [], difficulty: 'med', done: false };
}
export function nextQuizQuestion(session) {
  if (session.served.length >= QUIZ_LENGTH) return null;
  const pool = QUIZ.filter(q => !session.served.includes(q.id));
  if (!pool.length) return null;
  let cand = pool.filter(q => q.difficulty === session.difficulty);
  if (!cand.length) cand = pool;
  return cand[session.served.length % cand.length];
}
export function answerQuizQuestion(session, question, choiceIdx) {
  const correct = choiceIdx === question.answer;
  const served = [...session.served, question.id];
  const answers = [...session.answers, { id: question.id, difficulty: question.difficulty, correct, choice: choiceIdx }];
  const difficulty = correct ? harder(question.difficulty) : easier(question.difficulty);
  return { ...session, served, answers, difficulty, done: served.length >= QUIZ_LENGTH };
}
export function gradeKnowledge(session) {
  let earned = 0, possible = 0, run = 0, best = 0, correctCount = 0;
  for (const a of session.answers) {
    const w = DIFF_WEIGHT[a.difficulty] || 1;
    possible += w;
    if (a.correct) { earned += w; run++; best = Math.max(best, run); correctCount++; }
    else run = 0;
  }
  const score = possible ? clamp(Math.round((earned / possible) * 100)) : 0;
  const feedback = [];
  feedback.push(`You answered ${correctCount} of ${session.answers.length} correctly, with a best streak of ${best}.`);
  if (score >= 88) feedback.push('You know Ardovo cold. This is certification-grade product knowledge.');
  else if (score >= 70) feedback.push('Solid grasp of the fundamentals. Review the harder forecasting math to reach mastery.');
  else feedback.push('Shaky on the fundamentals. Revisit pipeline stages, forecast categories, and lifecycle rules.');

  return {
    mode: 'knowledge',
    score,
    grade: gradeLetter(score),
    pass: pass(score),
    breakdown: [
      { label: 'Correct', value: correctCount, max: session.answers.length },
      { label: 'Best streak', value: best, max: session.answers.length },
    ],
    feedback,
    meta: { correctCount, total: session.answers.length, bestStreak: best },
  };
}

/* ============================================================
   BADGES + CERTIFICATION
   ============================================================ */
export const MODE_BADGES = {
  roleplay: { label: 'Objection Slayer', icon: 'messages', tone: 'accent' },
  drill: { label: 'Speed Demon', icon: 'zap', tone: 'warn' },
  knowledge: { label: 'Ardovo Scholar', icon: 'book', tone: 'info' },
};
export const MODE_LABEL = { roleplay: 'Role-Play', drill: 'Speed Drill', knowledge: 'Knowledge Check' };

export function certificationStatus(progress, roleId) {
  const best = (progress.bestScores && progress.bestScores[roleId]) || {};
  const passed = (progress.passed && progress.passed[roleId]) || {};
  // A mode counts as passed only when a real passing ATTEMPT was recorded
  // (result.pass). For the speed drill that means score >= PASS_MARK AND every
  // step complete, so a high-but-incomplete run can never certify. Role-play
  // and knowledge fall back to a score check for progress saved before this
  // flag existed (their pass rule is score-only, so the two agree).
  const r = !!passed.roleplay || pass(best.roleplay || 0);
  const d = !!passed.drill;
  const k = !!passed.knowledge || pass(best.knowledge || 0);
  return {
    roleplay: r, drill: d, knowledge: k,
    certified: r && d && k,
    modes: [
      { mode: 'roleplay', score: best.roleplay || 0, passed: r },
      { mode: 'drill', score: best.drill || 0, passed: d },
      { mode: 'knowledge', score: best.knowledge || 0, passed: k },
    ],
  };
}

/* ============================================================
   PROGRESS STORE  (localStorage + pub/sub, same shape as store.js)
   ============================================================ */
function defaultProgress() {
  return {
    bestScores: {},   // { [roleId]: { roleplay, drill, knowledge } }  (best SCORE)
    passed: {},       // { [roleId]: { roleplay, drill, knowledge } }  (true PASS, drill requires complete)
    badges: [],       // [{ id, kind, mode?, role, label, icon, tone, earnedAt }]
    history: [],      // [{ mode, role, score, grade, pass, at }]
    drillBest: {},    // { [drillId]: { ms, at } }
    streak: { current: 0, best: 0, lastDay: null }, // practice-day streak
    passStreak: 0,    // consecutive passing attempts (any mode)
  };
}
function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) return { ...defaultProgress(), ...JSON.parse(raw) };
  } catch {}
  return defaultProgress();
}

let progress = loadProgress();
const subs = new Set();
function notify() { subs.forEach(fn => fn(progress)); }
function persist() { try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch {} }

export const getProgress = () => progress;

function bumpStreak() {
  const today = new Date().toDateString();
  const s = progress.streak || { current: 0, best: 0, lastDay: null };
  if (s.lastDay === today) return s;
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const current = s.lastDay === yesterday ? (s.current || 0) + 1 : 1;
  return { current, best: Math.max(s.best || 0, current), lastDay: today };
}

// Record a graded attempt. Updates best scores, streaks, history, and awards
// any newly earned mode + certification badges. Returns the awarded badges and
// whether the role just got certified so the UI can celebrate.
export function recordResult(mode, roleId, result) {
  const now = new Date().toISOString();
  const awarded = [];
  // Snapshot certification BEFORE this attempt is applied, so certifiedNow can
  // tell the difference between "was already certified" and "just certified".
  const wasCertified = certificationStatus(progress, roleId).certified;
  progress = { ...progress, bestScores: { ...progress.bestScores } };

  const prevBest = progress.bestScores[roleId] || {};
  const prevMode = prevBest[mode] || 0;
  progress.bestScores[roleId] = { ...prevBest, [mode]: Math.max(prevMode, result.score) };

  // Latch a real PASS per mode. result.pass already encodes the mode's true
  // pass rule (the drill requires all steps complete AND score >= PASS_MARK),
  // so certification reads this instead of re-deriving pass from the score.
  progress.passed = { ...progress.passed };
  const prevPassed = progress.passed[roleId] || {};
  progress.passed[roleId] = { ...prevPassed, [mode]: !!prevPassed[mode] || !!result.pass };

  progress.history = [
    { mode, role: roleId, score: result.score, grade: result.grade, pass: result.pass, at: now },
    ...progress.history,
  ].slice(0, 50);

  // Personal best drill time (only fully-completed, passing runs count).
  if (mode === 'drill' && result.pass && result.meta && result.meta.complete) {
    const prev = progress.drillBest[result.meta.drillId];
    if (!prev || result.meta.elapsedMs < prev.ms) {
      progress.drillBest = { ...progress.drillBest, [result.meta.drillId]: { ms: result.meta.elapsedMs, at: now } };
    }
  }

  progress.streak = bumpStreak();
  progress.passStreak = result.pass ? (progress.passStreak || 0) + 1 : 0;

  // Mode badge (once per mode+role).
  if (result.pass) {
    const badgeId = `${mode}-${roleId}`;
    if (!progress.badges.some(b => b.id === badgeId)) {
      const def = MODE_BADGES[mode];
      const badge = { id: badgeId, kind: 'mode', mode, role: roleId, label: def.label, icon: def.icon, tone: def.tone, earnedAt: now };
      progress.badges = [badge, ...progress.badges];
      awarded.push(badge);
    }
  }

  // Certification badge (once per role, when all three modes pass).
  const status = certificationStatus(progress, roleId);
  let certifiedNow = false;
  if (status.certified) {
    const certId = `cert-${roleId}`;
    if (!progress.badges.some(b => b.id === certId)) {
      const role = roleById(roleId);
      const badge = { id: certId, kind: 'cert', role: roleId, label: `Ardovo Certified ${role.full}`, icon: 'roleShield', tone: 'ok', earnedAt: now };
      progress.badges = [badge, ...progress.badges];
      awarded.push(badge);
      certifiedNow = !wasCertified;
    }
  }

  persist();
  notify();
  return { awarded, certifiedNow, certified: status.certified };
}

export function resetArena() {
  progress = defaultProgress();
  persist();
  notify();
}

/* ---------- hook (same pattern as store.js useStore) ---------- */
export function useArena(selector = (p) => p) {
  const [snap, setSnap] = useState(() => selector(progress));
  useEffect(() => {
    const fn = (p) => setSnap(selector(p));
    subs.add(fn); fn(progress);
    return () => subs.delete(fn);
  }, []);
  return snap;
}

/* ============================================================
   OPTIONAL LLM ENHANCEMENT  (api/arena.js, env-gated)
   Both helpers are best-effort: any failure returns null and the caller
   uses the deterministic engine above. Never throws.
   ============================================================ */
async function postArena(payload) {
  try {
    const r = await fetch('/api/arena', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) return null;
    const j = await r.json();
    if (!j || j.ok === false) return null;
    return j;
  } catch { return null; }
}

// Ask the optional model for a richer buyer reply line. Returns a string or null.
export async function fetchBuyerReply(state, repText) {
  const persona = personaById(state.personaId);
  const j = await postArena({
    action: 'reply',
    persona: { name: persona.name, title: persona.title, company: persona.company, tone: persona.tone, difficulty: persona.difficulty },
    history: state.history.slice(-6),
    repText,
    mood: state.mood,
  });
  return j && typeof j.reply === 'string' ? j.reply : null;
}

// Ask the optional model to enrich role-play feedback. Returns { feedback[] } or null.
export async function fetchRolePlayFeedback(state, deterministic) {
  const persona = personaById(state.personaId);
  const j = await postArena({
    action: 'grade',
    persona: { name: persona.name, title: persona.title, company: persona.company },
    history: state.history,
    metrics: state.metrics,
    baseScore: deterministic.score,
  });
  return j && Array.isArray(j.feedback) && j.feedback.length ? { feedback: j.feedback } : null;
}
