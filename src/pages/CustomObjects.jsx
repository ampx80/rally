// Custom objects - the admin surface for user-defined object types (like
// HubSpot / Salesforce custom objects). Define an object (name, plural, icon,
// description), then manage its fields with the SAME field-registry primitives
// the built-in objects use. Records for each object live at /objects/:type.
// Engine: src/lib/custom-objects.js. ASCII hyphens only.
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageTitle, StatCard, Card, Button, Modal, Field, Input, Select, Textarea,
  Badge, EmptyState, useToast,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import { CUSTOM_FIELD_TYPES, typeHasOptions, fieldTypeLabel, getFieldOptions } from '../lib/fields.js';
import {
  useCustomObjects, getObject, createObject, updateObject, deleteObject,
  addField, updateField, removeField, getRecords, ICON_CHOICES, DEFAULT_ICON,
} from '../lib/custom-objects.js';

const emptyObj = { name: '', plural: '', icon: DEFAULT_ICON, description: '' };

/* ---------- object create / edit modal ---------- */
function ObjectModal({ open, onClose, object }) {
  const toast = useToast();
  const editing = !!object;
  const [draft, setDraft] = useState(
    editing ? { name: object.name, plural: object.plural, icon: object.icon, description: object.description || '' } : emptyObj
  );

  const save = () => {
    const res = editing ? updateObject(object.type, draft) : createObject(draft);
    if (res.error) return toast(res.message, 'risk');
    toast(editing ? 'Object updated' : `Object "${res.object.name}" created`);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit object' : 'New custom object'} width={560}
      footer={<>
        <Button variant="quiet" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="accent" size="sm" onClick={save}>{editing ? 'Save object' : 'Create object'}</Button>
      </>}>
      <div className="col gap-2">
        <div className="row gap-2 wrap">
          <Field label="Name (singular)"><Input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Asset" autoFocus /></Field>
          <Field label="Plural"><Input value={draft.plural} onChange={e => setDraft({ ...draft, plural: e.target.value })} placeholder="e.g. Assets" /></Field>
        </div>
        <Field label="Icon">
          <div className="row wrap" style={{ gap: 6 }}>
            {ICON_CHOICES.map(name => {
              const on = draft.icon === name;
              return (
                <button key={name} type="button" onClick={() => setDraft({ ...draft, icon: name })} title={name}
                  className="row center" style={{ width: 38, height: 38, borderRadius: 'var(--r-sm)', cursor: 'pointer',
                    background: on ? 'var(--accent)' : 'var(--n-100)', color: on ? '#fff' : 'var(--n-600)',
                    border: on ? '1px solid var(--accent)' : '1px solid var(--line)' }}>
                  <Icon name={name} size={18} />
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="Description" hint="What this object represents. Optional.">
          <Input value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} placeholder="Physical assets assigned to accounts." />
        </Field>
        {!editing && <div className="t-xs muted">A required <b>Name</b> field is created automatically as the record title. Add more fields after creating.</div>}
      </div>
    </Modal>
  );
}

/* ---------- field create / edit modal (per object) ---------- */
function FieldModal({ open, onClose, type, field }) {
  const toast = useToast();
  const editing = !!field;
  const [label, setLabel] = useState(field?.label || '');
  const [ftype, setFtype] = useState(field?.type || 'text');
  const [required, setRequired] = useState(!!field?.required);
  const [optionsText, setOptionsText] = useState(editing ? getFieldOptions(field).map(o => o.label).join('\n') : '');
  const primary = !!field?.primary;

  const save = () => {
    const def = {
      label, type: ftype, required,
      options: typeHasOptions(ftype) ? optionsText.split('\n').map(s => s.trim()).filter(Boolean) : undefined,
    };
    const res = editing ? updateField(type, field.id, def) : addField(type, def);
    if (res.error) return toast(res.message, 'risk');
    toast(editing ? 'Field updated' : `Field "${res.field.label}" added`);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit field' : 'New field'} width={520}
      footer={<>
        <Button variant="quiet" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="accent" size="sm" onClick={save}>{editing ? 'Save field' : 'Add field'}</Button>
      </>}>
      <div className="col gap-2">
        <Field label="Field label"><Input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Serial number" autoFocus /></Field>
        <Field label="Type">
          <Select value={ftype} onChange={e => setFtype(e.target.value)} disabled={primary}>
            {CUSTOM_FIELD_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </Select>
        </Field>
        {primary && <div className="t-xs muted">The primary name field stays a required text field.</div>}
        {typeHasOptions(ftype) && (
          <Field label="Picklist values" hint="One value per line.">
            <Textarea value={optionsText} onChange={e => setOptionsText(e.target.value)} rows={5} placeholder={'Active\nRetired\nIn repair'} />
          </Field>
        )}
        {!primary && (
          <label className="row gap-2" style={{ alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} style={{ width: 16, height: 16 }} />
            <span className="t-sm">Required</span>
          </label>
        )}
      </div>
    </Modal>
  );
}

/* ---------- manage-fields modal for one object ---------- */
function FieldsManager({ open, onClose, type }) {
  useCustomObjects(); // reactive to field changes
  const toast = useToast();
  const [modal, setModal] = useState(null); // null | { field? }
  const obj = getObject(type);
  if (!obj) return null;

  const remove = (fd) => {
    if (!window.confirm(`Delete the field "${fd.label}"? Stored values stay on records but stop rendering.`)) return;
    const res = removeField(type, fd.id);
    if (res.error) toast(res.message, 'risk'); else toast('Field deleted');
  };

  return (
    <Modal open={open} onClose={onClose} title={`Fields - ${obj.name}`} width={620}
      footer={<Button variant="quiet" size="sm" onClick={onClose}>Done</Button>}>
      <div className="col gap-2">
        <div className="row between" style={{ alignItems: 'center' }}>
          <span className="muted t-sm">{obj.fields.length} fields</span>
          <Button size="sm" onClick={() => setModal({})}><Icon name="plus" size={14} /> Add field</Button>
        </div>
        <div className="col">
          {obj.fields.map(fd => (
            <div key={fd.id} className="row gap-2" style={{ alignItems: 'center', padding: '.5rem 0', borderTop: '1px solid var(--line)' }}>
              <div className="col" style={{ minWidth: 0, flex: 1, gap: 1 }}>
                <span className="fw-6 clip">{fd.label}</span>
                <span className="t-xs muted" style={{ fontFamily: 'var(--font-mono)' }}>{fd.key}</span>
              </div>
              <Badge className="t-xs" style={{ flex: 'none' }}>{fieldTypeLabel(fd.type)}</Badge>
              {fd.primary && <Badge tone="accent" className="t-xs" style={{ flex: 'none' }}>Primary</Badge>}
              {fd.required && !fd.primary && <Badge tone="warn" className="t-xs" style={{ flex: 'none' }}>Required</Badge>}
              <span className="row gap-1" style={{ flex: 'none' }}>
                <Button variant="quiet" size="sm" aria-label={`Edit ${fd.label}`} onClick={() => setModal({ field: fd })}><Icon name="edit" size={14} /></Button>
                {!fd.primary && <Button variant="quiet" size="sm" aria-label={`Delete ${fd.label}`} onClick={() => remove(fd)}><Icon name="trash" size={14} /></Button>}
              </span>
            </div>
          ))}
        </div>
      </div>
      {modal && <FieldModal open onClose={() => setModal(null)} type={type} field={modal.field} />}
    </Modal>
  );
}

export default function CustomObjects() {
  const objects = useCustomObjects();
  const nav = useNavigate();
  const toast = useToast();
  const [objModal, setObjModal] = useState(null); // null | { object? }
  const [fieldsFor, setFieldsFor] = useState(null); // null | type

  const totalRecords = objects.reduce((n, o) => n + getRecords(o.type).length, 0);
  const totalFields = objects.reduce((n, o) => n + o.fields.length, 0);

  const del = (o) => {
    if (!window.confirm(`Delete the object "${o.name}" and all ${getRecords(o.type).length} of its records? This cannot be undone.`)) return;
    const res = deleteObject(o.type);
    if (res.error) toast(res.message, 'risk'); else toast(`Deleted "${o.name}"`);
  };

  return (
    <div className="col gap-3">
      <PageTitle
        eyebrow="Admin"
        title="Custom objects"
        sub="Model anything Ardovo does not ship out of the box - assets, contracts, properties, sites. Your objects behave exactly like the built-in ones."
        action={<Button variant="accent" onClick={() => setObjModal({})}><Icon name="plus" size={16} /> New object</Button>}
      />

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
        <StatCard label="Custom objects" value={objects.length} icon={<Icon name="box" size={18} />} sub="user-defined types" />
        <StatCard label="Records" value={totalRecords} icon={<Icon name="list" size={18} />} accent="var(--ok)" sub="across all objects" />
        <StatCard label="Fields" value={totalFields} icon={<Icon name="layers" size={18} />} accent="var(--accent-teal)" sub="defined by you" />
      </div>

      {objects.length === 0 ? (
        <EmptyState icon="🧱" title="No custom objects yet"
          body="Create your first object to model data unique to your business. Each object gets its own records page, fields, and detail view."
          action={<Button variant="accent" onClick={() => setObjModal({})}><Icon name="plus" size={16} /> New object</Button>} />
      ) : (
        <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 16 }}>
          {objects.map(o => {
            const recCount = getRecords(o.type).length;
            return (
              <div key={o.id} className="card card-pad col gap-2">
                <div className="row between" style={{ gap: 8, alignItems: 'flex-start' }}>
                  <div className="row gap-2" style={{ minWidth: 0, alignItems: 'center' }}>
                    <span className="row center" style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-50)', color: 'var(--accent-600)', flex: 'none' }}>
                      <Icon name={o.icon || DEFAULT_ICON} size={20} />
                    </span>
                    <div className="col" style={{ minWidth: 0 }}>
                      <div className="fw-7 clip">{o.name}</div>
                      <div className="t-xs muted clip">{o.plural}</div>
                    </div>
                  </div>
                  <Badge style={{ flex: 'none' }}>{o.fields.length} fields</Badge>
                </div>
                {o.description && <div className="t-sm muted" style={{ minHeight: 20 }}>{o.description}</div>}
                <div className="row between" style={{ borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 2, alignItems: 'center' }}>
                  <span className="t-sm muted">{recCount} {recCount === 1 ? 'record' : 'records'}</span>
                  <div className="row gap-1">
                    <Button variant="quiet" size="sm" onClick={() => setFieldsFor(o.type)} title="Manage fields"><Icon name="sliders" size={15} /></Button>
                    <Button variant="quiet" size="sm" onClick={() => setObjModal({ object: o })} title="Edit object"><Icon name="edit" size={15} /></Button>
                    <Button variant="quiet" size="sm" onClick={() => del(o)} title="Delete object"><Icon name="trash" size={15} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => nav(`/objects/${o.type}`)}>Open <Icon name="arrowRight" size={14} /></Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {objModal && <ObjectModal open onClose={() => setObjModal(null)} object={objModal.object} />}
      {fieldsFor && <FieldsManager open onClose={() => setFieldsFor(null)} type={fieldsFor} />}
    </div>
  );
}
