// Quotes - configure, price, quote. CPQ surface over the quote book: open vs
// accepted value, acceptance rate, and a status-filtered grid with a one-click
// "Mark accepted" action wired to the store's updateQuote writer.
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getQuotes, updateQuote, useExt } from '../lib/store-ext.js';
import { getCompany } from '../lib/store.js';
import {
  SectionHeader, StatCard, Segmented, Badge, Button, money, moneyK, relTime, useToast,
} from '../components/UI.jsx';
import DataTable from '../components/DataTable.jsx';
import { Icon } from '../components/icons.jsx';

const STATUS_TONE = { draft: 'default', sent: 'info', accepted: 'ok', expired: 'risk' };

export default function Quotes() {
  useExt(); // reactive to store commits
  const quotes = getQuotes();
  const toast = useToast();
  const [status, setStatus] = useState('All');

  const openValue = quotes
    .filter(q => q.status === 'draft' || q.status === 'sent')
    .reduce((s, q) => s + q.amount, 0);
  const acceptedValue = quotes
    .filter(q => q.status === 'accepted')
    .reduce((s, q) => s + q.amount, 0);
  const acceptedCount = quotes.filter(q => q.status === 'accepted').length;
  const expiredCount = quotes.filter(q => q.status === 'expired').length;
  const acceptanceRate = acceptedCount + expiredCount
    ? Math.round((acceptedCount / (acceptedCount + expiredCount)) * 100)
    : 0;
  const avgQuote = quotes.length
    ? quotes.reduce((s, q) => s + q.amount, 0) / quotes.length
    : 0;

  const rows = useMemo(
    () => (status === 'All' ? quotes : quotes.filter(q => q.status === status)),
    [quotes, status],
  );

  const markAccepted = (q) => {
    updateQuote(q.id, { status: 'accepted' });
    toast(`${q.number} marked accepted.`, 'ok');
  };

  const columns = [
    {
      key: 'number', header: 'Number', width: '11%',
      render: (r) => <span className="mono fw-7">{r.number}</span>,
    },
    {
      key: 'company', header: 'Company',
      value: (r) => getCompany(r.companyId)?.name || r.companyName,
      render: (r) => {
        const name = getCompany(r.companyId)?.name || r.companyName;
        return r.companyId
          ? <Link to={`/companies/${r.companyId}`} className="link" onClick={e => e.stopPropagation()}>{name}</Link>
          : <span>{name}</span>;
      },
    },
    {
      key: 'amount', header: 'Amount', align: 'right', sortValue: (r) => r.amount,
      render: (r) => <span className="fw-7">{money(r.amount)}</span>,
    },
    {
      key: 'seats', header: 'Seats', align: 'right', sortValue: (r) => r.seats,
      render: (r) => <span className="t-sm muted">{r.seats}</span>,
    },
    {
      key: 'status', header: 'Status', sortValue: (r) => r.status,
      render: (r) => <Badge tone={STATUS_TONE[r.status] || 'default'}>{r.status}</Badge>,
    },
    {
      key: 'createdAt', header: 'Created', sortValue: (r) => new Date(r.createdAt).getTime(),
      render: (r) => <span className="t-sm muted">{relTime(r.createdAt)}</span>,
    },
    {
      key: 'expiresAt', header: 'Expires', sortValue: (r) => new Date(r.expiresAt).getTime(),
      render: (r) => <span className="t-sm muted">{relTime(r.expiresAt)}</span>,
    },
    {
      key: 'act', header: '', sortable: false, align: 'right',
      render: (r) => (
        r.status === 'accepted'
          ? <span className="t-xs muted">Accepted</span>
          : (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); markAccepted(r); }}
            >
              Mark accepted
            </Button>
          )
      ),
    },
  ];

  const segOptions = ['All', 'draft', 'sent', 'accepted', 'expired'];

  return (
    <div className="col gap-3">
      <SectionHeader
        title="Quotes"
        sub="Configure, price, quote."
        action={
          <Button variant="accent" onClick={() => toast('Quote builder is coming soon.', 'warn')}>
            <Icon name="plus" size={16} /> New quote
          </Button>
        }
      />

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
        <StatCard label="Open quote value" value={openValue} format={moneyK} icon={<Icon name="receipt" size={18} />} sub="draft + sent" />
        <StatCard label="Accepted value" value={acceptedValue} format={moneyK} icon={<Icon name="check" size={18} />} accent="var(--ok)" sub={`${acceptedCount} accepted`} />
        <StatCard label="Acceptance rate" value={acceptanceRate} format={(n) => `${Math.round(n)}%`} icon={<Icon name="chart" size={18} />} sub="accepted vs expired" />
        <StatCard label="Avg quote" value={avgQuote} format={moneyK} icon={<Icon name="dollar" size={18} />} sub="mean deal size" />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        searchKeys={['number', 'companyName']}
        searchPlaceholder="Filter quotes..."
        initialSort={{ key: 'amount', dir: 'desc' }}
        rightControls={<Segmented options={segOptions} value={status} onChange={setStatus} />}
      />
    </div>
  );
}
