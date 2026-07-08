// ============================================================
// COMMAND CENTER  (the home page, /)
// First thing anyone sees. Time-of-day greeting, KPI row wired
// to real navigation, "My day" work queue, closing + slipping
// deal rails, and an Ask Rook banner. High-polish, Linear/Attio.
// ============================================================
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  useStore, getCurrentUser,
  pipelineValue, weightedForecast, winRate, wonThisMonth,
  dealsClosingThisMonth, slippingDeals, myDayQueue,
  getDeal, getContact, getCompany, contactName,
  createActivity, toggleActivity, stageById,
} from '../lib/store.js';
import { Button, Card, Stat, Badge, SectionHeader, Input, moneyK, longDate, relTime } from '../components/UI.jsx';
import { Icon, typeIcon } from '../components/icons.jsx';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/* Resolve the display name + link target for an activity's related record. */
function relatedFor(a) {
  if (a.relatedType === 'deal') {
    const d = getDeal(a.relatedId);
    if (d) return { label: d.name, to: `/deals/${d.id}` };
  }
  if (a.relatedType === 'contact') {
    const c = getContact(a.relatedId);
    if (c) return { label: contactName(c), to: `/contacts/${c.id}` };
  }
  if (a.companyId) {
    const co = getCompany(a.companyId);
    if (co) return { label: co.name, to: `/companies/${co.id}` };
  }
  return null;
}

/* Round checkbox that toggles an activity done/undone. */
function Check({ done, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={done ? 'Mark not done' : 'Mark done'}
      className="row center"
      style={{
        width: 24, height: 24, flex: 'none', borderRadius: '50%', cursor: 'pointer',
        border: `2px solid ${done ? 'var(--accent)' : 'var(--n-200)'}`,
        background: done ? 'var(--accent)' : 'transparent', color: '#fff',
        transition: 'border-color .15s, background .15s',
      }}
    >
      {done && <Icon name="check" size={13} stroke={3} />}
    </button>
  );
}

/* A single "My day" work row. */
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
        {rel && (
          <Link to={rel.to} className="t-sm clip" style={{ color: 'var(--n-600)' }}>
            {rel.label}
          </Link>
        )}
      </div>
      <span className="t-sm fw-6" style={{ flex: 'none', color: overdue ? 'var(--risk)' : 'var(--n-600)' }}>
        {relTime(a.dueAt)}
      </span>
    </div>
  );
}

