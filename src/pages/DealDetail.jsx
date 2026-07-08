// Deal detail. Left: header, a clickable stage stepper, win/lose actions,
// an inline-editable facts card, related contacts, and a deterministic
// follow-up email drafter. Right rail: the activity timeline for this deal.
// Reads its id from useParams().id only; renders a clean Not found card if
// the deal is missing (data is synchronous, never a permanent spinner).
import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  useStore, getDeal, getCompany, getContact, getUser, getUsers,
  contactName, userName, moveDealStage, updateDeal, stageById,
  STAGES,
} from '../lib/store.js';
import {
  Button, Card, Badge, Avatar, Field, Input, Select, Textarea, Modal,
  moneyK, money, longDate, useToast,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import ActivityTimeline from '../components/ActivityTimeline.jsx';

const STAGE_COLOR = {
  lead: '#8b93a4', qualified: '#2563a8', discovery: '#5b4bf5',
  proposal: '#b3721a', negotiation: '#0ea5a3', won: '#1a7f52', lost: '#c0392b',
};

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

export default function DealDetail() {
  useStore();
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const [emailOpen, setEmailOpen] = useState(false);

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
  const contacts = (deal.contactIds || []).map(getContact).filter(Boolean);
  const primaryContact = contacts[0] || null;
  const email = buildFollowUp(deal, company, primaryContact, owner);

  const move = (stageId) => {
    const r = moveDealStage(deal.id, stageId);
    toast(r.error ? r.message : 'Deal moved to ' + stageById(stageId).name, r.error ? 'risk' : 'ok');
  };

  const patch = (p) => {
    const r = updateDeal(deal.id, p);
    if (r.error) toast(r.message, 'risk');
  };

  const copyEmail = async () => {
    const text = `Subject: ${email.subject}\n\n${email.body}`;
    try {
      await navigator.clipboard.writeText(text);
      toast('Email copied to clipboard');
    } catch {
      toast('Copy failed - select the text manually', 'warn');
    }
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
        {/* MAIN COLUMN */}
        <div className="col gap-3" style={{ flex: '1 1 560px', minWidth: 0 }}>
          {/* Header */}
          <Card>
            <div className="row between wrap gap-3" style={{ alignItems: 'flex-start' }}>
              <div className="col gap-1" style={{ minWidth: 0 }}>
                <div className="row gap-2 wrap" style={{ alignItems: 'center' }}>
                  <Badge>
                    <span className="dot" style={{ background: STAGE_COLOR[deal.stage] }} />
                    {currentStage?.name}
                  </Badge>
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
              </div>
              <div className="col" style={{ alignItems: 'flex-end', flex: 'none' }}>
                <div className="stat-value" style={{ fontSize: 'clamp(2rem, 3vw, 2.6rem)' }}>{moneyK(deal.value)}</div>
                <div className="stat-label">Deal value</div>
              </div>
            </div>

            <div className="row gap-3 wrap" style={{ marginTop: '1.1rem', paddingTop: '1.1rem', borderTop: '1px solid var(--line)' }}>
              <div className="row gap-2" style={{ minWidth: 0 }}>
                <Avatar name={userName(deal.ownerId)} size={34} />
                <div className="col" style={{ lineHeight: 1.2, minWidth: 0 }}>
                  <span className="fw-6 clip">{userName(deal.ownerId)}</span>
                  <span className="t-xs muted clip">{owner?.title || 'Owner'}</span>
                </div>
              </div>
              <div className="col" style={{ lineHeight: 1.2 }}>
                <span className="t-xs muted">Expected close</span>
                <span className="fw-6">{longDate(deal.closeDate)}</span>
              </div>
              <div className="col" style={{ lineHeight: 1.2 }}>
                <span className="t-xs muted">Win probability</span>
                <span className="fw-6 tnum">{deal.probability}%</span>
              </div>
            </div>
          </Card>

          {/* Stage stepper */}
          <Card>
            <div className="row between wrap gap-2" style={{ marginBottom: '1rem' }}>
              <h4 style={{ margin: 0 }}>Pipeline stage</h4>
              <div className="row gap-2">
                <Button variant="primary" size="sm" onClick={() => move('won')}>
                  <Icon name="check" size={16} /> Mark won
                </Button>
                <Button variant="danger" size="sm" onClick={() => move('lost')}>
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
                      transition: 'background .15s var(--ease), color .15s var(--ease), border-color .15s var(--ease)',
                    }}
                  >
                    {done && <Icon name="check" size={14} />}
                    <span className="clip">{stage.name}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Edit facts */}
          <Card>
            <h4 style={{ margin: '0 0 1rem' }}>Deal details</h4>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              <Field label="Value (USD)">
                <Input
                  type="number" min="0" step="1000"
                  defaultValue={deal.value}
                  key={`val-${deal.value}`}
                  onBlur={e => { const v = Number(e.target.value); if (v !== deal.value) patch({ value: v }); }}
                  onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                />
              </Field>
              <Field label="Expected close">
                <Input
                  type="date"
                  defaultValue={toInputDate(deal.closeDate)}
                  key={`close-${deal.closeDate}`}
                  onChange={e => { if (e.target.value) patch({ closeDate: new Date(e.target.value).toISOString() }); }}
                />
              </Field>
              <Field label="Owner">
                <Select value={deal.ownerId} onChange={e => patch({ ownerId: e.target.value })}>
                  {getUsers().map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </Select>
              </Field>
              <Field label="Probability">
                <div className="row gap-1" style={{ height: 42, alignItems: 'center' }}>
                  <span className="fw-7 tnum t-lg">{deal.probability}%</span>
                  <span className="t-xs muted">from {currentStage?.name}</span>
                </div>
              </Field>
            </div>
          </Card>

          {/* Related contacts */}
          <Card>
            <div className="row between" style={{ marginBottom: '.9rem' }}>
              <h4 style={{ margin: 0 }}>Contacts</h4>
              <Button variant="ghost" size="sm" onClick={() => setEmailOpen(true)}>
                <Icon name="mail" size={16} /> Draft follow-up email
              </Button>
            </div>
            {contacts.length === 0 ? (
              <div className="muted t-sm">No contacts linked to this deal yet.</div>
            ) : (
              <div className="col gap-1">
                {contacts.map(c => (
                  <Link
                    key={c.id}
                    to={`/contacts/${c.id}`}
                    className="row gap-2 card-hover"
                    style={{ padding: '.6rem .7rem', borderRadius: 'var(--r-sm)', border: '1px solid var(--line)', minWidth: 0 }}
                  >
                    <Avatar name={contactName(c)} size={34} />
                    <div className="col" style={{ minWidth: 0, lineHeight: 1.25 }}>
                      <span className="fw-6 clip">{contactName(c)}</span>
                      <span className="t-xs muted clip">{c.title || 'Contact'}</span>
                    </div>
                    <span className="spacer" />
                    <Icon name="chevronRight" size={16} style={{ color: 'var(--n-400)' }} />
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT RAIL */}
        <div className="col gap-2" style={{ flex: '1 1 340px', minWidth: 0, maxWidth: 400 }}>
          <div className="eyebrow">Activity</div>
          <ActivityTimeline relatedType="deal" relatedId={deal.id} companyId={deal.companyId} />
        </div>
      </div>

      {/* Follow-up email modal */}
      <Modal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        title="Draft follow-up email"
        width={640}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEmailOpen(false)}>Close</Button>
            <Button variant="primary" onClick={copyEmail}>
              <Icon name="check" size={16} /> Copy
            </Button>
          </>
        }
      >
        <div className="col gap-3">
          <Field label="Subject">
            <Input readOnly value={email.subject} onFocus={e => e.target.select()} />
          </Field>
          <Field label="Body" hint="Generated from this deal, its primary contact, and the account. Edit after copying into your mail client.">
            <Textarea readOnly value={email.body} rows={16} style={{ fontFamily: 'var(--font-body)', lineHeight: 1.55, resize: 'vertical' }} onFocus={e => e.target.select()} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
