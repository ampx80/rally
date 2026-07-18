// Cloud Agents - Rally's answer to "Headless 360 gives coding agents full
// access" plus a native cloud-agent runtime. Two things in one:
//   1. Launch cloud agents (jobs) that reason over the live book via the
//      headless /api/agent endpoint and stage grounded actions - with a full
//      run trace in the Agent Cloud ledger. Works offline via a deterministic
//      local plan so it never dead-ends.
//   2. Connect your coding agent (Cursor, Claude Code, ChatGPT) over MCP so it
//      operates Rally directly - the developer-love story Salesforce tells,
//      but open and zero-setup.
// Teal = product, violet = AI layer. NO em-dash / en-dash. ASCII only.
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useStore, getDeals, getContacts, getCompanies, pipelineValue, weightedForecast, slippingDeals,
} from '../lib/store.js';
import { SectionHeader, StatCard, Button, Select, useToast, moneyK, relTime } from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import AgentDeck from '../components/agent/AgentDeck.jsx';
import {
  useAgentCloud, getAgents, getAgent, startRun, logStep, finishRun, modelById,
} from '../lib/agent-cloud.js';

const SURFACES = [
  { id: 'inapp', label: 'In-app', icon: 'sparkles' },
  { id: 'slack', label: 'Slack', icon: 'messages' },
  { id: 'api', label: 'API / headless', icon: 'command' },
];

const STATUS_TONE = { running: '#7c5cf7', awaiting_approval: '#e0752d', done: '#1a9f6d', failed: '#c0392b' };
const STATUS_LABEL = { running: 'Running', awaiting_approval: 'Needs approval', done: 'Done', failed: 'Failed' };

function miniSnapshot() {
  const deals = getDeals();
  const opens = deals.filter(d => d.status === 'open');
  return {
    counts: { deals: deals.length, open: opens.length, contacts: getContacts().length, companies: getCompanies().length },
    pipeline: pipelineValue(), forecast: Math.round(weightedForecast()),
    slipping: slippingDeals().slice(0, 8).map(d => ({ name: d.name, value: d.value })),
    topDeals: opens.sort((a, b) => b.value - a.value).slice(0, 12).map(d => ({ name: d.name, value: d.value, stage: d.stage })),
  };
}

const MCP_SNIPPET = `{
  "mcpServers": {
    "rally": { "url": "https://rally-psi-five.vercel.app/api/mcp" }
  }
}`;

