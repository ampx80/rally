// Billing / Invoices - accounts receivable that beats NetSuite. A live
// invoice ledger tied to real accounts + won deals, AR KPIs with count-up,
// revenue-by-month + AR-aging charts, a full invoice detail modal (line
// items, tax, status timeline, mark-paid / remind / download), and a
// "create invoice from deal" flow. All state persists to localStorage.
import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  getInvoices, arOutstanding, arOverdue, totalBilled, paidThisMonth,
  collectedToDate, mrrEstimate, arrEstimate, revenueByMonth, agingBuckets,
  markPaid, logReminder, createInvoiceFromDeal, useInvoices,
} from '../lib/invoices-data.js';
import { getDeals, getCompany } from '../lib/store.js';
import {
  Card, Button, Badge, StatCard, Segmented, Modal, Field, Select,
  Input, EmptyState, useToast, ProgressBar, AnimatedNumber,
  money, moneyK, monthDay, shortDate,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';

const STATUS_TONE = { paid: 'ok', sent: 'info', overdue: 'risk', draft: 'default' };
const STATUS_LABEL = { paid: 'Paid', sent: 'Sent', overdue: 'Overdue', draft: 'Draft' };

export default function Invoices() {
  useInvoices();            // re-render on any billing commit
  const toast = useToast();
  const invoices = getInvoices();

  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  /* ---- KPIs ---- */
  const kpis = useMemo(() => ({
    billed: totalBilled(),
    outstanding: arOutstanding(),
    overdue: arOverdue(),
    paidMonth: paidThisMonth(),
    collected: collectedToDate(),
    mrr: mrrEstimate(),
    arr: arrEstimate(),
  }), [invoices]);

  const revenue = useMemo(() => revenueByMonth(6), [invoices]);
  const aging = useMemo(() => agingBuckets(), [invoices]);
  const agingTotal = aging.reduce((s, b) => s + b.value, 0) || 1;

  /* ---- filtered ledger ---- */
  const counts = useMemo(() => {
    const c = { all: invoices.length, paid: 0, sent: 0, overdue: 0, draft: 0 };
    for (const i of invoices) c[i.status] = (c[i.status] || 0) + 1;
    return c;
  }, [invoices]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices
      .filter(i => status === 'all' || i.status === status)
      .filter(i => !q || i.number.toLowerCase().includes(q) || (i.companyName || '').toLowerCase().includes(q))
      .sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt));
  }, [invoices, status, query]);

  const open = openId ? invoices.find(i => i.id === openId) : null;

  const segOptions = [
    { value: 'all', label: `All ${counts.all}` },
    { value: 'sent', label: `Sent ${counts.sent}` },
    { value: 'overdue', label: `Overdue ${counts.overdue}` },
    { value: 'paid', label: `Paid ${counts.paid}` },
    { value: 'draft', label: `Draft ${counts.draft}` },
  ];

  const onMarkPaid = (inv) => { markPaid(inv.id); toast(`${inv.number} marked paid.`, 'ok'); };
  const onRemind = (inv) => { logReminder(inv.id); toast(`Reminder sent to ${inv.companyName}.`, 'ok'); };

  return (
    <div className="col gap-3">
      {/* ---- header ---- */}
      <div className="row between wrap gap-2" style={{ alignItems: 'flex-end' }}>
        <div className="col gap-1">
          <div className="eyebrow">Billing</div>
          <h2 style={{ margin: 0 }}>Invoices and accounts receivable</h2>
          <div className="muted t-sm">Real-time AR across every account. Cash you have earned, cash you are owed.</div>
        </div>
        <Button variant="accent" onClick={() => setCreateOpen(true)}>
          <Icon name="plus" size={16} /> New invoice
        </Button>
      </div>

      {/* ---- KPI row ---- */}
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))' }}>
        <StatCard label="Total billed" value={kpis.billed} format={moneyK} icon={<Icon name="receipt" size={18} />} sub="all sent + paid" />
        <StatCard label="Outstanding (AR)" value={kpis.outstanding} format={moneyK} icon={<Icon name="clock" size={18} />} sub="awaiting payment" />
        <StatCard label="Overdue" value={kpis.overdue} format={moneyK} icon={<Icon name="dollar" size={18} />} accent="var(--risk)" sub="past due date" />
        <StatCard label="Paid this month" value={kpis.paidMonth} format={moneyK} icon={<Icon name="check" size={18} />} accent="var(--ok)" sub="cash collected" />
        <StatCard label="MRR estimate" value={kpis.mrr} format={moneyK} icon={<Icon name="chart" size={18} />} sub={`${moneyK(kpis.arr)} ARR run rate`} />
      </div>

      {/* ---- charts ---- */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))' }}>
        <Card>
          <div className="row between" style={{ marginBottom: 10 }}>
            <div className="col gap-1">
              <div className="stat-label">Revenue billed</div>
              <div className="t-xs muted">last 6 months</div>
            </div>
            <Icon name="chart" size={18} style={{ color: 'var(--accent)' }} />
          </div>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <AreaChart data={revenue} margin={{ top: 8, right: 6, left: -14, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fontSize: 13, fill: 'var(--n-600)' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={moneyK} tick={{ fontSize: 12, fill: 'var(--n-600)' }} axisLine={false} tickLine={false} width={52} />
                <Tooltip formatter={(v) => money(v)} labelStyle={{ fontWeight: 700 }} contentStyle={{ borderRadius: 10, border: '1px solid var(--line)', fontSize: 14 }} />
                <Area type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2.5} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="row between" style={{ marginBottom: 10 }}>
            <div className="col gap-1">
              <div className="stat-label">AR aging</div>
              <div className="t-xs muted">{money(agingTotal === 1 ? 0 : agingTotal)} outstanding by age</div>
            </div>
            <Icon name="pie" size={18} style={{ color: 'var(--accent)' }} />
          </div>
          <div style={{ width: '100%', height: 130 }}>
            <ResponsiveContainer>
              <BarChart data={aging} margin={{ top: 8, right: 6, left: -14, bottom: 0 }}>
                <XAxis dataKey="key" tick={{ fontSize: 12, fill: 'var(--n-600)' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={moneyK} tick={{ fontSize: 12, fill: 'var(--n-600)' }} axisLine={false} tickLine={false} width={52} />
                <Tooltip formatter={(v) => money(v)} contentStyle={{ borderRadius: 10, border: '1px solid var(--line)', fontSize: 14 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {aging.map((b) => <Cell key={b.key} fill={b.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="col gap-1" style={{ marginTop: 10 }}>
            {aging.map(b => (
              <div key={b.key}>
                <div className="row between t-sm" style={{ marginBottom: 4 }}>
                  <span className="fw-6">{b.label}</span>
                  <span className="muted">{money(b.value)}</span>
                </div>
                <ProgressBar value={(b.value / agingTotal) * 100} color={b.color} height={7} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ---- ledger ---- */}
      <Card pad={false}>
        <div className="row between wrap gap-2" style={{ padding: '1rem 1.15rem', borderBottom: '1px solid var(--line)' }}>
          <Segmented options={segOptions} value={status} onChange={setStatus} />
          <div style={{ position: 'relative', minWidth: 220, flex: '0 1 280px' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)', pointerEvents: 'none' }}>
              <Icon name="search" size={16} />
            </span>
            <Input placeholder="Search number or account..." value={query} onChange={e => setQuery(e.target.value)} style={{ paddingLeft: 32 }} />
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState icon="🧾" title="No invoices here" body="Try a different status filter or clear your search." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--n-600)', fontSize: '.82rem', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  <th style={th}>Invoice</th>
                  <th style={th}>Account</th>
                  <th style={{ ...th, textAlign: 'right' }}>Amount</th>
                  <th style={th}>Status</th>
                  <th style={th}>Issued</th>
                  <th style={th}>Due</th>
                  <th style={{ ...th, textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(inv => {
                  const isOverdue = inv.status === 'overdue';
                  return (
                    <tr key={inv.id} onClick={() => setOpenId(inv.id)}
                      style={{ cursor: 'pointer', borderTop: '1px solid var(--line)', background: isOverdue ? 'color-mix(in srgb, var(--risk) 5%, transparent)' : 'transparent' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--n-100)'}
                      onMouseLeave={e => e.currentTarget.style.background = isOverdue ? 'color-mix(in srgb, var(--risk) 5%, transparent)' : 'transparent'}>
                      <td style={td}>
                        <span className="mono fw-7" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {isOverdue && <span className="dot" style={{ background: 'var(--risk)' }} />}
                          {inv.number}
                        </span>
                      </td>
                      <td style={td}>{inv.companyName}</td>
                      <td style={{ ...td, textAlign: 'right' }}><span className="fw-7">{money(inv.total)}</span></td>
                      <td style={td}><Badge tone={STATUS_TONE[inv.status]}>{STATUS_LABEL[inv.status]}</Badge></td>
                      <td style={{ ...td, color: 'var(--n-600)' }}>{shortDate(inv.issuedAt)}</td>
                      <td style={td}>
                        <span style={{ color: isOverdue ? 'var(--risk)' : 'var(--n-600)', fontWeight: isOverdue ? 700 : 400 }}>
                          {shortDate(inv.dueAt)}
                        </span>
                      </td>
                      <td style={{ ...td, textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        {inv.status === 'paid'
                          ? <span className="t-xs muted">Paid {shortDate(inv.paidAt)}</span>
                          : <Button variant="ghost" size="sm" onClick={() => onMarkPaid(inv)}>Mark paid</Button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {open && (
        <InvoiceDetail inv={open} onClose={() => setOpenId(null)} onMarkPaid={onMarkPaid} onRemind={onRemind} toast={toast} />
      )}
      {createOpen && (
        <CreateInvoice onClose={() => setCreateOpen(false)} toast={toast} onCreated={(id) => { setCreateOpen(false); setOpenId(id); }} />
      )}
    </div>
  );
}

const th = { padding: '.7rem 1.15rem', fontWeight: 700 };
const td = { padding: '.8rem 1.15rem', fontSize: '1rem' };

/* ============================================================
   INVOICE DETAIL MODAL
   ============================================================ */
function InvoiceDetail({ inv, onClose, onMarkPaid, onRemind, toast }) {
  const co = getCompany(inv.companyId);

  const downloadCsv = () => {
    const lines = [
      ['Invoice', inv.number],
      ['Account', inv.companyName],
      ['Status', inv.status],
      ['Issued', monthDay(inv.issuedAt)],
      ['Due', monthDay(inv.dueAt)],
      [],
      ['Item', 'Qty', 'Unit price', 'Amount'],
      ...inv.lines.map(l => [l.label, l.qty, l.price, l.amount]),
      [],
      ['Subtotal', '', '', inv.subtotal],
      ['Tax', '', '', inv.tax],
      ['Total', '', '', inv.total],
    ];
    const csv = lines.map(r => r.map(c => `"${String(c ?? '')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${inv.number}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast(`${inv.number}.csv downloaded.`, 'ok');
  };

  const footer = (
    <div className="row between" style={{ width: '100%', flexWrap: 'wrap', gap: 8 }}>
      <div className="row gap-2">
        <Button variant="ghost" size="sm" onClick={downloadCsv}><Icon name="download" size={15} /> CSV</Button>
        <Button variant="ghost" size="sm" onClick={() => window.print()}><Icon name="copy" size={15} /> Print</Button>
      </div>
      <div className="row gap-2">
        {inv.status !== 'paid' && (
          <Button variant="ghost" size="sm" onClick={() => onRemind(inv)}><Icon name="send" size={15} /> Send reminder</Button>
        )}
        {inv.status !== 'paid'
          ? <Button variant="accent" onClick={() => { onMarkPaid(inv); onClose(); }}><Icon name="check" size={16} /> Mark as paid</Button>
          : <Button variant="primary" onClick={onClose}>Close</Button>}
      </div>
    </div>
  );

  return (
    <Modal open onClose={onClose} title={`Invoice ${inv.number}`} footer={footer} width={640}>
      <div className="col gap-3">
        {/* account header */}
        <div className="row between wrap gap-2" style={{ alignItems: 'flex-start' }}>
          <div className="col gap-1">
            <div className="row gap-2" style={{ alignItems: 'center' }}>
              <span style={{ color: 'var(--accent)' }}><Icon name="building" size={18} /></span>
              <span className="fw-7" style={{ fontSize: '1.1rem' }}>{inv.companyName}</span>
            </div>
            {co && <div className="t-sm muted">{co.industry} · {co.location}</div>}
            <div className="t-xs muted mono">{inv.poNumber}</div>
          </div>
          <div className="col gap-1" style={{ alignItems: 'flex-end' }}>
            <Badge tone={STATUS_TONE[inv.status]}>{STATUS_LABEL[inv.status]}</Badge>
            <div className="t-sm muted">Issued {monthDay(inv.issuedAt)}</div>
            <div className="t-sm" style={{ color: inv.status === 'overdue' ? 'var(--risk)' : 'var(--n-600)', fontWeight: inv.status === 'overdue' ? 700 : 400 }}>
              Due {monthDay(inv.dueAt)} · net {inv.termDays}
            </div>
          </div>
        </div>

        {/* line items */}
        <div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--n-600)', fontSize: '.8rem', textTransform: 'uppercase', letterSpacing: '.03em' }}>
                <th style={{ padding: '.5rem 0' }}>Item</th>
                <th style={{ padding: '.5rem 0', textAlign: 'right' }}>Qty</th>
                <th style={{ padding: '.5rem 0', textAlign: 'right' }}>Price</th>
                <th style={{ padding: '.5rem 0', textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {inv.lines.map((l, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--line)' }}>
                  <td style={{ padding: '.6rem 0' }}>
                    <div className="fw-6">{l.label}</div>
                    <div className="t-xs muted">per {l.unit}</div>
                  </td>
                  <td style={{ padding: '.6rem 0', textAlign: 'right' }}>{l.qty}</td>
                  <td style={{ padding: '.6rem 0', textAlign: 'right' }} className="muted">{money(l.price)}</td>
                  <td style={{ padding: '.6rem 0', textAlign: 'right' }} className="fw-6">{money(l.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="col gap-1" style={{ marginTop: 12, marginLeft: 'auto', maxWidth: 260 }}>
            <div className="row between t-sm"><span className="muted">Subtotal</span><span>{money(inv.subtotal)}</span></div>
            <div className="row between t-sm"><span className="muted">Tax (8.25%)</span><span>{money(inv.tax)}</span></div>
            <div className="row between" style={{ borderTop: '1px solid var(--line)', paddingTop: 8, marginTop: 4 }}>
              <span className="fw-7">Total due</span>
              <span className="fw-7" style={{ fontSize: '1.2rem' }}><AnimatedNumber value={inv.total} format={money} /></span>
            </div>
          </div>
        </div>

        {/* status timeline */}
        <div>
          <div className="stat-label" style={{ marginBottom: 8 }}>Status timeline</div>
          <div className="col gap-2">
            {inv.timeline.map((t, i) => (
              <div key={i} className="row gap-2" style={{ alignItems: 'center' }}>
                <span className="dot" style={{ background: i === inv.timeline.length - 1 ? 'var(--accent)' : 'var(--n-400)', flex: 'none' }} />
                <span className="fw-6 t-sm" style={{ minWidth: 0 }}>{t.label}</span>
                <span className="t-xs muted" style={{ marginLeft: 'auto' }}>{monthDay(t.at)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ============================================================
   CREATE INVOICE FROM DEAL
   ============================================================ */
function CreateInvoice({ onClose, toast, onCreated }) {
  const wonDeals = useMemo(
    () => getDeals().filter(d => d.status === 'won').sort((a, b) => b.value - a.value),
    [],
  );
  const [dealId, setDealId] = useState(wonDeals[0]?.id || '');
  const selected = wonDeals.find(d => d.id === dealId);

  const create = () => {
    if (!dealId) { toast('Pick a deal first.', 'warn'); return; }
    const res = createInvoiceFromDeal(dealId);
    if (res.error) { toast(res.message || 'Could not create invoice.', 'risk'); return; }
    toast(`Draft ${res.invoice.number} created.`, 'ok');
    onCreated?.(res.invoice.id);
  };

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose}>Cancel</Button>
      <Button variant="accent" onClick={create} disabled={!wonDeals.length}>
        <Icon name="plus" size={16} /> Create draft
      </Button>
    </>
  );

  return (
    <Modal open onClose={onClose} title="New invoice from deal" footer={footer} width={520}>
      {wonDeals.length === 0 ? (
        <EmptyState icon="🎯" title="No won deals yet" body="Close a deal in the pipeline and it becomes billable here." />
      ) : (
        <div className="col gap-3">
          <div className="t-sm muted">Generate a draft invoice for a closed-won deal. The line items reconcile to the deal value and land in the ledger as a draft you can review and send.</div>
          <Field label="Won deal">
            <Select value={dealId} onChange={e => setDealId(e.target.value)}>
              {wonDeals.map(d => (
                <option key={d.id} value={d.id}>{d.name} · {money(d.value)}</option>
              ))}
            </Select>
          </Field>
          {selected && (
            <Card>
              <div className="row between" style={{ marginBottom: 6 }}>
                <div className="col gap-1">
                  <span className="fw-7">{getCompany(selected.companyId)?.name || 'Account'}</span>
                  <span className="t-sm muted">{selected.name}</span>
                </div>
                <span style={{ color: 'var(--accent)' }}><Icon name="target" size={20} /></span>
              </div>
              <div className="row between" style={{ borderTop: '1px solid var(--line)', paddingTop: 8 }}>
                <span className="muted t-sm">Deal value</span>
                <span className="fw-7" style={{ fontSize: '1.15rem' }}>{money(selected.value)}</span>
              </div>
            </Card>
          )}
        </div>
      )}
    </Modal>
  );
}
