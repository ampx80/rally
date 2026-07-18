// ============================================================
// ARDOVO ATTRIBUTION  (route /attribution, nav group Analytics)
// Two surfaces on one page:
//   1. ATTRIBUTION - campaign + channel influence over won revenue and
//      open pipeline, switchable across four attribution models
//      (first / last / multi-touch / position). Channel breakdown,
//      sourced mix, a model-comparison matrix and real campaign
//      influence, all computed deterministically from the seeded book
//      by src/lib/attribution.js.
//   2. CROSS-OBJECT REPORTS - a demo surface for the additive joined
//      report registry (src/lib/report-types.js): pick a join type, a
//      group-by, a measure + aggregation and see it rendered through
//      the existing VizPreview. Shows how the ReportBuilder can consume
//      report-types.js without any change to the builder itself.
// Additive, read-only, deterministic. ASCII only. NO em-dash / en-dash.
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, PieChart, Pie,
} from 'recharts';
import {
  Card, Badge, Segmented, Field, Select, Button, SectionHeader, Tabs,
  Ring, ProgressBar, AnimatedNumber, moneyK, shortDate, useToast,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import PageTransition from '../components/motion/PageTransition.jsx';
import Reveal from '../components/motion/Reveal.jsx';
import AnimatedStat from '../components/motion/AnimatedStat.jsx';
import VizPreview from '../components/reports2/VizPreview.jsx';
import { useStore } from '../lib/store.js';
import { useMarketing } from '../lib/marketing-campaigns.js';
import {
  ATTR_MODELS, ATTR_SCOPES, computeAttribution, compareModels, campaignInfluence,
} from '../lib/attribution.js';
import {
  JOIN_TYPES, joinTypeById, dimsForJoin, measuresForJoin, aggsForJoin,
  emptyJoinDef, reconcileJoinDef, runJoinedReport, joinedToCsv, formatValue,
} from '../lib/report-types.js';
import { downloadCsv } from '../lib/report-builder.js';

/* Respect reduced-motion for the recharts draw-in (the motion.css classes
   handle their own components; recharts we gate here). */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const h = () => setReduced(mq.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  return reduced;
}

const money = (v) => formatValue(v, 'money');

/* ---------- channel bar tooltip ---------- */
function ChannelTip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: 'var(--paper)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow-md)', padding: '.6rem .75rem', fontSize: '.84rem', minWidth: 150 }}>
      <div className="row gap-1" style={{ alignItems: 'center', marginBottom: 4 }}>
        <span className="dot" style={{ background: d.color }} /><span className="fw-7">{d.label}</span>
      </div>
      <div className="row between gap-2"><span style={{ color: 'var(--n-600)' }}>Attributed</span><span className="fw-7 tnum">{money(d.credit)}</span></div>
      <div className="row between gap-2"><span style={{ color: 'var(--n-600)' }}>Share</span><span className="fw-7 tnum">{Math.round(d.share * 100)}%</span></div>
      <div className="row between gap-2"><span style={{ color: 'var(--n-600)' }}>Deals touched</span><span className="fw-7 tnum">{d.deals}</span></div>
    </div>
  );
}

/* ============================================================
   ATTRIBUTION TAB
   ============================================================ */
