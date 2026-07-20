// Handshake - Ardovo's Agent-to-Agent Deal Room. A live, playable negotiation:
// your Deal Agent versus the buyer's Buying Agent over A2A + AP2, bounded by a
// mandate you tune in real time. Pick a strategy, watch it play, or take over
// turn by turn (hold, concede, trade a term, split, walk). Settlement produces a
// signed Intent -> Cart -> Payment mandate chain you countersign. NO em-dash. ASCII.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store.js';
import { SectionHeader, Badge, EmptyState, useToast, Segmented } from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import AgentDeck from '../components/agent/AgentDeck.jsx';
import {
  openNegotiation, playMove, finalize, liveGauge, applyOutcome,
  negotiableDeals, defaultDealId, ARCHETYPES, STRATEGIES, DEFAULT_POLICY, AP2, fmtMoney,
} from '../lib/handshake.js';
import './handshake.css';

const STATUS_META = {
  agreed: { label: 'Agreed, inside mandate', tone: '#0e9f8f', icon: 'check' },
  needs_human: { label: 'Terms reached, needs your countersignature', tone: '#7c5cf7', icon: 'roleShield' },
  impasse: { label: 'Impasse, mandate protected, escalated', tone: '#c0392b', icon: 'shield' },
};
const MOVES = [
  { id: 'hold', label: 'Hold firm', icon: 'shield' },
  { id: 'concede', label: 'Small concession', icon: 'arrowDown' },
  { id: 'trade_term', label: 'Trade a term', icon: 'swap' },
  { id: 'split', label: 'Split the difference', icon: 'merge' },
  { id: 'walk', label: 'Walk away', icon: 'logout' },
];

function Mandate({ kind, m, live }) {
  if (!m) return null;
  const titles = { intent: 'Intent Mandate', cart: 'Cart Mandate', payment: 'Payment Mandate' };
  const sigs = m.signatures || (m.signature ? [m.signature] : []);
  return (
    <div className={`hs-mandate fx-shimmer ${live ? 'on' : ''}`}>
      <div className="hs-mandate-top">
        <span className="hs-mandate-badge">{AP2.credentials.split(' ')[0]} VDC</span>
        <span className="hs-mandate-title">{titles[kind]}</span>
        <code className="hs-mandate-id">{m.id}</code>
      </div>
      {kind === 'intent' && (
        <div className="hs-mandate-body">
          <div><b>{m.buyer}</b> <span className="muted">/ {m.buyerOrg}</span></div>
          <div className="muted">Budget cap {fmtMoney(m.constraints.budgetCap)} - {m.constraints.category}</div>
          <ul className="hs-musts">{m.constraints.mustHaves.map((h, i) => <li key={i}>{h}</li>)}</ul>
        </div>
      )}
      {kind === 'cart' && (
        <div className="hs-mandate-body">
          {m.items.map((it, i) => (<div key={i} className="row between"><span className="ellip">{it.name}</span><b>{fmtMoney(it.total)}</b></div>))}
          <div className="row between hs-cart-total"><span>List {fmtMoney(m.listTotal)}</span><b>{m.discountPct}% off</b></div>
        </div>
      )}
      {kind === 'payment' && (
        <div className="hs-mandate-body">
          <div className="row between"><span className="muted">{m.instrument}</span><b>{fmtMoney(m.amount)}</b></div>
          <div className="muted">Linked cart {m.linkedCart}</div>
          <Badge tone={m.status === 'authorized' ? 'ok' : 'accent'}>{m.status}</Badge>
        </div>
      )}
      <div className="hs-sigs">
        {sigs.map((s, i) => (<span key={i} className="hs-sig" title={`${s.role} - ${s.alg}`}><Icon name="lock" size={11} /> {s.signer.split(' ')[0]} <code>{s.sig.slice(0, 12)}...</code></span>))}
      </div>
    </div>
  );
}

