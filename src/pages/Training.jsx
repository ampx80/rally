// Training - Ardovo Academy. An AI trainer that runs each person's onboarding
// by voice or chat: required modules based on what they can access, per-module
// completion + progress, manager-added custom modules, on-page highlighting,
// and a Zoom-style archive (a concise summary up front, the full notes behind
// it) so managers can see what was covered. Powered by src/lib/training.js.
// Teal is product, violet is the AI trainer. NO em-dash / en-dash. ASCII only.
import React, { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Card, Button, Badge, StatCard, EmptyState, Field, Input, Select, Textarea, useToast, relTime,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import AgentDeck from '../components/agent/AgentDeck.jsx';
import { highlightElement } from '../components/TrainingMode.jsx';
import {
  useTraining, startSession, endSession, updateSession, logStep, logAsk,
  requiredFor, completionStats, moduleProgress, markStepDone, markModuleComplete, resetModule,
  addCustomModule, removeCustomModule, isManager, currentRole, trainingStats,
} from '../lib/training.js';

const LEVEL_TONE = { 'Start here': '#0e9f8f', Core: '#2563a8', 'Power up': '#7c5cf7', Admin: '#e0752d' };

function askRook(prompt) {
  window.dispatchEvent(new CustomEvent('rally:rook', { detail: { open: true, prompt, training: true } }));
}

export default function Training() {
  const { sessions, active, progress } = useTraining();
  const nav = useNavigate();
  const loc = useLocation();
  const toast = useToast();
  const manager = isManager();
  const role = currentRole();

  const modules = useMemo(() => requiredFor(role), [role, progress, sessions]); // eslint-disable-line
  const stats = completionStats(role);
  const tstats = trainingStats();
  const [openNotes, setOpenNotes] = useState(null);
  const [adding, setAdding] = useState(false);

  const doStep = (mod, i, step) => {
    logStep(mod.id, step.title);
    markStepDone(mod.id, i);
    if (step.ask) { logAsk(step.ask); askRook(step.ask); }
    if (step.to && step.to !== loc.pathname) nav(step.to);
    if (step.highlight) setTimeout(() => highlightElement(step.highlight, step.title), step.to && step.to !== loc.pathname ? 550 : 120);
    if (!step.ask && !step.to && !step.highlight) toast('Step logged');
  };

  const toggleSession = async () => {
    if (active) {
      const s = endSession();
      toast(s ? 'Session saved with a summary' : 'Session ended');
      if (s) enrich(s);
    } else {
      startSession();
      toast('Training session started. Every step is tracked.');
    }
  };

  // Ask the server for a nicer "meeting summary" (env-gated; silent fallback).
  const enrich = async (s) => {
    try {
      const r = await fetch('/api/training-summary', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: s.notes, summary: s.summary, user: s.userName }),
      });
      const d = await r.json().catch(() => ({}));
      if (d?.ok && (d.summary || d.notes)) updateSession(s.id, { summary: d.summary || s.summary, aiNotes: d.notes || null });
    } catch {}
  };

  return (
    <div className="fade-up tn">
      <AgentDeck
        eyebrow="Ardovo Academy"
        title="Your training,"
        highlight="run by AI."
        sub="A patient AI trainer walks you through everything you have access to - by voice or chat, taking you to the right screens and highlighting what matters. Required modules are based on your permissions. No scheduling, no burned hours."
        actions={<button className={`adk-btn${active ? '' : ' adk-btn--primary'}`} onClick={toggleSession}>
          <Icon name={active ? 'check' : 'rocket'} size={15} /> {active ? 'End + summarize' : 'Start training session'}
        </button>}
        pods={[
          { label: 'Required for you', value: stats.required, icon: 'book' },
          { label: 'Completed', value: stats.done, icon: 'check' },
          { label: 'Your progress', value: stats.pct, format: (n) => `${Math.round(n)}%`, icon: 'trendUp' },
          { label: 'Sessions logged', value: tstats.sessions, icon: 'rocket' },
        ]}
      />

      {/* Progress + active banner */}
      <div className="tn-progress">
        <div className="row between" style={{ alignItems: 'center', marginBottom: 8 }}>
          <span className="fw-6" style={{ color: 'var(--ink)' }}>Your required path</span>
          <span className="t-sm muted">{stats.done} of {stats.required} complete</span>
        </div>
        <div className="tn-bar"><div className="tn-bar-fill" style={{ width: `${stats.pct}%` }} /></div>
        {active && (
          <div className="tn-active">
            <span className="tn-active-dot" /> Training in progress - started {relTime(active.startedAt)}, {active.steps.length} step{active.steps.length === 1 ? '' : 's'} so far.
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => askRook('I just started training. Give me a quick tour and highlight where things are.')}><Icon name="sparkles" size={14} /> Have Rook guide me</button>
          </div>
        )}
      </div>

      {/* Modules */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: '1rem', marginTop: '1.25rem', marginBottom: '2rem' }}>
        {modules.map(m => {
          const prog = moduleProgress(m.id);
          const doneIdx = progress[m.id]?.done || [];
          const tone = LEVEL_TONE[m.level] || '#7c5cf7';
          return (
            <Card key={m.id} className="col" style={{ gap: '.7rem', borderColor: prog.complete ? 'rgba(26,159,109,.4)' : undefined }}>
              <div className="row gap-2" style={{ alignItems: 'center' }}>
                <span className="tn-ico" style={{ background: prog.complete ? 'var(--ok-bg)' : 'var(--ai-50)', color: prog.complete ? 'var(--ok)' : 'var(--ai-600)' }}>
                  <Icon name={prog.complete ? 'check' : m.icon} size={19} />
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="fw-6" style={{ color: 'var(--ink)' }}>{m.title}</div>
                  <div className="row gap-2" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="tn-level" style={{ color: tone, background: tone + '18' }}>{m.level}</span>
                    <span className="t-xs muted">{m.minutes} min</span>
                    {m.permissionGated && <Badge tone="warn">Permission-gated</Badge>}
                    {m.custom && <Badge tone="info">Custom</Badge>}
                  </div>
                </div>
                {prog.complete && <Badge tone="ok"><Icon name="check" size={12} /> Done</Badge>}
              </div>
              <div className="t-sm muted">{m.blurb}</div>
              <div className="tn-steps">
                {m.steps.map((s, i) => {
                  const done = doneIdx.includes(i);
                  return (
                    <button key={i} className="tn-step" data-done={done} onClick={() => doStep(m, i, s)}>
                      <span className="tn-step-check">{done ? <Icon name="check" size={12} stroke={3} /> : i + 1}</span>
                      <span className="tn-step-body">
                        <span className="tn-step-title">{s.title}</span>
                        <span className="tn-step-detail">{s.detail}</span>
                      </span>
                      <Icon name={s.ask ? 'sparkles' : s.highlight ? 'target' : 'chevronRight'} size={14} className="tn-step-go" />
                    </button>
                  );
                })}
              </div>
              <div className="row gap-2" style={{ marginTop: '.2rem' }}>
                {!prog.complete
                  ? <Button size="sm" variant="ghost" onClick={() => { markModuleComplete(m.id); toast('Marked complete'); }}><Icon name="check" size={14} /> Mark complete</Button>
                  : <Button size="sm" variant="ghost" onClick={() => { resetModule(m.id); toast('Reset'); }}><Icon name="rotateCcw" size={14} /> Redo</Button>}
                <span className="t-xs muted" style={{ marginLeft: 'auto', alignSelf: 'center' }}>{prog.done}/{prog.total} steps</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Manager tools */}
      {manager && (
        <Card style={{ marginBottom: '2rem' }}>
          <div className="row between" style={{ alignItems: 'center' }}>
            <div className="fw-6" style={{ color: 'var(--ink)' }}><Icon name="shield" size={15} /> Manager: assign a custom module</div>
            <Button size="sm" variant={adding ? 'ghost' : 'primary'} onClick={() => setAdding(a => !a)}><Icon name={adding ? 'x' : 'plus'} size={14} /> {adding ? 'Cancel' : 'New module'}</Button>
          </div>
          {adding && <CustomModuleForm onDone={() => setAdding(false)} toast={toast} />}
          <div className="t-sm muted" style={{ marginTop: '.6rem' }}>Custom modules become required for the roles you assign them to. Anyone with access to that area must complete it.</div>
        </Card>
      )}

      {/* Archive */}
      <div className="row between" style={{ alignItems: 'center', marginBottom: '.6rem' }}>
        <span className="fw-6" style={{ color: 'var(--ink)', fontSize: '1.05rem' }}>Session archive</span>
        <span className="t-sm muted">{manager ? 'Team training history' : 'Your training history'} - like a recorded call</span>
      </div>
      {sessions.length === 0 ? (
        <EmptyState icon="~" title="No sessions yet" body="Start a training session and walk a module. When you end it, you get a concise summary here with the full notes behind it - the way an advanced note-taker recaps a call." />
      ) : (
        <div className="col gap-2">
          {sessions.map(s => (
            <Card key={s.id} className="col" style={{ gap: '.4rem' }}>
              <div className="row between wrap" style={{ alignItems: 'center', gap: '.5rem' }}>
                <div className="row gap-2" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <Badge tone="info">{s.durationMin} min</Badge>
                  <span className="fw-6" style={{ color: 'var(--ink)' }}>{s.userName}</span>
                  <span className="t-xs muted">{s.userRole}</span>
                  <span className="t-sm muted">{relTime(s.endedAt)}</span>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setOpenNotes(openNotes === s.id ? null : s.id)}>
                  <Icon name="fileText" size={14} /> {openNotes === s.id ? 'Hide notes' : 'Full notes'}
                </button>
              </div>
              <div className="t-sm" style={{ color: 'var(--ink-2)', lineHeight: 1.5 }}>{s.summary}</div>
              {openNotes === s.id && (
                <pre className="tn-notes">{s.aiNotes || s.notes || 'No detailed notes.'}</pre>
              )}
            </Card>
          ))}
        </div>
      )}

      <TrainingStyles />
    </div>
  );
}

