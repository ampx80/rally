// ============================================================
// ARDOVO DEAL FILM  (Cinematic Deal Film - scene graph builder)
// Turns a deal (or the quarter) into a cinematic, auto-playing
// visual story. This module is the "editor": it treats the deal's
// REAL history - audit trail, stage journey, buying committee,
// competitors, activity timeline, win/loss outcome - as raw footage
// and cuts it into a timed scene graph plus an animated
// value/probability curve. Every frame ties back to a real record,
// so the film is accurate, not theater.
//
// Pure + read-only. Reads the live store, the depth store, and the
// deterministic intelligence layer; writes NOTHING. The page
// (src/pages/DealFilm.jsx) renders the scene graph; the optional
// api/deal-film.js re-authors narration with Claude when available,
// falling back to the deterministic template baked in here.
//
// ASCII only. No em-dash / en-dash. Hyphen only.
// ============================================================
import {
  getDeal, getDeals, getCompany, getContact, contactName, userName, getUser,
  getActivitiesForRecord, stageById, STAGES, getContactsForCompany,
} from './store.js';
import { getDealExtras, dealACV } from './store-depth.js';
import { dealScores, forecastConfidence, winLossPatterns } from './intelligence-data.js';
import { quarterRange, buildRollup, teamQuarterlyQuota, inRange } from './forecasting-data.js';

const DAY = 86400000;

