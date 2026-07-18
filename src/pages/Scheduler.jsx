// Scheduler - Ardovo's NATIVE meetings scheduler (an in-app Calendly).
//
// Where the existing /scheduling page reads meetings booked through the Tango
// connector, THIS page is Ardovo's own booking engine: create booking types
// (duration, buffers, weekly availability, round-robin owners), grab a copyable
// public link, and watch upcoming meetings roll in. Every public booking writes
// a real activity (type meeting) onto the record timeline via the store.
//
// Additive: a brand-new route (/scheduler), no existing surface changes.
// Dark-enterprise, #5b4bf5 accent, ASCII only. NO em-dash / en-dash.
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useScheduler, getBookingTypes, getActiveBookingTypes,
  createBookingType, updateBookingType, toggleBookingType, deleteBookingType,
  bookingTypeById, typeOwners, schedulerLink, upcomingMeetings, meetingsForType,
  cancelMeeting, generateSlots, nextOpenSlot, meetingRecordLabel,
  WEEKDAYS, LOCATION_META, DURATION_OPTIONS, defaultAvailability, slugify,
} from '../lib/scheduler.js';
import { getUsers, getUser, userName } from '../lib/store.js';
import {
  Card, Button, Badge, PageTitle, SectionHeader, EmptyState, Modal, Field, Input,
  Select, Textarea, Segmented, StatCard, Avatar, Tabs, useToast, shortDate, timeStr, longDate,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';

const money = (n) => n;
const originNow = () => (typeof window !== 'undefined' && window.location ? window.location.origin : 'https://ardovo.com');

function relDay(iso) {
  const d = new Date(iso); const now = new Date();
  const days = Math.round((d.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0)) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 7 && days > 0) return d.toLocaleDateString ? new Date(iso).toLocaleDateString('en-US', { weekday: 'long' }) : shortDate(iso);
  return shortDate(iso);
}

