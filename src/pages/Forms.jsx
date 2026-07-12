// Forms. Rally's HubSpot-class form engine.
//   List    - every form with live submission + created-contact counts.
//   Builder - add/reorder/style typed fields, map each to a contact property,
//             set publish status, and grab the hosted link + embed snippet.
//   Submissions - the raw inbound rows, each linked to the contact it created.
//
// Public hosted page lives at /f/:formId (src/marketing/HostedForm.jsx). This
// page and that page share the same local-first slice (src/lib/forms.js), so a
// submission on the hosted form shows up here and its contact lands in the book
// of business. ADDITIVE: only reads/writes through existing store writers.
// ASCII only. NO em-dash / en-dash.
import React, { useEffect, useMemo, useState } from 'react';
import {
  useForms, getForms, getForm, formStats, formSubmissionCount,
  createForm, updateForm, deleteForm, duplicateForm, setFormStatus,
  hostedUrl, embedSnippet, submissionContact,
  FIELD_TYPES, fieldTypeLabel, typeNeedsOptions, blankField, normField,
  CONTACT_PROPERTIES, propertyLabel, defaultMapForType,
} from '../lib/forms.js';
import { useStore, contactName } from '../lib/store.js';
import {
  Button, Card, Badge, PageTitle, SectionHeader, Field, Input, Select, Textarea,
  Modal, Tabs, StatCard, EmptyState, Segmented, useToast, relTime,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';

const ACCENTS = ['#5b4bf5', '#0ea5a3', '#e0752d', '#c0392b', '#2563a8', '#8b3fd4'];

/* ============================================================
   ROOT: list <-> builder
   ============================================================ */
export default function Forms() {
  const [selId, setSelId] = useState(null);
  useForms();                 // re-render on any forms mutation
  const form = selId ? getForm(selId) : null;

  // If the selected form was deleted out from under us, fall back to the list.
  useEffect(() => { if (selId && !getForm(selId)) setSelId(null); });

  if (form) return <FormBuilder form={form} onBack={() => setSelId(null)} />;
  return <FormsList onOpen={setSelId} />;
}

/* ============================================================
   LIST
   ============================================================ */
function FormsList({ onOpen }) {
  const toast = useToast();
  const forms = getForms();
  const stats = formStats();

  function newForm() {
    const { form, error, message } = createForm({ name: 'Untitled form', status: 'draft' });
    if (error) { toast(message, 'risk'); return; }
    toast('Form created');
    onOpen(form.id);
  }

  return (
    <div className="col gap-4" style={{ padding: 'var(--page-pad, 1.5rem)' }}>
      <PageTitle
        eyebrow="Marketing"
        title="Forms"
        sub="Capture inbound leads with hosted forms and embeds. Every submission creates a real contact."
        action={<Button onClick={newForm}><Icon name="plus" size={16} /> New form</Button>}
      />

      <div className="grid-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        <StatCard label="Forms" value={stats.total} icon={<Icon name="list" size={18} />} />
        <StatCard label="Published" value={stats.published} accent="var(--ok)" icon={<Icon name="check" size={18} />} />
        <StatCard label="Submissions" value={stats.submissions} accent="var(--accent-teal)" icon={<Icon name="inbox" size={18} />} />
        <StatCard label="Contacts created" value={stats.contacts} accent="var(--accent-purple)" icon={<Icon name="users" size={18} />} />
      </div>

      {forms.length === 0 ? (
        <Card><EmptyState icon="🧲" title="No forms yet" body="Build your first hosted form to start capturing leads." action={<Button onClick={newForm}><Icon name="plus" size={16} /> New form</Button>} /></Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {forms.map(f => <FormCard key={f.id} form={f} onOpen={onOpen} />)}
        </div>
      )}
    </div>
  );
}

function FormCard({ form, onOpen }) {
  const subs = formSubmissionCount(form);
  const accent = form.style?.accent || 'var(--accent)';
  return (
    <Card hover className="col gap-3" onClick={() => onOpen(form.id)} style={{ cursor: 'pointer' }}>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div className="row gap-2" style={{ minWidth: 0, alignItems: 'center' }}>
          <span style={{ width: 36, height: 36, borderRadius: 10, background: accent, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            <Icon name="list" size={18} stroke={2} style={{ color: '#fff' }} />
          </span>
          <div className="col" style={{ minWidth: 0 }}>
            <span className="clip fw-7" style={{ fontSize: '1.02rem' }}>{form.name}</span>
            <span className="t-xs muted clip">{(form.fields || []).length} field{(form.fields || []).length === 1 ? '' : 's'}</span>
          </div>
        </div>
        <Badge tone={form.status === 'published' ? 'ok' : 'warn'}>{form.status === 'published' ? 'Live' : 'Draft'}</Badge>
      </div>
      {form.description && <div className="t-sm muted" style={{ lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{form.description}</div>}
      <div className="row between" style={{ marginTop: 'auto', paddingTop: '.4rem', borderTop: '1px solid var(--line)' }}>
        <span className="t-sm"><b>{subs}</b> <span className="muted">submission{subs === 1 ? '' : 's'}</span></span>
        <span className="t-xs muted">Updated {relTime(form.updatedAt)}</span>
      </div>
    </Card>
  );
}

/* ============================================================
   BUILDER
   ============================================================ */
function FormBuilder({ form, onBack }) {
  const toast = useToast();
  const [tab, setTab] = useState('build');
  const [editing, setEditing] = useState(null);   // { mode, field, index }
  const [dragIdx, setDragIdx] = useState(null);
  const [confirmDel, setConfirmDel] = useState(false);

  const fields = form.fields || [];

  const patchFields = (next) => updateForm(form.id, { fields: next });

  function saveField(draft) {
    const cleaned = normField(draft);
    if (editing.mode === 'add') patchFields([...fields, cleaned]);
    else { const next = fields.slice(); next[editing.index] = { ...cleaned, id: fields[editing.index].id }; patchFields(next); }
    setEditing(null);
  }
  function removeField(idx) { const next = fields.slice(); next.splice(idx, 1); patchFields(next); }

  // Native HTML5 drag reorder.
  function onDrop(idx) {
    if (dragIdx == null || dragIdx === idx) { setDragIdx(null); return; }
    const next = fields.slice();
    const [moved] = next.splice(dragIdx, 1);
    next.splice(idx, 0, moved);
    setDragIdx(null);
    patchFields(next);
  }

  function togglePublish() {
    const to = form.status === 'published' ? 'draft' : 'published';
    setFormStatus(form.id, to);
    toast(to === 'published' ? 'Form published' : 'Moved to draft');
  }
  function onDuplicate() { const { form: copy } = duplicateForm(form.id); if (copy) toast('Form duplicated'); }
  function onDelete() { deleteForm(form.id); toast('Form deleted'); onBack(); }

  return (
    <div className="col gap-4" style={{ padding: 'var(--page-pad, 1.5rem)' }}>
      <div className="row between wrap gap-2" style={{ alignItems: 'flex-start' }}>
        <div className="col gap-1" style={{ minWidth: 0 }}>
          <button onClick={onBack} className="btn btn-quiet btn-sm" style={{ alignSelf: 'flex-start', paddingLeft: 0 }}>
            <Icon name="arrowLeft" size={16} /> All forms
          </button>
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <h1 className="page-h1" style={{ margin: 0 }}>{form.name}</h1>
            <Badge tone={form.status === 'published' ? 'ok' : 'warn'}>{form.status === 'published' ? 'Live' : 'Draft'}</Badge>
          </div>
        </div>
        <div className="row gap-1 wrap" style={{ flex: 'none' }}>
          <Button variant="ghost" size="sm" onClick={onDuplicate}><Icon name="copy" size={15} /> Duplicate</Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirmDel(true)}><Icon name="trash" size={15} /> Delete</Button>
          <Button variant={form.status === 'published' ? 'quiet' : 'primary'} size="sm" onClick={togglePublish}>
            <Icon name={form.status === 'published' ? 'eyeOff' : 'rocket'} size={15} /> {form.status === 'published' ? 'Unpublish' : 'Publish'}
          </Button>
        </div>
      </div>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { key: 'build', label: 'Build' },
          { key: 'style', label: 'Style + share' },
          { key: 'subs', label: 'Submissions', count: formSubmissionCount(form) },
        ]}
      />

      {tab === 'build' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1.15rem', alignItems: 'start' }} className="forms-build-grid">
          <style>{`@media (max-width: 900px){ .forms-build-grid{ grid-template-columns:1fr !important; } }`}</style>
          <Card className="col gap-2">
            <SectionHeader title="Fields" sub={`${fields.length} field${fields.length === 1 ? '' : 's'}`} />
            {fields.length === 0 && <div className="t-sm muted" style={{ padding: '.5rem 0' }}>No fields yet. Add one to start.</div>}
            <div className="col gap-1">
              {fields.map((fd, idx) => (
                <div
                  key={fd.id}
                  draggable
                  onDragStart={() => setDragIdx(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(idx)}
                  onDragEnd={() => setDragIdx(null)}
                  className="row gap-2"
                  style={{ padding: '.6rem .7rem', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', background: dragIdx === idx ? 'var(--n-100)' : 'var(--paper)', opacity: dragIdx === idx ? 0.55 : 1, alignItems: 'center' }}
                >
                  <span style={{ cursor: 'grab', color: 'var(--n-400)', flex: 'none' }} title="Drag to reorder"><Icon name="grid" size={15} /></span>
                  <div className="col" style={{ minWidth: 0, flex: 1 }}>
                    <span className="clip fw-6 t-sm">{fd.label}</span>
                    <span className="t-xs muted">
                      {fieldTypeLabel(fd.type)}
                      {fd.mapTo && fd.mapTo !== '__none' && <> {'->'} {propertyLabel(fd.mapTo)}</>}
                    </span>
                  </div>
                  {fd.required && <Badge tone="accent" className="t-xs">req</Badge>}
                  <button className="btn btn-quiet btn-sm" onClick={() => setEditing({ mode: 'edit', index: idx, field: fd })} aria-label="Edit field" style={{ padding: '.3rem' }}><Icon name="edit" size={15} /></button>
                  <button className="btn btn-quiet btn-sm" onClick={() => removeField(idx)} aria-label="Delete field" style={{ padding: '.3rem' }}><Icon name="trash" size={15} /></button>
                </div>
              ))}
            </div>
            <Button variant="ghost" onClick={() => setEditing({ mode: 'add', field: blankField('text') })} style={{ marginTop: '.4rem', borderStyle: 'dashed' }}>
              <Icon name="plus" size={16} /> Add field
            </Button>
          </Card>

          <Card className="col gap-2">
            <SectionHeader title="Live preview" sub="Exactly what visitors see" />
            <FormPreview form={form} />
          </Card>
        </div>
      )}

      {tab === 'style' && <StyleTab form={form} />}

      {tab === 'subs' && <SubmissionsTab form={form} />}

      {editing && (
        <FieldModal
          editing={editing}
          existingIds={fields.map(f => f.id)}
          onCancel={() => setEditing(null)}
          onSave={saveField}
        />
      )}

      <Modal open={confirmDel} onClose={() => setConfirmDel(false)} title="Delete form?"
        footer={<><Button variant="ghost" onClick={() => setConfirmDel(false)}>Cancel</Button><Button variant="danger" onClick={onDelete}>Delete form</Button></>}>
        <p className="t-sm">This permanently removes <b>{form.name}</b> and its {formSubmissionCount(form)} logged submission(s). Contacts already created stay in your book of business.</p>
      </Modal>
    </div>
  );
}

/* ---------- live preview (non-submitting) ---------- */
function FormPreview({ form }) {
  const accent = form.style?.accent || 'var(--accent)';
  const fields = form.fields || [];
  return (
    <div style={{ background: 'var(--n-50, var(--paper))', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: '1.25rem' }}>
      <div style={{ height: 4, width: 40, borderRadius: 999, background: accent, marginBottom: 14 }} />
      <h3 style={{ margin: '0 0 4px' }}>{form.name}</h3>
      {form.description && <div className="t-sm muted" style={{ marginBottom: 14 }}>{form.description}</div>}
      {fields.length === 0 ? (
        <div className="t-sm muted" style={{ fontStyle: 'italic' }}>Add a field to see it here.</div>
      ) : (
        <div className="col gap-2">
          {fields.map(fd => <PreviewField key={fd.id} fd={fd} />)}
          <button type="button" disabled style={{ marginTop: 6, padding: '.7rem 1rem', border: 'none', borderRadius: 10, background: accent, color: '#fff', fontWeight: 700, fontSize: '.95rem', opacity: .92, cursor: 'default' }}>
            {form.style?.buttonLabel || 'Submit'}
          </button>
        </div>
      )}
    </div>
  );
}
function PreviewField({ fd }) {
  const label = <label className="t-sm fw-6" style={{ display: 'block', marginBottom: 4 }}>{fd.label}{fd.required && <span style={{ color: 'var(--accent)' }}> *</span>}</label>;
  const help = fd.help ? <div className="t-xs muted" style={{ marginTop: 4 }}>{fd.help}</div> : null;
  if (fd.type === 'checkbox') return <div><label className="row gap-2 t-sm fw-6" style={{ alignItems: 'center' }}><input type="checkbox" disabled /> {fd.label}{fd.required && <span style={{ color: 'var(--accent)' }}> *</span>}</label>{help}</div>;
  let control;
  switch (fd.type) {
    case 'textarea': control = <Textarea rows={3} disabled placeholder={fd.placeholder} />; break;
    case 'select': control = <Select disabled><option>{fd.placeholder || 'Choose...'}</option>{(fd.options || []).map(o => <option key={o}>{o}</option>)}</Select>; break;
    case 'date': control = <Input type="date" disabled />; break;
    case 'number': control = <Input type="number" disabled placeholder={fd.placeholder} />; break;
    case 'email': control = <Input type="email" disabled placeholder={fd.placeholder} />; break;
    case 'phone': control = <Input type="tel" disabled placeholder={fd.placeholder || '(555) 555-1234'} />; break;
    default: control = <Input type="text" disabled placeholder={fd.placeholder} />;
  }
  return <div>{label}{control}{help}</div>;
}

/* ---------- field add/edit modal ---------- */
function FieldModal({ editing, onCancel, onSave }) {
  const [d, setD] = useState(() => ({
    ...editing.field,
    optionsText: Array.isArray(editing.field.options) ? editing.field.options.join(', ') : '',
  }));
  const set = (patch) => setD(p => ({ ...p, ...patch }));
  const needsOptions = typeNeedsOptions(d.type);

  function onTypeChange(type) {
    // Retarget the default contact mapping when switching to email/phone.
    const nextMap = (d.mapTo === '__none' || d.mapTo === defaultMapForType(d.type)) ? defaultMapForType(type) : d.mapTo;
    set({ type, mapTo: nextMap });
  }
  function commit() {
    if (!String(d.label || '').trim()) return;
    onSave({
      ...d,
      options: needsOptions ? String(d.optionsText || '').split(',').map(s => s.trim()).filter(Boolean) : [],
    });
  }

  return (
    <Modal open onClose={onCancel} title={editing.mode === 'add' ? 'Add field' : 'Edit field'}
      footer={<><Button variant="ghost" onClick={onCancel}>Cancel</Button><Button onClick={commit} disabled={!String(d.label || '').trim()}>{editing.mode === 'add' ? 'Add field' : 'Save field'}</Button></>}>
      <div className="col gap-3">
        <Field label="Label"><Input autoFocus value={d.label} onChange={e => set({ label: e.target.value })} placeholder="e.g. Work email" /></Field>
        <div className="row gap-2 wrap">
          <Field label="Type"><Select value={d.type} onChange={e => onTypeChange(e.target.value)}>{FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</Select></Field>
          <Field label="Maps to contact property"><Select value={d.mapTo} onChange={e => set({ mapTo: e.target.value })}>{CONTACT_PROPERTIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}</Select></Field>
        </div>
        {needsOptions && (
          <Field label="Options (comma separated)" hint="One per choice, e.g. S, M, L, XL">
            <Input value={d.optionsText} onChange={e => set({ optionsText: e.target.value })} placeholder="S, M, L, XL" />
          </Field>
        )}
        <Field label="Placeholder"><Input value={d.placeholder} onChange={e => set({ placeholder: e.target.value })} placeholder="Optional" /></Field>
        <Field label="Help text"><Input value={d.help} onChange={e => set({ help: e.target.value })} placeholder="Optional hint under the field" /></Field>
        <label className="row gap-2 t-sm fw-6" style={{ alignItems: 'center', cursor: 'pointer' }}>
          <input type="checkbox" checked={!!d.required} onChange={e => set({ required: e.target.checked })} /> Required field
        </label>
      </div>
    </Modal>
  );
}

/* ---------- style + share tab ---------- */
function StyleTab({ form }) {
  const toast = useToast();
  const s = form.style || {};
  const [local, setLocal] = useState({
    name: form.name, description: form.description || '',
    buttonLabel: s.buttonLabel || 'Submit',
    successTitle: s.successTitle || '', successBody: s.successBody || '',
    notifyEmail: form.notifyEmail || '',
  });
  // Reseed if the underlying form identity changes.
  useEffect(() => {
    setLocal({
      name: form.name, description: form.description || '',
      buttonLabel: form.style?.buttonLabel || 'Submit',
      successTitle: form.style?.successTitle || '', successBody: form.style?.successBody || '',
      notifyEmail: form.notifyEmail || '',
    });
  }, [form.id]); // eslint-disable-line
  const setL = (patch) => setLocal(p => ({ ...p, ...patch }));

  const commitText = () => updateForm(form.id, {
    name: local.name || form.name,
    description: local.description,
    notifyEmail: local.notifyEmail,
    style: { buttonLabel: local.buttonLabel, successTitle: local.successTitle, successBody: local.successBody },
  });
  const setAccent = (accent) => updateForm(form.id, { style: { accent } });
  const setTheme = (theme) => updateForm(form.id, { style: { theme } });

  const url = hostedUrl(form);
  const snippet = embedSnippet(form);
  const copy = async (text, what) => { try { await navigator.clipboard.writeText(text); toast(`${what} copied`); } catch { toast('Copy failed', 'risk'); } };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1.15rem', alignItems: 'start' }} className="forms-build-grid">
      <div className="col gap-4">
        <Card className="col gap-3">
          <SectionHeader title="Basics" />
          <Field label="Form name"><Input value={local.name} onChange={e => setL({ name: e.target.value })} onBlur={commitText} /></Field>
          <Field label="Description"><Textarea rows={2} value={local.description} onChange={e => setL({ description: e.target.value })} onBlur={commitText} placeholder="Shown under the title" /></Field>
          <Field label="Submit button label"><Input value={local.buttonLabel} onChange={e => setL({ buttonLabel: e.target.value })} onBlur={commitText} /></Field>
        </Card>

        <Card className="col gap-3">
          <SectionHeader title="Appearance" />
          <div className="col gap-2">
            <label className="t-sm fw-6">Accent color</label>
            <div className="row gap-2 wrap">
              {ACCENTS.map(c => (
                <button key={c} onClick={() => setAccent(c)} aria-label={`Accent ${c}`}
                  style={{ width: 30, height: 30, borderRadius: 8, background: c, border: (form.style?.accent === c) ? '3px solid var(--ink)' : '2px solid var(--line)', cursor: 'pointer' }} />
              ))}
            </div>
          </div>
          <div className="col gap-2">
            <label className="t-sm fw-6">Theme</label>
            <Segmented options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]} value={form.style?.theme || 'dark'} onChange={setTheme} />
          </div>
        </Card>

        <Card className="col gap-3">
          <SectionHeader title="On submit" sub="Shown after a successful submission" />
          <Field label="Success headline"><Input value={local.successTitle} onChange={e => setL({ successTitle: e.target.value })} onBlur={commitText} placeholder="Thanks for reaching out." /></Field>
          <Field label="Success body"><Textarea rows={2} value={local.successBody} onChange={e => setL({ successBody: e.target.value })} onBlur={commitText} placeholder="We will be in touch shortly." /></Field>
          <Field label="Notify email" hint="Optional. Emailed on each submission (requires RESEND_API_KEY; safe no-op otherwise).">
            <Input type="email" value={local.notifyEmail} onChange={e => setL({ notifyEmail: e.target.value })} onBlur={commitText} placeholder="you@company.com" />
          </Field>
        </Card>
      </div>

      <div className="col gap-4">
        <Card className="col gap-3">
          <SectionHeader title="Share" action={<Button as="a" href={url} target="_blank" rel="noreferrer" variant="ghost" size="sm"><Icon name="arrowRight" size={14} /> Open</Button>} />
          {form.status !== 'published' && <div className="t-xs" style={{ color: 'var(--warn)' }}>This form is a draft. Publish it before sharing the link publicly.</div>}
          <Field label="Hosted link">
            <div className="row gap-1">
              <Input readOnly value={url} onFocus={e => e.target.select()} style={{ flex: 1 }} />
              <Button variant="ghost" onClick={() => copy(url, 'Link')}><Icon name="copy" size={15} /></Button>
            </div>
          </Field>
          <div className="col gap-1">
            <div className="row between">
              <label className="t-sm fw-6">Embed snippet</label>
              <Button variant="ghost" size="sm" onClick={() => copy(snippet, 'Embed')}><Icon name="copy" size={14} /> Copy</Button>
            </div>
            <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: '.76rem', background: 'var(--n-100)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '.8rem', overflowX: 'auto', whiteSpace: 'pre', color: 'var(--n-700)' }}>{snippet}</pre>
          </div>
        </Card>
        <Card className="col gap-2">
          <SectionHeader title="Preview" />
          <FormPreview form={form} />
        </Card>
      </div>
    </div>
  );
}

/* ---------- submissions tab ---------- */
function SubmissionsTab({ form }) {
  useStore();   // resolve created-contact names live
  const subs = form.submissions || [];
  const fieldById = useMemo(() => Object.fromEntries((form.fields || []).map(f => [f.id, f])), [form.fields]);

  if (subs.length === 0) {
    return <Card><EmptyState icon="📥" title="No submissions yet" body="Share your hosted link or embed the form. Submissions land here and become contacts automatically." /></Card>;
  }

  return (
    <Card className="col gap-2" pad={false}>
      <div style={{ padding: '1rem 1.1rem .4rem' }}><SectionHeader title={`${subs.length} submission${subs.length === 1 ? '' : 's'}`} sub="Newest first. Each row created a contact in your book of business." /></div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.9rem' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--n-600)', borderBottom: '1px solid var(--line)' }}>
              <th style={{ padding: '.6rem 1.1rem', fontWeight: 700 }}>When</th>
              <th style={{ padding: '.6rem 1.1rem', fontWeight: 700 }}>Contact</th>
              <th style={{ padding: '.6rem 1.1rem', fontWeight: 700 }}>Submission</th>
            </tr>
          </thead>
          <tbody>
            {subs.map(sub => {
              const contact = submissionContact(sub);
              const entries = Object.entries(sub.data || {}).filter(([, v]) => v != null && v !== '');
              return (
                <tr key={sub.id} style={{ borderBottom: '1px solid var(--line)', verticalAlign: 'top' }}>
                  <td style={{ padding: '.7rem 1.1rem', whiteSpace: 'nowrap', color: 'var(--n-600)' }}>{relTime(sub.at)}</td>
                  <td style={{ padding: '.7rem 1.1rem', whiteSpace: 'nowrap' }}>
                    {contact
                      ? <a href={`/contacts/${contact.id}`} className="fw-6" style={{ color: 'var(--accent-600)' }}>{contactName(contact)}</a>
                      : <span className="muted">external</span>}
                  </td>
                  <td style={{ padding: '.7rem 1.1rem' }}>
                    <div className="row gap-1 wrap">
                      {entries.map(([k, v]) => (
                        <span key={k} className="badge t-xs" title={fieldById[k]?.label || k}>
                          <b>{fieldById[k]?.label || k}:</b>&nbsp;{String(v).slice(0, 60)}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
