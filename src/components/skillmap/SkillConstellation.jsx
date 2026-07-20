// The Skill Map board: a radial constellation / tech-tree of every Ardova
// skill. Nodes are positioned by area sector and prereq depth, linked by
// prerequisite edges, and coloured by the current user's mastery. It is fully
// keyboard reachable (each node is a focusable button) and controlled by the
// parent (selection + hover live in SkillMap.jsx).
import React, { useMemo } from 'react';
import { Icon } from '../icons.jsx';
import {
  AREAS, SKILLS, SKILL_BY_ID, AREA_BY_ID, areaColor,
  constellationLayout,
} from '../../lib/skill-graph.js';

const W = 1000;
const H = 760;

// Deterministic starfield so the backdrop is stable across renders.
function starfield(n) {
  let s = 987654321;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  return Array.from({ length: n }, (_, i) => ({
    x: rnd() * W, y: rnd() * H, r: 0.6 + rnd() * 1.6, d: (rnd() * 4).toFixed(2), i,
  }));
}

function discRadius(level) {
  return level === 'mastered' ? 18 : level === 'proficient' ? 16 : level === 'learning' ? 15 : 13;
}
function levelOpacity(level) {
  return level === 'mastered' ? 0.72 : level === 'proficient' ? 0.5 : level === 'learning' ? 0.32 : 0.16;
}

