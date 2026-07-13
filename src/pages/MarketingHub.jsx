// ============================================================
// MARKETING HUB  (route: /markethub, module key: markethub)
//
// The front door to Rally's marketing engine. Every marketing surface
// already exists in pieces (Campaigns, Sequences, Automations, Ads,
// Social, Funnels, Forms, Landing pages, Reviews); this page is the
// command center that ties them together AND fills the last gap:
// a real, configurable LEAD SCORING model with grades, decay and a
// live scored leaderboard - the glue HubSpot charges $3,600/mo for.
//
// Four tabs: Overview (cockpit + attribution + quick-launch),
// Lead scoring (rules builder + leaderboard + distribution),
// Calendar (month view of every scheduled marketing touch),
// Segments (live audiences). 100% local-first, deterministic, alive
// with zero backend. Reads store.js + marketing-engine.js; the only
// persisted state is the editable scoring config (markethub-data.js).
//
// ASCII only. NO em-dash / en-dash.
// ============================================================
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store.js';
import { useMarketingEngine } from '../lib/marketing-engine.js';
import {
  useMarketHub, getRules, resetScoring,
  setRulePoints, toggleRule, setDecay, setBandMin, addDemographicRule, removeRule,
  scoredContacts, scoreDistribution, gradeFor,
  channelPerformance, marketingRoi, spendRevenueSeries, funnelModel,
  attributionModel, topContent, segmentOverview, QUICK_LAUNCH,
  calendarItemsFor, buildMonthGrid, calTypeById, CAL_TYPES,
  contactName,
} from '../lib/markethub-data.js';
import {
  Button, Card, Badge, Avatar, PageTitle, SectionHeader, Tabs, Segmented,
  Field, Input, Select, Modal, ProgressBar, Sparkline, GradientText,
  StatCard, EmptyState, useToast, money, moneyK,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';

/* ---------- helpers ---------- */
const compact = (n) => {
  if (n == null) return '-';
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toFixed(a % 1e6 === 0 ? 0 : 1) + 'M';
  if (a >= 1e3) return (n / 1e3).toFixed(a >= 1e4 ? 0 : 1) + 'K';
  return String(Math.round(n));
};
const roasFmt = (n) => (n || 0).toFixed(1) + 'x';
const roasColor = (n) => (n >= 3 ? 'var(--ok)' : n >= 1 ? 'var(--warn)' : 'var(--risk)');
function askRook(prompt) {
  try { window.dispatchEvent(new CustomEvent('rally:rook', { detail: { prompt } })); } catch {}
}
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function GradePill({ grade, size = 'md' }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size === 'sm' ? 24 : 30, height: size === 'sm' ? 24 : 30, borderRadius: 8,
      background: grade.color, color: '#fff', fontWeight: 800,
      fontSize: size === 'sm' ? '.82rem' : '.98rem', flex: 'none', letterSpacing: '-.02em',
    }}>{grade.grade}</span>
  );
}

/* ============================================================
   OVERVIEW - spend vs marketing-sourced revenue chart
   ============================================================ */
function SpendRevenueChart({ series }) {
  const W = 720, H = 220, padL = 44, padR = 8, padT = 14, padB = 28;
  const max = Math.max(1, ...series.flatMap(s => [s.spend, s.revenue]));
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const groupW = plotW / series.length;
  const bw = Math.min(26, groupW / 3);
  const y = (v) => padT + plotH - (v / max) * plotH;
  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', minWidth: 460 }} role="img" aria-label="Spend versus marketing-sourced revenue by month">
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
          const yy = padT + plotH - f * plotH;
          return <g key={i}>
            <line x1={padL} y1={yy} x2={W - padR} y2={yy} stroke="var(--line)" strokeWidth="1" />
            <text x={padL - 6} y={yy + 3} textAnchor="end" fontSize="9.5" fill="var(--n-400)" className="mono">{compact(max * f)}</text>
          </g>;
        })}
        {series.map((s, i) => {
          const gx = padL + i * groupW + groupW / 2;
          return <g key={i}>
            <rect x={gx - bw - 2} y={y(s.spend)} width={bw} height={padT + plotH - y(s.spend)} rx="3" fill="var(--n-400)" opacity="0.6" />
            <rect x={gx + 2} y={y(s.revenue)} width={bw} height={padT + plotH - y(s.revenue)} rx="3" fill="var(--accent)" />
            <text x={gx} y={H - 9} textAnchor="middle" fontSize="10" fill="var(--n-600)">{s.label}</text>
          </g>;
        })}
      </svg>
      <div className="row gap-3" style={{ paddingLeft: padL, marginTop: 4 }}>
        <span className="row gap-1 t-xs muted"><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--n-400)' }} /> Spend</span>
        <span className="row gap-1 t-xs muted"><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--accent)' }} /> Sourced revenue</span>
      </div>
    </div>
  );
}

