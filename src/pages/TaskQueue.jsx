// ============================================================
// TASK QUEUES  (/queue)
// A work-through surface over activities. Pick a queue (a saved
// filter), then either work the LIST (with bulk-complete) or drop
// into FOCUS MODE: one task at a time, front-and-center with its
// record context, quick-complete / skip / snooze advancing to the
// next. Reads + writes through the existing store writers only
// (updateActivity for complete + reschedule). Additive: no existing
// export, route, or writer is touched. ASCII only, no em/en dashes.
// ============================================================
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  useStore, updateActivity, getActivity, getCurrentUser,
  userName, ACTIVITY_META,
} from '../lib/store.js';
import {
  useQueues, resolveQueue, queueStats, groupByBucket, relatedContext,
  priorityOf, dueBucket, PRIORITY_META, SNOOZE_PRESETS,
  saveQueue, deleteQueue, isBuiltin,
  QUEUEABLE_TYPES, DUE_WINDOWS, OWNER_SCOPES, PRIORITIES, QUEUE_ICON_CHOICES,
  makeRun, runCurrent, runProgress,
} from '../lib/task-queues.js';
import {
  Card, Button, Badge, PageTitle, SectionHeader, Modal, EmptyState,
  Segmented, Field, Input, Select, ProgressBar, useToast, relTime, longDate, moneyK,
} from '../components/UI.jsx';
import { Icon, typeIcon } from '../components/icons.jsx';
import './task-queues.css';

/* ---------- small building blocks ---------- */
function PriorityBadge({ a }) {
  const m = PRIORITY_META[priorityOf(a)] || PRIORITY_META.low;
  return <Badge tone={m.tone} className="t-xs">{m.label}</Badge>;
}

function TypeChip({ type, size = 30 }) {
  return (
    <span className="row center" title={ACTIVITY_META[type]?.label}
      style={{ width: size, height: size, flex: 'none', borderRadius: '50%', background: 'var(--accent-50)', color: 'var(--accent-600)' }}>
      <Icon name={typeIcon[type]} size={Math.round(size * 0.5)} />
    </span>
  );
}

function RelatedInline({ a }) {
  const rel = relatedContext(a);
  if (!rel) return <span className="t-sm muted">No linked record</span>;
  return (
    <Link to={rel.to} className="t-sm clip" style={{ color: 'var(--n-600)' }} onClick={(e) => e.stopPropagation()}>
      {rel.title}
    </Link>
  );
}

/* ---------- queue rail card ---------- */
function QueueCard({ q, active, onSelect, onEdit }) {
  const stats = queueStats(q);
  return (
    <button className={`tq-queue card card-pad col gap-2${active ? ' on' : ''}`} onClick={() => onSelect(q)}
      style={{ borderColor: active ? 'var(--accent)' : undefined }}>
      <div className="row gap-2" style={{ alignItems: 'center' }}>
        <span className="tq-chip" style={{ background: `color-mix(in srgb, ${q.accent} 16%, transparent)`, color: q.accent }}>
          <Icon name={q.icon} size={19} />
        </span>
        <div className="col" style={{ minWidth: 0, flex: 1, lineHeight: 1.25 }}>
          <span className="fw-7 clip">{q.name}</span>
          <span className="t-xs muted clip">{q.desc}</span>
        </div>
        {!q.builtin && (
          <span role="button" tabIndex={0} aria-label="Edit queue" className="btn btn-quiet"
            onClick={(e) => { e.stopPropagation(); onEdit(q); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onEdit(q); } }}
            style={{ padding: '.3rem', flex: 'none', color: 'var(--n-600)' }}>
            <Icon name="edit" size={15} />
          </span>
        )}
      </div>
      <div className="row gap-2" style={{ alignItems: 'center' }}>
        <span className="fw-8 tnum" style={{ fontSize: '1.25rem' }}>{stats.total}</span>
        <span className="t-xs muted">open</span>
        <span className="spacer" />
        {stats.overdue > 0 && <Badge tone="risk" className="t-xs">{stats.overdue} overdue</Badge>}
        {stats.overdue === 0 && stats.today > 0 && <Badge tone="warn" className="t-xs">{stats.today} today</Badge>}
      </div>
    </button>
  );
}

