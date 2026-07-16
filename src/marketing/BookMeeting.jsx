// BookMeeting.jsx
// PUBLIC booking page for a Rally meeting type. Mounted at /meet/:slug inside
// the marketing Routes block (see App.jsx). A prospect picks a day, picks a
// slot, drops their details, and books in one flow. On confirm it calls
// scheduler.bookMeeting(), which assigns a free owner by round-robin and writes
// a REAL activity (type meeting) onto the record timeline via the store.
//
// Self-styled dark-enterprise (its own palette, like HostedForm) so it reads as
// one polished piece whether opened directly or shared. Mobile-first.
// ASCII only. NO em-dash / en-dash. ASCII hyphen only.
import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  bookingTypeBySlug, slotsByDay, bookMeeting, typeOwners, LOCATION_META,
} from '../lib/scheduler.js';
import { Icon } from '../components/icons.jsx';

/* ---------- palette (fixed dark, accent from the type) ---------- */
function palette(accent) {
  return {
    bg: '#0a0c12', card: '#12141f', card2: '#0f111a', line: '#242838', lineSoft: '#1c2030',
    ink: '#eceef6', muted: '#a6abbe', dim: '#6d7285', accent, accentSoft: 'rgba(14,159,143,.14)',
    ok: '#22c58b',
  };
}

