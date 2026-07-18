// ============================================================
// ARDOVO - REVENUE DIGITAL TWIN  (Twin.jsx)
// A Monte Carlo forecast simulator + scenario planner that no CRM
// ships natively. Instead of one lying forecast number, the twin runs
// thousands of simulated quarters and returns a probability
// distribution of bookings (P10 / P50 / P90) with a confidence fan,
// a plan-attainment gauge, live what-if sliders, a ranked "levers"
// list, and a rep-capacity model. Deterministic seed -> stable demo.
// ADDITIVE: new file, composes only shared primitives. No em/en dash.
// ============================================================
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Button, Card, Badge, Ring, PageTitle, SectionHeader, Modal,
  ProgressBar, Segmented, GradientText, useToast, moneyK, money,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import {
  useTwinScenario, setLever, resetScenario, setScenario,
  runMonteCarlo, rankLevers, capacityModel, describeScenario,
  LEVER_META, TWIN_DEALS, TWIN_REPS, QUARTER_PLAN,
  OPEN_PIPELINE, WEIGHTED_PIPELINE, AVG_DEAL, DEFAULT_ITERATIONS,
} from '../lib/twin-data.js';

const ACCENT = 'var(--accent)';

function askRook(prompt) {
  try { window.dispatchEvent(new CustomEvent('rally:rook', { detail: { prompt } })); } catch {}
}

/* Percentile hero tile - the three numbers that replace the single lie. */
function PTile({ tag, value, tone, note }) {
  const color = tone === 'low' ? 'var(--risk)' : tone === 'high' ? 'var(--ok)' : ACCENT;
  return (
    <div className="col gap-1" style={{ minWidth: 0 }}>
      <div className="row gap-1" style={{ alignItems: 'center' }}>
        <span className="dot" style={{ background: color }} />
        <span className="stat-label" style={{ letterSpacing: '.06em' }}>{tag}</span>
      </div>
      <div className="stat-value" style={{ fontSize: 'clamp(2rem, 3.4vw, 2.9rem)', color }}>{moneyK(value)}</div>
      <div className="t-xs muted">{note}</div>
    </div>
  );
}

/* ---------- The confidence fan / distribution histogram (SVG) ---------- */
function FanChart({ sim }) {
  const W = 720, H = 300, padL = 12, padR = 12, padT = 18, padB = 40;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const { bins, peak, min, max, p10, p50, p90, plan } = sim;
  const span = (max - min) || 1;
  const xOf = (v) => padL + ((v - min) / span) * plotW;
  const bw = plotW / bins.length;

  const inBand = (b) => b.x1 >= p10 && b.x0 <= p90;
  const planIn = plan >= min && plan <= max;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }} role="img"
      aria-label={`Booking outcome distribution. P10 ${moneyK(p10)}, P50 ${moneyK(p50)}, P90 ${moneyK(p90)}, plan ${moneyK(plan)}.`}>
      <defs>
        <linearGradient id="twinBar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.95" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id="twinBand" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.05" />
          <stop offset="50%" stopColor={ACCENT} stopOpacity="0.14" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* P10 - P90 confidence band */}
      <rect x={xOf(p10)} y={padT} width={Math.max(1, xOf(p90) - xOf(p10))} height={plotH} fill="url(#twinBand)" />

      {/* baseline */}
      <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke="var(--line)" strokeWidth="1" />

      {/* bars */}
      {bins.map((b, i) => {
        const h = (b.count / peak) * plotH;
        const x = padL + i * bw;
        const y = padT + plotH - h;
        const hot = inBand(b);
        return (
          <rect key={i} x={x + 0.6} y={y} width={Math.max(0.5, bw - 1.2)} height={Math.max(0, h)}
            rx={1.5} fill={hot ? 'url(#twinBar)' : 'var(--n-200)'} opacity={hot ? 1 : 0.7} />
        );
      })}

      {/* P50 marker */}
      <g>
        <line x1={xOf(p50)} y1={padT - 6} x2={xOf(p50)} y2={padT + plotH} stroke={ACCENT} strokeWidth="2" strokeDasharray="0" />
        <rect x={xOf(p50) - 30} y={padT - 20} width="60" height="17" rx="4" fill={ACCENT} />
        <text x={xOf(p50)} y={padT - 8} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">P50</text>
      </g>

      {/* plan marker */}
      {planIn && (
        <g>
          <line x1={xOf(plan)} y1={padT} x2={xOf(plan)} y2={padT + plotH} stroke="var(--ink)" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.75" />
          <text x={xOf(plan)} y={padT + plotH + 30} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--ink-2)">PLAN {moneyK(plan)}</text>
        </g>
      )}

      {/* axis ticks P10 / P90 */}
      <text x={xOf(p10)} y={padT + plotH + 16} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--n-600)">{moneyK(p10)}</text>
      <text x={xOf(p90)} y={padT + plotH + 16} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--n-600)">{moneyK(p90)}</text>
      <text x={padL} y={padT + plotH + 16} textAnchor="start" fontSize="10.5" fill="var(--n-400)">{moneyK(min)}</text>
      <text x={padL + plotW} y={padT + plotH + 16} textAnchor="end" fontSize="10.5" fill="var(--n-400)">{moneyK(max)}</text>
    </svg>
  );
}

