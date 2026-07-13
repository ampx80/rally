// App Manager - the module control panel.
//
// Turn any part of Rally on or off from one screen. Salesforce and NetSuite
// gate packaging behind a sales rep; Rally lets an admin compose their exact
// product here - lean team or full enterprise - and the left nav updates live.
//
// Reads the module registry from src/lib/modules.js (never edits it) and the
// preset packages from src/lib/module-bundles.js. All state persists through
// setModule, so toggles survive reload and the nav re-renders instantly.
import React, { useMemo, useState } from 'react';
import { MODULES, isModuleOn, setModule, useModules } from '../lib/modules.js';
import { BUNDLES, applyBundle, matchedBundleId, bundleDrift, bundleById } from '../lib/module-bundles.js';
import {
  PageTitle, SectionHeader, Card, Button, Badge, Modal, Ring,
  Sparkline, ProgressBar, useToast,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';

/* ---------- deterministic seed (mulberry32) ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
// Stable per-module usage telemetry so every card feels alive with zero backend.
function moduleTelemetry(key) {
  const rnd = mulberry32(hashStr(key) ^ 0x9e3779b9);
  const adoption = Math.round(28 + rnd() * 70);
  const records = Math.round(6 + rnd() * 1800);
  const trend = Math.round((rnd() - 0.4) * 42);
  const spark = Array.from({ length: 10 }, () => Math.round(20 + rnd() * 80));
  return { adoption, records, trend, spark };
}

/* ---------- section metadata (order + look) ---------- */
const SECTION_ORDER = ['Sell', 'Marketing', 'Deliver', 'Service', 'Revenue', 'Intelligence', 'Automate', 'Admin', 'Data', 'Files'];
const SECTION_META = {
  Sell:         { icon: 'target',    accent: 'var(--accent)',        blurb: 'Pipeline, forecasting, and everything that closes revenue.' },
  Marketing:    { icon: 'megaphone', accent: 'var(--accent-purple)', blurb: 'Demand gen, campaigns, forms, and attribution.' },
  Deliver:      { icon: 'checkSquare', accent: 'var(--accent-teal)', blurb: 'Post-sale onboarding, projects, and customer success.' },
  Service:      { icon: 'lifebuoy',  accent: 'var(--info)',          blurb: 'Support, conversations, and the self-serve knowledge base.' },
  Revenue:      { icon: 'dollar',    accent: 'var(--ok)',            blurb: 'Catalog, CPQ, e-sign, billing, and payments.' },
  Intelligence: { icon: 'sparkles',  accent: 'var(--accent)',        blurb: 'Dashboards, reports, and the predictive revenue lab.' },
  Automate:     { icon: 'zap',       accent: 'var(--warn)',          blurb: 'Workflows, autopilot, and after-hours automation.' },
  Admin:        { icon: 'settings',  accent: 'var(--n-600)',         blurb: 'Workspaces, permissions, developers, and governance.' },
  Data:         { icon: 'swap',      accent: 'var(--info)',          blurb: 'Sync, import, custom objects, and de-duplication.' },
  Files:        { icon: 'fileText',  accent: 'var(--n-600)',         blurb: 'Document studio and generated collateral.' },
};

// Per-module glyph. Covers the shipped registry and the full expanded set the
// integrator will add; anything unmapped falls back to its section icon.
const ICON_MAP = {
  leads: 'funnel', forecasting: 'trendUp', goals: 'rocket', territories: 'grid',
  scheduler: 'clock', playbooks: 'book', warroom: 'command',
  campaigns: 'megaphone', sequences: 'layers', automations: 'send', forms: 'list',
  landingPages: 'grid', lists: 'filter', reviews: 'star', social: 'share2',
  funnels: 'funnel', ads: 'globe',
  projects: 'checkSquare', success: 'shield', scheduling: 'calendar', tickets: 'mail',
  service: 'lifebuoy', kb: 'book', academy: 'rocket', surveys: 'gauge',
  products: 'box', quotes: 'receipt', signatures: 'edit', invoices: 'dollar',
  payments: 'creditCard', affiliates: 'share2', studio: 'fileText', film: 'eye',
  dashboards: 'chart', reports: 'pie', intelligence: 'sparkles', fork: 'gitBranch',
  windTunnel: 'bolt', ghostDeals: 'rotateCcw', attribution: 'key', twin: 'twin', signals: 'signal',
  flow: 'flowNode', autopilot: 'zap', workflows: 'workflow', nightShift: 'moon', sms: 'phone',
  inbox: 'inbox', conversations: 'messages', voice: 'mic', canvas: 'sliders', queue: 'check', genesis: 'sparkles',
  workspaces: 'building2', marketplace: 'store', integrations: 'plug', datasync: 'swap',
  sandboxes: 'beaker', import: 'download', team: 'user', permissions: 'lock',
  objects: 'menu', duplicates: 'merge', developers: 'command', billingPlans: 'zap', audit: 'history',
};
function iconFor(m) { return ICON_MAP[m.key] || SECTION_META[m.section]?.icon || 'grid'; }

// The always-on CRM spine. Not toggleable modules - shown as locked so the
// admin sees the full picture of what Rally can never turn off.
const CORE_SPINE = [
  { label: 'Command center', icon: 'home',     desc: 'Your revenue home base and daily briefing.' },
  { label: 'Deals',          icon: 'target',   desc: 'The pipeline every other module hangs off of.' },
  { label: 'Contacts',       icon: 'users',    desc: 'People of record across the whole platform.' },
  { label: 'Companies',      icon: 'building', desc: 'Accounts of record and their relationships.' },
  { label: 'My day',         icon: 'activity', desc: 'Tasks, calls, and meetings for the current rep.' },
  { label: 'Settings',       icon: 'settings', desc: 'Workspace profile, theme, and preferences.' },
];

// Dependencies between toggleable modules. Turning a module ON pulls its
// prerequisites on with it; turning one OFF warns about what still needs it.
// Only references keys that are themselves toggleable (spine deps are implicit).
const DEPENDS = {
  quotes: ['products'],
  invoices: ['products'],
  payments: ['invoices'],
  signatures: ['quotes'],
  attribution: ['campaigns'],
  funnels: ['landingPages'],
  sequences: ['campaigns'],
  ads: ['campaigns'],
  affiliates: ['payments'],
  autopilot: ['sequences'],
};
function dependentsOf(key) {
  return Object.keys(DEPENDS).filter(k => DEPENDS[k].includes(key));
}
function labelFor(key) { return MODULES.find(m => m.key === key)?.label || key; }

/* ---------- toggle switch ---------- */
function Switch({ on, disabled, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); if (!disabled) onChange(!on); }}
      style={{
        width: 46, height: 27, flex: 'none', borderRadius: 999, border: 'none',
        padding: 3, cursor: disabled ? 'not-allowed' : 'pointer',
        background: on ? 'var(--accent)' : 'var(--n-200)',
        opacity: disabled ? 0.55 : 1,
        transition: 'background .18s var(--ease)', position: 'relative',
      }}>
      <span style={{
        display: 'block', width: 21, height: 21, borderRadius: '50%', background: '#fff',
        boxShadow: 'var(--shadow-sm)', transform: on ? 'translateX(19px)' : 'translateX(0)',
        transition: 'transform .18s var(--ease)',
      }} />
    </button>
  );
}

