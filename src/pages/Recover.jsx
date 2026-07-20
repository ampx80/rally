// Recover - the never-locked-out account recovery flow at /recover. Guided by
// Ardo. Handles the real pain points: forgot password, lost/new phone (lost
// authenticator), and "I can't find the reset email." We only ever offer doors
// that actually work for THIS account (Google, recovery code, new password),
// and if none exist we hand off to the concierge - no dead ends, no lockouts.
// Local-first (auth-local.js); the same UI stands when a server backend lands.
// NO em-dash / en-dash. ASCII hyphen only.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/icons.jsx';
import AuthGuide from '../components/AuthGuide.jsx';
import AuthBackdrop from '../components/AuthBackdrop.jsx';
import AuthTrust from '../components/AuthTrust.jsx';
import { accountFactors, loginWithRecoveryCode, setAccountPassword } from '../lib/auth-local.js';
import { grantAccessCode } from '../lib/access-mode.js';
import { scorePassword } from '../lib/password-strength.js';
import { hasPhone, HELP_NUMBER, formatPhone, telHref } from '../lib/concierge.js';
import { currentAccessory } from '../lib/ardo-flair.js';

export default function Recover() {
  const nav = useNavigate();
  const [step, setStep] = useState('find'); // find | options | code | reset | notfound
  const [email, setEmail] = useState('');
  const [factors, setFactors] = useState(null);
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [intent, setIntent] = useState('signin'); // signin | reset
  const [remaining, setRemaining] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [flash, setFlash] = useState(false);
  const [warp, setWarp] = useState(false);
  const [accessory] = useState(currentAccessory);

  useEffect(() => {
    const m = document.createElement('meta'); m.name = 'robots'; m.content = 'noindex, nofollow';
    document.head.appendChild(m); const t = document.title; document.title = 'Account recovery - Ardovo';
    return () => { try { document.head.removeChild(m); } catch {} document.title = t; };
  }, []);

  const enter = () => { grantAccessCode(); setFlash(true); setWarp(true); setTimeout(() => nav('/app'), 1150); };
  const pwInfo = scorePassword(pw);

  const find = (e) => {
    e.preventDefault(); setErr('');
    const f = accountFactors(email);
    if (!f.exists) { setStep('notfound'); return; }
    setFactors(f); setStep('options');
  };

  const useCode = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const r = await loginWithRecoveryCode({ email, code });
      if (!r.ok) { setErr(r.error); return; }
      setRemaining(r.remaining);
      if (intent === 'reset') setStep('reset'); else enter();
    } finally { setBusy(false); }
  };

  const doReset = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const r = await setAccountPassword(factors.id, pw);
      if (!r.ok) { setErr(r.error); return; }
      enter();
    } finally { setBusy(false); }
  };

  const mood = busy ? 'thinking' : flash ? 'happy' : err ? 'oops' : step === 'notfound' ? 'oops' : 'idle';
  const message = (() => {
    if (busy) return 'One moment, checking that...';
    if (flash) return "Great - you're in. Let's get you to your workspace.";
    if (err) return "That didn't match, but we are not stuck. Try again, or tap a human.";
    if (step === 'find') return "Locked out? Deep breath. Tell me your email and I'll find your way back in.";
    if (step === 'notfound') return "I couldn't find that email. Double-check it, or let a human help you.";
    if (step === 'options') return "Good news - here are the doors that work for your account. Pick whichever is easiest.";
    if (step === 'code') return intent === 'reset' ? "Enter one recovery code and we'll set a brand new password." : "Enter one of your recovery codes. Each works once - I'll tell you how many are left.";
    if (step === 'reset') return "Last step: pick a fresh passphrase. Length beats symbols. Then you're in.";
    return '';
  })();

  return (
    <div className="rc-wrap">
      <div className="rc-aside">
        <AuthBackdrop tint="teal" warp={warp} />
        <div className="rc-aside-in">
          <div className="rc-brand"><span className="rc-mark"><img src="/brand/ardovo-icon.png" alt="Ardovo" /></span> Ardovo</div>
          <div className="rc-guide"><AuthGuide mood={mood} message={message} size={150} accessory={accessory} /></div>
          <p className="rc-sub">No password? Lost your phone? Clicked forgot-password ten times? None of that locks you out here. We will always find you a way back in.</p>
        </div>
      </div>

      <div className="rc-panel">
        <div className="rc-panel-body">
        <div className="rc-card">
          <div className="rc-logo"><span className="rc-mark sm"><img src="/brand/ardovo-icon.png" alt="Ardovo" /></span> Ardovo</div>
          <div className="rc-guide-m"><AuthGuide mood={mood} message={message} size={92} compact accessory={accessory} /></div>

          {step === 'find' && (
            <>
              <h2 className="rc-h">Let's get you back in</h2>
              <p className="rc-p">Start with the email on your account. We will only show recovery options that actually work for you.</p>
              <form onSubmit={find} className="rc-form" noValidate>
                <label className="rc-field"><span>Email</span>
                  <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" inputMode="email" autoComplete="email" autoFocus />
                </label>
                {err && <div className="rc-err"><Icon name="activity" size={14} /> {err}</div>}
                <button className="rc-submit" type="submit">Find my options <Icon name="chevronRight" size={17} /></button>
              </form>
              <div className="rc-alt"><button onClick={() => nav('/login')}>Back to sign in</button></div>
            </>
          )}

          {step === 'notfound' && (
            <>
              <h2 className="rc-h">Hmm, no account there</h2>
              <p className="rc-p">We could not find an account for <strong>{email}</strong>. It might be a typo, or you may sign in with Google. Try again, or let a human help.</p>
              <div className="rc-doors">
                <button className="rc-door" onClick={() => { setErr(''); setStep('find'); }}><span className="rc-door-ic"><Icon name="mail" size={18} /></span><div><div className="rc-door-t">Try a different email</div><div className="rc-door-d">Maybe a personal vs work address.</div></div></button>
                <button className="rc-door" onClick={() => nav('/login')}><span className="rc-door-ic"><Icon name="user" size={18} /></span><div><div className="rc-door-t">Sign in with Google</div><div className="rc-door-d">If you created your account that way.</div></div></button>
              </div>
              <HelpRow nav={nav} />
            </>
          )}

          {step === 'options' && factors && (
            <>
              <h2 className="rc-h">Pick your way back in</h2>
              <p className="rc-p">For <strong>{factors.email}</strong>. Choose whatever is easiest - they all land you in your workspace.</p>
              <div className="rc-doors">
                {factors.sso === 'google' && (
                  <button className="rc-door" onClick={() => nav('/login')}>
                    <span className="rc-door-ic"><Icon name="user" size={18} /></span>
                    <div><div className="rc-door-t">Sign in with Google</div><div className="rc-door-d">The fastest door - no password needed.</div></div>
                  </button>
                )}
                {factors.recoveryCodes > 0 && (
                  <>
                    <button className="rc-door" onClick={() => { setIntent('signin'); setErr(''); setStep('code'); }}>
                      <span className="rc-door-ic"><Icon name="key" size={18} /></span>
                      <div><div className="rc-door-t">Use a recovery code</div><div className="rc-door-d">Sign in now with one of your saved codes. {factors.recoveryCodes} left.</div></div>
                    </button>
                    <button className="rc-door" onClick={() => { setIntent('reset'); setErr(''); setStep('code'); }}>
                      <span className="rc-door-ic"><Icon name="lock" size={18} /></span>
                      <div><div className="rc-door-t">Reset my password</div><div className="rc-door-d">Verify with a recovery code, then set a new one.</div></div>
                    </button>
                  </>
                )}
                {factors.recoveryCodes === 0 && factors.sso !== 'google' && (
                  <div className="rc-note"><Icon name="lifebuoy" size={16} /> You have no recovery codes on file and did not use Google, so the safest way in is a quick identity check with our concierge. We will verify it is you and get you in - no lockout.</div>
                )}
              </div>
              <HelpRow nav={nav} />
              <div className="rc-alt"><button onClick={() => { setErr(''); setStep('find'); }}>Use a different email</button></div>
            </>
          )}

          {step === 'code' && (
            <>
              <h2 className="rc-h">{intent === 'reset' ? 'Verify, then reset' : 'Enter a recovery code'}</h2>
              <p className="rc-p">These are the one-time codes you saved when you turned on two-factor. Each works once.</p>
              <form onSubmit={useCode} className="rc-form" noValidate>
                <label className="rc-field"><span>Recovery code</span>
                  <input value={code} onChange={e => setCode(e.target.value)} placeholder="a1b2-c3d4-e5f6" autoFocus className="rc-code" />
                </label>
                {err && <div className="rc-err"><Icon name="activity" size={14} /> {err}</div>}
                <button className="rc-submit" type="submit" disabled={busy}>{busy ? 'Checking...' : intent === 'reset' ? 'Verify code' : 'Sign me in'} <Icon name="chevronRight" size={17} /></button>
              </form>
              <div className="rc-alt"><button onClick={() => { setErr(''); setStep('options'); }}>Back</button></div>
              <HelpRow nav={nav} />
            </>
          )}

          {step === 'reset' && (
            <>
              <h2 className="rc-h">Set a fresh password</h2>
              <p className="rc-p">You are verified.{remaining != null && ` ${remaining} recovery code${remaining === 1 ? '' : 's'} left.`} Pick a new passphrase and you are in.</p>
              <form onSubmit={doReset} className="rc-form" noValidate>
                <div className="rc-field"><span>New password</span>
                  <div className="rc-pw">
                    <input type={showPw ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)} placeholder="A phrase you will remember" autoComplete="new-password" autoFocus />
                    <button type="button" className="rc-eye" tabIndex={-1} onClick={() => setShowPw(v => !v)} aria-label={showPw ? 'Hide' : 'Show'}><Icon name={showPw ? 'eyeOff' : 'eye'} size={17} /></button>
                  </div>
                  {pw && (
                    <div className="rc-meter">
                      <div className="rc-meter-track"><div className={`rc-meter-fill t-${pwInfo.tone}`} style={{ width: `${(pwInfo.score / 4) * 100}%` }} /></div>
                      <div className="rc-meter-note">{pwInfo.label ? pwInfo.label + '. ' : ''}{pwInfo.note}</div>
                    </div>
                  )}
                </div>
                {err && <div className="rc-err"><Icon name="activity" size={14} /> {err}</div>}
                <button className="rc-submit" type="submit" disabled={busy || !pwInfo.ok}>{busy ? 'Saving...' : 'Save + sign in'} <Icon name="chevronRight" size={17} /></button>
              </form>
            </>
          )}
        </div>
        </div>
        <AuthTrust />
      </div>
      <RecoverStyles />
    </div>
  );
}