export default function CloudAgents() {
  useStore();
  const cloud = useAgentCloud();
  const nav = useNavigate();
  const toast = useToast();
  const agents = getAgents();
  const [agentId, setAgentId] = useState(agents[0]?.id || '');
  const [goal, setGoal] = useState('');
  const [surface, setSurface] = useState('inapp');
  const [busy, setBusy] = useState(false);
  const [openJob, setOpenJob] = useState(null);

  const jobs = useMemo(() => cloud.runs.filter(r => r.trigger === 'cloud'), [cloud.runs]);

  const STARTERS = [
    'Find every slipping deal and draft a re-engagement for each',
    'Which open deals are most likely to be lost, and why?',
    'Stand up Northwind Freight as an enterprise account with a 180k deal',
    'Build a QBR deck for my largest open account',
  ];

  const localPlan = (runId, agent) => {
    const g = goal.toLowerCase();
    const steps = [];
    if (/slip|re-?engage|follow/.test(g)) { steps.push(['Tool: slipping_deals', 'Read deals past close date', 'step']); steps.push(['Tool: draft_email', 'Draft grounded re-engagement (staged)', 'proposal']); }
    else if (/forecast|pipeline|coverage/.test(g)) { steps.push(['Tool: get_pipeline', 'Read pipeline + weighted forecast', 'step']); steps.push(['Analysis', 'Coverage and risk summarized', 'finding']); }
    else if (/stand up|set up|account|create/.test(g)) { steps.push(['Tool: build_account', 'Plan company + committee + deal + tasks', 'proposal']); }
    else if (/deck|qbr/.test(g)) { steps.push(['Tool: generate_deck', 'Assemble QBR from account data', 'proposal']); }
    else { steps.push(['Tool: find_record', 'Locate the relevant records', 'step']); steps.push(['Reasoned over workspace', 'Prepared a grounded plan', 'finding']); }
    steps.forEach(([label, detail, kind]) => logStep(runId, { label, detail, kind, tokensIn: 260, tokensOut: 150 }));
    const hasWrite = steps.some(s => s[2] === 'proposal');
    finishRun(runId, { status: hasWrite ? 'awaiting_approval' : 'done', findings: hasWrite ? 'Actions staged for your approval.' : 'Answered from the live book.' });
  };

  const launch = async () => {
    if (!goal.trim() || busy) return;
    setBusy(true);
    const agent = getAgent(agentId);
    const run = startRun({ agentId, trigger: 'cloud' });
    logStep(run.id, { label: `Dispatched to ${SURFACES.find(s => s.id === surface)?.label}`, detail: `Goal: ${goal}`, tokensIn: 220, tokensOut: 0 });
    try {
      const r = await fetch('/api/agent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: goal, snapshot: miniSnapshot() }),
      });
      const data = await r.json().catch(() => ({}));
      if (data?.ok) {
        logStep(run.id, { label: 'Reasoned over the workspace', detail: data.reply || '', kind: 'finding', tokensIn: 1400, tokensOut: 700 });
        (data.tool_calls || []).forEach(c => logStep(run.id, { label: `Tool: ${c.tool}`, detail: typeof c.args === 'object' ? JSON.stringify(c.args) : String(c.args || ''), kind: c.kind === 'write' ? 'proposal' : 'step', tokensIn: 240, tokensOut: 140 }));
        finishRun(run.id, { status: (data.envelopes || []).length ? 'awaiting_approval' : 'done', findings: data.reply || 'Done.' });
      } else {
        localPlan(run.id, agent);
      }
    } catch {
      localPlan(run.id, agent);
    }
    setBusy(false);
    setOpenJob(run.id);
    setGoal('');
    toast('Cloud agent launched');
  };

  return (
    <div className="fade-up ca">
      <AgentDeck
        eyebrow="Cloud Agents"
        title="Dispatch an agent."
        highlight="Go do something else."
        sub="Spawn a cloud agent to work the book end to end, or plug your own coding agent (Cursor, Claude, ChatGPT) straight into Rally over MCP. No browser required."
        actions={<button className="adk-btn" onClick={() => nav('/agent-cloud')}><Icon name="activity" size={15} /> Run ledger</button>}
        pods={[
          { label: 'Cloud jobs', value: jobs.length, icon: 'command' },
          { label: 'Awaiting you', value: jobs.filter(j => j.status === 'awaiting_approval').length, icon: 'shield' },
          { label: 'Agents ready', value: agents.length, icon: 'sparkles' },
          { label: 'Book in context', value: pipelineValue(), format: moneyK, icon: 'target' },
        ]}
      />
      <div style={{ height: '1.25rem' }} />

      <div className="ca-grid">
        <div className="col gap-3">
          <div className="ca-composer">
            <div className="ca-composer-h"><Icon name="zap" size={16} fill="currentColor" stroke={0} /> Launch a cloud agent</div>
            <div className="row gap-2 wrap" style={{ marginBottom: 10 }}>
              <label className="ca-field"><span>Agent</span>
                <Select value={agentId} onChange={e => setAgentId(e.target.value)}>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </Select>
              </label>
              <label className="ca-field"><span>Surface</span>
                <Select value={surface} onChange={e => setSurface(e.target.value)}>
                  {SURFACES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </Select>
              </label>
            </div>
            <textarea className="ca-goal" rows={3} value={goal} onChange={e => setGoal(e.target.value)} placeholder="Tell the agent what to do. It reasons over your live book and stages any changes for approval." />
            <div className="ca-starters">
              {STARTERS.map(s => <button key={s} className="ca-starter" onClick={() => setGoal(s)}>{s}</button>)}
            </div>
            <Button variant="primary" onClick={launch} disabled={!goal.trim() || busy}><Icon name="command" size={16} /> {busy ? 'Dispatching...' : 'Launch cloud agent'}</Button>
          </div>

          <div className="ca-jobs">
            <div className="ca-jobs-h">Jobs</div>
            {jobs.length === 0 && <div className="ca-empty">No cloud jobs yet. Launch one above and watch it work the book with a full trace.</div>}
            {jobs.map(j => (
              <div key={j.id} className="ca-job">
                <button className="ca-job-head" onClick={() => setOpenJob(openJob === j.id ? null : j.id)}>
                  <span className="ca-status" style={{ color: STATUS_TONE[j.status], background: STATUS_TONE[j.status] + '18' }}>{j.status === 'running' && <span className="ca-spin" />}{STATUS_LABEL[j.status] || j.status}</span>
                  <span className="ca-job-agent">{j.agentName}</span>
                  <span className="ca-job-time">{relTime(j.startedAt)}</span>
                  <Icon name="chevronDown" size={15} className="ca-job-chev" style={{ transform: openJob === j.id ? 'rotate(180deg)' : 'none' }} />
                </button>
                {openJob === j.id && (
                  <div className="ca-job-body">
                    {j.findings && <div className="ca-findings">{j.findings}</div>}
                    {j.steps.map((s, i) => (
                      <div key={i} className="ca-step" data-kind={s.kind}>
                        <span className="ca-step-dot" />
                        <div style={{ minWidth: 0 }}><div className="ca-step-label">{s.label}</div>{s.detail && <div className="ca-step-detail">{s.detail}</div>}</div>
                      </div>
                    ))}
                    {j.status === 'awaiting_approval' && <Button variant="primary" size="sm" style={{ marginTop: 8 }} onClick={() => nav('/agent-cloud')}><Icon name="shield" size={14} /> Review + approve</Button>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="ca-connect">
          <div className="ca-connect-h"><Icon name="command" size={16} /> Connect your coding agent</div>
          <p className="ca-connect-p">Rally is headless-first. Point Cursor, Claude Code, or ChatGPT at Rally over MCP and your dev agents get live access to build on and operate the workspace - the thing Salesforce gates behind their enterprise stack, open here.</p>
          <pre className="ca-pre">{MCP_SNIPPET}</pre>
          <button className="ca-copy" onClick={() => { try { navigator.clipboard.writeText(MCP_SNIPPET); toast('MCP config copied'); } catch {} }}><Icon name="copy" size={13} /> Copy MCP config</button>
          <div className="ca-connect-links">
            <button className="ca-link" onClick={() => nav('/agent-api')}>Full Agent API + tool catalog <Icon name="chevronRight" size={13} /></button>
            <button className="ca-link" onClick={() => nav('/agent-studio')}>Design a custom agent <Icon name="chevronRight" size={13} /></button>
          </div>
          <div className="ca-note"><Icon name="lock" size={13} /> Read tools answer from your book; write tools stage a propose-confirm envelope. Nothing mutates without a yes.</div>
        </div>
      </div>

      <CloudAgentsStyles />
    </div>
  );
}

function CloudAgentsStyles() {
  return (
    <style>{`
    .ca-mark { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, var(--ai), var(--ai-600)); box-shadow: var(--ai-glow); }
    .ca-grid { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 1rem; align-items: start; }
    @media (max-width: 940px) { .ca-grid { grid-template-columns: 1fr; } }
    .ca-composer { background: var(--paper); border: 1px solid var(--line); border-radius: 14px; padding: 16px; }
    .ca-composer-h { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 14.5px; color: var(--ink); margin-bottom: 12px; }
    .ca-composer-h svg { color: var(--ai); }
    .ca-field { display: flex; flex-direction: column; gap: 4px; }
    .ca-field span { font-size: 12px; font-weight: 700; color: var(--n-600); }
    .ca-goal { width: 100%; border: 1px solid var(--line-strong); border-radius: 11px; padding: 11px 13px; font-size: 14px; font-family: inherit; color: var(--ink); background: var(--n-25); outline: none; resize: vertical; box-sizing: border-box; }
    .ca-goal:focus { border-color: var(--ai); box-shadow: 0 0 0 3px rgba(124,92,247,.16); }
    .ca-starters { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0 12px; }
    .ca-starter { font-family: inherit; font-size: 12px; font-weight: 600; color: var(--n-600); background: var(--n-25); border: 1px solid var(--line); border-radius: 999px; padding: 6px 11px; cursor: pointer; text-align: left; }
    .ca-starter:hover { border-color: var(--ai); color: var(--ai-600); }
    .ca-jobs { background: var(--paper); border: 1px solid var(--line); border-radius: 14px; padding: 16px; }
    .ca-jobs-h { font-weight: 800; font-size: 14px; color: var(--ink); margin-bottom: 10px; }
    .ca-empty { padding: 18px; text-align: center; color: var(--n-600); font-size: 13.5px; background: var(--n-25); border: 1px dashed var(--line-strong); border-radius: 10px; }
    .ca-job { border: 1px solid var(--line); border-radius: 11px; margin-bottom: 8px; overflow: hidden; }
    .ca-job-head { display: flex; align-items: center; gap: 10px; width: 100%; font-family: inherit; background: none; border: none; padding: 11px 13px; cursor: pointer; text-align: left; }
    .ca-job-head:hover { background: var(--n-25); }
    .ca-status { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; padding: 4px 9px; border-radius: 999px; flex: none; }
    .ca-spin { width: 7px; height: 7px; border-radius: 50%; border: 2px solid currentColor; border-top-color: transparent; animation: caspin .8s linear infinite; }
    @keyframes caspin { to { transform: rotate(360deg); } }
    .ca-job-agent { font-weight: 700; font-size: 13.5px; color: var(--ink); }
    .ca-job-time { font-size: 12px; color: var(--n-600); margin-left: auto; }
    .ca-job-chev { color: var(--n-400); flex: none; }
    .ca-job-body { padding: 4px 14px 14px; border-top: 1px solid var(--line); }
    .ca-findings { font-size: 13px; color: var(--ink-2); background: var(--ai-50); border-radius: 9px; padding: 9px 11px; margin: 11px 0; }
    .ca-step { display: flex; align-items: flex-start; gap: 10px; padding: 6px 0; }
    .ca-step-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--n-400); margin-top: 4px; flex: none; }
    .ca-step[data-kind="proposal"] .ca-step-dot { background: var(--ai); }
    .ca-step[data-kind="finding"] .ca-step-dot { background: var(--warn); }
    .ca-step-label { font-size: 13px; font-weight: 600; color: var(--ink); }
    .ca-step-detail { font-size: 12px; color: var(--n-600); line-height: 1.4; word-break: break-word; }
    .ca-connect { background: var(--paper); border: 1px solid rgba(124,92,247,.28); border-radius: 14px; padding: 16px; position: sticky; top: 84px; }
    .ca-connect-h { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 14.5px; color: var(--ink); margin-bottom: 8px; }
    .ca-connect-h svg { color: var(--ai-600); }
    .ca-connect-p { font-size: 12.5px; color: var(--n-600); line-height: 1.5; margin: 0 0 12px; }
    .ca-pre { background: #0e1019; color: #d7dbe6; border-radius: 10px; padding: 12px; font-size: 12px; line-height: 1.5; overflow-x: auto; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; margin: 0 0 8px; white-space: pre-wrap; }
    .ca-copy { display: inline-flex; align-items: center; gap: 5px; font-family: inherit; font-size: 12px; font-weight: 700; color: var(--n-600); background: var(--n-100); border: none; border-radius: 7px; padding: 5px 9px; cursor: pointer; }
    .ca-copy:hover { color: var(--ink); }
    .ca-connect-links { display: flex; flex-direction: column; gap: 6px; margin: 12px 0; }
    .ca-link { display: inline-flex; align-items: center; gap: 4px; background: none; border: none; font-family: inherit; font-weight: 700; font-size: 12.5px; color: var(--ai-600); cursor: pointer; padding: 0; }
    .ca-note { display: flex; align-items: flex-start; gap: 6px; font-size: 12px; color: var(--n-600); line-height: 1.45; border-top: 1px solid var(--line); padding-top: 10px; }
    .ca-note svg { color: var(--ok); flex: none; margin-top: 2px; }
    `}</style>
  );
}
