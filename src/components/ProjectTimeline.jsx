// Rally Projects - TIMELINE (Gantt) view. A horizontal date axis in weeks,
// rows grouped by group (or project on All work), each task a rounded bar
// positioned by startDate..due with a progress overlay, status color, a
// glowing "today" line, spring/stagger grow-in, and a hover tooltip.
// Horizontal scroll on overflow. NO em-dash or en-dash - ASCII hyphen only.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getProjectGroups } from '../lib/store-depth.js';
import { userName } from '../lib/store.js';
import { Avatar, ProgressBar, monthDay } from './UI.jsx';
import { Icon } from './icons.jsx';

const DAY = 86400000;
const STATUS_COLOR = { todo: '#98a1b0', doing: '#2563a8', blocked: '#c0392b', done: '#1a7f52' };
const STATUS_LABEL = { todo: 'To do', doing: 'Doing', blocked: 'Blocked', done: 'Done' };

/* hex -> rgba so we can tint one status color at several opacities */
function hexA(hex, a) {
  const h = (hex || '#888').replace('#', '');
  const n = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const startOfWeek = (d) => { const x = startOfDay(d); const off = (x.getDay() + 6) % 7; x.setDate(x.getDate() - off); return x; };
const fmtMD = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/* Rows: grouped by group (single project) or by project (All work). */
function buildRows(tasks, project) {
  if (project) {
    const groups = getProjectGroups(project.id);
    const list = groups.length ? groups : [{ id: '__none', name: 'Tasks', color: '#98a1b0' }];
    const map = list.map(g => ({ group: g, tasks: [] }));
    const first = map[0];
    for (const t of tasks) (map.find(r => r.group.id === t.groupId) || first).tasks.push(t);
    return map.filter(r => r.tasks.length);
  }
  const byProj = {};
  for (const t of tasks) (byProj[t.projectId] = byProj[t.projectId] || { group: { id: t.projectId, name: t.projectName, color: t.projectColor }, tasks: [] }).tasks.push(t);
  return Object.values(byProj);
}

/* Effective span for a task: use startDate..due, default a missing start to
   due minus 4 days, and guarantee start < due. */
function span(t) {
  const due = t.due ? new Date(t.due) : new Date(Date.now() + 7 * DAY);
  let start = t.startDate ? new Date(t.startDate) : new Date(due.getTime() - 4 * DAY);
  if (start >= due) start = new Date(due.getTime() - DAY);
  return { start, due };
}

const LABEL_W = 190;
const WEEK_W = 58;
const DAY_W = WEEK_W / 7;
const AXIS_H = 46;
const GROUP_H = 36;
const ROW_H = 46;
const BAR_H = 26;

export default function ProjectTimeline({ tasks, project, onOpen }) {
  const [grown, setGrown] = useState(false);
  const [hover, setHover] = useState(null);   // { task, x, y }
  useEffect(() => { const id = requestAnimationFrame(() => setGrown(true)); return () => cancelAnimationFrame(id); }, []);

  const rows = useMemo(() => buildRows(tasks, project), [tasks, project]);

  const domain = useMemo(() => {
    if (!tasks.length) return null;
    let min = Infinity, max = -Infinity;
    for (const t of tasks) { const { start, due } = span(t); min = Math.min(min, +start); max = Math.max(max, +due); }
    const today = Date.now();
    min = Math.min(min, today); max = Math.max(max, today);
    const startWk = startOfWeek(new Date(min));
    let end = startOfWeek(new Date(max)); end.setDate(end.getDate() + 7);
    let weeks = Math.round((end - startWk) / (7 * DAY));
    if (weeks < 6) { weeks = 6; end = new Date(+startWk + weeks * 7 * DAY); }
    return { start: startWk, weeks, totalW: weeks * WEEK_W };
  }, [tasks]);

  if (!tasks.length || !domain) {
    return (
      <div className="col center gap-1" style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--n-600)', border: '1.5px dashed var(--line-strong)', borderRadius: 'var(--r-md)' }}>
        <Icon name="calendar" size={26} />
        <span className="t-sm">No scheduled work to plot on the timeline yet.</span>
      </div>
    );
  }

  const { start, weeks, totalW } = domain;
  const x = (d) => ((+startOfDay(d) - +start) / DAY) * DAY_W;
  const todayX = x(new Date());
  const grid = `repeating-linear-gradient(90deg, transparent 0, transparent ${WEEK_W - 1}px, var(--line) ${WEEK_W - 1}px, var(--line) ${WEEK_W}px)`;

  const weekTicks = Array.from({ length: weeks }, (_, i) => new Date(+start + i * 7 * DAY));

  return (
    <div style={{ overflowX: 'auto', overflowY: 'hidden', paddingBottom: '.75rem', borderRadius: 'var(--r-md)' }}>
      <style>{`
        @keyframes gtGlow { 0%,100% { box-shadow: 0 0 0 1px var(--risk), 0 0 10px 1px ${hexA('#c0392b', .5)}; } 50% { box-shadow: 0 0 0 1px var(--risk), 0 0 18px 3px ${hexA('#c0392b', .8)}; } }
      `}</style>

      <div style={{ position: 'relative', minWidth: LABEL_W + totalW, width: LABEL_W + totalW }}>

        {/* AXIS */}
        <div className="row" style={{ height: AXIS_H, position: 'sticky', top: 0, zIndex: 5 }}>
          <div style={{ width: LABEL_W, flex: 'none', position: 'sticky', left: 0, zIndex: 6, background: 'var(--paper)', borderBottom: '1px solid var(--line)', borderRight: '1px solid var(--line)', display: 'flex', alignItems: 'flex-end', padding: '0 .75rem .4rem' }}>
            <span className="t-xs fw-7" style={{ letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--n-600)' }}>Timeline</span>
          </div>
          <div style={{ width: totalW, flex: 'none', position: 'relative', background: 'var(--n-25)', borderBottom: '1px solid var(--line)' }}>
            {weekTicks.map((wd, i) => {
              const showMonth = i === 0 || wd.getMonth() !== weekTicks[i - 1].getMonth();
              return (
                <div key={i} style={{ position: 'absolute', left: i * WEEK_W, top: 0, height: AXIS_H, width: WEEK_W, borderLeft: '1px solid var(--line)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 0 .35rem .35rem' }}>
                  {showMonth && <span className="t-xs fw-7" style={{ color: 'var(--ink-2)', lineHeight: 1.1 }}>{wd.toLocaleDateString('en-US', { month: 'short' })}</span>}
                  <span className="tnum" style={{ fontSize: '.72rem', color: 'var(--n-600)', lineHeight: 1.1 }}>{wd.getDate()}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* TODAY LINE (glowing) - spans the plotted area below the axis */}
        {todayX >= 0 && todayX <= totalW && (
          <div style={{ position: 'absolute', left: LABEL_W + todayX, top: AXIS_H, bottom: 0, width: 2, zIndex: 4, background: 'linear-gradient(var(--risk), ' + hexA('#c0392b', .35) + ')', animation: 'gtGlow 2.4s ease-in-out infinite', pointerEvents: 'none' }}>
            <span style={{ position: 'absolute', top: -2, left: -4, background: 'var(--risk)', color: '#fff', fontSize: '.62rem', fontWeight: 800, letterSpacing: '.04em', padding: '.06rem .3rem', borderRadius: 4, whiteSpace: 'nowrap' }}>TODAY</span>
          </div>
        )}

        {/* GROUPS + ROWS */}
        {rows.map(({ group, tasks: gt }) => (
          <div key={group.id}>
            {/* group header */}
            <div className="row" style={{ height: GROUP_H }}>
              <div style={{ width: LABEL_W, flex: 'none', position: 'sticky', left: 0, zIndex: 3, background: 'var(--paper)', borderRight: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: '.45rem', padding: '0 .75rem', borderLeft: `4px solid ${group.color}` }}>
                <span className="fw-7 clip" style={{ fontSize: '.9rem' }}>{group.name}</span>
                <span className="t-xs" style={{ color: 'var(--n-600)' }}>{gt.length}</span>
              </div>
              <div style={{ width: totalW, flex: 'none', background: hexA(group.color, .05), backgroundImage: grid }} />
            </div>

            {/* task rows */}
            {gt.map((t, ri) => {
              const { start: s, due } = span(t);
              const left = Math.max(0, x(s));
              const right = x(due);
              const w = Math.max(14, right - left);
              const color = STATUS_COLOR[t.status] || '#98a1b0';
              const wide = w >= 66;
              const prog = Math.max(0, Math.min(100, t.progress || 0));
              const hovered = hover && hover.task.id === t.id;
              const barTop = (ROW_H - BAR_H) / 2;
              return (
                <div key={t.id} className="row" style={{ height: ROW_H, borderBottom: '1px solid var(--n-50)' }}>
                  {/* sticky label */}
                  <div style={{ width: LABEL_W, flex: 'none', position: 'sticky', left: 0, zIndex: 3, background: 'var(--paper)', borderRight: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: '.5rem', padding: '0 .75rem', cursor: 'pointer' }}
                    onClick={() => onOpen && onOpen(t)}>
                    <Avatar name={userName(t.assigneeId)} size={22} />
                    <span className="clip" style={{ fontSize: '.88rem', fontWeight: 600, color: 'var(--ink)' }}>{t.title}</span>
                  </div>
                  {/* track */}
                  <div style={{ width: totalW, flex: 'none', position: 'relative', backgroundImage: grid }}>
                    <div
                      onClick={() => onOpen && onOpen(t)}
                      onMouseEnter={(e) => setHover({ task: t, x: e.clientX, y: e.clientY })}
                      onMouseMove={(e) => setHover({ task: t, x: e.clientX, y: e.clientY })}
                      onMouseLeave={() => setHover(h => (h && h.task.id === t.id ? null : h))}
                      style={{
                        position: 'absolute', left, top: barTop, height: BAR_H, width: w,
                        borderRadius: 999, cursor: 'pointer',
                        background: hexA(color, .18), border: `1px solid ${hexA(color, .55)}`,
                        overflow: 'hidden', transformOrigin: 'left center',
                        transform: grown ? (hovered ? 'scaleX(1) translateY(-2px)' : 'scaleX(1)') : 'scaleX(0)',
                        boxShadow: hovered ? `0 10px 22px -8px ${hexA(color, .7)}` : 'none',
                        zIndex: hovered ? 3 : 1,
                        transition: `transform .6s var(--ease) ${Math.min(ri * 0.05, 0.5)}s, box-shadow .18s var(--ease)`,
                      }}>
                      {/* progress overlay */}
                      <div style={{ position: 'absolute', inset: 0, width: prog + '%', background: hexA(color, .85), borderRadius: 999 }} />
                      {wide && (
                        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: '.3rem', padding: '0 .55rem', zIndex: 2 }}>
                          <span className="clip" style={{ fontSize: '.76rem', fontWeight: 700, color: prog > 55 ? '#fff' : 'var(--ink)' }}>{t.title}</span>
                        </span>
                      )}
                    </div>
                    {!wide && (
                      <span style={{ position: 'absolute', left: left + w + 8, top: barTop, height: BAR_H, display: 'flex', alignItems: 'center', fontSize: '.74rem', fontWeight: 600, color: 'var(--ink-2)', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
                        {t.title}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* HOVER TOOLTIP - fixed to the cursor so it never clips inside the scroller */}
      {hover && (
        <div style={{ position: 'fixed', left: Math.min(hover.x + 16, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 250), top: hover.y + 18, zIndex: 90, width: 232, pointerEvents: 'none', background: 'var(--paper)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-lg)', padding: '.7rem .8rem' }}>
          <div className="row gap-1" style={{ marginBottom: '.4rem' }}>
            <span className="dot" style={{ background: STATUS_COLOR[hover.task.status], width: 9, height: 9 }} />
            <span className="fw-7 clip" style={{ fontSize: '.9rem' }}>{hover.task.title}</span>
          </div>
          <div className="t-xs" style={{ color: 'var(--n-600)', marginBottom: '.5rem' }}>
            {(() => { const { start: s, due } = span(hover.task); return `${fmtMD(s)} - ${fmtMD(due)}`; })()}
            <span style={{ marginLeft: 6, color: 'var(--ink-2)' }}>{STATUS_LABEL[hover.task.status]}</span>
          </div>
          <div className="row gap-1" style={{ marginBottom: '.4rem' }}>
            <Avatar name={userName(hover.task.assigneeId)} size={20} />
            <span className="t-xs clip" style={{ color: 'var(--ink-2)' }}>{userName(hover.task.assigneeId)}</span>
          </div>
          <div className="row gap-1" style={{ alignItems: 'center' }}>
            <span style={{ flex: 1 }}><ProgressBar value={hover.task.progress || 0} color={STATUS_COLOR[hover.task.status]} height={6} /></span>
            <span className="t-xs tnum" style={{ color: 'var(--n-600)' }}>{hover.task.progress || 0}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