function HelpRow({ nav }) {
  return (
    <div className="rc-help">
      <span className="rc-help-ic"><Icon name="lifebuoy" size={15} /></span>
      <span className="rc-help-t">Still stuck?</span>
      {hasPhone() && <a className="rc-help-a" href={telHref()}><Icon name="phone" size={13} /> Call {formatPhone(HELP_NUMBER)}</a>}
      <button type="button" className="rc-help-b" onClick={() => nav('/login-help')}>Talk to a human</button>
    </div>
  );
}

function RecoverStyles() {
  return (
    <style>{`
    .rc-wrap { min-height: 100vh; display: grid; grid-template-columns: 1.05fr 1fr; background: #0b0d14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    @media (max-width: 820px) { .rc-wrap { grid-template-columns: 1fr; } .rc-aside { display: none; } }
    .rc-aside { position: relative; overflow: hidden; background: radial-gradient(120% 120% at 20% 10%, #12324a, #0b0d14 55%); color: #fff; }
    .rc-aside-in { position: relative; z-index: 2; height: 100%; display: flex; flex-direction: column; justify-content: center; padding: 6vw; max-width: 640px; }
    .rc-brand { display: flex; align-items: center; gap: 12px; font-size: 26px; font-weight: 900; letter-spacing: -.02em; }
    .rc-mark { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; overflow: hidden; }
    .rc-mark img { width: 100%; height: 100%; object-fit: contain; }
    .rc-mark.sm { width: 32px; height: 32px; border-radius: 9px; }
    .rc-guide { margin: 34px 0 30px; }
    .rc-guide-m { display: none; margin: 4px 0 18px; }
    @media (max-width: 820px) { .rc-guide-m { display: block; } }
    .rc-sub { font-size: 16px; color: #a9b4c4; line-height: 1.6; max-width: 470px; }
    .rc-orbs span { position: absolute; border-radius: 50%; filter: blur(50px); opacity: .5; }
    .rc-orbs span:nth-child(1) { width: 340px; height: 340px; background: #0e9f8f; top: -60px; right: -80px; }
    .rc-orbs span:nth-child(2) { width: 260px; height: 260px; background: #7c5cf7; bottom: 40px; left: -60px; opacity: .35; }

    .rc-panel { display: flex; flex-direction: column; padding: 32px 32px 26px; background: #fff; }
    .rc-panel-body { flex: 1; display: grid; place-items: center; width: 100%; }
    .rc-card { width: 100%; max-width: 420px; animation: rcCardIn .55s cubic-bezier(.22,1,.36,1) both; }
    @keyframes rcCardIn { 0% { opacity: 0; transform: translateY(14px); } 100% { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) { .rc-card { animation: none; } }
    .rc-logo { display: none; align-items: center; gap: 10px; font-size: 22px; font-weight: 900; color: #0d1117; margin-bottom: 24px; }
    @media (max-width: 820px) { .rc-logo { display: flex; } }
    .rc-h { font-size: 26px; font-weight: 900; letter-spacing: -.02em; color: #0d1117; margin: 0; }
    .rc-p { font-size: 15px; color: #5b6474; margin: 8px 0 22px; line-height: 1.55; }
    .rc-form { display: flex; flex-direction: column; gap: 15px; }
    .rc-field { display: flex; flex-direction: column; gap: 7px; }
    .rc-field span { font-size: 13.5px; font-weight: 700; color: #0d1117; }
    .rc-field input { width: 100%; box-sizing: border-box; border: 1px solid #e3e7ee; border-radius: 12px; padding: 13px 14px; font-size: 15px; font-family: inherit; color: #0d1117; outline: none; transition: border-color .14s, box-shadow .14s; }
    .rc-field input:focus { border-color: #0e9f8f; box-shadow: 0 0 0 3px rgba(14,159,143,.15); }
    .rc-code { letter-spacing: .18em; font-weight: 700; text-align: center; }
    .rc-pw { position: relative; }
    .rc-pw input { padding-right: 44px; }
    .rc-eye { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); width: 34px; height: 34px; display: grid; place-items: center; background: none; border: none; color: #8a92a3; cursor: pointer; border-radius: 8px; }
    .rc-eye:hover { color: #0e9f8f; background: rgba(14,159,143,.08); }
    .rc-meter { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
    .rc-meter-track { height: 6px; border-radius: 6px; background: #eef1f5; overflow: hidden; }
    .rc-meter-fill { height: 100%; border-radius: 6px; transition: width .3s ease; }
    .rc-meter-fill.t-risk { background: #e05d44; } .rc-meter-fill.t-warn { background: #e8973a; }
    .rc-meter-fill.t-info { background: #2f8fd6; } .rc-meter-fill.t-ok { background: #0e9f8f; }
    .rc-meter-note { font-size: 12.5px; font-weight: 600; color: #5b6474; }
    .rc-err { display: flex; align-items: center; gap: 7px; font-size: 13.5px; font-weight: 600; color: #c0392b; background: #fdecea; border: 1px solid #f5c6c0; border-radius: 10px; padding: 10px 12px; }
    .rc-submit { position: relative; overflow: hidden; display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-family: inherit; font-size: 16px; font-weight: 800; color: #fff; background: linear-gradient(100deg, #0e9f8f, #14b8a6); border: none; border-radius: 13px; padding: 14px; cursor: pointer; box-shadow: 0 14px 32px -14px rgba(14,159,143,.7); transition: transform .14s, box-shadow .14s; margin-top: 4px; }
    .rc-submit::after { content: ''; position: absolute; top: 0; left: -60%; width: 40%; height: 100%; background: linear-gradient(100deg, transparent, rgba(255,255,255,.35), transparent); transform: skewX(-18deg); animation: rcSheen 4.5s ease-in-out infinite; }
    @keyframes rcSheen { 0%, 55% { left: -60%; } 80%, 100% { left: 130%; } }
    .rc-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 20px 40px -14px rgba(14,159,143,.8); }
    .rc-submit:disabled { opacity: .6; cursor: default; }
    @media (prefers-reduced-motion: reduce) { .rc-submit::after { animation: none; display: none; } }
    .rc-alt { text-align: center; font-size: 14px; color: #5b6474; margin-top: 18px; }
    .rc-alt button { font-family: inherit; font-size: 14px; font-weight: 700; color: #0e9f8f; background: none; border: none; cursor: pointer; padding: 0; }
    .rc-doors { display: flex; flex-direction: column; gap: 10px; }
    .rc-door { display: flex; align-items: center; gap: 13px; text-align: left; width: 100%; background: #fff; border: 1px solid #e3e7ee; border-radius: 14px; padding: 14px 15px; cursor: pointer; font-family: inherit; transition: border-color .14s, box-shadow .14s, transform .14s; }
    .rc-door:hover { border-color: #0e9f8f; box-shadow: 0 12px 30px -18px rgba(14,159,143,.6); transform: translateY(-1px); }
    .rc-door-ic { width: 40px; height: 40px; flex: none; border-radius: 11px; display: grid; place-items: center; background: rgba(14,159,143,.1); color: #0e9f8f; }
    .rc-door-t { font-size: 15px; font-weight: 800; color: #0d1117; }
    .rc-door-d { font-size: 13px; color: #5b6474; margin-top: 2px; }
    .rc-note { display: flex; gap: 9px; font-size: 13.5px; line-height: 1.5; color: #5b6474; background: #f4fbfa; border: 1px solid #e6f4f1; border-radius: 12px; padding: 13px 14px; }
    .rc-note svg { color: #0e9f8f; flex: none; margin-top: 1px; }
    .rc-help { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; justify-content: center; margin-top: 20px; padding: 12px 14px; border: 1px solid #e6f4f1; background: #f4fbfa; border-radius: 12px; }
    .rc-help-ic { color: #0e9f8f; display: inline-flex; }
    .rc-help-t { font-size: 13px; font-weight: 700; color: #0d1117; }
    .rc-help-a { display: inline-flex; align-items: center; gap: 5px; font-size: 13px; font-weight: 700; color: #0e9f8f; text-decoration: none; }
    .rc-help-a:hover { text-decoration: underline; }
    .rc-help-b { font-family: inherit; font-size: 13px; font-weight: 700; color: #fff; background: linear-gradient(100deg, #0e9f8f, #14b8a6); border: none; border-radius: 9px; padding: 7px 13px; cursor: pointer; }
    `}</style>
  );
}