function CustomModuleForm({ onDone, toast }) {
  const [title, setTitle] = useState('');
  const [blurb, setBlurb] = useState('');
  const [minutes, setMinutes] = useState(5);
  const [level, setLevel] = useState('Core');
  const [roleTarget, setRoleTarget] = useState('all');
  const [stepsText, setStepsText] = useState('');
  const save = () => {
    if (!title.trim()) return toast('Give the module a title', 'risk');
    const steps = stepsText.split(/\n/).map(l => l.trim()).filter(Boolean).map(l => {
      const [t, ...rest] = l.split('|');
      return { title: t.trim(), detail: rest.join('|').trim() };
    });
    addCustomModule({ title, blurb, minutes, level, roles: [roleTarget], steps });
    toast('Custom module assigned');
    onDone();
  };
  return (
    <div className="col gap-2" style={{ marginTop: '.8rem' }}>
      <div className="row gap-2 wrap">
        <Field label="Title" style={{ flex: 1, minWidth: 200 }}><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Our discount approval process" /></Field>
        <Field label="Minutes"><Input type="number" value={minutes} onChange={e => setMinutes(e.target.value)} style={{ width: 90 }} /></Field>
        <Field label="Level"><Select value={level} onChange={e => setLevel(e.target.value)}><option>Start here</option><option>Core</option><option>Power up</option><option>Admin</option></Select></Field>
        <Field label="Required for"><Select value={roleTarget} onChange={e => setRoleTarget(e.target.value)}><option value="all">Everyone</option><option value="rep">Reps</option><option value="manager">Managers</option></Select></Field>
      </div>
      <Field label="Blurb"><Input value={blurb} onChange={e => setBlurb(e.target.value)} placeholder="One line on what this covers." /></Field>
      <Field label="Steps" hint="One per line. Use 'Title | detail' to add detail."><Textarea rows={3} value={stepsText} onChange={e => setStepsText(e.target.value)} placeholder={'Where to find it | Settings > Approvals\nWho approves what'} /></Field>
      <div><Button size="sm" variant="primary" onClick={save}><Icon name="check" size={14} /> Assign module</Button></div>
    </div>
  );
}

