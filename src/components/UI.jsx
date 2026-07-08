// Rally shared UI primitives. Every page composes from here so the whole
// product feels like one surface. Keep prop shapes stable.
import React, { useEffect, useRef } from 'react';

/* ---------- Button ----------
   variant: 'primary' | 'accent' | 'ghost' | 'quiet' | 'danger'   size: 'sm'|'md'|'lg' */
export function Button({ variant = 'primary', size = 'md', as: As = 'button', className = '', children, ...rest }) {
  const cls = ['btn', `btn-${variant}`, size !== 'md' ? `btn-${size}` : '', className].filter(Boolean).join(' ');
  return <As className={cls} {...rest}>{children}</As>;
}

/* ---------- Card ---------- */
export function Card({ pad = true, hover = false, className = '', children, ...rest }) {
  const cls = ['card', pad ? 'card-pad' : '', hover ? 'card-hover' : '', className].filter(Boolean).join(' ');
  return <div className={cls} {...rest}>{children}</div>;
}

/* ---------- Stat ---------- */
export function Stat({ value, label, sub, trend, icon, onClick }) {
  const trendColor = trend == null ? '' : trend >= 0 ? 'var(--ok)' : 'var(--risk)';
  return (
    <div className="col gap-1" onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>
      {icon && <div style={{ color: 'var(--accent-600)', marginBottom: 2 }}>{icon}</div>}
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub != null && <div className="t-sm muted">{sub}</div>}
      {trend != null && (
        <div className="t-sm fw-6" style={{ color: trendColor }}>
          {trend >= 0 ? '+' : ''}{trend}% vs last period
        </div>
      )}
    </div>
  );
}

/* ---------- Badge ----------  tone: default|ok|warn|risk|info|accent */
export function Badge({ tone = 'default', children, className = '', style }) {
  const cls = ['badge', tone !== 'default' ? `badge-${tone}` : '', className].filter(Boolean).join(' ');
  return <span className={cls} style={style}>{children}</span>;
}

/* ---------- Avatar ---------- deterministic color from name ---------- */
const AV_COLORS = ['#5b4bf5', '#0ea5a3', '#e0752d', '#c0392b', '#2563a8', '#8b3fd4', '#1a7f52', '#d4a017'];
export function avatarColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AV_COLORS[Math.abs(h) % AV_COLORS.length];
}
export function Avatar({ name = '', src, size = 38, color }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.4, background: color || avatarColor(name) }}>
      {src ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (initials || '?')}
    </span>
  );
}

/* ---------- SectionHeader ---------- */
export function SectionHeader({ title, sub, action, eyebrow }) {
  return (
    <div className="section-head">
      <div className="col gap-1" style={{ minWidth: 0 }}>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h3 style={{ margin: 0 }}>{title}</h3>
        {sub && <div className="muted t-sm">{sub}</div>}
      </div>
      {action && <div className="row gap-1" style={{ flex: 'none' }}>{action}</div>}
    </div>
  );
}

/* ---------- Field / Input / Select / Textarea ---------- */
export function Field({ label, hint, children }) {
  return (
    <div className="field">
      {label && <label>{label}</label>}
      {children}
      {hint && <span className="t-xs muted">{hint}</span>}
    </div>
  );
}
export const Input = (p) => <input className="input" {...p} />;
export const Select = ({ children, ...p }) => <select className="select" {...p}>{children}</select>;
export const Textarea = (p) => <textarea className="textarea" rows={4} {...p} />;

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, children, footer, width = 560 }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(16,20,30,.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div onClick={(e) => e.stopPropagation()} className="fade-up" style={{ width: '100%', maxWidth: width, background: 'var(--paper)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-lg)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {title && (
          <div className="row between" style={{ padding: '1.15rem 1.4rem', borderBottom: '1px solid var(--line)' }}>
            <h4 style={{ margin: 0 }}>{title}</h4>
            <button onClick={onClose} className="btn btn-quiet" aria-label="Close" style={{ fontSize: '1.3rem', padding: '.1rem .5rem', lineHeight: 1 }}>&times;</button>
          </div>
        )}
        <div style={{ padding: '1.4rem', overflowY: 'auto' }}>{children}</div>
        {footer && <div className="row gap-2" style={{ padding: '1rem 1.4rem', borderTop: '1px solid var(--line)', justifyContent: 'flex-end' }}>{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- EmptyState ---------- */
export function EmptyState({ icon = '✨', title, body, action }) {
  return (
    <div className="col center gap-2" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
      <div style={{ fontSize: '2.2rem' }}>{icon}</div>
      <h4 style={{ margin: 0 }}>{title}</h4>
      {body && <div className="muted" style={{ maxWidth: 420 }}>{body}</div>}
      {action && <div style={{ marginTop: 4 }}>{action}</div>}
    </div>
  );
}

/* ---------- Tabs ---------- */
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="row gap-1 wrap" style={{ borderBottom: '1px solid var(--line)', marginBottom: '1.15rem' }}>
      {tabs.map(t => {
        const on = t.key === active;
        return (
          <button key={t.key} onClick={() => onChange(t.key)} className="btn btn-quiet"
            style={{ borderRadius: 0, borderBottom: on ? '2px solid var(--accent)' : '2px solid transparent', color: on ? 'var(--ink)' : 'var(--n-600)', fontWeight: on ? 700 : 600, padding: '.6rem .85rem' }}>
            {t.label}{t.count != null && <Badge tone={on ? 'accent' : 'default'} className="t-xs">{t.count}</Badge>}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Progress ring ---------- */
export function Ring({ value = 0, size = 56, stroke = 6, color = 'var(--accent)', label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (Math.max(0, Math.min(100, value)) / 100) * c;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--n-100)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" style={{ transition: 'stroke-dashoffset .6s var(--ease)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size * 0.28 }}>{label ?? value}</div>
    </div>
  );
}

/* ---------- Toast ---------- */
export function useToast() {
  const show = (msg, tone = 'ok') => {
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:99;padding:.75rem 1.25rem;border-radius:var(--r-sm);font-weight:600;box-shadow:var(--shadow-lg);background:${tone === 'risk' ? 'var(--risk)' : tone === 'warn' ? 'var(--warn)' : 'var(--ink)'};color:#fff;animation:fadeUp .3s var(--ease)`;
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 320); }, 2400);
  };
  return show;
}

/* ---------- Health dot ---------- */
export function HealthDot({ health }) {
  const map = { green: 'var(--ok)', yellow: 'var(--warn)', red: 'var(--risk)' };
  return <span className="dot" style={{ background: map[health] || 'var(--n-400)' }} />;
}

/* ---------- Money / date helpers ---------- */
export const money = (n) => (n == null ? '-' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n));
export const moneyK = (n) => {
  if (n == null) return '-';
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1) + 'M';
  if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
  return '$' + n;
};
export const shortDate = (d) => (d == null ? '-' : new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
export const longDate = (d) => (d == null ? '-' : new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' }));
export const monthDay = (d) => (d == null ? '-' : new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
export const timeStr = (d) => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
export function relTime(d) {
  if (!d) return '-';
  const diff = Date.now() - new Date(d).getTime();
  const day = 86400000;
  if (diff < 0) {
    const ahead = Math.round(-diff / day);
    if (ahead === 0) return 'today';
    if (ahead === 1) return 'tomorrow';
    return `in ${ahead}d`;
  }
  const days = Math.floor(diff / day);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}
