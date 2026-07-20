// FieldEditor.jsx
// The add/edit-field modal for the Forms builder. Type-aware: it surfaces the
// right sub-controls per field type (options for choice fields, min/max for
// numbers, amount/currency for payment, accept/multiple for file uploads,
// default value for hidden fields), a contact-property mapping, a step
// assignment, and per-field conditional (show/hide) logic that references any
// other field on the form.
//
// Composes the shared UI primitives so it matches the rest of the product.
// ASCII only. NO em-dash / en-dash. ASCII hyphen only.
import React, { useState } from 'react';
import { Button, Field, Input, Select, Textarea, Modal } from '../UI.jsx';
import {
  FIELD_TYPES, CONTACT_PROPERTIES, LOGIC_OPS,
  typeNeedsOptions, typeIsStatic, typeIsMappable, defaultMapForType,
} from '../../lib/forms.js';

const splitOptions = (s) => String(s || '').split(/[\n,]/).map(x => x.trim()).filter(Boolean);

export default function FieldEditor({ editing, priorFields = [], stepCount = 1, onCancel, onSave }) {
  const [d, setD] = useState(() => ({
    ...editing.field,
    optionsText: Array.isArray(editing.field.options) ? editing.field.options.join('\n') : '',
  }));
  const set = (patch) => setD(p => ({ ...p, ...patch }));

  const needsOptions = typeNeedsOptions(d.type);
  const isStatic = typeIsStatic(d.type);
  const canMap = typeIsMappable(d.type);
  const cond = d.visibleIf || null;

  function onTypeChange(type) {
    const nextMap = (d.mapTo === '__none' || d.mapTo === defaultMapForType(d.type)) ? defaultMapForType(type) : d.mapTo;
    const patch = { type, mapTo: typeIsMappable(type) ? nextMap : '__none' };
    if (typeNeedsOptions(type) && !splitOptions(d.optionsText).length) patch.optionsText = 'Option 1\nOption 2';
    if (type === 'payment' && d.amount == null) { patch.amount = 25; patch.currency = d.currency || 'USD'; }
    setD(p => ({ ...p, ...patch }));
  }

  function setCond(patch) {
    setD(p => {
      const base = p.visibleIf || { field: '', op: 'eq', value: '' };
      return { ...p, visibleIf: { ...base, ...patch } };
    });
  }
  function clearCond() { setD(p => ({ ...p, visibleIf: null })); }
  function enableCond() {
    const first = priorFields[0];
    setD(p => ({ ...p, visibleIf: { field: first ? first.id : '', op: 'eq', value: '' } }));
  }

  const condField = cond ? priorFields.find(f => f.id === cond.field) : null;
  const condOptions = condField && Array.isArray(condField.options) ? condField.options : null;
  const condNeedsValue = cond && cond.op !== 'filled' && cond.op !== 'empty';

  function commit() {
    if (!String(d.label || '').trim()) return;
    const out = {
      ...d,
      options: needsOptions ? splitOptions(d.optionsText) : [],
      step: Math.max(0, parseInt(d.step, 10) || 0),
    };
    delete out.optionsText;
    onSave(out);
  }

  const stepChoices = [];
  for (let i = 0; i < Math.max(1, stepCount); i++) stepChoices.push(i);

  return (
    <Modal open onClose={onCancel} width={620} title={editing.mode === 'add' ? 'Add field' : 'Edit field'}
      footer={<><Button variant="ghost" onClick={onCancel}>Cancel</Button><Button onClick={commit} disabled={!String(d.label || '').trim()}>{editing.mode === 'add' ? 'Add field' : 'Save field'}</Button></>}>
      <div className="col gap-3">
        <div className="row gap-2 wrap">
          <Field label="Type"><Select value={d.type} onChange={e => onTypeChange(e.target.value)}>{FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</Select></Field>
          <Field label="Step"><Select value={String(d.step || 0)} onChange={e => set({ step: parseInt(e.target.value, 10) || 0 })}>
            {stepChoices.map(i => <option key={i} value={i}>Step {i + 1}</option>)}
            <option value={Math.max(1, stepCount)}>New step {Math.max(1, stepCount) + 1}</option>
          </Select></Field>
        </div>

        <Field label={isStatic ? 'Heading text' : 'Label'}>
          <Input autoFocus value={d.label} onChange={e => set({ label: e.target.value })} placeholder={isStatic ? 'e.g. Tell us about you' : 'e.g. Work email'} />
        </Field>

        {canMap && (
          <Field label="Maps to contact property">
            <Select value={d.mapTo} onChange={e => set({ mapTo: e.target.value })}>{CONTACT_PROPERTIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}</Select>
          </Field>
        )}

        {needsOptions && (
          <Field label="Options" hint="One per line (or comma separated).">
            <Textarea rows={4} value={d.optionsText} onChange={e => set({ optionsText: e.target.value })} placeholder={'Option 1\nOption 2\nOption 3'} />
          </Field>
        )}

        {d.type === 'number' && (
          <div className="row gap-2 wrap">
            <Field label="Min (optional)"><Input type="number" value={d.min == null ? '' : d.min} onChange={e => set({ min: e.target.value })} placeholder="No minimum" /></Field>
            <Field label="Max (optional)"><Input type="number" value={d.max == null ? '' : d.max} onChange={e => set({ max: e.target.value })} placeholder="No maximum" /></Field>
          </div>
        )}

        {d.type === 'file' && (
          <>
            <Field label="Accepted types (optional)" hint="e.g. .pdf,.png,image/*"><Input value={d.accept || ''} onChange={e => set({ accept: e.target.value })} placeholder="Any file type" /></Field>
            <label className="row gap-2 t-sm fw-6" style={{ alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={!!d.multiple} onChange={e => set({ multiple: e.target.checked })} /> Allow multiple files
            </label>
          </>
        )}

        {d.type === 'payment' && (
          <>
            <div className="row gap-2 wrap">
              <Field label="Amount"><Input type="number" min="0" step="0.01" value={d.amount == null ? '' : d.amount} onChange={e => set({ amount: e.target.value === '' ? 0 : Number(e.target.value) })} placeholder="0.00" /></Field>
              <Field label="Currency"><Input value={d.currency || 'USD'} onChange={e => set({ currency: e.target.value.toUpperCase().slice(0, 4) })} placeholder="USD" /></Field>
            </div>
            <label className="row gap-2 t-sm fw-6" style={{ alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={!!d.amountEditable} onChange={e => set({ amountEditable: e.target.checked })} /> Let the visitor enter their own amount
            </label>
            <div className="t-xs muted">On submit this captures a payment intent and fires a <code>rally:payment</code> event so automations can follow up. Connect Stripe to collect the charge.</div>
          </>
        )}

        {d.type === 'hidden' && (
          <Field label="Default value" hint="Sent silently with every submission (e.g. a campaign tag).">
            <Input value={d.defaultValue || ''} onChange={e => set({ defaultValue: e.target.value })} placeholder="e.g. website-footer" />
          </Field>
        )}

        {!isStatic && (
          <>
            <Field label="Placeholder"><Input value={d.placeholder || ''} onChange={e => set({ placeholder: e.target.value })} placeholder="Optional" /></Field>
          </>
        )}
        <Field label={isStatic ? 'Sub text (optional)' : 'Help text'}><Input value={d.help || ''} onChange={e => set({ help: e.target.value })} placeholder={isStatic ? 'Optional description under the heading' : 'Optional hint under the field'} /></Field>

        {!isStatic && (
          <label className="row gap-2 t-sm fw-6" style={{ alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={!!d.required} onChange={e => set({ required: e.target.checked })} /> Required field
          </label>
        )}

        {/* Conditional logic */}
        <div className="col gap-2" style={{ padding: '.85rem', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', background: 'var(--n-50, var(--paper))' }}>
          <div className="row between" style={{ alignItems: 'center' }}>
            <div className="col gap-1" style={{ minWidth: 0 }}>
              <span className="t-sm fw-7">Conditional logic</span>
              <span className="t-xs muted">Show this {isStatic ? 'section' : 'field'} only when a rule matches.</span>
            </div>
            {cond
              ? <Button variant="ghost" size="sm" onClick={clearCond}>Always show</Button>
              : <Button variant="ghost" size="sm" onClick={enableCond} disabled={priorFields.length === 0}>Add rule</Button>}
          </div>
          {priorFields.length === 0 && !cond && <div className="t-xs muted">Add another field first to branch on its answer.</div>}
          {cond && (
            <div className="row gap-2 wrap" style={{ alignItems: 'flex-end' }}>
              <Field label="When"><Select value={cond.field} onChange={e => setCond({ field: e.target.value })}>
                <option value="">Choose a field</option>
                {priorFields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </Select></Field>
              <Field label="Condition"><Select value={cond.op} onChange={e => setCond({ op: e.target.value })}>{LOGIC_OPS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</Select></Field>
              {condNeedsValue && (
                <Field label="Value">
                  {condOptions
                    ? <Select value={cond.value} onChange={e => setCond({ value: e.target.value })}><option value="">Choose</option>{condOptions.map(o => <option key={o} value={o}>{o}</option>)}</Select>
                    : <Input value={cond.value} onChange={e => setCond({ value: e.target.value })} placeholder="Match value" />}
                </Field>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
