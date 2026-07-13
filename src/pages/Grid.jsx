// ============================================================
// RALLY GRID  (the Airtable-killer, inside the CRM)
// Base > Table > Fields > Records, shown in switchable Views:
// a real spreadsheet-database with inline editing, 21 field types,
// a live formula/rollup/lookup engine, Kanban / Calendar / Gallery,
// filters (AND/OR) + multi-sort + group-by + search + CSV import.
//
// Pipedrive bolted on a weak table. Rally ships a full Airtable-class
// database linked to real deals and accounts. No CRM has this depth.
// NO em-dash or en-dash anywhere. ASCII hyphen only.
// ============================================================
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/icons.jsx';
import { Button, Badge, Modal, useToast } from '../components/UI.jsx';
import {
  useGridStore, getBases, getBase, findTable, setActiveBase, addBase, addTable, renameTable,
  addField, updateField, deleteField, reorderField, setFieldWidth, addRecord, duplicateRecord,
  deleteRecord, updateCell, addView, updateView, deleteView, addOption,
  FIELD_TYPES, fieldTypeMeta, isComputed, NUMERIC_TYPES, SELECT_COLORS, colorHex, chipStyle,
  COLLABORATORS, collaboratorName, computeCell, optionLabel, optionById, cellText, primaryText,
  visibleFields, viewRecords, groupRecords, opsForField, OP_LABEL, linkableTables,
  importCsv, exportCsv,
} from '../lib/grid-data.js';

const ROW_H = { short: 40, medium: 64, tall: 100 };
const VIEW_ICON = { grid: 'grid', kanban: 'columns', calendar: 'calendar', gallery: 'grid' };
const VIEW_LABEL = { grid: 'Grid', kanban: 'Kanban', calendar: 'Calendar', gallery: 'Gallery' };

const fmtNum = (n) => (n == null || n === '' ? '' : Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 }));
const fmtCurrency = (n) => (n == null || n === '' ? '' : '$' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 }));