/* ---------- initials + deterministic avatar color ---------- */
const AV = ['#0e9f8f', '#14b8a6', '#e0752d', '#c0392b', '#2563a8', '#7c5cf7', '#1a7f52', '#d4a017'];
function avColor(name = '') { let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0; return AV[h % AV.length]; }
function initials(name = '') { return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'; }
function Avatar({ name, size = 34, ring = '#12141f' }) {
  return (
    <span style={{ width: size, height: size, borderRadius: '50%', background: avColor(name), color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size * 0.4, border: `2px solid ${ring}`, flex: 'none' }}>{initials(name)}</span>
  );
}

/* ---------- date helpers ---------- */
const timeStr = (d) => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const dayLabel = (d) => new Date(d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
const dayShort = (d) => new Date(d).toLocaleDateString('en-US', { weekday: 'short' });
const dayNum = (d) => new Date(d).getDate();
const monShort = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short' });

/* ---------- .ics download (self-contained, no external calls) ---------- */
function downloadIcs(meeting, type, ownerName) {
  if (typeof window === 'undefined') return;
  const fmt = (iso) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const esc = (s) => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Rally//Scheduler//EN', 'BEGIN:VEVENT',
    `UID:${meeting.id}@rally.app`, `DTSTAMP:${fmt(new Date().toISOString())}`,
    `DTSTART:${fmt(meeting.startAt)}`, `DTEND:${fmt(meeting.endAt)}`,
    `SUMMARY:${esc(type.name)} with ${esc(ownerName)}`,
    `DESCRIPTION:${esc(type.description || '')}`,
    type.location === 'in-person' && type.locationDetail ? `LOCATION:${esc(type.locationDetail)}` : '',
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${type.slug || 'meeting'}.ics`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function BookMeeting() {
  const { slug } = useParams();
  const type = useMemo(() => bookingTypeBySlug(slug), [slug]);
  const c = palette(type?.color || '#0e9f8f');

  const days = useMemo(() => (type ? slotsByDay(type) : []), [type]);
  const [dayIdx, setDayIdx] = useState(0);
  const [slot, setSlot] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '' });
  const [error, setError] = useState('');
  const [booked, setBooked] = useState(null); // { meeting, owner, type }
  const [busy, setBusy] = useState(false);

  if (!type) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: c.bg, padding: 24 }}>
        <div style={{ textAlign: 'center', color: c.muted }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🔍</div>
          <h1 style={{ color: c.ink, fontSize: 26, margin: '0 0 8px' }}>Booking link not found</h1>
          <p style={{ margin: '0 0 20px' }}>This meeting type may have been unpublished or removed.</p>
          <Link to="/" style={{ color: c.accent, fontWeight: 700 }}>Back to Rally</Link>
        </div>
      </div>
    );
  }

  const owners = typeOwners(type);
  const loc = LOCATION_META[type.location] || LOCATION_META.video;
  const activeDay = days[dayIdx];

  const confirm = () => {
    setError('');
    if (!slot) { setError('Pick a time to continue.'); return; }
    setBusy(true);
    const res = bookMeeting({
      typeId: type.id, startAt: slot.startAt,
      guestName: form.name, guestEmail: form.email, phone: form.phone, guestNotes: form.notes,
    });
    setBusy(false);
    if (res.error) {
      setError(res.message || 'Something went wrong. Try another time.');
      if (res.error === 'taken' || res.error === 'past') { setSlot(null); }
      return;
    }
    setBooked(res);
  };

  /* ---------- CONFIRMED ---------- */
  if (booked) {
    const { meeting, owner } = booked;
    return (
      <div style={{ background: c.bg, minHeight: '78vh', padding: '48px 20px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 560 }}>
          <div style={{ background: c.card, border: `1px solid ${c.line}`, borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,.5)' }}>
            <div style={{ height: 6, background: `linear-gradient(90deg, ${c.accent}, ${c.ok})` }} />
            <div style={{ padding: '36px 32px', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(34,197,139,.14)', color: c.ok, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                <Icon name="check" size={34} />
              </div>
              <h1 style={{ color: c.ink, fontSize: 26, margin: '0 0 6px', letterSpacing: '-.02em' }}>You are booked</h1>
              <p style={{ color: c.muted, margin: '0 0 24px' }}>A confirmation is on its way to {meeting.guestEmail}.</p>

              <div style={{ background: c.card2, border: `1px solid ${c.lineSoft}`, borderRadius: 14, padding: 20, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Row icon="clock" c={c} label={type.name} value={`${type.durationMin} minutes`} />
                <Row icon="calendar" c={c} label={dayLabel(meeting.startAt)} value={`${timeStr(meeting.startAt)} - ${timeStr(meeting.endAt)}`} />
                <Row icon="user" c={c} label={`With ${owner?.name || 'your host'}`} value={loc.label} />
                {type.location === 'in-person' && type.locationDetail && <Row icon="building" c={c} label="Location" value={type.locationDetail} />}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => downloadIcs(meeting, type, owner?.name || 'Rally')}
                  style={btn(c, true)}><Icon name="download" size={16} /> Add to calendar</button>
                <button onClick={() => { setBooked(null); setSlot(null); setForm({ name: '', email: '', phone: '', notes: '' }); }}
                  style={btn(c, false)}>Book another time</button>
              </div>
            </div>
          </div>
          <PoweredBy c={c} />
        </div>
      </div>
    );
  }

  /* ---------- BOOKING FLOW ---------- */
  return (
    <div style={{ background: c.bg, minHeight: '82vh', padding: '40px 20px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 980 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 320px) 1fr', gap: 0, background: c.card, border: `1px solid ${c.line}`, borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,.5)' }} className="bm-grid">
          {/* summary panel */}
          <aside style={{ padding: '32px 28px', borderRight: `1px solid ${c.line}`, background: c.card2, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${c.accent}, transparent)` }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: c.dim, fontSize: 13, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' }}>
              <span style={{ width: 26, height: 26, borderRadius: 7, background: `linear-gradient(135deg, ${c.accent}, #0b8578)`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><Icon name="zap" size={15} fill="currentColor" stroke={0} /></span>
              Rally
            </div>
            <h1 style={{ color: c.ink, fontSize: 27, margin: '18px 0 10px', letterSpacing: '-.02em', lineHeight: 1.15 }}>{type.name}</h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: '18px 0 8px' }}>
              <Meta icon="clock" c={c}>{type.durationMin} minutes</Meta>
              <Meta icon={loc.icon} c={c}>{loc.label}</Meta>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: c.muted, fontSize: 15 }}>
                <div style={{ display: 'flex' }}>
                  {owners.slice(0, 4).map((o, i) => <span key={o.id} style={{ marginLeft: i ? -10 : 0 }}><Avatar name={o.name} size={30} ring={c.card2} /></span>)}
                </div>
                <span>{owners.length > 1 ? `The Rally team (${owners.length})` : owners[0]?.name}</span>
              </div>
            </div>

            {type.description && <p style={{ color: c.muted, fontSize: 15, lineHeight: 1.6, margin: '16px 0 0', borderTop: `1px solid ${c.lineSoft}`, paddingTop: 16 }}>{type.description}</p>}
          </aside>

          {/* picker panel */}
          <section style={{ padding: '28px 28px 32px' }}>
            {!slot ? (
              <>
                <h2 style={{ color: c.ink, fontSize: 18, margin: '0 0 4px' }}>Select a time</h2>
                <p style={{ color: c.dim, fontSize: 14, margin: '0 0 18px' }}>Times shown in your local time zone.</p>

                {days.length === 0 ? (
                  <div style={{ color: c.muted, textAlign: 'center', padding: '40px 0' }}>
                    <div style={{ fontSize: 34, marginBottom: 10 }}>🗓️</div>
                    No open times in the current window. Please check back soon.
                  </div>
                ) : (
                  <>
                    {/* day rail */}
                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 18 }}>
                      {days.map((d, i) => {
                        const on = i === dayIdx;
                        return (
                          <button key={d.dayKey} onClick={() => setDayIdx(i)} style={{
                            flex: 'none', width: 68, padding: '10px 0', borderRadius: 12, cursor: 'pointer',
                            border: `1px solid ${on ? c.accent : c.line}`, background: on ? c.accentSoft : 'transparent',
                            color: on ? c.ink : c.muted, textAlign: 'center', transition: 'all .12s',
                          }}>
                            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: on ? c.accent : c.dim }}>{dayShort(d.date)}</div>
                            <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1 }}>{dayNum(d.date)}</div>
                            <div style={{ fontSize: 11, color: c.dim }}>{monShort(d.date)}</div>
                          </button>
                        );
                      })}
                    </div>

                    {/* slots */}
                    <div style={{ color: c.muted, fontSize: 14, fontWeight: 600, marginBottom: 10 }}>{activeDay ? dayLabel(activeDay.date) : ''}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))', gap: 10, maxHeight: 320, overflowY: 'auto' }}>
                      {(activeDay?.slots || []).map(s => (
                        <button key={s.startAt} onClick={() => setSlot(s)} style={{
                          padding: '12px 0', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 15,
                          border: `1px solid ${c.line}`, background: 'transparent', color: c.ink, transition: 'all .12s',
                        }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = c.accent; e.currentTarget.style.background = c.accentSoft; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = c.line; e.currentTarget.style.background = 'transparent'; }}>
                          {timeStr(s.startAt)}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <button onClick={() => setSlot(null)} style={{ background: 'none', border: 'none', color: c.accent, fontWeight: 600, cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                  <Icon name="arrowLeft" size={16} /> Change time
                </button>
                <div style={{ background: c.card2, border: `1px solid ${c.lineSoft}`, borderRadius: 12, padding: '14px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, color: c.ink }}>
                  <Icon name="calendar" size={18} style={{ color: c.accent }} />
                  <strong>{dayLabel(slot.startAt)}</strong>
                  <span style={{ color: c.muted }}>at {timeStr(slot.startAt)}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <Input c={c} label="Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Jane Cooper" autoFocus required />
                  <Input c={c} label="Email" type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="jane@company.com" required />
                  {type.location === 'phone' && <Input c={c} label="Phone number" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="+1 555 000 1234" />}
                  <Input c={c} label="Anything to share? (optional)" textarea value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} placeholder="What would you like to cover?" />
                </div>

                {error && <div style={{ color: '#ff6b6b', fontSize: 14, marginTop: 12, fontWeight: 600 }}>{error}</div>}

                <button onClick={confirm} disabled={busy} style={{ ...btn(c, true), width: '100%', justifyContent: 'center', marginTop: 20, padding: '14px 0', fontSize: 16, opacity: busy ? 0.7 : 1 }}>
                  {busy ? 'Booking...' : `Confirm ${type.durationMin} min meeting`}
                </button>
                <p style={{ color: c.dim, fontSize: 12.5, textAlign: 'center', margin: '12px 0 0' }}>By booking you agree to receive a calendar invite for this meeting.</p>
              </>
            )}
          </section>
        </div>
        <PoweredBy c={c} />
      </div>
      <style>{`@media (max-width: 720px){ .bm-grid{ grid-template-columns: 1fr !important; } .bm-grid > aside{ border-right: none !important; border-bottom: 1px solid ${c.line} !important; } }`}</style>
    </div>
  );
}

/* ---------- small presentational bits ---------- */
function Meta({ icon, c, children }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: c.muted, fontSize: 15 }}><Icon name={icon} size={17} style={{ color: c.accent }} /> {children}</div>;
}
function Row({ icon, c, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <Icon name={icon} size={18} style={{ color: c.accent, marginTop: 2, flex: 'none' }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ color: c.ink, fontWeight: 600, fontSize: 15 }}>{label}</div>
        <div style={{ color: c.muted, fontSize: 14 }}>{value}</div>
      </div>
    </div>
  );
}
function Input({ c, label, value, onChange, placeholder, type = 'text', textarea, autoFocus, required }) {
  const common = {
    value, onChange: e => onChange(e.target.value), placeholder, autoFocus,
    style: {
      width: '100%', background: c.card2, border: `1px solid ${c.line}`, borderRadius: 10,
      color: c.ink, padding: '11px 13px', fontSize: 15, outline: 'none', fontFamily: 'inherit',
    },
    onFocus: e => { e.target.style.borderColor = c.accent; },
    onBlur: e => { e.target.style.borderColor = c.line; },
  };
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', color: c.muted, fontSize: 13.5, fontWeight: 600, marginBottom: 6 }}>{label}{required && <span style={{ color: c.accent }}> *</span>}</span>
      {textarea ? <textarea rows={3} {...common} /> : <input type={type} {...common} />}
    </label>
  );
}
function btn(c, primary) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 20px', borderRadius: 10,
    fontWeight: 700, fontSize: 15, cursor: 'pointer', border: `1px solid ${primary ? 'transparent' : c.line}`,
    background: primary ? c.accent : 'transparent', color: primary ? '#fff' : c.muted,
    boxShadow: primary ? '0 8px 24px rgba(14,159,143,.32)' : 'none',
  };
}
function PoweredBy({ c }) {
  return (
    <div style={{ textAlign: 'center', marginTop: 18, color: c.dim, fontSize: 13 }}>
      Powered by <Link to="/" style={{ color: c.muted, fontWeight: 700 }}>Rally</Link>, the AI-native revenue platform.
    </div>
  );
}
