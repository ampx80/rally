// ============================================================
// RALLY REVENUE INTELLIGENCE DATA
// The derivation layer behind the Intelligence surface. Every
// function is pure over the live store, so the analytics stay in
// lockstep with the book of business as deals move. Nothing here
// is random: any "AI confidence" number is a deterministic blend
// of real signals (risk share, activity coverage, coverage ratio)
// so the same book always reads the same score. This is the layer
// Rook narrates from.
// SUPABASE: these become materialized views / RPCs over rally_*.
// ============================================================
import {
  getDeals, getCompanies, getContacts, getUsers, getActivities,
  stageById, userName, getCompany,
} from './store.js';
import {
  quarterRange, inRange, buildRollup, teamQuarterlyQuota, repQuarterlyQuotas,
} from './forecasting-data.js';

const DAY = 86400000;

/* compact money, self-contained so this stays a pure data module */
function k(n) {
  if (n == null) return '$0';
  const a = Math.abs(n);
  if (a >= 1e6) return '$' + (n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1) + 'M';
  if (a >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
  return '$' + Math.round(n);
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

/* ============================================================
   SHARED: enriched open-deal signals
   The single computation every risk / anomaly / move reads from.
   ============================================================ */
function activityIndex() {
  const map = new Map();
  for (const a of getActivities()) {
    if (a.relatedType !== 'deal' || !a.relatedId) continue;
    const arr = map.get(a.relatedId) || [];
    arr.push(a);
    map.set(a.relatedId, arr);
  }
  return map;
}

// Risk model. Returns a 0..96 score, a tier, ranked human reasons, and the
// raw factors so a card can show the receipts. Higher = more likely to slip.
function scoreDeal(d, ctx) {
  const now = ctx.now;
  const st = stageById(d.stage);
  const order = st?.order || 1;
  const daysToClose = Math.round((new Date(d.closeDate).getTime() - now) / DAY);
  const age = Math.max(0, Math.round((now - new Date(d.createdAt).getTime()) / DAY));
  const contacts = (d.contactIds || []).length;
  const acts = ctx.actsByDeal.get(d.id) || [];
  let lastTouch = null;
  for (const a of acts) {
    const t = new Date(a.createdAt || a.dueAt).getTime();
    if (lastTouch == null || t > lastTouch) lastTouch = t;
  }
  const touchDays = lastTouch == null ? age : Math.max(0, Math.round((now - lastTouch) / DAY));
  const prob = d.probability ?? st?.probability ?? 0;

  const hits = [];
  const early = order <= 3;

  if (daysToClose < 0) {
    hits.push({ w: clamp(18 + -daysToClose * 0.6, 18, 34), tag: 'overdue', text: `Close date passed ${-daysToClose}d ago and the deal is still open.` });
  } else if (daysToClose <= 14 && early) {
    hits.push({ w: 22, tag: 'timeline', text: `Closing in ${daysToClose}d but still in ${st?.name}; the timeline is ahead of the stage.` });
  }
  if (age > 75 && early) {
    hits.push({ w: clamp(12 + (age - 75) * 0.08, 12, 20), tag: 'stalled', text: `Open ${age}d and stuck in ${st?.name}; deals this old rarely recover.` });
  }
  if (touchDays > 14) {
    hits.push({ w: clamp(6 + (touchDays - 14) * 1.1, 6, 22), tag: 'silence', text: `No activity logged in ${touchDays}d; momentum has gone cold.` });
  }
  if (contacts <= 1) {
    hits.push({ w: d.value >= 150000 ? 16 : 11, tag: 'single', text: `Only ${contacts || 'no'} contact${contacts === 1 ? '' : 's'} engaged on a ${k(d.value)} deal; a lone champion is a single point of failure.` });
  }
  if (prob < 40 && daysToClose >= 0 && daysToClose <= 30) {
    hits.push({ w: 12, tag: 'math', text: `Win probability is ${prob}% with ${daysToClose}d to close; the math does not back the date.` });
  }

  hits.sort((a, b) => b.w - a.w);
  const score = Math.round(clamp(hits.reduce((s, h) => s + h.w, 0), hits.length ? 6 : 3, 96));
  const tier = score >= 60 ? 'high' : score >= 34 ? 'medium' : 'low';

  const positives = [];
  if (contacts >= 3) positives.push(`Multi-threaded across ${contacts} contacts.`);
  if (touchDays <= 7) positives.push(`Active in the last ${touchDays}d.`);
  if (prob >= 85) positives.push(`Called for the quarter at ${prob}%.`);

  return {
    deal: d,
    company: getCompany(d.companyId) || null,
    owner: userName(d.ownerId),
    score, tier,
    reasons: hits.map(h => h.text),
    positives,
    factors: { daysToClose, age, contacts, touchDays, prob, stage: st?.name || d.stage },
  };
}

// Every open deal, scored and sorted riskiest first. Memo-friendly.
export function dealScores() {
  const now = Date.now();
  const ctx = { now, actsByDeal: activityIndex() };
  return getDeals()
    .filter(d => d.status === 'open')
    .map(d => scoreDeal(d, ctx))
    .sort((a, b) => b.score - a.score || b.deal.value - a.deal.value);
}

/* ============================================================
   FORECAST CONFIDENCE + SCENARIOS
   A committed / best / worst band plus a single confidence gauge
   that blends coverage, activity discipline, and risk drag. Aligns
   with the Forecasting page (same quarter + roll-up engine).
   ============================================================ */
export function forecastConfidence() {
  const now = Date.now();
  const range = quarterRange('this');
  const roll = buildRollup(range);
  const quota = teamQuarterlyQuota();

  // Risk share of the open pipeline that is supposed to land this quarter.
  const ctx = { now, actsByDeal: activityIndex() };
  const qDeals = getDeals().filter(d => d.status === 'open' && inRange(d.closeDate, range));
  const qValue = qDeals.reduce((s, d) => s + d.value, 0);
  let atRiskValue = 0, touchedValue = 0, highCount = 0;
  for (const d of qDeals) {
    const s = scoreDeal(d, ctx);
    if (s.tier === 'high') { atRiskValue += d.value; highCount++; }
    if (s.factors.touchDays <= 14) touchedValue += d.value;
  }

  // Scenario band. Worst haircuts the commit band by realized risk.
  const riskDrag = qValue ? atRiskValue / qValue : 0;
  const commit = roll.committed;
  const best = roll.bestCase;
  const worst = Math.round(roll.closedWon + roll.cat.commit * (1 - 0.35 * riskDrag));

  const gap = Math.max(0, quota - commit);
  const coverage = clamp(roll.pipeline / Math.max(1, gap * 3), 0, 1); // 3x cover = healthy
  const activityCoverage = qValue ? touchedValue / qValue : 1;
  const attainment = quota ? clamp(commit / quota, 0, 1.2) : 1;
  const attainBand = clamp(attainment / 1, 0, 1);

  const confidence = Math.round(clamp(
    100 * (0.32 * coverage + 0.30 * activityCoverage + 0.26 * (1 - riskDrag) + 0.12 * attainBand),
    4, 99,
  ));

  const label = confidence >= 78 ? 'Strong' : confidence >= 60 ? 'Solid' : confidence >= 42 ? 'Watch' : 'At risk';
  const tone = confidence >= 78 ? 'ok' : confidence >= 60 ? 'accent' : confidence >= 42 ? 'warn' : 'risk';

  // Rook-voiced read of the number.
  const read = confidence >= 78
    ? `The quarter is well covered. ${pct(roll.committed, quota)}% of quota is already committed and pipeline covers the gap ${(roll.pipeline / Math.max(1, gap)).toFixed(1)}x. Keep the ${highCount} at-risk deals honest and this lands.`
    : confidence >= 60
      ? `On track but not clean. ${k(atRiskValue)} of this quarter's pipeline sits in high-risk deals. Clear those and confidence climbs.`
      : confidence >= 42
        ? `This needs work. Coverage is thin and ${pct(atRiskValue, qValue)}% of the quarter is at risk. Multi-thread and re-engage before the board call.`
        : `The number is fragile. Commit barely covers ${pct(commit, quota)}% of quota and risk drag is heavy. Rescue the top deals now.`;

  // Deterministic 8-point confidence trend that resolves to today's value.
  const trend = [];
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const wobble = Math.sin(i * 1.3 + confidence) * 4;
    trend.push(Math.round(clamp(confidence * (0.72 + 0.28 * t) + wobble, 4, 99)));
  }
  trend[7] = confidence;

  return {
    confidence, label, tone, read, trend,
    scenarios: { worst, commit, best },
    quota, gap, closedWon: roll.closedWon,
    drivers: [
      { key: 'Pipeline coverage', value: Math.round(coverage * 100), hint: `${(roll.pipeline / Math.max(1, gap)).toFixed(1)}x the gap to quota` },
      { key: 'Activity coverage', value: Math.round(activityCoverage * 100), hint: `${pct(touchedValue, qValue)}% of value touched in 14d` },
      { key: 'Risk drag', value: Math.round((1 - riskDrag) * 100), hint: `${k(atRiskValue)} in high-risk deals`, invert: true },
      { key: 'Quota attainment', value: Math.round(attainBand * 100), hint: `${pct(commit, quota)}% committed of ${k(quota)}` },
    ],
    highCount, atRiskValue, qValue, quarterLabel: range.label,
  };
}

/* ============================================================
   PIPELINE ANOMALIES
   The feed a CRO scans first: what changed, what is off, what is
   concentrated. Severity ranks the feed.
   ============================================================ */
export function pipelineAnomalies() {
  const now = Date.now();
  const ctx = { now, actsByDeal: activityIndex() };
  const open = getDeals().filter(d => d.status === 'open');
  const openValue = open.reduce((s, d) => s + d.value, 0) || 1;
  const out = [];

  // 1. Slippage: overdue open value.
  const overdue = open.filter(d => new Date(d.closeDate).getTime() < now);
  if (overdue.length) {
    const val = overdue.reduce((s, d) => s + d.value, 0);
    out.push({ id: 'slip', severity: val > openValue * 0.12 ? 'high' : 'medium', icon: 'clock',
      title: `${k(val)} slipped past close date`, detail: `${overdue.length} open deal${overdue.length === 1 ? '' : 's'} are past their committed close date and still open. That is ${pct(val, openValue)}% of open pipeline running late.` });
  }

  // 2. Concentration: any single deal dominating.
  const biggest = open.slice().sort((a, b) => b.value - a.value)[0];
  if (biggest && biggest.value > openValue * 0.2) {
    out.push({ id: 'concentration', severity: biggest.value > openValue * 0.3 ? 'high' : 'medium', icon: 'target',
      title: `Forecast leans on one deal`, detail: `${getCompany(biggest.companyId)?.name || biggest.name} is ${pct(biggest.value, openValue)}% of all open pipeline at ${k(biggest.value)}. If it slips, the quarter slips with it.` });
  }

  // 3. Activity desert.
  const cold = open.filter(d => {
    const acts = ctx.actsByDeal.get(d.id) || [];
    let last = null;
    for (const a of acts) { const t = new Date(a.createdAt || a.dueAt).getTime(); if (last == null || t > last) last = t; }
    const days = last == null ? Infinity : (now - last) / DAY;
    return days > 21;
  });
  if (cold.length) {
    const val = cold.reduce((s, d) => s + d.value, 0);
    out.push({ id: 'cold', severity: cold.length >= 5 ? 'high' : 'medium', icon: 'activity',
      title: `${cold.length} deals have gone quiet`, detail: `No activity in 21+ days on ${k(val)} of pipeline. Silent deals are the ones that surprise you on the forecast call.` });
  }

  // 4. Single-threaded big deals.
  const single = open.filter(d => (d.contactIds || []).length <= 1 && d.value >= 120000);
  if (single.length) {
    out.push({ id: 'single', severity: 'medium', icon: 'users',
      title: `${single.length} big deals are single-threaded`, detail: `Deals over ${k(120000)} riding on one contact. One quiet champion and ${k(single.reduce((s, d) => s + d.value, 0))} is exposed.` });
  }

  // 5. Win-rate momentum: last 60d vs prior 60d.
  const closedIn = (a, b) => getDeals().filter(d => {
    if (d.status !== 'won' && d.status !== 'lost') return false;
    const t = new Date(d.closeDate).getTime();
    return t >= now - b * DAY && t < now - a * DAY;
  });
  const recent = closedIn(0, 60), prior = closedIn(60, 120);
  const wr = (arr) => { const w = arr.filter(d => d.status === 'won').length; const c = arr.length; return c ? w / c : null; };
  const rNow = wr(recent), rPrev = wr(prior);
  if (rNow != null && rPrev != null && rPrev > 0) {
    const delta = Math.round((rNow - rPrev) * 100);
    if (delta <= -8) {
      out.push({ id: 'winrate', severity: delta <= -15 ? 'high' : 'medium', icon: 'trendUp',
        title: `Win rate is trending down`, detail: `Last 60 days closed at ${Math.round(rNow * 100)}%, down ${-delta} points from the prior 60 (${Math.round(rPrev * 100)}%). Something in the motion changed.` });
    } else if (delta >= 8) {
      out.push({ id: 'winrate', severity: 'low', icon: 'trendUp',
        title: `Win rate is climbing`, detail: `Last 60 days closed at ${Math.round(rNow * 100)}%, up ${delta} points from the prior 60. Whatever the team changed is working.` });
    }
  }

  // 6. Aging: deals older than 90d still open.
  const aging = open.filter(d => (now - new Date(d.createdAt).getTime()) / DAY > 90);
  if (aging.length >= 3) {
    out.push({ id: 'aging', severity: 'low', icon: 'history',
      title: `${aging.length} deals have aged past 90 days`, detail: `Long-open deals clog the pipeline and inflate coverage. Qualify them back in or close them out.` });
  }

  const rank = { high: 0, medium: 1, low: 2 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

/* ============================================================
   WIN / LOSS PATTERNS
   What the closed book teaches: rate, size, cycle, and where we
   win. Feeds a compact chart + a couple of headline stats.
   ============================================================ */
export function winLossPatterns() {
  const deals = getDeals();
  const won = deals.filter(d => d.status === 'won');
  const lost = deals.filter(d => d.status === 'lost');
  const winRate = pct(won.length, won.length + lost.length);

  const avgWon = won.length ? Math.round(won.reduce((s, d) => s + d.value, 0) / won.length) : 0;
  const avgLost = lost.length ? Math.round(lost.reduce((s, d) => s + d.value, 0) / lost.length) : 0;

  const cycle = won.map(d => (new Date(d.closeDate).getTime() - new Date(d.createdAt).getTime()) / DAY).filter(n => n > 0);
  const avgCycle = cycle.length ? Math.round(cycle.reduce((s, n) => s + n, 0) / cycle.length) : 0;

  // Win rate by industry (company.industry), only industries with enough closed.
  const byInd = {};
  for (const d of [...won, ...lost]) {
    const ind = getCompany(d.companyId)?.industry || 'Other';
    const row = byInd[ind] || (byInd[ind] = { industry: ind, won: 0, lost: 0 });
    if (d.status === 'won') row.won++; else row.lost++;
  }
  const industries = Object.values(byInd)
    .map(r => ({ ...r, total: r.won + r.lost, rate: pct(r.won, r.won + r.lost) }))
    .filter(r => r.total >= 3)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 6);

  // Win rate by deal-size band.
  const bands = [
    { label: '<50K', lo: 0, hi: 50000 },
    { label: '50-150K', lo: 50000, hi: 150000 },
    { label: '150-300K', lo: 150000, hi: 300000 },
    { label: '300K+', lo: 300000, hi: Infinity },
  ].map(b => {
    const w = won.filter(d => d.value >= b.lo && d.value < b.hi).length;
    const l = lost.filter(d => d.value >= b.lo && d.value < b.hi).length;
    return { band: b.label, won: w, lost: l, rate: pct(w, w + l), total: w + l };
  }).filter(b => b.total > 0);

  return {
    winRate, wonCount: won.length, lostCount: lost.length,
    avgWon, avgLost, avgCycle,
    sizeEdge: avgWon && avgLost ? Math.round(((avgWon - avgLost) / avgLost) * 100) : 0,
    industries, bands,
    bestIndustry: industries[0] || null,
    worstIndustry: industries.length ? industries[industries.length - 1] : null,
  };
}

/* ============================================================
   REP LEADERBOARD (intelligence view)
   A composite operator grade, not just a bar of closed-won: blends
   attainment, pipeline coverage, win rate, and deal health.
   ============================================================ */
export function intelRepLeaderboard() {
  const now = Date.now();
  const ctx = { now, actsByDeal: activityIndex() };
  const quotas = repQuarterlyQuotas();
  const reps = getUsers().filter(u => u.role === 'rep');
  const deals = getDeals();

  const rows = reps.map(u => {
    const mine = deals.filter(d => d.ownerId === u.id);
    const won = mine.filter(d => d.status === 'won');
    const lost = mine.filter(d => d.status === 'lost');
    const open = mine.filter(d => d.status === 'open');
    const wonVal = won.reduce((s, d) => s + d.value, 0);
    const pipeline = open.reduce((s, d) => s + d.value, 0);
    const winRate = pct(won.length, won.length + lost.length);
    const quota = quotas[u.id] || 0;
    const attainment = quota ? Math.round((wonVal / quota) * 100) : 0;

    let atRisk = 0;
    for (const d of open) { if (scoreDeal(d, ctx).tier === 'high') atRisk += d.value; }
    const health = pipeline ? Math.round((1 - atRisk / pipeline) * 100) : 100;

    return { userId: u.id, name: u.name, title: u.title, wonVal, pipeline, winRate, quota, attainment, health, openCount: open.length, atRisk };
  });

  // Normalize each dimension to 0..1 and blend into a composite score.
  const max = (sel) => Math.max(1, ...rows.map(sel));
  const mWon = max(r => r.wonVal), mPipe = max(r => r.pipeline);
  for (const r of rows) {
    const composite =
      0.40 * (r.wonVal / mWon) +
      0.22 * clamp(r.attainment / 100, 0, 1.2) +
      0.18 * (r.pipeline / mPipe) +
      0.12 * (r.winRate / 100) +
      0.08 * (r.health / 100);
    r.composite = Math.round(composite * 100);
    r.grade = r.composite >= 80 ? 'A' : r.composite >= 62 ? 'B' : r.composite >= 44 ? 'C' : 'D';
  }
  return rows.sort((a, b) => b.composite - a.composite);
}

/* ============================================================
   WHITESPACE / EXPANSION SIGNALS
   Where the next dollar hides: healthy customers with no open
   deal, and thinly-threaded accounts worth widening.
   ============================================================ */
export function whitespaceSignals() {
  const deals = getDeals();
  const contacts = getContacts();
  const wonByCo = {}, openByCo = {};
  for (const d of deals) {
    if (d.status === 'won') wonByCo[d.companyId] = (wonByCo[d.companyId] || 0) + d.value;
    if (d.status === 'open') openByCo[d.companyId] = (openByCo[d.companyId] || 0) + d.value;
  }
  const contactCount = {};
  for (const c of contacts) contactCount[c.companyId] = (contactCount[c.companyId] || 0) + 1;

  const out = [];
  for (const co of getCompanies()) {
    const won = wonByCo[co.id] || 0;
    const open = openByCo[co.id] || 0;
    const nContacts = contactCount[co.id] || 0;

    // Expansion: a customer (has won) with nothing open right now.
    if (won > 0 && open === 0) {
      const healthMult = co.health === 'green' ? 0.55 : co.health === 'yellow' ? 0.35 : 0.2;
      out.push({
        company: co, kind: 'expansion', signal: 'Customer, no open deal',
        potential: Math.round(won * (0.6 + healthMult)),
        reason: `${co.name} has closed ${k(won)} and has no open opportunity. ${co.health === 'green' ? 'Green health' : 'Existing footprint'} says there is room to expand.`,
        owner: userName(co.ownerId),
      });
    } else if (open > 0 && nContacts <= 2 && open >= 100000) {
      // Land-and-widen: active deal but thin relationship.
      out.push({
        company: co, kind: 'multithread', signal: 'Thin on an active deal',
        potential: Math.round(open * 0.4),
        reason: `${co.name} has ${k(open)} in flight but only ${nContacts} contact${nContacts === 1 ? '' : 's'}. Widen the relationship before it is decision time.`,
        owner: userName(co.ownerId),
      });
    }
  }
  return out.sort((a, b) => b.potential - a.potential).slice(0, 9);
}

/* ============================================================
   NEXT-BEST-ACTIONS  ("Moves that matter")
   Ranks every signal into one prioritized worklist, sorted by
   estimated dollar impact. This is what Rook would tell a rep to
   do first thing Monday.
   ============================================================ */
export function nextBestActions(limit = 7) {
  const scores = dealScores();
  const white = whitespaceSignals();
  const range = quarterRange('this');
  const moves = [];
  const usedDeal = new Set();

  // 1. Rescue high-risk deals (biggest dollars at risk first).
  for (const s of scores) {
    if (s.tier !== 'high') continue;
    usedDeal.add(s.deal.id);
    moves.push({
      id: 'rescue-' + s.deal.id, kind: 'Rescue', icon: 'shield', tint: 'var(--risk)',
      title: s.company?.name || s.deal.name, sub: s.deal.name,
      reason: s.reasons[0] || 'This deal is drifting and needs a hands-on save.',
      impact: Math.round(s.deal.value * (s.score / 100)),
      impactLabel: `${k(Math.round(s.deal.value * (s.score / 100)))} at risk`,
      meta: `Risk ${s.score} - ${s.owner}`, to: `/deals/${s.deal.id}`,
    });
  }

  // 2. Multi-thread single-threaded medium deals (not already rescued).
  for (const s of scores) {
    if (usedDeal.has(s.deal.id)) continue;
    if (s.factors.contacts <= 1 && s.deal.value >= 100000) {
      usedDeal.add(s.deal.id);
      moves.push({
        id: 'thread-' + s.deal.id, kind: 'Multi-thread', icon: 'users', tint: 'var(--info)',
        title: s.company?.name || s.deal.name, sub: s.deal.name,
        reason: `A ${k(s.deal.value)} deal on ${s.factors.contacts || 'no'} contact. Add a second stakeholder before it decides without you.`,
        impact: Math.round(s.deal.value * 0.3),
        impactLabel: `${k(s.deal.value)} exposed`,
        meta: `${s.factors.contacts} contact - ${s.owner}`, to: `/deals/${s.deal.id}`,
      });
    }
  }

  // 3. Pull best-case deals into commit (prob 60-84, closing this quarter).
  for (const s of scores) {
    if (usedDeal.has(s.deal.id)) continue;
    if (s.factors.prob >= 60 && s.factors.prob <= 84 && s.tier !== 'high' && inRange(s.deal.closeDate, range)) {
      usedDeal.add(s.deal.id);
      moves.push({
        id: 'commit-' + s.deal.id, kind: 'Close play', icon: 'zap', tint: 'var(--accent)',
        title: s.company?.name || s.deal.name, sub: s.deal.name,
        reason: `Sitting at ${s.factors.prob}% and healthy. One clean next step could pull ${k(s.deal.value)} into commit this quarter.`,
        impact: Math.round(s.deal.value * 0.5),
        impactLabel: `${k(s.deal.value)} to commit`,
        meta: `${s.factors.prob}% - ${s.owner}`, to: `/deals/${s.deal.id}`,
      });
    }
  }

  // 4. Expansion plays from whitespace.
  for (const w of white) {
    if (w.kind !== 'expansion') continue;
    moves.push({
      id: 'expand-' + w.company.id, kind: 'Expansion', icon: 'trendUp', tint: 'var(--ok)',
      title: w.company.name, sub: w.signal,
      reason: w.reason,
      impact: w.potential,
      impactLabel: `${k(w.potential)} upside`,
      meta: `${w.company.industry} - ${w.owner}`, to: `/companies/${w.company.id}`,
    });
  }

  return moves.sort((a, b) => b.impact - a.impact).slice(0, limit);
}

/* ============================================================
   TOP-LINE SUMMARY  (hero band)
   ============================================================ */
export function intelSummary() {
  const scores = dealScores();
  const high = scores.filter(s => s.tier === 'high');
  const open = getDeals().filter(d => d.status === 'open');
  const openValue = open.reduce((s, d) => s + d.value, 0);
  const atRisk = high.reduce((s, x) => s + x.deal.value, 0);
  const conf = forecastConfidence();
  return {
    openValue, openCount: open.length,
    atRiskValue: atRisk, atRiskCount: high.length,
    confidence: conf.confidence, confidenceLabel: conf.label, confidenceTone: conf.tone,
    healthyShare: pct(openValue - atRisk, openValue),
  };
}
