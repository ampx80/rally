// A single quest: an icon, the title + description, its XP reward, a live
// progress hint for store-verified quests, and a working action. Store
// quests carry a deep link to the feature where you prove them; manual
// quests link out AND offer an explicit "Mark done" (reversible).
import React from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button } from '../UI.jsx';
import { Icon } from '../icons.jsx';

export default function QuestCard({ quest, done, progress = 0, onMark, onUnmark }) {
  const manual = !quest.metric;
  const pct = Math.round(progress * 100);
  return (
    <div className={`mo-quest fx-lift${done ? ' mo-quest--done mo-quest--glow' : ''}`}>
      <span className="mo-quest__icon"><Icon name={quest.icon} size={20} /></span>

      <div className="col gap-1" style={{ flex: 1, minWidth: 0 }}>
        <div className="row between" style={{ gap: 8, alignItems: 'flex-start' }}>
          <span className={`fw-7 clip${done ? ' mo-quest__title--done' : ''}`}>{quest.title}</span>
          <Badge tone={done ? 'ok' : 'accent'} style={{ flex: 'none' }}>+{quest.xp} XP</Badge>
        </div>
        <span className="t-sm muted">{quest.desc}</span>

        {/* live progress hint for store-verified quests that need more than one */}
        {!done && !manual && (quest.delta || 1) > 1 && (
          <span className="t-xs muted tnum" style={{ marginTop: 2 }}>{pct}% there</span>
        )}

        <div className="row gap-1 wrap" style={{ marginTop: 6, alignItems: 'center' }}>
          {done ? (
            <>
              <span className="row gap-1 t-sm fw-6" style={{ color: 'var(--ok)' }}>
                <Icon name="check" size={15} /> Done
              </span>
              {manual && onUnmark && (
                <Button variant="quiet" size="sm" onClick={() => onUnmark(quest.id)}>Undo</Button>
              )}
              <Button as={Link} to={quest.route} variant="quiet" size="sm">
                {quest.cta} <Icon name="chevronRight" size={14} />
              </Button>
            </>
          ) : (
            <>
              <Button as={Link} to={quest.route} variant="primary" size="sm">
                {quest.cta} <Icon name="arrowRight" size={14} />
              </Button>
              {manual ? (
                <Button variant="ghost" size="sm" onClick={() => onMark(quest.id)}>
                  <Icon name="check" size={14} /> Mark done
                </Button>
              ) : (
                <span className="t-xs muted row gap-1" style={{ alignItems: 'center' }}>
                  <Icon name="zap" size={13} /> Auto-verified when you do it
                </span>
              )}
            </>
          )}
        </div>
      </div>

      <span className={`mo-quest__check${done ? ' mo-quest__check--done' : ''}`} aria-hidden="true">
        <Icon name="check" size={15} />
      </span>
    </div>
  );
}
