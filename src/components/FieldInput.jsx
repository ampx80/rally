// Universal field editor for the Ardovo field registry (Wave 2).
// One component renders the right display + inline editor for ANY fieldDef
// from src/lib/fields.js: text, longtext, number, currency, percent, date,
// datetime, checkbox (switch), picklist, multipicklist, email, phone, url,
// user, link, rating, tags, address, and read-only system types (formula,
// rollup, mirror, autoNumber, sublist, json, ai, computed).
// Inline-edit pattern: click the value to edit, Enter or blur saves,
// Escape cancels. validateValue gates every save; errors surface as toasts.
// ASCII hyphens only.
import React, { useRef, useState } from 'react';
import { validateValue, getFieldOptions } from '../lib/fields.js';
import { getUsers, userName, getCompanies, getContacts, getDeals, contactName } from '../lib/store.js';
import { Input, Select, Textarea, Button, useToast, money, monthDay, timeStr } from './UI.jsx';
import { Icon } from './icons.jsx';

const READONLY_TYPES = new Set(['formula', 'rollup', 'mirror', 'autoNumber', 'sublist', 'json', 'ai']);
export const isFieldReadOnly = (fd) => !!fd?.computed || READONLY_TYPES.has(fd?.type);
export const isEmptyValue = (v) =>
  v == null || v === '' || (Array.isArray(v) && v.length === 0) ||
  (typeof v === 'object' && !Array.isArray(v) && Object.values(v).every(x => x == null || x === ''));

/* ---------- option sources ---------- */
function linkOptions(target) {
  if (target === 'company') return getCompanies().map(c => ({ id: c.id, label: c.name }));
  if (target === 'contact') return getContacts().map(c => ({ id: c.id, label: contactName(c) }));
  if (target === 'deal') return getDeals().map(d => ({ id: d.id, label: d.name }));
  return [];
}
const userOptions = () => getUsers().map(u => ({ id: u.id, label: u.name }));
const optLabel = (opts, v) => opts.find(o => o.id === v || o.label === v)?.label ?? (v == null ? '' : String(v));

const ADDRESS_PARTS = [
  ['street', 'Street'], ['street2', 'Street 2'], ['city', 'City'],
  ['state', 'State'], ['postalCode', 'Postal code'], ['country', 'Country'],
];

/* ---------- display formatting ---------- */
export function formatFieldValue(fieldDef, value) {
  if (isEmptyValue(value)) return null;
  switch (fieldDef.type) {
    case 'currency': {
      const n = Number(value);
      return Number.isFinite(n) ? money(n) : String(value);
    }
    case 'percent': return `${value}%`;
    case 'number': case 'duration': {
      const n = Number(value);
      return Number.isFinite(n) ? n.toLocaleString() : String(value);
    }
    case 'boolean': return value === true || value === 'true' ? 'Yes' : 'No';
    case 'date': return monthDay(value);
    case 'datetime': {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? String(value) : `${monthDay(value)}, ${timeStr(value)}`;
    }
    case 'picklist': case 'status': case 'multiPicklist': {
      const opts = getFieldOptions(fieldDef);
      const list = Array.isArray(value) ? value : [value];
      return list.map(v => optLabel(opts, v)).join(', ');
    }
    case 'user': {
      const list = Array.isArray(value) ? value : [value];
      return list.map(id => userName(id)).join(', ');
    }
    case 'link': {
      const opts = linkOptions(fieldDef.linkTarget);
      const list = Array.isArray(value) ? value : [value];
      return list.map(v => optLabel(opts, v) || v).join(', ');
    }
    case 'tags': return Array.isArray(value) ? value.join(', ') : String(value);
    case 'rating': {
      const n = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
      return '★'.repeat(n) + '☆'.repeat(5 - n);
    }
    case 'address': {
      if (typeof value !== 'object') return String(value);
      return ADDRESS_PARTS.map(([k]) => value[k]).filter(Boolean).join(', ');
    }
    case 'json': case 'sublist': {
      try { return typeof value === 'string' ? value : JSON.stringify(value); } catch { return String(value); }
    }
    default: return String(value);
  }
}

/* ---------- tiny chip ---------- */
function Chip({ label, onRemove }) {
  return (
    <span className="row" style={{ gap: 4, alignItems: 'center', padding: '.16rem .3rem .16rem .6rem', borderRadius: 999, background: 'var(--n-100)', color: 'var(--ink-2)', fontSize: '.84rem', fontWeight: 600 }}>
      <span className="clip" style={{ maxWidth: 180 }}>{label}</span>
      {onRemove && (
        <button onClick={onRemove} title="Remove" style={{ width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: 999, background: 'transparent', cursor: 'pointer', color: 'var(--n-600)', padding: 0 }}>
          <Icon name="x" size={12} />
        </button>
      )}
    </span>
  );
}

