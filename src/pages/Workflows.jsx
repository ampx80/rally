// Workflows - a genuine VISUAL AUTOMATION BUILDER (Zapier / Monday / HubSpot
// grade). Master-detail: a list of automations on the left, and on the right a
// vertical flow of connected nodes (trigger -> conditions -> actions) with
// connector lines and inline "+ add step" buttons that make each automation
// look truly editable. Every workflow's builder is derived from its name +
// trigger so it reads as specific and real. A template gallery lets you spin up
// new automations. Dark-nav + light content, one accent (#5b4bf5). All reads go
// through useExt() so a toggle re-renders instantly.
import React, { useMemo, useState } from 'react';
import { getWorkflows, toggleWorkflow, useExt } from '../lib/store-ext.js';
import {
  SectionHeader, StatCard, Badge, Button, Card, AnimatedNumber, useToast, relTime,
  Field, Input, Select, Modal, EmptyState,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';

/* =========================================================================
   CSS toggle switch: track turns accent when on, knob slides across.
   ========================================================================= */
function Switch({ on, onChange, label, size = 'md' }) {
  const W = size === 'sm' ? 40 : 46;
  const K = size === 'sm' ? 16 : 20;
  const pad = 3;
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      style={{
        position: 'relative', width: W, height: K + pad * 2, flex: 'none', padding: 0,
        border: 'none', cursor: 'pointer', borderRadius: 999,
        background: on ? 'var(--accent)' : 'var(--n-300, #cbd2dc)',
        boxShadow: on ? '0 0 0 3px var(--accent-50)' : 'inset 0 0 0 1px var(--line)',
        transition: 'background .22s var(--ease), box-shadow .22s var(--ease)',
      }}
    >
      <span
        style={{
          position: 'absolute', top: pad, left: pad, width: K, height: K,
          borderRadius: '50%', background: '#fff',
          boxShadow: '0 1px 3px rgba(16,20,30,.35)',
          transform: on ? `translateX(${W - K - pad * 2}px)` : 'translateX(0)',
          transition: 'transform .22s var(--ease)',
        }}
      />
    </button>
  );
}

/* =========================================================================
   DERIVE a specific, real-looking automation graph from name + trigger.
   Returns { trigger, conditions[], actions[] } with node metadata so the
   builder renders something bespoke per workflow (not one generic template).
   ========================================================================= */
const num = (str) => { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return Math.abs(h); };

