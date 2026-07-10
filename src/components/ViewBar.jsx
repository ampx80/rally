// ViewBar - the saved-views switcher above every list (Wave 3). Tabs of system
// + user views, a compact filter builder, and "New view". Emits the active
// view to the page via onView so the page runs applyView on its rows. Editing
// a system view forks it into a user view (Close/Salesforce behavior).
// ASCII hyphens only.
import React, { useEffect, useRef, useState } from 'react';
import { useViews, createView, updateView, deleteView, opsForType, OP_LABEL } from '../lib/views.js';
import { getFields, getField, getFieldOptions } from '../lib/fields.js';
import { getUsers } from '../lib/store.js';
import { Icon } from './icons.jsx';
import { Badge, useToast } from './UI.jsx';

function ValueInput({ objectType, filter, onChange }) {
  const fd = getField(objectType, filter.fieldKey);
  const op = filter.op;
  if (['isEmpty', 'isNotEmpty', 'isTrue', 'isFalse', 'thisMonth'].includes(op)) return null;
  if (fd && (fd.type === 'picklist' || fd.type === 'status')) {
    return (
      <select className="select" value={filter.value ?? ''} onChange={e => onChange(e.target.value)} style={{ padding: '.4rem .5rem', fontSize: '.9rem', minWidth: 120 }}>
        <option value="">Pick...</option>
        {getFieldOptions(fd).map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    );
  }
  if (fd && fd.type === 'user') {
    return (
      <select className="select" value={filter.value ?? ''} onChange={e => onChange(e.target.value)} style={{ padding: '.4rem .5rem', fontSize: '.9rem', minWidth: 120 }}>
        <option value="">Pick...</option>
        {getUsers().map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
      </select>
    );
  }
  const t = op === 'lastNDays' ? 'number' : (fd && ['date', 'datetime'].includes(fd.type) && op !== 'thisMonth') ? 'date' : (fd && ['number', 'currency', 'percent'].includes(fd.type)) ? 'number' : 'text';
  return <input className="input" type={t} value={filter.value ?? ''} onChange={e => onChange(e.target.value)} placeholder="value" style={{ padding: '.4rem .55rem', fontSize: '.9rem', maxWidth: 150 }} />;
}

export default function ViewBar({ objectType, onView }) {
  const views = useViews(objectType);
  const toast = useToast();
  const [activeId, setActiveId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const popRef = useRef(null);

  const active = views.find(v => v.id === activeId) || views[0];
  useEffect(() => { if (active) onView(active); }, [active, active && active.filters, active && active.sort]); // eslint-disable-line

  // close popover on outside click
  useEffect(() => {
    if (!showFilters) return;
    const h = (e) => { if (popRef.current && !popRef.current.contains(e.target)) setShowFilters(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showFilters]);

  const patchActive = (patch) => {
    const res = updateView(active.id, patch);
    if (res && res.id !== active.id) setActiveId(res.id); // system view was forked
  };
  const addFilter = () => {
    const fd = getFields(objectType).find(f => !f.computed) || {};
    patchActive({ filters: [...(active.filters || []), { fieldKey: fd.key, op: opsForType(fd.type)[0], value: '' }] });
  };
  const setFilter = (i, patch) => {
    const next = (active.filters || []).map((f, j) => j === i ? { ...f, ...patch } : f);
    patchActive({ filters: next });
  };
  const removeFilter = (i) => patchActive({ filters: (active.filters || []).filter((_, j) => j !== i) });

  const fields = getFields(objectType).filter(f => !f.computed && f.type !== 'sublist' && f.type !== 'json');
  const filterCount = (active?.filters || []).length;

  return (
    <div className="row between wrap" style={{ gap: '.5rem', borderBottom: '1px solid var(--line)', paddingBottom: '.5rem', position: 'relative' }}>
      <div className="row gap-1 wrap" style={{ minWidth: 0 }}>
        {views.map(v => {
          const on = v.id === active?.id;
          return (
            <button key={v.id} onClick={() => setActiveId(v.id)} className="btn btn-quiet"
              style={{ borderRadius: 0, borderBottom: on ? '2px solid var(--accent)' : '2px solid transparent', color: on ? 'var(--ink)' : 'var(--n-600)', fontWeight: on ? 700 : 600, padding: '.5rem .7rem' }}>
              {v.name}{!v.system && <span className="dot" style={{ background: 'var(--accent)', marginLeft: 6 }} />}
            </button>
          );
        })}
        <button onClick={() => { const v = createView(objectType, { name: 'New view', filters: active?.filters || [] }); setActiveId(v.id); toast('View created'); }}
          className="btn btn-quiet" title="New view" style={{ padding: '.5rem .6rem', color: 'var(--n-500)' }}><Icon name="plus" size={15} /></button>
      </div>

      <div className="row gap-1" style={{ flex: 'none' }}>
        <button onClick={() => setShowFilters(s => !s)} className="btn btn-ghost btn-sm">
          <Icon name="filter" size={15} /> Filters{filterCount ? <Badge tone="accent" className="t-xs">{filterCount}</Badge> : null}
        </button>
        {active && !active.system && (
          <button onClick={() => { deleteView(active.id); setActiveId(null); toast('View deleted'); }} className="btn btn-quiet btn-sm" title="Delete view"><Icon name="trash" size={15} /></button>
        )}
      </div>

      {showFilters && (
        <div ref={popRef} className="card card-pad fade-up" style={{ position: 'absolute', right: 0, top: '100%', zIndex: 40, width: 'min(520px, 92vw)', marginTop: 6, boxShadow: 'var(--shadow-lg)' }}>
          <div className="row between" style={{ marginBottom: '.6rem' }}>
            <span className="fw-7">Filter {active?.name}</span>
            {active?.system && <span className="t-xs muted">editing forks a new view</span>}
          </div>
          {(active?.filters || []).length === 0 && <div className="muted t-sm" style={{ padding: '.3rem 0 .6rem' }}>No filters. This view shows every record.</div>}
          <div className="col gap-2">
            {(active?.filters || []).map((f, i) => {
              const fd = getField(objectType, f.fieldKey);
              const ops = opsForType(fd?.type);
              return (
                <div key={i} className="row gap-1 wrap" style={{ alignItems: 'center' }}>
                  <select className="select" value={f.fieldKey} onChange={e => { const nf = getField(objectType, e.target.value); setFilter(i, { fieldKey: e.target.value, op: opsForType(nf?.type)[0], value: '' }); }} style={{ padding: '.4rem .5rem', fontSize: '.9rem', maxWidth: 170 }}>
                    {fields.map(x => <option key={x.key} value={x.key}>{x.label}</option>)}
                  </select>
                  <select className="select" value={f.op} onChange={e => setFilter(i, { op: e.target.value })} style={{ padding: '.4rem .5rem', fontSize: '.9rem', maxWidth: 150 }}>
                    {ops.map(o => <option key={o} value={o}>{OP_LABEL[o] || o}</option>)}
                  </select>
                  <ValueInput objectType={objectType} filter={f} onChange={v => setFilter(i, { value: v })} />
                  <button onClick={() => removeFilter(i)} className="btn btn-quiet btn-sm" style={{ padding: '.2rem .35rem' }}><Icon name="x" size={14} /></button>
                </div>
              );
            })}
          </div>
          <button onClick={addFilter} className="btn btn-ghost btn-sm" style={{ marginTop: '.7rem' }}><Icon name="plus" size={14} /> Add filter</button>
        </div>
      )}
    </div>
  );
}
