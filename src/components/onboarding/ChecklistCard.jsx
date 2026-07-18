// "Getting started" widget for the Command Center home. A dismissible card
// that reflects REAL progress (data imported, first deal created, teammates
// invited, Rook opened) via useChecklist(). Another page owns CommandCenter,
// so this is a drop-in: import and render <ChecklistCard /> anywhere on the
// home. It self-hides once dismissed. NO em-dash / en-dash.
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge } from '../UI.jsx';
import { Icon } from '../icons.jsx';
import { useChecklist, dismissChecklist, markRookMet } from '../../lib/onboarding-data.js';
import './onboarding.css';

export default function ChecklistCard() {
  const nav = useNavigate();
  const { items, done, total, pct, onb } = useChecklist();

  if (onb.dismissedChecklist) return null;

  const allDone = done === total;

  const runCta = (item) => {
    if (item.cta?.action === 'rook') {
      markRookMet();
      window.dispatchEvent(new CustomEvent('rally:rook', { detail: { open: true } }));
      return;
    }
    if (item.cta?.to) nav(item.cta.to);
  };

  return (
    <Card className="ob-checklist col fade-up" style={{ gap: '1rem' }}>
      <span className="glow" aria-hidden />
      <div className="row between" style={{ alignItems: 'flex-start', gap: '1rem' }}>
        <div className="col gap-1" style={{ minWidth: 0 }}>
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <span className="row center" style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent-50)', color: 'var(--accent-600)', flex: 'none' }}>
              <Icon name={allDone ? 'check' : 'rocket'} size={16} />
            </span>
            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{allDone ? 'You are all set' : 'Getting started'}</h3>
            <Badge tone={allDone ? 'ok' : 'accent'}>{done}/{total}</Badge>
          </div>
          <span className="muted t-sm">
            {allDone ? 'Nice work. You have activated the essentials.' : 'A few quick steps to get the most out of Ardovo.'}
          </span>
        </div>
        <button className="ob-skip" onClick={dismissChecklist} aria-label="Dismiss getting started" style={{ flex: 'none' }}>
          Dismiss
        </button>
      </div>

      <div className="ob-cl-bar" aria-hidden>
        <div className="ob-cl-bar-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="col">
        {items.map(item => (
          <div key={item.key} className={`ob-cl-item${item.done ? ' is-done' : ''}`}>
            <span className={`ob-cl-check${item.done ? ' done' : ''}`}>
              {item.done && <Icon name="check" size={13} stroke={3} />}
            </span>
            <div className="col" style={{ minWidth: 0, flex: 1, lineHeight: 1.3 }}>
              <span className="ob-cl-label fw-6 clip">{item.label}</span>
              <span className="t-sm muted clip">{item.desc}</span>
            </div>
            {!item.done && (
              <button className="ob-cl-cta" onClick={() => runCta(item)}>
                {item.cta.label} <Icon name="chevronRight" size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
