// AgentTrust - multi-model routing + the AI trust layer. Ardovo's answer to
// Salesforce's multi-model + AI Trust Layer, but agent-native from day one:
// choose a model per agent, bring your own LLM, and see the trust posture
// (zero data retention, reversible writes, audit, human-in-the-loop) in one
// place. Violet marks the AI chrome, teal is the product. Local-first: reads
// and writes agent-cloud settings + per-agent model. NO em-dash / en-dash.
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SectionHeader, Card, StatCard, Button, Badge, Select, useToast } from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import AgentDeck from '../components/agent/AgentDeck.jsx';
import {
  useAgentCloud, getAgents, updateAgent, getSettings, updateSettings,
  MODELS, modelById, estimateCost, runStats,
} from '../lib/agent-cloud.js';

// Per-agent routing cost is priced on a representative run: a grounded read
// (3000 in) plus a drafted action (1500 out). Same shape the run ledger uses.
const SAMPLE_IN = 3000;
const SAMPLE_OUT = 1500;

const TIER_META = {
  balanced: { label: 'Balanced', tone: 'var(--accent-600)', bg: 'var(--accent-50)' },
  frontier: { label: 'Frontier', tone: 'var(--ai-600)', bg: 'var(--ai-50)' },
  voice: { label: 'Voice', tone: 'var(--warn)', bg: 'var(--warn-bg)' },
  fast: { label: 'Fast', tone: 'var(--ok)', bg: 'var(--ok-bg)' },
};
const tierMeta = (t) => TIER_META[t] || TIER_META.balanced;

const fmtTokens = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(Math.round(n)));
const fmtCost = (n) => (n >= 1 ? `$${n.toFixed(2)}` : `$${n.toFixed(3)}`);
const perMillion = (n) => `$${Number.isInteger(n) ? n : n.toFixed(n < 1 ? 2 : 1)}`;

function Toggle({ on, onChange, label }) {
  return (
    <button
      type="button"
      className="tr-toggle"
      data-on={on ? 'true' : 'false'}
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
    >
      <span />
    </button>
  );
}

