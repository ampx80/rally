// ============================================================
// PIPELINE WIND TUNNEL  -  backtest a sales policy like a quant.
//
// Ardovo's book of business is a single deterministic object with a
// re-computable risk model (intelligence-data.scoreDeal) and a real
// automations engine. That lets us do what a server-of-record CRM
// cannot: take the REAL closed history, replay it under a
// COUNTERFACTUAL policy, Monte-Carlo the outcomes with the store's own
// mulberry32 PRNG (reproducible), and report the delta in win rate,
// cycle time and attainment WITH confidence bands - before shipping a
// single rule to production.
//
// 100% additive + read-only. The engine (src/lib/windtunnel.js) never
// mutates the store; the only writer is the Deploy button, which
// compiles the winning policy into a normal automations.js rule via the
// existing ACTIONS / TRIGGERS schema (saveAutomation).
// ============================================================
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store.js';
import {
  Card, SectionHeader, Button, Badge, Segmented, AnimatedNumber,
  useToast, money, moneyK,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, ReferenceDot,
} from 'recharts';
import {
  POLICY_LEVERS, DEFAULT_POLICY, backtest, sweep,
  getClosedTrajectories, compilePolicyToRule,
} from '../lib/windtunnel.js';
import { saveAutomation, TRIGGERS, ACTIONS } from '../lib/automations.js';
import { teamQuarterlyQuota } from '../lib/forecasting-data.js';
import './windtunnel.css';

const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- metric metadata + formatters ---------- */
const METRICS = [
  { key: 'winRate', label: 'Win rate', kind: 'pct', good: 'up' },
  { key: 'attainment', label: 'Attainment', kind: 'pct', good: 'up' },
  { key: 'cycleTime', label: 'Cycle time', kind: 'days', good: 'down' },
];
const pct = (v) => `${Math.round(v * 100)}%`;
const days = (v) => `${Math.round(v)}d`;
const fmtBy = (kind, v) => (kind === 'days' ? days(v) : pct(v));
const kindOf = (key) => (key === 'cycleTime' ? 'days' : 'pct');
const fmtMetric = (key, v) => fmtBy(kindOf(key), v);
// Signed delta text: points for rates, days for cycle time.
function deltaText(key, d) {
  if (key === 'cycleTime') return `${d > 0 ? '+' : ''}${Math.round(d)}d`;
  const pts = d * 100;
  return `${pts > 0 ? '+' : ''}${pts.toFixed(1)} pts`;
}

/* ---------- strategy presets (quick starting points) ---------- */
const NEUTRAL = { cadenceDays: 60, activityGate: 0, minContacts: 1, discountCapPct: 100, valueFloor: 0 };
const PRESETS = [
  { id: 'balanced', label: 'Balanced', policy: { ...DEFAULT_POLICY } },
  { id: 'cadence', label: 'Tighten cadence', policy: { ...DEFAULT_POLICY, cadenceDays: 3, activityGate: 4 } },
  { id: 'multithread', label: 'Multi-thread everything', policy: { ...DEFAULT_POLICY, minContacts: 3 } },
  { id: 'discipline', label: 'Discount discipline', policy: { ...DEFAULT_POLICY, discountCapPct: 10, valueFloor: 100000 } },
  { id: 'lived', label: 'As it happened', policy: { ...NEUTRAL } },
];
const samePolicy = (a, b) => POLICY_LEVERS.every(l => a[l.key] === b[l.key]);

/* lever readout text */
function leverText(lever, v) {
  if (lever.key === 'valueFloor') return v > 0 ? moneyK(v) : 'whole book';
  if (lever.unit === '%') return `${v}%`;
  if (lever.unit === 'd') return `${v} day${v === 1 ? '' : 's'}`;
  return `${v}`;
}

/* custom tooltip for the frontier chart */
function FrontierTip({ active, payload, label, metricKey, leverLabel }) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0]?.payload || {};
  return (
    <div className="wt-tip">
      <div className="wt-tip-x">{leverLabel}: {label}</div>
      <div className="wt-tip-row"><span>projected</span><b>{fmtMetric(metricKey, row.mean)}</b></div>
      <div className="wt-tip-row"><span>80% band</span><b>{fmtMetric(metricKey, row.lo)} to {fmtMetric(metricKey, row.hi)}</b></div>
    </div>
  );
}

