// Team leaderboard - reps ranked by closed-won, each with an attainment bar
// that fills from zero on mount. Reads nothing from the store directly; the
// page hands in already-ranked rows from repLeaderboard().
import React from 'react';
import { Avatar, ProgressBar, SectionHeader, moneyK } from '../UI.jsx';
import { CountNumber, useMounted } from './motion.jsx';

const MEDAL = ['gold', 'silver', 'bronze'];

export default function TeamLeaderboard({ rows = [], action }) {
  const ready = useMounted();
  const top = rows[0];
  const topWon = Math.max(1, top ? top.won : 1);
  return (
    <div className="card card-pad col">
      <SectionHeader title="Team leaderboard" sub="Closed won this cycle" action={action} />
      {rows.length === 0 ? (
        <div className="muted t-sm" style={{ padding: '.5rem 0' }}>No closed-won deals yet.</div>
      ) : (
        <div className="col">
          {rows.map((r, i) => {
            const quotaPct = r.user.quota ? Math.round((r.won / r.user.quota) * 100) : 0;
            const barPct = Math.round((r.won / topWon) * 100);
            return (
              <div key={r.user.id} className="cc-row">
                <span className={`cc-rank ${MEDAL[i] || ''}`}>{i + 1}</span>
                <Avatar name={r.user.name} size={34} />
                <div className="col" style={{ minWidth: 0, flex: 1, gap: '.3rem' }}>
                  <div className="row between gap-2">
                    <span className="fw-6 clip">{r.user.name}</span>
                    <span className="fw-7 tnum" style={{ flex: 'none' }}>
                      <CountNumber value={r.won} format={moneyK} delay={200 + i * 90} />
                    </span>
                  </div>
                  <ProgressBar
                    value={ready ? barPct : 0}
                    color={i === 0 ? 'var(--accent)' : 'var(--accent-300)'}
                    height={6}
                  />
                  <span className="t-xs muted">{r.user.quota ? `${quotaPct}% of quota` : `${moneyK(r.pipeline)} in pipeline`}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
