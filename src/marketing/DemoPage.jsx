// DemoPage - the self-guided interactive product tour at /demo. A faux Rally
// workspace (chrome + sidebar + main) the prospect drives through five scenes:
// see the pipeline, open a deal, ask Rook and watch it act, watch a forecast
// update, and generate a proposal that assembles itself. Progress dots,
// next/back, scene-level interactions (click a deal, click a Rook prompt,
// toggle a forecast, generate a proposal), and a strong "start free" finish.
// It is a scripted sandbox: canned data + responses, fully self-contained,
// not the real app. Pure setTimeout / rAF state machines + the shared CSS
// motion vocabulary from marketing.css. Honors prefers-reduced-motion.
// NO em-dash / en-dash. ASCII hyphen only.
import React, { useEffect, useRef, useState } from 'react';
import { Reveal, MktButton, CtaBand } from './kit.jsx';
import { Icon } from '../components/icons.jsx';
import './demo.css';

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------------ */
/* Shared bits                                                          */
/* ------------------------------------------------------------------ */
function useCountUp(target, go, dur = 1100) {
  const [n, setN] = useState(go ? target : 0);
  useEffect(() => {
    if (!go) { setN(0); return; }
    if (reducedMotion()) { setN(target); return; }
    let raf, start;
    const step = (t) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / dur);
      setN(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [go, target, dur]);
  return n;
}

function initials(name) { return name.split(' ').map(w => w[0]).join('').slice(0, 2); }

/* ------------------------------------------------------------------ */
/* Data                                                                 */
/* ------------------------------------------------------------------ */
const COLS = [
  { name: 'Discovery', color: '#7c8399', deals: [
    { n: 'Northwind Traders', a: '$85K', who: 'JR', c: '#2563a8', d: '3d in stage' },
    { n: 'Atlas Freight', a: '$52K', who: 'SD', c: '#0e9f9a', d: '1d in stage' },
  ] },
  { name: 'Qualified', color: '#5b4bf5', deals: [
    { n: 'Vertex Robotics', a: '$480K', who: 'NV', c: '#5b4bf5', d: '5d in stage', star: true },
    { n: 'Cascade Health', a: '$220K', who: 'MB', c: '#e0752d', d: '2d in stage' },
  ] },
  { name: 'Proposal', color: '#a855f7', deals: [
    { n: 'Harbor Point', a: '$140K', who: 'TP', c: '#a855f7', d: '4d in stage' },
  ] },
  { name: 'Negotiation', color: '#e0752d', deals: [
    { n: 'Ironclad Aerospace', a: '$310K', who: 'OC', c: '#2563a8', d: '9d in stage' },
  ] },
  { name: 'Won', color: '#0e9f9a', deals: [
    { n: 'Meridian Health', a: '$240K', who: 'PR', c: '#0e9f9a', d: 'Closed' },
  ] },
];

const STAGES5 = ['Discovery', 'Qualified', 'Proposal', 'Negotiation', 'Won'];
const COMMITTEE = [
  ['Nadia Vance', 'VP Engineering', '#5b4bf5', 'Champion', 'b-influence'],
  ['Priya Rao', 'CFO', '#e0752d', 'Economic buyer', 'b-influence'],
  ['Owen Cole', 'IT Director', '#a855f7', 'Technical', 'b-influence'],
  ['Marcus Bell', 'Head of Ops', '#0e9f9a', 'End user', 'b-influence'],
  ['Lena Cruz', 'Procurement', '#2563a8', 'Not engaged', 'b-warn'],
];
const TIMELINE = [
  ['mail', 'Sent 250-seat pricing overview to Nadia', '2 days ago'],
  ['phone', 'Discovery call with Marcus and Priya', '5 days ago'],
  ['fileText', 'Security questionnaire returned by Owen', '1 week ago'],
  ['sparkles', 'Rook enriched the company from its domain', '1 week ago'],
];

/* ------------------------------------------------------------------ */
/* Sidebar chrome                                                       */
/* ------------------------------------------------------------------ */
function Sidebar({ active, rookActive }) {
  const item = (key, icon, label) => (
    <div className={`dmo-side-item${active === key ? ' is-active' : ''}`}><Icon name={icon} size={17} /><span>{label}</span></div>
  );
  return (
    <div className="dmo-side">
      <div className="dmo-side-sec">Workspace</div>
      {item('command', 'home', 'Command center')}
      {item('deals', 'target', 'Deals')}
      {item('contacts', 'users', 'Contacts')}
      <div className="dmo-side-sec">Intelligence</div>
      {item('forecasting', 'trendUp', 'Forecasting')}
      {item('quotes', 'receipt', 'Quotes')}
      <div className="dmo-side-spacer" />
      <div className={`dmo-side-rook${rookActive ? ' is-active' : ''}`}>
        <span className="dmo-side-rook-ic"><Icon name="sparkles" size={13} /></span>
        Ask Rook
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Scene 1 - Pipeline                                                   */
/* ------------------------------------------------------------------ */
function ScenePipeline({ onOpenDeal }) {
  const total = useCountUp(1275, true, 1200); // $ thousands
  return (
    <>
      <div className="dmo-kpi">
        <div>
          <div className="dmo-kpi-big">${(Math.round(total)).toLocaleString()}K</div>
          <div className="dmo-kpi-label">Open pipeline</div>
        </div>
        <span className="dmo-kpi-chip"><Icon name="trendUp" size={13} /> 7 active deals</span>
      </div>
      <div className="dmo-kanban m-cascade">
        {COLS.map(col => (
          <div key={col.name} className="dmo-col">
            <div className="dmo-colhead">
              <span className="dmo-coldot" style={{ background: col.color }} />
              {col.name}
              <span className="dmo-colcount">{col.deals.length}</span>
            </div>
            {col.deals.map(d => (
              <div key={d.n} className={`dmo-deal${d.star ? ' is-star' : ''}`}
                onClick={d.star ? onOpenDeal : undefined}
                role={d.star ? 'button' : undefined} tabIndex={d.star ? 0 : undefined}
                onKeyDown={d.star ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenDeal(); } } : undefined}>
                <div className="dmo-deal-top">
                  <span className="dmo-deal-name">{d.n}</span>
                  <span className="dmo-deal-amt">{d.a}</span>
                </div>
                <div className="dmo-deal-meta">
                  <span className="dmo-deal-av" style={{ background: d.c }}>{d.who}</span>
                  <span className="dmo-deal-days">{d.d}</span>
                </div>
                {d.star && <span className="dmo-deal-open">Open deal <Icon name="chevronRight" size={12} /></span>}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        <span className="dmo-hint"><span className="dmo-hint-pulse" /> Click the highlighted Vertex Robotics deal to open it</span>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Scene 2 - Deal detail                                                */
/* ------------------------------------------------------------------ */
function SceneDeal() {
  const cur = 1; // Qualified
  return (
    <div className="dmo-detail">
      <div className="m-arrive dmo-detail-head">
        <span className="dmo-detail-mono">VR</span>
        <div style={{ minWidth: 0 }}>
          <div className="dmo-detail-title">Enterprise Expansion</div>
          <div className="dmo-detail-sub">Vertex Robotics - vertexrobotics.com</div>
        </div>
        <div className="dmo-detail-amt"><b>$480K</b><span>Deal value</span></div>
      </div>

      <div className="m-arrive dmo-lane" style={{ animationDelay: '.08s' }}>
        {STAGES5.map((s, i) => (
          <div key={s} className={`dmo-lanecell${i <= cur ? ' is-on' : ''}${i === cur ? ' is-cur' : ''}`}>
            <span className="dmo-lanebar">{i <= cur && <span className="dmo-lanefill dmo-grow" style={{ animationDelay: `${0.15 + i * 0.12}s` }} />}</span>
            <span className="dmo-lanelabel">{s}</span>
          </div>
        ))}
      </div>

      <div className="dmo-grid2">
        <div className="m-arrive dmo-panel" style={{ animationDelay: '.16s' }}>
          <div className="dmo-panel-head"><Icon name="users" size={14} /> Buying committee <span className="dmo-panel-count">5</span></div>
          {COMMITTEE.map(([n, role, c], i) => (
            <div key={n} className="dmo-person">
              <span className="dmo-person-av" style={{ background: c }}>{initials(n)}</span>
              <div style={{ minWidth: 0 }}>
                <div className="dmo-person-n">{n}</div>
                <div className="dmo-person-r">{role}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="m-arrive dmo-panel" style={{ animationDelay: '.24s' }}>
          <div className="dmo-panel-head"><Icon name="activity" size={14} /> Activity</div>
          <div className="dmo-tl">
            {TIMELINE.map(([ic, t, when]) => (
              <div key={t} className="dmo-tl-item">
                <span className="dmo-tl-ic"><Icon name={ic} size={13} /></span>
                <div>
                  <div className="dmo-tl-txt">{t}</div>
                  <div className="dmo-tl-when">{when}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Scene 3 - Ask Rook (the centerpiece interaction)                     */
/* ------------------------------------------------------------------ */
function ArtCommittee({ stage }) {
  return (
    <div className="dmo-art">
      {COMMITTEE.slice(0, stage).map(([n, role, c, tag, badge]) => (
        <div key={n} className={`m-arrive-l dmo-art-row${badge === 'b-warn' ? ' is-flag' : ''}`}>
          <span className="dmo-person-av" style={{ background: c }}>{initials(n)}</span>
          <div style={{ minWidth: 0 }}>
            <div className="dmo-person-n">{n}</div>
            <div className="dmo-person-r">{role}</div>
          </div>
          <span className={`dmo-art-badge ${badge}`}>{tag}</span>
        </div>
      ))}
    </div>
  );
}

function ArtMail({ stage }) {
  if (stage < 1) return null;
  return (
    <div className="dmo-art">
      <div className="m-spring dmo-mail">
        <div className="dmo-mail-head"><Icon name="mail" size={14} /> Draft ready <span className="dmo-mail-ready">Rook wrote this</span></div>
        <div className="dmo-mail-sub">Following up - Vertex enterprise expansion</div>
        <div className="dmo-mail-body">
          Hi Nadia, great speaking Thursday. Based on your rollout timeline I put together a 250-seat
          plan that lands under your Q3 budget, and attached the security packet Owen asked for. Open
          to a 20-minute review this week?
        </div>
        <div className="dmo-mail-foot">
          <span className="dmo-mail-to">To: nadia.vance@vertexrobotics.com</span>
          <span className="dmo-mail-send">Send <Icon name="send" size={12} /></span>
        </div>
      </div>
    </div>
  );
}

function ArtRisk({ stage }) {
  const reasons = [
    ['Procurement (Lena Cruz) not engaged', 'is-flag'],
    ['Single-threaded to Nadia Vance', 'is-flag'],
  ];
  return (
    <div className="dmo-art">
      {stage >= 1 && (
        <div className="m-arrive dmo-art-row">
          <Icon name="activity" size={16} style={{ color: '#c0392b', flex: 'none' }} />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--m-ink)' }}>Deal risk</span>
          <span className="dmo-art-badge b-warn" style={{ marginLeft: 'auto' }}>Elevated</span>
          <div className="dmo-riskbar" style={{ flexBasis: '100%' }}>
            <div className="dmo-riskbar-track"><div className="dmo-riskbar-fill dmo-grow" style={{ width: '68%' }} /></div>
            <span className="dmo-riskbar-val">68</span>
          </div>
        </div>
      )}
      {reasons.slice(0, Math.max(0, stage - 1)).map(([t, flag]) => (
        <div key={t} className={`m-arrive-l dmo-art-row ${flag}`}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: '#c0392b', flex: 'none' }} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--m-ink2)' }}>{t}</span>
        </div>
      ))}
      {stage >= 4 && (
        <div className="m-pop dmo-art-row" style={{ borderColor: 'rgba(91,75,245,.35)' }}>
          <span style={{ width: 24, height: 24, borderRadius: 7, background: 'rgba(91,75,245,.12)', color: 'var(--m-accent)', display: 'grid', placeItems: 'center', flex: 'none' }}><Icon name="sparkles" size={13} /></span>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--m-ink)' }}>Rook can loop in Priya (CFO) with an ROI one-pager</span>
          <span className="dmo-art-badge b-ok" style={{ marginLeft: 'auto' }}>Fix it</span>
        </div>
      )}
    </div>
  );
}

const ROOK_PROMPTS = [
  { id: 'dm', q: 'Who are the decision makers on the Vertex deal?', a: 'Five stakeholders. Nadia is your champion, but procurement has not engaged yet.', icon: 'users', Art: ArtCommittee, steps: 5 },
  { id: 'mail', q: 'Draft a follow-up to Nadia Vance', a: 'Drafted in your voice, with the security packet attached. Review and send.', icon: 'mail', Art: ArtMail, steps: 1 },
  { id: 'risk', q: 'What is the risk on this deal?', a: 'Risk is elevated. Two reasons, and I can fix the biggest one now.', icon: 'activity', Art: ArtRisk, steps: 4 },
];

function SceneRook() {
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
    if (reducedMotion()) { setPhase('answer'); setTyped(p.q); setStage(p.steps); return; }
    setPhase('typing');
    const chars = p.q.split('');
    chars.forEach((_, i) => T(() => setTyped(p.q.slice(0, i + 1)), 50 + i * 24));
    const done = 50 + chars.length * 24;
    T(() => setPhase('thinking'), done + 240);
    T(() => { setPhase('answer'); setStage(1); }, done + 1250);
    for (let s = 2; s <= p.steps; s++) T(() => setStage(s), done + 1250 + (s - 1) * 520);
  };

  const active = ROOK_PROMPTS.find(p => p.id === activeId);
  return (
    <div className="dmo-rook">
      <div>
        <div className="dmo-rook-chipslabel" style={{ marginBottom: 10 }}>Try a question</div>
        <div className="dmo-rook-chips">
          {ROOK_PROMPTS.map(p => (
            <button key={p.id} className={`dmo-chip${activeId === p.id ? ' is-active' : ''}`} onClick={() => run(p)}>
              <Icon name={p.icon} size={15} /> {p.q}
            </button>
          ))}
        </div>
      </div>

      <div className="dmo-thread">
        {phase === 'idle' && (
          <div className="dmo-thread-empty">
            <div>
              <span className="dmo-thread-emptyic"><Icon name="sparkles" size={20} /></span>
              Pick a question above. Rook reads the deal, thinks,<br />and does the work right here.
            </div>
          </div>
        )}
        {phase !== 'idle' && (
          <>
            <div className="dmo-q">{typed}{phase === 'typing' && <span className="m-cursor" style={{ background: '#fff' }} />}</div>
            {phase === 'thinking' && (
              <div className="dmo-think"><span className="m-think" style={{ display: 'inline-flex' }}><span /><span /><span /></span> Reading the Vertex workspace</div>
            )}
            {phase === 'answer' && active && (
              <div className="dmo-a-row m-arrive">
                <span className="dmo-a-av"><Icon name="sparkles" size={14} /></span>
                <div className="dmo-a-body">
                  <div className="dmo-a-txt">{active.a}</div>
                  <active.Art stage={stage} />
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {phase === 'idle' && (
        <span className="dmo-hint"><span className="dmo-hint-pulse" /> Click any question to watch Rook work</span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Scene 4 - Forecast                                                   */
/* ------------------------------------------------------------------ */
const FC = {
  commit: { label: 'Commit', value: 1.24, delta: '+18% vs last quarter', deltaGood: true, bars: [['New business', 62], ['Expansion', 84], ['Renewal', 41]], spark: 'M4 70 L44 64 L84 66 L124 50 L164 52 L204 34 L236 22' },
  best: { label: 'Best case', value: 1.68, delta: '+34% upside in play', deltaGood: true, bars: [['New business', 78], ['Expansion', 92], ['Renewal', 64]], spark: 'M4 66 L44 58 L84 60 L124 42 L164 40 L204 24 L236 12' },
  pipe: { label: 'Full pipeline', value: 3.20, delta: '2.6x coverage on target', deltaGood: true, bars: [['New business', 88], ['Expansion', 96], ['Renewal', 72]], spark: 'M4 60 L44 50 L84 52 L124 36 L164 30 L204 16 L236 6' },
};
const FC_KEYS = ['commit', 'best', 'pipe'];

function SceneForecast() {
  const [k, setK] = useState('commit');
  const sc = FC[k];
  const n = useCountUp(sc.value, true, 1000);
  return (
    <div className="dmo-fc">
      <div className="dmo-fc-toggle">
        {FC_KEYS.map(key => (
          <button key={key} className={`dmo-fc-seg${k === key ? ' is-on' : ''}`} onClick={() => setK(key)}>{FC[key].label}</button>
        ))}
      </div>

      <div className="dmo-fc-top">
        <div className="dmo-fc-num">
          <div className="dmo-fc-numlabel">{sc.label} forecast, Q3</div>
          <div className="dmo-fc-big">${n.toFixed(2)}M</div>
          <div className="dmo-fc-delta"><Icon name="arrowUp" size={12} /> {sc.delta}</div>
        </div>
        <svg key={k} className="dmo-fc-spark" viewBox="0 0 240 90" preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id="dmoSparkStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#5b4bf5" /><stop offset="0.55" stopColor="#a855f7" /><stop offset="1" stopColor="#0e9f9a" />
            </linearGradient>
            <linearGradient id="dmoSparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="rgba(91,75,245,.18)" /><stop offset="1" stopColor="rgba(91,75,245,0)" />
            </linearGradient>
          </defs>
          <path d={`${sc.spark} L236 90 L4 90 Z`} fill="url(#dmoSparkFill)" />
          <path className="mkt-spark-line m-draw" d={sc.spark} fill="none" stroke="url(#dmoSparkStroke)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div className="dmo-fc-bars">
        {sc.bars.map(([label, pct]) => (
          <div key={label} className="dmo-fc-bar">
            <div className="dmo-fc-barhead">{label} <b>${((sc.value * pct) / 100).toFixed(2)}M</b></div>
            <div className="dmo-fc-bartrack">
              <div key={k + label} className="dmo-fc-barfill dmo-grow" style={{ width: `${pct}%`, background: 'var(--m-grad)' }} />
            </div>
          </div>
        ))}
      </div>

      <span className="dmo-hint"><span className="dmo-hint-pulse" /> Toggle a scenario. The forecast recalculates from live data.</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Scene 5 - Proposal                                                   */
/* ------------------------------------------------------------------ */
const PROP_STEPS = ['Pull deal + committee', 'Price 250 seats', 'Add onboarding + support', 'Total, terms, and signature'];
const PROP_LINES = [
  ['Rally platform license - 250 seats', '$360,000'],
  ['Onboarding + white-glove migration', '$60,000'],
  ['Premium support - 12 months', '$60,000'],
];

function SceneProposal() {
  const [stage, setStage] = useState(0); // 0 idle, 1..5 building, 5 done
  const [running, setRunning] = useState(false);
  const timers = useRef([]);
  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const T = (fn, ms) => { const id = setTimeout(fn, ms); timers.current.push(id); };
  useEffect(() => clear, []);

  const generate = () => {
    clear(); setRunning(true); setStage(0);
    if (reducedMotion()) { setStage(5); setRunning(false); return; }
    T(() => setStage(1), 260);
    T(() => setStage(2), 1000);
    T(() => setStage(3), 1720);
    T(() => setStage(4), 2440);
    T(() => { setStage(5); setRunning(false); }, 3160);
  };

  const done = stage >= 5;
  const pct = Math.min(100, (stage / 5) * 100);

  return (
    <div className="dmo-prop">
      <div className="dmo-prop-left">
        <button className="dmo-prop-gen" onClick={generate} disabled={running}>
          <Icon name="sparkles" size={16} /> {stage === 0 ? 'Generate proposal for Vertex' : running ? 'Assembling...' : 'Regenerate proposal'}
        </button>
        {stage > 0 && (
          <div className="dmo-prop-steps">
            {PROP_STEPS.map((s, i) => {
              const stepDone = stage > i + 1 || done;
              const stepActive = stage === i + 1;
              return (
                <div key={s} className={`dmo-prop-step${stepDone ? ' is-done' : ''}${stepActive ? ' is-active' : ''}`}>
                  <span className="dmo-prop-stepbox">{stepDone && <Icon name="check" size={11} stroke={3.2} />}</span>
                  {s}
                </div>
              );
            })}
          </div>
        )}
        {stage > 0 && (
          <div className="dmo-prog"><div className="dmo-prog-fill" style={{ transform: `scaleX(${pct / 100})` }} /></div>
        )}
        {done && (
          <div className="m-arrive dmo-prop-stamp">
            <span className="dmo-prop-stampring m-won"><Icon name="check" size={16} stroke={3} /></span>
            <div>
              <div className="dmo-prop-stamptitle">Proposal ready in 3.2s</div>
              <div className="dmo-prop-stampsub">Priced from the live deal. Ready to send for e-signature.</div>
            </div>
          </div>
        )}
        {stage === 0 && (
          <span className="dmo-hint"><span className="dmo-hint-pulse" /> Click generate and watch it assemble</span>
        )}
      </div>

      <div className="dmo-doc">
        <div className="dmo-doc-bar" />
        <div className="dmo-doc-in">
          {stage === 0 && <div className="dmo-doc-empty">Your proposal will build here.</div>}
          {stage >= 1 && (
            <div className="m-arrive dmo-doc-cover">
              <div className="dmo-doc-kicker">Rally proposal</div>
              <div className="dmo-doc-title">Enterprise Expansion</div>
              <div className="dmo-doc-for">Prepared for Vertex Robotics - Nadia Vance</div>
            </div>
          )}
          {stage >= 2 && <div className="dmo-doc-rule" />}
          {PROP_LINES.map(([name, amt], i) => (
            stage >= i + 2 && (
              <div key={name} className="m-arrive-l dmo-doc-li">
                <span className="dmo-doc-li-name">{name}</span>
                <span className="dmo-doc-li-amt">{amt}</span>
              </div>
            )
          ))}
          {stage >= 5 && (
            <>
              <div className="dmo-doc-rule" />
              <div className="m-arrive dmo-doc-total"><span>Total</span><b>$480,000</b></div>
              <div className="m-arrive dmo-doc-terms" style={{ animationDelay: '.06s' }}>
                Net 30. Annual term with a 60-day out. Pricing held for 30 days. Includes Rook on every seat.
              </div>
              <div className="m-arrive dmo-doc-sign" style={{ animationDelay: '.12s' }}>
                <div className="dmo-doc-sign-line" />
                <div className="dmo-doc-sign-line" />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Scene registry                                                       */
/* ------------------------------------------------------------------ */
const SCENES = [
  { key: 'deals', label: 'Pipeline', eyebrow: 'Step 1 - Pipeline', title: 'See your whole pipeline at a glance', sub: 'Every deal, every stage, live on first load. No import, no setup. Click the highlighted deal to open it.' },
  { key: 'deals', label: 'The deal', eyebrow: 'Step 2 - The deal', title: 'Open a deal and get the full picture', sub: 'Company, buying committee, activity, and next steps. Assembled for you, not typed in by you.' },
  { key: 'rook', label: 'Ask Rook', eyebrow: 'Step 3 - Ask Rook', title: 'Ask Rook anything. Watch it act.', sub: 'Rook is grounded in your whole workspace. Pick a question and watch it think, then do the work.' },
  { key: 'forecasting', label: 'Forecast', eyebrow: 'Step 4 - Forecast', title: 'A forecast that updates itself', sub: 'Commit, best case, or full pipeline. Toggle the scenario and the numbers move with your data.' },
  { key: 'quotes', label: 'Proposal', eyebrow: 'Step 5 - Proposal', title: 'Generate a proposal in one click', sub: 'Rook assembles a ready-to-send proposal from the deal itself. No template wrangling.' },
];

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */
export default function DemoPage() {
  const [scene, setScene] = useState(0);
  const meta = SCENES[scene];
  const go = (i) => setScene(Math.max(0, Math.min(SCENES.length - 1, i)));

  const renderScene = () => {
    switch (scene) {
      case 0: return <ScenePipeline onOpenDeal={() => go(1)} />;
      case 1: return <SceneDeal />;
      case 2: return <SceneRook />;
      case 3: return <SceneForecast />;
      case 4: return <SceneProposal />;
      default: return null;
    }
  };

  return (
    <>
      {/* Hero */}
      <section className="dmo-hero">
        <div className="mkt-hero-mesh" aria-hidden />
        <div className="mkt-wrap" style={{ position: 'relative', zIndex: 2 }}>
          <Reveal>
            <span className="dmo-hero-tag"><Icon name="sparkles" size={14} /> Interactive demo</span>
            <h1 className="mkt-h1" style={{ margin: '20px auto 0', maxWidth: 880, fontSize: 'clamp(2.3rem, 5.4vw, 3.9rem)' }}>
              Drive Rally yourself. <span className="mkt-grad m-shine">No signup.</span>
            </h1>
            <p className="mkt-lead" style={{ margin: '20px auto 0', maxWidth: 620 }}>
              A guided, clickable sandbox. Walk the pipeline, open a deal, ask Rook, watch a forecast
              move, and generate a proposal. Everything below is live and yours to click.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Workspace */}
      <section className="mkt-section-sm" style={{ paddingTop: 18 }}>
        <div className="mkt-wrap" style={{ maxWidth: 1060 }}>
          <Reveal delay={80}>
            <div className="dmo-shell">
              <div className="dmo-chrome">
                <span className="dmo-chrome-dots"><i style={{ background: '#ff5f57' }} /><i style={{ background: '#febc2e' }} /><i style={{ background: '#28c840' }} /></span>
                <span className="dmo-chrome-brand"><span className="dmo-chrome-mark"><Icon name="zap" size={12} fill="currentColor" stroke={0} /></span> Rally</span>
                <span className="dmo-chrome-live"><span className="mkt-dot m-pulse" /> Rook is live</span>
              </div>
              <div className="dmo-body">
                <Sidebar active={meta.key} rookActive={meta.key === 'rook'} />
                <div className="dmo-main">
                  <div className="dmo-scenehead">
                    <div className="dmo-eyebrow">{meta.eyebrow}</div>
                    <h2 className="dmo-scenetitle">{meta.title}</h2>
                    <p className="dmo-scenesub">{meta.sub}</p>
                  </div>
                  <div className="dmo-stage" key={scene}>
                    {renderScene()}
                  </div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="dmo-controls">
              <div className="dmo-steps">
                {SCENES.map((s, i) => (
                  <div key={i} className={`dmo-step${i === scene ? ' is-active' : ''}${i < scene ? ' is-done' : ''}`} onClick={() => go(i)}
                    role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(i); } }}>
                    <span className="dmo-stepdot">{i < scene ? <Icon name="check" size={12} stroke={3} /> : i + 1}</span>
                    <span className="dmo-steplabel">{s.label}</span>
                  </div>
                ))}
              </div>
              <div className="dmo-navbtns">
                <button className="mkt-btn mkt-btn-ghost" onClick={() => go(scene - 1)} disabled={scene === 0} style={scene === 0 ? { opacity: .5, cursor: 'default' } : undefined}>
                  <Icon name="chevronRight" size={16} style={{ transform: 'rotate(180deg)' }} /> Back
                </button>
                {scene < SCENES.length - 1
                  ? <button className="mkt-btn mkt-btn-primary" onClick={() => go(scene + 1)}>Next <Icon name="chevronRight" size={16} /></button>
                  : <MktButton to="/app">Start free <Icon name="chevronRight" size={16} /></MktButton>}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Closing CTA */}
      <CtaBand
        title="You just ran Rally. Now make it yours."
        sub="Start free and your workspace loads full, live, and ready. Ask Rook and watch it move for real."
      />
    </>
  );
}