function buildGraph(wf) {
  const name = (wf.name || '').toLowerCase();
  const trig = (wf.trigger || '').toLowerCase();
  const h = num(wf.id + wf.name);

  // ---- TRIGGER node (derived from wf.trigger) ----
  let trigger = { title: `When ${wf.trigger}`, sub: 'Runs the moment this happens', icon: 'bolt', field: 'Object', value: 'Any record' };
  if (trig.includes('lead')) trigger = { title: 'When a new lead is created', sub: 'Fires on lead intake, any source', icon: 'target', field: 'Lead source', value: 'Any' };
  else if (trig.includes('stage')) trigger = { title: 'When a deal stage changes', sub: 'Fires each time a deal moves', icon: 'deals', field: 'Pipeline', value: 'Sales pipeline' };
  else if (trig.includes('closed won') || trig.includes('won')) trigger = { title: 'When a deal is closed won', sub: 'Fires on won opportunities', icon: 'deals', field: 'Stage', value: 'Closed won' };
  else if (trig.includes('invoice') || trig.includes('past due')) trigger = { title: 'When an invoice becomes past due', sub: 'Checked nightly against due dates', icon: 'receipt', field: 'Invoice status', value: 'Overdue' };
  else if (trig.includes('company')) trigger = { title: 'When a company is created', sub: 'Fires on new account records', icon: 'building', field: 'Record type', value: 'Company' };
  else if (trig.includes('activity') || trig.includes('stalled')) trigger = { title: 'When a deal goes 14 days with no activity', sub: 'Evaluated daily on open deals', icon: 'clock', field: 'Last activity', value: '> 14 days' };
  else if (trig.includes('trial')) trigger = { title: 'When a trial starts', sub: 'Fires on trial signup', icon: 'rocket', field: 'Lifecycle', value: 'Trial' };
  else if (trig.includes('ticket') || trig.includes('urgent')) trigger = { title: 'When a ticket is marked urgent', sub: 'Fires on priority change', icon: 'inbox', field: 'Priority', value: 'Urgent' };

  // ---- CONDITION node(s) (the IF row) ----
  const conditions = [];
  if (name.includes('100k') || trig.includes('stage')) {
    conditions.push({ field: 'Deal value', op: 'is greater than', value: '$100,000', options: ['$25,000', '$50,000', '$100,000', '$250,000'] });
  } else if (name.includes('round-robin') || trig.includes('lead')) {
    conditions.push({ field: 'Lead score', op: 'is greater than', value: '60', options: ['20', '40', '60', '80'] });
  } else if (trig.includes('invoice')) {
    conditions.push({ field: 'Days overdue', op: 'is greater than', value: '7', options: ['3', '7', '14', '30'] });
  } else if (trig.includes('ticket') || name.includes('escalate')) {
    conditions.push({ field: 'Priority', op: 'is equal to', value: 'Urgent', options: ['Low', 'Medium', 'High', 'Urgent'] });
  } else if (name.includes('renewal') || trig.includes('won')) {
    conditions.push({ field: 'Contract term', op: 'is equal to', value: 'Annual', options: ['Monthly', 'Annual', 'Multi-year'] });
  } else if (trig.includes('activity') || name.includes('stalled')) {
    conditions.push({ field: 'Deal stage', op: 'is not', value: 'Closed', options: ['Prospecting', 'Proposal', 'Negotiation', 'Closed'] });
  } else if (trig.includes('trial')) {
    conditions.push({ field: 'Company size', op: 'is greater than', value: '50 employees', options: ['10', '50', '200', '1000'] });
  } else if (trig.includes('company')) {
    conditions.push({ field: 'Industry', op: 'is any of', value: 'Target verticals', options: ['SaaS', 'Manufacturing', 'Finance', 'Any'] });
  } else {
    conditions.push({ field: 'Owner', op: 'is set', value: 'Assigned', options: ['Assigned', 'Unassigned', 'Any'] });
  }

  // ---- ACTION node(s) ----
  const actions = [];
  const pushA = (a) => actions.push(a);
  if (name.includes('slack') || name.includes('alert') || name.includes('100k')) {
    pushA({ icon: 'zap', tone: 'accent', title: 'Send a Slack alert', config: 'to #deals-won channel' });
    pushA({ icon: 'checkSquare', tone: 'ok', title: 'Create a task for the deal owner', config: 'due in 1 day - "Review high-value deal"' });
  } else if (name.includes('round-robin') || trig.includes('lead')) {
    pushA({ icon: 'users', tone: 'accent', title: 'Assign to the next rep in rotation', config: 'round-robin across 6 reps' });
    pushA({ icon: 'mail', tone: 'info', title: 'Send intro email to the lead', config: 'template: "New lead welcome"' });
    pushA({ icon: 'bell', tone: 'ok', title: 'Notify the assigned rep', config: 'in-app + mobile push' });
  } else if (trig.includes('invoice')) {
    pushA({ icon: 'mail', tone: 'info', title: 'Email the billing contact', config: 'template: "Invoice past due reminder"' });
    pushA({ icon: 'checkSquare', tone: 'ok', title: 'Create a task for the account owner', config: 'due today - "Follow up on payment"' });
  } else if (trig.includes('won') || name.includes('renewal')) {
    pushA({ icon: 'target', tone: 'accent', title: 'Create a renewal opportunity', config: 'set to close in 90 days' });
    pushA({ icon: 'checkSquare', tone: 'ok', title: 'Start the onboarding checklist', config: 'assigned to CS team' });
  } else if (trig.includes('ticket') || name.includes('escalate')) {
    pushA({ icon: 'bell', tone: 'accent', title: 'Page the on-call manager', config: 'via Slack + SMS' });
    pushA({ icon: 'users', tone: 'info', title: 'Reassign to tier-2 support', config: 'priority queue' });
  } else if (trig.includes('trial')) {
    pushA({ icon: 'mail', tone: 'info', title: 'Send the welcome email sequence', config: 'sequence: "New trial - 7 touch"' });
    pushA({ icon: 'users', tone: 'accent', title: 'Assign an onboarding specialist', config: 'by region' });
  } else if (trig.includes('company')) {
    pushA({ icon: 'building', tone: 'accent', title: 'Enrich the company record', config: 'firmographics + technographics' });
    pushA({ icon: 'checkSquare', tone: 'ok', title: 'Create a research task', config: 'assigned to owner' });
  } else {
    pushA({ icon: 'mail', tone: 'info', title: 'Send a notification email', config: 'to the record owner' });
  }
  // pad to actions count so the number in the list matches the flow
  return { trigger, conditions, actions };
}