export default function WindTunnel() {
  useStore(); // re-render on any store mutation so the backtest reflects the live book
  const snap = useStore(s => s.deals); // memo key that changes when the book changes
  const toast = useToast();
  const navigate = useNavigate();
  const reduced = useMemo(() => reducedMotion(), []);

  const [policy, setPolicy] = useState({ ...DEFAULT_POLICY });
  const [sweepLever, setSweepLever] = useState('cadenceDays');
  const [sweepMetric, setSweepMetric] = useState('winRate');
  const [deployed, setDeployed] = useState(null);

  /* reconstruct once, share across the main backtest + the sweep */
  const trajectories = useMemo(() => getClosedTrajectories(), [snap]);
  const quota = useMemo(() => teamQuarterlyQuota() || 1, [snap]);

  const result = useMemo(
    () => backtest(policy, { trials: 500, trajectories, quota }),
    [policy, trajectories, quota],
  );
  const sweepRes = useMemo(
    () => sweep(sweepLever, { ...policy }, { metric: sweepMetric, trials: 180 }),
    [sweepLever, sweepMetric, policy, snap],
  );

  const winLift = result.metrics.winRate.mean - result.metrics.winRate.base;
  const compiled = useMemo(
    () => compilePolicyToRule(policy, { n: result.n, winLift }),
    [policy, result.n, winLift],
  );

  const noHistory = result.n === 0;

  /* ---------- metric cards ---------- */
  const cards = METRICS.map(m => {
    const d = result.metrics[m.key];
    const delta = d.mean - d.base;
    const eps = m.key === 'cycleTime' ? 0.5 : 0.002;
    const dir = Math.abs(delta) < eps ? 'flat' : delta > 0 ? 'up' : 'down';
    // good direction: rates up = good, cycle down = good
    const positive = dir === 'flat' ? 'flat' : (m.good === 'up' ? dir === 'up' : dir === 'down') ? 'up' : 'down';
    return { ...m, ...d, delta, tone: positive };
  });

  /* ---------- per-deal replay rows ---------- */
  const rows = useMemo(() => {
    return result.models.map(m => {
      let effect;
      if (!m.applies) effect = { label: 'Excluded', tone: 'default' };
      else if (m.won) effect = m.p >= 0.85 ? { label: 'Protected win', tone: 'ok' } : { label: 'Win at risk', tone: 'warn' };
      else effect = m.p >= 0.5 ? { label: 'Rescued loss', tone: 'accent' } : m.p >= 0.25 ? { label: 'Closer', tone: 'info' } : { label: 'Still lost', tone: 'default' };
      const swing = m.won ? (1 - m.p) : m.p; // how far the policy moved this deal from its realized outcome
      return { ...m, effect, swing };
    }).sort((a, b) => b.swing - a.swing);
  }, [result]);

  /* ---------- frontier chart data + domain ---------- */
  const chart = useMemo(() => {
    const pts = sweepRes.points.map(p => ({ x: p.x, mean: p.mean, lo: p.lo, hi: p.hi, band: [p.lo, p.hi] }));
    const ys = sweepRes.points.flatMap(p => [p.lo, p.hi, p.base]);
    const yMin = ys.length ? Math.min(...ys) : 0;
    const yMax = ys.length ? Math.max(...ys) : 1;
    const spread = yMax - yMin;
    const pad = spread > 0 ? spread * 0.35 : Math.max(yMax * 0.12, 0.05);
    return { pts, base: sweepRes.points[0]?.base ?? 0, domain: [Math.max(0, yMin - pad), yMax + pad] };
  }, [sweepRes]);

  const sweepLeverMeta = POLICY_LEVERS.find(l => l.key === sweepLever) || POLICY_LEVERS[0];
  const currentAt = policy[sweepLever];
  const best = sweepRes.best;
  const grid = 'var(--line)';

  /* ---------- actions ---------- */
  const setLever = (key, v) => { setDeployed(null); setPolicy(p => ({ ...p, [key]: Number(v) })); };
  const applyPreset = (preset) => { setDeployed(null); setPolicy({ ...preset.policy }); };
  const snapOptimum = () => {
    if (!best) return;
    setDeployed(null);
    setPolicy(p => ({ ...p, [sweepLever]: best.x }));
  };
  const deploy = () => {
    const rule = compilePolicyToRule(policy, { n: result.n, winLift });
    const id = saveAutomation(rule);
    setDeployed({ id, name: rule.name });
    toast('Policy compiled to a live automation', 'ok');
  };

  const triggerTitle = TRIGGERS[compiled.trigger.type]?.title || compiled.trigger.type;

  return (
    <div className="wt-page fade-up">
      {/* hero */}
      <div className="wt-hero">
        <div className="wt-hero-grid" aria-hidden />
        <div className="wt-hero-inner">
          <div className="row between wrap" style={{ gap: '1rem', alignItems: 'flex-end' }}>
            <div className="col" style={{ minWidth: 0, maxWidth: 640 }}>
              <div className="wt-eyebrow">Analytics &middot; counterfactual replay</div>
              <h2>Pipeline Wind Tunnel</h2>
              <p className="muted" style={{ margin: 0, fontSize: '.98rem', lineHeight: 1.5 }}>
                Replay your real closed history under a policy you have never run - a tighter follow-up
                cadence, an activity gate, a discount cap - Monte-Carlo the outcomes over{' '}
                <b>{result.n}</b> closed deals, and see the delta with confidence bands. The winning
                policy compiles straight to a live automation.
              </p>
            </div>
            <div className="row gap-2" style={{ alignItems: 'center' }}>
              <Badge tone="accent">deterministic replay</Badge>
              <Badge tone="info">reads history, writes nothing</Badge>
            </div>
          </div>
        </div>
      </div>

      {noHistory ? (
        <Card className="card-pad">
          <div className="col center gap-2" style={{ padding: '2.4rem 1.5rem', textAlign: 'center' }}>
            <Icon name="target" size={26} />
            <div className="muted" style={{ maxWidth: 460 }}>
              No closed deals in the book yet. Once deals close won or lost, the Wind Tunnel can
              replay them under a counterfactual policy.
            </div>
          </div>
        </Card>
      ) : (
        <div className="wt-grid">
          {/* ---------------- LEFT: policy console ---------------- */}
          <div>
            <div className="wt-panel">
              <div className="wt-eyebrow">Policy console</div>
              <div className="t-sm muted" style={{ margin: '.3rem 0 .1rem' }}>
                Five levers a revenue leader actually tunes. Drag to re-run the backtest live.
              </div>
              <div className="wt-presets">
                {PRESETS.map(p => (
                  <button
                    key={p.id}
                    className={`wt-preset${samePolicy(policy, p.policy) ? ' active' : ''}`}
                    onClick={() => applyPreset(p)}
                    type="button"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="wt-levers">
                {POLICY_LEVERS.map(lever => {
                  const v = policy[lever.key];
                  const fill = `${((v - lever.min) / (lever.max - lever.min)) * 100}%`;
                  const active = sweepLever === lever.key;
                  return (
                    <div
                      key={lever.key}
                      className={`wt-lever${active ? ' active' : ''}`}
                      onClick={() => setSweepLever(lever.key)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSweepLever(lever.key); } }}
                      title="Analyze this lever in the frontier chart"
                    >
                      <div className="wt-lever-top">
                        <span className="wt-lever-label">{lever.label}</span>
                        <span className="wt-lever-val">{leverText(lever, v)}</span>
                      </div>
                      <input
                        className="wt-range"
                        type="range"
                        min={lever.min}
                        max={lever.max}
                        step={lever.step}
                        value={v}
                        style={{ '--fill': fill }}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setLever(lever.key, e.target.value)}
                        aria-label={lever.label}
                      />
                      <div className="row between" style={{ alignItems: 'baseline', gap: '.5rem' }}>
                        <span className="wt-lever-hint">{lever.hint}</span>
                        {active && <span className="wt-analyzing">analyzing</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* deploy card */}
            <div className="wt-deploy">
              <div className="row between wrap" style={{ gap: '.6rem', alignItems: 'center' }}>
                <div className="col" style={{ minWidth: 0 }}>
                  <div className="wt-eyebrow">Compile to runtime</div>
                  <div className="fw-6" style={{ fontSize: '1.02rem', marginTop: 2 }}>Ship the winning policy</div>
                </div>
                <Button variant="accent" onClick={deploy}>
                  <Icon name="zap" size={15} /> Deploy policy
                </Button>
              </div>
              <div className="t-sm muted" style={{ marginTop: '.5rem' }}>
                One click compiles this policy into a real automation rule via the existing
                trigger / action schema. Nothing sends automatically - you review it in Workflows.
              </div>

              <div className="wt-rule">
                <div className="wt-rule-row">
                  <span className="wt-rule-k">When</span>
                  <span className="wt-rule-v">{triggerTitle}</span>
                </div>
                {compiled.conditions.length > 0 && (
                  <div className="wt-rule-row">
                    <span className="wt-rule-k">If</span>
                    <span className="wt-rule-v">
                      {compiled.conditions.map((c, i) => (
                        <span key={i} className="wt-mono">Deal value is over {money(c.value)}</span>
                      ))}
                    </span>
                  </div>
                )}
                <div className="wt-rule-row">
                  <span className="wt-rule-k">Then</span>
                  <span className="wt-rule-v">
                    {compiled.actions.map((a, i) => {
                      const meta = ACTIONS[a.type];
                      const detail = a.config?.subject ? ` - "${a.config.subject}"` : '';
                      return (
                        <div key={i}>{meta?.label || a.type}<span className="muted">{detail}</span></div>
                      );
                    })}
                  </span>
                </div>
              </div>

              {deployed && (
                <div className="wt-deployed">
                  <Icon name="check" size={16} />
                  <span style={{ flex: 1, minWidth: 0 }}>Deployed as an automation.</span>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/workflows')}>
                    Open in Workflows <Icon name="arrowRight" size={13} />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* ---------------- RIGHT: results ---------------- */}
          <div>
            {/* metric deltas */}
            <div className="wt-metrics">
              {cards.map(c => (
                <div className="wt-metric" key={c.key}>
                  <div className="row between" style={{ alignItems: 'baseline' }}>
                    <span className="wt-metric-label">{c.label}</span>
                    <span className={`wt-delta ${c.tone}`}>
                      {c.tone !== 'flat' && <Icon name={c.delta > 0 ? 'arrowUp' : 'arrowDown'} size={12} />}
                      {c.tone === 'flat' ? 'no change' : deltaText(c.key, c.delta)}
                    </span>
                  </div>
                  <div className="wt-metric-val">
                    <AnimatedNumber value={c.mean} format={(v) => fmtMetric(c.key, v)} />
                  </div>
                  <div className="wt-metric-base">
                    as it happened <b>{fmtMetric(c.key, c.base)}</b>
                  </div>
                  <div className="wt-band">
                    80% band <b>{fmtMetric(c.key, c.lo)}</b> to <b>{fmtMetric(c.key, c.hi)}</b>
                  </div>
                </div>
              ))}
            </div>

            {/* insight chips */}
            <div className="wt-insights">
              <span className="wt-insight">
                <span className="wt-ico"><Icon name="target" size={15} /></span>
                <span><b>{result.expectedRescued.toFixed(1)}</b> losses the policy would rescue</span>
              </span>
              <span className="wt-insight">
                <span className="wt-ico"><Icon name="dollar" size={15} /></span>
                <span><b>{money(Math.round(result.heldValue))}</b> margin held by discount discipline</span>
              </span>
              <span className="wt-insight">
                <span className="wt-ico"><Icon name="history" size={15} /></span>
                <span><b>500</b> Monte-Carlo trials, reproducible</span>
              </span>
            </div>

            {/* frontier chart */}
            <div className="wt-panel" style={{ marginTop: '1.15rem' }}>
              <div className="wt-frontier-head">
                <div className="col" style={{ minWidth: 0 }}>
                  <div className="wt-eyebrow">Efficient frontier</div>
                  <h4 style={{ margin: '.1rem 0 0' }}>{sweepLeverMeta.label} vs {METRICS.find(m => m.key === sweepMetric)?.label}</h4>
                </div>
                <div className="row gap-2 wrap" style={{ alignItems: 'center' }}>
                  <Segmented
                    options={METRICS.map(m => ({ value: m.key, label: m.label }))}
                    value={sweepMetric}
                    onChange={setSweepMetric}
                  />
                  {best && (
                    <Button variant="ghost" size="sm" onClick={snapOptimum} title="Set this lever to its optimum">
                      <Icon name="sparkles" size={14} /> Snap to optimum
                    </Button>
                  )}
                </div>
              </div>
              <div className="t-sm muted" style={{ marginBottom: '.6rem' }}>
                Hold the rest of the policy fixed and sweep <b>{sweepLeverMeta.label.toLowerCase()}</b> across its
                range. The ribbon is the p10-p90 confidence band at each setting. Click any lever on
                the left to analyze it here.
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={chart.pts} margin={{ top: 12, right: 16, left: 4, bottom: 16 }}>
                  <defs>
                    <linearGradient id="wtBand" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.06} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={grid} vertical={false} />
                  <XAxis
                    dataKey="x" tickLine={false} axisLine={{ stroke: grid }}
                    tick={{ fontSize: 12, fill: 'var(--n-600)' }}
                    label={{ value: `${sweepLeverMeta.label} (${sweepLeverMeta.unit || 'count'})`, position: 'insideBottom', offset: -8, fontSize: 11, fill: 'var(--n-600)' }}
                  />
                  <YAxis
                    domain={chart.domain}
                    tickFormatter={(v) => fmtMetric(sweepMetric, v)}
                    tickLine={false} axisLine={false} width={48}
                    tick={{ fontSize: 11, fill: 'var(--n-600)' }}
                  />
                  <Tooltip content={<FrontierTip metricKey={sweepMetric} leverLabel={sweepLeverMeta.label} />} cursor={{ stroke: 'var(--accent-300)', strokeDasharray: '4 4' }} />
                  <Area
                    type="monotone" dataKey="band" stroke="none" fill="url(#wtBand)"
                    isAnimationActive={!reduced} connectNulls
                  />
                  <ReferenceLine
                    y={chart.base} stroke="var(--n-400)" strokeDasharray="5 4"
                    label={{ value: 'as it happened', position: 'insideTopLeft', fontSize: 10, fill: 'var(--n-600)' }}
                  />
                  <ReferenceLine
                    x={currentAt} stroke="var(--accent-300)" strokeWidth={1.5}
                    label={{ value: 'current', position: 'top', fontSize: 10, fill: 'var(--accent-600)' }}
                  />
                  <Line
                    type="monotone" dataKey="mean" name="projected"
                    stroke="var(--accent)" strokeWidth={2.5} dot={false}
                    isAnimationActive={!reduced}
                  />
                  {best && <ReferenceDot x={best.x} y={best.mean} r={5} fill="var(--accent)" stroke="#fff" strokeWidth={2} />}
                </ComposedChart>
              </ResponsiveContainer>
              <div className="wt-legend">
                <span><span className="wt-swatch line" /> projected mean</span>
                <span><span className="wt-swatch" style={{ background: 'var(--accent-50)' }} /> p10-p90 band</span>
                <span><span className="wt-swatch dash" /> as it happened</span>
                {best && <span><span className="wt-swatch" style={{ background: 'var(--accent)', borderRadius: '50%', width: 10, height: 10 }} /> optimum {best.x}{sweepLeverMeta.unit}</span>}
              </div>
            </div>

            {/* per-deal replay table */}
            <Card style={{ padding: 0, overflow: 'hidden', marginTop: '1.15rem' }}>
              <div className="card-pad row between wrap" style={{ paddingBottom: '.9rem', gap: '.5rem' }}>
                <div className="col gap-1" style={{ minWidth: 0 }}>
                  <div className="eyebrow">Deal-by-deal replay</div>
                  <h4 style={{ margin: 0 }}>How the policy moves each closed deal</h4>
                </div>
                <Badge tone="accent">{rows.length} deals</Badge>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Deal</th>
                      <th>Outcome</th>
                      <th className="wt-th">Risk then</th>
                      <th className="wt-th">Risk now</th>
                      <th className="wt-th">Policy win odds</th>
                      <th className="wt-th">Cycle add</th>
                      <th>Effect</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(m => {
                      const deRisk = m.lived - m.cf; // positive = policy removed risk
                      return (
                        <tr key={m.id}>
                          <td style={{ maxWidth: 260 }}>
                            <div className="col" style={{ minWidth: 0, lineHeight: 1.25 }}>
                              <span className="fw-6 clip">{m.name}</span>
                              <span className="t-xs muted clip">{m.company || 'No account'} &middot; {m.owner}</span>
                            </div>
                          </td>
                          <td><Badge tone={m.won ? 'ok' : 'risk'}>{m.won ? 'Won' : 'Lost'}</Badge></td>
                          <td className="tnum wt-th">{m.lived}</td>
                          <td className="tnum wt-th">
                            <span className="row" style={{ gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                              {m.cf}
                              {deRisk !== 0 && (
                                <span className="t-xs fw-6" style={{ color: deRisk > 0 ? 'var(--ok)' : 'var(--risk)' }}>
                                  {deRisk > 0 ? '-' : '+'}{Math.abs(deRisk)}
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="tnum wt-th fw-6">{Math.round(m.p * 100)}%</td>
                          <td className="tnum wt-th">{m.cycleAdd > 0 ? `+${Math.round(m.cycleAdd)}d` : '-'}</td>
                          <td><Badge tone={m.effect.tone}>{m.effect.label}</Badge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
