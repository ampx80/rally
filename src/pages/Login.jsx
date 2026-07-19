// Login - Ardovo's real sign-in at /login. Standalone (no marketing chrome, no
// product shell), noindex. Reimagined as a FUN, guided experience: "Ardo", an
// animated concierge character, greets you, reacts to what you do, and explains
// each step in plain language. Kind NIST-aligned password guidance, a show/hide
// toggle, a no-lockout "forgot password" door, and a "call for help" concierge.
// Powered by the local-first auth layer (src/lib/auth-local.js). Every path is
// real; nothing overpromises. NO em-dash / en-dash. ASCII hyphen only.
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/icons.jsx';
import { login, signUp, completeLogin2fa, loginWithGoogleCredential } from '../lib/auth-local.js';
import { grantAccessCode } from '../lib/access-mode.js';
import AuthGuide from '../components/AuthGuide.jsx';
import AuthBackdrop from '../components/AuthBackdrop.jsx';
import AuthTrust from '../components/AuthTrust.jsx';
import { scorePassword, checkPwned } from '../lib/password-strength.js';
import { hasPhone, HELP_NUMBER, formatPhone, telHref } from '../lib/concierge.js';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function Login() {
  const nav = useNavigate();
  const [mode, setMode] = useState('login'); // login | signup
  const [form, setForm] = useState({ email: '', name: '', password: '' });
  const [step, setStep] = useState('creds'); // creds | twofa
  const [pendingId, setPendingId] = useState(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [greeting, setGreeting] = useState(true);
  const [flash, setFlash] = useState(false); // success celebration
  const [focusField, setFocusField] = useState('');
  const [pwned, setPwned] = useState(null); // { breached, count } | null
  const gbtnRef = useRef(null);

  const pwInfo = mode === 'signup' ? scorePassword(form.password) : null;

  // Keep this page out of the index without touching the server.
  useEffect(() => {
    const m = document.createElement('meta');
    m.name = 'robots'; m.content = 'noindex, nofollow';
    document.head.appendChild(m);
    const prevTitle = document.title; document.title = 'Sign in - Ardovo';
    return () => { try { document.head.removeChild(m); } catch {} document.title = prevTitle; };
  }, []);

  // Debounced breached-password check while creating an account (fail-open).
  useEffect(() => {
    if (mode !== 'signup' || (form.password || '').length < 8) { setPwned(null); return; }
    let live = true; const t = setTimeout(async () => {
      const r = await checkPwned(form.password); if (live) setPwned(r);
    }, 500);
    return () => { live = false; clearTimeout(t); };
  }, [form.password, mode]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const enter = () => { grantAccessCode(); setFlash(true); setTimeout(() => nav('/app'), 720); };

  // Google SSO (OIDC) - only mounts when VITE_GOOGLE_CLIENT_ID is configured.
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || step !== 'creds') return;
    let cancelled = false;
    const onCred = async (resp) => {
      setErr(''); setBusy(true);
      try {
        const r = await loginWithGoogleCredential(resp.credential);
        if (!r.ok) { setErr(r.error); return; }
        if (r.needs2fa) { setPendingId(r.pendingId); setStep('twofa'); return; }
        enter();
      } finally { setBusy(false); }
    };
    const render = () => {
      if (cancelled || !window.google?.accounts?.id || !gbtnRef.current) return;
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: onCred });
      gbtnRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(gbtnRef.current, {
        theme: 'outline', size: 'large', width: 360, shape: 'pill',
        text: mode === 'signup' ? 'signup_with' : 'signin_with',
      });
    };
    if (window.google?.accounts?.id) { render(); return () => { cancelled = true; }; }
    let s = document.getElementById('gsi-script');
    if (!s) { s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.defer = true; s.id = 'gsi-script'; document.head.appendChild(s); }
    s.addEventListener('load', render);
    return () => { cancelled = true; s && s.removeEventListener('load', render); };
  }, [mode, step]); // eslint-disable-line

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      if (mode === 'signup') {
        if (pwned?.breached) { setErr('That password turned up in a public breach, so it is not safe. Try a fresh phrase.'); return; }
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

  // Character mood + what Ardo is saying, driven by the live UI state.
  const mood = busy ? 'thinking' : flash ? 'happy' : err ? 'oops' : showPw ? 'peek' : step === 'twofa' ? 'idle' : greeting ? 'greet' : 'idle';
  const message = (() => {
    if (busy) return step === 'twofa' ? 'Checking your code...' : 'One sec, getting you in...';
    if (flash) return "You're in. Welcome aboard!";
    if (err) return "Hmm, that didn't line up. No stress - try again, or tap Get help and I'll get you in.";
    if (step === 'twofa') return "Grab the 6-digit code from your authenticator. Lost your phone? I will still get you in.";
    if (showPw) return "Okay, I will look away while you check it. No peeking, promise.";
    if (mode === 'signup') return "Welcome! Pick a passphrase you will actually remember - length beats symbols every time.";
    if (focusField === 'password') return "Forgot it? Don't worry, I keep backup doors so you are never locked out.";
    return "Hi, I'm Ardo. Let's get you signed in - I promise this won't hurt.";
  })();

  const touch = () => { if (greeting) setGreeting(false); };

  return (
    <div className="lg-wrap">
      <div className="lg-aside">
        <AuthBackdrop tint="teal" />
        <div className="lg-aside-in">
          <div className="lg-brand"><span className="lg-mark"><img src="/brand/ardovo-icon.png" alt="Ardovo" /></span> Ardovo</div>
          <div className="lg-guide"><AuthGuide mood={mood} message={message} size={150} /></div>
          <p className="lg-sub">Sign in to the operator that actually runs the work. And if anything gets in your way, Ardo (and a real human) are one tap away. You are never locked out.</p>
        </div>
      </div>

      <div className="lg-panel">
        <div className="lg-panel-body">
        <div className="lg-card">
          <div className="lg-logo"><span className="lg-mark sm"><img src="/brand/ardovo-icon.png" alt="Ardovo" /></span> Ardovo</div>
          <div className="lg-guide-m"><AuthGuide mood={mood} message={message} size={96} compact /></div>

          {step === 'creds' ? (
            <>
              <h2 className="lg-h">{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h2>
              <p className="lg-p">{mode === 'signup' ? 'Start running your revenue on Ardovo.' : 'Sign in to your workspace.'}</p>
              <form onSubmit={submit} className="lg-form" noValidate>
                {mode === 'signup' && (
                  <label className="lg-field"><span>Name</span>
                    <input value={form.name} onChange={e => set('name', e.target.value)} onFocus={() => { setFocusField('name'); touch(); }} placeholder="Jordan Avery" autoComplete="name" />
                  </label>
                )}
                <label className="lg-field"><span>Work email</span>
                  <input value={form.email} onChange={e => set('email', e.target.value)} onFocus={() => { setFocusField('email'); touch(); }} placeholder="you@company.com" inputMode="email" autoComplete="email" autoFocus />
                </label>
                <div className="lg-field">
                  <div className="lg-labelrow">
                    <span>Password</span>
                    {mode === 'login' && <button type="button" className="lg-forgot" onClick={() => nav('/recover')}>Forgot password?</button>}
                  </div>
                  <div className="lg-pw">
                    <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)} onFocus={() => { setFocusField('password'); touch(); }}
                      placeholder={mode === 'signup' ? 'A phrase you will remember' : 'Your password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
                    <button type="button" className="lg-eye" tabIndex={-1} onClick={() => setShowPw(v => !v)} aria-label={showPw ? 'Hide password' : 'Show password'}>
                      <Icon name={showPw ? 'eyeOff' : 'eye'} size={17} />
                    </button>
                  </div>
                  {mode === 'signup' && form.password && (
                    <div className="lg-meter">
                      <div className="lg-meter-track"><div className={`lg-meter-fill t-${pwInfo.tone}`} style={{ width: `${(pwInfo.score / 4) * 100}%` }} /></div>
                      <div className={`lg-meter-note n-${pwned?.breached ? 'risk' : pwInfo.tone}`}>
                        {pwned?.breached
                          ? 'This one showed up in a public breach - try another so nobody can guess it.'
                          : `${pwInfo.label ? pwInfo.label + '. ' : ''}${pwInfo.note}`}
                      </div>
                    </div>
                  )}
                </div>
                {err && <div className="lg-err"><Icon name="activity" size={14} /> {err}</div>}
                <button className="lg-submit" type="submit" disabled={busy}>{busy ? 'One moment...' : mode === 'signup' ? 'Create account' : 'Sign in'} <Icon name="chevronRight" size={17} /></button>
                {mode === 'signup' && (
                  <p className="lg-consent">By creating an account you agree to our <a href="/legal/terms">Terms</a> and <a href="/legal/privacy">Privacy Policy</a>.</p>
                )}
              </form>
              {GOOGLE_CLIENT_ID && (
                <>
                  <div className="lg-or"><span>or</span></div>
                  <div ref={gbtnRef} className="lg-gbtn" />
                </>
              )}
              <div className="lg-alt">
                {mode === 'signup'
                  ? <>Already have an account? <button onClick={() => { setMode('login'); setErr(''); }}>Sign in</button></>
                  : <>New to Ardovo? <button onClick={() => { setMode('signup'); setErr(''); }}>Create an account</button></>}
              </div>
              <HelpRow nav={nav} />
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
              <div className="lg-alt">
                <button onClick={() => { setStep('creds'); setErr(''); setCode(''); }}>Back</button>
                <span className="lg-alt-sep">|</span>
                <button onClick={() => nav('/recover')}>Lost your authenticator?</button>
              </div>
              <HelpRow nav={nav} />
            </>
          )}
        </div>
        </div>
        <AuthTrust />
      </div>

      <LoginStyles />
    </div>
  );
}

