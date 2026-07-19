// LoginHelp - the "call a human (or AI) to help me log in" concierge front door
// at /login-help. Nobody else does this. Ardo greets you, offers a real dial
// line the instant a number is provisioned (VITE_LOGIN_HELP_NUMBER), always
// offers email, and answers the exact pain points people hit: forgot password,
// new phone / lost authenticator, can't find the reset email, password rules.
// No dead buttons: surfaces render only when the channel is real.
// NO em-dash / en-dash. ASCII hyphen only.
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/icons.jsx';
import AuthGuide from '../components/AuthGuide.jsx';
import { hasPhone, HELP_NUMBER, HELP_EMAIL, formatPhone, telHref } from '../lib/concierge.js';

// Copy adapts to what is actually wired: when a live phone line exists we say
// "call"; when it does not, we point at the concierge without promising a call.
const buildFixes = (phone) => [
  { icon: 'lock', q: 'I forgot my password', a: 'No problem, and no lockout. Head to account recovery - if you saved recovery codes or use Google, you are back in seconds, and you can set a brand new password on the spot.', to: '/recover' },
  { icon: 'phone', q: 'I got a new phone / lost my authenticator', a: `Your codes moved to a new phone and stopped working? Use one recovery code to sign in, then re-enroll your authenticator in Security. If you have no codes left, ${phone ? 'call us' : 'reach the concierge below'} and we will verify you and get you in.`, to: '/recover' },
  { icon: 'mail', q: 'I cannot find the reset email', a: `Check spam and search for "Ardovo". Still nothing? You do not have to wait on email at all - use a recovery code or Google to get in now, or ${phone ? 'call the concierge below' : 'reach the concierge below'}.`, to: '/recover' },
  { icon: 'shield', q: 'What are the password rules?', a: 'Kind ones. At least 12 characters (a short phrase is perfect), no forced symbols or numbers, no monthly resets. We only block passwords that showed up in a public breach. Length beats complexity.' },
  { icon: 'key', q: 'Too many attempts - am I locked out?', a: `You are never hard-locked here. We slow things down briefly if something looks off, then let you right back in. If you are in a hurry, ${phone ? 'call the concierge' : 'reach the concierge below'} and skip the wait.` },
];

export default function LoginHelp() {
  const nav = useNavigate();
  const phone = hasPhone();
  const FIXES = buildFixes(phone);
  useEffect(() => {
    const m = document.createElement('meta'); m.name = 'robots'; m.content = 'noindex, nofollow';
    document.head.appendChild(m); const t = document.title; document.title = 'Login help - Ardovo';
    return () => { try { document.head.removeChild(m); } catch {} document.title = t; };
  }, []);

  return (
    <div className="lh-wrap">
      <div className="lh-aside">
        <div className="lh-orbs" aria-hidden><span /><span /></div>
        <div className="lh-aside-in">
          <div className="lh-brand"><span className="lh-mark"><img src="/brand/ardovo-icon.png" alt="Ardovo" /></span> Ardovo</div>
          <div className="lh-guide"><AuthGuide mood="listening" message={phone ? "You reached login help. Tell me what's happening and we'll get you in - a real person is one call away too." : "You reached login help. Tell me what's happening and we'll get you in - fast, and never from scratch."} size={150} /></div>
          <p className="lh-sub">{phone ? 'A help line for logging in. Weird, right? We think being stuck at the front door should never ruin your day. Call, email, or use a quick fix below.' : 'A help desk just for logging in. Weird, right? We think being stuck at the front door should never ruin your day. Email us or use a quick fix below - no ticket queue.'}</p>
        </div>
      </div>

      <div className="lh-panel">
        <div className="lh-card">
          <div className="lh-logo"><span className="lh-mark sm"><img src="/brand/ardovo-icon.png" alt="Ardovo" /></span> Ardovo</div>
          <div className="lh-guide-m"><AuthGuide mood="listening" message={phone ? "Let's get you in. A real person is one tap away." : "Let's get you in. No lockout, ever."} size={92} compact /></div>

          <h2 className="lh-h">Talk to login help</h2>
          <p className="lh-p">Real help getting into your account - no ticket queue, no runaround.</p>

          <div className="lh-channels">
            {hasPhone() && (
              <a className="lh-chan lh-chan-primary" href={telHref()}>
                <span className="lh-chan-ic"><Icon name="phone" size={20} /></span>
                <div><div className="lh-chan-t">Call the concierge</div><div className="lh-chan-d">{formatPhone(HELP_NUMBER)} - a person picks up and walks you in.</div></div>
                <Icon name="chevronRight" size={18} />
              </a>
            )}
            <a className="lh-chan" href={`mailto:${HELP_EMAIL}?subject=Login%20help`}>
              <span className="lh-chan-ic"><Icon name="mail" size={20} /></span>
              <div><div className="lh-chan-t">Email us</div><div className="lh-chan-d">{HELP_EMAIL} - we reply fast and never make you start over.</div></div>
              <Icon name="chevronRight" size={18} />
            </a>
            <button className="lh-chan" onClick={() => nav('/recover')}>
              <span className="lh-chan-ic"><Icon name="lifebuoy" size={20} /></span>
              <div><div className="lh-chan-t">Self-serve recovery</div><div className="lh-chan-d">Back in yourself in under a minute. No lockout, ever.</div></div>
              <Icon name="chevronRight" size={18} />
            </button>
          </div>

          <h3 className="lh-sh">Quick fixes</h3>
          <div className="lh-fixes">
            {FIXES.map(f => (
              <details key={f.q} className="lh-fix">
                <summary><span className="lh-fix-ic"><Icon name={f.icon} size={16} /></span> {f.q} <span className="lh-fix-caret"><Icon name="chevronRight" size={15} /></span></summary>
                <div className="lh-fix-a">{f.a} {f.to && <button className="lh-fix-link" onClick={() => nav(f.to)}>Go there <Icon name="chevronRight" size={13} /></button>}</div>
              </details>
            ))}
          </div>

          <div className="lh-alt"><button onClick={() => nav('/login')}><Icon name="arrowLeft" size={15} /> Back to sign in</button></div>
        </div>
      </div>
      <LoginHelpStyles />
    </div>
  );
}