function TrainingStyles() {
  return (
    <style>{`
    .tn-progress { background: var(--paper); border: 1px solid var(--line); border-radius: 14px; padding: 16px; margin-top: 1.25rem; }
    .tn-bar { height: 10px; border-radius: 999px; background: var(--n-100); overflow: hidden; }
    .tn-bar-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--ai), var(--ai-600)); transition: width .5s cubic-bezier(.22,1,.36,1); }
    .tn-active { display: flex; align-items: center; gap: 9px; margin-top: 12px; font-size: 13px; color: var(--ai-600); font-weight: 600; flex-wrap: wrap; }
    .tn-active-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--ai); box-shadow: 0 0 0 3px rgba(124,92,247,.2); flex: none; }
    .tn-ico { width: 40px; height: 40px; border-radius: 11px; flex: none; display: grid; place-items: center; }
    .tn-level { font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 999px; }
    .tn-steps { display: flex; flex-direction: column; gap: 5px; }
    .tn-step { display: flex; align-items: flex-start; gap: 10px; text-align: left; width: 100%; font-family: inherit; cursor: pointer;
      background: var(--n-25); border: 1px solid var(--line); border-radius: 10px; padding: 9px 11px; transition: border-color .14s, background .14s, transform .14s; }
    .tn-step:hover { border-color: var(--ai); background: var(--ai-50); transform: translateX(2px); }
    .tn-step[data-done="true"] { background: var(--ok-bg); border-color: rgba(26,159,109,.3); }
    .tn-step-check { width: 22px; height: 22px; flex: none; border-radius: 50%; background: var(--paper); border: 1px solid var(--line-strong); color: var(--n-600); font-size: 12px; font-weight: 800; display: grid; place-items: center; margin-top: 1px; }
    .tn-step:hover .tn-step-check { background: var(--ai); border-color: var(--ai); color: #fff; }
    .tn-step[data-done="true"] .tn-step-check { background: var(--ok); border-color: var(--ok); color: #fff; }
    .tn-step-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
    .tn-step-title { font-size: 13.5px; font-weight: 700; color: var(--ink); }
    .tn-step-detail { font-size: 12px; color: var(--n-600); line-height: 1.4; }
    .tn-step-go { color: var(--n-400); flex: none; margin-top: 3px; }
    .tn-step:hover .tn-step-go { color: var(--ai-600); }
    .tn-notes { margin: 6px 0 0; background: #0e1019; color: #d7dbe6; border-radius: 10px; padding: 13px; font-size: 12.5px; line-height: 1.55; white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; max-height: 320px; overflow: auto; }
    `}</style>
  );
}