function Funnel({ rows }) {
  const max = Math.max(1, ...rows.map(r => r.value));
  return (
    <div className="col gap-1">
      {rows.map((r, i) => (
        <div key={r.key} className="row gap-2" style={{ alignItems: 'center' }}>
          <div style={{ width: 96, flex: 'none', textAlign: 'right' }} className="t-sm fw-6 clip">{r.label}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ height: 30, borderRadius: 7, background: r.color, width: `${Math.max(6, (r.value / max) * 100)}%`, display: 'flex', alignItems: 'center', paddingLeft: 10, color: '#fff', fontWeight: 800, fontSize: '.92rem', transition: 'width .6s var(--ease)' }} className="tnum">
              {r.value.toLocaleString()}
            </div>
          </div>
          <div style={{ width: 54, flex: 'none' }} className="t-xs muted tnum">{i === 0 ? '' : r.conv + '%'}</div>
        </div>
      ))}
    </div>
  );
}

function AttributionBar({ rows, mode }) {
  const key = mode;
  const total = rows.reduce((s, r) => s + r[key], 0) || 1;
  return (
    <div className="col gap-2">
      <div className="row" style={{ height: 22, borderRadius: 6, overflow: 'hidden', width: '100%' }}>
        {rows.map(r => {
          const pct = (r[key] / total) * 100;
          if (pct < 0.5) return null;
          return <div key={r.channel.id} title={`${r.channel.label} ${pct.toFixed(0)}%`} style={{ width: `${pct}%`, background: r.channel.color, height: '100%' }} />;
        })}
      </div>
      <div className="row wrap gap-2">
        {rows.slice(0, 6).map(r => (
          <span key={r.channel.id} className="row gap-1 t-xs">
            <span style={{ width: 9, height: 9, borderRadius: 2, background: r.channel.color, flex: 'none' }} />
            <span className="fw-6">{r.channel.label}</span>
            <span className="muted tnum">{Math.round((r[key] / total) * 100)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function OverviewTab() {
  const roi = marketingRoi();
  const chans = channelPerformance();
  const series = spendRevenueSeries();
  const rules = getRules();
  const funnel = useMemo(() => funnelModel(rules), [rules]);
  const attribution = attributionModel();
  const content = topContent();
  const [attrMode, setAttrMode] = useState('multi');
  const sourcedRev = chans.reduce((s, c) => s + c.wonRev, 0);

  return (
    <div className="col gap-3">
      {/* KPI row */}
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
        <StatCard label="Sourced pipeline" value={roi.mktPipeline} format={moneyK} icon={<Icon name="funnel" size={18} />}
          sub={`${roi.sourcedShare}% of all open pipeline`} accent="var(--accent)" spark={series.map(s => s.revenue)} />
        <StatCard label="Marketing ROI" value={roi.roi} format={roasFmt} icon={<Icon name="trendUp" size={18} />}
          sub={`${money(sourcedRev)} won on ${moneyK(roi.spend)} spend`} accent="var(--ok)" />
        <StatCard label="Blended CAC" value={roi.cac} format={money} icon={<Icon name="dollar" size={18} />}
          sub={`${roi.won} customers acquired`} accent="var(--info)" />
        <StatCard label="Cost per lead" value={roi.cpl} format={money} icon={<Icon name="users" size={18} />}
          sub={`${roi.leads.toLocaleString()} leads generated`} accent="var(--accent-purple)" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
        <Card>
          <SectionHeader title="Spend vs sourced revenue" sub="Marketing dollars in, closed-won revenue out, last 6 months"
            action={<Badge tone="ok">{roasFmt(roi.roi)} return</Badge>} />
          <SpendRevenueChart series={series} />
        </Card>
        <Card>
          <SectionHeader title="MQL to SQL funnel" sub="Driven live by your lead-scoring model" />
          <Funnel rows={funnel} />
        </Card>
      </div>

      {/* Channel performance */}
      <Card pad={false}>
        <div className="card-pad">
          <SectionHeader title="Channel performance" sub="Every marketing channel, tied back to real pipeline and closed-won"
            action={<Button variant="ghost" size="sm" onClick={() => askRook('Look at my marketing channel performance and tell me which channel to double down on and which to cut, based on CAC and ROI.')}><Icon name="sparkles" size={15} /> Ask Rook</Button>} />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr>
              <th>Channel</th><th style={{ textAlign: 'right' }}>Spend</th><th style={{ textAlign: 'right' }}>Leads</th>
              <th style={{ textAlign: 'right' }}>CPL</th><th style={{ textAlign: 'right' }}>Pipeline</th>
              <th style={{ textAlign: 'right' }}>Won</th><th style={{ textAlign: 'right' }}>CAC</th><th style={{ textAlign: 'right' }}>ROI</th>
            </tr></thead>
            <tbody>
              {chans.map(c => (
                <tr key={c.id}>
                  <td><span className="row gap-2" style={{ minWidth: 0 }}>
                    <span style={{ width: 26, height: 26, borderRadius: 6, background: c.color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '.7rem', flex: 'none' }}>{c.short}</span>
                    <span className="fw-6 clip">{c.label}</span>
                  </span></td>
                  <td style={{ textAlign: 'right' }} className="tnum">{money(c.spend)}</td>
                  <td style={{ textAlign: 'right' }} className="tnum">{c.leads.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }} className="tnum">{money(c.cpl)}</td>
                  <td style={{ textAlign: 'right' }} className="tnum fw-6">{moneyK(c.pipeline)}</td>
                  <td style={{ textAlign: 'right' }} className="tnum">{c.won}</td>
                  <td style={{ textAlign: 'right' }} className="tnum">{c.cac ? money(c.cac) : '-'}</td>
                  <td style={{ textAlign: 'right' }}><span className="fw-7 tnum" style={{ color: roasColor(c.roi) }}>{roasFmt(c.roi)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Card>
          <SectionHeader title="Attribution snapshot" sub="How credit lands across channels"
            action={<Segmented value={attrMode} onChange={setAttrMode} options={[{ value: 'first', label: 'First' }, { value: 'multi', label: 'Multi' }, { value: 'last', label: 'Last' }]} />} />
          <AttributionBar rows={attribution} mode={attrMode} />
          <div className="t-xs muted" style={{ marginTop: 12 }}>
            {attrMode === 'first' ? 'First-touch credits the channel that created the lead.' : attrMode === 'last' ? 'Last-touch credits the channel on the closed-won deal.' : 'Multi-touch spreads credit evenly across the journey.'}
          </div>
        </Card>
        <Card>
          <SectionHeader title="Top-performing content" sub="What is actually generating pipeline" />
          <div className="col gap-2">
            {content.slice(0, 5).map(c => (
              <Link key={c.title} to={c.to} className="row between" style={{ gap: 10, padding: '.55rem .65rem', borderRadius: 9, border: '1px solid var(--line)' }}>
                <span className="row gap-2" style={{ minWidth: 0 }}>
                  <span style={{ width: 8, height: 34, borderRadius: 3, background: c.color, flex: 'none' }} />
                  <span className="col" style={{ minWidth: 0 }}>
                    <span className="fw-6 clip">{c.title}</span>
                    <span className="t-xs muted">{c.type} - {c.views.toLocaleString()} views - {c.cvr}% CVR</span>
                  </span>
                </span>
                <Badge tone="accent" className="tnum">{c.leads} leads</Badge>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick launch */}
      <Card>
        <SectionHeader title="Launch a play" sub="Every marketing surface, one click away" />
        <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(158px, 1fr))', gap: '.8rem' }}>
          {QUICK_LAUNCH.map(q => (
            <Link key={q.to} to={q.to} className="card card-hover" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--accent-50)', color: 'var(--accent-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={q.icon} size={19} /></span>
              <span className="fw-7">{q.label}</span>
              <span className="t-xs muted">{q.desc}</span>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   LEAD SCORING TAB
   ============================================================ */
function RuleRow({ rule, pointField, onPoints, onToggle, onRemove }) {
  const pts = rule[pointField];
  return (
    <div className="row between" style={{ gap: 12, padding: '.6rem .1rem', borderBottom: '1px solid var(--line)' }}>
      <button className={'switch' + (rule.enabled ? ' on' : '')} onClick={() => onToggle(rule.id)} aria-pressed={rule.enabled} aria-label={`Toggle ${rule.label}`} />
      <div className="col" style={{ flex: 1, minWidth: 0 }}>
        <span className="fw-6 clip" style={{ opacity: rule.enabled ? 1 : 0.5 }}>{rule.label}</span>
        {rule.value ? <span className="t-xs muted clip">{rule.target === 'titleKeyword' ? `title contains: ${rule.value}` : rule.value}</span> : null}
      </div>
      <div className="row gap-1" style={{ flex: 'none' }}>
        <span className="t-xs muted">{pointField === 'pointsEach' ? '+pts each' : '+pts'}</span>
        <Input type="number" value={pts} min={0} max={60} onChange={(e) => onPoints(rule.id, e.target.value)} style={{ width: 68, padding: '.4rem .5rem', textAlign: 'center' }} />
        {rule.custom && <button className="btn btn-quiet" style={{ padding: '.3rem .4rem' }} onClick={() => onRemove(rule.id)} aria-label="Remove rule"><Icon name="trash" size={15} /></button>}
      </div>
    </div>
  );
}

function ScoringTab() {
  const rules = getRules();
  const scored = useMemo(() => scoredContacts(rules), [rules]);
  const dist = useMemo(() => scoreDistribution(scored, rules), [scored, rules]);
  const toast = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState({ label: '', value: '', points: 8 });
  const maxBucket = Math.max(1, ...dist.buckets.map(b => b.count));
  const avg = scored.length ? Math.round(scored.reduce((s, x) => s + x.score, 0) / scored.length) : 0;

  const submitRule = () => {
    if (!draft.value.trim()) { toast('Add a title keyword to match.', 'warn'); return; }
    addDemographicRule(draft);
    setDraft({ label: '', value: '', points: 8 });
    setAddOpen(false);
    toast('Scoring rule added.');
  };

  return (
    <div className="col gap-3">
      <div className="grid" style={{ gridTemplateColumns: '1.15fr 1fr' }}>
        {/* Rules builder */}
        <Card>
          <SectionHeader title="Scoring model" sub="Points build the score. Grades route the lead. HubSpot bills this monthly, you own it."
            action={<Button variant="ghost" size="sm" onClick={resetScoring}><Icon name="rotateCcw" size={15} /> Reset</Button>} />

          <div className="eyebrow" style={{ marginBottom: 6 }}>Demographic (fit)</div>
          <div className="col">
            {rules.demographic.map(r => (
              <RuleRow key={r.id} rule={r} pointField="points" onPoints={setRulePoints} onToggle={toggleRule} onRemove={removeRule} />
            ))}
          </div>
          <Button variant="ghost" size="sm" style={{ marginTop: 10 }} onClick={() => setAddOpen(true)}><Icon name="plus" size={15} /> Add title rule</Button>

          <div className="eyebrow" style={{ margin: '18px 0 6px' }}>Behavioral (intent)</div>
          <div className="col">
            {rules.behavioral.map(r => (
              <RuleRow key={r.id} rule={r} pointField="pointsEach" onPoints={setRulePoints} onToggle={toggleRule} />
            ))}
          </div>

          <div className="eyebrow" style={{ margin: '18px 0 8px' }}>Score decay</div>
          <div className="row gap-2">
            <input type="range" min="0" max="3" step="0.1" value={rules.decayPerDay} onChange={(e) => setDecay(e.target.value)} style={{ flex: 1, accentColor: 'var(--accent)' }} aria-label="Score decay per day" />
            <Badge tone="warn" className="tnum">-{rules.decayPerDay} / day idle</Badge>
          </div>
          <div className="t-xs muted" style={{ marginTop: 6 }}>A lead that goes quiet cools off automatically, so hot always means hot now.</div>

          <div className="eyebrow" style={{ margin: '18px 0 8px' }}>Grade bands</div>
          <div className="col gap-1">
            {rules.bands.map((b, i) => (
              <div key={b.grade} className="row gap-2">
                <GradePill grade={b} size="sm" />
                <span className="t-sm fw-6" style={{ width: 60 }}>Grade {b.grade}</span>
                <span className="t-xs muted">score</span>
                <Input type="number" value={b.min} min={0} max={100} disabled={i === rules.bands.length - 1}
                  onChange={(e) => setBandMin(b.grade, e.target.value)} style={{ width: 72, padding: '.35rem .5rem', textAlign: 'center' }} />
                <span className="t-xs muted">{i === 0 ? 'and up' : i === rules.bands.length - 1 ? 'and below' : 'and up'}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Distribution + summary */}
        <Card>
          <SectionHeader title="Score distribution" sub={`${scored.length} scored contacts - average score ${avg}`} />
          <div className="row" style={{ alignItems: 'flex-end', gap: 4, height: 150, padding: '0 2px' }}>
            {dist.buckets.map(b => (
              <div key={b.from} className="col center" style={{ flex: 1, gap: 4, justifyContent: 'flex-end', height: '100%' }} title={`${b.from}-${b.to}: ${b.count}`}>
                <span className="t-xs muted tnum">{b.count || ''}</span>
                <div style={{ width: '100%', height: `${(b.count / maxBucket) * 100}%`, minHeight: b.count ? 4 : 0, background: gradeFor(b.from, rules.bands).color, borderRadius: '4px 4px 0 0', transition: 'height .5s var(--ease)' }} />
                <span className="t-xs muted tnum">{b.from}</span>
              </div>
            ))}
          </div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '.7rem', marginTop: 18 }}>
            {dist.grades.map(g => (
              <div key={g.grade} className="row gap-2" style={{ padding: '.7rem .8rem', border: '1px solid var(--line)', borderRadius: 10 }}>
                <GradePill grade={g} />
                <div className="col">
                  <span className="fw-8 tnum" style={{ fontSize: '1.3rem' }}>{g.count}</span>
                  <span className="t-xs muted">score {g.min}+</span>
                </div>
              </div>
            ))}
          </div>
          <Button variant="ghost" size="sm" style={{ marginTop: 14, width: '100%' }} onClick={() => askRook('Review my lead-scoring model and suggest point weights or a new rule that would better predict which leads become customers.')}>
            <Icon name="sparkles" size={15} /> Tune with Rook
          </Button>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card pad={false}>
        <div className="card-pad">
          <SectionHeader title="Scored contacts leaderboard" sub="Live ranking. The top of this list is where your reps should be today." />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr>
              <th style={{ width: 44 }}>#</th><th>Contact</th><th>Title</th><th>Stage</th>
              <th style={{ textAlign: 'center' }}>Grade</th><th style={{ width: 200 }}>Score</th><th style={{ textAlign: 'right' }}>Signals</th>
            </tr></thead>
            <tbody>
              {scored.slice(0, 20).map((s, i) => (
                <tr key={s.contact.id}>
                  <td className="muted tnum">{i + 1}</td>
                  <td><span className="row gap-2" style={{ minWidth: 0 }}>
                    <Avatar name={contactName(s.contact)} size={30} />
                    <span className="fw-6 clip">{contactName(s.contact)}</span>
                  </span></td>
                  <td className="t-sm muted clip" style={{ maxWidth: 180 }}>{s.contact.title || '-'}</td>
                  <td><Badge>{s.contact.lifecycleStage || 'lead'}</Badge></td>
                  <td style={{ textAlign: 'center' }}><GradePill grade={s.grade} size="sm" /></td>
                  <td>
                    <div className="row gap-2">
                      <div style={{ flex: 1 }}><ProgressBar value={s.score} color={s.grade.color} /></div>
                      <span className="fw-7 tnum" style={{ width: 30 }}>{s.score}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}><span className="t-xs muted">{s.hits.length} rules{s.decay ? `, -${s.decay} decay` : ''}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add a title scoring rule"
        footer={<><Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button><Button variant="primary" onClick={submitRule}>Add rule</Button></>}>
        <div className="col gap-2">
          <Field label="Rule name"><Input value={draft.label} placeholder="e.g. Head of Marketing" onChange={(e) => setDraft({ ...draft, label: e.target.value })} /></Field>
          <Field label="Title contains (comma separated)" hint="Matched case-insensitively against the contact title.">
            <Input value={draft.value} placeholder="Marketing, Growth, Demand" onChange={(e) => setDraft({ ...draft, value: e.target.value })} />
          </Field>
          <Field label="Points"><Input type="number" min={0} max={60} value={draft.points} onChange={(e) => setDraft({ ...draft, points: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================
   CALENDAR TAB
   ============================================================ */
function CalendarTab() {
  const base = new Date();
  const [offset, setOffset] = useState(0);
  const view = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  const year = view.getFullYear(), month = view.getMonth();
  const items = useMemo(() => calendarItemsFor(year, month), [year, month]);
  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const byDay = useMemo(() => {
    const m = {};
    for (const it of items) (m[it.day] = m[it.day] || []).push(it);
    return m;
  }, [items]);
  const today = new Date();
  const isToday = (d) => d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();

  return (
    <Card pad={false}>
      <div className="card-pad row between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div className="col gap-1">
          <h3 style={{ margin: 0 }}>{MONTHS[month]} {year}</h3>
          <span className="t-sm muted">{items.length} scheduled marketing touches across every channel</span>
        </div>
        <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
          <div className="row wrap gap-2">
            {CAL_TYPES.map(t => <span key={t.id} className="row gap-1 t-xs"><span style={{ width: 9, height: 9, borderRadius: 2, background: t.color }} />{t.label}</span>)}
          </div>
          <div className="row gap-1">
            <Button variant="ghost" size="sm" onClick={() => setOffset(o => o - 1)} aria-label="Previous month"><Icon name="chevronRight" size={16} style={{ transform: 'rotate(180deg)' }} /></Button>
            <Button variant="ghost" size="sm" onClick={() => setOffset(0)}>Today</Button>
            <Button variant="ghost" size="sm" onClick={() => setOffset(o => o + 1)} aria-label="Next month"><Icon name="chevronRight" size={16} /></Button>
          </div>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 680 }}>
          <div className="row" style={{ borderTop: '1px solid var(--line)' }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} style={{ flex: 1, padding: '.5rem .6rem', textAlign: 'left' }} className="t-xs fw-6 muted">{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {grid.map((cell, i) => {
              const dayItems = cell.inMonth ? (byDay[cell.day] || []) : [];
              return (
                <div key={i} style={{
                  minHeight: 96, borderRight: '1px solid var(--line)', borderBottom: '1px solid var(--line)',
                  padding: '.4rem', background: cell.inMonth ? 'transparent' : 'var(--n-25)',
                  opacity: cell.inMonth ? 1 : 0.55,
                }}>
                  <div className="row between">
                    <span className="t-xs fw-6" style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 22, height: 22, borderRadius: 6,
                      background: cell.inMonth && isToday(cell.date) ? 'var(--accent)' : 'transparent',
                      color: cell.inMonth && isToday(cell.date) ? '#fff' : 'var(--n-600)',
                    }}>{cell.day}</span>
                  </div>
                  <div className="col" style={{ gap: 3, marginTop: 3 }}>
                    {dayItems.slice(0, 3).map(it => {
                      const t = calTypeById(it.type);
                      return (
                        <Link key={it.id} to={it.to} title={it.title} className="row gap-1" style={{
                          padding: '.16rem .34rem', borderRadius: 5, background: t.color + '1f',
                          borderLeft: `3px solid ${t.color}`, minWidth: 0,
                        }}>
                          <span className="clip" style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--ink)' }}>{it.title}</span>
                        </Link>
                      );
                    })}
                    {dayItems.length > 3 && <span className="t-xs muted" style={{ paddingLeft: 4 }}>+{dayItems.length - 3} more</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ============================================================
   SEGMENTS TAB
   ============================================================ */
function SegmentsTab() {
  const rules = getRules();
  const segments = useMemo(() => segmentOverview(rules), [rules]);
  const total = segments.reduce((s, x) => s + x.count, 0) || 1;
  return (
    <div className="col gap-3">
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {segments.map(seg => (
          <Card key={seg.id} hover>
            <div className="row between">
              <div className="col gap-1" style={{ minWidth: 0 }}>
                <span className="stat-label">{seg.label}</span>
                <span className="stat-value" style={{ fontSize: '2.1rem' }}>{seg.count.toLocaleString()}</span>
              </div>
              <Badge tone={seg.tone}>{Math.round((seg.count / total) * 100)}%</Badge>
            </div>
            <div className="t-sm muted" style={{ margin: '6px 0 12px' }}>{seg.desc}</div>
            <div className="row gap-1">
              <Button as={Link} to={seg.to} variant="ghost" size="sm">Open <Icon name="arrowRight" size={14} /></Button>
              <Button variant="quiet" size="sm" onClick={() => askRook(`Draft a marketing play for my "${seg.label}" segment of ${seg.count} contacts. What message, channel and offer would move them to the next stage?`)}>
                <Icon name="sparkles" size={14} /> Play
              </Button>
            </div>
          </Card>
        ))}
      </div>
      <Card>
        <SectionHeader title="Audience math" sub="Segments are live filters over your real book. Move a lead's stage or score and these update instantly." />
        <div className="col gap-2">
          {segments.map(seg => (
            <div key={seg.id} className="row gap-2">
              <span className="t-sm fw-6" style={{ width: 170, flex: 'none' }} >{seg.label}</span>
              <div style={{ flex: 1 }}><ProgressBar value={(seg.count / total) * 100} color="var(--accent)" /></div>
              <span className="t-sm muted tnum" style={{ width: 46, textAlign: 'right' }}>{seg.count}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   PAGE SHELL
   ============================================================ */
export default function MarketingHub() {
  useStore();            // re-render on CRM changes (contacts / deals)
  useMarketingEngine();  // re-render on marketing event changes
  useMarketHub();        // re-render on scoring-config changes
  const [tab, setTab] = useState('overview');
  const roi = marketingRoi();

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'scoring', label: 'Lead scoring' },
    { key: 'calendar', label: 'Calendar' },
    { key: 'segments', label: 'Segments' },
  ];

  return (
    <div className="page-in">
      <PageTitle
        eyebrow="Marketing"
        title={<>Marketing <GradientText>Command Center</GradientText></>}
        sub="Your whole marketing engine in one place, with real lead scoring. The glue other platforms charge $3,600 a month for."
        action={
          <div className="row gap-1">
            <Button variant="ghost" onClick={() => askRook('Give me a marketing command-center briefing: sourced pipeline, funnel health, best and worst channel by ROI, and the single highest-leverage move this week.')}>
              <Icon name="sparkles" size={16} /> Brief me
            </Button>
            <Button as={Link} to="/campaigns" variant="primary"><Icon name="megaphone" size={16} /> New campaign</Button>
          </div>
        }
      >
        <div className="row wrap gap-3" style={{ marginTop: 10 }}>
          <span className="row gap-1 t-sm"><span className="dot" style={{ background: 'var(--ok)' }} /> <span className="muted">Sourced pipeline</span> <span className="fw-7">{moneyK(roi.mktPipeline)}</span></span>
          <span className="row gap-1 t-sm"><span className="dot" style={{ background: 'var(--accent)' }} /> <span className="muted">Marketing ROI</span> <span className="fw-7">{roasFmt(roi.roi)}</span></span>
          <span className="row gap-1 t-sm"><span className="dot" style={{ background: 'var(--info)' }} /> <span className="muted">CAC</span> <span className="fw-7">{money(roi.cac)}</span></span>
        </div>
      </PageTitle>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'overview' && <OverviewTab />}
      {tab === 'scoring' && <ScoringTab />}
      {tab === 'calendar' && <CalendarTab />}
      {tab === 'segments' && <SegmentsTab />}
    </div>
  );
}
