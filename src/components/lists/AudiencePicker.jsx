// ============================================================
// AudiencePicker - the shared audience source for every marketing
// tool in Rally (broadcasts, sequences enrollment, any future send).
// A campaign hands it a value + onChange and gets back an "audience
// descriptor" it can resolve to recipients through src/lib/lists.js:
//
//   { type: 'all' }                    -> every contact
//   { type: 'list',   listId }         -> a saved list (static or active)
//   { type: 'filter', filters: [...] } -> an ad-hoc typed filter
//
// Two modes behind a segmented control:
//   Saved list  - pick "All contacts" or any list built on /lists.
//   Build a filter - compose a one-off segment with the same typed
//                    operators the saved-view engine uses, and
//                    optionally save it as a reusable active list.
//
// Presentational + selection only. Resolution lives in lists.js so
// the picker and the consumer always agree on who is in the audience.
// ASCII only. NO em-dash / en-dash.
// ============================================================
import React, { useMemo, useState } from 'react';
import { useStore, getUsers } from '../../lib/store.js';
import { getFields, getField, getFieldOptions } from '../../lib/fields.js';
import { opsForType, OP_LABEL } from '../../lib/views.js';
import {
  useLists, getLists, ALL_AUDIENCE,
  audienceMemberCount, audienceRecipientCount, createList,
} from '../../lib/lists.js';
import { Segmented, Badge, Button, Input, useToast } from '../UI.jsx';
import { Icon } from '../icons.jsx';

const ALL_OPT = '__all__';

