// ============================================================
// ROOK LIVE - the agentic operator console on the Command Center home.
//
// This is the frontier move: instead of a chat button you have to poke,
// Rook is ALREADY running your book the moment you land. A fleet of
// specialized agents works the live pipeline; anything that needs a human
// surfaces here as a reversible, provenance-backed proposal you approve or
// reject in one click.
//
// GROUNDED + REVERSIBLE, NOT A SIM: this is a thin presentation layer over
// the real Night Shift engine (src/lib/nightshift.js). runNightShift() is a
// pure read of the live store; approve/reject fire the same audited store
// writers the rest of the app uses, and every applied change stores its
// inverse so it reverts in one click. No new fake data is introduced here.
//
// This is a Rook / AI surface, so it wears the violet --ai accent by design
// (teal stays the product color everywhere else). NO em-dash / en-dash.
// ============================================================
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../icons.jsx';
import { useToast, relTime } from '../UI.jsx';
import {
  useNightShift, runNightShift, approveProposal, rejectProposal, approveAll,
  nightShiftSummary, fmtMoney,
} from '../../lib/nightshift.js';

/* The fleet. Each agent maps to a real proposal kind the engine produces,
   so its live status is derived from the actual book, never invented. */
const AGENTS = [
  { key: 'advance', name: 'Pipeline Guardian', icon: 'trendUp', idle: 'Every stage is honest', busy: (n) => `${n} stage${n === 1 ? '' : 's'} to advance` },
  { key: 'draft', name: 'Follow-up Writer', icon: 'mail', idle: 'Nothing has gone cold', busy: (n) => `${n} re-engagement${n === 1 ? '' : 's'} drafted` },
  { key: 'task', name: 'Deal Rescue', icon: 'shield', idle: 'No deal is exposed', busy: (n) => `${n} rescue${n === 1 ? '' : 's'} lined up` },
];

const KIND_LABEL = { advance: 'Stage advance', draft: 'Follow-up', task: 'Next-best task' };

function ProposalRow({ p, onOpenDeal }) {
  const toast = useToast();
  const approve = () => {
    const r = approveProposal(p.id);
    toast(r.error ? r.error : 'Applied. Reversible in one click from Night Shift.', r.error ? 'risk' : 'ok');
  };
  const reject = () => { rejectProposal(p.id); toast('Rejected. Nothing changed.'); };
  return (
    <div className="rl-prop">
      <div className="rl-prop-main">
        <div className="rl-prop-head">
          <span className="rl-kind" data-kind={p.kind}>{KIND_LABEL[p.kind] || 'Change'}</span>
          <button type="button" className="rl-prop-title" onClick={() => onOpenDeal(p.dealId)}>{p.dealName}</button>
          <span className="rl-prop-val">{fmtMoney(p.value)}</span>
        </div>
        <div className="rl-diff">
          <span className="rl-diff-del">{p.before}</span>
          <Icon name="chevronRight" size={13} />
          <span className="rl-diff-add">{p.after}</span>
        </div>
        <div className="rl-why"><Icon name="sparkles" size={13} /> {p.provenance?.[0] || p.rationale}</div>
      </div>
      <div className="rl-prop-actions">
        <button type="button" className="rl-btn rl-btn-approve" onClick={approve}><Icon name="check" size={15} /> Approve</button>
        <button type="button" className="rl-btn rl-btn-reject" onClick={reject} aria-label="Reject"><Icon name="x" size={15} /></button>
      </div>
    </div>
  );
}

