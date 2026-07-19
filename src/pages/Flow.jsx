// ============================================================
// ARDOVO FLOW  -  the visual canvas view of the automation engine
// ------------------------------------------------------------
// This is NOT a separate simulator. Flow renders the SAME automations
// that live in the one engine (src/lib/automation-engine.js) as a node
// graph: the trigger up top, each step below it, branch steps forking
// into a Yes path and a No exit. Pick a live enrollment and its real
// path lights up node by node. Editing happens in the Workflows builder;
// this view is read-only plus a Run test button that enrolls a record
// and animates the result. ASCII only, no long dashes.
// ============================================================
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PageTitle, SectionHeader, Card, StatCard, Button, Badge, Field, Select, EmptyState, useToast, GradientText,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import {
  useEngine, useEnrollments, getAutomations, engineStats,
  testAutomation, resumeEnrollment,
  TRIGGERS, STEP_TYPES, triggerSummary, stepSummary, entityLabel,
} from '../lib/automation-engine.js';

const TONE = {
  accent: 'var(--accent)', amber: 'var(--warn)', ok: 'var(--ok)', info: 'var(--info)', risk: 'var(--risk)',
};
const STATUS_TONE = { active: 'accent', waiting: 'warn', completed: 'ok', failed: 'risk' };

function toneColor(t) { return TONE[t] || 'var(--accent)'; }

