// ============================================================
// RALLY AUTH SHELL - shared chrome + primitives for the auth screens.
// Dark premium backdrop, brand mark, and small form controls so SignIn,
// SignUp, and ForgotPassword stay consistent and thin. NO em-dash / en-dash.
// ============================================================
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/icons.jsx';
import './auth.css';

// Full-screen dark shell with the animated backdrop + brand, matching the gate.
export function AuthShell({ children }) {
  return (
    <div className="auth">
      <div className="auth-orbs" aria-hidden><span className="o1" /><span className="o2" /><span className="o3" /></div>
      <div className="auth-grid" aria-hidden />
      <div className="auth-card">
        <Link to="/" className="auth-brand">
          <span className="auth-mark"><Icon name="zap" size={22} fill="#fff" stroke={0} /></span>
          Rally
        </Link>
        {children}
      </div>
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

// Labeled text input.
export function AuthField({ label, error, ...rest }) {
  return (
    <div className="auth-field">
      {label && <label className="auth-label">{label}</label>}
      <input className={`auth-input${error ? ' err' : ''}`} {...rest} />
    </div>
  );
}

// Password input with a show / hide reveal toggle.
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

// The 4-color Google mark, inlined so the bundle needs no external asset.
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

// Continue-with-Google affordance. Disabled with a note when auth is not
// configured, so it never dead-ends silently.
export function GoogleButton({ onClick, disabled, loading, label = 'Continue with Google' }) {
  return (
    <button type="button" className="auth-oauth" onClick={onClick} disabled={disabled || loading}>
      {loading ? <span className="auth-spin" style={{ borderTopColor: '#fff' }} /> : <GoogleMark />}
      {label}
    </button>
  );
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