/* ---------- module card ---------- */
function ModuleCard({ m, on, onToggle, onOpen }) {
  const tele = useMemo(() => moduleTelemetry(m.key), [m.key]);
  const accent = SECTION_META[m.section]?.accent || 'var(--accent)';
  return (
    <div
      role="button" tabIndex={0}
      onClick={() => onOpen(m)}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(m); }}
      className="card card-pad"
      style={{
        cursor: 'pointer', position: 'relative', overflow: 'hidden',
        opacity: on ? 1 : 0.72, transition: 'opacity .18s, box-shadow .18s, transform .18s',
        borderColor: on ? 'var(--line)' : 'var(--line)',
      }}>
      <span style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 3, background: on ? accent : 'transparent', transition: 'background .2s' }} />
      <div className="row between" style={{ alignItems: 'flex-start', gap: '.75rem' }}>
        <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
          <span className="row center" style={{ width: 38, height: 38, flex: 'none', borderRadius: 10, background: on ? 'var(--accent-50)' : 'var(--n-50)', color: on ? accent : 'var(--n-400)' }}>
            <Icon name={iconFor(m)} size={20} />
          </span>
          <div className="col" style={{ minWidth: 0, lineHeight: 1.2 }}>
            <span className="fw-6 clip" style={{ fontSize: '1.02rem' }}>{m.label}</span>
            <span className="t-xs" style={{ color: 'var(--n-400)', fontWeight: 600, letterSpacing: '.02em' }}>{m.route}</span>
          </div>
        </div>
        <Switch on={on} label={`Toggle ${m.label}`} onChange={(v) => onToggle(m, v)} />
      </div>
      <p className="t-sm muted" style={{ margin: '.7rem 0 0', minHeight: 40, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {m.desc}
      </p>
      <div className="row between" style={{ marginTop: '.7rem', alignItems: 'center' }}>
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <Badge tone={on ? 'ok' : 'default'} className="t-xs">{on ? 'On' : 'Off'}</Badge>
          <span className="t-xs muted tnum">{tele.adoption}% adopted</span>
        </div>
        <span style={{ opacity: on ? 1 : 0.4 }}>
          <Sparkline data={tele.spark} w={78} h={26} color={accent} />
        </span>
      </div>
    </div>
  );
}

