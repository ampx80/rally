// Agent API - Rally's headless + MCP developer surface. The "Headless 360"
// answer: the whole platform as tools any agent can drive (Cursor, Claude,
// ChatGPT), not a locked-in UI. Documents the tool catalog, the endpoints, an
// MCP connect snippet, and a live probe against the real API. Grounded in the
// shared TOOL_CATALOG. NO em-dash / en-dash. ASCII hyphen only.
import React, { useMemo, useState } from 'react';
import { SectionHeader, useToast } from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import { TOOL_CATALOG } from '../lib/agent-cloud.js';

const MCP_SNIPPET = `{
  "mcpServers": {
    "rally": {
      "url": "https://rally-psi-five.vercel.app/api/mcp"
    }
  }
}`;

const CURL = `curl -X POST https://rally-psi-five.vercel.app/api/agent \\
  -H "Content-Type: application/json" \\
  -d '{ "input": "Which deals are slipping and what should I do?" }'`;

export default function AgentApi() {
  const toast = useToast();
  const [probe, setProbe] = useState(null);
  const [busy, setBusy] = useState(false);

  const groups = useMemo(() => {
    const g = {};
    for (const t of TOOL_CATALOG) (g[t.group] = g[t.group] || []).push(t);
    return g;
  }, []);

  const runProbe = async () => {
    setBusy(true);
    try {
      const r = await fetch('/api/agent');
      const j = await r.json();
      setProbe(j);
      toast(`Live: ${j.tools?.length || 0} tools exposed`);
    } catch (e) { setProbe({ error: e.message }); toast('Probe failed', 'risk'); }
    finally { setBusy(false); }
  };

  const copy = (text, label) => { try { navigator.clipboard.writeText(text); toast(`${label} copied`); } catch {} };

  return (
    <div className="fade-up aa">
      <SectionHeader
        title={<span className="row gap-2" style={{ alignItems: 'center' }}><span className="aa-mark"><Icon name="command" size={17} /></span> Agent API + MCP</span>}
        sub="Rally with no browser required. Every capability is a tool any agent can call - yours, Cursor, Claude, or ChatGPT. Built headless-first, not retrofitted."
        action={<button className="btn btn-primary btn-sm" onClick={runProbe} disabled={busy}><Icon name="activity" size={15} /> {busy ? 'Probing...' : 'Probe live API'}</button>}
      />

      {probe && (
        <div className="aa-probe">
          <div className="row between" style={{ alignItems: 'center', marginBottom: 6 }}>
            <span className="aa-probe-title">{probe.ok ? 'Live response from /api/agent' : 'Response'}</span>
            <span className="aa-badge" data-ok={!!probe.ok}>{probe.ok ? 'HTTP 200' : 'error'}</span>
          </div>
          <pre className="aa-pre">{JSON.stringify(probe, null, 2).slice(0, 1400)}</pre>
        </div>
      )}

      <div className="aa-grid">
        <div className="col gap-3">
          <div className="aa-card">
            <div className="aa-card-h"><Icon name="globe" size={16} /> Endpoints</div>
            <div className="aa-ep"><span className="aa-verb aa-verb--get">GET</span><code>/api/agent</code><span className="aa-ep-note">capabilities + tool catalog</span></div>
            <div className="aa-ep"><span className="aa-verb aa-verb--post">POST</span><code>/api/agent</code><span className="aa-ep-note">grounded plan + tool calls</span></div>
            <div className="aa-ep"><span className="aa-verb aa-verb--get">GET</span><code>/api/mcp</code><span className="aa-ep-note">MCP tool manifest</span></div>
            <div className="aa-ep"><span className="aa-verb aa-verb--post">POST</span><code>/api/mcp</code><span className="aa-ep-note">tools/list, tools/call</span></div>
          </div>

          <div className="aa-card">
            <div className="row between" style={{ alignItems: 'center' }}>
              <div className="aa-card-h" style={{ margin: 0 }}><Icon name="fileText" size={16} /> Call it</div>
              <button className="aa-copy" onClick={() => copy(CURL, 'curl')}><Icon name="copy" size={13} /> Copy</button>
            </div>
            <pre className="aa-pre">{CURL}</pre>
          </div>

          <div className="aa-card">
            <div className="row between" style={{ alignItems: 'center' }}>
              <div className="aa-card-h" style={{ margin: 0 }}><Icon name="command" size={16} /> Connect from Cursor or Claude</div>
              <button className="aa-copy" onClick={() => copy(MCP_SNIPPET, 'MCP config')}><Icon name="copy" size={13} /> Copy</button>
            </div>
            <pre className="aa-pre">{MCP_SNIPPET}</pre>
            <div className="aa-note">Drop this in your MCP client config and Rally shows up as a tool server. Read tools answer from a posted snapshot; write tools return a propose-confirm envelope so nothing mutates your book without a yes.</div>
          </div>
        </div>

        <div className="aa-card">
          <div className="aa-card-h"><Icon name="sparkles" size={16} /> Tool catalog <span className="aa-count">{TOOL_CATALOG.length}</span></div>
          {Object.entries(groups).map(([group, tools]) => (
            <div key={group} className="aa-group">
              <div className="aa-group-label">{group}</div>
              {tools.map(t => (
                <div key={t.name} className="aa-tool">
                  <span className="aa-tool-kind" data-kind={t.kind}>{t.kind}</span>
                  <code className="aa-tool-name">{t.name}</code>
                  <span className="aa-tool-desc">{t.description}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <AgentApiStyles />
    </div>
  );
}

function AgentApiStyles() {
  return (
    <style>{`
    .aa-mark { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, var(--ai), var(--ai-600)); box-shadow: var(--ai-glow); }
    .aa-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr); gap: 1rem; align-items: start; }
    @media (max-width: 940px) { .aa-grid { grid-template-columns: 1fr; } }
    .aa-card { background: var(--paper); border: 1px solid var(--line); border-radius: 14px; padding: 16px; }
    .aa-card-h { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 14.5px; color: var(--ink); margin-bottom: 12px; }
    .aa-count { margin-left: auto; font-size: 12px; font-weight: 800; color: var(--ai-600); background: var(--ai-50); padding: 2px 9px; border-radius: 999px; }
    .aa-ep { display: flex; align-items: center; gap: 10px; padding: 7px 0; border-top: 1px solid var(--line); }
    .aa-ep:first-of-type { border-top: none; }
    .aa-verb { font-size: 10.5px; font-weight: 800; padding: 3px 7px; border-radius: 6px; flex: none; }
    .aa-verb--get { color: #1a7f52; background: var(--ok-bg); }
    .aa-verb--post { color: #7c5cf7; background: var(--ai-50); }
    .aa-ep code { font-size: 13px; color: var(--ink); font-weight: 700; }
    .aa-ep-note { font-size: 12px; color: var(--n-600); margin-left: auto; }
    .aa-pre { background: #0e1019; color: #d7dbe6; border-radius: 10px; padding: 13px; font-size: 12.5px; line-height: 1.55; overflow-x: auto; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; margin: 0; white-space: pre-wrap; word-break: break-word; }
    .aa-copy { display: inline-flex; align-items: center; gap: 5px; font-family: inherit; font-size: 12px; font-weight: 700; color: var(--n-600); background: var(--n-100); border: none; border-radius: 7px; padding: 5px 9px; cursor: pointer; }
    .aa-copy:hover { color: var(--ink); }
    .aa-note { font-size: 12.5px; color: var(--n-600); line-height: 1.5; margin-top: 10px; }
    .aa-group { margin-bottom: 12px; }
    .aa-group-label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--n-400); margin: 6px 0; }
    .aa-tool { display: flex; align-items: baseline; gap: 9px; padding: 6px 0; }
    .aa-tool-kind { font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 2px 6px; border-radius: 5px; flex: none; }
    .aa-tool-kind[data-kind="read"] { color: #2563a8; background: var(--info-bg); }
    .aa-tool-kind[data-kind="write"] { color: #b3721a; background: var(--warn-bg); }
    .aa-tool-name { font-size: 12.5px; font-weight: 700; color: var(--ink); flex: none; }
    .aa-tool-desc { font-size: 12px; color: var(--n-600); line-height: 1.4; }
    .aa-probe { background: var(--paper); border: 1px solid var(--line); border-radius: 12px; padding: 14px; margin-bottom: 1rem; }
    .aa-probe-title { font-weight: 700; font-size: 13.5px; color: var(--ink); }
    .aa-badge { font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 999px; color: var(--n-600); background: var(--n-100); }
    .aa-badge[data-ok="true"] { color: var(--ok); background: var(--ok-bg); }
    `}</style>
  );
}