export default function RookLive() {
  const ns = useNightShift();
  const nav = useNavigate();
  const toast = useToast();
  const ranOnce = useRef(false);

  // Alive on first load: if the operator has nothing staged, run one pass so
  // the home is never a dead console. Guarded so we never loop on re-render.
  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;
    if (ns.mandate?.enabled && ns.proposals.length === 0) runNightShift();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const staged = ns.proposals.filter(p => p.status === 'staged');
  const summary = nightShiftSummary();
  const enabled = !!ns.mandate?.enabled;

  const fleet = AGENTS.map(a => {
    const n = staged.filter(p => p.kind === a.key).length;
    return { ...a, n };
  });

  const shown = staged.slice(0, 4);
  const more = staged.length - shown.length;

  const doRun = () => {
    const r = runNightShift();
    toast(r.staged ? `Rook staged ${r.staged} change${r.staged === 1 ? '' : 's'} for you.` : 'Your book is clean. Nothing needs you.', r.staged ? 'ok' : 'default');
  };
  const doApproveAll = () => {
    const r = approveAll();
    toast(r.approved ? `Applied ${r.approved} change${r.approved === 1 ? '' : 's'}. Each is reversible.` : 'Nothing to apply.', r.approved ? 'ok' : 'default');
  };

  return (
    <section className="rl cc-rise">
      <div className="rl-head">
        <div className="rl-head-l">
          <span className="rl-mark"><Icon name="sparkles" size={18} fill="currentColor" stroke={0} /></span>
          <div className="rl-head-txt">
            <div className="rl-title">
              Rook is running your book
              <span className="rl-pulse" data-on={enabled}><span /> {enabled ? 'Live' : 'Paused'}</span>
            </div>
            <div className="rl-sub">
              {ns.lastRunAt
                ? `Last pass ${relTime(ns.lastRunAt)} - ${staged.length} change${staged.length === 1 ? '' : 's'} waiting, ${fmtMoney(summary.atStake)} in play. Nothing moved without you.`
                : 'A fleet of agents watches every deal and only interrupts you when it matters.'}
            </div>
          </div>
        </div>
        <div className="rl-head-r">
          <button type="button" className="rl-ghost" onClick={doRun}><Icon name="activity" size={15} /> Run a pass</button>
          <button type="button" className="rl-ghost" onClick={() => nav('/night-shift')}>Night Shift <Icon name="chevronRight" size={14} /></button>
        </div>
      </div>

      <div className="rl-fleet">
        {fleet.map(a => (
          <div key={a.key} className="rl-agent" data-busy={a.n > 0}>
            <span className="rl-agent-ico"><Icon name={a.icon} size={17} /></span>
            <div className="rl-agent-txt">
              <div className="rl-agent-name">{a.name}</div>
              <div className="rl-agent-status">{a.n > 0 ? a.busy(a.n) : a.idle}</div>
            </div>
            <span className="rl-agent-dot" data-busy={a.n > 0} />
          </div>
        ))}
      </div>

      {staged.length > 0 ? (
        <div className="rl-stream">
          <div className="rl-stream-head">
            <span className="rl-stream-title"><Icon name="shield" size={14} /> Needs your call ({staged.length})</span>
            <button type="button" className="rl-approve-all" onClick={doApproveAll}><Icon name="zap" size={14} fill="currentColor" stroke={0} /> Approve all</button>
          </div>
          <div className="rl-props">
            {shown.map(p => <ProposalRow key={p.id} p={p} onOpenDeal={(id) => nav(`/deals/${id}`)} />)}
          </div>
          {more > 0 && (
            <button type="button" className="rl-more" onClick={() => nav('/night-shift')}>
              {more} more in Night Shift <Icon name="chevronRight" size={13} />
            </button>
          )}
        </div>
      ) : (
        <div className="rl-clear">
          <Icon name="check" size={16} /> Rook worked your book and everything is inside its stage. It will surface the next move here the moment it matters.
        </div>
      )}

      <RookLiveStyles />
    </section>
  );
}

