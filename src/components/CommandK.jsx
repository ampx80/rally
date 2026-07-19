// Global search palette (Cmd+K / Ctrl+K). Searches contacts, companies,
// and deals off the live store and jumps to any record. Also carries a few
// quick "go to" nav commands.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, typeIcon } from './icons.jsx';
import { Avatar, moneyK } from './UI.jsx';
import { getContacts, getCompanies, getDeals, getCompany, contactName, stageById } from '../lib/store.js';
import { useFocusTrap } from '../lib/a11y.js';

// Every product route, so the palette can jump anywhere. Keywords widen the
// match surface (e.g. "billing" finds Invoices, "cpq" finds Quotes).
const NAV_COMMANDS = [
  { kind: 'nav', label: 'Command center', to: '/app', icon: 'home', kw: 'dashboard overview' },
  { kind: 'nav', label: 'My day', to: '/activities', icon: 'activity', kw: 'activities tasks today' },
  { kind: 'nav', label: 'Inbox', to: '/inbox', icon: 'inbox', kw: 'conversations messages' },
  { kind: 'nav', label: 'Notifications', to: '/notifications', icon: 'bell', kw: 'alerts' },
  { kind: 'nav', label: 'Leads', to: '/leads', icon: 'funnel', kw: 'prospects inbound' },
  { kind: 'nav', label: 'Contacts', to: '/contacts', icon: 'users', kw: 'people' },
  { kind: 'nav', label: 'Companies', to: '/companies', icon: 'building', kw: 'accounts organizations' },
  { kind: 'nav', label: 'Deals', to: '/deals', icon: 'target', kw: 'pipeline opportunities' },
  { kind: 'nav', label: 'Forecasting', to: '/forecasting', icon: 'trendUp', kw: 'forecast quota' },
  { kind: 'nav', label: 'Goals', to: '/goals', icon: 'rocket', kw: 'targets quota' },
  { kind: 'nav', label: 'Territories', to: '/territories', icon: 'grid', kw: 'regions' },
  { kind: 'nav', label: 'Campaigns', to: '/campaigns', icon: 'megaphone', kw: 'marketing broadcast' },
  { kind: 'nav', label: 'Sequences', to: '/sequences', icon: 'layers', kw: 'cadence outreach' },
  { kind: 'nav', label: 'Projects', to: '/projects', icon: 'checkSquare', kw: 'delivery onboarding' },
  { kind: 'nav', label: 'Customer success', to: '/success', icon: 'shield', kw: 'retention csm' },
  { kind: 'nav', label: 'Products', to: '/products', icon: 'box', kw: 'catalog price book' },
  { kind: 'nav', label: 'Quotes', to: '/quotes', icon: 'receipt', kw: 'cpq proposals' },
  { kind: 'nav', label: 'Signatures', to: '/signatures', icon: 'edit', kw: 'esign contracts' },
  { kind: 'nav', label: 'Billing', to: '/invoices', icon: 'dollar', kw: 'invoices ar mrr' },
  { kind: 'nav', label: 'Studio', to: '/studio', icon: 'fileText', kw: 'documents builder' },
  { kind: 'nav', label: 'Dashboards', to: '/dashboards', icon: 'chart', kw: 'analytics kpi' },
  { kind: 'nav', label: 'Reports', to: '/reports', icon: 'pie', kw: 'analytics' },
  { kind: 'nav', label: 'Report builder', to: '/report-builder', icon: 'pie', kw: 'custom report analytics' },
  { kind: 'nav', label: 'Intelligence', to: '/intelligence', icon: 'sparkles', kw: 'ai insights' },
  { kind: 'nav', label: 'Handshake (deal room)', to: '/handshake', icon: 'merge', kw: 'agent negotiate a2a ap2 buyer commerce mandate' },
  { kind: 'nav', label: 'The Boardroom', to: '/boardroom', icon: 'messages', kw: 'council agents debate memo consensus revenue' },
  { kind: 'nav', label: 'Workflows', to: '/workflows', icon: 'workflow', kw: 'automation rules' },
  { kind: 'nav', label: 'Templates', to: '/workflows/library', icon: 'copy', kw: 'automation library' },
  { kind: 'nav', label: 'Integrations', to: '/integrations', icon: 'plug', kw: 'connect apps' },
  { kind: 'nav', label: 'Import data', to: '/import', icon: 'download', kw: 'csv upload' },
  { kind: 'nav', label: 'Team', to: '/team', icon: 'user', kw: 'users roles permissions' },
  { kind: 'nav', label: 'Developers', to: '/developers', icon: 'command', kw: 'api keys webhooks' },
  { kind: 'nav', label: 'Plans', to: '/billing-plans', icon: 'zap', kw: 'subscription pricing' },
  { kind: 'nav', label: 'Audit log', to: '/audit', icon: 'history', kw: 'security events' },
  { kind: 'nav', label: 'Settings', to: '/settings', icon: 'settings', kw: 'preferences modules' },
];

