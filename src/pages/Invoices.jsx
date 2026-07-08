// Billing - invoices and accounts receivable. AR KPIs, an aging split
// (current vs overdue), and a status-filtered ledger with a one-click
// "Mark paid" action wired to the store's updateInvoice writer.
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getInvoices, arOutstanding, arOverdue, arPaid, updateInvoice, useExt,
} from '../lib/store-ext.js';
import { getCompany } from '../lib/store.js';
import {
  SectionHeader, StatCard, Segmented, Badge, Button, ProgressBar,
  money, moneyK, relTime, useToast, Card,
} from '../components/UI.jsx';
import DataTable from '../components/DataTable.jsx';
import { Icon } from '../components/icons.jsx';

const STATUS_TONE = { paid: 'ok', open: 'info', overdue: 'risk', draft: 'default' };

export default function Invoices() {
  useExt(); // reactive to store commits
  const invoices = getInvoices();
  const toast = useToast();
  const [status, setStatus] = useState('All');

  const outstanding = arOutstanding();
  const overdue = arOverdue();
  const paid = arPaid();
  const draftCount = invoices.filter(i => i.status === 'draft').length;

  // AR aging: current (open, not overdue) vs overdue, as a share of outstanding.
  const current = Math.max(0, outstanding - overdue);
  const overduePct = outstanding ? Math.round((overdue / outstanding) * 100) : 0;
  const currentPct = outstanding ? 100 - overduePct : 0;

  const rows = useMemo(
    () => (status === 'All' ? invoices : invoices.filter(i => i.status === status)),
    [invoices, status],
  );

  const markPaid = (inv) => {
    updateInvoice(inv.id, { status: 'paid' });
    toast(`${inv.number} marked paid.`, 'ok');
  };

  const columns = [
    {
      key: 'number', header: 'Number', width: '12%',
      render: (r) => <span className="mono fw-6">{r.number}</span>,
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
      key: 'status', header: 'Status', sortValue: (r) => r.status,
      render: (r) => <Badge tone={STATUS_TONE[r.status] || 'default'}>{r.status}</Badge>,
    },
    {
      key: 'issuedAt', header: 'Issued', sortValue: (r) => new Date(r.issuedAt).getTime(),
      render: (r) => <span className="t-sm muted">{relTime(r.issuedAt)}</span>,
    },
    {
      key: 'dueAt', header: 'Due', sortValue: (r) => new Date(r.dueAt).getTime(),
      render: (r) => (
        <span
          className="t-sm"
          style={{ color: r.status === 'overdue' ? 'var(--risk)' : 'var(--n-600)', fontWeight: r.status === 'overdue' ? 700 : 400 }}
        >
          {relTime(r.dueAt)}
        </span>
      ),
    },
    {
      key: 'act', header: '', sortable: false, align: 'right',
      render: (r) => (
        r.status === 'paid'
          ? <span className="t-xs muted">Paid</span>
          : (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); markPaid(r); }}
            >
              Mark paid
            </Button>
          )
      ),
    },
  ];

  const segOptions = ['All', 'paid', 'open', 'overdue', 'draft'];

  return (
    <div className="col gap-3">
      <SectionHeader title="Billing" sub="Invoices and accounts receivable." />

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
        <StatCard label="AR outstanding" value={outstanding} format={moneyK} icon={<Icon name="receipt" size={18} />} sub="open + overdue" />
        <StatCard label="Overdue" value={overdue} format={moneyK} icon={<Icon name="dollar" size={18} />} accent="var(--risk)" sub="past due" />
        <StatCard label="Collected" value={paid} format={moneyK} icon={<Icon name="check" size={18} />} accent="var(--ok)" sub="paid to date" />
        <StatCard label="Draft" value={draftCount} icon={<Icon name="box" size={18} />} sub="not yet sent" />
      </div>

      <Card>
        <div className="row between" style={{ marginBottom: 12 }}>
          <div className="stat-label">AR aging</div>
          <div className="t-sm muted">{moneyK(outstanding)} outstanding</div>
        </div>
        <div className="col gap-2">
          <div>
            <div className="row between t-sm" style={{ marginBottom: 6 }}>
              <span className="fw-6">Current</span>
              <span className="muted">{money(current)} - {currentPct}%</span>
            </div>
            <ProgressBar value={currentPct} color="var(--ok)" height={10} />
          </div>
          <div>
            <div className="row between t-sm" style={{ marginBottom: 6 }}>
              <span className="fw-6">Overdue</span>
              <span className="muted">{money(overdue)} - {overduePct}%</span>
            </div>
            <ProgressBar value={overduePct} color="var(--risk)" height={10} />
          </div>
        </div>
      </Card>

      <DataTable
        columns={columns}
        rows={rows}
        searchKeys={['number', 'companyName']}
        searchPlaceholder="Filter invoices..."
        initialSort={{ key: 'issuedAt', dir: 'desc' }}
        rightControls={<Segmented options={segOptions} value={status} onChange={setStatus} />}
      />
    </div>
  );
}
