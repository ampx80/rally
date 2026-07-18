// Agent Studio - design and configure a custom agent against the agent-cloud
// core (createAgent / updateAgent + the shared TOOL_CATALOG). Rally's answer to
// Agentforce Builder, simpler: pick an icon and role, set autonomy + model,
// grant tools, and draw the mandate envelope, with a live preview of what the
// agent will do and its cost per run. Violet marks the AI layer; teal is the
// product. Writes are immediate via updateAgent so the reactive store is the
// single source of truth. ASCII only. NO em-dash / en-dash.
import React, { useEffect, useMemo, useState } from 'react';
import {
  SectionHeader, Card, Button, Badge, Field, Input, Select, useToast, EmptyState,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import AgentDeck from '../components/agent/AgentDeck.jsx';
import {
  useAgentCloud, getAgents, getAgent, createAgent, updateAgent, deleteAgent, toggleAgent,
  TOOL_CATALOG, MODELS, modelById, estimateCost, AUTONOMY, DEFAULT_MANDATE,
} from '../lib/agent-cloud.js';

const ICON_CHOICES = ['sparkles', 'command', 'shield', 'zap', 'activity', 'mail', 'target', 'trendUp', 'receipt', 'users', 'radar', 'beaker'];
const AUTONOMY_TONE = { suggest: '#2563a8', approve: '#7c5cf7', auto: '#0e9f8f' };
const autonomyMeta = (id) => AUTONOMY.find(a => a.id === id) || AUTONOMY[0];

// Nominal shape used for the live cost-per-run estimate in the preview card.
const NOMINAL_IN = 3000;
const NOMINAL_OUT = 1500;

export default function AgentStudio() {
  const cloud = useAgentCloud();
  const toast = useToast();
  const agents = getAgents();

  const [selectedId, setSelectedId] = useState(() => (agents[0]?.id || null));
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Keep a valid selection as the fleet changes (create / delete). If the
  // selected agent vanishes, fall back to the first agent (or null).
  useEffect(() => {
    if (selectedId && cloud.agents.some(a => a.id === selectedId)) return;
    setSelectedId(cloud.agents[0]?.id || null);
  }, [cloud.agents, selectedId]);

  useEffect(() => { setConfirmDelete(false); }, [selectedId]);

  const selected = selectedId ? getAgent(selectedId) : null;

  const toolsByGroup = useMemo(() => {
    const m = {};
    for (const t of TOOL_CATALOG) { (m[t.group] = m[t.group] || []).push(t); }
    return m;
  }, []);

  function handleNew() {
    const a = createAgent({
      name: 'Untitled agent',
      role: 'Describe what this agent does and the outcome it owns.',
      icon: 'sparkles',
      tools: ['get_pipeline'],
      autonomy: 'suggest',
      mandate: { ...DEFAULT_MANDATE },
    });
    setSelectedId(a.id);
    toast('New agent created');
  }

  function patch(p) {
    if (!selected) return;
    updateAgent(selected.id, p);
  }

  function toggleTool(name) {
    if (!selected) return;
    const has = selected.tools.includes(name);
    const tools = has ? selected.tools.filter(t => t !== name) : [...selected.tools, name];
    updateAgent(selected.id, { tools });
  }

  function handleDelete() {
    if (!selected || selected.builtin) return;
    const name = selected.name;
    deleteAgent(selected.id);
    setConfirmDelete(false);
    toast(`Deleted ${name}`, 'warn');
  }

  return (
    <div className="fade-up as">
      <AgentDeck
        eyebrow="Agent Studio"
        title="Design an agent"
        highlight="from scratch."
        sub="Give it a role, grant it tools, set its autonomy and model, and draw the mandate it operates inside. Agent-native, governed by default."
        actions={<button className="adk-btn adk-btn--primary" onClick={handleNew}><Icon name="plus" size={15} /> New agent</button>}
      />

      <div className="as-layout">
        {/* ---------- Left: fleet ---------- */}
        <aside className="as-list" aria-label="Agents">
          <div className="as-list-head">
            <span>Agents</span>
            <span className="as-count">{agents.length}</span>
          </div>
          <div className="as-list-scroll">
            {agents.map(a => {
              const on = a.id === selectedId;
              const active = a.status === 'active';
              return (
                <button
                  key={a.id}
                  className="as-row"
                  data-on={on}
                  data-off={!active}
                  onClick={() => setSelectedId(a.id)}
                >
                  <span className="as-row-ico"><Icon name={a.icon} size={16} /></span>
                  <span className="as-row-body">
                    <span className="as-row-name">{a.name || 'Untitled agent'}</span>
                    <span className="as-row-sub">{a.tools.length} tools - {autonomyMeta(a.autonomy).label}</span>
                  </span>
                  <span className={`as-tag ${a.builtin ? 'as-tag--builtin' : 'as-tag--custom'}`}>{a.builtin ? 'Built in' : 'Custom'}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ---------- Right: editor ---------- */}
        <div className="as-editor">
          {!selected ? (
            <Card>
              <EmptyState
                icon={<Icon name="beaker" size={34} />}
                title="No agent selected"
                body="Create your first custom agent to configure its role, tools, autonomy, and mandate."
                action={<Button onClick={handleNew}><Icon name="plus" size={15} /> New agent</Button>}
              />
            </Card>
          ) : (
            <Editor
              key={selected.id}
              agent={selected}
              toolsByGroup={toolsByGroup}
              onPatch={patch}
              onToggleTool={toggleTool}
              onToggleActive={() => { toggleAgent(selected.id); toast(selected.status === 'active' ? 'Agent paused' : 'Agent activated'); }}
              confirmDelete={confirmDelete}
              setConfirmDelete={setConfirmDelete}
              onDelete={handleDelete}
            />
          )}
        </div>
      </div>

      <AgentStudioStyles />
    </div>
  );
}

function Editor({ agent, toolsByGroup, onPatch, onToggleTool, onToggleActive, confirmDelete, setConfirmDelete, onDelete }) {
  const model = modelById(agent.model);
  const costPerRun = estimateCost(NOMINAL_IN, NOMINAL_OUT, agent.model);
  const am = autonomyMeta(agent.autonomy);
  const writeTools = agent.tools.filter(n => (TOOL_CATALOG.find(t => t.name === n) || {}).kind === 'write').length;
  const readTools = agent.tools.length - writeTools;

  return (
    <div className="col gap-3">
      {/* Identity + power */}
      <Card>
        <div className="as-id">
          <span className="as-id-ico"><Icon name={agent.icon} size={22} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row between" style={{ alignItems: 'center', gap: 8 }}>
              <div className="row gap-2" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Badge tone={agent.builtin ? 'default' : 'accent'}>{agent.builtin ? 'Built in' : 'Custom'}</Badge>
                <Badge tone={agent.status === 'active' ? 'ok' : 'warn'}>{agent.status === 'active' ? 'Active' : 'Paused'}</Badge>
              </div>
              <button className="as-power" data-on={agent.status === 'active'} onClick={onToggleActive} aria-label={agent.status === 'active' ? 'Pause agent' : 'Activate agent'} title={agent.status === 'active' ? 'Pause' : 'Activate'}>
                <span />
              </button>
            </div>
          </div>
        </div>

        <div className="as-grid-2" style={{ marginTop: 14 }}>
          <Field label="Agent name">
            <Input value={agent.name} placeholder="e.g. Renewal Watcher" onChange={(e) => onPatch({ name: e.target.value })} />
          </Field>
          <Field label="Icon">
            <div className="as-icons" role="group" aria-label="Icon">
              {ICON_CHOICES.map(name => (
                <button
                  key={name}
                  type="button"
                  className="as-icon-btn"
                  data-on={agent.icon === name}
                  onClick={() => onPatch({ icon: name })}
                  aria-label={name}
                  aria-pressed={agent.icon === name}
                  title={name}
                >
                  <Icon name={name} size={16} />
                </button>
              ))}
            </div>
          </Field>
        </div>

        <Field label="Role" hint="What this agent owns and the outcome it drives. This grounds every run.">
          <textarea
            className="textarea"
            rows={3}
            value={agent.role}
            placeholder="Keeps every renewal on track: flags accounts going quiet before the window and drafts the outreach."
            onChange={(e) => onPatch({ role: e.target.value })}
          />
        </Field>
      </Card>

      {/* Autonomy */}
      <Card>
        <SectionHeader title="Autonomy" sub="How far this agent can act on its own. Anything outside its mandate escalates to you." />
        <div className="as-autonomy">
          {AUTONOMY.map(opt => {
            const on = agent.autonomy === opt.id;
            const tone = AUTONOMY_TONE[opt.id];
            return (
              <button
                key={opt.id}
                type="button"
                className="as-auto"
                data-on={on}
                style={on ? { borderColor: tone, boxShadow: `0 0 0 1px ${tone}` } : undefined}
                onClick={() => onPatch({ autonomy: opt.id })}
                aria-pressed={on}
              >
                <span className="as-auto-top">
                  <span className="as-auto-dot" style={{ background: tone }} />
                  <span className="as-auto-label">{opt.label}</span>
                  {on && <Icon name="check" size={15} style={{ color: tone, marginLeft: 'auto' }} />}
                </span>
                <span className="as-auto-blurb">{opt.blurb}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Model */}
      <Card>
        <SectionHeader title="Model" sub="Route this agent to the right engine. Cost is metered per run." />
        <div className="as-models">
          {MODELS.map(m => {
            const on = agent.model === m.id;
            return (
              <button
                key={m.id}
                type="button"
                className="as-model"
                data-on={on}
                onClick={() => onPatch({ model: m.id })}
                aria-pressed={on}
              >
                <span className="row between" style={{ alignItems: 'center' }}>
                  <span className="as-model-name">{m.label}</span>
                  {on && <Icon name="check" size={15} style={{ color: 'var(--ai-600)' }} />}
                </span>
                <span className="row gap-2" style={{ alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
                  <span className="as-tier">{m.tier}</span>
                  <span className="as-model-cost">${m.in}/${m.out} per 1M</span>
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Tools */}
      <Card>
        <SectionHeader
          title="Tools"
          sub="The capability surface this agent can call. Read tools never mutate the book; write tools stage a reversible change."
          action={<Badge tone="accent">{agent.tools.length} granted</Badge>}
        />
        <div className="col gap-3">
          {Object.keys(toolsByGroup).map(group => (
            <div key={group}>
              <div className="as-group-head">{group}</div>
              <div className="as-tools">
                {toolsByGroup[group].map(t => {
                  const on = agent.tools.includes(t.name);
                  const write = t.kind === 'write';
                  return (
                    <button
                      key={t.name}
                      type="button"
                      className="as-tool"
                      data-on={on}
                      onClick={() => onToggleTool(t.name)}
                      aria-pressed={on}
                      title={t.description}
                    >
                      <span className="as-tool-check" data-on={on}>{on && <Icon name="check" size={12} />}</span>
                      <span className="as-tool-body">
                        <span className="as-tool-name">{t.name}</span>
                        <span className="as-tool-desc">{t.description}</span>
                      </span>
                      <span className={`as-kind ${write ? 'as-kind--write' : 'as-kind--read'}`}>{t.kind}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Mandate */}
      <Card>
        <SectionHeader title="Mandate" sub="The IAM envelope every run executes inside. Anything beyond these lines escalates instead of executing." />
        <div className="as-grid-2">
          <Field label="Max deal value" hint="Largest deal this agent may touch.">
            <div className="as-money">
              <span>$</span>
              <input
                className="input"
                type="number"
                min={0}
                step={5000}
                value={agent.mandate.maxDealValue}
                onChange={(e) => onPatch({ mandate: { maxDealValue: Number(e.target.value) || 0 } })}
              />
            </div>
          </Field>
          <Field label="Max actions per run" hint="Action budget before a run stops and reports back.">
            <input
              className="input"
              type="number"
              min={1}
              step={1}
              value={agent.mandate.maxActionsPerRun}
              onChange={(e) => onPatch({ mandate: { maxActionsPerRun: Math.max(1, Number(e.target.value) || 1) } })}
            />
          </Field>
        </div>
        <div className="as-toggles">
          <MandateToggle
            label="Allow writes"
            desc="Let this agent stage changes to the book. Off means read only."
            on={agent.mandate.allowWrites}
            onChange={(v) => onPatch({ mandate: { allowWrites: v } })}
          />
          <MandateToggle
            label="No discounting"
            desc="Never propose a price cut without a human in the loop."
            on={agent.mandate.noDiscount}
            onChange={(v) => onPatch({ mandate: { noDiscount: v } })}
          />
        </div>
      </Card>

      {/* Live preview */}
      <div className="as-preview">
        <div className="as-preview-head">
          <span className="as-preview-ico"><Icon name={agent.icon} size={18} /></span>
          <div style={{ minWidth: 0 }}>
            <div className="as-preview-name">{agent.name || 'Untitled agent'}</div>
            <div className="as-preview-role">{agent.role || 'No role set yet.'}</div>
          </div>
        </div>
        <p className="as-preview-line">
          Runs in <strong style={{ color: AUTONOMY_TONE[agent.autonomy] }}>{am.label}</strong> mode on <strong>{model.label}</strong>,
          {' '}with <strong>{agent.tools.length}</strong> tool{agent.tools.length === 1 ? '' : 's'} granted
          {' '}({readTools} read, {writeTools} write). {am.blurb}
        </p>
        <div className="as-preview-stats">
          <PreviewStat label="Autonomy" value={am.label} tone={AUTONOMY_TONE[agent.autonomy]} />
          <PreviewStat label="Tools" value={String(agent.tools.length)} />
          <PreviewStat label="Deal cap" value={fmtMoney(agent.mandate.maxDealValue)} />
          <PreviewStat label="Est. cost / run" value={fmtCost(costPerRun)} hint={`${(NOMINAL_IN / 1000)}K in / ${(NOMINAL_OUT / 1000)}K out`} />
        </div>
      </div>

      {/* Danger zone */}
      {!agent.builtin && (
        <Card>
          <div className="row between" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div className="as-danger-title">Delete this agent</div>
              <div className="t-sm muted">Custom agents can be removed. This cannot be undone.</div>
            </div>
            {confirmDelete ? (
              <div className="row gap-2" style={{ flex: 'none' }}>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                <Button variant="danger" size="sm" onClick={onDelete}><Icon name="trash" size={14} /> Confirm delete</Button>
              </div>
            ) : (
              <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)} style={{ flex: 'none' }}><Icon name="trash" size={14} /> Delete</Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function MandateToggle({ label, desc, on, onChange }) {
  return (
    <div className="as-toggle">
      <div style={{ minWidth: 0 }}>
        <div className="as-toggle-label">{label}</div>
        <div className="as-toggle-desc">{desc}</div>
      </div>
      <button
        type="button"
        className="as-switch"
        data-on={on}
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
      >
        <span />
      </button>
    </div>
  );
}

function PreviewStat({ label, value, tone, hint }) {
  return (
    <div className="as-pstat">
      <div className="as-pstat-label">{label}</div>
      <div className="as-pstat-value" style={tone ? { color: tone } : undefined}>{value}</div>
      {hint && <div className="as-pstat-hint">{hint}</div>}
    </div>
  );
}

function fmtMoney(n) {
  const v = Number(n) || 0;
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(v % 1e6 === 0 ? 0 : 1) + 'M';
  if (v >= 1e3) return '$' + Math.round(v / 1e3) + 'K';
  return '$' + v;
}
function fmtCost(n) {
  if (n >= 1) return '$' + n.toFixed(2);
  if (n >= 0.01) return '$' + n.toFixed(3);
  return '$' + n.toFixed(4);
}

function AgentStudioStyles() {
  return (
    <style>{`
    .as-mark { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, var(--ai), var(--ai-600)); box-shadow: var(--ai-glow); }
    .as-layout { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 1rem; align-items: start; }
    @media (max-width: 900px) { .as-layout { grid-template-columns: 1fr; } }

    /* ---- left list ---- */
    .as-list { background: var(--paper); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; position: sticky; top: 1rem; }
    .as-list-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid var(--line); font-weight: 800; font-size: 13px; color: var(--ink); text-transform: uppercase; letter-spacing: .04em; }
    .as-count { font-size: 11px; font-weight: 800; color: var(--n-600); background: var(--n-100); border-radius: 999px; padding: 2px 9px; }
    .as-list-scroll { max-height: 68vh; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 4px; }
    @media (max-width: 900px) { .as-list-scroll { max-height: 320px; } }
    .as-row { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; font-family: inherit; background: none; border: 1px solid transparent; border-radius: 10px; padding: 9px 10px; cursor: pointer; transition: background .12s, border-color .12s; }
    .as-row:hover { background: var(--n-25); }
    .as-row[data-on="true"] { background: var(--ai-50); border-color: rgba(124,92,247,.35); }
    .as-row[data-off="true"] .as-row-ico, .as-row[data-off="true"] .as-row-name { opacity: .55; }
    .as-row-ico { width: 32px; height: 32px; border-radius: 9px; flex: none; display: grid; place-items: center; color: var(--ai-600); background: var(--ai-50); }
    .as-row[data-on="true"] .as-row-ico { background: #fff; }
    .as-row-body { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .as-row-name { font-weight: 700; font-size: 13.5px; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .as-row-sub { font-size: 11.5px; color: var(--n-600); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .as-tag { font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; padding: 2px 6px; border-radius: 6px; flex: none; }
    .as-tag--builtin { color: var(--n-600); background: var(--n-100); }
    .as-tag--custom { color: var(--ai-600); background: var(--ai-50); }

    /* ---- editor ---- */
    .as-editor { min-width: 0; }
    .as-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    @media (max-width: 620px) { .as-grid-2 { grid-template-columns: 1fr; } }

    .as-id { display: flex; align-items: center; gap: 12px; }
    .as-id-ico { width: 46px; height: 46px; border-radius: 13px; flex: none; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, var(--ai), var(--ai-600)); box-shadow: var(--ai-glow); }

    .as-power { width: 42px; height: 24px; border-radius: 999px; border: none; cursor: pointer; background: var(--n-200); position: relative; flex: none; transition: background .2s; }
    .as-power[data-on="true"] { background: var(--ai); }
    .as-power span { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: left .2s; box-shadow: 0 1px 3px rgba(0,0,0,.3); }
    .as-power[data-on="true"] span { left: 21px; }

    .as-icons { display: flex; flex-wrap: wrap; gap: 6px; }
    .as-icon-btn { width: 36px; height: 36px; border-radius: 9px; border: 1px solid var(--line); background: var(--paper); color: var(--n-600); cursor: pointer; display: grid; place-items: center; transition: all .12s; }
    .as-icon-btn:hover { border-color: var(--line-strong); color: var(--ink); }
    .as-icon-btn[data-on="true"] { border-color: var(--ai); color: var(--ai-600); background: var(--ai-50); box-shadow: 0 0 0 1px var(--ai); }

    .as-autonomy { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    @media (max-width: 620px) { .as-autonomy { grid-template-columns: 1fr; } }
    .as-auto { text-align: left; font-family: inherit; background: var(--paper); border: 1px solid var(--line); border-radius: 12px; padding: 12px; cursor: pointer; display: flex; flex-direction: column; gap: 6px; transition: border-color .12s; }
    .as-auto:hover { border-color: var(--line-strong); }
    .as-auto-top { display: flex; align-items: center; gap: 8px; }
    .as-auto-dot { width: 9px; height: 9px; border-radius: 50%; flex: none; }
    .as-auto-label { font-weight: 800; font-size: 13.5px; color: var(--ink); }
    .as-auto-blurb { font-size: 12px; color: var(--n-600); line-height: 1.45; }

    .as-models { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 10px; }
    .as-model { text-align: left; font-family: inherit; background: var(--paper); border: 1px solid var(--line); border-radius: 12px; padding: 12px; cursor: pointer; transition: border-color .12s; }
    .as-model:hover { border-color: var(--line-strong); }
    .as-model[data-on="true"] { border-color: var(--ai); box-shadow: 0 0 0 1px var(--ai); background: var(--ai-50); }
    .as-model-name { font-weight: 800; font-size: 13.5px; color: var(--ink); }
    .as-tier { font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; color: var(--ai-600); background: var(--ai-50); border-radius: 6px; padding: 2px 7px; }
    .as-model[data-on="true"] .as-tier { background: #fff; }
    .as-model-cost { font-size: 12px; color: var(--n-600); font-variant-numeric: tabular-nums; }

    .as-group-head { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; color: var(--n-600); margin-bottom: 8px; }
    .as-tools { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 8px; }
    .as-tool { display: flex; align-items: flex-start; gap: 10px; text-align: left; font-family: inherit; background: var(--paper); border: 1px solid var(--line); border-radius: 11px; padding: 10px 11px; cursor: pointer; transition: border-color .12s, background .12s; }
    .as-tool:hover { border-color: var(--line-strong); }
    .as-tool[data-on="true"] { border-color: var(--ai); background: var(--ai-50); }
    .as-tool-check { width: 18px; height: 18px; border-radius: 6px; border: 1.5px solid var(--line-strong); flex: none; display: grid; place-items: center; color: #fff; margin-top: 1px; transition: all .12s; }
    .as-tool-check[data-on="true"] { background: var(--ai); border-color: var(--ai); }
    .as-tool-body { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .as-tool-name { font-family: var(--font-mono, ui-monospace, monospace); font-size: 12.5px; font-weight: 700; color: var(--ink); word-break: break-word; }
    .as-tool-desc { font-size: 11.5px; color: var(--n-600); line-height: 1.4; margin-top: 2px; }
    .as-kind { font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; padding: 2px 6px; border-radius: 6px; flex: none; margin-top: 1px; }
    .as-kind--read { color: var(--accent-600); background: var(--accent-50); }
    .as-kind--write { color: var(--ai-600); background: var(--ai-50); }

    .as-money { display: flex; align-items: center; gap: 6px; }
    .as-money > span { font-weight: 700; color: var(--n-600); }
    .as-money .input { flex: 1; }

    .as-toggles { display: flex; flex-direction: column; gap: 8px; margin-top: 14px; }
    .as-toggle { display: flex; align-items: center; justify-content: space-between; gap: 12px; border: 1px solid var(--line); border-radius: 11px; padding: 11px 13px; }
    .as-toggle-label { font-weight: 700; font-size: 13.5px; color: var(--ink); }
    .as-toggle-desc { font-size: 12px; color: var(--n-600); line-height: 1.4; margin-top: 1px; }
    .as-switch { width: 42px; height: 24px; border-radius: 999px; border: none; cursor: pointer; background: var(--n-200); position: relative; flex: none; transition: background .2s; }
    .as-switch[data-on="true"] { background: var(--accent); }
    .as-switch span { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: left .2s; box-shadow: 0 1px 3px rgba(0,0,0,.3); }
    .as-switch[data-on="true"] span { left: 21px; }

    /* ---- live preview ---- */
    .as-preview { border-radius: 14px; padding: 16px; background: linear-gradient(135deg, var(--ai-50), var(--paper)); border: 1px solid rgba(124,92,247,.3); box-shadow: var(--shadow-sm); }
    .as-preview-head { display: flex; align-items: center; gap: 12px; }
    .as-preview-ico { width: 40px; height: 40px; border-radius: 11px; flex: none; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, var(--ai), var(--ai-600)); box-shadow: var(--ai-glow); }
    .as-preview-name { font-weight: 800; font-size: 15px; color: var(--ink); }
    .as-preview-role { font-size: 12.5px; color: var(--n-600); line-height: 1.45; margin-top: 2px; }
    .as-preview-line { font-size: 13px; color: var(--ink-2); line-height: 1.55; margin: 12px 0 14px; }
    .as-preview-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; }
    .as-pstat { background: var(--paper); border: 1px solid var(--line); border-radius: 11px; padding: 10px 12px; }
    .as-pstat-label { font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; color: var(--n-600); }
    .as-pstat-value { font-size: 18px; font-weight: 800; color: var(--ink); margin-top: 3px; font-variant-numeric: tabular-nums; }
    .as-pstat-hint { font-size: 10.5px; color: var(--n-400); margin-top: 2px; }

    .as-danger-title { font-weight: 800; font-size: 14px; color: var(--risk); }

    .col.gap-3 { display: flex; flex-direction: column; gap: 1rem; }
    `}</style>
  );
}
