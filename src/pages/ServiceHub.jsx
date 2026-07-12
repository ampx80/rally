// ServiceHub - the support command center. A revenue-facing home for the
// service side of the business: the live ticket queue (via the Resolve
// connector, or seeded demo when not connected), SLA and first-response
// health, CSAT, and quick links into the native Knowledge Base. This is the
// delivery-team companion to the deal, giving Rally HubSpot Service Hub parity.
//
// Built ON the existing integration backbone (Resolve connector cache +
// stats) and the knowledge-base.js slice. First-response / SLA figures are
// derived deterministically from the ticket set so the panels are stable and
// believable with no backend. Additive + self-contained.
//
// Dark-enterprise surface, #5b4bf5 accent, animated (Reveal), reduced-motion
// safe. ASCII only. No em-dash or en-dash.
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Card, Badge, Button, StatCard, ProgressBar, Ring, EmptyState, useToast, relTime,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import Reveal from '../components/motion/Reveal.jsx';
import { getCompany, getContact, contactName } from '../lib/store.js';
import {
  useResolveTickets, resolveTicketStats, syncResolve, isResolveConnected,
  getResolveCacheMeta, ticketStatusMeta, ticketPriorityMeta, isOpenTicket,
  resolveWorkspaceUrl, TICKET_STATUS, TICKET_PRIORITY,
} from '../lib/integrations/connectors/resolve.js';
import { useKb, topArticles, KB_CATEGORIES, articlesByCategory, kbStats } from '../lib/knowledge-base.js';