/* ---------- copyable public link ---------- */
function LinkRow({ type }) {
  const toast = useToast();
  const url = schedulerLink(type, originNow());
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast('Link copied'); }
    catch { toast('Copy failed', 'warn'); }
  };
  return (
    <div className="row gap-1" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
      <code style={{ fontSize: '.8rem', background: 'var(--n-50)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '.35rem .55rem', color: 'var(--n-700)', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url.replace(/^https?:\/\//, '')}</code>
      <Button variant="ghost" size="sm" onClick={copy}><Icon name="copy" size={15} /> Copy</Button>
      <Button variant="ghost" size="sm" as="a" href={url} target="_blank" rel="noreferrer"><Icon name="arrowRight" size={15} /> Open</Button>
    </div>
  );
}

/* ---------- owner round-robin picker ---------- */
function OwnerPicker({ value, onChange }) {
  const users = getUsers();
  const toggle = (id) => {
    const set = new Set(value);
    if (set.has(id)) { if (set.size > 1) set.delete(id); } else set.add(id);
    onChange(users.filter(u => set.has(u.id)).map(u => u.id));
  };
  return (
    <div className="col gap-1">
      <div className="row gap-1 wrap">
        {users.map(u => {
          const on = value.includes(u.id);
          return (
            <button key={u.id} type="button" onClick={() => toggle(u.id)}
              className="row gap-1" style={{
                alignItems: 'center', padding: '.35rem .55rem .35rem .4rem', borderRadius: 'var(--r-pill)',
                border: `1px solid ${on ? 'var(--accent)' : 'var(--line-strong)'}`,
                background: on ? 'var(--accent-50)' : 'var(--paper)', color: on ? 'var(--accent-700)' : 'var(--n-600)',
                fontWeight: 600, fontSize: '.85rem', cursor: 'pointer',
              }}>
              <Avatar name={u.name} size={22} />
              <span>{u.name.split(' ')[0]}</span>
              {on && <Icon name="check" size={14} />}
            </button>
          );
        })}
      </div>
      {value.length > 1 && <span className="t-xs muted">Round-robin: meetings rotate evenly across {value.length} owners, skipping anyone already booked.</span>}
    </div>
  );
}

/* ---------- weekly availability editor ---------- */
function AvailabilityEditor({ availability, onChange }) {
  const set = (dow, patch) => {
    const cur = availability[dow] || [];
    const win = cur[0] || { start: '09:00', end: '17:00' };
    onChange({ ...availability, [dow]: patch === null ? [] : [{ ...win, ...patch }] });
  };
  return (
    <div className="col gap-1">
      {WEEKDAYS.map(d => {
        const cur = (availability[d.dow] || [])[0];
        const on = !!cur;
        return (
          <div key={d.dow} className="row gap-2" style={{ alignItems: 'center', padding: '.3rem 0' }}>
            <button type="button" onClick={() => set(d.dow, on ? null : {})} className="row gap-1"
              style={{ width: 96, alignItems: 'center', cursor: 'pointer', color: on ? 'var(--ink)' : 'var(--n-400)', fontWeight: 600 }}>
              <span style={{ width: 16, height: 16, borderRadius: 4, border: `1px solid ${on ? 'var(--accent)' : 'var(--line-strong)'}`, background: on ? 'var(--accent)' : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>{on && <Icon name="check" size={12} />}</span>
              {d.label}
            </button>
            {on ? (
              <div className="row gap-1" style={{ alignItems: 'center' }}>
                <Input type="time" value={cur.start} onChange={e => set(d.dow, { start: e.target.value })} style={{ width: 128 }} />
                <span className="muted">to</span>
                <Input type="time" value={cur.end} onChange={e => set(d.dow, { end: e.target.value })} style={{ width: 128 }} />
              </div>
            ) : <span className="muted t-sm">Unavailable</span>}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- create / edit modal ---------- */
const BLANK = () => ({
  name: '', description: '', durationMin: 30, bufferBeforeMin: 0, bufferAfterMin: 10,
  ownerIds: [], location: 'video', locationDetail: '', minNoticeHours: 4, maxDaysOut: 21,
  availability: defaultAvailability(), active: true,
});

function TypeModal({ open, onClose, editing }) {
  const toast = useToast();
  const users = getUsers();
  const [form, setForm] = useState(BLANK);
  const [seeded, setSeeded] = useState(null);

  // Seed the form from the editing record once per open.
  React.useEffect(() => {
    if (!open) { setSeeded(null); return; }
    if (editing && seeded !== editing.id) {
      setForm({
        name: editing.name, description: editing.description || '',
        durationMin: editing.durationMin, bufferBeforeMin: editing.bufferBeforeMin || 0,
        bufferAfterMin: editing.bufferAfterMin ?? 10, ownerIds: [...(editing.ownerIds || [])],
        location: editing.location || 'video', locationDetail: editing.locationDetail || '',
        minNoticeHours: editing.minNoticeHours ?? 4, maxDaysOut: editing.maxDaysOut ?? 21,
        availability: editing.availability || defaultAvailability(), active: editing.active !== false,
      });
      setSeeded(editing.id);
    } else if (!editing && seeded !== 'new') {
      setForm({ ...BLANK(), ownerIds: [users[0]?.id].filter(Boolean) });
      setSeeded('new');
    }
  }, [open, editing]);

  const up = (patch) => setForm(f => ({ ...f, ...patch }));
  const save = () => {
    if (!form.name.trim()) { toast('Name your meeting type', 'warn'); return; }
    if (!form.ownerIds.length) { toast('Pick at least one owner', 'warn'); return; }
    if (editing) { updateBookingType(editing.id, form); toast('Meeting type updated'); }
    else { createBookingType(form); toast('Meeting type created'); }
    onClose();
  };

  const slugPreview = slugify(form.name || 'meeting');

  return (
    <Modal open={open} onClose={onClose} width={620}
      title={editing ? 'Edit meeting type' : 'New meeting type'}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={save}>{editing ? 'Save changes' : 'Create type'}</Button>
      </>}>
      <div className="col gap-3">
        <Field label="Name">
          <Input value={form.name} onChange={e => up({ name: e.target.value })} placeholder="Product demo" autoFocus />
        </Field>
        <div className="t-xs muted" style={{ marginTop: -8 }}>Public link: /meet/<strong style={{ color: 'var(--accent-700)' }}>{slugPreview}</strong></div>
        <Field label="Description (shown on the booking page)">
          <Textarea rows={2} value={form.description} onChange={e => up({ description: e.target.value })} placeholder="A guided 30 minute walkthrough of Ardovo." />
        </Field>

        <div className="row gap-2 wrap">
          <Field label="Duration">
            <Select value={form.durationMin} onChange={e => up({ durationMin: Number(e.target.value) })}>
              {DURATION_OPTIONS.map(d => <option key={d} value={d}>{d} min</option>)}
            </Select>
          </Field>
          <Field label="Buffer before">
            <Select value={form.bufferBeforeMin} onChange={e => up({ bufferBeforeMin: Number(e.target.value) })}>
              {[0, 5, 10, 15, 30].map(d => <option key={d} value={d}>{d} min</option>)}
            </Select>
          </Field>
          <Field label="Buffer after">
            <Select value={form.bufferAfterMin} onChange={e => up({ bufferAfterMin: Number(e.target.value) })}>
              {[0, 5, 10, 15, 30].map(d => <option key={d} value={d}>{d} min</option>)}
            </Select>
          </Field>
        </div>

        <Field label="Location">
          <div className="row gap-1 wrap">
            {Object.entries(LOCATION_META).map(([k, v]) => (
              <button key={k} type="button" onClick={() => up({ location: k })} className="row gap-1"
                style={{ alignItems: 'center', padding: '.45rem .7rem', borderRadius: 'var(--r-sm)', fontWeight: 600, fontSize: '.86rem', cursor: 'pointer', border: `1px solid ${form.location === k ? 'var(--accent)' : 'var(--line-strong)'}`, background: form.location === k ? 'var(--accent-50)' : 'var(--paper)', color: form.location === k ? 'var(--accent-700)' : 'var(--n-600)' }}>
                <Icon name={v.icon} size={15} /> {v.label}
              </button>
            ))}
          </div>
        </Field>
        {form.location === 'in-person' && (
          <Field label="Address / room">
            <Input value={form.locationDetail} onChange={e => up({ locationDetail: e.target.value })} placeholder="500 Market St, 4th floor" />
          </Field>
        )}

        <Field label="Owners">
          <OwnerPicker value={form.ownerIds} onChange={ids => up({ ownerIds: ids })} />
        </Field>

        <div className="row gap-2 wrap">
          <Field label="Minimum notice">
            <Select value={form.minNoticeHours} onChange={e => up({ minNoticeHours: Number(e.target.value) })}>
              {[0, 1, 2, 4, 12, 24, 48].map(h => <option key={h} value={h}>{h === 0 ? 'None' : `${h} hours`}</option>)}
            </Select>
          </Field>
          <Field label="Bookable window">
            <Select value={form.maxDaysOut} onChange={e => up({ maxDaysOut: Number(e.target.value) })}>
              {[7, 14, 21, 30, 60].map(d => <option key={d} value={d}>{d} days out</option>)}
            </Select>
          </Field>
        </div>

        <Field label="Weekly availability">
          <AvailabilityEditor availability={form.availability} onChange={a => up({ availability: a })} />
        </Field>
      </div>
    </Modal>
  );
}

/* ---------- booking type card ---------- */
function TypeCard({ type, onEdit }) {
  const toast = useToast();
  const owners = typeOwners(type);
  const upcoming = meetingsForType(type.id).filter(m => m.status === 'confirmed' && new Date(m.startAt) >= new Date()).length;
  const next = generateSlots(type, { days: type.maxDaysOut || 21 })[0];
  const [confirmDel, setConfirmDel] = useState(false);
  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: `3px solid ${type.color || 'var(--accent)'}`, opacity: type.active ? 1 : 0.62 }}>
      <div className="row between" style={{ alignItems: 'flex-start', gap: 8 }}>
        <div className="col gap-1" style={{ minWidth: 0 }}>
          <div className="row gap-1" style={{ alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.08rem' }}>{type.name}</h3>
            {!type.active && <Badge tone="warn">Off</Badge>}
          </div>
          <div className="row gap-1 muted t-sm" style={{ alignItems: 'center' }}>
            <Icon name="clock" size={14} /> {type.durationMin} min
            <span>-</span>
            <Icon name={LOCATION_META[type.location]?.icon || 'activity'} size={14} /> {LOCATION_META[type.location]?.label}
          </div>
        </div>
        <div className="row gap-1" style={{ flex: 'none' }}>
          <Button variant="quiet" size="sm" onClick={() => toggleBookingType(type.id)} title={type.active ? 'Turn off' : 'Turn on'}>
            <Icon name={type.active ? 'eye' : 'eyeOff'} size={16} />
          </Button>
          <Button variant="quiet" size="sm" onClick={() => onEdit(type)}><Icon name="edit" size={16} /></Button>
          <Button variant="quiet" size="sm" onClick={() => setConfirmDel(true)}><Icon name="trash" size={16} /></Button>
        </div>
      </div>

      {type.description && <p className="muted t-sm" style={{ margin: 0, lineHeight: 1.5 }}>{type.description}</p>}

      <div className="row between" style={{ alignItems: 'center' }}>
        <div className="row" style={{ alignItems: 'center' }}>
          <div className="row" style={{ marginRight: 8 }}>
            {owners.slice(0, 4).map((o, i) => (
              <span key={o.id} style={{ marginLeft: i ? -8 : 0, border: '2px solid var(--paper)', borderRadius: '50%', display: 'inline-flex' }}><Avatar name={o.name} size={26} /></span>
            ))}
          </div>
          <span className="t-sm muted">{owners.length > 1 ? `${owners.length} owners - round robin` : owners[0]?.name}</span>
        </div>
        <Badge tone={upcoming ? 'accent' : 'default'}>{upcoming} upcoming</Badge>
      </div>

      <div className="t-xs muted">{next ? <>Next opening <strong style={{ color: 'var(--ink)' }}>{relDay(next.startAt)} {timeStr(next.startAt)}</strong></> : 'No open slots in the booking window'}</div>

      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}>
        <LinkRow type={type} />
      </div>

      {confirmDel && (
        <div className="row gap-1" style={{ alignItems: 'center', background: 'var(--n-50)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '.5rem .6rem' }}>
          <span className="t-sm">Delete this type and cancel its future meetings?</span>
          <span style={{ flex: 1 }} />
          <Button variant="ghost" size="sm" onClick={() => setConfirmDel(false)}>Keep</Button>
          <Button variant="danger" size="sm" onClick={() => { deleteBookingType(type.id); toast('Meeting type deleted'); }}>Delete</Button>
        </div>
      )}
    </Card>
  );
}

/* ---------- upcoming meetings list ---------- */
function UpcomingList() {
  const toast = useToast();
  const meetings = upcomingMeetings();
  if (!meetings.length) return <EmptyState icon="📅" title="No upcoming meetings" body="Share a booking link and confirmed meetings will appear here and on each contact's timeline." />;
  return (
    <div className="col gap-2">
      {meetings.map(m => {
        const type = bookingTypeById(m.typeId);
        const owner = getUser(m.ownerId);
        const rec = meetingRecordLabel(m);
        return (
          <Card key={m.id} hover style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="row between" style={{ alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
              <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
                <div className="col center" style={{ width: 52, flex: 'none', background: 'var(--n-50)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '.35rem 0', lineHeight: 1.1 }}>
                  <span className="t-xs muted" style={{ textTransform: 'uppercase', fontWeight: 700 }}>{new Date(m.startAt).toLocaleDateString('en-US', { month: 'short' })}</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 800 }}>{new Date(m.startAt).getDate()}</span>
                </div>
                <div className="col gap-1" style={{ minWidth: 0 }}>
                  <div className="row gap-1" style={{ alignItems: 'center' }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: type?.color || 'var(--accent)', flex: 'none' }} />
                    <strong style={{ fontSize: '.98rem' }}>{type?.name || 'Meeting'}</strong>
                    <span className="muted t-sm">with {m.guestName}</span>
                  </div>
                  <div className="row gap-1 muted t-sm" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <Icon name="clock" size={13} /> {timeStr(m.startAt)} - {timeStr(m.endAt)}
                    <span>-</span>
                    <Icon name="user" size={13} /> {owner?.name}
                    {rec.to && <><span>-</span><Link to={rec.to} style={{ color: 'var(--accent-700)', fontWeight: 600 }}>{rec.name}</Link></>}
                  </div>
                </div>
              </div>
              <div className="row gap-1" style={{ alignItems: 'center' }}>
                <Badge tone="ok">Confirmed</Badge>
                <Button variant="quiet" size="sm" onClick={() => { cancelMeeting(m.id); toast('Meeting canceled'); }}>Cancel</Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

/* ============================================================
   PAGE
   ============================================================ */
export default function Scheduler() {
  useScheduler();
  const [tab, setTab] = useState('types');
  const [modal, setModal] = useState({ open: false, editing: null });

  const types = getBookingTypes();
  const active = getActiveBookingTypes();
  const upcoming = upcomingMeetings();
  const next = useMemo(() => nextOpenSlot(active), [types]);
  const weekCount = useMemo(() => {
    const wk = Date.now() + 7 * 86400000;
    return upcoming.filter(m => new Date(m.startAt).getTime() <= wk).length;
  }, [upcoming]);

  const openNew = () => setModal({ open: true, editing: null });
  const openEdit = (t) => setModal({ open: true, editing: t });

  return (
    <div className="col gap-4" style={{ maxWidth: 1120, margin: '0 auto' }}>
      <PageTitle
        eyebrow="Scheduler"
        title="Meetings"
        sub="Ardovo's native scheduler. Publish a booking link, let prospects self-serve a time, and every meeting lands on the timeline automatically."
        action={<Button onClick={openNew}><Icon name="plus" size={16} /> New meeting type</Button>}
      />

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
        <StatCard label="Active types" value={active.length} icon={<Icon name="clock" size={18} />} />
        <StatCard label="Upcoming meetings" value={upcoming.length} icon={<Icon name="calendar" size={18} />} accent="var(--accent-teal)" />
        <StatCard label="Booked this week" value={weekCount} icon={<Icon name="activity" size={18} />} accent="var(--accent-purple)" />
        <Card style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
          <div className="stat-label">Next opening</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{next ? `${relDay(next.startAt)}, ${timeStr(next.startAt)}` : 'None open'}</div>
          {next && <div className="t-xs muted">{bookingTypeById(next.typeId)?.name}</div>}
        </Card>
      </div>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { key: 'types', label: 'Booking types', count: types.length },
          { key: 'upcoming', label: 'Upcoming', count: upcoming.length },
        ]}
      />

      {tab === 'types' ? (
        types.length ? (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {types.map(t => <TypeCard key={t.id} type={t} onEdit={openEdit} />)}
          </div>
        ) : (
          <EmptyState icon="🗓️" title="No booking types yet" body="Create your first meeting type to get a shareable link prospects can book in one click."
            action={<Button onClick={openNew}><Icon name="plus" size={16} /> New meeting type</Button>} />
        )
      ) : (
        <UpcomingList />
      )}

      <TypeModal open={modal.open} editing={modal.editing} onClose={() => setModal({ open: false, editing: null })} />
    </div>
  );
}