/* ---------- compact money (self-contained, matches UI.moneyK) ---------- */
function k(n) {
  if (n == null) return '$0';
  const a = Math.abs(n);
  if (a >= 1e6) return '$' + (n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1) + 'M';
  if (a >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
  return '$' + Math.round(n);
}
function rel(iso) {
  if (!iso) return 'recently';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
  if (d <= 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d} days ago`;
  if (d < 365) return `${Math.round(d / 30)} months ago`;
  return `${Math.round(d / 365)} years ago`;
}
const firstNameOf = (c) => (c ? (c.firstName || contactName(c).split(' ')[0]) : null);

/* ---------- stage journey ---------- */
const RANK = { lead: 1, qualified: 2, discovery: 3, proposal: 4, negotiation: 5 };
const PATH = ['lead', 'qualified', 'discovery', 'proposal', 'negotiation'];
const rankMax = (a, b) => ((RANK[a] || 1) >= (RANK[b] || 1) ? a : b);

// The furthest stage a deal actually reached. Open deals: their current
// stage. Won: they were in negotiation before signing. Lost: inferred from
// the real activity + competitor footprint (grounded, not guessed).
function highWaterStage(deal, acts, extras) {
  if (deal.status === 'open') return deal.stage;
  if (deal.status === 'won') return 'negotiation';
  let best = 'qualified';
  const text = acts.map(a => `${a.subject || ''} ${a.type || ''}`).join(' ').toLowerCase();
  if (/(demo|deep dive|discovery|qbr|kickoff)/.test(text)) best = rankMax(best, 'discovery');
  if (/(proposal|pricing|quote|sow|case study|budget)/.test(text)) best = rankMax(best, 'proposal');
  if (/(negotiat|executive review|redlin|msa|legal|contract|terms|stakeholder)/.test(text)) best = rankMax(best, 'negotiation');
  if ((extras.competitors || []).length) best = rankMax(best, 'proposal');
  return best;
}

// The moment momentum died on a lost deal: the widest gap between logged
// touches (or, failing that, the last touch before it went dark). Returned
// as { gapDays, lastTouch, when } so the autopsy can freeze on it.
function deathMoment(deal, acts) {
  const stamped = acts
    .map(a => new Date(a.createdAt || a.dueAt).getTime())
    .filter(Boolean)
    .sort((a, b) => a - b);
  const close = new Date(deal.closeDate).getTime();
  if (!stamped.length) return { gapDays: 0, lastTouch: null, when: deal.closeDate };
  let maxGap = 0, at = stamped[stamped.length - 1];
  for (let i = 1; i < stamped.length; i++) {
    const g = stamped[i] - stamped[i - 1];
    if (g > maxGap) { maxGap = g; at = stamped[i - 1]; }
  }
  const tailGap = close - stamped[stamped.length - 1];
  if (tailGap > maxGap) { maxGap = tailGap; at = stamped[stamped.length - 1]; }
  return { gapDays: Math.max(0, Math.round(maxGap / DAY)), lastTouch: stamped[stamped.length - 1], when: new Date(at).toISOString() };
}

/* ---------- POV rosters ---------- */
const DEAL_POVS = [
  { id: 'rep', label: 'The rep', icon: 'target' },
  { id: 'champion', label: 'The champion', icon: 'users' },
  { id: 'cfo', label: 'The CFO', icon: 'dollar' },
  { id: 'rival', label: 'The rival', icon: 'shield' },
];
const QUARTER_POVS = [
  { id: 'cro', label: 'The CRO', icon: 'trendUp' },
  { id: 'board', label: 'The board', icon: 'building' },
  { id: 'skeptic', label: 'The skeptic', icon: 'eye' },
];

// A narration bundle always carries every POV; the page picks one. Missing
// POVs fall back to rep so a re-cut never renders blank.
function nar(rep, champion, cfo, rival) {
  return { rep, champion: champion || rep, cfo: cfo || rep, rival: rival || rep };
}

/* ============================================================
   DEAL FILM
   ============================================================ */
export function buildDealFilm(dealId) {
  const deal = getDeal(dealId);
  if (!deal) return null;

  const company = getCompany(deal.companyId);
  const owner = getUser(deal.ownerId);
  const ownerName = userName(deal.ownerId);
  const extras = getDealExtras(deal.id);
  const acts = getActivitiesForRecord('deal', deal.id) || [];
  const acv = dealACV(deal.id) || 0;

  const coName = company?.name || deal.name;
  const industry = company?.industry || 'their market';
  const location = company?.location || '';
  const value = deal.value || 0;

  const stakeholders = extras.stakeholders || [];
  const champStake = stakeholders.find(s => s.role === 'Champion') || stakeholders[0];
  const champContact = champStake ? getContact(champStake.contactId) : (deal.contactIds || []).map(getContact).filter(Boolean)[0];
  const champName = champContact ? contactName(champContact) : null;
  const champFirst = firstNameOf(champContact) || 'the champion';
  const ebStake = stakeholders.find(s => s.role === 'Economic Buyer');
  const ebContact = ebStake ? getContact(ebStake.contactId) : null;
  const ebName = ebContact ? contactName(ebContact) : null;
  const competitors = extras.competitors || [];
  const rivalName = competitors[0] || 'the incumbent';
  const singleThread = stakeholders.length <= 1;

  const highWater = highWaterStage(deal, acts, extras);
  const path = PATH.filter(s => (RANK[s] || 1) <= (RANK[highWater] || 2));

  // --- curve: probability journey, one node per reached stage + terminal ---
  const curve = path.map(s => {
    const st = stageById(s);
    return { stage: s, stageName: st?.name || s, prob: st?.probability ?? 0, expected: Math.round(value * ((st?.probability ?? 0) / 100)), tone: 'accent' };
  });
  const outcome = deal.status === 'won' ? 'won' : deal.status === 'lost' ? 'lost' : 'open';
  if (outcome === 'won') curve.push({ stage: 'won', stageName: 'Closed Won', prob: 100, expected: value, tone: 'ok' });
  if (outcome === 'lost') curve.push({ stage: 'lost', stageName: 'Closed Lost', prob: 0, expected: 0, tone: 'risk' });
  const idxOf = (stage) => Math.max(0, curve.findIndex(c => c.stage === stage));

  const ageDays = Math.max(1, Math.round((Date.now() - new Date(deal.createdAt).getTime()) / DAY));
  const daysToClose = Math.round((new Date(deal.closeDate).getTime() - Date.now()) / DAY);

  // Live risk read (open deals only) straight off the intelligence layer.
  let risk = null;
  if (outcome === 'open') {
    try { risk = (dealScores() || []).find(s => s.deal.id === deal.id) || null; } catch { risk = null; }
  }

  const scenes = [];
  const push = (s) => scenes.push({ id: `sc-${scenes.length}`, act: scenes.length + 1, ...s });

  /* ---- 1. COLD OPEN ---- */
  push({
    kind: 'cold_open', tone: 'accent', icon: 'sparkles', curveIndex: null,
    eyebrow: [industry, company?.size ? company.size + ' employees' : null].filter(Boolean).join('  .  '),
    title: deal.name,
    headline: coName,
    stat: { value: k(value), label: 'on the table' },
    duration: 5200,
    narration: nar(
      `This is the story of ${deal.name}. A ${k(value)} opportunity with ${coName}${location ? ', out of ' + location : ''}. Roll the tape.`,
      `We had a real problem to solve at ${coName}. ${ownerName} and their team said they could help. This is how it went.`,
      `${k(value)} is not a small number. Before a dollar moved, this deal had to earn its place. Here is the case.`,
      `${coName} was our account to lose. Then ${ownerName} showed up with a ${k(value)} pitch. Watch.`,
    ),
  });

  /* ---- 2. ORIGIN ---- */
  push({
    kind: 'origin', tone: 'neutral', icon: 'rocket', curveIndex: idxOf('lead'),
    eyebrow: 'Day zero',
    title: 'It opened ' + rel(deal.createdAt),
    headline: `${ownerName}'s deal from the first call`,
    stat: { value: String(ageDays), label: 'days in play' },
    duration: 4600,
    narration: nar(
      `The clock started ${rel(deal.createdAt)}. ${ownerName} opened ${coName} at ${k(0)} of committed value and one job: turn interest into a signature.`,
      `${ownerName} reached out ${rel(deal.createdAt)}. I took the call because the problem was real, not because the timing was convenient.`,
      `${rel(deal.createdAt)} this landed on my radar as a line item with no business case attached yet. That is where every one of these starts.`,
      `${rel(deal.createdAt)}, ${ownerName} got a foot in the door at ${coName}. We should have moved faster.`,
    ),
  });

  /* ---- 3. THE COMMITTEE ---- */
  if (stakeholders.length) {
    const named = stakeholders.slice(0, 3).map(s => {
      const c = getContact(s.contactId);
      return c ? `${firstNameOf(c)} (${s.role})` : null;
    }).filter(Boolean);
    push({
      kind: 'committee', tone: singleThread ? 'warn' : 'accent', icon: 'users', curveIndex: idxOf('qualified'),
      eyebrow: 'The room',
      title: singleThread ? 'A single thread' : 'The committee assembles',
      headline: named.join('   .   '),
      chips: named,
      stat: { value: String(stakeholders.length), label: singleThread ? 'lone contact' : 'in the room' },
      duration: 5000,
      narration: nar(
        singleThread
          ? `Everything rode on ${champName || champFirst}. One champion, no backup. A lone thread is the single most common way a ${k(value)} deal dies quietly.`
          : `The room filled in. ${champName || champFirst} carried the flag${ebName ? `, with ${ebName} holding the budget` : ''}. Multi-threaded deals are the ones that actually close.`,
        `I put my name on this inside ${coName}. ${ebName ? `Getting ${ebName} in the room meant I was not selling it alone.` : 'I had to sell it internally before anyone external ever saw a contract.'}`,
        `My job was to ask whether ${champFirst}'s enthusiasm survived contact with a budget. ${ebName ? 'I was in the room precisely so it did not become a rubber stamp.' : 'No one had pressure-tested the number yet.'}`,
        singleThread
          ? `They were single-threaded. One relationship. That is the crack we knew how to widen.`
          : `They had built real internal consensus. That is what made ${coName} hard to pull back toward us.`,
      ),
    });
  }

  /* ---- 4. STAGE ADVANCES ---- */
  const advanceCopy = {
    discovery: {
      title: 'Discovery. They let us in.',
      rep: `${coName} opened the hood. Real requirements, real users, real stakes. The probability ticked to ${stageById('discovery').probability}%.`,
      champion: `I gave them access to the messy reality, not the sanitized version. That is when I knew if they actually understood us.`,
      cfo: `Discovery is where I find out if the "solution" fits the workflow or just the demo. This one held up under questions.`,
      rival: `They ran a real discovery. We had assumed our relationship would keep them out. It did not.`,
    },
    proposal: {
      title: 'The proposal lands.',
      rep: `The numbers went on paper. ${acv ? k(acv) + ' in line items' : k(value)}, scoped to what discovery uncovered. Probability climbed to ${stageById('proposal').probability}%.`,
      champion: `The proposal matched what I had been describing internally. I could forward it without editing it first. That mattered.`,
      cfo: `A proposal is a claim about ROI. ${acv ? k(acv) : k(value)} needed a payback story, and this one arrived with one attached.`,
      rival: `Their proposal hit before ours was polished. Being second on paper is a bad place to be.`,
    },
    negotiation: {
      title: 'Down to terms.',
      rep: `Negotiation. ${competitors.length ? 'Fighting ' + competitors.join(' and ') + ' on value, not price.' : 'The last details between here and signed.'} Probability at ${stageById('negotiation').probability}%.`,
      champion: `By now I was co-selling. I wanted this done. ${ebName ? ebName + ' just needed the terms to be clean.' : 'The finish line was in sight.'}`,
      cfo: `Terms are where the real price shows up. I pushed. ${competitors.length ? 'Having ' + rivalName + ' in the mix was my leverage.' : 'A clean deal is one I can defend later.'}`,
      rival: `It came down to terms and we were still at the table. One misstep from them and the account swung back to us.`,
    },
  };
  for (const s of path) {
    if (s === 'lead' || s === 'qualified') continue;
    const c = advanceCopy[s];
    if (!c) continue;
    push({
      kind: 'advance', tone: 'accent', icon: 'trendUp', curveIndex: idxOf(s),
      eyebrow: stageById(s).name,
      title: c.title,
      headline: `${stageById(s).probability}% win probability`,
      stat: { value: stageById(s).probability + '%', label: 'to win' },
      duration: 4800,
      narration: nar(c.rep, c.champion, c.cfo, c.rival),
    });
  }

  /* ---- 5. THE TURN / DEATH MOMENT / THE SAVE ---- */
  if (outcome === 'lost') {
    const dm = deathMoment(deal, acts);
    push({
      kind: 'death', tone: 'risk', icon: 'clock', curveIndex: idxOf('negotiation') || Math.max(0, curve.length - 2), freeze: true,
      eyebrow: 'The moment it turned',
      title: dm.gapDays > 0 ? `The room went quiet for ${dm.gapDays} days` : 'The signal went dark',
      headline: 'Momentum does not announce its own death',
      stat: { value: dm.gapDays > 0 ? dm.gapDays + 'd' : 'silence', label: 'without a touch' },
      duration: 5600,
      narration: nar(
        `Here. ${dm.gapDays > 0 ? `A ${dm.gapDays} day silence` : 'A stretch of nothing'} where the follow-up should have been. ${singleThread ? 'The lone champion went quiet and there was no second thread to catch it.' : 'The thread cooled and no one reheated it in time.'}`,
        `I stopped hearing from them right about here. Internally, I could not carry it alone forever, and the gap gave my detractors room.`,
        `This is the gap I would have flagged. ${dm.gapDays > 0 ? dm.gapDays + ' days' : 'A long pause'} of no contact on a ${k(value)} decision reads, to a buyer, as "not a priority."`,
        `This pause was our opening. While they went quiet, we were in the room every week. That is how ${rivalName} takes a deal back.`,
      ),
    });
  } else if (outcome === 'won') {
    push({
      kind: 'save', tone: 'ok', icon: 'zap', curveIndex: idxOf('negotiation'),
      eyebrow: 'The turn',
      title: 'The blocker clears',
      headline: `${ebName || champName || champFirst} says yes`,
      stat: { value: '85%', label: 'and climbing' },
      duration: 4800,
      narration: nar(
        `The last objection fell. ${competitors.length ? competitors.join(' and ') + ' could not match the time to value.' : 'The business case held.'} From here it was a formality.`,
        `I got the internal yes. Once ${ebName || 'the budget holder'} was aligned, I stopped defending and started scheduling the rollout.`,
        `The payback math finally closed. ${competitors.length ? 'Cheaper on paper was not cheaper in practice.' : 'The number justified itself.'} I signed off.`,
        `This is where we lost it. One clean answer from them on value and our incumbency stopped mattering.`,
      ),
    });
  } else {
    // open: where it stands, straight off the risk model
    const tier = risk?.tier || 'medium';
    const reason = risk?.reasons?.[0] || (singleThread ? 'A single thread on a live deal is the top slip risk.' : 'Keep the next step dated and the champion warm.');
    push({
      kind: 'standing', tone: tier === 'high' ? 'risk' : tier === 'low' ? 'ok' : 'warn', icon: 'sparkles', curveIndex: Math.max(0, curve.length - 1),
      eyebrow: 'Where it stands',
      title: tier === 'high' ? 'This one needs a save' : tier === 'low' ? 'In control' : 'The balance point',
      headline: `${deal.probability}% . ${daysToClose >= 0 ? daysToClose + ' days to close' : Math.abs(daysToClose) + ' days past due'}`,
      stat: { value: (risk?.score ?? deal.probability) + '', label: tier === 'low' ? 'health, low risk' : 'risk score' },
      duration: 5200,
      narration: nar(
        `Today the tape stops here. ${reason} ${daysToClose >= 0 ? `${daysToClose} days to the close date` : `${Math.abs(daysToClose)} days past the date and still open`}, sitting at ${deal.probability}%.`,
        `This is where I am waiting. ${daysToClose >= 0 ? 'I want it done before the date slips.' : 'It has already slipped once. I need a reason to keep pushing internally.'}`,
        `From my chair, ${deal.probability}% with ${daysToClose >= 0 ? daysToClose + ' days left' : 'the date already blown'} is a claim that needs evidence. Give me the next milestone with a date on it.`,
        `It is not signed. As long as it is open, ${rivalName} still has a shot, and we intend to take it.`,
      ),
    });
  }

  /* ---- 6. VERDICT ---- */
  if (outcome === 'won') {
    push({
      kind: 'verdict_won', tone: 'ok', icon: 'check', curveIndex: idxOf('won'), celebrate: true,
      eyebrow: 'The verdict',
      title: 'Closed. Won.',
      headline: extras.winReason ? `Won on: ${extras.winReason}` : `${coName} signs`,
      stat: { value: k(value), label: 'won' },
      duration: 5600,
      narration: nar(
        `Signed. ${k(value)} closed, ${extras.winReason ? 'won on ' + extras.winReason.toLowerCase() : 'won on fit'}. ${ageDays} days from first call to signature. Cut, print, next.`,
        `We signed. I bet my credibility on ${ownerName}'s team and it paid off. Now I own the rollout, so make me look right.`,
        `Approved. ${extras.winReason ? extras.winReason + ' carried it.' : 'The case carried it.'} The number was defensible, so I defended it.`,
        `We lost this one. ${extras.winReason ? extras.winReason + ' was the difference' : 'They out-executed us'}. Time to go win the next account.`,
      ),
    });
  } else if (outcome === 'lost') {
    push({
      kind: 'verdict_lost', tone: 'risk', icon: 'shield', curveIndex: idxOf('lost'),
      eyebrow: 'The verdict',
      title: 'Closed. Lost.',
      headline: extras.lossReason ? extras.lossReason : 'It walked',
      stat: { value: k(value), label: 'walked away' },
      duration: 5200,
      narration: nar(
        `${k(value)} walked. ${extras.lossReason ? 'Logged as: ' + extras.lossReason + '.' : 'No single reason logged.'} The honest read is that the momentum died before the deal did.`,
        `It did not happen. ${extras.lossReason ? extras.lossReason + '.' : ''} I still think we were right, but right does not sign contracts.`,
        `We passed. ${extras.lossReason ? extras.lossReason + '.' : 'The case never fully closed.'} A no is cheaper than a wrong yes.`,
        `We took it. ${extras.lossReason && /incumbent|salesforce|hubspot/i.test(extras.lossReason) ? 'Incumbency and trust won.' : 'We stayed close while they drifted.'} That is how you defend an account.`,
      ),
    });
    // autopsy lessons
    const dm = deathMoment(deal, acts);
    const lessons = [];
    if (singleThread) lessons.push('Multi-thread earlier. One champion is one resignation away from a dead deal.');
    if (dm.gapDays >= 10) lessons.push(`Never let a live deal go dark for ${dm.gapDays} days. Silence is a decision being made without you.`);
    if (competitors.length) lessons.push(`${competitors.join(' and ')} was in the room. Name the competitor early and sell against them on value.`);
    if (lessons.length < 3) lessons.push('Get a dated mutual close plan the buyer agrees to. A date you both own is the best forcing function there is.');
    push({
      kind: 'lessons', tone: 'warn', icon: 'sparkles', curveIndex: idxOf('lost'),
      eyebrow: 'The autopsy',
      title: 'Three lessons it leaves behind',
      headline: 'What the next deal inherits',
      lessons: lessons.slice(0, 3),
      duration: 6400,
      narration: nar(
        `Every lost deal is tuition. This one paid for three lessons: ${lessons.slice(0, 3).map((l, i) => `${i + 1}. ${l}`).join(' ')}`,
        `If I were on your side again: thread more people, do not disappear, and put the date in writing.`,
        `The transferable read: silence and single-threading cost you this one, not price.`,
        `Enjoy it. The lessons they just learned are the ones that beat us next time.`,
      ),
    });
  } else {
    // open: to be continued
    const closeDone = (extras.closePlan || []).filter(s => s.done).length;
    const closeTotal = (extras.closePlan || []).length;
    push({
      kind: 'verdict_open', tone: 'accent', icon: 'zap', curveIndex: Math.max(0, curve.length - 1),
      eyebrow: 'To be continued',
      title: 'The next scene is yours',
      headline: extras.nextStep ? `Next: ${extras.nextStep}` : 'Keep the momentum',
      stat: { value: closeTotal ? `${closeDone}/${closeTotal}` : k(value), label: closeTotal ? 'close plan done' : 'still live' },
      duration: 5600,
      narration: nar(
        `The tape runs out here because this deal is not finished. ${extras.nextStep ? 'The next move: ' + extras.nextStep.toLowerCase() + '.' : 'The next move is yours.'} ${closeTotal ? `${closeDone} of ${closeTotal} close-plan steps are done.` : ''} Write the ending.`,
        `We are not done. ${extras.nextStep ? extras.nextStep + ' is the next thing on me.' : 'Tell me the next step and I will move it internally.'}`,
        `Still open means still unproven. ${extras.nextStep ? 'The next milestone is ' + extras.nextStep.toLowerCase() + '.' : 'Show me the next milestone with a date.'} Then I will believe the forecast.`,
        `Still open means still winnable. As long as there is no signature, this account is contested.`,
      ),
    });
  }

  return {
    id: `film-${deal.id}`,
    kind: 'deal',
    dealId: deal.id,
    title: deal.name,
    subtitle: coName,
    outcome,
    accentTone: outcome === 'won' ? 'ok' : outcome === 'lost' ? 'risk' : 'accent',
    povs: DEAL_POVS,
    defaultPov: 'rep',
    curve,
    scenes,
    poster: {
      headline: deal.name,
      entity: coName,
      value: k(value),
      outcome,
      tagline: outcome === 'won' ? 'Closed Won' : outcome === 'lost' ? 'Closed Lost' : `${deal.probability}% . ${stageById(deal.stage)?.name || 'Open'}`,
      curve,
      meta: [industry, location].filter(Boolean).join('  .  '),
    },
    facts: { value, ageDays, daysToClose, stakeholders: stakeholders.length, competitors, ownerName, coName, riskScore: risk?.score ?? null },
  };
}