function LoginHelpStyles() {
  return (
    <style>{`
    .lh-wrap { min-height: 100vh; display: grid; grid-template-columns: 1.05fr 1fr; background: #0b0d14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    @media (max-width: 820px) { .lh-wrap { grid-template-columns: 1fr; } .lh-aside { display: none; } }
    .lh-aside { position: relative; overflow: hidden; background: radial-gradient(120% 120% at 20% 10%, #1a1436, #0b0d14 55%); color: #fff; }
    .lh-aside-in { position: relative; z-index: 2; height: 100%; display: flex; flex-direction: column; justify-content: center; padding: 6vw; max-width: 640px; }
    .lh-brand { display: flex; align-items: center; gap: 12px; font-size: 26px; font-weight: 900; letter-spacing: -.02em; }
    .lh-mark { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; overflow: hidden; }
    .lh-mark img { width: 100%; height: 100%; object-fit: contain; }
    .lh-mark.sm { width: 32px; height: 32px; border-radius: 9px; }
    .lh-guide { margin: 34px 0 30px; }
    .lh-guide-m { display: none; margin: 4px 0 18px; }
    @media (max-width: 820px) { .lh-guide-m { display: block; } }
    .lh-sub { font-size: 16px; color: #b4acce; line-height: 1.6; max-width: 470px; }
    .lh-orbs span { position: absolute; border-radius: 50%; filter: blur(50px); opacity: .5; }
    .lh-orbs span:nth-child(1) { width: 340px; height: 340px; background: #7c5cf7; top: -60px; right: -80px; }
    .lh-orbs span:nth-child(2) { width: 260px; height: 260px; background: #0e9f8f; bottom: 40px; left: -60px; opacity: .3; }

    .lh-panel { display: grid; place-items: center; padding: 32px; background: #fff; }
    .lh-card { width: 100%; max-width: 440px; }
    .lh-logo { display: none; align-items: center; gap: 10px; font-size: 22px; font-weight: 900; color: #0d1117; margin-bottom: 24px; }
    @media (max-width: 820px) { .lh-logo { display: flex; } }
    .lh-h { font-size: 26px; font-weight: 900; letter-spacing: -.02em; color: #0d1117; margin: 0; }
    .lh-p { font-size: 15px; color: #5b6474; margin: 8px 0 22px; }
    .lh-channels { display: flex; flex-direction: column; gap: 10px; }
    .lh-chan { display: flex; align-items: center; gap: 13px; width: 100%; text-align: left; background: #fff; border: 1px solid #e3e7ee; border-radius: 14px; padding: 14px 15px; cursor: pointer; font-family: inherit; text-decoration: none; color: inherit; transition: border-color .14s, box-shadow .14s, transform .14s; }
    .lh-chan:hover { border-color: #0e9f8f; box-shadow: 0 12px 30px -18px rgba(14,159,143,.6); transform: translateY(-1px); }
    .lh-chan > svg:last-child { margin-left: auto; color: #b6bdc9; }
    .lh-chan-primary { border-color: #0e9f8f; background: linear-gradient(100deg, rgba(14,159,143,.07), rgba(20,184,166,.04)); }
    .lh-chan-ic { width: 44px; height: 44px; flex: none; border-radius: 12px; display: grid; place-items: center; background: rgba(14,159,143,.12); color: #0e9f8f; }
    .lh-chan-primary .lh-chan-ic { background: #0e9f8f; color: #fff; }
    .lh-chan-t { font-size: 15.5px; font-weight: 800; color: #0d1117; }
    .lh-chan-d { font-size: 13px; color: #5b6474; margin-top: 2px; }
    .lh-sh { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; color: #8a92a3; margin: 28px 0 12px; }
    .lh-fixes { display: flex; flex-direction: column; gap: 8px; }
    .lh-fix { border: 1px solid #e9edf2; border-radius: 12px; overflow: hidden; }
    .lh-fix summary { display: flex; align-items: center; gap: 10px; padding: 13px 14px; font-size: 14.5px; font-weight: 700; color: #0d1117; cursor: pointer; list-style: none; }
    .lh-fix summary::-webkit-details-marker { display: none; }
    .lh-fix-ic { color: #0e9f8f; display: inline-flex; }
    .lh-fix-caret { margin-left: auto; color: #b6bdc9; transition: transform .18s; }
    .lh-fix[open] .lh-fix-caret { transform: rotate(90deg); }
    .lh-fix-a { padding: 0 14px 14px 40px; font-size: 13.5px; line-height: 1.6; color: #5b6474; }
    .lh-fix-link { display: inline-flex; align-items: center; gap: 4px; font-family: inherit; font-size: 13px; font-weight: 800; color: #0e9f8f; background: none; border: none; padding: 0; margin-top: 6px; cursor: pointer; }
    .lh-alt { text-align: center; margin-top: 24px; }
    .lh-alt button { display: inline-flex; align-items: center; gap: 5px; font-family: inherit; font-size: 14px; font-weight: 700; color: #0e9f8f; background: none; border: none; cursor: pointer; }
    `}</style>
  );
}
