// Replay & Coach - headline session stats + feature coverage chips.
// Deterministic, built entirely from the local replay analysis.
// NO em-dash / en-dash. ASCII hyphen only.
import React from 'react';
import { StatCard, SectionHeader, Card } from '../UI.jsx';
import { Icon } from '../icons.jsx';

function fmtMinutes(ms) {
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const m = Math.round(sec / 60);
  return `${m} min`;
}

export default function SessionStats({ analysis, onGo }) {
  const { totalMs, featuresUsed, coverage, mostRevisited, touched, untouched } = analysis;
  const revisitCount = mostRevisited.length;

  return (
    <div className="col gap-3">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
        <StatCard label="Time this session" value={fmtMinutes(totalMs)} icon={<Icon name="clock" size={18} />} accent="#5b4bf5" sub="tracked on this device" />
        <StatCard label="Features touched" value={featuresUsed.length} icon={<Icon name="layers" size={18} />} accent="#0ea5a3" sub={`of ${coverage.total} surfaces`} />
        <StatCard label="Coverage" value={Math.round((coverage.touched / Math.max(1, coverage.total)) * 100)} format={(n) => `${Math.round(n)}%`} icon={<Icon name="radar" size={18} />} accent="#e0752d" sub="of the product explored" />
        <StatCard label="Revisited a lot" value={revisitCount} icon={<Icon name="rotateCcw" size={18} />} accent="#8b3fd4" sub="features opened 3+ times" />
      </div>

      <Card className="col gap-2">
        <SectionHeader
          title="Feature coverage"
          sub="Green means you have been there this session. Grey is waiting for you. Click any to jump in."
        />
        {touched.length > 0 && (
          <div className="col gap-1">
            <span className="t-xs fw-7" style={{ color: 'var(--n-600)' }}>TOUCHED</span>
            <div className="rp-chips">
              {touched.map(f => (
                <button key={f.key} className="rp-chip rp-chip--touched" onClick={() => onGo(f.route)} title={f.hint || f.label}>
                  <span className="rp-chip__dot" />{f.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {untouched.length > 0 && (
          <div className="col gap-1" style={{ marginTop: touched.length ? '.5rem' : 0 }}>
            <span className="t-xs fw-7" style={{ color: 'var(--n-600)' }}>NOT YET</span>
            <div className="rp-chips">
              {untouched.map(f => (
                <button key={f.key} className="rp-chip rp-chip--untouched" onClick={() => onGo(f.route)} title={f.hint || f.label}>
                  <span className="rp-chip__dot" />{f.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
