// Rally data grid. Sticky header, click-to-sort, a filter box, select-all +
// row checkboxes with a bulk-action bar, and optional inline edit (double
// click an editable cell). One component so every list view is consistent.
import React, { useMemo, useState } from 'react';
import { Icon } from './icons.jsx';
import { EmptyState } from './UI.jsx';

export default function DataTable({
  columns, rows, getId = (r) => r.id, onRowClick,
  searchable = true, searchKeys, searchPlaceholder = 'Filter...',
  initialSort, bulkActions = [], onEdit, rightControls, empty,
  maxHeight = '68vh',
}) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState(initialSort || null);
  const [selected, setSelected] = useState(() => new Set());
  const [editing, setEditing] = useState(null); // { id, key }
  const [draft, setDraft] = useState('');

  const filtered = useMemo(() => {
    let out = rows;
    const term = q.trim().toLowerCase();
    if (term) {
      const keys = searchKeys || columns.map(c => c.key);
      out = out.filter(r => keys.some(k => String(r[k] ?? (typeof columns.find(c => c.key === k)?.value === 'function' ? columns.find(c => c.key === k).value(r) : '')).toLowerCase().includes(term)));
    }
    if (sort) {
      const col = columns.find(c => c.key === sort.key);
      const val = (r) => (col?.sortValue ? col.sortValue(r) : r[sort.key]);
      out = [...out].sort((a, b) => {
        const av = val(a), bv = val(b);
        if (av == null) return 1; if (bv == null) return -1;
        if (typeof av === 'number' && typeof bv === 'number') return sort.dir === 'asc' ? av - bv : bv - av;
        return sort.dir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      });
    }
    return out;
  }, [rows, q, sort, columns, searchKeys]);

  const toggleSort = (key) => {
    setSort(s => (!s || s.key !== key) ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : null);
  };
  const allSel = filtered.length > 0 && filtered.every(r => selected.has(getId(r)));
  const toggleAll = () => {
    const next = new Set(selected);
    if (allSel) filtered.forEach(r => next.delete(getId(r)));
    else filtered.forEach(r => next.add(getId(r)));
    setSelected(next);
  };
  const toggleOne = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const clearSel = () => setSelected(new Set());

  const startEdit = (row, col) => {
    if (!col.editable || !onEdit) return;
    setEditing({ id: getId(row), key: col.key });
    setDraft(String(row[col.key] ?? ''));
  };
  const commitEdit = (row, col) => {
    if (editing) { onEdit(row, col.key, draft); setEditing(null); }
  };

  const hasBulk = bulkActions.length > 0;

  return (
    <div>
      {(searchable || rightControls) && (
        <div className="row gap-2 between wrap" style={{ marginBottom: '.85rem' }}>
          {searchable && (
            <div className="row gap-2" style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '.5rem .75rem', minWidth: 260, flex: '0 1 340px', color: 'var(--n-600)' }}>
              <Icon name="filter" size={16} />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder={searchPlaceholder}
                style={{ border: 'none', outline: 'none', background: 'transparent', flex: 1, fontSize: '.95rem' }} />
              {q && <button className="btn btn-quiet btn-sm" onClick={() => setQ('')} style={{ padding: '.1rem .35rem' }}><Icon name="x" size={14} /></button>}
            </div>
          )}
          <div className="row gap-2">{rightControls}</div>
        </div>
      )}

      {hasBulk && selected.size > 0 && (
        <div className="row gap-2 between fade-up" style={{ marginBottom: '.7rem', padding: '.55rem .9rem', background: 'var(--accent-50)', border: '1px solid var(--accent-300)', borderRadius: 'var(--r-sm)' }}>
          <span className="fw-6 t-sm">{selected.size} selected</span>
          <div className="row gap-2">
            {bulkActions.map((b, i) => (
              <button key={i} className="btn btn-ghost btn-sm" onClick={() => { b.onClick([...selected]); clearSel(); }}>{b.label}</button>
            ))}
            <button className="btn btn-quiet btn-sm" onClick={clearSel}>Clear</button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ maxHeight, overflow: 'auto' }}>
          <table className="table table-sticky">
            <thead>
              <tr>
                {hasBulk && (
                  <th style={{ width: 42, paddingRight: 0 }}>
                    <input type="checkbox" checked={allSel} onChange={toggleAll} style={{ cursor: 'pointer', width: 16, height: 16 }} />
                  </th>
                )}
                {columns.map(col => (
                  <th key={col.key} onClick={() => col.sortable !== false && toggleSort(col.key)}
                    className={col.sortable !== false ? 'th-sort' : ''}
                    style={{ width: col.width, textAlign: col.align || 'left' }}>
                    <span className="row gap-1" style={{ justifyContent: col.align === 'right' ? 'flex-end' : 'flex-start' }}>
                      {col.header}
                      {sort?.key === col.key && <Icon name={sort.dir === 'asc' ? 'arrowUp' : 'arrowDown'} size={13} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => {
                const id = getId(row);
                return (
                  <tr key={id} onClick={() => onRowClick && !editing && onRowClick(row)} style={{ cursor: onRowClick ? 'pointer' : 'default' }}>
                    {hasBulk && (
                      <td style={{ paddingRight: 0 }} onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selected.has(id)} onChange={() => toggleOne(id)} style={{ cursor: 'pointer', width: 16, height: 16 }} />
                      </td>
                    )}
                    {columns.map(col => {
                      const isEditing = editing && editing.id === id && editing.key === col.key;
                      return (
                        <td key={col.key} style={{ textAlign: col.align || 'left' }}
                          onDoubleClick={(e) => { e.stopPropagation(); startEdit(row, col); }}>
                          {isEditing ? (
                            <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
                              onClick={e => e.stopPropagation()}
                              onBlur={() => commitEdit(row, col)}
                              onKeyDown={e => { if (e.key === 'Enter') commitEdit(row, col); if (e.key === 'Escape') setEditing(null); }}
                              className="input" style={{ padding: '.3rem .5rem', fontSize: '.92rem' }} />
                          ) : (
                            col.render ? col.render(row) : (row[col.key] ?? '-')
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (empty || <EmptyState icon="🔍" title="Nothing here yet" body={q ? `No results for "${q}"` : 'Records will show up here.'} />)}
        </div>
      </div>
      <div className="t-xs muted" style={{ marginTop: '.6rem' }}>{filtered.length} of {rows.length}{onEdit ? ' - double-click a cell to edit' : ''}</div>
    </div>
  );
}