/* ============================================================
   QUARTER FILM
   The whole book as a single arc: the number, the risk, the moves,
   the read. Built entirely off the deterministic intelligence layer.
   ============================================================ */
export function buildQuarterFilm() {
  const range = quarterRange('this');
  const roll = buildRollup(range);
  const quota = teamQuarterlyQuota();
  const conf = forecastConfidence();
  const wl = winLossPatterns();
  const scores = (() => { try { return dealScores() || []; } catch { return []; } })();
  const high = scores.filter(s => s.tier === 'high');
  const atRisk = high.reduce((s, x) => s + x.deal.value, 0);
  const topRisk = high[0];
  const topDeal = getDeals().filter(d => d.status === 'open').sort((a, b) => b.value - a.value)[0];
  const gapToQuota = Math.max(0, quota - roll.committed);
  const attain = quota ? Math.round((roll.committed / quota) * 100) : 0;

  // curve: worst / commit / best band mapped to a rising confidence-shaped line
  const curve = [
    { stage: 'worst', stageName: 'Worst case', prob: Math.round((conf.scenarios.worst / Math.max(1, conf.scenarios.best)) * 100), expected: conf.scenarios.worst, tone: 'risk' },
    { stage: 'commit', stageName: 'Commit', prob: Math.round((conf.scenarios.commit / Math.max(1, conf.scenarios.best)) * 100), expected: conf.scenarios.commit, tone: 'warn' },
    { stage: 'best', stageName: 'Best case', prob: 100, expected: conf.scenarios.best, tone: 'ok' },
  ];

  const scenes = [];
  const push = (s) => scenes.push({ id: `qc-${scenes.length}`, act: scenes.length + 1, ...s });

  push({
    kind: 'cold_open', tone: 'accent', icon: 'sparkles', curveIndex: null,
    eyebrow: range.label,
    title: 'The Quarter',
    headline: 'One book of business, one story',
    stat: { value: k(roll.pipeline), label: 'open pipeline' },
    duration: 5200,
    narration: nar(
      `${range.label}. ${k(roll.pipeline)} of open pipeline, ${k(quota)} to hit, and one question that matters: does this land? Roll the tape.`,
      `This is the number the board sees ${range.label}. Let me walk you through how much of it is real.`,
      `${k(roll.pipeline)} in pipeline sounds like a lot until you ask how much of it actually closes. That is the whole story.`,
    ),
  });
  push({
    kind: 'origin', tone: attain >= 90 ? 'ok' : attain >= 60 ? 'warn' : 'risk', icon: 'target', curveIndex: 1,
    eyebrow: 'The commit',
    title: `${attain}% of quota committed`,
    headline: `${k(roll.committed)} committed . ${k(gapToQuota)} gap`,
    stat: { value: k(roll.closedWon), label: 'already closed won' },
    duration: 5000,
    narration: nar(
      `${k(roll.closedWon)} is already in the bank, and commit brings it to ${k(roll.committed)}. That leaves a ${k(gapToQuota)} gap to quota with pipeline to cover it.`,
      `We have booked ${k(roll.closedWon)}. The board will ask about the ${k(gapToQuota)} gap. It is coverable, and here is how.`,
      `Committed is not closed. ${k(roll.committed)} of ${k(quota)} is a claim. I want to see the ${k(gapToQuota)} gap backed by named deals, not hope.`,
    ),
  });
  push({
    kind: 'death', tone: 'risk', icon: 'clock', curveIndex: 0, freeze: true,
    eyebrow: 'The risk',
    title: `${k(atRisk)} sits in high-risk deals`,
    headline: topRisk ? `Starting with ${topRisk.company?.name || topRisk.deal.name}` : 'Concentrated exposure',
    stat: { value: String(high.length), label: 'deals at high risk' },
    duration: 5400,
    narration: nar(
      `Here is the fragile part. ${k(atRisk)} across ${high.length} deals reads high-risk. ${topRisk ? `${topRisk.company?.name || topRisk.deal.name} alone is ${k(topRisk.deal.value)}, and ${topRisk.reasons?.[0]?.toLowerCase() || 'it is drifting'}` : 'The exposure is real'}.`,
      `I will be honest about the soft spots. ${high.length} of our deals are wobbling, ${k(atRisk)} worth. We are working them.`,
      `This is the slide I care about. ${k(atRisk)} at high risk means the forecast has ${high.length} single points of failure. Which of these actually closes?`,
    ),
  });
  push({
    kind: 'standing', tone: conf.tone === 'ok' ? 'ok' : conf.tone === 'risk' ? 'risk' : 'warn', icon: 'sparkles', curveIndex: 2,
    eyebrow: 'The read',
    title: `${conf.confidence}% confidence . ${conf.label}`,
    headline: wl.winRate ? `${wl.winRate}% win rate . ${wl.avgCycle}d average cycle` : 'The honest read',
    stat: { value: conf.confidence + '%', label: 'forecast confidence' },
    duration: 5200,
    narration: nar(
      `The honest read: ${conf.read}`,
      `Bottom line for the board: ${conf.confidence}% confidence, ${conf.label.toLowerCase()}. ${conf.read}`,
      `${conf.confidence}% confidence is a number I can pressure-test. ${conf.read} Convince me on the top three and I will believe it.`,
    ),
  });
  push({
    kind: 'verdict_open', tone: 'accent', icon: 'zap', curveIndex: 2,
    eyebrow: 'To be continued',
    title: topDeal ? `It turns on ${topDeal.name.split(' - ')[0]}` : 'The next moves decide it',
    headline: topDeal ? `${k(topDeal.value)} in the balance` : 'Work the top of the risk list first',
    stat: { value: k(conf.scenarios.best - conf.scenarios.commit), label: 'upside to chase' },
    duration: 5600,
    narration: nar(
      `The ending is unwritten. ${topDeal ? `${topDeal.name.split(' - ')[0]} at ${k(topDeal.value)} swings the quarter` : 'The top of the risk list swings the quarter'}. ${k(conf.scenarios.best - conf.scenarios.commit)} of upside is still there to chase. Go write it.`,
      `Our job for the rest of ${range.label}: protect the commit, chase the ${k(conf.scenarios.best - conf.scenarios.commit)} of upside, and de-risk the top deals. That is the plan.`,
      `So the quarter is not decided. Good. Show me the top deals move and this becomes a forecast I trust instead of one I hope for.`,
    ),
  });

  return {
    id: 'film-quarter',
    kind: 'quarter',
    dealId: null,
    title: 'The Quarter',
    subtitle: range.label,
    outcome: 'quarter',
    accentTone: 'accent',
    povs: QUARTER_POVS,
    defaultPov: 'cro',
    curve,
    scenes,
    poster: {
      headline: 'The Quarter',
      entity: range.label,
      value: k(roll.pipeline),
      outcome: 'quarter',
      tagline: `${conf.confidence}% confidence . ${conf.label}`,
      curve,
      meta: `${k(roll.committed)} committed  .  ${k(quota)} quota`,
    },
    facts: { pipeline: roll.pipeline, quota, committed: roll.committed, confidence: conf.confidence, atRisk },
  };
}

