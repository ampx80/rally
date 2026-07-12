import React, { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { Icon } from './components/icons.jsx';
import { Avatar, useToast } from './components/UI.jsx';
import { getCurrentUser } from './lib/store.js';
import { useModules, moduleForRoute } from './lib/modules.js';
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
import QuoteDetail from './pages/QuoteDetail.jsx';
import Invoices from './pages/Invoices.jsx';
import Reports from './pages/Reports.jsx';
import Workflows from './pages/Workflows.jsx';
import Team from './pages/Team.jsx';
import Settings from './pages/Settings.jsx';
import Projects from './pages/Projects.jsx';
import AuditLog from './pages/AuditLog.jsx';
import ImportData from './pages/ImportData.jsx';
import Studio from './pages/Studio.jsx';
import DocBuilder from './pages/DocBuilder.jsx';
import ForkStudio from './pages/ForkStudio.jsx';
import NightShift from './pages/NightShift.jsx';
import DealFilm from './pages/DealFilm.jsx';
import WindTunnel from './pages/WindTunnel.jsx';
import MarketingAutomations from './pages/MarketingAutomations.jsx';
import GhostDeals from './pages/GhostDeals.jsx';
import { MarketingShell } from './marketing/kit.jsx';
import Home from './marketing/Home.jsx';
import Features from './marketing/Features.jsx';
import RookPage from './marketing/RookPage.jsx';
import Pricing from './marketing/Pricing.jsx';
import Security from './marketing/Security.jsx';
import Manifesto from './marketing/Manifesto.jsx';
import PagesHub from './marketing/PagesHub.jsx';
import SeoPage from './marketing/SeoPage.jsx';
import ComingSoon, { isUnlocked } from './gate/ComingSoon.jsx';
import Intelligence from './pages/Intelligence.jsx';
import CustomerSuccess from './pages/CustomerSuccess.jsx';
import Territories from './pages/Territories.jsx';
import Goals from './pages/Goals.jsx';
import Notifications from './pages/Notifications.jsx';
import Developers from './pages/Developers.jsx';
import BillingPlans from './pages/BillingPlans.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Signatures from './pages/Signatures.jsx';
import SignDocument from './pages/SignDocument.jsx';
import ReportBuilder from './pages/ReportBuilder.jsx';
import AutomationLibrary from './pages/AutomationLibrary.jsx';
import Welcome from './pages/Welcome.jsx';
import HelpCenter from './marketing/help/HelpCenter.jsx';
import HelpArticle from './marketing/help/HelpArticle.jsx';
import StatusPage from './marketing/StatusPage.jsx';
import HelpWidget from './components/HelpWidget.jsx';
import NotificationBell from './components/notif/NotificationBell.jsx';
import Customers from './marketing/Customers.jsx';
import About from './marketing/About.jsx';
import Changelog from './marketing/Changelog.jsx';
import Careers from './marketing/Careers.jsx';
import Blog from './marketing/Blog.jsx';
import BlogPost from './marketing/BlogPost.jsx';
import DemoPage from './marketing/DemoPage.jsx';
import SignIn from './pages/SignIn.jsx';
import SignUp from './pages/SignUp.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';

// First path segment maps to the product app (everything else = marketing site).
const PRODUCT_SEGS = new Set(['app', 'leads', 'deals', 'contacts', 'companies', 'activities', 'forecasting', 'campaigns', 'sequences', 'projects', 'inbox', 'products', 'quotes', 'invoices', 'studio', 'dashboards', 'reports', 'workflows', 'integrations', 'team', 'settings', 'audit', 'import', 'intelligence', 'success', 'territories', 'goals', 'notifications', 'developers', 'billing-plans', 'onboarding', 'signatures', 'report-builder', 'welcome', 'fork', 'night-shift', 'film', 'wind-tunnel', 'automations', 'ghost-deals']);

// Collapsible nav groups. A pinned Overview stays open; every other group is a
// collapsible section whose open/closed state persists per-user in localStorage.
// Every existing route + nav destination is preserved here, just regrouped, and
// each item carries a distinct icon (no duplicate glyphs). Report builder is
// merged into Reports (still reachable via the command palette + Reports page).
const NAV_GROUPS = [
  { id: 'overview', label: 'Overview', pinned: true, items: [
    { to: '/app', label: 'Command center', icon: 'home', end: true },
    { to: '/activities', label: 'My day', icon: 'activity' },
    { to: '/inbox', label: 'Inbox', icon: 'inbox' },
    { to: '/notifications', label: 'Notifications', icon: 'bell' },
  ] },
  { id: 'customers', label: 'Customers', items: [
    { to: '/leads', label: 'Leads', icon: 'funnel' },
    { to: '/contacts', label: 'Contacts', icon: 'users' },
    { to: '/companies', label: 'Companies', icon: 'building' },
    { to: '/deals', label: 'Deals', icon: 'target' },
  ] },
  { id: 'pipeline', label: 'Pipeline', items: [
    { to: '/forecasting', label: 'Forecasting', icon: 'trendUp' },
    { to: '/goals', label: 'Goals', icon: 'rocket' },
    { to: '/territories', label: 'Territories', icon: 'grid' },
  ] },
  { id: 'marketing', label: 'Marketing', items: [
    { to: '/campaigns', label: 'Campaigns', icon: 'megaphone' },
    { to: '/sequences', label: 'Sequences', icon: 'layers' },
    { to: '/automations', label: 'Automations', icon: 'send' },
  ] },
  { id: 'delivery', label: 'Success & Delivery', items: [
    { to: '/projects', label: 'Projects', icon: 'checkSquare' },
    { to: '/success', label: 'Customer success', icon: 'shield' },
  ] },
  { id: 'revenue', label: 'Revenue', items: [
    { to: '/products', label: 'Products', icon: 'box' },
    { to: '/quotes', label: 'Quotes', icon: 'receipt' },
    { to: '/signatures', label: 'Signatures', icon: 'edit' },
    { to: '/invoices', label: 'Billing', icon: 'dollar' },
    { to: '/studio', label: 'Studio', icon: 'fileText' },
    { to: '/film', label: 'Deal Film', icon: 'eye' },
  ] },
  { id: 'analytics', label: 'Analytics', items: [
    { to: '/dashboards', label: 'Dashboards', icon: 'chart' },
    { to: '/reports', label: 'Reports', icon: 'pie' },
    { to: '/intelligence', label: 'Intelligence', icon: 'sparkles' },
    { to: '/fork', label: 'Pipeline Fork', icon: 'gitBranch' },
    { to: '/wind-tunnel', label: 'Wind Tunnel', icon: 'bolt' },
    { to: '/ghost-deals', label: 'Ghost Deals', icon: 'rotateCcw' },
  ] },
  { id: 'automation', label: 'Automation', items: [
    { to: '/workflows', label: 'Workflows', icon: 'workflow' },
    { to: '/workflows/library', label: 'Templates', icon: 'copy' },
    { to: '/night-shift', label: 'Night Shift', icon: 'moon' },
  ] },
  { id: 'admin', label: 'Admin', defaultClosed: true, items: [
    { to: '/integrations', label: 'Integrations', icon: 'plug' },
    { to: '/import', label: 'Import', icon: 'download' },
    { to: '/team', label: 'Team', icon: 'user' },
    { to: '/developers', label: 'Developers', icon: 'command' },
    { to: '/billing-plans', label: 'Plans', icon: 'zap' },
    { to: '/audit', label: 'Audit', icon: 'history' },
    { to: '/settings', label: 'Settings', icon: 'settings' },
  ] },
];

// Per-user persisted open/closed state for the collapsible nav groups.
const NAV_LS = 'rally_nav_groups_v1';
function readNavState() { try { return JSON.parse(localStorage.getItem(NAV_LS) || '{}') || {}; } catch { return {}; } }
function writeNavState(s) { try { localStorage.setItem(NAV_LS, JSON.stringify(s)); } catch {} }

// Route-aware primary CTA for the topbar. Falls back to New deal.
const CTA_MAP = {
  '/deals': { label: 'New deal', to: '/deals?new=1', icon: 'plus' },
  '/leads': { label: 'New lead', to: '/leads', icon: 'plus' },
  '/contacts': { label: 'Book meeting', to: '/activities', icon: 'calendar' },
  '/companies': { label: 'New company', to: '/companies', icon: 'plus' },
  '/activities': { label: 'Book meeting', to: '/activities', icon: 'calendar' },
  '/campaigns': { label: 'New campaign', to: '/campaigns', icon: 'plus' },
  '/sequences': { label: 'New sequence', to: '/sequences', icon: 'plus' },
  '/projects': { label: 'New project', to: '/projects', icon: 'plus' },
  '/products': { label: 'New product', to: '/products', icon: 'plus' },
  '/quotes': { label: 'New quote', to: '/quotes', icon: 'plus' },
  '/invoices': { label: 'New invoice', to: '/invoices', icon: 'plus' },
  '/signatures': { label: 'New request', to: '/signatures', icon: 'plus' },
  '/studio': { label: 'New document', to: '/studio', icon: 'plus' },
  '/inbox': { label: 'Compose', to: '/inbox', icon: 'edit' },
  '/workflows': { label: 'New workflow', to: '/workflows', icon: 'plus' },
  '/reports': { label: 'New report', to: '/report-builder', icon: 'plus' },
  '/report-builder': { label: 'New report', to: '/report-builder', icon: 'plus' },
  '/dashboards': { label: 'New dashboard', to: '/dashboards', icon: 'plus' },
  '/team': { label: 'Invite teammate', to: '/team', icon: 'plus' },
  '/goals': { label: 'New goal', to: '/goals', icon: 'plus' },
  '/territories': { label: 'New territory', to: '/territories', icon: 'plus' },
  '/success': { label: 'New account', to: '/success', icon: 'plus' },
  '/integrations': { label: 'Connect app', to: '/integrations', icon: 'plug' },
};
function ctaFor(pathname) {
  const seg = '/' + (pathname.split('/')[1] || '');
  return CTA_MAP[seg] || { label: 'New deal', to: '/deals?new=1', icon: 'plus' };
}

// Legacy /compare/:slug now lives at /pages/rally-vs-:slug. Redirect so link
// equity + bookmarks land on the single canonical URL (no duplicate content).
function CompareRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/pages/rally-vs-${slug}`} replace />;
}

function useIsMobile() {
  const q = '(max-width: 860px)';
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const h = () => setM(mq.matches);
    h();
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  return m;
}

function NavItem({ n, onClose }) {
  return (
    <NavLink to={n.to} end={n.end} onClick={onClose} className="row gap-2"
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
  );
}

function Rail({ open, mobile, onClose }) {
  const mods = useModules();
  const loc = useLocation();
  const [openMap, setOpenMap] = useState(readNavState);
  const toggle = (id, currentlyBaseOpen) => {
    const next = { ...openMap, [id]: !currentlyBaseOpen };
    setOpenMap(next);
    writeNavState(next);
  };
  // Transform is the single source of truth for open/closed, computed straight
  // from state so no cascade or emulator can lose it.
  const transform = !mobile ? 'none' : (open ? 'translateX(0)' : 'translateX(-101%)');
  return (
    <aside className={`rl-rail${open ? ' open' : ''}`} style={{ background: 'var(--nav)', color: 'var(--nav-text)', display: 'flex', flexDirection: 'column', position: 'fixed', inset: '0 auto 0 0', height: '100vh', borderRight: '1px solid var(--nav-line)', transform, willChange: 'transform' }}>
      <div className="row between" style={{ padding: '1.2rem 1.25rem 1rem', alignItems: 'center', flex: 'none' }}>
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <span className="row center floaty" style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg, #6d5cf7, #4a3ce0)', color: '#fff', flex: 'none', boxShadow: 'var(--accent-glow)' }}>
            <Icon name="zap" size={19} fill="currentColor" stroke={0} />
          </span>
          <div className="col" style={{ lineHeight: 1.1 }}>
            <span style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-.02em' }}>Rally</span>
            <span style={{ fontSize: '.7rem', color: 'var(--nav-muted)', letterSpacing: '.04em' }}>REVENUE PLATFORM</span>
          </div>
        </div>
        <button onClick={onClose} className="mobile-only btn btn-quiet" aria-label="Close menu" style={{ color: 'var(--nav-muted)', padding: '.35rem' }}>
          <Icon name="x" size={20} />
        </button>
      </div>
      <nav className="col" style={{ padding: '.25rem .7rem .8rem', flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {NAV_GROUPS.map((group) => {
          // Hide items whose module is turned off; drop a group that empties out.
          const items = group.items.filter(n => { const k = moduleForRoute(n.to); return !k || mods[k] !== false; });
          if (items.length === 0) return null;
          // Is the active route inside this group? If so it renders open regardless
          // of the persisted preference (can never hide the current page).
          const containsActive = items.some(n => n.end ? loc.pathname === n.to : (loc.pathname === n.to || loc.pathname.startsWith(n.to + '/')));
          const explicit = openMap[group.id];
          const baseOpen = group.pinned ? true : (explicit !== undefined ? explicit : !group.defaultClosed);
          const shown = baseOpen || containsActive;
          return (
            <div key={group.id} className="col gap-1" style={{ marginBottom: '.15rem' }}>
              {group.pinned ? (
                <div className="nav-sec">{group.label}</div>
              ) : (
                <button type="button" className="nav-group" aria-expanded={shown} aria-controls={`navgrp-${group.id}`}
                  onClick={() => toggle(group.id, baseOpen)}>
                  <span>{group.label}</span>
                  <Icon name="chevronDown" size={15} className="chev" style={{ transform: shown ? 'none' : 'rotate(-90deg)' }} />
                </button>
              )}
              {shown && (
                <div id={`navgrp-${group.id}`} className="col gap-1">
                  {items.map(n => <NavItem key={n.to} n={n} onClose={onClose} />)}
                </div>
              )}
            </div>
          );
        })}
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

function Topbar({ onOpenSearch, onBurger }) {
  const nav = useNavigate();
  const loc = useLocation();
  const theme = useTheme();
  const toast = useToast();
  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
  const cta = ctaFor(loc.pathname);
  return (
    <header className="row between rl-topbar" style={{ position: 'sticky', top: 0, zIndex: 20, background: 'color-mix(in srgb, var(--page) 82%, transparent)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--line)', padding: '.7rem 1.75rem', gap: '1rem' }}>
      <button onClick={onBurger} className="rl-burger btn btn-quiet" aria-label="Open menu" style={{ padding: '.5rem', flex: 'none' }}>
        <Icon name="list" size={20} />
      </button>
      <button onClick={onOpenSearch} className="row gap-2" style={{ flex: 1, maxWidth: 460, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '.55rem .8rem', cursor: 'pointer', color: 'var(--n-600)' }}>
        <Icon name="search" size={17} />
        <span className="t-sm clip">Search or jump to...</span>
        <span className="spacer" />
        <span className="badge t-xs hide-520">{isMac ? '⌘' : 'Ctrl'} K</span>
      </button>
      <div className="row gap-1" style={{ flex: 'none' }}>
        <button onClick={toggleTheme} className="btn btn-quiet" title="Toggle theme" aria-label="Toggle theme" style={{ padding: '.5rem' }}>
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
        </button>
        <NotificationBell />
        <button onClick={() => nav(cta.to)} className="btn btn-primary btn-sm" style={{ marginLeft: '.25rem' }}>
          <Icon name={cta.icon} size={16} /> <span className="hide-520">{cta.label}</span>
        </button>
      </div>
    </header>
  );
}

export default function App() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(isUnlocked);
  const mobile = useIsMobile();
  const loc = useLocation();

  useEffect(() => { applyTheme(); }, []);
  useEffect(() => {
    const h = (e) => { if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); setSearchOpen(o => !o); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  // Close the mobile drawer + scroll to top on every navigation.
  useEffect(() => { window.scrollTo(0, 0); setNavOpen(false); }, [loc.pathname]);
  // Lock body scroll while the drawer is open on mobile.
  useEffect(() => { document.body.style.overflow = navOpen ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [navOpen]);

  // Marketing site owns the root; the product app lives under known segments.
  const seg = loc.pathname.split('/')[1] || '';
  const isApp = PRODUCT_SEGS.has(seg);

  if (!isApp) {
    return (
      <MarketingShell>
        <div key={loc.pathname}>
          <Routes location={loc}>
            <Route path="/" element={<Home />} />
            <Route path="/features" element={<Features />} />
            <Route path="/product/rook" element={<RookPage />} />
            <Route path="/compare/:slug" element={<CompareRedirect />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/security" element={<Security />} />
            <Route path="/manifesto" element={<Manifesto />} />
            <Route path="/pages" element={<PagesHub />} />
            <Route path="/pages/:slug" element={<SeoPage />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/about" element={<About />} />
            <Route path="/changelog" element={<Changelog />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/demo" element={<DemoPage />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot" element={<ForgotPassword />} />
            <Route path="/sign/:reqId" element={<SignDocument />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/help/:slug" element={<HelpArticle />} />
            <Route path="/status" element={<StatusPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </MarketingShell>
    );
  }

  // The product app is gated behind the coming-soon waitlist. Marketing and
  // the SEO library above stay public (crawlable); the product unlocks only
  // with the access code, verified server-side against ACCESS_CODE.
  if (!unlocked) return <ComingSoon onUnlock={() => setUnlocked(true)} />;

  return (
    <div>
      <LaunchScreen />
      <div className="ambient" aria-hidden><span className="b1" /><span className="b2" /><span className="b3" /></div>
      <Rail open={navOpen} mobile={mobile} onClose={() => setNavOpen(false)} />
      {mobile && navOpen && <div className="rl-scrim" onClick={() => setNavOpen(false)} aria-hidden />}
      <div className="rl-main" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        <Topbar onOpenSearch={() => setSearchOpen(true)} onBurger={() => setNavOpen(true)} />
        <main className="rl-content">
          <div key={loc.pathname} className="page-in">
            <Routes location={loc}>
              <Route path="/app" element={<CommandCenter />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/deals" element={<Deals />} />
              <Route path="/deals/:id" element={<DealDetail />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/contacts/:id" element={<ContactDetail />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/companies/:id" element={<CompanyDetail />} />
              <Route path="/activities" element={<Activities />} />
              <Route path="/forecasting" element={<Forecasting />} />
              <Route path="/fork" element={<ForkStudio />} />
              <Route path="/film" element={<DealFilm />} />
              <Route path="/wind-tunnel" element={<WindTunnel />} />
              <Route path="/ghost-deals" element={<GhostDeals />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/sequences" element={<Sequences />} />
              <Route path="/automations" element={<MarketingAutomations />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/inbox" element={<Inbox />} />
              <Route path="/products" element={<Products />} />
              <Route path="/quotes" element={<Quotes />} />
              <Route path="/quotes/:id" element={<QuoteDetail />} />
              <Route path="/studio" element={<Studio />} />
              <Route path="/studio/:id" element={<DocBuilder />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/dashboards" element={<Dashboards />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/workflows" element={<Workflows />} />
              <Route path="/integrations" element={<Integrations />} />
              <Route path="/team" element={<Team />} />
              <Route path="/audit" element={<AuditLog />} />
              <Route path="/import" element={<ImportData />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/intelligence" element={<Intelligence />} />
              <Route path="/success" element={<CustomerSuccess />} />
              <Route path="/territories" element={<Territories />} />
              <Route path="/goals" element={<Goals />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/developers" element={<Developers />} />
              <Route path="/billing-plans" element={<BillingPlans />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/signatures" element={<Signatures />} />
              <Route path="/report-builder" element={<ReportBuilder />} />
              <Route path="/workflows/library" element={<AutomationLibrary />} />
              <Route path="/night-shift" element={<NightShift />} />
              <Route path="/welcome" element={<Welcome />} />
              <Route path="*" element={<Navigate to="/app" replace />} />
            </Routes>
          </div>
        </main>
      </div>
      <CommandK open={searchOpen} onClose={() => setSearchOpen(false)} />
      <HelpWidget />
      <RookDock />
    </div>
  );
}
