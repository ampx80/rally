// Handshake - Ardovo's Agent-to-Agent Deal Room. The counter-agent commerce
// surface: your Ardovo Deal Agent negotiates live with the BUYER'S Buying Agent
// over the open agentic-commerce stack (A2A + AP2), bounded by your governance
// mandate, and settles with a signed Intent -> Cart -> Payment mandate chain
// that a human countersigns. Nothing commits to the CRM without that click.
// Teal is product truth, violet is the AI layer. NO em-dash / en-dash. ASCII only.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store.js';
import { SectionHeader, Badge, EmptyState, useToast } from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import AgentDeck from '../components/agent/AgentDeck.jsx';
import {
  negotiate, negotiateSmart, applyOutcome, negotiableDeals, defaultDealId, fmtMoney, AP2, DEFAULT_POLICY,
} from '../lib/handshake.js';
import './handshake.css';

const STATUS_META = {
  agreed: { label: 'Agreed, inside mandate', tone: '#0e9f8f', icon: 'check' },
  needs_human: { label: 'Terms reached, needs your countersignature', tone: '#7c5cf7', icon: 'roleShield' },
  impasse: { label: 'Impasse, mandate protected, escalated', tone: '#c0392b', icon: 'shield' },
};

function Mandate({ kind, m, live }) {
  if (!m) return null;
  const titles = { intent: 'Intent Mandate', cart: 'Cart Mandate', payment: 'Payment Mandate' };
  const sigs = m.signatures || (m.signature ? [m.signature] : []);
  return (
    <div className={`hs-mandate ${live ? 'on' : ''}`}>
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
          {m.items.map((it, i) => (
            <div key={i} className="row between"><span className="ellip">{it.name}</span><b>{fmtMoney(it.total)}</b></div>
          ))}
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
        {sigs.map((s, i) => (
          <span key={i} className="hs-sig" title={`${s.role} - ${s.alg}`}>
            <Icon name="lock" size={11} /> {s.signer.split(' ')[0]} <code>{s.sig.slice(0, 12)}...</code>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Handshake() {
  useStore();
  const toast = useToast();
  const nav = useNavigate();
  const deals = negotiableDeals();
  const [dealId, setDealId] = useState(() => defaultDealId());
  const [live, setLive] = useState(false);
  const [session, setSession] = useState(null);
  const [shown, setShown] = useState(0);
  const [running, setRunning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [loadingLive, setLoadingLive] = useState(false);
  const [pendingRun, setPendingRun] = useState(false);
  const threadRef = useRef(null);

  useEffect(() => {
    if (!dealId) { setSession(null); return; }
    setSession(negotiate(dealId));
    setShown(0); setSigned(false); setRunning(false);
  }, [dealId]);

  // Rook (by voice or chat) can open + auto-run a negotiation via this event.
  useEffect(() => {
    function onHs(e) {
      const q = String(e.detail?.query || '').trim().toLowerCase();
      if (q) {
        const m = deals.find(d => (d.name || '').toLowerCase().includes(q)) || deals.find(d => q.includes((d.name || '').split(' - ')[0].toLowerCase()));
        if (m) setDealId(m.id);
      }
      if (e.detail?.run) setPendingRun(true);
    }
    window.addEventListener('rally:handshake', onHs);
    return () => window.removeEventListener('rally:handshake', onHs);
  }, [deals]);

  useEffect(() => {
    if (pendingRun && session) { setPendingRun(false); run(); }
    // eslint-disable-next-line
  }, [pendingRun, session]);

  // Deep link from a deal: /handshake?deal=<id>&run=1 preselects + auto-runs.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const d = params.get('deal');
    if (d && deals.some(x => x.id === d)) setDealId(d);
    if (params.get('run') === '1') setPendingRun(true);
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (!running || !session) return;
    if (shown >= session.rounds.length) { setRunning(false); return; }
    const t = setTimeout(() => setShown(n => n + 1), 850);
    return () => clearTimeout(t);
  }, [running, shown, session]);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [shown]);

  const done = session && shown >= session.rounds.length && !running;
  const outcome = session?.outcome;
  const statusMeta = outcome ? (STATUS_META[outcome.status] || STATUS_META.needs_human) : null;

  async function run() {
    if (!dealId) return;
    setSigned(false); setShown(0); setRunning(false);
    if (live) {
      setLoadingLive(true);
      const s = await negotiateSmart(dealId, { salt: Math.floor(Math.random() * 9999) });
      setLoadingLive(false);
      setSession(s); setShown(0); setRunning(true);
      if (!s.live) toast('Live counterparty not configured - running the deterministic engine.');
    } else {
      setSession(negotiate(dealId, { salt: Math.floor(Math.random() * 9999) }));
      setShown(0); setRunning(true);
    }
  }
  function skip() { if (session) { setShown(session.rounds.length); setRunning(false); } }
  function countersign() {
    if (!session) return;
    const r = applyOutcome(session);
    if (r.ok) { setSigned(true); toast(`Countersigned. ${session.proposal.actions.length} action(s) committed to ${session.deal.name}.`); }
  }

  const pods = useMemo(() => {
    if (!outcome) return [];
    return [
      { label: 'List price', value: outcome.list, format: (n) => fmtMoney(n), icon: 'dollar' },
      { label: 'Agent settled', value: outcome.settle, format: (n) => fmtMoney(n), icon: 'gitBranch' },
      { label: 'Discount', value: outcome.discountPct, format: (n) => `${n}%`, icon: 'trendUp' },
      { label: 'Buyer leverage', value: outcome.buyerPower, format: (n) => `${n}%`, icon: 'gauge' },
    ];
  }, [outcome]);

  if (!deals.length) {
    return (
      <div className="fade-up">
        <AgentDeck eyebrow="Handshake" title="The buyer brought their own AI." highlight="Let yours negotiate." sub="No open deals to negotiate yet. Open a deal and your Deal Agent can meet the buyer's agent at the table." />
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
        sub="Your Ardovo Deal Agent negotiates directly with the buyer's Buying Agent over the open agent stack (A2A + AP2), inside your governance mandate. It settles with a signed Intent to Cart to Payment mandate chain that you countersign. Salesforce is an AP2 partner. Ardovo makes counter-agent commerce a product."
        actions={<>
          <button className="adk-btn" onClick={() => nav('/agent-api')}><Icon name="command" size={15} /> A2A agent card</button>
          <button className="adk-btn adk-btn--primary" onClick={run} disabled={loadingLive}><Icon name="play" size={15} /> {loadingLive ? 'Connecting...' : 'Run negotiation'}</button>
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
        <div className="hs-policy">
          <span className="hs-policy-chip"><Icon name="shield" size={12} /> Max discount {session?.policy?.maxDiscountPct ?? DEFAULT_POLICY.maxDiscountPct}%</span>
          <span className="hs-policy-chip"><Icon name="arrowDown" size={12} /> Walk away {session?.policy?.walkAwayPct ?? DEFAULT_POLICY.walkAwayPct}%</span>
          <span className="hs-policy-chip"><Icon name="roleShield" size={12} /> Human above {session?.policy?.humanAbovePct ?? DEFAULT_POLICY.humanAbovePct}%</span>
        </div>
        <label className="hs-toggle" title="Use a Claude-driven counterparty when configured">
          <input type="checkbox" checked={live} onChange={e => setLive(e.target.checked)} />
          <span>Live counterparty {session?.live ? '(on)' : ''}</span>
        </label>
        {session && !running && shown === 0 && <button className="btn btn-primary btn-sm" onClick={run} disabled={loadingLive}><Icon name="play" size={13} /> Run</button>}
        {running && <button className="btn btn-ghost btn-sm" onClick={skip}>Skip to result</button>}
      </div>

      {session && (
        <div className="hs-grid">
          {/* the negotiation table */}
          <div className="hs-panel">
            <div className="hs-table">
              <div className="hs-agent ours">
                <span className="hs-agent-ic"><Icon name="sparkles" size={16} /></span>
                <div><div className="hs-agent-name">{session.seller.name}</div><div className="hs-agent-sub">Seller - {session.seller.principal}</div></div>
              </div>
              <div className="hs-vs"><span>A2A</span></div>
              <div className="hs-agent theirs">
                <span className="hs-agent-ic"><Icon name="user" size={16} /></span>
                <div><div className="hs-agent-name">{session.buyer.name}</div><div className="hs-agent-sub">Buyer - {session.buyer.principal} ({session.buyer.style})</div></div>
              </div>
            </div>

            <div className="hs-thread" ref={threadRef}>
              {session.rounds.slice(0, shown).map(r => (
                <div key={r.n} className={`hs-msg ${r.actor === 'ours' ? 'ours' : 'theirs'} ${r.kind}`}>
                  <div className="hs-msg-head">
                    <span className="hs-msg-agent">{r.agent}</span>
                    {typeof r.offer === 'number' && r.offer > 0 && <span className="hs-msg-offer">{fmtMoney(r.offer)}</span>}
                  </div>
                  <div className="hs-msg-body">{r.message}</div>
                  {r.note && <div className="hs-msg-note">{r.note}</div>}
                </div>
              ))}
              {shown === 0 && (
                <div className="hs-idle">
                  <Icon name="messages" size={26} />
                  <p>Press <b>Run negotiation</b>. Watch your agent and the buyer's agent exchange signed offers and converge inside your mandate.</p>
                </div>
              )}
              {running && shown > 0 && shown < session.rounds.length && (
                <div className={`hs-typing ${session.rounds[shown]?.actor === 'ours' ? 'ours' : 'theirs'}`}><span /><span /><span /></div>
              )}
            </div>
          </div>

          {/* the AP2 mandate chain + governance */}
          <aside className="hs-side">
            <SectionHeader title="AP2 mandate chain" sub="Every settlement is a chain of signed verifiable credentials." />
            <Mandate kind="intent" m={session.mandates.intent} live={shown >= 1} />
            <div className="hs-chain-link" data-on={done && outcome.status !== 'impasse'}><Icon name="arrowDown" size={14} /></div>
            <Mandate kind="cart" m={session.mandates.cart} live={done && outcome.status !== 'impasse'} />
            <div className="hs-chain-link" data-on={done && outcome.status !== 'impasse'}><Icon name="arrowDown" size={14} /></div>
            <Mandate kind="payment" m={session.mandates.payment} live={done && outcome.status !== 'impasse'} />

            {done && statusMeta && (
              <div className="hs-outcome" style={{ '--tone': statusMeta.tone }}>
                <div className="hs-outcome-head"><Icon name={statusMeta.icon} size={16} /> {statusMeta.label}</div>
                <div className="hs-outcome-body">{session.outcome.status === 'impasse'
                  ? `Buyer wanted below the ${fmtMoney(session.outcome.walk)} walk-away. Your agent held the line and escalated with the full transcript.`
                  : `Settled ${fmtMoney(session.outcome.settle)} of ${fmtMoney(session.outcome.list)} list (${session.outcome.discountPct}% off), saving ${fmtMoney(session.outcome.savedVsList)} versus the buyer's opening ask.`}</div>
                {session.outcome.status !== 'impasse' && (
                  signed
                    ? <div className="hs-signed"><Icon name="check" size={14} /> Countersigned. Committed to the CRM.</div>
                    : <button className="btn btn-ai" onClick={countersign}><Icon name="lock" size={14} /> Countersign + commit</button>
                )}
                {session.proposal?.actions?.length > 0 && (
                  <ul className="hs-actions">{session.proposal.actions.map((a, i) => <li key={i}><Icon name="chevronRight" size={12} /> {a.label}</li>)}</ul>
                )}
              </div>
            )}
          </aside>
        </div>
      )}

      <div className="hs-foot">
        <Icon name="globe" size={14} />
        <span>Ardovo publishes a public <b>A2A agent card</b> at <code>/api/handshake</code> with the AP2 extension declared. Any compliant buyer agent can discover it, verify intent, and negotiate. This is the CRM built for the agent economy, not retrofitted for it.</span>
      </div>
    </div>
  );
}
