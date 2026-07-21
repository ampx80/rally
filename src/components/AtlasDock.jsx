// AtlasDock - the always-available "management assistant" slide-in panel.
// Reads the active persona + org chart from lib/org.js and blends in live
// pipeline signals (rep leaderboard, slipping deals) from lib/store.js to
// surface a short, persona-tinted set of insights: who is behind pace, who
// has a wide span of control, whether deals are slipping. Every insight can
// hand off straight to Rook (window CustomEvent 'rally:rook') with a
// pre-filled prompt, or jump to the org chart. Hidden by default; opens on
// window CustomEvent 'rally:atlas' ({ detail: { open: true } }), the same
// pattern RookDock uses for 'rally:rook'. Closes on the X, Escape, or a
// backdrop click. Self-contained: no other file is touched.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './icons.jsx';
import { useOrg, personaById, orgInsights } from '../lib/org.js';
import { useStore, repLeaderboard, slippingDeals } from '../lib/store.js';

function safeCall(fn, fallback) {
  try { return fn(); } catch { return fallback; }
}

const TONE_COLOR = { exec: '#7c3aed', warn: '#b45309', ok: '#047857', info: '#1d4ed8' };

const QUICK_ACTIONS = [
  { label: 'Walk me through my team', prompt: 'Walk me through my team, who is behind pace, and where I should coach this week.' },
  { label: 'Draft a coaching agenda', prompt: 'Draft a short agenda for a pipeline review with the reps who are behind quota.' },
  { label: 'Who should I promote?', prompt: 'Based on my org and performance, who is ready for more responsibility?' },
];

