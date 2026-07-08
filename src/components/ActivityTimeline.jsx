// Activity timeline for a record's right rail. Shows the logged history and
// a quick composer to add a call/email/meeting/task/note against the record.
import React, { useState } from 'react';
import { Icon, typeIcon } from './icons.jsx';
import { Avatar, relTime, useToast } from './UI.jsx';
import { createActivity, toggleActivity, getActivitiesForRecord, userName, ACTIVITY_TYPES, ACTIVITY_META } from '../lib/store.js';

const typeTint = { task: '#5b4bf5', call: '#0ea5a3', email: '#2563a8', meeting: '#b3721a', note: '#5b6474' };

export default function ActivityTimeline({ relatedType, relatedId, companyId, tick, onChange }) {
  const [type, setType] = useState('note');
  const [subject, setSubject] = useState('');
  const toast = useToast();
  const items = getActivitiesForRecord(relatedType, relatedId);

  const add = () => {
    if (!subject.trim()) return;
    const r = createActivity({ type, subject, relatedType, relatedId, companyId, done: type === 'note' });
    if (r.error) return toast(r.message, 'risk');
    setSubject('');
    onChange?.();
  };

  return (
    <div className="col gap-3">
      <div className="card card-pad">
        <div className="row gap-1 wrap" style={{ marginBottom: '.7rem' }}>
          {ACTIVITY_TYPES.map(t => (
            <button key={t} onClick={() => setType(t)} className="btn btn-sm"
              style={{ background: type === t ? 'var(--accent-50)' : 'transparent', color: type === t ? 'var(--accent-600)' : 'var(--n-600)', border: type === t ? '1px solid var(--accent-300)' : '1px solid var(--line)' }}>
              <Icon name={typeIcon[t]} size={15} /> {ACTIVITY_META[t].label}
            </button>
          ))}
        </div>
        <div className="row gap-2">
          <input className="input" value={subject} onChange={e => setSubject(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder={`Log a ${ACTIVITY_META[type].label.toLowerCase()}...`} />
          <button className="btn btn-primary" onClick={add}><Icon name="plus" size={16} /> Log</button>
        </div>
      </div>

      <div className="col" style={{ position: 'relative' }}>
        {items.length === 0 && <div className="muted t-sm" style={{ padding: '.5rem 0' }}>No activity logged yet.</div>}
        {items.map((a, i) => (
          <div key={a.id} className="row gap-2" style={{ alignItems: 'flex-start', padding: '.6rem 0', borderBottom: i < items.length - 1 ? '1px solid var(--line)' : 'none' }}>
            <span className="row center" style={{ width: 32, height: 32, borderRadius: 'var(--r-pill)', background: (typeTint[a.type] || '#5b6474') + '1a', color: typeTint[a.type] || '#5b6474', flex: 'none' }}>
              <Icon name={typeIcon[a.type]} size={15} />
            </span>
            <div className="col" style={{ flex: 1, minWidth: 0 }}>
              <div className="row between gap-1">
                <span className="fw-6 clip" style={{ minWidth: 0 }}>{a.subject}</span>
                <span className="t-xs muted" style={{ flex: 'none' }}>{relTime(a.dueAt || a.createdAt)}</span>
              </div>
              <span className="t-xs muted">{userName(a.ownerId)}{a.type !== 'note' && !a.system ? (a.done ? ' - done' : ' - open') : ''}</span>
            </div>
            {a.type !== 'note' && !a.system && (
              <button className="btn btn-quiet btn-sm" title={a.done ? 'Mark open' : 'Mark done'}
                onClick={() => { toggleActivity(a.id); onChange?.(); }}
                style={{ color: a.done ? 'var(--ok)' : 'var(--n-400)', padding: '.2rem .35rem' }}>
                <Icon name="check" size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
