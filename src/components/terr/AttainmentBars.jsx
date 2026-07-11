// Per-rep quota attainment as horizontal bars, colored by PACE (how the
// rep tracks against the expected run-rate for the elapsed period), not
// raw attainment. A pace marker shows where they "should" be today.
import React from 'react';
import { Card, Avatar, Badge, moneyK } from '../UI.jsx';
import { Icon } from '../icons.jsx';
import './terr.css';

const PACE = {
  ahead: { color: 'var(--ok)', label: 'Ahead of pace', tone: 'ok' },
  ontrack: { color: '#5b4bf5', label: 'On track', tone: 'accent' },
  behind: { color: 'var(--risk)', label: 'Behind pace', tone: 'risk' },
};

export default function AttainmentBars({ model }) {
  const rows = [...model.repRows].filter(r => r.quota > 0);
  const { elapsedFrac } = model.range;
  const expectedPct = Math.round(elapsedFrac * 100);

  return (
    <Card className="col gap-3">
      <div className="row between wrap" style={{ gap: '.6rem' }}>
        <div className="col gap-1" style={{ minWidth: 0 }}>
          <div className="eyebrow">By rep</div>
          <h4 style={{ margin: 0 }}>Quota attainment, colored by pace</h4>
          <div className="muted t-sm">Bar color reflects run-rate. The tick marks the {expectedPct}% expected by now in {model.range.label}.</div>
        </div>
        <div className="row gap-2 wrap">
          {Object.entries(PACE).map(([k, v]) => (
            <span key={k} className="row gap-1" style={{ alignItems: 'center' }}>
              <span className="terr-dot" style={{ background: v.color }} />
              <span className="t-sm fw-6">{v.label}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="col gap-3">
        {rows.map(r => {
          const pace = PACE[r.paceState] || PACE.ontrack;
          const w = Math.min(100, r.attainment);
          return (
            <div key={r.user.id} className="col gap-1">
              <div className="row between" style={{ gap: '.5rem' }}>
                <div className="row gap-2" style={{ minWidth: 0, alignItems: 'center' }}>
                  <Avatar name={r.user.name} size={30} />
                  <div className="col" style={{ minWidth: 0, lineHeight: 1.2 }}>
                    <span className="fw-6 clip">{r.user.name}</span>
                    <span className="t-xs muted clip">{r.territory ? r.territory.name : 'No territory'}</span>
                  </div>
                </div>
                <div className="row gap-2" style={{ alignItems: 'center', flex: 'none' }}>
                  <span className="tnum fw-7" style={{ fontSize: '1.05rem', color: pace.color }}>{r.attainment}%</span>
                  <Badge tone={pace.tone} style={{ flex: 'none' }}>
                    {r.pace >= 0 ? '+' : ''}{r.pace} vs pace
                  </Badge>
                </div>
              </div>
              <div className="terr-bar-track" style={{ height: 14 }}>
                <div className="terr-bar-fill" style={{ '--terr-w': w + '%', width: w + '%', background: pace.color }} />
                <span className="terr-pace-mark" title={`Expected ${expectedPct}% by now`}
                  style={{ left: `${Math.min(100, expectedPct)}%`, height: 20, top: -3 }} />
              </div>
              <div className="row between t-xs muted">
                <span>{moneyK(r.won)} won</span>
                <span>{moneyK(r.quota)} quota{r.pipeline ? ` - ${moneyK(r.pipeline)} open pipeline` : ''}</span>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && <div className="muted t-sm">No quota-carrying reps.</div>}
      </div>
    </Card>
  );
}
