// EarlyAccess - the "next generation" marketing capture at /early-access.
// A cinematic, animated pitch for Ardovo's AI-native platform with a living
// diagram of the agent stack, then an early-access form (name, work email,
// phone, company size, which AI features they want, and one open question).
// Submissions POST to /api/waitlist (durable + email) AND dispatch the
// 'rally:signup' event so they land in the super-admin dashboard immediately.
// NO em-dash / en-dash. ASCII hyphen only.
import React, { useState } from 'react';
import { Reveal, CtaBand } from './kit.jsx';
import { Icon } from '../components/icons.jsx';

const SIZES = [
  { v: '1-10', seats: 8 }, { v: '11-50', seats: 30 }, { v: '51-200', seats: 120 },
  { v: '201-1000', seats: 500 }, { v: '1000+', seats: 1500 },
];
const AI_FEATURES = [
  { id: 'rook', label: 'Rook operator', icon: 'sparkles' },
  { id: 'agent-cloud', label: 'Agent Cloud', icon: 'command' },
  { id: 'atlas', label: 'Atlas deal maps', icon: 'radar' },
  { id: 'voice', label: 'AI voice qualifier', icon: 'mic' },
  { id: 'nightshift', label: 'Autonomous Night Shift', icon: 'moon' },
  { id: 'migration', label: 'AI migration wizard', icon: 'swap' },
  { id: 'forecast', label: 'Predictive forecasting', icon: 'trendUp' },
  { id: 'training', label: 'Self-serve training', icon: 'rocket' },
];

export default function EarlyAccess() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', size: '', want: '', features: [] });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleFeature = (id) => setForm(f => ({ ...f, features: f.features.includes(id) ? f.features.filter(x => x !== id) : [...f.features, id] }));

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!form.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setErr('Add your name and a valid work email.'); return; }
    setBusy(true);
    const size = SIZES.find(s => s.v === form.size);
    const featLabels = form.features.map(id => AI_FEATURES.find(f => f.id === id)?.label).filter(Boolean);
    // Land it in the super-admin dashboard immediately (local intake).
    try {
      window.dispatchEvent(new CustomEvent('rally:signup', { detail: {
        name: form.name, email: form.email.toLowerCase(), company: form.company || (form.email.split('@')[1] || '').split('.')[0],
        seats: size?.seats || 1, source: 'marketing', status: 'lead', industry: 'Other',
        note: `Wants: ${featLabels.join(', ') || 'exploring'}. ${form.want}`.trim(),
      } }));
    } catch {}
    // Durable server capture + email to the team.
    try {
      await fetch('/api/waitlist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone, companySize: form.size, industry: featLabels.join(', '), sourceUrl: window.location.href }),
      });
    } catch {}
    setBusy(false); setDone(true); window.scrollTo(0, 0);
  };

  if (done) {
    return (
      <section className="mkt-section" style={{ paddingTop: 80 }}>
        <div className="mkt-wrap" style={{ maxWidth: 640, textAlign: 'center' }}>
          <Reveal>
            <span className="ea-badge" style={{ marginInline: 'auto' }}><Icon name="check" size={14} /> You are on the list</span>
            <h1 className="mkt-h2" style={{ marginTop: 20 }}>Welcome to the next generation, {form.name.split(' ')[0]}.</h1>
            <p className="mkt-lead" style={{ maxWidth: 480, margin: '16px auto 0' }}>
              We captured what you want to build. A Ardovo operator will reach out with early access shaped around it. In the meantime, drive the live demo.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}>
              <a className="mkt-btn mkt-btn-primary mkt-btn-lg" href="/demo"><Icon name="eye" size={18} /> Try the live demo</a>
              <a className="mkt-btn mkt-btn-ghost mkt-btn-lg" href="/get-started">See if you qualify</a>
            </div>
          </Reveal>
        </div>
        <EarlyAccessStyles />
      </section>
    );
  }

  return (
    <>
      <section className="ea-hero">
        <div className="ea-mesh" aria-hidden><span /><span /><span /></div>
        <div className="mkt-wrap" style={{ position: 'relative', zIndex: 2 }}>
          <Reveal>
            <span className="ea-badge"><span className="ea-badge-dot" /> Next generation - early access</span>
            <h1 className="ea-h1">The CRM that <span className="ea-grad">runs itself.</span></h1>
            <p className="ea-lead">
              Ardovo is the first AI-native revenue platform where agents do the work: qualify, forecast, migrate, and close - grounded in your book, governed by you. We are opening access in waves.
            </p>
          </Reveal>

          {/* Living agent-stack diagram */}
          <Reveal delay={120}>
            <div className="ea-diagram" aria-hidden>
              <div className="ea-layer ea-l1"><span className="ea-node"><Icon name="sparkles" size={16} /> Rook operator</span></div>
              <div className="ea-flow"><i /><i /><i /></div>
              <div className="ea-layer ea-l2">
                <span className="ea-node"><Icon name="command" size={15} /> Agent Cloud</span>
                <span className="ea-node"><Icon name="radar" size={15} /> Atlas</span>
                <span className="ea-node"><Icon name="moon" size={15} /> Night Shift</span>
                <span className="ea-node"><Icon name="mic" size={15} /> Voice</span>
              </div>
              <div className="ea-flow"><i /><i /><i /></div>
              <div className="ea-layer ea-l3"><span className="ea-node ea-book"><Icon name="target" size={15} /> Your live book of business</span></div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mkt-section-sm" style={{ paddingTop: 8 }}>
        <div className="mkt-wrap" style={{ maxWidth: 620 }}>
          <Reveal>
            <form className="ea-card" onSubmit={submit} noValidate>
              <h2 className="ea-formh">Request early access</h2>
              <p className="ea-formp">Tell us who you are and what you want the AI to do. We tailor access to your stack.</p>
              <div className="ea-row2">
                <label className="ea-field"><span>Full name</span><input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Jordan Avery" /></label>
                <label className="ea-field"><span>Phone</span><input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 123 4567" inputMode="tel" /></label>
              </div>
              <label className="ea-field"><span>Work email</span><input value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@company.com" inputMode="email" /></label>
              <label className="ea-field"><span>Company size</span>
                <div className="ea-chips">
                  {SIZES.map(s => <button type="button" key={s.v} className={`ea-chip${form.size === s.v ? ' on' : ''}`} onClick={() => set('size', s.v)}>{s.v}</button>)}
                </div>
              </label>
              <label className="ea-field"><span>Which AI features are you most excited about?</span>
                <div className="ea-features">
                  {AI_FEATURES.map(f => (
                    <button type="button" key={f.id} className={`ea-feat${form.features.includes(f.id) ? ' on' : ''}`} onClick={() => toggleFeature(f.id)}>
                      <Icon name={f.icon} size={15} /> {f.label}
                      {form.features.includes(f.id) && <Icon name="check" size={13} className="ea-feat-check" />}
                    </button>
                  ))}
                </div>
              </label>
              <label className="ea-field"><span>What would you point the AI at first? (optional)</span>
                <textarea rows={2} value={form.want} onChange={e => set('want', e.target.value)} placeholder="Rebuild our Salesforce pipeline, auto-qualify inbound, forecast Q3..." />
              </label>
              {err && <div className="ea-err"><Icon name="activity" size={14} /> {err}</div>}
              <button className="ea-submit" type="submit" disabled={busy}>{busy ? 'Sending...' : 'Request early access'} <Icon name="chevronRight" size={17} /></button>
            </form>
          </Reveal>
        </div>
      </section>

      <CtaBand title="Or just watch it work." sub="The live demo runs the real product on sample data. No signup." />
      <EarlyAccessStyles />
    </>
  );
}

