// ============================================================
// ARDOVO ATLAS  (semantic cartography of the book of business)
//
// Every deal becomes a point on a map where distance = similarity. We build a
// real feature vector per deal from the live store, standardize it, project to
// 2D with PCA (power iteration, pure JS), cluster with k-means, and expose
// cosine nearest-neighbors for look-alike detection ("deals like your best
// wins", "open deals drifting toward losses"). No external service, fully
// deterministic, grounded in real records.
//
// UPGRADE PATH: swap featurize() for real text embeddings (OpenAI / local)
// when a key is present; the projection + clustering + neighbor code is
// vector-source-agnostic. NO em-dash / en-dash. ASCII only.
// ============================================================
import { getDeals, getCompany, stageById, userName } from './store.js';

const DAY = 86400000;
const log1p10 = (n) => Math.log10(Math.max(0, n) + 1);

function sizeBucket(size) {
  const m = String(size || '').match(/(\d[\d,]*)/);
  if (!m) return 0.4;
  const n = Number(m[1].replace(/,/g, ''));
  if (n <= 10) return 0.1;
  if (n <= 50) return 0.3;
  if (n <= 200) return 0.5;
  if (n <= 1000) return 0.7;
  if (n <= 5000) return 0.85;
  return 1;
}
const healthScore = (h) => (h === 'green' ? 1 : h === 'red' ? 0 : 0.5);
const statusScore = (s) => (s === 'won' ? 1 : s === 'lost' ? 0 : 0.5);

const FEATURES = ['value', 'stage', 'prob', 'age', 'size', 'health', 'status', 'contacts', 'toClose', 'recency'];

// Build a raw numeric feature row for one deal.
function rowFor(deal) {
  const co = deal.companyId ? getCompany(deal.companyId) : null;
  const st = stageById(deal.stage);
  const now = Date.now();
  const created = deal.createdAt ? new Date(deal.createdAt).getTime() : now;
  const lastAct = deal.lastActivityAt ? new Date(deal.lastActivityAt).getTime() : created;
  const close = deal.closeDate ? new Date(deal.closeDate).getTime() : now;
  return {
    value: log1p10(deal.value),
    stage: (st?.order || 1) / 7,
    prob: (deal.probability || 0) / 100,
    age: log1p10((now - created) / DAY),
    size: sizeBucket(co?.size),
    health: healthScore(co?.health),
    status: statusScore(deal.status),
    contacts: log1p10((deal.contactIds || []).length),
    toClose: Math.max(-1, Math.min(1, (close - now) / (120 * DAY))),
    recency: log1p10((now - lastAct) / DAY),
  };
}

// z-score standardize each column. Returns { Z (n x d), mean, std }.
function standardize(rows) {
  const d = FEATURES.length;
  const n = rows.length;
  const mean = new Array(d).fill(0);
  const std = new Array(d).fill(0);
  for (const r of rows) FEATURES.forEach((f, j) => { mean[j] += r[f]; });
  for (let j = 0; j < d; j++) mean[j] /= (n || 1);
  for (const r of rows) FEATURES.forEach((f, j) => { const x = r[f] - mean[j]; std[j] += x * x; });
  for (let j = 0; j < d; j++) std[j] = Math.sqrt(std[j] / (n || 1)) || 1;
  const Z = rows.map(r => FEATURES.map((f, j) => (r[f] - mean[j]) / std[j]));
  return { Z, mean, std };
}

/* ---------- PCA via power iteration (top-2 components) ---------- */
function covariance(Z) {
  const n = Z.length, d = Z[0]?.length || 0;
  const C = Array.from({ length: d }, () => new Array(d).fill(0));
  for (const z of Z) for (let i = 0; i < d; i++) for (let j = i; j < d; j++) C[i][j] += z[i] * z[j];
  for (let i = 0; i < d; i++) for (let j = i; j < d; j++) { C[i][j] /= (n || 1); C[j][i] = C[i][j]; }
  return C;
}
function matVec(M, v) { return M.map(row => row.reduce((s, x, i) => s + x * v[i], 0)); }
function norm(v) { return Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1; }
function scale(v, s) { return v.map(x => x * s); }
function sub(a, b) { return a.map((x, i) => x - b[i]); }
function dot(a, b) { return a.reduce((s, x, i) => s + x * b[i], 0); }

