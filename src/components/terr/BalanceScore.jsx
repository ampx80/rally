// Balance / fairness gauge + the deterministic rebalance suggestion.
// The gauge is a CSS-animated semicircle; applying a suggestion writes
// through to the persisted territory rosters, so every roll-up updates.
import React from 'react';
import { Card, Button, Badge } from '../UI.jsx';
import { Icon } from '../icons.jsx';
import { applyRebalance } from '../../lib/territory-data.js';
import './terr.css';

function scoreColor(v) {
  if (v >= 80) return 'var(--ok)';
  if (v >= 55) return 'var(--accent)';
  return 'var(--warn)';
}
function scoreLabel(v) {
  if (v >= 80) return 'Well balanced';
  if (v >= 55) return 'Slightly skewed';
  return 'Out of balance';
}

// Semicircle gauge (180deg). value 0..100.
function Gauge({ value }) {
  const size = 168, stroke = 14;
  const r = (size - stroke) / 2;
  const cx = size / 2, cy = size / 2;
  const semi = Math.PI * r;                       // arc length of half circle
  const off = semi - (Math.max(0, Math.min(100, value)) / 100) * semi;
  const color = scoreColor(value);
  // needle angle: -90deg (left) .. +90deg (right)
  const angle = -90 + (Math.max(0, Math.min(100, value)) / 100) * 180;
  const h = size / 2 + 14;
  return (
    <div style={{ position: 'relative', width: size, height: h }}>
      <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`}>
        <path d={`M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${cy}`}
          fill="none" stroke="var(--n-100)" strokeWidth={stroke} strokeLinecap="round" />
        <path className="terr-gauge-arc"
          d={`M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${cy}`}
          fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={semi} strokeDashoffset={off} />
        {/* needle */}
        <g className="terr-gauge-needle" style={{ transform: `rotate(${angle}deg)` }}>
          <line x1={cx} y1={cy} x2={cx} y2={cy - r + 8} stroke={color} strokeWidth={3} strokeLinecap="round" />
        </g>
        <circle cx={cx} cy={cy} r={6} fill={color} />
      </svg>
      <div style={{ position: 'absolute', left: 0, right: 0, top: cy - 44, textAlign: 'center' }}>
        <div style={{ fontSize: '2.4rem', fontWeight: 800, lineHeight: 1, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
        <div className="stat-label" style={{ marginTop: 2 }}>Balance</div>
      </div>
    </div>
  );
}

export default function BalanceScore({ model, onApplied }) {
  const { balanceScore, coverage, rebalance } = model;
  const sug = rebalance;
  const canApply = sug && sug.type === 'move_rep';

  const apply = () => {
    const res = applyRebalance(sug);
    if (!res.error) onApplied?.(sug);
  };

  return (
    <Card className="col gap-3">
      <div className="row between wrap" style={{ gap: '1rem', alignItems: 'flex-start' }}>
        <div className="col gap-1" style={{ minWidth: 0 }}>
          <div className="eyebrow">Coverage health</div>
          <h4 style={{ margin: 0 }}>Territory balance</h4>
          <div className="muted t-sm">Accounts-per-rep spread across every book. Higher is fairer.</div>
        </div>
        <div className="row gap-3 wrap" style={{ alignItems: 'center' }}>
          <div className="col gap-1" style={{ textAlign: 'center' }}>
            <span className="fw-7 tnum" style={{ fontSize: '1.35rem' }}>{coverage.pct}%</span>
            <span className="stat-label">Coverage</span>
          </div>
          <div className="col gap-1" style={{ textAlign: 'center' }}>
            <span className="fw-7 tnum" style={{ fontSize: '1.35rem', color: coverage.uncovered ? 'var(--warn)' : 'var(--ok)' }}>{coverage.uncovered}</span>
            <span className="stat-label">White space</span>
          </div>
        </div>
      </div>

      <div className="row gap-3 wrap" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Gauge value={balanceScore} />
        <div className="col gap-2" style={{ flex: '1 1 300px', minWidth: 260 }}>
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <span className="terr-dot" style={{ background: scoreColor(balanceScore) }} />
            <span className="fw-7">{scoreLabel(balanceScore)}</span>
          </div>
          {sug && (
            <div className={`terr-suggest col gap-2${canApply ? '' : ''}`} style={{
              padding: '.9rem 1rem', borderRadius: 'var(--r-sm)',
              border: '1px solid var(--line)', background: 'var(--n-25)',
            }}>
              <div className="row gap-2" style={{ alignItems: 'center' }}>
                <span className="row center" style={{ width: 26, height: 26, borderRadius: 8, flex: 'none', background: 'var(--accent-50, rgba(91,75,245,.1))', color: 'var(--accent-600)' }}>
                  <Icon name="sparkles" size={15} />
                </span>
                <span className="fw-7 t-sm">Rebalance suggestion</span>
                {canApply && <Badge tone="accent" style={{ flex: 'none' }}>+{sug.projected - sug.current} balance</Badge>}
              </div>
              <div className="t-sm" style={{ position: 'relative', zIndex: 1 }}>{sug.message}</div>
              {canApply && (
                <div className="row gap-2" style={{ position: 'relative', zIndex: 1 }}>
                  <Button variant="accent" size="sm" onClick={apply}>
                    <Icon name="check" size={14} /> Apply move
                  </Button>
                  <span className="t-xs muted row gap-1" style={{ alignItems: 'center' }}>
                    {sug.current} <Icon name="chevronRight" size={12} /> {sug.projected}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
