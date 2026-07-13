// Marketplace. Rally's app ecosystem - deeper than the Integrations page.
// Four surfaces over one local-first store (src/lib/marketplace-data.js):
// a Discover home (featured + categories + searchable grid), an app detail
// modal (description, screenshots, permissions, pricing, one-click install),
// an Installed manager (configure / enable / uninstall), and a build-your-own
// developer callout. Install really mutates the store and flips to Connected;
// 100% functional with seeded data and zero backend. An ecosystem is a moat.
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Button, Card, Badge, PageTitle, SectionHeader, Field, Input, Select,
  Modal, EmptyState, Segmented, GradientText, Ring, Sparkline, ProgressBar,
  useToast, relTime,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import {
  APPS, CATEGORIES, catById, appById, PRICING_LABEL,
  featuredApps, appsInCategory, categoryCounts, searchApps, sortApps,
  installedApps, installedCount, totalInstallReach, formatInstalls,
  isInstalled, isEnabled, installApp, uninstallApp, toggleEnabled,
  useInstalls, hasConnectEnv, askRook,
} from '../lib/marketplace-data.js';

/* ---------- brand app tile ---------- */
function AppTile({ app, size = 46, radius = 12 }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: radius, flex: 'none',
      background: app.color, color: app.textColor,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize: size * 0.4, letterSpacing: '.01em',
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.12)',
    }}>{app.mono}</span>
  );
}

/* ---------- rating stars ---------- */
function Stars({ rating = 0, size = 13 }) {
  const full = Math.round(rating);
  return (
    <span className="row" style={{ gap: 1, lineHeight: 0 }} aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24"
          fill={i <= full ? '#f5a623' : 'var(--n-200)'} stroke="none" aria-hidden="true">
          <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.6 5.9 20.4l1.4-6.8L2.2 9l6.9-.7L12 2z" />
        </svg>
      ))}
    </span>
  );
}

function CatBadge({ catId }) {
  const c = catById(catId);
  return (
    <Badge style={{ background: 'transparent', border: '1px solid var(--line-strong)', color: 'var(--ink-2)' }}>
      <span className="dot" style={{ background: c.color }} />
      {c.label}
    </Badge>
  );
}

function InstallPill({ app, onToast }) {
  useInstalls();
  const installed = isInstalled(app.id);
  const doInstall = (e) => {
    e.stopPropagation();
    if (installed) return;
    const r = installApp(app.id);
    onToast?.(r.ok ? `${app.name} connected` : (r.message || 'Could not install'), r.ok ? 'ok' : 'risk');
  };
  if (installed) {
    return (
      <span className="badge badge-ok" style={{ padding: '.32rem .7rem' }}>
        <Icon name="check" size={13} /> Connected
      </span>
    );
  }
  return (
    <Button size="sm" variant="ghost" onClick={doInstall}>
      <Icon name="plus" size={14} /> Install
    </Button>
  );
}

/* ============================================================
   APP CARD (grid)
   ============================================================ */
function AppCard({ app, onOpen, onToast }) {
  useInstalls();
  const installed = isInstalled(app.id);
  return (
    <Card hover className="col gap-2" onClick={() => onOpen(app)}
      style={{ cursor: 'pointer', position: 'relative' }}>
      {app.native && (
        <span style={{ position: 'absolute', top: 12, right: 12 }} className="badge badge-accent">Rally native</span>
      )}
      <div className="row gap-2" style={{ alignItems: 'flex-start' }}>
        <AppTile app={app} />
        <div className="col" style={{ minWidth: 0, gap: 2 }}>
          <div className="row gap-1" style={{ alignItems: 'center' }}>
            <span className="fw-7 clip" style={{ fontSize: '1.05rem' }}>{app.name}</span>
            {app.verified && <Icon name="shield" size={14} style={{ color: 'var(--accent-600)', flex: 'none' }} />}
          </div>
          <span className="t-xs muted clip">by {app.dev}</span>
        </div>
      </div>
      <div className="t-sm" style={{ color: 'var(--ink-2)', minHeight: 42 }}>{app.blurb}</div>
      <div className="row between" style={{ marginTop: 2 }}>
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <Stars rating={app.rating} />
          <span className="t-xs muted tnum">{app.rating.toFixed(1)}</span>
          <span className="t-xs muted">|</span>
          <span className="t-xs muted tnum">{formatInstalls(app.installs)} installs</span>
        </div>
      </div>
      <div className="row between" style={{ borderTop: '1px solid var(--line)', paddingTop: '.7rem' }}>
        <span className="t-xs fw-6" style={{ color: 'var(--n-600)' }}>{app.priceLabel}</span>
        <InstallPill app={app} onToast={onToast} />
      </div>
    </Card>
  );
}

