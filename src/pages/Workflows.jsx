// Workflows - a REAL, executable automation engine with a stunning visual
// builder. Left: the automation library with animated live/paused toggles.
// Center: a node canvas (Trigger -> Conditions -> Actions) with ANIMATED
// connectors - a pulse travels the wire when the automation fires - plus a
// per-automation "Run test" that EXECUTES it live against real pipeline data
// (creates real projects / tasks / activities). Right: a live run-log feed
// that animates new entries in. Plus a template gallery and a count-up runs
// total that ticks the moment something fires. Accent #5b4bf5. ASCII hyphen
// only, no long dashes.
import React, { useMemo, useRef, useState } from 'react';
import { STAGES, stageById, userName } from '../lib/store.js';
import {
  getAutomations, useAutomations, useRunLog, clearRunLog,
  toggleAutomation, saveAutomation, deleteAutomation, duplicateAutomation, addTemplate,
  testAutomation, useAutomationWatcher, runsTotal,
  evaluateAutomation, triggerSummary, conditionSummaries, actionSummary, recordLabel, minutesPerRun,
  TRIGGERS, TRIGGER_LIST, FIELDS_BY_OBJECT, OPERATORS, ACTIONS, ACTION_LIST, TEMPLATES,
} from '../lib/automations.js';
import {
  SectionHeader, StatCard, Badge, Button, Card, AnimatedNumber, useToast, relTime, timeStr,
  Field, Input, Select, Textarea, Modal, EmptyState,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';

/* =========================================================================
   Animated toggle switch.
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

/* =========================================================================
   Animated connector wire. When `firing`, a pulse dot travels top->bottom.
   ========================================================================= */
function Wire({ firing, delay = 0 }) {
  return (
    <div className="au-wire" aria-hidden="true">
      <span className="au-wire-line" />
      {firing && <span className="au-pulse" style={{ animationDelay: `${delay}s` }} />}
    </div>
  );
}

/* A single flow node on the canvas. `lit` sequences a glow when firing. */
function FlowNode({ tone = 'accent', eyebrow, icon, title, sub, tag, litDelay, firing }) {
  const t = TONE[tone] || TONE.accent;
  return (
    <div className={`au-node${firing ? ' au-lit' : ''}`} style={{
      background: 'var(--paper)', border: '1px solid var(--line)', borderLeft: `3px solid ${t.fg}`,
      borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-sm)', padding: '.85rem 1rem', width: '100%',
      animationDelay: firing ? `${litDelay}s` : undefined,
    }}>
      <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
        <IconChip icon={icon} tone={tone} size={36} />
        <div className="col gap-1" style={{ minWidth: 0, flex: 1 }}>
          <div className="row between" style={{ gap: '.5rem' }}>
            <div className="t-xs fw-6" style={{ textTransform: 'uppercase', letterSpacing: '.08em', color: t.fg }}>{eyebrow}</div>
            {tag && <Badge tone={tone === 'amber' ? 'warn' : tone}>{tag}</Badge>}
          </div>
          <div className="fw-7" style={{ fontSize: '1rem', lineHeight: 1.25, color: 'var(--ink)' }}>{title}</div>
          {sub && <div className="t-sm muted clip">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

/* The connected flow: Trigger -> Conditions -> Actions, with wires between. */
function AutoFlow({ automation, firing }) {
  const a = automation;
  const t = TRIGGERS[a.trigger?.type];
  const conds = conditionSummaries(a);
  // stagger: each node lights a beat after the pulse reaches it
  let node = 0;
  const step = 0.18;
  return (
    <div className="col center au-flow" style={{ maxWidth: 460, margin: '0 auto', width: '100%' }}>
      <FlowNode tone="accent" eyebrow="Trigger" icon={t?.icon || 'bolt'} title={triggerSummary(a)} sub={t?.sub} tag="Start"
        firing={firing} litDelay={node++ * step} />
      {conds.map((c, i) => (
        <React.Fragment key={`c${i}`}>
          <Wire firing={firing} delay={(node - 1) * step} />
          <FlowNode tone="amber" eyebrow={i === 0 ? 'Condition' : 'And'} icon="filter" title={c} tag="Filter"
            firing={firing} litDelay={node++ * step} />
        </React.Fragment>
      ))}
      {(a.actions || []).map((act, i) => (
        <React.Fragment key={`a${i}`}>
          <Wire firing={firing} delay={(node - 1) * step} />
          <FlowNode tone={ACTIONS[act.type]?.tone || 'ok'} eyebrow={`Action ${i + 1}`} icon={ACTIONS[act.type]?.icon || 'zap'}
            title={actionSummary(act)} tag={i === 0 ? 'Then' : undefined}
            firing={firing} litDelay={node++ * step} />
        </React.Fragment>
      ))}
    </div>
  );
}

/* =========================================================================
   LEFT LIST ROW.
   ========================================================================= */
function AutoRow({ a, selected, onSelect, onToggle }) {
  const est = useMemo(() => evaluateAutomation(a), [a]);
  return (
    <div
      role="button" tabIndex={0} onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
      className="col gap-2 au-listrow"
      style={{
        cursor: 'pointer', width: '100%',
        background: selected ? 'var(--accent-50)' : 'var(--paper)',
        border: '1px solid', borderColor: selected ? 'var(--accent-300)' : 'var(--line)',
        borderRadius: 'var(--r-md)', padding: '.85rem .95rem',
        boxShadow: selected ? 'var(--shadow-sm)' : 'none',
        transition: 'all .16s var(--ease)', opacity: a.active ? 1 : 0.82,
      }}
    >
      <div className="row between" style={{ alignItems: 'flex-start', gap: '.6rem', width: '100%' }}>
        <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
          <IconChip icon="bolt" tone={a.active ? 'accent' : 'info'} size={32} />
          <div className="fw-7 clip" style={{ fontSize: '.96rem', color: 'var(--ink)' }}>{a.name}</div>
        </div>
        <span onClick={(e) => e.stopPropagation()}><Switch on={a.active} onChange={() => onToggle(a)} label={`Toggle ${a.name}`} size="sm" /></span>
      </div>
      <div className="row gap-1 wrap" style={{ alignItems: 'center' }}>
        <Badge tone="info">{triggerSummary(a)}</Badge>
        {est.matched.length > 0 && <Badge tone="accent">{est.matched.length} match now</Badge>}
      </div>
      <div className="row between" style={{ width: '100%' }}>
        <div className="row gap-3">
          <span className="row gap-1 t-xs muted" style={{ alignItems: 'center' }}>
            <Icon name="zap" size={12} /> {(a.actions || []).length} {(a.actions || []).length === 1 ? 'action' : 'actions'}
          </span>
          <span className="t-xs muted"><AnimatedNumber value={a.runs || 0} /> runs</span>
        </div>
        <span className="row gap-1 t-xs muted" style={{ alignItems: 'center' }}>
          <Icon name="clock" size={12} /> {a.lastRun ? relTime(a.lastRun) : 'never'}
        </span>
      </div>
    </div>
  );
}

/* =========================================================================
   DETAIL - flow canvas + Run test + live result.
   ========================================================================= */
function Detail({ a, firing, result, onToggle, onEdit, onDuplicate, onDelete, onTest }) {
  return (
    <Card pad={false} className="fade-up" style={{ overflow: 'hidden' }}>
      <div className="row between wrap" style={{ gap: '.75rem', padding: '1.05rem 1.25rem', borderBottom: '1px solid var(--line)', background: 'var(--n-50, #f7f8fb)' }}>
        <div className="col gap-1" style={{ minWidth: 0 }}>
          <div className="eyebrow">Automation</div>
          <h4 className="clip" style={{ margin: 0 }}>{a.name}</h4>
          {a.description && <div className="t-sm muted" style={{ maxWidth: 540 }}>{a.description}</div>}
        </div>
        <div className="row gap-3" style={{ alignItems: 'center', flex: 'none' }}>
          <span className="t-sm muted">{a.active ? 'Live' : 'Paused'}</span>
          <Switch on={a.active} onChange={() => onToggle(a)} label={`Toggle ${a.name}`} />
        </div>
      </div>

      {/* Toolbar */}
      <div className="row gap-2 wrap" style={{ padding: '.85rem 1.25rem', borderBottom: '1px solid var(--line)' }}>
        <Button variant="accent" size="sm" onClick={onTest}><Icon name="zap" size={14} /> Run test</Button>
        <Button variant="ghost" size="sm" onClick={onEdit}><Icon name="edit" size={14} /> Edit</Button>
        <Button variant="ghost" size="sm" onClick={onDuplicate}><Icon name="copy" size={14} /> Duplicate</Button>
        <Button variant="ghost" size="sm" onClick={onDelete} style={{ marginLeft: 'auto', color: 'var(--risk)' }}><Icon name="trash" size={14} /> Delete</Button>
      </div>

      {/* Test result - what the automation JUST did, for real */}
      {result && result.id === a.id && (
        <div className="fade-up" style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line)', background: 'var(--accent-50)' }}>
          {result.ok ? (
            <>
              <div className="row gap-2" style={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
                <div className="fw-7" style={{ color: 'var(--accent-700, var(--accent))' }}>
                  It just ran on {result.subjectLabel}
                </div>
                <span className="t-xs muted">{result.matchedNow ? 'live match' : 'nearest record'} - {result.actionsRun.length} action{result.actionsRun.length === 1 ? '' : 's'} executed</span>
              </div>
              <div className="col gap-1" style={{ marginTop: '.6rem' }}>
                {result.actionsRun.map((r, i) => (
                  <div key={i} className="row gap-2 t-sm au-logrow" style={{ alignItems: 'center', animationDelay: `${i * 0.08}s` }}>
                    <Icon name={r.ok ? 'check' : 'x'} size={14} style={{ color: r.ok ? 'var(--ok)' : 'var(--risk)', flex: 'none' }} />
                    <span style={{ color: 'var(--ink)' }}>{r.label}</span>
                    {r.stub && <Badge tone="info">stub</Badge>}
                  </div>
                ))}
              </div>
              <div className="t-xs muted" style={{ marginTop: '.5rem' }}>These are real records - open Projects or Activities to see them.</div>
            </>
          ) : (
            <div className="t-sm" style={{ color: 'var(--warn)' }}>{result.note || 'Nothing to run against right now.'}</div>
          )}
        </div>
      )}

      {/* Flow canvas */}
      <div style={{ padding: '1.5rem 1.25rem 1.7rem', overflowX: 'auto' }}>
        <AutoFlow automation={a} firing={firing} />
        <div className="row center gap-2" style={{
          marginTop: '1.4rem', padding: '.7rem 1rem', borderRadius: 999, maxWidth: 460, margin: '1.4rem auto 0',
          background: a.active ? 'var(--ok-bg)' : 'var(--n-100)',
          color: a.active ? 'var(--ok)' : 'var(--n-600)', fontWeight: 700, fontSize: '.86rem',
        }}>
          <span className="dot" style={{ background: a.active ? 'var(--ok)' : 'var(--n-400,#9aa3b2)' }} />
          {a.active ? 'Live - fires on matching events' : 'Paused'}
          <span className="muted" style={{ fontWeight: 600 }}>- saves ~{minutesPerRun(a)} min per run</span>
        </div>
      </div>
    </Card>
  );
}

/* =========================================================================
   LIVE RUN-LOG RAIL - global feed, newest first, entries animate in.
   ========================================================================= */
function RunLogRail({ log, onClear }) {
  return (
    <Card pad={false} style={{ overflow: 'hidden', position: 'sticky', top: '1rem' }}>
      <div className="row between" style={{ padding: '.9rem 1.1rem', borderBottom: '1px solid var(--line)', background: 'var(--n-50, #f7f8fb)' }}>
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <span className="dot" style={{ background: 'var(--ok)', animation: 'pulseDot 1.6s infinite' }} />
          <div className="fw-7" style={{ fontSize: '.95rem' }}>Live run log</div>
        </div>
        {log.length > 0 && <button onClick={onClear} className="btn btn-quiet t-xs" style={{ color: 'var(--n-600)', padding: '.2rem .5rem' }}>Clear</button>}
      </div>
      <div className="col" style={{ maxHeight: 520, overflowY: 'auto' }}>
        {log.length === 0 ? (
          <div className="col center gap-1" style={{ padding: '2.2rem 1rem', textAlign: 'center' }}>
            <Icon name="activity" size={22} style={{ color: 'var(--n-400)' }} />
            <div className="t-sm muted">No runs yet. Hit <span className="fw-6" style={{ color: 'var(--ink)' }}>Run test</span> on any automation and watch it fire.</div>
          </div>
        ) : log.slice(0, 40).map((e) => {
          const okCount = e.actionsRun.filter(r => r.ok).length;
          const tone = e.result === 'test' ? 'accent' : e.result === 'partial' ? 'warn' : 'ok';
          return (
            <div key={e.id} className="col gap-1 au-logrow" style={{ padding: '.7rem 1.1rem', borderBottom: '1px solid var(--line)' }}>
              <div className="row between" style={{ gap: '.5rem' }}>
                <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
                  <span className="dot" style={{ background: tone === 'accent' ? 'var(--accent)' : tone === 'warn' ? 'var(--warn)' : 'var(--ok)', flex: 'none' }} />
                  <span className="fw-6 clip" style={{ fontSize: '.88rem', color: 'var(--ink)' }}>{e.automationName}</span>
                </div>
                <span className="t-xs muted" style={{ flex: 'none' }}>{timeStr(e.at)}</span>
              </div>
              <div className="t-xs muted clip">on {e.subjectLabel} - {okCount}/{e.actionsRun.length} action{e.actionsRun.length === 1 ? '' : 's'} {e.result === 'test' ? '(test)' : ''}</div>
              <div className="row gap-1 wrap">
                {e.actionsRun.map((r, i) => (
                  <span key={i} className="row gap-1 t-xs" style={{ alignItems: 'center', color: r.ok ? 'var(--ok)' : 'var(--risk)' }}>
                    <Icon name={r.ok ? 'check' : 'x'} size={11} /> {ACTIONS[r.type]?.label || r.type}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
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
      <div><Button variant="ghost" size="sm" onClick={onUse}><Icon name="plus" size={14} /> Use template</Button></div>
    </Card>
  );
}

/* =========================================================================
   VISUAL RULE BUILDER (modal).
   ========================================================================= */
const EMPTY_RULE = () => ({
  id: null, name: '', description: '',
  trigger: { type: 'deal_stage_changed', config: { stage: 'negotiation' } },
  conditions: [],
  actions: [{ type: 'create_task', config: { subject: 'Follow up', dueDays: 1 } }],
  active: true,
});

function Connector() {
  return <div className="col center" style={{ height: 26 }}><div style={{ width: 2, height: '100%', background: 'var(--line-strong)', borderRadius: 2 }} /></div>;
}
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
          <button onClick={onRemove} aria-label="Remove step" className="btn btn-quiet" style={{ padding: '.2rem .4rem', color: 'var(--n-600)' }}><Icon name="x" size={14} /></button>
        )}
      </div>
      {children}
    </div>
  );
}

function RuleBuilder({ open, initial, onClose, onSave }) {
  const [rule, setRule] = useState(initial || EMPTY_RULE());
  React.useEffect(() => { if (open) setRule(initial ? JSON.parse(JSON.stringify(initial)) : EMPTY_RULE()); }, [open, initial]);

  const trig = TRIGGERS[rule.trigger?.type];
  const fields = FIELDS_BY_OBJECT[trig?.object] || {};
  const fieldKeys = Object.keys(fields);

  const set = (patch) => setRule(r => ({ ...r, ...patch }));
  const setCfg = (patch) => setRule(r => ({ ...r, trigger: { ...r.trigger, config: { ...r.trigger.config, ...patch } } }));

  const setTrigger = (type) => {
    const t = TRIGGERS[type];
    const config = type === 'deal_value_over' ? { amount: 100000 }
      : type === 'deal_stage_changed' ? { stage: 'negotiation' } : {};
    const nf = FIELDS_BY_OBJECT[t.object] || {};
    setRule(r => ({ ...r, trigger: { type, config }, conditions: (r.conditions || []).filter(c => nf[c.field]) }));
  };

  const addCondition = () => {
    const fk = fieldKeys[0]; const f = fields[fk];
    const op = Object.values(OPERATORS).find(o => o.types.includes(f.type))?.id || 'eq';
    setRule(r => ({ ...r, conditions: [...(r.conditions || []), { field: fk, op, value: f.type === 'number' ? 0 : '' }] }));
  };
  const setCondition = (i, patch) => setRule(r => ({ ...r, conditions: r.conditions.map((c, j) => j === i ? { ...c, ...patch } : c) }));
  const removeCondition = (i) => setRule(r => ({ ...r, conditions: r.conditions.filter((_, j) => j !== i) }));

  const addAction = () => setRule(r => ({ ...r, actions: [...(r.actions || []), { type: 'notify_owner', config: {} }] }));
  const setAction = (i, patch) => setRule(r => ({ ...r, actions: r.actions.map((a, j) => j === i ? { ...a, ...patch } : a) }));
  const removeAction = (i) => setRule(r => ({ ...r, actions: r.actions.filter((_, j) => j !== i) }));

  const canSave = rule.name.trim() && (rule.actions || []).length > 0;
  const preview = useMemo(() => { try { return evaluateAutomation(rule); } catch { return null; } }, [rule]);

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
          <Input placeholder="e.g. Won deal kicks off onboarding" value={rule.name} onChange={(e) => set({ name: e.target.value })} autoFocus />
        </Field>
        <Field label="Description">
          <Textarea rows={2} placeholder="What does this automation do?" value={rule.description} onChange={(e) => set({ description: e.target.value })} />
        </Field>

        <div className="col center" style={{ marginTop: '.4rem' }}>
          {/* TRIGGER */}
          <BuilderStep tone="accent" eyebrow="Trigger" icon={trig?.icon || 'bolt'} tag="Start">
            <Field label="When this happens">
              <Select value={rule.trigger.type} onChange={(e) => setTrigger(e.target.value)}>
                {TRIGGER_LIST.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
              </Select>
            </Field>
            {rule.trigger.type === 'deal_stage_changed' && (
              <Field label="Target stage">
                <Select value={rule.trigger.config.stage || ''} onChange={(e) => setCfg({ stage: e.target.value })}>
                  {STAGES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </Field>
            )}
            {rule.trigger.type === 'deal_value_over' && (
              <Field label="Value threshold ($)">
                <Input type="number" value={rule.trigger.config.amount ?? 0} onChange={(e) => setCfg({ amount: Number(e.target.value) })} />
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
                    {(a.type === 'create_task' || a.type === 'log_activity') && (
                      <Field label="Subject">
                        <Input value={a.config?.subject || ''} placeholder="Follow up" onChange={(e) => setAction(i, { config: { ...a.config, subject: e.target.value } })} />
                      </Field>
                    )}
                    {a.type === 'create_task' && (
                      <Field label="Due in (days)">
                        <Input type="number" value={a.config?.dueDays ?? 1} onChange={(e) => setAction(i, { config: { ...a.config, dueDays: Number(e.target.value) } })} />
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
                    {a.type === 'set_field' && (
                      <>
                        <Field label="Field">
                          <Select value={a.config?.field || 'probability'} onChange={(e) => setAction(i, { config: { ...a.config, field: e.target.value } })}>
                            <option value="probability">Probability</option>
                            <option value="value">Deal value</option>
                          </Select>
                        </Field>
                        <Field label="Value">
                          <Input type="number" value={a.config?.value ?? 0} onChange={(e) => setAction(i, { config: { ...a.config, value: Number(e.target.value) } })} />
                        </Field>
                      </>
                    )}
                    {a.type === 'notify_owner' && (
                      <Field label="Notify (optional)">
                        <Input value={a.config?.who || ''} placeholder="Deal owner" onChange={(e) => setAction(i, { config: { ...a.config, who: e.target.value } })} />
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
   PAGE
   ========================================================================= */
export default function Workflows() {
  useAutomations();
  const log = useRunLog();
  const toast = useToast();
  const automations = getAutomations();

  const sorted = useMemo(
    () => [...automations].sort((a, b) => (b.active - a.active) || ((b.runs || 0) - (a.runs || 0))),
    [automations],
  );

  const [selectedId, setSelectedId] = useState(null);
  const selected = sorted.find(a => a.id === selectedId) || sorted[0] || null;

  const [builderOpen, setBuilderOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [result, setResult] = useState(null);      // last test result panel
  const [firingId, setFiringId] = useState(null);   // which automation's flow is pulsing
  const fireTimer = useRef(null);

  // KPIs - all live.
  const activeCount = automations.filter(a => a.active).length;
  const totalRuns = runsTotal();
  const actionsExecuted = useMemo(() => log.reduce((s, e) => s + e.actionsRun.length, 0), [log]);
  const timeSavedHrs = useMemo(
    () => Math.round(automations.reduce((s, a) => s + (a.runs || 0) * minutesPerRun(a), 0) / 60),
    [automations],
  );

  const pulse = (id) => {
    setFiringId(id);
    clearTimeout(fireTimer.current);
    fireTimer.current = setTimeout(() => setFiringId(null), 1500);
  };

  // Live watcher: fires automations for real when deals change while mounted.
  useAutomationWatcher((fired) => {
    if (!fired.length) return;
    const f = fired[0];
    pulse(f.automation.id);
    toast(`${f.automation.name} fired on ${recordLabel(f.subject, TRIGGERS[f.automation.trigger.type]?.object || 'deal')}`, 'ok');
  });

  const onToggle = (a) => {
    toggleAutomation(a.id);
    toast(`${a.name} ${a.active ? 'paused' : 'activated'}`, a.active ? 'warn' : 'ok');
  };

  const onTest = (a) => {
    const res = testAutomation(a.id);
    setResult({ id: a.id, ...res });
    if (res.ok) {
      pulse(a.id);
      toast(`Ran on ${res.subjectLabel} - ${res.actionsRun.filter(r => r.ok).length} action${res.actionsRun.length === 1 ? '' : 's'} executed`, 'ok');
    } else {
      toast(res.note || 'Nothing to run against right now', 'warn');
    }
  };

  const openNew = () => { setEditing(null); setBuilderOpen(true); };
  const openEdit = (a) => { setEditing(a); setBuilderOpen(true); };

  const onSaveRule = (rule) => {
    const id = saveAutomation(rule);
    setBuilderOpen(false);
    setSelectedId(rule.id || id);
    toast(rule.id ? 'Automation updated' : 'Automation created', 'ok');
  };
  const onDuplicate = (a) => { const id = duplicateAutomation(a.id); if (id) { setSelectedId(id); toast('Automation duplicated (paused)', 'ok'); } };
  const onDelete = (a) => { deleteAutomation(a.id); if (result?.id === a.id) setResult(null); setSelectedId(null); toast('Automation deleted', 'warn'); };
  const onUseTemplate = (tpl) => { const id = addTemplate(tpl); setSelectedId(id); toast('Template added to your library', 'ok'); };

  return (
    <div className="col gap-3 page-in">
      <SectionHeader
        title="Workflows"
        sub="A real automation engine. Rules fire on live pipeline events and execute their actions for real."
        action={<Button variant="accent" onClick={openNew}><Icon name="plus" size={16} /> New automation</Button>}
      />

      {/* KPI strip - all live */}
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
        <StatCard label="Active automations" value={activeCount} icon={<Icon name="bolt" size={18} />} accent="var(--ok)"
          sparkColor="var(--ok)" spark={[2, 3, 3, 4, 4, 5, activeCount]} sub={`of ${automations.length} in library`} />
        <StatCard label="Total runs" value={totalRuns} icon={<Icon name="zap" size={18} />}
          spark={[220, 340, 460, 560, 640, 720, totalRuns]} sub="times rules have executed" />
        <StatCard label="Actions executed" value={actionsExecuted} icon={<Icon name="activity" size={18} />} accent="var(--accent)"
          sparkColor="var(--accent)" spark={[0, 1, 2, 3, 5, 8, actionsExecuted]} sub="real records this session" />
        <StatCard label="Time saved" value={timeSavedHrs} format={(n) => `${Math.round(n)}h`} icon={<Icon name="clock" size={18} />} accent="var(--info)"
          sparkColor="var(--info)" spark={[8, 14, 20, 27, 33, 40, timeSavedHrs]} sub="est. from actions run" />
      </div>

      {/* THREE-PANE: list | canvas | run log */}
      <div className="au-grid" style={{ display: 'grid', gap: '1.15rem', gridTemplateColumns: 'minmax(0,300px) minmax(0,1fr) minmax(0,320px)', alignItems: 'start' }}>
        {/* LIST */}
        <div className="col gap-2 stagger">
          <div className="t-xs fw-6 muted" style={{ textTransform: 'uppercase', letterSpacing: '.08em', padding: '0 .15rem' }}>All automations</div>
          {sorted.length === 0 && (
            <Card><EmptyState icon="⚡" title="No automations yet" body="Build your first rule or add one from the templates below." action={<Button variant="accent" onClick={openNew}><Icon name="plus" size={16} /> New automation</Button>} /></Card>
          )}
          {sorted.map(a => (
            <AutoRow key={a.id} a={a} selected={selected?.id === a.id} onSelect={() => setSelectedId(a.id)} onToggle={onToggle} />
          ))}
        </div>

        {/* CANVAS */}
        <div style={{ minWidth: 0 }}>
          {selected
            ? <Detail a={selected} firing={firingId === selected.id} result={result}
                onToggle={onToggle} onEdit={() => openEdit(selected)} onDuplicate={() => onDuplicate(selected)}
                onDelete={() => onDelete(selected)} onTest={() => onTest(selected)} />
            : <Card><EmptyState icon="⚡" title="Select an automation" body="Pick a rule on the left to see its visual flow, or build a new one." action={<Button variant="accent" onClick={openNew}><Icon name="plus" size={16} /> New automation</Button>} /></Card>}
        </div>

        {/* RUN LOG */}
        <div className="au-rail" style={{ minWidth: 0 }}>
          <RunLogRail log={log} onClear={() => { clearRunLog(); toast('Run log cleared', 'warn'); }} />
        </div>
      </div>

      {/* TEMPLATE GALLERY */}
      <div className="col gap-3" style={{ marginTop: '.6rem' }}>
        <SectionHeader eyebrow="Get started faster" title="Automation templates" sub="One click to add a proven, executable rule to your library." />
        <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))' }}>
          {TEMPLATES.map((tpl, i) => <TemplateCard key={i} tpl={tpl} onUse={() => onUseTemplate(tpl)} />)}
        </div>
      </div>

      <RuleBuilder open={builderOpen} initial={editing} onClose={() => setBuilderOpen(false)} onSave={onSaveRule} />

      <style>{`
        @media (max-width: 1180px){ .au-grid{ grid-template-columns: minmax(0,300px) minmax(0,1fr) !important; } .au-rail{ grid-column: 1 / -1; } .au-rail .card{ position: static !important; } }
        @media (max-width: 760px){ .au-grid{ grid-template-columns: 1fr !important; } }
        .au-listrow:hover{ border-color: var(--accent-300) !important; transform: translateY(-1px); }

        .au-wire{ position: relative; height: 30px; width: 2px; margin: 0 auto; }
        .au-wire-line{ position: absolute; inset: 0; width: 2px; background: var(--line-strong); border-radius: 2px; }
        .au-pulse{ position: absolute; left: 50%; top: 0; width: 11px; height: 11px; margin-left: -5.5px; border-radius: 50%;
          background: var(--accent); box-shadow: 0 0 14px 4px rgba(91,75,245,.55); animation: auPulse .5s var(--ease) forwards; }
        @keyframes auPulse{ 0%{ top: -6px; opacity: 0; transform: scale(.4);} 25%{ opacity: 1;} 80%{ opacity: 1;} 100%{ top: 100%; opacity: 0; transform: scale(1);} }

        .au-lit{ animation: auLit .7s var(--ease) both; }
        @keyframes auLit{ 0%,100%{ box-shadow: var(--shadow-sm); border-color: var(--line);} 40%{ box-shadow: 0 0 0 3px var(--accent-50), var(--shadow-md, var(--shadow-sm)); border-color: var(--accent-300);} }

        @keyframes auRowIn{ from{ opacity: 0; transform: translateX(12px);} to{ opacity: 1; transform: none;} }
        .au-logrow{ animation: auRowIn .4s var(--ease) both; }

        @media (prefers-reduced-motion: reduce){ .au-pulse, .au-lit, .au-logrow{ animation: none !important; } }
      `}</style>
    </div>
  );
}
