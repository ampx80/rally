import React, { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Icon } from './components/icons.jsx';
import { Avatar, useToast } from './components/UI.jsx';
import { getCurrentUser } from './lib/store.js';
import { applyTheme, useTheme, toggleTheme } from './lib/theme.js';
import CommandK from './components/CommandK.jsx';
import RookDock from './components/RookDock.jsx';
import LaunchScreen from './components/LaunchScreen.jsx';
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
import Leads from './pages/Leads.jsx';
import Forecasting from './pages/Forecasting.jsx';
import Campaigns from './pages/Campaigns.jsx';
import Sequences from './pages/Sequences.jsx';
import Inbox from './pages/Inbox.jsx';
import Products from './pages/Products.jsx';
import Quotes from './pages/Quotes.jsx';
import Invoices from './pages/Invoices.jsx';
import Reports from './pages/Reports.jsx';
import Workflows from './pages/Workflows.jsx';
import Team from './pages/Team.jsx';
import Settings from './pages/Settings.jsx';

const NAV_SECTIONS = [
  { label: null, items: [{ to: '/', label: 'Command center', icon: 'home', end: true }] },
  { label: 'Sell', items: [
    { to: '/leads', label: 'Leads', icon: 'funnel' },
    { to: '/deals', label: 'Deals', icon: 'target' },
    { to: '/contacts', label: 'Contacts', icon: 'users' },
    { to: '/companies', label: 'Companies', icon: 'building' },
    { to: '/activities', label: 'My day', icon: 'activity' },
    { to: '/forecasting', label: 'Forecasting', icon: 'trendUp' },
  ] },
  { label: 'Marketing', items: [
    { to: '/campaigns', label: 'Campaigns', icon: 'megaphone' },
    { to: '/sequences', label: 'Sequences', icon: 'layers' },
  ] },
  { label: 'Service', items: [{ to: '/inbox', label: 'Inbox', icon: 'inbox' }] },
  { label: 'Revenue', items: [
    { to: '/products', label: 'Products', icon: 'box' },
    { to: '/quotes', label: 'Quotes', icon: 'receipt' },
    { to: '/invoices', label: 'Billing', icon: 'dollar' },
  ] },
  { label: 'Intelligence', items: [
    { to: '/dashboards', label: 'Dashboards', icon: 'chart' },
    { to: '/reports', label: 'Reports', icon: 'pie' },
  ] },
  { label: 'Automate', items: [{ to: '/workflows', label: 'Workflows', icon: 'workflow' }] },
  { label: 'Admin', items: [
    { to: '/integrations', label: 'Integrations', icon: 'plug' },
    { to: '/team', label: 'Team', icon: 'users' },
    { to: '/settings', label: 'Settings', icon: 'settings' },
  ] },
];

