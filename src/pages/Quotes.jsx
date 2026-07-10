// Quotes / CPQ - the quote book. Lists every quote on the live pipeline sourced
// from store-ext (the platform quote record) enriched with store-quote line items
// + totals. Rows open the full-page editor at /quotes/:id. "New quote" spins one
// up from a deal (pulling the deal's line items) or blank against an account.
// The deep editor, customer-facing document, PDF export, and status flow live in
// QuoteDetail.jsx + PublicQuote.jsx + store-quote.js.
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SectionHeader, StatCard, Segmented, Badge, Button, Card, Modal, Field, Select,
  EmptyState, useToast, Avatar, money, moneyK, shortDate,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import { getCompanies, getDeals, userName } from '../lib/store.js';
import { useExt } from '../lib/store-ext.js';
import {
  useQuoteStore, quoteTotals, getQuoteLines, setQuoteStatus,
  createQuoteFromDeal, createBlankQuote, QUOTE_STATUS_META,
} from '../lib/store-quote.js';

const STATUSES = ['draft', 'sent', 'accepted', 'expired'];
const pct = (n) => `${Math.round(n)}%`;
const TH = { padding: '.7rem 1.25rem', fontWeight: 700 };
const TD = { padding: '.85rem 1.25rem', verticalAlign: 'middle' };