/* ---------- A single what-if slider ---------- */
function LeverSlider({ meta, value }) {
  const display = meta.unit === 'reps'
    ? `${value} ${meta.unit}`
    : `${value > 0 && meta.key !== 'discountPolicy' ? '+' : ''}${value}${meta.unit === 'pts' ? ' pts' : meta.unit === '%' ? '%' : ''}`;
  const active = meta.key === 'headcount' ? value !== TWIN_REPS.length : value !== 0;
  return (
    <div className="col gap-1" style={{ padding: '.35rem 0' }}>
      <div className="row between" style={{ alignItems: 'center' }}>
        <div className="row gap-1" style={{ alignItems: 'center', minWidth: 0 }}>
          <span style={{ color: active ? 'var(--accent-600)' : 'var(--n-400)', display: 'inline-flex' }}><Icon name={meta.icon} size={16} /></span>
          <span className="fw-6 t-sm">{meta.label}</span>
        </div>
        <Badge tone={active ? 'accent' : 'default'} className="mono">{display}</Badge>
      </div>
      <input
        type="range" min={meta.min} max={meta.max} step={meta.step} value={value}
        onChange={(e) => setLever(meta.key, e.target.value)}
        aria-label={meta.label}
        className="twin-range"
        style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
      />
      <div className="t-xs muted">{meta.hint}</div>
    </div>
  );
}

