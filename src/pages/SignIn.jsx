// ============================================================
// ARDOVO SIGN IN - real auth screen (email + password + Google).
// Additive: this renders only if a /signin route is wired in App.jsx. It does
// nothing to the coming-soon gate or local-first mode. When Supabase is not
// configured, the form still renders but submitting returns a clear
// "not configured" message and Google is disabled with a note.
// NO em-dash / en-dash. ASCII only.
// ============================================================
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/icons.jsx';
import { signIn, signInWithGoogle, isConfigured } from '../lib/auth.js';
import { AuthShell, AuthHead, AuthField, PasswordField, GoogleButton, EMAIL_RE } from './auth-shell.jsx';

export default function SignIn() {
  const nav = useNavigate();
  const configured = isConfigured();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | oauth
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!EMAIL_RE.test(email.trim())) { setErr('Please enter a valid email.'); return; }
    if (!password) { setErr('Please enter your password.'); return; }
    setStatus('submitting');
    const res = await signIn({ email, password });
    if (res.error) { setStatus('idle'); setErr(res.message); return; }
    // Signed in. Land in the product.
    nav('/app');
  };

  const google = async () => {
    setErr('');
    setStatus('oauth');
    const res = await signInWithGoogle();
    if (res.error) { setStatus('idle'); setErr(res.message); }
    // On success Supabase redirects the browser; nothing else to do here.
  };

  return (
    <AuthShell>
      <AuthHead title={<>Welcome back to <span className="auth-grad">Ardovo</span></>} sub="Sign in to your revenue platform." />

      {!configured && (
        <p className="auth-note" style={{ marginBottom: 16 }}>
          <Icon name="lock" size={13} style={{ verticalAlign: '-2px', marginRight: 5 }} />
          Sign in is not enabled in this environment yet. Set the Supabase env vars to turn it on.
        </p>
      )}

      <form className="auth-form" onSubmit={submit}>
        <AuthField label="Work email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com" autoComplete="email" name="email" />
        <div>
          <PasswordField label="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          <div className="auth-row" style={{ marginTop: 8 }}>
            <span />
            <button type="button" className="auth-link" onClick={() => nav('/forgot')}>Forgot password?</button>
          </div>
        </div>

        {err && <p className="auth-err">{err}</p>}

        <button className="auth-btn" type="submit" disabled={status !== 'idle'}>
          {status === 'submitting' ? <><span className="auth-spin" /> Signing in...</> : <>Sign in <Icon name="chevronRight" size={18} /></>}
        </button>

        <div className="auth-divider">or</div>

        <GoogleButton onClick={google} disabled={!configured} loading={status === 'oauth'} />
      </form>

      <div className="auth-foot">
        New to Ardovo? <button type="button" className="auth-link" onClick={() => nav('/signup')}>Create an account</button>
      </div>
    </AuthShell>
  );
}
