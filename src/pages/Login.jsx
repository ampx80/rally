// Login - Ardovo's real sign-in at /login. Standalone (no marketing chrome, no
// product shell), noindex. Email + password with a clean first-login flow, an
// authenticator-app 2FA step when enabled, and a sign-up toggle. On success it
// opens the product gate and drops you into the app. Powered by the local-first
// auth layer (src/lib/auth-local.js), Supabase-swappable later.
// NO em-dash / en-dash. ASCII hyphen only.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/icons.jsx';
import { login, signUp, completeLogin2fa } from '../lib/auth-local.js';
import { grantAccessCode } from '../lib/access-mode.js';

export default function Login() {
  const nav = useNavigate();
  const [mode, setMode] = useState('login'); // login | signup
  const [form, setForm] = useState({ email: '', name: '', password: '' });
  const [step, setStep] = useState('creds'); // creds | twofa
  const [pendingId, setPendingId] = useState(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Keep this page out of the index without touching the server.
  useEffect(() => {
    const m = document.createElement('meta');
    m.name = 'robots'; m.content = 'noindex, nofollow';
    document.head.appendChild(m);
    const prevTitle = document.title; document.title = 'Sign in - Ardovo';
    return () => { try { document.head.removeChild(m); } catch {} document.title = prevTitle; };
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const enter = () => { grantAccessCode(); nav('/app'); };

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      if (mode === 'signup') {
        const r = await signUp(form);
        if (!r.ok) { setErr(r.error); return; }
        enter();
      } else {
        const r = await login(form);
        if (!r.ok) { setErr(r.error); return; }
        if (r.needs2fa) { setPendingId(r.pendingId); setStep('twofa'); return; }
        enter();
      }
    } finally { setBusy(false); }
  };

  const verify2fa = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const r = await completeLogin2fa(pendingId, code);
      if (!r.ok) { setErr(r.error); return; }
      enter();
    } finally { setBusy(false); }
  };

  return (
    <div className="lg-wrap">
      <div className="lg-aside" aria-hidden>
        <div className="lg-aside-in">
          <div className="lg-brand"><span className="lg-mark"><img src="/brand/ardovo-icon.png" alt="Ardovo" /></span> Ardovo</div>
          <h1 className="lg-tag">The AI-native revenue platform.</h1>
          <p className="lg-sub">Sign in to the operator that actually runs the work. Grounded in your book, governed by roles you can read at a glance.</p>
          <div className="lg-orbs"><span /><span /><span /></div>
        </div>
      </div>

      <div className="lg-panel">
        <div className="lg-card">
          <div className="lg-logo"><span className="lg-mark sm"><img src="/brand/ardovo-icon.png" alt="Ardovo" /></span> Ardovo</div>

          {step === 'creds' ? (
            <>
              <h2 className="lg-h">{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h2>
              <p className="lg-p">{mode === 'signup' ? 'Start running your revenue on Ardovo.' : 'Sign in to your workspace.'}</p>
              <form onSubmit={submit} className="lg-form" noValidate>
                {mode === 'signup' && (
                  <label className="lg-field"><span>Name</span>
                    <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Jordan Avery" autoComplete="name" />
                  </label>
                )}
                <label className="lg-field"><span>Work email</span>
                  <input value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@company.com" inputMode="email" autoComplete="email" autoFocus />
                </label>
                <label className="lg-field"><span>Password</span>
                  <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Your password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
                </label>
                {err && <div className="lg-err"><Icon name="activity" size={14} /> {err}</div>}
                <button className="lg-submit" type="submit" disabled={busy}>{busy ? 'One moment...' : mode === 'signup' ? 'Create account' : 'Sign in'} <Icon name="chevronRight" size={17} /></button>
              </form>
              <div className="lg-alt">
                {mode === 'signup'
                  ? <>Already have an account? <button onClick={() => { setMode('login'); setErr(''); }}>Sign in</button></>
                  : <>New to Ardovo? <button onClick={() => { setMode('signup'); setErr(''); }}>Create an account</button></>}
              </div>
              <div className="lg-fine"><Icon name="lock" size={12} /> Protected by 2FA when your admin turns it on.</div>
            </>
          ) : (
            <>
              <h2 className="lg-h">Two-factor code</h2>
              <p className="lg-p">Enter the 6-digit code from your authenticator app, or a recovery code.</p>
              <form onSubmit={verify2fa} className="lg-form" noValidate>
                <label className="lg-field"><span>Code</span>
                  <input value={code} onChange={e => setCode(e.target.value)} placeholder="123456" inputMode="numeric" autoFocus className="lg-code" />
                </label>
                {err && <div className="lg-err"><Icon name="activity" size={14} /> {err}</div>}
                <button className="lg-submit" type="submit" disabled={busy}>{busy ? 'Verifying...' : 'Verify + sign in'} <Icon name="chevronRight" size={17} /></button>
              </form>
              <div className="lg-alt"><button onClick={() => { setStep('creds'); setErr(''); setCode(''); }}>Back</button></div>
            </>
          )}
        </div>
      </div>

      <LoginStyles />
    </div>
  );
}

