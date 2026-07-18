// ============================================================
// ARDOVO - ROLES (deep permissions)
// Role builder + permission matrix + field-level security + record
// sharing + a live "what can this role see" preview. Built on
// src/lib/roles-data.js (which layers over src/lib/rbac.js).
//
// Granular per-module + per-field + per-record-scope control is
// enterprise table-stakes that Pipedrive lacks and HubSpot gates at
// its top tier. Ardovo ships it standard - that promise is baked into
// the copy here, tastefully.
// ============================================================
import React, { useMemo, useState } from 'react';
import {
  Button, Card, Badge, Avatar, avatarColor, PageTitle, SectionHeader,
  Field, Input, Select, Textarea, Modal, Tabs, ProgressBar, EmptyState,
  useToast,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import {
  useRolesData, getRoles, roleById, memberCount, membersOf, totalMembers,
  MODULES, ACTIONS, ACTION_IDS, SCOPES, scopeMeta, nextScope, moduleMeta,
  FIELDS, FIELD_ACCESS, fieldAccessMeta, nextFieldAccess,
  SHARE_OBJECTS,
  getGrant, setGrant, setModuleRow, setActionColumn, resetRoleGrants,
  getFieldAccess, setFieldAccess,
  getShare, setShare,
  cloneRole, createLeastPrivilegeRole, updateRole, removeRole,
  rolePreview, askRook,
} from '../lib/roles-data.js';

/* ---------- small presentational helpers ---------- */

function ScopeCell({ scope, onClick, disabled }) {
  const m = scopeMeta(scope);
  const active = scope !== 'none';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Scope: ${m.label}. Click to change.`}
      title={m.desc}
      style={{
        width: '100%', minWidth: 62, padding: '.42rem .3rem', borderRadius: 'var(--r-sm)',
        border: '1px solid ' + (active ? 'transparent' : 'var(--line)'),
        background: active ? 'color-mix(in srgb, ' + m.color + ' 15%, var(--paper))' : 'var(--n-25)',
        color: active ? m.color : 'var(--n-400)',
        fontWeight: 700, fontSize: '.8rem', letterSpacing: '.02em', cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background .15s var(--ease), color .15s var(--ease)',
      }}
    >
      {m.label}
    </button>
  );
}

function ScopeLegend() {
  return (
    <div className="row gap-2 wrap" style={{ fontSize: '.8rem' }}>
      {SCOPES.map(s => (
        <span key={s.id} className="row gap-1" style={{ color: 'var(--n-600)' }}>
          <span className="dot" style={{ background: s.color, width: 9, height: 9 }} />
          <b style={{ color: 'var(--ink-2)' }}>{s.label}</b> {s.desc}
        </span>
      ))}
    </div>
  );
}

function AccessPill({ access, onClick, disabled }) {
  const m = fieldAccessMeta(access);
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={m.desc}
      className="badge" style={{
        background: 'color-mix(in srgb, ' + m.color + ' 15%, var(--paper))', color: m.color,
        border: '1px solid ' + m.color + '55', fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', minWidth: 84, justifyContent: 'center',
      }}>
      {access === 'hidden' && <Icon name="eyeOff" size={13} />}
      {access === 'view' && <Icon name="eye" size={13} />}
      {access === 'edit' && <Icon name="edit" size={13} />}
      {m.label}
    </button>
  );
}

function MiniSeg({ options, value, onChange, disabled }) {
  return (
    <div className="row" style={{ background: 'var(--n-100)', borderRadius: 'var(--r-sm)', padding: 3, gap: 2, opacity: disabled ? .6 : 1 }}>
      {options.map(o => {
        const on = o.id === value;
        return (
          <button key={o.id} type="button" disabled={disabled} onClick={() => onChange(o.id)}
            title={o.desc}
            style={{
              background: on ? 'var(--paper)' : 'transparent', color: on ? 'var(--ink)' : 'var(--n-600)',
              boxShadow: on ? 'var(--shadow-sm)' : 'none', fontWeight: on ? 700 : 600,
              padding: '.34rem .7rem', borderRadius: 5, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: '.85rem',
            }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- roles list (left rail) ---------- */

function RoleCard({ role, active, onSelect }) {
  const count = memberCount(role.id);
  return (
    <button type="button" onClick={onSelect}
      className="row gap-2" style={{
        width: '100%', textAlign: 'left', padding: '.8rem .85rem', borderRadius: 'var(--r-md)',
        border: '1px solid ' + (active ? 'var(--accent)' : 'var(--line)'),
        background: active ? 'var(--accent-50)' : 'var(--paper)',
        boxShadow: active ? 'var(--shadow-sm)' : 'none', cursor: 'pointer',
        transition: 'border-color .15s var(--ease), background .15s var(--ease)',
      }}>
      <span style={{ width: 10, height: 10, borderRadius: 3, background: role.color, flex: 'none', marginTop: 6 }} />
      <span className="col gap-1" style={{ minWidth: 0, flex: 1 }}>
        <span className="row gap-1" style={{ minWidth: 0 }}>
          <b className="clip" style={{ fontSize: '1rem' }}>{role.label}</b>
          {role.locked && <Icon name="lock" size={12} style={{ color: 'var(--n-400)', flex: 'none' }} />}
          {role.custom && <Badge tone="accent" className="t-xs" style={{ flex: 'none' }}>Custom</Badge>}
        </span>
        <span className="t-xs muted clip">{count} {count === 1 ? 'member' : 'members'}</span>
      </span>
      <Icon name="chevronRight" size={15} style={{ color: active ? 'var(--accent-600)' : 'var(--n-400)', flex: 'none' }} />
    </button>
  );
}

/* ---------- matrix tab ---------- */

function MatrixTab({ roleId, locked }) {
  return (
    <div className="col gap-3">
      <div className="row between wrap gap-2">
        <div className="col gap-1">
          <h4 style={{ margin: 0 }}>Permission matrix</h4>
          <span className="t-sm muted">Click any cell to cycle its record scope: None &rarr; Own &rarr; Team &rarr; All. Click a column header to set the whole column.</span>
        </div>
        {!locked && <Button variant="ghost" size="sm" onClick={() => resetRoleGrants(roleId)}><Icon name="rotateCcw" size={15} />Reset to default</Button>}
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
        <table className="table" style={{ minWidth: 640 }}>
          <thead>
            <tr>
              <th style={{ position: 'sticky', left: 0, background: 'var(--paper)', zIndex: 1 }}>Module</th>
              {ACTIONS.map(a => (
                <th key={a.id} style={{ textAlign: 'center' }}>
                  <button type="button" disabled={locked} title={locked ? a.desc : a.desc + ' - click to bulk-set this column'}
                    onClick={() => !locked && setActionColumn(roleId, a.id, cycleColScope(roleId, a.id))}
                    style={{ background: 'none', border: 'none', font: 'inherit', textTransform: 'uppercase', letterSpacing: '.05em', fontSize: '.74rem', fontWeight: 700, color: a.sensitive ? 'var(--risk)' : 'var(--n-600)', cursor: locked ? 'default' : 'pointer' }}>
                    {a.label}{a.sensitive && ' *'}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULES.map(m => (
              <tr key={m.id}>
                <td style={{ position: 'sticky', left: 0, background: 'var(--paper)', zIndex: 1 }}>
                  <span className="row gap-2" style={{ minWidth: 0 }}>
                    <Icon name={m.icon} size={17} style={{ color: 'var(--accent-600)', flex: 'none' }} />
                    <span className="col" style={{ minWidth: 0 }}>
                      <b className="clip" style={{ fontSize: '.95rem' }}>{m.label}</b>
                      <span className="t-xs muted">{m.group}</span>
                    </span>
                  </span>
                </td>
                {ACTIONS.map(a => (
                  <td key={a.id} style={{ padding: '.4rem .5rem' }}>
                    <ScopeCell scope={getGrant(roleId, m.id, a.id)} disabled={locked}
                      onClick={() => setGrant(roleId, m.id, a.id, nextScope(getGrant(roleId, m.id, a.id)))} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="row between wrap gap-2">
        <ScopeLegend />
        <span className="t-xs muted">* Delete and Export are the columns security teams lock down first.</span>
      </div>
    </div>
  );
}
// choose the next uniform scope when bulk-toggling a column (based on the top row)
function cycleColScope(roleId, action) {
  const cur = getGrant(roleId, MODULES[0].id, action);
  return nextScope(cur);
}

/* ---------- field-level tab ---------- */

function FieldsTab({ roleId, locked }) {
  const grouped = useMemo(() => {
    const by = {};
    for (const f of FIELDS) { (by[f.module] = by[f.module] || []).push(f); }
    return by;
  }, []);
  return (
    <div className="col gap-3">
      <div className="col gap-1">
        <h4 style={{ margin: 0 }}>Field-level security</h4>
        <span className="t-sm muted">Sensitive fields can be hidden, read-only, or editable per role - reaching below the page level all the way to a single value.</span>
      </div>
      {Object.entries(grouped).map(([modId, fields]) => {
        const m = moduleMeta(modId);
        return (
          <div key={modId} className="col gap-2">
            <div className="row gap-1" style={{ color: 'var(--n-600)' }}>
              <Icon name={m?.icon || 'grid'} size={15} />
              <b className="t-sm" style={{ letterSpacing: '.03em' }}>{m?.label || modId}</b>
            </div>
            {fields.map(f => {
              const access = getFieldAccess(roleId, f.id);
              return (
                <div key={f.id} className="row between gap-2" style={{ padding: '.6rem .85rem', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', background: 'var(--n-25)' }}>
                  <div className="col" style={{ minWidth: 0 }}>
                    <b className="clip" style={{ fontSize: '.95rem' }}>{f.label}</b>
                    <span className="t-xs muted">{f.hint} &middot; <span className="mono">{f.id}</span></span>
                  </div>
                  <MiniSeg options={FIELD_ACCESS} value={access} disabled={locked}
                    onChange={(v) => setFieldAccess(roleId, f.id, v)} />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- sharing tab ---------- */

const SHARE_OPTS = [
  { id: 'own',  label: 'Own',  desc: 'Only records this user owns.' },
  { id: 'team', label: 'Team', desc: "The user's team book." },
  { id: 'all',  label: 'All',  desc: 'Every record in the org.' },
];
function SharingTab({ roleId, locked }) {
  return (
    <div className="col gap-3">
      <div className="col gap-1">
        <h4 style={{ margin: 0 }}>Record sharing rules</h4>
        <span className="t-sm muted">The default visibility scope for each object. Owner-only keeps a rep's book private; Team opens it to the pod; All is org-wide.</span>
      </div>
      {SHARE_OBJECTS.map(o => {
        const val = getShare(roleId, o.id);
        const m = scopeMeta(val);
        return (
          <div key={o.id} className="row between gap-2" style={{ padding: '.75rem .95rem', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', background: 'var(--paper)' }}>
            <div className="row gap-2" style={{ minWidth: 0 }}>
              <Icon name={o.id === 'deals' ? 'target' : o.id === 'contacts' ? 'users' : o.id === 'companies' ? 'building' : 'funnel'} size={18} style={{ color: 'var(--accent-600)', flex: 'none' }} />
              <div className="col" style={{ minWidth: 0 }}>
                <b className="clip">{o.label}</b>
                <span className="t-xs" style={{ color: m.color, fontWeight: 700 }}>{m.desc}</span>
              </div>
            </div>
            <MiniSeg options={SHARE_OPTS} value={val} disabled={locked} onChange={(v) => setShare(roleId, o.id, v)} />
          </div>
        );
      })}
    </div>
  );
}

/* ---------- live preview tab ---------- */

function PreviewTab({ roleId }) {
  const p = rolePreview(roleId);
  if (!p) return null;
  const opennessTone = p.openness >= 66 ? 'var(--risk)' : p.openness >= 33 ? 'var(--warn)' : 'var(--ok)';
  return (
    <div className="col gap-3">
      <div className="row between wrap gap-2">
        <div className="col gap-1">
          <h4 style={{ margin: 0 }}>What {p.role.label} can see</h4>
          <span className="t-sm muted">A live read of every grant, field rule, and sharing scope combined.</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => askRook(`Audit the "${p.role.label}" role in Ardovo for least-privilege. Flag any over-broad grant, exportable sensitive data, or field that should be hidden, and suggest tighter scopes.`)}>
          <Icon name="sparkles" size={15} />Ask Rook to audit
        </Button>
      </div>

      {/* openness meter */}
      <Card>
        <div className="row between wrap gap-2" style={{ marginBottom: '.6rem' }}>
          <div className="col gap-1">
            <span className="stat-label">Access openness</span>
            <span className="t-xs muted">Lower is tighter. Least-privilege roles sit near zero.</span>
          </div>
          <div className="row gap-2">
            <b style={{ fontSize: '1.6rem', color: opennessTone, fontVariantNumeric: 'tabular-nums' }}>{p.openness}%</b>
          </div>
        </div>
        <ProgressBar value={p.openness} color={opennessTone} height={10} />
        <div className="row gap-2 wrap" style={{ marginTop: '.8rem' }}>
          <Badge tone={p.canExportAny ? 'warn' : 'ok'}>{p.canExportAny ? 'Can export data' : 'No export'}</Badge>
          <Badge tone={p.canDeleteAny ? 'warn' : 'ok'}>{p.canDeleteAny ? 'Can delete records' : 'No delete'}</Badge>
          <Badge tone="info">{p.visibleModules.length} of {p.modules.length} modules visible</Badge>
          <Badge tone={p.hiddenFields.length ? 'ok' : 'risk'}>{p.hiddenFields.length} sensitive {p.hiddenFields.length === 1 ? 'field' : 'fields'} hidden</Badge>
          <Badge>{p.memberCount} {p.memberCount === 1 ? 'member' : 'members'}</Badge>
        </div>
      </Card>

      {/* module access grid */}
      <div>
        <SectionHeader title="Module access" sub="What this role can do on each surface." />
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))' }}>
          {p.modules.map(m => {
            const rm = scopeMeta(m.read);
            return (
              <div key={m.id} className="col gap-1" style={{ padding: '.8rem .9rem', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', background: m.visible ? 'var(--paper)' : 'var(--n-25)', opacity: m.visible ? 1 : .6 }}>
                <div className="row gap-2" style={{ minWidth: 0 }}>
                  <Icon name={m.icon} size={16} style={{ color: m.visible ? 'var(--accent-600)' : 'var(--n-400)', flex: 'none' }} />
                  <b className="clip">{m.label}</b>
                </div>
                {m.visible ? (
                  <div className="row gap-1 wrap" style={{ fontSize: '.78rem' }}>
                    <span className="badge" style={{ background: 'color-mix(in srgb,' + rm.color + ' 15%, var(--paper))', color: rm.color, fontWeight: 700 }}>Read: {rm.label}</span>
                    {m.canCreate && <span className="badge badge-accent">Create</span>}
                    {m.canEdit && <span className="badge">Edit</span>}
                    {m.canDelete && <span className="badge badge-warn">Delete</span>}
                    {m.canExport && <span className="badge badge-warn">Export</span>}
                  </div>
                ) : <span className="t-xs muted">No access</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* field visibility */}
      <div>
        <SectionHeader title="Sensitive fields" sub="How each protected field renders for this role." />
        <div className="row gap-2 wrap">
          {FIELDS.map(f => {
            const a = getFieldAccess(roleId, f.id);
            const fm = fieldAccessMeta(a);
            return (
              <span key={f.id} className="row gap-1" style={{ padding: '.4rem .7rem', border: '1px solid var(--line)', borderRadius: 'var(--r-pill)', fontSize: '.82rem' }}>
                <Icon name={a === 'hidden' ? 'eyeOff' : a === 'view' ? 'eye' : 'edit'} size={13} style={{ color: fm.color }} />
                <b>{f.label}</b>
                <span style={{ color: fm.color, fontWeight: 700 }}>{fm.label}</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- role editor panel (right side) ---------- */

function RolePanel({ roleId, onDeleted }) {
  const [tab, setTab] = useState('matrix');
  const [editOpen, setEditOpen] = useState(false);
  const toast = useToast();
  const role = roleById(roleId);
  if (!role) return null;
  const locked = !!role.locked;
  const members = membersOf(roleId).slice(0, 8);

  return (
    <Card pad={false} className="fade-up">
      {/* header */}
      <div className="col gap-2" style={{ padding: '1.15rem 1.35rem', borderBottom: '1px solid var(--line)' }}>
        <div className="row between wrap gap-2">
          <div className="row gap-2" style={{ minWidth: 0 }}>
            <span style={{ width: 14, height: 14, borderRadius: 4, background: role.color, flex: 'none', marginTop: 5 }} />
            <div className="col" style={{ minWidth: 0 }}>
              <div className="row gap-2" style={{ minWidth: 0 }}>
                <h3 className="clip" style={{ margin: 0 }}>{role.label}</h3>
                {role.locked && <Badge className="t-xs"><Icon name="lock" size={12} />Locked</Badge>}
                {role.custom && <Badge tone="accent" className="t-xs">Custom</Badge>}
              </div>
              <span className="t-sm muted" style={{ maxWidth: 620 }}>{role.desc}</span>
            </div>
          </div>
          <div className="row gap-1" style={{ flex: 'none' }}>
            {!locked && <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}><Icon name="edit" size={15} />Edit</Button>}
            {role.custom && (
              <Button variant="danger" size="sm" onClick={() => {
                const r = removeRole(roleId);
                if (r.error) toast(r.message, 'risk'); else { toast('Role deleted. Members moved to Read-only.'); onDeleted?.(); }
              }}><Icon name="trash" size={15} />Delete</Button>
            )}
          </div>
        </div>

        {/* member avatars */}
        <div className="row gap-2 wrap">
          <div className="row" style={{ paddingLeft: 8 }}>
            {members.map((m, i) => (
              <span key={m.id} style={{ marginLeft: -8, border: '2px solid var(--paper)', borderRadius: '50%', zIndex: members.length - i }} title={m.name}>
                <Avatar name={m.name} size={30} />
              </span>
            ))}
          </div>
          <span className="t-sm muted">{memberCount(roleId)} {memberCount(roleId) === 1 ? 'member' : 'members'} assigned</span>
          {locked && <Badge tone="info" className="t-xs">Owner is always full-access and cannot be restricted</Badge>}
        </div>
      </div>

      {/* tabs */}
      <div style={{ padding: '1.15rem 1.35rem 1.5rem' }}>
        <Tabs
          tabs={[
            { key: 'matrix', label: 'Matrix' },
            { key: 'fields', label: 'Fields', count: FIELDS.length },
            { key: 'sharing', label: 'Sharing' },
            { key: 'preview', label: 'Preview' },
          ]}
          active={tab} onChange={setTab}
        />
        {tab === 'matrix' && <MatrixTab roleId={roleId} locked={locked} />}
        {tab === 'fields' && <FieldsTab roleId={roleId} locked={locked} />}
        {tab === 'sharing' && <SharingTab roleId={roleId} locked={locked} />}
        {tab === 'preview' && <PreviewTab roleId={roleId} />}
      </div>

      <EditRoleModal open={editOpen} onClose={() => setEditOpen(false)} role={role} />
    </Card>
  );
}

function EditRoleModal({ open, onClose, role }) {
  const [label, setLabel] = useState(role.label);
  const [desc, setDesc] = useState(role.desc);
  const toast = useToast();
  React.useEffect(() => { if (open) { setLabel(role.label); setDesc(role.desc); } }, [open, role]);
  return (
    <Modal open={open} onClose={onClose} title={`Edit ${role.label}`} footer={
      <>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => { updateRole(role.id, { label: label.trim() || role.label, desc: desc.trim() || role.desc }); toast('Role updated'); onClose(); }}>Save changes</Button>
      </>
    }>
      <div className="col gap-3">
        <Field label="Role name"><Input value={label} onChange={(e) => setLabel(e.target.value)} /></Field>
        <Field label="Description" hint="Shown on the role card and header."><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} /></Field>
      </div>
    </Modal>
  );
}

/* ---------- create / clone modal ---------- */

function CreateRoleModal({ open, onClose, onCreated }) {
  const [mode, setMode] = useState('clone'); // 'clone' | 'least'
  const [source, setSource] = useState('sales_rep');
  const [label, setLabel] = useState('');
  const toast = useToast();
  React.useEffect(() => { if (open) { setMode('clone'); setSource('sales_rep'); setLabel(''); } }, [open]);
  const roles = getRoles();

  const submit = () => {
    const res = mode === 'least' ? createLeastPrivilegeRole(label) : cloneRole(source, label);
    if (res.error) { toast(res.message, 'risk'); return; }
    toast(mode === 'least' ? 'Least-privilege role drafted' : 'Role cloned');
    onCreated?.(res.role.id);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="New role" width={560} footer={
      <>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={submit}><Icon name="plus" size={16} />{mode === 'least' ? 'Draft role' : 'Create role'}</Button>
      </>
    }>
      <div className="col gap-3">
        <div className="row gap-2 wrap">
          <button type="button" onClick={() => setMode('clone')} className="col gap-1" style={cardBtn(mode === 'clone')}>
            <Icon name="copy" size={18} style={{ color: 'var(--accent-600)' }} />
            <b>Clone a role</b>
            <span className="t-xs muted">Start from an existing role's full permission set, then tune.</span>
          </button>
          <button type="button" onClick={() => setMode('least')} className="col gap-1" style={cardBtn(mode === 'least')}>
            <Icon name="shield" size={18} style={{ color: 'var(--accent-600)' }} />
            <b>Least-privilege</b>
            <span className="t-xs muted">Read-only on own records, every sensitive field hidden.</span>
          </button>
        </div>
        {mode === 'clone' && (
          <Field label="Clone from">
            <Select value={source} onChange={(e) => setSource(e.target.value)}>
              {roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Role name" hint="e.g. Regional Sales, Finance viewer, Partner">
          <Input autoFocus value={label} onChange={(e) => setLabel(e.target.value)} placeholder={mode === 'least' ? 'Scoped role' : 'New role'} />
        </Field>
      </div>
    </Modal>
  );
}
function cardBtn(active) {
  return {
    flex: '1 1 200px', minWidth: 200, textAlign: 'left', alignItems: 'flex-start',
    padding: '.9rem 1rem', borderRadius: 'var(--r-md)', cursor: 'pointer',
    border: '1px solid ' + (active ? 'var(--accent)' : 'var(--line-strong)'),
    background: active ? 'var(--accent-50)' : 'var(--paper)',
  };
}

/* ============================================================
   PAGE
   ============================================================ */
export default function Roles() {
  useRolesData(); // re-render on any permission mutation
  const [selected, setSelected] = useState('sales_rep');
  const [createOpen, setCreateOpen] = useState(false);
  const roles = getRoles();

  // keep a valid selection if the selected role was deleted
  const activeId = roles.some(r => r.id === selected) ? selected : (roles[0]?.id || null);

  const seats = totalMembers();
  const customCount = roles.filter(r => r.custom).length;
  const hiddenFieldRoles = roles.filter(r => FIELDS.some(f => getFieldAccess(r.id, f.id) === 'hidden')).length;

  return (
    <div className="page-in">
      <PageTitle
        eyebrow="Admin - Access control"
        title="Roles & permissions"
        sub="Per-module, per-field, per-record control. The enterprise depth Pipedrive lacks and HubSpot gates at its top tier - Ardovo ships it standard."
        action={
          <>
            <Button variant="ghost" onClick={() => askRook('Draft a least-privilege role in Ardovo: read-only on the user\'s own records, every sensitive field hidden, no export or delete. Then walk me through what to grant it.')}>
              <Icon name="sparkles" size={16} />Ask Rook
            </Button>
            <Button variant="primary" onClick={() => setCreateOpen(true)}><Icon name="plus" size={16} />New role</Button>
          </>
        }
      />

      {/* stat strip */}
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: '1.5rem' }}>
        <MiniStat icon="lock" label="Roles" value={roles.length} sub={`${customCount} custom`} />
        <MiniStat icon="users" label="Seats assigned" value={seats} sub="across all roles" />
        <MiniStat icon="grid" label="Modules gated" value={MODULES.length} sub={`x ${ACTIONS.length} actions`} />
        <MiniStat icon="eyeOff" label="Field rules" value={FIELDS.length} sub={`${hiddenFieldRoles} roles hide some`} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(240px, 300px) 1fr', alignItems: 'start', gap: '1.4rem' }}>
        {/* roles list */}
        <div className="col gap-2">
          <SectionHeader title="Roles" sub={`${roles.length} total`} />
          <div className="col gap-1">
            {roles.map(r => (
              <RoleCard key={r.id} role={r} active={r.id === activeId} onSelect={() => setSelected(r.id)} />
            ))}
          </div>
          <Button variant="ghost" onClick={() => setCreateOpen(true)} style={{ justifyContent: 'center' }}><Icon name="plus" size={16} />Create or clone a role</Button>
          <div className="col gap-1" style={{ padding: '.85rem', border: '1px dashed var(--line-strong)', borderRadius: 'var(--r-md)', marginTop: '.4rem' }}>
            <span className="row gap-1 t-sm" style={{ color: 'var(--accent-600)', fontWeight: 700 }}><Icon name="sparkles" size={14} />Rook tip</span>
            <span className="t-xs muted">Ask Rook to "draft a least-privilege role" and it will create one scoped to zero, ready to grant up.</span>
          </div>
        </div>

        {/* editor */}
        {activeId ? <RolePanel roleId={activeId} onDeleted={() => setSelected(roles[0]?.id)} />
          : <Card><EmptyState icon="🔐" title="No role selected" body="Pick a role to edit its permissions." /></Card>}
      </div>

      <CreateRoleModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(id) => setSelected(id)} />
    </div>
  );
}

function MiniStat({ icon, label, value, sub }) {
  return (
    <Card>
      <div className="row gap-2" style={{ alignItems: 'center' }}>
        <span style={{ width: 40, height: 40, borderRadius: 'var(--r-sm)', background: 'var(--accent-50)', color: 'var(--accent-600)', display: 'grid', placeItems: 'center', flex: 'none' }}>
          <Icon name={icon} size={19} />
        </span>
        <div className="col" style={{ minWidth: 0 }}>
          <b style={{ fontSize: '1.7rem', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</b>
          <span className="stat-label">{label}</span>
        </div>
      </div>
      {sub && <span className="t-xs muted" style={{ display: 'block', marginTop: '.5rem' }}>{sub}</span>}
    </Card>
  );
}
