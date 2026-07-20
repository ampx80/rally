// Manager view: the team ramp leaderboard. Reads every rep from the store
// and scores each on the share of the role's store-verifiable quests their
// live records satisfy, so a manager can see who is ramped and who is behind
// without booking a single check-in meeting.
import React from 'react';
import { Card, Badge, Avatar, EmptyState } from '../UI.jsx';
import { Icon } from '../icons.jsx';
import { RAMP_STATUS } from '../../lib/momentum.js';
import LevelBadge from './LevelBadge.jsx';

export default function TeamRamp({ rows, roleLabel }) {
  if (!rows.length) {
    return <EmptyState icon={<Icon name="users" size={30} />} title="No reps to show" body="Add reps to the team to see the ramp leaderboard." />;
  }
  const ramped = rows.filter(r => r.status === 'ramped').length;
  const behind = rows.filter(r => r.status === 'behind').length;
  return (
    <div className="col gap-3">
      <div className="row between wrap gap-2" style={{ alignItems: 'center' }}>
        <span className="muted t-sm">
          Scored on real CRM activity against the {roleLabel} path. No meeting required.
        </span>
        <div className="row gap-1 wrap">
          <Badge tone="ok">{ramped} ramped</Badge>
          <Badge tone="warn">{behind} behind</Badge>
        </div>
      </div>

      <Card pad={false} style={{ overflow: 'hidden' }}>
        {rows.map((r, i) => {
          const sm = RAMP_STATUS[r.status];
          return (
            <div
              key={r.user.id}
              className={`row between${r.isMe ? ' mo-team__row--me' : ''}`}
              style={{ padding: '.85rem 1.1rem', borderTop: i ? '1px solid var(--line)' : 'none', gap: 14 }}
            >
              <span className="row gap-2" style={{ minWidth: 0, flex: '1 1 220px' }}>
                <span className="tnum muted" style={{ width: 20, textAlign: 'right', flex: 'none' }}>{i + 1}</span>
                <Avatar name={r.user.name} size={34} />
                <span className="col" style={{ minWidth: 0 }}>
                  <span className="fw-6 clip">
                    {r.user.name}{r.isMe && <span className="t-xs muted"> (you)</span>}
                  </span>
                  <span className="t-xs muted clip">{r.user.title}</span>
                </span>
              </span>

              <span className="row gap-2" style={{ flex: '2 1 260px', alignItems: 'center', minWidth: 180 }}>
                <span style={{ flex: 1 }}>
                  <div className="mo-team__bar">
                    <div className="mo-team__fill" style={{ width: `${r.percent}%`, background: sm.color }} />
                  </div>
                </span>
                <span className="tnum fw-6" style={{ width: 42, textAlign: 'right' }}>{r.percent}%</span>
              </span>

              <span className="row gap-2" style={{ flex: 'none', alignItems: 'center' }}>
                <span className="t-sm muted tnum desktop-only" style={{ width: 78, textAlign: 'right' }}>{r.done}/{r.total} quests</span>
                <span title={`${r.level.name}`}>
                  <LevelBadge level={r.level.level} badge={r.level.badge} color={r.level.color} size="sm" />
                </span>
                <Badge tone={sm.tone} style={{ flex: 'none' }}>{sm.label}</Badge>
              </span>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
