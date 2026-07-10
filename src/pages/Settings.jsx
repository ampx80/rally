// Settings - the admin surface for the Rally workspace. Tabbed sub-sections
// (Workspace, Pipeline, Notifications, Branding, Data) styled to feel like a
// real enterprise console. Everything is local state; the Data tab's danger
// zone resets the demo seed for both stores and reloads.
import React, { useState } from 'react';
import { useStore, STAGES, resetStore } from '../lib/store';
import { resetExt } from '../lib/store-ext';
import {
  Card, Button, Badge, SectionHeader, Tabs, ProgressBar, Field, Input, Select,
  Textarea, Modal, useToast,
} from '../components/UI';
import { Icon } from '../components/icons';
import { MODULES, setModule, enabledCount, useModules } from '../lib/modules';
import {
  OBJECT_TYPES, CUSTOM_FIELD_TYPES, fieldTypeLabel, typeHasOptions,
  getFieldSections, getSystemFields, getCustomFields, useFields,
  addCustomField, updateCustomField, removeCustomField, getFieldOptions,
} from '../lib/fields';
import { resetAudit } from '../lib/audit';

const ACCENT = '#5b4bf5';
const STAGE_COLOR = {
  lead: '#8b93a4', qualified: '#2563a8', discovery: '#5b4bf5', proposal: '#b3721a',
  negotiation: '#0ea5a3', won: '#1a7f52', lost: '#c0392b',
};

/* ---------- inline CSS toggle switch ---------- */
function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      aria-label={label}
      style={{
        width: 44, height: 26, borderRadius: 999, border: 'none', cursor: 'pointer',
        flex: 'none', padding: 0, position: 'relative',
        background: checked ? ACCENT : 'var(--n-200, #d7dce3)',
        transition: 'background .18s var(--ease)',
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: checked ? 21 : 3,
        width: 20, height: 20, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 3px rgba(16,20,30,.28)',
        transition: 'left .18s var(--ease)',
      }} />
    </button>
  );
}

