// ============================================================
// MARKETING HUB  (route: /markethub, module key: markethub)
//
// Engine 6 (Marketing Hub unification): the single command center for
// every marketing surface. It is a REAL rollup - counts come live from
// the actual stores (campaigns, sequences, journeys/automations, forms,
// landing pages, funnels, lists), a real cross-surface activity feed, and
// one-click launch into each surface. It also surfaces the live lead-
// scoring leaderboard + segments (scored from real contacts).
//
// 100% local-first, alive with zero backend. Reads every marketing store
// through markethub-data.js. Reuses UI.jsx primitives + Icon. Every button
// works, empty states designed. ASCII only. NO em-dash / en-dash.
// ============================================================
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store.js';
import {
  useMarketHub, getRules, hubRollup, surfaceRollup, recentActivity,
  scoredContacts, segmentOverview, QUICK_LAUNCH, contactName,
} from '../lib/markethub-data.js';
import { useMarketing } from '../lib/marketing-campaigns.js';
import { useSequenceStore } from '../lib/sequences-data.js';
import { useEngine } from '../lib/automation-engine.js';
import { useForms } from '../lib/forms.js';
import { useLanding } from '../lib/landing-pages.js';
import { useFunnels } from '../lib/funnels-data.js';
import { useLists } from '../lib/lists.js';
import {
  Button, Card, Badge, Avatar, PageTitle, SectionHeader,
  ProgressBar, EmptyState, relTime, useToast,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';

const num = (n) => Math.round(n || 0).toLocaleString();
function askRook(prompt) {
  try { window.dispatchEvent(new CustomEvent('rally:rook', { detail: { prompt } })); } catch {}
}

function GradePill({ grade, size = 'md' }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size === 'sm' ? 24 : 30, height: size === 'sm' ? 24 : 30, borderRadius: 8,
      background: grade.color, color: '#fff', fontWeight: 800, fontSize: size === 'sm' ? 12 : 14, flex: 'none',
    }}>{grade.grade}</span>
  );
}

