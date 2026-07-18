// Agent Cloud - Rally's agent control plane. The native answer to Agentforce
// Command Center: the fleet of specialized agents, a live run ledger with step
// traces and token/cost accounting, governance (per-agent autonomy + mandate),
// and an approvals stream wired to the real Night Shift engine. Grounded: the
// opening ledger is synthesized from actual pipeline signals, not fabricated.
// Teal is the product; violet marks the AI layer. NO em-dash / en-dash.
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, slippingDeals } from '../lib/store.js';
import { SectionHeader, StatCard, useToast, moneyK, relTime } from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import {
  useAgentCloud, getAgents, toggleAgent, runStats, seedRunsFromEngines,
  AUTONOMY, modelById,
} from '../lib/agent-cloud.js';
import {
  useNightShift, runNightShift, getNightShift, approveProposal, rejectProposal, nightShiftSummary,
} from '../lib/nightshift.js';

const AUTONOMY_TONE = { suggest: '#2563a8', approve: '#7c5cf7', auto: '#0e9f8f' };
const STATUS_TONE = { running: '#7c5cf7', awaiting_approval: '#e0752d', done: '#1a9f6d', failed: '#c0392b' };
const STATUS_LABEL = { running: 'Running', awaiting_approval: 'Needs approval', done: 'Done', failed: 'Failed' };
const autonomyMeta = (id) => AUTONOMY.find(a => a.id === id) || AUTONOMY[0];

