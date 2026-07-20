// Boardroom - Ardovo's Autonomous Revenue Council. A standing C-suite of agents
// that convene over the REAL pipeline, argue their positions from live revenue
// intelligence, reach a consensus, and file a decision memo you approve or
// override. Leapfrogs "Agent Network" by grounding multi-agent debate in your
// actual book. Teal is product truth, violet is the AI layer. NO em-dash. ASCII.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store.js';
import { SectionHeader, Badge, EmptyState, useToast, relTime } from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import AgentDeck from '../components/agent/AgentDeck.jsx';
import { convene, useBoardroom, getSessions, fileMemo, latestBrief, fmtMoney } from '../lib/boardroom.js';
import './boardroom.css';

const STANCE = {
  bull: { label: 'Bullish', tone: '#0e9f8f' },
  bear: { label: 'Bearish', tone: '#c0392b' },
  neutral: { label: 'Neutral', tone: '#2563a8' },
  chair: { label: 'Chair', tone: '#7c5cf7' },
};
const VOTE_META = {
  press: { label: 'Press the advantage', tone: '#0e9f8f', icon: 'trendUp' },
  hold: { label: 'Hold and tighten', tone: '#2563a8', icon: 'shield' },
  defend: { label: 'Defend the quarter', tone: '#c0392b', icon: 'roleShield' },
};

