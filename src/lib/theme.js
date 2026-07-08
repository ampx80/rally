// Theme controller. Persists light/dark to localStorage and reflects it on
// <html data-theme>. One toggle re-skins the whole product.
import { useEffect, useState } from 'react';

const KEY = 'rally_theme';
const subs = new Set();
let theme = read();

function read() {
  try { const t = localStorage.getItem(KEY); if (t === 'dark' || t === 'light') return t; } catch {}
  return 'light';
}
export function applyTheme(t = theme) {
  theme = t;
  if (typeof document !== 'undefined') document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem(KEY, t); } catch {}
  subs.forEach(fn => fn(t));
}
export function toggleTheme() { applyTheme(theme === 'dark' ? 'light' : 'dark'); }
export function getTheme() { return theme; }
export function useTheme() {
  const [t, setT] = useState(theme);
  useEffect(() => { const fn = (x) => setT(x); subs.add(fn); return () => subs.delete(fn); }, []);
  return t;
}
