// Skip-to-content link. First focusable element on the page so keyboard and
// screen-reader users can jump past the command rail + topbar straight to the
// main region. Visually hidden until focused, then it slides into view.
//
// Wiring (main thread applies): render <SkipLink /> as the FIRST child inside
// App's returned tree (before <Rail /> / <Topbar />), and add id="main-content"
// plus tabIndex={-1} to the <main className="rl-content"> element so the link
// target can receive programmatic focus.
//
// Self-contained styles (no index.css edit required). ASCII only.
import React from 'react';

const HIDDEN = {
  position: 'fixed',
  top: 8,
  left: 8,
  zIndex: 300,
  // Pull it out of view without display:none (must stay focusable).
  transform: 'translateY(-160%)',
  transition: 'transform .18s cubic-bezier(.22,1,.36,1)',
  background: 'var(--accent, #5b4bf5)',
  color: '#fff',
  fontWeight: 700,
  fontSize: '1rem',
  padding: '.7rem 1.15rem',
  borderRadius: 'var(--r-sm, 7px)',
  boxShadow: '0 8px 24px rgba(16,20,30,.25)',
  textDecoration: 'none',
  outline: 'none',
};
const SHOWN = { transform: 'translateY(0)' };

export default function SkipLink({ href = '#main-content', children = 'Skip to main content' }) {
  const [focused, setFocused] = React.useState(false);
  const onClick = (e) => {
    // Move real DOM focus to the target so the next Tab continues from there,
    // not just scroll the hash into view.
    const id = href.replace(/^#/, '');
    const el = typeof document !== 'undefined' && document.getElementById(id);
    if (el) {
      e.preventDefault();
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: false });
      el.scrollIntoView({ block: 'start' });
    }
  };
  return (
    <a
      href={href}
      onClick={onClick}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={focused ? { ...HIDDEN, ...SHOWN } : HIDDEN}
    >
      {children}
    </a>
  );
}