function RookLiveStyles() {
  return (
    <style>{`
    .rl { border: 1px solid rgba(124,92,247,.22); border-radius: var(--r-lg); overflow: hidden;
      background:
        radial-gradient(120% 140% at 0% 0%, rgba(124,92,247,.08), transparent 46%),
        radial-gradient(120% 140% at 100% 0%, rgba(124,92,247,.06), transparent 46%),
        var(--paper);
      box-shadow: var(--shadow-sm); }
    .rl-head { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; align-items: flex-start; padding: 1.15rem 1.3rem; }
    .rl-head-l { display: flex; gap: .8rem; align-items: flex-start; min-width: 0; }
    .rl-mark { width: 40px; height: 40px; border-radius: 12px; flex: none; display: grid; place-items: center; color: #fff;
      background: linear-gradient(135deg, var(--ai), var(--ai-600)); box-shadow: var(--ai-glow); }
    .rl-title { font-weight: 800; font-size: 1.15rem; letter-spacing: -.01em; display: inline-flex; align-items: center; gap: .6rem; flex-wrap: wrap; }
    .rl-pulse { display: inline-flex; align-items: center; gap: .35rem; font-size: .68rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: var(--ai-600); }
    .rl-pulse span { width: 7px; height: 7px; border-radius: 50%; background: var(--ai); box-shadow: 0 0 0 3px rgba(124,92,247,.18); }
    .rl-pulse[data-on="true"] span { animation: rlPulse 1.9s ease-in-out infinite; }
    .rl-pulse[data-on="false"] { color: var(--n-400); }
    .rl-pulse[data-on="false"] span { background: var(--n-400); box-shadow: none; animation: none; }
    @keyframes rlPulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
    .rl-sub { color: var(--n-600); font-size: .9rem; margin-top: .2rem; max-width: 62ch; line-height: 1.45; }
    .rl-head-r { display: flex; gap: .4rem; flex: none; flex-wrap: wrap; }
    .rl-ghost { display: inline-flex; align-items: center; gap: .35rem; font-family: inherit; font-weight: 700; font-size: .84rem; cursor: pointer;
      padding: .5rem .8rem; border-radius: var(--r-pill); border: 1px solid rgba(124,92,247,.28); background: var(--ai-50); color: var(--ai-600); transition: background .15s, transform .15s; }
    .rl-ghost:hover { background: rgba(124,92,247,.14); transform: translateY(-1px); }

    .rl-fleet { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: .6rem; padding: 0 1.3rem; }
    .rl-agent { display: flex; align-items: center; gap: .65rem; padding: .7rem .8rem; border-radius: var(--r-md); border: 1px solid var(--line);
      background: var(--n-25); transition: border-color .15s, box-shadow .15s; }
    .rl-agent[data-busy="true"] { border-color: rgba(124,92,247,.35); box-shadow: inset 0 0 0 1px rgba(124,92,247,.08); }
    .rl-agent-ico { width: 32px; height: 32px; border-radius: 9px; flex: none; display: grid; place-items: center; color: var(--ai-600); background: var(--ai-50); }
    .rl-agent-txt { min-width: 0; line-height: 1.3; }
    .rl-agent-name { font-weight: 700; font-size: .88rem; }
    .rl-agent-status { font-size: .78rem; color: var(--n-600); }
    .rl-agent[data-busy="true"] .rl-agent-status { color: var(--ai-600); font-weight: 600; }
    .rl-agent-dot { margin-left: auto; width: 8px; height: 8px; border-radius: 50%; flex: none; background: var(--n-200); }
    .rl-agent-dot[data-busy="true"] { background: var(--ai); box-shadow: 0 0 0 3px rgba(124,92,247,.16); animation: rlPulse 1.9s ease-in-out infinite; }

    .rl-stream { margin-top: 1rem; padding: 1rem 1.3rem 1.2rem; border-top: 1px solid var(--line); }
    .rl-stream-head { display: flex; justify-content: space-between; align-items: center; gap: .75rem; margin-bottom: .7rem; flex-wrap: wrap; }
    .rl-stream-title { display: inline-flex; align-items: center; gap: .4rem; font-weight: 800; font-size: .82rem; letter-spacing: .04em; text-transform: uppercase; color: var(--n-700); }
    .rl-approve-all { display: inline-flex; align-items: center; gap: .35rem; font-family: inherit; font-weight: 800; font-size: .82rem; cursor: pointer;
      padding: .45rem .8rem; border-radius: var(--r-pill); border: none; color: #fff; background: linear-gradient(100deg, var(--ai), var(--ai-600)); box-shadow: var(--ai-glow); transition: transform .15s; }
    .rl-approve-all:hover { transform: translateY(-1px); }

    .rl-props { display: flex; flex-direction: column; gap: .5rem; }
    .rl-prop { display: flex; gap: .8rem; align-items: center; justify-content: space-between; padding: .75rem .85rem; border: 1px solid var(--line); border-radius: var(--r-md); background: var(--paper); transition: border-color .15s, box-shadow .15s; animation: rlIn .35s var(--ease) both; }
    .rl-prop:hover { border-color: rgba(124,92,247,.3); box-shadow: var(--shadow-sm); }
    @keyframes rlIn { 0% { opacity: 0; transform: translateY(6px); } 100% { opacity: 1; transform: none; } }
    .rl-prop-main { min-width: 0; display: flex; flex-direction: column; gap: .3rem; }
    .rl-prop-head { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
    .rl-kind { font-size: .66rem; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; padding: .15rem .5rem; border-radius: 999px; color: var(--ai-600); background: var(--ai-50); flex: none; }
    .rl-prop-title { font-weight: 700; font-size: .95rem; background: transparent; border: none; padding: 0; cursor: pointer; color: var(--ink); text-align: left; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .rl-prop-title:hover { color: var(--ai-600); }
    .rl-prop-val { font-weight: 800; font-size: .86rem; color: var(--n-600); flex: none; font-variant-numeric: tabular-nums; }
    .rl-diff { display: inline-flex; align-items: center; gap: .45rem; font-size: .82rem; color: var(--n-600); }
    .rl-diff-del { text-decoration: line-through; opacity: .7; }
    .rl-diff-add { color: var(--ai-600); font-weight: 700; }
    .rl-why { display: inline-flex; align-items: flex-start; gap: .35rem; font-size: .82rem; color: var(--n-600); line-height: 1.4; }
    .rl-why svg { color: var(--ai); flex: none; margin-top: 2px; }
    .rl-prop-actions { display: flex; gap: .4rem; flex: none; }
    .rl-btn { display: inline-flex; align-items: center; gap: .3rem; font-family: inherit; font-weight: 700; font-size: .84rem; cursor: pointer; padding: .5rem .7rem; border-radius: var(--r-sm); border: 1px solid var(--line-strong); background: var(--paper); color: var(--n-700); transition: all .14s; }
    .rl-btn-approve { border-color: transparent; color: #fff; background: linear-gradient(100deg, var(--ai), var(--ai-600)); }
    .rl-btn-approve:hover { transform: translateY(-1px); box-shadow: var(--ai-glow); }
    .rl-btn-reject:hover { border-color: var(--risk); color: var(--risk); }
    .rl-more { margin-top: .6rem; display: inline-flex; align-items: center; gap: .3rem; background: transparent; border: none; cursor: pointer; font-family: inherit; font-weight: 700; font-size: .84rem; color: var(--ai-600); padding: .3rem 0; }

    .rl-clear { margin-top: .3rem; display: flex; align-items: center; gap: .5rem; padding: 1rem 1.3rem 1.3rem; color: var(--n-600); font-size: .9rem; line-height: 1.45; }
    .rl-clear svg { color: var(--ok); flex: none; }

    @media (max-width: 560px) {
      .rl-prop { flex-direction: column; align-items: stretch; }
      .rl-prop-actions { justify-content: flex-end; }
    }
    @media (prefers-reduced-motion: reduce) {
      .rl-pulse span, .rl-agent-dot, .rl-prop { animation: none !important; }
    }
    `}</style>
  );
}
