// Workflows - the Zapier-grade automation surface. A responsive grid of
// automation cards, each with its trigger, action count, run totals, and a
// satisfying accent toggle that flips active/off through the store. Live KPIs
// summarize the automation fleet. All reads flow through useExt() so a toggle
// re-renders instantly.
import React, { useMemo } from 'react';
import { getWorkflows, toggleWorkflow, useExt } from '../lib/store-ext.js';
import {
  SectionHeader, StatCard, Badge, Button, Card, AnimatedNumber, useToast, relTime,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';

// A clean CSS pill switch: track turns accent when on, knob slides across.
function Switch({ on, onChange, label }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      style={{
        position: 'relative', width: 46, height: 26, flex: 'none', padding: 0,
        border: 'none', cursor: 'pointer', borderRadius: 999,
        background: on ? 'var(--accent)' : 'var(--n-300, #cbd2dc)',
        boxShadow: on ? '0 0 0 3px var(--accent-50, rgba(91,75,245,.14))' : 'inset 0 0 0 1px var(--line)',
        transition: 'background .22s var(--ease), box-shadow .22s var(--ease)',
      }}
    >
      <span
        style={{
          position: 'absolute', top: 3, left: 3, width: 20, height: 20,
          borderRadius: '50%', background: '#fff',
          boxShadow: '0 1px 3px rgba(16,20,30,.35)',
          transform: on ? 'translateX(20px)' : 'translateX(0)',
          transition: 'transform .22s var(--ease)',
        }}
      />
    </button>
  );
}

function WorkflowCard({ wf, onToggle }) {
  return (
    <Card className={wf.active ? '' : 'is-off'} style={{ opacity: wf.active ? 1 : 0.82 }}>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div className="row gap-3" style={{ alignItems: 'center', minWidth: 0 }}>
          <span
            className="row center"
            style={{
              width: 40, height: 40, flex: 'none', borderRadius: 'var(--r-sm)',
              background: 'var(--accent-50, rgba(91,75,245,.10))', color: 'var(--accent)',
            }}
          >
            <Icon name="bolt" size={20} />
          </span>
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <h4 className="clip" style={{ margin: 0 }}>{wf.name}</h4>
            <Badge tone={wf.active ? 'ok' : 'default'}>{wf.active ? 'Active' : 'Off'}</Badge>
          </div>
        </div>
        <Switch on={wf.active} onChange={() => onToggle(wf)} label={`Toggle ${wf.name}`} />
      </div>

      <div className="col gap-1" style={{ marginTop: '1rem' }}>
        <div className="t-xs muted fw-6" style={{ textTransform: 'uppercase', letterSpacing: '.04em' }}>When</div>
        <div><Badge tone="info">{wf.trigger}</Badge></div>
      </div>

      <div
        className="row between"
        style={{ marginTop: '1rem', paddingTop: '.9rem', borderTop: '1px solid var(--line)' }}
      >
        <div className="row gap-3">
          <span className="row gap-1 t-sm muted" style={{ alignItems: 'center' }}>
            <Icon name="zap" size={14} /> {wf.actions} {wf.actions === 1 ? 'action' : 'actions'}
          </span>
          <span className="t-sm muted">
            <AnimatedNumber value={wf.runs} /> runs
          </span>
        </div>
        <span className="row gap-1 t-xs muted" style={{ alignItems: 'center' }}>
          <Icon name="clock" size={13} /> {relTime(wf.lastRun)}
        </span>
      </div>
    </Card>
  );
}

export default function Workflows() {
  useExt(); // reactive to store commits
  const toast = useToast();
  const workflows = getWorkflows();

  const activeCount = workflows.filter(w => w.active).length;
  const totalRuns = workflows.reduce((s, w) => s + w.runs, 0);
  // A plausible "runs today" derived from active workflows (deterministic-ish).
  const runsToday = useMemo(
    () => workflows.filter(w => w.active).reduce((s, w) => s + Math.round(w.runs / 90) + 1, 0),
    [workflows],
  );

  // Active workflows first, then by run volume.
  const sorted = useMemo(
    () => [...workflows].sort((a, b) => (b.active - a.active) || (b.runs - a.runs)),
    [workflows],
  );

  const onToggle = (wf) => {
    toggleWorkflow(wf.id);
    toast(`${wf.name} ${wf.active ? 'turned off' : 'activated'}`, wf.active ? 'warn' : 'ok');
  };

  return (
    <div className="col gap-3">
      <SectionHeader
        title="Workflows"
        sub="Automations that run your busywork."
        action={
          <Button variant="accent" onClick={() => toast('Workflow builder is coming soon.', 'warn')}>
            <Icon name="plus" size={16} /> New workflow
          </Button>
        }
      />

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
        <StatCard label="Active automations" value={activeCount} icon={<Icon name="bolt" size={18} />} accent="var(--ok)"
          sparkColor="var(--ok)" spark={[3, 4, 4, 5, 5, 6, activeCount]} sub={`of ${workflows.length} total`} />
        <StatCard label="Total runs" value={totalRuns} icon={<Icon name="zap" size={18} />}
          spark={[900, 2400, 4100, 6800, 9200, 12000, totalRuns]} sub="all-time executions" />
        <StatCard label="Automations" value={workflows.length} icon={<Icon name="workflow" size={18} />} sub="in the library" />
        <StatCard label="Runs today" value={runsToday} icon={<Icon name="clock" size={18} />} accent="var(--info)"
          sparkColor="var(--info)" spark={[12, 18, 15, 22, 19, 25, runsToday]} sub="across active flows" />
      </div>

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))' }}>
        {sorted.map(wf => <WorkflowCard key={wf.id} wf={wf} onToggle={onToggle} />)}
      </div>
    </div>
  );
}