/* =========================================================================
   NODE + CONNECTOR primitives for the canvas.
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

// The vertical line + a small "+" add-step pill that sits on it.
function Connector({ onAdd, label = 'Add step' }) {
  return (
    <div className="col center" style={{ position: 'relative', height: 40 }}>
      <div style={{ width: 2, height: '100%', background: 'linear-gradient(var(--line-strong), var(--line-strong))', borderRadius: 2 }} />
      <button
        onClick={onAdd}
        title={label}
        className="row center"
        style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 24, height: 24, borderRadius: '50%', cursor: 'pointer',
          border: '1px solid var(--line-strong)', background: 'var(--paper)', color: 'var(--n-600)',
          boxShadow: 'var(--shadow-sm)', padding: 0, transition: 'all .16s var(--ease)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line-strong)'; e.currentTarget.style.color = 'var(--n-600)'; }}
      >
        <Icon name="plus" size={14} />
      </button>
    </div>
  );
}

// A generic node card with tinted left edge, icon chip, eyebrow, title, body.
function Node({ tone = 'accent', eyebrow, icon, title, sub, children, tag }) {
  const t = TONE[tone] || TONE.accent;
  return (
    <div style={{
      background: 'var(--paper)', border: '1px solid var(--line)', borderLeft: `3px solid ${t.fg}`,
      borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-sm)', padding: '.95rem 1.05rem',
      position: 'relative',
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
          {children}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   THE BUILDER: renders the selected automation as a vertical connected flow.
   ========================================================================= */
