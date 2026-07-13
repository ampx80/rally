// Payments. Rally's commerce layer - the gap that keeps a CRM from being a
// money platform. Rally already sends invoices; Payments adds fast collection:
// a live volume dashboard, shareable payment links + text-to-pay straight to a
// contact's phone, a branded checkout preview, and recurring subscriptions with
// failed-payment dunning. Four surfaces over one local-first store
// (src/lib/payments-data.js). 100% functional with seeded data + zero backend;
// real charges + real text-to-pay are Stripe-env-gated and degrade to a local
// queue. NO em-dash anywhere; ASCII hyphen only.
import React, { useMemo, useState } from 'react';
import {
  usePayments, paymentStats, linkStats, recentTransactions, upcomingRenewals,
  dunningQueue, getLinks, getSubscriptions, getBusiness,
  createLink, markLinkPaid, expireLink, refundTransaction, retrySubscription,
  cancelSubscription, updateBusiness, hasStripeEnv, linkUrl, intervalMonths,
  TXN_STATUS_META, CARD_BRANDS, brandById, LINK_CHANNELS, LINK_STATUS_META,
  SUB_STATUS_META, INTERVALS, PLANS,
} from '../lib/payments-data.js';
import {
  Button, Card, Badge, PageTitle, SectionHeader, Field, Input, Select, Textarea,
  Modal, EmptyState, Tabs, Segmented, ProgressBar, Sparkline, MiniBars, StatCard,
  GradientText, useToast, money, moneyK, shortDate, relTime,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';

function askRook(prompt) {
  try { window.dispatchEvent(new CustomEvent('rally:rook', { detail: { prompt } })); } catch {}
}
function copyText(text, toast) {
  try {
    navigator.clipboard?.writeText(text);
    toast('Copied to clipboard');
  } catch { toast('Copy failed', 'risk'); }
}

/* ---------- shared bits ---------- */
function StatusBadge({ status, map = TXN_STATUS_META }) {
  const m = map[status] || { label: status, tone: 'default' };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}
function BrandChip({ id, last4 }) {
  const b = brandById(id);
  return (
    <span className="row" style={{ gap: 8, alignItems: 'center' }}>
      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.02em', color: '#fff', background: b.color, padding: '2px 5px', borderRadius: 4, flex: 'none', minWidth: 34, textAlign: 'center' }}>{b.short}</span>
      {last4 && <span className="mono t-sm muted">{last4}</span>}
    </span>
  );
}

/* Deterministic faux QR - a visual mock (never a scannable code). Builds a
   module matrix from a hash of the slug so it is stable across reloads, with
   corner finder squares for realism. */
function FauxQR({ text = '', size = 132 }) {
  const N = 21;
  const cells = useMemo(() => {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1000) / 1000; };
    const grid = [];
    const isFinder = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= N - 7) || (r >= N - 7 && c < 7);
    for (let r = 0; r < N; r++) {
      const row = [];
      for (let c = 0; c < N; c++) {
        if (isFinder(r, c)) {
          const rr = r < 7 ? r : r - (N - 7);
          const cc = c < 7 ? c : c - (N - 7);
          const on = rr === 0 || rr === 6 || cc === 0 || cc === 6 || (rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4);
          row.push(on ? 1 : 0);
        } else {
          row.push(rnd() > 0.52 ? 1 : 0);
        }
      }
      grid.push(row);
    }
    return grid;
  }, [text]);
  const px = size / N;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Payment QR preview" style={{ background: '#fff', borderRadius: 8, display: 'block' }}>
      {cells.map((row, r) => row.map((v, c) => v ? <rect key={`${r}-${c}`} x={c * px} y={r * px} width={px} height={px} fill="#0e1116" /> : null))}
    </svg>
  );
}

/* ============================================================
   TAB 1 - DASHBOARD
   ============================================================ */
