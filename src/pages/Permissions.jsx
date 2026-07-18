// Permissions - the enterprise access-control console (additive to the
// Settings > Roles tab, which still works untouched). Four sub-tabs:
//   Roles       - the role x capability matrix for base AND custom roles,
//                 plus a "view as" switcher and custom-role minting/cloning.
//   Permission sets - reusable capability bundles layered onto any role
//                 (HubSpot permission sets / Salesforce permission set groups).
//   Field security - view/edit floors per object.field (base + custom rules).
//   Sharing     - per-object record visibility (owner / team / everyone).
// Everything reads + writes the additive rbac layer in rally_rbac_ext_v1.
import React, { useState } from 'react';
import {
  Card, Button, Badge, SectionHeader, Tabs, Field, Input, Select, Textarea, Modal, useToast,
} from '../components/UI';
import { Icon } from '../components/icons';
import { OBJECT_TYPES } from '../lib/fields';
import {
  ROLES, CAPABILITIES, CAP_GROUPS, roleMeta,
  isGranted, setGrant, resetRole, hasOverrides,
  getActiveRole, setActiveRole, isViewingAs,
  useRbacExt, getAllRoles, isCustomRole, createRole, updateRole, removeRole,
  effectiveGranted, effectiveGrantCount, grantedBySet,
  getSets, createSet, updateSet, removeSet, toggleSetCap,
  setsForRole, hasSet, toggleRoleSet,
  getAllFieldRules, addFieldRule, updateFieldRule, removeFieldRule,
  getSharing, recordScope, setSharing, SHARE_OBJECTS, SHARE_SCOPES, scopeMeta,
  ROLE_COLORS,
} from '../lib/rbac';

const SUB_TABS = [
  { key: 'roles', label: 'Roles' },
  { key: 'sets', label: 'Permission sets' },
  { key: 'fields', label: 'Field security' },
  { key: 'sharing', label: 'Sharing' },
];

