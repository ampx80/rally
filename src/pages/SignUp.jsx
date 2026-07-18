// ============================================================
// ARDOVO SIGN UP - real account creation (email + password + Google).
// Additive: renders only if a /signup route is wired in App.jsx. Never touches
// the coming-soon gate or local-first mode. When Supabase is not configured
// the form still renders but submitting returns a clear "not configured"
// message. On success, if the project requires email confirmation we show a
// "check your inbox" state; otherwise we land in the product.
// NO em-dash / en-dash. ASCII only.
// ============================================================
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/icons.jsx';
import { signUp, signInWithGoogle, isConfigured } from '../lib/auth.js';
import { AuthShell, AuthHead, AuthField, PasswordField, GoogleButton, EMAIL_RE } from './auth-shell.jsx';

// 0..4 strength from length + character variety. Purely a UI hint.
function strength(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[0-9]/.test(pw) && /[a-zA-Z]/.test(pw)) s++;
  if (/[^a-zA-Z0-9]/.test(pw)) s++;
  return Math.min(4, s);
}

export default function SignUp() {
  const nav = useNavigate();
  const configured = isConfigured();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | oauth | sent
  const [err, setErr] = useState('');

  const s = strength(password);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!name.trim()) { setErr('Please tell us your name.'); return; }
    if (!EMAIL_RE.test(email.trim())) { setErr('Please enter a valid email.'); return; }
    if (password.length < 8) { setErr('Use at least 8 characters for your password.'); return; }
    setStatus('submitting');
    const res = await signUp({ email, password, name });
    if (res.error) { setStatus('idle'); setErr(res.message); return; }
    // Record the signup for the admin panel (decoupled window event). A personal
    // signup is a lead; the company is inferred from the email domain.
    try {
      const dom = (email.split('@')[1] || '').split('.')[0];
      window.dispatchEvent(new CustomEvent('rally:signup', { detail: {
        company: dom ? dom.charAt(0).toUpperCase() + dom.slice(1) : name.trim(),
        contact: name.trim(), email: email.trim(), source: 'marketing', status: 'lead', seats: 1,
      } }));
    } catch {}
    if (res.session) { nav('/app'); return; } // auto-confirmed project
    setStatus('sent'); // email confirmation required
  };

  const google = async () => {
    setErr('');
    setStatus('oauth');
    const res = await signInWithGoogle();
    if (res.error) { setStatus('idle'); setErr(res.message); }
  };

  if (status === 'sent') {
    return (
      <AuthShell>
        <div className="auth-success">
          <div className="auth-check"><Icon name="mail" size={32} /></div>
          <h1 className="auth-h1" style={{ fontSize: '1.6rem' }}>Confirm your email</h1>
          <p className="auth-sub" style={{ margin: '12px auto 0', maxWidth: 340 }}>
            We sent a confirmation link to {email}. Click it to finish creating your account.
          </p>
        </div>
        <div className="auth-foot">
          Already confirmed? <button type="button" className="auth-link" onClick={() => nav('/signin')}>Sign in</button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthHead title={<>Get started with <span className="auth-grad">Ardovo</span></>} sub="Create your account. Live on first load." />

      {!configured && (
        <p className="auth-note" style={{ marginBottom: 16 }}>
          <Icon name="lock" size={13} style={{ verticalAlign: '-2px', marginRight: 5 }} />
          Sign up is not enabled in this environment yet. Set the Supabase env vars to turn it on.
        </p>
      )}

      <form className="auth-form" onSubmit={submit}>
        <AuthField label="Name" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Jordan Avery" autoComplete="name" name="name" />
        <AuthField label="Work email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com" autoComplete="email" name="email" />
        <div>
          <PasswordField label="Password" value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password" placeholder="At least 8 characters" />
          {password && (
            <div className={`auth-strength s${s}`} aria-hidden><span /><span /><span /><span /></div>
          )}
        </div>

        {err && <p className="auth-err">{err}</p>}

        <button className="auth-btn" type="submit" disabled={status !== 'idle'}>
          {status === 'submitting' ? <><span className="auth-spin" /> Creating account...</> : <>Create account <Icon name="chevronRight" size={18} /></>}
        </button>

        <div className="auth-divider">or</div>

        <GoogleButton onClick={google} disabled={!configured} loading={status === 'oauth'} label="Sign up with Google" />
      </form>

      <p className="auth-note center" style={{ marginTop: 14 }}>
        By creating an account you agree to Ardovo's terms and privacy policy.
      </p>

      <div className="auth-foot">
        Already have an account? <button type="button" className="auth-link" onClick={() => nav('/signin')}>Sign in</button>
      </div>
    </AuthShell>
  );
}
