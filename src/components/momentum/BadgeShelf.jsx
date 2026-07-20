// The level ladder. Shows every rank, lights the ones earned, and points to
// the current one so the rep can see exactly how far they have come and what
// the next name to unlock is.
import React from 'react';
import { Card, Badge } from '../UI.jsx';
import { LEVELS } from '../../lib/momentum.js';
import LevelBadge from './LevelBadge.jsx';

export default function BadgeShelf({ currentLevel }) {
  return (
    <Card className="card-pad col gap-3">
      <div className="row between">
        <h4 style={{ margin: 0 }}>Rank ladder</h4>
        <span className="t-sm muted">{currentLevel} of {LEVELS.length}</span>
      </div>
      <div className="col gap-2">
        {LEVELS.map(l => {
          const earned = l.level <= currentLevel;
          const isCurrent = l.level === currentLevel;
          return (
            <div
              key={l.level}
              className="row gap-2"
              style={{
                alignItems: 'center', padding: '.55rem .65rem', borderRadius: 'var(--r-md)',
                background: isCurrent ? 'var(--accent-50)' : 'transparent',
                opacity: earned ? 1 : .5,
              }}
            >
              <LevelBadge level={l.level} badge={l.badge} color={earned ? l.color : 'var(--n-400)'} size="sm" />
              <span className="col" style={{ minWidth: 0, flex: 1 }}>
                <span className="fw-6 clip">{l.name}</span>
                <span className="t-xs muted clip">{l.blurb}</span>
              </span>
              {isCurrent && <Badge tone="accent" style={{ flex: 'none' }}>You are here</Badge>}
              {earned && !isCurrent && <span style={{ color: 'var(--ok)', flex: 'none' }}>&#10003;</span>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
