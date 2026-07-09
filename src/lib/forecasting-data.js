// ============================================================
// RALLY FORECASTING DATA
// Quota + forecast-category model layered on top of the live store.
// Deterministic per-rep quotas (a book quota split into quarterly
// targets) plus the roll-up logic that maps a deal's stage +
// probability into a forecast category (Commit / Best Case /
// Pipeline / Omitted). Category overrides persist to localStorage
// so a rep can pull a deal into commit or push it out, like Clari.
// SUPABASE: rally_quotas (per rep, per period) + rally_forecast_overrides.
// ============================================================
import { getUsers, getDeals, stageById } from './store.js';

const OVERRIDE_KEY = 'rally_forecast_overrides_v1';

/* ---------- forecast categories ---------- */
export const CATEGORIES = [
  { id: 'commit', label: 'Commit', color: 'var(--ok)', tone: 'ok', desc: 'High confidence, called for the quarter.' },
  { id: 'best', label: 'Best Case', color: 'var(--accent)', tone: 'accent', desc: 'Upside that can land with a push.' },
  { id: 'pipeline', label: 'Pipeline', color: 'var(--warn)', tone: 'warn', desc: 'Active but not yet called.' },
  { id: 'omitted', label: 'Omitted', color: 'var(--n-400)', tone: 'default', desc: 'Excluded from the forecast.' },
];
export const categoryById = (id) => CATEGORIES.find(c => c.id === id) || CATEGORIES[2];

/* ---------- deterministic per-rep quota ---------- */
// Reps carry an annual quota in the store (user.quota). We derive a
// quarterly target from it with a small deterministic per-rep skew so
// the fleet does not look uniform. Managers (quota 0) are excluded.
function skew(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(id.length - 1 - i)) | 0;
  // 0.9 .. 1.1 multiplier
  return 0.9 + (Math.abs(h) % 21) / 100;
}

// Quarterly quota per rep id. Annual / 4, nudged by a stable skew,
// rounded to a clean 5k. SUPABASE: from('rally_quotas').select().
export function repQuarterlyQuotas() {
  const out = {};
  for (const u of getUsers()) {
    if (!u.quota || u.role !== 'rep') continue;
    const raw = (u.quota / 4) * skew(u.id);
    out[u.id] = Math.round(raw / 5000) * 5000;
  }
  return out;
}
export const teamQuarterlyQuota = () =>
  Object.values(repQuarterlyQuotas()).reduce((s, v) => s + v, 0);

/* ---------- category roll-up ---------- */
// Default category from stage + probability. Overrides win when present.
// Closed-won never appears here (it is "closed", counted separately).
export function defaultCategory(deal) {
  if (deal.status !== 'open') return deal.status === 'won' ? 'commit' : 'omitted';
  const p = deal.probability ?? (stageById(deal.stage)?.probability || 0);
  if (deal.stage === 'negotiation' || p >= 85) return 'commit';
  if (deal.stage === 'proposal' || p >= 60) return 'best';
  if (p >= 20) return 'pipeline';
  return 'omitted';
}

/* ---------- override persistence ---------- */
export function loadOverrides() {
  try { const raw = localStorage.getItem(OVERRIDE_KEY); if (raw) return JSON.parse(raw); } catch {}
  return {};
}
export function saveOverride(dealId, categoryId) {
  const map = loadOverrides();
  if (!categoryId) delete map[dealId];
  else map[dealId] = categoryId;
  try { localStorage.setItem(OVERRIDE_KEY, JSON.stringify(map)); } catch {}
  return map;
}
export function categoryFor(deal, overrides) {
  const o = overrides || loadOverrides();
  return o[deal.id] || defaultCategory(deal);
}

/* ---------- quarter windows ---------- */
export function quarterRange(which = 'this', ref = new Date()) {
  const y = ref.getFullYear();
  const q = Math.floor(ref.getMonth() / 3) + (which === 'next' ? 1 : 0);
  const year = y + Math.floor(q / 4);
  const qi = ((q % 4) + 4) % 4;
  const start = new Date(year, qi * 3, 1);
  const end = new Date(year, qi * 3 + 3, 0, 23, 59, 59);
  return { start, end, label: `Q${qi + 1} ${year}`, months: [qi * 3, qi * 3 + 1, qi * 3 + 2].map(m => new Date(year, m, 1)) };
}
export function inRange(dateStr, range) {
  const t = new Date(dateStr).getTime();
  return t >= range.start.getTime() && t <= range.end.getTime();
}

