// Sequences. Multi-step email/task cadences built to beat Outreach + Salesloft.
// A book-wide KPI row, a grid of premium sequence cards, and a full-screen
// detail/editor: a vertical timeline of steps (add/edit/reorder/delete), merge-
// tag templates with a live preview against a real contact, per-step open/reply
// analytics, and a contact-enrollment modal wired to the live store. Everything
// persists to localStorage via ../lib/sequences-data.js.
import React, { useMemo, useState } from 'react';
import {
  Button, Card, Badge, SectionHeader, ProgressBar, StatCard, useToast,
  Modal, Field, Input, Select, Textarea, EmptyState, Segmented, Avatar, relTime,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import {
  getContacts, getCompanies, contactName, getCurrentUser,
} from '../lib/store.js';
import {
  STEP_TYPES, stepMeta, useSequenceStore,
  getSequences, getSequence, enrollmentsForSequence, sequenceStats, fleetStats,
  createSequence, toggleSequence, deleteSequence,
  addStep, updateStep, deleteStep, moveStep,
  enrollContacts, unenroll, renderTemplate,
} from '../lib/sequences-data.js';

const TEAL = '#0ea5a3';

/* ---------- shared little bits ---------- */

function Switch({ on, onClick }) {
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={on}
      className="row"
      style={{
        width: 44, height: 24, borderRadius: 999, padding: 2, flex: 'none',
        background: on ? 'var(--accent)' : 'var(--n-200)', border: 'none',
        cursor: 'pointer', transition: 'background .2s var(--ease)', justifyContent: 'flex-start',
      }}
    >
      <span style={{
        width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: 'var(--shadow-sm)',
        transform: on ? 'translateX(20px)' : 'translateX(0)', transition: 'transform .2s var(--ease)',
      }} />
    </button>
  );
}

function StepGlyph({ type, size = 34 }) {
  const m = stepMeta(type);
  return (
    <span className="row center" style={{
      width: size, height: size, borderRadius: 9, flex: 'none',
      background: m.color + '1a', color: m.color,
    }}>
      <Icon name={m.icon} size={Math.round(size * 0.5)} />
    </span>
  );
}

const delayLabel = (d) => d === 0 ? 'Day 0 - immediately' : `Day ${d}`;
const companyName = (companyId, companies) => companies.find(c => c.id === companyId)?.name;

/* ============================================================
   LIST VIEW
   ============================================================ */

function SequenceCard({ seq, onOpen }) {
  const s = sequenceStats(seq);
  return (
    <Card hover style={{ display: 'flex', flexDirection: 'column', gap: '1rem', cursor: 'pointer' }} onClick={onOpen}>
      <div className="row between" style={{ alignItems: 'flex-start', gap: '.75rem' }}>
        <div className="col gap-1" style={{ minWidth: 0 }}>
          <h4 style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{seq.name}</h4>
          <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
            <Badge tone="accent">{seq.steps.length} steps</Badge>
            <Badge tone={seq.active ? 'ok' : 'default'}>{seq.active ? 'Active' : 'Paused'}</Badge>
          </div>
        </div>
        <Switch on={seq.active} onClick={(e) => { e.stopPropagation(); toggleSequence(seq.id); }} />
      </div>

      <p className="t-sm muted" style={{ margin: 0, minHeight: 40 }}>{seq.description}</p>

      <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
        {seq.steps.slice(0, 7).map((st, i) => (
          <span key={st.id} title={`${delayLabel(st.delay)} - ${stepMeta(st.type).label}`}><StepGlyph type={st.type} size={30} /></span>
        ))}
      </div>

      <div className="row between" style={{ gap: '.5rem' }}>
        <div className="col gap-1">
          <div className="stat-value" style={{ fontSize: 'clamp(1.7rem, 2.6vw, 2.2rem)' }}>{s.enrolled.toLocaleString()}</div>
          <div className="stat-label">Enrolled</div>
        </div>
        <div className="col gap-1" style={{ textAlign: 'right' }}>
          <div className="tnum fw-6" style={{ fontSize: '1.05rem' }}>{s.active} active</div>
          <div className="t-sm muted">{s.meetings} meetings booked</div>
        </div>
      </div>

      <div className="col gap-3">
        <div className="col gap-1">
          <div className="row between">
            <span className="t-sm fw-6" style={{ color: 'var(--n-600)' }}>Open rate</span>
            <span className="tnum fw-6 t-sm" style={{ color: 'var(--accent-600)' }}>{s.openRate}%</span>
          </div>
          <ProgressBar value={s.openRate} height={8} color="var(--accent)" />
        </div>
        <div className="col gap-1">
          <div className="row between">
            <span className="t-sm fw-6" style={{ color: 'var(--n-600)' }}>Reply rate</span>
            <span className="tnum fw-6 t-sm" style={{ color: TEAL }}>{s.replyRate}%</span>
          </div>
          <ProgressBar value={s.replyRate} height={8} color={TEAL} />
        </div>
      </div>
    </Card>
  );
}

