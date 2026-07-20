// Replay & Coach - the session timeline. A vertical list of the routes you
// visited, how long you dwelled on each, and any coarse action markers that
// fired while you were there. Every feature name is a working deep link.
// NO em-dash / en-dash. ASCII hyphen only.
import React from 'react';
import { timeStr } from '../UI.jsx';

function fmtDwell(ms) {
  const sec = Math.round(ms / 1000);
  if (sec < 60) return sec + 's';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

export default function SessionTimeline({ stops = [], onGo }) {
  if (!stops.length) return null;
  const maxDwell = Math.max(1, ...stops.map(s => s.dwellMs));
  // Newest first reads like a session recap.
  const ordered = [...stops].reverse();
  return (
    <div className="rp-tl fx-scan">
      {ordered.map((s, i) => {
        const pct = Math.max(4, Math.round((s.dwellMs / maxDwell) * 100));
        return (
          <div className="rp-tl__row" key={`${s.route}-${s.enterT}-${i}`}>
            <div className="rp-tl__when">
              <span className="t-xs muted">{timeStr(s.enterT)}</span>
              <span className="rp-tl__dwell">{s.isCurrent ? 'here now' : fmtDwell(s.dwellMs)}</span>
            </div>
            <div className="rp-tl__bar-wrap">
              <div className="rp-tl__feature">
                <span className="rp-tl__dot" style={{ background: s.isCurrent ? 'var(--accent-purple, var(--accent))' : 'var(--accent)' }} />
                <button className="rp-tl__name rp-tl__link" onClick={() => onGo(s.route)} title={`Open ${s.label}`}>
                  {s.label}
                </button>
                {s.isCurrent && <span className="rp-tl__now t-xs">live</span>}
              </div>
              <div className="rp-tl__bar"><div className="rp-tl__fill" style={{ width: pct + '%' }} /></div>
              {s.actions.length > 0 && (
                <div className="rp-tl__actions">
                  {s.actions.slice(0, 6).map((a, j) => (
                    <span key={j} className="t-xs muted">{a.kind}{a.label ? `: ${a.label}` : ''}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
