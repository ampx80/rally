// BADGES WALL. Shows every badge earned across the Arena: per-mode achievement
// badges (Objection Slayer, Speed Demon, Ardovo Scholar) and the headline
// "Ardovo Certified <Role>" certification badges. Empty state guides a brand
// new rep to their first badge. ASCII only.
import React from 'react';
import { Card, Badge, EmptyState } from '../UI.jsx';
import { Icon } from '../icons.jsx';
import { roleById, MODE_LABEL } from '../../lib/arena.js';

function BadgeTile({ badge }) {
  const toneVar = badge.tone === 'accent' ? 'var(--accent)' : `var(--${badge.tone})`;
  const isCert = badge.kind === 'cert';
  const when = badge.earnedAt ? new Date(badge.earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  return (
    <div
      className={`ar-badge col gap-2 center ar-badge-tile fx-shimmer${isCert ? ' ar-badge-cert fx-neon fx-glow' : ''}`}
      style={{
        textAlign: 'center', padding: '1.1rem .9rem', borderRadius: 'var(--r-lg)',
        border: `1px solid ${isCert ? toneVar : 'var(--line)'}`,
        background: isCert ? 'color-mix(in srgb, var(--ok) 8%, var(--paper))' : 'var(--paper)',
      }}
    >
      <span className={isCert ? 'ar-badge__medal fx-float' : 'ar-badge__medal'} style={{
        width: 52, height: 52, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `color-mix(in srgb, ${toneVar} 16%, transparent)`, color: toneVar,
      }}>
        <Icon name={badge.icon} size={26} />
      </span>
      <div className={`fw-7${isCert ? ' fx-holo' : ''}`} style={{ lineHeight: 1.3 }}>{badge.label}</div>
      <div className="row gap-1 center wrap">
        {isCert
          ? <Badge tone="ok">Certified</Badge>
          : <Badge tone="default">{MODE_LABEL[badge.mode]} - {roleById(badge.role).name}</Badge>}
      </div>
      {when && <div className="t-xs muted">Earned {when}</div>}
    </div>
  );
}

export default function BadgesWall({ badges = [] }) {
  const certs = badges.filter(b => b.kind === 'cert');
  const modes = badges.filter(b => b.kind === 'mode');

  if (!badges.length) {
    return (
      <Card pad>
        <EmptyState
          icon={'\u25C6'}
          title="Your badge wall is empty"
          body="Pass any mode to earn your first badge. Clear all three for a role to unlock an Ardovo Certified badge."
        />
      </Card>
    );
  }

  return (
    <div className="col gap-3">
      {certs.length > 0 && (
        <div className="col gap-2">
          <div className="t-sm fw-6 muted" style={{ letterSpacing: '.04em', textTransform: 'uppercase' }}>Certifications</div>
          <div className="ar-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '.9rem' }}>
            {certs.map(b => <BadgeTile key={b.id} badge={b} />)}
          </div>
        </div>
      )}
      <div className="col gap-2">
        <div className="t-sm fw-6 muted" style={{ letterSpacing: '.04em', textTransform: 'uppercase' }}>Achievements</div>
        {modes.length > 0 ? (
          <div className="ar-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '.9rem' }}>
            {modes.map(b => <BadgeTile key={b.id} badge={b} />)}
          </div>
        ) : (
          <Card pad><div className="t-sm muted">Pass a single mode to start earning achievement badges.</div></Card>
        )}
      </div>
    </div>
  );
}