function Rail() {
  return (
    <aside style={{ width: 'var(--sidebar-w)', background: 'var(--nav)', color: 'var(--nav-text)', display: 'flex', flexDirection: 'column', position: 'fixed', inset: '0 auto 0 0', height: '100vh', borderRight: '1px solid var(--nav-line)', zIndex: 30 }}>
      <div className="row gap-2" style={{ padding: '1.2rem 1.25rem 1rem', alignItems: 'center', flex: 'none' }}>
        <span className="row center floaty" style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg, #6d5cf7, #4a3ce0)', color: '#fff', flex: 'none', boxShadow: 'var(--accent-glow)' }}>
          <Icon name="zap" size={19} fill="currentColor" stroke={0} />
        </span>
        <div className="col" style={{ lineHeight: 1.1 }}>
          <span style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-.02em' }}>Rally</span>
          <span style={{ fontSize: '.7rem', color: 'var(--nav-muted)', letterSpacing: '.04em' }}>REVENUE PLATFORM</span>
        </div>
      </div>
      <nav className="col" style={{ padding: '.25rem .7rem .8rem', flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {NAV_SECTIONS.map((sec, si) => (
          <div key={si} className="col gap-1" style={{ marginBottom: '.15rem' }}>
            {sec.label && <div className="nav-sec">{sec.label}</div>}
            {sec.items.map(n => (
              <NavLink key={n.to} to={n.to} end={n.end} className="row gap-2"
                style={({ isActive }) => ({
                  padding: '.55rem .7rem', borderRadius: 'var(--r-sm)', fontWeight: 600, fontSize: '.96rem',
                  color: isActive ? '#fff' : 'var(--nav-muted)',
                  background: isActive ? 'var(--nav-active)' : 'transparent',
                  boxShadow: isActive ? 'inset 3px 0 0 var(--accent)' : 'none',
                  transition: 'background .12s, color .12s',
                })}>
                <Icon name={n.icon} size={18} />
                <span className="clip">{n.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div style={{ padding: '.7rem', borderTop: '1px solid var(--nav-line)', flex: 'none' }}>
        <div className="row gap-2" style={{ padding: '.35rem .5rem' }}>
          <Avatar name={getCurrentUser()?.name} size={34} />
          <div className="col" style={{ minWidth: 0, lineHeight: 1.2 }}>
            <span className="clip" style={{ fontWeight: 600, fontSize: '.9rem' }}>{getCurrentUser()?.name}</span>
            <span className="clip" style={{ fontSize: '.74rem', color: 'var(--nav-muted)' }}>{getCurrentUser()?.title}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ onOpenSearch }) {
  const nav = useNavigate();
  const theme = useTheme();
  const toast = useToast();
  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
  return (
    <header className="row between" style={{ position: 'sticky', top: 0, zIndex: 20, background: 'color-mix(in srgb, var(--page) 82%, transparent)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--line)', padding: '.7rem 1.75rem', gap: '1rem' }}>
      <button onClick={onOpenSearch} className="row gap-2" style={{ flex: 1, maxWidth: 460, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '.55rem .8rem', cursor: 'pointer', color: 'var(--n-600)' }}>
        <Icon name="search" size={17} />
        <span className="t-sm">Search or jump to...</span>
        <span className="spacer" />
        <span className="badge t-xs">{isMac ? '⌘' : 'Ctrl'} K</span>
      </button>
      <div className="row gap-1">
        <button onClick={toggleTheme} className="btn btn-quiet" title="Toggle theme" aria-label="Toggle theme" style={{ padding: '.5rem' }}>
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
        </button>
        <button onClick={() => toast('You are all caught up. No new notifications.')} className="btn btn-quiet" title="Notifications" aria-label="Notifications" style={{ padding: '.5rem', position: 'relative' }}>
          <Icon name="bell" size={18} />
          <span style={{ position: 'absolute', top: 6, right: 7, width: 7, height: 7, borderRadius: 999, background: 'var(--accent)', border: '2px solid var(--page)' }} />
        </button>
        <button onClick={() => nav('/deals?new=1')} className="btn btn-primary btn-sm" style={{ marginLeft: '.35rem' }}>
          <Icon name="plus" size={16} /> New deal
        </button>
      </div>
    </header>
  );
}

export default function App() {
  const [searchOpen, setSearchOpen] = useState(false);
  const loc = useLocation();

  useEffect(() => { applyTheme(); }, []);
  useEffect(() => {
    const h = (e) => { if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); setSearchOpen(o => !o); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);

  return (
    <div>
      <LaunchScreen />
      <div className="ambient" aria-hidden><span className="b1" /><span className="b2" /><span className="b3" /></div>
      <Rail />
      <div style={{ marginLeft: 'var(--sidebar-w)', minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        <Topbar onOpenSearch={() => setSearchOpen(true)} />
        <main style={{ flex: 1, padding: '1.75rem', maxWidth: 'var(--maxw)', width: '100%', margin: '0 auto' }}>
          <div key={loc.pathname} className="page-in">
            <Routes location={loc}>
              <Route path="/" element={<CommandCenter />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/deals" element={<Deals />} />
              <Route path="/deals/:id" element={<DealDetail />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/contacts/:id" element={<ContactDetail />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/companies/:id" element={<CompanyDetail />} />
              <Route path="/activities" element={<Activities />} />
              <Route path="/forecasting" element={<Forecasting />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/sequences" element={<Sequences />} />
              <Route path="/inbox" element={<Inbox />} />
              <Route path="/products" element={<Products />} />
              <Route path="/quotes" element={<Quotes />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/dashboards" element={<Dashboards />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/workflows" element={<Workflows />} />
              <Route path="/integrations" element={<Integrations />} />
              <Route path="/team" element={<Team />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
      <CommandK open={searchOpen} onClose={() => setSearchOpen(false)} />
      <RookDock />
    </div>
  );
}
