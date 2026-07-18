// AgentEvals - the Testing Center. Ardovo's answer to Agentforce Testing Center:
// run scenarios against an agent, score the outputs against a deterministic
// rubric, and compare versions before you trust autonomy. Local-first: every
// run is simulated into the real Agent Cloud ledger and scored from explainable
// checks (toolset coverage, autonomy, mandate). Violet marks the AI layer, teal
// is the product + a good score. NO em-dash / en-dash. ASCII only.
import React, { useMemo, useState } from 'react';
import { SectionHeader, Card, StatCard, Button, Badge, Select, useToast, EmptyState } from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import AgentDeck from '../components/agent/AgentDeck.jsx';
import { useAgentCloud, getAgents, getAgent, AUTONOMY } from '../lib/agent-cloud.js';
import {
  SCENARIOS, PASS_THRESHOLD, useEvals, runScenario, runAll, snapshotVersion,
  batchesForAgent, lastScore, bestAgent, verdictFor,
} from '../lib/agent-evals.js';

const autonomyLabel = (id) => (AUTONOMY.find(a => a.id === id) || {}).label || id;
function scoreTone(score) {
  if (score == null) return 'var(--n-400)';
  if (score >= PASS_THRESHOLD) return 'var(--accent-600)';
  if (score >= 45) return 'var(--warn)';
  return 'var(--risk)';
}
function verdictTone(v) {
  if (v === 'Trusted') return { color: 'var(--accent-600)', background: 'var(--accent-50)' };
  if (v === 'Pass') return { color: 'var(--ok)', background: 'var(--ok-bg)' };
  if (v === 'Needs work') return { color: 'var(--warn)', background: 'var(--warn-bg)' };
  return { color: 'var(--risk)', background: 'var(--risk-bg)' };
}

/* Compact circular score dial (self-contained, no extra imports). */
function ScoreDial({ score, size = 60, stroke = 6 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score || 0));
  const off = c - (pct / 100) * c;
  const tone = scoreTone(score);
  return (
    <div className="ev-dial" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--n-100)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" style={{ transition: 'stroke-dashoffset .6s var(--ease)' }} />
      </svg>
      <div className="ev-dial-num" style={{ color: tone, fontSize: size * 0.3 }}>{score == null ? '-' : score}</div>
    </div>
  );
}