export default function CommandCenter() {
  useStore(); // subscribe for reactivity
  const nav = useNavigate();
  const me = getCurrentUser();
  const first = (me?.name || 'there').split(' ')[0];

  const queue = myDayQueue();
  const closing = dealsClosingThisMonth();
  const slipping = slippingDeals();
  const won = wonThisMonth();
  const wonSum = won.reduce((s, d) => s + d.value, 0);

  const [task, setTask] = useState('');
  const addTask = (e) => {
    e.preventDefault();
    if (!task.trim()) return;
    createActivity({
      type: 'task',
      subject: task.trim(),
      ownerId: me.id,
      dueAt: new Date().toISOString(),
    });
    setTask('');
  };

  const openRook = () => window.dispatchEvent(new CustomEvent('rally:rook', { detail: { open: true } }));

  const kpis = [
    { value: moneyK(pipelineValue()), label: 'Pipeline value', sub: 'Open across all stages', icon: <Icon name="target" size={20} />, to: '/deals' },
    { value: moneyK(weightedForecast()), label: 'Weighted forecast', sub: 'Probability adjusted', icon: <Icon name="activity" size={20} />, to: '/dashboards' },
    { value: `${winRate()}%`, label: 'Win rate', sub: 'Closed won of closed', icon: <Icon name="chart" size={20} />, to: '/dashboards' },
    { value: moneyK(wonSum), label: 'Won this month', sub: `${won.length} deal${won.length === 1 ? '' : 's'} closed`, icon: <Icon name="check" size={20} />, to: '/deals' },
  ];

  return (
    <div className="col gap-4 fade-up" style={{ paddingBottom: '1rem' }}>
      {/* Greeting */}
      <header className="col gap-1">
        <div className="eyebrow">{longDate(Date.now())}</div>
        <h1 style={{ margin: 0 }}>{greeting()}, {first}</h1>
        <p className="muted t-lg" style={{ margin: 0 }}>Here is where your revenue stands today.</p>
      </header>

      {/* KPI row */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {kpis.map((k) => (
          <Card key={k.label} hover onClick={() => nav(k.to)} style={{ cursor: 'pointer' }}>
            <Stat value={k.value} label={k.label} sub={k.sub} icon={k.icon} />
          </Card>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.55fr) minmax(0, 1fr)', alignItems: 'start' }}>
        {/* LEFT: My day */}
        <Card className="col" style={{ minHeight: 0 }}>
          <SectionHeader
            title="My day"
            sub={`${queue.length} open task${queue.length === 1 ? '' : 's'}`}
            action={<Link to="/activities" className="link t-sm row gap-1">View all <Icon name="chevronRight" size={14} /></Link>}
          />
          {queue.length === 0 ? (
            <div className="col center gap-2" style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
              <span className="row center" style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--ok-bg)', color: 'var(--ok)' }}>
                <Icon name="check" size={24} stroke={2.5} />
              </span>
              <div className="fw-6">You are all caught up.</div>
            </div>
          ) : (
            <div className="col" style={{ marginTop: '-.35rem' }}>
              {queue.slice(0, 6).map((a) => <DayRow key={a.id} a={a} />)}
            </div>
          )}
          {/* Quick add */}
          <form onSubmit={addTask} className="row gap-2" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--line)' }}>
            <span className="row center" style={{ color: 'var(--n-400)', flex: 'none' }}><Icon name="plus" size={18} /></span>
            <Input
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="Add a task for today..."
              style={{ flex: 1 }}
            />
            <Button type="submit" variant="ghost" size="sm" disabled={!task.trim()}>Add</Button>
          </form>
        </Card>

        {/* RIGHT: two stacked cards */}
        <div className="col gap-3" style={{ minWidth: 0 }}>
          {/* Closing this month */}
          <Card>
            <SectionHeader
              title="Closing this month"
              sub={`${closing.length} deal${closing.length === 1 ? '' : 's'}`}
              action={<Link to="/deals" className="link t-sm">Deals</Link>}
            />
            {closing.length === 0 ? (
              <div className="muted t-sm" style={{ padding: '.5rem 0' }}>Nothing scheduled to close this month.</div>
            ) : (
              <div className="col">
                {closing.slice(0, 6).map((d) => {
                  const co = getCompany(d.companyId);
                  const st = stageById(d.stage);
                  return (
                    <div key={d.id} className="row gap-2" style={{ padding: '.65rem 0', borderTop: '1px solid var(--n-50)' }}>
                      <div className="col" style={{ minWidth: 0, flex: 1, lineHeight: 1.3 }}>
                        <Link to={`/deals/${d.id}`} className="fw-6 clip link" style={{ color: 'var(--ink)' }}>{d.name}</Link>
                        <span className="t-sm muted clip">{co?.name || 'No company'}</span>
                      </div>
                      <div className="col" style={{ flex: 'none', alignItems: 'flex-end', gap: '.25rem' }}>
                        <span className="fw-7 tnum">{moneyK(d.value)}</span>
                        <span className="row gap-1" style={{ flex: 'none' }}>
                          <Badge tone="accent" className="t-xs">{st?.name}</Badge>
                          <span className="t-xs muted">{relTime(d.closeDate)}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Needs attention */}
          <Card style={slipping.length ? { borderColor: 'var(--risk)', boxShadow: '0 0 0 1px var(--risk-bg)' } : undefined}>
            <SectionHeader
              title="Needs attention"
              sub={slipping.length ? `${slipping.length} slipping` : 'All on track'}
            />
            {slipping.length === 0 ? (
              <div className="row gap-2" style={{ padding: '.5rem 0', color: 'var(--ok)' }}>
                <Icon name="check" size={18} stroke={2.5} />
                <span className="fw-6">No slipping deals. Nice.</span>
              </div>
            ) : (
              <div className="col">
                {slipping.slice(0, 5).map((d) => (
                  <div key={d.id} className="row gap-2" style={{ padding: '.6rem 0', borderTop: '1px solid var(--n-50)' }}>
                    <div className="col" style={{ minWidth: 0, flex: 1, lineHeight: 1.3 }}>
                      <Link to={`/deals/${d.id}`} className="fw-6 clip link" style={{ color: 'var(--ink)' }}>{d.name}</Link>
                      <span className="t-sm muted tnum">{moneyK(d.value)}</span>
                    </div>
                    <Badge tone="risk" className="t-xs" style={{ flex: 'none' }}>
                      overdue {relTime(d.closeDate)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Ask Rook banner */}
      <div
        className="row between gap-3 wrap"
        style={{
          borderRadius: 'var(--r-lg)', padding: '1.6rem 1.75rem', color: '#fff',
          background: 'linear-gradient(120deg, var(--accent) 0%, var(--accent-700) 100%)',
          boxShadow: 'var(--accent-glow)',
        }}
      >
        <div className="col gap-1" style={{ minWidth: 0 }}>
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <Icon name="sparkles" size={22} fill="currentColor" stroke={0} />
            <span style={{ fontWeight: 800, fontSize: '1.4rem', letterSpacing: '-.02em' }}>Let Rook do the work</span>
          </div>
          <span style={{ opacity: .92, maxWidth: 620 }}>
            Ask a question, build an account, or draft an email. Rook is docked bottom-right.
          </span>
        </div>
        <button
          onClick={openRook}
          className="btn"
          style={{ flex: 'none', background: '#fff', color: 'var(--accent-700)', fontWeight: 700, boxShadow: 'var(--shadow-md)' }}
        >
          <Icon name="zap" size={17} fill="currentColor" stroke={0} /> Open Rook
        </button>
      </div>
    </div>
  );
}
