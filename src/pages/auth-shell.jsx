// ============================================================
// ARDOVO AUTH SHELL - premium gate: dark brand panel + light form.
// Teal product accent. Violet only for Rook / AI mentions.
// Shared by SignIn, SignUp, ForgotPassword. NO em-dash / en-dash.
// ============================================================
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/icons.jsx';
import './auth.css';

const ASIDE_STATS = [
  { v: '14', l: 'Modules' },
  { v: '1', l: 'Login' },
  { v: 'AI', l: 'Operator' },
];

export function AuthShell({ children }) {
  return (
    <div className="auth">
      <aside className="auth-aside" aria-hidden={false}>
        <div className="auth-aside-grid" aria-hidden />
        <span className="auth-aside-orb o1" aria-hidden />
        <span className="auth-aside-orb o2" aria-hidden />

        <Link to="/" className="auth-aside-brand">
          <span className="auth-mark"><Icon name="zap" size={20} fill="#fff" stroke={0} /></span>
          Ardovo
        </Link>

        <div className="auth-aside-copy">
          <p className="auth-aside-kicker">AI revenue platform</p>
          <h2 className="auth-aside-h">Run your revenue like a product, not a spreadsheet.</h2>
          <p className="auth-aside-p">
            CRM, CPQ, billing, and marketing in one system.{' '}
            <span className="auth-aside-rook">Rook</span> does the work so your team closes.
          </p>
        </div>

        <div className="auth-aside-stats">
          {ASIDE_STATS.map((s) => (
            <div key={s.l} className="auth-aside-stat">
              <strong>{s.v}</strong>
              <span>{s.l}</span>
            </div>
          ))}
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <Link to="/" className="auth-brand-mobile">
            <span className="auth-mark"><Icon name="zap" size={18} fill="#fff" stroke={0} /></span>
            Ardovo
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}

export function AuthHead({ title, sub }) {
  return (
    <div className="auth-head">
      <h1 className="auth-h1">{title}</h1>
      {sub && <p className="auth-sub">{sub}</p>}
    </div>
  );
}

export function AuthField({ label, error, ...rest }) {
  return (
    <div className="auth-field">
      {label && <label className="auth-label">{label}</label>}
      <input className={`auth-input${error ? ' err' : ''}`} {...rest} />
    </div>
  );
}

export function PasswordField({ label, value, onChange, error, autoComplete = 'current-password', placeholder = 'Your password', name = 'password' }) {
  const [show, setShow] = useState(false);
  return (
    <div className="auth-field">
      {label && <label className="auth-label">{label}</label>}
      <div className="auth-pw">
        <input
          className={`auth-input${error ? ' err' : ''}`}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          name={name}
        />
        <button type="button" className="auth-pweye" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
          <Icon name={show ? 'eyeOff' : 'eye'} size={18} />
        </button>
      </div>
    </div>
  );
}

export function GoogleMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export function GoogleButton({ onClick, disabled, loading, label = 'Continue with Google' }) {
  return (
    <button type="button" className="auth-oauth" onClick={onClick} disabled={disabled || loading}>
      {loading ? <span className="auth-spin" style={{ borderTopColor: '#0e9f8f', borderColor: 'rgba(14,159,143,.25)' }} /> : <GoogleMark />}
      {label}
    </button>
  );
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
