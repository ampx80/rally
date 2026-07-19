// RecentPagesDock - bottom-left quick-nav. Remembers recent pages, lets you
// pin the ones you live on. Local-first (src/lib/recent-pages.js), no backend.
// Stacked above the Help widget (also bottom-left) so they never overlap, and
// clear of Rook (bottom-right). Ported from The Way HQ's PageDock.
// NO em-dash / en-dash. ASCII hyphen only.
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from './icons.jsx';
import {
  useRecentPages, recordVisit, togglePin, isPinned, setOpen,
} from '../lib/recent-pages.js';

const ROUTE_LABELS = {
  '/app': 'Command Center', '/deals': 'Deals', '/leads': 'Leads', '/contacts': 'Contacts',
  '/companies': 'Companies', '/activities': 'My Day', '/forecasting': 'Forecasting',
  '/campaigns': 'Campaigns', '/sequences': 'Sequences', '/projects': 'Projects', '/inbox': 'Inbox',
  '/products': 'Products', '/quotes': 'Quotes', '/invoices': 'Billing', '/studio': 'Studio',
  '/dashboards': 'Dashboards', '/reports': 'Reports', '/workflows': 'Workflows',
  '/integrations': 'Integrations', '/team': 'Team', '/settings': 'Settings', '/warroom': 'War Room',
  '/intelligence': 'Intelligence', '/signals': 'Signals', '/twin': 'Revenue Twin', '/autopilot': 'Autopilot',
  '/night-shift': 'Night Shift', '/fork': 'Pipeline Fork', '/ghost-deals': 'Ghost Deals', '/film': 'Deal Film',
  '/wind-tunnel': 'Wind Tunnel', '/canvas': 'Ask Canvas', '/qualify': 'Pre-qualification',
  '/migrate': 'Migration Wizard', '/training': 'Training', '/import': 'Import', '/scheduler': 'Scheduler',
  '/liftoff': 'Liftoff', '/genesis': 'Genesis', '/attribution': 'Attribution',
  '/handshake': 'Handshake', '/boardroom': 'The Boardroom', '/agent-cloud': 'Agent Cloud',
};

function prettify(seg) { return seg.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }

// Read the live page heading for detail routes (/deals/:id etc).
function headingLabel(fallback) {
  const h = typeof document !== 'undefined' && document.querySelector('.rl-content h1, .page h1, main h1');
  const t = h && h.textContent && h.textContent.trim();
  return t && t.length < 48 ? t : fallback;
}

function labelFor(path) {
  if (ROUTE_LABELS[path]) return ROUTE_LABELS[path];
  if (/^\/(deals|contacts|companies|quotes|workspaces|studio)\/[^/]+$/.test(path)) {
    const base = prettify(path.split('/')[1]).replace(/s$/, '');
    return headingLabel(base);
  }
  const seg = path.split('/').filter(Boolean).pop() || 'Page';
  return prettify(seg);
}

