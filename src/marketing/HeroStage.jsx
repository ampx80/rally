// HeroStage - the hero's living centerpiece. A choreographed, LOOPING timeline
// where Rook builds a whole account from one typed sentence: a command bar types
// the prompt, thinks, then product cards MATERIALIZE one by one - company, buying
// committee, a deal that slides into a pipeline lane and advances a stage, a
// forecast sparkline that draws itself, and a task checklist that ticks off. A
// "Built in 3.2s" stamp pulses, then it gracefully resets and loops. Pure
// setTimeout state machine + CSS spring primitives. Honors prefers-reduced-motion
// by rendering the final assembled state statically. Transform/opacity only.
// NO em-dash / en-dash. ASCII hyphen only.
import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/icons.jsx';

const SENTENCE = 'Set up Vertex Robotics - enterprise expansion, committee of 5';

const COMMITTEE = [
  ['Nadia Vance', 'VP Engineering', '#5b4bf5'],
  ['Marcus Bell', 'Head of Ops', '#0e9f9a'],
  ['Priya Rao', 'CFO', '#e0752d'],
  ['Owen Cole', 'IT Director', '#a855f7'],
  ['Lena Cruz', 'Procurement', '#2563a8'],
];

const STAGES = ['Discovery', 'Qualified', 'Proposal', 'Won'];

const TASKS = [
  'Enrich company from domain',
  'Add buying committee (5)',
  'Open expansion deal - $480K',
  'Draft intro sequence',
  'Schedule discovery call',
];

// Timeline gates (step >= gate reveals a beat)
const G_COMPANY = 1;
const G_CONTACTS = 2;
const G_DEAL = 3;
const G_ADVANCE = 4;
const G_SPARK = 5;
const G_TASK0 = 6; // tasks tick at 6,7,8,9,10
const FINAL = 11;

function Avatar({ name, color, size = 30 }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2);
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%', background: color, color: '#fff',
      display: 'inline-grid', placeItems: 'center', fontSize: size * 0.38, fontWeight: 700,
      flex: 'none', boxShadow: '0 2px 6px rgba(16,20,32,.18)', border: '2px solid #fff',
    }}>{initials}</span>
  );
}

// float wrapper (idle bob) + arrive wrapper (spring entrance, remounts each loop)
function StageCard({ show, float = 'm-float-c', delayFloat = 0, style, children }) {
  return (
    <div className={float} style={{ animationDelay: `${delayFloat}s`, ...style }}>
      {show && <div className="m-spring mkt-stage-card">{children}</div>}
    </div>
  );
}