/* ---------- list row ---------- */
function ListRow({ a, selected, onToggleSelect, onComplete, i }) {
  return (
    <div className="tq-row-in row gap-2" style={{ padding: '.7rem 0', borderTop: '1px solid var(--n-50)', animationDelay: `${Math.min(i, 12) * 24}ms`, alignItems: 'center' }}>
      <input type="checkbox" checked={selected} onChange={() => onToggleSelect(a.id)} aria-label={`Select ${a.subject}`} style={{ width: 17, height: 17, flex: 'none', accentColor: 'var(--accent)', cursor: 'pointer' }} />
      <TypeChip type={a.type} />
      <div className="col" style={{ minWidth: 0, flex: 1, lineHeight: 1.3 }}>
        <span className="fw-6 clip">{a.subject}</span>
        <RelatedInline a={a} />
      </div>
      <PriorityBadge a={a} />
      <span className="t-sm fw-6" style={{ flex: 'none', minWidth: 66, textAlign: 'right', color: dueBucket(a) === 'overdue' ? 'var(--risk)' : 'var(--n-600)' }}>
        {relTime(a.dueAt)}
      </span>
      <Button size="sm" variant="ghost" onClick={() => onComplete(a.id)} title="Complete" style={{ flex: 'none', padding: '.4rem .6rem' }}>
        <Icon name="check" size={15} stroke={2.4} />
      </Button>
    </div>
  );
}