function powerIteration(C, iters = 80, seed = 1) {
  const d = C.length;
  let v = new Array(d).fill(0).map((_, i) => Math.sin(seed * (i + 1)) + 0.1);
  v = scale(v, 1 / norm(v));
  for (let k = 0; k < iters; k++) { const w = matVec(C, v); const nrm = norm(w); if (nrm < 1e-9) break; v = scale(w, 1 / nrm); }
  const eig = dot(v, matVec(C, v));
  return { vec: v, val: eig };
}
function deflate(C, vec, val) {
  return C.map((row, i) => row.map((x, j) => x - val * vec[i] * vec[j]));
}
function pca2(Z) {
  if (!Z.length) return [];
  const C = covariance(Z);
  const p1 = powerIteration(C, 90, 1);
  const C2 = deflate(C, p1.vec, p1.val);
  const p2 = powerIteration(C2, 90, 2);
  return Z.map(z => [dot(z, p1.vec), dot(z, p2.vec)]);
}

/* ---------- k-means (deterministic seeding) ---------- */
function kmeans(Z, k, iters = 40) {
  const n = Z.length; if (!n) return { labels: [], centroids: [] };
  k = Math.max(1, Math.min(k, n));
  // Deterministic spread-out seeding (k-means++ style but seeded).
  const centroids = [Z[0].slice()];
  while (centroids.length < k) {
    let best = -1, bestD = -1;
    for (let i = 0; i < n; i++) {
      const dmin = Math.min(...centroids.map(c => dist2(Z[i], c)));
      if (dmin > bestD) { bestD = dmin; best = i; }
    }
    centroids.push(Z[best].slice());
  }
  let labels = new Array(n).fill(0);
  for (let it = 0; it < iters; it++) {
    let moved = false;
    for (let i = 0; i < n; i++) {
      let bi = 0, bd = Infinity;
      for (let c = 0; c < k; c++) { const dd = dist2(Z[i], centroids[c]); if (dd < bd) { bd = dd; bi = c; } }
      if (labels[i] !== bi) { labels[i] = bi; moved = true; }
    }
    const sums = Array.from({ length: k }, () => new Array(Z[0].length).fill(0));
    const counts = new Array(k).fill(0);
    for (let i = 0; i < n; i++) { counts[labels[i]]++; Z[i].forEach((x, j) => { sums[labels[i]][j] += x; }); }
    for (let c = 0; c < k; c++) if (counts[c]) centroids[c] = sums[c].map(x => x / counts[c]);
    if (!moved && it > 0) break;
  }
  return { labels, centroids };
}
function dist2(a, b) { let s = 0; for (let i = 0; i < a.length; i++) { const x = a[i] - b[i]; s += x * x; } return s; }
function cosine(a, b) { const d = dot(a, b); const na = norm(a), nb = norm(b); return d / (na * nb || 1); }

/* ---------- cluster labeling (human-readable) ---------- */
function labelCluster(memberRows, memberDeals) {
  const n = memberRows.length || 1;
  const avg = {};
  FEATURES.forEach(f => { avg[f] = memberRows.reduce((s, r) => s + r[f], 0) / n; });
  const wonRate = memberDeals.filter(d => d.status === 'won').length / n;
  const lostRate = memberDeals.filter(d => d.status === 'lost').length / n;
  // dominant industry
  const ind = {};
  for (const d of memberDeals) { const co = d.companyId ? getCompany(d.companyId) : null; const k = co?.industry || 'Other'; ind[k] = (ind[k] || 0) + 1; }
  const domInd = Object.entries(ind).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Mixed';

  const valTier = avg.value >= 5.4 ? 'Enterprise' : avg.value >= 4.7 ? 'Mid-market' : 'SMB';
  const stagePos = avg.stage >= 0.62 ? 'late-stage' : avg.stage >= 0.4 ? 'mid-funnel' : 'early';
  let temp = '';
  if (wonRate >= 0.5) temp = 'winning';
  else if (lostRate >= 0.4) temp = 'graveyard';
  else if (avg.recency >= 1.3) temp = 'cooling';
  else if (avg.health <= 0.35) temp = 'at-risk';
  const label = [valTier, stagePos].join(' ') + (temp ? `, ${temp}` : '');
  return { label, valTier, stagePos, temp, domInd, wonRate, lostRate, avg };
}

/* ============================================================
   PUBLIC: build the whole atlas
   ============================================================ */
