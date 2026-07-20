// AgentDeck - the cinematic command-deck hero shared across Ardovo's agent
// modules. Deep-space gradient, animated aurora + grid, a live pulse, a
// gradient title, and glowing count-up stat pods. NO em-dash / en-dash.
import React from 'react';
import { Icon } from '../icons.jsx';
import { AnimatedNumber } from '../UI.jsx';
import './agent-surface.css';

export default function AgentDeck({ eyebrow = 'Agent Cloud', live = true, title, highlight, sub, actions, pods = [] }) {
  return (
    <section className="adk fx-scan">
      <span className="adk-grid" aria-hidden />
      <span className="adk-aurora a1" aria-hidden />
      <span className="adk-aurora a2" aria-hidden />
      <span className="adk-aurora a3" aria-hidden />
      <div className="adk-top">
        <div style={{ minWidth: 0 }}>
          <div className="adk-eyebrow">
            <span>{eyebrow}</span>
            {live && <span className="adk-live"><b /> Live</span>}
          </div>
          <h1 className="adk-title">{title} {highlight && <span className="g">{highlight}</span>}</h1>
          {sub && <p className="adk-sub">{sub}</p>}
        </div>
        {actions && <div className="adk-actions">{actions}</div>}
      </div>
      {pods.length > 0 && (
        <div className="adk-pods">
          {pods.map((p, i) => (
            <div key={i} className="adk-pod">
              {p.icon && <span className="adk-pod-ic"><Icon name={p.icon} size={16} /></span>}
              <div className="adk-pod-v">{typeof p.value === 'number' ? <AnimatedNumber value={p.value} format={p.format} /> : p.value}</div>
              <div className="adk-pod-l">{p.label}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