// Action verbs, so the palette is command-first (type "send", "run", "book").
const VERB_COMMANDS = [
  { kind: 'verb', label: 'Create deal', to: '/deals?new=1', icon: 'plus', kw: 'new opportunity add' },
  { kind: 'verb', label: 'Add contact', to: '/contacts', icon: 'plus', kw: 'new person' },
  { kind: 'verb', label: 'Add company', to: '/companies', icon: 'plus', kw: 'new account' },
  { kind: 'verb', label: 'Capture lead', to: '/leads', icon: 'plus', kw: 'new prospect' },
  { kind: 'verb', label: 'Book meeting', to: '/activities', icon: 'calendar', kw: 'schedule call' },
  { kind: 'verb', label: 'Send broadcast', to: '/campaigns', icon: 'megaphone', kw: 'email campaign marketing' },
  { kind: 'verb', label: 'Start sequence', to: '/sequences', icon: 'send', kw: 'cadence outreach enroll' },
  { kind: 'verb', label: 'Create quote', to: '/quotes', icon: 'receipt', kw: 'cpq proposal' },
  { kind: 'verb', label: 'Add product', to: '/products', icon: 'box', kw: 'catalog' },
  { kind: 'verb', label: 'Send invoice', to: '/invoices', icon: 'dollar', kw: 'billing bill' },
  { kind: 'verb', label: 'Request signature', to: '/signatures', icon: 'edit', kw: 'esign sign' },
  { kind: 'verb', label: 'Run report', to: '/report-builder', icon: 'pie', kw: 'analytics build' },
  { kind: 'verb', label: 'Build dashboard', to: '/dashboards', icon: 'chart', kw: 'analytics kpi' },
  { kind: 'verb', label: 'Create workflow', to: '/workflows', icon: 'workflow', kw: 'automation rule' },
  { kind: 'verb', label: 'Connect app', to: '/integrations', icon: 'plug', kw: 'integration install' },
  { kind: 'verb', label: 'Invite teammate', to: '/team', icon: 'user', kw: 'add user member' },
  { kind: 'verb', label: 'Import data', to: '/import', icon: 'download', kw: 'csv upload' },
  { kind: 'verb', label: 'Open settings', to: '/settings', icon: 'settings', kw: 'preferences' },
];

const DEFAULT_LIST = [...VERB_COMMANDS.slice(0, 6), ...NAV_COMMANDS.slice(0, 4)];

