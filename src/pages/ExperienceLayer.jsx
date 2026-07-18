// ExperienceLayer - Rally's answer to Agentforce Experience Layer: define an
// agent once, deploy it everywhere your customers and team already are. Pick a
// fleet agent, toggle the surfaces it renders on (in-app, Slack, Teams, web
// widget, email, API/MCP, WhatsApp, voice), and grab the embed. Local-first
// deploy state persists via a tiny pub/sub store. Teal = product, violet = AI.
// NO em-dash / en-dash. ASCII only.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select, useToast } from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import AgentDeck from '../components/agent/AgentDeck.jsx';
import { useAgentCloud, getAgents } from '../lib/agent-cloud.js';

const LS_KEY = 'rally_experience_v1';
const SURFACES = [
  { id: 'inapp', label: 'In-app', icon: 'sparkles', blurb: 'The Rook dock on every Rally screen.', on: true },
  { id: 'slack', label: 'Slack', icon: 'messages', blurb: 'A slash command + DM agent in your workspace.' },
  { id: 'teams', label: 'Microsoft Teams', icon: 'messages', blurb: 'A Teams app your reps chat with.' },
  { id: 'widget', label: 'Web widget', icon: 'globe', blurb: 'An embeddable chat bubble for your site.' },
  { id: 'email', label: 'Email', icon: 'mail', blurb: 'Replies and drafts routed through the agent.' },
  { id: 'api', label: 'API / MCP', icon: 'command', blurb: 'Headless access for Cursor, Claude, ChatGPT.', on: true },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'phone', blurb: 'Conversational agent over WhatsApp Business.' },
  { id: 'voice', label: 'Voice', icon: 'mic', blurb: 'A phone + in-app voice agent.' },
];

function loadState() {
  try { const raw = JSON.parse(localStorage.getItem(LS_KEY)); if (raw && typeof raw === 'object') return raw; } catch {}
  const seed = {};
  SURFACES.forEach(s => { seed[s.id] = !!s.on; });
  return seed;
}

export default function ExperienceLayer() {
  useAgentCloud();
  const nav = useNavigate();
  const toast = useToast();
  const agents = getAgents();
  const [agentId, setAgentId] = useState(agents[0]?.id || '');
  const [surf, setSurf] = useState(loadState);

  useEffect(() => { try { localStorage.setItem(LS_KEY, JSON.stringify(surf)); } catch {} }, [surf]);

  const agent = agents.find(a => a.id === agentId) || agents[0];
  const liveCount = Object.values(surf).filter(Boolean).length;
  const toggle = (id) => { setSurf(s => ({ ...s, [id]: !s[id] })); toast('Deployment updated'); };

  const embed = `<script src="https://rally-psi-five.vercel.app/embed.js"
  data-rally-agent="${agent?.id || 'guardian'}"
  data-surface="widget"></script>`;

  return (
    <div className="fade-up xl">
      <AgentDeck
        eyebrow="Experience Layer"
        title="Build once."
        highlight="Deploy everywhere."
        sub="Define an agent once and render it natively wherever your customers and team already are. One agent, every surface - no rebuild per channel."
        actions={<button className="adk-btn" onClick={() => nav('/agent-cloud')}><Icon name="sparkles" size={15} /> Agent Cloud</button>}
        pods={[
          { label: 'Live surfaces', value: liveCount, icon: 'share2' },
          { label: 'Channels', value: SURFACES.length, icon: 'globe' },
          { label: 'Agents deployable', value: agents.length, icon: 'sparkles' },
        ]}
      />

      <div className="xl-bar">
        <label className="xl-pick">
          <span>Deploying</span>
          <Select value={agentId} onChange={e => setAgentId(e.target.value)}>
            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </label>
        <div className="xl-bar-note"><Icon name="check" size={14} /> {agent?.name} renders on {liveCount} surface{liveCount === 1 ? '' : 's'} from one definition.</div>
      </div>

      <div className="xl-grid">
        {SURFACES.map(s => {
          const on = !!surf[s.id];
          return (
            <div key={s.id} className={`xl-card${on ? ' is-on' : ''}`}>
              <div className="xl-card-top">
                <span className="xl-ic"><Icon name={s.icon} size={18} /></span>
                <button className="xl-toggle" data-on={on} onClick={() => toggle(s.id)} aria-label={`Toggle ${s.label}`}><span /></button>
              </div>
              <div className="xl-card-name">{s.label}</div>
              <div className="xl-card-blurb">{s.blurb}</div>
              <div className="xl-card-status" data-on={on}>{on ? 'Live' : 'Off'}</div>
            </div>
          );
        })}
      </div>

      <div className="xl-embed">
        <div className="xl-embed-h"><Icon name="command" size={16} /> Drop-in embed</div>
        <p className="xl-embed-p">Ship the current agent as a web widget with one script tag. The same agent definition already answers in-app and over MCP.</p>
        <pre className="xl-pre">{embed}</pre>
        <button className="xl-copy" onClick={() => { try { navigator.clipboard.writeText(embed); toast('Embed copied'); } catch {} }}><Icon name="copy" size={13} /> Copy embed</button>
      </div>

      <ExperienceStyles />
    </div>
  );
}

