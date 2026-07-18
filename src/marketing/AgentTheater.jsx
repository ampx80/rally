// AgentTheater - the homepage centerpiece. A self-playing Rook session:
// it types its own prompts, thinks, replies, and REAL UI artifacts animate
// onto a live workspace canvas (deal cards into pipeline columns, contact
// avatars, forecast counters, a Won celebration). Loops forever. Pure
// setTimeout state machine + CSS spring primitives. ASCII hyphens only.
import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/icons.jsx';

const AV = ['#5b4bf5', '#0e9f9a', '#e0752d', '#a855f7', '#2563a8'];
function Ava({ name, i = 0, size = 26 }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2);
  return <span style={{ width: size, height: size, borderRadius: '50%', background: AV[i % AV.length], color: '#fff', display: 'inline-grid', placeItems: 'center', fontSize: size * .38, fontWeight: 700, flex: 'none' }}>{initials}</span>;
}

/* One scenario = the script the theater performs. */
const SCENARIOS = [
  {
    q: 'Set up Meridian Health as an enterprise account with a $240K deal',
    a: 'Done. Company, buying committee, deal, and first tasks are live.',
    canvas: 'account',
  },
  {
    q: 'Which deals are slipping this quarter?',
    a: 'Two deals are past close date, worth $530K. I drafted the save emails.',
    canvas: 'slipping',
  },
  {
    q: 'Move the Vertex deal to Closed Won',
    a: 'Moved. That is $420K closed - your forecast just jumped.',
    canvas: 'won',
  },
  {
    q: 'Ardovo the team on the Northwind account',
    a: 'Tasks assigned to Jordan, Simone, and Theo. Kickoff is Friday 10am.',
    canvas: 'team',
  },
];