// The deal envelope: a price axis from the walk-away floor to list, with the
// in-mandate zone, the buyer ceiling, and both agents' live offers.
function Envelope({ s }) {
  const min = Math.min(s.walk, s.buyerCap) - s.list * 0.015;
  const max = s.list;
  const pos = (x) => Math.max(0, Math.min(100, ((x - min) / (max - min)) * 100));
  const floorPos = pos(s.floor), walkPos = pos(s.walk);
  const marker = (x, cls, label, val) => (
    <div className={`hs-env-mark ${cls}`} style={{ left: `${pos(x)}%` }} title={`${label} ${fmtMoney(val)}`}>
      <span className="hs-env-dot" /><span className="hs-env-lab">{label}<b>{fmtMoney(val)}</b></span>
    </div>
  );
  return (
    <div className="hs-env">
      <div className="hs-env-track">
        <span className="hs-env-zone danger" style={{ left: 0, width: `${walkPos}%` }} />
        <span className="hs-env-zone human" style={{ left: `${walkPos}%`, width: `${floorPos - walkPos}%` }} />
        <span className="hs-env-zone mandate" style={{ left: `${floorPos}%`, width: `${100 - floorPos}%` }} />
        <span className="hs-env-cap" style={{ left: `${pos(s.buyerCap)}%` }} title={`Buyer ceiling ${fmtMoney(s.buyerCap)}`} />
        {marker(s.theirOffer, 'theirs', 'Buyer', s.theirOffer)}
        {marker(s.ourOffer, 'ours', 'You', s.ourOffer)}
        {s.settle != null && marker(s.settle, 'settle', 'Settle', s.settle)}
      </div>
      <div className="hs-env-legend">
        <span><i className="z danger" /> Below walk</span>
        <span><i className="z human" /> Needs human</span>
        <span><i className="z mandate" /> In mandate</span>
        <span><i className="z capline" /> Buyer ceiling</span>
      </div>
    </div>
  );
}

function Gauge({ label, value, tone }) {
  return (
    <div className="hs-gauge">
      <div className="row between"><span className="hs-gauge-lab">{label}</span><b style={{ color: tone }}>{value}%</b></div>
      <div className="hs-gauge-track"><span style={{ width: `${value}%`, background: tone }} /></div>
    </div>
  );
}

