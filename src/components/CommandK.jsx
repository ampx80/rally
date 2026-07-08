// Global search palette (Cmd+K / Ctrl+K). Searches contacts, companies,
// and deals off the live store and jumps to any record. Also carries a few
// quick "go to" nav commands.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, typeIcon } from './icons.jsx';
import { Avatar, moneyK } from './UI.jsx';
import { getContacts, getCompanies, getDeals, getCompany, contactName, stageById } from '../lib/store.js';

const NAV_COMMANDS = [
  { kind: 'nav', label: 'Command center', to: '/', icon: 'home' },
  { kind: 'nav', label: 'Deals pipeline', to: '/deals', icon: 'target' },
  { kind: 'nav', label: 'Contacts', to: '/contacts', icon: 'users' },
  { kind: 'nav', label: 'Companies', to: '/companies', icon: 'building' },
  { kind: 'nav', label: 'My day', to: '/activities', icon: 'activity' },
  { kind: 'nav', label: 'Dashboards', to: '/dashboards', icon: 'chart' },
];

export default function CommandK({ open, onClose }) {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) { setQ(''); setActive(0); setTimeout(() => inputRef.current?.focus(), 30); }
  }, [open]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return NAV_COMMANDS.slice(0, 6);
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
    const navHits = NAV_COMMANDS.filter(n => n.label.toLowerCase().includes(term));
    return [...navHits, ...out].slice(0, 40);
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

  const iconFor = (r) => r.kind === 'nav' ? r.icon : r.kind === 'contact' ? 'users' : r.kind === 'company' ? 'building' : 'target';

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(16,20,30,.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh' }}>
      <div onClick={(e) => e.stopPropagation()} className="fade-up" style={{ width: '100%', maxWidth: 620, background: 'var(--paper)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
        <div className="row gap-2" style={{ padding: '.9rem 1.1rem', borderBottom: '1px solid var(--line)' }}>
          <Icon name="search" size={20} style={{ color: 'var(--n-400)' }} />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKey}
            placeholder="Search contacts, companies, deals, or jump to a page..."
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: '1.05rem', background: 'transparent' }} />
          <span className="badge">esc</span>
        </div>
        <div style={{ maxHeight: '52vh', overflowY: 'auto', padding: '.4rem' }}>
          {results.length === 0 && <div className="muted" style={{ padding: '1.4rem', textAlign: 'center' }}>No matches for "{q}"</div>}
          {results.map((r, i) => (
            <div key={r.kind + (r.id || r.to) + i} onClick={() => go(r)} onMouseEnter={() => setActive(i)}
              className="row gap-2" style={{ padding: '.6rem .75rem', borderRadius: 'var(--r-sm)', cursor: 'pointer', background: i === active ? 'var(--accent-50)' : 'transparent' }}>
              <span className="row center" style={{ width: 30, height: 30, borderRadius: 'var(--r-sm)', background: 'var(--n-50)', color: 'var(--accent-600)', flex: 'none' }}>
                <Icon name={iconFor(r)} size={16} />
              </span>
              <div className="col" style={{ minWidth: 0, flex: 1 }}>
                <span className="fw-6 clip">{r.label}</span>
                {r.sub && <span className="t-xs muted clip">{r.sub}</span>}
              </div>
              {r.kind !== 'nav' && <span className="t-xs muted" style={{ textTransform: 'capitalize' }}>{r.kind}</span>}
              <Icon name="chevronRight" size={15} style={{ color: 'var(--n-400)' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