/* ---------- the roll-up engine ---------- */
// Returns per-category and per-rep rollups for a quarter, plus the
// closed-won number in that window. Pure over the store + overrides.
export function buildRollup(range, overrides) {
  const o = overrides || loadOverrides();
  const quotas = repQuarterlyQuotas();
  const deals = getDeals();

  const cat = { commit: 0, best: 0, pipeline: 0, omitted: 0 };
  const reps = {};
  const ensureRep = (id) => (reps[id] = reps[id] || { userId: id, quota: quotas[id] || 0, closed: 0, commit: 0, best: 0, pipeline: 0, omitted: 0, count: 0 });

  let closedWon = 0;

  for (const d of deals) {
    const owner = ensureRep(d.ownerId);
    // closed-won landing this quarter
    if (d.status === 'won' && inRange(d.closeDate, range)) {
      closedWon += d.value; owner.closed += d.value;
    }
    if (d.status !== 'open') continue;
    if (!inRange(d.closeDate, range)) continue;
    const c = o[d.id] || defaultCategory(d);
    cat[c] = (cat[c] || 0) + d.value;
    owner[c] += d.value;
    owner.count++;
  }

  // committed number = closed-won already booked + open commit
  const committed = closedWon + cat.commit;
  const bestCase = committed + cat.best;
  const weighted = deals
    .filter(d => d.status === 'open' && inRange(d.closeDate, range))
    .reduce((s, d) => s + d.value * ((d.probability ?? 0) / 100), 0);

  return {
    cat, reps: Object.values(reps).filter(r => r.quota > 0 || r.count > 0 || r.closed > 0),
    closedWon, committed, bestCase, weighted,
    pipeline: cat.pipeline + cat.best + cat.commit,
  };
}

/* ---------- monthly category breakdown (for stacked chart) ---------- */
export function monthlyCategoryBreakdown(range, overrides) {
  const o = overrides || loadOverrides();
  const deals = getDeals();
  const rows = range.months.map(m => ({
    month: m.toLocaleDateString('en-US', { month: 'short' }),
    ts: m.getTime(),
    commit: 0, best: 0, pipeline: 0,
  }));
  const findRow = (dateStr) => {
    const dt = new Date(dateStr);
    return rows.find(r => {
      const rd = new Date(r.ts);
      return rd.getMonth() === dt.getMonth() && rd.getFullYear() === dt.getFullYear();
    });
  };
  for (const d of deals) {
    if (d.status !== 'open' || !inRange(d.closeDate, range)) continue;
    const row = findRow(d.closeDate);
    if (!row) continue;
    const c = o[d.id] || defaultCategory(d);
    if (c === 'omitted') continue;
    row[c] += d.value;
  }
  return rows;
}

/* ---------- forecast vs actual trend (recent months) ---------- */
// For each of the last `n` months: actual = closed-won that landed,
// forecast = a deterministic reconstruction of what was called
// (actual dampened + a stable per-month wobble) so the line reads like
// a real "were we accurate" trend without needing snapshot history.
export function forecastVsActual(n = 6, ref = new Date()) {
  const deals = getDeals();
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    const actual = deals
      .filter(d => d.status === 'won')
      .filter(d => { const dt = new Date(d.closeDate); return dt.getMonth() === m.getMonth() && dt.getFullYear() === m.getFullYear(); })
      .reduce((s, d) => s + d.value, 0);
    // deterministic wobble in 0.82 .. 1.12 keyed on month index
    const seed = (m.getFullYear() * 12 + m.getMonth());
    const wobble = 0.82 + ((seed * 2654435761) % 1000) / 1000 * 0.3;
    const forecast = Math.round((actual || 180000) * wobble / 1000) * 1000;
    out.push({
      month: m.toLocaleDateString('en-US', { month: 'short' }),
      actual, forecast,
    });
  }
  return out;
}