export function buildAtlas({ k = 5, includeClosed = true } = {}) {
  let deals = getDeals();
  if (!includeClosed) deals = deals.filter(d => d.status === 'open');
  if (deals.length < 3) return { points: [], clusters: [], total: deals.length, empty: true };

  const rawRows = deals.map(rowFor);
  const { Z } = standardize(rawRows);
  const coords = pca2(Z);
  const km = kmeans(Z, Math.min(k, Math.max(2, Math.floor(deals.length / 6))));

  // Normalize coords to 0..1 for rendering.
  const xs = coords.map(c => c[0]), ys = coords.map(c => c[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = (maxX - minX) || 1, spanY = (maxY - minY) || 1;

  const points = deals.map((d, i) => {
    const co = d.companyId ? getCompany(d.companyId) : null;
    return {
      id: d.id, name: d.name, company: co?.name || '', industry: co?.industry || '',
      value: d.value, stage: d.stage, stageName: stageById(d.stage)?.name || d.stage,
      status: d.status, probability: d.probability, owner: userName(d.ownerId),
      cluster: km.labels[i],
      x: (coords[i][0] - minX) / spanX,
      y: (coords[i][1] - minY) / spanY,
      z: Z[i], // standardized vector for neighbor search
    };
  });

  // Cluster summaries.
  const clusters = [];
  const kk = km.centroids.length;
  for (let c = 0; c < kk; c++) {
    const idx = points.map((p, i) => (p.cluster === c ? i : -1)).filter(i => i >= 0);
    if (!idx.length) continue;
    const memberDeals = idx.map(i => deals[i]);
    const memberRows = idx.map(i => rawRows[i]);
    const info = labelCluster(memberRows, memberDeals);
    const totalValue = memberDeals.reduce((s, d) => s + d.value, 0);
    clusters.push({
      id: c, label: info.label, domInd: info.domInd, temp: info.temp,
      count: idx.length, totalValue,
      wonRate: Math.round(info.wonRate * 100), lostRate: Math.round(info.lostRate * 100),
      cx: idx.reduce((s, i) => s + points[i].x, 0) / idx.length,
      cy: idx.reduce((s, i) => s + points[i].y, 0) / idx.length,
    });
  }
  clusters.sort((a, b) => b.totalValue - a.totalValue);

  return { points, clusters, total: deals.length, empty: false };
}

// PREDICT: infer each OPEN deal's outcome from its nearest CLOSED deals in
// feature space (weighted k-NN over your own won/lost history). Returns a Map
// id -> { winProb, verdict, confidence, basis[] }. Grounded and explainable:
// the basis is the actual closed deals the prediction leans on.
export function predictOutcomes(points, k = 7) {
  const closed = points.filter(p => p.status === 'won' || p.status === 'lost');
  const out = new Map();
  if (closed.length < 4) return out;
  for (const p of points) {
    if (p.status !== 'open') continue;
    const sims = closed
      .map(c => ({ c, sim: Math.max(0, cosine(p.z, c.z)) }))
      .sort((a, b) => b.sim - a.sim)
      .slice(0, Math.min(k, closed.length));
    const wsum = sims.reduce((s, x) => s + x.sim, 0) || 1;
    const winProb = sims.reduce((s, x) => s + x.sim * (x.c.status === 'won' ? 1 : 0), 0) / wsum;
    const avgSim = wsum / sims.length;
    const verdict = winProb >= 0.6 ? 'likely-win' : winProb <= 0.35 ? 'at-risk' : 'coin-flip';
    out.set(p.id, {
      winProb: Math.round(winProb * 100),
      verdict,
      confidence: Math.round(Math.min(1, avgSim + sims.length / (k * 2)) * 100),
      basis: sims.map(x => ({ id: x.c.id, name: x.c.name, status: x.c.status, sim: Math.round(x.sim * 100) })),
    });
  }
  return out;
}

// Top-K look-alikes for a point by cosine similarity on the standardized vector.
export function neighborsFor(points, id, k = 6) {
  const target = points.find(p => p.id === id);
  if (!target) return [];
  return points
    .filter(p => p.id !== id)
    .map(p => ({ p, sim: cosine(target.z, p.z) }))
    .sort((a, b) => b.sim - a.sim)
    .slice(0, k)
    .map(({ p, sim }) => ({ ...p, sim: Math.round(sim * 100) }));
}

export { FEATURES };