function AttributionTab() {
  const snap = useStore();     // whole-state snapshot: new ref on every commit
  const mkt = useMarketing();  // marketing snapshot: new ref on every campaign commit
  const reduced = usePrefersReducedMotion();
  const [scope, setScope] = useState('won');
  const [model, setModel] = useState('linear');

  const attr = useMemo(() => computeAttribution({ model, scope }), [model, scope, snap, mkt]);
  const comparison = useMemo(() => compareModels({ scope }), [scope, snap, mkt]);
  const campaigns = useMemo(() => campaignInfluence(), [snap, mkt]);
  const scopeMeta = ATTR_SCOPES.find(s => s.id === scope) || ATTR_SCOPES[0];
  const modelMeta = ATTR_MODELS.find(m => m.id === model) || ATTR_MODELS[2];
  const top = attr.channels[0];
  const chartH = Math.max(200, attr.channels.length * 40 + 30);

  return (
    <div className="col gap-3">
      {/* controls */}
      <Card className="row between wrap gap-3" style={{ alignItems: 'flex-end' }}>
        <div className="col gap-1" style={{ minWidth: 0 }}>
          <span className="fw-7">Attribution model</span>
          <span className="muted t-sm">{modelMeta.desc}</span>
        </div>
        <div className="row gap-3 wrap" style={{ alignItems: 'flex-end' }}>
          <Field label="Attribute"><Segmented options={ATTR_SCOPES.map(s => ({ value: s.id, label: s.label }))} value={scope} onChange={setScope} /></Field>
          <Field label="Model"><Segmented options={ATTR_MODELS.map(m => ({ value: m.id, label: m.label }))} value={model} onChange={setModel} /></Field>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
        <AnimatedStat label={scopeMeta.label + ' attributed'} value={attr.total} format={moneyK} icon={<Icon name="dollar" size={18} />} accent="#5b4bf5" />
        <AnimatedStat label={scope === 'won' ? 'Won deals' : 'Open deals'} value={attr.dealCount} icon={<Icon name="target" size={18} />} accent="#0ea5a3" />
        <AnimatedStat label="Avg touches / deal" value={Number(attr.avgTouches.toFixed(1))} icon={<Icon name="activity" size={18} />} accent="#e0752d" sub="acquisition + campaigns + sales" />
        <AnimatedStat label="Multi-touch deals" value={Math.round(attr.multiTouchShare * 100)} format={(n) => `${Math.round(n)}%`} icon={<Icon name="layers" size={18} />} accent="#8b3fd4" sub="reached by 2+ channels" />
      </div>

      {/* channel breakdown + sourced mix */}
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.7fr) minmax(0, 1fr)', gap: '1rem', alignItems: 'stretch' }}>
        <Reveal>
          <Card className="col gap-2" style={{ height: '100%' }}>
            <SectionHeader title="Channel attribution" sub={`${modelMeta.label} credit across ${attr.channels.length} channels`} />
            {attr.channels.length === 0 ? (
              <div className="muted" style={{ padding: '2.5rem 0', textAlign: 'center' }}>No {scopeMeta.label.toLowerCase()} to attribute yet.</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={chartH}>
                  <BarChart layout="vertical" data={attr.channels} margin={{ top: 4, right: 24, left: 6, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => formatValue(v, 'money')} tick={{ fontSize: 12, fill: 'var(--n-600)' }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="label" width={104} tick={{ fontSize: 12, fill: 'var(--n-600)' }} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChannelTip />} cursor={{ fill: 'rgba(91,75,245,.06)' }} />
                    <Bar dataKey="credit" radius={[0, 5, 5, 0]} maxBarSize={26} isAnimationActive={!reduced}>
                      {attr.channels.map(c => <Cell key={c.id} fill={c.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {/* channel table */}
                <div style={{ overflowX: 'auto', marginTop: '.4rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.9rem' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--line)' }}>
                        <th style={{ padding: '.45rem .5rem', color: 'var(--n-600)', fontWeight: 700 }}>Channel</th>
                        <th style={{ padding: '.45rem .5rem', color: 'var(--n-600)', fontWeight: 700, textAlign: 'right' }}>Attributed</th>
                        <th style={{ padding: '.45rem .5rem', color: 'var(--n-600)', fontWeight: 700, textAlign: 'right' }}>Deals</th>
                        <th style={{ padding: '.45rem .5rem', color: 'var(--n-600)', fontWeight: 700, width: '26%' }}>Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attr.channels.map(c => (
                        <tr key={c.id} style={{ borderBottom: '1px solid var(--line)' }}>
                          <td style={{ padding: '.45rem .5rem' }}>
                            <span className="row gap-2" style={{ alignItems: 'center' }}>
                              <span className="dot" style={{ background: c.color }} />{c.label}
                              <Badge tone={c.kind === 'marketing' ? 'accent' : 'default'} className="t-xs">{c.kind}</Badge>
                            </span>
                          </td>
                          <td style={{ padding: '.45rem .5rem', textAlign: 'right', fontWeight: 700 }} className="tnum">{money(c.credit)}</td>
                          <td style={{ padding: '.45rem .5rem', textAlign: 'right' }} className="tnum">{c.deals}</td>
                          <td style={{ padding: '.45rem .5rem' }}>
                            <div className="row gap-2" style={{ alignItems: 'center' }}>
                              <ProgressBar value={c.share * 100} color={c.color} height={7} />
                              <span className="tnum t-xs muted" style={{ width: 34, textAlign: 'right' }}>{Math.round(c.share * 100)}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>
        </Reveal>

        <Reveal delay={80}>
          <Card className="col gap-2" style={{ height: '100%' }}>
            <SectionHeader title="Sourced mix" sub="First-touch origin of the revenue" />
            <div className="row center" style={{ gap: '1.25rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: 150, height: 150, flex: 'none' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={attr.sourcedMix.length ? attr.sourcedMix : [{ label: 'None', value: 1, color: 'var(--n-200)' }]}
                      dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={44} outerRadius={70} paddingAngle={2} isAnimationActive={!reduced}>
                      {(attr.sourcedMix.length ? attr.sourcedMix : [{ color: 'var(--n-200)' }]).map((s, i) => <Cell key={i} fill={s.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.25rem' }}>{Math.round(attr.marketingSourced * 100)}%</div>
                  <div className="t-xs muted">marketing</div>
                </div>
              </div>
              <div className="col gap-2" style={{ minWidth: 140, flex: 1 }}>
                {attr.sourcedMix.map(s => (
                  <div key={s.kind} className="row between gap-2">
                    <span className="row gap-2" style={{ alignItems: 'center' }}><span className="dot" style={{ background: s.color }} />{s.label}</span>
                    <span className="fw-7 tnum">{Math.round(s.share * 100)}%</span>
                  </div>
                ))}
                {attr.sourcedMix.length === 0 && <span className="muted t-sm">No data in scope.</span>}
              </div>
            </div>
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: '.75rem', marginTop: '.25rem' }} className="col gap-1">
              <span className="t-xs muted">Top channel ({modelMeta.label})</span>
              {top ? (
                <div className="row between gap-2">
                  <span className="row gap-2" style={{ alignItems: 'center', fontWeight: 700 }}><span className="dot" style={{ background: top.color }} />{top.label}</span>
                  <span className="fw-7 tnum">{money(top.credit)}</span>
                </div>
              ) : <span className="muted t-sm">-</span>}
            </div>
          </Card>
        </Reveal>
      </div>

      {/* model comparison matrix */}
      <Reveal>
        <Card className="col gap-2">
          <SectionHeader title="Model comparison" sub={`How ${scopeMeta.label.toLowerCase()} credit shifts across all four models`} />
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.9rem', minWidth: 520 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--line)' }}>
                  <th style={{ padding: '.5rem .55rem', color: 'var(--n-600)', fontWeight: 700 }}>Channel</th>
                  {ATTR_MODELS.map(m => (
                    <th key={m.id} style={{ padding: '.5rem .55rem', textAlign: 'right', fontWeight: 700, color: m.id === model ? 'var(--accent-600)' : 'var(--n-600)' }}>
                      {m.label}{m.id === model ? ' *' : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparison.channels.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '.45rem .55rem' }}>
                      <span className="row gap-2" style={{ alignItems: 'center' }}><span className="dot" style={{ background: c.color }} />{c.label}</span>
                    </td>
                    {ATTR_MODELS.map(m => (
                      <td key={m.id} className="tnum" style={{ padding: '.45rem .55rem', textAlign: 'right', fontWeight: m.id === model ? 700 : 500, background: m.id === model ? 'color-mix(in srgb, var(--accent) 7%, transparent)' : 'transparent' }}>
                        {money(c[m.id])}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid var(--line)' }}>
                  <td style={{ padding: '.5rem .55rem', fontWeight: 700 }}>Total</td>
                  {ATTR_MODELS.map(m => (
                    <td key={m.id} className="tnum" style={{ padding: '.5rem .55rem', textAlign: 'right', fontWeight: 700 }}>{money(comparison.totals[m.id])}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <span className="t-xs muted">Every model attributes the same total; only the distribution across channels changes. * is the model shown above.</span>
        </Card>
      </Reveal>

      {/* campaign influence */}
      <Reveal>
        <div className="col gap-2">
          <SectionHeader title="Campaign influence" sub="Real marketing sends and the pipeline they touched" />
          {campaigns.length === 0 ? (
            <Card><span className="muted">No campaigns have been sent yet. Send one from the Campaigns hub to see its influence here.</span></Card>
          ) : (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {campaigns.map(c => (
                <Card key={c.id} className="col gap-2">
                  <div className="row between" style={{ alignItems: 'flex-start' }}>
                    <span className="row center" style={{ width: 34, height: 34, borderRadius: 9, background: 'color-mix(in srgb, var(--accent) 14%, transparent)', color: 'var(--accent-600)', flex: 'none' }}>
                      <Icon name="megaphone" size={17} />
                    </span>
                    <Badge>Sent {shortDate(c.sentAt)}</Badge>
                  </div>
                  <div className="col gap-1" style={{ minWidth: 0 }}>
                    <span className="fw-7 clip">{c.name}</span>
                    <span className="muted t-xs">Reached {c.reached.toLocaleString()} contacts</span>
                  </div>
                  <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '.5rem', borderTop: '1px solid var(--line)', paddingTop: '.6rem' }}>
                    <div className="col"><span className="t-xs muted">Won influenced</span><span className="fw-7 tnum">{moneyK(c.wonValue)}</span></div>
                    <div className="col"><span className="t-xs muted">Open pipeline</span><span className="fw-7 tnum">{moneyK(c.openPipeline)}</span></div>
                    <div className="col"><span className="t-xs muted">Won deals</span><span className="fw-7 tnum">{c.wonDeals}</span></div>
                    <div className="col"><span className="t-xs muted">Attributed (multi)</span><span className="fw-7 tnum">{moneyK(c.attributedCredit)}</span></div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Reveal>

      <span className="t-xs muted" style={{ lineHeight: 1.5 }}>
        Touches are built per deal from three real signals: an acquisition source derived from the deal's contacts
        (referral / inbound / event tags, stable hash fallback), marketing campaigns that reached a deal contact inside
        the deal's live window, and sales calls / emails / meetings logged on the deal. Deterministic over the current book.
      </span>
    </div>
  );
}

/* ============================================================
   CROSS-OBJECT REPORTS TAB  (report-types.js demo surface)
   ============================================================ */
function CrossObjectTab() {
  const snap = useStore(); // whole-state snapshot: new ref on every commit
  const toast = useToast();
  const [def, setDef] = useState(() => emptyJoinDef(JOIN_TYPES[0].id));
  const type = joinTypeById(def.type);
  const dims = dimsForJoin(def.type);
  const measures = measuresForJoin(def.type);
  const aggs = aggsForJoin(def.type);
  const computed = useMemo(() => runJoinedReport(def), [def, snap]);
  const patch = (p) => setDef(d => reconcileJoinDef({ ...d, ...p }));

  const onExport = () => { downloadCsv(`${type.label}-by-${def.dim}`, joinedToCsv(computed)); toast('CSV exported'); };

  const VIZ = [{ value: 'bar', label: 'Bar' }, { value: 'pie', label: 'Donut' }, { value: 'table', label: 'Table' }];

  return (
    <div className="col gap-3">
      <Card className="col gap-2" style={{ borderLeft: '3px solid var(--accent)' }}>
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <Icon name="gitBranch" size={17} style={{ color: 'var(--accent-600)' }} />
          <span className="fw-7">Report across joined objects</span>
          <Badge tone="accent">Beta</Badge>
        </div>
        <span className="muted t-sm">
          The single-object Report Builder cannot span two records at once. These joined report types flatten a
          relationship into reportable rows so you can group across objects. Powered by the additive
          <span className="tnum"> src/lib/report-types.js</span> registry.
        </span>
      </Card>

      {/* type picker */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '.85rem' }}>
        {JOIN_TYPES.map(t => {
          const on = t.id === def.type;
          return (
            <Card key={t.id} hover className="col gap-1" onClick={() => setDef(emptyJoinDef(t.id))}
              style={{ cursor: 'pointer', borderColor: on ? 'var(--accent)' : undefined, boxShadow: on ? 'var(--accent-glow)' : undefined }}>
              <div className="row between" style={{ alignItems: 'flex-start' }}>
                <span className="row center" style={{ width: 30, height: 30, borderRadius: 8, background: 'color-mix(in srgb, var(--accent) 14%, transparent)', color: 'var(--accent-600)', flex: 'none' }}>
                  <Icon name={t.icon} size={16} />
                </span>
                {on && <Badge tone="accent">Selected</Badge>}
              </div>
              <span className="fw-7">{t.label}</span>
              <span className="muted t-xs">{t.desc}</span>
            </Card>
          );
        })}
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) 260px', gap: '1rem', alignItems: 'start' }}>
        <Reveal>
          <Card className="col gap-2">
            <div className="row between wrap gap-2">
              <div className="col gap-1" style={{ minWidth: 0 }}>
                <span className="fw-7">{type.label}</span>
                <span className="muted t-xs">{computed.recordCount.toLocaleString()} joined rows, {computed.rows.length} groups</span>
              </div>
              <Button variant="ghost" size="sm" onClick={onExport}><Icon name="download" size={15} /> Export CSV</Button>
            </div>
            <VizPreview def={{ viz: def.viz }} computed={computed} height={320} />
            <div className="row between" style={{ borderTop: '1px solid var(--line)', paddingTop: '.6rem' }}>
              <span className="muted t-sm">{computed.dimLabel} - {computed.measureLabel}</span>
              <span className="fw-7 tnum">{formatValue(computed.kpi, computed.valueFormat)}</span>
            </div>
          </Card>
        </Reveal>

        <Card className="col gap-2">
          <span className="t-xs fw-7" style={{ color: 'var(--n-600)' }}>CONFIGURE</span>
          <Field label="Report type">
            <Select value={def.type} onChange={e => setDef(emptyJoinDef(e.target.value))}>
              {JOIN_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </Select>
          </Field>
          <Field label="Group by">
            <Select value={def.dim} onChange={e => patch({ dim: e.target.value })}>
              {dims.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
            </Select>
          </Field>
          <Field label="Aggregation">
            <Select value={def.agg} onChange={e => {
              const agg = e.target.value;
              if (agg === 'count') patch({ agg, measure: null });
              else patch({ agg, measure: def.measure || measures[0]?.id || null });
            }}>
              {aggs.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
            </Select>
          </Field>
          {def.agg !== 'count' && measures.length > 0 && (
            <Field label="Measure">
              <Select value={def.measure || ''} onChange={e => patch({ measure: e.target.value })}>
                {measures.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </Select>
            </Field>
          )}
          {measures.length === 0 && <span className="t-xs muted">This join has no numeric field, so only record count is available.</span>}
          <Field label="Chart"><Segmented options={VIZ} value={def.viz} onChange={(v) => setDef(d => ({ ...d, viz: v }))} /></Field>
        </Card>
      </div>
    </div>
  );
}

/* ============================================================
   PAGE
   ============================================================ */
export default function Attribution() {
  const [tab, setTab] = useState('attribution');
  return (
    <PageTransition className="col gap-3">
      <SectionHeader
        eyebrow="Analytics"
        title="Attribution"
        sub="See which campaigns and channels produced the revenue, and report across joined objects."
      />
      <Tabs
        tabs={[{ key: 'attribution', label: 'Attribution' }, { key: 'cross-object', label: 'Cross-object reports' }]}
        active={tab} onChange={setTab}
      />
      {tab === 'attribution' ? <AttributionTab /> : <CrossObjectTab />}
    </PageTransition>
  );
}