function Dashboard({ stats, lstats, onGoLinks, onRefund }) {
  const toast = useToast();
  const [filter, setFilter] = useState('all');
  const rows = recentTransactions(10, filter);
  const statusCounts = [
    { key: 'succeeded', n: stats.succeededCount },
    { key: 'pending', n: stats.pendingCount },
    { key: 'failed', n: stats.failedCount },
    { key: 'refunded', n: stats.refundCount },
  ];
  const totalCounted = statusCounts.reduce((s, x) => s + x.n, 0) || 1;

  return (
    <div className="col gap-3">
      {/* KPI row */}
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <StatCard label="Volume this month" value={stats.volumeThisMonth} format={moneyK} icon={<Icon name="dollar" />}
          spark={stats.trend} sparkColor="var(--accent)" sub={`${money(stats.netVolume)} net all-time`} />
        <StatCard label="MRR" value={stats.mrr} format={moneyK} accent="var(--accent-teal)" icon={<Icon name="rotateCcw" />}
          sub={`${moneyK(stats.arr)} ARR`} />
        <StatCard label="Success rate" value={Math.round(stats.successRate * 100)} format={(n) => `${Math.round(n)}%`}
          accent="var(--ok)" icon={<Icon name="check" />} sub={`${stats.succeededCount} of ${stats.succeededCount + stats.failedCount} charges`} />
        <StatCard label="Refunds" value={stats.refundTotal} format={moneyK} accent="var(--risk)" icon={<Icon name="rotateCcw" />}
          sub={`${stats.refundCount} refunded`} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr' }}>
        {/* recent transactions */}
        <Card pad={false}>
          <div className="row between wrap" style={{ padding: '1.15rem 1.35rem', gap: '.75rem' }}>
            <div className="col gap-1" style={{ minWidth: 0 }}>
              <h3 style={{ margin: 0 }}>Recent transactions</h3>
              <div className="muted t-sm">Every charge, settlement and refund in one ledger</div>
            </div>
            <Segmented value={filter} onChange={setFilter}
              options={[{ value: 'all', label: 'All' }, { value: 'succeeded', label: 'Succeeded' }, { value: 'failed', label: 'Failed' }, { value: 'refunded', label: 'Refunded' }]} />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead><tr><th>Customer</th><th>Description</th><th>Method</th><th style={{ textAlign: 'right' }}>Amount</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={6}><div className="muted" style={{ padding: '1rem 0', textAlign: 'center' }}>No transactions match this filter.</div></td></tr>}
                {rows.map(t => (
                  <tr key={t.id}>
                    <td>
                      <div className="fw-6 clip" style={{ maxWidth: 180 }}>{t.customer}</div>
                      <div className="t-xs muted clip" style={{ maxWidth: 180 }}>{t.company}</div>
                    </td>
                    <td><span className="t-sm clip" style={{ maxWidth: 200, display: 'inline-block' }}>{t.description}</span></td>
                    <td><BrandChip id={t.brand} last4={t.last4} /></td>
                    <td style={{ textAlign: 'right' }} className="mono fw-7 tnum">{money(t.amount)}</td>
                    <td><StatusBadge status={t.status} /></td>
                    <td style={{ textAlign: 'right' }}>
                      {t.status === 'succeeded'
                        ? <button className="btn btn-quiet btn-sm reveal" onClick={() => onRefund(t)}>Refund</button>
                        : <span className="t-xs muted mono">{relTime(t.createdAt)}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* right column: payout + status split + rook */}
        <div className="col gap-3">
          <Card>
            <SectionHeader title="Payout schedule" sub="Funds settle on a 2 day rolling basis" />
            <div className="col gap-2">
              <div className="row between" style={{ alignItems: 'flex-end' }}>
                <div className="col gap-1">
                  <div className="stat-label">In transit</div>
                  <div className="stat-value" style={{ fontSize: 'clamp(1.8rem,2.6vw,2.3rem)' }}>{money(stats.payout.inTransit)}</div>
                </div>
                <div style={{ color: 'var(--accent-600)' }}><Icon name="dollar" size={30} /></div>
              </div>
              <div className="panel" style={{ padding: '.85rem 1rem' }}>
                <div className="row between"><span className="t-sm muted">Next payout</span><span className="fw-7 t-sm">{shortDate(stats.payout.nextPayout)}</span></div>
                <div className="row between" style={{ marginTop: 6 }}><span className="t-sm muted">Last payout</span><span className="fw-6 t-sm mono">{money(stats.payout.last.amount)} <span className="muted">{relTime(stats.payout.last.date)}</span></span></div>
              </div>
              <Button variant="ghost" size="sm" as="a" href="#" onClick={(e) => { e.preventDefault(); askRook('Break down my upcoming Rally payout and flag any charges at risk of a chargeback.'); }}>
                <Icon name="sparkles" size={15} /> Ask Rook about payouts
              </Button>
            </div>
          </Card>

          <Card>
            <SectionHeader title="Charge health" sub="Where this period's attempts land" />
            <div className="col gap-2">
              <div className="row" style={{ height: 12, borderRadius: 999, overflow: 'hidden', background: 'var(--n-100)' }}>
                {statusCounts.map(s => s.n > 0 && (
                  <div key={s.key} title={`${TXN_STATUS_META[s.key].label}: ${s.n}`} style={{ width: `${(s.n / totalCounted) * 100}%`, background: TXN_STATUS_META[s.key].color }} />
                ))}
              </div>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '.5rem 1rem' }}>
                {statusCounts.map(s => (
                  <div key={s.key} className="row gap-1" style={{ alignItems: 'center' }}>
                    <span className="dot" style={{ background: TXN_STATUS_META[s.key].color }} />
                    <span className="t-sm muted">{TXN_STATUS_META[s.key].label}</span>
                    <span className="spacer" /><span className="fw-7 tnum">{s.n}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* collection summary strip */}
      <Card className="row between wrap" style={{ gap: '1rem' }}>
        <div className="row gap-3 wrap" style={{ alignItems: 'center' }}>
          <div className="col gap-1"><div className="stat-label">Collected via links</div><div className="fw-8 t-lg mono">{money(lstats.collected)}</div></div>
          <div className="col gap-1"><div className="stat-label">Outstanding</div><div className="fw-8 t-lg mono" style={{ color: 'var(--warn)' }}>{money(lstats.outstanding)}</div></div>
          <div className="col gap-1"><div className="stat-label">Link conversion</div><div className="fw-8 t-lg mono">{Math.round(lstats.conversion * 100)}%</div></div>
        </div>
        <Button variant="accent" onClick={onGoLinks}><Icon name="link" size={16} /> Collect a payment</Button>
      </Card>
    </div>
  );
}

/* ============================================================
   TAB 2 - PAYMENT LINKS + TEXT TO PAY
   ============================================================ */
function LinkModal({ open, onClose, presetChannel }) {
  const toast = useToast();
  const [form, setForm] = useState(null);
  const f = form || { title: '', amount: '', description: '', type: 'one_time', interval: 'monthly', channel: presetChannel || 'link', customer: '', company: '', phone: '' };
  React.useEffect(() => { if (open) setForm({ title: '', amount: '', description: '', type: 'one_time', interval: 'monthly', channel: presetChannel || 'link', customer: '', company: '', phone: '' }); }, [open, presetChannel]);
  const set = (k, v) => setForm({ ...f, [k]: v });
  const [created, setCreated] = useState(null);

  const submit = () => {
    const res = createLink(f);
    if (res.error) { toast(res.message, 'risk'); return; }
    setCreated(res.link);
    toast(f.channel === 'sms' ? 'Text to pay sent' : 'Payment link created');
  };

  const close = () => { setCreated(null); onClose(); };

  return (
    <Modal open={open} onClose={close} width={created ? 460 : 600}
      title={created ? 'Link is ready' : (f.channel === 'sms' ? 'Text a customer to pay' : 'New payment link')}
      footer={created
        ? <Button onClick={close}>Done</Button>
        : <><Button variant="ghost" onClick={close}>Cancel</Button><Button variant="accent" onClick={submit}><Icon name={f.channel === 'sms' ? 'send' : 'link'} size={15} /> {f.channel === 'sms' ? 'Send to pay' : 'Create link'}</Button></>}>
      {created ? (
        <div className="col center gap-3" style={{ textAlign: 'center' }}>
          <FauxQR text={created.slug} size={150} />
          <div className="col gap-1">
            <div className="fw-7">{created.title}</div>
            <div className="stat-value" style={{ fontSize: '2rem' }}>{money(created.amount)}{created.type === 'recurring' && <span className="t-sm muted" style={{ fontSize: '1rem' }}> / {INTERVALS.find(i => i.id === created.interval)?.label.toLowerCase()}</span>}</div>
          </div>
          <div className="panel row between" style={{ padding: '.6rem .8rem', width: '100%', gap: '.5rem' }}>
            <span className="mono t-sm clip">{linkUrl(created.slug)}</span>
            <button className="btn btn-quiet btn-sm" onClick={() => copyText(linkUrl(created.slug), toast)}><Icon name="copy" size={14} /> Copy</button>
          </div>
          {created.channel === 'sms' && <div className="t-sm muted">Sent by text to {created.phone || 'the customer'}. {hasStripeEnv() ? '' : 'Test mode - no real message left your account.'}</div>}
        </div>
      ) : (
        <div className="col gap-2">
          <div className="row gap-1 wrap">
            {LINK_CHANNELS.map(ch => (
              <button key={ch.id} onClick={() => set('channel', ch.id)} className="btn btn-sm"
                style={{ background: f.channel === ch.id ? 'var(--accent-50)' : 'var(--paper)', border: `1px solid ${f.channel === ch.id ? 'var(--accent)' : 'var(--line-strong)'}`, color: f.channel === ch.id ? 'var(--accent-600)' : 'var(--ink-2)', fontWeight: 700 }}>
                <Icon name={ch.icon} size={15} /> {ch.label}
              </button>
            ))}
          </div>
          <Field label="What is this for"><Input value={f.title} onChange={e => set('title', e.target.value)} placeholder="Deposit invoice, milestone 2 payment..." /></Field>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <Field label="Amount (USD)"><Input value={f.amount} onChange={e => set('amount', e.target.value)} inputMode="decimal" placeholder="2500" /></Field>
            <Field label="Billing">
              <Select value={f.type} onChange={e => set('type', e.target.value)}>
                <option value="one_time">One time</option>
                <option value="recurring">Recurring</option>
              </Select>
            </Field>
          </div>
          {f.type === 'recurring' && (
            <Field label="Interval">
              <Select value={f.interval} onChange={e => set('interval', e.target.value)}>
                {INTERVALS.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}
              </Select>
            </Field>
          )}
          <Field label="Description (shown at checkout)"><Textarea rows={2} value={f.description} onChange={e => set('description', e.target.value)} placeholder="Line item the customer will see" /></Field>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <Field label="Customer name"><Input value={f.customer} onChange={e => set('customer', e.target.value)} placeholder="Optional" /></Field>
            <Field label={f.channel === 'sms' ? 'Mobile number' : 'Company'}>
              {f.channel === 'sms'
                ? <Input value={f.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 555-0100" />
                : <Input value={f.company} onChange={e => set('company', e.target.value)} placeholder="Optional" />}
            </Field>
          </div>
          {!hasStripeEnv() && <div className="t-xs muted row gap-1"><Icon name="lock" size={13} /> Test mode: connect Stripe to charge real cards. Links still work locally.</div>}
        </div>
      )}
    </Modal>
  );
}

function LinkDetail({ link, onClose }) {
  const toast = useToast();
  if (!link) return null;
  const url = linkUrl(link.slug);
  const meta = LINK_STATUS_META[link.status];
  const chan = LINK_CHANNELS.find(c => c.id === link.channel);
  return (
    <Modal open={!!link} onClose={onClose} width={480} title={link.title}
      footer={<>
        {link.status !== 'paid' && link.status !== 'expired' && <Button variant="ghost" onClick={() => { expireLink(link.id); toast('Link expired'); onClose(); }}>Expire</Button>}
        {link.status !== 'paid' && <Button variant="accent" onClick={() => { markLinkPaid(link.id); toast('Marked as paid'); onClose(); }}><Icon name="check" size={15} /> Mark paid</Button>}
        {link.status === 'paid' && <Button onClick={onClose}>Close</Button>}
      </>}>
      <div className="col center gap-3" style={{ textAlign: 'center' }}>
        <FauxQR text={link.slug} size={150} />
        <div className="stat-value" style={{ fontSize: '2rem' }}>{money(link.amount)}{link.type === 'recurring' && <span className="t-sm muted" style={{ fontSize: '1rem' }}> / {INTERVALS.find(i => i.id === link.interval)?.label.toLowerCase()}</span>}</div>
        <div className="row gap-1"><StatusBadge status={link.status} map={LINK_STATUS_META} /><Badge tone="default"><Icon name={chan?.icon} size={12} /> {chan?.label}</Badge></div>
        <div className="panel row between" style={{ padding: '.6rem .8rem', width: '100%', gap: '.5rem' }}>
          <span className="mono t-sm clip">{url}</span>
          <button className="btn btn-quiet btn-sm" onClick={() => copyText(url, toast)}><Icon name="copy" size={14} /> Copy</button>
        </div>
        <div className="t-sm muted">{link.customer ? `For ${link.customer}` : 'No customer set'}{link.company ? ` at ${link.company}` : ''} - created {relTime(link.createdAt)}</div>
      </div>
    </Modal>
  );
}

function Links() {
  const [modal, setModal] = useState(null); // 'link' | 'sms' | null
  const [detail, setDetail] = useState(null);
  const [tab, setTab] = useState('all');
  const links = getLinks();
  const stats = linkStats();
  const shown = links.filter(l => tab === 'all' ? true : tab === 'paid' ? l.status === 'paid' : l.status !== 'paid');

  return (
    <div className="col gap-3">
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <StatCard label="Collected" value={stats.collected} format={moneyK} accent="var(--ok)" icon={<Icon name="check" />} sub={`${stats.paidCount} links paid`} />
        <StatCard label="Outstanding" value={stats.outstanding} format={moneyK} accent="var(--warn)" icon={<Icon name="clock" />} sub={`${stats.pendingCount} awaiting`} />
        <StatCard label="Conversion" value={Math.round(stats.conversion * 100)} format={(n) => `${Math.round(n)}%`} accent="var(--accent)" icon={<Icon name="trendUp" />} sub={`${stats.total} links sent`} />
      </div>

      <Card pad={false}>
        <div className="row between wrap" style={{ padding: '1.15rem 1.35rem', gap: '.75rem' }}>
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0 }}>Payment links</h3>
            <div className="muted t-sm">Share a link or text a customer to pay in two taps. This is what turns a CRM into a money platform.</div>
          </div>
          <div className="row gap-1 wrap">
            <Button variant="ghost" onClick={() => setModal('sms')}><Icon name="phone" size={15} /> Text to pay</Button>
            <Button variant="accent" onClick={() => setModal('link')}><Icon name="plus" size={15} /> New link</Button>
          </div>
        </div>
        <div style={{ padding: '0 1.35rem' }}>
          <Tabs active={tab} onChange={setTab} tabs={[{ key: 'all', label: 'All', count: links.length }, { key: 'open', label: 'Open', count: links.filter(l => l.status !== 'paid').length }, { key: 'paid', label: 'Paid', count: links.filter(l => l.status === 'paid').length }]} />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>Link</th><th>Customer</th><th>Channel</th><th style={{ textAlign: 'right' }}>Amount</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {shown.map(l => {
                const chan = LINK_CHANNELS.find(c => c.id === l.channel);
                return (
                  <tr key={l.id} style={{ cursor: 'pointer' }} onClick={() => setDetail(l)}>
                    <td>
                      <div className="fw-6 clip" style={{ maxWidth: 210 }}>{l.title}</div>
                      <div className="t-xs muted mono clip" style={{ maxWidth: 210 }}>{linkUrl(l.slug)}</div>
                    </td>
                    <td><span className="t-sm">{l.customer || <span className="muted">-</span>}</span></td>
                    <td><span className="row gap-1 t-sm"><Icon name={chan?.icon} size={14} /> {chan?.label}{l.type === 'recurring' && <Badge tone="accent" className="t-xs">Recurring</Badge>}</span></td>
                    <td style={{ textAlign: 'right' }} className="mono fw-7 tnum">{money(l.amount)}</td>
                    <td><StatusBadge status={l.status} map={LINK_STATUS_META} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-quiet btn-sm reveal" onClick={(e) => { e.stopPropagation(); setDetail(l); }}><Icon name="chevronRight" size={15} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <LinkModal open={!!modal} presetChannel={modal === 'sms' ? 'sms' : 'link'} onClose={() => setModal(null)} />
      <LinkDetail link={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

/* ============================================================
   TAB 3 - CHECKOUT PREVIEW  (visual mock only, no real card data)
   ============================================================ */
function Checkout() {
  const toast = useToast();
  const biz = getBusiness();
  const links = getLinks();
  const [amount, setAmount] = useState('2500');
  const [desc, setDesc] = useState('Platform rollout - milestone 1');
  const [name, setName] = useState(biz.name);
  const [accent, setAccent] = useState(biz.accent);
  const amt = Number(amount) || 0;

  const applyLink = (id) => {
    const l = links.find(x => x.id === id);
    if (!l) return;
    setAmount(String(l.amount));
    setDesc(l.description || l.title);
  };

  return (
    <div className="grid" style={{ gridTemplateColumns: '340px 1fr', alignItems: 'start' }}>
      {/* config */}
      <Card className="col gap-2">
        <SectionHeader title="Checkout setup" sub="Style the page your customer sees" />
        <Field label="Prefill from a link">
          <Select defaultValue="" onChange={e => applyLink(e.target.value)}>
            <option value="">Choose a payment link...</option>
            {links.slice(0, 12).map(l => <option key={l.id} value={l.id}>{l.title} - {money(l.amount)}</option>)}
          </Select>
        </Field>
        <Field label="Business name"><Input value={name} onChange={e => setName(e.target.value)} /></Field>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Field label="Amount"><Input value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" /></Field>
          <Field label="Accent">
            <div className="row gap-1" style={{ alignItems: 'center' }}>
              <input type="color" value={accent} onChange={e => setAccent(e.target.value)} style={{ width: 42, height: 38, border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', background: 'none', padding: 2, cursor: 'pointer' }} />
              <Input value={accent} onChange={e => setAccent(e.target.value)} />
            </div>
          </Field>
        </div>
        <Field label="Line item"><Input value={desc} onChange={e => setDesc(e.target.value)} /></Field>
        <Button variant="ghost" size="sm" onClick={() => { updateBusiness({ name, accent }); toast('Saved to your checkout brand'); }}><Icon name="check" size={15} /> Save brand</Button>
        <div className="panel t-xs muted row gap-1" style={{ padding: '.6rem .7rem', alignItems: 'flex-start' }}>
          <Icon name="shield" size={14} /> <span>PCI note: Rally never touches raw card numbers. Fields tokenize client-side to Stripe. This preview collects nothing.</span>
        </div>
      </Card>

      {/* the branded checkout mock */}
      <div className="col center" style={{ padding: '.5rem 0' }}>
        <div style={{ width: '100%', maxWidth: 440, borderRadius: 'var(--r-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--line)' }}>
          <div style={{ background: `linear-gradient(120deg, ${accent}, ${accent}cc)`, color: '#fff', padding: '1.4rem 1.5rem' }}>
            <div className="row gap-2" style={{ alignItems: 'center' }}>
              <span style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,.2)', display: 'grid', placeItems: 'center', fontWeight: 800 }}>{(name || 'R').slice(0, 1)}</span>
              <div className="fw-7">{name || 'Your business'}</div>
            </div>
            <div style={{ marginTop: 16, opacity: .85, fontSize: '.85rem', fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase' }}>Amount due</div>
            <div style={{ fontSize: '2.6rem', fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.1 }}>{money(amt)}</div>
            <div style={{ opacity: .9, fontSize: '.9rem' }}>{desc}</div>
          </div>
          <div style={{ background: 'var(--paper)', padding: '1.4rem 1.5rem' }} className="col gap-2">
            <Field label="Email"><Input placeholder="you@company.com" disabled /></Field>
            <Field label="Card information">
              <div style={{ border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', overflow: 'hidden' }}>
                <div className="row between" style={{ padding: '.68rem .85rem', borderBottom: '1px solid var(--line)' }}>
                  <span className="mono muted">1234 1234 1234 1234</span>
                  <span className="row gap-1">{CARD_BRANDS.slice(0, 3).map(b => <span key={b.id} style={{ fontSize: 9, fontWeight: 800, color: '#fff', background: b.color, padding: '2px 4px', borderRadius: 3 }}>{b.short}</span>)}</span>
                </div>
                <div className="row">
                  <span className="mono muted" style={{ padding: '.68rem .85rem', flex: 1, borderRight: '1px solid var(--line)' }}>MM / YY</span>
                  <span className="mono muted" style={{ padding: '.68rem .85rem', flex: 1 }}>CVC</span>
                </div>
              </div>
            </Field>
            <Field label="Name on card"><Input placeholder="Full name" disabled /></Field>
            <button className="btn" style={{ background: accent, color: '#fff', width: '100%', padding: '.85rem', fontSize: '1.05rem', boxShadow: 'var(--shadow-md)' }}
              onClick={() => toast('Preview only - no real card data is collected', 'warn')}>
              <Icon name="lock" size={15} /> Pay {money(amt)}
            </button>
            <div className="row center gap-1 t-xs muted" style={{ marginTop: 2 }}>
              <Icon name="lock" size={12} /> Secured by Rally Payments. Powered by Stripe.
            </div>
          </div>
        </div>
        <div className="t-xs muted" style={{ marginTop: 12, textAlign: 'center', maxWidth: 440 }}>This is a visual preview of the hosted checkout. The Pay button is inert and no card fields are live.</div>
      </div>
    </div>
  );
}

/* ============================================================
   TAB 4 - SUBSCRIPTIONS
   ============================================================ */
function Subscriptions({ stats }) {
  const toast = useToast();
  const subs = getSubscriptions();
  const renewals = upcomingRenewals(45);
  const dunning = dunningQueue();
  const active = subs.filter(s => s.status !== 'canceled');

  return (
    <div className="col gap-3">
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <StatCard label="MRR" value={stats.mrr} format={moneyK} accent="var(--accent)" icon={<Icon name="rotateCcw" />} sub={`${moneyK(stats.arr)} ARR`} />
        <StatCard label="Active plans" value={stats.activeSubs} accent="var(--ok)" icon={<Icon name="users" />} sub={`${subs.length} total`} />
        <StatCard label="Past due" value={stats.pastDueCount} accent="var(--risk)" icon={<Icon name="clock" />} sub={`${money(dunning.reduce((s, d) => s + d.amount, 0))} at risk`} />
        <StatCard label="Churn rate" value={Math.round(stats.churnRate * 100)} format={(n) => `${Math.round(n)}%`} accent="var(--warn)" icon={<Icon name="arrowDown" />} sub="canceled of all-time" />
      </div>

      {dunning.length > 0 && (
        <Card style={{ borderColor: 'var(--risk)' }}>
          <div className="row between wrap" style={{ marginBottom: '.9rem', gap: '.5rem' }}>
            <div className="col gap-1" style={{ minWidth: 0 }}>
              <h3 style={{ margin: 0, color: 'var(--risk)' }}>Failed payments - dunning</h3>
              <div className="muted t-sm">Recover revenue before it churns. Rally auto-retries on a smart schedule.</div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => askRook('Draft a friendly dunning email for my past-due Rally subscriptions and suggest the best retry timing.')}><Icon name="sparkles" size={15} /> Ask Rook to recover</Button>
          </div>
          <div className="col gap-1">
            {dunning.map(s => (
              <div key={s.id} className="row between wrap panel" style={{ padding: '.75rem .9rem', gap: '.5rem' }}>
                <div className="col gap-1" style={{ minWidth: 0 }}>
                  <div className="fw-6 clip">{s.customer} <span className="muted fw-5">- {s.planName}</span></div>
                  <div className="t-xs muted">{s.failedAttempts} failed {s.failedAttempts === 1 ? 'attempt' : 'attempts'} - {money(s.amount)}/{INTERVALS.find(i => i.id === s.interval)?.label.toLowerCase()} - <BrandChip id={s.brand} last4={s.last4} /></div>
                </div>
                <Button variant="accent" size="sm" onClick={() => { retrySubscription(s.id); toast('Charge retried - subscription recovered'); }}><Icon name="rotateCcw" size={14} /> Retry now</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        <Card pad={false}>
          <div style={{ padding: '1.15rem 1.35rem' }}><SectionHeader title="Active subscriptions" sub="Your recurring revenue book" /></div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead><tr><th>Customer</th><th>Plan</th><th style={{ textAlign: 'right' }}>Amount</th><th>Next renewal</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {active.map(s => (
                  <tr key={s.id}>
                    <td><div className="fw-6 clip" style={{ maxWidth: 170 }}>{s.customer}</div><div className="t-xs muted clip" style={{ maxWidth: 170 }}>{s.company}</div></td>
                    <td><span className="t-sm">{s.planName}</span><div className="t-xs muted">{INTERVALS.find(i => i.id === s.interval)?.label}</div></td>
                    <td style={{ textAlign: 'right' }} className="mono fw-7 tnum">{money(s.amount)}</td>
                    <td><span className="t-sm">{s.nextRenewal ? shortDate(s.nextRenewal) : '-'}</span><div className="t-xs muted">{s.nextRenewal ? relTime(s.nextRenewal) : ''}</div></td>
                    <td><StatusBadge status={s.status} map={SUB_STATUS_META} /></td>
                    <td style={{ textAlign: 'right' }}><button className="btn btn-quiet btn-sm reveal" onClick={() => { cancelSubscription(s.id); toast('Subscription canceled'); }}>Cancel</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <SectionHeader title="Upcoming renewals" sub="Next 45 days" />
          <div className="col gap-1">
            {renewals.length === 0 && <EmptyState icon="🗓️" title="No renewals due" body="Nothing renews in the next 45 days." />}
            {renewals.slice(0, 8).map(s => (
              <div key={s.id} className="row between" style={{ padding: '.6rem 0', borderBottom: '1px solid var(--n-50)' }}>
                <div className="col gap-1" style={{ minWidth: 0 }}>
                  <span className="fw-6 t-sm clip">{s.customer}</span>
                  <span className="t-xs muted">{s.planName} - {money(s.amount)}</span>
                </div>
                <div className="col" style={{ alignItems: 'flex-end', flex: 'none' }}>
                  <span className="fw-7 t-sm">{shortDate(s.nextRenewal)}</span>
                  <span className="t-xs muted">{relTime(s.nextRenewal)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ============================================================
   PAGE SHELL
   ============================================================ */
export default function Payments() {
  const [tab, setTab] = useState('dashboard');
  const [refundTx, setRefundTx] = useState(null);
  const toast = useToast();
  // subscribe so every writer (mark paid, refund, retry) re-renders the KPIs.
  usePayments();
  const stats = paymentStats();
  const lstats = linkStats();

  const doRefund = () => {
    if (!refundTx) return;
    const res = refundTransaction(refundTx.id);
    if (res.error) toast(res.message, 'risk'); else toast('Refund issued');
    setRefundTx(null);
  };

  return (
    <div className="page-in col gap-3">
      <PageTitle
        eyebrow="Commerce"
        title={<>Payments</>}
        sub="Collect money as fast as you close it. Links, text-to-pay, checkout and subscriptions - the commerce layer HubSpot and GoHighLevel make you bolt on."
        action={
          <div className="row gap-1">
            {!hasStripeEnv() && <Badge tone="warn"><Icon name="lock" size={12} /> Test mode</Badge>}
            <Button variant="accent" onClick={() => setTab('links')}><Icon name="dollar" size={16} /> Collect a payment</Button>
          </div>
        }
      />

      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'dashboard', label: 'Dashboard' },
        { key: 'links', label: 'Links + text to pay', count: getLinks().length },
        { key: 'checkout', label: 'Checkout preview' },
        { key: 'subscriptions', label: 'Subscriptions', count: stats.activeSubs },
      ]} />

      {tab === 'dashboard' && <Dashboard stats={stats} lstats={lstats} onGoLinks={() => setTab('links')} onRefund={setRefundTx} />}
      {tab === 'links' && <Links />}
      {tab === 'checkout' && <Checkout />}
      {tab === 'subscriptions' && <Subscriptions stats={stats} />}

      <Modal open={!!refundTx} onClose={() => setRefundTx(null)} width={420} title="Refund this charge?"
        footer={<><Button variant="ghost" onClick={() => setRefundTx(null)}>Cancel</Button><Button variant="danger" onClick={doRefund}>Refund {refundTx ? money(refundTx.amount) : ''}</Button></>}>
        {refundTx && <div className="col gap-2">
          <div className="row between panel" style={{ padding: '.75rem .9rem' }}>
            <div className="col gap-1"><span className="fw-6">{refundTx.customer}</span><span className="t-xs muted">{refundTx.description}</span></div>
            <span className="mono fw-7">{money(refundTx.amount)}</span>
          </div>
          <div className="t-sm muted">The full amount is returned to the customer's {brandById(refundTx.brand).label} card ending {refundTx.last4}. This cannot be undone.</div>
        </div>}
      </Modal>
    </div>
  );
}