export default function AgentEvals() {
  const cloud = useAgentCloud();
  const evals = useEvals();
  const toast = useToast();
  const agents = getAgents();

  const [agentId, setAgentId] = useState(() => (agents[0] && agents[0].id) || '');
  const [openBreak, setOpenBreak] = useState(null);
  const [running, setRunning] = useState(false);

  const agent = getAgent(agentId) || agents[0] || null;

  // Latest scenario result for the selected agent (results are newest-first).
  const latestByScenario = useMemo(() => {
    const m = {};
    for (const r of evals.results) {
      if (r.agentId !== agentId) continue;
      if (!m[r.scenarioId]) m[r.scenarioId] = r;
    }
    return m;
  }, [evals.results, agentId]);

  const versions = useMemo(() => batchesForAgent(agentId), [evals.batches, agentId]);
  const latestBatch = versions[0] || null;
  const compareA = versions[0] || null;
  const compareB = versions[1] || null;

  const last = lastScore();
  const best = bestAgent();

  const doRun = (scenarioId) => {
    if (!agent) return;
    const res = runScenario(agent.id, scenarioId);
    if (res) { setOpenBreak(scenarioId); toast(`${res.verdict} - scored ${res.score}/100`, res.passed ? 'ok' : 'warn'); }
  };
  const doRunAll = () => {
    if (!agent) return;
    setRunning(true);
    const batch = runAll(agent.id);
    setRunning(false);
    if (batch) toast(`${agent.name} ${batch.version}: ${batch.aggregate}/100 aggregate`, batch.aggregate >= PASS_THRESHOLD ? 'ok' : 'warn');
  };
  const doSnapshot = () => {
    if (!agent) return;
    const batch = snapshotVersion(agent.id);
    if (batch) toast(`Snapshot ${batch.version} captured - ${batch.aggregate}/100`, 'ok');
  };

  if (!agent) {
    return (
      <div className="fade-up">
        <SectionHeader title="Testing Center" sub="Score agents against scenarios and compare versions before you trust them." />
        <EmptyState icon="!" title="No agents yet" body="Create an agent in Agent Cloud, then come back to put it through the scenario library." />
      </div>
    );
  }

  return (
    <div className="fade-up ev">
      <AgentDeck
        eyebrow="Testing Center"
        title="Trust it,"
        highlight="then deploy it."
        sub="Run scenarios against an agent, score the output against a deterministic rubric, and compare versions before you trust autonomy. Local-first and repeatable, no external calls."
        actions={<>
          <button className="adk-btn" onClick={doSnapshot} disabled={running}><Icon name="layers" size={15} /> Snapshot version</button>
          <button className="adk-btn adk-btn--primary" onClick={doRunAll} disabled={running}><Icon name="play" size={15} /> Run all</button>
        </>}
      />

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', marginBottom: '1rem' }}>
        <StatCard label="Scenarios" value={SCENARIOS.length} sub="in the eval library" icon={<Icon name="beaker" size={18} />} accent="var(--accent)" />
        <StatCard label="Last score" value={last == null ? '-' : last} sub={last == null ? 'no runs yet' : verdictFor(last)} icon={<Icon name="target" size={18} />} accent="var(--ai)" />
        <StatCard label="Best agent" value={best ? best.agentName : '-'} sub={best ? `${best.score}/100 aggregate` : 'run an eval'} icon={<Icon name="sparkles" size={18} />} accent="var(--accent)" />
      </div>

      {/* Agent picker + config summary */}
      <Card className="ev-picker">
        <div className="ev-picker-field">
          <label className="ev-label" htmlFor="ev-agent">Agent under test</label>
          <Select id="ev-agent" value={agentId} onChange={(e) => { setAgentId(e.target.value); setOpenBreak(null); }}>
            {agents.map(a => <option key={a.id} value={a.id}>{a.name}{a.status !== 'active' ? ' (paused)' : ''}</option>)}
          </Select>
        </div>
        <div className="ev-picker-meta">
          <span className="ev-chip ev-chip--ai">{autonomyLabel(agent.autonomy)}</span>
          <span className="ev-chip ev-chip--muted">{(agent.tools || []).length} tools</span>
          <span className="ev-chip ev-chip--muted">{versions.length} version{versions.length === 1 ? '' : 's'}</span>
          {agent.mandate && agent.mandate.noDiscount && <span className="ev-chip ev-chip--ok">Discount guard on</span>}
        </div>
        <div className="ev-picker-role">{agent.role}</div>
      </Card>

      {/* Aggregate result banner for the latest full pass */}
      {latestBatch && (
        <Card className="ev-agg">
          <div className="row gap-3" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <ScoreDial score={latestBatch.aggregate} size={72} stroke={7} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="row gap-2" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="ev-agg-title">Latest full pass</span>
                <span className="ev-chip" style={{ ...verdictTone(verdictFor(latestBatch.aggregate)) }}>{verdictFor(latestBatch.aggregate)}</span>
                <span className="ev-chip ev-chip--muted">{latestBatch.version}</span>
              </div>
              <div className="ev-agg-sub">{latestBatch.passCount} of {latestBatch.total} scenarios passed the {PASS_THRESHOLD}-point bar.</div>
            </div>
            <div className="ev-grid" role="list" aria-label="Scenario results">
              {latestBatch.items.map(it => (
                <span key={it.scenarioId} role="listitem" className="ev-cell" data-pass={it.passed} title={`${it.title}: ${it.score}/100`}>
                  <Icon name={it.passed ? 'check' : 'x'} size={13} />
                </span>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Version compare */}
      <SectionHeader title="Version compare" sub="Two most recent full passes for this agent, side by side. Snapshot the config, change it, re-run, and watch the delta before you promote." />
      {compareA && compareB ? (
        <div className="ev-cmp">
          <VersionCol batch={compareB} />
          <div className="ev-cmp-mid">
            <Icon name="swap" size={18} />
            <DeltaChip delta={compareA.aggregate - compareB.aggregate} />
          </div>
          <VersionCol batch={compareA} highlight />
        </div>
      ) : (
        <Card>
          <EmptyState
            icon="~"
            title={versions.length === 1 ? 'One version so far' : 'No versions yet'}
            body={versions.length === 1
              ? 'Snapshot or Run all once more to compare this pass against the next. Change a tool or autonomy level between runs to see the score move.'
              : 'Run all (or Snapshot version) at least twice for this agent to unlock a side-by-side version delta.'}
            action={<Button variant="ai" size="sm" onClick={doRunAll} disabled={running}><Icon name="play" size={14} /> Run all now</Button>}
          />
        </Card>
      )}

      {/* Scenario library */}
      <SectionHeader title="Scenario library" sub="Each scenario scores deterministically against a rubric. Run one to see exactly which criteria the agent met and missed." />
      <div className="ev-scenarios">
        {SCENARIOS.map(sc => {
          const res = latestByScenario[sc.id];
          const open = openBreak === sc.id;
          return (
            <div key={sc.id} className="ev-scn" data-open={open}>
              <div className="ev-scn-top">
                <span className="ev-scn-ico"><Icon name={sc.icon} size={17} /></span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="ev-scn-title">{sc.title}</div>
                  <span className="ev-chip ev-chip--muted ev-scn-cat">{sc.category}</span>
                </div>
                {res
                  ? <ScoreDial score={res.score} size={52} stroke={5} />
                  : <span className="ev-chip ev-chip--muted" style={{ flex: 'none' }}>Not run</span>}
              </div>
              <p className="ev-scn-prompt">{sc.prompt}</p>
              <div className="ev-scn-expects">
                <div className="ev-scn-expects-h">Expects</div>
                {sc.expects.map((e, i) => (
                  <div key={i} className="ev-expect"><Icon name="chevronRight" size={12} /><span>{e}</span></div>
                ))}
              </div>

              {res && (
                <div className="ev-verdict-row">
                  <span className="ev-chip" style={{ ...verdictTone(res.verdict) }}>{res.verdict}</span>
                  <button className="ev-link" onClick={() => setOpenBreak(open ? null : sc.id)}>
                    {open ? 'Hide breakdown' : 'Score breakdown'}
                    <Icon name="chevronDown" size={13} style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
                  </button>
                </div>
              )}

              {res && open && (
                <div className="ev-break">
                  {res.criteria.map((c, i) => (
                    <div key={i} className="ev-crit" data-pass={c.pass}>
                      <span className="ev-crit-mark" data-pass={c.pass}><Icon name={c.pass ? 'check' : 'x'} size={12} /></span>
                      <span className="ev-crit-label">{c.label}</span>
                      <span className="ev-crit-wt">{c.pass ? `+${c.weight}` : '0'}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="ev-scn-foot">
                <Button variant={res ? 'ghost' : 'primary'} size="sm" onClick={() => doRun(sc.id)}>
                  <Icon name="play" size={14} /> {res ? 'Re-run' : 'Run scenario'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <EvalStyles />
    </div>
  );
}

function DeltaChip({ delta }) {
  const up = delta > 0, flat = delta === 0;
  const tone = flat ? 'var(--n-600)' : up ? 'var(--ok)' : 'var(--risk)';
  const bg = flat ? 'var(--n-100)' : up ? 'var(--ok-bg)' : 'var(--risk-bg)';
  return (
    <span className="ev-delta" style={{ color: tone, background: bg }}>
      <Icon name={flat ? 'sliders' : up ? 'arrowUp' : 'arrowDown'} size={13} />
      {up ? '+' : ''}{delta} pts
    </span>
  );
}

function VersionCol({ batch, highlight }) {
  return (
    <Card className={`ev-vcol${highlight ? ' ev-vcol--hi' : ''}`}>
      <div className="row between" style={{ alignItems: 'center' }}>
        <span className="ev-chip ev-chip--muted">{batch.version}</span>
        {highlight && <span className="ev-chip ev-chip--ai">Current</span>}
      </div>
      <div className="row gap-3" style={{ alignItems: 'center', margin: '10px 0 4px' }}>
        <ScoreDial score={batch.aggregate} size={64} stroke={6} />
        <div className="col gap-1">
          <div className="ev-vcol-agg">{batch.aggregate}<span>/100</span></div>
          <div className="ev-agg-sub">{batch.passCount}/{batch.total} passed</div>
        </div>
      </div>
      <div className="ev-vcol-snap">
        <span className="ev-chip ev-chip--muted">{batch.snapshot.autonomy}</span>
        <span className="ev-chip ev-chip--muted">{batch.snapshot.tools.length} tools</span>
      </div>
      <div className="ev-vlist">
        {batch.items.map(it => (
          <div key={it.scenarioId} className="ev-vrow">
            <span className="ev-crit-mark" data-pass={it.passed}><Icon name={it.passed ? 'check' : 'x'} size={11} /></span>
            <span className="ev-vrow-title">{it.title}</span>
            <span className="ev-vrow-score" style={{ color: scoreTone(it.score) }}>{it.score}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function EvalStyles() {
  return (
    <style>{`
    .ev-mark { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, var(--ai), var(--ai-600)); box-shadow: var(--ai-glow); }
    .ev-chip { font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 999px; text-transform: capitalize; display: inline-flex; align-items: center; gap: 4px; }
    .ev-chip--muted { color: var(--n-600); background: var(--n-100); }
    .ev-chip--ai { color: var(--ai-600); background: var(--ai-50); }
    .ev-chip--ok { color: var(--ok); background: var(--ok-bg); }
    .ev-label { display: block; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; color: var(--n-600); margin-bottom: 6px; }
    .ev-link { display: inline-flex; align-items: center; gap: 4px; background: none; border: none; font-family: inherit; font-weight: 700; font-size: 12.5px; color: var(--ai-600); cursor: pointer; padding: 0; }
    .ev-link svg { transition: transform .2s; }

    .ev-dial { position: relative; flex: none; display: grid; place-items: center; }
    .ev-dial-num { position: absolute; inset: 0; display: grid; place-items: center; font-weight: 800; font-variant-numeric: tabular-nums; }

    .ev-picker { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 14px 20px; margin-bottom: 1rem; }
    .ev-picker-field { min-width: 240px; flex: 1; }
    .ev-picker-field .select { width: 100%; }
    .ev-picker-meta { display: flex; flex-wrap: wrap; gap: 6px; }
    .ev-picker-role { flex-basis: 100%; font-size: 13px; color: var(--n-600); line-height: 1.5; border-top: 1px solid var(--line); padding-top: 12px; }

    .ev-agg { margin-bottom: 1.4rem; }
    .ev-agg-title { font-weight: 800; font-size: 15px; color: var(--ink); }
    .ev-agg-sub { font-size: 12.5px; color: var(--n-600); margin-top: 3px; }
    .ev-grid { display: flex; flex-wrap: wrap; gap: 6px; margin-left: auto; max-width: 220px; }
    .ev-cell { width: 26px; height: 26px; border-radius: 8px; display: grid; place-items: center; flex: none; }
    .ev-cell[data-pass="true"] { color: var(--ok); background: var(--ok-bg); }
    .ev-cell[data-pass="false"] { color: var(--risk); background: var(--risk-bg); }

    .ev-cmp { display: grid; grid-template-columns: 1fr auto 1fr; align-items: stretch; gap: 14px; margin-bottom: 1.4rem; }
    .ev-cmp-mid { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: var(--n-400); }
    .ev-delta { display: inline-flex; align-items: center; gap: 4px; font-size: 12.5px; font-weight: 800; padding: 5px 10px; border-radius: 999px; white-space: nowrap; }
    .ev-vcol { display: flex; flex-direction: column; }
    .ev-vcol--hi { border-color: rgba(124,92,247,.4); box-shadow: var(--ai-glow); }
    .ev-vcol-agg { font-size: 28px; font-weight: 800; color: var(--ink); line-height: 1; font-variant-numeric: tabular-nums; }
    .ev-vcol-agg span { font-size: 14px; font-weight: 700; color: var(--n-400); }
    .ev-vcol-snap { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 10px; }
    .ev-vlist { display: flex; flex-direction: column; gap: 4px; border-top: 1px solid var(--line); padding-top: 10px; }
    .ev-vrow { display: flex; align-items: center; gap: 8px; }
    .ev-vrow-title { font-size: 12.5px; color: var(--ink-2); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
    .ev-vrow-score { font-size: 12.5px; font-weight: 800; font-variant-numeric: tabular-nums; flex: none; }

    .ev-scenarios { display: grid; grid-template-columns: repeat(auto-fill,minmax(340px,1fr)); gap: 1rem; }
    .ev-scn { background: var(--paper); border: 1px solid var(--line); border-radius: 14px; padding: 15px; display: flex; flex-direction: column; gap: 11px; transition: border-color .15s, box-shadow .15s; }
    .ev-scn[data-open="true"], .ev-scn:hover { border-color: rgba(124,92,247,.4); box-shadow: var(--shadow-sm); }
    .ev-scn-top { display: flex; align-items: flex-start; gap: 11px; }
    .ev-scn-ico { width: 36px; height: 36px; border-radius: 10px; flex: none; display: grid; place-items: center; color: var(--ai-600); background: var(--ai-50); }
    .ev-scn-title { font-weight: 800; font-size: 14.5px; color: var(--ink); line-height: 1.3; }
    .ev-scn-cat { margin-top: 5px; }
    .ev-scn-prompt { font-size: 12.5px; color: var(--n-600); line-height: 1.5; margin: 0; }
    .ev-scn-expects { background: var(--n-25); border: 1px solid var(--line); border-radius: 10px; padding: 10px 11px; }
    .ev-scn-expects-h { font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; color: var(--n-400); margin-bottom: 6px; }
    .ev-expect { display: flex; align-items: flex-start; gap: 6px; font-size: 12px; color: var(--ink-2); line-height: 1.45; padding: 2px 0; }
    .ev-expect svg { color: var(--accent-600); flex: none; margin-top: 3px; }
    .ev-verdict-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .ev-break { display: flex; flex-direction: column; gap: 2px; border-top: 1px dashed var(--line-strong); padding-top: 10px; }
    .ev-crit { display: flex; align-items: center; gap: 9px; padding: 5px 0; }
    .ev-crit-mark { width: 18px; height: 18px; border-radius: 6px; flex: none; display: grid; place-items: center; }
    .ev-crit-mark[data-pass="true"] { color: var(--ok); background: var(--ok-bg); }
    .ev-crit-mark[data-pass="false"] { color: var(--risk); background: var(--risk-bg); }
    .ev-crit-label { font-size: 12.5px; color: var(--ink-2); flex: 1; min-width: 0; }
    .ev-crit-wt { font-size: 11.5px; font-weight: 800; color: var(--n-400); font-variant-numeric: tabular-nums; flex: none; }
    .ev-scn-foot { margin-top: auto; }

    @media (max-width: 720px) {
      .ev-cmp { grid-template-columns: 1fr; }
      .ev-cmp-mid { flex-direction: row; }
      .ev-grid { margin-left: 0; }
    }
    `}</style>
  );
}
