// SmartCTA - a reusable, self-contained call-to-action block.
//
// Used by the hosted landing renderer for `cta` blocks, and drop-in anywhere
// else a conversion band is needed. Deliberately style-agnostic (inline styles
// only, no dependency on the product or marketing CSS systems) so it looks
// right in either context. Accent defaults to Ardovo's #5b4bf5.
//
// The button "deep-links" intelligently:
//   - an in-app / marketing path ("/app", "/pricing")  -> react-router <Link>
//   - an on-page anchor ("#form")                       -> smooth scroll
//   - an absolute url ("https://...")                   -> new-tab <a>
//   - an onClick handler with no href                   -> <button>
//
// ASCII only. NO em-dash / en-dash. ASCII hyphen only.
import React from 'react';
import { Link } from 'react-router-dom';

function isExternal(href) { return /^https?:\/\//i.test(href || ''); }
function isAnchor(href) { return typeof href === 'string' && href.startsWith('#'); }

// Resolve an href into the right element so a CTA works in every context.
function CtaButton({ href, onClick, style, children }) {
  const handleAnchor = (e) => {
    e.preventDefault();
    const id = href.slice(1);
    const el = typeof document !== 'undefined' && document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    onClick?.(e);
  };

  if (href && isAnchor(href)) {
    return <a href={href} onClick={handleAnchor} style={style}>{children}</a>;
  }
  if (href && isExternal(href)) {
    return <a href={href} target="_blank" rel="noopener noreferrer" onClick={onClick} style={style}>{children}</a>;
  }
  if (href) {
    return <Link to={href} onClick={onClick} style={style}>{children}</Link>;
  }
  return <button type="button" onClick={onClick} style={{ ...style, border: 'none', cursor: 'pointer', font: 'inherit' }}>{children}</button>;
}

export default function SmartCTA({
  headline,
  sub,
  buttonLabel = 'Get started',
  buttonHref = '/app',
  onClick,
  variant = 'band',           // 'band' | 'inline' | 'minimal'
  align = 'center',
  accent = '#5b4bf5',
  secondaryLabel,
  secondaryHref,
  style,
}) {
  const centered = align === 'center';
  const btnBase = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '15px 28px', borderRadius: 13, fontWeight: 800, fontSize: 17,
    textDecoration: 'none', whiteSpace: 'nowrap',
    transition: 'transform .16s cubic-bezier(.22,1,.36,1), box-shadow .2s, opacity .2s',
  };
  const primaryBtn = variant === 'band'
    ? { ...btnBase, background: '#fff', color: accent, boxShadow: '0 12px 30px -8px rgba(0,0,0,.3)' }
    : { ...btnBase, background: `linear-gradient(100deg, ${accent}, #7c5cf7)`, color: '#fff', boxShadow: `0 12px 26px -10px ${accent}99` };
  const secondaryBtn = variant === 'band'
    ? { ...btnBase, background: 'rgba(255,255,255,.12)', color: '#fff', border: '1px solid rgba(255,255,255,.35)' }
    : { ...btnBase, background: 'transparent', color: accent, border: `1px solid ${accent}55` };

  const buttons = (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: centered ? 'center' : 'flex-start', marginTop: (headline || sub) ? 26 : 0 }}>
      <CtaButton href={buttonHref} onClick={onClick} style={primaryBtn}>
        {buttonLabel}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </CtaButton>
      {secondaryLabel && (
        <CtaButton href={secondaryHref} style={secondaryBtn}>{secondaryLabel}</CtaButton>
      )}
    </div>
  );

  if (variant === 'minimal') {
    return <div style={{ textAlign: centered ? 'center' : 'left', ...style }}>{buttons}</div>;
  }

  if (variant === 'inline') {
    return (
      <div style={{ textAlign: centered ? 'center' : 'left', padding: '8px 0', ...style }}>
        {headline && <h3 style={{ margin: 0, fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, letterSpacing: '-.02em', color: 'inherit' }}>{headline}</h3>}
        {sub && <p style={{ margin: '10px 0 0', fontSize: 17, lineHeight: 1.55, color: 'inherit', opacity: .78, maxWidth: 560, marginInline: centered ? 'auto' : 0 }}>{sub}</p>}
        {buttons}
      </div>
    );
  }

  // 'band' - the full-width gradient conversion band.
  return (
    <div
      style={{
        position: 'relative', overflow: 'hidden',
        background: `linear-gradient(120deg, ${accent}, #7c5cf7 55%, #0e9f9a)`,
        color: '#fff', borderRadius: 24, padding: 'clamp(32px, 6vw, 60px)',
        textAlign: centered ? 'center' : 'left',
        boxShadow: '0 40px 90px -30px rgba(48,40,120,.5)',
        ...style,
      }}
    >
      <span aria-hidden style={{ position: 'absolute', top: -80, right: -60, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,.22), transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative' }}>
        {headline && <h2 style={{ margin: 0, fontSize: 'clamp(1.9rem, 4.5vw, 3rem)', fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.06, maxWidth: 720, marginInline: centered ? 'auto' : 0 }}>{headline}</h2>}
        {sub && <p style={{ margin: '16px 0 0', fontSize: 'clamp(1.05rem, 2vw, 1.3rem)', lineHeight: 1.5, color: 'rgba(255,255,255,.88)', maxWidth: 560, marginInline: centered ? 'auto' : 0 }}>{sub}</p>}
        {buttons}
      </div>
    </div>
  );
}
