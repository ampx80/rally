// Team - the revenue team roster with live attainment. Quotas come off the
// user records, closed-won comes off the rep leaderboard, so every card
// stays in sync with the book of business. Sorted by closed won, ranked.
import React from 'react';
import { useStore, getUsers, userName, repLeaderboard } from '../lib/store';
import {
  Card, Badge, SectionHeader, StatCard, ProgressBar, Avatar,
  money, moneyK,
} from '../components/UI';
import { Icon } from '../components/icons';

const ACCENT = '#5b4bf5';

export default function Team() {
  useStore(); // subscribe for reactivity

  const users = getUsers();
  const reps = users.filter(u => u.role === 'rep');
  const board = repLeaderboard(); // [{ user, won, pipeline, count }]
  const wonByUser = Object.fromEntries(board.map(r => [r.user.id, r.won]));
  const pipeByUser = Object.fromEntries(board.map(r => [r.user.id, r.pipeline]));

  /* ---- team KPIs ---- */
  const teamQuota = reps.reduce((s, u) => s + (u.quota || 0), 0);
  const closedWon = board.reduce((s, r) => s + r.won, 0);
  const attainment = teamQuota ? Math.round((closedWon / teamQuota) * 100) : 0;
  const repCount = reps.length;

  /* ---- roster, sorted by closed won desc (managers included, ranked last if 0) ---- */
  const roster = [...users].sort((a, b) => (wonByUser[b.id] || 0) - (wonByUser[a.id] || 0));

  return (
    <div className="fade-up col gap-3">
      <SectionHeader
        title="Team"
        sub={`${users.length} people on the revenue team - ${repCount} carrying quota.`}
      />

      {/* KPI strip */}
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <StatCard label="Team quota" value={teamQuota} format={moneyK} icon={<Icon name="target" size={18} />} sub="sum of rep quotas" />
        <StatCard label="Closed won" value={closedWon} format={moneyK} icon={<Icon name="check" size={18} />} sub="won across the team" />
        <StatCard label="Attainment" value={attainment} format={(v) => Math.round(v) + '%'} icon={<Icon name="trendUp" size={18} />} sub="won / quota" />
        <StatCard label="Reps" value={repCount} icon={<Icon name="users" size={18} />} sub="quota-carrying" />
      </div>

      {/* Roster */}
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        {roster.map((u, i) => {
          const isManager = u.role === 'manager';
          const won = wonByUser[u.id] || 0;
          const pipe = pipeByUser[u.id] || 0;
          const quota = u.quota || 0;
          const pct = quota ? Math.round((won / quota) * 100) : 0;
          const barColor = pct >= 100 ? 'var(--ok)' : pct >= 60 ? ACCENT : 'var(--warn)';
          return (
            <Card key={u.id} hover className="col" style={{ gap: '1rem' }}>
              <div className="row gap-2" style={{ alignItems: 'center' }}>
                <Avatar name={u.name} size={52} />
                <div className="col" style={{ minWidth: 0, gap: 2, flex: 1 }}>
                  <div className="row gap-2" style={{ alignItems: 'center' }}>
                    <h4 className="clip" style={{ margin: 0 }}>{u.name}</h4>
                    <Badge tone={isManager ? 'accent' : 'default'} style={{ flex: 'none' }}>
                      {isManager ? 'Manager' : 'Rep'}
                    </Badge>
                  </div>
                  <span className="muted t-sm clip">{u.title}</span>
                </div>
                {i < 3 && !isManager && (
                  <span className="row center t-xs fw-7" title={`#${i + 1} by closed won`}
                    style={{ width: 26, height: 26, borderRadius: '50%', flex: 'none', background: ACCENT + '14', color: ACCENT }}>
                    {i + 1}
                  </span>
                )}
              </div>

              <div className="row" style={{ gap: '1.5rem' }}>
                <div className="col gap-1">
                  <span className="stat-label">Quota</span>
                  <span className="fw-7 tnum" style={{ fontSize: '1.05rem' }}>{isManager && !quota ? '-' : money(quota)}</span>
                </div>
                <div className="col gap-1">
                  <span className="stat-label">Closed won</span>
                  <span className="fw-7 tnum" style={{ fontSize: '1.05rem', color: won > 0 ? 'var(--ok)' : 'inherit' }}>{money(won)}</span>
                </div>
                <div className="col gap-1">
                  <span className="stat-label">Open pipeline</span>
                  <span className="fw-7 tnum" style={{ fontSize: '1.05rem' }}>{money(pipe)}</span>
                </div>
              </div>

              <div className="col gap-1">
                <div className="row between">
                  <span className="t-sm muted">Attainment</span>
                  <span className="fw-7 t-sm" style={{ color: barColor }}>{isManager && !quota ? '-' : pct + '%'}</span>
                </div>
                <ProgressBar value={isManager && !quota ? 0 : pct} color={barColor} height={9} />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