/* ============================================================ ROLES TAB */
function CapCell({ roleId, capId, base, viaSet, locked, onToggle }) {
  const on = base || viaSet;
  const color = (getAllRoles().find(r => r.id === roleId) || roleMeta(roleId)).color;
  return (
    <button
      type="button" role="switch" aria-checked={on} disabled={locked}
      onClick={() => onToggle(roleId, capId, !base)}
      title={
        locked ? 'Admin always has every permission'
          : viaSet && !base ? 'Granted by a permission set - click to also grant on the role'
            : base ? 'Granted on the role - click to revoke' : 'Denied - click to grant'
      }
      style={{
        width: 30, height: 30, borderRadius: 8, flex: 'none', margin: '0 auto', display: 'grid', placeItems: 'center',
        cursor: locked ? 'not-allowed' : 'pointer', padding: 0,
        border: base ? 'none' : (viaSet ? `2px dashed ${color}` : '1.5px solid var(--line)'),
        background: base ? (locked ? `color-mix(in srgb, ${color} 55%, var(--n-400))` : color) : 'transparent',
        color: base ? '#fff' : color, opacity: locked && !base ? 0.4 : 1,
        transition: 'transform .12s var(--ease), background .15s var(--ease)',
      }}
      onMouseDown={(e) => { if (!locked) e.currentTarget.style.transform = 'scale(.86)'; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      {base ? <Icon name="check" size={16} /> : viaSet ? <Icon name="layers" size={13} /> : <span style={{ width: 8, height: 2, borderRadius: 2, background: 'var(--n-300)' }} />}
    </button>
  );
}

function RoleModal({ open, onClose, role }) {
  const toast = useToast();
  const editing = !!role;
  const [label, setLabel] = useState(role?.label || '');
  const [desc, setDesc] = useState(role?.desc || '');
  const [color, setColor] = useState(role?.color || ROLE_COLORS[0]);
  const [base, setBase] = useState(role?.base || 'rep');

  const save = () => {
    if (editing) {
      const res = updateRole(role.id, { label: label.trim() || role.label, desc, color });
      if (res.error) { toast(res.message, 'risk'); return; }
      toast('Role updated');
    } else {
      const res = createRole({ label, desc, color, base });
      if (res.error) { toast(res.message, 'risk'); return; }
      toast(`Role "${res.role.label}" created from ${roleMeta(base).label}`);
    }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit custom role' : 'New custom role'} width={560}
      footer={<>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={save}>{editing ? 'Save role' : 'Create role'}</Button>
      </>}>
      <div className="col gap-2">
        <Field label="Role name">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Sales Ops" autoFocus />
        </Field>
        {!editing && (
          <Field label="Clone capabilities from" hint="The new role starts with this role's grants, then you tune it in the matrix.">
            <Select value={base} onChange={(e) => setBase(e.target.value)}>
              {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Description">
          <Textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What this role is for." />
        </Field>
        <Field label="Color">
          <div className="row gap-2 wrap">
            {ROLE_COLORS.map(c => (
              <button key={c} type="button" aria-label={`Color ${c}`} onClick={() => setColor(c)}
                style={{ width: 30, height: 30, borderRadius: 8, background: c, flex: 'none', cursor: 'pointer',
                  border: 'none', boxShadow: c === color ? `0 0 0 2px var(--paper), 0 0 0 4px ${c}` : 'none' }} />
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  );
}

function RolesTab() {
  useRbacExt();
  const toast = useToast();
  const roles = getAllRoles();
  const active = getActiveRole();
  const [roleModal, setRoleModal] = useState(null); // null | { role? }

  const toggle = (roleId, capId, on) => setGrant(roleId, capId, on);
  const viewAs = (roleId) => {
    setActiveRole(roleId);
    const m = roles.find(r => r.id === roleId);
    toast(roleId === 'admin' ? 'Viewing as Admin (full access)' : `Now viewing Ardovo as ${m?.label || roleId}`);
  };
  const del = (r) => {
    if (!window.confirm(`Delete the custom role "${r.label}"? Users on it should be reassigned first.`)) return;
    removeRole(r.id); toast(`Role "${r.label}" deleted`);
  };

  return (
    <div className="col gap-3">
      {/* View-as + custom role minting */}
      <Card className="col" style={{ gap: '1rem' }}>
        <div className="row between wrap gap-2" style={{ alignItems: 'flex-start' }}>
          <div className="col gap-1">
            <div className="row gap-2" style={{ alignItems: 'center' }}>
              <Icon name="eye" size={18} /><h4 style={{ margin: 0 }}>Roles</h4>
            </div>
            <span className="muted t-sm" style={{ maxWidth: '58ch' }}>
              The four base roles ship locked; clone one to mint a custom role with its own capability matrix.
              Click a role to view Ardovo exactly as it would appear. Switch back to Admin to regain full control.
            </span>
          </div>
          <Button size="sm" onClick={() => setRoleModal({})}><Icon name="plus" size={15} /> New role</Button>
        </div>
        <div className="row gap-2 wrap">
          {roles.map(r => {
            const on = active === r.id;
            const custom = isCustomRole(r.id);
            return (
              <button key={r.id} type="button" onClick={() => viewAs(r.id)}
                style={{ flex: '1 1 220px', textAlign: 'left', cursor: 'pointer', borderRadius: 12, padding: '.85rem 1rem',
                  border: on ? `2px solid ${r.color}` : '1.5px solid var(--line)',
                  background: on ? `color-mix(in srgb, ${r.color} 9%, var(--paper))` : 'var(--paper)' }}>
                <div className="row between" style={{ alignItems: 'center' }}>
                  <span className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: r.color, flex: 'none' }} />
                    <span className="fw-7 clip">{r.label}</span>
                    {custom && <Badge tone="accent" className="t-xs" style={{ flex: 'none' }}>Custom</Badge>}
                  </span>
                  {on && <Icon name="check" size={16} style={{ color: r.color, flex: 'none' }} />}
                </div>
                <span className="t-xs muted" style={{ display: 'block', marginTop: 4 }}>{r.desc}</span>
                <div className="row gap-1" style={{ marginTop: 6 }}>
                  <Badge className="t-xs">{effectiveGrantCount(r.id)}/{CAPABILITIES.length} caps</Badge>
                  {setsForRole(r.id).length > 0 && <Badge tone="info" className="t-xs"><Icon name="layers" size={11} /> {setsForRole(r.id).length} set{setsForRole(r.id).length > 1 ? 's' : ''}</Badge>}
                  {custom && (
                    <span className="row gap-1" style={{ marginLeft: 'auto' }} onClick={(e) => e.stopPropagation()}>
                      <Button variant="quiet" size="sm" aria-label="Edit role" onClick={() => setRoleModal({ role: r })}><Icon name="edit" size={13} /></Button>
                      <Button variant="quiet" size="sm" aria-label="Delete role" onClick={() => del(r)}><Icon name="trash" size={13} /></Button>
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        {isViewingAs() && (
          <Badge tone="warn" style={{ alignSelf: 'flex-start' }}><Icon name="eye" size={13} /> Viewing as {(roles.find(r => r.id === active) || {}).label}</Badge>
        )}
      </Card>

      {/* Matrix */}
      <Card pad={false}>
        <div className="col gap-1" style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line)' }}>
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <Icon name="shield" size={18} /><h4 style={{ margin: 0 }}>Capability matrix</h4>
          </div>
          <span className="muted t-sm">
            Click a cell to grant or revoke on the role. A dashed cell is granted by a permission set (see the Permission sets tab).
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
            <thead>
              <tr>
                <th style={{ padding: '.75rem 1.25rem', textAlign: 'left', position: 'sticky', left: 0, background: 'var(--paper)' }}></th>
                {roles.map(r => (
                  <th key={r.id} style={{ padding: '.65rem .5rem', textAlign: 'center', minWidth: 96 }}>
                    <div className="col center" style={{ gap: 3 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: r.color }} />
                      <span className="fw-7 t-sm clip" style={{ maxWidth: 100 }}>{r.label}</span>
                      <span className="t-xs muted tnum">{effectiveGrantCount(r.id)}/{CAPABILITIES.length}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CAP_GROUPS.map(group => (
                <React.Fragment key={group}>
                  <tr>
                    <td colSpan={roles.length + 1} style={{ padding: '.7rem 1.25rem .3rem', background: 'color-mix(in srgb, var(--n-500) 5%, var(--paper))' }}>
                      <span className="eyebrow" style={{ margin: 0 }}>{group}</span>
                    </td>
                  </tr>
                  {CAPABILITIES.filter(c => c.group === group).map(cap => (
                    <tr key={cap.id} style={{ borderTop: '1px solid var(--line)' }}>
                      <td style={{ padding: '.6rem 1.25rem', position: 'sticky', left: 0, background: 'var(--paper)' }}>
                        <div className="col" style={{ gap: 1 }}>
                          <span className="fw-6 row gap-1" style={{ alignItems: 'center' }}>
                            {cap.label}{cap.sensitive && <Icon name="lock" size={12} style={{ color: 'var(--warn)' }} />}
                          </span>
                          <span className="t-xs muted">{cap.desc}</span>
                        </div>
                      </td>
                      {roles.map(r => (
                        <td key={r.id} style={{ padding: '.45rem .5rem', textAlign: 'center' }}>
                          <CapCell roleId={r.id} capId={cap.id}
                            base={isGranted(r.id, cap.id)} viaSet={grantedBySet(r.id, cap.id)}
                            locked={r.id === 'admin'} onToggle={toggle} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div className="row between wrap gap-2" style={{ padding: '.85rem 1.25rem', borderTop: '1px solid var(--line)' }}>
          <span className="t-xs muted row gap-2" style={{ alignItems: 'center' }}>
            <span className="row gap-1" style={{ alignItems: 'center' }}><Icon name="check" size={12} /> on role</span>
            <span className="row gap-1" style={{ alignItems: 'center' }}><Icon name="layers" size={12} /> via set</span>
          </span>
          <div className="row gap-1">
            {roles.filter(r => r.id !== 'admin' && hasOverrides(r.id) && !isCustomRole(r.id)).map(r => (
              <Button key={r.id} variant="quiet" size="sm" onClick={() => { resetRole(r.id); toast(`${roleMeta(r.id).label} reset to defaults`); }}>
                Reset {roleMeta(r.id).label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {roleModal && <RoleModal open onClose={() => setRoleModal(null)} role={roleModal.role} />}
    </div>
  );
}

/* ============================================================ SETS TAB */
function SetModal({ open, onClose, set }) {
  const toast = useToast();
  const editing = !!set;
  const [label, setLabel] = useState(set?.label || '');
  const [desc, setDesc] = useState(set?.desc || '');
  const [color, setColor] = useState(set?.color || ROLE_COLORS[1]);
  const [caps, setCaps] = useState(new Set(set?.caps || []));

  const flip = (id) => setCaps(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const save = () => {
    const payload = { label, desc, color, caps: [...caps] };
    const res = editing ? updateSet(set.id, payload) : createSet(payload);
    if (res.error) { toast(res.message, 'risk'); return; }
    toast(editing ? 'Permission set updated' : `Permission set "${label.trim()}" created`);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit permission set' : 'New permission set'} width={620}
      footer={<>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={save}>{editing ? 'Save set' : 'Create set'}</Button>
      </>}>
      <div className="col gap-2">
        <div className="grid" style={{ gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'end' }}>
          <Field label="Set name"><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Deal Desk" autoFocus /></Field>
          <Field label="Color">
            <div className="row gap-1 wrap" style={{ maxWidth: 180 }}>
              {ROLE_COLORS.map(c => (
                <button key={c} type="button" aria-label={`Color ${c}`} onClick={() => setColor(c)}
                  style={{ width: 26, height: 26, borderRadius: 7, background: c, flex: 'none', cursor: 'pointer', border: 'none', boxShadow: c === color ? `0 0 0 2px var(--paper), 0 0 0 4px ${c}` : 'none' }} />
              ))}
            </div>
          </Field>
        </div>
        <Field label="Description"><Textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What this bundle grants." /></Field>
        <Field label="Capabilities" hint="These layer ON TOP of whatever base role the set is assigned to.">
          <div className="col gap-1" style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 10, padding: '.5rem' }}>
            {CAP_GROUPS.map(group => (
              <div key={group} className="col gap-1">
                <span className="eyebrow" style={{ margin: '.2rem 0 0' }}>{group}</span>
                {CAPABILITIES.filter(c => c.group === group).map(c => (
                  <label key={c.id} className="row gap-2" style={{ alignItems: 'center', cursor: 'pointer', padding: '.25rem .2rem' }}>
                    <input type="checkbox" checked={caps.has(c.id)} onChange={() => flip(c.id)} />
                    <span className="fw-6 t-sm">{c.label}</span>
                    {c.sensitive && <Icon name="lock" size={11} style={{ color: 'var(--warn)' }} />}
                  </label>
                ))}
              </div>
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  );
}

function SetsTab() {
  useRbacExt();
  const toast = useToast();
  const sets = getSets();
  const roles = getAllRoles();
  const [modal, setModal] = useState(null); // null | { set? }

  const del = (s) => {
    if (!window.confirm(`Delete permission set "${s.label}"? It will be unassigned from every role.`)) return;
    removeSet(s.id); toast('Permission set deleted');
  };

  return (
    <div className="col gap-3">
      <Card className="col" style={{ gap: '.5rem' }}>
        <div className="row between wrap gap-2" style={{ alignItems: 'flex-start' }}>
          <div className="col gap-1">
            <div className="row gap-2" style={{ alignItems: 'center' }}><Icon name="layers" size={18} /><h4 style={{ margin: 0 }}>Permission sets</h4></div>
            <span className="muted t-sm" style={{ maxWidth: '60ch' }}>
              Reusable bundles of extra capabilities. Assign a set to any role to grant those capabilities on top of the role's own matrix,
              the way HubSpot permission sets and Salesforce permission set groups work. Nothing here can revoke a base grant, only add.
            </span>
          </div>
          <Button size="sm" onClick={() => setModal({})}><Icon name="plus" size={15} /> New set</Button>
        </div>
      </Card>

      {sets.length === 0 && <Card><span className="muted t-sm">No permission sets yet. Create one to grant extra capabilities without editing a role.</span></Card>}

      {sets.map(s => (
        <Card key={s.id} className="col" style={{ gap: '.85rem' }}>
          <div className="row between wrap gap-2" style={{ alignItems: 'flex-start' }}>
            <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
              <span style={{ width: 12, height: 12, borderRadius: 4, background: s.color, flex: 'none' }} />
              <div className="col" style={{ minWidth: 0 }}>
                <span className="fw-7">{s.label}</span>
                {s.desc && <span className="t-xs muted">{s.desc}</span>}
              </div>
            </div>
            <div className="row gap-1" style={{ flex: 'none' }}>
              <Button variant="quiet" size="sm" onClick={() => setModal({ set: s })}><Icon name="edit" size={14} /> Edit</Button>
              <Button variant="quiet" size="sm" onClick={() => del(s)}><Icon name="trash" size={14} /></Button>
            </div>
          </div>
          <div className="row gap-1 wrap">
            {s.caps.length === 0 && <span className="t-xs muted">No capabilities selected.</span>}
            {s.caps.map(cid => {
              const cap = CAPABILITIES.find(c => c.id === cid);
              return <Badge key={cid} className="t-xs">{cap ? cap.label : cid}</Badge>;
            })}
          </div>
          <div className="col gap-1" style={{ borderTop: '1px solid var(--line)', paddingTop: '.7rem' }}>
            <span className="eyebrow" style={{ margin: 0 }}>Assign to roles</span>
            <div className="row gap-2 wrap">
              {roles.map(r => {
                const on = hasSet(r.id, s.id);
                return (
                  <button key={r.id} type="button" onClick={() => toggleRoleSet(r.id, s.id, !on)}
                    style={{ cursor: 'pointer', borderRadius: 999, padding: '.35rem .7rem', fontWeight: 600, fontSize: '.85rem',
                      border: on ? `1.5px solid ${r.color}` : '1.5px solid var(--line)',
                      background: on ? `color-mix(in srgb, ${r.color} 14%, transparent)` : 'transparent',
                      color: on ? r.color : 'var(--n-600)' }}>
                    {on && <Icon name="check" size={12} />} {r.label}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
      ))}

      {modal && <SetModal open onClose={() => setModal(null)} set={modal.set} />}
    </div>
  );
}

/* ============================================================ FIELD SECURITY TAB */
function FieldRuleModal({ open, onClose }) {
  const toast = useToast();
  const [objectType, setObjectType] = useState('deal');
  const [key, setKey] = useState('');
  const [label, setLabel] = useState('');
  const [view, setView] = useState('rep');
  const [edit, setEdit] = useState('manager');

  const save = () => {
    const res = addFieldRule({ objectType, key, label, view, edit });
    if (res.error) { toast(res.message, 'risk'); return; }
    toast(`Field "${res.rule.label}" secured`);
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Secure a field" width={560}
      footer={<>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={save}>Add rule</Button>
      </>}>
      <div className="col gap-2">
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Object">
            <Select value={objectType} onChange={(e) => setObjectType(e.target.value)}>
              {OBJECT_TYPES.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </Select>
          </Field>
          <Field label="Field key" hint="The stored field key, e.g. margin.">
            <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="margin" autoFocus />
          </Field>
        </div>
        <Field label="Display label">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Deal margin" />
        </Field>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Minimum role to view">
            <Select value={view} onChange={(e) => setView(e.target.value)}>
              {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </Select>
          </Field>
          <Field label="Minimum role to edit">
            <Select value={edit} onChange={(e) => setEdit(e.target.value)}>
              {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </Select>
          </Field>
        </div>
      </div>
    </Modal>
  );
}

function RoleSelectInline({ value, onChange }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} style={{ minWidth: 120 }}>
      {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
    </Select>
  );
}

function FieldsSecurityTab() {
  useRbacExt();
  const toast = useToast();
  const rules = getAllFieldRules();
  const [modal, setModal] = useState(false);

  return (
    <div className="col gap-3">
      <Card className="col" style={{ gap: '.5rem' }}>
        <div className="row between wrap gap-2" style={{ alignItems: 'flex-start' }}>
          <div className="col gap-1">
            <div className="row gap-2" style={{ alignItems: 'center' }}><Icon name="key" size={18} /><h4 style={{ margin: 0 }}>Field-level security</h4></div>
            <span className="muted t-sm" style={{ maxWidth: '60ch' }}>
              The minimum role required to see or edit each protected field, enforced everywhere the field renders.
              Built-in rules are locked; add your own for any object field.
            </span>
          </div>
          <Button size="sm" onClick={() => setModal(true)}><Icon name="plus" size={15} /> Secure a field</Button>
        </div>
      </Card>

      <Card pad={false}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--n-600)', fontSize: '.8rem', textTransform: 'uppercase', letterSpacing: '.03em' }}>
                <th style={{ padding: '.6rem .9rem' }}>Field</th>
                <th style={{ padding: '.6rem .9rem' }}>Object</th>
                <th style={{ padding: '.6rem .9rem' }}>Can view</th>
                <th style={{ padding: '.6rem .9rem' }}>Can edit</th>
                <th style={{ padding: '.6rem .9rem' }}></th>
              </tr>
            </thead>
            <tbody>
              {rules.map(f => (
                <tr key={f.id} style={{ borderTop: '1px solid var(--line)' }}>
                  <td style={{ padding: '.6rem .9rem', fontWeight: 600 }}>
                    <div className="col" style={{ gap: 1 }}>
                      <span>{f.label}</span>
                      <span className="t-xs muted" style={{ fontFamily: 'var(--font-mono)' }}>{f.key}</span>
                    </div>
                  </td>
                  <td style={{ padding: '.6rem .9rem', textTransform: 'capitalize' }} className="muted">{f.objectType}</td>
                  <td style={{ padding: '.6rem .9rem' }}>
                    {f.locked
                      ? <Badge style={{ background: `color-mix(in srgb, ${roleMeta(f.view).color} 14%, transparent)`, color: roleMeta(f.view).color }}>{roleMeta(f.view).label}+</Badge>
                      : <RoleSelectInline value={f.view} onChange={(v) => updateFieldRule(f.id, { view: v })} />}
                  </td>
                  <td style={{ padding: '.6rem .9rem' }}>
                    {f.locked
                      ? <Badge style={{ background: `color-mix(in srgb, ${roleMeta(f.edit).color} 14%, transparent)`, color: roleMeta(f.edit).color }}>{roleMeta(f.edit).label}+</Badge>
                      : <RoleSelectInline value={f.edit} onChange={(v) => updateFieldRule(f.id, { edit: v })} />}
                  </td>
                  <td style={{ padding: '.6rem .9rem', textAlign: 'right' }}>
                    {f.locked
                      ? <Badge className="t-xs">Built-in</Badge>
                      : <Button variant="quiet" size="sm" aria-label="Remove rule" onClick={() => { removeFieldRule(f.id); toast('Field rule removed'); }}><Icon name="trash" size={14} /></Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {modal && <FieldRuleModal open onClose={() => setModal(false)} />}
    </div>
  );
}

/* ============================================================ SHARING TAB */
function SharingTab() {
  useRbacExt();
  const toast = useToast();
  const sharing = getSharing();

  return (
    <div className="col gap-3">
      <Card className="col" style={{ gap: '.5rem' }}>
        <div className="row gap-2" style={{ alignItems: 'center' }}><Icon name="users" size={18} /><h4 style={{ margin: 0 }}>Record sharing</h4></div>
        <span className="muted t-sm" style={{ maxWidth: '60ch' }}>
          Who can see a record by default. Managers and Admins always see everything; these rules control what Reps and Viewers get.
          Owner-only keeps a record private to its owner, Team shares it across the whole rep team, Everyone opens it up including Viewers.
        </span>
      </Card>

      {SHARE_OBJECTS.map(obj => {
        const cur = recordScope(obj.id);
        return (
          <Card key={obj.id} className="col" style={{ gap: '.7rem' }}>
            <div className="row between" style={{ alignItems: 'center' }}>
              <span className="fw-7">{obj.label}</span>
              <Badge tone="accent" className="t-xs">{scopeMeta(cur).label}</Badge>
            </div>
            <div className="row gap-2 wrap">
              {SHARE_SCOPES.map(sc => {
                const on = cur === sc.id;
                return (
                  <button key={sc.id} type="button" onClick={() => { setSharing(obj.id, sc.id); toast(`${obj.label} sharing set to ${sc.label}`); }}
                    style={{ flex: '1 1 200px', textAlign: 'left', cursor: 'pointer', borderRadius: 12, padding: '.75rem .9rem',
                      border: on ? '2px solid var(--accent)' : '1.5px solid var(--line)',
                      background: on ? 'color-mix(in srgb, var(--accent) 8%, var(--paper))' : 'var(--paper)' }}>
                    <span className="row gap-2" style={{ alignItems: 'center' }}>
                      <Icon name={sc.icon} size={15} />
                      <span className="fw-7">{sc.label}</span>
                      {on && <Icon name="check" size={15} style={{ color: 'var(--accent)', marginLeft: 'auto' }} />}
                    </span>
                    <span className="t-xs muted" style={{ display: 'block', marginTop: 4 }}>{sc.desc}</span>
                  </button>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

/* ============================================================ PAGE */
export default function Permissions() {
  const [tab, setTab] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('tab') || 'roles'; } catch { return 'roles'; }
  });
  return (
    <div className="fade-up col gap-3">
      <SectionHeader title="Permissions" sub="Roles, permission sets, field security, and record sharing." />
      <Tabs tabs={SUB_TABS} active={tab} onChange={setTab} />
      {tab === 'roles' && <RolesTab />}
      {tab === 'sets' && <SetsTab />}
      {tab === 'fields' && <FieldsSecurityTab />}
      {tab === 'sharing' && <SharingTab />}
    </div>
  );
}
