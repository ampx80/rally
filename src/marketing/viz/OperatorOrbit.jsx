// OperatorOrbit - one operator at the center of every module. Rook sits in the
// middle with a pulsing halo, connected by flowing wires to the modules orbiting
// around it. Illustrates "one operator across your entire revenue stack".
// Reduced motion drops the flow/spin but keeps the diagram. NO em-dash.
import React from 'react';
import { Icon } from '../../components/icons.jsx';
import './viz.css';

const MODULES = [
  ['target', 'Deals'], ['users', 'Contacts'], ['mail', 'Outreach'],
  ['chart', 'Reports'], ['workflow', 'Automations'], ['receipt', 'Billing'],
];
const CX = 320, CY = 200, R = 148;

export default function OperatorOrbit() {
  const pts = MODULES.map((_, i) => {
    const a = (-90 + i * (360 / MODULES.length)) * (Math.PI / 180);
    return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) };
  });

  return (
    <div className="vz-orbit" aria-hidden>
      <svg className="vz-orbit-svg" viewBox="0 0 640 400" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="vzOrbitStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#5b4bf5" /><stop offset="0.55" stopColor="#a855f7" /><stop offset="1" stopColor="#0e9f9a" />
          </linearGradient>
        </defs>
        <circle className="vz-orbit-ring" cx={CX} cy={CY} r={R} />
        <circle className="vz-orbit-ring vz-orbit-ring-dash" cx={CX} cy={CY} r={R} />
        {pts.map((p, i) => (
          <line key={i} className="vz-orbit-wire" x1={CX} y1={CY} x2={p.x} y2={p.y} style={{ animationDelay: `${i * 0.3}s` }} />
        ))}
      </svg>

      {pts.map((p, i) => (
        <span key={MODULES[i][1]} className="vz-orbit-node" style={{ left: `${(p.x / 640) * 100}%`, top: `${(p.y / 400) * 100}%`, animationDelay: `${i * 0.5}s` }}>
          <Icon name={MODULES[i][0]} size={15} />
          <span className="vz-orbit-nodelabel">{MODULES[i][1]}</span>
        </span>
      ))}

      <span className="vz-orbit-core" style={{ left: `${(CX / 640) * 100}%`, top: `${(CY / 400) * 100}%` }}>
        <span className="vz-orbit-halo" />
        <span className="vz-orbit-coreinner">
          <Icon name="sparkles" size={26} fill="#fff" stroke={0} />
          <span className="vz-orbit-corelabel">Rook</span>
        </span>
      </span>
    </div>
  );
}
