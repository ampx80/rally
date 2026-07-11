// Book-of-business health heatmap. Every customer is a cell; color = health
// band, size/opacity scale with ARR so the biggest accounts read loudest.
// Click a cell to open the account detail. Pure presentational - the data is
// derived upstream in success-data.js.
import React from 'react';
import { Badge, moneyK } from '../UI.jsx';

const BAND_COLOR = { healthy: 'var(--ok)', watch: 'var(--warn)', risk: 'var(--risk)' };
const BAND_BG = { healthy: 'var(--ok-bg)', watch: 'var(--warn-bg)', risk: 'var(--risk-bg)' };

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
}

export default function HealthGrid({ accounts = [], selectedId, onSelect }) {
  const maxArr = accounts.reduce((m, a) => Math.max(m, a.arr), 1);

  return (
    <div className="col gap-3">
      <div className="row gap-3 wrap" style={{ alignItems: 'center' }}>
        {Object.entries({ healthy: 'Healthy', watch: 'Watch', risk: 'At risk' }).map(([k, label]) => (
          <span key={k} className="row gap-1" style={{ alignItems: 'center' }}>
            <span className="dot" style={{ background: BAND_COLOR[k] }} />
            <span className="t-sm muted">{label}</span>
          </span>
        ))}
        <span className="t-xs muted" style={{ marginLeft: 'auto' }}>Tile size scales with ARR. Click any account.</span>
      </div>

      <div className="cs-heatgrid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(122px, 1fr))',
        gap: 10,
      }}>
        {accounts.map((a, i) => {
          const weight = 0.5 + 0.5 * (a.arr / maxArr); // 0.5 .. 1 opacity of tint
          const selected = a.id === selectedId;
          const highRisk = a.band.key === 'risk' && a.churnProb >= 0.55;
          return (
            <button
              key={a.id}
              onClick={() => onSelect?.(a)}
              className={`cs-cell${selected ? ' cs-selected' : ''}${highRisk ? ' cs-pulse' : ''}`}
              title={`${a.name} - health ${a.score}, ${moneyK(a.arr)} ARR`}
              style={{
                animationDelay: `${Math.min(i * 24, 480)}ms`,
                textAlign: 'left',
                border: `1px solid ${BAND_COLOR[a.band.key]}`,
                borderLeftWidth: 4,
                background: `color-mix(in srgb, ${BAND_BG[a.band.key]} ${Math.round(weight * 100)}%, var(--paper))`,
                borderRadius: 'var(--r-md)',
                padding: '.6rem .65rem',
                minHeight: 92,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                minWidth: 0,
              }}
            >
              <div className="row between" style={{ alignItems: 'center', gap: 4 }}>
                <span className="row center" style={{
                  width: 22, height: 22, borderRadius: 6, flex: 'none',
                  background: BAND_COLOR[a.band.key], color: '#fff',
                  fontSize: '.62rem', fontWeight: 800,
                }}>{initials(a.name)}</span>
                <span className="tnum fw-8" style={{ fontSize: '1.05rem', color: BAND_COLOR[a.band.key] }}>{a.score}</span>
              </div>
              <span className="clip fw-6" style={{ fontSize: '.82rem', lineHeight: 1.15 }}>{a.name}</span>
              <span className="row between" style={{ marginTop: 'auto', alignItems: 'center', gap: 4 }}>
                <span className="tnum t-xs muted">{moneyK(a.arr)}</span>
                {a.isExpansion
                  ? <span className="t-xs fw-7" style={{ color: 'var(--accent-600)' }}>+{moneyK(a.expansionArr)}</span>
                  : a.daysToRenewal >= 0 && a.daysToRenewal <= 60
                    ? <span className="t-xs fw-7" style={{ color: 'var(--warn)' }}>{a.daysToRenewal}d</span>
                    : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