function useOutside(ref, onOut, active) {
  useEffect(() => {
    if (!active) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onOut(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [active]);
}

/* Lightweight anchored popover menu: a trigger button + a floating panel. */
function Menu({ trigger, children, width = 300, align = 'left', onOpenChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutside(ref, () => { setOpen(false); onOpenChange && onOpenChange(false); }, open);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {React.cloneElement(trigger, { onClick: () => { setOpen(o => { const n = !o; onOpenChange && onOpenChange(n); return n; }); }, 'aria-expanded': open })}
      {open && (
        <div className="card fade-up" style={{ position: 'absolute', top: 'calc(100% + 6px)', [align]: 0, width, zIndex: 60, padding: '.6rem', boxShadow: 'var(--shadow-lg)', maxHeight: '70vh', overflow: 'auto' }}>
          {typeof children === 'function' ? children(() => setOpen(false)) : children}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   VALUE DISPLAY  (read-only render of a computed cell value)
   ============================================================ */
function ChipList({ field, ids, max }) {
  const list = (ids || []).slice(0, max || 99);
  return (
    <span className="row wrap" style={{ gap: 4, minWidth: 0 }}>
      {list.map(id => {
        const o = optionById(field, id); if (!o) return null;
        return <span key={id} className="badge" style={{ ...chipStyle(o.colorId), border: '1px solid', fontSize: '.78rem' }}>{o.label}</span>;
      })}
      {(ids || []).length > (max || 99) && <span className="t-xs muted">+{ids.length - max}</span>}
    </span>
  );
}

function Stars({ value = 0, onSet }) {
  return (
    <span className="row" style={{ gap: 1 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} onClick={onSet ? (e) => { e.stopPropagation(); onSet(i === value ? 0 : i); } : undefined}
          style={{ cursor: onSet ? 'pointer' : 'default', color: i <= value ? 'var(--warn)' : 'var(--n-200)', lineHeight: 1 }}>
          <Icon name="star" size={16} fill={i <= value ? 'currentColor' : 'none'} />
        </span>
      ))}
    </span>
  );
}

function Display({ table, record, field }) {
  const v = computeCell(table, record, field);
  switch (field.type) {
    case 'checkbox':
      return v ? <span style={{ color: 'var(--accent)' }}><Icon name="check" size={17} /></span> : <span className="muted t-sm">-</span>;
    case 'rating':
      return v ? <Stars value={v} /> : <span className="muted t-sm">-</span>;
    case 'singleSelect': {
      const o = optionById(field, v);
      return o ? <span className="badge" style={{ ...chipStyle(o.colorId), border: '1px solid', fontSize: '.8rem' }}>{o.label}</span> : <span className="muted t-sm">-</span>;
    }
    case 'multiSelect': return (v && v.length) ? <ChipList field={field} ids={v} /> : <span className="muted t-sm">-</span>;
    case 'user': {
      if (!v) return <span className="muted t-sm">-</span>;
      const name = collaboratorName(v);
      return <span className="row gap-1" style={{ minWidth: 0 }}><span className="avatar" style={{ width: 22, height: 22, fontSize: 10, background: 'var(--accent)' }}>{name.split(' ').map(w => w[0]).join('')}</span><span className="clip t-sm">{name}</span></span>;
    }
    case 'currency': return <span className="tnum fw-6">{fmtCurrency(v) || <span className="muted">-</span>}</span>;
    case 'percent': return <span className="tnum">{v || v === 0 ? fmtNum(v) + '%' : <span className="muted">-</span>}</span>;
    case 'number': return <span className="tnum">{v || v === 0 ? fmtNum(v) : <span className="muted">-</span>}</span>;
    case 'autonumber': return <span className="tnum muted">{v}</span>;
    case 'date': case 'createdTime':
      return v ? <span className="tnum t-sm">{new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span> : <span className="muted t-sm">-</span>;
    case 'url': return v ? <a href={String(v).startsWith('http') ? v : 'https://' + v} target="_blank" rel="noreferrer" className="link clip" onClick={e => e.stopPropagation()} style={{ display: 'inline-block', maxWidth: '100%' }}>{v}</a> : <span className="muted t-sm">-</span>;
    case 'email': return v ? <a href={'mailto:' + v} className="link clip" onClick={e => e.stopPropagation()} style={{ display: 'inline-block', maxWidth: '100%' }}>{v}</a> : <span className="muted t-sm">-</span>;
    case 'formula': {
      const numeric = typeof v === 'number';
      return <span className={numeric ? 'tnum' : ''} style={{ color: v === '#ERROR' || v === '#CYCLE' ? 'var(--risk)' : undefined }}>{numeric ? fmtNum(v) : (v || <span className="muted t-sm">-</span>)}</span>;
    }
    case 'rollup': {
      const linkField = table.fields.find(f => f.id === field.linkFieldId);
      const linked = linkField && findTable(linkField.linkTableId);
      const target = linked && linked.fields.find(f => f.id === field.rollupFieldId);
      const money = target && target.type === 'currency';
      if (field.rollupFn === 'concat') return <span className="t-sm clip">{v || '-'}</span>;
      return <span className="tnum fw-6">{money ? fmtCurrency(v) : fmtNum(v)}</span>;
    }
    case 'lookup': return (v && v.length) ? <span className="row wrap" style={{ gap: 4 }}>{v.map((x, i) => <span key={i} className="badge" style={{ fontSize: '.76rem' }}>{String(x)}</span>)}</span> : <span className="muted t-sm">-</span>;
    case 'link': {
      const lt = findTable(field.linkTableId);
      return (v && v.length) ? <span className="row wrap" style={{ gap: 4 }}>{v.map(id => <span key={id} className="badge badge-accent" style={{ fontSize: '.76rem' }}><Icon name="link" size={11} />{primaryText(lt, id) || 'Record'}</span>)}</span> : <span className="muted t-sm">-</span>;
    }
    case 'attachment': return (v && v.length) ? <span className="row wrap" style={{ gap: 4 }}>{v.map((a, i) => <span key={i} className="badge" style={{ fontSize: '.74rem' }}><Icon name="inbox" size={11} />{a.name}</span>)}</span> : <span className="muted t-sm">-</span>;
    case 'longText': return <span className="clip2" style={{ whiteSpace: 'pre-wrap' }}>{v || <span className="muted t-sm">-</span>}</span>;
    default: return <span className="clip">{v == null || v === '' ? <span className="muted t-sm">-</span> : String(v)}</span>;
  }
}

/* ============================================================
   INLINE CELL EDITORS
   ============================================================ */
function SelectPopover({ table, field, value, multi, onChange, onClose }) {
  const ref = useRef(null);
  useOutside(ref, onClose, true);
  const [q, setQ] = useState('');
  const [nameNew, setNameNew] = useState('');
  const selected = multi ? (value || []) : (value ? [value] : []);
  const toggle = (id) => {
    if (multi) { const s = new Set(value || []); s.has(id) ? s.delete(id) : s.add(id); onChange([...s]); }
    else { onChange(id === value ? null : id); onClose(); }
  };
  const filtered = (field.options || []).filter(o => o.label.toLowerCase().includes(q.toLowerCase()));
  const createOpt = () => { const o = addOption(table.id, field.id, nameNew.trim()); setNameNew(''); toggle(o.id); };
  return (
    <div ref={ref} className="card fade-up" style={{ position: 'absolute', top: '100%', left: 0, minWidth: 240, zIndex: 50, padding: '.5rem', boxShadow: 'var(--shadow-lg)' }}>
      <input className="input" autoFocus placeholder="Find an option" value={q} onChange={e => setQ(e.target.value)} style={{ marginBottom: 6, padding: '.45rem .6rem' }} />
      <div className="col gap-1" style={{ maxHeight: 220, overflow: 'auto' }}>
        {filtered.map(o => (
          <button key={o.id} className="row between btn btn-quiet" style={{ justifyContent: 'space-between', padding: '.35rem .5rem' }} onClick={() => toggle(o.id)}>
            <span className="badge" style={{ ...chipStyle(o.colorId), border: '1px solid' }}>{o.label}</span>
            {selected.includes(o.id) && <Icon name="check" size={15} />}
          </button>
        ))}
        {!filtered.length && <div className="t-xs muted" style={{ padding: '.3rem .5rem' }}>No matches</div>}
      </div>
      <div className="row gap-1" style={{ marginTop: 6, borderTop: '1px solid var(--line)', paddingTop: 6 }}>
        <input className="input" placeholder="New option" value={nameNew} onChange={e => setNameNew(e.target.value)} onKeyDown={e => e.key === 'Enter' && nameNew.trim() && createOpt()} style={{ padding: '.4rem .55rem' }} />
        <Button size="sm" variant="ghost" disabled={!nameNew.trim()} onClick={createOpt}><Icon name="plus" size={14} /></Button>
      </div>
    </div>
  );
}

function UserPopover({ value, onChange, onClose }) {
  const ref = useRef(null);
  useOutside(ref, onClose, true);
  return (
    <div ref={ref} className="card fade-up" style={{ position: 'absolute', top: '100%', left: 0, minWidth: 220, zIndex: 50, padding: '.4rem', boxShadow: 'var(--shadow-lg)' }}>
      <button className="btn btn-quiet row" style={{ width: '100%', justifyContent: 'flex-start', padding: '.4rem .5rem' }} onClick={() => { onChange(null); onClose(); }}>
        <span className="muted t-sm">Clear</span>
      </button>
      {COLLABORATORS.map(u => (
        <button key={u.id} className="btn btn-quiet row gap-1" style={{ width: '100%', justifyContent: 'flex-start', padding: '.4rem .5rem' }} onClick={() => { onChange(u.id); onClose(); }}>
          <span className="avatar" style={{ width: 22, height: 22, fontSize: 10, background: 'var(--accent)' }}>{u.name.split(' ').map(w => w[0]).join('')}</span>
          <span className="t-sm">{u.name}</span>
          {value === u.id && <span className="spacer" />}
          {value === u.id && <Icon name="check" size={14} />}
        </button>
      ))}
    </div>
  );
}

function LinkPopover({ field, value, onChange, onClose }) {
  const ref = useRef(null);
  useOutside(ref, onClose, true);
  const [q, setQ] = useState('');
  const lt = findTable(field.linkTableId);
  const selected = new Set(value || []);
  if (!lt) return null;
  const rows = lt.records.filter(r => primaryText(lt, r.id).toLowerCase().includes(q.toLowerCase())).slice(0, 40);
  const toggle = (id) => { const s = new Set(value || []); s.has(id) ? s.delete(id) : s.add(id); onChange([...s]); };
  return (
    <div ref={ref} className="card fade-up" style={{ position: 'absolute', top: '100%', left: 0, minWidth: 280, zIndex: 50, padding: '.5rem', boxShadow: 'var(--shadow-lg)' }}>
      <div className="t-xs muted" style={{ marginBottom: 4 }}>Link to {lt.name}</div>
      <input className="input" autoFocus placeholder={'Search ' + lt.name} value={q} onChange={e => setQ(e.target.value)} style={{ marginBottom: 6, padding: '.45rem .6rem' }} />
      <div className="col gap-1" style={{ maxHeight: 240, overflow: 'auto' }}>
        {rows.map(r => (
          <button key={r.id} className="btn btn-quiet row between" style={{ padding: '.35rem .5rem', justifyContent: 'space-between' }} onClick={() => toggle(r.id)}>
            <span className="t-sm clip">{primaryText(lt, r.id) || 'Untitled'}</span>
            {selected.has(r.id) && <Icon name="check" size={15} />}
          </button>
        ))}
      </div>
    </div>
  );
}

/* A single grid cell: displays the value and switches to an editor on click. */
function GridCell({ table, record, field, height, primary, onExpand }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const readOnly = isComputed(field.type);
  const set = (val) => updateCell(table.id, record.id, field.id, val);

  const startText = () => { setDraft(computeCell(table, record, field) ?? ''); setEditing(true); };
  const commitText = () => {
    let v = draft;
    if (NUMERIC_TYPES.has(field.type)) v = draft === '' ? '' : Number(draft);
    set(v); setEditing(false);
  };

  const isTextType = ['text', 'longText', 'number', 'currency', 'percent', 'url', 'email', 'phone'].includes(field.type);

  const onCellClick = (e) => {
    if (readOnly) return;
    if (field.type === 'checkbox') { set(!computeCell(table, record, field)); return; }
    if (isTextType) { startText(); return; }
    setEditing(true);
  };

  return (
    <div
      onClick={onCellClick}
      title={readOnly ? 'Computed field' : undefined}
      style={{ position: 'relative', height, display: 'flex', alignItems: field.type === 'longText' ? 'flex-start' : 'center', padding: field.type === 'longText' ? '.4rem .6rem' : '0 .6rem', cursor: readOnly ? 'default' : 'text', overflow: 'hidden', width: '100%' }}
    >
      {editing && isTextType ? (
        field.type === 'longText' ? (
          <textarea autoFocus className="textarea" value={draft} onChange={e => setDraft(e.target.value)} onBlur={commitText}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commitText(); if (e.key === 'Escape') setEditing(false); }}
            style={{ position: 'absolute', inset: 0, zIndex: 20, resize: 'none', borderRadius: 0, border: '2px solid var(--accent)', padding: '.4rem .6rem', minHeight: Math.max(height, 80) }} />
        ) : (
          <input autoFocus className="input" type={field.type === 'number' || field.type === 'currency' || field.type === 'percent' ? 'number' : 'text'}
            value={draft} onChange={e => setDraft(e.target.value)} onBlur={commitText}
            onKeyDown={e => { if (e.key === 'Enter') commitText(); if (e.key === 'Escape') setEditing(false); }}
            style={{ position: 'absolute', inset: 0, zIndex: 20, borderRadius: 0, border: '2px solid var(--accent)', padding: '0 .55rem' }} />
        )
      ) : (
        <span style={{ minWidth: 0, width: '100%', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
          <Display table={table} record={record} field={field} />
        </span>
      )}

      {field.type === 'rating' && !readOnly && !editing && (
        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 .6rem' }}>
          <Stars value={computeCell(table, record, field) || 0} onSet={set} />
        </span>
      )}
      {editing && field.type === 'date' && (
        <input autoFocus type="date" className="input" defaultValue={computeCell(table, record, field) || ''}
          onChange={e => { set(e.target.value); }} onBlur={() => setEditing(false)}
          onKeyDown={e => e.key === 'Escape' && setEditing(false)}
          style={{ position: 'absolute', inset: 0, zIndex: 20, borderRadius: 0, border: '2px solid var(--accent)', padding: '0 .55rem' }} />
      )}
      {editing && (field.type === 'singleSelect' || field.type === 'multiSelect') && (
        <SelectPopover table={table} field={field} multi={field.type === 'multiSelect'} value={computeCell(table, record, field)} onChange={set} onClose={() => setEditing(false)} />
      )}
      {editing && field.type === 'user' && (
        <UserPopover value={computeCell(table, record, field)} onChange={set} onClose={() => setEditing(false)} />
      )}
      {editing && field.type === 'link' && (
        <LinkPopover field={field} value={computeCell(table, record, field)} onChange={set} onClose={() => setEditing(false)} />
      )}
      {editing && field.type === 'attachment' && (() => {
        const cur = computeCell(table, record, field) || [];
        set([...cur, { name: 'file-' + (cur.length + 1) + '.pdf' }]); setEditing(false); return null;
      })()}

      {primary && (
        <button className="reveal" onClick={(e) => { e.stopPropagation(); onExpand(); }} title="Expand record"
          style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', zIndex: 10, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 6, padding: '.15rem .3rem', cursor: 'pointer', color: 'var(--n-600)' }}>
          <Icon name="eye" size={14} />
        </button>
      )}
    </div>
  );
}

/* ============================================================
   FIELD EDITOR MODAL  (create / edit a field of any type)
   ============================================================ */
function FieldEditor({ table, field, onClose }) {
  const editing = !!field;
  const [name, setName] = useState(field?.name || '');
  const [type, setType] = useState(field?.type || 'text');
  const [options, setOptions] = useState(field?.options ? field.options.map(o => ({ ...o })) : [{ id: 'n1', label: 'Option 1', colorId: 'blue' }, { id: 'n2', label: 'Option 2', colorId: 'teal' }]);
  const [formula, setFormula] = useState(field?.formula || '');
  const [linkTableId, setLinkTableId] = useState(field?.linkTableId || '');
  const [linkFieldId, setLinkFieldId] = useState(field?.linkFieldId || '');
  const [rollupFieldId, setRollupFieldId] = useState(field?.rollupFieldId || '');
  const [rollupFn, setRollupFn] = useState(field?.rollupFn || 'sum');
  const [lookupFieldId, setLookupFieldId] = useState(field?.lookupFieldId || '');
  const toast = useToast();

  const linkFieldsInTable = table.fields.filter(f => f.type === 'link');
  const chosenLinkField = table.fields.find(f => f.id === linkFieldId);
  const linkedTable = chosenLinkField && findTable(chosenLinkField.linkTableId);

  const save = () => {
    if (!name.trim()) return toast('Field name is required', 'risk');
    const patch = { name: name.trim(), type };
    if (type === 'singleSelect' || type === 'multiSelect') patch.options = options.map((o, i) => ({ id: o.id?.startsWith('opt_') ? o.id : ('opt_' + Date.now() + '_' + i), label: o.label, colorId: o.colorId }));
    if (type === 'formula') patch.formula = formula;
    if (type === 'link') patch.linkTableId = linkTableId || null;
    if (type === 'rollup') { patch.linkFieldId = linkFieldId || null; patch.rollupFieldId = rollupFieldId || null; patch.rollupFn = rollupFn; }
    if (type === 'lookup') { patch.linkFieldId = linkFieldId || null; patch.lookupFieldId = lookupFieldId || null; }
    if (editing) updateField(table.id, field.id, patch);
    else addField(table.id, patch);
    onClose();
  };

  const setOpt = (i, k, v) => setOptions(os => os.map((o, idx) => (idx === i ? { ...o, [k]: v } : o)));
  const grouped = useMemo(() => {
    const g = {}; for (const t of FIELD_TYPES) { (g[t.group] = g[t.group] || []).push(t); } return g;
  }, []);

  // Live formula preview against the first record.
  const preview = useMemo(() => {
    if (type !== 'formula' || !table.records.length) return '';
    try {
      const tmp = { ...field, id: 'preview', type: 'formula', formula };
      const fakeTable = { ...table, fields: [...table.fields.filter(f => f.id !== field?.id), tmp] };
      const v = computeCell(fakeTable, table.records[0], tmp);
      return typeof v === 'number' ? fmtNum(v) : String(v);
    } catch { return '#ERROR'; }
  }, [type, formula]);

  return (
    <Modal open onClose={onClose} title={editing ? 'Edit field' : 'New field'} width={560}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>{editing ? 'Save field' : 'Create field'}</Button></>}>
      <div className="col gap-3">
        <div className="field">
          <label>Field name</label>
          <input className="input" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Deal value" />
        </div>
        <div className="field">
          <label>Type</label>
          <select className="select" value={type} onChange={e => setType(e.target.value)} disabled={editing && isComputed(field.type) && field.type !== type && false}>
            {Object.entries(grouped).map(([g, ts]) => (
              <optgroup key={g} label={g}>{ts.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</optgroup>
            ))}
          </select>
        </div>

        {(type === 'singleSelect' || type === 'multiSelect') && (
          <div className="field">
            <label>Options</label>
            <div className="col gap-1">
              {options.map((o, i) => (
                <div key={i} className="row gap-1">
                  <select className="select" value={o.colorId} onChange={e => setOpt(i, 'colorId', e.target.value)} style={{ width: 120 }}>
                    {SELECT_COLORS.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
                  </select>
                  <input className="input" value={o.label} onChange={e => setOpt(i, 'label', e.target.value)} />
                  <Button size="sm" variant="quiet" onClick={() => setOptions(os => os.filter((_, idx) => idx !== i))}><Icon name="x" size={15} /></Button>
                </div>
              ))}
              <Button size="sm" variant="ghost" onClick={() => setOptions(os => [...os, { id: 'n' + os.length, label: 'Option ' + (os.length + 1), colorId: SELECT_COLORS[os.length % SELECT_COLORS.length].id }])}><Icon name="plus" size={14} /> Add option</Button>
            </div>
          </div>
        )}

        {type === 'formula' && (
          <div className="field">
            <label>Formula</label>
            <textarea className="textarea" rows={3} value={formula} onChange={e => setFormula(e.target.value)} placeholder="{Value} * {Probability} / 100" style={{ fontFamily: 'var(--font-mono)', fontSize: '.9rem' }} />
            <div className="row wrap gap-1" style={{ marginTop: 6 }}>
              {table.fields.filter(f => f.id !== field?.id).slice(0, 8).map(f => (
                <button key={f.id} className="badge" style={{ cursor: 'pointer' }} onClick={() => setFormula(s => s + '{' + f.name + '}')}>{'{' + f.name + '}'}</button>
              ))}
            </div>
            <div className="t-xs muted" style={{ marginTop: 6 }}>Functions: IF, CONCAT, SUM, ROUND, ABS, MIN, MAX, AVERAGE, LEN, UPPER, LOWER. Operators: + - * / % & = &lt; &gt;</div>
            {formula.trim() && <div className="t-sm" style={{ marginTop: 6 }}>Preview (row 1): <strong className="mono">{preview}</strong></div>}
          </div>
        )}

        {type === 'link' && (
          <div className="field">
            <label>Linked table</label>
            <select className="select" value={linkTableId} onChange={e => setLinkTableId(e.target.value)}>
              <option value="">Select a table</option>
              {linkableTables(table.id).map(t => <option key={t.id} value={t.id}>{t.baseName} / {t.name}</option>)}
            </select>
          </div>
        )}

        {(type === 'rollup' || type === 'lookup') && (
          <>
            <div className="field">
              <label>Through link field</label>
              <select className="select" value={linkFieldId} onChange={e => { setLinkFieldId(e.target.value); setRollupFieldId(''); setLookupFieldId(''); }}>
                <option value="">Select a link field</option>
                {linkFieldsInTable.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              {!linkFieldsInTable.length && <span className="t-xs" style={{ color: 'var(--warn)' }}>Add a Linked record field first.</span>}
            </div>
            {linkedTable && (
              <div className="field">
                <label>{type === 'rollup' ? 'Roll up field' : 'Look up field'} (from {linkedTable.name})</label>
                <select className="select" value={type === 'rollup' ? rollupFieldId : lookupFieldId} onChange={e => (type === 'rollup' ? setRollupFieldId(e.target.value) : setLookupFieldId(e.target.value))}>
                  <option value="">Select a field</option>
                  {linkedTable.fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            )}
            {type === 'rollup' && (
              <div className="field">
                <label>Aggregate</label>
                <select className="select" value={rollupFn} onChange={e => setRollupFn(e.target.value)}>
                  {['sum', 'avg', 'min', 'max', 'count', 'concat'].map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

/* ============================================================
   RECORD EXPAND MODAL
   ============================================================ */
function RecordExpand({ table, record, onClose }) {
  useGridStore();
  const fresh = findTable(table.id);
  const rec = fresh.records.find(r => r.id === record.id) || record;
  return (
    <Modal open onClose={onClose} title={primaryText(fresh, rec.id) || 'Record'} width={620}
      footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
      <div className="col gap-3">
        {fresh.fields.map(f => (
          <div key={f.id} className="col gap-1">
            <div className="row gap-1" style={{ color: 'var(--n-600)' }}>
              <Icon name={fieldTypeMeta(f.type).icon} size={14} />
              <span className="t-sm fw-6">{f.name}</span>
              {isComputed(f.type) && <Badge className="t-xs">computed</Badge>}
            </div>
            <div className="panel" style={{ minHeight: 44, padding: 0, position: 'relative', display: 'flex', alignItems: 'center' }}>
              <GridCell table={fresh} record={rec} field={f} height={f.type === 'longText' ? 90 : 44} />
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

/* ============================================================
   GRID VIEW
   ============================================================ */
function GridView({ table, view, search, onExpand, onEditField, onNewField }) {
  const fields = visibleFields(table, view);
  const height = ROW_H[view.rowHeight || 'short'];
  const records = viewRecords(table, view, search);
  const groups = view.groupByFieldId ? groupRecords(table, records, view.groupByFieldId) : [{ key: '__all', label: '', records }];
  const resizing = useRef(null);

  const onResizeStart = (e, field) => {
    e.preventDefault(); e.stopPropagation();
    resizing.current = { field, startX: e.clientX, startW: field.width || 168 };
    const move = (ev) => { if (!resizing.current) return; const dw = ev.clientX - resizing.current.startX; setFieldWidth(table.id, field.id, resizing.current.startW + dw); };
    const up = () => { resizing.current = null; document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
  };

  const primaryId = table.primaryFieldId;
  const GUTTER = 52;
  const firstW = (fields.find(f => f.id === primaryId)?.width) || 180;

  const HeaderCell = ({ f, i }) => (
    <div className="rg-th" style={{ width: f.width || 168, position: f.id === primaryId ? 'sticky' : 'static', left: f.id === primaryId ? GUTTER : undefined, zIndex: f.id === primaryId ? 6 : 4 }}>
      <span className="row gap-1" style={{ minWidth: 0, flex: 1 }}>
        <Icon name={fieldTypeMeta(f.type).icon} size={13} className="muted" />
        <span className="clip fw-6 t-sm">{f.name}</span>
      </span>
      <Menu align="right" width={210} trigger={<button className="rg-thbtn" aria-label="Field menu"><Icon name="chevronDown" size={14} /></button>}>
        {(close) => (
          <div className="col gap-1">
            <button className="btn btn-quiet row gap-1" style={{ justifyContent: 'flex-start' }} onClick={() => { onEditField(f); close(); }}><Icon name="edit" size={15} /> Edit field</button>
            <button className="btn btn-quiet row gap-1" style={{ justifyContent: 'flex-start' }} onClick={() => { updateView(table.id, view.id, { sorts: [{ fieldId: f.id, dir: 'asc' }] }); close(); }}><Icon name="arrowUp" size={15} /> Sort A to Z</button>
            <button className="btn btn-quiet row gap-1" style={{ justifyContent: 'flex-start' }} onClick={() => { updateView(table.id, view.id, { sorts: [{ fieldId: f.id, dir: 'desc' }] }); close(); }}><Icon name="arrowDown" size={15} /> Sort Z to A</button>
            {f.type === 'singleSelect' && <button className="btn btn-quiet row gap-1" style={{ justifyContent: 'flex-start' }} onClick={() => { updateView(table.id, view.id, { groupByFieldId: f.id }); close(); }}><Icon name="layers" size={15} /> Group by this</button>}
            {i > 0 && <button className="btn btn-quiet row gap-1" style={{ justifyContent: 'flex-start' }} onClick={() => { reorderField(table.id, f.id, table.fields.findIndex(x => x.id === f.id) - 1); close(); }}><Icon name="arrowLeft" size={15} /> Move left</button>}
            <button className="btn btn-quiet row gap-1" style={{ justifyContent: 'flex-start' }} onClick={() => { updateView(table.id, view.id, { hiddenFieldIds: [...(view.hiddenFieldIds || []), f.id] }); close(); }}><Icon name="eyeOff" size={15} /> Hide field</button>
            {f.id !== primaryId && <button className="btn btn-quiet row gap-1" style={{ justifyContent: 'flex-start', color: 'var(--risk)' }} onClick={() => { if (confirm('Delete field "' + f.name + '"?')) deleteField(table.id, f.id); close(); }}><Icon name="trash" size={15} /> Delete field</button>}
          </div>
        )}
      </Menu>
      {f.id !== '__none' && <span className="rg-resize" onMouseDown={(e) => onResizeStart(e, f)} />}
    </div>
  );

  return (
    <div className="rg-scroll">
      <div className="rg-inner">
        {/* header row */}
        <div className="rg-row rg-head">
          <div className="rg-gutter rg-th" style={{ width: GUTTER, position: 'sticky', left: 0, zIndex: 7 }}>
            <span className="t-xs muted">{records.length}</span>
          </div>
          {fields.map((f, i) => <HeaderCell key={f.id} f={f} i={i} />)}
          <div className="rg-th rg-addcol" style={{ width: 46 }}>
            <button className="rg-thbtn" onClick={onNewField} title="Add field"><Icon name="plus" size={16} /></button>
          </div>
        </div>

        {groups.map(g => (
          <React.Fragment key={g.key}>
            {view.groupByFieldId && (
              <div className="rg-grouphead" style={{ left: 0 }}>
                <span className="badge" style={g.colorId ? { ...chipStyle(g.colorId), border: '1px solid' } : {}}>{g.label || 'Empty'}</span>
                <span className="t-xs muted">{g.records.length}</span>
              </div>
            )}
            {g.records.map(r => (
              <div className="rg-row rg-body" key={r.id} style={{ height }}>
                <div className="rg-gutter" style={{ width: GUTTER, position: 'sticky', left: 0, zIndex: 3 }}>
                  <span className="rg-rownum t-xs muted">{r.seq}</span>
                  <Menu align="left" width={190} trigger={<button className="rg-rowbtn reveal" aria-label="Row menu"><Icon name="chevronDown" size={13} /></button>}>
                    {(close) => (
                      <div className="col gap-1">
                        <button className="btn btn-quiet row gap-1" style={{ justifyContent: 'flex-start' }} onClick={() => { onExpand(r); close(); }}><Icon name="eye" size={15} /> Expand</button>
                        <button className="btn btn-quiet row gap-1" style={{ justifyContent: 'flex-start' }} onClick={() => { duplicateRecord(table.id, r.id); close(); }}><Icon name="copy" size={15} /> Duplicate</button>
                        <button className="btn btn-quiet row gap-1" style={{ justifyContent: 'flex-start', color: 'var(--risk)' }} onClick={() => { deleteRecord(table.id, r.id); close(); }}><Icon name="trash" size={15} /> Delete</button>
                      </div>
                    )}
                  </Menu>
                </div>
                {fields.map(f => (
                  <div className="rg-cell" key={f.id} style={{ width: f.width || 168, position: f.id === primaryId ? 'sticky' : 'static', left: f.id === primaryId ? GUTTER : undefined, zIndex: f.id === primaryId ? 2 : 1, background: f.id === primaryId ? 'var(--paper)' : undefined }}>
                    <GridCell table={table} record={r} field={f} height={height} primary={f.id === primaryId} onExpand={() => onExpand(r)} />
                  </div>
                ))}
                <div className="rg-cell rg-addcol" style={{ width: 46 }} />
              </div>
            ))}
          </React.Fragment>
        ))}

        <div className="rg-row rg-add" onClick={() => addRecord(table.id, {})}>
          <div className="rg-gutter" style={{ width: GUTTER, position: 'sticky', left: 0, zIndex: 3 }}><Icon name="plus" size={16} className="muted" /></div>
          <div className="rg-cell" style={{ padding: '0 .6rem', color: 'var(--n-600)' }}>New record</div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   KANBAN VIEW  (drag between single-select stacks)
   ============================================================ */
function KanbanView({ table, view, search, onExpand }) {
  const records = viewRecords(table, view, search);
  const field = table.fields.find(f => f.id === view.groupFieldId) || table.fields.find(f => f.type === 'singleSelect');
  const groups = groupRecords(table, records, field?.id);
  const canDrag = field && field.type === 'singleSelect';
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);
  const shown = visibleFields(table, view).filter(f => f.id !== table.primaryFieldId && f.id !== field?.id).slice(0, 3);

  if (!field) return <div className="card card-pad muted">Add a single select field to use the Kanban board.</div>;

  const drop = (key) => {
    if (!canDrag || !drag) return;
    const optId = key === '__empty' ? null : key;
    updateCell(table.id, drag, field.id, optId);
    setDrag(null); setOver(null);
  };

  return (
    <div className="rg-kb">
      {groups.map(g => (
        <div key={g.key} className={'rg-kbcol' + (over === g.key ? ' over' : '')}
          onDragOver={e => { if (canDrag) { e.preventDefault(); setOver(g.key); } }}
          onDragLeave={() => setOver(o => (o === g.key ? null : o))}
          onDrop={() => drop(g.key)}>
          <div className="row between" style={{ padding: '.2rem .2rem .6rem' }}>
            <span className="badge" style={g.colorId ? { ...chipStyle(g.colorId), border: '1px solid' } : {}}>{g.label || 'Empty'}</span>
            <span className="t-xs muted">{g.records.length}</span>
          </div>
          <div className="col gap-2">
            {g.records.map(r => (
              <div key={r.id} className="card kb-card" draggable={canDrag}
                onDragStart={() => setDrag(r.id)} onDragEnd={() => { setDrag(null); setOver(null); }}
                onClick={() => onExpand(r)}
                style={{ padding: '.7rem .8rem', cursor: canDrag ? 'grab' : 'pointer', opacity: drag === r.id ? .5 : 1 }}>
                <div className="fw-6 clip" style={{ marginBottom: shown.length ? 6 : 0 }}>{primaryText(table, r.id) || 'Untitled'}</div>
                <div className="col gap-1">
                  {shown.map(f => {
                    const val = computeCell(table, r, f);
                    const empty = val == null || val === '' || (Array.isArray(val) && !val.length);
                    if (empty) return null;
                    return <div key={f.id} className="row gap-1" style={{ minWidth: 0 }}><span className="t-xs muted" style={{ minWidth: 74 }}>{f.name}</span><span style={{ minWidth: 0, overflow: 'hidden' }}><Display table={table} record={r} field={f} /></span></div>;
                  })}
                </div>
              </div>
            ))}
          </div>
          {canDrag && (
            <button className="btn btn-quiet t-sm row gap-1" style={{ marginTop: 8, width: '100%', justifyContent: 'flex-start' }}
              onClick={() => addRecord(table.id, { [field.id]: g.key === '__empty' ? null : g.key })}>
              <Icon name="plus" size={14} /> Add
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   CALENDAR VIEW
   ============================================================ */
function CalendarView({ table, view, search, onExpand }) {
  const dateField = table.fields.find(f => f.id === view.dateFieldId) || table.fields.find(f => f.type === 'date' || f.type === 'createdTime');
  const [cursor, setCursor] = useState(() => new Date(2026, 6, 1));
  const records = viewRecords(table, view, search);
  if (!dateField) return <div className="card card-pad muted">Add a date field to use the Calendar view.</div>;

  const byDay = new Map();
  for (const r of records) {
    const v = computeCell(table, r, dateField);
    if (!v) continue;
    const key = new Date(v).toISOString().slice(0, 10);
    (byDay.get(key) || byDay.set(key, []).get(key)).push(r);
  }
  const y = cursor.getFullYear(), m = cursor.getMonth();
  const first = new Date(y, m, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const monthName = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="row between" style={{ padding: '.9rem 1.1rem', borderBottom: '1px solid var(--line)' }}>
        <div className="row gap-1">
          <button className="btn btn-ghost btn-sm" onClick={() => setCursor(new Date(y, m - 1, 1))}><Icon name="arrowLeft" size={15} /></button>
          <button className="btn btn-ghost btn-sm" onClick={() => setCursor(new Date(y, m + 1, 1))}><Icon name="arrowRight" size={15} /></button>
          <strong style={{ marginLeft: 8 }}>{monthName}</strong>
        </div>
        <span className="t-sm muted">on {dateField.name}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="t-xs fw-6 muted" style={{ padding: '.5rem .6rem', textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '1px solid var(--line)' }}>{d}</div>)}
        {cells.map((date, i) => {
          const key = date && date.toISOString().slice(0, 10);
          const recs = key ? (byDay.get(key) || []) : [];
          return (
            <div key={i} style={{ minHeight: 108, borderRight: (i % 7 !== 6) ? '1px solid var(--line)' : 'none', borderBottom: '1px solid var(--line)', padding: '.35rem', background: date ? 'transparent' : 'var(--n-25)' }}>
              {date && <div className="t-xs" style={{ fontWeight: key === todayKey ? 800 : 600, color: key === todayKey ? 'var(--accent)' : 'var(--n-600)', marginBottom: 3 }}>{date.getDate()}</div>}
              <div className="col gap-1">
                {recs.slice(0, 4).map(r => (
                  <button key={r.id} onClick={() => onExpand(r)} className="clip" style={{ textAlign: 'left', border: 'none', cursor: 'pointer', background: 'var(--accent-50)', color: 'var(--accent-700)', borderRadius: 6, padding: '.2rem .4rem', fontSize: '.78rem', fontWeight: 600 }}>
                    {primaryText(table, r.id) || 'Untitled'}
                  </button>
                ))}
                {recs.length > 4 && <span className="t-xs muted">+{recs.length - 4} more</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   GALLERY VIEW
   ============================================================ */
function GalleryView({ table, view, search, onExpand }) {
  const records = viewRecords(table, view, search);
  const fields = visibleFields(table, view).filter(f => f.id !== table.primaryFieldId).slice(0, 5);
  return (
    <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
      {records.map(r => (
        <div key={r.id} className="card card-hover" style={{ padding: 0, cursor: 'pointer', overflow: 'hidden' }} onClick={() => onExpand(r)}>
          <div style={{ height: 84, background: 'linear-gradient(120deg, var(--accent-700), var(--accent) 55%, var(--accent-teal))', display: 'flex', alignItems: 'flex-end', padding: '.7rem .9rem' }}>
            <span className="fw-7" style={{ color: '#fff', fontSize: '1.05rem' }} >{primaryText(table, r.id) || 'Untitled'}</span>
          </div>
          <div className="col gap-2" style={{ padding: '.9rem' }}>
            {fields.map(f => {
              const val = computeCell(table, r, f);
              const empty = val == null || val === '' || (Array.isArray(val) && !val.length);
              return (
                <div key={f.id} className="col gap-1">
                  <span className="t-xs muted" style={{ textTransform: 'uppercase', letterSpacing: '.04em' }}>{f.name}</span>
                  {empty ? <span className="muted t-sm">-</span> : <span><Display table={table} record={r} field={f} /></span>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   TOOLBAR MENUS
   ============================================================ */
function FieldsMenu({ table, view }) {
  const hidden = new Set(view.hiddenFieldIds || []);
  const toggle = (id) => {
    const s = new Set(view.hiddenFieldIds || []);
    s.has(id) ? s.delete(id) : s.add(id);
    updateView(table.id, view.id, { hiddenFieldIds: [...s] });
  };
  return (
    <Menu width={260} trigger={<button className="btn btn-ghost btn-sm"><Icon name="eyeOff" size={15} /> Fields{hidden.size ? ' (' + hidden.size + ')' : ''}</button>}>
      <div className="col gap-1">
        <div className="t-xs muted" style={{ padding: '.2rem .4rem' }}>Toggle visibility</div>
        {table.fields.map(f => (
          <button key={f.id} className="btn btn-quiet row between" style={{ justifyContent: 'space-between', padding: '.35rem .5rem' }} onClick={() => f.id !== table.primaryFieldId && toggle(f.id)} disabled={f.id === table.primaryFieldId}>
            <span className="row gap-1"><Icon name={fieldTypeMeta(f.type).icon} size={14} className="muted" /><span className="t-sm">{f.name}</span></span>
            <span className={'switch' + (!hidden.has(f.id) ? ' on' : '')} style={{ width: 34, height: 20 }} />
          </button>
        ))}
      </div>
    </Menu>
  );
}

function FilterMenu({ table, view }) {
  const filter = view.filter || { conjunction: 'and', conditions: [] };
  const set = (next) => updateView(table.id, view.id, { filter: next.conditions.length ? next : null });
  const addCond = () => set({ ...filter, conditions: [...filter.conditions, { fieldId: table.fields[0].id, op: opsForField(table.fields[0])[0], value: '' }] });
  const upd = (i, patch) => set({ ...filter, conditions: filter.conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) });
  const del = (i) => set({ ...filter, conditions: filter.conditions.filter((_, idx) => idx !== i) });
  const count = filter.conditions.length;
  return (
    <Menu width={440} trigger={<button className={'btn btn-sm ' + (count ? 'btn-primary' : 'btn-ghost')}><Icon name="filter" size={15} /> Filter{count ? ' (' + count + ')' : ''}</button>}>
      <div className="col gap-2">
        {!count && <div className="t-sm muted" style={{ padding: '.2rem .4rem' }}>No filters. Add one to narrow this view.</div>}
        {filter.conditions.map((c, i) => {
          const field = table.fields.find(f => f.id === c.fieldId);
          const ops = opsForField(field);
          const needsVal = !['isEmpty', 'isNotEmpty'].includes(c.op);
          return (
            <div key={i} className="row gap-1" style={{ alignItems: 'center' }}>
              <span className="t-xs muted" style={{ width: 44 }}>{i === 0 ? 'Where' : <select className="select" value={filter.conjunction} onChange={e => set({ ...filter, conjunction: e.target.value })} style={{ padding: '.2rem', fontSize: '.8rem' }}><option value="and">and</option><option value="or">or</option></select>}</span>
              <select className="select" value={c.fieldId} onChange={e => { const nf = table.fields.find(x => x.id === e.target.value); upd(i, { fieldId: e.target.value, op: opsForField(nf)[0], value: '' }); }} style={{ flex: 1, padding: '.4rem' }}>
                {table.fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <select className="select" value={c.op} onChange={e => upd(i, { op: e.target.value })} style={{ width: 120, padding: '.4rem' }}>
                {ops.map(o => <option key={o} value={o}>{OP_LABEL[o]}</option>)}
              </select>
              {needsVal && (field?.type === 'singleSelect'
                ? <select className="select" value={c.value} onChange={e => upd(i, { value: e.target.value })} style={{ width: 120, padding: '.4rem' }}><option value="">-</option>{(field.options || []).map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
                : field?.type === 'checkbox'
                  ? <select className="select" value={c.value} onChange={e => upd(i, { value: e.target.value })} style={{ width: 100, padding: '.4rem' }}><option value="true">checked</option><option value="">unchecked</option></select>
                  : <input className="input" value={c.value} onChange={e => upd(i, { value: e.target.value })} placeholder="value" style={{ width: 120, padding: '.4rem' }} type={field && (field.type === 'date') ? 'date' : NUMERIC_TYPES.has(field?.type) ? 'number' : 'text'} />)}
              <button className="btn btn-quiet" onClick={() => del(i)} style={{ padding: '.3rem' }}><Icon name="x" size={15} /></button>
            </div>
          );
        })}
        <Button size="sm" variant="ghost" onClick={addCond}><Icon name="plus" size={14} /> Add condition</Button>
      </div>
    </Menu>
  );
}

function SortMenu({ table, view }) {
  const sorts = view.sorts || [];
  const set = (next) => updateView(table.id, view.id, { sorts: next });
  return (
    <Menu width={360} trigger={<button className={'btn btn-sm ' + (sorts.length ? 'btn-primary' : 'btn-ghost')}><Icon name="sliders" size={15} /> Sort{sorts.length ? ' (' + sorts.length + ')' : ''}</button>}>
      <div className="col gap-2">
        {!sorts.length && <div className="t-sm muted" style={{ padding: '.2rem .4rem' }}>No sorts applied.</div>}
        {sorts.map((s, i) => (
          <div key={i} className="row gap-1">
            <select className="select" value={s.fieldId} onChange={e => set(sorts.map((x, idx) => idx === i ? { ...x, fieldId: e.target.value } : x))} style={{ flex: 1, padding: '.4rem' }}>
              {table.fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <select className="select" value={s.dir} onChange={e => set(sorts.map((x, idx) => idx === i ? { ...x, dir: e.target.value } : x))} style={{ width: 130, padding: '.4rem' }}>
              <option value="asc">ascending</option><option value="desc">descending</option>
            </select>
            <button className="btn btn-quiet" onClick={() => set(sorts.filter((_, idx) => idx !== i))} style={{ padding: '.3rem' }}><Icon name="x" size={15} /></button>
          </div>
        ))}
        <Button size="sm" variant="ghost" onClick={() => set([...sorts, { fieldId: table.fields[0].id, dir: 'asc' }])}><Icon name="plus" size={14} /> Add sort</Button>
      </div>
    </Menu>
  );
}

function GroupMenu({ table, view }) {
  const groupables = table.fields.filter(f => f.type === 'singleSelect' || f.type === 'user' || f.type === 'checkbox');
  return (
    <Menu width={240} trigger={<button className={'btn btn-sm ' + (view.groupByFieldId ? 'btn-primary' : 'btn-ghost')}><Icon name="layers" size={15} /> Group</button>}>
      {(close) => (
        <div className="col gap-1">
          <button className="btn btn-quiet row between" style={{ justifyContent: 'space-between' }} onClick={() => { updateView(table.id, view.id, { groupByFieldId: null }); close(); }}><span className="t-sm">No grouping</span>{!view.groupByFieldId && <Icon name="check" size={15} />}</button>
          {groupables.map(f => (
            <button key={f.id} className="btn btn-quiet row between" style={{ justifyContent: 'space-between' }} onClick={() => { updateView(table.id, view.id, { groupByFieldId: f.id }); close(); }}><span className="t-sm">{f.name}</span>{view.groupByFieldId === f.id && <Icon name="check" size={15} />}</button>
          ))}
        </div>
      )}
    </Menu>
  );
}

function ImportModal({ table, onClose }) {
  const [text, setText] = useState('');
  const toast = useToast();
  const doImport = () => {
    const r = importCsv(table.id, text);
    if (r.error) return toast(r.message, 'risk');
    toast('Imported ' + r.added + ' record' + (r.added === 1 ? '' : 's') + (r.fields ? ' and ' + r.fields + ' new field' + (r.fields === 1 ? '' : 's') : ''));
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={'Import CSV into ' + table.name} width={620}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={doImport} disabled={!text.trim()}>Import rows</Button></>}>
      <div className="col gap-2">
        <div className="t-sm muted">Paste comma or tab separated data. The first row is treated as headers; unknown columns become new text fields.</div>
        <textarea className="textarea" rows={10} value={text} onChange={e => setText(e.target.value)} placeholder={'Name, Value, Stage\nAcme rollout, 120000, Proposal\nGlobex renewal, 48000, Negotiation'} style={{ fontFamily: 'var(--font-mono)', fontSize: '.85rem' }} />
      </div>
    </Modal>
  );
}

/* ============================================================
   PAGE
   ============================================================ */
export default function Grid() {
  const st = useGridStore();
  const toast = useToast();
  const bases = st.bases;
  const base = getBase(st.activeBaseId) || bases[0];

  const [tableId, setTableId] = useState(base.tables[0].id);
  const table = base.tables.find(t => t.id === tableId) || base.tables[0];
  const [viewId, setViewId] = useState(table.views[0].id);
  const view = table.views.find(v => v.id === viewId) || table.views[0];

  const [search, setSearch] = useState('');
  const [expand, setExpand] = useState(null);
  const [fieldEdit, setFieldEdit] = useState(undefined); // undefined=closed, null=new, obj=edit
  const [importing, setImporting] = useState(false);

  useEffect(() => { if (!base.tables.find(t => t.id === tableId)) { setTableId(base.tables[0].id); } }, [base.id]);
  useEffect(() => { if (!table.views.find(v => v.id === viewId)) { setViewId(table.views[0].id); } }, [table.id]);

  const askRook = () => {
    const prompt = `In the Rally Grid, analyze my "${base.name}" base (table "${table.name}", ${table.records.length} records across ${table.fields.length} fields). Suggest 3 views, filters, or automations that would make this database more useful, and one formula field I should add.`;
    try { window.dispatchEvent(new CustomEvent('rally:rook', { detail: { prompt } })); } catch {}
    toast('Asked Rook to analyze this base');
  };

  const doExport = () => {
    const csv = exportCsv(table, view, search);
    try {
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = table.name.replace(/\s+/g, '-').toLowerCase() + '.csv'; a.click();
      URL.revokeObjectURL(url);
      toast('Exported ' + table.name + '.csv');
    } catch { toast('Export failed', 'risk'); }
  };

  const addViewOf = (type) => {
    const v = addView(table.id, { name: VIEW_LABEL[type] + ' ' + (table.views.filter(x => x.type === type).length + 1), type,
      ...(type === 'kanban' ? { groupFieldId: table.fields.find(f => f.type === 'singleSelect')?.id } : {}),
      ...(type === 'calendar' ? { dateFieldId: table.fields.find(f => f.type === 'date')?.id } : {}) });
    setViewId(v.id);
  };

  return (
    <div className="fade-up">
      <style>{GRID_CSS}</style>

      {/* header */}
      <div className="row between wrap gap-2" style={{ marginBottom: '1rem' }}>
        <div className="col gap-1" style={{ minWidth: 0 }}>
          <div className="eyebrow">Grid</div>
          <h1 className="page-h1" style={{ margin: 0 }}>Databases</h1>
          <div className="muted t-sm">A full Airtable-class database inside your CRM. Linked to real deals and accounts, not a bolted-on table.</div>
        </div>
        <Button variant="ghost" size="sm" onClick={askRook}><Icon name="sparkles" size={16} /> Ask Rook</Button>
      </div>

      {/* base switcher */}
      <div className="row wrap gap-1" style={{ marginBottom: '.9rem' }}>
        {bases.map(b => {
          const on = b.id === base.id;
          return (
            <button key={b.id} onClick={() => setActiveBase(b.id)} className="row gap-1"
              style={{ padding: '.5rem .85rem', borderRadius: 'var(--r-pill)', border: '1px solid ' + (on ? 'transparent' : 'var(--line)'), cursor: 'pointer', fontWeight: 700, fontSize: '.92rem',
                background: on ? colorHex(b.colorId) : 'var(--paper)', color: on ? '#fff' : 'var(--ink-2)', boxShadow: on ? 'var(--shadow-sm)' : 'none' }}>
              <Icon name={b.icon} size={16} /> {b.name}
              <span style={{ opacity: .7, fontWeight: 600 }} className="t-xs">{b.tables.reduce((s, t) => s + t.records.length, 0)}</span>
            </button>
          );
        })}
        <button onClick={() => { const b = addBase(prompt('Name your new base', 'Untitled base') || 'Untitled base'); setTableId(b.tables[0].id); setViewId(b.tables[0].views[0].id); }}
          className="btn btn-ghost btn-sm"><Icon name="plus" size={15} /> Base</button>
      </div>

      {base.desc && <div className="t-sm muted" style={{ marginBottom: '.9rem', maxWidth: 760 }}>{base.desc}</div>}

      {/* table tabs */}
      <div className="row wrap gap-1" style={{ borderBottom: '1px solid var(--line)', marginBottom: '.85rem' }}>
        {base.tables.map(t => {
          const on = t.id === table.id;
          return (
            <button key={t.id} onClick={() => setTableId(t.id)} className="btn btn-quiet row gap-1"
              onDoubleClick={() => { const n = prompt('Rename table', t.name); if (n) renameTable(t.id, n); }}
              style={{ borderRadius: 0, borderBottom: on ? '2px solid var(--accent)' : '2px solid transparent', color: on ? 'var(--ink)' : 'var(--n-600)', fontWeight: on ? 700 : 600, padding: '.55rem .8rem' }}>
              <Icon name={t.icon} size={15} /> {t.name}
              <Badge className="t-xs" tone={on ? 'accent' : 'default'}>{t.records.length}</Badge>
            </button>
          );
        })}
        <button className="btn btn-quiet" onClick={() => { const t = addTable(base.id, prompt('New table name', 'New table') || 'New table'); setTableId(t.id); setViewId(t.views[0].id); }} style={{ padding: '.55rem .7rem' }}><Icon name="plus" size={15} /></button>
      </div>

      {/* view switcher + toolbar */}
      <div className="card" style={{ padding: '.55rem .7rem', marginBottom: '.85rem' }}>
        <div className="row between wrap gap-2">
          <div className="row wrap gap-1">
            {table.views.map(v => {
              const on = v.id === view.id;
              return (
                <button key={v.id} onClick={() => setViewId(v.id)} className="btn btn-sm row gap-1"
                  style={{ background: on ? 'var(--accent-50)' : 'transparent', color: on ? 'var(--accent-700)' : 'var(--n-600)', fontWeight: on ? 700 : 600 }}>
                  <Icon name={VIEW_ICON[v.type]} size={15} /> {v.name}
                </button>
              );
            })}
            <Menu width={200} align="left" trigger={<button className="btn btn-quiet btn-sm"><Icon name="plus" size={15} /></button>}>
              {(close) => (
                <div className="col gap-1">
                  <div className="t-xs muted" style={{ padding: '.2rem .4rem' }}>Add a view</div>
                  {['grid', 'kanban', 'calendar', 'gallery'].map(tp => (
                    <button key={tp} className="btn btn-quiet row gap-1" style={{ justifyContent: 'flex-start' }} onClick={() => { addViewOf(tp); close(); }}><Icon name={VIEW_ICON[tp]} size={15} /> {VIEW_LABEL[tp]}</button>
                  ))}
                  {table.views.length > 1 && <button className="btn btn-quiet row gap-1" style={{ justifyContent: 'flex-start', color: 'var(--risk)' }} onClick={() => { deleteView(table.id, view.id); setViewId(table.views[0].id); close(); }}><Icon name="trash" size={15} /> Delete current view</button>}
                </div>
              )}
            </Menu>
          </div>

          <div className="row wrap gap-1">
            <div className="row" style={{ background: 'var(--n-50)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '0 .5rem' }}>
              <Icon name="search" size={15} className="muted" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search records" style={{ border: 'none', background: 'transparent', padding: '.4rem .4rem', width: 150, outline: 'none' }} />
            </div>
            {view.type === 'grid' && <FieldsMenu table={table} view={view} />}
            <FilterMenu table={table} view={view} />
            <SortMenu table={table} view={view} />
            {view.type === 'grid' && <GroupMenu table={table} view={view} />}
            {view.type === 'grid' && (
              <Menu width={200} align="right" trigger={<button className="btn btn-ghost btn-sm"><Icon name="list" size={15} /> Height</button>}>
                {(close) => (
                  <div className="col gap-1">
                    {['short', 'medium', 'tall'].map(h => (
                      <button key={h} className="btn btn-quiet row between" style={{ justifyContent: 'space-between', textTransform: 'capitalize' }} onClick={() => { updateView(table.id, view.id, { rowHeight: h }); close(); }}>{h}{(view.rowHeight || 'short') === h && <Icon name="check" size={15} />}</button>
                    ))}
                  </div>
                )}
              </Menu>
            )}
            {view.type === 'kanban' && (
              <Menu width={220} align="right" trigger={<button className="btn btn-ghost btn-sm"><Icon name="layers" size={15} /> Stack by</button>}>
                {(close) => (
                  <div className="col gap-1">
                    {table.fields.filter(f => f.type === 'singleSelect').map(f => (
                      <button key={f.id} className="btn btn-quiet row between" style={{ justifyContent: 'space-between' }} onClick={() => { updateView(table.id, view.id, { groupFieldId: f.id }); close(); }}>{f.name}{view.groupFieldId === f.id && <Icon name="check" size={15} />}</button>
                    ))}
                  </div>
                )}
              </Menu>
            )}
            {view.type === 'calendar' && (
              <Menu width={220} align="right" trigger={<button className="btn btn-ghost btn-sm"><Icon name="calendar" size={15} /> Date field</button>}>
                {(close) => (
                  <div className="col gap-1">
                    {table.fields.filter(f => f.type === 'date' || f.type === 'createdTime').map(f => (
                      <button key={f.id} className="btn btn-quiet row between" style={{ justifyContent: 'space-between' }} onClick={() => { updateView(table.id, view.id, { dateFieldId: f.id }); close(); }}>{f.name}{view.dateFieldId === f.id && <Icon name="check" size={15} />}</button>
                    ))}
                  </div>
                )}
              </Menu>
            )}
            <Button size="sm" variant="ghost" onClick={() => setImporting(true)}><Icon name="download" size={15} /> Import</Button>
            <Button size="sm" variant="ghost" onClick={doExport}><Icon name="copy" size={15} /> Export</Button>
            <Button size="sm" variant="ghost" onClick={() => setFieldEdit(null)}><Icon name="plus" size={15} /> Field</Button>
            <Button size="sm" variant="primary" onClick={() => { const r = addRecord(table.id, {}); if (view.type !== 'grid') setExpand(r); }}><Icon name="plus" size={15} /> Record</Button>
          </div>
        </div>
      </div>

      {/* active view */}
      {view.type === 'grid' && <GridView table={table} view={view} search={search} onExpand={setExpand} onEditField={setFieldEdit} onNewField={() => setFieldEdit(null)} />}
      {view.type === 'kanban' && <KanbanView table={table} view={view} search={search} onExpand={setExpand} />}
      {view.type === 'calendar' && <CalendarView table={table} view={view} search={search} onExpand={setExpand} />}
      {view.type === 'gallery' && <GalleryView table={table} view={view} search={search} onExpand={setExpand} />}

      {expand && <RecordExpand table={table} record={expand} onClose={() => setExpand(null)} />}
      {fieldEdit !== undefined && <FieldEditor table={table} field={fieldEdit} onClose={() => setFieldEdit(undefined)} />}
      {importing && <ImportModal table={table} onClose={() => setImporting(false)} />}
    </div>
  );
}

/* Grid-specific CSS (scoped by .rg-* prefixes). Additive; does not touch
   index.css. Handles the frozen column, sticky header, resize handle, and
   theme-aware borders in both light and dark. */
const GRID_CSS = `
.rg-scroll { overflow: auto; border: 1px solid var(--line); border-radius: var(--r-md); background: var(--paper); max-height: calc(100vh - 320px); position: relative; }
.rg-inner { display: inline-block; min-width: 100%; }
.rg-row { display: flex; align-items: stretch; }
.rg-head { position: sticky; top: 0; z-index: 5; background: var(--n-25); border-bottom: 1px solid var(--line-strong); }
.rg-th { display: flex; align-items: center; gap: 4px; padding: 0 .3rem 0 .6rem; height: 40px; border-right: 1px solid var(--line); background: var(--n-25); position: relative; flex: none; }
.rg-thbtn { background: transparent; border: none; cursor: pointer; color: var(--n-400); padding: .2rem; border-radius: 5px; display: inline-flex; }
.rg-thbtn:hover { background: var(--n-100); color: var(--ink); }
.rg-resize { position: absolute; right: -3px; top: 0; width: 7px; height: 100%; cursor: col-resize; z-index: 8; }
.rg-resize:hover { background: var(--accent); opacity: .5; }
.rg-body { border-bottom: 1px solid var(--n-50); background: var(--paper); }
.rg-body:hover { background: var(--n-25); }
.rg-body:hover .rg-cell[style*="sticky"] { background: var(--n-25) !important; }
.rg-cell { border-right: 1px solid var(--n-50); flex: none; display: flex; align-items: stretch; overflow: visible; }
.rg-gutter { display: flex; align-items: center; justify-content: center; gap: 2px; border-right: 1px solid var(--line); background: var(--paper); flex: none; }
.rg-body:hover .rg-gutter { background: var(--n-25); }
.rg-rownum { display: inline; }
.rg-body:hover .rg-rownum { display: none; }
.rg-rowbtn { background: transparent; border: none; cursor: pointer; color: var(--n-400); padding: .15rem; border-radius: 5px; }
.rg-rowbtn:hover { background: var(--n-100); color: var(--ink); }
.rg-addcol { border-right: none; }
.rg-add { cursor: pointer; border-bottom: 1px solid var(--n-50); }
.rg-add:hover { background: var(--accent-50); }
.rg-grouphead { position: sticky; left: 0; display: flex; align-items: center; gap: 8px; padding: .5rem .7rem; background: var(--n-50); border-bottom: 1px solid var(--line); border-top: 1px solid var(--line); }
.clip2 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.rg-kb { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px; align-items: flex-start; }
.rg-kbcol { flex: none; width: 268px; background: var(--n-25); border: 1px solid var(--line); border-radius: var(--r-md); padding: .7rem; }
.rg-kbcol.over { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-50); }
`;
