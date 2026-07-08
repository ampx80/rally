// ============================================================
// MY DAY  (/activities)
// The rep's work surface: a quick composer, then activities
// bucketed by due date (Overdue / Today / This week / Later)
// plus a collapsed Done pile. Mine / Team filter toggle.
// ============================================================
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useStore, getCurrentUser, getActivities,
  getDeal, getContact, getCompany, contactName,
  createActivity, toggleActivity, userName,
  ACTIVITY_META,
} from '../lib/store.js';
import { Button, Card, Badge, Avatar, SectionHeader, Input, relTime } from '../components/UI.jsx';
import { Icon, typeIcon } from '../components/icons.jsx';

const COMPOSE_TYPES = ['task', 'call', 'email', 'meeting'];

/* local YYYY-MM-DD for a date input default (today) */
function todayInput() {
  const d = new Date();
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}

/* Which bucket an activity falls into. */
function bucketOf(a, startOfWeekEnd) {
  if (a.done) return 'done';
  const t = new Date(a.dueAt).getTime();
  const now = Date.now();
  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
  if (t < now && !isSameDay(t, now)) return 'overdue';
  if (isSameDay(t, now)) return 'today';
  if (t <= startOfWeekEnd) return 'week';
  return 'later';
}
function isSameDay(a, b) {
  const x = new Date(a), y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}

/* Resolve related record name + link. */
function relatedFor(a) {
  if (a.relatedType === 'deal') {
    const d = getDeal(a.relatedId);
    if (d) return { label: d.name, to: `/deals/${d.id}` };
  }
  if (a.relatedType === 'contact') {
    const c = getContact(a.relatedId);
    if (c) return { label: contactName(c), to: `/contacts/${c.id}` };
  }
  if (a.companyId) {
    const co = getCompany(a.companyId);
    if (co) return { label: co.name, to: `/companies/${co.id}` };
  }
  return null;
}

function Check({ done, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={done ? 'Mark not done' : 'Mark done'}
      className="row center"
      style={{
        width: 24, height: 24, flex: 'none', borderRadius: '50%', cursor: 'pointer',
        border: `2px solid ${done ? 'var(--accent)' : 'var(--n-200)'}`,
        background: done ? 'var(--accent)' : 'transparent', color: '#fff',
        transition: 'border-color .15s, background .15s',
      }}
    >
      {done && <Icon name="check" size={13} stroke={3} />}
    </button>
  );
}

function ActivityRow({ a, showOwner }) {
  const rel = relatedFor(a);
  const overdue = !a.done && a.dueAt && new Date(a.dueAt).getTime() < Date.now() && !isSameDay(a.dueAt, Date.now());
  return (
    <div className="row gap-2" style={{ padding: '.7rem 0', borderTop: '1px solid var(--n-50)' }}>
      <Check done={a.done} onClick={() => toggleActivity(a.id)} />
      <span className="row center" style={{ width: 30, height: 30, flex: 'none', borderRadius: '50%', background: 'var(--accent-50)', color: 'var(--accent-600)' }} title={ACTIVITY_META[a.type]?.label}>
        <Icon name={typeIcon[a.type]} size={15} />
      </span>
      <div className="col" style={{ minWidth: 0, flex: 1, lineHeight: 1.3 }}>
        <span className="fw-6 clip" style={{ textDecoration: a.done ? 'line-through' : 'none', color: a.done ? 'var(--n-600)' : 'var(--ink)' }}>{a.subject}</span>
        {rel && <Link to={rel.to} className="t-sm clip" style={{ color: 'var(--n-600)' }}>{rel.label}</Link>}
      </div>
      {showOwner && (
        <span className="row gap-1" style={{ flex: 'none' }}>
          <Avatar name={userName(a.ownerId)} size={22} />
          <span className="t-sm muted clip" style={{ maxWidth: 120 }}>{userName(a.ownerId)}</span>
        </span>
      )}
      <span className="t-sm fw-6" style={{ flex: 'none', minWidth: 66, textAlign: 'right', color: overdue ? 'var(--risk)' : 'var(--n-600)' }}>
        {relTime(a.dueAt)}
      </span>
    </div>
  );
}

function Bucket({ title, tone, items, showOwner }) {
  if (!items.length) return null;
  return (
    <Card>
      <div className="row between" style={{ marginBottom: '.35rem' }}>
        <h4 style={{ margin: 0, color: tone === 'risk' ? 'var(--risk)' : 'var(--ink)' }}>{title}</h4>
        <Badge tone={tone === 'risk' ? 'risk' : 'default'}>{items.length}</Badge>
      </div>
      <div className="col">
        {items.map((a) => <ActivityRow key={a.id} a={a} showOwner={showOwner} />)}
      </div>
    </Card>
  );
}

