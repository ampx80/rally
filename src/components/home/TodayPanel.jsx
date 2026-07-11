// "Today" - the current user's live work queue off myDayQueue, with a
// one-click complete toggle and an inline add-task box. Completing or adding
// a task mutates the store, which re-renders the page and refreshes queue.
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  toggleActivity, createActivity,
  getDeal, getContact, getCompany, contactName,
} from '../../lib/store.js';
import { Input, SectionHeader, relTime } from '../UI.jsx';
import { Icon, typeIcon } from '../icons.jsx';

function relatedFor(a) {
  if (a.relatedType === 'deal') { const d = getDeal(a.relatedId); if (d) return { label: d.name, to: `/deals/${d.id}` }; }
  if (a.relatedType === 'contact') { const c = getContact(a.relatedId); if (c) return { label: contactName(c), to: `/contacts/${c.id}` }; }
  if (a.companyId) { const co = getCompany(a.companyId); if (co) return { label: co.name, to: `/companies/${co.id}` }; }
  return null;
}

function Check({ done, onClick }) {
  return (
    <button onClick={onClick} aria-label={done ? 'Mark not done' : 'Mark done'} className="row center"
      style={{ width: 24, height: 24, flex: 'none', borderRadius: '50%', cursor: 'pointer', border: `2px solid ${done ? 'var(--accent)' : 'var(--n-200)'}`, background: done ? 'var(--accent)' : 'transparent', color: '#fff', transition: 'border-color .15s, background .15s' }}>
      {done && <Icon name="check" size={13} stroke={3} />}
    </button>
  );
}

function DayRow({ a }) {
  const rel = relatedFor(a);
  const overdue = a.dueAt && new Date(a.dueAt).getTime() < Date.now();
  return (
    <div className="row gap-2" style={{ padding: '.68rem 0', borderTop: '1px solid var(--n-50)' }}>
      <Check done={a.done} onClick={() => toggleActivity(a.id)} />
      <span className="row center" style={{ width: 30, height: 30, flex: 'none', borderRadius: '50%', background: 'var(--accent-50)', color: 'var(--accent-600)' }}>
        <Icon name={typeIcon[a.type]} size={15} />
      </span>
      <div className="col" style={{ minWidth: 0, flex: 1, lineHeight: 1.3 }}>
        <span className="fw-6 clip">{a.subject}</span>
        {rel && <Link to={rel.to} className="t-sm clip" style={{ color: 'var(--n-600)' }}>{rel.label}</Link>}
      </div>
      <span className="t-sm fw-6" style={{ flex: 'none', color: overdue ? 'var(--risk)' : 'var(--n-600)' }}>{relTime(a.dueAt)}</span>
    </div>
  );
}

export default function TodayPanel({ queue = [], me }) {
  const [task, setTask] = useState('');
  const addTask = (e) => {
    e.preventDefault();
    if (!task.trim() || !me) return;
    createActivity({ type: 'task', subject: task.trim(), ownerId: me.id, dueAt: new Date().toISOString() });
    setTask('');
  };
  return (
    <div className="card card-pad col" style={{ minHeight: 0 }}>
      <SectionHeader
        title="Today"
        sub={`${queue.length} open task${queue.length === 1 ? '' : 's'} on your plate`}
        action={<Link to="/activities" className="link t-sm row gap-1">View all <Icon name="chevronRight" size={14} /></Link>}
      />
      {queue.length === 0 ? (
        <div className="col center gap-2" style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
          <span className="row center" style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--ok-bg)', color: 'var(--ok)' }}><Icon name="check" size={24} stroke={2.5} /></span>
          <div className="fw-6">You are all caught up.</div>
          <div className="muted t-sm">Nothing due. Add a task below or let Rook line up your day.</div>
        </div>
      ) : (
        <div className="col" style={{ marginTop: '-.35rem' }}>{queue.slice(0, 6).map((a) => <DayRow key={a.id} a={a} />)}</div>
      )}
      <form onSubmit={addTask} className="row gap-2" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--line)' }}>
        <span className="row center" style={{ color: 'var(--n-400)', flex: 'none' }}><Icon name="plus" size={18} /></span>
        <Input value={task} onChange={(e) => setTask(e.target.value)} placeholder="Add a task for today..." style={{ flex: 1 }} />
        <button type="submit" className="btn btn-ghost btn-sm" disabled={!task.trim()}>Add</button>
      </form>
    </div>
  );
}