function EarlyAccessStyles() {
  return (
    <style>{`
    .ea-hero { padding: 64px 0 24px; position: relative; overflow: hidden; text-align: center; }
    .ea-mesh { position: absolute; inset: 0; z-index: 0; overflow: hidden; }
    .ea-mesh span { position: absolute; border-radius: 50%; filter: blur(70px); opacity: .5; animation: eaFloat 14s ease-in-out infinite; }
    .ea-mesh span:nth-child(1) { width: 420px; height: 420px; background: #0e9f8f; top: -120px; left: 8%; }
    .ea-mesh span:nth-child(2) { width: 360px; height: 360px; background: #7c5cf7; top: -60px; right: 6%; opacity: .38; animation-delay: -4s; }
    .ea-mesh span:nth-child(3) { width: 300px; height: 300px; background: #2563a8; top: 120px; left: 40%; opacity: .3; animation-delay: -8s; }
    @keyframes eaFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-26px); } }
    .ea-badge { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 800; color: var(--m-accent); background: rgba(14,159,143,.1); border: 1px solid rgba(14,159,143,.26); padding: 7px 15px; border-radius: 999px; }
    .ea-badge-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--m-accent); box-shadow: 0 0 0 3px rgba(14,159,143,.2); animation: eaPulse 1.8s ease-in-out infinite; }
    @keyframes eaPulse { 0%,100% { opacity: 1; } 50% { opacity: .4; } }
    .ea-h1 { font-size: clamp(2.6rem, 6vw, 4.6rem); font-weight: 900; letter-spacing: -.03em; line-height: 1.02; margin: 22px auto 0; max-width: 900px; color: var(--m-ink); }
    .ea-grad { background: var(--m-grad); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .ea-lead { font-size: clamp(1.05rem, 2vw, 1.3rem); color: var(--m-ink2); max-width: 640px; margin: 22px auto 0; line-height: 1.55; }

    .ea-diagram { margin: 44px auto 0; max-width: 620px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .ea-layer { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
    .ea-node { display: inline-flex; align-items: center; gap: 7px; font-size: 13.5px; font-weight: 700; color: var(--m-ink); background: var(--m-bg); border: 1px solid var(--m-line); border-radius: 12px; padding: 10px 14px; box-shadow: 0 8px 24px -16px rgba(16,20,30,.4); }
    .ea-l1 .ea-node { color: #fff; background: linear-gradient(120deg, #7c5cf7, #6647e0); border-color: transparent; box-shadow: 0 12px 30px -12px rgba(124,92,247,.6); }
    .ea-book { color: #fff !important; background: var(--m-grad) !important; border-color: transparent !important; }
    .ea-flow { display: flex; gap: 26px; height: 22px; align-items: center; }
    .ea-flow i { width: 2px; height: 22px; background: linear-gradient(var(--m-accent), transparent); position: relative; overflow: hidden; }
    .ea-flow i::after { content: ''; position: absolute; left: -1px; width: 4px; height: 8px; border-radius: 4px; background: var(--m-accent); animation: eaDrop 1.6s linear infinite; }
    .ea-flow i:nth-child(2)::after { animation-delay: .5s; } .ea-flow i:nth-child(3)::after { animation-delay: 1s; }
    @keyframes eaDrop { 0% { top: -8px; opacity: 0; } 30% { opacity: 1; } 100% { top: 22px; opacity: 0; } }

    .ea-card { background: var(--m-bg); border: 1px solid var(--m-line); border-radius: 22px; padding: 30px; box-shadow: 0 28px 70px -34px rgba(16,20,30,.3); }
    .ea-formh { font-size: 24px; font-weight: 900; letter-spacing: -.02em; color: var(--m-ink); margin: 0; }
    .ea-formp { font-size: 14.5px; color: var(--m-ink2); margin: 8px 0 22px; }
    .ea-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    @media (max-width: 480px) { .ea-row2 { grid-template-columns: 1fr; } }
    .ea-field { display: block; margin-bottom: 16px; }
    .ea-field > span { display: block; font-size: 13.5px; font-weight: 700; color: var(--m-ink); margin-bottom: 7px; }
    .ea-field input, .ea-field textarea { width: 100%; border: 1px solid var(--m-line); border-radius: 12px; padding: 12px 14px; font-size: 15px; font-family: inherit; color: var(--m-ink); background: #fff; outline: none; box-sizing: border-box; transition: border-color .14s, box-shadow .14s; }
    .ea-field input:focus, .ea-field textarea:focus { border-color: var(--m-accent); box-shadow: 0 0 0 3px rgba(14,159,143,.15); }
    .ea-field textarea { resize: vertical; line-height: 1.5; }
    .ea-chips, .ea-features { display: flex; flex-wrap: wrap; gap: 8px; }
    .ea-chip { font-family: inherit; font-size: 14px; font-weight: 600; color: var(--m-ink2); background: #fff; border: 1px solid var(--m-line); border-radius: 999px; padding: 9px 16px; cursor: pointer; transition: all .14s; }
    .ea-chip:hover { border-color: var(--m-accent); color: var(--m-accent); }
    .ea-chip.on { background: var(--m-accent); border-color: var(--m-accent); color: #fff; }
    .ea-feat { display: inline-flex; align-items: center; gap: 7px; font-family: inherit; font-size: 13.5px; font-weight: 600; color: var(--m-ink2); background: #fff; border: 1px solid var(--m-line); border-radius: 12px; padding: 10px 13px; cursor: pointer; transition: all .14s; }
    .ea-feat:hover { border-color: var(--m-accent); color: var(--m-accent); }
    .ea-feat.on { border-color: var(--m-accent); color: var(--m-accent); background: rgba(14,159,143,.08); }
    .ea-feat-check { color: var(--m-accent); }
    .ea-err { display: flex; align-items: center; gap: 7px; font-size: 13.5px; font-weight: 600; color: #c0392b; background: #fdecea; border: 1px solid #f5c6c0; border-radius: 10px; padding: 10px 12px; margin-bottom: 14px; }
    .ea-submit { width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-family: inherit; font-size: 16px; font-weight: 800; color: #fff; background: var(--m-grad); border: none; border-radius: 13px; padding: 15px; cursor: pointer; box-shadow: 0 14px 32px -14px rgba(14,159,143,.7); transition: transform .14s; }
    .ea-submit:hover:not(:disabled) { transform: translateY(-2px); }
    .ea-submit:disabled { opacity: .7; cursor: default; }
    @media (prefers-reduced-motion: reduce) { .ea-mesh span, .ea-badge-dot, .ea-flow i::after { animation: none; } }
    `}</style>
  );
}