/* ---------- bundle card ---------- */
function BundleCard({ bundle, active, drift, onApply }) {
  const count = bundle.enable === 'all' ? MODULES.length : MODULES.filter(m => bundle.enable.includes(m.key)).length;
  return (
    <div className="card card-pad" style={{
      position: 'relative', overflow: 'hidden',
      border: active ? `2px solid ${bundle.accent}` : '1px solid var(--line)',
      boxShadow: active ? 'var(--shadow-md)' : 'var(--shadow-sm)',
    }}>
      <div style={{ position: 'absolute', top: -34, right: -34, width: 120, height: 120, borderRadius: '50%', background: bundle.accent, opacity: 0.09, filter: 'blur(6px)' }} />
      <div className="row between" style={{ alignItems: 'flex-start', position: 'relative' }}>
        <span className="row center" style={{ width: 40, height: 40, borderRadius: 11, background: bundle.accent, color: '#fff', flex: 'none' }}>
          <Icon name={bundle.icon} size={21} />
        </span>
        {active
          ? <Badge tone="accent" className="t-xs">Active plan</Badge>
          : <span className="t-xs muted">{drift} change{drift === 1 ? '' : 's'} away</span>}
      </div>
      <div className="col gap-1" style={{ marginTop: '.7rem' }}>
        <div className="row gap-2" style={{ alignItems: 'baseline' }}>
          <span style={{ fontWeight: 800, fontSize: '1.28rem', letterSpacing: '-.02em' }}>{bundle.name}</span>
          <span className="eyebrow">{bundle.tagline}</span>
        </div>
        <p className="t-sm muted" style={{ margin: '.15rem 0 0', minHeight: 60 }}>{bundle.desc}</p>
      </div>
      <div className="row between" style={{ marginTop: '.65rem', alignItems: 'center' }}>
        <span className="t-sm fw-6 tnum">{count} module{count === 1 ? '' : 's'} on</span>
        <Button size="sm" variant={active ? 'ghost' : 'primary'} onClick={() => onApply(bundle)} disabled={active}>
          {active ? 'Applied' : 'Apply'}
        </Button>
      </div>
    </div>
  );
}

