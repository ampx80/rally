// AgentFabric - a living visualization of the agent fleet: a central Rook core
// with pulsing rings, specialized agents orbiting it, and energy flowing along
// the connections for every active agent. The signature "wow" of Agent Cloud:
// your AI workforce, alive. Click a node to select. NO em-dash / en-dash.
import React from 'react';
import './agent-surface.css';

const W = 900, H = 380;
const CX = W / 2, CY = 190, RX = 330, RY = 132;

export default function AgentFabric({ agents = [], selectedId, onSelect }) {
  const n = agents.length || 1;
  const nodes = agents.map((a, i) => {
    const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { a, x: CX + RX * Math.cos(ang), y: CY + RY * Math.sin(ang), active: a.status === 'active' };
  });

  return (
    <div className="afx">
      <div className="afx-cap"><span style={{ width: 7, height: 7, borderRadius: 99, background: '#8b6bff', display: 'inline-block' }} /> Agent Fabric</div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Agent fleet map">
        <defs>
          <linearGradient id="afxLineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="rgba(124,92,247,.1)" /><stop offset="1" stopColor="rgba(124,92,247,.5)" />
          </linearGradient>
          <radialGradient id="afxCoreFill" cx="50%" cy="45%" r="60%">
            <stop offset="0" stopColor="#a78bff" /><stop offset="70%" stopColor="#6647e0" /><stop offset="100%" stopColor="#3d31c2" />
          </radialGradient>
          <radialGradient id="afxNodeFill" cx="50%" cy="40%" r="70%">
            <stop offset="0" stopColor="#20203a" /><stop offset="100%" stopColor="#14142a" />
          </radialGradient>
        </defs>

        {/* connective lines + energy flow */}
        {nodes.map((nd, i) => {
          const mx = (nd.x + CX) / 2, my = (nd.y + CY) / 2 - 26;
          const d = `M ${nd.x} ${nd.y} Q ${mx} ${my} ${CX} ${CY}`;
          return (
            <g key={'l' + i}>
              <path className="afx-line" d={d} />
              {nd.active && <path className="afx-flow" d={d} style={{ animationDelay: `${(i % 5) * 0.22}s` }} />}
            </g>
          );
        })}

        {/* core */}
        <g className="afx-core">
          <circle className="afx-core-ring" cx={CX} cy={CY} />
          <circle className="afx-core-ring" cx={CX} cy={CY} style={{ animationDelay: '1.5s' }} />
          <circle cx={CX} cy={CY} r="30" fill="url(#afxCoreFill)" stroke="rgba(255,255,255,.25)" strokeWidth="1.5" />
          <text x={CX} y={CY - 1} textAnchor="middle" fontSize="12.5" fontWeight="900" fill="#fff" letterSpacing="1">ROOK</text>
          <text x={CX} y={CY + 12} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,.7)" letterSpacing="1.5">CORE</text>
        </g>

        {/* agent nodes */}
        {nodes.map((nd, i) => {
          const sel = nd.a.id === selectedId;
          const initial = (nd.a.name || '?').trim()[0] || '?';
          return (
            <g key={nd.a.id} className="afx-node" transform={`translate(${nd.x},${nd.y})`} onClick={() => onSelect?.(nd.a.id)}>
              <circle className="afx-node-glow" data-on={nd.active} r="26" fill={nd.active ? 'rgba(124,92,247,.5)' : 'rgba(120,130,160,.18)'} />
              <circle r="19" fill="url(#afxNodeFill)" stroke={sel ? '#6ee7d6' : nd.active ? '#8b6bff' : 'rgba(140,150,180,.4)'} strokeWidth={sel ? 2.4 : 1.6} />
              <text textAnchor="middle" y="5" fontSize="15" fontWeight="800" fill={nd.active ? '#fff' : '#9aa0bd'}>{initial}</text>
              <text className="afx-node-label" textAnchor="middle" y={nd.y > CY ? 42 : -30}>{nd.a.name}</text>
              <text className="afx-node-sub" textAnchor="middle" y={nd.y > CY ? 54 : -19}>{nd.active ? nd.a.autonomy : 'paused'}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