/* ---------- multi-value editor (multiPicklist / tags / multi link / user / email / url) ---------- */
function MultiEditor({ fieldDef, value, onCommit, onDone }) {
  const toast = useToast();
  const list = Array.isArray(value) ? value : (value ? [value] : []);
  const [draft, setDraft] = useState('');
  const optioned = fieldDef.type === 'multiPicklist' || fieldDef.type === 'user' || fieldDef.type === 'link';
  const opts = fieldDef.type === 'multiPicklist' ? getFieldOptions(fieldDef)
    : fieldDef.type === 'user' ? userOptions()
    : fieldDef.type === 'link' ? linkOptions(fieldDef.linkTarget)
    : [];
  const available = opts.filter(o => !list.includes(o.id));

  const push = (v) => {
    if (!v || list.includes(v)) return;
    const next = [...list, v];
    const r = validateValue(fieldDef, next);
    if (!r.ok) return toast(r.message, 'risk');
    onCommit(next);
  };
  const remove = (v) => onCommit(list.filter(x => x !== v));

  return (
    <div className="col gap-1" style={{ width: '100%' }}>
      {list.length > 0 && (
        <div className="row gap-1 wrap">
          {list.map(v => <Chip key={String(v)} label={optioned ? optLabel(opts, v) : String(v)} onRemove={() => remove(v)} />)}
        </div>
      )}
      <div className="row gap-1 wrap">
        {optioned ? (
          <Select value="" onChange={e => push(e.target.value)} style={{ flex: '1 1 180px', padding: '.42rem .6rem' }}>
            <option value="">{available.length ? 'Add...' : 'All options added'}</option>
            {available.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </Select>
        ) : (
          <Input
            value={draft}
            placeholder={fieldDef.type === 'tags' ? 'Type a tag, press Enter' : 'Type a value, press Enter'}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { push(draft.trim()); setDraft(''); }
              if (e.key === 'Escape') onDone();
            }}
            style={{ flex: '1 1 180px', padding: '.42rem .6rem' }}
            autoFocus
          />
        )}
        <Button variant="ghost" size="sm" onClick={onDone}><Icon name="check" size={14} /> Done</Button>
      </div>
    </div>
  );
}

/* ---------- address editor (grouped inputs) ---------- */
function AddressEditor({ value, onCommit, onDone }) {
  const val = (value && typeof value === 'object') ? value : {};
  return (
    <div className="col gap-1" style={{ width: '100%' }}>
      <div className="row gap-1 wrap">
        {ADDRESS_PARTS.map(([k, label]) => (
          <Input
            key={k}
            defaultValue={val[k] || ''}
            placeholder={label}
            onBlur={e => {
              const v = e.target.value.trim();
              if (v !== (val[k] || '')) onCommit({ ...val, [k]: v });
            }}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') onDone(); }}
            style={{ flex: k === 'street' ? '1 1 100%' : '1 1 140px', padding: '.42rem .6rem' }}
          />
        ))}
      </div>
      <div><Button variant="ghost" size="sm" onClick={onDone}><Icon name="check" size={14} /> Done</Button></div>
    </div>
  );
}

