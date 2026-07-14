// ============================================================
// ADMIN  (/admin)  -  back-office signup tracking + growth metrics.
// Who signed up, when, on what plan, from where; live metrics, filters,
// and a "Launch into" drawer to jump into any account. Companies also sign
// up here (the New company action) and via Liftoff / SignUp (rally:signup
// event). Local-first, alive with seeded data, additive.
// ASCII only. NO em-dash / en-dash.
// ============================================================
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useAdmin, adminMetrics, filterSignups, recordSignup, setStatus,
  PLANS, SOURCES, STATUSES, planLabel, sourceLabel, statusMeta,
} from '../lib/admin-data.js';
import {
  PageTitle, SectionHeader, Card, StatCard, Button, Badge, Modal, Field, Input, Select,
  Avatar, avatarColor, EmptyState, MiniBars, useToast, money, moneyK, shortDate, relTime,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';

const RANGES = [
  { key: 'all', label: 'All time' }, { key: '90d', label: 'Last 90 days' },
  { key: '30d', label: 'Last 30 days' }, { key: '7d', label: 'Last 7 days' }, { key: 'today', label: 'Today' },
];
const SORTS = [
  { key: 'recent', label: 'Newest first' }, { key: 'mrr', label: 'Highest MRR' },
  { key: 'seats', label: 'Most seats' }, { key: 'company', label: 'Company A-Z' },
];

function StatusPill({ status }) {
  const m = statusMeta(status);
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

function BreakdownCard({ title, rows, total, fmt }) {
  const max = Math.max(1, ...rows.map(r => r.count));
  return (
    <Card>
      <SectionHeader title={title} />
      <div className="col" style={{ gap: '.6rem', marginTop: '.5rem' }}>
        {rows.map(r => (
          <div key={r.key} className="col" style={{ gap: 4 }}>
            <div className="row between t-sm">
              <span>{r.label}</span>
              <span className="fw-7 tnum">{fmt ? fmt(r) : r.count}</span>
            </div>
            <div style={{ height: 7, borderRadius: 5, background: 'var(--n-100)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(r.count / max) * 100}%`, background: 'var(--accent)', borderRadius: 5, transition: 'width .4s' }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function NewCompanyModal({ open, onClose, onDone }) {
  const [f, setF] = useState({ company: '', contact: '', email: '', seats: 25, plan: 'growth', source: 'outbound', status: 'trial' });
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  const submit = () => {
    if (!f.company.trim()) return;
    const id = recordSignup({ ...f, seats: Number(f.seats) || 1 });
    onDone && onDone(id);
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Add a company" width={520}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={submit}>Create account</Button></>}>
      <div className="col" style={{ gap: '.8rem' }}>
        <Field label="Company"><Input value={f.company} onChange={e => set('company', e.target.value)} placeholder="Acme Robotics" autoFocus /></Field>
        <div className="row gap-2">
          <Field label="Primary contact"><Input value={f.contact} onChange={e => set('contact', e.target.value)} placeholder="Jane Doe" /></Field>
          <Field label="Work email"><Input value={f.email} onChange={e => set('email', e.target.value)} placeholder="jane@acme.com" /></Field>
        </div>
        <div className="row gap-2">
          <Field label="Seats"><Input type="number" min={1} value={f.seats} onChange={e => set('seats', e.target.value)} /></Field>
          <Field label="Plan"><Select value={f.plan} onChange={e => set('plan', e.target.value)}>{PLANS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}</Select></Field>
        </div>
        <div className="row gap-2">
          <Field label="Source"><Select value={f.source} onChange={e => set('source', e.target.value)}>{SOURCES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</Select></Field>
          <Field label="Status"><Select value={f.status} onChange={e => set('status', e.target.value)}>{STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</Select></Field>
        </div>
      </div>
    </Modal>
  );
}

function LaunchDrawer({ row, onClose }) {
  const nav = useNavigate();
  const toast = useToast();
  if (!row) return null;
  const launch = (to, msg) => { toast(msg); onClose(); nav(to); };
  return (
    <Modal open={!!row} onClose={onClose} title="Account" width={560}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Close</Button>
        <Button variant="primary" onClick={() => launch('/app', `Entered ${row.company}`)}><Icon name="arrowRight" size={15} /> Launch into workspace</Button>
      </>}>
      <div className="row gap-2" style={{ alignItems: 'center', marginBottom: '1rem' }}>
        <Avatar name={row.company} size={46} color={avatarColor(row.company)} />
        <div className="col" style={{ minWidth: 0 }}>
          <div className="fw-8" style={{ fontSize: '1.25rem' }}>{row.company}</div>
          <div className="muted t-sm">{row.industry} . {row.contact} . {row.email}</div>
        </div>
        <span className="spacer" />
        <StatusPill status={row.status} />
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '.7rem', marginBottom: '1rem' }}>
        {[
          { l: 'Seats', v: row.seats.toLocaleString() },
          { l: 'Plan', v: planLabel(row.plan) },
          { l: 'MRR', v: money(row.mrr) },
          { l: 'Source', v: sourceLabel(row.source) },
          { l: 'Signed up', v: shortDate(row.signedUpAt) },
          { l: 'Last active', v: relTime(row.lastActiveAt) },
        ].map(x => (
          <div key={x.l} className="card card-pad" style={{ padding: '.7rem .8rem' }}>
            <div className="t-xs muted">{x.l}</div>
            <div className="fw-7" style={{ fontSize: '1.05rem' }}>{x.v}</div>
          </div>
        ))}
      </div>
      <SectionHeader title="Set status" />
      <div className="row gap-1 wrap" style={{ marginBottom: '1rem' }}>
        {STATUSES.map(s => (
          <Button key={s.key} size="sm" variant={row.status === s.key ? 'accent' : 'ghost'} onClick={() => setStatus(row.id, s.key)}>{s.label}</Button>
        ))}
      </div>
      <div className="row gap-2 wrap">
        <Button variant="ghost" onClick={() => launch('/liftoff/deck/master', `Opened ${row.company} master deck`)}><Icon name="rocket" size={15} /> View master deck</Button>
        <Button variant="ghost" onClick={() => launch('/liftoff', `Reopened Liftoff for ${row.company}`)}><Icon name="sparkles" size={15} /> Rerun Liftoff</Button>
      </div>
    </Modal>
  );
}

export default function Admin() {
  const st = useAdmin();
  const toast = useToast();
  const [filters, setFilters] = useState({ q: '', range: 'all', source: 'all', plan: 'all', status: 'all', sort: 'recent' });
  const [drawer, setDrawer] = useState(null);
  const [adding, setAdding] = useState(false);
  const set = (k, v) => setFilters(s => ({ ...s, [k]: v }));

  const m = useMemo(() => adminMetrics(), [st]);
  const rows = useMemo(() => filterSignups(filters), [st, filters]);

  return (
    <div className="page">
      <PageTitle title="Admin" sub="Signups, growth, and every account in one place" eyebrow="Back office"
        action={<Button onClick={() => setAdding(true)}><Icon name="plus" size={15} /> New company</Button>} />

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <StatCard label="Total signups" value={m.total} icon={<Icon name="users" size={18} />} accent="var(--accent)" sub={`${m.seats.toLocaleString()} seats total`} />
        <StatCard label="New this week" value={m.week} icon={<Icon name="trendUp" size={18} />} accent="var(--accent-teal)" spark={m.trend} sparkColor="var(--accent-teal)" sub={`${m.today} today . ${m.month} in 30d`} />
        <StatCard label="MRR" value={m.mrr} format={money} icon={<Icon name="dollar" size={18} />} accent="var(--ok)" sub={`${moneyK(m.arr)} ARR`} />
        <StatCard label="Active accounts" value={m.active} icon={<Icon name="check" size={18} />} accent="var(--accent-purple)" sub={`${m.trial} trial . ${m.leads} leads`} />
        <StatCard label="Avg revenue / account" value={m.arpa} format={money} icon={<Icon name="receipt" size={18} />} accent="var(--accent)" sub={`${m.conversion}% trial to active`} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <Card>
          <SectionHeader title="Signups, last 14 days" />
          <div style={{ marginTop: '.6rem' }}><MiniBars data={m.trend} w={320} h={70} color="var(--accent)" /></div>
          <div className="t-sm muted" style={{ marginTop: '.5rem' }}>{m.trend.reduce((a, b) => a + b, 0)} signups in the last two weeks</div>
        </Card>
        <BreakdownCard title="By source" rows={m.bySource} />
        <BreakdownCard title="By plan" rows={m.byPlan} fmt={r => r.count} />
      </div>

      <Card pad={false}>
        <div className="row gap-2 wrap" style={{ padding: '.9rem 1rem', borderBottom: '1px solid var(--line)', alignItems: 'center' }}>
          <div className="row gap-2" style={{ flex: 1, minWidth: 200, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '.45rem .7rem' }}>
            <Icon name="search" size={16} />
            <input value={filters.q} onChange={e => set('q', e.target.value)} placeholder="Search company, contact, email..."
              style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, color: 'var(--ink)', fontSize: '.95rem' }} />
          </div>
          <Select value={filters.range} onChange={e => set('range', e.target.value)}>{RANGES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}</Select>
          <Select value={filters.source} onChange={e => set('source', e.target.value)}><option value="all">All sources</option>{SOURCES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</Select>
          <Select value={filters.plan} onChange={e => set('plan', e.target.value)}><option value="all">All plans</option>{PLANS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}</Select>
          <Select value={filters.status} onChange={e => set('status', e.target.value)}><option value="all">All statuses</option>{STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</Select>
          <Select value={filters.sort} onChange={e => set('sort', e.target.value)}>{SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</Select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', minWidth: 820 }}>
            <thead>
              <tr>
                <th>Company</th><th>Contact</th><th style={{ textAlign: 'right' }}>Seats</th><th>Plan</th>
                <th style={{ textAlign: 'right' }}>MRR</th><th>Source</th><th>Signed up</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} style={r.isNew ? { background: 'color-mix(in srgb, var(--accent) 6%, transparent)' } : undefined}>
                  <td>
                    <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
                      <Avatar name={r.company} size={28} color={avatarColor(r.company)} />
                      <div className="col" style={{ minWidth: 0 }}>
                        <span className="fw-7 clip">{r.company}</span>
                        <span className="t-xs muted clip">{r.industry}</span>
                      </div>
                    </div>
                  </td>
                  <td><div className="col" style={{ minWidth: 0 }}><span className="clip">{r.contact}</span><span className="t-xs muted clip">{r.email}</span></div></td>
                  <td style={{ textAlign: 'right' }} className="tnum">{r.seats.toLocaleString()}</td>
                  <td><Badge tone="neutral">{planLabel(r.plan)}</Badge></td>
                  <td style={{ textAlign: 'right' }} className="tnum fw-7">{r.mrr ? money(r.mrr) : '-'}</td>
                  <td className="t-sm">{sourceLabel(r.source)}</td>
                  <td className="t-sm"><span title={new Date(r.signedUpAt).toLocaleString()}>{relTime(r.signedUpAt)}</span></td>
                  <td><StatusPill status={r.status} /></td>
                  <td style={{ textAlign: 'right' }}>
                    <Button size="sm" variant="ghost" onClick={() => setDrawer(r)}>Launch into <Icon name="arrowRight" size={14} /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <EmptyState icon="search" title="No signups match" body="Try widening the filters or changing the date range." />}
        </div>
        <div className="row between t-sm muted" style={{ padding: '.7rem 1rem', borderTop: '1px solid var(--line)' }}>
          <span>Showing {rows.length} of {m.total} accounts</span>
          <span>{money(m.mrr)} MRR . {m.seats.toLocaleString()} seats</span>
        </div>
      </Card>

      <NewCompanyModal open={adding} onClose={() => setAdding(false)} onDone={() => toast('Company account created')} />
      <LaunchDrawer row={drawer} onClose={() => setDrawer(null)} />
    </div>
  );
}
