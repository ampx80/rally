// ForecastConfidence - the gauge a CRO trusts. A single confidence number
// built from real signals (coverage, activity, risk drag, attainment), a
// commit / best / worst scenario toggle, a driver breakdown, and a Rook
// read-out that says what the number means in plain language.
import React, { useMemo, useState } from 'react';
import { Card, Badge, AnimatedNumber, ProgressBar, Sparkline, money, moneyK } from '../UI.jsx';
import { forecastConfidence } from '../../lib/intelligence-data.js';

function RookGlyph({ size = 14, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
      <path d="M6 3h2v2h2V3h4v2h2V3h2v5l-2 2v6l1 3H5l1-3v-6L4 8V3h2zm1 15h10v2H7v-2z" />
    </svg>
  );
}

const TONE_COLOR = { ok: 'var(--ok)', accent: 'var(--accent)', warn: 'var(--warn)', risk: 'var(--risk)' };

// Half-circle gauge, 0..100, sweeping from left to right.
function Gauge({ value, color }) {
  const size = 210, stroke = 16;
  const r = (size - stroke) / 2;
  const cx = size / 2, cy = size / 2;
  const semi = Math.PI * r;                 // arc length of a half circle
  const off = semi - (value / 100) * semi;
  const arc = `M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${cy}`;
  return (
    <div style={{ position: 'relative', width: size, height: size / 2 + 8 }}>
      <svg width={size} height={size / 2 + 8} viewBox={`0 0 ${size} ${size / 2 + 8}`}>
        <path d={arc} fill="none" stroke="var(--n-100)" strokeWidth={stroke} strokeLinecap="round" />
        <path
          d={arc} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={semi} strokeDashoffset={off}
          className="intel-gauge-arc" style={{ '--intel-dash-full': semi }}
        />
      </svg>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, textAlign: 'center' }}>
        <div className="fw-8" style={{ fontSize: '2.6rem', lineHeight: 1, color, fontVariantNumeric: 'tabular-nums' }}>
          <AnimatedNumber value={value} />
        </div>
        <div className="stat-label" style={{ marginTop: 2 }}>confidence</div>
      </div>
    </div>
  );
}

const SCN = [
  { key: 'worst', label: 'Worst case', hint: 'Risk-adjusted floor', color: 'var(--warn)' },
  { key: 'commit', label: 'Commit', hint: 'The number we call', color: 'var(--ok)' },
  { key: 'best', label: 'Best case', hint: 'Upside with a push', color: 'var(--accent)' },
];

export default function ForecastConfidence() {
  const [scn, setScn] = useState('commit');
  const data = useMemo(() => forecastConfidence(), []);
  const color = TONE_COLOR[data.tone] || 'var(--accent)';
  const active = data.scenarios[scn];

  return (
    <Card className="card-pad col gap-3" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -60, right: -40, width: 220, height: 220, borderRadius: '50%', background: color, opacity: .06, filter: 'blur(12px)' }} />

      <div className="col gap-1" style={{ position: 'relative' }}>
        <span className="intel-ai-tag"><span className="intel-spark" />Forecast confidence</span>
        <h3 style={{ margin: 0 }}>How likely is the {data.quarterLabel} number</h3>
      </div>

      <div className="row gap-3 wrap" style={{ alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <div className="col center gap-1" style={{ flex: '0 0 auto' }}>
          <Gauge value={data.confidence} color={color} />
          <Badge tone={data.tone} style={{ marginTop: 4 }}>{data.label}</Badge>
          <div style={{ marginTop: 6 }}><Sparkline data={data.trend} color={color} w={150} h={30} /></div>
          <div className="t-xs muted">confidence, last 8 checks</div>
        </div>

        {/* Driver breakdown */}
        <div className="col gap-2" style={{ flex: '1 1 260px', minWidth: 240 }}>
          {data.drivers.map(d => (
            <div key={d.key} className="col gap-1">
              <div className="row between">
                <span className="fw-6 t-sm">{d.key}</span>
                <span className="tnum fw-7 t-sm" style={{ color: d.value >= 66 ? 'var(--ok)' : d.value >= 40 ? 'var(--warn)' : 'var(--risk)' }}>{d.value}</span>
              </div>
              <ProgressBar value={d.value} height={7} color={d.value >= 66 ? 'var(--ok)' : d.value >= 40 ? 'var(--warn)' : 'var(--risk)'} />
              <span className="t-xs muted">{d.hint}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Rook read-out */}
      <div className="intel-rook" style={{ position: 'relative' }}>
        <span className="intel-rook__mark"><RookGlyph size={14} /></span>
        <div className="col gap-1" style={{ minWidth: 0 }}>
          <span className="fw-7 t-sm">Rook reads the quarter</span>
          <span className="t-sm" style={{ color: 'var(--ink-2)' }}>{data.read}</span>
        </div>
      </div>

      {/* Scenario toggle */}
      <div className="col gap-2" style={{ position: 'relative' }}>
        <div className="row between wrap" style={{ gap: '.5rem' }}>
          <span className="stat-label">Scenario band</span>
          <span className="t-sm muted">Active: <span className="fw-7" style={{ color: SCN.find(s => s.key === scn).color }}>{money(active)}</span></span>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '.6rem' }}>
          {SCN.map(s => {
            const v = data.scenarios[s.key];
            const on = s.key === scn;
            return (
              <button key={s.key} className="intel-scn" data-active={on} onClick={() => setScn(s.key)}
                style={on ? { borderColor: s.color, boxShadow: `0 0 0 3px ${s.color}22` } : undefined}>
                <div className="row between">
                  <span className="stat-label">{s.label}</span>
                  <span className="dot" style={{ background: s.color }} />
                </div>
                <div className="fw-8" style={{ fontSize: '1.5rem', lineHeight: 1.15, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{moneyK(v)}</div>
                <div className="t-xs muted">{s.hint}</div>
              </button>
            );
          })}
        </div>
        {/* Band visualization: worst -> best with commit + quota markers */}
        <BandBar data={data} scn={scn} />
      </div>
    </Card>
  );
}

function BandBar({ data, scn }) {
  const { worst, commit, best } = data.scenarios;
  const lo = Math.min(worst, commit, best) * 0.9;
  const hi = Math.max(best, data.quota) * 1.04;
  const span = hi - lo || 1;
  const at = (v) => `${((v - lo) / span) * 100}%`;
  return (
    <div style={{ position: 'relative', marginTop: 6 }}>
      <div style={{ position: 'relative', height: 12, borderRadius: 999, background: 'var(--n-100)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: at(worst), width: `calc(${at(best)} - ${at(worst)})`, top: 0, bottom: 0, background: 'linear-gradient(90deg, var(--warn), var(--ok) 55%, var(--accent))', opacity: .8, borderRadius: 999 }} />
      </div>
      {/* commit marker */}
      <div style={{ position: 'absolute', left: at(commit), top: -3, transform: 'translateX(-50%)', width: 3, height: 18, background: 'var(--ink)', borderRadius: 2 }} title={`Commit ${money(commit)}`} />
      {/* quota marker */}
      {data.quota > 0 && (
        <div style={{ position: 'absolute', left: at(data.quota), top: -3, transform: 'translateX(-50%)', width: 3, height: 18, background: 'var(--risk)', borderRadius: 2 }} title={`Quota ${money(data.quota)}`} />
      )}
      <div className="row between t-xs muted" style={{ marginTop: 8 }}>
        <span>worst {moneyK(worst)}</span>
        <span>quota {moneyK(data.quota)}</span>
        <span>best {moneyK(best)}</span>
      </div>
    </div>
  );
}
