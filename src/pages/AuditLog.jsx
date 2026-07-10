// Audit log - the org-wide change history (Wave 8). Reads the append-only
// changelog from lib/audit.js and renders it as a filterable, day-grouped
// timeline with KPIs. Every field change on every object, who did it, and
// the before/after. Gated by the `audit.view` capability (lib/rbac.js) so a
// Rep or Viewer sees a locked state instead of the log.
import React, { useMemo, useState } from 'react';
import {
  SectionHeader, StatCard, Card, Badge, Button, Avatar, Input, Select,
  EmptyState, timeStr, relTime,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import { useAudit } from '../lib/audit.js';
import { can, roleMeta, getActiveRole, useRbac } from '../lib/rbac.js';
import { getCompany, getContact, getDeal, getUsers } from '../lib/store.js';
import { useExt } from '../lib/store-ext.js';

const OBJECT_META = {
  deal:    { label: 'Deal',    icon: 'deals',    tone: 'accent' },
  company: { label: 'Account', icon: 'building', tone: 'info' },
  contact: { label: 'Contact', icon: 'users',    tone: 'default' },
  quote:   { label: 'Quote',   icon: 'receipt',  tone: 'warn' },
};

/* Turn a stored field key into a readable label. */
function fieldLabel(field) {
  if (!field) return 'field';
  const nice = field
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\bid\b/i, 'ID');
  return nice.charAt(0).toUpperCase() + nice.slice(1);
}

function displayValue(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'object') { try { return JSON.stringify(v); } catch { return String(v); } }
  const s = String(v);
  return s.length > 60 ? s.slice(0, 57) + '...' : s;
}

