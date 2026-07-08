// Leads. Top-of-funnel demand before it becomes an account: a scored,
// sourced, ownable book that a rep works down to qualified. KPI rail with
// live sparks, a real visual funnel (New -> Working -> Qualified), a
// segmented status filter, and a dense sortable grid with inline score
// bars and a one-click "mark qualified" bulk action. New-lead modal writes
// straight through createLead. Fully alive off the seeded book of business.
import React, { useMemo, useState } from 'react';
import {
  useExt, getLeads, qualifiedLeads, updateLead, createLead,
} from '../lib/store-ext.js';
import { useStore, getUsers, userName } from '../lib/store.js';
import {
  Button, Card, Badge, Avatar, SectionHeader, Field, Input, Select, Modal,
  StatCard, Segmented, ProgressBar, useToast,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import DataTable from '../components/DataTable.jsx';

const SOURCES = ['Inbound', 'Outbound', 'Referral', 'Event', 'Webinar', 'Partner', 'Paid ads', 'Content'];

// funnel + status palette (one accent, functional colors elsewhere)
const FUNNEL = [
  { key: 'new', label: 'New', color: '#2563a8' },
  { key: 'working', label: 'Working', color: '#b3721a' },
  { key: 'qualified', label: 'Qualified', color: '#1a7f52' },
];
const STATUS_TONE = { new: 'info', working: 'warn', qualified: 'ok', unqualified: 'risk' };
const SCORE_COLOR = (s) => (s >= 70 ? 'var(--ok)' : s >= 40 ? 'var(--warn)' : 'var(--n-400)');

// Build a small plausible upward series from a target count, for the KPI sparks.
const sparkTo = (target, n = 8, floor = 0.55) => {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const base = floor + (1 - floor) * t;
    const wobble = 1 + Math.sin(i * 1.7) * 0.05;
    out.push(Math.max(1, Math.round(target * base * wobble)));
  }
  out[n - 1] = Math.max(out[n - 1], target);
  return out;
};

const emptyDraft = () => ({ firstName: '', lastName: '', company: '', title: '', email: '', source: 'Inbound' });