/* ---------- detail modal ---------- */
function DetailModal({ m, snap, onClose, onToggle, onJump }) {
  if (!m) return null;
  const on = snap[m.key] !== false;
  const tele = moduleTelemetry(m.key);
  const accent = SECTION_META[m.section]?.accent || 'var(--accent)';
  const needs = (DEPENDS[m.key] || []).filter(k => MODULES.some(x => x.key === k));
  const neededBy = dependentsOf(m.key).filter(k => MODULES.some(x => x.key === k));
  const askRook = () => {
    window.dispatchEvent(new CustomEvent('rally:rook', { detail: { prompt: `Should a revenue team keep the ${m.label} module turned on? Explain what it does, who uses it, and what breaks if it is off.` } }));
    onClose();
  };
  return (
    <Modal open={!!m} onClose={onClose} title={m.label} width={560}
      footer={
        <>
          <Button variant="ghost" onClick={askRook}><Icon name="sparkles" size={16} /> Ask Rook</Button>
          <Button variant={on ? 'danger' : 'primary'} onClick={() => { onToggle(m, !on); }}>
            {on ? 'Turn off' : 'Turn on'}
          </Button>
        </>
      }>
      <div className="col gap-3">
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <span className="row center" style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-50)', color: accent, flex: 'none' }}>
            <Icon name={iconFor(m)} size={23} />
          </span>
          <div className="col" style={{ minWidth: 0 }}>
            <div className="row gap-2" style={{ alignItems: 'center' }}>
              <Badge tone={on ? 'ok' : 'default'}>{on ? 'Enabled' : 'Disabled'}</Badge>
              <Badge tone="info" className="t-xs">{m.section}</Badge>
            </div>
            <span className="t-xs muted" style={{ marginTop: 2 }}>Route {m.route}</span>
          </div>
        </div>

        <p style={{ margin: 0 }}>{m.desc}</p>

        <Card pad className="col gap-2" style={{ background: 'var(--n-25)' }}>
          <div className="row between" style={{ alignItems: 'center' }}>
            <span className="t-sm fw-6">Adoption across your team</span>
            <span className="tnum fw-7" style={{ color: accent }}>{tele.adoption}%</span>
          </div>
          <ProgressBar value={tele.adoption} color={accent} />
          <div className="row between t-xs muted">
            <span className="tnum">{tele.records.toLocaleString()} records</span>
            <span className="row gap-1" style={{ alignItems: 'center' }}><Sparkline data={tele.spark} w={90} h={22} color={accent} /></span>
          </div>
        </Card>

        <div className="col gap-1">
          <span className="eyebrow">When turned off</span>
          <p className="t-sm muted" style={{ margin: 0 }}>
            The <span className="fw-6">{m.label}</span> item disappears from the left nav and <span className="mono">{m.route}</span> redirects home. Your data is untouched and returns the moment you switch it back on.
          </p>
        </div>

        {needs.length > 0 && (
          <div className="col gap-1">
            <span className="eyebrow">Requires</span>
            <div className="row gap-1 wrap">
              {needs.map(k => (
                <button key={k} className="badge" onClick={() => onJump(k)} style={{ cursor: 'pointer', gap: 5 }}>
                  <span className="dot" style={{ background: snap[k] !== false ? 'var(--ok)' : 'var(--n-400)' }} />{labelFor(k)}
                </button>
              ))}
            </div>
            <span className="t-xs muted">Turning {m.label} on enables these automatically.</span>
          </div>
        )}

        {neededBy.length > 0 && (
          <div className="col gap-1">
            <span className="eyebrow">Depended on by</span>
            <div className="row gap-1 wrap">
              {neededBy.map(k => (
                <button key={k} className="badge" onClick={() => onJump(k)} style={{ cursor: 'pointer', gap: 5 }}>
                  <span className="dot" style={{ background: snap[k] !== false ? 'var(--ok)' : 'var(--n-400)' }} />{labelFor(k)}
                </button>
              ))}
            </div>
            <span className="t-xs muted">These modules lean on {m.label}; turning it off may limit them.</span>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ---------- page ---------- */
export default function AppManager() {
  const snap = useModules();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // all | on | off
  const [detail, setDetail] = useState(null);

  const isOn = (key) => snap[key] !== false;
  const total = MODULES.length;
  const enabled = MODULES.filter(m => isOn(m.key)).length;
  const sectionsLit = new Set(MODULES.filter(m => isOn(m.key)).map(m => m.section)).size;
  const activeBundle = matchedBundleId(snap);

  // Group modules by section, preserving the canonical section order and
  // appending any unexpected sections at the end so nothing is ever hidden.
  const grouped = useMemo(() => {
    const known = SECTION_ORDER.filter(s => MODULES.some(m => m.section === s));
    const extra = [...new Set(MODULES.map(m => m.section))].filter(s => !SECTION_ORDER.includes(s));
    const order = [...known, ...extra];
    const q = query.trim().toLowerCase();
    const out = [];
    order.forEach(section => {
      let mods = MODULES.filter(m => m.section === section);
      if (sectionFilter !== 'all') mods = mods.filter(() => section === sectionFilter);
      if (statusFilter !== 'all') mods = mods.filter(m => (statusFilter === 'on') === isOn(m.key));
      if (q) mods = mods.filter(m => m.label.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q) || m.route.includes(q));
      if (mods.length) out.push({ section, mods });
    });
    return out;
  }, [query, sectionFilter, statusFilter, snap]);

  const shownCount = grouped.reduce((n, g) => n + g.mods.length, 0);

  // Toggle a single module. Turning ON pulls required deps on; turning OFF just
  // warns about dependents (never silently disables another module).
  const toggle = (m, next) => {
    if (next) {
      setModule(m.key, true);
      const deps = (DEPENDS[m.key] || []).filter(k => MODULES.some(x => x.key === k) && !isOn(k));
      if (deps.length) {
        deps.forEach(k => setModule(k, true));
        toast(`${m.label} on. Also enabled ${deps.map(labelFor).join(', ')}.`);
      } else {
        toast(`${m.label} turned on`);
      }
    } else {
      setModule(m.key, false);
      const dep = dependentsOf(m.key).filter(k => MODULES.some(x => x.key === k) && isOn(k));
      if (dep.length) toast(`${m.label} off. ${dep.map(labelFor).join(', ')} still expect it.`, 'warn');
      else toast(`${m.label} turned off`);
    }
  };

  const setAll = (on) => { MODULES.forEach(m => setModule(m.key, on)); toast(on ? 'All modules enabled' : 'All modules disabled', on ? 'ok' : 'warn'); };
  const reset = () => { MODULES.forEach(m => setModule(m.key, true)); setQuery(''); setSectionFilter('all'); setStatusFilter('all'); toast('Reset to defaults (everything on)'); };

  const doApplyBundle = (bundle) => {
    const r = applyBundle(bundle.id);
    toast(`${bundle.name} applied - ${r.on} on, ${r.off} off`);
  };

  const askRookPlan = () => {
    window.dispatchEvent(new CustomEvent('rally:rook', { detail: { prompt: 'Recommend which Rally modules a 15-person B2B SaaS revenue team should turn on, and which to leave off to stay lean. Group your answer by section.' } }));
  };

  const jump = (key) => { const m = MODULES.find(x => x.key === key); if (m) setDetail(m); };

  const sectionChips = ['all', ...SECTION_ORDER.filter(s => MODULES.some(m => m.section === s))];

  return (
    <div className="fade-up">
      <PageTitle
        eyebrow="Admin / Packaging"
        title="App Manager"
        sub="Compose your exact Rally. Turn any module on or off - the left nav updates live. No sales rep, no re-provisioning."
        action={
          <>
            <Button variant="ghost" size="sm" onClick={askRookPlan}><Icon name="sparkles" size={16} /> Ask Rook</Button>
            <Button variant="ghost" size="sm" onClick={reset}><Icon name="rotateCcw" size={16} /> Reset</Button>
          </>
        }
      />

      {/* headline stats */}
      <div className="row gap-3 wrap" style={{ marginBottom: '1.25rem', alignItems: 'stretch' }}>
        <Card pad className="row gap-3" style={{ alignItems: 'center', flex: '1 1 240px' }}>
          <Ring value={total ? Math.round((enabled / total) * 100) : 0} size={72} stroke={8} label={`${enabled}`} />
          <div className="col gap-1">
            <span className="fw-7" style={{ fontSize: '1.05rem' }}>{enabled} of {total} on</span>
            <span className="t-sm muted">Toggleable modules enabled</span>
          </div>
        </Card>
        <Card pad className="col gap-1" style={{ flex: '1 1 180px', justifyContent: 'center' }}>
          <span className="stat-label">Sections lit</span>
          <span className="stat-value" style={{ fontSize: '2rem' }}>{sectionsLit}</span>
          <span className="t-sm muted">of {new Set(MODULES.map(m => m.section)).size} product areas</span>
        </Card>
        <Card pad className="col gap-1" style={{ flex: '1 1 200px', justifyContent: 'center' }}>
          <span className="stat-label">Current plan</span>
          <span className="row gap-2" style={{ alignItems: 'center' }}>
            <span className="stat-value" style={{ fontSize: '1.7rem' }}>{activeBundle ? bundleById(activeBundle).name : 'Custom'}</span>
            {!activeBundle && <Badge tone="accent" className="t-xs">hand-tuned</Badge>}
          </span>
          <span className="t-sm muted">{activeBundle ? 'Matches a preset package' : 'Composed exactly for your team'}</span>
        </Card>
        <Card pad className="col gap-2" style={{ flex: '1 1 200px', justifyContent: 'center' }}>
          <span className="stat-label">Quick actions</span>
          <div className="row gap-1 wrap">
            <Button size="sm" variant="ghost" onClick={() => setAll(true)}>Enable all</Button>
            <Button size="sm" variant="ghost" onClick={() => setAll(false)}>Disable all</Button>
          </div>
        </Card>
      </div>

      {/* packaging bundles */}
      <SectionHeader eyebrow="Packaging" title="Preset packages" sub="Flip a whole product shape in one click. Every bundle keeps the CRM spine on and adjusts everything else." />
      <div className="grid-auto" style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', marginBottom: '1.75rem' }}>
        {BUNDLES.map(b => (
          <BundleCard key={b.id} bundle={b} active={activeBundle === b.id} drift={bundleDrift(b, snap)} onApply={doApplyBundle} />
        ))}
      </div>

      {/* core spine */}
      <SectionHeader eyebrow="Always on" title="CRM spine"
        sub="The core Rally can never turn off. Everything else composes around it." />
      <div className="grid-auto" style={{ display: 'grid', gap: '.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '1.75rem' }}>
        {CORE_SPINE.map(c => (
          <div key={c.label} className="card card-pad row gap-2" style={{ alignItems: 'center', background: 'var(--n-25)' }}>
            <span className="row center" style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-50)', color: 'var(--accent-600)', flex: 'none' }}>
              <Icon name={c.icon} size={19} />
            </span>
            <div className="col" style={{ minWidth: 0, lineHeight: 1.25 }}>
              <span className="fw-6 clip">{c.label}</span>
              <span className="t-xs muted clip">{c.desc}</span>
            </div>
            <span title="Always on" style={{ marginLeft: 'auto', color: 'var(--n-400)', flex: 'none' }}><Icon name="lock" size={16} /></span>
          </div>
        ))}
      </div>

      {/* controls */}
      <Card pad className="row between wrap" style={{ gap: '.75rem', marginBottom: '1.25rem', position: 'sticky', top: 68, zIndex: 5 }}>
        <div className="row gap-2" style={{ flex: '1 1 260px', minWidth: 0 }}>
          <div className="row gap-2" style={{ flex: 1, background: 'var(--n-50)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '.5rem .7rem', alignItems: 'center', minWidth: 0 }}>
            <Icon name="search" size={17} />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search modules..."
              style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, minWidth: 0 }} />
            {query && <button onClick={() => setQuery('')} className="btn btn-quiet" style={{ padding: '.1rem .3rem' }}><Icon name="x" size={15} /></button>}
          </div>
        </div>
        <div className="row gap-1" style={{ flex: 'none' }}>
          {['all', 'on', 'off'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className="btn btn-sm"
              style={{ textTransform: 'capitalize', background: statusFilter === s ? 'var(--accent)' : 'var(--n-50)', color: statusFilter === s ? '#fff' : 'var(--n-600)', border: '1px solid var(--line)' }}>
              {s === 'all' ? 'All' : s === 'on' ? 'On' : 'Off'}
            </button>
          ))}
        </div>
      </Card>

      {/* section filter chips */}
      <div className="row gap-1 wrap" style={{ marginBottom: '1.1rem' }}>
        {sectionChips.map(s => (
          <button key={s} onClick={() => setSectionFilter(s)} className="btn btn-sm"
            style={{ background: sectionFilter === s ? 'var(--ink)' : 'transparent', color: sectionFilter === s ? '#fff' : 'var(--n-600)', border: '1px solid var(--line)' }}>
            {s === 'all' ? 'All sections' : s}
          </button>
        ))}
      </div>

      {/* module grid by section */}
      {shownCount === 0 ? (
        <Card pad className="col center gap-2" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
          <Icon name="search" size={28} />
          <h4 style={{ margin: 0 }}>No modules match</h4>
          <p className="muted" style={{ maxWidth: 380, margin: 0 }}>Try a different search, or clear the filters to see the full catalog.</p>
          <Button variant="ghost" size="sm" onClick={() => { setQuery(''); setSectionFilter('all'); setStatusFilter('all'); }}>Clear filters</Button>
        </Card>
      ) : grouped.map(({ section, mods }) => {
        const meta = SECTION_META[section] || {};
        const onHere = mods.filter(m => isOn(m.key)).length;
        return (
          <div key={section} style={{ marginBottom: '1.75rem' }}>
            <div className="row between" style={{ marginBottom: '.85rem', alignItems: 'center' }}>
              <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
                <span className="row center" style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--n-50)', color: meta.accent || 'var(--accent)', flex: 'none' }}>
                  <Icon name={meta.icon || 'grid'} size={17} />
                </span>
                <div className="col" style={{ minWidth: 0, lineHeight: 1.2 }}>
                  <span className="fw-7" style={{ fontSize: '1.08rem' }}>{section}</span>
                  <span className="t-xs muted clip">{meta.blurb}</span>
                </div>
              </div>
              <Badge tone="default" className="t-xs" style={{ flex: 'none' }}>{onHere}/{mods.length} on</Badge>
            </div>
            <div className="grid-auto" style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(268px, 1fr))' }}>
              {mods.map(m => (
                <ModuleCard key={m.key} m={m} on={isOn(m.key)} onToggle={toggle} onOpen={setDetail} />
              ))}
            </div>
          </div>
        );
      })}

      <DetailModal m={detail} snap={snap} onClose={() => setDetail(null)} onToggle={toggle} onJump={jump} />
    </div>
  );
}