function ExperienceStyles() {
  return (
    <style>{`
    .xl-bar { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin: 1.25rem 0 1rem; }
    .xl-pick { display: flex; flex-direction: column; gap: 4px; }
    .xl-pick span { font-size: 12px; font-weight: 700; color: var(--n-600); }
    .xl-bar-note { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; color: var(--n-600); }
    .xl-bar-note svg { color: var(--accent); }
    .xl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
    .xl-card { background: var(--paper); border: 1px solid var(--line); border-radius: 14px; padding: 15px; transition: border-color .15s, box-shadow .15s, transform .15s; }
    .xl-card.is-on { border-color: rgba(124,92,247,.4); box-shadow: 0 14px 36px -26px rgba(124,92,247,.6); }
    .xl-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .xl-ic { width: 40px; height: 40px; border-radius: 11px; display: grid; place-items: center; color: var(--ai-600); background: var(--ai-50); }
    .xl-card.is-on .xl-ic { color: #fff; background: linear-gradient(135deg, var(--ai), var(--ai-600)); box-shadow: var(--ai-glow); }
    .xl-toggle { width: 40px; height: 23px; border-radius: 999px; border: none; cursor: pointer; background: var(--n-200); position: relative; flex: none; transition: background .2s; }
    .xl-toggle[data-on="true"] { background: var(--ai); }
    .xl-toggle span { position: absolute; top: 3px; left: 3px; width: 17px; height: 17px; border-radius: 50%; background: #fff; transition: left .2s; box-shadow: 0 1px 3px rgba(0,0,0,.3); }
    .xl-toggle[data-on="true"] span { left: 20px; }
    .xl-card-name { font-weight: 800; font-size: 15px; color: var(--ink); }
    .xl-card-blurb { font-size: 12.5px; color: var(--n-600); line-height: 1.45; margin-top: 3px; min-height: 34px; }
    .xl-card-status { display: inline-block; margin-top: 10px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; padding: 3px 9px; border-radius: 999px; color: var(--n-600); background: var(--n-100); }
    .xl-card-status[data-on="true"] { color: var(--ai-600); background: var(--ai-50); }
    .xl-embed { margin-top: 1.25rem; background: var(--paper); border: 1px solid var(--line); border-radius: 14px; padding: 16px; }
    .xl-embed-h { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 14.5px; color: var(--ink); margin-bottom: 6px; }
    .xl-embed-p { font-size: 12.5px; color: var(--n-600); line-height: 1.5; margin: 0 0 10px; }
    .xl-pre { background: #0e1019; color: #d7dbe6; border-radius: 10px; padding: 13px; font-size: 12.5px; line-height: 1.55; overflow-x: auto; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; margin: 0 0 8px; white-space: pre-wrap; }
    .xl-copy { display: inline-flex; align-items: center; gap: 5px; font-family: inherit; font-size: 12px; font-weight: 700; color: var(--n-600); background: var(--n-100); border: none; border-radius: 7px; padding: 5px 9px; cursor: pointer; }
    .xl-copy:hover { color: var(--ink); }
    `}</style>
  );
}
