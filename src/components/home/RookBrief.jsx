// The Command Center hero: greeting, live status, an Open Rook affordance,
// and the "Rook brief" - the top 3 moves that matter today, each with a
// count-up headline number. Presentational; the page computes the moves.
import React from 'react';
import { Icon } from '../icons.jsx';
import { longDate } from '../UI.jsx';
import { CountNumber } from './motion.jsx';

export default function RookBrief({ name, moves = [], onOpenRook, onMove }) {
  return (
    <header className="cc-hero cc-rise">
      <span className="cc-hero-blob b1" />
      <span className="cc-hero-blob b2" />

      <div className="row between wrap" style={{ gap: '1rem', alignItems: 'flex-start' }}>
        <div className="col" style={{ minWidth: 0, gap: '.15rem' }}>
          <div className="cc-hero-eyebrow">{longDate(Date.now())}</div>
          <h1 className="cc-hero-title">{greeting()}, <span className="cc-hero-name">{name}</span></h1>
          <p className="cc-hero-sub">Rook has your revenue in focus. Here are the moves that matter today.</p>
        </div>
        <div className="col" style={{ flex: 'none', alignItems: 'flex-end', gap: '.7rem' }}>
          <span className="cc-live"><span className="cc-live-dot" /> Live</span>
          <button type="button" className="cc-hero-rook" onClick={onOpenRook}>
            <Icon name="sparkles" size={17} fill="currentColor" stroke={0} /> Ask Rook
          </button>
        </div>
      </div>

      <div className="cc-brief">
        {moves.map((m, i) => (
          <button
            key={m.key || i}
            type="button"
            className="cc-brief-card"
            onClick={() => onMove?.(m)}
          >
            <span className="cc-brief-ico"><Icon name={m.icon} size={20} /></span>
            <span className="cc-brief-rank"><Icon name="zap" size={11} fill="currentColor" stroke={0} /> Move {i + 1}</span>
            <div className="cc-brief-val">
              <CountNumber value={m.value} format={m.format} delay={220 + i * 120} />
            </div>
            <div className="cc-brief-label">{m.label}</div>
          </button>
        ))}
      </div>
    </header>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