/* ============================================================
   FEATURED CARD (larger)
   ============================================================ */
function FeaturedCard({ app, onOpen, onToast }) {
  useInstalls();
  return (
    <Card hover className="col gap-2" onClick={() => onOpen(app)}
      style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -40, right: -40, width: 150, height: 150, borderRadius: '50%', background: app.color, opacity: .12, filter: 'blur(10px)' }} />
      <div className="row gap-2" style={{ alignItems: 'center', position: 'relative' }}>
        <AppTile app={app} size={54} radius={14} />
        <div className="col" style={{ minWidth: 0, gap: 2 }}>
          <span className="fw-8 clip" style={{ fontSize: '1.15rem' }}>{app.name}</span>
          <div className="row gap-1" style={{ alignItems: 'center' }}>
            <Stars rating={app.rating} size={12} />
            <span className="t-xs muted tnum">{app.rating.toFixed(1)}</span>
          </div>
        </div>
      </div>
      <div className="t-sm" style={{ color: 'var(--ink-2)', position: 'relative' }}>{app.blurb}</div>
      <div className="row between" style={{ position: 'relative', marginTop: 'auto' }}>
        <CatBadge catId={app.cat} />
        <InstallPill app={app} onToast={onToast} />
      </div>
    </Card>
  );
}

/* ============================================================
   APP DETAIL MODAL
   ============================================================ */
