// Team - the org command center. Three surfaces that beat Salesforce setup:
//  1. PEOPLE  - live roster off getUsers()/repLeaderboard(): avatar, title,
//     role, territory, quota, real attainment. Plus pending invites.
//  2. ROLES   - a click-to-toggle permission matrix (roles x capabilities),
//     add/rename roles, all persisted.
//  3. TERRITORIES - named books with assigned reps and a real rolled-up
//     pipeline value pulled from those reps' open deals.
// People/quota/attainment come from the live store; roles/territories/invites
// come from src/lib/team-data.js (persisted). Everything is alive on load.
import React, { useState, useMemo } from 'react';
import {
  useStore, getUsers, userName, repLeaderboard, getDeals,
} from '../lib/store';
import {
  useTeamStore, CAPABILITIES, getRoles, getRole, getTerritories, getInvites,
  roleForUser, territoryForUser, roleHasCap, toggleRoleCap, addRole, renameRole,
  assignUserRole, addTerritory, setTerritoryReps, inviteUser, revokeInvite,
} from '../lib/team-data';
import {
  Card, Button, Badge, StatCard, Avatar, Tabs, Modal, Field, Input, Select,
  EmptyState, ProgressBar, useToast, money, moneyK,
} from '../components/UI';
import { Icon } from '../components/icons';

const ACCENT = '#5b4bf5';

