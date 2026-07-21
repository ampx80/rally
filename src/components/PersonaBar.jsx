// PersonaBar - the chrome control that runs the persona experience. A colored
// pill in the top bar shows the active persona; the dropdown switches persona,
// toggles Focus mode (scopes the daily nav to that role) vs Full (the whole
// system), jumps to the persona's view, and opens the Atlas management guide.
// Color follows the rank spine. NO em-dash / en-dash. ASCII hyphen only.
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './icons.jsx';
import { PERSONAS, personaById, useOrg, setPersona, setScoped } from '../lib/org.js';

export default function PersonaBar() {
  const persona = useOrg((s) => s.persona);
  const scoped = useOrg((s) => s.scoped);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const nav = useNavigate();
  const p = personaById(persona);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const pick = (id) => { setPersona(id); setScoped(true); setOpen(false); };
  const openAtlas = () => { try { window.dispatchEvent(new CustomEvent('rally:atlas', { detail: { open: true } })); } catch {} setOpen(false); };
  const goView = () => { nav('/org'); setOpen(false); };

  return (
    <div className="pbar" ref={ref}>
      <button className="pbar-pill hide-520" style={{ '--c': p.color }} onClick={() => setOpen(o => !o)} title="Persona view">
        <span className="pbar-dot" />
        <Icon name={p.icon} size={14} />
        <span className="pbar-label">{p.label}</span>
        {scoped && <span className="pbar-focus">Focus</span>}
        <Icon name="chevronDown" size={13} />
      </button>

      {open && (
        <div className="pbar-menu">
          <div className="pbar-head">View the system as</div>
          <div className="pbar-grid">
            {PERSONAS.map(pp => (
              <button key={pp.id} className={`pbar-opt ${persona === pp.id ? 'on' : ''}`} style={{ '--c': pp.color }} onClick={() => pick(pp.id)}>
                <span className="pbar-opt-ic"><Icon name={pp.icon} size={15} /></span>
                <span className="pbar-opt-l">{pp.label}</span>
                {persona === pp.id && <Icon name="check" size={14} />}
              </button>
            ))}
          </div>
          <div className="pbar-scope">
            <span className="t-sm" style={{ color: 'var(--ink)', fontWeight: 700 }}>Focus mode</span>
            <button className={`pbar-toggle ${scoped ? 'on' : ''}`} onClick={() => setScoped(!scoped)} aria-pressed={scoped}>
              <span className="pbar-knob" />
            </button>
          </div>
          <div className="pbar-hint">{scoped ? 'Your daily nav is scoped to this role. The Apps grid still has everything.' : 'You see the whole system. Turn Focus on for a curated, role-first workspace.'}</div>
          <div className="pbar-actions">
            <button className="pbar-act primary" onClick={goView}><Icon name="target" size={14} /> Open my view</button>
            <button className="pbar-act" onClick={openAtlas}><Icon name="sparkles" size={14} /> Ask Atlas</button>
          </div>
        </div>
      )}

      <style>{`
      .pbar { position: relative; }
      .pbar-pill { display: inline-flex; align-items: center; gap: 7px; font-family: inherit; font-size: 13px; font-weight: 700; color: var(--ink); background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-sm, 8px); padding: .5rem .7rem; cursor: pointer; transition: border-color .15s, box-shadow .15s; }
      .pbar-pill:hover { border-color: var(--c); box-shadow: 0 0 0 2px color-mix(in srgb, var(--c) 18%, transparent); }
      .pbar-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--c); box-shadow: 0 0 8px var(--c); flex: none; }
      .pbar-pill svg:first-of-type { color: var(--c); }
      .pbar-label { white-space: nowrap; }
      .pbar-focus { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border-radius: 999px; padding: 1px 7px; }
      .pbar-menu { position: absolute; top: calc(100% + 8px); right: 0; z-index: 60; width: 288px; background: var(--paper); border: 1px solid var(--line); border-radius: 14px; padding: 12px; box-shadow: 0 26px 70px -30px rgba(10,16,30,.6); animation: pbarIn .16s ease both; }
      @keyframes pbarIn { 0% { opacity: 0; transform: translateY(-6px); } 100% { opacity: 1; transform: none; } }
      .pbar-head { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); margin-bottom: 8px; }
      .pbar-grid { display: flex; flex-direction: column; gap: 4px; }
      .pbar-opt { display: flex; align-items: center; gap: 9px; width: 100%; text-align: left; font-family: inherit; font-size: 13.5px; font-weight: 600; color: var(--ink); background: transparent; border: 1px solid transparent; border-radius: 9px; padding: 8px 9px; cursor: pointer; transition: all .14s; }
      .pbar-opt:hover { background: var(--page); }
      .pbar-opt.on { border-color: color-mix(in srgb, var(--c) 40%, transparent); background: color-mix(in srgb, var(--c) 8%, transparent); }
      .pbar-opt.on svg:last-child { color: var(--c); margin-left: auto; }
      .pbar-opt-ic { width: 26px; height: 26px; flex: none; border-radius: 7px; display: grid; place-items: center; color: #fff; background: var(--c); }
      .pbar-opt-l { flex: 1; }
      .pbar-scope { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--line); }
      .pbar-toggle { position: relative; width: 42px; height: 24px; flex: none; border-radius: 999px; border: none; background: var(--line-strong, #d0d6de); cursor: pointer; transition: background .2s; }
      .pbar-toggle.on { background: var(--accent); }
      .pbar-knob { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: left .2s; box-shadow: 0 1px 3px rgba(0,0,0,.3); }
      .pbar-toggle.on .pbar-knob { left: 21px; }
      .pbar-hint { font-size: 11.5px; line-height: 1.5; color: var(--muted); margin-top: 8px; }
      .pbar-actions { display: flex; gap: 6px; margin-top: 12px; }
      .pbar-act { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; font-family: inherit; font-size: 12.5px; font-weight: 700; color: var(--ink); background: var(--page); border: 1px solid var(--line); border-radius: 9px; padding: 8px; cursor: pointer; transition: all .15s; }
      .pbar-act:hover { border-color: var(--accent); color: var(--accent); }
      .pbar-act.primary { color: #fff; background: linear-gradient(100deg, #7c3aed, #4338ca); border-color: transparent; }
      .pbar-act.primary:hover { color: #fff; filter: brightness(1.08); }
      @media (prefers-reduced-motion: reduce) { .pbar-menu { animation: none; } }
      `}</style>
    </div>
  );
}