function LoginStyles() {
  return (
    <style>{`
    .lg-wrap { min-height: 100vh; display: grid; grid-template-columns: 1.05fr 1fr; background: #0b0d14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    @media (max-width: 820px) { .lg-wrap { grid-template-columns: 1fr; } .lg-aside { display: none; } }
    .lg-aside { position: relative; overflow: hidden; background: radial-gradient(120% 120% at 20% 10%, #12324a, #0b0d14 55%); color: #fff; }
    .lg-aside-in { position: relative; z-index: 2; height: 100%; display: flex; flex-direction: column; justify-content: center; padding: 8vw; max-width: 620px; }
    .lg-brand { display: flex; align-items: center; gap: 12px; font-size: 26px; font-weight: 900; letter-spacing: -.02em; }
    .lg-mark { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; overflow: hidden; }
    .lg-mark img { width: 100%; height: 100%; object-fit: contain; }
    .lg-mark.sm { width: 32px; height: 32px; border-radius: 9px; }
    .lg-tag { font-size: clamp(2rem, 3.4vw, 3rem); font-weight: 900; letter-spacing: -.03em; margin: 40px 0 16px; line-height: 1.05; background: linear-gradient(100deg, #fff, #8fe3d8); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .lg-sub { font-size: 17px; color: #a9b4c4; line-height: 1.6; max-width: 460px; }
    .lg-orbs span { position: absolute; border-radius: 50%; filter: blur(50px); opacity: .5; }
    .lg-orbs span:nth-child(1) { width: 340px; height: 340px; background: #0e9f8f; top: -60px; right: -80px; }
    .lg-orbs span:nth-child(2) { width: 260px; height: 260px; background: #7c5cf7; bottom: 40px; left: -60px; opacity: .35; }
    .lg-orbs span:nth-child(3) { width: 200px; height: 200px; background: #2563a8; bottom: -60px; right: 30%; opacity: .3; }

    .lg-panel { display: grid; place-items: center; padding: 32px; background: var(--m-bg, #fff); }
    .lg-card { width: 100%; max-width: 400px; }
    .lg-logo { display: none; align-items: center; gap: 10px; font-size: 22px; font-weight: 900; color: #0d1117; margin-bottom: 24px; }
    @media (max-width: 820px) { .lg-logo { display: flex; } .lg-panel { background: #fff; } }
    .lg-h { font-size: 27px; font-weight: 900; letter-spacing: -.02em; color: #0d1117; margin: 0; }
    .lg-p { font-size: 15px; color: #5b6474; margin: 8px 0 24px; }
    .lg-form { display: flex; flex-direction: column; gap: 15px; }
    .lg-field { display: flex; flex-direction: column; gap: 7px; }
    .lg-field span { font-size: 13.5px; font-weight: 700; color: #0d1117; }
    .lg-field input { border: 1px solid #e3e7ee; border-radius: 12px; padding: 13px 14px; font-size: 15px; font-family: inherit; color: #0d1117; outline: none; transition: border-color .14s, box-shadow .14s; }
    .lg-field input:focus { border-color: #0e9f8f; box-shadow: 0 0 0 3px rgba(14,159,143,.15); }
    .lg-code { letter-spacing: .4em; font-size: 22px !important; text-align: center; font-weight: 700; }
    .lg-err { display: flex; align-items: center; gap: 7px; font-size: 13.5px; font-weight: 600; color: #c0392b; background: #fdecea; border: 1px solid #f5c6c0; border-radius: 10px; padding: 10px 12px; }
    .lg-submit { display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-family: inherit; font-size: 16px; font-weight: 800; color: #fff; background: linear-gradient(100deg, #0e9f8f, #14b8a6); border: none; border-radius: 13px; padding: 14px; cursor: pointer; box-shadow: 0 14px 32px -14px rgba(14,159,143,.7); transition: transform .14s; margin-top: 4px; }
    .lg-submit:hover:not(:disabled) { transform: translateY(-2px); }
    .lg-submit:disabled { opacity: .7; cursor: default; }
    .lg-alt { text-align: center; font-size: 14px; color: #5b6474; margin-top: 20px; }
    .lg-alt button { font-family: inherit; font-size: 14px; font-weight: 700; color: #0e9f8f; background: none; border: none; cursor: pointer; padding: 0; }
    .lg-fine { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 12.5px; color: #8a92a3; margin-top: 18px; }
    `}</style>
  );
}
