// Quote detail - the quote-to-cash editor. A full-page builder for one quote:
// an animated draft -> sent -> accepted status stepper, a live line-items table
// (add catalog products, inline qty/price/discount/tax, drag reorder, slide-out
// remove), a count-up totals panel, terms + notes, a status timeline, a
// customer-facing Preview (PublicQuote in a Modal), and Download PDF via
// window.print of a print-styled PublicQuote. Reads id from useParams().id only;
// renders a Not found card when the quote is missing (data is synchronous, never
// a permanent spinner). All writes flow through store-quote so every panel is
// reactive via useExt() + useQuoteStore().
import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useExt, getProducts } from '../lib/store-ext.js';
import { getCompany, userName, getUser } from '../lib/store.js';
import {
  useQuoteStore, quoteById, getQuoteLines, getQuoteExtras, getQuoteTimeline,
  quoteTotals, lineQuoteTotal, addQuoteLine, addQuoteProduct, updateQuoteLine,
  removeQuoteLine, reorderQuoteLine, setQuoteMeta, setQuoteStatus,
  QUOTE_FLOW, QUOTE_STATUS_META,
} from '../lib/store-quote.js';
import {
  Button, Card, Badge, Avatar, Field, Input, Select, Textarea, Modal,
  AnimatedNumber, EmptyState, useToast, money, monthDay, relTime,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import { celebrate } from '../lib/celebrate.js';
import PublicQuote from '../components/PublicQuote.jsx';

function toInputDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

export default function QuoteDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  useExt(s => s.quotes);   // subscribe to the store-ext quote record
  useQuoteStore();         // subscribe to line items + meta + timeline

  const [preview, setPreview] = useState(false);
  const [addProduct, setAddProduct] = useState('');
  const [removing, setRemoving] = useState(() => new Set());
  const [dragId, setDragId] = useState(null);
  const [rowDraggable, setRowDraggable] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const quote = quoteById(id);
  if (!quote) {
    return (
      <div className="rl-page">
        <Card className="col center gap-2" style={{ padding: '3rem 1.5rem', textAlign: 'center', maxWidth: 460, margin: '3rem auto' }}>
          <div style={{ fontSize: '2.2rem' }}>🧾</div>
          <h3 style={{ margin: 0 }}>Quote not found</h3>
          <p className="muted" style={{ margin: 0 }}>This quote may have been removed or the link is out of date.</p>
          <Button variant="accent" onClick={() => nav('/quotes')} style={{ marginTop: 4 }}>
            <Icon name="receipt" size={16} /> Back to quotes
          </Button>
        </Card>
      </div>
    );
  }

  const company = getCompany(quote.companyId);
  const owner = getUser(quote.ownerId);
  const ownerName = userName(quote.ownerId);
  const lines = getQuoteLines(id);
  const extras = getQuoteExtras(id);
  const totals = quoteTotals(id);
  const timeline = getQuoteTimeline(id);
  const products = getProducts();
  const meta = QUOTE_STATUS_META[quote.status] || QUOTE_STATUS_META.draft;
  const expired = quote.status === 'expired';
  const currentIndex = QUOTE_FLOW.indexOf(quote.status);

  /* ---- status transitions with celebration ---- */
  const goStatus = (status, e) => {
    if (status === quote.status) return;
    setQuoteStatus(id, status);
    if (status === 'sent' || status === 'accepted') {
      const x = e?.clientX, y = e?.clientY;
      celebrate(status === 'accepted' ? { x, y, count: 150, spread: 1.15 } : { x, y, count: 80, spread: .9 });
    }
    toast(`${quote.number} marked ${QUOTE_STATUS_META[status].label.toLowerCase()}.`);
  };

  /* ---- line removal with slide-out ---- */
  const doRemove = (lineId) => {
    setRemoving(prev => new Set(prev).add(lineId));
    setTimeout(() => {
      removeQuoteLine(id, lineId);
      setRemoving(prev => { const n = new Set(prev); n.delete(lineId); return n; });
    }, 260);
  };

  /* ---- drag reorder ---- */
  const onDrop = (targetIndex) => {
    if (dragId) reorderQuoteLine(id, dragId, targetIndex);
    setDragId(null); setOverIndex(null); setRowDraggable(null);
  };

  return (
    <div className="rl-page col gap-3">
      <QuoteStyles />

      {/* back + top actions */}
      <div className="row between wrap" style={{ gap: '.75rem', alignItems: 'center' }}>
        <button className="btn btn-quiet" onClick={() => nav(-1)} style={{ padding: '.4rem .7rem' }}>
          <Icon name="chevronRight" size={16} style={{ transform: 'rotate(180deg)' }} /> Back
        </button>
        <div className="row gap-1 wrap" style={{ justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => setPreview(true)}><Icon name="receipt" size={16} /> Preview</Button>
          <Button variant="ghost" onClick={() => window.print()}><Icon name="download" size={16} /> Download PDF</Button>
          {quote.status !== 'sent' && quote.status !== 'accepted' && (
            <Button variant="primary" onClick={(e) => goStatus('sent', e)}><Icon name="send" size={16} /> Send</Button>
          )}
          {quote.status !== 'accepted' && (
            <Button variant="accent" onClick={(e) => goStatus('accepted', e)}><Icon name="check" size={16} /> Mark accepted</Button>
          )}
        </div>
      </div>

      {/* header: identity + stepper + dates */}
      <Card className="col gap-3">
        <div className="row between wrap" style={{ gap: '1rem', alignItems: 'flex-start' }}>
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <div className="row gap-2" style={{ alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.7rem', letterSpacing: '-.02em' }}>{quote.number}</span>
              <Badge tone={meta.tone}>{meta.label}</Badge>
            </div>
            <div className="row gap-2 wrap" style={{ alignItems: 'center', color: 'var(--n-600)' }}>
              <Icon name="building" size={15} />
              {company
                ? <Link to={`/companies/${company.id}`} style={{ fontWeight: 600, color: 'var(--accent-600)' }}>{company.name}</Link>
                : <span>{quote.companyName || 'Unknown account'}</span>}
              <span style={{ opacity: .4 }}>-</span>
              <span className="row gap-1" style={{ alignItems: 'center' }}><Avatar name={ownerName} size={22} /> {ownerName}</span>
            </div>
          </div>
          <div className="row gap-3 wrap" style={{ justifyContent: 'flex-end' }}>
            <div className="col" style={{ gap: 2, textAlign: 'right' }}>
              <span className="eyebrow">Prepared</span>
              <strong>{monthDay(quote.createdAt)}</strong>
            </div>
            <Field label="Expires">
              <Input type="date" value={toInputDate(quote.expiresAt)}
                onChange={e => setQuoteMeta(id, { expiresAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
                style={{ width: 168 }} />
            </Field>
          </div>
        </div>

        <StatusStepper status={quote.status} currentIndex={currentIndex} expired={expired} onStep={goStatus} />
      </Card>

      <div className="qd-grid">
        {/* MAIN */}
        <div className="col gap-3" style={{ minWidth: 0 }}>
          {/* line items */}
          <Card pad={false}>
            <div className="row between" style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line)' }}>
              <strong className="row gap-2" style={{ alignItems: 'center' }}><Icon name="box" size={17} /> Line items</strong>
              <span className="t-sm muted">{lines.length} item{lines.length !== 1 ? 's' : ''}</span>
            </div>

            {lines.length === 0 ? (
              <EmptyState icon="📦" title="No line items yet" body="Add a product from the catalog or start a blank line to price this quote." />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="qd-table">
                  <thead>
                    <tr>
                      <th style={{ width: 30 }}></th>
                      <th style={{ textAlign: 'left' }}>Product</th>
                      <th style={{ textAlign: 'right', width: 78 }}>Qty</th>
                      <th style={{ textAlign: 'right', width: 118 }}>Unit price</th>
                      <th style={{ textAlign: 'right', width: 84 }}>Disc %</th>
                      <th style={{ textAlign: 'right', width: 84 }}>Tax %</th>
                      <th style={{ textAlign: 'right', width: 120 }}>Total</th>
                      <th style={{ width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody className="stagger">
                    {lines.map((l, idx) => (
                      <tr key={l.id}
                        className={`qd-row${removing.has(l.id) ? ' qd-row-out' : ''}${overIndex === idx && dragId ? ' qd-row-over' : ''}`}
                        draggable={rowDraggable === l.id}
                        onDragStart={() => setDragId(l.id)}
                        onDragOver={(e) => { e.preventDefault(); setOverIndex(idx); }}
                        onDrop={() => onDrop(idx)}
                        onDragEnd={() => { setDragId(null); setOverIndex(null); setRowDraggable(null); }}>
                        <td className="qd-handle"
                          onMouseDown={() => setRowDraggable(l.id)}
                          onMouseUp={() => setRowDraggable(null)}
                          title="Drag to reorder">
                          <Icon name="list" size={15} />
                        </td>
                        <td>
                          <input className="qd-inline qd-name" value={l.name}
                            onChange={e => updateQuoteLine(id, l.id, { name: e.target.value })} />
                          <input className="qd-inline qd-desc" placeholder="Add a description"
                            value={l.description || ''}
                            onChange={e => updateQuoteLine(id, l.id, { description: e.target.value })} />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <input className="qd-num" type="number" min="0" value={l.qty}
                            onChange={e => updateQuoteLine(id, l.id, { qty: e.target.value })} />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <input className="qd-num" type="number" min="0" value={l.unitPrice}
                            onChange={e => updateQuoteLine(id, l.id, { unitPrice: e.target.value })} />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <input className="qd-num" type="number" min="0" max="100" value={l.discount}
                            onChange={e => updateQuoteLine(id, l.id, { discount: e.target.value })} />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <input className="qd-num" type="number" min="0" max="100" value={l.tax}
                            onChange={e => updateQuoteLine(id, l.id, { tax: e.target.value })} />
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>
                          <AnimatedNumber value={lineQuoteTotal(l)} format={money} />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-quiet btn-sm" aria-label="Remove line" onClick={() => doRemove(l.id)}>
                            <Icon name="x" size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* add controls */}
            <div className="row gap-2 wrap" style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--line)', alignItems: 'center' }}>
              <Select value={addProduct}
                onChange={e => { if (e.target.value) { addQuoteProduct(id, e.target.value); setAddProduct(''); } }}
                style={{ maxWidth: 280 }}>
                <option value="">Add a product...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} - {money(p.price)}</option>)}
              </Select>
              <Button variant="ghost" size="sm" onClick={() => addQuoteLine(id, { name: 'Custom line', qty: 1, unitPrice: 0 })}>
                <Icon name="plus" size={15} /> Blank line
              </Button>
            </div>
          </Card>

          {/* totals */}
          <Card className="col gap-2">
            <strong className="row gap-2" style={{ alignItems: 'center' }}><Icon name="dollar" size={17} /> Totals</strong>
            <TotalRow label="Subtotal" value={totals.subtotal} />
            <TotalRow label="Discount" value={-totals.discountTotal} tone="var(--risk)" prefix={totals.discountTotal > 0 ? '- ' : ''} abs />
            <TotalRow label="Tax" value={totals.taxTotal} />
            <div className="row between" style={{ alignItems: 'center', padding: '.15rem 0' }}>
              <span className="t-sm muted">Shipping</span>
              <input className="qd-num" type="number" min="0" value={extras.shipping || 0}
                onChange={e => setQuoteMeta(id, { shipping: e.target.value })} style={{ width: 120, textAlign: 'right' }} />
            </div>
            <div style={{ borderTop: '2px solid var(--ink)', margin: '.4rem 0 .2rem' }} />
            <div className="row between" style={{ alignItems: 'baseline' }}>
              <span className="fw-7" style={{ fontSize: '1.05rem' }}>Grand total</span>
              <span style={{ fontWeight: 800, fontSize: '2rem', color: 'var(--accent)', letterSpacing: '-.02em' }}>
                <AnimatedNumber value={totals.grandTotal} format={money} />
              </span>
            </div>
          </Card>

          {/* terms + notes */}
          <Card className="col gap-3">
            <strong className="row gap-2" style={{ alignItems: 'center' }}><Icon name="fileText" size={17} /> Terms & notes</strong>
            <Field label="Terms" hint="Shown on the customer-facing quote.">
              <Textarea rows={4} value={extras.terms || ''} onChange={e => setQuoteMeta(id, { terms: e.target.value })} />
            </Field>
            <Field label="Internal + customer notes">
              <Textarea rows={3} value={extras.notes || ''} onChange={e => setQuoteMeta(id, { notes: e.target.value })} />
            </Field>
          </Card>
        </div>

        {/* RAIL */}
        <div className="col gap-3" style={{ minWidth: 0 }}>
          <Card className="col gap-3">
            <strong className="row gap-2" style={{ alignItems: 'center' }}><Icon name="sliders" size={16} /> Details</strong>
            <Detail label="Account" value={company
              ? <Link to={`/companies/${company.id}`} style={{ color: 'var(--accent-600)', fontWeight: 600 }}>{company.name}</Link>
              : (quote.companyName || 'Unknown')} />
            <Detail label="Owner" value={<span className="row gap-1" style={{ alignItems: 'center' }}><Avatar name={ownerName} size={22} /> {ownerName}</span>} />
            {owner?.title && <Detail label="Role" value={owner.title} />}
            {quote.dealId && <Detail label="Linked deal" value={<Link to={`/deals/${quote.dealId}`} style={{ color: 'var(--accent-600)', fontWeight: 600 }}>View deal</Link>} />}
            <Detail label="Issued" value={monthDay(quote.createdAt)} />
            <Detail label="Expires" value={<span style={expired ? { color: 'var(--risk)', fontWeight: 700 } : undefined}>{monthDay(quote.expiresAt)}</span>} />
          </Card>

          <Card pad={false}>
            <div className="row between" style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line)' }}>
              <strong className="row gap-2" style={{ alignItems: 'center' }}><Icon name="activity" size={16} /> Status timeline</strong>
            </div>
            <div className="col" style={{ padding: '1rem 1.25rem' }}>
              {timeline.length === 0 ? (
                <span className="t-sm muted">No events yet.</span>
              ) : timeline.map((ev, i) => {
                const em = QUOTE_STATUS_META[ev.status] || QUOTE_STATUS_META.draft;
                return (
                  <div key={ev.id} className="row gap-2" style={{ alignItems: 'flex-start', paddingBottom: i === timeline.length - 1 ? 0 : '.9rem' }}>
                    <div className="col center" style={{ flex: 'none' }}>
                      <span className="qd-dot" style={{ background: TONE_COLOR[em.tone] || 'var(--n-400)' }} />
                      {i !== timeline.length - 1 && <span className="qd-line" />}
                    </div>
                    <div className="col" style={{ gap: 1, minWidth: 0 }}>
                      <span className="fw-6">{ev.note || em.label}</span>
                      <span className="t-xs muted">{ev.who} - {relTime(ev.at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* preview modal */}
      {preview && (
        <Modal open onClose={() => setPreview(false)} width={780}
          title={<span>Customer preview - {quote.number}</span>}
          footer={
            <>
              <Button variant="quiet" onClick={() => setPreview(false)}>Close</Button>
              <Button variant="ghost" onClick={() => window.print()}><Icon name="download" size={16} /> Download PDF</Button>
              {quote.status !== 'accepted' && (
                <Button variant="accent" onClick={(e) => { goStatus('accepted', e); setPreview(false); }}>
                  <Icon name="check" size={16} /> Mark accepted
                </Button>
              )}
            </>
          }>
          <PublicQuote quote={{ ...quote, terms: extras.terms, notes: extras.notes }} company={company}
            accountName={company?.name} ownerName={ownerName} lines={lines} totals={totals}
            onAccept={quote.status !== 'accepted' ? (e) => { goStatus('accepted', e); setPreview(false); } : undefined} />
        </Modal>
      )}

      {/* hidden print document (owns the print stylesheet) */}
      <PublicQuote quote={{ ...quote, terms: extras.terms, notes: extras.notes }} company={company}
        accountName={company?.name} ownerName={ownerName} lines={lines} totals={totals} printRoot />
    </div>
  );
}

const TONE_COLOR = { ok: 'var(--ok)', warn: 'var(--warn)', risk: 'var(--risk)', info: 'var(--info)', default: 'var(--n-400)' };

/* ---------- animated status stepper ---------- */
function StatusStepper({ status, currentIndex, expired, onStep }) {
  return (
    <div className="col gap-2">
      <div className="qd-stepper">
        {QUOTE_FLOW.map((step, i) => {
          const m = QUOTE_STATUS_META[step];
          const done = !expired && i < currentIndex;
          const current = !expired && i === currentIndex;
          const state = done ? 'done' : current ? 'current' : 'todo';
          return (
            <React.Fragment key={step}>
              {i > 0 && <span className={`qd-connector${(!expired && i <= currentIndex) ? ' qd-connector-on' : ''}`} />}
              <button className={`qd-step qd-step-${state}`} onClick={(e) => onStep(step, e)}>
                <span className="qd-step-node">
                  {done ? <Icon name="check" size={18} /> : <span className="qd-step-num">{i + 1}</span>}
                </span>
                <span className="col" style={{ gap: 0, textAlign: 'left' }}>
                  <span className="qd-step-label">{m.label}</span>
                  <span className="qd-step-blurb">{m.blurb}</span>
                </span>
              </button>
            </React.Fragment>
          );
        })}
      </div>
      {expired && (
        <div className="row gap-2" style={{ alignItems: 'center', color: 'var(--risk)', fontWeight: 600, fontSize: '.9rem' }}>
          <Icon name="clock" size={15} /> This quote expired. Send a fresh quote or mark it accepted to revive it.
        </div>
      )}
    </div>
  );
}

function TotalRow({ label, value, tone, prefix = '', abs }) {
  return (
    <div className="row between" style={{ padding: '.15rem 0' }}>
      <span className="t-sm muted">{label}</span>
      <span style={{ fontWeight: 600, color: tone }}>
        {prefix}<AnimatedNumber value={abs ? Math.abs(value) : value} format={money} />
      </span>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="row between" style={{ gap: '1rem', alignItems: 'baseline' }}>
      <span className="t-sm muted" style={{ flex: 'none' }}>{label}</span>
      <span style={{ textAlign: 'right', minWidth: 0 }}>{value}</span>
    </div>
  );
}

/* ---------- scoped styles (stepper glow, drag, slide-out, table) ---------- */
function QuoteStyles() {
  return (
    <style>{`
      .qd-grid { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr); gap: 1.25rem; align-items: start; }
      @media (max-width: 900px) { .qd-grid { grid-template-columns: 1fr; } }

      .qd-stepper { display: flex; align-items: center; gap: .35rem; flex-wrap: wrap; }
      .qd-step { display: inline-flex; align-items: center; gap: .6rem; background: none; border: none; cursor: pointer;
        padding: .35rem .5rem; border-radius: var(--r-sm); transition: background .15s var(--ease); }
      .qd-step:hover { background: var(--n-100); }
      .qd-step-node { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; flex: none;
        font-weight: 800; transition: all .25s var(--ease); }
      .qd-step-todo .qd-step-node { background: var(--paper); border: 2px solid var(--line-strong); color: var(--n-600); }
      .qd-step-done .qd-step-node { background: var(--accent); border: 2px solid var(--accent); color: #fff; }
      .qd-step-current .qd-step-node { background: linear-gradient(135deg, #6d5cf7, #4a3ce0); border: 2px solid transparent; color: #fff;
        animation: qdGlow 1.8s ease-in-out infinite; }
      @keyframes qdGlow {
        0%,100% { box-shadow: 0 0 0 0 rgba(91,75,245,.45); }
        50% { box-shadow: 0 0 0 8px rgba(91,75,245,0); }
      }
      .qd-step-label { font-weight: 700; font-size: .95rem; color: var(--ink); }
      .qd-step-todo .qd-step-label { color: var(--n-600); }
      .qd-step-blurb { font-size: .74rem; color: var(--n-600); }
      .qd-connector { flex: 1; min-width: 24px; height: 3px; border-radius: 999px; background: var(--line-strong);
        transition: background .4s var(--ease); }
      .qd-connector-on { background: var(--accent); }

      .qd-table { width: 100%; border-collapse: collapse; font-size: 16px; }
      .qd-table thead th { padding: .6rem .6rem; font-size: .72rem; font-weight: 700; letter-spacing: .04em;
        text-transform: uppercase; color: var(--n-600); border-bottom: 1px solid var(--line); }
      .qd-row td { padding: .55rem .6rem; border-bottom: 1px solid var(--line); vertical-align: middle; }
      .qd-row { transition: background .15s var(--ease); }
      .qd-row:hover { background: var(--n-50, rgba(0,0,0,.015)); }
      .qd-row-over { box-shadow: inset 0 2px 0 var(--accent); }
      .qd-row-out { animation: qdSlideOut .26s var(--ease) forwards; }
      @keyframes qdSlideOut { to { opacity: 0; transform: translateX(24px); } }
      .qd-handle { color: var(--n-400); cursor: grab; text-align: center; }
      .qd-handle:active { cursor: grabbing; }
      .qd-inline { border: 1px solid transparent; background: transparent; border-radius: 6px; padding: .25rem .4rem;
        width: 100%; font: inherit; color: var(--ink); transition: border-color .15s, background .15s; }
      .qd-inline:hover { border-color: var(--line); }
      .qd-inline:focus { outline: none; border-color: var(--accent); background: var(--paper); }
      .qd-name { font-weight: 600; }
      .qd-desc { font-size: .82rem; color: var(--n-600); margin-top: 2px; }
      .qd-num { width: 100%; max-width: 96px; text-align: right; border: 1px solid var(--line); background: var(--paper);
        border-radius: 6px; padding: .35rem .45rem; font: inherit; color: var(--ink); }
      .qd-num:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent); }

      .qd-dot { width: 11px; height: 11px; border-radius: 50%; flex: none; margin-top: 3px; }
      .qd-line { width: 2px; flex: 1; min-height: 18px; background: var(--line); margin-top: 2px; }

      @media print { .rl-page > *:not(#rally-print-root) { display: none !important; } }
    `}</style>
  );
}