export default function HeroStage() {
  const reduced = typeof window !== 'undefined' &&
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [typed, setTyped] = useState(reduced ? SENTENCE.length : 0);
  const [thinking, setThinking] = useState(false);
  const [step, setStep] = useState(reduced ? FINAL : 0);
  const [stamp, setStamp] = useState(reduced);
  const timers = useRef([]);

  useEffect(() => {
    if (reduced) return;
    let cancelled = false;
    const T = (fn, ms) => { const id = setTimeout(fn, ms); timers.current.push(id); return id; };

    function run() {
      if (cancelled) return;
      setTyped(0); setThinking(false); setStep(0); setStamp(false);

      let i = 0;
      const type = () => {
        if (cancelled) return;
        i += 1; setTyped(i);
        if (i < SENTENCE.length) T(type, 30 + Math.random() * 34);
        else { T(() => setThinking(true), 260); T(afterThink, 1180); }
      };
      T(type, 520);

      function afterThink() {
        if (cancelled) return;
        setThinking(false);
        T(() => setStep(G_COMPANY), 80);
        T(() => setStep(G_CONTACTS), 640);
        T(() => setStep(G_DEAL), 1260);
        T(() => setStep(G_ADVANCE), 1980);
        T(() => setStep(G_SPARK), 2680);
        T(() => setStep(G_TASK0), 3380);
        T(() => setStep(G_TASK0 + 1), 3720);
        T(() => setStep(G_TASK0 + 2), 4060);
        T(() => setStep(G_TASK0 + 3), 4400);
        T(() => setStep(G_TASK0 + 4), 4740);
        T(() => setStamp(true), 5200);
        T(() => run(), 8800); // graceful reset + loop
      }
    }
    run();
    return () => { cancelled = true; timers.current.forEach(clearTimeout); timers.current = []; };
  }, [reduced]);

  const dealStage = step >= G_ADVANCE ? 1 : 0; // Discovery -> Qualified

  return (
    <div className="mkt-stage m-tilt" aria-hidden>
      {/* Rook command bar */}
      <div className="mkt-stage-bar">
        <span className="mkt-stage-rook">
          <Icon name="sparkles" size={16} />
        </span>
        <div className="mkt-stage-prompt">
          <span className="mkt-stage-promptlabel">Ask Rook</span>
          <div className="mkt-stage-typed">
            {SENTENCE.slice(0, typed)}
            {step === 0 && !thinking && typed < SENTENCE.length && <span className="m-cursor" />}
            {thinking && (
              <span className="m-think mkt-stage-think" aria-label="Rook thinking">
                <span /><span /><span />
              </span>
            )}
          </div>
        </div>
        <span className="mkt-stage-live">
          <span className="mkt-dot m-pulse" /> {stamp ? 'Done' : 'Building'}
        </span>
      </div>

      {/* Workspace where Rook's artifacts materialize */}
      <div className="mkt-stage-grid">
        {/* Company card */}
        <StageCard show={step >= G_COMPANY} float="m-float-a" delayFloat={0.1} style={{ gridColumn: '1 / 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <span className="mkt-stage-mono">VR</span>
            <div style={{ minWidth: 0 }}>
              <div className="mkt-stage-title">Vertex Robotics</div>
              <div className="mkt-stage-sub">vertexrobotics.com</div>
            </div>
            <span className="mkt-stage-badge">NEW</span>
          </div>
          <div className="mkt-stage-metrics">
            <div><span className="mkt-stage-metric">$4.2M</span><span className="mkt-stage-metriclabel">ARR</span></div>
            <div><span className="mkt-stage-metric">820</span><span className="mkt-stage-metriclabel">Employees</span></div>
            <div><span className="mkt-stage-metric">Ent</span><span className="mkt-stage-metriclabel">Segment</span></div>
          </div>
        </StageCard>

        {/* Buying committee */}
        <StageCard show={step >= G_CONTACTS} float="m-float-b" delayFloat={0.5} style={{ gridColumn: '2 / 3' }}>
          <div className="mkt-stage-cardhead">
            <Icon name="users" size={14} /> Buying committee
            <span className="mkt-stage-count">5</span>
          </div>
          <div className="mkt-stage-avatars">
            {COMMITTEE.map(([n, role, c], idx) => (
              <span key={n} className="m-pop mkt-stage-avwrap" style={{ animationDelay: `${idx * 0.09}s`, zIndex: 5 - idx }}>
                <Avatar name={n} color={c} size={32} />
              </span>
            ))}
          </div>
          <div className="mkt-stage-sub" style={{ marginTop: 9 }}>Nadia Vance <span style={{ opacity: .55 }}>+ 4 stakeholders</span></div>
        </StageCard>

        {/* Deal card + pipeline lane */}
        <StageCard show={step >= G_DEAL} float="m-float-c" delayFloat={0.2} style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div className="mkt-stage-title">Enterprise Expansion</div>
              <div className="mkt-stage-sub">Vertex Robotics</div>
            </div>
            <span className="mkt-stage-amount">$480K</span>
          </div>
          <div className="mkt-stage-lane">
            {STAGES.map((s, idx) => (
              <div key={s} className={`mkt-stage-lanecell${idx <= dealStage ? ' is-on' : ''}${idx === dealStage ? ' is-cur' : ''}`}>
                <span className="mkt-stage-lanebar">
                  {idx <= dealStage && <span className={`mkt-stage-lanefill${idx === dealStage ? ' m-sweep' : ''}`} />}
                </span>
                <span className="mkt-stage-lanelabel">{s}</span>
              </div>
            ))}
          </div>
        </StageCard>

        {/* Forecast sparkline */}
        <StageCard show={step >= G_SPARK} float="m-float-a" delayFloat={0.35} style={{ gridColumn: '1 / 2' }}>
          <div className="mkt-stage-cardhead">
            <Icon name="trendUp" size={14} /> Forecast
            <span className="mkt-stage-trend">+18%</span>
          </div>
          <div className="mkt-stage-forecast">$1.24M</div>
          <svg className="mkt-spark" viewBox="0 0 200 56" preserveAspectRatio="none" aria-hidden>
            <defs>
              <linearGradient id="mktSparkStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#5b4bf5" />
                <stop offset="0.55" stopColor="#a855f7" />
                <stop offset="1" stopColor="#0e9f9a" />
              </linearGradient>
              <linearGradient id="mktSparkFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="rgba(91,75,245,.20)" />
                <stop offset="1" stopColor="rgba(91,75,245,0)" />
              </linearGradient>
            </defs>
            <path className="mkt-spark-area" d="M2 44 L34 40 L66 42 L98 30 L130 32 L162 18 L198 8 L198 56 L2 56 Z" fill="url(#mktSparkFill)" />
            <path className={`mkt-spark-line${step >= G_SPARK ? ' m-draw' : ''}`} d="M2 44 L34 40 L66 42 L98 30 L130 32 L162 18 L198 8"
              fill="none" stroke="url(#mktSparkStroke)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </StageCard>

        {/* Task checklist */}
        <StageCard show={step >= G_DEAL} float="m-float-b" delayFloat={0.65} style={{ gridColumn: '2 / 3' }}>
          <div className="mkt-stage-cardhead">
            <Icon name="check" size={14} /> Tasks
            <span className="mkt-stage-count">{Math.max(0, Math.min(5, step - G_TASK0 + 1))}/5</span>
          </div>
          <div className="mkt-stage-tasks">
            {TASKS.map((t, idx) => {
              const done = step >= G_TASK0 + idx;
              return (
                <div key={t} className={`mkt-stage-task${done ? ' is-done' : ''}`}>
                  <span className={`mkt-stage-check${done ? ' m-pop' : ''}`}>
                    {done && <Icon name="check" size={11} stroke={3.2} />}
                  </span>
                  <span>{t}</span>
                </div>
              );
            })}
          </div>
        </StageCard>
      </div>

      {/* Success stamp */}
      <div className={`mkt-stage-stamp${stamp ? ' is-in' : ''}`}>
        <span className="mkt-stage-stampring m-won">
          <Icon name="check" size={16} stroke={3} />
        </span>
        <div>
          <div className="mkt-stage-stamptitle">Built in 3.2s</div>
          <div className="mkt-stage-sub">Company, committee, deal, and tasks - live.</div>
        </div>
      </div>
    </div>
  );
}
