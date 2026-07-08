// ============================================================
// COMMAND CENTER  (the home page, /)
// The revenue cockpit. Gradient hero, KPI cards with live
// sparklines, a pipeline pulse strip, a "My day" work queue, and
// closing / slipping rails. First impression = category-defining.
// ============================================================
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  useStore, getCurrentUser,
  pipelineValue, weightedForecast, winRate, wonThisMonth,
  dealsClosingThisMonth, slippingDeals, myDayQueue,
  getDeal, getContact, getCompany, contactName,
  createActivity, toggleActivity, stageById,
  dealsByStage, OPEN_STAGES,
} from '../lib/store.js';
import { Card, StatCard, Badge, SectionHeader, Input, GradientText, moneyK, longDate, relTime } from '../components/UI.jsx';
import { Icon, typeIcon } from '../components/icons.jsx';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
// Decorative trend line for a KPI (demo data - the app's own modeled history).
function spark(seed, up = true) {
  const out = []; let v = 40 + (seed % 20);
  for (let i = 0; i < 12; i++) { v += (Math.sin(seed + i) * 6) + (up ? 2.2 : -1.4); out.push(Math.max(8, Math.round(v))); }
  return out;
}
const stageColor = { lead: '#8b93a4', qualified: '#2563a8', discovery: '#5b4bf5', proposal: '#b3721a', negotiation: '#0ea5a3' };

function relatedFor(a) {
  if (a.relatedType === 'deal') { const d = getDeal(a.relatedId); if (d) return { label: d.name, to: `/deals/${d.id}` }; }
  if (a.relatedType === 'contact') { const c = getContact(a.relatedId); if (c) return { label: contactName(c), to: `/contacts/${c.id}` }; }
  if (a.companyId) { const co = getCompany(a.companyId); if (co) return { label: co.name, to: `/companies/${co.id}` }; }
  return null;
}

function Check({ done, onClick }) {
  return (
    <button onClick={onClick} aria-label={done ? 'Mark not done' : 'Mark done'} className="row center"
      style={{ width: 24, height: 24, flex: 'none', borderRadius: '50%', cursor: 'pointer', border: `2px solid ${done ? 'var(--accent)' : 'var(--n-200)'}`, background: done ? 'var(--accent)' : 'transparent', color: '#fff', transition: 'border-color .15s, background .15s' }}>
      {done && <Icon name="check" size={13} stroke={3} />}
    </button>
  );
}

function DayRow({ a }) {
  const rel = relatedFor(a);
  const overdue = a.dueAt && new Date(a.dueAt).getTime() < Date.now();
  return (
    <div className="row gap-2" style={{ padding: '.7rem 0', borderTop: '1px solid var(--n-50)' }}>
      <Check done={a.done} onClick={() => toggleActivity(a.id)} />
      <span className="row center" style={{ width: 30, height: 30, flex: 'none', borderRadius: '50%', background: 'var(--accent-50)', color: 'var(--accent-600)' }}>
        <Icon name={typeIcon[a.type]} size={15} />
      </span>
      <div className="col" style={{ minWidth: 0, flex: 1, lineHeight: 1.3 }}>
        <span className="fw-6 clip">{a.subject}</span>
        {rel && <Link to={rel.to} className="t-sm clip" style={{ color: 'var(--n-600)' }}>{rel.label}</Link>}
      </div>
      <span className="t-sm fw-6" style={{ flex: 'none', color: overdue ? 'var(--risk)' : 'var(--n-600)' }}>{relTime(a.dueAt)}</span>
    </div>
  );
}