export default function AtlasDock() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const persona = useOrg((s) => s.persona);
  const p = personaById(persona);
  useStore();

  useEffect(() => {
    const onOpen = (e) => { if (e.detail?.open) setOpen(true); };
    window.addEventListener('rally:atlas', onOpen);
    return () => window.removeEventListener('rally:atlas', onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const insights = orgInsights({
    repLeaderboard: safeCall(repLeaderboard, []),
    slipping: safeCall(() => slippingDeals().length, 0),
  });

  const handoff = (prompt) => {
    try { window.dispatchEvent(new CustomEvent('rally:rook', { detail: { open: true, prompt } })); } catch {}
  };

  const goOrgChart = () => {
    navigate('/org');
    setOpen(false);
  };

  return (
    <>
      <div className={`atlas-backdrop${open ? ' is-open' : ''}`} onClick={() => setOpen(false)} aria-hidden={!open} />
      <div className={`atlas-panel${open ? ' is-open' : ''}`} role="dialog" aria-label="Atlas management assistant" style={{ '--c': p.color }}>
        <div className="atlas-head">
          <div className="atlas-orb"><Icon name="sparkles" size={18} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="atlas-title">Atlas</div>
            <div className="atlas-subtitle">Your management guide</div>
          </div>
          <button className="atlas-x" onClick={() => setOpen(false)} aria-label="Close Atlas"><Icon name="x" size={18} /></button>
        </div>

        <div className="atlas-context">Reading your org through the {p.label} lens.</div>

        <div className="atlas-scroll">
          <div className="atlas-insights">
            {insights.map((it, i) => (
              <div key={i} className="atlas-card" style={{ '--tone': TONE_COLOR[it.tone] || TONE_COLOR.info }}>
                <span className="atlas-card__bar" aria-hidden />
                <span className="atlas-card__ic"><Icon name={it.icon} size={16} /></span>
                <div className="atlas-card__body">
                  <div className="atlas-card__title">{it.title}</div>
                  <div className="atlas-card__text">{it.body}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="atlas-quick">
            <div className="atlas-quick__label">Hand it to Rook</div>
            {QUICK_ACTIONS.map((a) => (
              <button key={a.label} className="atlas-btn atlas-btn--ghost" onClick={() => handoff(a.prompt)}>
                <Icon name="arrowUpRight" size={14} />
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <div className="atlas-foot">
          <button className="atlas-btn atlas-btn--primary" onClick={goOrgChart}>
            <Icon name="users" size={15} />
            Open the org chart
          </button>
        </div>
      </div>

      <AtlasStyles />
    </>
  );
}

function AtlasStyles() {
  return (
    <style>{`
    .atlas-backdrop { position: fixed; inset: 0; z-index: 94; background: rgba(4,8,16,.5); opacity: 0; pointer-events: none;
      transition: opacity .28s ease; }
    .atlas-backdrop.is-open { opacity: 1; pointer-events: auto; }

    .atlas-panel { position: fixed; top: 0; right: 0; bottom: 0; z-index: 95; width: 380px; max-width: calc(100vw - 24px);
      display: flex; flex-direction: column;
      background: linear-gradient(165deg, #0f1526 0%, #0b1020 55%, #090c18 100%);
      border-left: 1px solid rgba(255,255,255,.1);
      box-shadow: -30px 0 70px -24px rgba(0,0,0,.6);
      color: #e7e9f5;
      transform: translateX(100%); pointer-events: none;
      transition: transform .28s ease; }
    .atlas-panel.is-open { transform: translateX(0); pointer-events: auto; }

    .atlas-head { display: flex; align-items: center; gap: 12px; padding: 18px 18px 14px; border-bottom: 1px solid rgba(255,255,255,.08); }
    .atlas-orb { width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0; display: grid; place-items: center; color: #fff;
      background: linear-gradient(135deg, var(--c), color-mix(in srgb, var(--c) 55%, #0b1020));
      box-shadow: 0 0 0 1px rgba(255,255,255,.14) inset, 0 6px 18px -6px color-mix(in srgb, var(--c) 70%, transparent); }
    .atlas-title { font-size: 16px; font-weight: 800; letter-spacing: -.01em; color: #fff; }
    .atlas-subtitle { font-size: 12px; color: #9aa3c0; margin-top: 1px; }
    .atlas-x { border: none; background: transparent; color: #b7bede; cursor: pointer; padding: 6px; border-radius: 8px; display: grid; place-items: center; flex-shrink: 0; transition: background .15s, color .15s; }
    .atlas-x:hover { background: rgba(255,255,255,.1); color: #fff; }

    .atlas-context { padding: 12px 18px; font-size: 13px; color: #a9b1d1; border-bottom: 1px solid rgba(255,255,255,.06); }

    .atlas-scroll { flex: 1; overflow-y: auto; padding: 16px 16px 8px; display: flex; flex-direction: column; gap: 20px; }

    .atlas-insights { display: flex; flex-direction: column; gap: 10px; }
    .atlas-card { position: relative; display: flex; gap: 10px; padding: 12px 12px 12px 16px; border-radius: 12px;
      background: linear-gradient(160deg, rgba(255,255,255,.05), rgba(255,255,255,.02));
      border: 1px solid rgba(255,255,255,.08); overflow: hidden;
      transition: transform .18s ease, border-color .18s ease, background .18s ease; }
    .atlas-card:hover { transform: translateY(-2px); border-color: rgba(255,255,255,.16); background: linear-gradient(160deg, rgba(255,255,255,.07), rgba(255,255,255,.03)); }
    .atlas-card__bar { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--tone); }
    .atlas-card__ic { flex-shrink: 0; width: 26px; height: 26px; border-radius: 8px; display: grid; place-items: center;
      color: var(--tone); background: color-mix(in srgb, var(--tone) 20%, transparent); margin-top: 1px; }
    .atlas-card__body { min-width: 0; }
    .atlas-card__title { font-size: 13.5px; font-weight: 700; color: #f2f4ff; line-height: 1.35; }
    .atlas-card__text { font-size: 12.5px; color: #9aa3c0; line-height: 1.45; margin-top: 3px; }

    .atlas-quick { display: flex; flex-direction: column; gap: 8px; }
    .atlas-quick__label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; color: #7c86ac; padding: 0 2px 2px; }

    .atlas-btn { font-family: inherit; font-size: 13.5px; font-weight: 700; cursor: pointer; border-radius: 10px;
      display: flex; align-items: center; gap: 8px; padding: 10px 13px; text-align: left; transition: transform .15s ease, filter .15s ease, border-color .15s ease; }
    .atlas-btn--ghost { background: rgba(255,255,255,.03); color: #d7dbf0; border: 1px solid rgba(255,255,255,.14); }
    .atlas-btn--ghost:hover { border-color: var(--c); color: #fff; transform: translateY(-1px); }
    .atlas-btn--primary { width: 100%; justify-content: center; color: #fff; border: none;
      background: linear-gradient(100deg, #0ea5a3, var(--c) 70%, #7c5cf7);
      box-shadow: 0 8px 22px -8px color-mix(in srgb, var(--c) 60%, transparent); }
    .atlas-btn--primary:hover { filter: brightness(1.12); transform: translateY(-1px); }

    .atlas-foot { padding: 14px 16px 18px; border-top: 1px solid rgba(255,255,255,.08); }

    @media (prefers-reduced-motion: reduce) {
      .atlas-panel, .atlas-backdrop, .atlas-card, .atlas-btn { transition: none !important; }
      .atlas-card:hover, .atlas-btn:hover { transform: none !important; }
    }
    `}</style>
  );
}
