// Deal detail - the deepest object in Rally. A living deal record:
// dual headline value + line-item ACV, a grounded AI insight banner, a
// clickable stage stepper with win/loss capture, and six deep, editable
// main-column panels (line items, buying committee with roles + influence,
// competitors, mutual close plan, next step, audit history). Right rail is
// the activity timeline. Reads id from useParams().id only; renders a clean
// Not found card if the deal is missing (data is synchronous, never a
// permanent spinner). All writes flow through the store so every panel is
// reactive via useStore() + useDepth().
import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  useStore, getDeal, getCompany, getContact, getUser, getUsers,
  getContactsForCompany, contactName, userName, moveDealStage, updateDeal,
  stageById, STAGES,
} from '../lib/store.js';
import {
  useDepth, getDealExtras, dealACV, lineItemTotal, addLineItem, updateLineItem,
  removeLineItem, setStakeholder, removeStakeholder, addCompetitor,
  removeCompetitor, updateDealMeta, toggleClosePlanStep, dealInsight,
  STAKEHOLDER_ROLES, INFLUENCE, COMPETITOR_OPTIONS,
} from '../lib/store-depth.js';
import { getProducts } from '../lib/store-ext.js';
import {
  Button, Card, Badge, Avatar, Field, Input, Select, Textarea, Modal,
  ProgressBar, EmptyState, moneyK, money, longDate, monthDay, relTime, useToast,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import { celebrate } from '../lib/celebrate.js';
import ActivityTimeline from '../components/ActivityTimeline.jsx';

const STAGE_COLOR = {
  lead: '#8b93a4', qualified: '#2563a8', discovery: '#5b4bf5',
  proposal: '#b3721a', negotiation: '#0ea5a3', won: '#1a7f52', lost: '#c0392b',
};
const TONE_COLOR = { ok: 'var(--ok)', warn: 'var(--warn)', risk: 'var(--risk)', info: 'var(--info)' };
const TONE_ICON = { ok: 'check', warn: 'clock', risk: 'zap', info: 'sparkles' };
const TONE_TINT = { ok: 'var(--ok-bg)', warn: 'var(--warn-bg)', risk: 'var(--risk-bg)', info: 'var(--info-bg)' };
const FORECAST = {
  commit: { label: 'Commit', tone: 'ok' },
  best_case: { label: 'Best case', tone: 'info' },
  pipeline: { label: 'Pipeline', tone: 'default' },
};
const INFLUENCE_TONE = { high: 'risk', medium: 'warn', low: 'default' };
const WIN_REASONS = ['Product fit', 'Champion drove it', 'Better AI / automation', 'Faster time to value', 'Price / packaging', 'Executive alignment'];
const LOSS_REASONS = ['Went with incumbent', 'No budget / timing', 'Lost to Salesforce', 'Lost to HubSpot', 'No decision / stalled', 'Missing capability'];

function toInputDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function buildFollowUp(deal, company, contact, owner) {
  const st = stageById(deal.stage);
  const first = contact ? contact.firstName : 'there';
  const coName = company?.name || 'your team';
  const val = money(deal.value);
  const close = deal.closeDate ? longDate(deal.closeDate) : 'the coming weeks';
  const subject = `Following up on ${deal.name}`;
  const body =
`Hi ${first},

Thank you for the time your team at ${coName} has invested in exploring how we can help. I wanted to follow up and keep our momentum going.

Where things stand:
- Opportunity: ${deal.name}
- Current stage: ${st?.name || 'In progress'}
- Investment under discussion: ${val}
- Target decision timeline: ${close}

My goal is to make the next step easy. If it would help, I can pull together a tailored summary for your stakeholders, answer any open questions on scope or pricing, or set up a short working session with the right people on both sides.

Is there a good time this week for a quick call? I am happy to work around your schedule.

Best regards,
${owner?.name || 'Your account team'}${owner?.title ? `\n${owner.title}` : ''}
Rally`;
  return { subject, body };
}

/* -------- small inline-editable number cell -------- */
function NumCell({ value, suffix = '', min = 0, step = 1, width = 66, onCommit }) {
  return (
    <div className="row" style={{ gap: 3, alignItems: 'center' }}>
      <input
        className="input tnum"
        type="number" min={min} step={step}
        defaultValue={value}
        key={`nc-${value}`}
        onBlur={e => { const v = Number(e.target.value); if (Number.isFinite(v) && v !== value) onCommit(v); }}
        onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
        style={{ width, padding: '.35rem .5rem', textAlign: 'right' }}
      />
      {suffix && <span className="t-xs muted">{suffix}</span>}
    </div>
  );
}

export default function DealDetail() {
  useStore();
  useDepth();
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const [emailOpen, setEmailOpen] = useState(false);
  const [closeModal, setCloseModal] = useState(null); // 'won' | 'lost' | null
  const [closeReason, setCloseReason] = useState('');
  const [addProductId, setAddProductId] = useState('');
  const [addStakeId, setAddStakeId] = useState('');
  const [compChoice, setCompChoice] = useState('');
  const [compFree, setCompFree] = useState('');

  const deal = getDeal(id);

  if (!deal) {
    return (
      <div className="fade-up" style={{ maxWidth: 520, margin: '3rem auto' }}>
        <Card>
          <div className="col gap-2">
            <div className="eyebrow">Deal</div>
            <h3 style={{ margin: 0 }}>Deal not found</h3>
            <p className="muted">This deal may have been removed, or the link is out of date.</p>
            <div>
              <Button as={Link} to="/deals" variant="ghost">
                <Icon name="chevronRight" size={16} style={{ transform: 'rotate(180deg)' }} /> Back to deals
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const company = getCompany(deal.companyId);
  const owner = getUser(deal.ownerId);
  const currentStage = stageById(deal.stage);
  const currentOrder = currentStage?.order ?? 0;
  const isClosed = deal.status !== 'open';

  const extras = getDealExtras(deal.id);
  const acv = dealACV(deal.id);
  const insight = dealInsight(deal);
  const forecast = FORECAST[extras.forecastCategory] || FORECAST.pipeline;

  const stakeContactIds = new Set(extras.stakeholders.map(s => s.contactId));
  const committeeAvailable = getContactsForCompany(deal.companyId).filter(c => !stakeContactIds.has(c.id));
  const primaryStake = extras.stakeholders[0];
  const primaryContact = primaryStake ? getContact(primaryStake.contactId) : (deal.contactIds || []).map(getContact).filter(Boolean)[0] || null;
  const email = buildFollowUp(deal, company, primaryContact, owner);

  const closePlanDone = extras.closePlan.filter(s => s.done).length;
  const closePlanPct = extras.closePlan.length ? Math.round((closePlanDone / extras.closePlan.length) * 100) : 0;

  /* ---- actions ---- */
  const move = (stageId) => {
    const r = moveDealStage(deal.id, stageId);
    if (r.error) return toast(r.message, 'risk');
    if (stageId === 'won') celebrate();
    toast((stageId === 'won' ? 'Deal won. ' : stageId === 'lost' ? 'Deal marked lost. ' : 'Moved to ') + (stageId === 'won' || stageId === 'lost' ? '' : stageById(stageId).name), stageId === 'lost' ? 'warn' : 'ok');
  };

  const openClose = (kind) => {
    setCloseReason(kind === 'won' ? (extras.winReason || '') : (extras.lossReason || ''));
    setCloseModal(kind);
  };
  const confirmClose = () => {
    const kind = closeModal;
    move(kind);
    updateDealMeta(deal.id, kind === 'won' ? { winReason: closeReason } : { lossReason: closeReason });
    setCloseModal(null);
  };

  const patchMeta = (p) => updateDealMeta(deal.id, p);

  const onAddProduct = () => {
    if (!addProductId) return;
    const p = getProducts().find(x => x.id === addProductId);
    if (!p) return;
    addLineItem(deal.id, {
      productId: p.id, name: p.name, unitPrice: p.price,
      term: /seat|monthly/.test(p.billing) ? 12 : 1,
    });
    setAddProductId('');
    toast(`Added ${p.name}`);
  };

  const onAddStake = () => {
    if (!addStakeId) return;
    setStakeholder(deal.id, addStakeId, 'Influencer', 'medium');
    setAddStakeId('');
    toast('Stakeholder added');
  };

  const onAddCompetitor = () => {
    const name = (compFree.trim() || compChoice).trim();
    if (!name) return;
    addCompetitor(deal.id, name);
    setCompChoice(''); setCompFree('');
    toast(`Tracking ${name}`);
  };

  const shareDealRoom = () => toast('Deal room link copied - your buyer can see this plan', 'ok');

  const copyEmail = async () => {
    const text = `Subject: ${email.subject}\n\n${email.body}`;
    try { await navigator.clipboard.writeText(text); toast('Email copied to clipboard'); }
    catch { toast('Copy failed - select the text manually', 'warn'); }
  };

  return (
    <div className="fade-up">
      {/* Breadcrumb */}
      <div className="row gap-1 t-sm muted" style={{ marginBottom: '1rem' }}>
        <Link to="/deals" className="link">Deals</Link>
        <Icon name="chevronRight" size={14} />
        <span className="clip">{deal.name}</span>
      </div>

      <div className="row gap-3 wrap" style={{ alignItems: 'flex-start' }}>
        {/* ================= MAIN COLUMN ================= */}
        <div className="col gap-3" style={{ flex: '1 1 580px', minWidth: 0 }}>

          {/* ---------- HEADER ---------- */}
          <Card>
            <div className="row between wrap gap-3" style={{ alignItems: 'flex-start' }}>
              <div className="col gap-1" style={{ minWidth: 0 }}>
                <div className="row gap-1 wrap" style={{ alignItems: 'center' }}>
                  <Badge style={{ background: STAGE_COLOR[deal.stage], color: '#fff' }}>
                    {currentStage?.name}
                  </Badge>
                  <Badge tone={forecast.tone}>{forecast.label}</Badge>
                  {isClosed && (
                    <Badge tone={deal.status === 'won' ? 'ok' : 'risk'}>
                      {deal.status === 'won' ? 'Won' : 'Lost'}
                    </Badge>
                  )}
                </div>
                <h2 style={{ margin: '.35rem 0 0' }}>{deal.name}</h2>
                {company && (
                  <Link to={`/companies/${company.id}`} className="link t-lg" style={{ width: 'fit-content' }}>
                    {company.name}
                  </Link>
                )}
                <div className="row gap-3 wrap" style={{ marginTop: '.5rem' }}>
                  <div className="row gap-2" style={{ minWidth: 0 }}>
                    <Avatar name={userName(deal.ownerId)} size={30} />
                    <div className="col" style={{ lineHeight: 1.2, minWidth: 0 }}>
                      <span className="fw-6 clip">{userName(deal.ownerId)}</span>
                      <span className="t-xs muted clip">{owner?.title || 'Owner'}</span>
                    </div>
                  </div>
                  <div className="col" style={{ lineHeight: 1.2 }}>
                    <span className="t-xs muted">Close date</span>
                    <span className="fw-6">{longDate(deal.closeDate)}</span>
                  </div>
                  <div className="col" style={{ lineHeight: 1.2 }}>
                    <span className="t-xs muted">Win probability</span>
                    <span className="fw-6 tnum">{deal.probability}%</span>
                  </div>
                </div>
              </div>

              <div className="row gap-3 wrap" style={{ flex: 'none', alignItems: 'flex-start' }}>
                <div className="col" style={{ alignItems: 'flex-end' }}>
                  <div className="stat-value" style={{ fontSize: 'clamp(2.1rem, 3vw, 2.8rem)' }}>{moneyK(deal.value)}</div>
                  <div className="stat-label">Deal value</div>
                </div>
                <div className="col" style={{ alignItems: 'flex-end' }}>
                  <div className="stat-value" style={{ fontSize: 'clamp(1.5rem, 2.2vw, 2rem)', color: 'var(--accent-600)' }}>{moneyK(acv)}</div>
                  <div className="stat-label">Line-item ACV</div>
                </div>
              </div>
            </div>
          </Card>

          {/* ---------- AI INSIGHT ---------- */}
          {insight && (
            <div
              className="card fade-up"
              style={{
                position: 'relative', overflow: 'hidden', padding: '1.15rem 1.3rem',
                border: '1px solid var(--accent-300)',
                background: 'linear-gradient(135deg, var(--accent-50), var(--paper) 60%)',
                boxShadow: 'var(--accent-glow)',
              }}
            >
              <div style={{ position: 'absolute', top: -40, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'var(--accent)', opacity: .1, filter: 'blur(14px)' }} />
              <div className="row gap-2" style={{ position: 'relative', alignItems: 'center', marginBottom: '.85rem' }}>
                <span className="row center" style={{ width: 30, height: 30, borderRadius: 'var(--r-pill)', background: 'var(--accent)', color: '#fff', flex: 'none' }}>
                  <Icon name="sparkles" size={17} />
                </span>
                <div className="col" style={{ lineHeight: 1.15 }}>
                  <span className="eyebrow">Rook intelligence</span>
                  <span className="fw-7">Day {insight.daysInStage} in {currentStage?.name}</span>
                </div>
              </div>
              <div className="col gap-1" style={{ position: 'relative' }}>
                {insight.notes.map((note, i) => (
                  <div key={i} className="row gap-2" style={{ alignItems: 'flex-start', padding: '.55rem .65rem', borderRadius: 'var(--r-sm)', background: TONE_TINT[note.tone] || 'var(--n-25)' }}>
                    <span style={{ color: TONE_COLOR[note.tone] || 'var(--n-600)', flex: 'none', marginTop: 1 }}>
                      <Icon name={TONE_ICON[note.tone] || 'sparkles'} size={16} />
                    </span>
                    <span className="t-sm" style={{ color: 'var(--ink-2)', lineHeight: 1.5 }}>{note.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ---------- STAGE STEPPER ---------- */}
          <Card>
            <div className="row between wrap gap-2" style={{ marginBottom: '1rem' }}>
              <h4 style={{ margin: 0 }}>Pipeline stage</h4>
              <div className="row gap-2">
                <Button variant="primary" size="sm" onClick={() => openClose('won')}>
                  <Icon name="check" size={16} /> Mark won
                </Button>
                <Button variant="danger" size="sm" onClick={() => openClose('lost')}>
                  <Icon name="x" size={16} /> Mark lost
                </Button>
              </div>
            </div>
            <div className="row wrap gap-1">
              {STAGES.map(stage => {
                const active = stage.id === deal.stage;
                const done = !isClosed && stage.type === 'open' && (stage.order < currentOrder);
                const filled = active || done;
                const color = STAGE_COLOR[stage.id];
                return (
                  <button
                    key={stage.id}
                    onClick={() => move(stage.id)}
                    title={`Move to ${stage.name} (${stage.probability}%)`}
                    className="row gap-1"
                    style={{
                      flex: '1 1 100px', minWidth: 96, justifyContent: 'center',
                      padding: '.6rem .5rem', borderRadius: 'var(--r-sm)', cursor: 'pointer',
                      fontWeight: 600, fontSize: '.86rem', whiteSpace: 'nowrap',
                      border: `1px solid ${filled ? color : 'var(--line)'}`,
                      background: filled ? color : 'var(--n-25)',
                      color: filled ? '#fff' : 'var(--n-600)',
                      boxShadow: active ? 'var(--shadow-md)' : 'none',
                      transform: active ? 'translateY(-1px)' : 'none',
                      transition: 'background .15s var(--ease), color .15s var(--ease), border-color .15s var(--ease), transform .15s var(--ease)',
                    }}
                  >
                    {done && <Icon name="check" size={14} />}
                    <span className="clip">{stage.name}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* ---------- DEEP PANELS ---------- */}
          <div className="col gap-3 stagger">

            {/* 1. PRODUCTS / LINE ITEMS */}
            <Card>
              <div className="row between wrap gap-2" style={{ marginBottom: '.9rem' }}>
                <div className="row gap-2" style={{ alignItems: 'center' }}>
                  <Icon name="box" size={18} style={{ color: 'var(--accent-600)' }} />
                  <h4 style={{ margin: 0 }}>Products and pricing</h4>
                </div>
                <div className="row gap-1">
                  <Select value={addProductId} onChange={e => setAddProductId(e.target.value)} style={{ minWidth: 200 }}>
                    <option value="">Add product...</option>
                    {getProducts().filter(p => p.active !== false).map(p => (
                      <option key={p.id} value={p.id}>{p.name} - {money(p.price)}/{p.billing}</option>
                    ))}
                  </Select>
                  <Button variant="ghost" size="sm" onClick={onAddProduct} disabled={!addProductId}>
                    <Icon name="plus" size={16} /> Add
                  </Button>
                </div>
              </div>

              {extras.lineItems.length === 0 ? (
                <EmptyState icon="📦" title="No line items yet" body="Add products above to build the deal value from real pricing." />
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ width: '100%', minWidth: 560 }}>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th style={{ textAlign: 'right' }}>Qty</th>
                        <th style={{ textAlign: 'right' }}>Unit</th>
                        <th style={{ textAlign: 'right' }}>Term</th>
                        <th style={{ textAlign: 'right' }}>Disc %</th>
                        <th style={{ textAlign: 'right' }}>Line total</th>
                        <th style={{ width: 40 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {extras.lineItems.map(li => (
                        <tr key={li.id}>
                          <td className="fw-6">{li.name}</td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="row" style={{ justifyContent: 'flex-end' }}>
                              <NumCell value={li.qty} min={1} width={64} onCommit={v => updateLineItem(deal.id, li.id, { qty: v })} />
                            </div>
                          </td>
                          <td className="tnum" style={{ textAlign: 'right' }}>{money(li.unitPrice)}</td>
                          <td className="tnum muted" style={{ textAlign: 'right' }}>{li.term === 12 ? '12 mo' : li.term === 1 ? 'One-time' : `${li.term} mo`}</td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="row" style={{ justifyContent: 'flex-end' }}>
                              <NumCell value={li.discount || 0} min={0} step={5} width={58} onCommit={v => updateLineItem(deal.id, li.id, { discount: v })} />
                            </div>
                          </td>
                          <td className="tnum fw-7" style={{ textAlign: 'right' }}>{money(lineItemTotal(li))}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button className="btn btn-quiet btn-sm" title="Remove" onClick={() => { removeLineItem(deal.id, li.id); toast('Line item removed', 'warn'); }} style={{ color: 'var(--n-400)', padding: '.2rem .35rem' }}>
                              <Icon name="trash" size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={5} className="fw-7" style={{ textAlign: 'right', paddingTop: '.85rem', borderTop: '2px solid var(--line-strong)' }}>Total ACV</td>
                        <td className="stat-value" style={{ fontSize: '1.15rem', textAlign: 'right', paddingTop: '.85rem', borderTop: '2px solid var(--line-strong)', color: 'var(--accent-600)' }}>{moneyK(acv)}</td>
                        <td style={{ borderTop: '2px solid var(--line-strong)' }}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </Card>

            {/* 2. BUYING COMMITTEE */}
            <Card>
              <div className="row between wrap gap-2" style={{ marginBottom: '.9rem' }}>
                <div className="row gap-2" style={{ alignItems: 'center' }}>
                  <Icon name="users" size={18} style={{ color: 'var(--accent-600)' }} />
                  <h4 style={{ margin: 0 }}>Buying committee</h4>
                  <Badge tone="default">{extras.stakeholders.length}</Badge>
                </div>
                <div className="row gap-1">
                  <Select value={addStakeId} onChange={e => setAddStakeId(e.target.value)} style={{ minWidth: 200 }} disabled={committeeAvailable.length === 0}>
                    <option value="">{committeeAvailable.length ? 'Add stakeholder...' : 'All contacts added'}</option>
                    {committeeAvailable.map(c => (
                      <option key={c.id} value={c.id}>{contactName(c)}{c.title ? ` - ${c.title}` : ''}</option>
                    ))}
                  </Select>
                  <Button variant="ghost" size="sm" onClick={onAddStake} disabled={!addStakeId}>
                    <Icon name="plus" size={16} /> Add
                  </Button>
                </div>
              </div>

              {extras.stakeholders.length === 0 ? (
                <EmptyState icon="👥" title="No stakeholders mapped" body="Map the champion, economic buyer, and blockers. Single-threaded deals are the top slip risk." />
              ) : (
                <div className="col gap-1">
                  {extras.stakeholders.map(s => {
                    const c = getContact(s.contactId);
                    if (!c) return null;
                    return (
                      <div key={s.contactId} className="row gap-2 wrap" style={{ alignItems: 'center', padding: '.6rem .7rem', borderRadius: 'var(--r-sm)', border: '1px solid var(--line)' }}>
                        <Link to={`/contacts/${c.id}`} className="row gap-2" style={{ minWidth: 0, flex: '1 1 190px' }}>
                          <Avatar name={contactName(c)} size={34} />
                          <div className="col" style={{ minWidth: 0, lineHeight: 1.25 }}>
                            <span className="fw-6 link clip">{contactName(c)}</span>
                            <span className="t-xs muted clip">{c.title || 'Contact'}</span>
                          </div>
                        </Link>
                        <Select value={s.role} onChange={e => setStakeholder(deal.id, s.contactId, e.target.value, s.influence)} style={{ flex: '0 1 170px', padding: '.4rem .6rem' }}>
                          {STAKEHOLDER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </Select>
                        <div className="row gap-1" style={{ flex: 'none', alignItems: 'center' }}>
                          <Badge tone={INFLUENCE_TONE[s.influence] || 'default'}>{s.influence} influence</Badge>
                          <Select value={s.influence} onChange={e => setStakeholder(deal.id, s.contactId, s.role, e.target.value)} style={{ width: 96, padding: '.4rem .5rem' }}>
                            {INFLUENCE.map(inf => <option key={inf} value={inf}>{inf}</option>)}
                          </Select>
                        </div>
                        <button className="btn btn-quiet btn-sm" title="Remove" onClick={() => { removeStakeholder(deal.id, s.contactId); toast('Removed from committee', 'warn'); }} style={{ color: 'var(--n-400)', padding: '.2rem .35rem', flex: 'none' }}>
                          <Icon name="x" size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* 3. COMPETITORS */}
            <Card>
              <div className="row gap-2" style={{ alignItems: 'center', marginBottom: '.9rem' }}>
                <Icon name="target" size={18} style={{ color: 'var(--accent-600)' }} />
                <h4 style={{ margin: 0 }}>Competitors</h4>
              </div>
              {extras.competitors.length === 0 ? (
                <div className="muted t-sm" style={{ marginBottom: '.85rem' }}>No competitors tracked on this deal.</div>
              ) : (
                <div className="row gap-1 wrap" style={{ marginBottom: '.95rem' }}>
                  {extras.competitors.map(name => (
                    <span key={name} className="row gap-1" style={{ alignItems: 'center', padding: '.35rem .35rem .35rem .7rem', borderRadius: 'var(--r-pill)', background: 'var(--n-100)', color: 'var(--ink-2)', fontWeight: 600, fontSize: '.86rem' }}>
                      {name}
                      <button className="row center" title={`Stop tracking ${name}`} onClick={() => { removeCompetitor(deal.id, name); }} style={{ width: 20, height: 20, borderRadius: 'var(--r-pill)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--n-600)' }}>
                        <Icon name="x" size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="row gap-1 wrap">
                <Select value={compChoice} onChange={e => { setCompChoice(e.target.value); setCompFree(''); }} style={{ flex: '1 1 180px' }}>
                  <option value="">Pick a competitor...</option>
                  {COMPETITOR_OPTIONS.filter(o => !extras.competitors.includes(o)).map(o => <option key={o} value={o}>{o}</option>)}
                </Select>
                <Input placeholder="or type another" value={compFree} onChange={e => { setCompFree(e.target.value); if (e.target.value) setCompChoice(''); }} onKeyDown={e => e.key === 'Enter' && onAddCompetitor()} style={{ flex: '1 1 160px' }} />
                <Button variant="ghost" size="sm" onClick={onAddCompetitor} disabled={!compChoice && !compFree.trim()}>
                  <Icon name="plus" size={16} /> Track
                </Button>
              </div>
            </Card>

            {/* 4. MUTUAL CLOSE PLAN */}
            <Card>
              <div className="row between wrap gap-2" style={{ marginBottom: '.9rem' }}>
                <div className="row gap-2" style={{ alignItems: 'center' }}>
                  <Icon name="checkSquare" size={18} style={{ color: 'var(--accent-600)' }} />
                  <h4 style={{ margin: 0 }}>Mutual close plan</h4>
                </div>
                <Button variant="ghost" size="sm" onClick={shareDealRoom}>
                  <Icon name="send" size={15} /> Share deal room
                </Button>
              </div>
              <div className="row gap-2" style={{ alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}><ProgressBar value={closePlanPct} /></div>
                <span className="fw-7 tnum t-sm" style={{ flex: 'none' }}>{closePlanDone}/{extras.closePlan.length}</span>
              </div>
              {extras.closePlan.length === 0 ? (
                <div className="muted t-sm">No close plan steps defined.</div>
              ) : (
                <div className="col gap-1">
                  {extras.closePlan.map((step, i) => (
                    <button
                      key={i}
                      onClick={() => toggleClosePlanStep(deal.id, i)}
                      className="row gap-2"
                      style={{ alignItems: 'center', padding: '.6rem .7rem', borderRadius: 'var(--r-sm)', border: '1px solid var(--line)', background: step.done ? 'var(--ok-bg)' : 'var(--paper)', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                    >
                      <span className="row center" style={{ width: 22, height: 22, flex: 'none', borderRadius: 6, border: `2px solid ${step.done ? 'var(--ok)' : 'var(--line-strong)'}`, background: step.done ? 'var(--ok)' : 'transparent', color: '#fff' }}>
                        {step.done && <Icon name="check" size={14} />}
                      </span>
                      <span className="fw-6" style={{ color: step.done ? 'var(--ok)' : 'var(--ink)', textDecoration: step.done ? 'line-through' : 'none' }}>{step.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </Card>

            {/* 5. NEXT STEP */}
            <Card style={{ borderColor: 'var(--accent-300)' }}>
              <div className="row gap-2" style={{ alignItems: 'center', marginBottom: '.9rem' }}>
                <Icon name="zap" size={18} style={{ color: 'var(--accent-600)' }} />
                <h4 style={{ margin: 0 }}>Next step</h4>
              </div>
              <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(150px, 1fr)' }}>
                <Field label="What happens next">
                  <Input
                    defaultValue={extras.nextStep || ''}
                    key={`ns-${extras.nextStep}`}
                    placeholder="e.g. Confirm budget with economic buyer"
                    onBlur={e => { const v = e.target.value.trim(); if (v !== (extras.nextStep || '')) patchMeta({ nextStep: v }); }}
                    onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                  />
                </Field>
                <Field label="Due">
                  <Input
                    type="date"
                    defaultValue={toInputDate(extras.nextStepDue)}
                    key={`nsd-${extras.nextStepDue}`}
                    onChange={e => patchMeta({ nextStepDue: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  />
                </Field>
              </div>
              {extras.nextStepDue && (
                <div className="t-xs muted" style={{ marginTop: '.5rem' }}>Due {relTime(extras.nextStepDue)} - {monthDay(extras.nextStepDue)}</div>
              )}
            </Card>

            {/* 6. AUDIT HISTORY */}
            <Card>
              <div className="row gap-2" style={{ alignItems: 'center', marginBottom: '.9rem' }}>
                <Icon name="clock" size={18} style={{ color: 'var(--accent-600)' }} />
                <h4 style={{ margin: 0 }}>Audit history</h4>
              </div>
              {(!extras.history || extras.history.length === 0) ? (
                <div className="muted t-sm">No changes recorded yet.</div>
              ) : (
                <div className="col" style={{ position: 'relative' }}>
                  {extras.history.map((h, i) => (
                    <div key={h.id || i} className="row gap-2" style={{ alignItems: 'flex-start', padding: '.55rem 0', borderBottom: i < extras.history.length - 1 ? '1px solid var(--line)' : 'none' }}>
                      <span className="row center" style={{ width: 26, height: 26, flex: 'none', borderRadius: 'var(--r-pill)', background: 'var(--accent-50)', color: 'var(--accent-600)' }}>
                        <Icon name="edit" size={13} />
                      </span>
                      <div className="col" style={{ flex: 1, minWidth: 0, lineHeight: 1.35 }}>
                        <span className="t-sm">
                          <span className="fw-6">{h.who || 'System'}</span>
                          {' '}changed <span className="fw-6">{h.field}</span>
                          {h.from ? <> from <span className="muted">{h.from}</span></> : null}
                          {h.to ? <> to <span className="fw-6">{h.to}</span></> : null}
                        </span>
                        <span className="t-xs muted">{relTime(h.at)} - {monthDay(h.at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* ================= RIGHT RAIL ================= */}
        <div className="col gap-2" style={{ flex: '1 1 340px', minWidth: 0, maxWidth: 400 }}>
          <div className="row between" style={{ alignItems: 'center' }}>
            <div className="eyebrow">Activity</div>
            <Button variant="ghost" size="sm" onClick={() => setEmailOpen(true)}>
              <Icon name="mail" size={15} /> Draft email
            </Button>
          </div>
          <ActivityTimeline relatedType="deal" relatedId={deal.id} companyId={deal.companyId} />
        </div>
      </div>

      {/* ---------- WIN / LOSS MODAL ---------- */}
      <Modal
        open={!!closeModal}
        onClose={() => setCloseModal(null)}
        title={closeModal === 'won' ? 'Mark deal as won' : 'Mark deal as lost'}
        width={480}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCloseModal(null)}>Cancel</Button>
            <Button variant={closeModal === 'won' ? 'primary' : 'danger'} onClick={confirmClose}>
              <Icon name={closeModal === 'won' ? 'check' : 'x'} size={16} />
              {closeModal === 'won' ? 'Confirm won' : 'Confirm lost'}
            </Button>
          </>
        }
      >
        <div className="col gap-3">
          <p className="t-sm muted" style={{ margin: 0 }}>
            {closeModal === 'won'
              ? 'Capture why you won so the win/loss report can learn from it.'
              : 'Capture why this slipped away. Honest loss reasons make the whole team sharper.'}
          </p>
          <Field label={closeModal === 'won' ? 'Win reason' : 'Loss reason'}>
            <Select value={closeReason} onChange={e => setCloseReason(e.target.value)}>
              <option value="">Select a reason...</option>
              {(closeModal === 'won' ? WIN_REASONS : LOSS_REASONS).map(r => <option key={r} value={r}>{r}</option>)}
            </Select>
          </Field>
          <Field label="Or add detail" hint="Free text overrides the picker above.">
            <Input value={closeReason} onChange={e => setCloseReason(e.target.value)} placeholder="Add context..." />
          </Field>
        </div>
      </Modal>

      {/* ---------- FOLLOW-UP EMAIL MODAL ---------- */}
      <Modal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        title="Draft follow-up email"
        width={640}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEmailOpen(false)}>Close</Button>
            <Button variant="primary" onClick={copyEmail}>
              <Icon name="copy" size={16} /> Copy
            </Button>
          </>
        }
      >
        <div className="col gap-3">
          <Field label="Subject">
            <Input readOnly value={email.subject} onFocus={e => e.target.select()} />
          </Field>
          <Field label="Body" hint="Generated from this deal, its primary stakeholder, and the account. Edit after copying into your mail client.">
            <Textarea readOnly value={email.body} rows={16} style={{ fontFamily: 'var(--font-body)', lineHeight: 1.55, resize: 'vertical' }} onFocus={e => e.target.select()} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