export default function Boardroom() {
  useStore();
  useBoardroom();
  const nav = useNavigate();
  const toast = useToast();
  const [session, setSession] = useState(null);
  const [shown, setShown] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [accepted, setAccepted] = useState({});
  const [filed, setFiled] = useState(false);
  const threadRef = useRef(null);

  // On entry, surface the standing auto-convened memo (fully revealed), so the
  // brief you saw on the Command Center is the same one you land on here.
  useEffect(() => {
    const b = latestBrief();
    if (b && b.debate) {
      setSession(b);
      setShown(b.debate.length);
      setPlaying(false);
      setFiled(!!b.filed);
      setAccepted(Object.fromEntries(b.decisions.map(d => [d.id, b.filed ? (b.acceptedIds || []).includes(d.id) : true])));
    }
    // eslint-disable-next-line
  }, []);

  function run() {
    const s = convene();
    setSession(s);
    setAccepted(Object.fromEntries(s.decisions.map(d => [d.id, true])));
    setShown(0); setPlaying(true); setFiled(false);
  }

  useEffect(() => {
    if (!playing || !session) return;
    if (shown >= session.debate.length) { setPlaying(false); return; }
    const t = setTimeout(() => setShown(n => n + 1), 780);
    return () => clearTimeout(t);
  }, [playing, shown, session]);

  useEffect(() => { if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight; }, [shown]);

  const done = session && shown >= session.debate.length && !playing;
  const voteMeta = session ? (VOTE_META[session.vote] || VOTE_META.hold) : null;
  const archive = getSessions();

  function file() {
    if (!session) return;
    const ids = Object.entries(accepted).filter(([, v]) => v).map(([k]) => k);
    const r = fileMemo(session, ids);
    if (r.ok) { setFiled(true); toast(`Memo filed. ${r.committed} directive(s) committed to the pipeline.`); }
  }

  const pods = useMemo(() => {
    if (!session) return [
      { label: 'Council seats', value: 6, icon: 'users' },
      { label: 'Grounded in', value: 'Live book', icon: 'activity' },
      { label: 'Human sign-off', value: 'Required', icon: 'roleShield' },
    ];
    const m = session.metrics;
    return [
      { label: 'Weighted', value: m.weighted, format: (n) => fmtMoney(n), icon: 'dollar' },
      { label: 'Coverage', value: m.coverage, format: (n) => `${n}x`, icon: 'layers' },
      { label: 'Confidence', value: m.confidence, format: (n) => `${n}%`, icon: 'gauge' },
      { label: 'At risk', value: m.atRisk, format: (n) => fmtMoney(n), icon: 'shield' },
      { label: 'Decisions', value: session.decisions.length, icon: 'checkSquare' },
    ];
  }, [session]);

  return (
    <div className="fade-up br">
      <AgentDeck
        eyebrow="The Boardroom - Autonomous Revenue Council"
        title="Your C-suite of agents"
        highlight="just met about your pipeline."
        sub="Six specialized agents convene over your real book, each defending a slice - the number, hygiene, risk, coverage, expansion, exposure. They debate, reach a consensus, and file a decision memo. You approve or override. Salesforce orchestrates its agents. Ardovo gives you a room where they argue about your revenue."
        actions={<>
          <button className="adk-btn" onClick={() => nav('/agent-cloud')}><Icon name="sparkles" size={15} /> Agent Cloud</button>
          <button className="adk-btn adk-btn--primary" onClick={run}><Icon name="play" size={15} /> Convene the council</button>
        </>}
        pods={pods}
      />

      {!session && (
        <div style={{ marginTop: '1.25rem' }}>
          <EmptyState icon="messages" title="The council is seated and waiting"
            body="Convene the room. Each agent reads a different slice of your live pipeline, argues its position, and the council files a decision memo grounded in real numbers - never fabricated."
            action={<button className="btn btn-primary" onClick={run}><Icon name="play" size={14} /> Convene the council</button>} />
          {archive.length > 0 && <Archive archive={archive} nav={nav} />}
        </div>
      )}

      {session && (
        <>
          {/* the council */}
          <div className="br-council fx-stagger">
            {session.seats.map(s => {
              const st = STANCE[s.stance] || STANCE.neutral;
              return (
                <div key={s.id} className="br-seat" style={{ '--tone': st.tone }}>
                  <div className="br-seat-top">
                    <span className="br-seat-ic"><Icon name={s.icon} size={16} /></span>
                    <div style={{ minWidth: 0 }}>
                      <div className="br-seat-title">{s.title}</div>
                      <div className="br-seat-domain">{s.domain}</div>
                    </div>
                    <span className="br-seat-stance">{st.label}</span>
                  </div>
                  <div className="br-seat-arg">{s.argument}</div>
                  <div className="br-seat-rec"><Icon name="chevronRight" size={12} /> {s.recommendation}</div>
                </div>
              );
            })}
          </div>

          <div className="br-grid">
            {/* debate transcript */}
            <div className="br-panel">
              <SectionHeader title="The debate" sub="Live positions, grounded in the book." />
              <div className="br-thread" ref={threadRef}>
                {session.debate.slice(0, shown).map((d, i) => {
                  const st = STANCE[d.stance] || STANCE.neutral;
                  const chair = d.seat === 'cro' && d.speaker === 'Chair';
                  return (
                    <div key={i} className={`br-line ${chair ? 'chair' : ''}`} style={{ '--tone': st.tone }}>
                      <div className="br-line-head"><span className="br-line-speaker">{d.speaker}</span></div>
                      <div className="br-line-body">{d.text}</div>
                    </div>
                  );
                })}
                {playing && shown < session.debate.length && <div className="br-typing"><span /><span /><span /></div>}
              </div>
            </div>

            {/* consensus + memo */}
            <aside className="br-side">
              {done && voteMeta && (
                <div className="br-consensus fx-rise" style={{ '--tone': voteMeta.tone }}>
                  <span className="br-burst" aria-hidden />
                  <div className="br-consensus-eyebrow"><Icon name={voteMeta.icon} size={14} /> Consensus</div>
                  <div className="br-consensus-head fx-holo">{session.headline}</div>
                  <div className="br-consensus-body">{session.rationale}</div>
                  <div className="br-tally">
                    {Object.entries(session.tally).map(([v, n]) => (
                      <span key={v} className="br-tally-chip">{(VOTE_META[v] || {}).label || v}: {n}</span>
                    ))}
                  </div>
                </div>
              )}

              {done && (
                <div className="br-memo">
                  <SectionHeader title="Decision memo" sub="Approve or override, then file for the record." />
                  {session.decisions.length === 0 && <p className="muted">The council found no directed actions this cycle. Clean book.</p>}
                  {session.decisions.map(d => (
                    <label key={d.id} className={`br-decision ${accepted[d.id] ? 'on' : ''}`}>
                      <input type="checkbox" checked={!!accepted[d.id]} onChange={e => setAccepted(a => ({ ...a, [d.id]: e.target.checked }))} disabled={filed} />
                      <span className="br-decision-body">
                        <span className="br-decision-title">{d.title}</span>
                        <span className="br-decision-detail">{d.detail}</span>
                        <span className="br-decision-meta">
                          {d.impactLabel && <b>{d.impactLabel}</b>}
                          <span className="muted"> - {d.owner}</span>
                          {d.to && <button type="button" className="br-open" onClick={(e) => { e.preventDefault(); nav(d.to); }}>Open <Icon name="arrowUpRight" size={11} /></button>}
                        </span>
                      </span>
                    </label>
                  ))}
                  {session.decisions.length > 0 && (
                    filed
                      ? <div className="br-filed"><Icon name="check" size={14} /> Memo filed. Directives committed to the pipeline.</div>
                      : <button className="btn btn-ai br-file" onClick={file}><Icon name="roleShield" size={14} /> Approve + file memo</button>
                  )}
                </div>
              )}

              {!done && <div className="br-waiting"><Icon name="clock" size={18} /><p>The council is in session. The memo files once positions are heard.</p></div>}
            </aside>
          </div>

          {archive.length > 0 && <Archive archive={archive} nav={nav} />}
        </>
      )}
    </div>
  );
}

function Archive({ archive, nav }) {
  return (
    <div className="br-archive">
      <SectionHeader title="Filed memos" sub="Every council session is archived for the record." />
      <div className="br-archive-list">
        {archive.slice(0, 8).map(s => {
          const vm = VOTE_META[s.vote] || VOTE_META.hold;
          return (
            <div key={s.id} className="br-archive-row" style={{ '--tone': vm.tone }}>
              <span className="br-archive-dot" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="br-archive-head">{s.headline}</div>
                <div className="br-archive-sub">{relTime(s.filedAt || s.at)} - {s.committed || 0} directive(s) committed - weighted {fmtMoney(s.metrics?.weighted || 0)}</div>
              </div>
              <Badge tone={s.vote === 'press' ? 'ok' : s.vote === 'defend' ? 'risk' : 'info'}>{vm.label}</Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
