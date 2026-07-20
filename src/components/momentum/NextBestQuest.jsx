// The "do this next" hero card. Surfaces the single most useful incomplete
// quest with a big deep link. When the whole ramp is done it flips to a
// celebratory finished state (no dead ends).
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, Badge, Button } from '../UI.jsx';
import { Icon } from '../icons.jsx';

export default function NextBestQuest({ quest, tierName, onMark, allDone }) {
  if (allDone || !quest) {
    return (
      <Card className="card-pad col gap-2" style={{ borderColor: 'var(--ok)' }}>
        <div className="row gap-1" style={{ color: 'var(--ok)', alignItems: 'center' }}>
          <Icon name="star" size={18} /> <span className="eyebrow" style={{ color: 'var(--ok)' }}>Ramp complete</span>
        </div>
        <h3 style={{ margin: 0 }}>You are fully ramped</h3>
        <span className="muted t-sm">Every quest on this path is done. Keep the streak alive and help ramp the next teammate.</span>
        <Button as={Link} to="/deals" variant="primary" size="sm" style={{ width: 'fit-content', marginTop: 4 }}>
          Go close deals <Icon name="arrowRight" size={15} />
        </Button>
      </Card>
    );
  }
  const manual = !quest.metric;
  return (
    <Card className="card-pad mo-next col gap-2 fx-lift fx-shimmer">
      <div className="mo-next__spark" />
      <div className="row between" style={{ position: 'relative' }}>
        <span className="eyebrow" style={{ color: 'var(--accent-600)' }}>Next best quest</span>
        <Badge tone="accent">+{quest.xp} XP</Badge>
      </div>
      <div className="row gap-2" style={{ position: 'relative', alignItems: 'center' }}>
        <span className="mo-quest__icon" style={{ width: 48, height: 48, borderRadius: 14 }}>
          <Icon name={quest.icon} size={22} />
        </span>
        <div className="col" style={{ minWidth: 0 }}>
          <h3 style={{ margin: 0 }}>{quest.title}</h3>
          <span className="t-sm muted">{tierName}</span>
        </div>
      </div>
      <span className="t-sm" style={{ position: 'relative' }}>{quest.desc}</span>
      <div className="row gap-1 wrap" style={{ position: 'relative', marginTop: 4 }}>
        <Button as={Link} to={quest.route} variant="primary">
          {quest.cta} <Icon name="arrowRight" size={16} />
        </Button>
        {manual && (
          <Button variant="ghost" onClick={() => onMark(quest.id)}>
            <Icon name="check" size={15} /> Mark done
          </Button>
        )}
      </div>
    </Card>
  );
}