/* ---------- focus card (one task, front and center) ---------- */
function FocusCard({ a, progress, onComplete, onSkip, onSnooze }) {
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  useEffect(() => { setSnoozeOpen(false); }, [a.id]);
  const rel = relatedContext(a);
  const overdue = dueBucket(a) === 'overdue';
  return (
    <Card key={a.id} className="tq-card-in tq-focus-glow col gap-3" style={{ position: 'relative' }}>
      <div className="row between gap-2 wrap" style={{ alignItems: 'center' }}>
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <TypeChip type={a.type} size={34} />
          <span className="fw-7">{ACTIVITY_META[a.type]?.label}</span>
          <PriorityBadge a={a} />
        </div>
        <span className="t-sm fw-7" style={{ color: overdue ? 'var(--risk)' : 'var(--n-600)' }}>
          <Icon name="clock" size={14} style={{ verticalAlign: '-2px', marginRight: 4 }} />
          {a.dueAt ? longDate(a.dueAt) : 'No due date'}{overdue ? ' - overdue' : ''}
        </span>
      </div>

      <div className="tq-big">{a.subject}</div>
      {a.body && <div className="muted" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{a.body}</div>}

      {/* related record context */}
      {rel && (
        <Link to={rel.to} className="row gap-3 card card-pad" style={{ alignItems: 'center', textDecoration: 'none', borderStyle: 'dashed' }}>
          <span className="tq-chip" style={{ background: 'var(--accent-50)', color: 'var(--accent-600)' }}>
            <Icon name={rel.icon} size={19} />
          </span>
          <div className="col" style={{ minWidth: 0, flex: 1, lineHeight: 1.3 }}>
            <span className="t-xs muted" style={{ letterSpacing: '.08em', textTransform: 'uppercase' }}>{rel.kind}</span>
            <span className="fw-7 clip" style={{ color: 'var(--ink)' }}>{rel.title}</span>
            {rel.meta && <span className="t-sm muted clip">{rel.meta}</span>}
          </div>
          {rel.value != null && (
            <div className="col" style={{ textAlign: 'right', flex: 'none' }}>
              <span className="fw-8 tnum" style={{ color: 'var(--accent-600)' }}>{moneyK(rel.value)}</span>
              <span className="t-xs muted">open value</span>
            </div>
          )}
          <Icon name="arrowRight" size={18} style={{ color: 'var(--n-400)', flex: 'none' }} />
        </Link>
      )}

      {/* actions */}
      <div className="row gap-2 wrap" style={{ alignItems: 'center', marginTop: '.2rem' }}>
        <Button variant="accent" onClick={onComplete} style={{ flex: '1 1 200px' }}>
          <Icon name="check" size={17} stroke={2.4} /> Complete
        </Button>
        <Button variant="ghost" onClick={onSkip}>
          <Icon name="arrowRight" size={16} /> Skip
        </Button>
        <div style={{ position: 'relative' }}>
          <Button variant="ghost" onClick={() => setSnoozeOpen(v => !v)} aria-expanded={snoozeOpen}>
            <Icon name="clock" size={16} /> Snooze
          </Button>
          {snoozeOpen && (
            <div className="tq-snooze-menu col" role="menu">
              {SNOOZE_PRESETS.map(p => (
                <button key={p.id} className="tq-snooze-item" role="menuitem" onClick={() => { setSnoozeOpen(false); onSnooze(p); }}>
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* progress */}
      <div className="col gap-1" style={{ marginTop: '.2rem' }}>
        <ProgressBar value={progress.pct} />
        <div className="row between t-xs muted">
          <span>{progress.done} done{progress.snoozed ? ` - ${progress.snoozed} snoozed` : ''}{progress.skipped ? ` - ${progress.skipped} skipped` : ''}</span>
          <span>{progress.left} left of {progress.total}</span>
        </div>
      </div>
    </Card>
  );
}

/* ---------- focus finished ---------- */
function FocusDone({ progress, onReview, onRestart, onList }) {
  return (
    <Card className="tq-card-in col center gap-3" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
      <span className="row center floaty" style={{ width: 60, height: 60, borderRadius: 18, background: 'linear-gradient(135deg, #6d5cf7, #4a3ce0)', color: '#fff', boxShadow: 'var(--accent-glow)' }}>
        <Icon name="check" size={30} stroke={2.6} />
      </span>
      <div className="col gap-1">
        <h3 style={{ margin: 0 }}>Queue cleared</h3>
        <div className="muted">{progress.done} completed{progress.snoozed ? `, ${progress.snoozed} snoozed` : ''}{progress.skipped ? `, ${progress.skipped} skipped` : ''} this run.</div>
      </div>
      <div className="row gap-2 wrap center">
        {progress.skipped > 0 && <Button variant="primary" onClick={onReview}><Icon name="rotateCcw" size={15} /> Review {progress.skipped} skipped</Button>}
        <Button variant="ghost" onClick={onRestart}><Icon name="bolt" size={15} /> Restart run</Button>
        <Button variant="ghost" onClick={onList}><Icon name="list" size={15} /> Back to list</Button>
      </div>
    </Card>
  );
}

/* ---------- queue builder modal ---------- */
const EMPTY_DRAFT = { name: '', icon: 'funnel', accent: 'var(--accent)', desc: '', filter: { types: null, due: 'all', owner: 'me', priority: 'any' } };

function QueueBuilder({ open, draft, onClose, onSaved, onDeleted }) {
  const toast = useToast();
  const [d, setD] = useState(EMPTY_DRAFT);
  useEffect(() => { if (open) setD(draft ? JSON.parse(JSON.stringify(draft)) : EMPTY_DRAFT); }, [open, draft]);
  const editing = !!(draft && draft.id);
  const types = d.filter.types || [];
  const toggleType = (t) => {
    const has = types.includes(t);
    const next = has ? types.filter(x => x !== t) : [...types, t];
    setD({ ...d, filter: { ...d.filter, types: next.length ? next : null } });
  };
  const setF = (k, v) => setD({ ...d, filter: { ...d.filter, [k]: v } });
  const save = () => {
    const res = saveQueue(d);
    if (res.error) { toast(res.message, 'risk'); return; }
    toast(editing ? 'Queue updated' : 'Queue created');
    onSaved(res.queue);
  };
  const remove = () => {
    deleteQueue(draft.id);
    toast('Queue removed');
    onDeleted(draft.id);
  };
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit queue' : 'New queue'} width={560}
      footer={
        <>
          {editing && <Button variant="danger" onClick={remove} style={{ marginRight: 'auto' }}><Icon name="trash" size={15} /> Delete</Button>}
          <Button variant="quiet" onClick={onClose}>Cancel</Button>
          <Button variant="accent" onClick={save}><Icon name="check" size={15} /> {editing ? 'Save' : 'Create queue'}</Button>
        </>
      }>
      <div className="col gap-3">
        <Field label="Queue name">
          <Input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="e.g. High-value follow-ups" autoFocus />
        </Field>
        <Field label="Description" hint="Optional. Shown under the queue name.">
          <Input value={d.desc} onChange={(e) => setD({ ...d, desc: e.target.value })} placeholder="What belongs in this queue" />
        </Field>

        <div className="field">
          <label>Icon</label>
          <div className="row gap-1 wrap">
            {QUEUE_ICON_CHOICES.map(ic => {
              const on = d.icon === ic;
              return (
                <button key={ic} type="button" onClick={() => setD({ ...d, icon: ic })} className="row center"
                  style={{ width: 38, height: 38, borderRadius: 'var(--r-sm)', cursor: 'pointer', border: `1px solid ${on ? 'var(--accent)' : 'var(--line-strong)'}`, background: on ? 'var(--accent-50)' : 'var(--paper)', color: on ? 'var(--accent-600)' : 'var(--n-600)' }} aria-pressed={on} aria-label={ic}>
                  <Icon name={ic} size={18} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="field">
          <label>Activity types</label>
          <div className="row gap-1 wrap">
            {QUEUEABLE_TYPES.map(t => {
              const on = types.includes(t);
              return (
                <button key={t} type="button" onClick={() => toggleType(t)} className="row gap-1 btn btn-sm"
                  style={{ background: on ? 'var(--accent-50)' : 'var(--paper)', border: `1px solid ${on ? 'var(--accent-300)' : 'var(--line-strong)'}`, color: on ? 'var(--accent-600)' : 'var(--ink-2)', fontWeight: 600 }}>
                  <Icon name={typeIcon[t]} size={14} /> {ACTIVITY_META[t]?.label}
                </button>
              );
            })}
          </div>
          <span className="t-xs muted">None selected includes every type.</span>
        </div>

        <div className="row gap-2 wrap">
          <Field label="Due window"><Select value={d.filter.due} onChange={(e) => setF('due', e.target.value)}>{DUE_WINDOWS.map(w => <option key={w.id} value={w.id}>{w.label}</option>)}</Select></Field>
          <Field label="Owner"><Select value={d.filter.owner} onChange={(e) => setF('owner', e.target.value)}>{OWNER_SCOPES.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</Select></Field>
          <Field label="Priority"><Select value={d.filter.priority} onChange={(e) => setF('priority', e.target.value)}>{PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</Select></Field>
        </div>
      </div>
    </Modal>
  );
}

/* ============================================================
   PAGE
   ============================================================ */
export default function TaskQueue() {
  useStore(); // re-derive queue membership on every store mutation
  const queues = useQueues();
  const toast = useToast();
  const [params, setParams] = useSearchParams();

  const [activeId, setActiveId] = useState(() => {
    const q = params.get('q');
    return q && queues.some(x => x.id === q) ? q : (queues[0]?.id || 'today');
  });
  const active = queues.find(q => q.id === activeId) || queues[0];

  const [mode, setMode] = useState('list');       // 'list' | 'focus'
  const [run, setRun] = useState(null);           // focus-run snapshot
  const [runTick, setRunTick] = useState(0);      // force recompute after set mutation
  const [selected, setSelected] = useState(() => new Set());
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editDraft, setEditDraft] = useState(null);

  // Live resolved list for the active queue. Computed every render (cheap over
  // the local store) so useStore() above keeps it live as activities mutate.
  const items = active ? resolveQueue(active) : [];

  // Keep the URL shareable + reset transient state when the queue changes.
  const selectQueue = (q) => {
    setActiveId(q.id);
    setParams(prev => { const p = new URLSearchParams(prev); p.set('q', q.id); return p; }, { replace: true });
    setSelected(new Set());
    setRun(null);
    setMode('list');
  };

  /* ----- list-view selection + completion ----- */
  const toggleSelect = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allSelected = items.length > 0 && items.every(a => selected.has(a.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(items.map(a => a.id)));
  const completeOne = (id) => { updateActivity(id, { done: true }); setSelected(prev => { const n = new Set(prev); n.delete(id); return n; }); };
  const completeSelected = () => {
    const ids = [...selected].filter(id => { const a = getActivity(id); return a && !a.done; });
    ids.forEach(id => updateActivity(id, { done: true }));
    setSelected(new Set());
    if (ids.length) toast(`${ids.length} task${ids.length === 1 ? '' : 's'} completed`);
  };

  /* ----- focus mode ----- */
  const startFocus = () => { setRun(makeRun(active)); setMode('focus'); };
  const current = run ? runCurrent(run) : null;
  const progress = runProgress(run);
  // runTick is read so complete/skip/snooze re-render even though we mutate Sets in place.
  void runTick;

  const focusComplete = () => {
    if (!current) return;
    updateActivity(current.id, { done: true });
    run.completed.add(current.id);
    setRunTick(t => t + 1);
  };
  const focusSkip = () => { if (!current) return; run.skipped.add(current.id); setRunTick(t => t + 1); };
  const focusSnooze = (preset) => {
    if (!current) return;
    updateActivity(current.id, { dueAt: preset.to() });
    run.snoozed.add(current.id);
    setRunTick(t => t + 1);
    toast(`Snoozed to ${preset.label.toLowerCase()}`);
  };
  const reviewSkipped = () => { setRun(r => ({ ...r, skipped: new Set() })); setRunTick(t => t + 1); };
  const restartRun = () => setRun(makeRun(active));

  // Keyboard shortcuts while a focus card is showing.
  useEffect(() => {
    if (mode !== 'focus' || !current) return;
    const h = (e) => {
      const el = document.activeElement;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (e.key === 'c' || e.key === 'C') { e.preventDefault(); focusComplete(); }
      else if (e.key === 's' || e.key === 'S' || e.key === 'ArrowRight') { e.preventDefault(); focusSkip(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [mode, current?.id]); // eslint-disable-line

  const openNew = () => { setEditDraft(null); setBuilderOpen(true); };
  const openEdit = (q) => { setEditDraft(q); setBuilderOpen(true); };

  const stats = active ? queueStats(active) : { total: 0, overdue: 0, today: 0 };

  return (
    <div className="col gap-3 fade-up" style={{ paddingBottom: '1rem' }}>
      <PageTitle
        eyebrow="FOCUS MODE"
        title="Task queues"
        sub="Saved filters over your work. Pick a queue, then clear it one task at a time."
        action={<Button variant="primary" onClick={openNew}><Icon name="plus" size={16} /> New queue</Button>}
      />

      <div className="tq-grid">
        {/* left rail: queue picker */}
        <div className="tq-rail col gap-2">
          {queues.map(q => (
            <QueueCard key={q.id} q={q} active={q.id === activeId} onSelect={selectQueue} onEdit={openEdit} />
          ))}
          <button className="tq-queue card card-pad row gap-2 center" onClick={openNew}
            style={{ borderStyle: 'dashed', color: 'var(--accent-600)', justifyContent: 'center' }}>
            <Icon name="plus" size={17} /> <span className="fw-7">New queue</span>
          </button>
        </div>

        {/* work area */}
        <div className="col gap-3" style={{ minWidth: 0 }}>
          <Card className="row between gap-3 wrap" style={{ alignItems: 'center' }}>
            <div className="row gap-3" style={{ alignItems: 'center', minWidth: 0 }}>
              <span className="tq-chip" style={{ background: `color-mix(in srgb, ${active?.accent} 16%, transparent)`, color: active?.accent }}>
                <Icon name={active?.icon || 'funnel'} size={19} />
              </span>
              <div className="col" style={{ minWidth: 0 }}>
                <span className="fw-8" style={{ fontSize: '1.1rem' }}>{active?.name}</span>
                <span className="t-sm muted">
                  {stats.total} open{stats.overdue ? ` - ${stats.overdue} overdue` : ''}{stats.today ? ` - ${stats.today} due today` : ''}
                </span>
              </div>
            </div>
            <div className="row gap-2" style={{ flex: 'none' }}>
              <Segmented options={[{ value: 'list', label: 'List' }, { value: 'focus', label: 'Focus' }]} value={mode}
                onChange={(v) => { if (v === 'focus' && !run) startFocus(); else setMode(v); }} />
              {mode === 'list' && stats.total > 0 && (
                <Button variant="accent" onClick={startFocus}><Icon name="bolt" size={15} /> Start focus</Button>
              )}
            </div>
          </Card>

          {/* LIST VIEW */}
          {mode === 'list' && (
            items.length === 0 ? (
              <Card>
                <EmptyState icon="🎯" title="Queue is clear"
                  body={`Nothing open in ${active?.name}. Pick another queue or adjust its filters.`}
                  action={<Button variant="ghost" onClick={openNew}><Icon name="plus" size={15} /> New queue</Button>} />
              </Card>
            ) : (
              <Card className="col gap-2">
                <div className="row between gap-2 wrap" style={{ alignItems: 'center' }}>
                  <label className="row gap-2" style={{ alignItems: 'center', cursor: 'pointer', fontWeight: 600 }}>
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all"
                      style={{ width: 17, height: 17, accentColor: 'var(--accent)', cursor: 'pointer' }} />
                    <span className="t-sm">{selected.size > 0 ? `${selected.size} selected` : 'Select all'}</span>
                  </label>
                  {selected.size > 0 && (
                    <div className="row gap-2">
                      <Button size="sm" variant="quiet" onClick={() => setSelected(new Set())}>Clear</Button>
                      <Button size="sm" variant="accent" onClick={completeSelected}><Icon name="check" size={14} stroke={2.4} /> Complete {selected.size}</Button>
                    </div>
                  )}
                </div>
                {groupByBucket(items).map(group => (
                  <div key={group.key} className="col">
                    <div className="row gap-2" style={{ alignItems: 'center', marginTop: '.4rem' }}>
                      <span className="eyebrow" style={{ color: group.key === 'overdue' ? 'var(--risk)' : 'var(--n-600)' }}>{group.label}</span>
                      <Badge tone={group.key === 'overdue' ? 'risk' : 'default'} className="t-xs">{group.items.length}</Badge>
                    </div>
                    {group.items.map((a, i) => (
                      <ListRow key={a.id} a={a} i={i} selected={selected.has(a.id)} onToggleSelect={toggleSelect} onComplete={completeOne} />
                    ))}
                  </div>
                ))}
              </Card>
            )
          )}

          {/* FOCUS VIEW */}
          {mode === 'focus' && (
            current ? (
              <FocusCard a={current} progress={progress} onComplete={focusComplete} onSkip={focusSkip} onSnooze={focusSnooze} />
            ) : (
              progress.total === 0 ? (
                <Card>
                  <EmptyState icon="✨" title="Nothing to focus on"
                    body={`${active?.name} has no open work right now.`}
                    action={<Button variant="ghost" onClick={() => setMode('list')}><Icon name="list" size={15} /> Back to list</Button>} />
                </Card>
              ) : (
                <FocusDone progress={progress} onReview={reviewSkipped} onRestart={restartRun} onList={() => setMode('list')} />
              )
            )
          )}

          {mode === 'focus' && current && (
            <div className="row gap-2 center t-xs muted" style={{ justifyContent: 'center' }}>
              <span>Shortcuts:</span>
              <kbd style={{ fontFamily: 'var(--font-mono)', border: '1px solid var(--line-strong)', borderRadius: 5, padding: '.05rem .35rem' }}>C</kbd><span>complete</span>
              <kbd style={{ fontFamily: 'var(--font-mono)', border: '1px solid var(--line-strong)', borderRadius: 5, padding: '.05rem .35rem' }}>S</kbd><span>skip</span>
            </div>
          )}
        </div>
      </div>

      <QueueBuilder open={builderOpen} draft={editDraft}
        onClose={() => setBuilderOpen(false)}
        onSaved={(q) => { setBuilderOpen(false); selectQueue(q); }}
        onDeleted={(id) => { setBuilderOpen(false); if (activeId === id) selectQueue(queues[0]); }} />
    </div>
  );
}
