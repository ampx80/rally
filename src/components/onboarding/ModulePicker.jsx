// Module selection step. Reads the real module registry (src/lib/modules.js)
// and toggles modules live, so choices made here immediately shape the left
// nav. The CRM spine is always on and shown as a locked, pre-checked base.
// Grouped by section for scanability. NO em-dash / en-dash.
import React from 'react';
import { Icon } from '../icons.jsx';
import { MODULES, useModules, setModule, isModuleOn } from '../../lib/modules.js';

const SECTION_ICON = {
  Sell: 'target', Marketing: 'megaphone', Deliver: 'grid',
  Service: 'inbox', Revenue: 'dollar', Intelligence: 'chart',
  Automate: 'workflow', Admin: 'settings',
};

const CORE = [
  { label: 'Command center', icon: 'home' },
  { label: 'Deals', icon: 'target' },
  { label: 'Contacts', icon: 'users' },
  { label: 'Companies', icon: 'building' },
  { label: 'My day', icon: 'activity' },
];

export default function ModulePicker() {
  useModules(); // re-render on toggle
  const sections = [];
  for (const m of MODULES) {
    let s = sections.find(x => x.name === m.section);
    if (!s) { s = { name: m.section, items: [] }; sections.push(s); }
    s.items.push(m);
  }

  return (
    <div className="col gap-3" style={{ marginTop: '1.2rem' }}>
      {/* Always-on spine */}
      <div>
        <div className="eyebrow" style={{ marginBottom: '.6rem' }}>Always included</div>
        <div className="row gap-2 wrap">
          {CORE.map(c => (
            <span key={c.label} className="row gap-2" style={{
              padding: '.45rem .75rem', borderRadius: 999, background: 'var(--ok-bg)', color: 'var(--ok)',
              fontWeight: 600, fontSize: '.86rem',
            }}>
              <Icon name={c.icon} size={14} /> {c.label}
            </span>
          ))}
        </div>
      </div>

      {sections.map(sec => (
        <div key={sec.name}>
          <div className="row gap-2" style={{ marginBottom: '.6rem', alignItems: 'center' }}>
            <span className="row center" style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--accent-50)', color: 'var(--accent-600)', flex: 'none' }}>
              <Icon name={SECTION_ICON[sec.name] || 'grid'} size={13} />
            </span>
            <span className="fw-7" style={{ fontSize: '.92rem' }}>{sec.name}</span>
          </div>
          <div className="ob-grid cols-2" style={{ marginTop: 0 }}>
            {sec.items.map(m => {
              const on = isModuleOn(m.key);
              return (
                <button key={m.key} type="button" onClick={() => setModule(m.key, !on)}
                  className={`ob-opt${on ? ' on' : ''}`} aria-pressed={on}>
                  <span className="ob-opt-check"><Icon name="check" size={13} stroke={3} /></span>
                  <span className="fw-7" style={{ fontSize: '.98rem', paddingRight: 22 }}>{m.label}</span>
                  <span className="t-sm muted" style={{ lineHeight: 1.35 }}>{m.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