function AppDetail({ app, onClose, onToast }) {
  useInstalls();
  if (!app) return null;
  const installed = isInstalled(app.id);
  const enabled = isEnabled(app.id);

  const doInstall = () => {
    const r = installApp(app.id);
    onToast?.(r.ok ? `${app.name} connected to Rally` : (r.message || 'Could not install'), r.ok ? 'ok' : 'risk');
  };
  const doUninstall = () => {
    const r = uninstallApp(app.id);
    if (r.error) return onToast?.(r.message, 'warn');
    onToast?.(`${app.name} disconnected`, 'warn');
  };

  const footer = installed ? (
    <>
      {!app.core && <Button variant="danger" onClick={doUninstall}><Icon name="trash" size={15} /> Uninstall</Button>}
      <Button variant="ghost" onClick={() => { askRook(`How should I configure the ${app.name} integration for my team?`); onToast?.('Asked Rook to help configure', 'ok'); }}>
        <Icon name="sparkles" size={15} /> Configure with Rook
      </Button>
    </>
  ) : (
    <>
      <Button variant="ghost" onClick={onClose}>Close</Button>
      <Button variant="accent" onClick={doInstall}><Icon name="plug" size={15} /> Install {app.name}</Button>
    </>
  );

  return (
    <Modal open={!!app} onClose={onClose} title="App details" width={720} footer={footer}>
      <div className="col gap-3">
        {/* header */}
        <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
          <AppTile app={app} size={64} radius={16} />
          <div className="col gap-1" style={{ minWidth: 0, flex: 1 }}>
            <div className="row gap-2" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0 }}>{app.name}</h3>
              {app.verified && <Badge tone="accent"><Icon name="shield" size={12} /> Verified</Badge>}
              {app.native && <Badge tone="accent">Rally native</Badge>}
              {installed && <span className="badge badge-ok"><Icon name="check" size={12} /> {enabled ? 'Connected' : 'Paused'}</span>}
            </div>
            <div className="row gap-2" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="t-sm muted">by {app.dev}</span>
              <span className="t-xs muted">|</span>
              <CatBadge catId={app.cat} />
            </div>
          </div>
        </div>

        {/* stat strip */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '.75rem' }}>
          <div className="panel card-pad col gap-1" style={{ padding: '.85rem 1rem' }}>
            <div className="row gap-1" style={{ alignItems: 'center' }}><Stars rating={app.rating} size={12} /></div>
            <div className="fw-8" style={{ fontSize: '1.3rem' }}>{app.rating.toFixed(1)}</div>
            <div className="t-xs muted">{app.reviews.toLocaleString()} reviews</div>
          </div>
          <div className="panel card-pad col gap-1" style={{ padding: '.85rem 1rem' }}>
            <div className="stat-label">Installs</div>
            <div className="fw-8" style={{ fontSize: '1.3rem' }}>{formatInstalls(app.installs)}</div>
            <div className="t-xs muted">across all orgs</div>
          </div>
          <div className="panel card-pad col gap-1" style={{ padding: '.85rem 1rem' }}>
            <div className="stat-label">Pricing</div>
            <div className="fw-7" style={{ fontSize: '1.02rem', marginTop: 2 }}>{app.priceLabel}</div>
          </div>
          <div className="panel card-pad col gap-1" style={{ padding: '.85rem 1rem', justifyContent: 'space-between' }}>
            <div className="stat-label">Install trend</div>
            <Sparkline data={app.spark} color={app.color} w={110} h={34} />
          </div>
        </div>

        {/* about */}
        <div className="col gap-1">
          <SectionHeader title="About this app" />
          <p style={{ color: 'var(--ink-2)', margin: 0 }}>
            {app.blurb} {app.native
              ? 'Built by the Rally team, it is deeply wired into your data model and the Rook operator - no setup, no data leaves your workspace.'
              : `The ${app.name} integration keeps your systems in lockstep so reps never re-enter data. Rook watches the connection and surfaces anything that needs attention.`}
          </p>
        </div>

        {/* screenshots (placeholders) */}
        <div className="col gap-1">
          <SectionHeader title="Preview" />
          <div className="row gap-2" style={{ overflowX: 'auto', paddingBottom: 4 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                flex: 'none', width: 220, height: 132, borderRadius: 'var(--r-md)',
                border: '1px solid var(--line)',
                background: `linear-gradient(135deg, ${app.color}22, var(--n-50))`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', overflow: 'hidden',
              }}>
                <AppTile app={app} size={40} />
                <span style={{ position: 'absolute', bottom: 8, left: 10, fontSize: '.72rem', fontWeight: 700, color: 'var(--n-600)' }}>
                  {['Overview', 'Sync settings', 'Activity'][i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* permissions */}
        <div className="col gap-1">
          <SectionHeader title="Permissions requested" sub="What this app can access once connected." />
          <div className="col gap-1" style={{ marginTop: 4 }}>
            {app.permissions.map((p, i) => (
              <div key={i} className="row gap-2" style={{ alignItems: 'center' }}>
                <span style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--accent-50)', color: 'var(--accent-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                  <Icon name="lock" size={12} />
                </span>
                <span className="t-sm">{p}</span>
              </div>
            ))}
          </div>
        </div>

        {installed && !app.core && (
          <div className="panel card-pad row between" style={{ padding: '.85rem 1.1rem' }}>
            <div className="col" style={{ gap: 2 }}>
              <span className="fw-6">Connection</span>
              <span className="t-xs muted">Connected {relTime(isInstalled(app.id) && installedApps().find(a => a.id === app.id)?.installedAt)}</span>
            </div>
            <button className={`switch ${enabled ? 'on' : ''}`} aria-label="Toggle connection"
              onClick={() => { const r = toggleEnabled(app.id); onToast?.(r.enabled ? 'Connection resumed' : 'Connection paused', r.enabled ? 'ok' : 'warn'); }} />
          </div>
        )}

        {!hasConnectEnv() && !app.native && (
          <div className="t-xs muted row gap-1" style={{ alignItems: 'center' }}>
            <Icon name="eye" size={13} /> Demo install. Live OAuth connects when VITE_MARKETPLACE_CONNECT is configured.
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ============================================================
   INSTALLED MANAGER
   ============================================================ */
function InstalledView({ onOpen, onToast, onBrowse }) {
  const installs = useInstalls();
  const list = installedApps();
  if (!list.length) {
    return (
      <EmptyState icon="🔌" title="No apps connected yet"
        body="Install your first integration to sync data, automate work and give Rook more to operate on."
        action={<Button variant="accent" onClick={onBrowse}><Icon name="grid" size={15} /> Browse the marketplace</Button>} />
    );
  }
  const activeCount = list.filter(a => a.enabled).length;
  return (
    <div className="col gap-3">
      <div className="row gap-2 wrap">
        <Badge tone="ok"><Icon name="check" size={12} /> {activeCount} active</Badge>
        {list.length - activeCount > 0 && <Badge tone="warn">{list.length - activeCount} paused</Badge>}
      </div>
      <Card pad={false}>
        <div className="col">
          {list.map((app, i) => (
            <div key={app.id} className="row between" style={{ padding: '1rem 1.2rem', borderBottom: i < list.length - 1 ? '1px solid var(--n-50)' : 'none', gap: '1rem' }}>
              <div className="row gap-2" style={{ minWidth: 0, cursor: 'pointer' }} onClick={() => onOpen(app)}>
                <AppTile app={app} size={42} />
                <div className="col" style={{ minWidth: 0, gap: 2 }}>
                  <div className="row gap-1" style={{ alignItems: 'center' }}>
                    <span className="fw-7 clip">{app.name}</span>
                    {app.core && <Badge tone="accent">Core</Badge>}
                  </div>
                  <span className="t-xs muted clip">{catById(app.cat).label} | connected {relTime(app.installedAt)}</span>
                </div>
              </div>
              <div className="row gap-2" style={{ flex: 'none', alignItems: 'center' }}>
                <span className={`badge ${app.enabled ? 'badge-ok' : 'badge-warn'}`}>
                  <span className="dot" style={{ background: app.enabled ? 'var(--ok)' : 'var(--warn)' }} />
                  {app.enabled ? 'Active' : 'Paused'}
                </span>
                {!app.core && (
                  <button className={`switch ${app.enabled ? 'on' : ''}`} aria-label={`Toggle ${app.name}`}
                    onClick={() => { const r = toggleEnabled(app.id); onToast?.(r.enabled ? `${app.name} resumed` : `${app.name} paused`, r.enabled ? 'ok' : 'warn'); }} />
                )}
                <Button size="sm" variant="quiet" onClick={() => onOpen(app)}><Icon name="settings" size={15} /></Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   DISCOVER
   ============================================================ */
function DiscoverView({ onOpen, onToast }) {
  useInstalls();
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('featured');
  const counts = categoryCounts();
  const featured = useMemo(() => sortApps(featuredApps(), 'installs').slice(0, 4), []);

  const grid = useMemo(() => {
    let list = appsInCategory(cat);
    list = searchApps(list, q);
    list = sortApps(list, sort);
    return list;
  }, [cat, q, sort]);

  return (
    <div className="col gap-4">
      {/* featured */}
      {cat === 'all' && !q && (
        <div className="col gap-2">
          <SectionHeader eyebrow="Editor's picks" title="Featured this week"
            action={<span className="t-xs muted row gap-1" style={{ alignItems: 'center' }}><Icon name="sparkles" size={13} style={{ color: 'var(--accent-600)' }} /> Curated by the Rally team</span>} />
          <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
            {featured.map(app => <FeaturedCard key={app.id} app={app} onOpen={onOpen} onToast={onToast} />)}
          </div>
        </div>
      )}

      {/* category rail + search */}
      <div className="col gap-2">
        <div className="row gap-2 wrap" style={{ alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 380 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }}><Icon name="search" size={16} /></span>
            <input className="input" placeholder="Search 40+ apps and integrations" value={q}
              onChange={e => setQ(e.target.value)} style={{ paddingLeft: 38 }} aria-label="Search apps" />
          </div>
          <div className="spacer" />
          <div className="row gap-1" style={{ alignItems: 'center' }}>
            <span className="t-xs muted desktop-only">Sort</span>
            <Select value={sort} onChange={e => setSort(e.target.value)} style={{ width: 'auto' }}>
              <option value="featured">Featured</option>
              <option value="installs">Most installed</option>
              <option value="rating">Top rated</option>
              <option value="name">Name A-Z</option>
            </Select>
          </div>
        </div>

        <div className="row gap-1 wrap">
          {CATEGORIES.map(c => {
            const on = c.id === cat;
            return (
              <button key={c.id} onClick={() => setCat(c.id)} className="btn btn-sm"
                style={{
                  background: on ? 'var(--accent)' : 'var(--paper)',
                  color: on ? '#fff' : 'var(--ink-2)',
                  border: `1px solid ${on ? 'var(--accent)' : 'var(--line-strong)'}`,
                  fontWeight: on ? 700 : 600,
                }}>
                <Icon name={c.icon} size={14} /> {c.label}
                <span style={{ opacity: .7, fontVariantNumeric: 'tabular-nums' }}>{counts[c.id]}</span>
              </button>
            );
          })}
        </div>
        {cat !== 'all' && <div className="t-sm muted">{catById(cat).blurb}</div>}
      </div>

      {/* grid */}
      {grid.length ? (
        <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(272px, 1fr))' }}>
          {grid.map(app => <AppCard key={app.id} app={app} onOpen={onOpen} onToast={onToast} />)}
        </div>
      ) : (
        <EmptyState icon="🔍" title="No apps match that search"
          body="Try a different keyword or category. Cannot find what you need? Build it yourself."
          action={<Button as={Link} to="/developers" variant="ghost"><Icon name="command" size={15} /> Open developer platform</Button>} />
      )}

      {/* build your own */}
      <Card className="row between wrap" style={{ gap: '1rem', background: 'linear-gradient(120deg, var(--accent-50), var(--paper))' }}>
        <div className="row gap-3" style={{ alignItems: 'center', minWidth: 0 }}>
          <span style={{ width: 52, height: 52, borderRadius: 14, flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }} className="grad-accent">
            <Icon name="command" size={24} />
          </span>
          <div className="col" style={{ gap: 3, minWidth: 0 }}>
            <span className="fw-8" style={{ fontSize: '1.15rem' }}>Build your own app</span>
            <span className="t-sm muted">Public REST API, webhooks and OAuth. Ship an integration to the whole Rally ecosystem.</span>
          </div>
        </div>
        <div className="row gap-2" style={{ flex: 'none' }}>
          <Button variant="ghost" onClick={() => askRook('Help me scope a custom Rally marketplace app for my workflow.')}>
            <Icon name="sparkles" size={15} /> Ask Rook
          </Button>
          <Button as={Link} to="/developers" variant="accent"><Icon name="arrowRight" size={15} /> Developer platform</Button>
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   PAGE
   ============================================================ */
export default function Marketplace() {
  const toast = useToast();
  const installs = useInstalls();
  const [tab, setTab] = useState('discover');
  const [detail, setDetail] = useState(null);

  const nInstalled = installedCount();
  const reach = totalInstallReach();

  return (
    <div className="page-in col gap-4">
      <PageTitle
        eyebrow="Ecosystem"
        title={<>App <GradientText>Marketplace</GradientText></>}
        sub="One-click integrations that make Rally extensible, sticky and impossible to rip out. An ecosystem is a moat."
        action={
          <div className="row gap-2">
            <Button variant="ghost" onClick={() => askRook('Which marketplace apps should I install for a B2B sales team on Rally?')}>
              <Icon name="sparkles" size={15} /> Ask Rook to recommend
            </Button>
            <Button variant="accent" onClick={() => setTab('discover')}><Icon name="grid" size={15} /> Browse apps</Button>
          </div>
        }
      />

      {/* KPI strip */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <Card className="col gap-1">
          <div className="stat-label">Apps available</div>
          <div className="stat-value" style={{ fontSize: 'clamp(2rem,3vw,2.6rem)' }}>{APPS.length}</div>
          <div className="t-xs muted">across {CATEGORIES.length - 1} categories</div>
        </Card>
        <Card className="col gap-1">
          <div className="stat-label">Connected</div>
          <div className="stat-value" style={{ fontSize: 'clamp(2rem,3vw,2.6rem)', color: 'var(--accent-600)' }}>{nInstalled}</div>
          <div className="t-xs muted">active in your workspace</div>
        </Card>
        <Card className="col gap-1">
          <div className="stat-label">Ecosystem reach</div>
          <div className="stat-value" style={{ fontSize: 'clamp(2rem,3vw,2.6rem)' }}>{formatInstalls(reach)}</div>
          <div className="t-xs muted">installs across all orgs</div>
        </Card>
        <Card className="col gap-1" style={{ justifyContent: 'space-between' }}>
          <div className="stat-label">Coverage</div>
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <Ring value={Math.round((nInstalled / APPS.length) * 100)} size={54} stroke={7} label={<span style={{ fontSize: 13, fontWeight: 800 }}>{Math.round((nInstalled / APPS.length) * 100)}%</span>} />
            <span className="t-xs muted">of the catalog connected</span>
          </div>
        </Card>
      </div>

      <div className="row between wrap" style={{ gap: '1rem', alignItems: 'center' }}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'discover', label: 'Discover' },
            { value: 'installed', label: `Installed (${nInstalled})` },
          ]}
        />
        <Button as={Link} to="/integrations" variant="quiet" size="sm">
          <Icon name="plug" size={14} /> Classic integrations
        </Button>
      </div>

      {tab === 'discover'
        ? <DiscoverView onOpen={setDetail} onToast={toast} />
        : <InstalledView onOpen={setDetail} onToast={toast} onBrowse={() => setTab('discover')} />}

      <AppDetail app={detail} onClose={() => setDetail(null)} onToast={toast} />
    </div>
  );
}