/* One node card in the vertical graph. */
function Node({ color, eyebrow, icon, title, sub, tag, lit, dim }) {
  return (
    <div className={`flow-node${lit ? ' is-lit' : ''}`} style={{
      background: 'var(--paper)', border: '1.5px solid ' + (lit ? color : 'var(--line-strong)'),
      borderLeft: `4px solid ${color}`, borderRadius: 'var(--r-md)', boxShadow: lit ? '0 0 0 4px color-mix(in srgb, ' + color + ' 20%, transparent), var(--shadow-md)' : 'var(--shadow-sm)',
      padding: '.8rem .95rem', width: '100%', maxWidth: 460, opacity: dim ? 0.6 : 1, transition: 'box-shadow .25s, border-color .25s, opacity .25s',
    }}>
      <div className="row gap-2" style={{ alignItems: 'flex-start' }}>
        <span className="row center" style={{ width: 34, height: 34, flex: 'none', borderRadius: 9, background: 'color-mix(in srgb, ' + color + ' 15%, transparent)', color }}>
          <Icon name={icon} size={17} />
        </span>
        <div className="col gap-1" style={{ minWidth: 0, flex: 1 }}>
          <div className="row between" style={{ gap: '.5rem' }}>
            <div className="t-xs fw-7" style={{ textTransform: 'uppercase', letterSpacing: '.06em', color }}>{eyebrow}</div>
            {tag && <Badge tone={tag.tone}>{tag.label}</Badge>}
          </div>
          <div className="fw-7" style={{ fontSize: '.98rem', lineHeight: 1.25, color: 'var(--ink)' }}>{title}</div>
          {sub && <div className="t-sm muted clip">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

const Wire = ({ lit }) => (
  <div className="col center" style={{ height: 26 }}>
    <div style={{ width: 2, height: '100%', background: lit ? 'var(--accent)' : 'var(--line-strong)', borderRadius: 2, transition: 'background .25s' }} />
  </div>
);

/* The graph for one automation. `reached` is a Set of stepIds the selected
   enrollment has passed through (plus 'trigger' when it enrolled). */
function Graph({ automation, reached }) {
  const t = TRIGGERS[automation.trigger?.type];
  const triggerLit = reached.has('trigger');
  return (
    <div className="col center" style={{ width: '100%' }}>
      <Node color="var(--accent)" eyebrow="Trigger" icon={t?.icon || 'bolt'} title={triggerSummary(automation)} sub={t?.sub}
        tag={{ tone: 'accent', label: 'Start' }} lit={triggerLit} />
      {(automation.steps || []).map((step, i) => {
        const m = STEP_TYPES[step.type] || {};
        const color = toneColor(m.tone);
        const lit = reached.has(step.id);
        return (
          <React.Fragment key={step.id || i}>
            <Wire lit={lit} />
            <Node color={color} eyebrow={`Step ${i + 1}`} icon={m.icon || 'zap'} title={stepSummary(step)} sub={m.desc}
              tag={m.kind === 'control' ? { tone: 'warn', label: step.type === 'branch' ? 'If' : step.type === 'wait' ? 'Wait' : 'Goal' } : undefined}
              lit={lit} />
            {step.type === 'branch' && (
              <div className="row center gap-2" style={{ marginTop: '.5rem', maxWidth: 460, width: '100%' }}>
                <span className="row gap-1 t-xs fw-6" style={{ color: 'var(--ok)' }}><Icon name="arrowDown" size={12} /> Yes: continue</span>
                <span className="row gap-1 t-xs fw-6" style={{ color: 'var(--risk)', marginLeft: 'auto' }}>No: exit <Icon name="x" size={12} /></span>
              </div>
            )}
          </React.Fragment>
        );
      })}
      <Wire />
      <div className="row center gap-2" style={{ padding: '.5rem 1rem', borderRadius: 999, background: 'var(--ok-bg)', color: 'var(--ok)', fontWeight: 700, fontSize: '.82rem' }}>
        <Icon name="flag" size={14} /> End of flow
      </div>
    </div>
  );
}

export default function Flow() {
  useEngine();
  const enrollments = useEnrollments();
  const toast = useToast();
  const automations = getAutomations();

  const [activeId, setActiveId] = useState(null);
  const active = automations.find(a => a.id === activeId) || automations[0] || null;
  const [enrollId, setEnrollId] = useState(null);

  const stats = engineStats();
  const mineEnrollments = active ? enrollments.filter(e => e.automationId === active.id) : [];
  const selectedEnrollment = mineEnrollments.find(e => e.id === enrollId) || null;

  // Which nodes the selected enrollment has reached (for the lit path).
  const reached = useMemo(() => {
    const set = new Set();
    if (selectedEnrollment) {
      set.add('trigger');
      for (const h of selectedEnrollment.history) if (h.stepId) set.add(h.stepId);
    }
    return set;
  }, [selectedEnrollment]);

  const runTest = () => {
    if (!active) return;
    const res = testAutomation(active.id);
    if (res.ok && res.enrollment) { setEnrollId(res.enrollment.id); toast(`Enrolled ${entityLabel(res.enrollment.entity)} - path is lit below`, 'ok'); }
    else toast(res.note || 'Could not run a test', 'warn');
  };

  if (!active) {
    return (
      <div className="page-in">
        <PageTitle eyebrow="Automation" title="Flow" sub="A visual canvas over your automation engine." />
        <Card><EmptyState icon="🔗" title="No automations yet" body="Build one in the Workflows builder, then visualize it here."
          action={<Button as={Link} to="/workflows" variant="accent"><Icon name="workflow" size={16} /> Open the builder</Button>} /></Card>
      </div>
    );
  }

  return (
    <div className="page-in">
      <PageTitle
        eyebrow="Automation"
        title={<span>Flow <GradientText style={{ fontSize: '.5em', verticalAlign: 'middle', fontWeight: 800 }}>canvas</GradientText></span>}
        sub="The same automations you build in Workflows, drawn as a graph. Pick an enrollment to light up the exact path a record took."
        action={
          <>
            <Button variant="ghost" as={Link} to="/workflows"><Icon name="edit" size={16} /> Edit in builder</Button>
            <Button variant="accent" onClick={runTest}><Icon name="bolt" size={16} /> Run test</Button>
          </>
        }
      />

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '1.15rem' }}>
        <StatCard label="Automations" value={stats.total} icon={<Icon name="workflow" size={18} />} sub={`${stats.active} live now`} />
        <StatCard label="Steps mapped" value={stats.steps} icon={<Icon name="flowNode" size={18} />} accent="var(--accent-teal, var(--accent))" sub="across all flows" />
        <StatCard label="Active enrollments" value={stats.activeEnrollments} icon={<Icon name="activity" size={18} />} accent="var(--warn)" sub="records mid-flow" />
        <StatCard label="Completed" value={stats.completed} icon={<Icon name="check" size={18} />} accent="var(--ok)" sub="finished the flow" />
      </div>

      <Card className="fade-up" pad={false} style={{ marginBottom: '1.15rem' }}>
        <div className="row between wrap" style={{ padding: '.85rem 1.1rem', gap: '.75rem' }}>
          <div className="row gap-2 wrap" style={{ minWidth: 0, alignItems: 'center' }}>
            <Field label={null}>
              <Select value={active.id} onChange={(e) => { setActiveId(e.target.value); setEnrollId(null); }} style={{ minWidth: 240, fontWeight: 700 }}>
                {automations.map(a => <option key={a.id} value={a.id}>{a.name || 'Untitled automation'}</option>)}
              </Select>
            </Field>
            <Badge tone={active.active ? 'ok' : 'warn'}>{active.active ? 'Live' : 'Paused'}</Badge>
            <span className="t-sm muted">{(active.steps || []).length} steps | {mineEnrollments.length} enrollments</span>
          </div>
        </div>
      </Card>

      <div className="row" style={{ gap: '1.15rem', alignItems: 'stretch', flexWrap: 'wrap' }}>
        {/* Canvas */}
        <Card style={{ flex: '3 1 520px', minWidth: 320, overflow: 'auto', background: 'radial-gradient(circle at 1px 1px, var(--n-100) 1px, transparent 0) 0 0 / 22px 22px, var(--page)' }}>
          <div style={{ padding: '1rem .5rem 1.5rem' }}>
            <Graph automation={active} reached={reached} />
          </div>
        </Card>

        {/* Enrollment inspector */}
        <Card pad={false} style={{ flex: '1 1 300px', minWidth: 280, maxWidth: 360, alignSelf: 'stretch', overflow: 'hidden' }}>
          <div className="row between" style={{ padding: '.9rem 1.1rem', borderBottom: '1px solid var(--line)' }}>
            <div className="fw-7">Enrollments</div>
            {selectedEnrollment && <button onClick={() => setEnrollId(null)} className="btn btn-quiet t-xs" style={{ color: 'var(--n-600)', padding: '.2rem .45rem' }}>Clear</button>}
          </div>
          {mineEnrollments.length === 0 ? (
            <div className="col center gap-2" style={{ padding: '2rem 1.1rem', textAlign: 'center' }}>
              <Icon name="workflow" size={22} style={{ color: 'var(--n-400)' }} />
              <div className="t-sm muted">No enrollments yet. Press <span className="fw-6" style={{ color: 'var(--ink)' }}>Run test</span> or enroll a record from Workflows.</div>
            </div>
          ) : (
            <div className="col" style={{ maxHeight: 520, overflowY: 'auto' }}>
              {mineEnrollments.slice(0, 60).map(en => {
                const sel = en.id === enrollId;
                return (
                  <div key={en.id} className="col gap-1" style={{ padding: '.7rem 1.1rem', borderBottom: '1px solid var(--line)', background: sel ? 'var(--accent-50)' : 'transparent' }}>
                    <button onClick={() => setEnrollId(en.id)} className="row between" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0, gap: '.5rem' }}>
                      <span className="fw-6 clip" style={{ fontSize: '.88rem', color: 'var(--ink)' }}>{entityLabel(en.entity)}</span>
                      <Badge tone={STATUS_TONE[en.status] || 'default'}>{en.status}</Badge>
                    </button>
                    <div className="row between">
                      <span className="t-xs muted">{en.history.length} steps</span>
                      {en.status === 'waiting' && <button onClick={() => { resumeEnrollment(en.id); toast('Enrollment advanced', 'ok'); }} className="btn btn-quiet t-xs" style={{ color: 'var(--accent)', padding: '.15rem .45rem' }}><Icon name="play" size={11} /> Advance</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {selectedEnrollment && (
        <Card className="fade-up" style={{ marginTop: '1.15rem' }} pad={false}>
          <div style={{ padding: '1rem 1.35rem .3rem' }}>
            <SectionHeader eyebrow="Path" title={`How ${entityLabel(selectedEnrollment.entity)} moved through the flow`} sub="Every step this enrollment ran, in order." />
          </div>
          <div className="col" style={{ padding: '.4rem 1.35rem 1.2rem' }}>
            {selectedEnrollment.history.map((h, i) => (
              <div key={i} className="row gap-2" style={{ alignItems: 'flex-start', padding: '.4rem 0' }}>
                <span className="row center" style={{ width: 26, height: 26, borderRadius: 7, flex: 'none', background: 'var(--accent-50)', color: 'var(--accent)' }}><Icon name={STEP_TYPES[h.type]?.icon || 'check'} size={13} /></span>
                <div style={{ minWidth: 0 }}>
                  <div className="fw-6" style={{ fontSize: '.9rem' }}>{STEP_TYPES[h.type]?.label || h.type} <span className="t-xs muted">{h.status}</span></div>
                  <div className="t-sm muted">{h.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="fade-up" style={{ marginTop: '1.15rem', background: 'color-mix(in srgb, var(--accent-purple, var(--accent)) 7%, var(--paper))' }}>
        <div className="row gap-2" style={{ alignItems: 'flex-start' }}>
          <Icon name="sparkles" size={18} style={{ color: 'var(--accent-purple, var(--accent))', flex: 'none', marginTop: 2 }} />
          <div className="col gap-1">
            <div className="fw-7">One engine, two views</div>
            <div className="t-sm muted">This canvas and the Workflows builder run on the exact same automation engine. Build steps in the <Link to="/workflows" style={{ color: 'var(--accent)', fontWeight: 600 }}>builder</Link>, drop a Rook AI step anywhere a judgment call used to block the flow, and watch enrollments move here in real time.</div>
          </div>
        </div>
      </Card>

      <style>{`
        .flow-node.is-lit{ animation: flowLit .6s var(--ease); }
        @keyframes flowLit{ 0%{ transform: scale(1);} 45%{ transform: scale(1.02);} 100%{ transform: scale(1);} }
        @media (prefers-reduced-motion: reduce){ .flow-node.is-lit{ animation: none; } }
      `}</style>
    </div>
  );
}