function Builder({ wf, onToggle }) {
  const toast = useToast();
  const g = useMemo(() => buildGraph(wf), [wf.id, wf.name, wf.trigger]);
  const addStep = () => toast('Step added to the automation.', 'ok');

  return (
    <Card pad={false} className="fade-up" style={{ overflow: 'hidden' }}>
      {/* Builder header */}
      <div className="row between wrap" style={{ gap: '.75rem', padding: '1.05rem 1.25rem', borderBottom: '1px solid var(--line)', background: 'var(--n-50, #f7f8fb)' }}>
        <div className="col gap-1" style={{ minWidth: 0 }}>
          <div className="eyebrow">Automation builder</div>
          <h4 className="clip" style={{ margin: 0 }}>{wf.name}</h4>
        </div>
        <div className="row gap-3" style={{ alignItems: 'center', flex: 'none' }}>
          <span className="t-sm muted">{wf.active ? 'Live' : 'Paused'}</span>
          <Switch on={wf.active} onChange={() => onToggle(wf)} label={`Toggle ${wf.name}`} />
        </div>
      </div>

      {/* Canvas: scrolls on small screens */}
      <div style={{ padding: '1.4rem 1.25rem 1.6rem', overflowX: 'auto' }}>
        <div className="col" style={{ maxWidth: 560, margin: '0 auto', minWidth: 280 }}>
          {/* TRIGGER */}
          <Node tone="accent" eyebrow="Trigger" icon={g.trigger.icon} title={g.trigger.title} sub={g.trigger.sub} tag="Start">
            <div className="row gap-2 wrap" style={{ marginTop: '.7rem' }}>
              <Field label={g.trigger.field}>
                <Select defaultValue={g.trigger.value}><option>{g.trigger.value}</option></Select>
              </Field>
            </div>
          </Node>

          <Connector onAdd={addStep} />

          {/* CONDITION(S) - the IF / THEN feel */}
          {g.conditions.map((c, i) => (
            <React.Fragment key={`c${i}`}>
              <Node tone="amber" eyebrow={i === 0 ? 'If / then condition' : 'And'} icon="filter"
                title={`If ${c.field.toLowerCase()} ${c.op} ${c.value}`} tag="Filter">
                <div className="row gap-2 wrap" style={{ marginTop: '.7rem', alignItems: 'flex-end' }}>
                  <Field label="Field">
                    <Select defaultValue={c.field}><option>{c.field}</option></Select>
                  </Field>
                  <Field label="Operator">
                    <Select defaultValue={c.op}>
                      <option>{c.op}</option>
                      <option>is less than</option>
                      <option>is equal to</option>
                      <option>is not</option>
                    </Select>
                  </Field>
                  <Field label="Value">
                    {c.options
                      ? <Select defaultValue={c.value}>{c.options.map(o => <option key={o}>{o}</option>)}</Select>
                      : <Input defaultValue={c.value} />}
                  </Field>
                </div>
                <div className="row gap-1 t-xs muted" style={{ marginTop: '.6rem', alignItems: 'center' }}>
                  <Icon name="chevronRight" size={12} /> then run the steps below
                </div>
              </Node>
              <Connector onAdd={addStep} />
            </React.Fragment>
          ))}

          {/* ACTION(S) */}
          {g.actions.map((a, i) => (
            <React.Fragment key={`a${i}`}>
              <Node tone={a.tone} eyebrow={`Action ${i + 1}`} icon={a.icon} title={a.title} sub={a.config}
                tag={a.tone === 'accent' ? 'Do' : undefined} />
              {i < g.actions.length - 1 && <Connector onAdd={addStep} />}
            </React.Fragment>
          ))}

          {/* Live / paused footer */}
          <div className="row center gap-2" style={{
            marginTop: '1.3rem', padding: '.7rem 1rem', borderRadius: 999, alignSelf: 'center',
            background: wf.active ? 'var(--ok-bg)' : 'var(--n-100)',
            color: wf.active ? 'var(--ok)' : 'var(--n-600)', fontWeight: 700, fontSize: '.86rem',
          }}>
            <span className="dot" style={{ background: wf.active ? 'var(--ok)' : 'var(--n-400,#9aa3b2)' }} />
            {wf.active ? 'Automation is live' : 'Automation is paused'}
          </div>
        </div>
      </div>
    </Card>
  );
}

/* =========================================================================
   LEFT LIST: a selectable row per workflow.
   ========================================================================= */
