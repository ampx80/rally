// Service inbox - Zendesk-grade support queue over the seeded tickets. Every
// customer issue in one sortable/filterable table with live KPIs, a priority
// breakdown, and a one-click status cycle per row. All reads flow through
// useExt() so a status cycle re-renders the whole surface immediately.
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTickets, openTickets, updateTicket, useExt } from '../lib/store-ext.js';
import { userName } from '../lib/store.js';
import {
  SectionHeader, StatCard, Segmented, Badge, Avatar, ProgressBar,
  Card, useToast, relTime,
} from '../components/UI.jsx';
import DataTable from '../components/DataTable.jsx';
import { Icon } from '../components/icons.jsx';

const PRIORITY_TONE = { urgent: 'risk', high: 'warn', medium: 'info', low: 'default' };
const PRIORITY_RANK = { urgent: 0, high: 1, medium: 2, low: 3 };
const STATUS_TONE = { open: 'info', pending: 'warn', solved: 'ok' };
const NEXT_STATUS = { open: 'pending', pending: 'solved', solved: 'open' };
const PRIORITY_BAR = { urgent: 'var(--risk)', high: 'var(--warn)', medium: 'var(--info)', low: 'var(--n-400)' };

export default function Inbox() {
  useExt(); // reactive to store commits
  const toast = useToast();
  const tickets = getTickets();
  const [status, setStatus] = useState('All');

  const open = openTickets();
  const urgentCount = open.filter(t => t.priority === 'urgent').length;
  const pendingCount = tickets.filter(t => t.status === 'pending').length;
  const solvedCount = tickets.filter(t => t.status === 'solved').length;

  // Priority breakdown across the whole queue for the mini bar row.
  const priorityCounts = useMemo(() => {
    const c = { urgent: 0, high: 0, medium: 0, low: 0 };
    for (const t of tickets) if (c[t.priority] != null) c[t.priority]++;
    return c;
  }, [tickets]);
  const priorityMax = Math.max(1, ...Object.values(priorityCounts));

  const rows = useMemo(
    () => (status === 'All' ? tickets : tickets.filter(t => t.status === status)),
    [tickets, status],
  );

  const cycle = (t) => {
    const next = NEXT_STATUS[t.status] || 'open';
    updateTicket(t.id, { status: next });
    toast(`#${t.number} moved to ${next}`, next === 'solved' ? 'ok' : 'warn');
  };

  const columns = [
    {
      key: 'number', header: '#', width: 80,
      sortValue: (r) => Number(r.number),
      render: (r) => <span className="mono t-sm muted">#{r.number}</span>,
    },
    {
      key: 'subject', header: 'Subject', width: '24%',
      render: (r) => <span className="fw-7 clip" style={{ minWidth: 0 }}>{r.subject}</span>,
    },
    {
      key: 'companyName', header: 'Company',
      render: (r) => (
        <Link to={`/companies/${r.companyId}`} onClick={(e) => e.stopPropagation()} className="link fw-6">
          {r.companyName}
        </Link>
      ),
    },
    {
      key: 'contactName', header: 'Contact',
      render: (r) => <span className="t-sm">{r.contactName}</span>,
    },
    {
      key: 'priority', header: 'Priority',
      sortValue: (r) => PRIORITY_RANK[r.priority] ?? 9,
      render: (r) => <Badge tone={PRIORITY_TONE[r.priority] || 'default'}>{r.priority}</Badge>,
    },
    {
      key: 'status', header: 'Status',
      render: (r) => <Badge tone={STATUS_TONE[r.status] || 'default'}>{r.status}</Badge>,
    },
    {
      key: 'assigneeId', header: 'Assignee',
      sortValue: (r) => userName(r.assigneeId),
      render: (r) => (
        <span className="row gap-2" style={{ alignItems: 'center' }}>
          <Avatar name={userName(r.assigneeId)} size={24} />
          <span className="t-sm">{userName(r.assigneeId)}</span>
        </span>
      ),
    },
    {
      key: 'createdAt', header: 'Created', align: 'right',
      sortValue: (r) => new Date(r.createdAt).getTime(),
      render: (r) => <span className="t-sm muted">{relTime(r.createdAt)}</span>,
    },
    {
      key: '_action', header: '', align: 'right', sortable: false, width: 130,
      render: (r) => (
        <button
          className="btn btn-ghost btn-sm"
          onClick={(e) => { e.stopPropagation(); cycle(r); }}
          title={`Move to ${NEXT_STATUS[r.status]}`}
        >
          <Icon name="chevronRight" size={14} /> {NEXT_STATUS[r.status]}
        </button>
      ),
    },
  ];

  return (
    <div className="col gap-3">
      <SectionHeader title="Service inbox" sub="Every customer issue, one queue." />

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
        <StatCard label="Open tickets" value={open.length} icon={<Icon name="inbox" size={18} />}
          spark={[6, 9, 7, 11, 8, 12, open.length]} sub="in the queue" />
        <StatCard label="Urgent" value={urgentCount} icon={<Icon name="bell" size={18} />} accent="var(--risk)"
          sparkColor="var(--risk)" spark={[1, 2, 1, 3, 2, 3, urgentCount]} sub="need attention now" />
        <StatCard label="Pending" value={pendingCount} icon={<Icon name="clock" size={18} />} accent="var(--warn)"
          sparkColor="var(--warn)" spark={[3, 4, 2, 5, 4, 6, pendingCount]} sub="awaiting reply" />
        <StatCard label="Solved" value={solvedCount} icon={<Icon name="check" size={18} />} accent="var(--ok)"
          sparkColor="var(--ok)" spark={[8, 10, 12, 11, 14, 13, solvedCount]} sub="all-time resolved" />
      </div>

      <Card>
        <div className="row between" style={{ marginBottom: '.9rem' }}>
          <span className="fw-7">By priority</span>
          <span className="t-xs muted">{tickets.length} total tickets</span>
        </div>
        <div className="col gap-3">
          {['urgent', 'high', 'medium', 'low'].map(p => (
            <div key={p} className="row gap-3" style={{ alignItems: 'center' }}>
              <div style={{ width: 72 }}>
                <Badge tone={PRIORITY_TONE[p]}>{p}</Badge>
              </div>
              <div style={{ flex: 1 }}>
                <ProgressBar value={(priorityCounts[p] / priorityMax) * 100} color={PRIORITY_BAR[p]} />
              </div>
              <span className="fw-7 t-sm" style={{ width: 28, textAlign: 'right' }}>{priorityCounts[p]}</span>
            </div>
          ))}
        </div>
      </Card>

      <DataTable
        columns={columns}
        rows={rows}
        getId={(r) => r.id}
        searchable
        searchKeys={['subject', 'companyName']}
        searchPlaceholder="Filter tickets..."
        initialSort={{ key: 'priority', dir: 'asc' }}
        rightControls={
          <Segmented
            options={['All', 'open', 'pending', 'solved']}
            value={status}
            onChange={setStatus}
          />
        }
      />
    </div>
  );
}
