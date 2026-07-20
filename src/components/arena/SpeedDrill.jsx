// SPEED DRILL mode. Timed checklist tasks like "create a deal" or "build a
// report". The rep starts a timer, checks off each step as they mentally run
// it, then finishes. Graded on speed (vs a target time) + completeness. A
// best-time leaderboard (rivals seeded from the real team + your personal
// best) makes it competitive. Deterministic engine in src/lib/arena.js.
// ASCII only.
import React, { useEffect, useRef, useState } from 'react';
import { Card, Button, Badge, SectionHeader } from '../UI.jsx';
import { Icon } from '../icons.jsx';
import { DRILLS, drillById, gradeDrill, drillLeaderboard, recordResult, useArena } from '../../lib/arena.js';
import ResultsScreen from './ResultsScreen.jsx';

const fmtTime = (ms) => {
  const s = Math.floor(ms / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return `${s}.${String(cs).padStart(2, '0')}s`;
};

function Leaderboard({ drillId }) {
  const progress = useArena();
  const rows = drillLeaderboard(drillId, progress);
  return (
    <Card pad>
      <SectionHeader title="Best times" sub="Rival times are simulated pace targets. Only your own completed runs are real." />
      <div className="col gap-1" style={{ marginTop: '.5rem' }}>
        {rows.map((r) => (
          <div key={r.name + r.rank} className="row between" style={{
            padding: '.5rem .7rem', borderRadius: 'var(--r-sm)',
            background: r.you ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
            border: r.you ? '1px solid color-mix(in srgb, var(--accent) 35%, transparent)' : '1px solid transparent',
          }}>
            <div className="row gap-2" style={{ alignItems: 'center' }}>
              <span className="fw-7" style={{ width: 22, color: r.rank === 1 ? 'var(--warn)' : 'var(--n-600)' }}>{r.rank}</span>
              <span className={r.you ? 'fw-7' : ''}>{r.name}{r.you ? ' (you)' : ''}</span>
            </div>
            <span className="fw-6" style={{ fontFamily: 'var(--font-mono)' }}>{fmtTime(r.ms)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function SpeedDrill({ roleId, onExit }) {
  const [drillId, setDrillId] = useState(null);
  const [phase, setPhase] = useState('idle'); // idle | running | done
  const [checked, setChecked] = useState({});
  const [startAt, setStartAt] = useState(0);
  const [now, setNow] = useState(0);
  const [result, setResult] = useState(null);
  const [awarded, setAwarded] = useState([]);
  const [certifiedNow, setCertifiedNow] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  function begin(id) {
    setDrillId(id);
    setChecked({});
    setResult(null);
    const t = Date.now();
    setStartAt(t);
    setNow(t);
    setPhase('running');
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setNow(Date.now()), 50);
  }

  function toggleStep(i) {
    if (phase !== 'running') return;
    setChecked((c) => ({ ...c, [i]: !c[i] }));
  }

  function finish() {
    if (timerRef.current) clearInterval(timerRef.current);
    const drill = drillById(drillId);
    const elapsed = Date.now() - startAt;
    const count = Object.values(checked).filter(Boolean).length;
    const graded = gradeDrill(drill, elapsed, count);
    const rec = recordResult('drill', roleId, graded);
    setAwarded(rec.awarded);
    setCertifiedNow(rec.certifiedNow);
    setResult(graded);
    setPhase('done');
  }

  if (result) {
    return (
      <div className="col gap-3">
        <ResultsScreen
          result={result}
          awarded={awarded}
          certifiedNow={certifiedNow}
          retryLabel="Run it again"
          onRetry={() => begin(drillId)}
          onExit={onExit}
        />
        <div style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>
          <Leaderboard drillId={drillId} />
        </div>
      </div>
    );
  }

  /* ---- drill picker ---- */
  if (phase === 'idle') {
    return (
      <div className="col gap-3">
        <div className="row between wrap gap-2">
          <SectionHeader title="Pick a drill" sub="Beat the clock, log a clean record. Speed is a skill." />
          <Button variant="ghost" onClick={onExit}><Icon name="arrowLeft" size={16} /> Back</Button>
        </div>
        <div className="ar-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {DRILLS.map((d) => (
            <Card
              key={d.id}
              className="ar-card"
              tabIndex={0}
              role="button"
              onClick={() => begin(d.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); begin(d.id); } }}
            >
              <div className="row between" style={{ alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--accent)' }}><Icon name={d.icon} size={24} /></span>
                <Badge tone="info">{Math.round(d.targetMs / 1000)}s target</Badge>
              </div>
              <div className="fw-7" style={{ marginTop: '.6rem' }}>{d.title}</div>
              <div className="t-sm muted" style={{ marginTop: '.35rem', lineHeight: 1.5 }}>{d.scenario}</div>
              <div className="t-xs muted" style={{ marginTop: '.6rem' }}>{d.steps.length} steps</div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  /* ---- running ---- */
  const drill = drillById(drillId);
  const elapsed = now - startAt;
  const count = Object.values(checked).filter(Boolean).length;
  const overTarget = elapsed > drill.targetMs;
  return (
    <div className="col gap-2" style={{ maxWidth: 720, margin: '0 auto' }}>
      <Card pad>
        <div className="row between wrap gap-2" style={{ alignItems: 'center' }}>
          <div>
            <div className="fw-7 row gap-2" style={{ alignItems: 'center' }}>
              <span style={{ color: 'var(--accent)' }}><Icon name={drill.icon} size={20} /></span>
              {drill.title}
            </div>
            <div className="t-sm muted" style={{ marginTop: '.25rem' }}>{drill.scenario}</div>
          </div>
          <div className="col ar-hud" style={{ alignItems: 'flex-end' }}>
            <div className={`ar-timer-live ar-hud-timer${overTarget ? ' ar-hud-timer--over' : ''}`} style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 800, color: overTarget ? 'var(--risk)' : 'var(--ink)' }}>
              {fmtTime(elapsed)}
            </div>
            <div className="t-xs muted">target {Math.round(drill.targetMs / 1000)}s</div>
          </div>
        </div>
      </Card>

      <Card pad>
        <SectionHeader title={`Steps (${count}/${drill.steps.length})`} sub="Check each step as you run it in your head." />
        <div className="col gap-2" style={{ marginTop: '.5rem' }}>
          {drill.steps.map((step, i) => {
            const done = !!checked[i];
            return (
              <div
                key={i}
                className={`ar-step row gap-2 ${done ? 'ar-step-done' : ''}`}
                role="checkbox"
                aria-checked={done}
                tabIndex={0}
                onClick={() => toggleStep(i)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleStep(i); } }}
                style={{ alignItems: 'center', padding: '.7rem .85rem', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)' }}
              >
                <span style={{
                  width: 22, height: 22, flex: 'none', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: done ? 'var(--ok)' : 'transparent', border: done ? 'none' : '1.5px solid var(--line-strong)', color: '#fff',
                }}>
                  {done && <Icon name="check" size={14} />}
                </span>
                <span style={{ textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--n-600)' : 'var(--ink)' }}>{step}</span>
              </div>
            );
          })}
        </div>
        <div className="row between wrap gap-2" style={{ marginTop: '1rem' }}>
          <Button variant="ghost" onClick={() => { if (timerRef.current) clearInterval(timerRef.current); setPhase('idle'); setDrillId(null); }}>Cancel</Button>
          <Button variant="primary" onClick={finish}><Icon name="flag" size={15} /> Finish and score</Button>
        </div>
      </Card>

      <Leaderboard drillId={drillId} />
    </div>
  );
}