// The never-locked-out concierge row. Shows a real dial link the instant a
// number is provisioned; always offers a guided help page (no dead ends).
function HelpRow({ nav }) {
  return (
    <div className="lg-help">
      <span className="lg-help-ic"><Icon name="lifebuoy" size={15} /></span>
      <span className="lg-help-t">Stuck getting in?</span>
      {hasPhone() && <a className="lg-help-a" href={telHref()}><Icon name="phone" size={13} /> Call {formatPhone(HELP_NUMBER)}</a>}
      <button type="button" className="lg-help-b" onClick={() => nav('/login-help')}>Get help</button>
    </div>
  );
}

function LoginStyles() {
  return (
    <style>{`
    .lg-wrap { min-height: 100vh; display: grid; grid-template-columns: 1.05fr 1fr; background: #0b0d14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    @media (max-width: 820px) { .lg-wrap { grid-template-columns: 1fr; } .lg-aside { display: none; } }
    .lg-aside { position: relative; overflow: hidden; background: radial-gradient(120% 120% at 20% 10%, #12324a, #0b0d14 55%); color: #fff; }
    .lg-aside-in { position: relative; z-index: 2; height: 100%; display: flex; flex-direction: column; justify-content: center; padding: 6vw; max-width: 640px; }
    .lg-brand { display: flex; align-items: center; gap: 12px; font-size: 26px; font-weight: 900; letter-spacing: -.02em; }
    .lg-mark { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; overflow: hidden; }
    .lg-mark img { width: 100%; height: 100%; object-fit: contain; }
    .lg-mark.sm { width: 32px; height: 32px; border-radius: 9px; }
    .lg-guide { margin: 34px 0 30px; }
    .lg-guide-m { display: none; margin: 4px 0 18px; }
    @media (max-width: 820px) { .lg-guide-m { display: block; } }
    .lg-sub { font-size: 16px; color: #a9b4c4; line-height: 1.6; max-width: 470px; }
    .lg-orbs span { position: absolute; border-radius: 50%; filter: blur(50px); opacity: .5; }
    .lg-orbs span:nth-child(1) { width: 340px; height: 340px; background: #0e9f8f; top: -60px; right: -80px; }
    .lg-orbs span:nth-child(2) { width: 260px; height: 260px; background: #7c5cf7; bottom: 40px; left: -60px; opacity: .35; }
    .lg-orbs span:nth-child(3) { width: 200px; height: 200px; background: #2563a8; bottom: -60px; right: 30%; opacity: .3; }

    .lg-panel { display: flex; flex-direction: column; padding: 32px 32px 26px; background: var(--m-bg, #fff); }
    .lg-panel-body { flex: 1; display: grid; place-items: center; width: 100%; }
    .lg-card { width: 100%; max-width: 400px; animation: lgCardIn .55s cubic-bezier(.22,1,.36,1) both; }
    @keyframes lgCardIn { 0% { opacity: 0; transform: translateY(14px); } 100% { opacity: 1; transform: none; } }
    .lg-form > * { animation: lgFieldIn .5s cubic-bezier(.22,1,.36,1) both; }
    .lg-form > *:nth-child(1) { animation-delay: .05s; } .lg-form > *:nth-child(2) { animation-delay: .11s; }
    .lg-form > *:nth-child(3) { animation-delay: .17s; } .lg-form > *:nth-child(4) { animation-delay: .23s; }
    @keyframes lgFieldIn { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) { .lg-card, .lg-form > * { animation: none; } }
    .lg-logo { display: none; align-items: center; gap: 10px; font-size: 22px; font-weight: 900; color: #0d1117; margin-bottom: 24px; }
    @media (max-width: 820px) { .lg-logo { display: flex; } .lg-panel { background: #fff; } }
    .lg-h { font-size: 27px; font-weight: 900; letter-spacing: -.02em; color: #0d1117; margin: 0; }
    .lg-p { font-size: 15px; color: #5b6474; margin: 8px 0 24px; }
    .lg-form { display: flex; flex-direction: column; gap: 15px; }
    .lg-field { display: flex; flex-direction: column; gap: 7px; }
    .lg-field span { font-size: 13.5px; font-weight: 700; color: #0d1117; }
    .lg-labelrow { display: flex; align-items: center; justify-content: space-between; }
    .lg-forgot { font-family: inherit; font-size: 12.5px; font-weight: 700; color: #0e9f8f; background: none; border: none; cursor: pointer; padding: 0; }
    .lg-forgot:hover { text-decoration: underline; }
    .lg-field input { width: 100%; box-sizing: border-box; border: 1px solid #e3e7ee; border-radius: 12px; padding: 13px 14px; font-size: 15px; font-family: inherit; color: #0d1117; outline: none; transition: border-color .14s, box-shadow .14s; }
    .lg-field input:focus { border-color: #0e9f8f; box-shadow: 0 0 0 3px rgba(14,159,143,.15); }
    .lg-pw { position: relative; }
    .lg-pw input { padding-right: 44px; }
    .lg-eye { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); width: 34px; height: 34px; display: grid; place-items: center; background: none; border: none; color: #8a92a3; cursor: pointer; border-radius: 8px; }
    .lg-eye:hover { color: #0e9f8f; background: rgba(14,159,143,.08); }
    .lg-meter { display: flex; flex-direction: column; gap: 6px; margin-top: 3px; }
    .lg-meter-track { height: 6px; border-radius: 6px; background: #eef1f5; overflow: hidden; }
    .lg-meter-fill { height: 100%; border-radius: 6px; transition: width .3s ease, background .3s ease; }
    .lg-meter-fill.t-risk { background: #e05d44; } .lg-meter-fill.t-warn { background: #e8973a; }
    .lg-meter-fill.t-info { background: #2f8fd6; } .lg-meter-fill.t-ok { background: #0e9f8f; }
    .lg-meter-note { font-size: 12.5px; font-weight: 600; color: #5b6474; }
    .lg-meter-note.n-risk { color: #c0392b; } .lg-meter-note.n-ok { color: #0b8578; }
    .lg-code { letter-spacing: .4em; font-size: 22px !important; text-align: center; font-weight: 700; }
    .lg-err { display: flex; align-items: center; gap: 7px; font-size: 13.5px; font-weight: 600; color: #c0392b; background: #fdecea; border: 1px solid #f5c6c0; border-radius: 10px; padding: 10px 12px; }
    .lg-submit { position: relative; overflow: hidden; display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-family: inherit; font-size: 16px; font-weight: 800; color: #fff; background: linear-gradient(100deg, #0e9f8f, #14b8a6); border: none; border-radius: 13px; padding: 14px; cursor: pointer; box-shadow: 0 14px 32px -14px rgba(14,159,143,.7); transition: transform .14s, box-shadow .14s; margin-top: 4px; }
    .lg-submit::after { content: ''; position: absolute; top: 0; left: -60%; width: 40%; height: 100%; background: linear-gradient(100deg, transparent, rgba(255,255,255,.35), transparent); transform: skewX(-18deg); animation: lgSheen 4.5s ease-in-out infinite; }
    @keyframes lgSheen { 0%, 55% { left: -60%; } 80%, 100% { left: 130%; } }
    .lg-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 20px 40px -14px rgba(14,159,143,.8); }
    .lg-submit:disabled { opacity: .7; cursor: default; }
    @media (prefers-reduced-motion: reduce) { .lg-submit::after { animation: none; display: none; } }
    .lg-alt { text-align: center; font-size: 14px; color: #5b6474; margin-top: 20px; }
    .lg-alt button { font-family: inherit; font-size: 14px; font-weight: 700; color: #0e9f8f; background: none; border: none; cursor: pointer; padding: 0; }
    .lg-alt-sep { color: #d3d8e0; margin: 0 10px; }
    .lg-consent { font-size: 12.5px; color: #8a92a3; text-align: center; margin: 12px 2px 0; line-height: 1.5; }
    .lg-consent a { color: #0e9f8f; font-weight: 700; text-decoration: none; }
    .lg-consent a:hover { text-decoration: underline; }
    .lg-or { display: flex; align-items: center; gap: 12px; margin: 20px 0 16px; color: #8a92a3; font-size: 12.5px; font-weight: 600; }
    .lg-or::before, .lg-or::after { content: ''; height: 1px; background: #e3e7ee; flex: 1; }
    .lg-gbtn { display: flex; justify-content: center; min-height: 40px; }
    .lg-help { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; justify-content: center; margin-top: 22px; padding: 12px 14px; border: 1px solid #e6f4f1; background: #f4fbfa; border-radius: 12px; }
    .lg-help-ic { color: #0e9f8f; display: inline-flex; }
    .lg-help-t { font-size: 13px; font-weight: 700; color: #0d1117; }
    .lg-help-a { display: inline-flex; align-items: center; gap: 5px; font-size: 13px; font-weight: 700; color: #0e9f8f; text-decoration: none; }
    .lg-help-a:hover { text-decoration: underline; }
    .lg-help-b { font-family: inherit; font-size: 13px; font-weight: 700; color: #fff; background: linear-gradient(100deg, #0e9f8f, #14b8a6); border: none; border-radius: 9px; padding: 7px 13px; cursor: pointer; }
    .lg-help-b:hover { transform: translateY(-1px); }
    `}</style>
  );
}
