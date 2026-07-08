// In-CRM team Projects board. Monday-style: colorful columns, satisfying
// native HTML5 drag between statuses, playful stagger + hover lift. Dark-nav +
// light content, ONE accent var(--accent). Columns scroll horizontally on
// mobile. No em-dash or en-dash anywhere - ASCII hyphen only.
import React, { useMemo, useState } from 'react';
import {
  getProjects, getProject, getAllTasks, createProject,
  addTask, updateTask, moveTask, deleteTask, useDepth,
} from '../lib/store-depth.js';
import { getUsers, userName, useStore } from '../lib/store.js';
import {
  Button, Badge, Avatar, SectionHeader, Field, Input, Select,
  Modal, EmptyState, ProgressBar, Segmented, StatCard, useToast, relTime,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';

/* ---------- status + priority config ---------- */
const COLUMNS = [
  { id: 'todo', label: 'To do', color: '#98a1b0' },
  { id: 'doing', label: 'Doing', color: '#2563a8' },
  { id: 'blocked', label: 'Blocked', color: '#c0392b' },
  { id: 'done', label: 'Done', color: '#1a7f52' },
];
const SWATCHES = ['#5b4bf5', '#0ea5a3', '#2563a8', '#b3721a', '#8b3fd4', '#c0392b'];
const PRIORITY_COLOR = { high: 'var(--risk)', medium: 'var(--warn)', low: 'var(--n-400)' };
const PRIORITY_OPTS = [{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }];
const STATUS_OPTS = COLUMNS.map(c => ({ value: c.id, label: c.label }));

const isOverdue = (t) => t.due && t.status !== 'done' && new Date(t.due).getTime() < Date.now();
const dateInputValue = (iso) => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? '' : d.toISOString().slice(0, 10); };

/* ============================================================
   TASK CARD
   ============================================================ */
function TaskCard({ task, showProject, onDragStart, onDragEnd, onClick, onQuickDone }) {
  const [drag, setDrag] = useState(false);
  const overdue = isOverdue(task);
  const done = task.status === 'done';
  return (
    <div draggable
      onDragStart={(e) => { setDrag(true); onDragStart && onDragStart(e); }}
      onDragEnd={() => { setDrag(false); onDragEnd && onDragEnd(); }}
      onClick={onClick}
      className="card kb-card"
      style={{
        padding: '.7rem .75rem', cursor: drag ? 'grabbing' : 'grab', borderRadius: 'var(--r-md)',
        transform: drag ? 'rotate(2.5deg) scale(1.04)' : 'none',
        boxShadow: drag ? '0 18px 40px -12px rgba(20,20,50,.4)' : undefined,
        opacity: drag ? 0.92 : 1,
        transition: 'transform .16s var(--ease), box-shadow .16s var(--ease)',
      }}>
      <div className="row gap-1" style={{ alignItems: 'flex-start' }}>
        <button
          onClick={(e) => { e.stopPropagation(); onQuickDone(); }}
          aria-label={done ? 'Mark not done' : 'Mark done'}
          style={{
            flex: 'none', width: 20, height: 20, marginTop: 1, borderRadius: 6, cursor: 'pointer',
            border: '1.75px solid ' + (done ? 'var(--ok)' : 'var(--line-strong)'),
            background: done ? 'var(--ok)' : 'transparent', color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background .15s var(--ease), border-color .15s var(--ease)',
          }}>
          {done && <Icon name="check" size={13} stroke={3} />}
        </button>
        <span className="fw-6" style={{
          minWidth: 0, fontSize: '.95rem', lineHeight: 1.3, wordBreak: 'break-word',
          textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--n-600)' : 'var(--ink)',
        }}>{task.title}</span>
      </div>

      {showProject && task.projectName && (
        <div style={{ marginTop: '.5rem' }}>
          <span className="badge t-xs" style={{ maxWidth: '100%' }}>
            <span className="dot" style={{ background: task.projectColor }} />
            <span className="clip" style={{ maxWidth: 150 }}>{task.projectName}</span>
          </span>
        </div>
      )}

      <div className="row between wrap gap-1" style={{ marginTop: '.6rem' }}>
        <span className="row gap-1" style={{ minWidth: 0 }}>
          <Avatar name={userName(task.assigneeId)} size={22} />
          <span className="t-xs" style={{ color: overdue ? 'var(--risk)' : 'var(--n-600)', fontWeight: overdue ? 700 : 500 }}>
            <Icon name="calendar" size={11} style={{ verticalAlign: '-1px', marginRight: 2 }} />
            {relTime(task.due)}
          </span>
        </span>
        <span className="dot" title={task.priority} style={{ background: PRIORITY_COLOR[task.priority] || 'var(--n-400)', width: 10, height: 10 }} />
      </div>
    </div>
  );
}

