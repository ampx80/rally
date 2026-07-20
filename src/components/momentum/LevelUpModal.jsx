// Level-up celebration. A focused modal announcing the new rank, its blurb,
// and the XP banked. Reuses the shared Modal (focus trap + Escape). Confetti
// is fired by the page around this so both respect reduced motion.
import React from 'react';
import { Modal, Button } from '../UI.jsx';
import LevelBadge from './LevelBadge.jsx';

export default function LevelUpModal({ open, level, onClose }) {
  if (!level) return null;
  return (
    <Modal open={open} onClose={onClose} width={420}>
      <div className="col center gap-3" style={{ textAlign: 'center', padding: '.5rem 0 .25rem' }}>
        <div className="mo-levelup__ring mo-levelup__burst">
          <span className="mo-levelup__ray fx-ring" aria-hidden="true" />
          <LevelBadge level={level.level} badge={level.badge} color={level.color} size="lg" style={{ width: 88, height: 88, fontSize: '1.9rem', borderRadius: 24 }} />
        </div>
        <div className="eyebrow" style={{ color: level.color }}>Level {level.level} unlocked</div>
        <h2 style={{ margin: 0 }}>{level.name}</h2>
        <p className="muted" style={{ margin: 0, maxWidth: 300 }}>{level.blurb}</p>
        <div className="row gap-3" style={{ marginTop: 4 }}>
          <div className="col">
            <span className="stat-value" style={{ fontSize: '1.6rem' }}>{level.xp}</span>
            <span className="stat-label">XP banked</span>
          </div>
          {!level.isMax && (
            <div className="col">
              <span className="stat-value" style={{ fontSize: '1.6rem' }}>{level.xpToNext}</span>
              <span className="stat-label">to {level.next.name}</span>
            </div>
          )}
        </div>
        <Button variant="primary" onClick={onClose} style={{ marginTop: 6 }}>Keep the momentum</Button>
      </div>
    </Modal>
  );
}
