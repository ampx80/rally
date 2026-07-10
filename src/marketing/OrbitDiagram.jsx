// OrbitDiagram - a premium SVG showing Rook at the center of every module.
// Modules orbit on a ring; two dashed rings slowly counter-rotate; energy
// pulses along the connection lines inward to Rook and back out. Nodes bob
// gently. Fully responsive (viewBox scales), honors prefers-reduced-motion
// (all motion off, final state stays legible). Transform/opacity + dash only.
// NO em-dash / en-dash. ASCII hyphen only.
import React from 'react';
import { Icon } from '../components/icons.jsx';

const MODULES = [
  ['target', 'Deals'],
  ['users', 'Contacts'],
  ['building', 'Companies'],
  ['trendUp', 'Forecasting'],
  ['fileText', 'Quotes'],
  ['megaphone', 'Campaigns'],
  ['layers', 'Projects'],
  ['workflow', 'Workflows'],
];

const CX = 360;
const CY = 300;
const RING = 210; // node ring radius

export default function OrbitDiagram() {
  // evenly place 8 modules around the ring, starting at top
  const nodes = MODULES.map(([icon, label], i) => {
    const ang = (-90 + (360 / MODULES.length) * i) * (Math.PI / 180);
    return { icon, label, x: CX + Math.cos(ang) * RING, y: CY + Math.sin(ang) * RING, i };
  });

  return (
    <div className="mkt-orbit" aria-hidden>
      <svg viewBox="0 0 720 600" className="mkt-orbit-svg" role="img" aria-label="Rook at the center of every Rally module">
        <defs>
          <radialGradient id="mktOrbitGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(91,75,245,.22)" />
            <stop offset="60%" stopColor="rgba(91,75,245,.06)" />
            <stop offset="100%" stopColor="rgba(91,75,245,0)" />
          </radialGradient>
          <linearGradient id="mktOrbitLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0e9f9a" />
            <stop offset="50%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#5b4bf5" />
          </linearGradient>
          <linearGradient id="mktOrbitCore" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6d5cf7" />
            <stop offset="100%" stopColor="#4a3ce0" />
          </linearGradient>
        </defs>

        {/* center glow */}
        <circle cx={CX} cy={CY} r={230} fill="url(#mktOrbitGlow)" />

        {/* counter-rotating dashed rings */}
        <g className="mkt-orbit-ring mkt-orbit-ring-a">
          <circle cx={CX} cy={CY} r={RING} fill="none" stroke="var(--m-line2)" strokeWidth="1.5" strokeDasharray="2 10" />
        </g>
        <g className="mkt-orbit-ring mkt-orbit-ring-b">
          <circle cx={CX} cy={CY} r={128} fill="none" stroke="rgba(91,75,245,.22)" strokeWidth="1.5" strokeDasharray="3 9" />
        </g>

        {/* energy connection lines center -> node */}
        {nodes.map(n => (
          <line key={`l-${n.label}`} x1={CX} y1={CY} x2={n.x} y2={n.y}
            className="mkt-orbit-flow" stroke="url(#mktOrbitLine)" strokeWidth="2"
            strokeDasharray="5 9" style={{ animationDelay: `${n.i * -0.4}s` }} />
        ))}

        {/* module nodes */}
        {nodes.map(n => (
          <g key={n.label} className="mkt-orbit-node" style={{ animationDelay: `${n.i * 0.32}s` }}>
            <circle cx={n.x} cy={n.y} r={34} className="mkt-orbit-nodebg" />
            <foreignObject x={n.x - 34} y={n.y - 34} width="68" height="68">
              <div className="mkt-orbit-nodeinner">
                <span className="mkt-orbit-nodeicon"><Icon name={n.icon} size={20} /></span>
                <span className="mkt-orbit-nodelabel">{n.label}</span>
              </div>
            </foreignObject>
          </g>
        ))}

        {/* Rook core */}
        <circle cx={CX} cy={CY} r={62} className="mkt-orbit-corepulse" />
        <circle cx={CX} cy={CY} r={52} fill="url(#mktOrbitCore)" className="mkt-orbit-core" />
        <foreignObject x={CX - 52} y={CY - 52} width="104" height="104">
          <div className="mkt-orbit-coreinner">
            <span className="mkt-orbit-coreicon"><Icon name="sparkles" size={26} /></span>
            <span className="mkt-orbit-corelabel">Rook</span>
          </div>
        </foreignObject>
      </svg>
    </div>
  );
}