export default function RecentPagesDock() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { recent, pinned, open } = useRecentPages();

  // Record every product-route visit, deferred a tick so the destination
  // heading has rendered and labelFor can read a real record name.
  useEffect(() => {
    const path = loc.pathname;
    const t = setTimeout(() => recordVisit(path, labelFor(path)), 350);
    return () => clearTimeout(t);
  }, [loc.pathname]);

  const goTo = (path) => { setOpen(false); navigate(path); };
  const recents = recent.filter(p => p.path !== loc.pathname).slice(0, 3);
  const hasAnything = recents.length > 0 || pinned.length > 0;

  if (!open) {
    if (!hasAnything) return null; // no clutter on a fresh screen
    return (
      <>
        <button className="rpd-tab" onClick={() => setOpen(true)} aria-label="Recent pages" title="Recent pages">
          <Icon name="history" size={16} />
          <span className="rpd-tab__txt">Recent</span>
          {recents[0] && <span className="rpd-tab__chip">{recents[0].label}</span>}
        </button>
        <RecentPagesDockStyles />
      </>
    );
  }

  return (
    <>
      <div className="rpd-panel" role="dialog" aria-label="Page history">
        <div className="rpd-head">
          <span className="rpd-head__title"><Icon name="history" size={15} /> Jump back</span>
          <button className="rpd-icon" onClick={() => setOpen(false)} aria-label="Minimize" title="Minimize"><Icon name="chevronDown" size={16} /></button>
        </div>

        {!hasAnything && <div className="rpd-empty">Move around Ardovo and your recent pages show up here.</div>}

        {pinned.length > 0 && (
          <div className="rpd-group">
            <div className="rpd-group__label">Pinned</div>
            {pinned.map(p => (
              <div key={p.path} className="rpd-row">
                <button className="rpd-row__go" onClick={() => goTo(p.path)}>
                  <Icon name="pin" size={13} className="rpd-row__lead rpd-row__lead--pin" />
                  <span className="rpd-row__label">{p.label}</span>
                  <Icon name="arrowUpRight" size={13} className="rpd-row__arrow" />
                </button>
                <button className="rpd-pin is-on" onClick={() => togglePin(p)} title="Unpin" aria-label="Unpin"><Icon name="pinOff" size={13} /></button>
              </div>
            ))}
          </div>
        )}

        {recents.length > 0 && (
          <div className="rpd-group">
            <div className="rpd-group__label">Recent</div>
            {recents.map(p => (
              <div key={p.path} className="rpd-row">
                <button className="rpd-row__go" onClick={() => goTo(p.path)}>
                  <span className="rpd-row__lead" />
                  <span className="rpd-row__label">{p.label}</span>
                  <Icon name="arrowUpRight" size={13} className="rpd-row__arrow" />
                </button>
                <button className={`rpd-pin${isPinned(p.path) ? ' is-on' : ''}`} onClick={() => togglePin(p)} title={isPinned(p.path) ? 'Unpin' : 'Pin'} aria-label="Pin"><Icon name="pin" size={13} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
      <RecentPagesDockStyles />
    </>
  );
}

function RecentPagesDockStyles() {
  return (
    <style>{`
    .rpd-tab { position: fixed; left: 24px; bottom: 84px; z-index: 54; display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 13px; border-radius: 999px; border: 1px solid var(--line); background: var(--paper); color: var(--ink); font-family: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; box-shadow: var(--shadow-md); transition: transform .15s, box-shadow .15s, border-color .15s; }
    .rpd-tab:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); border-color: var(--line-strong); }
    .rpd-tab__chip { max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; font-weight: 600; color: var(--accent-600); background: var(--accent-50); padding: 3px 9px; border-radius: 999px; }
    @media (max-width: 720px) { .rpd-tab { left: 16px; bottom: 74px; } .rpd-tab__txt { display: none; } }

    .rpd-panel { position: fixed; left: 24px; bottom: 84px; z-index: 54; width: 284px; max-width: calc(100vw - 40px); background: var(--paper); border: 1px solid var(--line); border-radius: 16px; box-shadow: var(--shadow-lg); overflow: hidden; animation: rpd-in .2s cubic-bezier(.22,1,.36,1); }
    @media (max-width: 720px) { .rpd-panel { left: 16px; bottom: 74px; } }
    @keyframes rpd-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
    .rpd-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid var(--line); }
    .rpd-head__title { display: inline-flex; align-items: center; gap: 7px; font-size: 14px; font-weight: 800; color: var(--ink); }
    .rpd-icon { border: none; background: transparent; color: var(--n-600); cursor: pointer; padding: 4px; border-radius: 7px; display: grid; place-items: center; }
    .rpd-icon:hover { background: var(--n-100); color: var(--ink); }
    .rpd-empty { padding: 18px 16px; font-size: 13.5px; color: var(--n-400); line-height: 1.5; }
    .rpd-group { padding: 10px 10px 4px; }
    .rpd-group__label { font-size: 11.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--n-400); padding: 0 6px 6px; }
    .rpd-row { display: flex; align-items: center; gap: 4px; margin-bottom: 4px; }
    .rpd-row__go { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; text-align: left; font-family: inherit; font-size: 14px; font-weight: 500; color: var(--ink); background: transparent; border: 1px solid transparent; border-radius: 9px; padding: 8px 10px; cursor: pointer; transition: background .13s, border-color .13s; }
    .rpd-row__go:hover { background: var(--accent-50); border-color: var(--accent); }
    .rpd-row__lead { width: 6px; height: 6px; border-radius: 999px; background: var(--n-400); flex-shrink: 0; }
    .rpd-row__lead--pin { width: auto; height: auto; background: none; color: var(--accent-600); }
    .rpd-row__label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .rpd-row__arrow { color: var(--n-400); flex-shrink: 0; opacity: 0; transition: opacity .13s; }
    .rpd-row__go:hover .rpd-row__arrow { opacity: 1; }
    .rpd-pin { border: none; background: transparent; color: var(--n-400); cursor: pointer; padding: 7px; border-radius: 8px; display: grid; place-items: center; flex-shrink: 0; }
    .rpd-pin:hover { background: var(--n-100); color: var(--n-600); }
    .rpd-pin.is-on { color: var(--accent-600); }
    @media (prefers-reduced-motion: reduce) { .rpd-panel { animation: none; } .rpd-tab { transition: none; } }
    `}</style>
  );
}