function ToggleRow({ label, hint, checked, onChange }) {
  return (
    <div className="row between gap-2" style={{ padding: '.85rem 0', borderTop: '1px solid var(--line)' }}>
      <div className="col" style={{ minWidth: 0, gap: 2 }}>
        <span className="fw-6">{label}</span>
        {hint && <span className="muted t-sm">{hint}</span>}
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

const TABS = [
  { key: 'workspace', label: 'Workspace' },
  { key: 'modules', label: 'Modules' },
  { key: 'fields', label: 'Fields' },
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'branding', label: 'Branding' },
  { key: 'data', label: 'Data' },
];

const SWATCHES = ['#5b4bf5', '#0ea5a3', '#e0752d', '#c0392b', '#2563a8', '#8b3fd4', '#1a7f52', '#d4a017'];

/* ---------- Fields tab: the field registry manager (Wave 1) ----------
   Pick an object type, browse its canonical sections (system rows are
   read-only), and add / edit / delete custom fields - the same registry
   the record editors and views engine read. */
function FieldModal({ open, onClose, objectType, field, sections, onSaved }) {
  const toast = useToast();
  const editing = !!field;
  const [label, setLabel] = useState(field?.label || '');
  const [type, setType] = useState(field?.type || 'text');
  const [section, setSection] = useState(field?.section || 'Custom fields');
  const [optionsText, setOptionsText] = useState(
    field ? getFieldOptions(field).map(o => o.label).join('\n') : ''
  );

  const save = () => {
    const def = {
      label, type, section,
      options: typeHasOptions(type)
        ? optionsText.split('\n').map(s => s.trim()).filter(Boolean)
        : undefined,
    };
    const res = editing
      ? updateCustomField(objectType, field.id, def)
      : addCustomField(objectType, def);
    if (res.error) { toast(res.message, 'risk'); return; }
    toast(editing ? 'Field updated' : `Field "${res.field.label}" added`);
    onSaved?.();
    onClose();
  };

  const sectionChoices = [...new Set([...sections, 'Custom fields'])];
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit custom field' : 'New custom field'} width={600}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={save}>{editing ? 'Save field' : 'Add field'}</Button>
        </>
      }>
      <div className="col gap-2">
        <Field label="Field label">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Contract vehicle" autoFocus />
        </Field>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {CUSTOM_FIELD_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </Select>
          </Field>
          <Field label="Section">
            <Select value={section} onChange={(e) => setSection(e.target.value)}>
              {sectionChoices.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
        </div>
        {typeHasOptions(type) && (
          <Field label="Picklist values" hint="One value per line.">
            <Textarea value={optionsText} onChange={(e) => setOptionsText(e.target.value)} rows={5}
              placeholder={'Tier 1\nTier 2\nTier 3'} />
          </Field>
        )}
      </div>
    </Modal>
  );
}

function FieldsTab() {
  const toast = useToast();
  useFields(); // re-render on registry changes
  const [objectType, setObjectType] = useState('contact');
  const [openSections, setOpenSections] = useState({ 0: true });
  const [modal, setModal] = useState(null); // null | { field? }

  const sections = getFieldSections(objectType);
  const sectionNames = sections.map(s => s.section);
  const systemCount = getSystemFields(objectType).length;
  const customCount = getCustomFields(objectType).length;
  const toggle = (i) => setOpenSections(s => ({ ...s, [i]: !s[i] }));

  const remove = (field) => {
    if (!window.confirm(`Delete the custom field "${field.label}"? Stored values stay on records but stop rendering.`)) return;
    const res = removeCustomField(objectType, field.id);
    if (res.error) toast(res.message, 'risk'); else toast('Field deleted');
  };

  return (
    <Card className="col" style={{ gap: '1.1rem' }}>
      <div className="row between wrap gap-2" style={{ alignItems: 'flex-start' }}>
        <div className="col gap-1">
          <h4 style={{ margin: 0 }}>Fields</h4>
          <span className="muted t-sm" style={{ maxWidth: '56ch' }}>
            The field registry behind every record editor, filter, and view. Canonical fields are
            system-owned; add custom fields and they behave exactly the same everywhere.
          </span>
        </div>
        <Button size="sm" onClick={() => setModal({})}>
          <Icon name="plus" size={15} /> Add custom field
        </Button>
      </div>

      <div className="row gap-2 wrap" style={{ alignItems: 'center' }}>
        <div style={{ minWidth: 220 }}>
          <Select value={objectType} onChange={(e) => { setObjectType(e.target.value); setOpenSections({ 0: true }); }}>
            {OBJECT_TYPES.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </Select>
        </div>
        <Badge tone="accent">{systemCount} system</Badge>
        <Badge>{customCount} custom</Badge>
      </div>

      <div className="col">
        {sections.map((s, i) => {
          const open = !!openSections[i];
          return (
            <div key={s.section} style={{ borderTop: '1px solid var(--line)' }}>
              <button onClick={() => toggle(i)} className="row between gap-2"
                style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '.8rem 0', textAlign: 'left' }}>
                <span className="row gap-2" style={{ alignItems: 'center' }}>
                  <Icon name={open ? 'chevronDown' : 'chevronRight'} size={15} />
                  <span className="fw-7">{s.section}</span>
                </span>
                <span className="muted t-sm tnum">{s.fields.length} fields</span>
              </button>
              {open && (
                <div className="col" style={{ paddingBottom: '.6rem' }}>
                  {s.fields.map(fd => (
                    <div key={fd.key} className="row gap-2" style={{ alignItems: 'center', padding: '.42rem 0 .42rem 1.55rem' }}>
                      <div className="col" style={{ minWidth: 0, flex: 1, gap: 1 }}>
                        <span className="fw-6" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fd.label}</span>
                        <span className="t-xs muted" style={{ fontFamily: 'var(--font-mono)' }}>{fd.key}</span>
                      </div>
                      <Badge className="t-xs" style={{ flex: 'none' }}>{fieldTypeLabel(fd.type)}</Badge>
                      {fd.computed && <Badge tone="info" className="t-xs" style={{ flex: 'none' }}>System-computed</Badge>}
                      {fd.required && <Badge tone="warn" className="t-xs" style={{ flex: 'none' }}>Required</Badge>}
                      {fd.system ? (
                        <Badge className="t-xs" style={{ flex: 'none' }}>System</Badge>
                      ) : (
                        <span className="row gap-1" style={{ flex: 'none' }}>
                          <Badge tone="accent" className="t-xs">Custom</Badge>
                          <Button variant="quiet" size="sm" aria-label={`Edit ${fd.label}`} onClick={() => setModal({ field: fd })}>
                            <Icon name="edit" size={14} />
                          </Button>
                          <Button variant="quiet" size="sm" aria-label={`Delete ${fd.label}`} onClick={() => remove(fd)}>
                            <Icon name="trash" size={14} />
                          </Button>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {modal && (
        <FieldModal open onClose={() => setModal(null)} objectType={objectType}
          field={modal.field} sections={sectionNames} />
      )}
    </Card>
  );
}

export default function Settings() {
  useStore(); // subscribe for reactivity
  const mods = useModules(); // re-render on module toggle
  const toast = useToast();
  const [tab, setTab] = useState('workspace');

  const [notif, setNotif] = useState({ won: true, task: true, mention: true, digest: false });
  const setN = (k) => (v) => setNotif(s => ({ ...s, [k]: v }));

  const resetDemo = () => {
    resetStore();
    resetExt();
    resetAudit(); // audit entries point at reseeded record ids
    toast('Demo data reset');
    setTimeout(() => location.reload(), 400);
  };

  return (
    <div className="fade-up col gap-3">
      <SectionHeader title="Settings" sub="Workspace configuration and preferences." />

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {/* ---------- MODULES (the CRM control panel) ---------- */}
      {tab === 'modules' && (
        <Card className="col" style={{ gap: '1.4rem' }}>
          <div className="row between wrap gap-2" style={{ alignItems: 'flex-start' }}>
            <div className="col gap-1">
              <h4 style={{ margin: 0 }}>Modules</h4>
              <span className="muted t-sm" style={{ maxWidth: '52ch' }}>Turn modules on or off for this workspace. Disabled modules disappear from the sidebar. The CRM core (Command center, Deals, Contacts, Companies, My day) is always on.</span>
            </div>
            <Badge tone="accent">{enabledCount()} of {MODULES.length} on</Badge>
          </div>
          {[...new Set(MODULES.map(m => m.section))].map(section => (
            <div key={section} className="col">
              <div className="eyebrow" style={{ marginBottom: '.15rem' }}>{section}</div>
              {MODULES.filter(m => m.section === section).map(m => (
                <ToggleRow key={m.key} label={m.label} hint={m.desc}
                  checked={mods[m.key] !== false}
                  onChange={(v) => { setModule(m.key, v); toast(v ? `${m.label} turned on` : `${m.label} turned off`); }} />
              ))}
            </div>
          ))}
        </Card>
      )}

      {/* ---------- FIELDS (the registry manager) ---------- */}
      {tab === 'fields' && <FieldsTab />}

      {/* ---------- WORKSPACE ---------- */}
      {tab === 'workspace' && (
        <Card className="col" style={{ gap: '1.25rem' }}>
          <div className="col gap-1">
            <h4 style={{ margin: 0 }}>Workspace</h4>
            <span className="muted t-sm">The basics for your Rally instance.</span>
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.1rem' }}>
            <Field label="Workspace name">
              <Input defaultValue="Rally" />
            </Field>
            <Field label="Plan">
              <div className="row" style={{ height: 42, alignItems: 'center' }}>
                <Badge tone="accent">Enterprise</Badge>
              </div>
            </Field>
            <Field label="Region">
              <Select defaultValue="us-east">
                <option value="us-east">US East (N. Virginia)</option>
                <option value="us-west">US West (Oregon)</option>
                <option value="eu-west">EU West (Ireland)</option>
                <option value="ap-south">Asia Pacific (Mumbai)</option>
              </Select>
            </Field>
            <Field label="Fiscal year start">
              <Select defaultValue="jan">
                <option value="jan">January</option>
                <option value="feb">February</option>
                <option value="apr">April</option>
                <option value="jul">July</option>
                <option value="oct">October</option>
              </Select>
            </Field>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', borderTop: '1px solid var(--line)', paddingTop: '1rem' }}>
            <Button size="sm" onClick={() => toast('Workspace saved')}>Save changes</Button>
          </div>
        </Card>
      )}

      {/* ---------- PIPELINE ---------- */}
      {tab === 'pipeline' && (
        <Card className="col" style={{ gap: '1.1rem' }}>
          <div className="col gap-1">
            <h4 style={{ margin: 0 }}>Pipeline stages</h4>
            <span className="muted t-sm">Stages and their default win probability. Later stages convert more.</span>
          </div>
          <div className="col">
            {STAGES.map((s, i) => (
              <div key={s.id} className="row gap-2" style={{ alignItems: 'center', padding: '.8rem 0', borderTop: i === 0 ? 'none' : '1px solid var(--line)' }}>
                <span className="dot" style={{ background: STAGE_COLOR[s.id] || ACCENT, flex: 'none' }} />
                <span className="fw-6" style={{ width: 120, flex: 'none' }}>{s.name}</span>
                <div style={{ flex: 1, minWidth: 80 }}>
                  <ProgressBar value={s.probability} color={STAGE_COLOR[s.id] || ACCENT} height={8} />
                </div>
                <span className="fw-7 tnum" style={{ width: 48, textAlign: 'right', flex: 'none' }}>{s.probability}%</span>
              </div>
            ))}
          </div>
          <div className="t-xs muted" style={{ borderTop: '1px solid var(--line)', paddingTop: '.7rem' }}>
            Probability drives weighted forecast. Editing stage definitions is an admin action.
          </div>
        </Card>
      )}

      {/* ---------- NOTIFICATIONS ---------- */}
      {tab === 'notifications' && (
        <Card className="col" style={{ gap: '.25rem' }}>
          <div className="col gap-1" style={{ marginBottom: '.5rem' }}>
            <h4 style={{ margin: 0 }}>Notifications</h4>
            <span className="muted t-sm">Choose what Rally pings you about.</span>
          </div>
          <ToggleRow label="Deal won" hint="A deal you own moves to Closed Won." checked={notif.won} onChange={setN('won')} />
          <ToggleRow label="Task due" hint="An activity assigned to you is due today." checked={notif.task} onChange={setN('task')} />
          <ToggleRow label="Mentions" hint="Someone @mentions you on a record." checked={notif.mention} onChange={setN('mention')} />
          <ToggleRow label="Weekly digest" hint="A Monday summary of your pipeline." checked={notif.digest} onChange={setN('digest')} />
        </Card>
      )}

      {/* ---------- BRANDING ---------- */}
      {tab === 'branding' && (
        <Card className="col" style={{ gap: '1.25rem' }}>
          <div className="col gap-1">
            <h4 style={{ margin: 0 }}>Branding</h4>
            <span className="muted t-sm">The accent color used across your workspace.</span>
          </div>
          <div className="row gap-3" style={{ alignItems: 'center' }}>
            <span style={{ width: 64, height: 64, borderRadius: 14, background: ACCENT, boxShadow: 'var(--accent-glow, 0 6px 18px rgba(91,75,245,.35))', flex: 'none' }} />
            <div className="col gap-1">
              <span className="fw-7" style={{ fontSize: '1.05rem' }}>Rally Violet</span>
              <span className="muted t-sm tnum" style={{ fontFamily: 'var(--font-mono)' }}>{ACCENT.toUpperCase()}</span>
            </div>
          </div>
          <div className="col gap-2">
            <span className="stat-label">Alternative accents</span>
            <div className="row gap-2 wrap">
              {SWATCHES.map((c) => (
                <span key={c} title={c.toUpperCase()}
                  style={{
                    width: 40, height: 40, borderRadius: 10, background: c, flex: 'none',
                    boxShadow: c === ACCENT ? `0 0 0 3px var(--paper), 0 0 0 5px ${c}` : 'none',
                    cursor: 'default',
                  }} />
              ))}
            </div>
            <span className="t-xs muted">Preview only. Accent theming ships in a later release.</span>
          </div>
        </Card>
      )}

      {/* ---------- DATA (danger zone) ---------- */}
      {tab === 'data' && (
        <Card className="col" style={{ gap: '1rem', border: '1px solid var(--risk)', background: 'color-mix(in srgb, var(--risk) 4%, var(--paper))' }}>
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <span className="row center" style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--risk)', color: '#fff', flex: 'none' }}>
              <Icon name="trash" size={16} />
            </span>
            <h4 style={{ margin: 0, color: 'var(--risk)' }}>Danger zone</h4>
          </div>
          <div className="row between gap-3 wrap" style={{ alignItems: 'center' }}>
            <div className="col gap-1" style={{ minWidth: 0 }}>
              <span className="fw-6">Reset demo data</span>
              <span className="muted t-sm">Clears local state and rebuilds the seeded book of business for both stores. This cannot be undone.</span>
            </div>
            <Button variant="danger" size="sm" onClick={resetDemo} style={{ flex: 'none' }}>
              <Icon name="trash" size={15} /> Reset demo data
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