export default function AgentTrust() {
  useAgentCloud();
  const nav = useNavigate();
  const toast = useToast();

  const agents = getAgents();
  const settings = getSettings();
  const stats = runStats();

  const setDefault = (id) => {
    updateSettings({ defaultModel: id });
    toast(`Default model set to ${modelById(id).label}`);
  };
  const routeAgent = (agentId, model) => {
    updateAgent(agentId, { model });
    toast(`Routed to ${modelById(model).label}`);
  };
  const toggleByo = () => {
    const next = !settings.byoLlm;
    updateSettings({ byoLlm: next });
    toast(next ? 'Bring your own LLM enabled' : 'Using Ardovo-managed models');
  };
  const toggleRetention = () => {
    const next = !settings.zeroRetention;
    updateSettings({ zeroRetention: next });
    toast(next ? 'Zero data retention on' : 'Zero data retention off', next ? 'ok' : 'warn');
  };

  const fleetCostPerRun = agents.reduce((s, a) => s + estimateCost(SAMPLE_IN, SAMPLE_OUT, a.model), 0);

  return (
    <div className="fade-up tr">
      <AgentDeck
        eyebrow="Model Routing + Trust"
        title="Your models."
        highlight="Your rules."
        sub="Route each agent to the right model, bring your own LLM, and keep a trust posture you can prove. Multi-model and a trust layer built in from day one, not bolted onto a legacy core."
        actions={<>
          <button className="adk-btn" onClick={() => nav('/audit')}><Icon name="history" size={15} /> Audit log</button>
          <button className="adk-btn" onClick={() => nav('/agent-cloud')}><Icon name="sparkles" size={15} /> Agent Cloud</button>
        </>}
      />

      {/* SPEND SNAPSHOT */}
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', marginBottom: '.5rem' }}>
        <StatCard label="Tokens this session" value={stats.tokens} format={fmtTokens} icon={<Icon name="zap" size={18} />} accent="var(--ai)" />
        <StatCard label="Est. spend" value={stats.costUsd} format={(n) => `$${n.toFixed(2)}`} icon={<Icon name="dollar" size={18} />} sub="metered by tokens, not seats" />
        <StatCard label="Runs logged" value={stats.total} icon={<Icon name="activity" size={18} />} sub={`${stats.activeAgents} agents active`} />
        <StatCard label="Fleet cost / run" value={fleetCostPerRun} format={fmtCost} icon={<Icon name="gauge" size={18} />} accent="var(--accent)" sub="at current routing" />
      </div>
      <div className="tr-note" style={{ marginBottom: '1.5rem' }}>
        <Icon name="check" size={15} />
        <span>You see the exact tokens and cost behind every run. No surprise consumption bills, no opaque per-conversation charges. Route cheaper models where you can, frontier models where it counts.</span>
      </div>

      {/* MODEL LIBRARY */}
      <SectionHeader
        title="Model library"
        sub="Every model Ardovo can route to, with published price per 1M tokens. Set the fleet default, then override per agent below."
      />
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        {MODELS.map((m) => {
          const tm = tierMeta(m.tier);
          const isDefault = settings.defaultModel === m.id;
          return (
            <div key={m.id} className="tr-model" data-default={isDefault ? 'true' : 'false'}>
              <div className="row between" style={{ alignItems: 'flex-start', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div className="tr-model-name">{m.label}</div>
                  <span className="tr-tier" style={{ color: tm.tone, background: tm.bg }}>{tm.label}</span>
                </div>
                {isDefault && <Badge tone="accent" className="t-xs"><Icon name="check" size={12} /> Default</Badge>}
              </div>
              <div className="tr-price">
                <div className="tr-price-cell">
                  <span className="tr-price-num">{perMillion(m.in)}</span>
                  <span className="tr-price-lbl">input / 1M</span>
                </div>
                <div className="tr-price-cell">
                  <span className="tr-price-num">{perMillion(m.out)}</span>
                  <span className="tr-price-lbl">output / 1M</span>
                </div>
              </div>
              <Button
                variant={isDefault ? 'ghost' : 'primary'}
                size="sm"
                disabled={isDefault}
                onClick={() => setDefault(m.id)}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {isDefault ? 'Fleet default' : 'Set as default'}
              </Button>
            </div>
          );
        })}
      </div>

      {/* PER-AGENT ROUTING */}
      <SectionHeader
        title="Per-agent routing"
        sub="Point each agent at the model that fits its job. A reasoning-heavy closer earns a frontier model; a high-volume SDR runs on a fast one. Costs update live."
      />
      <Card pad={false} className="tr-table-card" style={{ marginBottom: '1.75rem', overflow: 'hidden' }}>
        <div className="tr-table-scroll">
          <table className="table tr-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Model</th>
                <th>Tier</th>
                <th style={{ textAlign: 'right' }}>Est. cost / run</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => {
                const m = modelById(a.model);
                const tm = tierMeta(m.tier);
                const cost = estimateCost(SAMPLE_IN, SAMPLE_OUT, a.model);
                return (
                  <tr key={a.id}>
                    <td>
                      <div className="row gap-2" style={{ alignItems: 'center' }}>
                        <span className="tr-agent-ico"><Icon name={a.icon} size={16} /></span>
                        <div style={{ minWidth: 0 }}>
                          <div className="tr-agent-name">{a.name}</div>
                          <div className="tr-agent-role">{a.role}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Select
                        value={a.model}
                        aria-label={`Model for ${a.name}`}
                        onChange={(e) => routeAgent(a.id, e.target.value)}
                        style={{ minWidth: 170 }}
                      >
                        {MODELS.map((mm) => (
                          <option key={mm.id} value={mm.id}>{mm.label}</option>
                        ))}
                      </Select>
                    </td>
                    <td>
                      <span className="tr-tier" style={{ color: tm.tone, background: tm.bg }}>{tm.label}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="tr-cost">{fmtCost(cost)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="tr-table-foot">
          <span>Priced on a representative run: {fmtTokens(SAMPLE_IN)} input + {fmtTokens(SAMPLE_OUT)} output tokens.</span>
          <span className="tr-cost">Fleet total {fmtCost(fleetCostPerRun)} / run</span>
        </div>
      </Card>

      {/* BRING YOUR OWN LLM + TRUST LAYER */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: '1.25rem' }}>
        {/* BRING YOUR OWN LLM */}
        <Card className="tr-panel">
          <div className="tr-panel-head">
            <span className="tr-panel-ico tr-panel-ico--ai"><Icon name="plug" size={17} /></span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="tr-panel-title">Bring your own LLM</div>
              <div className="tr-panel-sub">Point Ardovo at your own model endpoint. Your keys, your provider, your rate limits.</div>
            </div>
            <Toggle on={settings.byoLlm} onChange={toggleByo} label="Bring your own LLM" />
          </div>
          <p className="tr-panel-p">
            Run agents against an OpenAI-compatible endpoint you control (Azure OpenAI, Bedrock gateway, or a private deployment). Traffic leaves through your account, so spend and data residency stay under your governance.
          </p>
          <div className="tr-byo" data-active={settings.byoLlm ? 'true' : 'false'}>
            <label className="tr-byo-row">
              <span className="tr-byo-lbl">API base URL</span>
              <input className="input" placeholder="https://your-gateway.example.com/v1" disabled value="" readOnly />
            </label>
            <label className="tr-byo-row">
              <span className="tr-byo-lbl">API key</span>
              <input className="input" type="password" placeholder="sk-..." disabled value="" readOnly />
            </label>
            <div className="tr-byo-hint">
              <Icon name="lock" size={13} />
              <span>{settings.byoLlm ? 'Credentials are configured server-side, never in the browser. This preview stays read-only.' : 'Enable to reveal setup. Credentials are configured server-side, never stored in the client.'}</span>
            </div>
          </div>
        </Card>

        {/* TRUST LAYER */}
        <Card className="tr-panel">
          <div className="tr-panel-head">
            <span className="tr-panel-ico"><Icon name="shield" size={17} /></span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="tr-panel-title">Trust layer</div>
              <div className="tr-panel-sub">The posture that keeps agents safe on your real book. Provable, not promised.</div>
            </div>
          </div>
          <div className="tr-posture">
            {/* Zero data retention */}
            <div className="tr-post-row">
              <span className="tr-post-ico" data-tone="ai"><Icon name="lock" size={16} /></span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="tr-post-title">Zero data retention</div>
                <div className="tr-post-detail">Your book never trains a model. Prompts and outputs are dropped after each run, nothing is retained by the provider.</div>
              </div>
              <div className="tr-post-ctl">
                <Badge tone={settings.zeroRetention ? 'ok' : 'warn'} className="t-xs">{settings.zeroRetention ? 'On' : 'Off'}</Badge>
                <Toggle on={settings.zeroRetention} onChange={toggleRetention} label="Zero data retention" />
              </div>
            </div>
            {/* Reversible writes */}
            <div className="tr-post-row">
              <span className="tr-post-ico" data-tone="ok"><Icon name="rotateCcw" size={16} /></span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="tr-post-title">Reversible writes</div>
                <div className="tr-post-detail">Every agent write lands as a Diff of Record you can undo. No silent mutations to your pipeline.</div>
              </div>
              <div className="tr-post-ctl">
                <Badge tone="ok" className="t-xs"><Icon name="check" size={12} /> Always on</Badge>
              </div>
            </div>
            {/* Audit log */}
            <div className="tr-post-row">
              <span className="tr-post-ico" data-tone="ok"><Icon name="history" size={16} /></span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="tr-post-title">Audit log</div>
                <div className="tr-post-detail">Every read, write, and model call is logged with actor, agent, and cost. Export it for compliance.</div>
              </div>
              <div className="tr-post-ctl">
                <button className="tr-link" onClick={() => nav('/audit')}>View log <Icon name="chevronRight" size={13} /></button>
              </div>
            </div>
            {/* Human-in-the-loop */}
            <div className="tr-post-row">
              <span className="tr-post-ico" data-tone="ok"><Icon name="check" size={16} /></span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="tr-post-title">Human in the loop</div>
                <div className="tr-post-detail">Autonomy is set per agent: suggest, approve, or autonomous within a mandate. You draw the line, agents stay inside it.</div>
              </div>
              <div className="tr-post-ctl">
                <button className="tr-link" onClick={() => nav('/agent-cloud')}>Governance <Icon name="chevronRight" size={13} /></button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <TrustStyles />
    </div>
  );
}

function TrustStyles() {
  return (
    <style>{`
    .tr-mark { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, var(--ai), var(--ai-600)); box-shadow: var(--ai-glow); }

    .tr-note { display: flex; align-items: flex-start; gap: 9px; font-size: 13px; line-height: 1.5; color: var(--ink-2); background: var(--ai-50); border: 1px solid rgba(124,92,247,.22); border-radius: 12px; padding: 11px 14px; }
    .tr-note svg { color: var(--ai-600); flex: none; margin-top: 2px; }

    .tr-model { background: var(--paper); border: 1px solid var(--line); border-radius: 14px; padding: 15px; display: flex; flex-direction: column; gap: 13px; transition: border-color .15s, box-shadow .15s; }
    .tr-model:hover { border-color: var(--line-strong); box-shadow: var(--shadow-sm); }
    .tr-model[data-default="true"] { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
    .tr-model-name { font-weight: 800; font-size: 15px; color: var(--ink); }
    .tr-tier { display: inline-block; margin-top: 6px; font-size: 11px; font-weight: 800; padding: 3px 9px; border-radius: 999px; }
    .tr-price { display: flex; gap: 10px; }
    .tr-price-cell { flex: 1; background: var(--n-25); border: 1px solid var(--line); border-radius: 10px; padding: 9px 11px; display: flex; flex-direction: column; gap: 2px; }
    .tr-price-num { font-weight: 800; font-size: 17px; color: var(--ink); font-variant-numeric: tabular-nums; }
    .tr-price-lbl { font-size: 10.5px; font-weight: 700; letter-spacing: .02em; text-transform: uppercase; color: var(--n-600); }

    .tr-table-card { border: 1px solid var(--line); }
    .tr-table-scroll { overflow-x: auto; }
    .tr-table { width: 100%; }
    .tr-table th { font-size: 11.5px; text-transform: uppercase; letter-spacing: .03em; color: var(--n-600); }
    .tr-table td { vertical-align: middle; }
    .tr-agent-ico { width: 32px; height: 32px; border-radius: 9px; flex: none; display: grid; place-items: center; color: var(--ai-600); background: var(--ai-50); }
    .tr-agent-name { font-weight: 700; font-size: 13.5px; color: var(--ink); white-space: nowrap; }
    .tr-agent-role { font-size: 11.5px; color: var(--n-600); line-height: 1.35; max-width: 340px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tr-cost { font-weight: 800; font-size: 13.5px; color: var(--ink); font-variant-numeric: tabular-nums; }
    .tr-table-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 12px 16px; border-top: 1px solid var(--line); background: var(--n-25); font-size: 12.5px; color: var(--n-600); }

    .tr-panel { padding: 18px; }
    .tr-panel-head { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
    .tr-panel-ico { width: 36px; height: 36px; border-radius: 10px; flex: none; display: grid; place-items: center; color: var(--accent-600); background: var(--accent-50); }
    .tr-panel-ico--ai { color: var(--ai-600); background: var(--ai-50); }
    .tr-panel-title { font-weight: 800; font-size: 15.5px; color: var(--ink); }
    .tr-panel-sub { font-size: 12.5px; color: var(--n-600); line-height: 1.4; margin-top: 2px; }
    .tr-panel-p { font-size: 13px; color: var(--n-600); line-height: 1.55; margin: 0 0 14px; }

    .tr-byo { display: flex; flex-direction: column; gap: 11px; padding: 14px; border: 1px dashed var(--line-strong); border-radius: 12px; background: var(--n-25); opacity: .72; transition: opacity .18s; }
    .tr-byo[data-active="true"] { opacity: 1; border-color: rgba(124,92,247,.4); background: var(--ai-50); }
    .tr-byo-row { display: flex; flex-direction: column; gap: 5px; }
    .tr-byo-lbl { font-size: 11.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .02em; color: var(--n-600); }
    .tr-byo .input:disabled { cursor: not-allowed; background: var(--paper); }
    .tr-byo-hint { display: flex; align-items: flex-start; gap: 7px; font-size: 11.5px; line-height: 1.45; color: var(--n-600); }
    .tr-byo-hint svg { flex: none; margin-top: 1px; }

    .tr-posture { display: flex; flex-direction: column; }
    .tr-post-row { display: flex; align-items: flex-start; gap: 12px; padding: 13px 0; border-top: 1px solid var(--line); }
    .tr-post-row:first-child { border-top: none; padding-top: 2px; }
    .tr-post-ico { width: 34px; height: 34px; border-radius: 10px; flex: none; display: grid; place-items: center; }
    .tr-post-ico[data-tone="ai"] { color: var(--ai-600); background: var(--ai-50); }
    .tr-post-ico[data-tone="ok"] { color: var(--ok); background: var(--ok-bg); }
    .tr-post-title { font-weight: 700; font-size: 14px; color: var(--ink); }
    .tr-post-detail { font-size: 12.5px; color: var(--n-600); line-height: 1.5; margin-top: 2px; }
    .tr-post-ctl { display: flex; flex-direction: column; align-items: flex-end; gap: 7px; flex: none; }

    .tr-link { display: inline-flex; align-items: center; gap: 3px; background: none; border: none; font-family: inherit; font-weight: 700; font-size: 12.5px; color: var(--ai-600); cursor: pointer; padding: 0; white-space: nowrap; }
    .tr-link:hover { color: var(--ai); }

    .tr-toggle { width: 40px; height: 23px; border-radius: 999px; border: none; cursor: pointer; background: var(--n-200); position: relative; flex: none; transition: background .2s; }
    .tr-toggle[data-on="true"] { background: var(--ai); }
    .tr-toggle span { position: absolute; top: 3px; left: 3px; width: 17px; height: 17px; border-radius: 50%; background: #fff; transition: left .2s; box-shadow: 0 1px 3px rgba(0,0,0,.3); }
    .tr-toggle[data-on="true"] span { left: 20px; }
    `}</style>
  );
}
