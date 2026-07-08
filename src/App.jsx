import React, { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Icon } from './components/icons.jsx';
import { Avatar } from './components/UI.jsx';
import { getCurrentUser } from './lib/store.js';
import CommandK from './components/CommandK.jsx';
import RookDock from './components/RookDock.jsx';
import CommandCenter from './pages/CommandCenter.jsx';
import Deals from './pages/Deals.jsx';
import DealDetail from './pages/DealDetail.jsx';
import Contacts from './pages/Contacts.jsx';
import ContactDetail from './pages/ContactDetail.jsx';
import Companies from './pages/Companies.jsx';
import CompanyDetail from './pages/CompanyDetail.jsx';
import Activities from './pages/Activities.jsx';
import Dashboards from './pages/Dashboards.jsx';
import Integrations from './pages/Integrations.jsx';

const NAV = [
  { to: '/', label: 'Command center', icon: 'home', end: true },
  { to: '/deals', label: 'Deals', icon: 'target' },
  { to: '/contacts', label: 'Contacts', icon: 'users' },
  { to: '/companies', label: 'Companies', icon: 'building' },
  { to: '/activities', label: 'My day', icon: 'activity' },
  { to: '/dashboards', label: 'Dashboards', icon: 'chart' },
  { to: '/integrations', label: 'Integrations', icon: 'plug' },
];

function Rail() {
  return (
    <aside style={{ width: 'var(--sidebar-w)', background: 'var(--nav)', color: 'var(--nav-text)', display: 'flex', flexDirection: 'column', position: 'fixed', inset: '0 auto 0 0', height: '100vh', borderRight: '1px solid var(--nav-line)', zIndex: 30 }}>
      <div className="row gap-2" style={{ padding: '1.2rem 1.25rem 1rem', alignItems: 'center' }}>
        <span className="row center" style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--accent)', color: '#fff', flex: 'none', boxShadow: 'var(--accent-glow)' }}>
          <Icon name="zap" size={19} fill="currentColor" stroke={0} />
        </span>
        <div className="col" style={{ lineHeight: 1.1 }}>
          <span style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-.02em' }}>Rally</span>
          <span style={{ fontSize: '.7rem', color: 'var(--nav-muted)', letterSpacing: '.04em' }}>REVENUE PLATFORM</span>
        </div>
      </div>
      <nav className="col gap-1" style={{ padding: '.5rem .7rem', flex: 1 }}>
        {NAV.map(n => (
          <NavLink key={n.to} to={n.to} end={n.end}
            className="row gap-2"
            style={({ isActive }) => ({
              padding: '.6rem .7rem', borderRadius: 'var(--r-sm)', fontWeight: 600, fontSize: '.98rem',
              color: isActive ? '#fff' : 'var(--nav-muted)',
              background: isActive ? 'var(--nav-active)' : 'transparent',
              transition: 'background .12s, color .12s',
            })}>
            <Icon name={n.icon} size={19} />
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>
      <div style={{ padding: '.8rem', borderTop: '1px solid var(--nav-line)' }}>
        <div className="row gap-2" style={{ padding: '.4rem .5rem' }}>
          <Avatar name={getCurrentUser()?.name} size={34} />
          <div className="col" style={{ minWidth: 0, lineHeight: 1.2 }}>
            <span className="clip" style={{ fontWeight: 600, fontSize: '.92rem' }}>{getCurrentUser()?.name}</span>
            <span className="clip" style={{ fontSize: '.75rem', color: 'var(--nav-muted)' }}>{getCurrentUser()?.title}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ onOpenSearch }) {
  const nav = useNavigate();
  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
  return (
    <header className="row between" style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(246,247,249,.85)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--line)', padding: '.7rem 1.75rem', gap: '1rem' }}>
      <button onClick={onOpenSearch} className="row gap-2" style={{ flex: 1, maxWidth: 480, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '.55rem .8rem', cursor: 'pointer', color: 'var(--n-600)' }}>
        <Icon name="search" size={17} />
        <span className="t-sm">Search or jump to...</span>
        <span className="spacer" />
        <span className="badge t-xs">{isMac ? '⌘' : 'Ctrl'} K</span>
      </button>
      <div className="row gap-2">
        <button onClick={() => nav('/deals?new=1')} className="btn btn-ghost btn-sm">
          <Icon name="plus" size={16} /> New deal
        </button>
      </div>
    </header>
  );
}

export default function App() {
  const [searchOpen, setSearchOpen] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); setSearchOpen(o => !o); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);

  return (
    <div>
      <Rail />
      <div style={{ marginLeft: 'var(--sidebar-w)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Topbar onOpenSearch={() => setSearchOpen(true)} />
        <main style={{ flex: 1, padding: '1.75rem', maxWidth: 'var(--maxw)', width: '100%', margin: '0 auto' }}>
          <Routes>
            <Route path="/" element={<CommandCenter />} />
            <Route path="/deals" element={<Deals />} />
            <Route path="/deals/:id" element={<DealDetail />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/contacts/:id" element={<ContactDetail />} />
            <Route path="/companies" element={<Companies />} />
            <Route path="/companies/:id" element={<CompanyDetail />} />
            <Route path="/activities" element={<Activities />} />
            <Route path="/dashboards" element={<Dashboards />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <CommandK open={searchOpen} onClose={() => setSearchOpen(false)} />
      <RookDock />
    </div>
  );
}
