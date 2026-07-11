// A premium KPI tile for the cockpit: count-up headline number, a trend
// arrow, and a live sparkline. Clickable through to the relevant page.
import React from 'react';
import { Sparkline } from '../UI.jsx';
import { CountNumber } from './motion.jsx';

export default function KpiTile({ label, value, format, trend, spark, sparkColor, accent = 'var(--accent)', icon, sub, delay = 0, onClick }) {
  const up = trend == null ? null : trend >= 0;
  const trendColor = up == null ? '' : up ? 'var(--ok)' : 'var(--risk)';
  return (
    <button type="button" onClick={onClick} className="card card-pad cc-kpi cc-rise" style={{ animationDelay: `${delay}ms`, background: 'var(--paper)' }}>
      <span className="cc-kpi-glow" style={{ background: accent }} />
      <div className="row between" style={{ position: 'relative' }}>
        <div className="stat-label">{label}</div>
        {icon && <span style={{ color: accent }}>{icon}</span>}
      </div>
      <div className="row between" style={{ alignItems: 'flex-end', marginTop: 8, position: 'relative' }}>
        <div className="col gap-1" style={{ minWidth: 0 }}>
          <div className="cc-kpi-val">
            <CountNumber value={value} format={format} delay={delay + 120} />
          </div>
          {trend != null ? (
            <span className="cc-trend" style={{ color: trendColor }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ transform: up ? 'none' : 'scaleY(-1)' }}><path d="M4 16l6-6 4 4 6-8" /><path d="M16 6h4v4" /></svg>
              {up ? '+' : ''}{trend}% vs last period
            </span>
          ) : (sub && <div className="t-xs muted">{sub}</div>)}
        </div>
        {spark && (
          <div className="cc-kpi-spark" style={{ flex: 'none' }}>
            <Sparkline data={spark} color={sparkColor || accent} w={94} h={38} />
          </div>
        )}
      </div>
    </button>
  );
}