function useCountUp(target, go, dur = 1100) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!go) { setN(0); return; }
    let raf, start;
    const step = (t) => { if (!start) start = t; const p = Math.min(1, (t - start) / dur); setN(Math.round(target * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [go, target, dur]);
  return n;
}

/* ---------- Canvas payloads (what Rook "builds") ---------- */
function CanvasAccount({ stage }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {stage >= 1 && (
        <div className="m-arrive" style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid var(--m-line2)', borderRadius: 12, padding: '10px 12px', boxShadow: 'var(--m-shadow-sm)' }}>
          <span style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#5b4bf5,#a855f7)', display: 'grid', placeItems: 'center', color: '#fff' }}><Icon name="building" size={17} /></span>
          <div><div style={{ fontWeight: 700, fontSize: 14 }}>Meridian Health</div><div style={{ fontSize: 11.5, color: 'var(--m-ink3)' }}>Healthcare - 1001-5000 - Boston, MA</div></div>
          <span style={{ marginLeft: 'auto', fontSize: 10.5, fontWeight: 700, color: 'var(--m-teal)', background: 'rgba(14,159,154,.1)', padding: '3px 8px', borderRadius: 999 }}>CREATED</span>
        </div>
      )}
      {stage >= 2 && (
        <div className="m-cascade" style={{ display: 'flex', gap: 8 }}>
          {['Dana Whitfield', 'Marcus Osei', 'Priya Anand'].map((n, i) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fff', border: '1px solid var(--m-line2)', borderRadius: 999, padding: '5px 12px 5px 6px', boxShadow: 'var(--m-shadow-sm)', fontSize: 12, fontWeight: 600 }}>
              <Ava name={n} i={i} size={22} />{n.split(' ')[0]}
            </div>
          ))}
        </div>
      )}
      {stage >= 3 && (
        <div className="m-arrive" style={{ background: '#fff', border: '1px solid rgba(91,75,245,.4)', borderRadius: 12, padding: '10px 12px', boxShadow: '0 12px 28px -12px rgba(91,75,245,.4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 13.5 }}>Enterprise platform rollout</span>
            <span style={{ fontWeight: 800, color: 'var(--m-accent)' }}>$240K</span>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: '#2563a8', background: 'rgba(37,99,168,.1)', padding: '3px 8px', borderRadius: 999 }}>QUALIFIED</span>
            <div style={{ flex: 1, height: 5, background: 'var(--m-line)', borderRadius: 99, overflow: 'hidden' }}><div className="m-sweep" style={{ width: '25%', height: '100%', background: 'linear-gradient(90deg,#5b4bf5,#a855f7)', borderRadius: 99 }} /></div>
          </div>
        </div>
      )}
      {stage >= 4 && (
        <div className="m-cascade" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {['Discovery call - Thursday', 'Send security packet'].map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--m-ink2)' }}>
              <span style={{ width: 17, height: 17, borderRadius: 5, background: 'var(--m-teal)', display: 'grid', placeItems: 'center', color: '#fff' }}><Icon name="check" size={11} stroke={3} /></span>{t}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CanvasSlipping({ stage }) {
  const rows = [
    { n: 'Ironclad Aerospace - Renewal', v: '$310K', d: '9 days late' },
    { n: 'Cascade Health - Expansion', v: '$220K', d: '4 days late' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.slice(0, stage >= 2 ? 2 : stage).map((r, i) => (
        <div key={r.n} className="m-arrive-l" style={{ animationDelay: `${i * .15}s`, display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #f3d5cf', borderRadius: 12, padding: '10px 12px', boxShadow: 'var(--m-shadow-sm)' }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: '#c0392b' }} className="m-pulse" />
          <div style={{ minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.n}</div><div style={{ fontSize: 11.5, color: '#c0392b', fontWeight: 600 }}>{r.d}</div></div>
          <span style={{ marginLeft: 'auto', fontWeight: 800 }}>{r.v}</span>
        </div>
      ))}
      {stage >= 3 && (
        <div className="m-pop" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(100deg,#5b4bf5,#7c5cf7)', color: '#fff', borderRadius: 12, padding: '10px 12px', fontSize: 13, fontWeight: 700, boxShadow: '0 12px 26px -10px rgba(91,75,245,.55)' }}>
          <Icon name="mail" size={15} /> 2 save emails drafted - review and send
        </div>
      )}
    </div>
  );
}

function CanvasWon({ stage }) {
  const n = useCountUp(420, stage >= 2);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {stage >= 1 && (
        <div className={stage >= 2 ? 'm-won' : 'm-arrive'} style={{ background: '#fff', border: '1px solid rgba(14,159,154,.5)', borderRadius: 12, padding: '11px 13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 13.5 }}>Vertex Robotics - Platform rollout</span>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: '#fff', background: 'var(--m-teal)', padding: '3px 9px', borderRadius: 999 }}>WON</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--m-ink3)', marginTop: 4 }}>Negotiation -&gt; Closed Won</div>
        </div>
      )}
      {stage >= 2 && (
        <div className="m-arrive" style={{ textAlign: 'center', padding: '6px 0 2px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.08em', color: 'var(--m-ink3)' }}>CLOSED THIS QUARTER</div>
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-.03em', color: 'var(--m-ink)' }}>${n}K<span style={{ color: 'var(--m-teal)', fontSize: 20, fontWeight: 800, marginLeft: 8 }}>+31%</span></div>
        </div>
      )}
    </div>
  );
}

function CanvasTeam({ stage }) {
  const people = [['Jordan Avery', 'Own the exec review'], ['Simone Diaz', 'Draft the proposal'], ['Theo Bennett', 'Security questionnaire']];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {people.slice(0, stage).map(([n, t], i) => (
        <div key={n} className="m-arrive-l" style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid var(--m-line2)', borderRadius: 12, padding: '9px 12px', boxShadow: 'var(--m-shadow-sm)' }}>
          <Ava name={n} i={i} />
          <div><div style={{ fontWeight: 700, fontSize: 13 }}>{n}</div><div style={{ fontSize: 11.5, color: 'var(--m-ink3)' }}>{t}</div></div>
          <span style={{ marginLeft: 'auto', fontSize: 10.5, fontWeight: 700, color: 'var(--m-accent)', background: 'rgba(91,75,245,.1)', padding: '3px 8px', borderRadius: 999 }}>ASSIGNED</span>
        </div>
      ))}
      {stage >= 4 && (
        <div className="m-pop" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700, color: 'var(--m-teal)' }}>
          <Icon name="calendar" size={15} /> Kickoff scheduled - Friday 10:00am
        </div>
      )}
    </div>
  );
}

const CANVASES = { account: CanvasAccount, slipping: CanvasSlipping, won: CanvasWon, team: CanvasTeam };

export default function AgentTheater() {
  const [si, setSi] = useState(0);          // scenario index
  const [typed, setTyped] = useState('');    // typed chars of the question
  const [phase, setPhase] = useState('typing'); // typing | thinking | answer
  const [stage, setStage] = useState(0);     // canvas artifact stage 0..4
  const timers = useRef([]);
  const t = (fn, ms) => { const id = setTimeout(fn, ms); timers.current.push(id); };

  useEffect(() => {
    const sc = SCENARIOS[si];
    setTyped(''); setPhase('typing'); setStage(0);
    // type the question
    sc.q.split('').forEach((_, i) => t(() => setTyped(sc.q.slice(0, i + 1)), 300 + i * 34));
    const typeDone = 300 + sc.q.length * 34;
    t(() => setPhase('thinking'), typeDone + 250);
    t(() => { setPhase('answer'); setStage(1); }, typeDone + 1500);
    t(() => setStage(2), typeDone + 2250);
    t(() => setStage(3), typeDone + 3000);
    t(() => setStage(4), typeDone + 3700);
    t(() => setSi(s => (s + 1) % SCENARIOS.length), typeDone + 6800);
    return () => { timers.current.forEach(clearTimeout); timers.current = []; };
  }, [si]);

  const sc = SCENARIOS[si];
  const Canvas = CANVASES[sc.canvas];

  return (
    <div className="mkt-glass m-tilt" style={{ textAlign: 'left', overflow: 'hidden' }}>
      {/* window chrome */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderBottom: '1px solid var(--m-line)' }}>
        <span style={{ display: 'flex', gap: 6 }}>{['#ff5f57', '#febc2e', '#28c840'].map(c => <i key={c} style={{ width: 11, height: 11, borderRadius: 99, background: c }} />)}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 800, fontSize: 14 }}>
          <span style={{ width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(135deg,#6d5cf7,#4a3ce0)', display: 'grid', placeItems: 'center', color: '#fff' }}><Icon name="zap" size={12} fill="currentColor" stroke={0} /></span>
          Ardovo
        </span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--m-teal)' }}><span className="mkt-dot m-pulse" /> Rook is live</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.1fr)', minHeight: 330 }} className="theater-grid">
        {/* chat side */}
        <div style={{ padding: '20px 20px 18px', borderRight: '1px solid var(--m-line)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: 'var(--m-ink3)' }}>ASK ROOK</div>
          <div style={{ alignSelf: 'flex-end', maxWidth: '92%', background: 'linear-gradient(100deg,#5b4bf5,#7c5cf7)', color: '#fff', padding: '11px 14px', borderRadius: '14px 14px 4px 14px', fontSize: 14, lineHeight: 1.45, fontWeight: 500, minHeight: 42 }}>
            {typed}{phase === 'typing' && <span className="m-cursor" style={{ background: '#fff' }} />}
          </div>
          {phase === 'thinking' && <div className="m-think" style={{ padding: '6px 2px' }}><span /><span /><span /></div>}
          {phase === 'answer' && (
            <div className="m-arrive" style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
              <span style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(91,75,245,.12)', border: '1px solid rgba(91,75,245,.3)', display: 'grid', placeItems: 'center', color: 'var(--m-accent)', flex: 'none', marginTop: 2 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 3h2v2h2V3h4v2h2V3h2v5l-2 2v6l1 3H5l1-3v-6L4 8V3h2zm1 15h10v2H7v-2z" /></svg>
              </span>
              <div style={{ background: 'var(--m-bg2)', border: '1px solid var(--m-line)', padding: '11px 14px', borderRadius: '14px 14px 14px 4px', fontSize: 14, lineHeight: 1.45, color: 'var(--m-ink)' }}>{sc.a}</div>
            </div>
          )}
          <div style={{ marginTop: 'auto', display: 'flex', gap: 8, alignItems: 'center', border: '1px solid var(--m-line2)', borderRadius: 11, padding: '10px 13px', color: 'var(--m-ink3)', fontSize: 13.5 }}>
            Ask anything about your pipeline... <span style={{ marginLeft: 'auto', width: 30, height: 30, borderRadius: 8, background: 'var(--m-accent)', display: 'grid', placeItems: 'center', color: '#fff', flex: 'none' }}><Icon name="send" size={14} /></span>
          </div>
        </div>
        {/* live canvas side */}
        <div style={{ padding: '20px 20px 18px', background: 'linear-gradient(180deg, var(--m-bg2), #fff)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: 'var(--m-ink3)', marginBottom: 12 }}>ROOK IS DOING THE WORK</div>
          {phase === 'answer' ? <Canvas stage={stage} /> : (
            <div style={{ height: '86%', display: 'grid', placeItems: 'center', color: 'var(--m-ink3)', fontSize: 13 }}>
              {phase === 'thinking' ? 'Reading your workspace...' : 'Waiting for the ask...'}
            </div>
          )}
        </div>
      </div>
      <style>{`@media (max-width: 760px) { .theater-grid { grid-template-columns: 1fr !important; } .theater-grid > div:first-child { border-right: none !important; border-bottom: 1px solid var(--m-line); } }`}</style>
    </div>
  );
}
