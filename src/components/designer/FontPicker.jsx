// designer/FontPicker.jsx
// Searchable, category-grouped font picker for the large font library. Each
// option previews in its own typeface. Fonts load lazily: opening the picker
// requests the whole catalog once so previews render, and picking a font also
// ensures it is loaded for the canvas.
//
// ASCII hyphen only anywhere in this file.

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { FONT_CATALOG, FONT_CATEGORIES, FONT_NAMES } from './fontCatalog';
import { loadFonts } from './fonts';

const BORDER = 'var(--border, #e2e8f0)';
const INK = '#0f172a';

export default function FontPicker({ value, onChange, mixed }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    loadFonts(FONT_NAMES); // one batched request so previews paint
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = [];
    for (const cat of FONT_CATEGORIES) {
      const items = FONT_CATALOG.filter((f) => f.category === cat && (!needle || f.name.toLowerCase().includes(needle)));
      if (items.length) out.push([cat, items]);
    }
    return out;
  }, [q]);

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        type="button" onClick={() => setOpen((o) => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          padding: '9px 10px', border: `1.5px solid ${BORDER}`, borderRadius: 8, background: '#fff', cursor: 'pointer' }}
      >
        <span style={{ fontFamily: `"${value}"`, fontSize: 16, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {mixed ? 'Multiple fonts' : value}
        </span>
        <ChevronDown size={16} color="#64748b" />
      </button>

      {open && (
        <div style={{ position: 'absolute', zIndex: 40, top: 'calc(100% + 6px)', left: 0, right: 0,
          background: '#fff', border: `1.5px solid ${BORDER}`, borderRadius: 10, boxShadow: '0 18px 48px rgba(15,23,42,0.22)',
          maxHeight: 360, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderBottom: `1px solid ${BORDER}` }}>
            <Search size={15} color="#64748b" />
            <input
              autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search fonts"
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, fontFamily: 'inherit' }}
            />
          </div>
          <div style={{ overflowY: 'auto' }}>
            {groups.map(([cat, items]) => (
              <div key={cat}>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6, padding: '8px 12px 4px' }}>{cat}</div>
                {items.map((f) => (
                  <button
                    key={f.name} type="button"
                    onClick={() => { onChange(f.name); loadFonts([f.name]); setOpen(false); }}
                    style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: 8, padding: '8px 12px', border: 'none', background: value === f.name ? '#f1f5f9' : '#fff', cursor: 'pointer' }}
                  >
                    <span style={{ fontFamily: `"${f.name}"`, fontSize: 19, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span>
                    {value === f.name && <Check size={15} color={INK} />}
                  </button>
                ))}
              </div>
            ))}
            {!groups.length && <div style={{ padding: 16, fontSize: 13, color: '#64748b' }}>No fonts match "{q}".</div>}
          </div>
        </div>
      )}
    </div>
  );
}
