// Detail rail for the Skill Map: shows the hovered or selected skill, its
// mastery, prerequisites (clickable to jump), and the actions that advance it
// (open the route it lives on, start the lesson via ardova:companion, or mark
// a rep as practiced). When nothing is selected it nudges the user toward the
// frontier with a "next up" list.
import React from 'react';
import { Icon } from '../icons.jsx';
import { Button, Badge, ProgressBar } from '../UI.jsx';
import {
  SKILL_BY_ID, AREA_BY_ID, LEVELS, areaColor,
} from '../../lib/skill-graph.js';

function LevelBadge({ level }) {
  const meta = LEVELS[level] || LEVELS.locked;
  const tone = level === 'mastered' ? 'ok' : level === 'proficient' ? 'info' : level === 'learning' ? 'warn' : 'default';
  return <Badge tone={tone}>{meta.label}</Badge>;
}

export default function SkillDetail({ skill, st, state, nextItems, onSelect, onNavigate, onLesson, onPractice }) {
  if (!skill) {
    return (
      <div className="card card-pad sm-detail">
        <div className="eyebrow">Skill detail</div>
        <h3 style={{ margin: '.35rem 0 .4rem' }}>Pick a star</h3>
        <p className="muted t-sm" style={{ marginTop: 0 }}>
          Hover or click any node on the map to see how to master it. Coloured nodes are unlocked, dashed nodes are locked until you clear their prerequisites.
        </p>
        {nextItems?.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <div className="eyebrow" style={{ marginBottom: '.5rem' }}>Ready to level up</div>
            <div className="col gap-1">
              {nextItems.map(({ skill: s }) => (
                <button key={s.id} type="button" className="sm-prereq" onClick={() => onSelect(s.id)}>
                  <span className="sm-lvl-dot" style={{ background: areaColor(s.area) }} />
                  <span className="clip" style={{ fontWeight: 700 }}>{s.label}</span>
                  <span className="spacer" />
                  <span className="t-xs muted">{AREA_BY_ID.get(s.area)?.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const area = AREA_BY_ID.get(skill.area);
  const color = area.color;
  const locked = st.level === 'locked';

  return (
    <div className="card card-pad sm-detail">
      <div className="row gap-2" style={{ alignItems: 'flex-start' }}>
        <span className="sm-detail__glyph" style={{ background: color }}>
          <Icon name={locked ? 'lock' : area.icon} size={22} />
        </span>
        <div className="col gap-1" style={{ minWidth: 0, flex: 1 }}>
          <span className="sm-detail__area" style={{ color }}>{area.label}</span>
          <h3 style={{ margin: 0 }}>{skill.label}</h3>
        </div>
      </div>

      <div className="row gap-2" style={{ margin: '.85rem 0 .3rem', alignItems: 'center' }}>
        <LevelBadge level={st.level} />
        {st.isNext && <Badge tone="accent">Next to unlock</Badge>}
        {st.practiced > 0 && <span className="t-xs muted">{st.practiced} rep{st.practiced === 1 ? '' : 's'} practiced</span>}
      </div>

      <div style={{ margin: '.5rem 0 .9rem' }}>
        <ProgressBar value={Math.round(st.progress * 100)} color={color} />
        <div className="t-xs muted" style={{ marginTop: 4 }}>{Math.round(st.progress * 100)}% toward mastered</div>
      </div>

      <p className="t-sm" style={{ marginTop: 0, color: 'var(--ink-2)' }}>{skill.desc}</p>

      {skill.prereqs.length > 0 && (
        <div style={{ marginTop: '.6rem' }}>
          <div className="eyebrow" style={{ marginBottom: '.45rem' }}>
            {locked ? 'Unlock by reaching proficient in' : 'Builds on'}
          </div>
          <div className="col gap-1">
            {skill.prereqs.map(pid => {
              const ps = SKILL_BY_ID.get(pid);
              const plvl = state[pid]?.level || 'locked';
              const met = plvl === 'proficient' || plvl === 'mastered';
              return (
                <button key={pid} type="button" className="sm-prereq" onClick={() => onSelect(pid)}>
                  <span className="sm-lvl-dot" style={{ background: LEVELS[plvl].color }} />
                  <span className="clip" style={{ fontWeight: 700 }}>{ps?.label || pid}</span>
                  <span className="spacer" />
                  {met
                    ? <Icon name="check" size={15} style={{ color: 'var(--ok)' }} />
                    : <span className="t-xs" style={{ color: 'var(--warn)', fontWeight: 700 }}>{LEVELS[plvl].label}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="col gap-2" style={{ marginTop: '1.1rem' }}>
        <Button variant="ai" onClick={() => onLesson(skill)}>
          <Icon name="sparkles" size={16} /> Start the lesson
        </Button>
        <div className="row gap-2">
          <Button variant="ghost" onClick={() => onNavigate(skill)} style={{ flex: 1 }}>
            <Icon name="arrowRight" size={16} /> Open {skill.rook ? 'Rook' : 'page'}
          </Button>
          <Button variant="primary" onClick={() => onPractice(skill)} style={{ flex: 1 }}>
            <Icon name="check" size={16} /> Mark practiced
          </Button>
        </div>
        {locked && (
          <div className="t-xs muted" style={{ textAlign: 'center' }}>
            Locked skills still open so you can preview them, but clear the prerequisites above to light this star up.
          </div>
        )}
      </div>
    </div>
  );
}