/* ---------- rating stars (always live) ---------- */
function RatingStars({ value, onCommit }) {
  const n = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
  return (
    <div className="row" style={{ gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          onClick={() => onCommit(i === n ? null : i)}
          title={`${i} of 5`}
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '0 1px', fontSize: '1.15rem', lineHeight: 1, color: i <= n ? 'var(--warn)' : 'var(--n-200)' }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

/* ---------- datetime helpers ---------- */
const pad = (x) => String(x).padStart(2, '0');
function toInputDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function toInputDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const INPUT_TYPE = { number: 'number', currency: 'number', percent: 'number', duration: 'number', email: 'email', url: 'text', phone: 'tel' };

/* ============================================================
   FieldInput
   props: fieldDef (registry definition), value (current value),
   onSave(newValue) - the parent routes it through setFieldValue.
   ============================================================ */
export default function FieldInput({ fieldDef, value, onSave }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const cancelRef = useRef(false);

  const readOnly = isFieldReadOnly(fieldDef);
  const type = fieldDef.type;

  const commit = (v) => {
    const r = validateValue(fieldDef, v);
    if (!r.ok) { toast(r.message, 'risk'); return false; }
    onSave(v);
    return true;
  };

  /* ----- read-only system fields: show computed value or '-' ----- */
  if (readOnly) {
    const shown = formatFieldValue(fieldDef, value);
    return (
      <div className="row gap-1" style={{ alignItems: 'center', minHeight: 34, padding: '.2rem .35rem' }} title="System-computed field">
        <span className={shown == null ? 'muted t-sm' : 't-sm'} style={{ color: shown == null ? undefined : 'var(--ink-2)' }}>
          {shown ?? '-'}
        </span>
        <Icon name="zap" size={12} style={{ color: 'var(--n-400)', flex: 'none' }} />
      </div>
    );
  }

  /* ----- boolean: always-live switch ----- */
  if (type === 'boolean') {
    const on = value === true || value === 'true';
    return (
      <button
        className={`switch${on ? ' on' : ''}`}
        role="switch"
        aria-checked={on}
        aria-label={fieldDef.label}
        onClick={() => commit(!on)}
      />
    );
  }

  /* ----- rating: always-live stars ----- */
  if (type === 'rating') return <RatingStars value={value} onCommit={commit} />;

  /* ----- display mode ----- */
  if (!editing) {
    const shown = formatFieldValue(fieldDef, value);
    return (
      <button
        onClick={() => setEditing(true)}
        title={`Edit ${fieldDef.label}`}
        className="row"
        style={{
          minHeight: 34, width: '100%', textAlign: 'left', alignItems: 'center',
          border: '1px solid transparent', borderRadius: 'var(--r-sm)', background: 'transparent',
          padding: '.28rem .45rem', cursor: 'pointer', fontSize: '.95rem',
          color: shown == null ? 'var(--n-400)' : 'var(--ink)',
          transition: 'background .12s, border-color .12s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--n-50)'; e.currentTarget.style.borderColor = 'var(--line)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
      >
        <span className="clip" style={{ minWidth: 0 }}>{shown ?? '-'}</span>
      </button>
    );
  }

  const done = () => setEditing(false);
  const escKey = (e) => {
    if (e.key === 'Escape') { cancelRef.current = true; done(); }
  };

  /* ----- multi-value editors ----- */
  if (type === 'multiPicklist' || type === 'tags' || fieldDef.multi) {
    return <MultiEditor fieldDef={fieldDef} value={value} onCommit={commit} onDone={done} />;
  }

  /* ----- address ----- */
  if (type === 'address') {
    return <AddressEditor value={value} onCommit={commit} onDone={done} />;
  }

  /* ----- single select: picklist / status / user / link ----- */
  if (type === 'picklist' || type === 'status' || type === 'user' || type === 'link') {
    const opts = type === 'user' ? userOptions() : type === 'link' ? linkOptions(fieldDef.linkTarget) : getFieldOptions(fieldDef);
    return (
      <Select
        autoFocus
        value={value ?? ''}
        onChange={e => { commit(e.target.value || null); done(); }}
        onBlur={done}
        onKeyDown={escKey}
        style={{ padding: '.42rem .6rem' }}
      >
        <option value="">-</option>
        {opts.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </Select>
    );
  }

  /* ----- long text ----- */
  if (type === 'textarea' || type === 'richtext') {
    return (
      <Textarea
        autoFocus
        defaultValue={value ?? ''}
        rows={3}
        onKeyDown={escKey}
        onBlur={e => {
          if (cancelRef.current) { cancelRef.current = false; done(); return; }
          const v = e.target.value;
          if (v !== (value ?? '')) commit(v === '' ? null : v);
          done();
        }}
        style={{ padding: '.5rem .65rem' }}
      />
    );
  }

  /* ----- date / datetime ----- */
  if (type === 'date' || type === 'datetime') {
    const isDT = type === 'datetime';
    return (
      <Input
        autoFocus
        type={isDT ? 'datetime-local' : 'date'}
        defaultValue={isDT ? toInputDateTime(value) : toInputDate(value)}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); escKey(e); }}
        onBlur={e => {
          if (cancelRef.current) { cancelRef.current = false; done(); return; }
          const raw = e.target.value;
          const v = raw ? new Date(raw).toISOString() : null;
          if (v !== (value ?? null)) commit(v);
          done();
        }}
        style={{ padding: '.42rem .6rem' }}
      />
    );
  }

  /* ----- everything else: text-ish input (text / number / currency /
           percent / duration / email / phone / url) ----- */
  const numeric = type === 'number' || type === 'currency' || type === 'percent' || type === 'duration';
  return (
    <Input
      autoFocus
      type={INPUT_TYPE[type] || 'text'}
      step={type === 'currency' ? '0.01' : type === 'percent' ? '1' : 'any'}
      defaultValue={value ?? ''}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); escKey(e); }}
      onBlur={e => {
        if (cancelRef.current) { cancelRef.current = false; done(); return; }
        const raw = e.target.value;
        let v = raw === '' ? null : (numeric ? Number(raw) : raw);
        if (v !== (value ?? null)) commit(v);
        done();
      }}
      style={{ padding: '.42rem .6rem' }}
    />
  );
}
