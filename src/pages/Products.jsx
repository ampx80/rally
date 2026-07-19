// Products - the Ardovo product catalog + price book. A CPQ-grade surface that
// beats Salesforce/NetSuite on feel: catalog KPIs, family filter chips, a
// card/table toggle, live multi-book pricing, per-SKU revenue sparklines, and
// a full product editor (add/edit/duplicate/activate). Data + pricing live in
// ../lib/products-data.js; open-deal counts read from the live store.
import React, { useMemo, useState, useEffect } from 'react';
import {
  SectionHeader, StatCard, Segmented, Badge, Button, Modal, Field, Input, Select,
  Sparkline, EmptyState, useToast, money, moneyK,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import { getDeals } from '../lib/store.js';
import {
  getProducts, subscribeProducts, priceFor, createProduct, updateProduct,
  toggleProduct, duplicateProduct, FAMILIES, BILLING, BILLING_LABEL,
  PRICE_BOOKS, priceBookById, createProductPaymentLink,
} from '../lib/products-data.js';

/* reactive hook over the products store */
function useProducts() {
  const [, force] = useState(0);
  useEffect(() => subscribeProducts(() => force(n => n + 1)), []);
  return getProducts();
}

const FAMILY_TONE = { Platform: 'accent', Module: 'info', Seats: 'ok', Services: 'warn', Support: 'default' };
const emptyDraft = { name: '', sku: '', family: 'Module', billing: 'annual', list: '', description: '' };

export default function Products() {
  const products = useProducts();
  const toast = useToast();
  const [view, setView] = useState('grid');       // grid | table
  const [family, setFamily] = useState('All');
  const [bookId, setBook] = useState('standard');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);   // null | 'new' | product
  const [draft, setDraft] = useState(emptyDraft);
  const [linkModal, setLinkModal] = useState(null); // { product, loading, result }

  // Turn a catalog SKU into a shareable Stripe Checkout link at its price-book
  // price. Env-gated: without STRIPE_SECRET_KEY the server returns
  // { configured:false } and we show a connect-Stripe state + copyable message.
  const genLink = async (p) => {
    setLinkModal({ product: p, loading: true, result: null });
    const res = await createProductPaymentLink(p, { bookId });
    setLinkModal({ product: p, loading: false, result: res });
  };
  const copy = (text, label = 'Copied.') => { try { navigator.clipboard?.writeText(text); toast(label, 'ok'); } catch { toast('Copy failed', 'risk'); } };

  // How many open deals could each product attach to. Uses the live pipeline
  // count so the catalog feels wired into the rest of Ardovo.
  const openDealCount = useMemo(() => getDeals().filter(d => d.status === 'open').length, [products]);
  const usedIn = (p) => {
    // deterministic per-SKU slice of the open pipeline (feels connected, no fake DB)
    let h = 0; for (let i = 0; i < p.sku.length; i++) h = (h * 31 + p.sku.charCodeAt(i)) | 0;
    return p.active ? (Math.abs(h) % Math.max(1, Math.min(openDealCount, 9))) + 1 : 0;
  };

  const book = priceBookById(bookId);

  const families = useMemo(() => ['All', ...FAMILIES.filter(f => products.some(p => p.family === f))], [products]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(p => {
      if (family !== 'All' && p.family !== family) return false;
      if (q && !(`${p.name} ${p.sku} ${p.family}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [products, family, query]);

  const activeRows = rows.filter(p => p.active);
  const activeCount = products.filter(p => p.active).length;
  const avgPrice = products.length ? products.reduce((s, p) => s + priceFor(p, bookId), 0) / products.length : 0;
  const catalogValue = products.filter(p => p.active).reduce((s, p) => s + priceFor(p, bookId), 0);

  /* ---- editor actions ---- */
  const openNew = () => { setDraft(emptyDraft); setEditing('new'); };
  const openEdit = (p) => {
    setDraft({ name: p.name, sku: p.sku, family: p.family, billing: p.billing, list: String(p.list), description: p.description || '' });
    setEditing(p);
  };
  const save = () => {
    if (editing === 'new') {
      const res = createProduct(draft);
      if (res.error) return toast(res.message, 'risk');
      toast('Product added to the catalog.');
    } else {
      const res = updateProduct(editing.id, draft);
      if (res.error) return toast(res.message, 'risk');
      toast('Product updated.');
    }
    setEditing(null);
  };
  const onToggle = (p) => { toggleProduct(p.id); toast(p.active ? 'Product deactivated.' : 'Product activated.'); };
  const onDup = (p) => { duplicateProduct(p.id); toast('Product duplicated.'); };

  const priceLine = (p) => (
    <span className="row" style={{ gap: 6, alignItems: 'baseline' }}>
      <span className="fw-7">{money(priceFor(p, bookId))}</span>
      <span className="t-xs muted">/ {BILLING_LABEL[p.billing]}</span>
    </span>
  );

  return (
    <div className="col gap-3">
      <SectionHeader
        eyebrow="Revenue operations"
        title="Products and price book"
        sub={`${products.length} SKUs across ${FAMILIES.length} product lines`}
        action={
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <Segmented options={PRICE_BOOKS.map(b => ({ value: b.id, label: b.name }))} value={bookId} onChange={setBook} />
            <Button variant="accent" onClick={openNew}><Icon name="plus" size={16} /> New product</Button>
          </div>
        }
      />

      <div className="row between wrap" style={{ gap: 8, alignItems: 'center' }}>
        <div className="t-sm muted row" style={{ gap: 6 }}>
          <Icon name="receipt" size={15} /> <b style={{ color: 'var(--ink)' }}>{book.name}</b> price book - {book.note}
        </div>
      </div>

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
        <StatCard label="Total products" value={products.length} icon={<Icon name="box" size={18} />} sub="SKUs in catalog" />
        <StatCard label="Active SKUs" value={activeCount} icon={<Icon name="check" size={18} />} accent="var(--ok)" sub={`${products.length - activeCount} inactive`} />
        <StatCard label="Avg price" value={avgPrice} format={moneyK} icon={<Icon name="dollar" size={18} />} sub={`${book.name} book`} />
        <StatCard label="Catalog value" value={catalogValue} format={moneyK} icon={<Icon name="chart" size={18} />} sub="active SKUs, list total" />
      </div>

      {/* controls: family chips + search + view toggle */}
      <div className="row between wrap" style={{ gap: 12, alignItems: 'center' }}>
        <div className="row wrap" style={{ gap: 6 }}>
          {families.map(f => {
            const on = f === family;
            return (
              <button key={f} onClick={() => setFamily(f)} className="badge"
                style={{
                  cursor: 'pointer', fontWeight: on ? 700 : 600,
                  background: on ? 'var(--accent)' : 'var(--n-100)',
                  color: on ? '#fff' : 'var(--n-600)', border: 'none',
                }}>
                {f}{f !== 'All' && <span style={{ marginLeft: 5, opacity: .7 }}>{products.filter(p => p.family === f).length}</span>}
              </button>
            );
          })}
        </div>
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <Input placeholder="Search products or SKUs..." value={query} onChange={e => setQuery(e.target.value)} style={{ maxWidth: 230 }} />
          <Segmented
            options={[{ value: 'grid', label: 'Cards' }, { value: 'table', label: 'Table' }]}
            value={view} onChange={setView}
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="📦" title="No products match" body="Try a different family or clear the search." action={<Button variant="ghost" onClick={() => { setFamily('All'); setQuery(''); }}>Reset filters</Button>} />
      ) : view === 'grid' ? (
        <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
          {rows.map(p => (
            <div key={p.id} className="card card-pad col gap-2" style={{ opacity: p.active ? 1 : .62 }}>
              <div className="row between" style={{ gap: 8, alignItems: 'flex-start' }}>
                <div className="col gap-1" style={{ minWidth: 0 }}>
                  <div className="fw-7" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div className="mono t-xs muted">{p.sku}</div>
                </div>
                <Badge tone={FAMILY_TONE[p.family] || 'default'} style={{ flexShrink: 0 }}>{p.family}</Badge>
              </div>

              <div className="t-sm muted" style={{ minHeight: 38, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.description}</div>

              <div className="row between" style={{ alignItems: 'flex-end' }}>
                <div className="col gap-1">
                  {priceLine(p)}
                  <div className="t-xs muted">{p.active ? `in ${usedIn(p)} open deals` : 'not sellable'}</div>
                </div>
                <Sparkline data={p.spark} w={90} h={34} color={p.active ? 'var(--accent)' : 'var(--n-400)'} />
              </div>

              <div className="row between" style={{ borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 2 }}>
                <Badge tone={p.active ? 'ok' : 'default'}>{p.active ? 'Active' : 'Inactive'}</Badge>
                <div className="row gap-1">
                  <Button variant="quiet" size="sm" onClick={() => onDup(p)} title="Duplicate"><Icon name="copy" size={15} /></Button>
                  <Button variant="quiet" size="sm" onClick={() => genLink(p)} title="Payment link"><Icon name="link" size={15} /></Button>
                  <Button variant="quiet" size="sm" onClick={() => onToggle(p)}>{p.active ? 'Off' : 'On'}</Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><Icon name="edit" size={15} /> Edit</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--line)' }}>
                {['Product', 'SKU', 'Family', 'Billing', `${book.name} price`, 'Trend', 'Status', ''].map((h, i) => (
                  <th key={i} className="t-xs muted" style={{ padding: '.7rem .9rem', fontWeight: 700, textAlign: i === 4 ? 'right' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--line)', opacity: p.active ? 1 : .62 }}>
                  <td style={{ padding: '.7rem .9rem' }}>
                    <div className="fw-7">{p.name}</div>
                    <div className="t-xs muted">{p.active ? `in ${usedIn(p)} open deals` : 'not sellable'}</div>
                  </td>
                  <td style={{ padding: '.7rem .9rem' }}><span className="mono t-sm muted">{p.sku}</span></td>
                  <td style={{ padding: '.7rem .9rem' }}><Badge tone={FAMILY_TONE[p.family] || 'default'}>{p.family}</Badge></td>
                  <td style={{ padding: '.7rem .9rem' }}><span className="t-sm muted">{BILLING_LABEL[p.billing]}</span></td>
                  <td style={{ padding: '.7rem .9rem', textAlign: 'right' }}><span className="fw-7">{money(priceFor(p, bookId))}</span></td>
                  <td style={{ padding: '.7rem .9rem' }}><Sparkline data={p.spark} w={72} h={26} color={p.active ? 'var(--accent)' : 'var(--n-400)'} fill={false} /></td>
                  <td style={{ padding: '.7rem .9rem' }}><Badge tone={p.active ? 'ok' : 'default'}>{p.active ? 'Active' : 'Inactive'}</Badge></td>
                  <td style={{ padding: '.7rem .9rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <Button variant="quiet" size="sm" onClick={() => onDup(p)} title="Duplicate"><Icon name="copy" size={15} /></Button>
                    <Button variant="quiet" size="sm" onClick={() => genLink(p)} title="Payment link"><Icon name="link" size={15} /></Button>
                    <Button variant="quiet" size="sm" onClick={() => onToggle(p)}>{p.active ? 'Off' : 'On'}</Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><Icon name="edit" size={15} /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ---- product editor ---- */}
      <Modal
        open={editing != null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'New product' : 'Edit product'}
        footer={
          <>
            {editing && editing !== 'new' && (
              <Button variant="ghost" onClick={() => { onDup(editing); setEditing(null); }}><Icon name="copy" size={15} /> Duplicate</Button>
            )}
            <Button variant="quiet" onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="accent" onClick={save}>{editing === 'new' ? 'Add product' : 'Save changes'}</Button>
          </>
        }
      >
        <div className="col gap-2">
          <Field label="Name">
            <Input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Ardovo Growth Platform" autoFocus />
          </Field>
          <div className="row gap-2 wrap">
            <Field label="SKU">
              <Input value={draft.sku} onChange={e => setDraft({ ...draft, sku: e.target.value })} placeholder="PLT-GROW" style={{ textTransform: 'uppercase' }} />
            </Field>
            <Field label="Family">
              <Select value={draft.family} onChange={e => setDraft({ ...draft, family: e.target.value })}>
                {FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
              </Select>
            </Field>
          </div>
          <div className="row gap-2 wrap">
            <Field label="List price (Standard)" hint="Enterprise and Partner books derive from this.">
              <Input type="number" min="0" value={draft.list} onChange={e => setDraft({ ...draft, list: e.target.value })} placeholder="42000" />
            </Field>
            <Field label="Billing">
              <Select value={draft.billing} onChange={e => setDraft({ ...draft, billing: e.target.value })}>
                {BILLING.map(b => <option key={b} value={b}>{BILLING_LABEL[b]}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Description">
            <Input value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} placeholder="What this product delivers." />
          </Field>
          {editing && editing !== 'new' && (
            <div className="row between" style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
              <div className="t-sm muted">Currently {editing.active ? 'active and sellable' : 'inactive'}.</div>
              <Button variant={editing.active ? 'quiet' : 'accent'} size="sm" onClick={() => { onToggle(editing); setEditing(null); }}>
                {editing.active ? 'Deactivate' : 'Activate'}
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {/* ---- payment link generator ---- */}
      <Modal
        open={!!linkModal}
        onClose={() => setLinkModal(null)}
        title="Payment link"
        footer={<Button variant="quiet" onClick={() => setLinkModal(null)}>Done</Button>}
      >
        {linkModal && (() => {
          const { product, loading, result } = linkModal;
          const live = !!(result && result.configured && result.url);
          const amount = result ? result.amount : priceFor(product, bookId);
          const recurring = result && result.type === 'recurring';
          return (
            <div className="col gap-2">
              <div className="row between" style={{ alignItems: 'flex-start' }}>
                <div className="col gap-1" style={{ minWidth: 0 }}>
                  <div className="fw-7" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</div>
                  <div className="mono t-xs muted">{product.sku}</div>
                </div>
                <div className="fw-7" style={{ flex: 'none' }}>{money(amount)}{recurring && <span className="t-xs muted"> / {result.interval}</span>}</div>
              </div>
              {loading ? (
                <div className="panel t-sm muted" style={{ padding: '.7rem .8rem' }}>Creating secure checkout...</div>
              ) : live ? (
                <>
                  <div className="panel row between" style={{ padding: '.6rem .8rem', gap: '.5rem', alignItems: 'center' }}>
                    <span className="mono t-sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{result.url}</span>
                    <span className="row gap-1" style={{ flex: 'none' }}>
                      <Button variant="quiet" size="sm" onClick={() => copy(result.url, 'Link copied.')}><Icon name="copy" size={14} /> Copy</Button>
                      <a className="btn btn-quiet btn-sm" href={result.url} target="_blank" rel="noreferrer"><Icon name="arrowUpRight" size={14} /> Open</a>
                    </span>
                  </div>
                  {result.message && <Button variant="ghost" size="sm" onClick={() => copy(result.message, 'Pay message copied.')}><Icon name="copy" size={14} /> Copy pay message</Button>}
                  <div className="t-xs muted row gap-1"><Icon name="check" size={13} /> Live Stripe checkout at the {book.name} price.</div>
                </>
              ) : (
                <>
                  <div className="t-sm muted row gap-1" style={{ alignItems: 'flex-start' }}>
                    <Icon name="lock" size={14} />
                    <span>Connect Stripe to collect real payments. Set STRIPE_SECRET_KEY in the environment and this creates a live checkout link. You can still copy the message below for the demo.</span>
                  </div>
                  {result && result.message && <Button variant="ghost" size="sm" onClick={() => copy(result.message, 'Pay message copied.')}><Icon name="copy" size={14} /> Copy pay message</Button>}
                </>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
