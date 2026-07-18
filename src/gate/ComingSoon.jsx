// ============================================================
// ARDOVO COMING-SOON GATE
// Locks the product app while the waitlist fills. Collects name, email,
// phone, company, size, and industry and posts to /api/waitlist (which
// emails Nate). A quiet "access code" affordance posts to /api/unlock so
// the operator can get straight into the product. NO em-dash / en-dash.
// ============================================================
import React, { useState } from 'react';
import { Icon } from '../components/icons.jsx';
import './coming-soon.css';

const ACCESS_KEY = 'rally_access';
export const isUnlocked = () => {
  try { return localStorage.getItem(ACCESS_KEY) === 'granted'; } catch { return false; }
};
export const grantAccess = () => { try { localStorage.setItem(ACCESS_KEY, 'granted'); } catch {} };

const SIZES = ['Just me', '2-10', '11-50', '51-200', '201-1000', '1000+'];
const INDUSTRIES = [
  'Software / SaaS', 'Financial services', 'Real estate', 'Insurance', 'Healthcare',
  'Manufacturing', 'Professional services', 'Marketing / Agency', 'Construction',
  'Retail / Ecommerce', 'Media', 'Education', 'Nonprofit', 'Other',
];

export default function ComingSoon({ onUnlock }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', company: '', companySize: '', industry: '' });
  const [status, setStatus] = useState('idle'); // idle | sending | done | error
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const [showAccess, setShowAccess] = useState(false);
  const [code, setCode] = useState('');
  const [accessState, setAccessState] = useState('idle'); // idle | checking | error
  const [accessErr, setAccessErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) { setErr('Please enter a valid email.'); return; }
    if (!f.name.trim()) { setErr('Please tell us your name.'); return; }
    setStatus('sending');
    try {
      const r = await fetch('/api/waitlist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, sourceUrl: window.location.href }),
      });
      if (!r.ok) throw new Error('bad status');
      setStatus('done');
    } catch {
      setStatus('error');
      setErr('Something went wrong. Please try again in a moment.');
    }
  };

  const unlock = async (e) => {
    e.preventDefault();
    setAccessErr('');
    if (!code.trim()) return;
    setAccessState('checking');
    try {
      const r = await fetch('/api/unlock', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) { grantAccess(); onUnlock?.(); return; }
      setAccessState('error');
      setAccessErr(j.error || 'That code is not right.');
    } catch {
      setAccessState('error');
      setAccessErr('Could not verify right now. Try again.');
    }
  };

  return (
    <div className="cs">
      <div className="cs-orbs" aria-hidden><span className="o1" /><span className="o2" /><span className="o3" /></div>
      <div className="cs-grid" aria-hidden />

      <div className="cs-card">
        <div className="cs-brand">
          <span className="cs-mark"><Icon name="zap" size={22} fill="#fff" stroke={0} /></span>
          Ardovo
        </div>

        {status === 'done' ? (
          <div className="cs-success">
            <div className="cs-check"><Icon name="check" size={38} stroke={2.5} /></div>
            <h1 className="cs-h1" style={{ fontSize: 'clamp(1.7rem,4.5vw,2.3rem)' }}>You are on the list</h1>
            <p className="cs-sub" style={{ maxWidth: 400, margin: '14px auto 0' }}>
              Thanks{f.name ? `, ${f.name.split(' ')[0]}` : ''}. We will reach out to {f.email} the moment your early access is ready.
            </p>
          </div>
        ) : (
          <>
            <div className="cs-eyebrow"><span className="cs-live" /> Launching soon</div>
            <h1 className="cs-h1">Run your revenue on <span className="cs-grad">Ardovo</span></h1>
            <p className="cs-sub">
              The AI-native CRM and revenue platform, with an operator that actually runs the work. We are opening access in waves. Request yours below.
            </p>

            <form className="cs-form cs-stagger" onSubmit={submit}>
              <div className="cs-row">
                <div className="cs-field"><label className="cs-label">Name</label>
                  <input className="cs-input" value={f.name} onChange={set('name')} placeholder="Jordan Avery" autoComplete="name" /></div>
                <div className="cs-field"><label className="cs-label">Work email</label>
                  <input className="cs-input" type="email" value={f.email} onChange={set('email')} placeholder="you@company.com" autoComplete="email" /></div>
              </div>
              <div className="cs-row">
                <div className="cs-field"><label className="cs-label">Phone</label>
                  <input className="cs-input" value={f.phone} onChange={set('phone')} placeholder="(555) 000-0000" autoComplete="tel" /></div>
                <div className="cs-field"><label className="cs-label">Company</label>
                  <input className="cs-input" value={f.company} onChange={set('company')} placeholder="Company name" autoComplete="organization" /></div>
              </div>
              <div className="cs-row">
                <div className="cs-field"><label className="cs-label">Company size</label>
                  <select className="cs-select" value={f.companySize} onChange={set('companySize')}>
                    <option value="">Select...</option>
                    {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select></div>
                <div className="cs-field"><label className="cs-label">Industry</label>
                  <select className="cs-select" value={f.industry} onChange={set('industry')}>
                    <option value="">Select...</option>
                    {INDUSTRIES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select></div>
              </div>
              {err && <div className="cs-err">{err}</div>}
              <button className="cs-btn" type="submit" disabled={status === 'sending'}>
                {status === 'sending' ? <><span className="cs-spin" /> Sending...</> : <>Request early access <Icon name="chevronRight" size={18} /></>}
              </button>
            </form>
          </>
        )}

        <div className="cs-foot">
          <span className="cs-social">Built AI-native from the first commit.</span>
          {!showAccess && (
            <button className="cs-accesslink" onClick={() => setShowAccess(true)}>
              <Icon name="lock" size={14} /> I have an access code
            </button>
          )}
        </div>

        {showAccess && (
          <form className="cs-access" onSubmit={unlock}>
            <div className="cs-inline">
              <input className="cs-input" value={code} onChange={(e) => setCode(e.target.value)}
                placeholder="Access code" autoFocus autoComplete="off" spellCheck={false} />
              <button className="cs-unlock" type="submit" disabled={accessState === 'checking'}>
                {accessState === 'checking' ? <span className="cs-spin" /> : 'Enter'}
              </button>
            </div>
            {accessErr && <div className="cs-err">{accessErr}</div>}
          </form>
        )}
      </div>
    </div>
  );
}