export default function Quotes() {
  const nav = useNavigate();
  const toast = useToast();
  const quotes = useExt(s => s.quotes);
  const qstore = useQuoteStore();
  const companies = getCompanies();
  const coName = (q) => companies.find(c => c.id === q.companyId)?.name || q.companyName || 'Unknown account';

  const [status, setStatus] = useState('all');
  const [creating, setCreating] = useState(false);

  const stats = useMemo(() => {
    const totalQuoted = quotes.reduce((s, q) => s + quoteTotals(q.id).grandTotal, 0);
    const accepted = quotes.filter(q => q.status === 'accepted');
    const decided = quotes.filter(q => q.status === 'accepted' || q.status === 'expired');
    const acceptanceRate = decided.length ? (accepted.length / decided.length) * 100 : 0;
    const avgDealSize = quotes.length ? totalQuoted / quotes.length : 0;
    const now = Date.now(), soon = now + 7 * 86400000;
    const expiringSoon = quotes.filter(q => {
      if (q.status === 'accepted' || q.status === 'expired') return false;
      const t = new Date(q.expiresAt).getTime();
      return t >= now && t <= soon;
    }).length;
    return { totalQuoted, acceptanceRate, avgDealSize, expiringSoon, count: quotes.length };
  }, [quotes, qstore]);

  const rows = useMemo(() => {
    const list = status === 'all' ? quotes : quotes.filter(q => q.status === status);
    return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [quotes, status]);

  const segOptions = [
    { value: 'all', label: `All (${quotes.length})` },
    ...STATUSES.map(s => ({ value: s, label: `${QUOTE_STATUS_META[s].label} (${quotes.filter(q => q.status === s).length})` })),
  ];

  return (
    <div className="col gap-3">
      <SectionHeader
        eyebrow="Configure - Price - Quote"
        title="Quotes"
        sub="Build enterprise quotes on your live pipeline. Price it, send it, close it."
        action={<Button variant="accent" onClick={() => setCreating(true)}><Icon name="plus" size={16} /> New quote</Button>}
      />

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
        <StatCard label="Total quoted" value={stats.totalQuoted} format={moneyK} icon={<Icon name="receipt" size={18} />} sub={`${stats.count} quotes`} />
        <StatCard label="Acceptance rate" value={stats.acceptanceRate} format={pct} icon={<Icon name="check" size={18} />} accent="var(--ok)" sub="accepted vs decided" />
        <StatCard label="Avg quote size" value={stats.avgDealSize} format={moneyK} icon={<Icon name="dollar" size={18} />} sub="mean grand total" />
        <StatCard label="Expiring soon" value={stats.expiringSoon} icon={<Icon name="clock" size={18} />} accent="var(--warn)" sub="valid within 7 days" />
      </div>

      <Card pad={false}>
        <div className="row between wrap" style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line)', gap: '.75rem' }}>
          <div className="row gap-2" style={{ alignItems: 'center' }}><Icon name="box" size={18} /><strong>Quote book</strong></div>
          <Segmented options={segOptions} value={status} onChange={setStatus} />
        </div>

        {rows.length === 0 ? (
          <EmptyState icon="🧾" title="No quotes here yet"
            body="Spin up a quote against any account in your pipeline and price it in seconds."
            action={<Button variant="accent" onClick={() => setCreating(true)}><Icon name="plus" size={16} /> New quote</Button>} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '17px' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--n-600)', fontSize: '.82rem', textTransform: 'uppercase', letterSpacing: '.03em' }}>
                  <th style={TH}>Quote</th>
                  <th style={TH}>Account</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Amount</th>
                  <th style={TH}>Status</th>
                  <th style={TH}>Owner</th>
                  <th style={TH}>Valid until</th>
                  <th style={{ ...TH, textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(q => {
                  const totals = quoteTotals(q.id);
                  const nLines = getQuoteLines(q.id).length;
                  const expired = q.status === 'expired';
                  const on = new Date(q.expiresAt).getTime() < Date.now() && q.status !== 'accepted';
                  return (
                    <tr key={q.id} className="quote-row" style={{ borderTop: '1px solid var(--line)', cursor: 'pointer' }}
                      onClick={() => nav(`/quotes/${q.id}`)}>
                      <td style={TD}>
                        <div className="col" style={{ gap: 2 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{q.number}</span>
                          <span className="t-xs muted">{nLines} line{nLines !== 1 ? 's' : ''}</span>
                        </div>
                      </td>
                      <td style={TD}>{coName(q)}</td>
                      <td style={{ ...TD, textAlign: 'right', fontWeight: 700 }}>{money(totals.grandTotal)}</td>
                      <td style={TD}><Badge tone={QUOTE_STATUS_META[q.status]?.tone || 'default'}>{QUOTE_STATUS_META[q.status]?.label || q.status}</Badge></td>
                      <td style={TD}>
                        <div className="row gap-2" style={{ alignItems: 'center' }}>
                          <Avatar name={userName(q.ownerId)} size={26} />
                          <span className="t-sm">{userName(q.ownerId)}</span>
                        </div>
                      </td>
                      <td style={{ ...TD, color: (expired || on) ? 'var(--risk)' : undefined }}>{shortDate(q.expiresAt)}</td>
                      <td style={{ ...TD, textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <div className="row gap-1" style={{ justifyContent: 'flex-end' }}>
                          {q.status !== 'accepted' && (
                            <Button variant="ghost" size="sm" onClick={() => { setQuoteStatus(q.id, 'accepted'); toast(`${q.number} marked accepted.`); }}>
                              Mark accepted
                            </Button>
                          )}
                          <Button variant="quiet" size="sm" onClick={() => nav(`/quotes/${q.id}`)}>Open</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {creating && <NewQuoteModal companies={companies} onClose={() => setCreating(false)} onCreated={(id) => nav(`/quotes/${id}`)} />}
    </div>
  );
}

/* ============================================================
   NEW QUOTE - from a deal (pulls its line items) or blank
   ============================================================ */
function NewQuoteModal({ companies, onClose, onCreated }) {
  const deals = getDeals();
  const toast = useToast();
  const [companyId, setCompanyId] = useState(companies[0]?.id || '');
  const dealsForCo = deals.filter(d => d.companyId === companyId);
  const [dealId, setDealId] = useState('');

  const submit = () => {
    if (!companyId) { toast('Pick an account.', 'warn'); return; }
    const res = dealId ? createQuoteFromDeal(dealId) : createBlankQuote({ companyId });
    if (res.error) { toast(res.message, 'risk'); return; }
    toast(`${res.quote.number} created.`);
    onCreated(res.quote.id);
  };

  return (
    <Modal open onClose={onClose} title="New quote" width={520}
      footer={<><Button variant="quiet" onClick={onClose}>Cancel</Button><Button variant="accent" onClick={submit}>Create + build</Button></>}>
      <div className="col gap-3">
        <Field label="Account">
          <Select value={companyId} onChange={e => { setCompanyId(e.target.value); setDealId(''); }}>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Quote from a deal" hint="Pulls the deal's line items into the quote. Leave blank for a fresh starter quote.">
          <Select value={dealId} onChange={e => setDealId(e.target.value)}>
            <option value="">Blank quote (starter line)</option>
            {dealsForCo.map(d => <option key={d.id} value={d.id}>{d.name} - {moneyK(d.value)}</option>)}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