/* ============================================================
   COLUMN (drop target)
   ============================================================ */
function Column({ col, tasks, showProject, dragId, isOver, onSetOver, onLeave, onDrop, onDragStart, onDragEnd, onOpen, onQuickDone, onAdd, canAdd }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const submit = () => {
    const v = title.trim();
    if (!v) { setAdding(false); return; }
    onAdd(col.id, v);
    setTitle('');
  };
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); onSetOver(col.id); }}
      onDragLeave={() => onLeave(col.id)}
      onDrop={() => onDrop(col.id)}
      style={{
        width: 288, flex: 'none', display: 'flex', flexDirection: 'column', maxHeight: '74vh',
        background: isOver ? 'var(--accent-50)' : 'var(--n-50)', borderRadius: 'var(--r-md)',
        border: '1px solid ' + (isOver ? 'var(--accent-300)' : 'var(--line)'),
        boxShadow: isOver ? '0 0 0 3px var(--accent-50), var(--accent-glow)' : 'none',
        transform: isOver ? 'translateY(-2px) scale(1.012)' : 'none',
        transition: 'transform .18s var(--ease), box-shadow .18s var(--ease), background .18s, border-color .18s',
      }}>
      {/* colored header pill */}
      <div style={{ padding: '.65rem .65rem .5rem' }}>
        <span className="row gap-1" style={{
          background: col.color, color: '#fff', borderRadius: 'var(--r-pill)',
          padding: '.28rem .7rem', fontWeight: 700, fontSize: '.82rem', letterSpacing: '.02em',
          boxShadow: '0 2px 8px -2px ' + col.color,
        }}>
          <span className="clip" style={{ minWidth: 0 }}>{col.label}</span>
          <span style={{
            marginLeft: 4, background: 'rgba(255,255,255,.25)', borderRadius: 999,
            padding: '.02rem .45rem', fontSize: '.74rem', fontWeight: 700,
          }}>{tasks.length}</span>
        </span>
      </div>

      {/* cards */}
      <div className="col gap-1 stagger" style={{ padding: '0 .55rem .3rem', overflowY: 'auto', minHeight: 8 }}>
        {tasks.map(t => (
          <TaskCard key={t.id} task={t} showProject={showProject}
            onDragStart={() => onDragStart(t.id)} onDragEnd={onDragEnd}
            onClick={() => onOpen(t)} onQuickDone={() => onQuickDone(t)} />
        ))}
        {tasks.length === 0 && !adding && (
          <div className="t-xs muted" style={{ padding: '.9rem .3rem', textAlign: 'center', border: '1.5px dashed var(--line-strong)', borderRadius: 'var(--r-sm)' }}>
            {dragId ? 'Drop here' : 'Nothing here yet'}
          </div>
        )}
      </div>

      {/* add task */}
      <div style={{ padding: '.4rem .55rem .6rem' }}>
        {adding ? (
          <div className="col gap-1">
            <Input autoFocus value={title} placeholder="Task title"
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setAdding(false); setTitle(''); } }}
              style={{ padding: '.5rem .65rem', fontSize: '.92rem' }} />
            <div className="row gap-1">
              <Button size="sm" onClick={submit}>Add</Button>
              <Button size="sm" variant="quiet" onClick={() => { setAdding(false); setTitle(''); }}>Cancel</Button>
            </div>
          </div>
        ) : (
          <button onClick={() => canAdd ? setAdding(true) : onAdd(col.id, null)}
            className="row gap-1"
            style={{
              width: '100%', justifyContent: 'flex-start', border: 'none', background: 'transparent',
              cursor: 'pointer', color: 'var(--n-600)', fontWeight: 600, fontSize: '.88rem',
              padding: '.45rem .5rem', borderRadius: 'var(--r-sm)', transition: 'background .15s, color .15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--n-100)'; e.currentTarget.style.color = 'var(--ink)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--n-600)'; }}>
            <Icon name="plus" size={15} /> Add task
          </button>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   PAGE
   ============================================================ */
export default function Projects() {
  useStore();                         // subscribe to user/store changes
  const depth = useDepth();           // re-render on any depth mutation
  const toast = useToast();
  const users = getUsers();

  const projects = getProjects();
  const [activeId, setActiveId] = useState('all');   // 'all' or a project id
  const active = activeId === 'all' ? null : getProject(activeId);

  // Tasks for the active board (all work, or one project's tasks enriched
  // with project meta so the card chip + moveTask still work uniformly).
  const tasks = useMemo(() => {
    if (activeId === 'all') return getAllTasks();
    const p = getProject(activeId);
    if (!p) return [];
    return p.tasks.map(t => ({ ...t, projectId: p.id, projectName: p.name, projectColor: p.color }));
  }, [activeId, depth]);

  const byStatus = useMemo(() => {
    const m = { todo: [], doing: [], blocked: [], done: [] };
    for (const t of tasks) (m[t.status] || (m[t.status] = [])).push(t);
    return m;
  }, [tasks]);

  // KPIs over the active board
  const total = tasks.length;
  const doneCount = byStatus.done.length;
  const donePct = total ? Math.round((doneCount / total) * 100) : 0;
  const overdue = tasks.filter(isOverdue).length;
  const blocked = byStatus.blocked.length;

  /* ---------- drag state ---------- */
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);
  const handleDrop = (status) => {
    if (dragId) {
      moveTask(dragId, status);
    }
    setDragId(null);
    setOverCol(null);
  };

  /* ---------- new project modal ---------- */
  const [showNew, setShowNew] = useState(false);
  const [npName, setNpName] = useState('');
  const [npColor, setNpColor] = useState(SWATCHES[0]);
  const [npOwner, setNpOwner] = useState(users[0]?.id || '');
  const createNew = () => {
    const res = createProject({ name: npName, color: npColor, ownerId: npOwner });
    if (res.error) { toast(res.message || 'Could not create project.', 'risk'); return; }
    toast('Project created');
    setShowNew(false);
    setNpName(''); setNpColor(SWATCHES[0]); setNpOwner(users[0]?.id || '');
    if (res.project) setActiveId(res.project.id);
  };

  /* ---------- add task ---------- */
  const addTaskTo = (status, title) => {
    // Which project receives it: the active one, else the first project.
    const targetProject = active || projects[0];
    if (!targetProject) { toast('Create a project first', 'warn'); return; }
    if (title == null) {           // canAdd was false (All work with no project selected quick path)
      setActiveId(targetProject.id);
      toast(`Adding to ${targetProject.name}`, 'warn');
      return;
    }
    const res = addTask(targetProject.id, { title, status, priority: 'medium', assigneeId: users[0]?.id });
    if (res.error) { toast(res.message || 'Could not add task.', 'risk'); return; }
    if (activeId === 'all') toast(`Added to ${targetProject.name}`);
  };

  /* ---------- edit task modal ---------- */
  const [editing, setEditing] = useState(null);   // full task object or null
  const [ef, setEf] = useState({ title: '', assigneeId: '', status: 'todo', priority: 'medium', due: '' });
  const openEdit = (t) => {
    setEditing(t);
    setEf({ title: t.title, assigneeId: t.assigneeId, status: t.status, priority: t.priority, due: dateInputValue(t.due) });
  };
  const saveEdit = () => {
    if (!ef.title.trim()) { toast('Task title is required', 'risk'); return; }
    updateTask(editing.id, {
      title: ef.title.trim(), assigneeId: ef.assigneeId, status: ef.status, priority: ef.priority,
      due: ef.due ? new Date(ef.due).toISOString() : editing.due,
    });
    toast('Task updated');
    setEditing(null);
  };
  const removeEdit = () => {
    deleteTask(editing.id);
    toast('Task deleted', 'warn');
    setEditing(null);
  };
  const quickDone = (t) => { moveTask(t.id, t.status === 'done' ? 'todo' : 'done'); };

  const canAddInline = activeId !== 'all' || projects.length > 0;

  return (
    <div className="page-in">
      <SectionHeader
        title="Projects"
        sub="Team work, one board. Simple by design."
        action={<Button onClick={() => setShowNew(true)}><Icon name="plus" size={16} /> New project</Button>}
      />

      {projects.length === 0 ? (
        <EmptyState
          icon="🗂️"
          title="No projects yet"
          body="Spin up a team board to track onboarding, launches, and goals right inside the CRM."
          action={<Button onClick={() => setShowNew(true)}><Icon name="plus" size={16} /> New project</Button>}
        />
      ) : (
        <>
          {/* PROJECT SWITCHER */}
          <div className="row gap-1" style={{ overflowX: 'auto', paddingBottom: '.6rem', marginBottom: '.4rem' }}>
            <ProjectChip label="All work" active={activeId === 'all'} onClick={() => setActiveId('all')} icon={<Icon name="grid" size={14} />} />
            {projects.map(p => (
              <ProjectChip key={p.id} label={p.name} dot={p.color} active={activeId === p.id} onClick={() => setActiveId(p.id)} />
            ))}
          </div>

          {/* KPI STRIP */}
          <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '1.25rem' }}>
            <StatCard label="Total tasks" value={total} icon={<Icon name="list" size={18} />} sub={active ? active.name : 'Across all projects'} />
            <StatCard label="Done" value={doneCount} accent="#1a7f52" icon={<Icon name="check" size={18} />}
              sub={<span className="col gap-1" style={{ width: '100%' }}>
                <span>{donePct}% complete</span>
                <ProgressBar value={donePct} color="#1a7f52" height={6} />
              </span>} />
            <StatCard label="Overdue" value={overdue} accent="var(--risk)" icon={<Icon name="clock" size={18} />}
              sub={overdue ? 'Past due, not done' : 'All on track'} />
            <StatCard label="Blocked" value={blocked} accent="#c0392b" icon={<Icon name="workflow" size={18} />}
              sub={blocked ? 'Needs attention' : 'Nothing blocked'} />
          </div>

          {/* THE BOARD */}
          <div className="row" style={{ gap: '.85rem', overflowX: 'auto', alignItems: 'flex-start', paddingBottom: '.75rem' }}>
            {COLUMNS.map(col => (
              <Column key={col.id} col={col} tasks={byStatus[col.id] || []} showProject={activeId === 'all'}
                dragId={dragId} isOver={overCol === col.id}
                onSetOver={setOverCol} onLeave={(id) => setOverCol(s => s === id ? null : s)}
                onDrop={handleDrop} onDragStart={setDragId} onDragEnd={() => { setDragId(null); setOverCol(null); }}
                onOpen={openEdit} onQuickDone={quickDone} onAdd={addTaskTo} canAdd={canAddInline} />
            ))}
          </div>
        </>
      )}

      {/* NEW PROJECT MODAL */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="New project" width={520}
        footer={<>
          <Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
          <Button onClick={createNew}>Create project</Button>
        </>}>
        <div className="col gap-3">
          <Field label="Project name">
            <Input autoFocus value={npName} placeholder="e.g. Q3 revenue team goals"
              onChange={(e) => setNpName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') createNew(); }} />
          </Field>
          <Field label="Color">
            <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
              {SWATCHES.map(c => {
                const on = c === npColor;
                return (
                  <button key={c} onClick={() => setNpColor(c)} aria-label={`Color ${c}`}
                    style={{
                      width: 34, height: 34, borderRadius: '50%', background: c, cursor: 'pointer',
                      border: on ? '3px solid var(--paper)' : '3px solid transparent',
                      boxShadow: on ? `0 0 0 2px ${c}, 0 2px 8px -2px ${c}` : '0 1px 3px rgba(0,0,0,.15)',
                      transform: on ? 'scale(1.12)' : 'none', transition: 'transform .15s var(--ease)',
                    }} />
                );
              })}
            </div>
          </Field>
          <Field label="Owner">
            <Select value={npOwner} onChange={(e) => setNpOwner(e.target.value)}>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </Field>
        </div>
      </Modal>

      {/* EDIT TASK MODAL */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit task" width={540}
        footer={editing && <>
          <Button variant="danger" onClick={removeEdit}><Icon name="trash" size={15} /> Delete</Button>
          <span className="spacer" />
          <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          <Button onClick={saveEdit}>Save changes</Button>
        </>}>
        {editing && (
          <div className="col gap-3">
            <Field label="Title">
              <Input value={ef.title} onChange={(e) => setEf(f => ({ ...f, title: e.target.value }))} />
            </Field>
            <Field label="Assignee">
              <Select value={ef.assigneeId} onChange={(e) => setEf(f => ({ ...f, assigneeId: e.target.value }))}>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </Select>
            </Field>
            <Field label="Status">
              <Segmented options={STATUS_OPTS} value={ef.status} onChange={(v) => setEf(f => ({ ...f, status: v }))} />
            </Field>
            <Field label="Priority">
              <Segmented options={PRIORITY_OPTS} value={ef.priority} onChange={(v) => setEf(f => ({ ...f, priority: v }))} />
            </Field>
            <Field label="Due date">
              <Input type="date" value={ef.due} onChange={(e) => setEf(f => ({ ...f, due: e.target.value }))} />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ---------- project switcher chip ---------- */
function ProjectChip({ label, dot, icon, active, onClick }) {
  return (
    <button onClick={onClick} className="row gap-1"
      style={{
        flex: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
        padding: '.5rem .85rem', borderRadius: 'var(--r-pill)', fontWeight: 600, fontSize: '.92rem',
        border: '1px solid ' + (active ? 'var(--accent)' : 'var(--line-strong)'),
        background: active ? 'var(--accent)' : 'var(--paper)',
        color: active ? '#fff' : 'var(--ink-2)',
        boxShadow: active ? 'var(--accent-glow)' : 'var(--shadow-sm)',
        transition: 'transform .14s var(--ease), background .16s, border-color .16s, box-shadow .16s',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}>
      {icon}
      {dot && <span className="dot" style={{ background: dot, width: 9, height: 9 }} />}
      <span className="clip" style={{ maxWidth: 180 }}>{label}</span>
    </button>
  );
}
