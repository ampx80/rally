// PagesHubViz - makes the 1000+ page directory feel alive: count-up hero stats,
// a twinkling constellation backdrop, and animated category tiles that spring in
// and lift on hover with their page counts counting up. No em-dash / en-dash.
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/icons.jsx';
import { useCountUp, useInView } from './hooks.js';
import './viz2.css';

export function StatCountUp({ value, suffix = '', label, grad = false }) {
  const [ref, val] = useCountUp(value, { duration: 1600 });
  const shown = Math.round(val).toLocaleString();
  return (
    <div ref={ref} style={{ textAlign: 'center' }}>
      <div className="v2-stat-val">
        <span className={grad ? 'v2-stat-grad' : undefined}>{shown}{suffix}</span>
      </div>
      <div className="v2-stat-lbl">{label}</div>
    </div>
  );
}

export function HeroStats({ stats }) {
  return (
    <div className="v2 v2-statrow">
      {stats.map((s) => (
        <StatCountUp key={s.label} value={s.value} suffix={s.suffix} label={s.label} grad={s.grad} />
      ))}
    </div>
  );
}

function Tile({ tile, index }) {
  const [ref, count] = useCountUp(tile.count, { duration: 1400 });
  const [inRef, inView] = useInView({ threshold: 0.18 });
  return (
    <Link
      to={tile.to}
      ref={inRef}
      className={`v2-tile${inView ? ' is-in' : ''}`}
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <div className="v2-tile-top">
        <span className="v2-tile-ico"><Icon name={tile.icon} size={24} /></span>
        <span ref={ref} className="v2-tile-count">{Math.round(count).toLocaleString()}</span>
      </div>
      <h3 className="v2-tile-name">{tile.name}</h3>
      <p className="v2-tile-blurb">{tile.blurb}</p>
      <span className="v2-tile-more">Browse <Icon name="chevronRight" size={15} /></span>
    </Link>
  );
}

export function CategoryTiles({ tiles }) {
  return (
    <div className="v2 v2-tiles">
      {tiles.map((t, i) => <Tile key={t.name} tile={t} index={i} />)}
    </div>
  );
}

// Deterministic twinkling constellation for the hero backdrop.
export function Constellation() {
  const { nodes, lines } = useMemo(() => {
    const W = 1160, H = 460;
    const rand = (seed) => { const x = Math.sin(seed * 99.13) * 43758.5453; return x - Math.floor(x); };
    const nodes = Array.from({ length: 34 }, (_, i) => ({
      x: Math.round(rand(i + 1) * W),
      y: Math.round(rand(i + 7.3) * H),
      r: 1.5 + rand(i + 3.1) * 2.4,
      d: (rand(i + 5) * 4).toFixed(2),
    }));
    const lines = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
        if (dx * dx + dy * dy < 148 * 148) lines.push([nodes[i], nodes[j]]);
      }
    }
    return { nodes, lines };
  }, []);
  return (
    <div className="v2 v2-constellation" aria-hidden>
      <svg width="100%" height="100%" viewBox="0 0 1160 460" preserveAspectRatio="xMidYMid slice">
        {lines.map(([a, b], i) => <line key={i} className="v2-cline" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />)}
        {nodes.map((n, i) => <circle key={i} className="v2-cnode" cx={n.x} cy={n.y} r={n.r} style={{ animationDelay: `${n.d}s` }} />)}
      </svg>
    </div>
  );
}
