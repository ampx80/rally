// Forms. Ardovo's best-in-class form engine (built to beat Zoho Forms,
// Typeform, and HubSpot Forms).
//   List        - every form with live submission + created-contact counts.
//   Builder     - drag-drop typed fields across multiple steps, per-field
//                 conditional logic, theming, and the hosted link + embed.
//   Analytics   - views, starts, completions, completion rate, per-step
//                 drop-off.
//   Submissions - the raw inbound rows, each linked to the contact it created
//                 or updated.
//
// The public hosted page lives at /f/:formId (src/marketing/HostedForm.jsx).
// This page and that page share the same local-first slice (src/lib/forms.js)
// and the same renderer (src/components/forms/FormRenderer.jsx), so a
// submission on the hosted form shows up here and its contact lands in the
// book of business. ADDITIVE: only reads/writes through existing store writers.
// ASCII only. NO em-dash / en-dash.
import React, { useEffect, useMemo, useState } from 'react';
import {
  useForms, getForms, getForm, formStats, formSubmissionCount,
  createForm, updateForm, deleteForm, duplicateForm, setFormStatus,
  hostedUrl, embedSnippet, submissionContact,
  FIELD_TYPES, fieldTypeLabel, fieldTypeIcon, typeIsStatic, blankField,
  propertyLabel, stepCount, fieldsForStep, formAnalytics,
} from '../lib/forms.js';
import { useStore, contactName } from '../lib/store.js';
import {
  Button, Card, Badge, PageTitle, SectionHeader, Field, Input, Textarea,
  Modal, Tabs, StatCard, EmptyState, Segmented, ProgressBar, useToast, relTime,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import FormRenderer from '../components/forms/FormRenderer.jsx';
import FieldEditor from '../components/forms/FieldEditor.jsx';
import '../components/forms/builder.css';

const ACCENTS = ['#5b4bf5', '#0ea5a3', '#e0752d', '#c0392b', '#2563a8', '#8b3fd4'];
const WIDTHS = [{ value: 440, label: 'Narrow' }, { value: 560, label: 'Standard' }, { value: 680, label: 'Wide' }];

/* ============================================================
   ROOT: list <-> builder
   ============================================================ */
export default function Forms() {
  const [selId, setSelId] = useState(null);
  useForms();                 // re-render on any forms mutation
  const form = selId ? getForm(selId) : null;

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
        sub="Multi-step hosted forms and embeds with conditional logic, payments, and spam protection. Every submission becomes a real contact."
        action={<Button onClick={newForm}><Icon name="plus" size={16} /> New form</Button>}
      />

      <div className="grid-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
        <StatCard label="Forms" value={stats.total} icon={<Icon name="list" size={18} />} />
        <StatCard label="Published" value={stats.published} accent="var(--ok)" icon={<Icon name="check" size={18} />} />
        <StatCard label="Views" value={stats.views} accent="var(--accent-teal)" icon={<Icon name="eye" size={18} />} />
        <StatCard label="Submissions" value={stats.submissions} accent="var(--accent-purple)" icon={<Icon name="inbox" size={18} />} />
        <StatCard label="Contacts created" value={stats.contacts} accent="var(--accent)" icon={<Icon name="users" size={18} />} />
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
  const steps = stepCount(form);
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
            <span className="t-xs muted clip">{(form.fields || []).length} field{(form.fields || []).length === 1 ? '' : 's'}{steps > 1 ? ` \u00b7 ${steps} steps` : ''}</span>
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
  const [dragId, setDragId] = useState(null);
  const [confirmDel, setConfirmDel] = useState(false);

  const fields = form.fields || [];
  const steps = stepCount(form);

  const patchFields = (next) => updateForm(form.id, { fields: next });

  function saveField(draft) {
    if (editing.mode === 'add') patchFields([...fields, draft]);
    else {
      const next = fields.slice();
      const i = fields.findIndex(f => f.id === editing.field.id);
      if (i >= 0) next[i] = { ...draft, id: fields[i].id };
      patchFields(next);
    }
    setEditing(null);
  }
  function removeField(id) { patchFields(fields.filter(f => f.id !== id)); }
  function addFieldToStep(step) { setEditing({ mode: 'add', field: { ...blankField('text'), step } }); }
  function addStep() { setEditing({ mode: 'add', field: { ...blankField('heading'), step: steps, label: `Step ${steps + 1}` } }); }

  // Drag reorder. Dropping onto a field moves the dragged field to that
  // position AND adopts the target's step (so dragging into another step group
  // moves it there). Dropping onto a step header moves it to that step's end.
  function onDropField(targetId) {
    if (!dragId || dragId === targetId) { setDragId(null); return; }
    const next = fields.slice();
    const from = next.findIndex(f => f.id === dragId);
    const to = next.findIndex(f => f.id === targetId);
    if (from < 0 || to < 0) { setDragId(null); return; }
    const [moved] = next.splice(from, 1);
    moved.step = next[to > from ? to - 1 : to]?.step ?? moved.step;
    const insertAt = next.findIndex(f => f.id === targetId);
    next.splice(insertAt, 0, moved);
    setDragId(null);
    patchFields(next);
  }
  function onDropStep(step) {
    if (!dragId) return;
    const next = fields.slice();
    const from = next.findIndex(f => f.id === dragId);
    if (from < 0) { setDragId(null); return; }
    const [moved] = next.splice(from, 1);
    moved.step = step;
    next.push(moved);
    setDragId(null);
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
          <Button as="a" href={hostedUrl(form)} target="_blank" rel="noreferrer" variant="ghost" size="sm"><Icon name="arrowUpRight" size={15} /> Open</Button>
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
          { key: 'analytics', label: 'Analytics' },
          { key: 'subs', label: 'Submissions', count: formSubmissionCount(form) },
        ]}
      />

      {tab === 'build' && (
        <div className="forms-build-grid">
          <Card className="col gap-3">
            <SectionHeader title="Fields" sub={`${fields.length} field${fields.length === 1 ? '' : 's'} across ${steps} step${steps === 1 ? '' : 's'}`} />
            {fields.length === 0 && <div className="t-sm muted" style={{ padding: '.5rem 0' }}>No fields yet. Add one to start.</div>}

            <div className="col gap-3">
              {Array.from({ length: steps }).map((_, si) => (
                <div key={si} className="forms-step">
                  <div className="forms-step-head" onDragOver={(e) => e.preventDefault()} onDrop={() => onDropStep(si)}>
                    <span className="forms-step-title">Step {si + 1}</span>
                    <button className="btn btn-quiet btn-sm" onClick={() => addFieldToStep(si)} style={{ padding: '.25rem .5rem' }}><Icon name="plus" size={14} /> Field</button>
                  </div>
                  {fieldsForStep(form, si).length === 0 ? (
                    <div className="t-xs muted" style={{ padding: '.6rem .7rem' }}>Empty step. Drag a field here or add one.</div>
                  ) : fieldsForStep(form, si).map(fd => (
                    <div
                      key={fd.id}
                      draggable
                      onDragStart={() => setDragId(fd.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => onDropField(fd.id)}
                      onDragEnd={() => setDragId(null)}
                      className={`forms-field-row${dragId === fd.id ? ' is-drag' : ''}`}
                    >
                      <span className="grip" title="Drag to reorder"><Icon name="grid" size={15} /></span>
                      <span style={{ color: 'var(--n-500)', flex: 'none' }}><Icon name={fieldTypeIcon(fd.type)} size={15} /></span>
                      <div className="col" style={{ minWidth: 0, flex: 1 }}>
                        <span className="clip fw-6 t-sm">{fd.label || <span className="muted">Untitled</span>}</span>
                        <span className="t-xs muted row gap-1 wrap" style={{ alignItems: 'center' }}>
                          <span>{fieldTypeLabel(fd.type)}</span>
                          {!typeIsStatic(fd.type) && fd.mapTo && fd.mapTo !== '__none' && <span>{'\u2192'} {propertyLabel(fd.mapTo)}</span>}
                          {fd.visibleIf && fd.visibleIf.field && <span className="forms-cond-chip"><Icon name="gitBranch" size={11} /> logic</span>}
                        </span>
                      </div>
                      {fd.required && <Badge tone="accent" className="t-xs">req</Badge>}
                      <button className="btn btn-quiet btn-sm" onClick={() => setEditing({ mode: 'edit', field: fd })} aria-label="Edit field" style={{ padding: '.3rem' }}><Icon name="edit" size={15} /></button>
                      <button className="btn btn-quiet btn-sm" onClick={() => removeField(fd.id)} aria-label="Delete field" style={{ padding: '.3rem' }}><Icon name="trash" size={15} /></button>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="col gap-2" style={{ marginTop: '.3rem' }}>
              <span className="t-xs fw-7 muted" style={{ letterSpacing: '.05em', textTransform: 'uppercase' }}>Quick add to last step</span>
              <div className="forms-palette">
                {FIELD_TYPES.map(t => (
                  <button key={t.value} onClick={() => setEditing({ mode: 'add', field: { ...blankField(t.value), step: steps - 1 } })}>
                    <Icon name={t.icon} size={15} /> {t.label}
                  </button>
                ))}
              </div>
              <Button variant="ghost" onClick={addStep} style={{ borderStyle: 'dashed', marginTop: '.2rem' }}><Icon name="plus" size={16} /> Add step</Button>
            </div>
          </Card>

          <Card className="col gap-2">
            <SectionHeader title="Live preview" sub="Interactive. Try the steps and logic." />
            <div style={{ maxWidth: form.style?.width || 560, width: '100%', margin: '0 auto' }}>
              <FormRenderer form={form} mode="preview" />
            </div>
          </Card>
        </div>
      )}

      {tab === 'style' && <StyleTab form={form} />}
      {tab === 'analytics' && <AnalyticsTab form={form} />}
      {tab === 'subs' && <SubmissionsTab form={form} />}

      {editing && (
        <FieldEditor
          editing={editing}
          priorFields={fields.filter(f => f.id !== editing.field.id)}
          stepCount={steps}
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

/* ---------- style + share tab ---------- */
function StyleTab({ form }) {
  const toast = useToast();
  const s = form.style || {};
  const [local, setLocal] = useState(seed());
  function seed() {
    return {
      name: form.name, description: form.description || '',
      buttonLabel: form.style?.buttonLabel || 'Submit',
      successTitle: form.style?.successTitle || '', successBody: form.style?.successBody || '',
      notifyEmail: form.notifyEmail || '',
    };
  }
  useEffect(() => { setLocal(seed()); }, [form.id]); // eslint-disable-line
  const setL = (patch) => setLocal(p => ({ ...p, ...patch }));

  const commitText = () => updateForm(form.id, {
    name: local.name || form.name,
    description: local.description,
    notifyEmail: local.notifyEmail,
    style: { buttonLabel: local.buttonLabel, successTitle: local.successTitle, successBody: local.successBody },
  });
  const setAccent = (accent) => updateForm(form.id, { style: { accent } });
  const setTheme = (theme) => updateForm(form.id, { style: { theme } });
  const setWidth = (width) => updateForm(form.id, { style: { width } });

  const url = hostedUrl(form);
  const snippet = embedSnippet(form);
  const copy = async (text, what) => { try { await navigator.clipboard.writeText(text); toast(`${what} copied`); } catch { toast('Copy failed', 'risk'); } };

  return (
    <div className="forms-build-grid">
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
          <div className="col gap-2">
            <label className="t-sm fw-6">Width</label>
            <Segmented options={WIDTHS} value={form.style?.width || 560} onChange={setWidth} />
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
          <div style={{ maxWidth: form.style?.width || 560, width: '100%', margin: '0 auto' }}>
            <FormRenderer form={form} mode="preview" />
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------- analytics tab ---------- */
function AnalyticsTab({ form }) {
  const a = formAnalytics(form);
  const multi = a.byStep.length > 1;
  const accent = form.style?.accent || 'var(--accent)';
  return (
    <div className="col gap-4">
      <div className="grid-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
        <StatCard label="Views" value={a.views} icon={<Icon name="eye" size={18} />} />
        <StatCard label="Starts" value={a.starts} accent="var(--accent-teal)" icon={<Icon name="play" size={18} />} />
        <StatCard label="Completions" value={a.completions} accent="var(--ok)" icon={<Icon name="check" size={18} />} />
        <StatCard label="Completion rate" value={a.completionRate} format={(n) => `${Math.round(n)}%`} accent="var(--accent-purple)" icon={<Icon name="gauge" size={18} />} />
      </div>

      <Card className="col gap-3">
        <SectionHeader title={multi ? 'Drop-off by step' : 'Funnel'} sub={multi ? 'How many visitors reach each step, and where they leave.' : 'Views to completed submissions.'} />
        {a.starts === 0 && a.views === 0 ? (
          <EmptyState icon="📊" title="No traffic yet" body="Share your hosted link or embed the form. Views, starts, and completions will show up here." />
        ) : (
          <div className="col gap-3">
            {a.byStep.map((st, i) => {
              const base = a.byStep[0]?.reached || a.starts || 1;
              const pct = base ? Math.round((st.reached / base) * 100) : 0;
              return (
                <div key={st.step} className="col gap-1">
                  <div className="row between">
                    <span className="t-sm fw-6">{st.label}</span>
                    <span className="t-sm muted"><b style={{ color: 'var(--ink)' }}>{st.reached}</b> reached{i > 0 && st.dropOff > 0 ? ` \u00b7 ${st.dropOff}% drop-off` : ''}</span>
                  </div>
                  <ProgressBar value={pct} color={accent} />
                </div>
              );
            })}
            <div className="col gap-1">
              <div className="row between">
                <span className="t-sm fw-6">Completed</span>
                <span className="t-sm muted"><b style={{ color: 'var(--ink)' }}>{a.completions}</b> submitted</span>
              </div>
              <ProgressBar value={a.starts ? Math.round((a.completions / a.starts) * 100) : 0} color="var(--ok)" />
            </div>
          </div>
        )}
      </Card>
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
      <div style={{ padding: '1rem 1.1rem .4rem' }}><SectionHeader title={`${subs.length} submission${subs.length === 1 ? '' : 's'}`} sub="Newest first. Each row created or updated a contact in your book of business." /></div>
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
              const entries = Object.entries(sub.data || {}).filter(([k, v]) => v != null && v !== '' && !(Array.isArray(v) && v.length === 0) && (fieldById[k]?.type !== 'heading'));
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
                          <b>{fieldById[k]?.label || k}:</b>&nbsp;{(Array.isArray(v) ? v.join(', ') : String(v)).slice(0, 60)}
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