export default function MarketingHub() {
  // Subscribe to every marketing store AND capture each snapshot so the memoized
  // rollups recompute when any underlying store (including live CRM data) changes.
  const store = useStore();
  const hub = useMarketHub();
  const mkt = useMarketing();
  const seqSnap = useSequenceStore();
  const engSnap = useEngine();
  const formsSnap = useForms();
  const landSnap = useLanding();
  const funnelsSnap = useFunnels();
  const listsSnap = useLists();

  const rules = getRules();
  const roll = useMemo(() => hubRollup(), [rules, store, mkt, seqSnap, engSnap, formsSnap, landSnap, funnelsSnap, listsSnap]);
  const surfaces = roll.surfaces;
  const activity = useMemo(() => recentActivity(12), [store, mkt, landSnap, formsSnap]);
  const scored = useMemo(() => scoredContacts(rules), [rules, store, hub]);
  const hot = scored.slice(0, 6);
  const segments = useMemo(() => segmentOverview(rules), [rules, store, hub]);

  return (
    <div className="page-in col gap-3">
      <PageTitle
        eyebrow="Marketing"
        title="Marketing Hub"
        sub="One place to see and launch everything. Live counts from every marketing surface, a real cross-channel activity feed, and your scored audience - all in one command center."
        action={
          <>
            <Button variant="ghost" onClick={() => askRook('Give me a marketing rollup: what shipped this week, where are my hottest leads, and what should I launch next?')}>
              <Icon name="sparkles" size={16} /> Ask Rook
            </Button>
            <Button variant="accent" as={Link} to="/campaigns"><Icon name="plus" size={16} /> New campaign</Button>
          </>
        }
      />

      {/* top-line KPIs (all real) */}
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <KpiTile label="Emails sent" value={num(roll.emailsSent)} sub="campaigns + sequences" icon="mail" accent="var(--accent)" />
        <KpiTile label="Page views" value={num(roll.pageViews)} sub="landing pages" icon="eye" accent="var(--accent-teal)" />
        <KpiTile label="Leads captured" value={num(roll.leadsCaptured)} sub="forms + pages" icon="inbox" accent="var(--accent-purple)" />
        <KpiTile label="Active enrollments" value={num(roll.activeEnrollments)} sub={`${roll.activeAutomations} live journeys`} icon="activity" accent="var(--ok)" />
      </div>

      {/* surface cards - every marketing surface, real counts, one-click open */}
      <div className="col gap-2">
        <SectionHeader title="Every surface, one view" sub="Live counts from each store. Click to open and launch." />
        <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))' }}>
          {surfaces.map(s => (
            <Link key={s.key} to={s.to} className="card card-hover" style={{ padding: '1.1rem 1.15rem', display: 'flex', flexDirection: 'column', gap: '.5rem', textDecoration: 'none', color: 'inherit' }}>
              <div className="row between">
                <span style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--accent-50)', color: 'var(--accent-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={s.icon} size={19} /></span>
                <span className="t-xs muted"><Icon name="arrowUpRight" size={14} /></span>
              </div>
              <div className="fw-8" style={{ fontSize: '1.8rem', letterSpacing: '-.02em' }}>{num(s.metric)}</div>
              <div className="fw-7">{s.label}</div>
              <div className="t-xs muted clip">{s.sub}</div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr', gap: '1.15rem', alignItems: 'start' }}>
        {/* recent activity feed (real events) */}
        <Card className="col gap-2">
          <SectionHeader title="Recent activity" sub="Real events across every marketing surface." />
          {activity.length === 0 ? (
            <EmptyState icon="🗞️" title="No activity yet" body="Send a campaign, publish a page, or capture a form lead and it shows up here." />
          ) : (
            <div className="col">
              {activity.map((a, i) => (
                <Link key={i} to={a.to} className="row gap-2" style={{ alignItems: 'center', padding: '.6rem .2rem', borderTop: i ? '1px solid var(--line)' : 'none', textDecoration: 'none', color: 'inherit' }}>
                  <span style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--n-100)', color: 'var(--n-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Icon name={a.icon} size={15} /></span>
                  <div className="col" style={{ minWidth: 0, flex: 1 }}>
                    <span className="fw-6 clip t-sm">{a.label}</span>
                    <span className="t-xs muted clip">{a.sub}</span>
                  </div>
                  <span className="t-xs muted" style={{ flex: 'none' }}>{relTime(a.at)}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* hot leads (real scored contacts) */}
        <Card className="col gap-2">
          <SectionHeader title="Hottest leads" sub="Scored live from your contacts." action={<Link className="btn btn-quiet btn-sm" to="/leads">All leads</Link>} />
          {hot.length === 0 ? (
            <EmptyState title="No contacts yet" body="Scored leads appear as your book fills in." />
          ) : (
            <div className="col gap-1">
              {hot.map(s => (
                <Link key={s.contact.id} to={`/contacts/${s.contact.id}`} className="row gap-2" style={{ alignItems: 'center', padding: '.5rem .3rem', textDecoration: 'none', color: 'inherit' }}>
                  <Avatar name={contactName(s.contact)} size={30} />
                  <div className="col" style={{ minWidth: 0, flex: 1 }}>
                    <span className="fw-6 clip t-sm">{contactName(s.contact)}</span>
                    <span className="t-xs muted clip">{s.contact.title || 'Contact'}</span>
                  </div>
                  <span className="t-xs muted tnum" style={{ flex: 'none' }}>{s.score}</span>
                  <GradePill grade={s.grade} size="sm" />
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* live segments (real audience sizes) */}
      <div className="col gap-2">
        <SectionHeader title="Live segments" sub="Audience sizes computed from real contacts." />
        <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
          {segments.map(seg => (
            <Link key={seg.id} to={seg.to} className="card card-hover" style={{ padding: '1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '.35rem', textDecoration: 'none', color: 'inherit' }}>
              <div className="row between">
                <span className="fw-7 clip">{seg.label}</span>
                <Badge tone={seg.tone}>{num(seg.count)}</Badge>
              </div>
              <div className="t-xs muted" style={{ lineHeight: 1.45 }}>{seg.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* quick launch (deep links to every surface) */}
      <Card className="col gap-2">
        <SectionHeader title="Launch anything" sub="Jump straight into any marketing surface." />
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '.6rem' }}>
          {QUICK_LAUNCH.map(q => (
            <Link key={q.to} to={q.to} className="row gap-2" style={{ alignItems: 'center', padding: '.7rem .85rem', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', textDecoration: 'none', color: 'inherit' }}>
              <span style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-50)', color: 'var(--accent-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Icon name={q.icon} size={16} /></span>
              <div className="col" style={{ minWidth: 0 }}>
                <span className="fw-6 clip t-sm">{q.label}</span>
                <span className="t-xs muted clip">{q.desc}</span>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}

function KpiTile({ label, value, sub, icon, accent }) {
  return (
    <div className="card card-pad" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -30, right: -30, width: 110, height: 110, borderRadius: '50%', background: accent, opacity: .08, filter: 'blur(8px)' }} />
      <div className="row between" style={{ position: 'relative' }}>
        <div className="stat-label">{label}</div>
        <span style={{ color: accent }}><Icon name={icon} size={18} /></span>
      </div>
      <div className="stat-value" style={{ fontSize: 'clamp(1.9rem, 3vw, 2.5rem)', marginTop: 6 }}>{value}</div>
      <div className="t-xs muted" style={{ marginTop: 2 }}>{sub}</div>
    </div>
  );
}