export default function Team() {
  useStore();       // live book of business
  useTeamStore();   // org setup (roles / territories / invites)
  const [tab, setTab] = useState('people');

  const users = getUsers();
  const reps = users.filter(u => u.role === 'rep');
  const roles = getRoles();
  const territories = getTerritories();
  const invites = getInvites();

  const board = repLeaderboard();
  const wonByUser = Object.fromEntries(board.map(r => [r.user.id, r.won]));
  const pipeByUser = Object.fromEntries(board.map(r => [r.user.id, r.pipeline]));

  /* ---- team KPIs ---- */
  const teamQuota = reps.reduce((s, u) => s + (u.quota || 0), 0);
  const closedWon = board.reduce((s, r) => s + r.won, 0);
  const avgAttainment = teamQuota ? Math.round((closedWon / teamQuota) * 100) : 0;

  return (
    <div className="fade-up col gap-3">
      <div className="section-head">
        <div className="col gap-1" style={{ minWidth: 0 }}>
          <h3 style={{ margin: 0 }}>Team</h3>
          <div className="muted t-sm">
            {users.length} people on the revenue team - {reps.length} carrying quota, {roles.length} roles, {territories.length} territories.
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <StatCard label="Team members" value={users.length + invites.length} icon={<Icon name="users" size={18} />} sub={`${invites.length} pending invite${invites.length === 1 ? '' : 's'}`} />
        <StatCard label="Avg attainment" value={avgAttainment} format={(v) => Math.round(v) + '%'} icon={<Icon name="trendUp" size={18} />} sub="won / team quota" />
        <StatCard label="Roles defined" value={roles.length} icon={<Icon name="settings" size={18} />} sub="in the permission matrix" />
        <StatCard label="Territories" value={territories.length} icon={<Icon name="target" size={18} />} sub="named books of business" />
      </div>

      <Tabs
        tabs={[
          { key: 'people', label: 'People', count: users.length + invites.length },
          { key: 'roles', label: 'Roles & Permissions', count: roles.length },
          { key: 'territories', label: 'Territories', count: territories.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'people' && <PeopleTab users={users} reps={reps} roles={roles} invites={invites} wonByUser={wonByUser} pipeByUser={pipeByUser} board={board} />}
      {tab === 'roles' && <RolesTab roles={roles} users={users} />}
      {tab === 'territories' && <TerritoriesTab territories={territories} reps={reps} />}
    </div>
  );
}

/* ============================================================
   PEOPLE
   ============================================================ */
function PeopleTab({ users, reps, roles, invites, wonByUser, pipeByUser, board }) {
  const toast = useToast();
  const [inviteOpen, setInviteOpen] = useState(false);

  // roster: managers + reps, ranked by closed won desc
  const roster = [...users].sort((a, b) => (wonByUser[b.id] || 0) - (wonByUser[a.id] || 0));

  return (
    <div className="col gap-3">
      <div className="row between wrap" style={{ gap: '.75rem' }}>
        <div className="muted t-sm">Live attainment updates as deals move on the pipeline.</div>
        <Button variant="accent" size="sm" onClick={() => setInviteOpen(true)}>
          <Icon name="plus" size={15} /> Invite teammate
        </Button>
      </div>

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        {roster.map((u, i) => {
          const isManager = u.role === 'manager';
          const won = wonByUser[u.id] || 0;
          const pipe = pipeByUser[u.id] || 0;
          const quota = u.quota || 0;
          const pct = quota ? Math.round((won / quota) * 100) : 0;
          const barColor = pct >= 100 ? 'var(--ok)' : pct >= 60 ? ACCENT : 'var(--warn)';
          const role = roleForUser(u.id);
          const terr = territoryForUser(u.id);
          const rank = board.findIndex(b => b.user.id === u.id);
          return (
            <Card key={u.id} hover className="col" style={{ gap: '1rem' }}>
              <div className="row gap-2" style={{ alignItems: 'center' }}>
                <Avatar name={u.name} size={52} />
                <div className="col" style={{ minWidth: 0, gap: 2, flex: 1 }}>
                  <div className="row gap-2" style={{ alignItems: 'center' }}>
                    <h4 className="clip" style={{ margin: 0 }}>{u.name}</h4>
                    <Badge tone={isManager ? 'accent' : 'default'} style={{ flex: 'none' }}>{role?.name || (isManager ? 'Manager' : 'Rep')}</Badge>
                  </div>
                  <span className="muted t-sm clip">{u.title}</span>
                </div>
                {!isManager && rank >= 0 && rank < 3 && (
                  <span className="row center t-xs fw-7" title={`#${rank + 1} by closed won`}
                    style={{ width: 26, height: 26, borderRadius: '50%', flex: 'none', background: ACCENT + '14', color: ACCENT }}>
                    {rank + 1}
                  </span>
                )}
              </div>

              <div className="row gap-1" style={{ flexWrap: 'wrap' }}>
                <Badge tone="info"><Icon name="target" size={12} /> {terr ? terr.name : 'No territory'}</Badge>
                <Badge tone="default"><Icon name="users" size={12} /> {u.email}</Badge>
              </div>

              <div className="row" style={{ gap: '1.5rem' }}>
                <div className="col gap-1">
                  <span className="stat-label">Quota</span>
                  <span className="fw-7 tnum" style={{ fontSize: '1.05rem' }}>{isManager && !quota ? '-' : money(quota)}</span>
                </div>
                <div className="col gap-1">
                  <span className="stat-label">Closed won</span>
                  <span className="fw-7 tnum" style={{ fontSize: '1.05rem', color: won > 0 ? 'var(--ok)' : 'inherit' }}>{money(won)}</span>
                </div>
                <div className="col gap-1">
                  <span className="stat-label">Open pipeline</span>
                  <span className="fw-7 tnum" style={{ fontSize: '1.05rem' }}>{money(pipe)}</span>
                </div>
              </div>

              <div className="col gap-1">
                <div className="row between">
                  <span className="t-sm muted">Attainment</span>
                  <span className="fw-7 t-sm" style={{ color: barColor }}>{isManager && !quota ? '-' : pct + '%'}</span>
                </div>
                <ProgressBar value={isManager && !quota ? 0 : pct} color={barColor} height={9} />
              </div>
            </Card>
          );
        })}
      </div>

      {invites.length > 0 && (
        <Card className="col gap-2">
          <div className="row between">
            <h4 style={{ margin: 0 }}>Pending invites</h4>
            <Badge tone="warn">{invites.length}</Badge>
          </div>
          <div className="col gap-1">
            {invites.map(inv => (
              <div key={inv.id} className="row between" style={{ padding: '.6rem 0', borderTop: '1px solid var(--line)' }}>
                <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
                  <Avatar name={inv.name} size={38} />
                  <div className="col" style={{ minWidth: 0 }}>
                    <span className="fw-6 clip">{inv.name}</span>
                    <span className="muted t-sm clip">{inv.email} - {getRole(inv.roleId)?.name || 'Member'}</span>
                  </div>
                </div>
                <div className="row gap-1" style={{ alignItems: 'center', flex: 'none' }}>
                  <Badge tone="warn">Pending</Badge>
                  <Button variant="quiet" size="sm" onClick={() => { revokeInvite(inv.id); toast('Invite revoked'); }}>
                    <Icon name="x" size={14} /> Revoke
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} roles={roles} onDone={(n) => toast(`Invite sent to ${n}`)} />
    </div>
  );
}

function InviteModal({ open, onClose, roles, onDone }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('account_executive');
  const [err, setErr] = useState('');

  const submit = () => {
    const res = inviteUser({ name, email, roleId });
    if (res.error) { setErr(res.message); return; }
    setName(''); setEmail(''); setErr('');
    onDone?.(res.invite.name);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Invite a teammate"
      footer={<><Button variant="quiet" onClick={onClose}>Cancel</Button><Button variant="accent" onClick={submit}><Icon name="plus" size={15} /> Send invite</Button></>}>
      <div className="col gap-2">
        <Field label="Full name">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Alex Rivera" autoFocus />
        </Field>
        <Field label="Work email">
          <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="alex@rally.app" type="email" />
        </Field>
        <Field label="Role" hint="Determines what they can see and do.">
          <Select value={roleId} onChange={e => setRoleId(e.target.value)}>
            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
        </Field>
        {err && <div className="t-sm" style={{ color: 'var(--risk)' }}>{err}</div>}
      </div>
    </Modal>
  );
}

/* ============================================================
   ROLES & PERMISSIONS  (the matrix)
   ============================================================ */
function RolesTab({ roles, users }) {
  const toast = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState(null); // role id being renamed
  const [renameVal, setRenameVal] = useState('');
  const [err, setErr] = useState('');

  // headcount per role, from live assignments
  const countByRole = useMemo(() => {
    const m = {};
    for (const u of users) { const r = roleForUser(u.id); if (r) m[r.id] = (m[r.id] || 0) + 1; }
    return m;
  }, [users, roles]);

  const doAdd = () => {
    const res = addRole(newName);
    if (res.error) { setErr(res.message); return; }
    setNewName(''); setErr(''); setAddOpen(false);
    toast(`Role "${res.role.name}" added`);
  };
  const doRename = () => {
    const res = renameRole(renaming, renameVal);
    if (res?.error) { setErr(res.message); return; }
    setRenaming(null); setErr('');
    toast('Role renamed');
  };

  return (
    <div className="col gap-3">
      <div className="row between wrap" style={{ gap: '.75rem' }}>
        <div className="muted t-sm">Click any cell to grant or revoke a capability. Changes save instantly.</div>
        <Button variant="accent" size="sm" onClick={() => { setErr(''); setAddOpen(true); }}>
          <Icon name="plus" size={15} /> Add role
        </Button>
      </div>

      <Card pad={false} style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 760 }}>
          <thead>
            <tr>
              <th style={thStyle('left')}>Role</th>
              {CAPABILITIES.map(c => (
                <th key={c.id} style={thStyle('center')} title={c.desc}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roles.map(role => (
              <tr key={role.id} style={{ borderTop: '1px solid var(--line)' }}>
                <td style={{ padding: '.75rem 1rem', whiteSpace: 'nowrap' }}>
                  <div className="row gap-2" style={{ alignItems: 'center' }}>
                    <div className="col gap-1" style={{ minWidth: 0 }}>
                      <span className="fw-7">{role.name}</span>
                      <span className="muted t-xs">{countByRole[role.id] || 0} member{(countByRole[role.id] || 0) === 1 ? '' : 's'}{role.system ? ' - system' : ''}</span>
                    </div>
                    <button className="btn btn-quiet btn-sm" title="Rename role" style={{ padding: '.2rem .4rem' }}
                      onClick={() => { setRenaming(role.id); setRenameVal(role.name); setErr(''); }}>
                      <Icon name="sliders" size={13} />
                    </button>
                  </div>
                </td>
                {CAPABILITIES.map(c => {
                  const on = roleHasCap(role.id, c.id);
                  const locked = role.id === 'admin'; // admin always all-access
                  return (
                    <td key={c.id} style={{ textAlign: 'center', padding: '.5rem' }}>
                      <button
                        onClick={() => !locked && toggleRoleCap(role.id, c.id)}
                        title={locked ? 'Admin has full access' : (on ? 'Granted - click to revoke' : 'Denied - click to grant')}
                        aria-pressed={on}
                        style={{
                          width: 30, height: 30, borderRadius: 8, cursor: locked ? 'not-allowed' : 'pointer',
                          border: on ? 'none' : '1.5px solid var(--line-strong)',
                          background: on ? ACCENT : 'transparent',
                          color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          opacity: locked ? 0.85 : 1, transition: 'background .15s var(--ease)',
                        }}>
                        {on ? <Icon name="check" size={16} /> : <span style={{ width: 8, height: 2, background: 'var(--n-400)', borderRadius: 2 }} />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add a role"
        footer={<><Button variant="quiet" onClick={() => setAddOpen(false)}>Cancel</Button><Button variant="accent" onClick={doAdd}>Add role</Button></>}>
        <Field label="Role name" hint="Starts with no capabilities - grant them in the matrix.">
          <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Solutions Engineer" autoFocus />
        </Field>
        {err && <div className="t-sm" style={{ color: 'var(--risk)', marginTop: 8 }}>{err}</div>}
      </Modal>

      <Modal open={!!renaming} onClose={() => setRenaming(null)} title="Rename role"
        footer={<><Button variant="quiet" onClick={() => setRenaming(null)}>Cancel</Button><Button variant="accent" onClick={doRename}>Save</Button></>}>
        <Field label="Role name">
          <Input value={renameVal} onChange={e => setRenameVal(e.target.value)} autoFocus />
        </Field>
        {err && <div className="t-sm" style={{ color: 'var(--risk)', marginTop: 8 }}>{err}</div>}
      </Modal>
    </div>
  );
}

function thStyle(align) {
  return {
    textAlign: align, padding: '.85rem 1rem', fontSize: '.78rem', fontWeight: 700,
    color: 'var(--n-600)', textTransform: 'uppercase', letterSpacing: '.03em',
    position: align === 'left' ? 'sticky' : 'static', left: 0,
    background: 'var(--paper)', whiteSpace: 'nowrap',
  };
}

/* ============================================================
   TERRITORIES
   ============================================================ */
function TerritoriesTab({ territories, reps }) {
  const toast = useToast();
  const deals = getDeals();
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [segment, setSegment] = useState('');
  const [err, setErr] = useState('');
  const [assigning, setAssigning] = useState(null); // territory being edited

  // open pipeline rolled up from a territory's assigned reps
  const pipelineFor = (repIds) => deals
    .filter(d => d.status === 'open' && repIds.includes(d.ownerId))
    .reduce((s, d) => s + d.value, 0);

  const doAdd = () => {
    const res = addTerritory(name, segment);
    if (res.error) { setErr(res.message); return; }
    setName(''); setSegment(''); setErr(''); setAddOpen(false);
    toast(`Territory "${res.territory.name}" created`);
  };

  return (
    <div className="col gap-3">
      <div className="row between wrap" style={{ gap: '.75rem' }}>
        <div className="muted t-sm">Pipeline rolls up live from each territory's assigned reps.</div>
        <Button variant="accent" size="sm" onClick={() => { setErr(''); setAddOpen(true); }}>
          <Icon name="plus" size={15} /> New territory
        </Button>
      </div>

      {territories.length === 0 ? (
        <EmptyState icon="🗺️" title="No territories yet" body="Carve up the book of business into named regions or segments and assign reps."
          action={<Button variant="accent" onClick={() => setAddOpen(true)}>Create the first territory</Button>} />
      ) : (
        <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
          {territories.map(t => {
            const assigned = reps.filter(r => (t.repIds || []).includes(r.id));
            const pipe = pipelineFor(t.repIds || []);
            const openCount = deals.filter(d => d.status === 'open' && (t.repIds || []).includes(d.ownerId)).length;
            return (
              <Card key={t.id} className="col" style={{ gap: '1rem' }}>
                <div className="row between" style={{ alignItems: 'flex-start' }}>
                  <div className="col gap-1" style={{ minWidth: 0 }}>
                    <h4 className="clip" style={{ margin: 0 }}>{t.name}</h4>
                    {t.segment && <span className="muted t-sm clip">{t.segment}</span>}
                  </div>
                  <Badge tone="accent" style={{ flex: 'none' }}><Icon name="target" size={12} /> {assigned.length} rep{assigned.length === 1 ? '' : 's'}</Badge>
                </div>

                <div className="row between" style={{ padding: '.75rem 0', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
                  <div className="col gap-1">
                    <span className="stat-label">Open pipeline</span>
                    <span className="fw-7 tnum" style={{ fontSize: '1.25rem', color: ACCENT }}>{moneyK(pipe)}</span>
                  </div>
                  <div className="col gap-1" style={{ textAlign: 'right' }}>
                    <span className="stat-label">Open deals</span>
                    <span className="fw-7 tnum" style={{ fontSize: '1.25rem' }}>{openCount}</span>
                  </div>
                </div>

                <div className="col gap-1">
                  {assigned.length === 0 ? (
                    <span className="muted t-sm">No reps assigned yet.</span>
                  ) : (
                    <div className="row gap-1" style={{ flexWrap: 'wrap' }}>
                      {assigned.map(r => (
                        <span key={r.id} className="row gap-1" title={r.name}
                          style={{ alignItems: 'center', padding: '.25rem .55rem .25rem .3rem', borderRadius: 999, background: 'var(--n-100)' }}>
                          <Avatar name={r.name} size={22} />
                          <span className="t-sm fw-6">{r.name}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <Button variant="ghost" size="sm" onClick={() => setAssigning(t)}>
                  <Icon name="users" size={14} /> Assign reps
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="New territory"
        footer={<><Button variant="quiet" onClick={() => setAddOpen(false)}>Cancel</Button><Button variant="accent" onClick={doAdd}>Create territory</Button></>}>
        <div className="col gap-2">
          <Field label="Territory name">
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Northeast Enterprise" autoFocus />
          </Field>
          <Field label="Segment" hint="Optional - region and market segment.">
            <Input value={segment} onChange={e => setSegment(e.target.value)} placeholder="Enterprise - Northeast" />
          </Field>
          {err && <div className="t-sm" style={{ color: 'var(--risk)' }}>{err}</div>}
        </div>
      </Modal>

      <AssignRepsModal territory={assigning} reps={reps} onClose={() => setAssigning(null)}
        onSaved={() => toast('Territory reps updated')} />
    </div>
  );
}

function AssignRepsModal({ territory, reps, onClose, onSaved }) {
  const [sel, setSel] = useState([]);
  // sync selection when a territory opens
  React.useEffect(() => { setSel(territory ? [...(territory.repIds || [])] : []); }, [territory?.id]);

  if (!territory) return null;
  const toggle = (id) => setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const save = () => { setTerritoryReps(territory.id, sel); onSaved?.(); onClose(); };

  return (
    <Modal open={!!territory} onClose={onClose} title={`Assign reps - ${territory.name}`}
      footer={<><Button variant="quiet" onClick={onClose}>Cancel</Button><Button variant="accent" onClick={save}><Icon name="check" size={15} /> Save assignments</Button></>}>
      <div className="col gap-1">
        {reps.length === 0 && <div className="muted t-sm">No reps available.</div>}
        {reps.map(r => {
          const on = sel.includes(r.id);
          const elsewhere = territoryForUser(r.id);
          const conflict = elsewhere && elsewhere.id !== territory.id;
          return (
            <button key={r.id} onClick={() => toggle(r.id)}
              className="row between" style={{
                width: '100%', textAlign: 'left', padding: '.6rem .75rem', borderRadius: 'var(--r-sm)',
                border: on ? `1.5px solid ${ACCENT}` : '1.5px solid var(--line)',
                background: on ? ACCENT + '0d' : 'transparent', cursor: 'pointer',
              }}>
              <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
                <Avatar name={r.name} size={34} />
                <div className="col" style={{ minWidth: 0 }}>
                  <span className="fw-6 clip">{r.name}</span>
                  <span className="muted t-xs clip">
                    {r.title}{conflict ? ` - currently in ${elsewhere.name}` : ''}
                  </span>
                </div>
              </div>
              <span className="row center" style={{
                width: 24, height: 24, borderRadius: 6, flex: 'none',
                border: on ? 'none' : '1.5px solid var(--line-strong)', background: on ? ACCENT : 'transparent', color: '#fff',
              }}>
                {on && <Icon name="check" size={15} />}
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