export default function CommandCenter() {
  useStore();
  const nav = useNavigate();
  const me = getCurrentUser();
  const first = (me?.name || 'there').split(' ')[0];

  const queue = myDayQueue();
  const closing = dealsClosingThisMonth();
  const slipping = slippingDeals();
  const won = wonThisMonth();
  const wonSum = won.reduce((s, d) => s + d.value, 0);
  const byStage = dealsByStage();
  const maxStage = Math.max(1, ...OPEN_STAGES.map(s => (byStage[s.id] || []).reduce((a, d) => a + d.value, 0)));

  const [task, setTask] = useState('');
  const addTask = (e) => { e.preventDefault(); if (!task.trim()) return; createActivity({ type: 'task', subject: task.trim(), ownerId: me.id, dueAt: new Date().toISOString() }); setTask(''); };
  const openRook = () => window.dispatchEvent(new CustomEvent('rally:rook', { detail: { open: true } }));

  const kpis = [
    { value: pipelineValue(), format: moneyK, label: 'Pipeline value', trend: 8, spark: spark(3), icon: <Icon name="target" size={18} />, to: '/deals' },
    { value: weightedForecast(), format: moneyK, label: 'Weighted forecast', trend: 5, spark: spark(7), icon: <Icon name="trendUp" size={18} />, to: '/forecasting' },
    { value: winRate(), format: (n) => `${Math.round(n)}%`, label: 'Win rate', trend: 3, spark: spark(11), icon: <Icon name="pie" size={18} />, to: '/dashboards' },
    { value: wonSum, format: moneyK, label: 'Won this month', sub: `${won.length} deal${won.length === 1 ? '' : 's'} closed`, spark: spark(5), sparkColor: 'var(--ok)', icon: <Icon name="check" size={18} />, to: '/deals' },
  ];

  return (
    <div className="col gap-4" style={{ paddingBottom: '1rem' }}>
      {/* Hero */}
      <header className="col gap-1 fade-up">
        <div className="eyebrow">{longDate(Date.now())}</div>
        <h1 style={{ margin: 0, fontSize: 'clamp(2rem, 4vw, 2.9rem)' }}>{greeting()}, <GradientText>{first}</GradientText></h1>
        <p className="muted t-lg" style={{ margin: 0 }}>Here is where your revenue stands today.</p>
      </header>

      {/* KPI row */}
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}>
        {kpis.map((k) => (
          <StatCard key={k.label} label={k.label} value={k.value} format={k.format} trend={k.trend} sub={k.sub} spark={k.spark} sparkColor={k.sparkColor} icon={k.icon} onClick={() => nav(k.to)} />
        ))}
      </div>

      {/* Pipeline pulse strip */}
      <Card>
        <SectionHeader title="Pipeline pulse" sub="Open value by stage, live" action={<Link to="/deals" className="link t-sm row gap-1">Open pipeline <Icon name="chevronRight" size={14} /></Link>} />
        <div className="row gap-2 wrap" style={{ alignItems: 'stretch' }}>
          {OPEN_STAGES.map(s => {
            const list = byStage[s.id] || [];
            const val = list.reduce((a, d) => a + d.value, 0);
            return (
              <div key={s.id} onClick={() => nav('/deals')} className="col gap-1" style={{ flex: 1, minWidth: 120, cursor: 'pointer' }}>
                <div style={{ height: 90, display: 'flex', alignItems: 'flex-end' }}>
                  <div style={{ width: '100%', height: `${Math.max(6, (val / maxStage) * 100)}%`, background: `linear-gradient(180deg, ${stageColor[s.id]}, ${stageColor[s.id]}bb)`, borderRadius: '8px 8px 0 0', transition: 'height .7s var(--ease)' }} />
                </div>
                <div className="row gap-1" style={{ alignItems: 'center' }}><span className="dot" style={{ background: stageColor[s.id] }} /><span className="t-xs fw-6 clip">{s.name}</span></div>
                <span className="t-xs muted tnum">{moneyK(val)} - {list.length}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Main grid */}
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.55fr) minmax(0, 1fr)', alignItems: 'start' }}>
        <Card className="col" style={{ minHeight: 0 }}>
          <SectionHeader title="My day" sub={`${queue.length} open task${queue.length === 1 ? '' : 's'}`} action={<Link to="/activities" className="link t-sm row gap-1">View all <Icon name="chevronRight" size={14} /></Link>} />
          {queue.length === 0 ? (
            <div className="col center gap-2" style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
              <span className="row center" style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--ok-bg)', color: 'var(--ok)' }}><Icon name="check" size={24} stroke={2.5} /></span>
              <div className="fw-6">You are all caught up.</div>
            </div>
          ) : (
            <div className="col" style={{ marginTop: '-.35rem' }}>{queue.slice(0, 6).map((a) => <DayRow key={a.id} a={a} />)}</div>
          )}
          <form onSubmit={addTask} className="row gap-2" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--line)' }}>
            <span className="row center" style={{ color: 'var(--n-400)', flex: 'none' }}><Icon name="plus" size={18} /></span>
            <Input value={task} onChange={(e) => setTask(e.target.value)} placeholder="Add a task for today..." style={{ flex: 1 }} />
            <button type="submit" className="btn btn-ghost btn-sm" disabled={!task.trim()}>Add</button>
          </form>
        </Card>

        <div className="col gap-3" style={{ minWidth: 0 }}>
          <Card>
            <SectionHeader title="Closing this month" sub={`${closing.length} deal${closing.length === 1 ? '' : 's'}`} action={<Link to="/deals" className="link t-sm">Deals</Link>} />
            {closing.length === 0 ? (
              <div className="muted t-sm" style={{ padding: '.5rem 0' }}>Nothing scheduled to close this month.</div>
            ) : (
              <div className="col">
                {closing.slice(0, 6).map((d) => {
                  const co = getCompany(d.companyId); const st = stageById(d.stage);
                  return (
                    <div key={d.id} className="row gap-2" style={{ padding: '.65rem 0', borderTop: '1px solid var(--n-50)' }}>
                      <div className="col" style={{ minWidth: 0, flex: 1, lineHeight: 1.3 }}>
                        <Link to={`/deals/${d.id}`} className="fw-6 clip link" style={{ color: 'var(--ink)' }}>{d.name}</Link>
                        <span className="t-sm muted clip">{co?.name || 'No company'}</span>
                      </div>
                      <div className="col" style={{ flex: 'none', alignItems: 'flex-end', gap: '.25rem' }}>
                        <span className="fw-7 tnum">{moneyK(d.value)}</span>
                        <span className="row gap-1" style={{ flex: 'none' }}><Badge tone="accent" className="t-xs">{st?.name}</Badge><span className="t-xs muted">{relTime(d.closeDate)}</span></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card style={slipping.length ? { borderColor: 'var(--risk)', boxShadow: '0 0 0 1px var(--risk-bg)' } : undefined}>
            <SectionHeader title="Needs attention" sub={slipping.length ? `${slipping.length} slipping` : 'All on track'} />
            {slipping.length === 0 ? (
              <div className="row gap-2" style={{ padding: '.5rem 0', color: 'var(--ok)' }}><Icon name="check" size={18} stroke={2.5} /><span className="fw-6">No slipping deals. Nice.</span></div>
            ) : (
              <div className="col">
                {slipping.slice(0, 5).map((d) => (
                  <div key={d.id} className="row gap-2" style={{ padding: '.6rem 0', borderTop: '1px solid var(--n-50)' }}>
                    <div className="col" style={{ minWidth: 0, flex: 1, lineHeight: 1.3 }}>
                      <Link to={`/deals/${d.id}`} className="fw-6 clip link" style={{ color: 'var(--ink)' }}>{d.name}</Link>
                      <span className="t-sm muted tnum">{moneyK(d.value)}</span>
                    </div>
                    <Badge tone="risk" className="t-xs" style={{ flex: 'none' }}>overdue {relTime(d.closeDate)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Ask Rook banner */}
      <div className="row between gap-3 wrap grad-rev" style={{ borderRadius: 'var(--r-lg)', padding: '1.6rem 1.75rem', color: '#fff', boxShadow: 'var(--accent-glow)' }}>
        <div className="col gap-1" style={{ minWidth: 0 }}>
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <Icon name="sparkles" size={22} fill="currentColor" stroke={0} />
            <span style={{ fontWeight: 800, fontSize: '1.4rem', letterSpacing: '-.02em' }}>Let Rook do the work</span>
          </div>
          <span style={{ opacity: .92, maxWidth: 620 }}>Ask a question, build an entire account, or draft an email. Rook is docked bottom-right and knows your pipeline cold.</span>
        </div>
        <button onClick={openRook} className="btn" style={{ flex: 'none', background: '#fff', color: 'var(--accent-700)', fontWeight: 700, boxShadow: 'var(--shadow-md)' }}>
          <Icon name="zap" size={17} fill="currentColor" stroke={0} /> Open Rook
        </button>
      </div>
    </div>
  );
}
