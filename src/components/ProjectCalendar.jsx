// Rally Projects - CALENDAR view. A month grid (weeks x 7 days) with prev/next
// month controls, each task a colored chip on its due date (status color),
// stacked with "+N more" on overflow, today's cell highlighted, chips animate
// in, and clicking a chip opens the shared edit modal (onOpen).
// NO em-dash or en-dash - ASCII hyphen only.
import React, { useMemo, useState } from 'react';
import { Modal } from './UI.jsx';
import { Icon } from './icons.jsx';

const STATUS_COLOR = { todo: '#98a1b0', doing: '#2563a8', blocked: '#c0392b', done: '#1a7f52' };
const STATUS_LABEL = { todo: 'To do', doing: 'Doing', blocked: 'Blocked', done: 'Done' };
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_CHIPS = 3;

const dayKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`; };
const sameDay = (a, b) => dayKey(a) === dayKey(b);

function Chip({ task, onClick }) {
  const color = STATUS_COLOR[task.status] || '#98a1b0';
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick(task); }}
      title={`${task.title} - ${STATUS_LABEL[task.status]}`}
      style={{
        display: 'flex', alignItems: 'center', gap: '.3rem', width: '100%', textAlign: 'left',
        border: 'none', cursor: 'pointer', borderRadius: 5, padding: '.16rem .34rem',
        background: color + '1f', color: 'var(--ink)', borderLeft: `3px solid ${color}`,
        fontSize: '.72rem', fontWeight: 600, lineHeight: 1.25, overflow: 'hidden',
        transition: 'transform .12s var(--ease), background .15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateX(1px)'; e.currentTarget.style.background = color + '33'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.background = color + '1f'; }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{task.title}</span>
    </button>
  );
}

export default function ProjectCalendar({ tasks, onOpen }) {
  const today = new Date();
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [dir, setDir] = useState(0);
  const [dayModal, setDayModal] = useState(null);   // { date, tasks } or null

  const go = (delta) => { setDir(delta); setCursor(c => new Date(c.getFullYear(), c.getMonth() + delta, 1)); };
  const goToday = () => { setDir(0); setCursor(new Date(today.getFullYear(), today.getMonth(), 1)); };

  // 6-week grid starting on the Monday on/before the 1st of the month.
  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const off = (first.getDay() + 6) % 7;
    const gridStart = new Date(first); gridStart.setDate(first.getDate() - off);
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(gridStart); d.setDate(gridStart.getDate() + i); return d; });
  }, [cursor]);

  // Bucket tasks by their due day.
  const byDay = useMemo(() => {
    const m = {};
    for (const t of tasks) { if (!t.due) continue; const k = dayKey(new Date(t.due)); (m[k] = m[k] || []).push(t); }
    for (const k in m) m[k].sort((a, b) => (STATUS_LABEL[a.status] || '').localeCompare(STATUS_LABEL[b.status] || ''));
    return m;
  }, [tasks]);

  const monthKey = `${cursor.getFullYear()}-${cursor.getMonth()}`;
  const monthLabel = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div>
      <style>{`
        @keyframes calMonthIn { from { opacity: 0; transform: translateX(var(--cal-dx,0)); } to { opacity: 1; transform: none; } }
        @keyframes calChipIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
        .cal-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; }
        .cal-cell { min-height: 118px; }
        .cal-chip { animation: calChipIn .35s var(--ease) both; }
        @media (max-width: 640px) { .cal-cell { min-height: 74px; } }
      `}</style>

      {/* CONTROLS */}
      <div className="row between" style={{ marginBottom: '.9rem', flexWrap: 'wrap', gap: '.6rem' }}>
        <div className="row gap-1">
          <button onClick={() => go(-1)} aria-label="Previous month" className="btn btn-ghost btn-sm" style={{ padding: '.4rem .55rem' }}><Icon name="chevronRight" size={16} style={{ transform: 'rotate(180deg)' }} /></button>
          <button onClick={() => go(1)} aria-label="Next month" className="btn btn-ghost btn-sm" style={{ padding: '.4rem .55rem' }}><Icon name="chevronRight" size={16} /></button>
          <h4 style={{ margin: '0 .3rem', minWidth: 168 }}>{monthLabel}</h4>
        </div>
        <button onClick={goToday} className="btn btn-quiet btn-sm">Today</button>
      </div>

      {/* WEEKDAY HEADINGS */}
      <div className="cal-grid" style={{ marginBottom: 6 }}>
        {WEEKDAYS.map(d => (
          <div key={d} className="t-xs fw-7" style={{ textAlign: 'center', color: 'var(--n-600)', letterSpacing: '.05em', textTransform: 'uppercase', padding: '.2rem 0' }}>
            <span className="desktop-only">{d}</span><span className="mobile-only" style={{ display: 'none' }}>{d[0]}</span>
          </div>
        ))}
      </div>

      {/* MONTH GRID (re-animates on month change) */}
      <div key={monthKey} className="cal-grid" style={{ '--cal-dx': dir > 0 ? '22px' : dir < 0 ? '-22px' : '0px', animation: 'calMonthIn .34s var(--ease) both' }}>
        {cells.map((d, i) => {
          const inMonth = d.getMonth() === cursor.getMonth();
          const isToday = sameDay(d, today);
          const list = byDay[dayKey(d)] || [];
          const shown = list.slice(0, MAX_CHIPS);
          const extra = list.length - shown.length;
          return (
            <div key={i} className="cal-cell card" style={{
              padding: '.4rem .4rem .45rem', display: 'flex', flexDirection: 'column', gap: 3,
              borderRadius: 'var(--r-md)', overflow: 'hidden',
              background: isToday ? 'var(--accent-50)' : inMonth ? 'var(--paper)' : 'var(--n-25)',
              border: isToday ? '1.5px solid var(--accent)' : '1px solid var(--line)',
              opacity: inMonth ? 1 : .62, boxShadow: isToday ? 'var(--accent-glow)' : 'var(--shadow-sm)',
            }}>
              <div className="row between" style={{ alignItems: 'center' }}>
                <span className="tnum" style={{
                  fontSize: '.78rem', fontWeight: isToday ? 800 : 600,
                  color: isToday ? 'var(--accent-600)' : inMonth ? 'var(--ink-2)' : 'var(--n-400)',
                  ...(isToday ? { background: 'var(--accent)', color: '#fff', borderRadius: 999, width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } : {}),
                }}>{d.getDate()}</span>
              </div>
              <div className="col" style={{ gap: 3, minWidth: 0 }}>
                {shown.map((t, ci) => (
                  <div key={t.id} className="cal-chip" style={{ animationDelay: `${.04 * ci}s`, minWidth: 0 }}>
                    <Chip task={t} onClick={onOpen} />
                  </div>
                ))}
                {extra > 0 && (
                  <button onClick={() => setDayModal({ date: d, tasks: list })}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontSize: '.7rem', fontWeight: 700, color: 'var(--accent-600)', padding: '.05rem .34rem' }}>
                    +{extra} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* DAY OVERFLOW MODAL */}
      <Modal open={!!dayModal} onClose={() => setDayModal(null)} width={420}
        title={dayModal ? dayModal.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : ''}>
        {dayModal && (
          <div className="col gap-1">
            {dayModal.tasks.map(t => (
              <Chip key={t.id} task={t} onClick={(task) => { setDayModal(null); onOpen(task); }} />
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
