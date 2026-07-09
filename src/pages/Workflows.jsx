// Workflows - a genuine WORKFLOW AUTOMATION ENGINE (Salesforce Flow, but
// alive). A library of automation rules, a VISUAL rule builder in a modal
// (trigger -> conditions -> action steps rendered as a connected vertical
// flow), and a REAL evaluator that runs each rule against the live store data
// and reports exactly which records it would affect. Definitions persist to
// localStorage via ../lib/workflows-data.js. Dark accent #5b4bf5, light
// content, a little hover delight. ASCII hyphen only, no long dashes.
import React, { useMemo, useState } from 'react';
import { userName, stageById, STAGES } from '../lib/store.js';
import {
  getWorkflows, getActionsThisMonth, useWorkflows,
  toggleWorkflow, saveWorkflow, deleteWorkflow, duplicateWorkflow, addTemplate, recordRun,
  evaluateRule, recordLabel, minutesPerRun,
  TRIGGERS, TRIGGER_LIST, FIELDS_BY_OBJECT, OPERATORS, ACTIONS, ACTION_LIST, TEMPLATES,
} from '../lib/workflows-data.js';
import {
  SectionHeader, StatCard, Badge, Button, Card, AnimatedNumber, useToast, relTime,
  Field, Input, Select, Textarea, Modal, EmptyState,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';

/* =========================================================================
   Toggle switch - track turns accent when on, knob slides across.
   ========================================================================= */
function Switch({ on, onChange, label, size = 'md' }) {
  const W = size === 'sm' ? 40 : 46;
  const K = size === 'sm' ? 16 : 20;
  const pad = 3;
  return (
    <button
      role="switch" aria-checked={on} aria-label={label}
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      style={{
        position: 'relative', width: W, height: K + pad * 2, flex: 'none', padding: 0,
        border: 'none', cursor: 'pointer', borderRadius: 999,
        background: on ? 'var(--accent)' : 'var(--n-400, #9aa3b2)',
        boxShadow: on ? '0 0 0 3px var(--accent-50)' : 'inset 0 0 0 1px var(--line)',
        transition: 'background .22s var(--ease), box-shadow .22s var(--ease)',
      }}
    >
      <span style={{
        position: 'absolute', top: pad, left: pad, width: K, height: K,
        borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(16,20,30,.35)',
        transform: on ? `translateX(${W - K - pad * 2}px)` : 'translateX(0)',
        transition: 'transform .22s var(--ease)',
      }} />
    </button>
  );
}

/* =========================================================================
   Tone map for node accents.
   ========================================================================= */
const TONE = {
  accent: { bg: 'var(--accent-50)', fg: 'var(--accent)', ring: 'rgba(91,75,245,.18)' },
  amber: { bg: 'var(--warn-bg)', fg: 'var(--warn)', ring: 'rgba(179,114,26,.18)' },
  ok: { bg: 'var(--ok-bg)', fg: 'var(--ok)', ring: 'rgba(26,127,82,.16)' },
  info: { bg: 'var(--info-bg)', fg: 'var(--info)', ring: 'rgba(37,99,168,.16)' },
};

function IconChip({ icon, tone = 'accent', size = 40 }) {
  const t = TONE[tone] || TONE.accent;
  return (
    <span className="row center" style={{
      width: size, height: size, flex: 'none', borderRadius: 'var(--r-md)',
      background: t.bg, color: t.fg, boxShadow: `inset 0 0 0 1px ${t.ring}`,
    }}>
      <Icon name={icon} size={Math.round(size * 0.5)} />
    </span>
  );
}

// Vertical connector line between flow nodes.
function Connector() {
  return (
    <div className="col center" style={{ height: 28 }}>
      <div style={{ width: 2, height: '100%', background: 'var(--line-strong)', borderRadius: 2 }} />
    </div>
  );
}

/* =========================================================================
   Human-readable summaries of a rule's parts.
   ========================================================================= */
function triggerSummary(rule) {
  const t = TRIGGERS[rule.trigger];
  if (!t) return 'Custom trigger';
  if (rule.trigger === 'deal_value_over') return `Deal created over ${money(rule.triggerConfig?.amount)}`;
  if (rule.trigger === 'deal_stage_changed' && rule.triggerConfig?.stage) {
    return `Deal moves to ${stageById(rule.triggerConfig.stage)?.name || rule.triggerConfig.stage}`;
  }
  return t.label;
}
function condSummary(rule) {
  const t = TRIGGERS[rule.trigger];
  const fields = FIELDS_BY_OBJECT[t?.object] || {};
  return (rule.conditions || []).map(c => {
    const f = fields[c.field];
    const op = OPERATORS[c.op];
    const val = f?.type === 'stage' ? (stageById(c.value)?.name || c.value)
      : f?.type === 'owner' ? userName(c.value) : c.value;
    return `${f?.label || c.field} ${op?.label || c.op}${c.op === 'set' ? '' : ' ' + val}`;
  });
}
function actionSummary(a) {
  const meta = ACTIONS[a.type];
  const cfg = a.config || {};
  if (a.type === 'create_task') return `Create task: "${cfg.subject || 'Follow up'}"${cfg.dueDays != null ? ` (due in ${cfg.dueDays}d)` : ''}`;
  if (a.type === 'send_email') return `Draft email${cfg.template ? `: "${cfg.template}"` : ''}`;
  if (a.type === 'move_stage') return `Move to ${stageById(cfg.to)?.name || cfg.to || 'next stage'}`;
  if (a.type === 'notify_owner') return `Notify ${cfg.who || 'the record owner'}`;
  if (a.type === 'add_tag') return `Add tag "${cfg.tag || 'tagged'}"`;
  if (a.type === 'create_activity') return `Log activity: "${cfg.subject || 'Note'}"`;
  return meta?.label || a.type;
}
function money(n) {
  if (n == null) return '$0';
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
  return '$' + n;
}

/* =========================================================================
   READ-ONLY FLOW - renders a rule as a connected vertical diagram.
   Used inside the detail view.
   ========================================================================= */
function FlowNode({ tone = 'accent', eyebrow, icon, title, sub, tag }) {
  const t = TONE[tone] || TONE.accent;
  return (
    <div style={{
      background: 'var(--paper)', border: '1px solid var(--line)', borderLeft: `3px solid ${t.fg}`,
      borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-sm)', padding: '.9rem 1rem', width: '100%',
    }}>
      <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
        <IconChip icon={icon} tone={tone} />
        <div className="col gap-1" style={{ minWidth: 0, flex: 1 }}>
          <div className="row between" style={{ gap: '.5rem' }}>
            <div className="t-xs fw-6" style={{ textTransform: 'uppercase', letterSpacing: '.08em', color: t.fg }}>{eyebrow}</div>
            {tag && <Badge tone={tone === 'amber' ? 'warn' : tone}>{tag}</Badge>}
          </div>
          <div className="fw-7" style={{ fontSize: '1.02rem', lineHeight: 1.25, color: 'var(--ink)' }}>{title}</div>
          {sub && <div className="t-sm muted">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

function RuleFlow({ rule }) {
  const t = TRIGGERS[rule.trigger];
  const conds = condSummary(rule);
  return (
    <div className="col center" style={{ maxWidth: 520, margin: '0 auto' }}>
      <FlowNode tone="accent" eyebrow="Trigger" icon={t?.icon || 'bolt'} title={triggerSummary(rule)} sub={t?.sub} tag="Start" />
      {conds.map((c, i) => (
        <React.Fragment key={`c${i}`}>
          <Connector />
          <FlowNode tone="amber" eyebrow={i === 0 ? 'Condition' : 'And'} icon="filter" title={c} tag="Filter" />
        </React.Fragment>
      ))}
      {(rule.actions || []).map((a, i) => (
        <React.Fragment key={`a${i}`}>
          <Connector />
          <FlowNode tone={ACTIONS[a.type]?.tone || 'ok'} eyebrow={`Action ${i + 1}`} icon={ACTIONS[a.type]?.icon || 'zap'}
            title={actionSummary(a)} tag={i === 0 ? 'Then' : undefined} />
        </React.Fragment>
      ))}
    </div>
  );
}

/* =========================================================================
   LEFT LIST ROW.
   ========================================================================= */
function WorkflowRow({ wf, selected, onSelect, onToggle }) {
  const est = useMemo(() => evaluateRule(wf), [wf]);
  return (
    <div
      role="button" tabIndex={0} onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
      className="col gap-2 wf-row"
      style={{
        cursor: 'pointer', width: '100%',
        background: selected ? 'var(--accent-50)' : 'var(--paper)',
        border: '1px solid', borderColor: selected ? 'var(--accent-300)' : 'var(--line)',
        borderRadius: 'var(--r-md)', padding: '.9rem 1rem',
        boxShadow: selected ? 'var(--shadow-sm)' : 'none',
        transition: 'all .16s var(--ease)', opacity: wf.active ? 1 : 0.82,
      }}
    >
      <div className="row between" style={{ alignItems: 'flex-start', gap: '.6rem', width: '100%' }}>
        <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
          <IconChip icon="bolt" tone={wf.active ? 'accent' : 'info'} size={34} />
          <div className="fw-7 clip" style={{ fontSize: '.98rem', color: 'var(--ink)' }}>{wf.name}</div>
        </div>
        <span onClick={(e) => e.stopPropagation()}><Switch on={wf.active} onChange={() => onToggle(wf)} label={`Toggle ${wf.name}`} size="sm" /></span>
      </div>
      <div className="row gap-1 wrap" style={{ alignItems: 'center' }}>
        <Badge tone="info">{triggerSummary(wf)}</Badge>
        {est.matched.length > 0 && <Badge tone="accent">{est.matched.length} match now</Badge>}
      </div>
      <div className="row between" style={{ width: '100%' }}>
        <div className="row gap-3">
          <span className="row gap-1 t-xs muted" style={{ alignItems: 'center' }}>
            <Icon name="zap" size={12} /> {(wf.actions || []).length} {(wf.actions || []).length === 1 ? 'action' : 'actions'}
          </span>
          <span className="t-xs muted"><AnimatedNumber value={wf.runs} /> runs</span>
        </div>
        <span className="row gap-1 t-xs muted" style={{ alignItems: 'center' }}>
          <Icon name="clock" size={12} /> {wf.lastRun ? relTime(wf.lastRun) : 'never'}
        </span>
      </div>
    </div>
  );
}

/* =========================================================================
   DETAIL VIEW - flow diagram + simulate + rule actions.
   ========================================================================= */
function Detail({ wf, onToggle, onEdit, onDuplicate, onDelete, onSimulate, sim }) {
  return (
    <Card pad={false} className="fade-up" style={{ overflow: 'hidden' }}>
      <div className="row between wrap" style={{ gap: '.75rem', padding: '1.05rem 1.25rem', borderBottom: '1px solid var(--line)', background: 'var(--n-50, #f7f8fb)' }}>
        <div className="col gap-1" style={{ minWidth: 0 }}>
          <div className="eyebrow">Automation</div>
          <h4 className="clip" style={{ margin: 0 }}>{wf.name}</h4>
          {wf.description && <div className="t-sm muted" style={{ maxWidth: 520 }}>{wf.description}</div>}
        </div>
        <div className="row gap-3" style={{ alignItems: 'center', flex: 'none' }}>
          <span className="t-sm muted">{wf.active ? 'Live' : 'Paused'}</span>
          <Switch on={wf.active} onChange={() => onToggle(wf)} label={`Toggle ${wf.name}`} />
        </div>
      </div>

      {/* Toolbar */}
      <div className="row gap-2 wrap" style={{ padding: '.85rem 1.25rem', borderBottom: '1px solid var(--line)' }}>
        <Button variant="accent" size="sm" onClick={onSimulate}><Icon name="zap" size={14} /> Run now / Simulate</Button>
        <Button variant="ghost" size="sm" onClick={onEdit}><Icon name="edit" size={14} /> Edit</Button>
        <Button variant="ghost" size="sm" onClick={onDuplicate}><Icon name="copy" size={14} /> Duplicate</Button>
        <Button variant="ghost" size="sm" onClick={onDelete} style={{ marginLeft: 'auto', color: 'var(--risk)' }}><Icon name="trash" size={14} /> Delete</Button>
      </div>

      {/* Simulate result panel */}
      {sim && sim.id === wf.id && (
        <div className="fade-up" style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line)', background: 'var(--accent-50)' }}>
          <div className="row between wrap" style={{ gap: '.5rem', alignItems: 'baseline' }}>
            <div className="fw-7" style={{ color: 'var(--accent-700, var(--accent))' }}>
              Simulated against live data: {sim.matched.length} of {sim.total} {sim.object}{sim.total === 1 ? '' : 's'} would run.
            </div>
            <span className="t-xs muted">{sim.matched.length} action set{sim.matched.length === 1 ? '' : 's'} fired</span>
          </div>
          {sim.matched.length > 0 ? (
            <div className="col gap-1" style={{ marginTop: '.6rem' }}>
              {sim.matched.slice(0, 6).map((r, i) => (
                <div key={i} className="row gap-2 t-sm" style={{ alignItems: 'center' }}>
                  <Icon name="check" size={13} style={{ color: 'var(--ok)' }} />
                  <span className="clip" style={{ color: 'var(--ink)' }}>{recordLabel(r, sim.object)}</span>
                </div>
              ))}
              {sim.matched.length > 6 && <div className="t-xs muted">and {sim.matched.length - 6} more</div>}
            </div>
          ) : (
            <div className="t-sm muted" style={{ marginTop: '.4rem' }}>No records match right now. The rule stays armed and will fire when one does.</div>
          )}
        </div>
      )}

      {/* Flow diagram */}
      <div style={{ padding: '1.4rem 1.25rem 1.6rem', overflowX: 'auto' }}>
        <RuleFlow rule={wf} />
        <div className="row center gap-2" style={{
          marginTop: '1.3rem', padding: '.7rem 1rem', borderRadius: 999, alignSelf: 'center', maxWidth: 520, margin: '1.3rem auto 0',
          background: wf.active ? 'var(--ok-bg)' : 'var(--n-100)',
          color: wf.active ? 'var(--ok)' : 'var(--n-600)', fontWeight: 700, fontSize: '.86rem',
        }}>
          <span className="dot" style={{ background: wf.active ? 'var(--ok)' : 'var(--n-400,#9aa3b2)' }} />
          {wf.active ? 'Automation is live' : 'Automation is paused'}
          <span className="muted" style={{ fontWeight: 600 }}>- saves ~{minutesPerRun(wf)} min per run</span>
        </div>
      </div>
    </Card>
  );
}

/* =========================================================================
   VISUAL RULE BUILDER (modal) - pick trigger, add conditions, add actions.
   Renders as an editable connected vertical flow.
   ========================================================================= */
const EMPTY_RULE = () => ({
  id: null, name: '', description: '',
  trigger: 'deal_stage_changed', triggerConfig: { stage: 'negotiation' },
  conditions: [], actions: [{ type: 'create_task', config: { subject: 'Follow up', dueDays: 1 } }],
  active: true,
});

function BuilderStep({ tone, eyebrow, icon, tag, children, onRemove }) {
  const t = TONE[tone] || TONE.accent;
  return (
    <div style={{
      background: 'var(--paper)', border: '1px solid var(--line)', borderLeft: `3px solid ${t.fg}`,
      borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-sm)', padding: '.9rem 1rem', width: '100%', position: 'relative',
    }}>
      <div className="row between" style={{ marginBottom: '.6rem' }}>
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <IconChip icon={icon} tone={tone} size={30} />
          <div className="t-xs fw-6" style={{ textTransform: 'uppercase', letterSpacing: '.08em', color: t.fg }}>{eyebrow}</div>
          {tag && <Badge tone={tone === 'amber' ? 'warn' : tone}>{tag}</Badge>}
        </div>
        {onRemove && (
          <button onClick={onRemove} aria-label="Remove step" className="btn btn-quiet" style={{ padding: '.2rem .4rem', color: 'var(--n-600)' }}>
            <Icon name="x" size={14} />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function RuleBuilder({ open, initial, onClose, onSave }) {
  const [rule, setRule] = useState(initial || EMPTY_RULE());
  // reset local draft whenever the modal opens with a new subject
  React.useEffect(() => { if (open) setRule(initial ? JSON.parse(JSON.stringify(initial)) : EMPTY_RULE()); }, [open, initial]);

  const trig = TRIGGERS[rule.trigger];
  const fields = FIELDS_BY_OBJECT[trig?.object] || {};
  const fieldKeys = Object.keys(fields);

  const set = (patch) => setRule(r => ({ ...r, ...patch }));
  const setCfg = (patch) => setRule(r => ({ ...r, triggerConfig: { ...r.triggerConfig, ...patch } }));

  const setTrigger = (id) => {
    const t = TRIGGERS[id];
    const cfg = id === 'deal_value_over' ? { amount: 100000 }
      : id === 'deal_stage_changed' ? { stage: 'negotiation' } : {};
    // drop conditions whose field no longer exists for the new object
    const nf = FIELDS_BY_OBJECT[t.object] || {};
    setRule(r => ({ ...r, trigger: id, triggerConfig: cfg, conditions: (r.conditions || []).filter(c => nf[c.field]) }));
  };

  const addCondition = () => {
    const fk = fieldKeys[0];
    const f = fields[fk];
    const op = Object.values(OPERATORS).find(o => o.types.includes(f.type))?.id || 'eq';
    setRule(r => ({ ...r, conditions: [...(r.conditions || []), { field: fk, op, value: f.type === 'number' ? 0 : '' }] }));
  };
  const setCondition = (i, patch) => setRule(r => ({ ...r, conditions: r.conditions.map((c, j) => j === i ? { ...c, ...patch } : c) }));
  const removeCondition = (i) => setRule(r => ({ ...r, conditions: r.conditions.filter((_, j) => j !== i) }));

  const addAction = () => setRule(r => ({ ...r, actions: [...(r.actions || []), { type: 'notify_owner', config: {} }] }));
  const setAction = (i, patch) => setRule(r => ({ ...r, actions: r.actions.map((a, j) => j === i ? { ...a, ...patch } : a) }));
  const removeAction = (i) => setRule(r => ({ ...r, actions: r.actions.filter((_, j) => j !== i) }));

  const canSave = rule.name.trim() && (rule.actions || []).length > 0;

  // live preview against real data
  const preview = useMemo(() => { try { return evaluateRule(rule); } catch { return null; } }, [rule]);

  return (
    <Modal open={open} onClose={onClose} width={720}
      title={initial?.id ? 'Edit automation' : 'Build an automation'}
      footer={
        <>
          {preview && <span className="t-sm muted" style={{ marginRight: 'auto' }}>
            Matches {preview.matched.length} of {preview.total} {preview.object}s right now
          </span>}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="accent" disabled={!canSave} onClick={() => onSave(rule)}><Icon name="check" size={15} /> Save automation</Button>
        </>
      }
    >
      <div className="col gap-3">
        <Field label="Automation name" hint="You will recognize this in the library.">
          <Input placeholder="e.g. Notify VP on deals over $100k" value={rule.name} onChange={(e) => set({ name: e.target.value })} autoFocus />
        </Field>
        <Field label="Description">
          <Textarea rows={2} placeholder="What does this automation do?" value={rule.description} onChange={(e) => set({ description: e.target.value })} />
        </Field>

        <div className="col center" style={{ marginTop: '.4rem' }}>
          {/* TRIGGER */}
          <BuilderStep tone="accent" eyebrow="Trigger" icon={trig?.icon || 'bolt'} tag="Start">
            <Field label="When this happens">
              <Select value={rule.trigger} onChange={(e) => setTrigger(e.target.value)}>
                {TRIGGER_LIST.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </Select>
            </Field>
            {rule.trigger === 'deal_stage_changed' && (
              <Field label="Target stage">
                <Select value={rule.triggerConfig.stage || ''} onChange={(e) => setCfg({ stage: e.target.value })}>
                  {STAGES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </Field>
            )}
            {rule.trigger === 'deal_value_over' && (
              <Field label="Value threshold ($)">
                <Input type="number" value={rule.triggerConfig.amount ?? 0} onChange={(e) => setCfg({ amount: Number(e.target.value) })} />
              </Field>
            )}
          </BuilderStep>

          {/* CONDITIONS */}
          {(rule.conditions || []).map((c, i) => {
            const f = fields[c.field] || fields[fieldKeys[0]];
            const ops = Object.values(OPERATORS).filter(o => o.types.includes(f?.type));
            return (
              <React.Fragment key={i}>
                <Connector />
                <BuilderStep tone="amber" eyebrow={i === 0 ? 'Condition' : 'And'} icon="filter" tag="Filter" onRemove={() => removeCondition(i)}>
                  <div className="row gap-2 wrap" style={{ alignItems: 'flex-end' }}>
                    <Field label="Field">
                      <Select value={c.field} onChange={(e) => { const nf = fields[e.target.value]; const nop = Object.values(OPERATORS).find(o => o.types.includes(nf.type))?.id || 'eq'; setCondition(i, { field: e.target.value, op: nop, value: nf.type === 'number' ? 0 : '' }); }}>
                        {fieldKeys.map(k => <option key={k} value={k}>{fields[k].label}</option>)}
                      </Select>
                    </Field>
                    <Field label="Operator">
                      <Select value={c.op} onChange={(e) => setCondition(i, { op: e.target.value })}>
                        {ops.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                      </Select>
                    </Field>
                    {c.op !== 'set' && (
                      <Field label="Value">
                        {f?.type === 'stage'
                          ? <Select value={c.value} onChange={(e) => setCondition(i, { value: e.target.value })}>{STAGES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
                          : <Input type={f?.type === 'number' ? 'number' : 'text'} value={c.value} onChange={(e) => setCondition(i, { value: f?.type === 'number' ? Number(e.target.value) : e.target.value })} />}
                      </Field>
                    )}
                  </div>
                </BuilderStep>
              </React.Fragment>
            );
          })}
          <Connector />
          <button onClick={addCondition} className="btn btn-quiet" style={{ border: '1px dashed var(--line-strong)', color: 'var(--n-600)', width: '100%' }}>
            <Icon name="plus" size={14} /> Add condition
          </button>

          {/* ACTIONS */}
          {(rule.actions || []).map((a, i) => {
            const meta = ACTIONS[a.type];
            return (
              <React.Fragment key={i}>
                <Connector />
                <BuilderStep tone={meta?.tone || 'ok'} eyebrow={`Action ${i + 1}`} icon={meta?.icon || 'zap'} tag={i === 0 ? 'Then' : undefined} onRemove={rule.actions.length > 1 ? () => removeAction(i) : undefined}>
                  <div className="row gap-2 wrap" style={{ alignItems: 'flex-end' }}>
                    <Field label="Do this">
                      <Select value={a.type} onChange={(e) => setAction(i, { type: e.target.value, config: {} })}>
                        {ACTION_LIST.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
                      </Select>
                    </Field>
                    {a.type === 'create_task' && (
                      <Field label="Task subject">
                        <Input value={a.config?.subject || ''} placeholder="Follow up" onChange={(e) => setAction(i, { config: { ...a.config, subject: e.target.value } })} />
                      </Field>
                    )}
                    {a.type === 'create_activity' && (
                      <Field label="Activity subject">
                        <Input value={a.config?.subject || ''} placeholder="Logged note" onChange={(e) => setAction(i, { config: { ...a.config, subject: e.target.value } })} />
                      </Field>
                    )}
                    {a.type === 'send_email' && (
                      <Field label="Email template">
                        <Input value={a.config?.template || ''} placeholder="Follow-up template" onChange={(e) => setAction(i, { config: { ...a.config, template: e.target.value } })} />
                      </Field>
                    )}
                    {a.type === 'move_stage' && (
                      <Field label="Move to stage">
                        <Select value={a.config?.to || 'qualified'} onChange={(e) => setAction(i, { config: { ...a.config, to: e.target.value } })}>
                          {STAGES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </Select>
                      </Field>
                    )}
                    {a.type === 'add_tag' && (
                      <Field label="Tag">
                        <Input value={a.config?.tag || ''} placeholder="inbound" onChange={(e) => setAction(i, { config: { ...a.config, tag: e.target.value } })} />
                      </Field>
                    )}
                  </div>
                </BuilderStep>
              </React.Fragment>
            );
          })}
          <Connector />
          <button onClick={addAction} className="btn btn-quiet" style={{ border: '1px dashed var(--line-strong)', color: 'var(--accent)', width: '100%' }}>
            <Icon name="plus" size={14} /> Add action step
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* =========================================================================
   TEMPLATE CARD.
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
      </div>
      <div>
        <Button variant="ghost" size="sm" onClick={onUse}><Icon name="plus" size={14} /> Use template</Button>
      </div>
    </Card>
  );
}

/* =========================================================================
   PAGE
   ========================================================================= */
export default function Workflows() {
  useWorkflows(); // reactive to workflow-store commits
  const toast = useToast();
  const workflows = getWorkflows();

  const sorted = useMemo(
    () => [...workflows].sort((a, b) => (b.active - a.active) || (b.runs - a.runs)),
    [workflows],
  );

  const [selectedId, setSelectedId] = useState(null);
  const selected = sorted.find(w => w.id === selectedId) || sorted[0] || null;

  const [builderOpen, setBuilderOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [sim, setSim] = useState(null);

  // KPIs - all live.
  const activeCount = workflows.filter(w => w.active).length;
  const actionsThisMonth = getActionsThisMonth();
  const timeSavedHrs = useMemo(
    () => Math.round(workflows.reduce((s, w) => s + w.runs * minutesPerRun(w), 0) / 60),
    [workflows],
  );

  const onToggle = (wf) => {
    toggleWorkflow(wf.id);
    toast(`${wf.name} ${wf.active ? 'paused' : 'activated'}`, wf.active ? 'warn' : 'ok');
  };

  const onSimulate = (wf) => {
    const res = evaluateRule(wf);
    setSim({ id: wf.id, ...res });
    if (res.matched.length > 0) recordRun(wf.id, res.matched.length);
    toast(
      res.matched.length > 0
        ? `Ran against live data: ${res.matched.length} ${res.object}${res.matched.length === 1 ? '' : 's'} affected`
        : `Evaluated ${res.total} ${res.object}s - none match right now`,
      res.matched.length > 0 ? 'ok' : 'warn',
    );
  };

  const openNew = () => { setEditing(null); setBuilderOpen(true); };
  const openEdit = (wf) => { setEditing(wf); setBuilderOpen(true); };

  const onSaveRule = (rule) => {
    const id = saveWorkflow(rule);
    setBuilderOpen(false);
    setSelectedId(rule.id || id);
    toast(rule.id ? 'Automation updated' : 'Automation created', 'ok');
  };

  const onDuplicate = (wf) => {
    const id = duplicateWorkflow(wf.id);
    if (id) { setSelectedId(id); toast('Automation duplicated (paused)', 'ok'); }
  };

  const onDelete = (wf) => {
    deleteWorkflow(wf.id);
    if (sim?.id === wf.id) setSim(null);
    setSelectedId(null);
    toast('Automation deleted', 'warn');
  };

  const onUseTemplate = (tpl) => {
    const id = addTemplate(tpl);
    setSelectedId(id);
    toast('Template added to your library', 'ok');
  };

  return (
    <div className="col gap-3 page-in">
      <SectionHeader
        title="Workflows"
        sub="An automation engine that runs your busywork against live pipeline data."
        action={<Button variant="accent" onClick={openNew}><Icon name="plus" size={16} /> New automation</Button>}
      />

      {/* KPI strip - all live */}
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
        <StatCard label="Active rules" value={activeCount} icon={<Icon name="bolt" size={18} />} accent="var(--ok)"
          sparkColor="var(--ok)" spark={[2, 3, 3, 4, 4, 5, activeCount]} sub={`of ${workflows.length} in library`} />
        <StatCard label="Actions this month" value={actionsThisMonth} icon={<Icon name="zap" size={18} />}
          spark={[420, 610, 780, 940, 1080, 1210, actionsThisMonth]} sub="records automated" />
        <StatCard label="Time saved" value={timeSavedHrs} format={(n) => `${Math.round(n)}h`} icon={<Icon name="clock" size={18} />} accent="var(--info)"
          sparkColor="var(--info)" spark={[8, 14, 20, 27, 33, 40, timeSavedHrs]} sub="est. from actions run" />
        <StatCard label="Automations" value={workflows.length} icon={<Icon name="workflow" size={18} />} sub="rules built" />
      </div>

      {/* MASTER-DETAIL */}
      <div className="wf-grid" style={{ display: 'grid', gap: '1.15rem', gridTemplateColumns: 'minmax(0, 340px) minmax(0, 1fr)', alignItems: 'start' }}>
        <div className="col gap-2 stagger">
          <div className="t-xs fw-6 muted" style={{ textTransform: 'uppercase', letterSpacing: '.08em', padding: '0 .15rem' }}>All automations</div>
          {sorted.length === 0 && (
            <Card><EmptyState icon="⚡" title="No automations yet" body="Build your first rule or add one from the templates below." action={<Button variant="accent" onClick={openNew}><Icon name="plus" size={16} /> New automation</Button>} /></Card>
          )}
          {sorted.map(wf => (
            <WorkflowRow key={wf.id} wf={wf} selected={selected?.id === wf.id}
              onSelect={() => setSelectedId(wf.id)} onToggle={onToggle} />
          ))}
        </div>

        <div>
          {selected
            ? <Detail wf={selected} sim={sim} onToggle={onToggle}
                onEdit={() => openEdit(selected)} onDuplicate={() => onDuplicate(selected)}
                onDelete={() => onDelete(selected)} onSimulate={() => onSimulate(selected)} />
            : <Card><EmptyState icon="⚡" title="Select an automation" body="Pick a rule on the left to see its visual flow, or build a new one." action={<Button variant="accent" onClick={openNew}><Icon name="plus" size={16} /> New automation</Button>} /></Card>}
        </div>
      </div>

      {/* TEMPLATE GALLERY */}
      <div className="col gap-3" style={{ marginTop: '.6rem' }}>
        <SectionHeader eyebrow="Get started faster" title="Automation templates" sub="One click to add a proven rule to your library." />
        <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))' }}>
          {TEMPLATES.map((tpl, i) => <TemplateCard key={i} tpl={tpl} onUse={() => onUseTemplate(tpl)} />)}
        </div>
      </div>

      {/* VISUAL RULE BUILDER */}
      <RuleBuilder open={builderOpen} initial={editing} onClose={() => setBuilderOpen(false)} onSave={onSaveRule} />

      <style>{`
        @media (max-width: 860px){ .wf-grid{ grid-template-columns: 1fr !important; } }
        .wf-row:hover{ border-color: var(--accent-300) !important; transform: translateY(-1px); }
      `}</style>
    </div>
  );
}
