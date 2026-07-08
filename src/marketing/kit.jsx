// Marketing kit: the shell (nav + footer), scroll-reveal, and shared bits every
// marketing page composes from. Scoped under .mkt so product styles are untouched.
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../components/icons.jsx';

/* Reveal children on scroll into view. */
export function Reveal({ children, delay = 0, as: As = 'div', className = '', style }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { setSeen(true); io.unobserve(el); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <As ref={ref} className={`reveal${seen ? ' is-in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms`, ...style }}>{children}</As>;
}

export function Logo({ size = 32 }) {
  return (
    <span className="mkt-logo">
      <span className="mkt-logo-mark" style={{ width: size, height: size }}>
        <Icon name="zap" size={size * 0.58} fill="#fff" stroke={0} />
      </span>
      Rally
    </span>
  );
}

export function MktButton({ to, variant = 'primary', size = 'md', children, onClick }) {
  const cls = `mkt-btn mkt-btn-${variant}${size === 'lg' ? ' mkt-btn-lg' : ''}`;
  if (to) return <Link to={to} className={cls}>{children}</Link>;
  return <button className={cls} onClick={onClick}>{children}</button>;
}

export function Pill({ children }) {
  return <span className="mkt-pill"><span className="mkt-dot" />{children}</span>;
}

const NAV = [
  { label: 'Product', to: '/features' },
  { label: 'Rook AI', to: '/product/rook' },
  { label: 'Compare', to: '/compare/salesforce' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Security', to: '/security' },
];

function MktNav() {
  const [open, setOpen] = useState(false);
  return (
    <nav className="mkt-nav">
      <div className="mkt-wrap mkt-nav-in">
        <Link to="/"><Logo /></Link>
        <div className="mkt-navlinks">
          {NAV.map(n => <Link key={n.to} to={n.to}>{n.label}</Link>)}
        </div>
        <span className="mkt-spacer" />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }} className="mkt-navcta">
          <Link to="/app" className="mkt-btn mkt-btn-ghost" style={{ padding: '9px 16px' }}>Sign in</Link>
          <Link to="/app" className="mkt-btn mkt-btn-primary" style={{ padding: '9px 18px' }}>Get started</Link>
        </div>
        <button className="mkt-burger" onClick={() => setOpen(o => !o)} aria-label="Menu"><Icon name={open ? 'x' : 'list'} size={24} /></button>
      </div>
      {open && (
        <div className="mkt-wrap" style={{ paddingBottom: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV.map(n => <Link key={n.to} to={n.to} onClick={() => setOpen(false)} style={{ padding: '11px 8px', fontWeight: 600, color: 'var(--m-ink2)', borderTop: '1px solid var(--m-line)' }}>{n.label}</Link>)}
          <Link to="/app" className="mkt-btn mkt-btn-primary" style={{ marginTop: 10, justifyContent: 'center' }}>Get started</Link>
        </div>
      )}
    </nav>
  );
}

function MktFooter() {
  const cols = [
    { h: 'Product', links: [['Features', '/features'], ['Rook AI operator', '/product/rook'], ['Pricing', '/pricing'], ['Security', '/security'], ['Launch app', '/app']] },
    { h: 'Compare', links: [['vs Salesforce', '/compare/salesforce'], ['vs HubSpot', '/compare/hubspot'], ['vs Zoho', '/compare/zoho'], ['vs NetSuite', '/compare/netsuite'], ['vs Pipedrive', '/compare/pipedrive']] },
    { h: 'Company', links: [['Manifesto', '/manifesto'], ['Security', '/security'], ['Get started', '/app']] },
    { h: 'Resources', links: [['Product tour', '/features'], ['Why Rally', '/manifesto'], ['Rook', '/product/rook']] },
  ];
  return (
    <footer className="mkt-footer">
      <div className="mkt-wrap">
        <div className="mkt-footcols">
          <div>
            <Logo />
            <p className="mkt-muted" style={{ marginTop: 14, maxWidth: 300, lineHeight: 1.55 }}>The AI-native revenue platform. Run your revenue on Rally.</p>
          </div>
          {cols.map(c => (
            <div key={c.h} className="mkt-footcol">
              <h5>{c.h}</h5>
              {c.links.map(([label, to]) => <Link key={to + label} to={to}>{label}</Link>)}
            </div>
          ))}
        </div>
        <hr className="mkt-rule" style={{ margin: '36px 0 20px' }} />
        <div className="mkt-dim" style={{ fontSize: 14 }}>Copyright Rally. Built AI-native from the first commit.</div>
      </div>
    </footer>
  );
}

export function MarketingShell({ children }) {
  useEffect(() => {
    const prev = document.documentElement.getAttribute('data-theme');
    return () => { if (prev) document.documentElement.setAttribute('data-theme', prev); };
  }, []);
  return (
    <div className="mkt">
      <div className="mkt-aurora" aria-hidden><span className="a1" /><span className="a2" /><span className="a3" /></div>
      <div className="mkt-main">
        <MktNav />
        {children}
        <MktFooter />
      </div>
    </div>
  );
}

/* CTA band reused at the bottom of pages. */
export function CtaBand({ title = 'Run your revenue on Rally.', sub = 'Everything alive on first load. Ask Rook and it does the work.' }) {
  return (
    <section className="mkt-section">
      <div className="mkt-wrap">
        <Reveal>
          <div className="mkt-cta-band">
            <h2 className="mkt-h2" style={{ maxWidth: 720, margin: '0 auto' }}>{title}</h2>
            <p className="mkt-lead" style={{ maxWidth: 560, margin: '16px auto 28px' }}>{sub}</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <MktButton to="/app" size="lg">Get started free <Icon name="chevronRight" size={18} /></MktButton>
              <MktButton to="/features" variant="ghost" size="lg">See the product</MktButton>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
