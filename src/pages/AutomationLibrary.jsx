// AutomationLibrary - route /workflows/library. A browsable marketplace
// of ready-to-run automations. Search + filter by category, preview each
// flow (Trigger -> Conditions -> Actions), and one-click Install to write
// a REAL, live automation through the engine (automations.js). Installed
// templates show a confirmed state and deep-link into the builder.
//
// Additive: this page only reads the engine's live rule list (to know what
// is already installed) and calls a template's install(), which uses the
// engine's own writer. Accent #5b4bf5. ASCII hyphen only, no long dashes.
import React, { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  SectionHeader, StatCard, Button, Card, Input, EmptyState, useToast,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import { useAutomations } from '../lib/automations.js';
import {
  TEMPLATES, CATEGORIES, installedTemplateIds,
} from '../lib/automation-templates.js';
import TemplateCard from '../components/autotpl/TemplateCard.jsx';
import '../components/autotpl/autotpl.css';

export default function AutomationLibrary() {
  // Subscribe to the engine so install() flips cards to "installed" live.
  useAutomations();
  const nav = useNavigate();
  const toast = useToast();

  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');

  const installed = installedTemplateIds();

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return TEMPLATES.filter((t) => {
      if (cat !== 'all' && t.category !== cat) return false;
      if (!needle) return true;
      return (t.name + ' ' + t.description).toLowerCase().includes(needle);
    });
  }, [cat, q]);

  const countFor = (id) => TEMPLATES.filter(t => t.category === id).length;
  const installedInView = shown.filter(t => installed.has(t.id)).length;

  const onInstall = (tpl) => {
    tpl.install();
    toast(`Installed "${tpl.name}" - it is live now`, 'ok');
  };
  const openBuilder = () => nav('/workflows');

  return (
    <div className="col gap-3 page-in">
      <SectionHeader
        eyebrow="Automation library"
        title="Install a proven workflow in one click"
        sub="Browse ready-to-run automations, preview exactly what each one does, and install it live. Every template runs on your real pipeline the moment it is on."
        action={
          <Button variant="ghost" onClick={openBuilder}>
            <Icon name="workflow" size={16} /> Open builder
          </Button>
        }
      />

      {/* KPI strip */}
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
        <StatCard label="Templates" value={TEMPLATES.length} icon={<Icon name="layers" size={18} />}
          sub="curated, ready to run" />
        <StatCard label="Categories" value={CATEGORIES.length} icon={<Icon name="grid" size={18} />}
          accent="var(--info)" sparkColor="var(--info)" sub="from lead response to data quality" />
        <StatCard label="Installed" value={installed.size} icon={<Icon name="check" size={18} />}
          accent="var(--ok)" sparkColor="var(--ok)" sub="live in your library" />
        <StatCard label="One click" value={1} icon={<Icon name="zap" size={18} />}
          accent="var(--accent)" sparkColor="var(--accent)" sub="from template to live rule" />
      </div>

      {/* Search + category filter */}
      <Card className="col gap-3">
        <div className="atpl-searchrow">
          <div className="atpl-search">
            <span className="atpl-search-ico"><Icon name="search" size={16} /></span>
            <Input placeholder="Search templates by name or what they do" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Link to="/workflows" className="btn btn-ghost btn-sm">
            <Icon name="plus" size={14} /> Build from scratch
          </Link>
        </div>
        <div className="atpl-cats">
          <button className={`atpl-cat${cat === 'all' ? ' is-on' : ''}`} onClick={() => setCat('all')}>
            <Icon name="grid" size={14} /> All
            <span className="atpl-count">{TEMPLATES.length}</span>
          </button>
          {CATEGORIES.map((c) => (
            <button key={c.id} className={`atpl-cat${cat === c.id ? ' is-on' : ''}`} onClick={() => setCat(c.id)}>
              <Icon name={c.icon} size={14} /> {c.name}
              <span className="atpl-count">{countFor(c.id)}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Result meta */}
      <div className="row between wrap" style={{ gap: '.5rem', padding: '0 .15rem' }}>
        <div className="t-sm muted">
          Showing {shown.length} template{shown.length === 1 ? '' : 's'}
          {cat !== 'all' && <> in <span className="fw-6" style={{ color: 'var(--ink)' }}>{CATEGORIES.find(c => c.id === cat)?.name}</span></>}
          {installedInView > 0 && <> - {installedInView} installed</>}
        </div>
        {(q || cat !== 'all') && (
          <button className="btn btn-quiet t-xs" style={{ color: 'var(--n-600)' }} onClick={() => { setQ(''); setCat('all'); }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Grid */}
      {shown.length === 0 ? (
        <Card>
          <EmptyState icon="🔍" title="No templates match"
            body="Try a different search or category, or build an automation from scratch."
            action={<Button variant="accent" onClick={openBuilder}><Icon name="plus" size={16} /> Build from scratch</Button>} />
        </Card>
      ) : (
        <div className="atpl-grid stagger">
          {shown.map((tpl) => (
            <TemplateCard
              key={tpl.id}
              tpl={tpl}
              installed={installed.has(tpl.id)}
              onInstall={() => onInstall(tpl)}
              onOpenBuilder={openBuilder}
            />
          ))}
        </div>
      )}
    </div>
  );
}