// One filter condition editor. Mirrors ViewBar's typed value input so an
// ad-hoc segment behaves exactly like a saved view (picklist/status/user get
// dropdowns, numbers/dates get the right input type, unary ops hide the value).
function ValueInput({ objectType, filter, onChange }) {
  const fd = getField(objectType, filter.fieldKey);
  const op = filter.op;
  if (['isEmpty', 'isNotEmpty', 'isTrue', 'isFalse', 'thisMonth'].includes(op)) return null;
  if (fd && (fd.type === 'picklist' || fd.type === 'status')) {
    return (
      <select className="select" value={filter.value ?? ''} onChange={e => onChange(e.target.value)}
        style={{ padding: '.4rem .5rem', fontSize: '.9rem', minWidth: 120 }}>
        <option value="">Pick...</option>
        {getFieldOptions(fd).map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    );
  }
  if (fd && fd.type === 'user') {
    return (
      <select className="select" value={filter.value ?? ''} onChange={e => onChange(e.target.value)}
        style={{ padding: '.4rem .5rem', fontSize: '.9rem', minWidth: 120 }}>
        <option value="">Pick...</option>
        <option value="@me">Me (current user)</option>
        {getUsers().map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
      </select>
    );
  }
  const t = op === 'lastNDays' ? 'number'
    : (fd && ['date', 'datetime'].includes(fd.type) && op !== 'thisMonth') ? 'date'
    : (fd && ['number', 'currency', 'percent'].includes(fd.type)) ? 'number'
    : 'text';
  return <input className="input" type={t} value={filter.value ?? ''} onChange={e => onChange(e.target.value)}
    placeholder="value" style={{ padding: '.4rem .55rem', fontSize: '.9rem', maxWidth: 160 }} />;
}

export default function AudiencePicker({ value, onChange, objectType = 'contact' }) {
  useStore();      // live member counts as the book of business changes
  useLists();      // re-render when lists are created / edited
  const toast = useToast();

  const descriptor = value || ALL_AUDIENCE;
  const mode = descriptor.type === 'filter' ? 'filter' : 'list';
  const lists = getLists();

  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');

  // Only real, filterable fields (mirror ViewBar: no computed / structural).
  const fields = useMemo(
    () => getFields(objectType).filter(f => !f.computed && f.type !== 'sublist' && f.type !== 'json'),
    [objectType],
  );

  const memberCount = audienceMemberCount(descriptor);
  const emailable = audienceRecipientCount(descriptor);

  const setMode = (m) => {
    if (m === 'filter') onChange?.({ type: 'filter', filters: descriptor.type === 'filter' ? descriptor.filters : [] });
    else onChange?.(ALL_AUDIENCE);
  };

  const onPickList = (v) => {
    if (v === ALL_OPT) onChange?.(ALL_AUDIENCE);
    else onChange?.({ type: 'list', listId: v });
  };

  const filters = descriptor.type === 'filter' ? (descriptor.filters || []) : [];
  const setFilters = (next) => onChange?.({ type: 'filter', filters: next });
  const addFilter = () => {
    const fd = fields[0] || {};
    setFilters([...filters, { fieldKey: fd.key, op: opsForType(fd.type)[0], value: '' }]);
  };
  const patchFilter = (i, patch) => setFilters(filters.map((f, j) => j === i ? { ...f, ...patch } : f));
  const removeFilter = (i) => setFilters(filters.filter((_, j) => j !== i));

  const doSaveAsList = () => {
    if (!saveName.trim()) { toast('Name the list', 'risk'); return; }
    const r = createList({ name: saveName, kind: 'active', filters });
    if (r.error) { toast(r.message, 'risk'); return; }
    toast(`Saved "${r.list.name}"`);
    setSaveOpen(false);
    setSaveName('');
    onChange?.({ type: 'list', listId: r.list.id });   // switch selection to the new list
  };

  const listValue = descriptor.type === 'list' ? descriptor.listId : ALL_OPT;

  return (
    <div className="col gap-2" style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: '.85rem', background: 'var(--n-50)' }}>
      <div className="row between wrap gap-2" style={{ alignItems: 'center' }}>
        <span className="t-xs fw-7" style={{ letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--n-500)' }}>Audience</span>
        <Segmented
          options={[{ value: 'list', label: 'Saved list' }, { value: 'filter', label: 'Build a filter' }]}
          value={mode}
          onChange={setMode}
        />
      </div>

      {mode === 'list' ? (
        <select className="select" value={listValue} onChange={e => onPickList(e.target.value)} style={{ width: '100%' }}>
          <option value={ALL_OPT}>All contacts</option>
          {lists.length > 0 && (
            <optgroup label="Your lists">
              {lists.map(l => <option key={l.id} value={l.id}>{l.name}{l.kind === 'active' ? ' (active)' : ''}</option>)}
            </optgroup>
          )}
        </select>
      ) : (
        <div className="col gap-2">
          {filters.length === 0 && (
            <div className="t-sm muted" style={{ padding: '.15rem 0' }}>No conditions yet. This matches every contact.</div>
          )}
          {filters.map((f, i) => {
            const fd = getField(objectType, f.fieldKey);
            const ops = opsForType(fd?.type);
            return (
              <div key={i} className="row gap-1 wrap" style={{ alignItems: 'center' }}>
                <select className="select" value={f.fieldKey}
                  onChange={e => { const nf = getField(objectType, e.target.value); patchFilter(i, { fieldKey: e.target.value, op: opsForType(nf?.type)[0], value: '' }); }}
                  style={{ padding: '.4rem .5rem', fontSize: '.9rem', maxWidth: 180 }}>
                  {fields.map(x => <option key={x.key} value={x.key}>{x.label}</option>)}
                </select>
                <select className="select" value={f.op} onChange={e => patchFilter(i, { op: e.target.value })}
                  style={{ padding: '.4rem .5rem', fontSize: '.9rem', maxWidth: 150 }}>
                  {ops.map(o => <option key={o} value={o}>{OP_LABEL[o] || o}</option>)}
                </select>
                <ValueInput objectType={objectType} filter={f} onChange={v => patchFilter(i, { value: v })} />
                <button onClick={() => removeFilter(i)} className="btn btn-quiet btn-sm" style={{ padding: '.2rem .35rem' }} title="Remove"><Icon name="x" size={14} /></button>
              </div>
            );
          })}
          <div className="row gap-2 wrap">
            <Button variant="ghost" size="sm" onClick={addFilter}><Icon name="plus" size={14} /> Add condition</Button>
            {filters.length > 0 && !saveOpen && (
              <Button variant="quiet" size="sm" onClick={() => setSaveOpen(true)}><Icon name="list" size={14} /> Save as list</Button>
            )}
          </div>
          {saveOpen && (
            <div className="row gap-1 wrap" style={{ alignItems: 'center' }}>
              <Input autoFocus placeholder="List name" value={saveName} onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); doSaveAsList(); } }}
                style={{ maxWidth: 220 }} />
              <Button variant="primary" size="sm" onClick={doSaveAsList}>Save</Button>
              <Button variant="ghost" size="sm" onClick={() => { setSaveOpen(false); setSaveName(''); }}>Cancel</Button>
            </div>
          )}
        </div>
      )}

      <div className="row gap-2 wrap" style={{ alignItems: 'center', marginTop: 2 }}>
        <Badge tone="accent"><Icon name="users" size={12} /> {memberCount.toLocaleString()} contact{memberCount === 1 ? '' : 's'}</Badge>
        <span className="t-xs muted"><Icon name="mail" size={12} /> {emailable.toLocaleString()} with a valid email</span>
      </div>
    </div>
  );
}