const dayKey = (iso) => new Date(iso).toDateString();
function dayHeading(key) {
  const d = new Date(key), today = new Date().toDateString();
  const yest = new Date(Date.now() - 86400000).toDateString();
  if (key === today) return 'Today';
  if (key === yest) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function AuditLog() {
  useRbac(); // re-render when the active role / view-as changes
  const log = useAudit(s => s);
  useExt(s => s.quotes); // keep quote-name resolution fresh
  const users = getUsers();

  const [type, setType] = useState('all');
  const [actor, setActor] = useState('all');
  const [q, setQ] = useState('');

  const allowed = can('audit.view');

  const recordName = (objectType, id) => {
    try {
      if (objectType === 'deal') return getDeal(id)?.name;
      if (objectType === 'company') return getCompany(id)?.name;
      if (objectType === 'contact') { const c = getContact(id); return c && (c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim()); }
      if (objectType === 'quote') return null;
    } catch {}
    return null;
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return log.filter(e => {
      if (type !== 'all' && e.objectType !== type) return false;
      if (actor !== 'all' && e.who !== actor) return false;
      if (needle) {
        const hay = `${e.who} ${e.field} ${recordName(e.objectType, e.recordId) || ''} ${displayValue(e.to) || ''} ${displayValue(e.from) || ''}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [log, type, actor, q]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayCount = log.filter(e => new Date(e.at).toDateString() === today).length;
    const actors = new Set(log.map(e => e.who)).size;
    const objects = new Set(log.map(e => `${e.objectType}:${e.recordId}`)).size;
    return { total: log.length, todayCount, actors, objects };
  }, [log]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const e of filtered) { const k = dayKey(e.at); if (!map.has(k)) map.set(k, []); map.get(k).push(e); }
    return [...map.entries()];
  }, [filtered]);

  const actorNames = useMemo(() => [...new Set(log.map(e => e.who))], [log]);

  const role = roleMeta(getActiveRole());

  return (
    <div className="fade-up col gap-3">
      <SectionHeader
        eyebrow="Governance"
        title="Audit log"
        sub="Every field change across the workspace, who made it, and the value before and after."
      />

      {!allowed ? (
        <Card className="col center" style={{ gap: '.9rem', padding: '3.5rem 1.5rem', textAlign: 'center' }}>
          <span className="row center" style={{ width: 56, height: 56, borderRadius: 16, background: 'color-mix(in srgb, var(--risk) 12%, var(--paper))', color: 'var(--risk)' }}>
            <Icon name="lock" size={26} />
          </span>
          <h3 style={{ margin: 0 }}>Restricted</h3>
          <span className="muted" style={{ maxWidth: '44ch' }}>
            The audit log is an admin surface. You are viewing Rally as
            <strong style={{ color: role.color }}> {role.label}</strong>, which does not include
            the "View audit log" permission. Switch back to Admin in Settings to see it.
          </span>
        </Card>
      ) : (
        <>
          <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))' }}>
            <StatCard label="Total changes" value={stats.total} icon={<Icon name="history" size={18} />} sub="all time" />
            <StatCard label="Changed today" value={stats.todayCount} icon={<Icon name="activity" size={18} />} accent="var(--ok)" sub="in the last day" />
            <StatCard label="Active editors" value={stats.actors} icon={<Icon name="user" size={18} />} sub="distinct actors" />
            <StatCard label="Records touched" value={stats.objects} icon={<Icon name="layers" size={18} />} accent="var(--warn)" sub="unique records" />
          </div>

          <Card pad={false}>
            <div className="row between wrap" style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line)', gap: '.75rem' }}>
              <div className="row gap-2" style={{ alignItems: 'center' }}>
                <Icon name="filter" size={17} />
                <strong>{filtered.length} change{filtered.length !== 1 ? 's' : ''}</strong>
              </div>
              <div className="row gap-2 wrap" style={{ alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-500)', pointerEvents: 'none' }}><Icon name="search" size={15} /></span>
                  <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search changes" style={{ paddingLeft: 32, width: 200 }} />
                </div>
                <div style={{ minWidth: 150 }}>
                  <Select value={type} onChange={e => setType(e.target.value)}>
                    <option value="all">All objects</option>
                    {Object.entries(OBJECT_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
                  </Select>
                </div>
                <div style={{ minWidth: 150 }}>
                  <Select value={actor} onChange={e => setActor(e.target.value)}>
                    <option value="all">Everyone</option>
                    {actorNames.map(n => <option key={n} value={n}>{n}</option>)}
                  </Select>
                </div>
              </div>
            </div>

            {filtered.length === 0 ? (
              <EmptyState icon="🗂️" title="No changes match"
                body="Nothing here yet. Edit a record and its change history lands in this log instantly." />
            ) : (
              <div className="col" style={{ padding: '.5rem 0' }}>
                {groups.map(([key, entries]) => (
                  <div key={key} className="col">
                    <div className="row gap-2" style={{ alignItems: 'center', padding: '.85rem 1.25rem .45rem' }}>
                      <span className="eyebrow" style={{ margin: 0 }}>{dayHeading(key)}</span>
                      <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                      <span className="t-xs muted">{entries.length}</span>
                    </div>
                    <ul className="col" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                      {entries.map((e, i) => {
                        const om = OBJECT_META[e.objectType] || { label: e.objectType, icon: 'fileText', tone: 'default' };
                        const rn = recordName(e.objectType, e.recordId);
                        const from = displayValue(e.from), to = displayValue(e.to);
                        return (
                          <li key={e.id} className="audit-row row gap-3"
                            style={{ padding: '.7rem 1.25rem', borderTop: '1px solid var(--line)', alignItems: 'flex-start', animation: `fadeUp .3s var(--ease) both`, animationDelay: `${Math.min(i * 18, 260)}ms` }}>
                            <Avatar name={e.who} size={32} />
                            <div className="col" style={{ gap: 3, minWidth: 0, flex: 1 }}>
                              <div className="row gap-2 wrap" style={{ alignItems: 'baseline' }}>
                                <span className="fw-6">{e.who}</span>
                                <span className="muted t-sm">changed</span>
                                <span className="fw-6">{fieldLabel(e.field)}</span>
                                <span className="muted t-sm">on</span>
                                <Badge tone={om.tone} className="t-xs" style={{ flex: 'none' }}>
                                  <Icon name={om.icon} size={12} /> {rn || om.label}
                                </Badge>
                              </div>
                              <div className="row gap-2 wrap" style={{ alignItems: 'center' }}>
                                {from != null && (
                                  <span className="t-sm" style={{ color: 'var(--n-500)', textDecoration: 'line-through', textDecorationColor: 'color-mix(in srgb, var(--risk) 60%, transparent)' }}>{from}</span>
                                )}
                                {from != null && <Icon name="chevronRight" size={13} style={{ color: 'var(--n-400)' }} />}
                                <span className="t-sm fw-6" style={{ color: to != null ? 'var(--ok)' : 'var(--n-500)' }}>{to != null ? to : 'cleared'}</span>
                              </div>
                            </div>
                            <span className="t-xs muted tnum" title={new Date(e.at).toLocaleString()} style={{ flex: 'none', whiteSpace: 'nowrap' }}>
                              {timeStr(e.at)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