function NewSequenceModal({ open, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const submit = () => {
    const seq = createSequence({ name, description });
    setName(''); setDescription('');
    onCreate(seq);
  };
  return (
    <Modal
      open={open} onClose={onClose} title="New sequence"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={submit} disabled={!name.trim()}>Create sequence</Button>
      </>}
    >
      <div className="col gap-3">
        <Field label="Sequence name">
          <Input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Q3 enterprise outbound" />
        </Field>
        <Field label="Description" hint="What is this cadence for? Who does it target?">
          <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Patient multi-touch cadence for named enterprise accounts." />
        </Field>
      </div>
    </Modal>
  );
}

/* ============================================================
   STEP EDITOR MODAL
   ============================================================ */

function StepEditorModal({ open, onClose, seqId, step, previewCtx }) {
  const isNew = !step;
  const [type, setType] = useState(step?.type || 'email');
  const [delay, setDelay] = useState(step?.delay ?? 2);
  const [subject, setSubject] = useState(step?.subject || '');
  const [body, setBody] = useState(step?.body || '');

  // Re-sync when a different step opens the modal.
  React.useEffect(() => {
    if (!open) return;
    setType(step?.type || 'email');
    setDelay(step?.delay ?? 2);
    setSubject(step?.subject || '');
    setBody(step?.body || '');
  }, [open, step?.id]);

  const isEmail = type === 'email';
  const submit = () => {
    if (isNew) addStep(seqId, { type, delay, subject, body });
    else updateStep(seqId, step.id, { type, delay, subject, body });
    onClose();
  };

  return (
    <Modal
      open={open} onClose={onClose} title={isNew ? 'Add step' : 'Edit step'} width={620}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={submit} disabled={!subject.trim()}>{isNew ? 'Add step' : 'Save step'}</Button>
      </>}
    >
      <div className="col gap-3">
        <div className="row gap-3" style={{ flexWrap: 'wrap' }}>
          <Field label="Step type">
            <Select value={type} onChange={e => setType(e.target.value)}>
              {Object.entries(STEP_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </Field>
          <Field label="Delay (days after enrollment)" hint="0 sends on day one.">
            <Input type="number" min={0} value={delay} onChange={e => setDelay(e.target.value)} style={{ width: 120 }} />
          </Field>
        </div>
        <Field label={isEmail ? 'Subject line' : 'Task title'}>
          <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder={isEmail ? 'A quick idea for {{company}}' : 'Call {{firstName}} - discovery'} />
        </Field>
        <Field label={isEmail ? 'Email body' : 'Task notes'} hint="Merge tags: {{firstName}} {{lastName}} {{company}} {{title}} {{senderName}}">
          <Textarea rows={7} value={body} onChange={e => setBody(e.target.value)} />
        </Field>

        <div className="card card-pad" style={{ background: 'var(--n-050, var(--n-100))' }}>
          <div className="stat-label" style={{ marginBottom: 6 }}>Live preview</div>
          {isEmail && subject && (
            <div className="fw-6" style={{ marginBottom: 6 }}>{renderTemplate(subject, previewCtx)}</div>
          )}
          <div className="t-sm" style={{ whiteSpace: 'pre-wrap', color: 'var(--n-700, var(--ink))' }}>
            {renderTemplate(body || subject, previewCtx) || 'Start typing to see the merged message.'}
          </div>
          <div className="t-xs muted" style={{ marginTop: 8 }}>
            Previewing for {previewCtx.contact ? contactName(previewCtx.contact) : 'a sample contact'}
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ============================================================
   ENROLL MODAL
   ============================================================ */

function EnrollModal({ open, onClose, seqId }) {
  const toast = useToast();
  const contacts = getContacts();
  const companies = getCompanies();
  const enrolledIds = useMemo(() => new Set(enrollmentsForSequence(seqId).map(e => e.contactId)), [seqId, open]);
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState(() => new Set());

  React.useEffect(() => { if (open) { setPicked(new Set()); setQ(''); } }, [open]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return contacts
      .filter(c => {
        if (!needle) return true;
        const co = companyName(c.companyId, companies) || '';
        return contactName(c).toLowerCase().includes(needle)
          || (c.email || '').toLowerCase().includes(needle)
          || co.toLowerCase().includes(needle);
      })
      .slice(0, 200);
  }, [q, contacts, companies]);

  const toggle = (id) => setPicked(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const submit = () => {
    const n = enrollContacts(seqId, [...picked]);
    toast(n ? `Enrolled ${n} contact${n === 1 ? '' : 's'}` : 'Those contacts are already enrolled', n ? 'ok' : 'warn');
    onClose();
  };

  return (
    <Modal
      open={open} onClose={onClose} title="Enroll contacts" width={640}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={submit} disabled={!picked.size}>
          Enroll {picked.size ? `${picked.size} contact${picked.size === 1 ? '' : 's'}` : ''}
        </Button>
      </>}
    >
      <div className="col gap-3">
        <Input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search contacts, company, or email" />
        <div style={{ maxHeight: 380, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)' }}>
          {rows.length === 0 && <div className="t-sm muted" style={{ padding: '1rem' }}>No contacts match that search.</div>}
          {rows.map(c => {
            const already = enrolledIds.has(c.id);
            const on = picked.has(c.id);
            const co = companyName(c.companyId, companies);
            return (
              <label
                key={c.id}
                className="row between"
                style={{
                  gap: '.75rem', padding: '.6rem .85rem', borderBottom: '1px solid var(--line)',
                  cursor: already ? 'default' : 'pointer', opacity: already ? 0.55 : 1,
                  background: on ? 'var(--accent)0d' : 'transparent',
                }}
              >
                <div className="row gap-2" style={{ minWidth: 0, alignItems: 'center' }}>
                  <input type="checkbox" checked={on || already} disabled={already} onChange={() => toggle(c.id)} style={{ width: 17, height: 17, accentColor: 'var(--accent)' }} />
                  <Avatar name={contactName(c)} size={32} />
                  <div className="col" style={{ minWidth: 0 }}>
                    <span className="fw-6" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contactName(c)}</span>
                    <span className="t-xs muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.title}{co ? ` - ${co}` : ''}
                    </span>
                  </div>
                </div>
                {already && <Badge tone="ok">Enrolled</Badge>}
              </label>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

/* ============================================================
   DETAIL / EDITOR VIEW
   ============================================================ */

function StepAnalyticsBar({ step }) {
  if (step.type !== 'email') return null;
  const openPct = step.sent ? Math.round((step.opened / step.sent) * 100) : 0;
  const replyPct = step.sent ? Math.round((step.replied / step.sent) * 100) : 0;
  return (
    <div className="row gap-3" style={{ flexWrap: 'wrap', marginTop: 8 }}>
      <div className="col gap-1" style={{ minWidth: 130, flex: 1 }}>
        <div className="row between t-xs">
          <span className="muted">Open</span><span className="tnum fw-6">{openPct}%</span>
        </div>
        <ProgressBar value={openPct} height={6} color="var(--accent)" />
      </div>
      <div className="col gap-1" style={{ minWidth: 130, flex: 1 }}>
        <div className="row between t-xs">
          <span className="muted">Reply</span><span className="tnum fw-6" style={{ color: TEAL }}>{replyPct}%</span>
        </div>
        <ProgressBar value={replyPct} height={6} color={TEAL} />
      </div>
    </div>
  );
}

function TimelineStep({ seqId, step, index, count, onEdit }) {
  const m = stepMeta(step.type);
  const last = index === count - 1;
  return (
    <div className="row" style={{ gap: '.9rem', alignItems: 'stretch' }}>
      {/* rail */}
      <div className="col center" style={{ flex: 'none', width: 34 }}>
        <StepGlyph type={step.type} />
        {!last && <div style={{ flex: 1, width: 2, background: 'var(--line)', marginTop: 4 }} />}
      </div>
      {/* card */}
      <Card className="card-pad" style={{ flex: 1, marginBottom: last ? 0 : '1rem' }}>
        <div className="row between" style={{ gap: '.5rem', alignItems: 'flex-start' }}>
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <div className="row gap-2" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
              <Badge tone="default">{delayLabel(step.delay)}</Badge>
              <Badge style={{ background: m.color + '1a', color: m.color }}>{m.label}</Badge>
            </div>
            <div className="fw-6" style={{ marginTop: 4 }}>{step.subject}</div>
            {step.body && <div className="t-sm muted" style={{ whiteSpace: 'pre-wrap', marginTop: 2, maxWidth: 620 }}>{step.body}</div>}
          </div>
          <div className="row gap-1" style={{ flex: 'none' }}>
            <Button variant="quiet" size="sm" aria-label="Move up" disabled={index === 0} onClick={() => moveStep(seqId, step.id, -1)}><Icon name="arrowUp" size={15} /></Button>
            <Button variant="quiet" size="sm" aria-label="Move down" disabled={last} onClick={() => moveStep(seqId, step.id, 1)}><Icon name="arrowDown" size={15} /></Button>
            <Button variant="quiet" size="sm" aria-label="Edit step" onClick={() => onEdit(step)}><Icon name="edit" size={15} /></Button>
            <Button variant="quiet" size="sm" aria-label="Delete step" onClick={() => deleteStep(seqId, step.id)}><Icon name="trash" size={15} /></Button>
          </div>
        </div>
        <StepAnalyticsBar step={step} />
      </Card>
    </div>
  );
}

function EnrollmentRow({ enr, seq }) {
  const contact = getContacts().find(c => c.id === enr.contactId);
  const companies = getCompanies();
  const co = contact ? companyName(contact.companyId, companies) : null;
  const pct = seq.steps.length ? Math.round((Math.min(enr.stepIndex, seq.steps.length) / seq.steps.length) * 100) : 0;
  const tone = enr.status === 'replied' ? 'ok' : enr.status === 'finished' ? 'accent' : 'info';
  return (
    <div className="row between" style={{ gap: '.75rem', padding: '.7rem 0', borderBottom: '1px solid var(--line)' }}>
      <div className="row gap-2" style={{ minWidth: 0, alignItems: 'center', flex: 1 }}>
        <Avatar name={contact ? contactName(contact) : '?'} size={34} />
        <div className="col" style={{ minWidth: 0 }}>
          <span className="fw-6" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact ? contactName(contact) : 'Unknown contact'}</span>
          <span className="t-xs muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{co || contact?.email} - enrolled {relTime(enr.enrolledAt)}</span>
        </div>
      </div>
      <div className="col gap-1" style={{ width: 150, flex: 'none' }}>
        <div className="row between t-xs">
          <span className="muted">Step {Math.min(enr.stepIndex + (enr.status === 'finished' ? 0 : 1), seq.steps.length)}/{seq.steps.length}</span>
          <Badge tone={tone}>{enr.status}</Badge>
        </div>
        <ProgressBar value={pct} height={6} color={enr.status === 'replied' ? TEAL : 'var(--accent)'} />
      </div>
      <Button variant="quiet" size="sm" aria-label="Remove from sequence" onClick={() => unenroll(enr.id)} style={{ flex: 'none' }}><Icon name="x" size={15} /></Button>
    </div>
  );
}

function SequenceDetail({ seq, onBack }) {
  const toast = useToast();
  const [tab, setTab] = useState('steps');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingStep, setEditingStep] = useState(null);
  const [enrollOpen, setEnrollOpen] = useState(false);

  const s = sequenceStats(seq);
  const enrollments = enrollmentsForSequence(seq.id);

  // Preview context uses a real enrolled contact when possible.
  const previewCtx = useMemo(() => {
    const contacts = getContacts();
    const companies = getCompanies();
    const first = enrollments[0] && contacts.find(c => c.id === enrollments[0].contactId);
    const contact = first || contacts[0];
    return {
      contact,
      companyName: contact ? companyName(contact.companyId, companies) : undefined,
      senderName: getCurrentUser()?.name,
    };
  }, [seq.id, enrollments.length]);

  const openNewStep = () => { setEditingStep(null); setEditorOpen(true); };
  const openEditStep = (step) => { setEditingStep(step); setEditorOpen(true); };

  const remove = () => {
    if (!window.confirm(`Delete "${seq.name}" and its ${enrollments.length} enrollments?`)) return;
    deleteSequence(seq.id);
    toast('Sequence deleted', 'warn');
    onBack();
  };

  return (
    <div className="fade-up">
      <div className="row gap-2" style={{ marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <Button variant="ghost" size="sm" onClick={onBack}><Icon name="chevronRight" size={15} style={{ transform: 'rotate(180deg)' }} /> All sequences</Button>
      </div>

      <SectionHeader
        eyebrow={seq.active ? 'Active cadence' : 'Paused cadence'}
        title={seq.name}
        sub={seq.description}
        action={<>
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <span className="t-sm muted">{seq.active ? 'Active' : 'Paused'}</span>
            <Switch on={seq.active} onClick={() => toggleSequence(seq.id)} />
          </div>
          <Button variant="ghost" size="sm" onClick={remove}><Icon name="trash" size={15} /> Delete</Button>
          <Button variant="primary" size="sm" onClick={() => setEnrollOpen(true)}><Icon name="plus" size={15} /> Enroll contacts</Button>
        </>}
      />

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', margin: '1rem 0 1.25rem' }}>
        <StatCard label="Enrolled" value={s.enrolled} icon={<Icon name="users" size={18} />} />
        <StatCard label="Active" value={s.active} icon={<Icon name="bolt" size={18} />} accent="#e0752d" />
        <StatCard label="Reply rate" value={s.replyRate} format={(n) => `${Math.round(n)}%`} icon={<Icon name="mail" size={18} />} accent={TEAL} />
        <StatCard label="Meetings booked" value={s.meetings} icon={<Icon name="target" size={18} />} />
      </div>

      <Segmented
        options={[{ value: 'steps', label: `Steps (${seq.steps.length})` }, { value: 'people', label: `Enrolled (${enrollments.length})` }]}
        value={tab} onChange={setTab}
      />

      <div style={{ marginTop: '1.15rem' }}>
        {tab === 'steps' ? (
          <div>
            {seq.steps.length === 0 ? (
              <Card><EmptyState icon="⚡" title="No steps yet" body="Add the first touch to bring this cadence to life." action={<Button variant="primary" onClick={openNewStep}><Icon name="plus" size={15} /> Add step</Button>} /></Card>
            ) : (
              <div className="col">
                {seq.steps.map((st, i) => (
                  <TimelineStep key={st.id} seqId={seq.id} step={st} index={i} count={seq.steps.length} onEdit={openEditStep} />
                ))}
                <div className="row" style={{ gap: '.9rem', marginTop: '.25rem' }}>
                  <div style={{ width: 34, flex: 'none' }} />
                  <Button variant="ghost" onClick={openNewStep} style={{ flex: 1, borderStyle: 'dashed' }}><Icon name="plus" size={16} /> Add step</Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Card>
            {enrollments.length === 0 ? (
              <EmptyState icon="✨" title="No one enrolled yet" body="Pick real contacts from your book and drop them into this cadence." action={<Button variant="primary" onClick={() => setEnrollOpen(true)}><Icon name="plus" size={15} /> Enroll contacts</Button>} />
            ) : (
              <div className="col">
                {enrollments.map(e => <EnrollmentRow key={e.id} enr={e} seq={seq} />)}
              </div>
            )}
          </Card>
        )}
      </div>

      <StepEditorModal open={editorOpen} onClose={() => setEditorOpen(false)} seqId={seq.id} step={editingStep} previewCtx={previewCtx} />
      <EnrollModal open={enrollOpen} onClose={() => setEnrollOpen(false)} seqId={seq.id} />
    </div>
  );
}

/* ============================================================
   ROOT
   ============================================================ */

export default function Sequences() {
  useSequenceStore();               // subscribe: re-render on any mutation
  const [openId, setOpenId] = useState(null);
  const [newOpen, setNewOpen] = useState(false);

  const sequences = getSequences();
  const fleet = fleetStats();
  const current = openId ? getSequence(openId) : null;

  if (current) {
    return <SequenceDetail seq={current} onBack={() => setOpenId(null)} />;
  }

  return (
    <div className="fade-up">
      <SectionHeader
        title="Sequences"
        sub="Multi-step cadences that follow up for you, automatically."
        action={
          <Button variant="primary" size="sm" onClick={() => setNewOpen(true)}>
            <Icon name="plus" size={16} /> New sequence
          </Button>
        }
      />

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', margin: '0 0 1.25rem' }}>
        <StatCard label="Active enrollments" value={fleet.activeEnroll} trend={14} icon={<Icon name="users" size={18} />} />
        <StatCard label="Reply rate" value={fleet.replyRate} format={(n) => `${n.toFixed(1)}%`} trend={6} icon={<Icon name="mail" size={18} />} accent={TEAL} sparkColor={TEAL} />
        <StatCard label="Meetings booked" value={fleet.meetings} trend={9} icon={<Icon name="target" size={18} />} />
        <StatCard label="Emails sent" value={fleet.emailsSent} trend={11} icon={<Icon name="send" size={18} />} accent="#e0752d" />
      </div>

      {sequences.length === 0 ? (
        <Card>
          <EmptyState icon="🚀" title="No sequences yet" body="Build your first cadence to put follow-up on autopilot." action={<Button variant="primary" onClick={() => setNewOpen(true)}><Icon name="plus" size={16} /> New sequence</Button>} />
        </Card>
      ) : (
        <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))' }}>
          {sequences.map(seq => <SequenceCard key={seq.id} seq={seq} onOpen={() => setOpenId(seq.id)} />)}
        </div>
      )}

      <NewSequenceModal open={newOpen} onClose={() => setNewOpen(false)} onCreate={(seq) => { setNewOpen(false); setOpenId(seq.id); }} />
    </div>
  );
}
