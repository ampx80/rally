// InteractiveDemo - a compact, self-contained interactive Rook widget for the
// marketing homepage. The prospect clicks a canned prompt and watches Rook
// type, think, and assemble a real result on a live mini-canvas. Fully
// standalone (only react + react-router-dom + Icon + demo.css). Drop
// <InteractiveDemo /> anywhere inside the marketing shell.
// Pure setTimeout state machine + CSS spring primitives from marketing.css.
// Honors prefers-reduced-motion. NO em-dash / en-dash. ASCII hyphen only.
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/icons.jsx';
import './demo.css';

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const AV = ['#0e9f8f', '#0e9f8f', '#e0752d', '#7c5cf7', '#2563a8'];
function Ava({ name, i = 0, size = 24 }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2);
  return (
    <span style={{ width: size, height: size, borderRadius: '50%', background: AV[i % AV.length], color: '#fff', display: 'inline-grid', placeItems: 'center', fontSize: size * 0.4, fontWeight: 700, flex: 'none' }}>{initials}</span>
  );
}

function useCountUp(target, go, dur = 1000) {
  const [n, setN] = useState(go ? target : 0);
  useEffect(() => {
    if (!go) { setN(0); return; }
    if (reducedMotion()) { setN(target); return; }
    let raf, start;
    const step = (t) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / dur);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [go, target, dur]);
  return n;
}