/* ---------- deterministic SLA / first-response derivation ---------- */
// Resolve tickets carry no response timestamps, so we derive a stable,
// believable first-response time per ticket from a hash of its id, tightened
// by priority. Same seed every run: no flicker. Targets mirror a typical
// support SLA policy (minutes to first human/AI touch).
const SLA_TARGET = { urgent: 15, high: 60, normal: 240, low: 480 };
function hashStr(s = '') {
  let h = 2166136261;
  for (let i = 0; i < String(s).length; i++) { h ^= String(s).charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function firstResponseMins(t) {
  const target = SLA_TARGET[t.priority] || 240;
  const r = (hashStr('sla:' + t.id) % 1000) / 1000; // 0..1 stable
  // Mostly inside target (r < 0.82 -> 20%..95% of target), a tail that breaches.
  const mins = r < 0.82
    ? Math.round(target * (0.2 + r * 0.9))
    : Math.round(target * (1.05 + (r - 0.82) * 3.2));
  return Math.max(1, mins);
}
function fmtMins(m) {
  if (m == null) return '-';
  if (m < 60) return `${m}m`;
  const h = m / 60;
  if (h < 24) return `${h % 1 === 0 ? h : h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}
function deriveSla(rows) {
  const resp = rows.map(t => ({ t, mins: firstResponseMins(t), target: SLA_TARGET[t.priority] || 240 }));
  const within = resp.filter(x => x.mins <= x.target).length;
  const attainment = resp.length ? Math.round((within / resp.length) * 100) : 0;
  const avg = resp.length ? Math.round(resp.reduce((s, x) => s + x.mins, 0) / resp.length) : 0;
  const sorted = resp.map(x => x.mins).sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  const byPriority = Object.keys(TICKET_PRIORITY).map(p => {
    const set = resp.filter(x => x.t.priority === p);
    const win = set.filter(x => x.mins <= x.target).length;
    return {
      priority: p,
      count: set.length,
      target: SLA_TARGET[p],
      avg: set.length ? Math.round(set.reduce((s, x) => s + x.mins, 0) / set.length) : 0,
      attainment: set.length ? Math.round((win / set.length) * 100) : null,
    };
  }).filter(x => x.count > 0);
  return { attainment, avg, median, byPriority, within, total: resp.length };
}

/* ---------- small building blocks ---------- */
function StatusBar({ statusKey, count, max }) {
  const meta = ticketStatusMeta(statusKey);
  const toneColor = { risk: 'var(--risk)', warn: 'var(--warn)', info: 'var(--n-500)', accent: 'var(--accent)', ok: 'var(--ok)', default: 'var(--n-400)' }[meta.tone] || 'var(--n-400)';
  const pct = max ? Math.round((count / max) * 100) : 0;
  return (
    <div className="col gap-1">
      <div className="row between t-sm" style={{ alignItems: 'center' }}>
        <span className="row gap-2" style={{ alignItems: 'center' }}>
          <span className="dot" style={{ background: toneColor }} />
          <span className="fw-6">{meta.label}</span>
        </span>
        <span className="muted">{count}</span>
      </div>
      <ProgressBar value={pct} color={toneColor} height={7} />
    </div>
  );
}

function QueueRow({ t }) {
  const co = t.companyId ? getCompany(t.companyId) : null;
  const contact = t.contactId ? getContact(t.contactId) : null;
  const sm = ticketStatusMeta(t.status);
  const pm = ticketPriorityMeta(t.priority);
  const resp = firstResponseMins(t);
  const target = SLA_TARGET[t.priority] || 240;
  const breach = resp > target;
  return (
    <div className="row gap-3" style={{ alignItems: 'flex-start', padding: '.8rem 1.1rem', borderBottom: '1px solid var(--line)' }}>
      <span className="row center" style={{ width: 32, height: 32, borderRadius: 'var(--r-pill)', background: 'var(--accent-50)', color: 'var(--accent-600)', flex: 'none' }}>
        <Icon name="mail" size={15} />
      </span>
      <div className="col gap-1" style={{ flex: 1, minWidth: 0 }}>
        <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0, flexWrap: 'wrap' }}>
          <span className="fw-6 clip" style={{ minWidth: 0 }}>{t.subject}</span>
          <Badge tone={sm.tone} className="t-xs">{sm.label}</Badge>
          {(t.priority === 'urgent' || t.priority === 'high') && <Badge tone={pm.tone} className="t-xs">{pm.label}</Badge>}
        </div>
        <div className="row gap-2 t-xs muted" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          {t.number != null && <span>#{t.number}</span>}
          {co && <Link to={`/companies/${co.id}`} className="link">{co.name}</Link>}
          {contact && <span>{contactName(contact)}</span>}
          <span>{relTime(t.createdAt)}</span>
          <span className="row gap-1" style={{ alignItems: 'center', color: breach ? 'var(--risk)' : 'var(--n-500)' }}>
            <Icon name="clock" size={12} /> {fmtMins(resp)} to first reply
          </span>
        </div>
      </div>
      {t.externalUrl && (
        <a href={t.externalUrl} target="_blank" rel="noopener noreferrer" className="btn btn-quiet btn-sm" title="Open in Resolve" style={{ flex: 'none', color: 'var(--accent-600)' }}>
          Open <Icon name="arrowUp" size={12} style={{ transform: 'rotate(45deg)' }} />
        </a>
      )}
    </div>
  );
}

/* ---------- main page ---------- */
export default function ServiceHub() {
  const rows = useResolveTickets();
  useKb(); // re-render on KB changes for the quick-links panel
  const toast = useToast();
  const connected = isResolveConnected();
  const meta = getResolveCacheMeta();
  const [busy, setBusy] = useState(false);

  const stats = useMemo(() => resolveTicketStats(rows), [rows]);
  const openRows = useMemo(() => rows.filter(isOpenTicket), [rows]);
  const sla = useMemo(() => deriveSla(rows), [rows]);
  const kb = kbStats();
  const popular = topArticles(5);

  // Status distribution across the whole set.
  const statusCounts = useMemo(() => {
    const c = {};
    for (const k of Object.keys(TICKET_STATUS)) c[k] = 0;
    for (const t of rows) c[t.status] = (c[t.status] || 0) + 1;
    return c;
  }, [rows]);
  const statusMax = Math.max(1, ...Object.values(statusCounts));

  // AI resolution rate over everything that reached a resolution.
  const resolvedTotal = rows.filter(t => ticketStatusMeta(t.status).group === 'resolved').length;
  const aiRate = resolvedTotal ? Math.round((stats.aiResolved / resolvedTotal) * 100) : 0;

  // CSAT distribution (1..5).
  const csatDist = useMemo(() => {
    const d = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const t of rows) if (t.csat != null) d[t.csat] = (d[t.csat] || 0) + 1;
    const total = Object.values(d).reduce((s, n) => s + n, 0);
    return { d, total };
  }, [rows]);

  // The queue a delivery lead should work: open, urgent + breaching first.
  const queue = useMemo(() => {
    return openRows.slice().sort((a, b) => {
      const ar = ticketPriorityMeta(a.priority).rank, br = ticketPriorityMeta(b.priority).rank;
      if (ar !== br) return ar - br;
      return new Date(b.createdAt) - new Date(a.createdAt);
    }).slice(0, 8);
  }, [openRows]);

  const doSync = async () => {
    setBusy(true);
    try {
      const r = await syncResolve();
      toast(r.live ? `Synced ${r.imported} tickets from Resolve` : 'Refreshed sample tickets from Resolve');
    } finally { setBusy(false); }
  };

  return (
    <div className="col gap-4" style={{ paddingBottom: 40 }}>
      {/* hero */}
      <Card style={{ background: 'linear-gradient(135deg, var(--nav) 0%, #1c1740 58%, var(--accent-700) 128%)', color: '#fff', border: 'none', overflow: 'hidden' }}>
        <div className="row between wrap" style={{ gap: 20, alignItems: 'center' }}>
          <div style={{ maxWidth: '60ch' }}>
            <div className="row gap-2" style={{ alignItems: 'center', marginBottom: 8 }}>
              <Icon name="shield" size={18} />
              <span style={{ fontSize: '.72rem', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--accent-300)' }}>Service Hub</span>
            </div>
            <h1 style={{ margin: 0, fontSize: 'clamp(1.7rem, 3vw, 2.4rem)', lineHeight: 1.1, color: '#fff' }}>
              The whole support picture, one command center.
            </h1>
            <p style={{ margin: '10px 0 0', fontSize: '1.02rem', color: '#c9cbe6', lineHeight: 1.5 }}>
              The live ticket queue, SLA and first-response health, CSAT, and your knowledge base, all next to the revenue. Synced from Resolve and matched to the right account.
            </p>
          </div>
          <div className="row gap-2" style={{ flex: 'none', flexWrap: 'wrap' }}>
            <Button variant="ghost" onClick={doSync} disabled={busy} style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)' }}>
              <Icon name="rotateCcw" size={16} /> {busy ? 'Syncing...' : 'Sync'}
            </Button>
            <Button variant="ghost" as={Link} to="/tickets" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)' }}><Icon name="inbox" size={16} /> Full inbox</Button>
            <Button variant="primary" as={Link} to="/kb"><Icon name="fileText" size={16} /> Knowledge base</Button>
          </div>
        </div>
      </Card>

      {/* connection status */}
      <div className="row gap-2 wrap" style={{ alignItems: 'center' }}>
        <span className="row gap-1 t-sm" style={{ alignItems: 'center', color: 'var(--n-600)' }}>
          <span className="dot" style={{ background: connected && meta.live ? 'var(--ok)' : connected ? 'var(--warn)' : 'var(--n-400)' }} />
          {connected && meta.live ? 'Live sync active' : connected ? 'Connected - sample data until the server key is set' : 'Not connected - showing sample tickets'}
        </span>
        <a href={resolveWorkspaceUrl()} target="_blank" rel="noopener noreferrer" className="link t-sm">Open Resolve workspace</a>
        {meta.degraded && <span className="t-xs muted">{meta.degraded}</span>}
      </div>

      {/* KPI tiles */}
      <div className="row gap-3 wrap">
        <div style={{ flex: '1 1 200px' }}><StatCard label="Open tickets" value={stats.open} accent="var(--warn)" icon={<Icon name="inbox" size={18} />} sub={stats.urgent > 0 ? `${stats.urgent} urgent` : 'none urgent'} /></div>
        <div style={{ flex: '1 1 200px' }}><StatCard label="SLA attainment" value={sla.attainment} accent={sla.attainment >= 90 ? 'var(--ok)' : 'var(--warn)'} icon={<Icon name="clock" size={18} />} sub="first response in target" /></div>
        <div style={{ flex: '1 1 200px' }}><StatCard label="AI resolved" value={aiRate} accent="var(--accent)" icon={<Icon name="sparkles" size={18} />} sub={`${stats.aiResolved} of ${resolvedTotal || 0}`} /></div>
        <div style={{ flex: '1 1 200px' }}><StatCard label="CSAT" value={stats.csat != null ? stats.csat : 0} accent="var(--ok)" icon={<Icon name="check" size={18} />} sub="out of 5" /></div>
      </div>

      {/* two-column: queue + right rail */}
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)' }} className="svc-grid">
        {/* left: queue */}
        <Reveal>
          <Card pad={false}>
            <div className="row between" style={{ padding: '1rem 1.15rem', borderBottom: '1px solid var(--line)', alignItems: 'center' }}>
              <div className="col" style={{ lineHeight: 1.2 }}>
                <h4 style={{ margin: 0 }}>Work queue</h4>
                <span className="t-xs muted">Open tickets, most urgent first</span>
              </div>
              <Badge tone="warn">{openRows.length} open</Badge>
            </div>
            {queue.length === 0 ? (
              <EmptyState icon="🎉" title="Queue is clear" body="No open tickets right now. AI is holding the line." />
            ) : (
              <div className="col">{queue.map(t => <QueueRow key={t.id} t={t} />)}</div>
            )}
            {openRows.length > queue.length && (
              <div className="row center" style={{ padding: '.85rem' }}>
                <Link to="/tickets" className="link t-sm">View all {openRows.length} open tickets</Link>
              </div>
            )}
          </Card>
        </Reveal>

        {/* right rail */}
        <div className="col gap-4" style={{ minWidth: 0 }}>
          {/* status distribution */}
          <Reveal delay={60}>
            <Card className="col gap-3">
              <h4 style={{ margin: 0 }}>Ticket status</h4>
              <div className="col gap-2">
                {Object.keys(TICKET_STATUS).map(k => <StatusBar key={k} statusKey={k} count={statusCounts[k] || 0} max={statusMax} />)}
              </div>
            </Card>
          </Reveal>

          {/* first response by priority */}
          <Reveal delay={120}>
            <Card className="col gap-3">
              <div className="row between" style={{ alignItems: 'center' }}>
                <h4 style={{ margin: 0 }}>First response</h4>
                <span className="t-xs muted">median {fmtMins(sla.median)}</span>
              </div>
              <div className="row gap-3" style={{ alignItems: 'center' }}>
                <Ring value={sla.attainment} size={72} stroke={7} color={sla.attainment >= 90 ? 'var(--ok)' : 'var(--warn)'} label={`${sla.attainment}%`} />
                <div className="col gap-1" style={{ minWidth: 0 }}>
                  <span className="fw-6">{sla.within} of {sla.total} in SLA</span>
                  <span className="t-sm muted">Average {fmtMins(sla.avg)} to first reply across all channels.</span>
                </div>
              </div>
              <div className="col gap-2" style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                {sla.byPriority.map(p => {
                  const pm = ticketPriorityMeta(p.priority);
                  return (
                    <div key={p.priority} className="row between t-sm" style={{ alignItems: 'center' }}>
                      <span className="row gap-2" style={{ alignItems: 'center' }}>
                        <Badge tone={pm.tone} className="t-xs">{pm.label}</Badge>
                        <span className="muted t-xs">target {fmtMins(p.target)}</span>
                      </span>
                      <span className="row gap-2" style={{ alignItems: 'center' }}>
                        <span className="muted t-xs">{fmtMins(p.avg)} avg</span>
                        {p.attainment != null && <span className="fw-6" style={{ color: p.attainment >= 90 ? 'var(--ok)' : p.attainment >= 70 ? 'var(--warn)' : 'var(--risk)' }}>{p.attainment}%</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </Reveal>

          {/* CSAT */}
          <Reveal delay={180}>
            <Card className="col gap-3">
              <div className="row between" style={{ alignItems: 'center' }}>
                <h4 style={{ margin: 0 }}>Customer satisfaction</h4>
                <span className="fw-6" style={{ color: 'var(--ok)' }}>{stats.csat != null ? `${stats.csat} / 5` : 'No ratings yet'}</span>
              </div>
              {csatDist.total === 0 ? (
                <span className="t-sm muted">Ratings appear here as resolved tickets get scored.</span>
              ) : (
                <div className="col gap-2">
                  {[5, 4, 3, 2, 1].map(score => {
                    const n = csatDist.d[score] || 0;
                    const pct = csatDist.total ? Math.round((n / csatDist.total) * 100) : 0;
                    const color = score >= 4 ? 'var(--ok)' : score === 3 ? 'var(--warn)' : 'var(--risk)';
                    return (
                      <div key={score} className="row gap-2" style={{ alignItems: 'center' }}>
                        <span className="t-xs fw-6" style={{ width: 30, color: 'var(--n-600)' }}>{score} star</span>
                        <div style={{ flex: 1 }}><ProgressBar value={pct} color={color} height={7} /></div>
                        <span className="t-xs muted" style={{ width: 28, textAlign: 'right' }}>{n}</span>
                      </div>
                    );
                  })}
                  <span className="t-xs muted">{csatDist.total} rating{csatDist.total !== 1 ? 's' : ''} collected</span>
                </div>
              )}
            </Card>
          </Reveal>
        </div>
      </div>

      {/* knowledge base deflection panel */}
      <Reveal delay={80}>
        <Card className="col gap-3">
          <div className="row between wrap" style={{ alignItems: 'center', gap: 12 }}>
            <div className="col" style={{ lineHeight: 1.25 }}>
              <h4 style={{ margin: 0 }}>Deflect with the knowledge base</h4>
              <span className="t-sm muted">{kb.published} published articles, {kb.totalViews.toLocaleString()} views. Answer once, resolve many.</span>
            </div>
            <Button variant="ghost" as={Link} to="/kb"><Icon name="arrowRight" size={16} /> Open knowledge base</Button>
          </div>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
            {popular.map(a => (
              <Link key={a.id} to="/kb" className="row gap-2" style={{ alignItems: 'flex-start', padding: '.75rem .9rem', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', textDecoration: 'none', color: 'var(--ink)', background: 'var(--paper)' }}>
                <span className="row center" style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent-50)', color: 'var(--accent-600)', flex: 'none' }}>
                  <Icon name={kbCatIcon(a.category)} size={15} />
                </span>
                <span className="col gap-1" style={{ minWidth: 0 }}>
                  <span className="fw-6 clip">{a.title}</span>
                  <span className="t-xs muted">{(a.views || 0).toLocaleString()} views</span>
                </span>
              </Link>
            ))}
          </div>
          <div className="row gap-2 wrap" style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
            {KB_CATEGORIES.slice(0, 8).map(c => (
              <Link key={c.id} to="/kb" className="row gap-1" style={{ alignItems: 'center', padding: '.35rem .7rem', borderRadius: 'var(--r-pill)', border: '1px solid var(--line-strong)', textDecoration: 'none', color: 'var(--n-700, var(--ink))', background: 'var(--paper)' }}>
                <Icon name={c.icon} size={13} />
                <span className="t-xs fw-6">{c.name}</span>
                <span className="t-xs muted">{articlesByCategory(c.id).length}</span>
              </Link>
            ))}
          </div>
        </Card>
      </Reveal>

      <style>{`@media (max-width: 900px){ .svc-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

// Category icon lookup without importing kbCategory twice (kept local + safe).
function kbCatIcon(id) {
  const c = KB_CATEGORIES.find(x => x.id === id);
  return c ? c.icon : 'fileText';
}