export default function AgentCloud() {
  useStore();
  const ns = useNightShift();
  const cloud = useAgentCloud();
  const nav = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState('fleet');
  const [openRun, setOpenRun] = useState(null);

  // Ground the ledger from the real engines on first visit.
  useEffect(() => {
    let proposals = getNightShift().proposals;
    if (!proposals.length && ns.mandate?.enabled) { runNightShift(); proposals = getNightShift().proposals; }
    seedRunsFromEngines({
      proposals: proposals.map(p => ({ kind: p.kind, title: p.title, dealName: p.dealName, value: p.value, rationale: p.rationale })),
      slipping: slippingDeals().map(d => ({ name: d.name, value: d.value })),
    });
    // eslint-disable-next-line
  }, []);

  const agents = getAgents();
  const runs = cloud.runs;
  const stats = runStats();
  const nsSummary = nightShiftSummary();
  const staged = ns.proposals.filter(p => p.status === 'staged');

  const runsByAgent = useMemo(() => {
    const m = {};
    for (const r of runs) { (m[r.agentId] = m[r.agentId] || []).push(r); }
    return m;
  }, [runs]);

  return (
    <div className="fade-up ac">
      <SectionHeader
        title={<span className="row gap-2" style={{ alignItems: 'center' }}><span className="ac-mark"><Icon name="sparkles" size={18} /></span> Agent Cloud</span>}
        sub="Your fleet of agents, working the real book with traces, cost, and human-in-the-loop control. Agent-native from day one - not bolted onto a legacy core."
        action={
          <div className="row gap-2">
            <button className="btn btn-ghost btn-sm" onClick={() => nav('/agent-api')}><Icon name="command" size={15} /> Headless + MCP</button>
            <button className="btn btn-primary btn-sm" onClick={() => nav('/agent-studio')}><Icon name="plus" size={15} /> New agent</button>
          </div>
        }
      />

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', marginBottom: '1rem' }}>
        <StatCard label="Active agents" value={stats.activeAgents} sub={`of ${agents.length}`} icon={<Icon name="sparkles" size={18} />} accent="var(--ai)" />
        <StatCard label="Runs logged" value={stats.total} icon={<Icon name="activity" size={18} />} />
        <StatCard label="Awaiting approval" value={stats.awaiting + staged.length} icon={<Icon name="shield" size={18} />} accent="var(--warn)" />
        <StatCard label="Tokens used" value={stats.tokens} format={(n) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(Math.round(n))} icon={<Icon name="zap" size={18} />} />
        <StatCard label="Est. spend" value={stats.costUsd} format={(n) => `$${n.toFixed(2)}`} icon={<Icon name="dollar" size={18} />} />
      </div>

      <div className="row gap-2" style={{ marginBottom: '1rem', flexWrap: 'wrap' }}>
        {[['fleet', 'Fleet'], ['runs', `Runs (${runs.length})`], ['approvals', `Approvals (${staged.length})`], ['governance', 'Governance']].map(([k, label]) => (
          <button key={k} className={`btn btn-sm ${tab === k ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === 'fleet' && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '1rem' }}>
          {agents.map(a => {
            const am = autonomyMeta(a.autonomy);
            const last = (runsByAgent[a.id] || [])[0];
            return (
              <div key={a.id} className="ac-agent" data-off={a.status !== 'active'}>
                <div className="row gap-2" style={{ alignItems: 'flex-start' }}>
                  <span className="ac-agent-ico"><Icon name={a.icon} size={18} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row between" style={{ alignItems: 'center' }}>
                      <span className="ac-agent-name">{a.name}</span>
                      <button className="ac-power" data-on={a.status === 'active'} onClick={() => { toggleAgent(a.id); toast(a.status === 'active' ? 'Agent paused' : 'Agent activated'); }} title={a.status === 'active' ? 'Pause' : 'Activate'}>
                        <span />
                      </button>
                    </div>
                    <div className="ac-agent-role">{a.role}</div>
                  </div>
                </div>
                <div className="ac-agent-meta">
                  <span className="ac-chip" style={{ color: AUTONOMY_TONE[a.autonomy], background: AUTONOMY_TONE[a.autonomy] + '18' }}>{am.label}</span>
                  <span className="ac-chip ac-chip--muted">{modelById(a.model).label}</span>
                  <span className="ac-chip ac-chip--muted">{a.tools.length} tools</span>
                </div>
                <div className="ac-agent-foot">
                  <span>{last ? `Last run ${relTime(last.startedAt)}` : 'No runs yet'}</span>
                  <button className="ac-link" onClick={() => { setTab('runs'); }}>{last ? 'View runs' : 'Idle'} <Icon name="chevronRight" size={13} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'runs' && (
        <div className="col gap-2">
          {runs.length === 0 && <div className="ac-empty">No runs yet. As agents work the book, every run lands here with its full trace.</div>}
          {runs.map(r => (
            <div key={r.id} className="ac-run">
              <button className="ac-run-head" onClick={() => setOpenRun(openRun === r.id ? null : r.id)}>
                <span className="ac-status" style={{ color: STATUS_TONE[r.status], background: STATUS_TONE[r.status] + '18' }}>
                  {r.status === 'running' && <span className="ac-spin" />}{STATUS_LABEL[r.status] || r.status}
                </span>
                <span className="ac-run-agent">{r.agentName}</span>
                <span className="ac-run-trigger">{r.trigger}</span>
                <span className="ac-run-time">{relTime(r.startedAt)}</span>
                <span className="ac-run-cost">{r.tokensIn + r.tokensOut >= 1000 ? `${Math.round((r.tokensIn + r.tokensOut) / 1000)}K tok` : `${r.tokensIn + r.tokensOut} tok`} - ${r.costUsd.toFixed(3)}</span>
                <Icon name="chevronDown" size={15} className="ac-run-chev" style={{ transform: openRun === r.id ? 'rotate(180deg)' : 'none' }} />
              </button>
              {openRun === r.id && (
                <div className="ac-run-body">
                  {r.findings && <div className="ac-findings">{r.findings}</div>}
                  <div className="ac-trace">
                    {r.steps.map((s, i) => (
                      <div key={i} className="ac-step" data-kind={s.kind}>
                        <span className="ac-step-dot" />
                        <div style={{ minWidth: 0 }}>
                          <div className="ac-step-label">{s.label}</div>
                          {s.detail && <div className="ac-step-detail">{s.detail}</div>}
                        </div>
                        <span className="ac-step-tok">{s.tokensIn + s.tokensOut} tok</span>
                      </div>
                    ))}
                  </div>
                  {r.status === 'awaiting_approval' && (
                    <button className="btn btn-primary btn-sm" style={{ marginTop: '.6rem' }} onClick={() => nav('/night-shift')}><Icon name="shield" size={14} /> Review in Night Shift</button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'approvals' && (
        <div className="col gap-2">
          {staged.length === 0 && <div className="ac-empty">Nothing needs you. Agents in Approve mode will stage their work here for a one-click yes.</div>}
          {staged.map(p => (
            <div key={p.id} className="ac-approval">
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="row gap-2" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="ac-chip" style={{ color: 'var(--ai-600)', background: 'var(--ai-50)' }}>{p.kind}</span>
                  <span className="ac-approval-title">{p.dealName}</span>
                  <span className="ac-run-cost">{moneyK(p.value)}</span>
                </div>
                <div className="ac-step-detail" style={{ marginTop: 3 }}>{p.before} -&gt; {p.after}</div>
              </div>
              <div className="row gap-2" style={{ flex: 'none' }}>
                <button className="btn btn-primary btn-sm" onClick={() => { const r = approveProposal(p.id); toast(r.error || 'Applied - reversible in Night Shift', r.error ? 'risk' : 'ok'); }}><Icon name="check" size={14} /> Approve</button>
                <button className="btn btn-ghost btn-sm" onClick={() => { rejectProposal(p.id); toast('Rejected'); }}><Icon name="x" size={14} /></button>
              </div>
            </div>
          ))}
          {nsSummary.approved > 0 && <div className="ac-empty" style={{ textAlign: 'left' }}>{nsSummary.approved} change{nsSummary.approved === 1 ? '' : 's'} applied and reversible. {moneyK(nsSummary.atStake)} still staged.</div>}
        </div>
      )}

      {tab === 'governance' && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '1rem' }}>
          <div className="ac-gov">
            <div className="ac-gov-head"><Icon name="shield" size={16} /> Mandate</div>
            <p className="ac-gov-p">Every agent runs inside an IAM envelope: an autonomy level, a deal-size cap, and a per-run action budget. Anything outside the lines escalates to you instead of executing.</p>
            <div className="ac-gov-rows">
              {AUTONOMY.map(a => (
                <div key={a.id} className="ac-gov-row"><span className="ac-chip" style={{ color: AUTONOMY_TONE[a.id], background: AUTONOMY_TONE[a.id] + '18' }}>{a.label}</span><span className="ac-step-detail">{a.blurb}</span></div>
              ))}
            </div>
          </div>
          <div className="ac-gov">
            <div className="ac-gov-head"><Icon name="lock" size={16} /> Trust layer</div>
            <p className="ac-gov-p">Zero data retention: your book never trains a model. Every write is reversible and audit-logged. Bring your own LLM, or route per-agent across models.</p>
            <div className="ac-gov-rows">
              <div className="ac-gov-row"><span className="ac-chip ac-chip--ok">Zero retention</span><span className="ac-step-detail">On</span></div>
              <div className="ac-gov-row"><span className="ac-chip ac-chip--ok">Reversible writes</span><span className="ac-step-detail">Diff of Record</span></div>
              <button className="ac-link" onClick={() => nav('/agent-trust')}>Model routing + trust settings <Icon name="chevronRight" size={13} /></button>
            </div>
          </div>
          <div className="ac-gov">
            <div className="ac-gov-head"><Icon name="activity" size={16} /> Consumption</div>
            <p className="ac-gov-p">Token and cost accounting across every run, per agent and per model. No surprise consumption bills.</p>
            <div className="ac-meter"><div className="ac-meter-fill" style={{ width: `${Math.min(100, (stats.tokens / 500000) * 100)}%` }} /></div>
            <div className="ac-step-detail">{stats.tokens.toLocaleString()} tokens - est. ${stats.costUsd.toFixed(2)} this session</div>
          </div>
        </div>
      )}

      <AgentCloudStyles />
    </div>
  );
}

function AgentCloudStyles() {
  return (
    <style>{`
    .ac-mark { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, var(--ai), var(--ai-600)); box-shadow: var(--ai-glow); }
    .ac-agent { background: var(--paper); border: 1px solid var(--line); border-radius: 14px; padding: 15px; display: flex; flex-direction: column; gap: 12px; transition: border-color .15s, box-shadow .15s; }
    .ac-agent:hover { border-color: rgba(124,92,247,.4); box-shadow: var(--shadow-sm); }
    .ac-agent[data-off="true"] { opacity: .6; }
    .ac-agent-ico { width: 38px; height: 38px; border-radius: 11px; flex: none; display: grid; place-items: center; color: var(--ai-600); background: var(--ai-50); }
    .ac-agent-name { font-weight: 800; font-size: 15px; color: var(--ink); }
    .ac-agent-role { font-size: 12.5px; color: var(--n-600); line-height: 1.45; margin-top: 2px; }
    .ac-agent-meta { display: flex; flex-wrap: wrap; gap: 6px; }
    .ac-chip { font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 999px; text-transform: capitalize; }
    .ac-chip--muted { color: var(--n-600); background: var(--n-100); }
    .ac-chip--ok { color: var(--ok); background: var(--ok-bg); }
    .ac-agent-foot { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--line); padding-top: 10px; font-size: 12px; color: var(--n-600); }
    .ac-link { display: inline-flex; align-items: center; gap: 3px; background: none; border: none; font-family: inherit; font-weight: 700; font-size: 12.5px; color: var(--ai-600); cursor: pointer; }
    .ac-power { width: 38px; height: 22px; border-radius: 999px; border: none; cursor: pointer; background: var(--n-300, #cbd2dc); position: relative; flex: none; transition: background .2s; }
    .ac-power[data-on="true"] { background: var(--ai); }
    .ac-power span { position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: left .2s; box-shadow: 0 1px 3px rgba(0,0,0,.3); }
    .ac-power[data-on="true"] span { left: 19px; }

    .ac-empty { padding: 22px; text-align: center; color: var(--n-600); font-size: 14px; background: var(--n-25); border: 1px dashed var(--line-strong); border-radius: 12px; }
    .ac-run { border: 1px solid var(--line); border-radius: 12px; background: var(--paper); overflow: hidden; }
    .ac-run-head { display: flex; align-items: center; gap: 12px; width: 100%; font-family: inherit; background: none; border: none; padding: 12px 14px; cursor: pointer; text-align: left; }
    .ac-run-head:hover { background: var(--n-25); }
    .ac-status { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 800; padding: 4px 10px; border-radius: 999px; flex: none; }
    .ac-spin { width: 7px; height: 7px; border-radius: 50%; border: 2px solid currentColor; border-top-color: transparent; animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .ac-run-agent { font-weight: 700; font-size: 14px; color: var(--ink); }
    .ac-run-trigger { font-size: 12px; color: var(--n-600); text-transform: capitalize; }
    .ac-run-time { font-size: 12px; color: var(--n-600); margin-left: auto; }
    .ac-run-cost { font-size: 12px; color: var(--n-600); font-variant-numeric: tabular-nums; }
    .ac-run-chev { color: var(--n-400); flex: none; }
    .ac-run-body { padding: 4px 16px 16px; border-top: 1px solid var(--line); }
    .ac-findings { font-size: 13px; color: var(--ink-2); background: var(--ai-50); border-radius: 9px; padding: 9px 11px; margin: 12px 0; }
    .ac-trace { display: flex; flex-direction: column; gap: 2px; position: relative; padding-left: 6px; }
    .ac-step { display: flex; align-items: flex-start; gap: 10px; padding: 7px 0; }
    .ac-step-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--n-400); margin-top: 4px; flex: none; }
    .ac-step[data-kind="proposal"] .ac-step-dot { background: var(--ai); }
    .ac-step[data-kind="finding"] .ac-step-dot { background: var(--warn); }
    .ac-step-label { font-size: 13.5px; font-weight: 600; color: var(--ink); }
    .ac-step-detail { font-size: 12.5px; color: var(--n-600); line-height: 1.4; }
    .ac-step-tok { font-size: 11px; color: var(--n-400); margin-left: auto; flex: none; }

    .ac-approval { display: flex; align-items: center; gap: 12px; border: 1px solid var(--line); border-radius: 12px; background: var(--paper); padding: 12px 14px; }
    .ac-approval-title { font-weight: 700; font-size: 14px; color: var(--ink); }

    .ac-gov { background: var(--paper); border: 1px solid var(--line); border-radius: 14px; padding: 16px; }
    .ac-gov-head { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 14.5px; color: var(--ink); margin-bottom: 8px; }
    .ac-gov-p { font-size: 13px; color: var(--n-600); line-height: 1.5; margin: 0 0 12px; }
    .ac-gov-rows { display: flex; flex-direction: column; gap: 9px; }
    .ac-gov-row { display: flex; align-items: center; gap: 9px; }
    .ac-meter { height: 9px; border-radius: 999px; background: var(--n-100); overflow: hidden; margin-bottom: 8px; }
    .ac-meter-fill { height: 100%; background: linear-gradient(90deg, var(--ai), var(--ai-600)); border-radius: 999px; }
    `}</style>
  );
}