export default function Activities() {
  useStore(); // reactivity
  const me = getCurrentUser();
  const [scope, setScope] = useState('mine'); // 'mine' | 'team'
  const [type, setType] = useState('task');
  const [subject, setSubject] = useState('');
  const [due, setDue] = useState(todayInput());
  const [doneOpen, setDoneOpen] = useState(false);

  const team = scope === 'team';

  // non-note activities in scope
  const all = getActivities().filter((a) => a.type !== 'note' && (team || a.ownerId === me.id));

  const endOfWeek = (() => {
    const d = new Date(); d.setHours(23, 59, 59, 999);
    d.setDate(d.getDate() + (7 - d.getDay())); // through end of this week (Sat)
    return d.getTime();
  })();

  const buckets = { overdue: [], today: [], week: [], later: [], done: [] };
  for (const a of all) buckets[bucketOf(a, endOfWeek)].push(a);
  const bySoonest = (x, y) => new Date(x.dueAt) - new Date(y.dueAt);
  buckets.overdue.sort(bySoonest);
  buckets.today.sort(bySoonest);
  buckets.week.sort(bySoonest);
  buckets.later.sort(bySoonest);
  buckets.done.sort((x, y) => new Date(y.dueAt) - new Date(x.dueAt));

  const openCount = all.filter((a) => !a.done).length;

  const add = (e) => {
    e.preventDefault();
    if (!subject.trim()) return;
    createActivity({
      type,
      subject: subject.trim(),
      dueAt: due ? new Date(due + 'T09:00:00').toISOString() : new Date().toISOString(),
      ownerId: me.id,
      done: false,
    });
    setSubject('');
  };

  return (
    <div className="col gap-3 fade-up" style={{ paddingBottom: '1rem' }}>
      <SectionHeader
        title="My day"
        sub={team ? `${openCount} open task${openCount === 1 ? '' : 's'} across the team` : `${openCount} open task${openCount === 1 ? '' : 's'} for you`}
        action={
          <div className="row" style={{ background: 'var(--n-100)', borderRadius: 'var(--r-pill)', padding: '.2rem' }}>
            {[['mine', 'Mine'], ['team', 'Team']].map(([k, label]) => (
              <button
                key={k}
                onClick={() => setScope(k)}
                className="btn btn-sm"
                style={{
                  borderRadius: 'var(--r-pill)',
                  background: scope === k ? 'var(--paper)' : 'transparent',
                  color: scope === k ? 'var(--ink)' : 'var(--n-600)',
                  boxShadow: scope === k ? 'var(--shadow-sm)' : 'none',
                  fontWeight: 700,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />

      {/* Composer */}
      <Card>
        <form onSubmit={add} className="col gap-2">
          <div className="row gap-1 wrap">
            {COMPOSE_TYPES.map((t) => {
              const on = type === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className="row gap-1 btn btn-sm"
                  style={{
                    background: on ? 'var(--accent-50)' : 'var(--paper)',
                    border: `1px solid ${on ? 'var(--accent-300)' : 'var(--line-strong)'}`,
                    color: on ? 'var(--accent-600)' : 'var(--ink-2)',
                    fontWeight: 600,
                  }}
                >
                  <Icon name={typeIcon[t]} size={15} /> {ACTIVITY_META[t]?.label}
                </button>
              );
            })}
          </div>
          <div className="row gap-2 wrap">
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={`Add a ${ACTIVITY_META[type]?.label.toLowerCase()}...`}
              style={{ flex: '1 1 260px' }}
            />
            <Input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              style={{ flex: '0 0 auto', width: 170 }}
            />
            <Button type="submit" variant="accent" disabled={!subject.trim()}>
              <Icon name="plus" size={16} /> Add
            </Button>
          </div>
        </form>
      </Card>

      {/* Buckets */}
      {openCount === 0 && buckets.done.length === 0 ? (
        <Card>
          <div className="col center gap-2" style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
            <span className="row center" style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--ok-bg)', color: 'var(--ok)' }}>
              <Icon name="check" size={24} stroke={2.5} />
            </span>
            <div className="fw-6">Nothing on the list. Add your first task above.</div>
          </div>
        </Card>
      ) : (
        <>
          <Bucket title="Overdue" tone="risk" items={buckets.overdue} showOwner={team} />
          <Bucket title="Today" items={buckets.today} showOwner={team} />
          <Bucket title="This week" items={buckets.week} showOwner={team} />
          <Bucket title="Later" items={buckets.later} showOwner={team} />

          {/* Done, collapsed */}
          {buckets.done.length > 0 && (
            <Card>
              <button
                onClick={() => setDoneOpen((v) => !v)}
                className="row between"
                style={{ width: '100%', background: 'transparent', cursor: 'pointer', padding: 0 }}
              >
                <span className="row gap-2">
                  <Icon name={doneOpen ? 'chevronDown' : 'chevronRight'} size={16} />
                  <h4 style={{ margin: 0 }}>Done</h4>
                </span>
                <Badge tone="ok">{buckets.done.length}</Badge>
              </button>
              {doneOpen && (
                <div className="col" style={{ marginTop: '.35rem' }}>
                  {buckets.done.map((a) => <ActivityRow key={a.id} a={a} showOwner={team} />)}
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
