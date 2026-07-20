// Replay & Coach - a single coaching card. Kind, personal, actionable, with
// a working deep link to the feature it is about.
// NO em-dash / en-dash. ASCII hyphen only.
import React from 'react';
import { Card, Badge, Button } from '../UI.jsx';
import { Icon } from '../icons.jsx';

// tone -> accent color used for the left rule + icon wash.
const TONE_COLOR = {
  accent: 'var(--accent)',
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  info: 'var(--accent-teal, var(--accent))',
  risk: 'var(--risk)',
};

// tone -> Badge tone (Badge supports default|ok|warn|risk|info|accent).
const TONE_BADGE = { accent: 'accent', ok: 'ok', warn: 'warn', info: 'info', risk: 'risk' };
const TONE_LABEL = { accent: 'Try this', ok: 'Nice work', warn: 'Heads up', info: 'Tip', risk: 'Attention' };

export default function CoachCard({ card, onGo }) {
  if (!card) return null;
  const color = TONE_COLOR[card.tone] || TONE_COLOR.accent;
  const badgeTone = TONE_BADGE[card.tone] || 'accent';
  return (
    <Card className="rp-card col gap-2" style={{ '--rp-accent': color }}>
      <div className="rp-card__head">
        <span className="rp-card__icon"><Icon name={card.icon || 'sparkles'} size={19} /></span>
        <div className="col gap-1" style={{ minWidth: 0, flex: 1 }}>
          <div className="row between gap-2" style={{ alignItems: 'flex-start' }}>
            <span className="rp-card__title">{card.title}</span>
            <Badge tone={badgeTone} className="t-xs" style={{ flex: 'none' }}>{TONE_LABEL[card.tone] || 'Tip'}</Badge>
          </div>
          <div className="rp-card__body t-sm">{card.body}</div>
        </div>
      </div>
      {card.cta && card.cta.to && (
        <div className="rp-card__foot">
          <Button variant="ghost" size="sm" onClick={() => onGo(card.cta.to)}>
            {card.cta.label || 'Open'} <Icon name="arrowRight" size={15} />
          </Button>
        </div>
      )}
    </Card>
  );
}