export default function Twin() {
  const sc = useTwinScenario();
  const toast = useToast();
  const [iterations, setIterations] = useState(DEFAULT_ITERATIONS);
  const [methodOpen, setMethodOpen] = useState(false);

  // Baseline (no adjustments) vs current scenario - both memoized on inputs.
  const baseline = useMemo(() => runMonteCarlo({
    winRateDelta: 0, cycleTimeDelta: 0, dealSizeDelta: 0,
    headcount: TWIN_REPS.length, discountPolicy: 0, leadVolumeDelta: 0,
  }, iterations), [iterations]);
  const sim = useMemo(() => runMonteCarlo(sc, iterations), [sc, iterations]);
  const levers = useMemo(() => rankLevers(sc, sim.p50), [sc, sim.p50]);
  const cap = useMemo(() => capacityModel(sc), [sc]);

  const shift = sim.p50 - baseline.p50;
  const attn = sim.attainmentProb;
  const attnTone = attn >= 70 ? 'var(--ok)' : attn >= 45 ? 'var(--warn)' : 'var(--risk)';
  const dirty = describeScenario(sc) !== 'baseline pipeline (no adjustments)';

  const rookPrompt = `My revenue digital twin ran ${sim.iterations} simulated quarters on ${sim.deals} open deals under this scenario: ${describeScenario(sc)}. P50 bookings land at ${moneyK(sim.p50)} with a P10-P90 band of ${moneyK(sim.p10)} to ${moneyK(sim.p90)}, and a ${attn}% chance of clearing the ${moneyK(QUARTER_PLAN)} plan. What should I do this week to raise the odds?`;

  return (
    <div className="page-in">
      <PageTitle
        eyebrow="ANALYTICS / TWIN"
        title={<>Revenue <GradientText>Digital Twin</GradientText></>}
        sub="Stop forecasting with one lying number. Simulate thousands of quarters and see the whole distribution."
        action={
          <div className="row gap-1 wrap" style={{ justifyContent: 'flex-end' }}>
            <Button variant="ghost" size="sm" onClick={() => setMethodOpen(true)}>
              <Icon name="activity" size={16} /> Methodology
            </Button>
            <Button variant="accent" size="sm" onClick={() => askRook(rookPrompt)}>
              <Icon name="sparkles" size={16} /> Ask Rook
            </Button>
          </div>
        }
      />

      {/* ------- HERO: fan chart + percentile rail ------- */}
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.7fr) minmax(0, 1fr)', gap: '1.15rem', marginBottom: '1.15rem' }}>
        <Card pad>
          <SectionHeader
            title="Booking outcome distribution"
            sub={`${sim.iterations.toLocaleString()} simulated quarters over ${sim.deals} open deals`}
            action={<Badge tone="accent" className="mono"><Icon name="bolt" size={13} /> {describeScenario(sc) === 'baseline pipeline (no adjustments)' ? 'Baseline' : 'What-if'}</Badge>}
          />
          <FanChart sim={sim} />
          <div className="row gap-2 wrap" style={{ marginTop: '.9rem', justifyContent: 'space-between' }}>
            <div className="row gap-1" style={{ alignItems: 'center' }}>
              <span style={{ width: 26, height: 10, borderRadius: 3, background: 'linear-gradient(180deg,var(--accent),color-mix(in srgb,var(--accent) 45%,transparent))', display: 'inline-block' }} />
              <span className="t-xs muted">Likely range (P10 to P90)</span>
            </div>
            <div className="row gap-1" style={{ alignItems: 'center' }}>
              <span style={{ width: 18, height: 2, background: 'var(--accent)', display: 'inline-block' }} />
              <span className="t-xs muted">P50 median</span>
              <span style={{ width: 18, borderTop: '2px dashed var(--ink)', display: 'inline-block', marginLeft: 8, opacity: .7 }} />
              <span className="t-xs muted">Quota plan</span>
            </div>
          </div>
        </Card>

        <Card pad>
          <div className="row between" style={{ alignItems: 'flex-start' }}>
            <div className="col gap-1">
              <div className="stat-label">Plan attainment odds</div>
              <div className="t-xs muted">Chance of clearing {moneyK(QUARTER_PLAN)}</div>
            </div>
            <Ring value={attn} size={78} stroke={9} color={attnTone} label={<span style={{ fontSize: 19 }}>{attn}%</span>} />
          </div>
          <div style={{ height: 1, background: 'var(--line)', margin: '1.05rem 0' }} />
          <div className="col gap-3">
            <PTile tag="P10 - Downside" value={sim.p10} tone="low" note="Only 10% of quarters land below this." />
            <PTile tag="P50 - Median" value={sim.p50} tone="mid" note="The honest middle. Half above, half below." />
            <PTile tag="P90 - Upside" value={sim.p90} tone="high" note="Reachable if the breaks go your way." />
          </div>
          <div style={{ height: 1, background: 'var(--line)', margin: '1.05rem 0 .9rem' }} />
          <div className="row between">
            <span className="t-sm muted">P50 vs plan</span>
            <span className="fw-7 mono" style={{ color: sim.planDelta >= 0 ? 'var(--ok)' : 'var(--risk)' }}>
              {sim.planDelta >= 0 ? '+' : ''}{moneyK(sim.planDelta)}
            </span>
          </div>
          {dirty && (
            <div className="row between" style={{ marginTop: 6 }}>
              <span className="t-sm muted">P50 vs baseline</span>
              <span className="fw-7 mono" style={{ color: shift >= 0 ? 'var(--ok)' : 'var(--risk)' }}>
                {shift >= 0 ? '+' : ''}{moneyK(shift)}
              </span>
            </div>
          )}
        </Card>
      </div>

      {/* ------- CONTROLS: sliders + levers ------- */}
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.15rem', marginBottom: '1.15rem' }}>
        <Card pad>
          <SectionHeader
            title="What-if levers"
            sub="Drag any lever. The whole distribution re-runs live."
            action={
              <Button variant="quiet" size="sm" onClick={() => { resetScenario(); toast('Scenario reset to baseline'); }} disabled={!dirty}>
                <Icon name="rotateCcw" size={15} /> Reset
              </Button>
            }
          />
          <div className="col" style={{ gap: '.15rem' }}>
            {LEVER_META.map(meta => (
              <LeverSlider key={meta.key} meta={meta} value={sc[meta.key]} />
            ))}
          </div>
          <div className="row gap-1 wrap" style={{ marginTop: '.9rem' }}>
            <Button variant="ghost" size="sm" onClick={() => { setScenario({ winRateDelta: 8, leadVolumeDelta: 20 }); toast('Loaded: aggressive growth'); }}>
              <Icon name="rocket" size={14} /> Growth case
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setScenario({ cycleTimeDelta: 25, winRateDelta: -6, leadVolumeDelta: -10 }); toast('Loaded: soft quarter'); }}>
              <Icon name="arrowDown" size={14} /> Soft quarter
            </Button>
          </div>
        </Card>

        <Card pad>
          <SectionHeader
            title="Highest-impact levers"
            sub="Which single move lifts the median (P50) most, from here."
            action={<Badge tone="accent"><Icon name="zap" size={13} /> ranked</Badge>}
          />
          <div className="col gap-2">
            {levers.map((lv, i) => {
              const pos = lv.delta >= 0;
              const magnitude = Math.max(...levers.map(l => Math.abs(l.delta)), 1);
              const pct = Math.round((Math.abs(lv.delta) / magnitude) * 100);
              return (
                <div key={lv.key} className="col gap-1">
                  <div className="row between" style={{ alignItems: 'center' }}>
                    <div className="row gap-1" style={{ alignItems: 'center', minWidth: 0 }}>
                      <span className="badge" style={{ width: 22, height: 22, padding: 0, justifyContent: 'center', background: i === 0 ? 'var(--accent-50)' : 'var(--n-100)', color: i === 0 ? 'var(--accent-600)' : 'var(--ink-2)' }}>{i + 1}</span>
                      <span style={{ color: 'var(--accent-600)', display: 'inline-flex' }}><Icon name={lv.icon} size={15} /></span>
                      <span className="fw-6 t-sm clip">{lv.label}</span>
                    </div>
                    <span className="fw-7 mono t-sm" style={{ color: pos ? 'var(--ok)' : 'var(--risk)' }}>
                      {pos ? '+' : ''}{moneyK(lv.delta)}
                    </span>
                  </div>
                  <ProgressBar value={pct} color={pos ? 'var(--ok)' : 'var(--risk)'} height={6} />
                </div>
              );
            })}
          </div>
          <button
            className="link t-sm"
            style={{ marginTop: '.9rem', background: 'none', border: 'none', padding: 0, textAlign: 'left' }}
            onClick={() => askRook(`My revenue twin says the highest-impact lever right now is "${levers[0]?.label}" (adds ${moneyK(levers[0]?.delta || 0)} to P50). Build me a 2-week plan to pull that lever.`)}
          >
            <Icon name="sparkles" size={14} /> Ask Rook to action the top lever
          </button>
        </Card>
      </div>

      {/* ------- CAPACITY MODEL ------- */}
      <Card pad style={{ marginBottom: '1.15rem' }}>
        <SectionHeader
          title="Rep-capacity model"
          sub={`${cap.totalLoad} deals in flight against ${cap.totalCap} of capacity across ${cap.headcount} reps`}
          action={
            <Badge tone={cap.overloaded ? 'risk' : cap.utilization > 85 ? 'warn' : 'ok'}>
              {cap.overloaded ? <><Icon name="bell" size={13} /> Overloaded</> : `${cap.utilization}% utilized`}
            </Badge>
          }
        />
        {cap.overloaded && (
          <div className="row gap-1" style={{ alignItems: 'center', padding: '.65rem .85rem', borderRadius: 'var(--r-sm)', background: 'var(--risk-bg)', color: 'var(--risk)', marginBottom: '.9rem' }}>
            <Icon name="bell" size={16} />
            <span className="t-sm fw-6">Pipeline exceeds capacity. Overloaded reps convert worse, which is already dragging the win probability in the sim above. Add headcount or shed low-probability deals.</span>
          </div>
        )}
        <div className="col gap-2">
          {cap.rows.map(r => (
            <div key={r.id} className="row gap-2" style={{ alignItems: 'center' }}>
              <div style={{ width: 150, minWidth: 120 }}>
                <div className="fw-6 t-sm clip">{r.name}</div>
                <div className="t-xs muted">{r.title}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <ProgressBar value={Math.min(100, r.load)} color={r.overloaded ? 'var(--risk)' : r.load > 85 ? 'var(--warn)' : 'var(--accent)'} height={9} />
              </div>
              <div className="mono t-sm" style={{ width: 92, textAlign: 'right', color: r.overloaded ? 'var(--risk)' : 'var(--ink-2)' }}>
                {r.inFlight}/{r.capacity} {r.overloaded && <Icon name="bell" size={12} />}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ------- FOOTER STRIP: pipeline facts + positioning ------- */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.15rem', marginBottom: '1.15rem' }}>
        <Card pad>
          <div className="stat-label">Open pipeline</div>
          <div className="stat-value" style={{ fontSize: 'clamp(1.7rem,2.6vw,2.2rem)' }}>{moneyK(OPEN_PIPELINE)}</div>
          <div className="t-xs muted">{TWIN_DEALS.length} deals the twin simulates over</div>
        </Card>
        <Card pad>
          <div className="stat-label">Weighted (naive)</div>
          <div className="stat-value" style={{ fontSize: 'clamp(1.7rem,2.6vw,2.2rem)' }}>{moneyK(WEIGHTED_PIPELINE)}</div>
          <div className="t-xs muted">The single number every CRM stops at</div>
        </Card>
        <Card pad>
          <div className="stat-label">Twin P50</div>
          <div className="stat-value" style={{ fontSize: 'clamp(1.7rem,2.6vw,2.2rem)', color: 'var(--accent)' }}>{moneyK(sim.p50)}</div>
          <div className="t-xs muted">The honest median, with a band around it</div>
        </Card>
        <Card pad>
          <div className="stat-label">Avg deals won / sim</div>
          <div className="stat-value" style={{ fontSize: 'clamp(1.7rem,2.6vw,2.2rem)' }}>{sim.avgWins}</div>
          <div className="t-xs muted">Across {sim.iterations.toLocaleString()} simulated quarters</div>
        </Card>
      </div>

      <Card pad className="grad-accent" style={{ color: '#fff', border: 'none' }}>
        <div className="row between wrap" style={{ gap: '1rem', alignItems: 'center' }}>
          <div className="col gap-1" style={{ minWidth: 260, flex: 1 }}>
            <div className="eyebrow" style={{ color: 'rgba(255,255,255,.85)' }}>Category-defining</div>
            <h3 style={{ margin: 0, color: '#fff' }}>A forecast is a distribution, not a promise.</h3>
            <div className="t-sm" style={{ color: 'rgba(255,255,255,.9)', maxWidth: 620 }}>
              Every other platform hands the board one weighted number and hopes. Ardovo hands them a range, the odds, and the exact lever that moves it. That is revenue intelligence.
            </div>
          </div>
          <div className="row gap-1" style={{ flex: 'none' }}>
            <Button variant="ghost" as={Link} to="/forecasting" style={{ background: 'rgba(255,255,255,.15)', borderColor: 'rgba(255,255,255,.3)', color: '#fff' }}>
              Forecasting <Icon name="arrowRight" size={16} />
            </Button>
          </div>
        </div>
      </Card>

      <div className="row" style={{ marginTop: '.9rem', flexWrap: 'wrap', gap: '.4rem' }}>
        <Segmented
          options={[{ value: 800, label: 'Fast (800)' }, { value: 1600, label: 'Balanced (1.6k)' }, { value: 3000, label: 'Precise (3k)' }]}
          value={iterations}
          onChange={setIterations}
        />
        <span className="t-xs muted" style={{ alignSelf: 'center', marginLeft: 8 }}>More iterations = smoother distribution, same deterministic seed.</span>
      </div>

      {/* ------- Methodology modal ------- */}
      <Modal open={methodOpen} onClose={() => setMethodOpen(false)} title="How the twin works" width={620}>
        <div className="col gap-3">
          <p className="t-sm" style={{ lineHeight: 1.6 }}>
            The twin runs a Monte Carlo simulation over your open pipeline. In each of thousands of simulated quarters, every deal either lands or does not, decided by a pseudo-random draw against its win probability. Summing the winners gives one possible quarter; running it thousands of times gives a full distribution of outcomes.
          </p>
          <div className="col gap-2">
            {[
              ['Stage probability', 'Each deal starts at its stage win rate (Qualified 25% up to Negotiation 85%).'],
              ['Cycle-time window', 'A deal only counts if it is likely to close inside the 90-day quarter. Longer cycles push probability out of the window.'],
              ['What-if levers', 'Win-rate, deal size, cycle time, discount policy, lead volume, and headcount each reshape the draw and re-run the sim instantly.'],
              ['Capacity drag', 'When deals in flight exceed rep capacity, conversion is penalized in the sim, so the median falls.'],
              ['Deterministic seed', 'A fixed mulberry32 seed means the same scenario always yields the same distribution. Reload-stable, no randomness leaks in.'],
            ].map(([h, b]) => (
              <div key={h} className="row gap-2" style={{ alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--accent-600)', marginTop: 2 }}><Icon name="check" size={16} /></span>
                <div><span className="fw-7 t-sm">{h}. </span><span className="t-sm muted">{b}</span></div>
              </div>
            ))}
          </div>
          <div className="t-xs muted" style={{ borderTop: '1px solid var(--line)', paddingTop: '.8rem' }}>
            Plan target {money(QUARTER_PLAN)} = sum of rep quarterly quotas. Average deal size {money(AVG_DEAL)}.
          </div>
        </div>
      </Modal>
    </div>
  );
}
