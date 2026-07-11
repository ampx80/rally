// ============================================================
// HelpWidget - a floating in-app help launcher.
// Docked bottom-LEFT so it never collides with RookDock (bottom-
// right). Opens a compact panel that searches the Help Center
// content, links to full articles, and offers a "message us"
// mailto. Self-contained (styles injected once), dark/light +
// reduced-motion aware. NO em-dash / en-dash.
// ============================================================
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './icons.jsx';
import { searchArticles, ARTICLES } from '../marketing/help/help-data.js';

const SUPPORT_EMAIL = 'support@rally.com';

// A short default list shown before the user types anything.
const SUGGESTED = ['getting-started-rally', 'import-csv', 'meet-rook', 'build-a-quote', 'workflow-basics'];

export default function HelpWidget() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  const needle = q.trim();
  const results = useMemo(() => {
    if (needle) return searchArticles(needle, 6);
    return SUGGESTED.map(s => ARTICLES.find(a => a.slug === s)).filter(Boolean);
  }, [needle]);

  // Focus the search field when the panel opens.
  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

  // Close on Escape; close on outside click.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onClick = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    window.addEventListener('keydown', onKey);
    // Delay the outside-click listener so the opening click does not close it.
    const t = setTimeout(() => document.addEventListener('mousedown', onClick), 0);
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(t); document.removeEventListener('mousedown', onClick); };
  }, [open]);

  const mailHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Rally support request')}`;

  return (
    <>
      <style>{HELP_CSS}</style>

      {open && (
        <div className="help-panel" ref={panelRef} role="dialog" aria-label="Help">
          <div className="help-head">
            <span className="help-head__mark"><Icon name="fileText" size={18} /></span>
            <span className="help-head__title">Help</span>
            <button className="help-head__x" onClick={() => setOpen(false)} aria-label="Close help">
              <Icon name="x" size={18} />
            </button>
          </div>

          <div className="help-search">
            <span className="help-search__ic"><Icon name="search" size={16} /></span>
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search help articles..."
              aria-label="Search help articles"
            />
          </div>

          <div className="help-body">
            {!needle && <div className="help-hint">Suggested articles</div>}
            {needle && results.length === 0 && (
              <div className="help-empty">
                No articles matched. Try a feature name, or message us below.
              </div>
            )}
            {results.map((a) => (
              <Link key={a.slug} to={`/help/${a.slug}`} className="help-item" onClick={() => setOpen(false)}>
                <span className="help-item__ic"><Icon name="fileText" size={15} /></span>
                <span className="help-item__text">
                  <span className="help-item__title">{a.title}</span>
                  <span className="help-item__cat">{a.category}</span>
                </span>
                <span className="help-item__arw"><Icon name="chevronRight" size={15} /></span>
              </Link>
            ))}
          </div>

          <div className="help-foot">
            <Link to="/help" className="help-foot__link" onClick={() => setOpen(false)}>
              <Icon name="grid" size={15} /> Browse all articles
            </Link>
            <a href={mailHref} className="help-foot__msg">
              <Icon name="mail" size={15} /> Message us
            </a>
          </div>
        </div>
      )}

      <button
        className={`help-fab${open ? ' is-open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close help' : 'Open help'}
        aria-expanded={open}
        title="Help"
      >
        <Icon name={open ? 'x' : 'command'} size={22} />
      </button>
    </>
  );
}

// The glyph above uses 'command' as a neutral "?" style mark; swapped for 'x'
// when open. Styles below are scoped with the help- prefix and use product
// theme tokens so they follow light/dark automatically.
const HELP_CSS = `
.help-fab {
  position: fixed; left: 24px; bottom: 24px; z-index: 55;
  width: 52px; height: 52px; border-radius: 50%; border: none; cursor: pointer;
  display: grid; place-items: center; color: #fff;
  background: linear-gradient(135deg, #3d31c2, #5b4bf5 60%, #7c5cf7);
  box-shadow: 0 12px 30px -8px rgba(91,75,245,.55), 0 2px 6px rgba(16,20,30,.2);
  transition: transform .18s cubic-bezier(.22,1,.36,1), box-shadow .2s;
}
.help-fab:hover { transform: translateY(-3px) scale(1.05); box-shadow: 0 18px 40px -8px rgba(91,75,245,.6); }
.help-fab.is-open { background: #3d31c2; }
.help-fab:focus-visible { outline: 3px solid var(--accent-300, #a99ff9); outline-offset: 2px; }

.help-panel {
  position: fixed; left: 24px; bottom: 88px; z-index: 55;
  width: min(380px, calc(100vw - 32px)); max-height: min(560px, calc(100vh - 130px));
  display: flex; flex-direction: column; overflow: hidden;
  background: var(--paper, #fff); color: var(--ink, #0e1116);
  border: 1px solid var(--line, #e7e9ee); border-radius: 16px;
  box-shadow: 0 30px 70px -24px rgba(16,20,30,.5), 0 0 0 1px rgba(0,0,0,.02);
  transform-origin: bottom left; animation: help-in .24s cubic-bezier(.22,1,.36,1);
}
@keyframes help-in { from { opacity: 0; transform: translateY(10px) scale(.97); } to { opacity: 1; transform: none; } }

.help-head { display: flex; align-items: center; gap: 10px; padding: 13px 15px; color: #fff;
  background: linear-gradient(120deg, #3d31c2, #5b4bf5 60%, #7c5cf7); }
.help-head__mark { width: 30px; height: 30px; border-radius: 9px; background: rgba(255,255,255,.16); display: grid; place-items: center; flex: none; }
.help-head__title { font-weight: 800; font-size: 15.5px; letter-spacing: -.01em; }
.help-head__x { margin-left: auto; background: rgba(255,255,255,.14); border: none; color: #fff; width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; cursor: pointer; transition: background .15s; }
.help-head__x:hover { background: rgba(255,255,255,.26); }

.help-search { display: flex; align-items: center; gap: 9px; padding: 11px 14px; border-bottom: 1px solid var(--line, #e7e9ee); }
.help-search__ic { color: var(--n-600, #6b7280); display: grid; place-items: center; flex: none; }
.help-search input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font-family: inherit; font-size: 14.5px; color: var(--ink, #0e1116); }
.help-search input::placeholder { color: var(--n-600, #9098a5); }

.help-body { flex: 1; overflow-y: auto; padding: 8px; }
.help-hint { font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: var(--n-600, #9098a5); padding: 8px 8px 6px; }
.help-empty { padding: 16px 10px; font-size: 13.5px; line-height: 1.5; color: var(--ink-2, #3a4150); }

.help-item { display: flex; align-items: center; gap: 11px; padding: 10px 10px; border-radius: 10px; text-decoration: none; color: inherit; transition: background .13s; }
.help-item:hover { background: var(--n-100, #f0f2f5); }
.help-item__ic { flex: none; width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; color: var(--accent, #5b4bf5); background: var(--accent-50, #eeecfe); }
.help-item__text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.help-item__title { font-size: 14px; font-weight: 600; color: var(--ink, #0e1116); line-height: 1.3; }
.help-item__cat { font-size: 11.5px; color: var(--n-600, #9098a5); font-weight: 600; }
.help-item__arw { flex: none; color: var(--n-600, #9098a5); }

.help-foot { display: flex; gap: 8px; padding: 11px 12px; border-top: 1px solid var(--line, #e7e9ee); background: var(--n-50, #f7f8fa); }
.help-foot__link, .help-foot__msg { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 9px 10px; border-radius: 9px; font-size: 13px; font-weight: 700; text-decoration: none; cursor: pointer; transition: filter .15s, transform .15s, background .15s; }
.help-foot__link { color: var(--ink, #0e1116); background: var(--paper, #fff); border: 1px solid var(--line-strong, #d4d8e0); }
.help-foot__link:hover { background: var(--n-100, #f0f2f5); }
.help-foot__msg { color: #fff; background: var(--accent, #5b4bf5); border: 1px solid var(--accent, #5b4bf5); }
.help-foot__msg:hover { filter: brightness(1.08); transform: translateY(-1px); }

@media (max-width: 640px) {
  .help-fab { left: 16px; bottom: 16px; width: 48px; height: 48px; }
  .help-panel { left: 16px; right: 16px; bottom: 76px; width: auto; }
}
@media (prefers-reduced-motion: reduce) {
  .help-panel { animation: none; }
  .help-fab { transition: none; }
  .help-fab:hover { transform: none; }
}
`;
