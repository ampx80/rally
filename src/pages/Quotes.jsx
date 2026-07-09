// Quotes / CPQ - configure, price, quote. The full CPQ surface built to beat
// Salesforce CPQ: a quote book tied to real deals + companies, a live quote
// builder with a seeded product catalog + inline pricing math, a print-ready
// preview with download + status actions, and a discount-approval affordance.
// Data lives in ../lib/quotes-data.js (seeded + localStorage persisted).
import React, { useMemo, useState, useSyncExternalStore } from 'react';
import {
  SectionHeader, StatCard, Segmented, Badge, Button, Card, Modal, Field, Input, Select,
  EmptyState, useToast, Avatar, money, moneyK, shortDate,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import { getCompanies, getDeals } from '../lib/store.js';
import {
  PRODUCTS, productById, QUOTE_STATUSES, STATUS_META, TAX_RATE, APPROVAL_THRESHOLD,
  getQuotes, getQuote, quoteMath, needsApproval, quoteStats,
  createQuote, setQuoteStatus, addLine, updateLine, removeLine, updateQuote,
  subscribeQuotes,
} from '../lib/quotes-data.js';

/* subscribe the whole page to quote-store commits */
function useQuotesStore() {
  return useSyncExternalStore(subscribeQuotes, getQuotes, getQuotes);
}

const pct = (n) => `${Math.round(n)}%`;

export default function Quotes() {
  const quotes = useQuotesStore();
  const companies = getCompanies();
  const coName = (id) => companies.find(c => c.id === id)?.name || 'Unknown account';
  const toast = useToast();

  const [status, setStatus] = useState('all');
  const [openId, setOpenId] = useState(null);     // quote open in the builder
  const [previewId, setPreviewId] = useState(null); // quote open in preview
  const [creating, setCreating] = useState(false);

  const stats = useMemo(() => quoteStats(), [quotes]);

  const rows = useMemo(() => {
    const list = status === 'all' ? quotes : quotes.filter(q => q.status === status);
    return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [quotes, status]);

  const segOptions = [
    { value: 'all', label: `All (${quotes.length})` },
    ...QUOTE_STATUSES.map(s => ({ value: s, label: `${STATUS_META[s].label} (${quotes.filter(q => q.status === s).length})` })),
  ];

  const openQuote = openId ? getQuote(openId) : null;
  const previewQuote = previewId ? getQuote(previewId) : null;

  return (
    <div className="col gap-3">
      <SectionHeader
        eyebrow="Configure - Price - Quote"
        title="Quotes"
        sub="Build enterprise quotes on your live pipeline. Price it, send it, close it."
        action={
          <Button variant="accent" onClick={() => setCreating(true)}>
            <Icon name="plus" size={16} /> New quote
          </Button>
        }
      />

      {/* KPI row */}
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
        <StatCard label="Total quoted" value={stats.totalQuoted} format={moneyK} icon={<Icon name="receipt" size={18} />} sub={`${stats.count} quotes`} />
        <StatCard label="Acceptance rate" value={stats.acceptanceRate} format={pct} icon={<Icon name="check" size={18} />} accent="var(--ok)" sub="accepted vs decided" />
        <StatCard label="Avg deal size" value={stats.avgDealSize} format={moneyK} icon={<Icon name="dollar" size={18} />} sub="mean grand total" />
        <StatCard label="Expiring soon" value={stats.expiringSoon} icon={<Icon name="clock" size={18} />} accent="var(--warn)" sub="valid within 7 days" />
      </div>

      {/* quote book */}
      <Card pad={false}>
        <div className="row between wrap" style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line)', gap: '.75rem' }}>
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <Icon name="box" size={18} />
            <strong>Quote book</strong>
          </div>
          <Segmented options={segOptions} value={status} onChange={setStatus} />
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon="🧾"
            title="No quotes here yet"
            body="Spin up a quote against any account in your pipeline and price it in seconds."
            action={<Button variant="accent" onClick={() => setCreating(true)}><Icon name="plus" size={16} /> New quote</Button>}
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="quotes-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '17px' }}>
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
                  const m = quoteMath(q);
                  const approval = needsApproval(q);
                  const expired = q.status === 'expired';
                  return (
                    <tr key={q.id} className="quote-row" style={{ borderTop: '1px solid var(--line)', cursor: 'pointer' }}
                      onClick={() => setOpenId(q.id)}>
                      <td style={TD}>
                        <div className="col" style={{ gap: 2 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{q.number}</span>
                          <span className="t-xs muted">{q.lines.length} line{q.lines.length !== 1 ? 's' : ''} - {q.term}</span>
                        </div>
                      </td>
                      <td style={TD}>{coName(q.companyId)}</td>
                      <td style={{ ...TD, textAlign: 'right' }}>
                        <div className="col" style={{ gap: 2, alignItems: 'flex-end' }}>
                          <span style={{ fontWeight: 700 }}>{money(m.grandTotal)}</span>
                          {approval && <Badge tone="warn">Needs approval</Badge>}
                        </div>
                      </td>
                      <td style={TD}><Badge tone={STATUS_META[q.status].tone}>{STATUS_META[q.status].label}</Badge></td>
                      <td style={TD}>
                        <div className="row gap-2" style={{ alignItems: 'center' }}>
                          <Avatar name={q.ownerName} size={26} />
                          <span className="t-sm">{q.ownerName}</span>
                        </div>
                      </td>
                      <td style={{ ...TD, color: expired ? 'var(--risk)' : undefined }}>{shortDate(q.validUntil)}</td>
                      <td style={{ ...TD, textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <div className="row gap-1" style={{ justifyContent: 'flex-end' }}>
                          {q.status !== 'accepted' && (
                            <Button variant="ghost" size="sm" onClick={() => { setQuoteStatus(q.id, 'accepted'); toast(`${q.number} marked accepted.`); }}>
                              Mark accepted
                            </Button>
                          )}
                          <Button variant="quiet" size="sm" onClick={() => setPreviewId(q.id)}>Preview</Button>
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

      {creating && (
        <NewQuoteModal
          companies={companies}
          onClose={() => setCreating(false)}
          onCreated={(id) => { setCreating(false); setOpenId(id); }}
        />
      )}

      {openQuote && (
        <QuoteBuilder
          quote={openQuote}
          accountName={coName(openQuote.companyId)}
          onClose={() => setOpenId(null)}
          onPreview={() => { setPreviewId(openQuote.id); }}
          toast={toast}
        />
      )}

      {previewQuote && (
        <QuotePreview
          quote={previewQuote}
          accountName={coName(previewQuote.companyId)}
          company={companies.find(c => c.id === previewQuote.companyId)}
          onClose={() => setPreviewId(null)}
          toast={toast}
        />
      )}
    </div>
  );
}

const TH = { padding: '.7rem 1.25rem', fontWeight: 700 };
const TD = { padding: '.85rem 1.25rem', verticalAlign: 'middle' };

/* ============================================================
   NEW QUOTE MODAL - pick account + deal, seed a starter line
   ============================================================ */
function NewQuoteModal({ companies, onClose, onCreated }) {
  const deals = getDeals();
  const [companyId, setCompanyId] = useState(companies[0]?.id || '');
  const dealsForCo = deals.filter(d => d.companyId === companyId);
  const [dealId, setDealId] = useState('');
  const [term, setTerm] = useState('annual');
  const toast = useToast();

  const submit = () => {
    if (!companyId) { toast('Pick an account.', 'warn'); return; }
    const res = createQuote({
      companyId,
      dealId: dealId || null,
      term,
      lines: [{ productId: 'p_platform', name: productById('p_platform').name, sku: productById('p_platform').sku, unitPrice: productById('p_platform').price, qty: 25, discountPct: 0 }],
    });
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
        <Field label="Linked deal" hint="Optional - ties this quote to an open opportunity.">
          <Select value={dealId} onChange={e => setDealId(e.target.value)}>
            <option value="">No linked deal</option>
            {dealsForCo.map(d => <option key={d.id} value={d.id}>{d.name} - {moneyK(d.value)}</option>)}
          </Select>
        </Field>
        <Field label="Billing term">
          <Segmented options={[{ value: 'annual', label: 'Annual' }, { value: 'monthly', label: 'Monthly' }]} value={term} onChange={setTerm} />
        </Field>
        <div className="t-sm muted">A starter platform line is added automatically. Add products in the builder.</div>
      </div>
    </Modal>
  );
}

/* ============================================================
   QUOTE BUILDER - line items, inline qty/discount, live totals
   ============================================================ */
function QuoteBuilder({ quote, accountName, onClose, onPreview, toast }) {
  const [addOpen, setAddOpen] = useState(false);
  const m = quoteMath(quote);
  const approval = needsApproval(quote);

  return (
    <Modal open onClose={onClose} width={860}
      title={<span>{quote.number} - {accountName}</span>}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>Close</Button>
          <Button variant="ghost" onClick={onPreview}><Icon name="receipt" size={16} /> Preview</Button>
          {quote.status !== 'sent' && quote.status !== 'accepted' && (
            <Button variant="primary" onClick={() => { setQuoteStatus(quote.id, 'sent'); toast(`${quote.number} sent.`); }}>Mark sent</Button>
          )}
          {quote.status !== 'accepted' && (
            <Button variant="accent" onClick={() => { setQuoteStatus(quote.id, 'accepted'); toast(`${quote.number} accepted.`); }}>Mark accepted</Button>
          )}
        </>
      }>
      <div className="col gap-3">
        {/* header chips */}
        <div className="row between wrap" style={{ gap: '.75rem' }}>
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <Badge tone={STATUS_META[quote.status].tone}>{STATUS_META[quote.status].label}</Badge>
            <Badge tone="default">{quote.term === 'monthly' ? 'Monthly billing' : 'Annual billing'}</Badge>
            {approval && <Badge tone="warn">Needs approval - discount over {APPROVAL_THRESHOLD}%</Badge>}
          </div>
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <span className="t-sm muted">Billing term</span>
            <Segmented
              options={[{ value: 'annual', label: 'Annual' }, { value: 'monthly', label: 'Monthly' }]}
              value={quote.term}
              onChange={(v) => updateQuote(quote.id, { term: v })}
            />
          </div>
        </div>

        {approval && (
          <Card className="col gap-2" style={{ borderColor: 'var(--warn)', background: 'color-mix(in srgb, var(--warn) 7%, transparent)' }}>
            <div className="row between wrap" style={{ gap: '.5rem', alignItems: 'center' }}>
              <div className="col" style={{ gap: 2 }}>
                <strong>Discount approval required</strong>
                <span className="t-sm muted">Blended discount is {m.blendedDiscountPct.toFixed(1)}%, above the {APPROVAL_THRESHOLD}% desk threshold.</span>
              </div>
              <Button variant="primary" onClick={() => { updateQuote(quote.id, { approved: true }); toast('Discount approved.'); }}>
                {quote.approved ? 'Approved' : 'Approve'}
              </Button>
            </div>
          </Card>
        )}

        {/* line items */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '17px' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--n-600)', fontSize: '.8rem', textTransform: 'uppercase', letterSpacing: '.03em' }}>
                <th style={LTH}>Product</th>
                <th style={{ ...LTH, textAlign: 'right' }}>Unit price</th>
                <th style={{ ...LTH, textAlign: 'right', width: 90 }}>Qty</th>
                <th style={{ ...LTH, textAlign: 'right', width: 110 }}>Disc %</th>
                <th style={{ ...LTH, textAlign: 'right' }}>Line total</th>
                <th style={LTH}></th>
              </tr>
            </thead>
            <tbody>
              {quote.lines.map(l => (
                <tr key={l.id} style={{ borderTop: '1px solid var(--line)' }}>
                  <td style={LTD}>
                    <div className="col" style={{ gap: 2 }}>
                      <span className="fw-6">{l.name}</span>
                      <span className="t-xs muted" style={{ fontFamily: 'var(--font-mono)' }}>{l.sku}</span>
                    </div>
                  </td>
                  <td style={{ ...LTD, textAlign: 'right' }}>{money(l.unitPrice)}</td>
                  <td style={{ ...LTD, textAlign: 'right' }}>
                    <Input type="number" min="0" value={l.qty}
                      onChange={e => updateLine(quote.id, l.id, { qty: e.target.value })}
                      style={{ width: 74, textAlign: 'right' }} />
                  </td>
                  <td style={{ ...LTD, textAlign: 'right' }}>
                    <Input type="number" min="0" max="100" value={l.discountPct}
                      onChange={e => updateLine(quote.id, l.id, { discountPct: e.target.value })}
                      style={{ width: 84, textAlign: 'right' }} />
                  </td>
                  <td style={{ ...LTD, textAlign: 'right', fontWeight: 700 }}>
                    {money((l.unitPrice || 0) * (l.qty || 0) * (1 - (l.discountPct || 0) / 100))}
                  </td>
                  <td style={{ ...LTD, textAlign: 'right' }}>
                    <button className="btn btn-quiet btn-sm" aria-label="Remove line"
                      onClick={() => removeLine(quote.id, l.id)}><Icon name="x" size={15} /></button>
                  </td>
                </tr>
              ))}
              {quote.lines.length === 0 && (
                <tr><td colSpan={6} style={{ ...LTD, textAlign: 'center', color: 'var(--n-600)' }}>No line items yet. Add a product below.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div>
          <Button variant="ghost" size="sm" onClick={() => setAddOpen(true)}><Icon name="plus" size={15} /> Add product</Button>
        </div>

        {/* totals + ACV */}
        <div className="row between wrap" style={{ gap: '1.5rem', alignItems: 'flex-start' }}>
          <Card className="col gap-2" style={{ minWidth: 220, flex: 1 }}>
            <div className="row between"><span className="t-sm muted">Annual contract value</span></div>
            <div className="stat-value" style={{ fontSize: '2rem', color: 'var(--accent)' }}>{money(m.acv)}</div>
            <span className="t-xs muted">{quote.term === 'monthly' ? 'Subtotal annualized (x12)' : 'Equal to annual subtotal'}</span>
          </Card>
          <Card className="col gap-1" style={{ minWidth: 280, flex: 1 }}>
            <TotalRow label="Subtotal" value={money(m.subtotalGross)} />
            <TotalRow label={`Discount (${m.blendedDiscountPct.toFixed(1)}%)`} value={`- ${money(m.discountTotal)}`} tone="var(--risk)" />
            <TotalRow label="Net subtotal" value={money(m.subtotal)} />
            <TotalRow label={`Tax (${(TAX_RATE * 100).toFixed(2)}%)`} value={money(m.tax)} />
            <div style={{ borderTop: '1px solid var(--line)', margin: '.35rem 0' }} />
            <TotalRow label="Grand total" value={money(m.grandTotal)} big />
          </Card>
        </div>
      </div>

      {addOpen && <AddProductModal quoteId={quote.id} onClose={() => setAddOpen(false)} />}
    </Modal>
  );
}

function TotalRow({ label, value, tone, big }) {
  return (
    <div className="row between" style={{ padding: '.15rem 0' }}>
      <span className={big ? 'fw-7' : 't-sm muted'} style={{ fontSize: big ? '1.05rem' : undefined }}>{label}</span>
      <span style={{ fontWeight: big ? 800 : 600, fontSize: big ? '1.15rem' : undefined, color: tone }}>{value}</span>
    </div>
  );
}

function AddProductModal({ quoteId, onClose }) {
  const cats = [...new Set(PRODUCTS.map(p => p.category))];
  return (
    <Modal open onClose={onClose} title="Add a product" width={560}>
      <div className="col gap-3">
        {cats.map(cat => (
          <div key={cat} className="col gap-2">
            <div className="eyebrow">{cat}</div>
            {PRODUCTS.filter(p => p.category === cat).map(p => (
              <div key={p.id} className="row between" style={{ padding: '.6rem .75rem', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', alignItems: 'center' }}>
                <div className="col" style={{ gap: 2, minWidth: 0 }}>
                  <span className="fw-6">{p.name}</span>
                  <span className="t-xs muted">{p.sku} - {money(p.price)} {p.unit}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { addLine(quoteId, p.id); onClose(); }}>
                  <Icon name="plus" size={14} /> Add
                </Button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Modal>
  );
}

/* ============================================================
   QUOTE PREVIEW - print-ready, download (CSV), status actions
   ============================================================ */
function QuotePreview({ quote, accountName, company, onClose, toast }) {
  const m = quoteMath(quote);

  const downloadCsv = () => {
    const rows = [
      ['Quote', quote.number],
      ['Account', accountName],
      ['Status', STATUS_META[quote.status].label],
      ['Term', quote.term],
      ['Valid until', shortDate(quote.validUntil)],
      [],
      ['Product', 'SKU', 'Unit price', 'Qty', 'Discount %', 'Line total'],
      ...quote.lines.map(l => [
        l.name, l.sku, l.unitPrice, l.qty, l.discountPct,
        ((l.unitPrice || 0) * (l.qty || 0) * (1 - (l.discountPct || 0) / 100)).toFixed(2),
      ]),
      [],
      ['Subtotal', '', '', '', '', m.subtotalGross.toFixed(2)],
      ['Discount', '', '', '', '', m.discountTotal.toFixed(2)],
      ['Net subtotal', '', '', '', '', m.subtotal.toFixed(2)],
      ['Tax', '', '', '', '', m.tax.toFixed(2)],
      ['Grand total', '', '', '', '', m.grandTotal.toFixed(2)],
      ['Annual contract value', '', '', '', '', m.acv.toFixed(2)],
    ];
    const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${quote.number}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast(`${quote.number}.csv downloaded.`);
  };

  return (
    <Modal open onClose={onClose} width={720}
      title={<span>Quote preview - {quote.number}</span>}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>Close</Button>
          <Button variant="ghost" onClick={() => window.print()}><Icon name="download" size={16} /> Print</Button>
          <Button variant="ghost" onClick={downloadCsv}><Icon name="copy" size={16} /> Download CSV</Button>
          {quote.status !== 'sent' && quote.status !== 'accepted' &&
            <Button variant="primary" onClick={() => { setQuoteStatus(quote.id, 'sent'); toast(`${quote.number} sent.`); }}>Mark sent</Button>}
          {quote.status !== 'accepted' &&
            <Button variant="accent" onClick={() => { setQuoteStatus(quote.id, 'accepted'); toast(`${quote.number} accepted.`); }}>Mark accepted</Button>}
        </>
      }>
      <div id="quote-print" className="col gap-3" style={{ color: 'var(--ink)' }}>
        {/* company header */}
        <div className="row between wrap" style={{ gap: '1rem', borderBottom: '2px solid var(--ink)', paddingBottom: '1rem' }}>
          <div className="col" style={{ gap: 4 }}>
            <div className="row gap-2" style={{ alignItems: 'center' }}>
              <Avatar name="Rally" size={40} color="var(--accent)" />
              <div className="col" style={{ gap: 0 }}>
                <strong style={{ fontSize: '1.15rem' }}>Rally</strong>
                <span className="t-xs muted">rally.app - Revenue platform</span>
              </div>
            </div>
          </div>
          <div className="col" style={{ gap: 2, textAlign: 'right' }}>
            <strong style={{ fontSize: '1.2rem' }}>{quote.number}</strong>
            <span className="t-sm muted">Prepared for {accountName}</span>
            {company && <span className="t-xs muted">{company.location}</span>}
            <span className="t-xs muted">Valid until {shortDate(quote.validUntil)}</span>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '16px' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--line-strong)', color: 'var(--n-600)', fontSize: '.78rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '.5rem 0' }}>Product</th>
              <th style={{ padding: '.5rem 0', textAlign: 'right' }}>Unit</th>
              <th style={{ padding: '.5rem 0', textAlign: 'right' }}>Qty</th>
              <th style={{ padding: '.5rem 0', textAlign: 'right' }}>Disc</th>
              <th style={{ padding: '.5rem 0', textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {quote.lines.map(l => (
              <tr key={l.id} style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: '.55rem 0' }}>
                  <div className="fw-6">{l.name}</div>
                  <div className="t-xs muted" style={{ fontFamily: 'var(--font-mono)' }}>{l.sku}</div>
                </td>
                <td style={{ padding: '.55rem 0', textAlign: 'right' }}>{money(l.unitPrice)}</td>
                <td style={{ padding: '.55rem 0', textAlign: 'right' }}>{l.qty}</td>
                <td style={{ padding: '.55rem 0', textAlign: 'right' }}>{l.discountPct ? `${l.discountPct}%` : '-'}</td>
                <td style={{ padding: '.55rem 0', textAlign: 'right', fontWeight: 700 }}>
                  {money((l.unitPrice || 0) * (l.qty || 0) * (1 - (l.discountPct || 0) / 100))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <div className="col gap-1" style={{ minWidth: 280 }}>
            <TotalRow label="Subtotal" value={money(m.subtotalGross)} />
            <TotalRow label="Discount" value={`- ${money(m.discountTotal)}`} tone="var(--risk)" />
            <TotalRow label={`Tax (${(TAX_RATE * 100).toFixed(2)}%)`} value={money(m.tax)} />
            <div style={{ borderTop: '2px solid var(--ink)', margin: '.35rem 0' }} />
            <TotalRow label="Grand total" value={money(m.grandTotal)} big />
            <TotalRow label={`ACV (${quote.term})`} value={money(m.acv)} />
          </div>
        </div>

        <div className="col gap-1" style={{ borderTop: '1px solid var(--line)', paddingTop: '1rem' }}>
          <div className="eyebrow">Terms</div>
          <span className="t-sm muted">
            {quote.term === 'monthly' ? 'Billed monthly' : 'Billed annually'}, net-30. Prices in USD and exclude
            usage-based overages. This quote is valid until {shortDate(quote.validUntil)}.
            {quote.notes ? ` ${quote.notes}` : ''}
          </span>
        </div>
      </div>
    </Modal>
  );
}

const LTH = { padding: '.6rem .5rem', fontWeight: 700 };
const LTD = { padding: '.55rem .5rem', verticalAlign: 'middle' };