export default function CommandK({ open, onClose }) {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (open) { setQ(''); setActive(0); setTimeout(() => inputRef.current?.focus(), 30); }
  }, [open]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return DEFAULT_LIST;
    const cmdMatch = (c) => c.label.toLowerCase().includes(term) || (c.kw || '').includes(term);
    const verbHits = VERB_COMMANDS.filter(cmdMatch);
    const navHits = NAV_COMMANDS.filter(cmdMatch);
    const out = [];
    for (const c of getContacts()) {
      const nm = contactName(c).toLowerCase();
      if (nm.includes(term) || (c.email || '').toLowerCase().includes(term) || (c.title || '').toLowerCase().includes(term)) {
        out.push({ kind: 'contact', id: c.id, label: contactName(c), sub: `${c.title || ''}${c.title ? ' - ' : ''}${getCompany(c.companyId)?.name || ''}`, to: `/contacts/${c.id}` });
      }
      if (out.length > 24) break;
    }
    for (const co of getCompanies()) {
      if (co.name.toLowerCase().includes(term) || (co.industry || '').toLowerCase().includes(term)) {
        out.push({ kind: 'company', id: co.id, label: co.name, sub: `${co.industry} - ${co.location || ''}`, to: `/companies/${co.id}` });
      }
      if (out.length > 40) break;
    }
    for (const d of getDeals()) {
      if (d.name.toLowerCase().includes(term)) {
        out.push({ kind: 'deal', id: d.id, label: d.name, sub: `${moneyK(d.value)} - ${stageById(d.stage)?.name || ''}`, to: `/deals/${d.id}` });
      }
      if (out.length > 55) break;
    }
    // Verbs first (command-palette-first), then destinations, then records.
    return [...verbHits, ...navHits, ...out].slice(0, 40);
  }, [q]);

  useEffect(() => { setActive(0); }, [q]);

  const go = (r) => { if (!r) return; onClose(); nav(r.to); };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(results[active]); }
    else if (e.key === 'Escape') { onClose(); }
  };

  if (!open) return null;

  const iconFor = (r) => (r.kind === 'nav' || r.kind === 'verb') ? r.icon : r.kind === 'contact' ? 'users' : r.kind === 'company' ? 'building' : 'target';
  const isRecord = (r) => r.kind === 'contact' || r.kind === 'company' || r.kind === 'deal';

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(16,20,30,.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh' }}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label="Global search" onClick={(e) => e.stopPropagation()} className="fade-up" style={{ width: '100%', maxWidth: 620, background: 'var(--paper)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
        <div className="row gap-2" style={{ padding: '.9rem 1.1rem', borderBottom: '1px solid var(--line)' }}>
          <Icon name="search" size={20} style={{ color: 'var(--n-400)' }} />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKey}
            role="combobox" aria-expanded="true" aria-controls="cmdk-list" aria-autocomplete="list"
            aria-activedescendant={results.length ? `cmdk-opt-${active}` : undefined}
            aria-label="Search contacts, companies, deals, or jump to a page"
            placeholder="Search contacts, companies, deals, or jump to a page..."
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: '1.05rem', background: 'transparent' }} />
          <span className="badge">esc</span>
        </div>
        <div id="cmdk-list" role="listbox" aria-label="Search results" style={{ maxHeight: '52vh', overflowY: 'auto', padding: '.4rem' }}>
          {results.length === 0 && <div className="muted" style={{ padding: '1.4rem', textAlign: 'center' }}>No matches for "{q}"</div>}
          {results.map((r, i) => (
            <div key={r.kind + (r.id || r.to) + i} id={`cmdk-opt-${i}`} role="option" aria-selected={i === active} onClick={() => go(r)} onMouseEnter={() => setActive(i)}
              className="row gap-2" style={{ padding: '.6rem .75rem', borderRadius: 'var(--r-sm)', cursor: 'pointer', background: i === active ? 'var(--accent-50)' : 'transparent' }}>
              <span className="row center" style={{ width: 30, height: 30, borderRadius: 'var(--r-sm)', background: 'var(--n-50)', color: 'var(--accent-600)', flex: 'none' }}>
                <Icon name={iconFor(r)} size={16} />
              </span>
              <div className="col" style={{ minWidth: 0, flex: 1 }}>
                <span className="fw-6 clip">{r.label}</span>
                {r.sub && <span className="t-xs muted clip">{r.sub}</span>}
              </div>
              {isRecord(r) && <span className="t-xs muted" style={{ textTransform: 'capitalize' }}>{r.kind}</span>}
              {r.kind === 'verb' && <span className="t-xs muted">Action</span>}
              <Icon name="chevronRight" size={15} style={{ color: 'var(--n-400)' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