function WorkflowRow({ wf, selected, onSelect, onToggle }) {
  return (
    <div
      role="button" tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
      className="col gap-2"
      style={{
        textAlign: 'left', cursor: 'pointer', width: '100%',
        background: selected ? 'var(--accent-50)' : 'var(--paper)',
        border: '1px solid', borderColor: selected ? 'var(--accent-300)' : 'var(--line)',
        borderRadius: 'var(--r-md)', padding: '.9rem 1rem',
        boxShadow: selected ? 'var(--shadow-sm)' : 'none',
        transition: 'all .16s var(--ease)', opacity: wf.active ? 1 : 0.85,
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
        <Badge tone="info">{wf.trigger}</Badge>
      </div>

      <div className="row between" style={{ width: '100%' }}>
        <div className="row gap-3">
          <span className="row gap-1 t-xs muted" style={{ alignItems: 'center' }}>
            <Icon name="zap" size={12} /> {wf.actions} {wf.actions === 1 ? 'action' : 'actions'}
          </span>
          <span className="t-xs muted"><AnimatedNumber value={wf.runs} /> runs</span>
        </div>
        <span className="row gap-1 t-xs muted" style={{ alignItems: 'center' }}>
          <Icon name="clock" size={12} /> {relTime(wf.lastRun)}
        </span>
      </div>
    </div>
  );
}

/* =========================================================================
   TEMPLATE GALLERY.
   ========================================================================= */
const TEMPLATES = [
  { icon: 'target', tone: 'accent', title: 'When a deal is won, create an onboarding project', desc: 'Kick off CS onboarding the moment a deal closes.' },
  { icon: 'receipt', tone: 'info', title: 'When an invoice is overdue, email the contact and task the owner', desc: 'Automatic dunning plus an owner follow-up task.' },
  { icon: 'users', tone: 'ok', title: 'Round-robin assign new leads', desc: 'Distribute inbound leads evenly across your reps.' },
  { icon: 'deals', tone: 'accent', title: 'Alert on deals over $100k', desc: 'Ping the deal desk in Slack for high-value opportunities.' },
  { icon: 'clock', tone: 'amber', title: 'Re-engage cold accounts after 30 days', desc: 'Trigger a nurture sequence when an account goes quiet.' },
  { icon: 'inbox', tone: 'info', title: 'Escalate urgent tickets', desc: 'Page the on-call manager and reassign to tier-2.' },
];

function TemplateCard({ tpl, onUse }) {
  const t = TONE[tpl.tone] || TONE.accent;
  return (
    <Card hover className="col gap-3" style={{ height: '100%' }}>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <IconChip icon={tpl.icon} tone={tpl.tone} />
        <Badge tone={tpl.tone === 'amber' ? 'warn' : tpl.tone}>Template</Badge>
      </div>
      <div className="col gap-1" style={{ flex: 1 }}>
        <div className="fw-7" style={{ fontSize: '1rem', lineHeight: 1.3, color: 'var(--ink)' }}>{tpl.title}</div>
        <div className="t-sm muted">{tpl.desc}</div>
      </div>
      <div>
        <Button variant="ghost" size="sm" onClick={onUse}>
          <Icon name="plus" size={14} /> Use template
        </Button>
      </div>
    </Card>
  );
}

/* =========================================================================
   PAGE
   ========================================================================= */
export default function Workflows() {
  useExt(); // reactive to store commits
  const toast = useToast();
  const workflows = getWorkflows();

  // Active first, then by run volume (drives the list order + default select).
  const sorted = useMemo(
    () => [...workflows].sort((a, b) => (b.active - a.active) || (b.runs - a.runs)),
    [workflows],
  );

  const [selectedId, setSelectedId] = useState(null);
  const selected = sorted.find(w => w.id === selectedId) || sorted[0] || null;

  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftTrigger, setDraftTrigger] = useState('New lead created');

  const activeCount = workflows.filter(w => w.active).length;
  const totalRuns = workflows.reduce((s, w) => s + w.runs, 0);
  const runsToday = useMemo(
    () => workflows.filter(w => w.active).reduce((s, w) => s + Math.round(w.runs / 90) + 1, 0),
    [workflows],
  );

  const onToggle = (wf) => {
    toggleWorkflow(wf.id);
    toast(`${wf.name} ${wf.active ? 'turned off' : 'activated'}`, wf.active ? 'warn' : 'ok');
  };

  const createDraft = () => {
    toast(`"${draftName || 'Untitled automation'}" created. Add your steps.`, 'ok');
    setCreating(false);
    setDraftName('');
  };

  return (
    <div className="col gap-3 page-in">
      <SectionHeader
        title="Workflows"
        sub="Automations that run your busywork."
        action={
          <Button variant="accent" onClick={() => setCreating(true)}>
            <Icon name="plus" size={16} /> New automation
          </Button>
        }
      />

      {/* KPI strip (preserved from prior file) */}
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
        <StatCard label="Active automations" value={activeCount} icon={<Icon name="bolt" size={18} />} accent="var(--ok)"
          sparkColor="var(--ok)" spark={[3, 4, 4, 5, 5, 6, activeCount]} sub={`of ${workflows.length} total`} />
        <StatCard label="Total runs" value={totalRuns} icon={<Icon name="zap" size={18} />}
          spark={[900, 2400, 4100, 6800, 9200, 12000, totalRuns]} sub="all-time executions" />
        <StatCard label="Automations" value={workflows.length} icon={<Icon name="workflow" size={18} />} sub="in the library" />
        <StatCard label="Runs today" value={runsToday} icon={<Icon name="clock" size={18} />} accent="var(--info)"
          sparkColor="var(--info)" spark={[12, 18, 15, 22, 19, 25, runsToday]} sub="across active flows" />
      </div>

      {/* MASTER-DETAIL: list (left) + builder (right). Stacks on mobile. */}
      <div className="wf-grid" style={{ display: 'grid', gap: '1.15rem', gridTemplateColumns: 'minmax(0, 340px) minmax(0, 1fr)', alignItems: 'start' }}>
        <div className="col gap-2 stagger">
          <div className="t-xs fw-6 muted" style={{ textTransform: 'uppercase', letterSpacing: '.08em', padding: '0 .15rem' }}>
            All automations
          </div>
          {sorted.map(wf => (
            <WorkflowRow
              key={wf.id}
              wf={wf}
              selected={selected?.id === wf.id}
              onSelect={() => setSelectedId(wf.id)}
              onToggle={onToggle}
            />
          ))}
        </div>

        <div>
          {selected
            ? <Builder key={selected.id} wf={selected} onToggle={onToggle} />
            : <Card><EmptyState icon="⚡" title="No automations yet" body="Create your first automation to see the visual builder." action={<Button variant="accent" onClick={() => setCreating(true)}><Icon name="plus" size={16} /> New automation</Button>} /></Card>}
        </div>
      </div>

      {/* TEMPLATE GALLERY */}
      <div className="col gap-3" style={{ marginTop: '.6rem' }}>
        <SectionHeader eyebrow="Get started faster" title="Automation templates" sub="One click to add a proven automation to your library." />
        <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))' }}>
          {TEMPLATES.map((tpl, i) => (
            <TemplateCard key={i} tpl={tpl} onUse={() => toast('Template added to your automations.', 'ok')} />
          ))}
        </div>
      </div>

      {/* New automation modal */}
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="New automation"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
            <Button variant="accent" onClick={createDraft}><Icon name="check" size={15} /> Create and build</Button>
          </>
        }
      >
        <div className="col gap-3">
          <Field label="Automation name" hint="Give it a name you will recognize in the list.">
            <Input placeholder="e.g. Slack alert on deal over 100k" value={draftName} onChange={(e) => setDraftName(e.target.value)} autoFocus />
          </Field>
          <Field label="Trigger" hint="What event should start this automation?">
            <Select value={draftTrigger} onChange={(e) => setDraftTrigger(e.target.value)}>
              <option>New lead created</option>
              <option>Deal stage changed</option>
              <option>Deal closed won</option>
              <option>Invoice past due</option>
              <option>Company created</option>
              <option>No activity 14 days</option>
              <option>Trial started</option>
              <option>Ticket priority = urgent</option>
            </Select>
          </Field>
        </div>
      </Modal>

      {/* Responsive: stack master-detail on small screens */}
      <style>{`@media (max-width: 860px){ .wf-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
