// Workflows - THE automation builder, built on the single automation engine
// (src/lib/automation-engine.js). Left: your automation library with live
// toggles. Center: an inline builder - trigger picker plus a reorderable step
// list (add / move / branch / wait / configure). Right: the observable
// enrollment log - every entity's path through the steps - plus a live step
// feed. A Simulate bar dispatches the real 'rally:form-submit',
// 'rally:email-open', and 'rally:payment' events so you can drive an automation
// end to end in the browser. Accent #5b4bf5. ASCII hyphen only, no long dashes.
import React, { useMemo, useRef, useState } from 'react';
import { STAGES, stageById } from '../lib/store.js';
import {
  useEngine, useEnrollments, useEngineLog, clearEngineLog,
  getAutomations, engineStats,
  saveAutomation, deleteAutomation, duplicateAutomation, toggleAutomation, addTemplate,
  newAutomationDraft, testAutomation, resumeEnrollment, useEngineRuntime,
  getEnrollmentsFor,
  TRIGGERS, TRIGGER_LIST, STEP_TYPES, STEP_LIST, OPERATORS,
  BRANCH_FIELDS, BRANCH_FIELD_LIST, ENGINE_TEMPLATES,
  triggerSummary, entityLabel, minutesPerRun,
} from '../lib/automation-engine.js';
import {
  SectionHeader, StatCard, Badge, Button, Card, useToast, relTime, timeStr,
  Field, Input, Select, Textarea, EmptyState,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';

const TONE = {
  accent: { bg: 'var(--accent-50)', fg: 'var(--accent)' },
  amber: { bg: 'var(--warn-bg)', fg: 'var(--warn)' },
  ok: { bg: 'var(--ok-bg)', fg: 'var(--ok)' },
  info: { bg: 'var(--info-bg)', fg: 'var(--info)' },
};
const STATUS_TONE = { active: 'accent', waiting: 'warn', completed: 'ok', failed: 'risk' };

function IconChip({ icon, tone = 'accent', size = 36 }) {
  const t = TONE[tone] || TONE.accent;
  return (
    <span className="row center" style={{ width: size, height: size, flex: 'none', borderRadius: 'var(--r-md)', background: t.bg, color: t.fg }}>
      <Icon name={icon} size={Math.round(size * 0.5)} />
    </span>
  );
}

function Switch({ on, onChange, label }) {
  const W = 44, K = 18, pad = 3;
  return (
    <button role="switch" aria-checked={on} aria-label={label}
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      style={{
        position: 'relative', width: W, height: K + pad * 2, flex: 'none', padding: 0, border: 'none', cursor: 'pointer',
        borderRadius: 999, background: on ? 'var(--accent)' : 'var(--n-400, #9aa3b2)',
        boxShadow: on ? '0 0 0 3px var(--accent-50)' : 'inset 0 0 0 1px var(--line)', transition: 'background .2s var(--ease)',
      }}>
      <span style={{ position: 'absolute', top: pad, left: pad, width: K, height: K, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(16,20,30,.35)', transform: on ? `translateX(${W - K - pad * 2}px)` : 'translateX(0)', transition: 'transform .2s var(--ease)' }} />
    </button>
  );
}

/* =========================================================================
   LEFT LIST
   ========================================================================= */
function AutoRow({ a, selected, onSelect, onToggle }) {
  const enr = getEnrollmentsFor(a.id);
  const live = enr.filter(e => e.status === 'active' || e.status === 'waiting').length;
  return (
    <div role="button" tabIndex={0} onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
      className="col gap-2 wf-row"
      style={{
        cursor: 'pointer', width: '100%', background: selected ? 'var(--accent-50)' : 'var(--paper)',
        border: '1px solid', borderColor: selected ? 'var(--accent-300)' : 'var(--line)', borderRadius: 'var(--r-md)',
        padding: '.8rem .9rem', boxShadow: selected ? 'var(--shadow-sm)' : 'none', transition: 'all .16s var(--ease)', opacity: a.active ? 1 : 0.82,
      }}>
      <div className="row between" style={{ alignItems: 'flex-start', gap: '.6rem' }}>
        <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
          <IconChip icon={TRIGGERS[a.trigger?.type]?.icon || 'bolt'} tone={a.active ? 'accent' : 'info'} size={30} />
          <div className="fw-7 clip" style={{ fontSize: '.94rem', color: 'var(--ink)' }}>{a.name || 'Untitled automation'}</div>
        </div>
        <span onClick={(e) => e.stopPropagation()}><Switch on={a.active} onChange={() => onToggle(a)} label={`Toggle ${a.name}`} /></span>
      </div>
      <div className="row gap-1 wrap" style={{ alignItems: 'center' }}>
        <Badge tone="info">{triggerSummary(a)}</Badge>
        <span className="row gap-1 t-xs muted" style={{ alignItems: 'center' }}><Icon name="workflow" size={12} /> {(a.steps || []).length} steps</span>
        {live > 0 && <Badge tone="warn">{live} in progress</Badge>}
      </div>
    </div>
  );
}

/* =========================================================================
   STEP CONFIG FIELDS
   ========================================================================= */
function StepConfig({ step, onChange }) {
  const cfg = step.config || {};
  const set = (patch) => onChange({ ...cfg, ...patch });
  switch (step.type) {
    case 'create_contact':
      return <div className="t-sm muted">Creates a real contact from the enrolled lead, or matches an existing one by email.</div>;
    case 'send_email':
      return (
        <div className="col gap-2">
          <Field label="Subject"><Input value={cfg.subject || ''} placeholder="A quick note from our team" onChange={(e) => set({ subject: e.target.value })} /></Field>
          <Field label="Body" hint="Tokens: {firstName} {lastName} {email}"><Textarea rows={3} value={cfg.body || ''} placeholder="Hi {firstName}," onChange={(e) => set({ body: e.target.value })} /></Field>
        </div>
      );
    case 'create_task':
      return (
        <div className="row gap-2 wrap" style={{ alignItems: 'flex-end' }}>
          <Field label="Subject"><Input value={cfg.subject || ''} placeholder="Follow up" onChange={(e) => set({ subject: e.target.value })} /></Field>
          <Field label="Due in (days)"><Input type="number" value={cfg.dueDays ?? 1} onChange={(e) => set({ dueDays: Number(e.target.value) })} /></Field>
        </div>
      );
    case 'create_activity':
      return (
        <div className="row gap-2 wrap" style={{ alignItems: 'flex-end' }}>
          <Field label="Type"><Select value={cfg.activityType || 'note'} onChange={(e) => set({ activityType: e.target.value })}>{['note', 'call', 'email', 'meeting', 'task'].map(t => <option key={t} value={t}>{t}</option>)}</Select></Field>
          <Field label="Subject"><Input value={cfg.subject || ''} placeholder="Automation note" onChange={(e) => set({ subject: e.target.value })} /></Field>
        </div>
      );
    case 'update_record':
      return (
        <div className="row gap-2 wrap" style={{ alignItems: 'flex-end' }}>
          <Field label="Field"><Select value={cfg.field || 'probability'} onChange={(e) => set({ field: e.target.value, value: '' })}>
            <option value="stage">Deal stage</option>
            <option value="probability">Probability</option>
            <option value="value">Deal value</option>
            <option value="title">Contact title</option>
          </Select></Field>
          <Field label="Value">
            {cfg.field === 'stage'
              ? <Select value={cfg.value || 'qualified'} onChange={(e) => set({ value: e.target.value })}>{STAGES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
              : <Input type={cfg.field === 'probability' || cfg.field === 'value' ? 'number' : 'text'} value={cfg.value ?? ''} onChange={(e) => set({ value: e.target.value })} />}
          </Field>
        </div>
      );
    case 'webhook':
      return (
        <div className="col gap-2">
          <Field label="Webhook URL" hint="Zapier, Make, or any https endpoint. The record is POSTed as JSON."><Input value={cfg.url || ''} placeholder="https://hooks.zapier.com/..." onChange={(e) => set({ url: e.target.value })} /></Field>
          <Field label="Message (optional)"><Input value={cfg.message || ''} placeholder="New enrollment" onChange={(e) => set({ message: e.target.value })} /></Field>
        </div>
      );
    case 'ai_step':
      return <Field label="Instruction for Rook"><Textarea rows={3} value={cfg.instruction || ''} placeholder="Draft the next best message for this record." onChange={(e) => set({ instruction: e.target.value })} /></Field>;
    case 'wait':
      return (
        <div className="row gap-2 wrap" style={{ alignItems: 'flex-end' }}>
          <Field label="Wait"><Input type="number" value={cfg.amount ?? 1} onChange={(e) => set({ amount: Number(e.target.value) })} /></Field>
          <Field label="Unit"><Select value={cfg.unit || 'days'} onChange={(e) => set({ unit: e.target.value })}>{['seconds', 'minutes', 'hours', 'days'].map(u => <option key={u} value={u}>{u}</option>)}</Select></Field>
        </div>
      );
    case 'branch': {
      const fmeta = BRANCH_FIELDS[cfg.field || 'email_opened'];
      const op = cfg.op || 'is_true';
      const unary = OPERATORS[op]?.unary;
      const ops = fmeta?.type === 'bool' ? ['is_true', 'is_false', 'is_set'] : fmeta?.type === 'number' ? ['gt', 'lt', 'eq', 'neq', 'is_set'] : ['eq', 'neq', 'is_set'];
      return (
        <div className="row gap-2 wrap" style={{ alignItems: 'flex-end' }}>
          <Field label="If"><Select value={cfg.field || 'email_opened'} onChange={(e) => set({ field: e.target.value, op: 'is_true', value: '' })}>{BRANCH_FIELD_LIST.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}</Select></Field>
          <Field label="Condition"><Select value={op} onChange={(e) => set({ op: e.target.value })}>{ops.map(o => <option key={o} value={o}>{OPERATORS[o].label}</option>)}</Select></Field>
          {!unary && (
            <Field label="Value">
              {fmeta?.type === 'stage'
                ? <Select value={cfg.value || 'won'} onChange={(e) => set({ value: e.target.value })}>{STAGES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
                : <Input type={fmeta?.type === 'number' ? 'number' : 'text'} value={cfg.value ?? ''} onChange={(e) => set({ value: e.target.value })} />}
            </Field>
          )}
          <div className="t-xs muted" style={{ flexBasis: '100%' }}>On yes the enrollment continues. On no it exits and completes.</div>
        </div>
      );
    }
    case 'goal':
      return <Field label="Goal label"><Input value={cfg.label || ''} placeholder="Onboarding launched" onChange={(e) => set({ label: e.target.value })} /></Field>;
    default:
      return null;
  }
}

/* Add-step menu */
const ADD_ORDER = ['send_email', 'create_task', 'create_activity', 'create_contact', 'update_record', 'wait', 'branch', 'ai_step', 'webhook', 'goal'];
function AddStep({ onAdd }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} className="btn btn-quiet" style={{ border: '1px dashed var(--line-strong)', color: 'var(--accent)', width: '100%' }}>
        <Icon name="plus" size={14} /> Add step
      </button>
      {open && (
        <div className="card" style={{ position: 'absolute', zIndex: 20, top: '110%', left: 0, right: 0, padding: '.4rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.3rem', boxShadow: 'var(--shadow-lg)' }}>
          {ADD_ORDER.map(t => {
            const m = STEP_TYPES[t];
            return (
              <button key={t} onClick={() => { onAdd(t); setOpen(false); }} className="row gap-2 wf-add"
                style={{ textAlign: 'left', cursor: 'pointer', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '.45rem .5rem' }}>
                <IconChip icon={m.icon} tone={m.tone} size={26} />
                <span className="fw-6 clip" style={{ fontSize: '.84rem' }}>{m.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   BUILDER (center pane) - inline, saves through the engine.
   ========================================================================= */
function TriggerConfig({ trigger, onChange }) {
  const cfg = trigger.config || {};
  const set = (patch) => onChange({ ...trigger, config: { ...cfg, ...patch } });
  return (
    <div className="col gap-2">
      <Field label="When this happens">
        <Select value={trigger.type} onChange={(e) => onChange({ type: e.target.value, config: { ...(TRIGGERS[e.target.value]?.config || {}) } })}>
          {TRIGGER_LIST.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
        </Select>
      </Field>
      {(trigger.type === 'record_created' || trigger.type === 'record_changed' || trigger.type === 'schedule') && (
        <Field label="Object"><Select value={cfg.object || 'deal'} onChange={(e) => set({ object: e.target.value })}>{['deal', 'contact', 'company'].map(o => <option key={o} value={o}>{o}</option>)}</Select></Field>
      )}
      {trigger.type === 'record_changed' && (cfg.object || 'deal') === 'deal' && (
        <Field label="Target stage (optional)"><Select value={cfg.stage || ''} onChange={(e) => set({ stage: e.target.value })}><option value="">Any stage</option>{STAGES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
      )}
      {trigger.type === 'form_submit' && (
        <Field label="Form name" hint="Use 'Any form' to match every submission."><Input value={cfg.formName || 'Any form'} onChange={(e) => set({ formName: e.target.value })} /></Field>
      )}
      {trigger.type === 'payment_received' && (
        <Field label="Minimum amount ($)"><Input type="number" value={cfg.minAmount ?? 0} onChange={(e) => set({ minAmount: Number(e.target.value) })} /></Field>
      )}
      {trigger.type === 'schedule' && (
        <Field label="Cron" hint="Runs via the server runner (api/automation-run)."><Input value={cfg.cron || '0 9 * * *'} onChange={(e) => set({ cron: e.target.value })} /></Field>
      )}
      {trigger.type === 'email_open' && <div className="t-sm muted">Listens for the rally:email-open event for any tracked recipient.</div>}
      {trigger.type === 'webhook' && <div className="t-sm muted">An external system POSTs to /api/automation-run to start this flow.</div>}
    </div>
  );
}

function Builder({ automation, onSaved, onDeleted, toast }) {
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(automation)));
  React.useEffect(() => { setDraft(JSON.parse(JSON.stringify(automation))); }, [automation.id]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(automation);
  const setStep = (i, config) => setDraft(d => ({ ...d, steps: d.steps.map((s, j) => j === i ? { ...s, config } : s) }));
  const setStepType = (i, type) => setDraft(d => ({ ...d, steps: d.steps.map((s, j) => j === i ? { ...s, type, config: {} } : s) }));
  const addStep = (type) => setDraft(d => ({ ...d, steps: [...d.steps, { id: `st_new_${Date.now().toString(36)}`, type, config: {} }] }));
  const removeStep = (i) => setDraft(d => ({ ...d, steps: d.steps.filter((_, j) => j !== i) }));
  const move = (i, dir) => setDraft(d => {
    const j = i + dir; if (j < 0 || j >= d.steps.length) return d;
    const steps = [...d.steps]; const [x] = steps.splice(i, 1); steps.splice(j, 0, x); return { ...d, steps };
  });

  const canSave = (draft.name || '').trim() && (draft.steps || []).length > 0;

  const save = () => {
    if (!canSave) { toast('Give the automation a name and at least one step', 'warn'); return null; }
    const id = saveAutomation(draft);
    onSaved(id);
    return id;
  };
  const runTest = () => {
    const id = save(); if (!id) return;
    const res = testAutomation(id);
    if (res.ok) toast(`Test enrolled ${entityLabel(res.enrollment?.entity)} - watch the enrollment log`, 'ok');
    else toast(res.note || 'Could not run a test', 'warn');
  };

  return (
    <Card pad={false} className="fade-up" style={{ overflow: 'hidden' }}>
      <div className="row between wrap" style={{ gap: '.75rem', padding: '1rem 1.15rem', borderBottom: '1px solid var(--line)', background: 'var(--n-50, #f7f8fb)' }}>
        <div className="col gap-1" style={{ minWidth: 0, flex: 1 }}>
          <div className="eyebrow">Automation builder</div>
          <Input value={draft.name} placeholder="Name this automation" onChange={(e) => setDraft(d => ({ ...d, name: e.target.value }))} style={{ fontWeight: 700, fontSize: '1.05rem' }} />
        </div>
        <div className="row gap-2" style={{ alignItems: 'center', flex: 'none' }}>
          <span className="t-sm muted">{draft.active ? 'Live' : 'Paused'}</span>
          <Switch on={draft.active} onChange={() => setDraft(d => ({ ...d, active: !d.active }))} label="Toggle live" />
        </div>
      </div>

      <div className="row gap-2 wrap" style={{ padding: '.8rem 1.15rem', borderBottom: '1px solid var(--line)' }}>
        <Button variant="accent" size="sm" disabled={!canSave} onClick={save}><Icon name="check" size={14} /> {dirty ? 'Save' : 'Saved'}</Button>
        <Button variant="ghost" size="sm" onClick={runTest}><Icon name="bolt" size={14} /> Run test</Button>
        <Button variant="ghost" size="sm" onClick={() => { const id = duplicateAutomation(draft.id); if (id) { onSaved(id); toast('Duplicated (paused)', 'ok'); } }}><Icon name="copy" size={14} /> Duplicate</Button>
        <Button variant="ghost" size="sm" onClick={() => { deleteAutomation(draft.id); onDeleted(); toast('Automation deleted', 'warn'); }} style={{ marginLeft: 'auto', color: 'var(--risk)' }}><Icon name="trash" size={14} /> Delete</Button>
      </div>

      <div className="col gap-3" style={{ padding: '1.1rem 1.15rem 1.4rem' }}>
        <Field label="Description"><Textarea rows={2} value={draft.description || ''} placeholder="What does this automation do?" onChange={(e) => setDraft(d => ({ ...d, description: e.target.value }))} /></Field>

        {/* TRIGGER */}
        <div className="wf-step" style={{ borderLeft: '3px solid var(--accent)' }}>
          <div className="row gap-2" style={{ alignItems: 'center', marginBottom: '.6rem' }}>
            <IconChip icon={TRIGGERS[draft.trigger.type]?.icon || 'bolt'} tone="accent" size={30} />
            <div className="t-xs fw-6" style={{ textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--accent)' }}>Trigger</div>
            <Badge tone="accent">Start</Badge>
          </div>
          <TriggerConfig trigger={draft.trigger} onChange={(trigger) => setDraft(d => ({ ...d, trigger }))} />
        </div>

        {/* STEPS */}
        {draft.steps.map((step, i) => {
          const m = STEP_TYPES[step.type] || {};
          return (
            <React.Fragment key={step.id || i}>
              <div className="wf-connector" aria-hidden="true" />
              <div className="wf-step" style={{ borderLeft: `3px solid ${(TONE[m.tone] || TONE.ok).fg}` }}>
                <div className="row between" style={{ marginBottom: '.6rem' }}>
                  <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
                    <IconChip icon={m.icon || 'zap'} tone={m.tone || 'ok'} size={30} />
                    <div className="t-xs fw-6" style={{ textTransform: 'uppercase', letterSpacing: '.08em', color: (TONE[m.tone] || TONE.ok).fg }}>Step {i + 1}</div>
                    {m.kind === 'control' && <Badge tone="warn">{step.type === 'branch' ? 'If' : step.type === 'wait' ? 'Wait' : 'Goal'}</Badge>}
                  </div>
                  <div className="row gap-1">
                    <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="btn btn-quiet" style={{ padding: '.2rem .35rem', opacity: i === 0 ? 0.4 : 1 }}><Icon name="arrowUp" size={14} /></button>
                    <button onClick={() => move(i, 1)} disabled={i === draft.steps.length - 1} aria-label="Move down" className="btn btn-quiet" style={{ padding: '.2rem .35rem', opacity: i === draft.steps.length - 1 ? 0.4 : 1 }}><Icon name="arrowDown" size={14} /></button>
                    <button onClick={() => removeStep(i)} aria-label="Remove step" className="btn btn-quiet" style={{ padding: '.2rem .35rem', color: 'var(--n-600)' }}><Icon name="x" size={14} /></button>
                  </div>
                </div>
                <Field label="Do this">
                  <Select value={step.type} onChange={(e) => setStepType(i, e.target.value)}>
                    {STEP_LIST.map(s => <option key={s.type} value={s.type}>{s.label}</option>)}
                  </Select>
                </Field>
                <div style={{ marginTop: '.5rem' }}><StepConfig step={step} onChange={(config) => setStep(i, config)} /></div>
              </div>
            </React.Fragment>
          );
        })}

        <div className="wf-connector" aria-hidden="true" />
        <AddStep onAdd={addStep} />

        <div className="row center gap-2" style={{ marginTop: '.4rem', padding: '.6rem 1rem', borderRadius: 999, background: draft.active ? 'var(--ok-bg)' : 'var(--n-100)', color: draft.active ? 'var(--ok)' : 'var(--n-600)', fontWeight: 700, fontSize: '.84rem' }}>
          <span className="dot" style={{ background: draft.active ? 'var(--ok)' : 'var(--n-400,#9aa3b2)' }} />
          {draft.active ? 'Live - enrolls on matching events' : 'Paused - toggle live to enroll'}
          <span className="muted" style={{ fontWeight: 600 }}>saves ~{minutesPerRun(draft)} min per run</span>
        </div>
      </div>
    </Card>
  );
}

/* =========================================================================
   ENROLLMENT LOG (right rail) - the observable path for each entity.
   ========================================================================= */
const HIST_TONE = { done: 'ok', waiting: 'warn', failed: 'risk', passed: 'ok', exited: 'info', event: 'accent' };
function EnrollmentCard({ en, onAdvance }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="col gap-1" style={{ padding: '.7rem .95rem', borderBottom: '1px solid var(--line)' }}>
      <div className="row between" style={{ gap: '.5rem' }}>
        <button onClick={() => setOpen(o => !o)} className="row gap-2" style={{ minWidth: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
          <Icon name={open ? 'chevronDown' : 'chevronRight'} size={14} style={{ color: 'var(--n-500)', flex: 'none' }} />
          <span className="fw-6 clip" style={{ fontSize: '.88rem', color: 'var(--ink)' }}>{entityLabel(en.entity)}</span>
        </button>
        <Badge tone={STATUS_TONE[en.status] || 'default'}>{en.status}</Badge>
      </div>
      <div className="row between" style={{ paddingLeft: '1.4rem' }}>
        <span className="t-xs muted">{en.history.length} steps | {relTime(en.updatedAt)}</span>
        {en.status === 'waiting' && <button onClick={() => onAdvance(en.id)} className="btn btn-quiet t-xs" style={{ color: 'var(--accent)', padding: '.15rem .45rem' }}><Icon name="play" size={11} /> Advance now</button>}
      </div>
      {open && (
        <div className="col gap-1" style={{ paddingLeft: '1.4rem', marginTop: '.35rem' }}>
          {en.history.map((h, i) => (
            <div key={i} className="row gap-2" style={{ alignItems: 'flex-start' }}>
              <span className="dot" style={{ marginTop: 6, flex: 'none', background: `var(--${HIST_TONE[h.status] === 'risk' ? 'risk' : HIST_TONE[h.status] === 'warn' ? 'warn' : HIST_TONE[h.status] === 'info' ? 'info' : HIST_TONE[h.status] === 'accent' ? 'accent' : 'ok'})` }} />
              <div style={{ minWidth: 0 }}>
                <div className="t-xs fw-6" style={{ color: 'var(--ink)' }}>{STEP_TYPES[h.type]?.label || h.type}</div>
                <div className="t-xs muted">{h.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RightRail({ automationId, enrollments, log, onAdvance, onClear }) {
  const mine = automationId ? enrollments.filter(e => e.automationId === automationId) : enrollments;
  return (
    <div className="col gap-3" style={{ position: 'sticky', top: '1rem' }}>
      <Card pad={false} style={{ overflow: 'hidden' }}>
        <div className="row between" style={{ padding: '.85rem 1.05rem', borderBottom: '1px solid var(--line)', background: 'var(--n-50, #f7f8fb)' }}>
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <span className="dot" style={{ background: 'var(--accent)', animation: 'pulseDot 1.6s infinite' }} />
            <div className="fw-7" style={{ fontSize: '.94rem' }}>Enrollment log</div>
          </div>
          <Badge tone="info">{mine.length}</Badge>
        </div>
        <div className="col" style={{ maxHeight: 420, overflowY: 'auto' }}>
          {mine.length === 0 ? (
            <div className="col center gap-1" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
              <Icon name="workflow" size={22} style={{ color: 'var(--n-400)' }} />
              <div className="t-sm muted">No enrollments yet. Hit <span className="fw-6" style={{ color: 'var(--ink)' }}>Run test</span> or use the Simulate bar to enroll a record.</div>
            </div>
          ) : mine.slice(0, 60).map(en => <EnrollmentCard key={en.id} en={en} onAdvance={onAdvance} />)}
        </div>
      </Card>

      <Card pad={false} style={{ overflow: 'hidden' }}>
        <div className="row between" style={{ padding: '.8rem 1.05rem', borderBottom: '1px solid var(--line)' }}>
          <div className="fw-7" style={{ fontSize: '.9rem' }}>Step feed</div>
          {log.length > 0 && <button onClick={onClear} className="btn btn-quiet t-xs" style={{ color: 'var(--n-600)', padding: '.2rem .5rem' }}>Clear</button>}
        </div>
        <div className="col" style={{ maxHeight: 260, overflowY: 'auto' }}>
          {log.length === 0 ? (
            <div className="t-sm muted" style={{ padding: '1.4rem 1rem', textAlign: 'center' }}>Every step an automation runs shows up here.</div>
          ) : log.slice(0, 50).map(e => (
            <div key={e.id} className="row between wf-logrow" style={{ padding: '.55rem 1.05rem', borderBottom: '1px solid var(--line)', gap: '.5rem' }}>
              <div className="row gap-2" style={{ minWidth: 0, alignItems: 'center' }}>
                <span className="dot" style={{ flex: 'none', background: e.status === 'failed' ? 'var(--risk)' : e.status === 'waiting' ? 'var(--warn)' : e.status === 'event' ? 'var(--accent)' : 'var(--ok)' }} />
                <span className="t-xs clip"><span className="fw-6" style={{ color: 'var(--ink)' }}>{STEP_TYPES[e.stepType]?.label || e.stepType}</span> <span className="muted">{e.detail}</span></span>
              </div>
              <span className="t-xs muted" style={{ flex: 'none' }}>{timeStr(e.at)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* =========================================================================
   SIMULATE BAR - dispatch the real window events to drive an automation.
   ========================================================================= */
function SimulateBar({ toast }) {
  const [email, setEmail] = useState('new.lead@example.com');
  const [name, setName] = useState('New Lead');
  const fire = (type, detail, label) => {
    window.dispatchEvent(new CustomEvent(type, { detail }));
    toast(label, 'ok');
  };
  const [firstName, ...rest] = name.trim().split(' ');
  return (
    <Card className="col gap-3">
      <div className="row between wrap" style={{ gap: '.5rem' }}>
        <div className="col gap-1" style={{ minWidth: 0 }}>
          <div className="fw-7" style={{ fontSize: '1rem' }}>Simulate an event</div>
          <div className="t-sm muted">Fire the real browser events an automation listens for, then watch the enrollment log build its path.</div>
        </div>
      </div>
      <div className="row gap-2 wrap" style={{ alignItems: 'flex-end' }}>
        <Field label="Lead name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Lead email"><Input value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Button variant="accent" size="sm" onClick={() => fire('rally:form-submit', { formName: 'Any form', email, name, firstName, lastName: rest.join(' ') }, 'Form submitted')}><Icon name="list" size={14} /> Form submit</Button>
        <Button variant="ghost" size="sm" onClick={() => fire('rally:email-open', { email }, 'Email opened')}><Icon name="mail" size={14} /> Email opened</Button>
        <Button variant="ghost" size="sm" onClick={() => fire('rally:payment', { email, amount: 2500 }, 'Payment received')}><Icon name="dollar" size={14} /> Payment</Button>
      </div>
    </Card>
  );
}

/* =========================================================================
   TEMPLATE GALLERY
   ========================================================================= */
function TemplateCard({ tpl, onUse }) {
  return (
    <Card hover className="col gap-3" style={{ height: '100%' }}>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <IconChip icon={tpl.icon} tone={tpl.tone} />
        <Badge tone={tpl.tone === 'amber' ? 'warn' : tpl.tone}>Template</Badge>
      </div>
      <div className="col gap-1" style={{ flex: 1 }}>
        <div className="fw-7" style={{ fontSize: '1rem', lineHeight: 1.3, color: 'var(--ink)' }}>{tpl.name}</div>
        <div className="t-sm muted">{tpl.description}</div>
        <div className="row gap-1 wrap" style={{ marginTop: '.35rem' }}>
          {(tpl.steps || []).slice(0, 5).map((s, i) => <Badge key={i} tone="default">{STEP_TYPES[s.type]?.label || s.type}</Badge>)}
        </div>
      </div>
      <div><Button variant="ghost" size="sm" onClick={onUse}><Icon name="plus" size={14} /> Use template</Button></div>
    </Card>
  );
}

/* =========================================================================
   PAGE
   ========================================================================= */
export default function Workflows() {
  useEngine();
  const enrollments = useEnrollments();
  const log = useEngineLog();
  const toast = useToast();
  const automations = getAutomations();

  const [selectedId, setSelectedId] = useState(null);
  const selected = automations.find(a => a.id === selectedId) || automations[0] || null;
  const pulseRef = useRef(null);

  // Mount the single client runtime: record watcher + window events + tick.
  useEngineRuntime((kind) => {
    if (kind === 'form') toast('A form submit enrolled a new lead', 'ok');
    else if (kind === 'email') toast('Email open advanced an enrollment', 'ok');
    else if (kind === 'payment') toast('A payment enrolled a record', 'ok');
    else if (kind === 'record') toast('A record change fired an automation', 'ok');
  });

  const stats = engineStats();
  const stepsExecuted = useMemo(() => log.filter(e => e.status === 'done' || e.status === 'passed').length, [log]);

  const onToggle = (a) => { toggleAutomation(a.id); toast(`${a.name} ${a.active ? 'paused' : 'activated'}`, a.active ? 'warn' : 'ok'); };
  const onNew = () => { const id = saveAutomation(newAutomationDraft()); setSelectedId(id); toast('New automation - configure and save', 'ok'); };
  const onUseTemplate = (tpl) => { const id = addTemplate(tpl); setSelectedId(id); toast('Template added to your library', 'ok'); };
  const onAdvance = (id) => { resumeEnrollment(id); toast('Enrollment advanced', 'ok'); };

  return (
    <div className="col gap-3 page-in">
      <SectionHeader
        title="Workflows"
        sub="One automation engine. Build a trigger and a step list, activate it, and watch real records enroll and move through every step."
        action={<Button variant="accent" onClick={onNew}><Icon name="plus" size={16} /> New automation</Button>}
      />

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
        <StatCard label="Active automations" value={stats.active} icon={<Icon name="bolt" size={18} />} accent="var(--ok)" sparkColor="var(--ok)" spark={[1, 2, 2, 3, 3, stats.active]} sub={`of ${stats.total} in library`} />
        <StatCard label="Active enrollments" value={stats.activeEnrollments} icon={<Icon name="workflow" size={18} />} spark={[0, 1, 1, 2, 3, stats.activeEnrollments]} sub="records mid-flow now" />
        <StatCard label="Steps executed" value={stepsExecuted} icon={<Icon name="activity" size={18} />} accent="var(--accent)" sparkColor="var(--accent)" spark={[0, 1, 3, 5, 8, stepsExecuted]} sub="this session" />
        <StatCard label="Completed" value={stats.completed} icon={<Icon name="check" size={18} />} accent="var(--info)" sparkColor="var(--info)" spark={[0, 1, 2, 3, 4, stats.completed]} sub="enrollments finished" />
      </div>

      <SimulateBar toast={toast} />

      <div className="wf-grid" style={{ display: 'grid', gap: '1.15rem', gridTemplateColumns: 'minmax(0,290px) minmax(0,1fr) minmax(0,330px)', alignItems: 'start' }}>
        <div className="col gap-2 stagger">
          <div className="t-xs fw-6 muted" style={{ textTransform: 'uppercase', letterSpacing: '.08em', padding: '0 .15rem' }}>Automations</div>
          {automations.length === 0 && (
            <Card><EmptyState icon="⚡" title="No automations yet" body="Build your first automation or start from a template below." action={<Button variant="accent" onClick={onNew}><Icon name="plus" size={16} /> New automation</Button>} /></Card>
          )}
          {automations.map(a => <AutoRow key={a.id} a={a} selected={selected?.id === a.id} onSelect={() => setSelectedId(a.id)} onToggle={onToggle} />)}
        </div>

        <div style={{ minWidth: 0 }} ref={pulseRef}>
          {selected
            ? <Builder key={selected.id} automation={selected} onSaved={(id) => setSelectedId(id)} onDeleted={() => setSelectedId(null)} toast={toast} />
            : <Card><EmptyState icon="⚡" title="Select an automation" body="Pick one on the left to edit its trigger and steps, or build a new one." action={<Button variant="accent" onClick={onNew}><Icon name="plus" size={16} /> New automation</Button>} /></Card>}
        </div>

        <div className="wf-rail" style={{ minWidth: 0 }}>
          <RightRail automationId={selected?.id} enrollments={enrollments} log={log} onAdvance={onAdvance} onClear={() => { clearEngineLog(); toast('Step feed cleared', 'warn'); }} />
        </div>
      </div>

      <div className="col gap-3" style={{ marginTop: '.6rem' }}>
        <SectionHeader eyebrow="Start faster" title="Automation templates" sub="One click drops a proven, runnable automation into your library." />
        <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))' }}>
          {ENGINE_TEMPLATES.map(tpl => <TemplateCard key={tpl.id} tpl={tpl} onUse={() => onUseTemplate(tpl)} />)}
        </div>
      </div>

      <style>{`
        @media (max-width: 1180px){ .wf-grid{ grid-template-columns: minmax(0,290px) minmax(0,1fr) !important; } .wf-rail{ grid-column: 1 / -1; } .wf-rail .card{ position: static !important; } }
        @media (max-width: 760px){ .wf-grid{ grid-template-columns: 1fr !important; } }
        .wf-row:hover{ border-color: var(--accent-300) !important; transform: translateY(-1px); }
        .wf-step{ background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-md); box-shadow: var(--shadow-sm); padding: .9rem 1rem; }
        .wf-connector{ width: 2px; height: 22px; margin: 0 auto; background: var(--line-strong); border-radius: 2px; }
        .wf-add:hover{ border-color: var(--accent-300) !important; }
        @keyframes wfRowIn{ from{ opacity: 0; transform: translateX(10px);} to{ opacity: 1; transform: none;} }
        .wf-logrow{ animation: wfRowIn .35s var(--ease) both; }
        @media (prefers-reduced-motion: reduce){ .wf-logrow{ animation: none !important; } }
      `}</style>
    </div>
  );
}
