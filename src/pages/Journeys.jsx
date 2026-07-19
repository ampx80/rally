// ============================================================
// Journeys - customer-journey orchestration over Ardovo's ONE automation
// engine (src/lib/automation-engine.js, the same store that powers
// Workflows). This surface does NOT fork a second engine: it reads the
// engine's real automations + enrollments, launches journeys from the
// engine templates, toggles them live, test-runs them, and links straight
// into the full builder at /workflows for deep step editing.
//
// Every count on this page is the engine's real enrollment data. Reuses
// UI.jsx primitives + Icon. Every button works. NO em-dash / en-dash.
// ============================================================
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  allJourneys, journeyRollup, journeyStatusMeta,
  ENGINE_TEMPLATES, addTemplate, saveAutomation, newAutomationDraft,
  toggleAutomation, deleteAutomation, duplicateAutomation, testAutomation,
  triggerSummary, stepSummary, stepMeta,
  useEngine, useEnrollments, useEngineRuntime, tick,
} from '../lib/journeys-data.js';
import {
  Button, Card, Badge, PageTitle, SectionHeader, Field, Input, Select, Modal,
  EmptyState, ProgressBar, relTime, useToast,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';

const pct = (n) => `${(n || 0).toFixed(n >= 10 || n === 0 ? 0 : 1)}%`;
const num = (n) => Math.round(n || 0).toLocaleString();
const STATUS_TONE = { live: 'ok', paused: 'warn', draft: 'default' };

export default function Journeys() {
  useEngine();
  useEnrollments();
  useEngineRuntime(); // keep waiting enrollments advancing while the page is open
  const toast = useToast();
  const [tmplOpen, setTmplOpen] = useState(false);

  const journeys = allJourneys();
  const roll = useMemo(() => journeyRollup(), [journeys.length, journeys.map(j => j.enrolled + '|' + j.completed + '|' + j.active).join(',')]);

  return (
    <div className="page-in col gap-3">
      <PageTitle
        eyebrow="Marketing"
        title="Journeys"
        sub="Orchestrate multi-step customer journeys on Ardovo's one automation engine. Launch, pause, and test them here; open the full builder for deep edits. Enrollment numbers are live from the engine."
        action={
          <>
            <Button variant="ghost" as={Link} to="/workflows"><Icon name="workflow" size={16} /> Open builder</Button>
            <Button variant="accent" onClick={() => setTmplOpen(true)}><Icon name="plus" size={16} /> New journey</Button>
          </>
        }
      />

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <KpiTile label="Live journeys" value={`${roll.live}`} sub={`${roll.total} total`} icon="journeys" accent="var(--accent)" />
        <KpiTile label="Enrolled" value={num(roll.enrolled)} sub="all time" icon="users" accent="var(--accent-teal)" />
        <KpiTile label="Active now" value={num(roll.active)} sub="in flight" icon="activity" accent="var(--accent-purple)" />
        <KpiTile label="Completed" value={num(roll.completed)} sub={`${pct(roll.conversion)} conversion`} icon="check" accent="var(--ok)" />
      </div>

      <div className="col gap-2">
        <SectionHeader title="Your journeys" sub="Each one is an automation on the shared engine." />
        {journeys.length === 0 ? (
          <Card><EmptyState icon="🧭" title="No journeys yet" body="Start from a proven template, or build one from scratch in the workflow builder." action={<Button variant="accent" onClick={() => setTmplOpen(true)}><Icon name="plus" size={16} /> New journey</Button>} /></Card>
        ) : (
          <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            {journeys.map(j => <JourneyCard key={j.id} journey={j} />)}
          </div>
        )}
      </div>

      <TemplateModal open={tmplOpen} onClose={() => setTmplOpen(false)} />
    </div>
  );
}

function KpiTile({ label, value, sub, icon, accent }) {
  return (
    <div className="card card-pad" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -30, right: -30, width: 110, height: 110, borderRadius: '50%', background: accent, opacity: .08, filter: 'blur(8px)' }} />
      <div className="row between" style={{ position: 'relative' }}>
        <div className="stat-label">{label}</div>
        <span style={{ color: accent }}><Icon name={icon} size={18} /></span>
      </div>
      <div className="stat-value" style={{ fontSize: 'clamp(1.9rem, 3vw, 2.5rem)', marginTop: 6 }}>{value}</div>
      <div className="t-xs muted" style={{ marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function JourneyCard({ journey }) {
  const toast = useToast();
  const steps = journey.steps || [];
  const sm = journeyStatusMeta(journey.status);

  const onToggle = () => { toggleAutomation(journey.id); toast(journey.active ? 'Journey paused' : 'Journey is live'); };
  const onTest = () => {
    const r = testAutomation(journey.id);
    if (r && r.ok) toast('Test run enrolled a sample contact');
    else toast((r && r.note) || 'Could not test run', 'warn');
  };
  const onDup = () => { duplicateAutomation(journey.id); toast('Journey duplicated'); };
  const onDelete = () => { deleteAutomation(journey.id); toast('Journey deleted'); };

  return (
    <div className="card row-host" style={{ padding: '1.2rem 1.3rem', display: 'flex', flexDirection: 'column', gap: '.9rem' }}>
      <div className="row between" style={{ gap: '.75rem' }}>
        <div className="row gap-2" style={{ minWidth: 0 }}>
          <span style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--accent)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            <Icon name="journeys" size={20} />
          </span>
          <div className="col" style={{ minWidth: 0 }}>
            <div className="fw-7 clip" style={{ fontSize: '1.08rem' }}>{journey.name}</div>
            <div className="t-xs muted clip"><Icon name="funnel" size={12} /> {journey.triggerLabel}</div>
          </div>
        </div>
        <Badge tone={STATUS_TONE[journey.status]} style={{ flex: 'none', textTransform: 'capitalize' }}>{sm.label}</Badge>
      </div>

      {/* step ribbon */}
      <div className="row" style={{ gap: 4, overflow: 'hidden', flexWrap: 'wrap' }}>
        {steps.length === 0 && <span className="t-xs muted">No steps yet</span>}
        {steps.slice(0, 8).map((s, i) => {
          const meta = stepMeta(s.type) || {};
          return (
            <React.Fragment key={s.id || i}>
              <span title={meta.label || s.type} style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--n-100)', color: 'var(--n-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                <Icon name={meta.icon || 'flowNode'} size={12} />
              </span>
              {i < Math.min(steps.length, 8) - 1 && <span style={{ color: 'var(--n-400)', flex: 'none' }}><Icon name="chevronRight" size={11} /></span>}
            </React.Fragment>
          );
        })}
        {steps.length > 8 && <span className="t-xs muted" style={{ alignSelf: 'center' }}>+{steps.length - 8}</span>}
      </div>

      <div className="row between" style={{ gap: '.5rem', alignItems: 'flex-end' }}>
        <MiniMetric label="Enrolled" value={num(journey.enrolled)} />
        <MiniMetric label="Active" value={num(journey.activeCount)} accent="var(--accent-purple)" />
        <MiniMetric label="Completed" value={num(journey.completed)} accent="var(--ok)" />
        <MiniMetric label="Conversion" value={pct(journey.conversion)} accent="var(--accent)" />
      </div>
      {journey.enrolled > 0 && <ProgressBar value={journey.conversion} color="var(--accent)" height={6} />}

      <div className="row between" style={{ alignItems: 'center' }}>
        <span className="t-xs muted">Updated {relTime(journey.updatedAt)}</span>
        <div className="row gap-1" style={{ flex: 'none', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Button variant="quiet" size="sm" onClick={onTest} title="Enroll a sample contact"><Icon name="bolt" size={14} /> Test</Button>
          <Button variant="quiet" size="sm" onClick={onDup} title="Duplicate"><Icon name="copy" size={14} /></Button>
          <Button variant="quiet" size="sm" onClick={onDelete} title="Delete"><Icon name="trash" size={14} /></Button>
          <Button variant="quiet" size="sm" as={Link} to="/workflows" title="Open in builder"><Icon name="edit" size={14} /> Edit</Button>
          <Button variant={journey.active ? 'ghost' : 'accent'} size="sm" onClick={onToggle}>
            <Icon name={journey.active ? 'moon' : 'rocket'} size={14} /> {journey.active ? 'Pause' : 'Go live'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MiniMetric({ label, value, accent }) {
  return (
    <div className="col" style={{ gap: 1 }}>
      <div className="fw-8" style={{ fontSize: '1.15rem', letterSpacing: '-.02em', color: accent || 'var(--ink)' }}>{value}</div>
      <div className="stat-label" style={{ fontSize: '.66rem' }}>{label}</div>
    </div>
  );
}

/* ---------- create from an engine template or blank ---------- */
function TemplateModal({ open, onClose }) {
  const toast = useToast();
  const templates = ENGINE_TEMPLATES || [];

  const useTemplate = (tpl) => {
    const id = addTemplate(tpl);
    toast(`"${tpl.name}" journey created. Open the builder to go live.`);
    onClose();
  };
  const blank = () => {
    const draft = newAutomationDraft();
    draft.name = 'New journey';
    saveAutomation(draft);
    toast('Blank journey created. Open the builder to add steps.');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="New journey" width={640}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="ghost" onClick={blank}><Icon name="plus" size={15} /> Blank journey</Button></>}>
      <div className="col gap-3">
        <div className="t-sm muted">Start from a proven journey. It lands on the shared engine, ready to launch or refine in the builder.</div>
        {templates.length === 0 ? (
          <EmptyState title="No templates" body="Build one from scratch with a blank journey." />
        ) : (
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '.6rem' }}>
            {templates.map(t => (
              <button key={t.id} className="card card-hover" style={{ padding: '.85rem', textAlign: 'left', cursor: 'pointer', display: 'flex', gap: '.7rem', alignItems: 'flex-start' }} onClick={() => useTemplate(t)}>
                <span style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--accent-50)', color: 'var(--accent-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Icon name={t.icon || 'journeys'} size={17} /></span>
                <div className="col" style={{ minWidth: 0 }}>
                  <div className="fw-7 clip">{t.name}</div>
                  <div className="t-xs muted" style={{ lineHeight: 1.4 }}>{t.description}</div>
                  <div className="t-xs muted" style={{ marginTop: 3 }}>{(t.steps || []).length} steps</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
