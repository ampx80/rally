// ============================================================
// RALLY FORGOT PASSWORD - request a reset link.
// Additive: renders only if a /forgot route is wired in App.jsx. Never touches
// the coming-soon gate or local-first mode. When Supabase is not configured
// the form still renders but submitting returns a clear "not configured"
// message. NO em-dash / en-dash. ASCII only.
// ============================================================
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/icons.jsx';
import { resetPassword, isConfigured } from '../lib/auth.js';
import { AuthShell, AuthHead, AuthField, EMAIL_RE } from './auth-shell.jsx';

export default function ForgotPassword() {
  const nav = useNavigate();
  const configured = isConfigured();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | sent
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!EMAIL_RE.test(email.trim())) { setErr('Please enter a valid email.'); return; }
    setStatus('submitting');
    const res = await resetPassword(email);
    if (res.error) { setStatus('idle'); setErr(res.message); return; }
    setStatus('sent');
  };

  if (status === 'sent') {
    return (
      <AuthShell>
        <div className="auth-success">
          <div className="auth-check"><Icon name="mail" size={32} /></div>
          <h1 className="auth-h1" style={{ fontSize: '1.6rem' }}>Check your inbox</h1>
          <p className="auth-sub" style={{ margin: '12px auto 0', maxWidth: 340 }}>
            If an account exists for {email}, a password reset link is on its way.
          </p>
        </div>
        <div className="auth-foot">
          <button type="button" className="auth-link" onClick={() => nav('/signin')}>Back to sign in</button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthHead title="Reset your password" sub="Enter the email on your account and we will send a reset link." />

      {!configured && (
        <p className="auth-note" style={{ marginBottom: 16 }}>
          <Icon name="lock" size={13} style={{ verticalAlign: '-2px', marginRight: 5 }} />
          Password reset is not enabled in this environment yet. Set the Supabase env vars to turn it on.
        </p>
      )}

      <form className="auth-form" onSubmit={submit}>
        <AuthField label="Work email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com" autoComplete="email" name="email" />

        {err && <p className="auth-err">{err}</p>}

        <button className="auth-btn" type="submit" disabled={status !== 'idle'}>
          {status === 'submitting' ? <><span className="auth-spin" /> Sending...</> : <>Send reset link <Icon name="chevronRight" size={18} /></>}
        </button>
      </form>

      <div className="auth-foot">
        Remembered it? <button type="button" className="auth-link" onClick={() => nav('/signin')}>Back to sign in</button>
      </div>
    </AuthShell>
  );
}