/* ============================================================
   FILMABLE DEALS  (for the picker)
   A curated, sorted shortlist: the flagship first, then the most
   cinematic deals (won + lost for arcs, then biggest open). Every
   entry is real; nothing is invented.
   ============================================================ */
export function listFilmableDeals(limit = 40) {
  const deals = getDeals();
  const score = (d) => {
    let s = d.value / 1000;
    if (d.id === 'd_flagship') s += 100000;
    if (d.status === 'won') s += 4000;
    if (d.status === 'lost') s += 3000;         // lost deals get the autopsy, very watchable
    if (d.status === 'open') s += 2000;
    return s;
  };
  return deals
    .slice()
    .sort((a, b) => score(b) - score(a))
    .slice(0, limit)
    .map(d => ({
      id: d.id,
      name: d.name,
      company: getCompany(d.companyId)?.name || '',
      value: d.value,
      valueLabel: k(d.value),
      stage: stageById(d.stage)?.name || d.stage,
      status: d.status,
    }));
}

/* ============================================================
   POV RE-CUT
   Same facts, new framing. Returns the narration string per scene
   for the chosen POV (falls back to rep / first POV).
   ============================================================ */
export function recutNarration(film, povId) {
  if (!film) return [];
  return film.scenes.map(s => {
    const n = s.narration || {};
    return n[povId] || n.rep || n[film.defaultPov] || Object.values(n)[0] || '';
  });
}

/* Total run time (ms) of a film, for the scrubber + poster. */
export function filmDuration(film) {
  return (film?.scenes || []).reduce((s, sc) => s + (sc.duration || 4800), 0);
}
