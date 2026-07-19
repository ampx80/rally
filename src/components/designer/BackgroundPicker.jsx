// designer/BackgroundPicker.jsx
// Searchable, category-tabbed picker for the large background theme library.
// Each swatch is the real SVG theme rendered small, so what you see is what you
// get. Selecting a theme sets a { type:'theme', key, opacity, tint } background;
// opacity and tint are edited below the grid.
//
// ASCII hyphen only anywhere in this file.

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { BG_CATEGORIES, BG_THEMES, themeDataUrl } from './backgrounds';

const BORDER = 'var(--border, #e2e8f0)';
const INK = '#0f172a';
const label = { fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, margin: '2px 0 6px' };

export default function BackgroundPicker({ background, onChange }) {
  const [cat, setCat] = useState('All');
  const [q, setQ] = useState('');
  const activeKey = background?.type === 'theme' ? background.key : null;

  const cats = ['All', ...BG_CATEGORIES];
  const themes = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return BG_THEMES.filter((t) =>
      (cat === 'All' || t.category === cat) &&
      (!needle || t.label.toLowerCase().includes(needle) || t.category.toLowerCase().includes(needle)));
  }, [cat, q]);

  const pick = (theme) => {
    const prev = background?.type === 'theme' ? background : {};
    onChange({ type: 'theme', key: theme.key, opacity: prev.opacity ?? 1, tint: prev.tint || { color: '#000000', alpha: 0 } });
  };

  const setOpacity = (v) => onChange({ ...background, opacity: v });
  const setTint = (patch) => onChange({ ...background, tint: { ...(background.tint || { color: '#000000', alpha: 0 }), ...patch } });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px', border: `1.5px solid ${BORDER}`, borderRadius: 8, marginBottom: 8 }}>
        <Search size={15} color="#64748b" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search backgrounds"
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13.5, fontFamily: 'inherit' }} />
      </div>

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 8 }}>
        {cats.map((c) => (
          <button key={c} type="button" onClick={() => setCat(c)}
            style={{ whiteSpace: 'nowrap', padding: '5px 10px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
              border: `1.5px solid ${cat === c ? INK : BORDER}`, background: cat === c ? INK : '#fff', color: cat === c ? '#fff' : '#475569' }}>
            {c}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, maxHeight: 268, overflowY: 'auto' }}>
        {themes.map((t) => (
          <button key={t.key} type="button" title={t.label} onClick={() => pick(t)}
            style={{ height: 62, borderRadius: 8, cursor: 'pointer', padding: 0, overflow: 'hidden',
              border: `2px solid ${activeKey === t.key ? '#5b4bf5' : BORDER}` }}>
            <img alt={t.label} src={themeDataUrl(t, 96, 120)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </button>
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 6 }}>{themes.length} themes</div>

      {activeKey && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
          <div style={label}>Graphic strength</div>
          <input type="range" min={0.15} max={1} step={0.05} value={background.opacity ?? 1}
            onChange={(e) => setOpacity(+e.target.value)} style={{ width: '100%', accentColor: INK }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <span style={{ ...label, margin: 0 }}>Tint</span>
            <input type="color" value={background.tint?.color || '#000000'} onChange={(e) => setTint({ color: e.target.value })}
              style={{ width: 40, height: 30, border: `1.5px solid ${BORDER}`, borderRadius: 8, cursor: 'pointer', background: '#fff' }} />
            <input type="range" min={0} max={0.7} step={0.05} value={background.tint?.alpha || 0}
              onChange={(e) => setTint({ alpha: +e.target.value })} style={{ flex: 1, accentColor: INK }} />
          </div>
        </div>
      )}
    </div>
  );
}