export default function SkillConstellation({ state, selectedId, hoveredId, activeArea, onSelect, onHover }) {
  const { pos, cx, cy, innerR, outerR, sector } = useMemo(() => constellationLayout(W, H), []);
  const stars = useMemo(() => starfield(64), []);
  const focusId = hoveredId || selectedId;

  // Every prereq edge, resolved to endpoint positions once.
  const links = useMemo(() => {
    const out = [];
    for (const s of SKILLS) {
      for (const p of s.prereqs) {
        if (!pos[s.id] || !pos[p]) continue;
        out.push({ from: p, to: s.id, area: s.area });
      }
    }
    return out;
  }, [pos]);

  const isDim = (areaId) => activeArea && areaId !== activeArea;

  return (
    <div className="sm-board">
      <svg className="sm-svg" viewBox={`0 0 ${W} ${H}`} role="group"
        aria-label="Ardova skill constellation. Use Tab to move between skills and Enter to open one.">
        {/* backdrop starfield */}
        <g aria-hidden="true">
          {stars.map(st => (
            <circle key={st.i} className="sm-star" cx={st.x} cy={st.y} r={st.r} style={{ animationDelay: `${st.d}s` }} />
          ))}
        </g>

        {/* concentric guide rings */}
        <g aria-hidden="true">
          <circle className="sm-ring" cx={cx} cy={cy} r={innerR} />
          <circle className="sm-ring" cx={cx} cy={cy} r={(innerR + outerR) / 2} />
          <circle className="sm-ring" cx={cx} cy={cy} r={outerR} />
        </g>

        {/* sector dividers + area labels around the rim */}
        <g aria-hidden="true">
          {AREAS.map((area, ai) => {
            const boundary = -Math.PI / 2 + (ai - 0.5) * sector;
            const bx = cx + Math.cos(boundary) * (outerR + 26);
            const by = cy + Math.sin(boundary) * (outerR + 26);
            const inX = cx + Math.cos(boundary) * (innerR - 6);
            const inY = cy + Math.sin(boundary) * (innerR - 6);
            const labelAngle = -Math.PI / 2 + ai * sector;
            const lx = cx + Math.cos(labelAngle) * (outerR + 46);
            const ly = cy + Math.sin(labelAngle) * (outerR + 46);
            const anchor = Math.abs(Math.cos(labelAngle)) < 0.25 ? 'middle' : Math.cos(labelAngle) > 0 ? 'start' : 'end';
            const dim = isDim(area.id);
            return (
              <g key={area.id} style={{ opacity: dim ? 0.3 : 1, transition: 'opacity .2s' }}>
                <line className="sm-sector" x1={inX} y1={inY} x2={bx} y2={by} />
                <text className="sm-arealabel" x={lx} y={ly} textAnchor={anchor} dominantBaseline="middle"
                  fill={area.color}>{area.label}</text>
              </g>
            );
          })}
        </g>

        {/* prereq links */}
        <g fill="none">
          {links.map((lk, i) => {
            const a = pos[lk.from];
            const b = pos[lk.to];
            const toState = state[lk.to];
            const mx = (a.x + b.x) / 2 + (cx - (a.x + b.x) / 2) * 0.12;
            const my = (a.y + b.y) / 2 + (cy - (a.y + b.y) / 2) * 0.12;
            const d = `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
            const locked = !toState.unlocked;
            const hot = focusId === lk.to || focusId === lk.from;
            const dim = isDim(lk.area) && (isDim(SKILL_BY_ID.get(lk.from)?.area));
            const cls = ['sm-link', locked ? 'sm-link--locked' : '', hot ? 'sm-link--hot' : ''].filter(Boolean).join(' ');
            return (
              <path key={i} className={cls} d={d}
                stroke={locked ? undefined : areaColor(lk.area)}
                strokeWidth={locked ? 1.4 : 2}
                strokeOpacity={hot ? 0.95 : dim ? 0.08 : locked ? 0.7 : levelOpacity(toState.level)} />
            );
          })}
        </g>

        {/* nodes */}
        <g>
          {SKILLS.map(s => {
            const p = pos[s.id];
            if (!p) return null;
            const st = state[s.id];
            const area = AREA_BY_ID.get(s.area);
            const color = area.color;
            const level = st.level;
            const selected = selectedId === s.id;
            const focused = focusId === s.id;
            const baseR = discRadius(level) + (focused ? 2 : 0);
            const filled = level === 'proficient' || level === 'mastered';
            const iconColor = level === 'locked' ? '#9aa3b2' : filled ? '#ffffff' : color;
            const dim = isDim(s.area) && !focused;
            const cls = ['sm-node', level === 'locked' ? 'sm-node--locked' : '', st.isNext ? 'sm-node--next' : ''].filter(Boolean).join(' ');
            const label = s.label.length > 16 ? s.label.slice(0, 15) + '.' : s.label;
            const showLabel = focused || selected || level === 'mastered' || level === 'proficient' || st.isNext;
            return (
              <g key={s.id} className={cls} tabIndex={0} role="button"
                aria-label={`${s.label}. ${area.label}. ${level}${st.isNext ? ', ready to level up' : ''}.`}
                aria-pressed={selected}
                style={{ opacity: dim ? 0.28 : 1, transition: 'opacity .2s' }}
                onClick={() => onSelect(s.id)}
                onMouseEnter={() => onHover(s.id)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(s.id)}
                onBlur={() => onHover(null)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(s.id); } }}>
                {/* generous invisible hit target */}
                <circle className="sm-node__hit" cx={p.x} cy={p.y} r={baseR + 12} />

                {/* pulse ring for "next to unlock" */}
                {st.isNext && (
                  <circle className="sm-pulse" cx={p.x} cy={p.y} r={baseR + 2} fill="none" stroke={color} strokeWidth={2} />
                )}

                {/* mastered glow halo */}
                {level === 'mastered' && (
                  <circle className="sm-node__glow" cx={p.x} cy={p.y} r={baseR + 8} fill={color} opacity={0.16} />
                )}

                {/* selection ring */}
                {(selected || focused) && (
                  <circle className="sm-node__ring" cx={p.x} cy={p.y} r={baseR + 5} fill="none"
                    stroke={color} strokeWidth={2} strokeOpacity={selected ? 0.9 : 0.5} />
                )}

                {/* the disc */}
                <circle className="sm-node__disc" cx={p.x} cy={p.y} r={baseR}
                  fill={filled ? color : 'var(--paper)'}
                  stroke={level === 'locked' ? '#9aa3b2' : color}
                  strokeWidth={filled ? 1.5 : 2.5}
                  strokeDasharray={level === 'locked' ? '3 3' : undefined} />

                {/* area glyph inside the disc */}
                <g transform={`translate(${p.x - 8} ${p.y - 8})`} style={{ color: iconColor }} aria-hidden="true">
                  <Icon name={level === 'locked' ? 'lock' : area.icon} size={16} stroke={2} />
                </g>

                {/* mastered crown mark */}
                {level === 'mastered' && (
                  <g transform={`translate(${p.x + baseR - 6} ${p.y - baseR - 4})`} style={{ color }} aria-hidden="true">
                    <Icon name="star" size={13} fill="currentColor" stroke={1.2} />
                  </g>
                )}

                {/* label */}
                {showLabel && (
                  <text className={`sm-node__label${level === 'locked' ? ' sm-node__label--muted' : ''}`}
                    x={p.x} y={p.y + baseR + 13} textAnchor="middle">{label}</text>
                )}
              </g>
            );
          })}
        </g>

        {/* centre badge */}
        <g aria-hidden="true">
          <circle cx={cx} cy={cy} r={innerR - 14} fill="var(--paper)" stroke="var(--line)" />
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize="15" fontWeight="800" fill="var(--ink)">Ardova</text>
          <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="var(--n-600)" letterSpacing="1">MASTERY</text>
        </g>
      </svg>
    </div>
  );
}