export default function Leads() {
  useExt();
  useStore();
  const toast = useToast();
  const [status, setStatus] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);

  const leads = getLeads();

  const stats = useMemo(() => {
    const total = leads.length;
    const qualified = qualifiedLeads().length;
    const scores = leads.map(l => l.score || 0);
    const avg = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0;
    const weekAgo = Date.now() - 7 * 86400000;
    const newThisWeek = leads.filter(l => new Date(l.createdAt).getTime() >= weekAgo).length;
    const counts = { new: 0, working: 0, qualified: 0, unqualified: 0 };
    for (const l of leads) counts[l.status] = (counts[l.status] || 0) + 1;
    return { total, qualified, avg, newThisWeek, counts };
  }, [leads]);

  const funnelMax = Math.max(1, ...FUNNEL.map(f => stats.counts[f.key] || 0));

  const rows = status === 'All' ? leads : leads.filter(l => l.status === status);

  const openModal = () => { setDraft(emptyDraft()); setModalOpen(true); };
  const submit = () => {
    const r = createLead({
      firstName: draft.firstName,
      lastName: draft.lastName,
      company: draft.company,
      title: draft.title,
      email: draft.email,
      source: draft.source,
    });
    if (r.error) return toast(r.message, 'risk');
    setModalOpen(false);
    toast('Lead created');
  };

  const markQualified = (ids) => {
    ids.forEach(id => updateLead(id, { status: 'qualified' }));
    toast(`${ids.length} lead${ids.length === 1 ? '' : 's'} marked qualified`);
  };

  const columns = [
    {
      key: 'name', header: 'Name', width: '20%',
      value: (l) => l.name,
      sortValue: (l) => l.name,
      render: (l) => (
        <span className="row gap-2" style={{ minWidth: 0 }}>
          <Avatar name={l.name} size={26} />
          <span className="fw-6 clip" style={{ color: 'var(--ink)' }}>{l.name}</span>
        </span>
      ),
    },
    {
      key: 'company', header: 'Company',
      value: (l) => l.company,
      render: (l) => <span className="clip">{l.company || <span className="muted">-</span>}</span>,
    },
    {
      key: 'title', header: 'Title',
      value: (l) => l.title,
      render: (l) => <span className="t-sm muted clip">{l.title || '-'}</span>,
    },
    {
      key: 'source', header: 'Source',
      value: (l) => l.source,
      render: (l) => <Badge>{l.source}</Badge>,
    },
    {
      key: 'score', header: 'Score', align: 'right',
      sortValue: (l) => l.score,
      render: (l) => (
        <span className="row gap-2" style={{ justifyContent: 'flex-end' }}>
          <span style={{ width: 70 }}><ProgressBar value={l.score} color={SCORE_COLOR(l.score)} height={6} /></span>
          <span className="tnum fw-6" style={{ width: 26, textAlign: 'right' }}>{l.score}</span>
        </span>
      ),
    },
    {
      key: 'status', header: 'Status',
      value: (l) => l.status,
      render: (l) => <Badge tone={STATUS_TONE[l.status] || 'default'}>{l.status}</Badge>,
    },
    {
      key: 'owner', header: 'Owner',
      value: (l) => userName(l.ownerId),
      sortValue: (l) => userName(l.ownerId),
      render: (l) => (
        <span className="row gap-1" style={{ minWidth: 0 }}>
          <Avatar name={userName(l.ownerId)} size={24} />
          <span className="clip t-sm">{userName(l.ownerId)}</span>
        </span>
      ),
    },
    {
      key: 'created', header: 'Created', align: 'right',
      sortValue: (l) => new Date(l.createdAt).getTime(),
      render: (l) => <span className="tnum t-sm muted">{relDays(l.createdAt)}</span>,
    },
  ];

  const bulkActions = [
    { label: 'Mark qualified', onClick: markQualified },
  ];

  return (
    <div className="fade-up">
      <SectionHeader
        title="Leads"
        sub={`${stats.total} leads in the funnel - ${stats.qualified} qualified and ready to convert`}
        action={
          <Button variant="primary" size="sm" onClick={openModal}>
            <Icon name="plus" size={16} /> New lead
          </Button>
        }
      />

      {/* KPI rail */}
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', marginBottom: '1.15rem' }}>
        <StatCard
          label="Total leads" value={stats.total}
          trend={12} spark={sparkTo(stats.total)}
          icon={<Icon name="funnel" size={18} />}
        />
        <StatCard
          label="Qualified" value={stats.qualified}
          sub={`${stats.total ? Math.round((stats.qualified / stats.total) * 100) : 0}% of funnel`}
          spark={sparkTo(stats.qualified)} sparkColor="var(--ok)" accent="var(--ok)"
          icon={<Icon name="check" size={18} />}
          onClick={() => setStatus('qualified')}
        />
        <StatCard
          label="Avg score" value={stats.avg}
          sub="lead quality index"
          spark={sparkTo(stats.avg, 8, 0.75)}
          icon={<Icon name="target" size={18} />}
        />
        <StatCard
          label="New this week" value={stats.newThisWeek}
          trend={8} spark={sparkTo(stats.newThisWeek)}
          icon={<Icon name="sparkles" size={18} />}
        />
      </div>

      {/* Visual funnel */}
      <Card className="card-pad" style={{ marginBottom: '1.15rem' }}>
        <div className="row between" style={{ marginBottom: '1rem' }}>
          <div className="col gap-1">
            <div className="eyebrow">Conversion funnel</div>
            <h4 style={{ margin: 0 }}>New to qualified</h4>
          </div>
          <Badge tone="accent">
            {stats.total ? Math.round((stats.qualified / Math.max(1, stats.counts.new + stats.counts.working + stats.qualified)) * 100) : 0}% qualify rate
          </Badge>
        </div>
        <div className="col gap-3">
          {FUNNEL.map((f, i) => {
            const count = stats.counts[f.key] || 0;
            const pct = Math.round((count / funnelMax) * 100);
            return (
              <div key={f.key} className="col gap-1">
                <div className="row between">
                  <span className="row gap-2">
                    <span className="dot" style={{ background: f.color }} />
                    <span className="fw-6">{f.label}</span>
                    {i > 0 && (
                      <span className="t-xs muted">
                        {stats.counts[FUNNEL[i - 1].key]
                          ? Math.round((count / stats.counts[FUNNEL[i - 1].key]) * 100)
                          : 0}% from {FUNNEL[i - 1].label.toLowerCase()}
                      </span>
                    )}
                  </span>
                  <span className="tnum fw-7">{count}</span>
                </div>
                <ProgressBar value={pct} color={f.color} height={14} />
              </div>
            );
          })}
        </div>
      </Card>

      {/* Filter + table */}
      <div className="row between wrap" style={{ marginBottom: '.85rem', gap: '1rem' }}>
        <Segmented
          options={[
            { value: 'All', label: 'All' },
            { value: 'new', label: 'New' },
            { value: 'working', label: 'Working' },
            { value: 'qualified', label: 'Qualified' },
            { value: 'unqualified', label: 'Unqualified' },
          ]}
          value={status}
          onChange={setStatus}
        />
        <span className="t-sm muted">{rows.length} shown</span>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        getId={(l) => l.id}
        searchable
        searchKeys={['name', 'company', 'title', 'email']}
        searchPlaceholder="Search leads..."
        initialSort={{ key: 'score', dir: 'desc' }}
        bulkActions={bulkActions}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New lead"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={submit}>Create lead</Button>
          </>
        }
      >
        <div className="col gap-3">
          <div className="row gap-2" style={{ alignItems: 'flex-start' }}>
            <Field label="First name">
              <Input
                autoFocus placeholder="Jamie"
                value={draft.firstName}
                onChange={e => setDraft(d => ({ ...d, firstName: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && submit()}
              />
            </Field>
            <Field label="Last name">
              <Input
                placeholder="Rivera"
                value={draft.lastName}
                onChange={e => setDraft(d => ({ ...d, lastName: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && submit()}
              />
            </Field>
          </div>
          <Field label="Company">
            <Input
              placeholder="Northgate Systems"
              value={draft.company}
              onChange={e => setDraft(d => ({ ...d, company: e.target.value }))}
            />
          </Field>
          <div className="row gap-2" style={{ alignItems: 'flex-start' }}>
            <Field label="Title">
              <Input
                placeholder="VP of Sales"
                value={draft.title}
                onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
              />
            </Field>
            <Field label="Source">
              <Select value={draft.source} onChange={e => setDraft(d => ({ ...d, source: e.target.value }))}>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Email">
            <Input
              type="email" placeholder="jamie@northgate.com"
              value={draft.email}
              onChange={e => setDraft(d => ({ ...d, email: e.target.value }))}
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

// Local relative-day helper (avoids a store dependency for a pure display).
function relDays(iso) {
  if (!iso) return '-';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