export default function Handshake() {
  useStore();
  const toast = useToast();
  const nav = useNavigate();
  const deals = negotiableDeals();
  const [dealId, setDealId] = useState(() => defaultDealId());
  const [strategy, setStrategy] = useState('balanced');
  const [maxDisc, setMaxDisc] = useState(DEFAULT_POLICY.maxDiscountPct);
  const [walkAway, setWalkAway] = useState(DEFAULT_POLICY.walkAwayPct);
  const [salt, setSalt] = useState(1);
  const [state, setState] = useState(null);
  const [autoplay, setAutoplay] = useState(false);
  const [signed, setSigned] = useState(false);
  const [pendingRun, setPendingRun] = useState(false);
  const threadRef = useRef(null);

  const policy = useMemo(() => ({ ...DEFAULT_POLICY, maxDiscountPct: maxDisc, walkAwayPct: Math.max(walkAway, maxDisc + 2) }), [maxDisc, walkAway]);

  // (Re)open a fresh session whenever the deal or the levers change.
  useEffect(() => {
    if (!dealId) { setState(null); return; }
    const s = openNegotiation(dealId, { policy, strategy, salt });
    setState(s.empty ? null : s);
    setSigned(false); setAutoplay(false);
    // eslint-disable-next-line
  }, [dealId, strategy, maxDisc, walkAway, salt]);

  // Auto-play the negotiation forward.
  useEffect(() => {
    if (!autoplay || !state || state.status !== 'live') return;
    const t = setTimeout(() => setState(s => playMove(s, 'auto')), 780);
    return () => clearTimeout(t);
  }, [autoplay, state]);

  useEffect(() => { if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight; }, [state?.turns.length]);

  // Rook (voice / deep link) can open + auto-run a negotiation.
  useEffect(() => {
    function onHs(e) {
      const q = String(e.detail?.query || '').trim().toLowerCase();
      if (q) { const m = deals.find(d => (d.name || '').toLowerCase().includes(q)); if (m) setDealId(m.id); }
      if (e.detail?.run) setPendingRun(true);
    }
    window.addEventListener('rally:handshake', onHs);
    return () => window.removeEventListener('rally:handshake', onHs);
  }, [deals]);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const d = p.get('deal'); if (d && deals.some(x => x.id === d)) setDealId(d);
    if (p.get('run') === '1') setPendingRun(true);
    // eslint-disable-next-line
  }, []);
  useEffect(() => { if (pendingRun && state && state.status === 'live') { setPendingRun(false); setAutoplay(true); } }, [pendingRun, state]);

  const done = state && state.status !== 'live';
  const fin = useMemo(() => (done ? finalize(state) : null), [done, state]);
  const gauge = state ? (fin?.gauge || liveGauge(state)) : { winProb: 0, marginPct: 100 };
  const statusMeta = fin ? (STATUS_META[fin.outcome.status] || STATUS_META.needs_human) : null;

  function step(move) { if (state && state.status === 'live') { setAutoplay(false); setState(playMove(state, move)); } }
  function countersign() {
    if (!fin) return;
    const r = applyOutcome(fin);
    if (r.ok) { setSigned(true); toast(`Countersigned. ${fin.proposal.actions.length} action(s) committed to ${fin.deal.name}.`); }
  }

  const pods = useMemo(() => {
    if (!state) return [];
    const g = gauge;
    return [
      { label: 'List price', value: state.list, format: fmtMoney, icon: 'dollar' },
      { label: done ? 'Settled' : 'On the table', value: state.settle || state.ourOffer, format: fmtMoney, icon: 'gitBranch' },
      { label: 'Win likelihood', value: g.winProb, format: (n) => `${Math.round(n)}%`, icon: 'gauge' },
      { label: 'Buyer leverage', value: state.buyer.power, format: (n) => `${Math.round(n)}%`, icon: 'trendUp' },
    ];
  }, [state, gauge, done]);

  if (!deals.length) {
    return (
      <div className="fade-up">
        <AgentDeck eyebrow="Handshake" title="Their AI is at the table." highlight="So is yours." sub="No open deals to negotiate yet. Open a deal and your Deal Agent can meet the buyer's agent at the table." />
        <div style={{ marginTop: '1.25rem' }}><EmptyState icon="deals" title="No open deals" body="Handshake negotiates live open pipeline. Create or reopen a deal to run the deal room." action={<button className="btn btn-primary" onClick={() => nav('/deals')}>Go to pipeline</button>} /></div>
      </div>
    );
  }

  return (
    <div className="fade-up hs">
      <AgentDeck
        eyebrow="Handshake - Agent-to-Agent Deal Room"
        title="Their AI is at the table."
        highlight="So is yours."
        sub="Your Deal Agent negotiates live with the buyer's Buying Agent over A2A + AP2, inside a mandate you set. Watch it play, or take the wheel turn by turn. It settles with a signed mandate chain you countersign."
        actions={<>
          <button className="adk-btn" onClick={() => nav('/agent-api')}><Icon name="command" size={15} /> A2A agent card</button>
          <button className="adk-btn adk-btn--primary" onClick={() => { setAutoplay(true); }}><Icon name="play" size={15} /> Auto-play</button>
        </>}
        pods={pods}
      />

      {/* controls */}
      <div className="hs-controls">
        <label className="hs-field">
          <span>Deal on the table</span>
          <select className="select" value={dealId || ''} onChange={e => setDealId(e.target.value)}>
            {deals.map(d => <option key={d.id} value={d.id}>{d.name} - {fmtMoney(d.value)}</option>)}
          </select>
        </label>
        <label className="hs-field" style={{ minWidth: 300, flex: '0 0 auto' }}>
          <span>Your strategy</span>
          <Segmented value={strategy} onChange={setStrategy} options={STRATEGIES.map(s => ({ value: s.id, label: s.name }))} />
        </label>
        <button className="btn btn-ghost btn-sm" onClick={() => setSalt(x => x + 1)} title="Draw a different buyer"><Icon name="rotateCcw" size={13} /> New buyer</button>
      </div>

      {state && (
        <>
          {/* mandate levers + envelope */}
          <div className="hs-lever-panel">
            <div className="hs-levers">
              <div className="hs-lever">
                <div className="row between"><span>Max discount</span><b>{policy.maxDiscountPct}%</b></div>
                <input type="range" min="5" max="25" value={maxDisc} onChange={e => setMaxDisc(+e.target.value)} />
              </div>
              <div className="hs-lever">
                <div className="row between"><span>Walk away below</span><b>{policy.walkAwayPct}%</b></div>
                <input type="range" min="12" max="35" value={walkAway} onChange={e => setWalkAway(+e.target.value)} />
              </div>
              <div className="hs-strat-note">{STRATEGIES.find(s => s.id === strategy)?.blurb}</div>
            </div>
            <Envelope s={state} />
          </div>

          <div className="hs-grid">
            {/* the negotiation table */}
            <div className="hs-panel">
              <div className="hs-table fx-scan">
                <span className="hs-link-beam" aria-hidden />
                <div className="hs-agent ours">
                  <span className="hs-agent-ic fx-pulse"><Icon name="sparkles" size={16} /></span>
                  <div><div className="hs-agent-name">{state.seller.agentName}</div><div className="hs-agent-sub">Seller - {state.seller.principal} - {STRATEGIES.find(s => s.id === strategy)?.name}</div></div>
                </div>
                <div className="hs-vs"><span>A2A</span></div>
                <div className="hs-agent theirs">
                  <span className="hs-agent-ic fx-pulse"><Icon name="user" size={16} /></span>
                  <div><div className="hs-agent-name">{state.buyer.agentName}</div><div className="hs-agent-sub">Buyer - {state.buyer.principal}</div></div>
                </div>
              </div>

              <div className="hs-thread" ref={threadRef}>
                {state.turns.map(r => (
                  <div key={r.n} className={`hs-msg ${r.actor === 'ours' ? 'ours' : 'theirs'} ${r.kind}`}>
                    <div className="hs-msg-head">
                      <span className="hs-msg-agent">{r.agent}</span>
                      {typeof r.offer === 'number' && r.offer > 0 && <span className="hs-msg-offer">{fmtMoney(r.offer)}</span>}
                    </div>
                    <div className="hs-msg-body">{r.message}</div>
                    {r.note && <div className="hs-msg-note">{r.note}</div>}
                  </div>
                ))}
                {autoplay && state.status === 'live' && <div className="hs-typing theirs"><span /><span /><span /></div>}
              </div>

              {/* turn controls */}
              {state.status === 'live' ? (
                <div className="hs-moves">
                  <div className="hs-moves-lead">Your move, or <button className="hs-auto" onClick={() => setAutoplay(a => !a)}>{autoplay ? 'pause' : 'auto-play'}</button>:</div>
                  <div className="hs-move-btns">
                    {MOVES.map(mv => (
                      <button key={mv.id} className={`hs-move ${mv.id === 'walk' ? 'danger' : ''}`} onClick={() => step(mv.id)}>
                        <Icon name={mv.icon} size={13} /> {mv.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="hs-moves done">
                  <button className="btn btn-ghost btn-sm" onClick={() => setSalt(x => x + 1)}><Icon name="rotateCcw" size={13} /> Run it again with a new buyer</button>
                </div>
              )}
            </div>

            {/* right rail: buyer, gauge, mandate chain, outcome */}
            <aside className="hs-side">
              <div className="hs-arche">
                <div className="hs-arche-top"><Icon name="user" size={14} /> <b>{state.buyer.archeName}</b><span className="hs-arche-pow">leverage {state.buyer.power}%</span></div>
                <div className="hs-arche-tac">{state.buyer.tactic}</div>
              </div>

              <div className="hs-gauges">
                <Gauge label="Margin retained" value={gauge.marginPct} tone="#0e9f8f" />
                <Gauge label="Win likelihood" value={gauge.winProb} tone="#7c5cf7" />
              </div>

              <SectionHeader title="AP2 mandate chain" sub="Every settlement is a chain of signed verifiable credentials." />
              <Mandate kind="intent" m={fin?.mandates.intent || finalize(state).mandates.intent} live={state.turns.length >= 1} />
              <div className="hs-chain-link" data-on={done && fin.outcome.status !== 'impasse'}><Icon name="arrowDown" size={14} /></div>
              <Mandate kind="cart" m={fin?.mandates.cart} live={done && fin.outcome.status !== 'impasse'} />
              <div className="hs-chain-link" data-on={done && fin.outcome.status !== 'impasse'}><Icon name="arrowDown" size={14} /></div>
              <Mandate kind="payment" m={fin?.mandates.payment} live={done && fin.outcome.status !== 'impasse'} />

              {fin && statusMeta && (
                <div className="hs-outcome" style={{ '--tone': statusMeta.tone }}>
                  <div className="hs-outcome-head"><Icon name={statusMeta.icon} size={16} /> {statusMeta.label}</div>
                  <div className="hs-outcome-body">{fin.outcome.status === 'impasse'
                    ? `Buyer's ceiling of ${fmtMoney(fin.outcome.buyerCap)} sits below the ${fmtMoney(fin.outcome.walk)} walk-away. Your agent held the line and escalated with the full transcript.`
                    : `Settled ${fmtMoney(fin.outcome.settle)} of ${fmtMoney(fin.outcome.list)} list (${fin.outcome.discountPct}% off) in ${fin.outcome.rounds} turns${fin.outcome.termsTraded ? `, ${fin.outcome.termsTraded} term(s) traded` : ''}.`}</div>
                  {fin.outcome.status !== 'impasse' && (
                    signed
                      ? <div className="hs-signed"><Icon name="check" size={14} /> Countersigned. Committed to the CRM.</div>
                      : <button className="btn btn-ai" onClick={countersign}><Icon name="lock" size={14} /> Countersign + commit</button>
                  )}
                  {fin.proposal?.actions?.length > 0 && (
                    <ul className="hs-actions">{fin.proposal.actions.map((a, i) => <li key={i}><Icon name="chevronRight" size={12} /> {a.label}</li>)}</ul>
                  )}
                </div>
              )}
            </aside>
          </div>
        </>
      )}

      <div className="hs-foot">
        <Icon name="globe" size={14} />
        <span>Ardovo publishes a public <b>A2A agent card</b> at <code>/api/handshake</code> with the AP2 extension declared. Any compliant buyer agent can discover it, verify intent, and negotiate. This is the CRM built for the agent economy, not retrofitted for it.</span>
      </div>
    </div>
  );
}