/* ---------- compact canvases Rook builds ---------- */
function CanvasAccount({ stage }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {stage >= 1 && (
        <div className="m-arrive dmo-art-row">
          <span style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#0e9f8f,#7c5cf7)', display: 'grid', placeItems: 'center', color: '#fff', flex: 'none' }}><Icon name="building" size={15} /></span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 12.5 }}>Vertex Robotics</div>
            <div style={{ fontSize: 10.5, color: 'var(--m-ink3)' }}>Enterprise - 820 employees</div>
          </div>
          <span className="dmo-art-badge b-ok">NEW</span>
        </div>
      )}
      {stage >= 2 && (
        <div className="m-cascade" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['Nadia Vance', 'Marcus Bell', 'Priya Rao'].map((n, i) => (
            <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid var(--m-line2)', borderRadius: 999, padding: '4px 11px 4px 5px', boxShadow: 'var(--m-shadow-sm)', fontSize: 11.5, fontWeight: 600 }}>
              <Ava name={n} i={i} size={20} />{n.split(' ')[0]}
            </span>
          ))}
        </div>
      )}
      {stage >= 3 && (
        <div className="m-spring" style={{ background: '#fff', border: '1px solid rgba(14,159,143,.4)', borderRadius: 11, padding: '10px 12px', boxShadow: '0 12px 26px -14px rgba(14,159,143,.4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 12.5 }}>Enterprise Expansion</span>
            <span style={{ fontWeight: 800, color: 'var(--m-accent)', fontSize: 14 }}>$480K</span>
          </div>
          <div style={{ display: 'flex', gap: 7, marginTop: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#2563a8', background: 'rgba(37,99,168,.1)', padding: '3px 8px', borderRadius: 999 }}>QUALIFIED</span>
            <div style={{ flex: 1, height: 5, background: 'var(--m-line)', borderRadius: 99, overflow: 'hidden' }}>
              <div className="dmo-grow" style={{ width: '40%', height: '100%', background: 'var(--m-grad)', borderRadius: 99 }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CanvasSlipping({ stage }) {
  const rows = [
    { n: 'Ironclad Aerospace', d: '9 days past close', v: '$310K' },
    { n: 'Cascade Health', d: '4 days past close', v: '$220K' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {rows.slice(0, Math.min(2, stage)).map((r, i) => (
        <div key={r.n} className="m-arrive-l dmo-art-row is-flag" style={{ animationDelay: `${i * 0.12}s` }}>
          <span className="m-pulse" style={{ width: 8, height: 8, borderRadius: 99, background: '#c0392b', flex: 'none' }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.n}</div>
            <div style={{ fontSize: 10.5, color: '#c0392b', fontWeight: 600 }}>{r.d}</div>
          </div>
          <span style={{ marginLeft: 'auto', fontWeight: 800, fontSize: 13, flex: 'none' }}>{r.v}</span>
        </div>
      ))}
      {stage >= 3 && (
        <div className="m-pop" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(100deg,#0e9f8f,#7c5cf7)', color: '#fff', borderRadius: 11, padding: '9px 12px', fontSize: 12, fontWeight: 700, boxShadow: '0 12px 26px -12px rgba(14,159,143,.55)' }}>
          <Icon name="mail" size={14} /> 2 save emails drafted, ready to send
        </div>
      )}
    </div>
  );
}

function CanvasForecast({ stage }) {
  const n = useCountUp(1.24, stage >= 1, 1000);
  const bars = [['New business', 62], ['Expansion', 84], ['Renewal', 48]];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {stage >= 1 && (
        <div className="m-arrive">
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--m-ink3)' }}>Committed this quarter</div>
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-.03em', color: 'var(--m-ink)', lineHeight: 1, marginTop: 4 }}>${n.toFixed(2)}M</div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 800, color: 'var(--m-teal)', background: 'rgba(14,159,154,.12)', borderRadius: 999, padding: '3px 10px', marginTop: 9 }}>
            <Icon name="arrowUp" size={12} /> +18% vs last quarter
          </span>
        </div>
      )}
      {stage >= 2 && (
        <div className="m-cascade" style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {bars.map(([label, pct]) => (
            <div key={label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: 'var(--m-ink2)', marginBottom: 4 }}>{label}</div>
              <div style={{ height: 8, borderRadius: 99, background: 'var(--m-line)', overflow: 'hidden' }}>
                <div className="dmo-grow" style={{ width: `${pct}%`, height: '100%', background: 'var(--m-grad)', borderRadius: 99 }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const PROMPTS = [
  { id: 'account', q: 'Set up Vertex Robotics as an enterprise account', a: 'Done. Company, buying committee, and a $480K deal are live.', icon: 'rocket', Canvas: CanvasAccount, steps: 3 },
  { id: 'slipping', q: 'Which deals are slipping this quarter?', a: 'Two deals are past close, worth $530K. I drafted the saves.', icon: 'activity', Canvas: CanvasSlipping, steps: 3 },
  { id: 'forecast', q: 'What is my Q3 forecast?', a: 'You are committed at $1.24M, up 18%. Here is the mix.', icon: 'trendUp', Canvas: CanvasForecast, steps: 2 },
];

export default function InteractiveDemo() {
  const [activeId, setActiveId] = useState(null);
  const [phase, setPhase] = useState('idle'); // idle | typing | thinking | answer
  const [typed, setTyped] = useState('');
  const [stage, setStage] = useState(0);
  const timers = useRef([]);

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const T = (fn, ms) => { const id = setTimeout(fn, ms); timers.current.push(id); };

  useEffect(() => clear, []);

  const run = (p) => {
    clear();
    setActiveId(p.id); setTyped(''); setStage(0);
    if (reducedMotion()) {
      setPhase('answer'); setTyped(p.q); setStage(p.steps);
      return;
    }
    setPhase('typing');
    const chars = p.q.split('');
    chars.forEach((_, i) => T(() => setTyped(p.q.slice(0, i + 1)), 60 + i * 26));
    const done = 60 + chars.length * 26;
    T(() => setPhase('thinking'), done + 240);
    T(() => { setPhase('answer'); setStage(1); }, done + 1300);
    for (let s = 2; s <= p.steps; s++) T(() => setStage(s), done + 1300 + (s - 1) * 650);
  };

  const active = PROMPTS.find(p => p.id === activeId);

  return (
    <div className="dmo-embed">
      <div className="dmo-embed-head">
        <span className="dmo-embed-mark"><Icon name="zap" size={13} fill="currentColor" stroke={0} /></span>
        <span className="dmo-embed-title">Ardovo</span>
        <span className="dmo-embed-live"><span className="mkt-dot m-pulse" /> Rook is live</span>
      </div>

      <div className="dmo-embed-body">
        {/* interaction column */}
        <div className="dmo-embed-left">
          <span className="dmo-embed-label">Ask Rook</span>
          <div className="dmo-embed-chips">
            {PROMPTS.map(p => (
              <button key={p.id} className={`dmo-chip${activeId === p.id ? ' is-active' : ''}`} onClick={() => run(p)} style={{ justifyContent: 'flex-start' }}>
                <Icon name={p.icon} size={15} /> {p.q}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 'auto', fontSize: 11.5, color: 'var(--m-ink3)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon name="command" size={13} /> Click a prompt to watch Rook work
          </div>
        </div>

        {/* live canvas column */}
        <div className="dmo-embed-right">
          <span className="dmo-embed-label" style={{ marginBottom: 11 }}>Rook is doing the work</span>
          <div className="dmo-embed-canvas">
            {phase === 'idle' && (
              <div className="dmo-embed-empty">
                <span>Pick a question on the left.<br />Rook types, thinks, and builds it here.</span>
              </div>
            )}
            {phase !== 'idle' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                <div className="dmo-q" style={{ maxWidth: '100%' }}>
                  {typed}{phase === 'typing' && <span className="m-cursor" style={{ background: '#fff' }} />}
                </div>
                {phase === 'thinking' && (
                  <div className="dmo-think"><span className="m-think" style={{ display: 'inline-flex' }}><span /><span /><span /></span> Reading your workspace</div>
                )}
                {phase === 'answer' && active && (
                  <div className="m-arrive">
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--m-ink2)', lineHeight: 1.45, marginBottom: 4 }}>{active.a}</div>
                    <active.Canvas stage={stage} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="dmo-embed-foot">
        <span className="dmo-embed-foot-note">This is a live sandbox. No signup needed.</span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to="/demo" className="mkt-btn mkt-btn-ghost" style={{ padding: '9px 16px' }}>
            <Icon name="sparkles" size={16} /> Take the full tour
          </Link>
          <Link to="/app" className="mkt-btn mkt-btn-primary" style={{ padding: '9px 18px' }}>
            Start free <Icon name="chevronRight" size={16} />
          </Link>
        </span>
      </div>
    </div>
  );
}
