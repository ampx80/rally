// Progressive-disclosure field panel (Wave 2). Renders every registered
// field for an object (system + custom) as collapsible sections: the first
// two sections open by default, the rest collapsed with filled/total counts.
// A search box filters fields by name across all sections and auto-expands
// matches. Every empty editable field carries an AI-fill sparkle (stub until
// Rook comes online in Wave 5). Saves route through setFieldValue so store
// columns patch directly and everything else lands in record.fieldValues.
// ASCII hyphens only.
import React, { useMemo, useState } from 'react';
import {
  useFields, getFieldSections, getFieldValue, setFieldValue,
} from '../lib/fields.js';
import { LIFECYCLE_STAGES } from '../lib/picklists.js';
import FieldInput, { isFieldReadOnly, isEmptyValue } from './FieldInput.jsx';
import { Input, Badge, useToast } from './UI.jsx';
import { Icon } from './icons.jsx';

/* ---------- lifecycle stage pill (record headers, contact + company) ---------- */
const STAGE_PILL_COLOR = {
  subscriber: 'var(--n-600)', lead: 'var(--info)', mql: 'var(--info)', sql: 'var(--warn)',
  opportunity: 'var(--accent-600)', customer: 'var(--ok)', evangelist: 'var(--ok)', other: 'var(--n-600)',
};
export function LifecycleStagePill({ value, onChange }) {
  const color = STAGE_PILL_COLOR[value] || 'var(--accent-600)';
  return (
    <span className="row" style={{ gap: 6, alignItems: 'center', padding: '.22rem .3rem .22rem .7rem', borderRadius: 999, background: 'transparent', border: `1.5px solid ${color}`, color }} title="Lifecycle stage">
      <span className="dot" style={{ background: color }} />
      <select
        value={value || 'lead'}
        onChange={e => onChange(e.target.value)}
        style={{ border: 'none', background: 'transparent', color: 'inherit', fontWeight: 700, fontSize: '.84rem', cursor: 'pointer', outline: 'none', paddingRight: 2 }}
      >
        {LIFECYCLE_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
    </span>
  );
}

/* ---------- one field row: label + editor + AI sparkle ---------- */
function FieldRow({ fieldDef, record, onPatch, toast }) {
  const value = getFieldValue(record, fieldDef);
  const editable = !isFieldReadOnly(fieldDef);
  const empty = isEmptyValue(value);

  const save = (v) => {
    const patch = setFieldValue(record, fieldDef, v);
    const r = onPatch(patch);
    if (r && r.error) toast(r.message, 'risk');
  };

  return (
    <div className="row wrap" style={{ gap: '.2rem .9rem', padding: '.4rem 0', borderBottom: '1px solid var(--line)', alignItems: 'center' }}>
      <div style={{ flex: '0 1 210px', minWidth: 150 }}>
        <span className="t-sm fw-6" style={{ color: 'var(--ink-2)' }}>{fieldDef.label}</span>
        {fieldDef.helpText ? <div className="t-xs muted">{fieldDef.helpText}</div> : null}
      </div>
      <div className="row gap-1" style={{ flex: '1 1 260px', minWidth: 200, alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <FieldInput fieldDef={fieldDef} value={value} onSave={save} />
        </div>
        {editable && empty && (
          <button
            title="Ask Rook to fill this field"
            onClick={() => toast('Rook will fill this - coming online in Wave 5', 'ok')}
            style={{ flex: 'none', width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: 999, background: 'transparent', color: 'var(--accent-300)', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-50)'; e.currentTarget.style.color = 'var(--accent-600)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--accent-300)'; }}
          >
            <Icon name="sparkles" size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   RecordFields
   props: objectType ('contact' | 'company' | 'deal' | ...),
   record (the live store record), onPatch(patch) - calls the
   right store updater and returns its result.
   ============================================================ */
export default function RecordFields({ objectType, record, onPatch }) {
  useFields(); // re-render when custom fields change
  const toast = useToast();
  const [query, setQuery] = useState('');
  const sections = getFieldSections(objectType);
  const defaultOpen = useMemo(() => new Set(sections.slice(0, 2).map(s => s.section)), [objectType]); // eslint-disable-line react-hooks/exhaustive-deps
  const [openSections, setOpenSections] = useState(defaultOpen);

  const q = query.trim().toLowerCase();
  const searching = q.length > 0;

  const visible = sections
    .map(({ section, fields }) => ({
      section,
      fields: searching
        ? fields.filter(fd => fd.label.toLowerCase().includes(q) || fd.key.toLowerCase().includes(q))
        : fields,
      total: fields.length,
    }))
    .filter(s => s.fields.length > 0);

  const toggle = (section) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section); else next.add(section);
      return next;
    });
  };

  const totalFields = sections.reduce((n, s) => n + s.fields.length, 0);

  return (
    <div className="col gap-2">
      <div className="row gap-2 wrap" style={{ alignItems: 'center' }}>
        <div className="row" style={{ position: 'relative', flex: '1 1 240px', alignItems: 'center' }}>
          <span style={{ position: 'absolute', left: 10, color: 'var(--n-400)', display: 'inline-flex' }}>
            <Icon name="search" size={15} />
          </span>
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={`Search ${totalFields} fields...`}
            style={{ paddingLeft: 34, padding: '.52rem .7rem .52rem 34px' }}
          />
        </div>
        <span className="t-xs muted" style={{ flex: 'none' }}>{totalFields} fields registered</span>
      </div>

      {visible.length === 0 && (
        <div className="muted t-sm" style={{ padding: '1rem 0' }}>No fields match "{query}".</div>
      )}

      {visible.map(({ section, fields, total }) => {
        const open = searching || openSections.has(section);
        const filled = fields.filter(fd => !isEmptyValue(getFieldValue(record, fd))).length;
        return (
          <div key={section} style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
            <button
              onClick={() => toggle(section)}
              className="row between"
              style={{ width: '100%', padding: '.7rem .9rem', border: 'none', background: open ? 'var(--n-25)' : 'var(--paper)', cursor: 'pointer', textAlign: 'left' }}
            >
              <span className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
                <Icon name="chevronDown" size={16} style={{ flex: 'none', color: 'var(--n-600)', transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform .18s var(--ease)' }} />
                <span className="fw-7 clip">{section}</span>
              </span>
              <Badge tone={filled > 0 ? 'accent' : 'default'} className="t-xs" style={{ flex: 'none' }}>
                {searching ? `${fields.length} of ${total}` : `${filled}/${total} filled`}
              </Badge>
            </button>
            {open && (
              <div style={{ padding: '.25rem .9rem .6rem' }}>
                {fields.map(fd => (
                  <FieldRow key={fd.key} fieldDef={fd} record={record} onPatch={onPatch} toast={toast} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
