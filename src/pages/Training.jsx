// Training - Ardovo's self-serve implementation trainer. Replaces the human
// onboarding team: guided modules, a live "training session" that Rook drives
// by voice or chat, and Zoom-style session summaries you can revisit. Each
// step either takes you to the real screen or asks Rook to do the thing with
// you. Reads/writes the local-first training engine (src/lib/training.js).
// NO em-dash / en-dash. ASCII hyphen only.
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SectionHeader, Card, Button, Badge, StatCard, EmptyState, useToast, relTime,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import {
  MODULES, useTraining, startSession, endSession, logStep, logAsk, trainingStats,
} from '../lib/training.js';

function askRook(prompt, training = true) {
  window.dispatchEvent(new CustomEvent('rally:rook', { detail: { open: true, prompt, training } }));
}

export default function Training() {
  const { sessions, active } = useTraining();
  const nav = useNavigate();
  const toast = useToast();
  const stats = trainingStats();

  const doStep = (moduleId, step) => {
    logStep(moduleId, step.title);
    if (step.ask) { logAsk(step.ask); askRook(step.ask); }
    else if (step.to) { nav(step.to); }
    if (!step.ask) toast('Step logged to your training session');
  };

  const toggleSession = () => {
    if (active) {
      const s = endSession();
      toast(s ? 'Training session saved with a summary' : 'Session ended');
    } else {
      startSession();
      toast('Training session started. Every step you take is tracked.');
    }
  };

  return (
    <div className="fade-up">
      <SectionHeader
        title="Training"
        sub="Learn Ardovo at your own pace with a patient AI trainer. No year-long rollout, no burned hours - just you, Rook, and the real product."
        action={
          <Button variant={active ? 'ghost' : 'primary'} onClick={toggleSession}>
            <Icon name={active ? 'check' : 'rocket'} size={16} /> {active ? 'End + summarize session' : 'Start a training session'}
          </Button>
        }
      />

      {active && (
        <Card style={{ marginBottom: '1.25rem', borderColor: 'var(--ai)', background: 'var(--ai-50)' }}>
          <div className="row gap-2" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="row gap-2" style={{ alignItems: 'center', color: 'var(--ai-600)', fontWeight: 700 }}>
              <span style={{ width: 9, height: 9, borderRadius: 999, background: 'var(--ai)', boxShadow: '0 0 0 3px rgba(124,92,247,.2)' }} />
              Training in progress
            </span>
            <span className="t-sm muted">Started {relTime(active.startedAt)} - {active.steps.length} step{active.steps.length === 1 ? '' : 's'} so far. Turn on Rook voice mode and follow along.</span>
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => askRook('I just started a training session. Give me a quick tour of what I can learn.')}>
              <Icon name="sparkles" size={15} /> Ask Rook to guide me
            </button>
          </div>
        </Card>
      )}

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', marginBottom: '1.5rem' }}>
        <StatCard label="Sessions" value={stats.sessions} icon={<Icon name="rocket" size={18} />} />
        <StatCard label="Minutes trained" value={stats.minutes} icon={<Icon name="clock" size={18} />} />
        <StatCard label="Steps completed" value={stats.steps} icon={<Icon name="check" size={18} />} accent="var(--ok)" />
        <StatCard label="Modules touched" value={stats.modulesTouched} sub={`of ${MODULES.length}`} icon={<Icon name="book" size={18} />} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {MODULES.map(m => (
          <Card key={m.id} className="col" style={{ gap: '.7rem' }}>
            <div className="row gap-2" style={{ alignItems: 'center' }}>
              <span style={{ width: 38, height: 38, borderRadius: 11, flex: 'none', display: 'grid', placeItems: 'center', background: 'var(--ai-50)', color: 'var(--ai-600)' }}><Icon name={m.icon} size={19} /></span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="fw-6" style={{ color: 'var(--ink)' }}>{m.title}</div>
                <div className="t-xs muted">{m.level} - {m.minutes} min</div>
              </div>
            </div>
            <div className="t-sm muted">{m.blurb}</div>
            <div className="col gap-1" style={{ marginTop: '.2rem' }}>
              {m.steps.map((s, i) => (
                <button key={i} className="tr-step" onClick={() => doStep(m.id, s)}>
                  <span className="tr-step-num">{i + 1}</span>
                  <span className="tr-step-body">
                    <span className="tr-step-title">{s.title}</span>
                    <span className="tr-step-detail">{s.detail}</span>
                  </span>
                  <Icon name={s.ask ? 'sparkles' : 'chevronRight'} size={15} className="tr-step-go" />
                </button>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <SectionHeader title="Session history" sub="Every training session, summarized like a recorded call." />
      {sessions.length === 0 ? (
        <EmptyState icon="🎓" title="No sessions yet" body="Start a training session and walk through a module. When you end it, you get a summary here you can revisit anytime." />
      ) : (
        <div className="col gap-2">
          {sessions.map(s => (
            <Card key={s.id} className="col" style={{ gap: '.4rem' }}>
              <div className="row between wrap" style={{ alignItems: 'center', gap: '.5rem' }}>
                <div className="row gap-2" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <Badge tone="info">{s.durationMin} min</Badge>
                  <span className="fw-6" style={{ color: 'var(--ink)' }}>{s.stepsCompleted} steps</span>
                  <span className="t-sm muted">{relTime(s.endedAt)}</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => askRook(`Recap what I learned: ${s.summary}`)}><Icon name="sparkles" size={14} /> Recap with Rook</Button>
              </div>
              <div className="t-sm" style={{ color: 'var(--ink-2)', lineHeight: 1.5 }}>{s.summary}</div>
            </Card>
          ))}
        </div>
      )}

      <style>{`
      .tr-step { display: flex; align-items: flex-start; gap: 10px; text-align: left; width: 100%; font-family: inherit; cursor: pointer;
        background: var(--n-25); border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; transition: border-color .14s, background .14s, transform .14s; }
      .tr-step:hover { border-color: var(--ai); background: var(--ai-50); transform: translateX(2px); }
      .tr-step-num { width: 22px; height: 22px; flex: none; border-radius: 50%; background: var(--paper); border: 1px solid var(--line-strong); color: var(--n-600); font-size: 12px; font-weight: 800; display: grid; place-items: center; margin-top: 1px; }
      .tr-step:hover .tr-step-num { background: var(--ai); border-color: var(--ai); color: #fff; }
      .tr-step-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
      .tr-step-title { font-size: 14px; font-weight: 700; color: var(--ink); }
      .tr-step-detail { font-size: 12.5px; color: var(--n-600); line-height: 1.4; }
      .tr-step-go { color: var(--n-400); flex: none; margin-top: 3px; }
      .tr-step:hover .tr-step-go { color: var(--ai-600); }
      `}</style>
    </div>
  );
}
