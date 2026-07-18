// GetStarted - Rally's pre-qualification front door at /get-started.
// A prospect gives name, business email, phone, headcount, and a few
// admin-configurable questions. The engine (src/lib/prequalify.js) scores
// fit live and, on submit, routes: qualified -> book a call with an AE
// (and an optional instant AI voice qualifier); borderline -> human review;
// not-a-fit -> self-serve. Every submission is captured for the admin.
// Business email is required to reach "qualified".
// NO em-dash / en-dash. ASCII hyphen only.
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Reveal } from './kit.jsx';
import { Icon } from '../components/icons.jsx';
import {
  usePrequal, scoreAnswers, recordSubmission, isValidEmail, isBusinessEmail, emailDomain,
} from '../lib/prequalify.js';

const TIER_META = {
  qualified: { label: 'You are a strong fit', color: '#0e9f8f', icon: 'check' },
  review: { label: 'Let us take a closer look', color: '#e0752d', icon: 'clock' },
  low: { label: 'Start free and explore', color: '#7c5cf7', icon: 'sparkles' },
};

export default function GetStarted() {
  const config = usePrequal(s => s.config);
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '' });
  const [answers, setAnswers] = useState({});
  const [touched, setTouched] = useState(false);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setA = (id, v) => setAnswers(a => ({ ...a, [id]: v }));

  const live = useMemo(() => scoreAnswers(answers, form.email, config), [answers, form.email, config]);

  const emailErr = form.email && !isValidEmail(form.email)
    ? 'Enter a valid email.'
    : (form.email && config.requireBusinessEmail && !isBusinessEmail(form.email)
      ? `Use your work email (not ${emailDomain(form.email)}) to book a call.`
      : '');

  const requiredQs = (config.questions || []).filter(q => q.required && q.type === 'select');
  const answeredAll = requiredQs.every(q => answers[q.id]);
  const canSubmit = form.name.trim() && isValidEmail(form.email) && form.phone.trim() && answeredAll;

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit) return;
    setBusy(true);
    const { submission, result: r } = recordSubmission({ ...form, answers });
    // Best-effort server capture (email Nate + persist + optional voice). Never blocks.
    try {
      await fetch('/api/prequalify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, answers, score: r.score, tier: r.tier, sourceUrl: window.location.href }),
      });
    } catch {}
    setResult({ ...r, submissionId: submission.id });
    setBusy(false);
    window.scrollTo(0, 0);
  };

  if (result) return <ResultScreen result={result} config={config} form={form} nav={nav} />;

  return (
    <>
      <section className="gs-hero">
        <div className="mkt-hero-mesh" aria-hidden />
        <div className="mkt-wrap" style={{ position: 'relative', zIndex: 2 }}>
          <Reveal>
            <span className="gs-tag"><Icon name="shield" size={14} /> Pre-qualification</span>
            <h1 className="mkt-h1" style={{ margin: '18px auto 0', maxWidth: 820 }}>{config.headline}</h1>
            <p className="mkt-lead" style={{ margin: '18px auto 0', maxWidth: 620 }}>{config.subhead}</p>
          </Reveal>
        </div>
      </section>

      <section className="mkt-section-sm" style={{ paddingTop: 8 }}>
        <div className="mkt-wrap gs-grid">
          <Reveal className="gs-formwrap">
            <form className="gs-card" onSubmit={submit} noValidate>
              <div className="gs-sec">Your details</div>
              <div className="gs-row2">
                <Field label="Full name" required>
                  <input className="gs-in" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Jordan Avery" />
                </Field>
                <Field label="Phone" required>
                  <input className="gs-in" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 123 4567" inputMode="tel" />
                </Field>
              </div>
              <Field label="Work email" required error={touched || form.email ? emailErr : ''}>
                <input className="gs-in" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@company.com" inputMode="email" />
              </Field>
              <Field label="Company">
                <input className="gs-in" value={form.company} onChange={e => set('company', e.target.value)} placeholder="Company name" />
              </Field>

              <div className="gs-sec" style={{ marginTop: 22 }}>A few quick questions</div>
              {(config.questions || []).map(q => (
                <Field key={q.id} label={q.label} required={q.required}>
                  {q.type === 'select' ? (
                    <div className="gs-opts">
                      {(q.options || []).map(o => (
                        <button type="button" key={o.value}
                          className={`gs-opt${answers[q.id] === o.value ? ' is-on' : ''}`}
                          onClick={() => setA(q.id, o.value)}>
                          {o.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <textarea className="gs-in gs-ta" rows={3} value={answers[q.id] || ''} onChange={e => setA(q.id, e.target.value)} placeholder={q.placeholder || ''} />
                  )}
                </Field>
              ))}

              {touched && !canSubmit && (
                <div className="gs-warn"><Icon name="activity" size={14} /> Fill in your name, a valid email, phone, and the required questions.</div>
              )}
              <button className="gs-submit" type="submit" disabled={busy}>
                {busy ? 'Checking fit...' : 'Check my fit'} <Icon name="chevronRight" size={17} />
              </button>
              <div className="gs-fine"><Icon name="lock" size={12} /> Takes under a minute. No spam, no auto-enroll.</div>
            </form>
          </Reveal>

          <Reveal delay={90} className="gs-aside">
            <div className="gs-meter">
              <div className="gs-meter-label">Fit signal</div>
              <div className="gs-meter-track"><div className="gs-meter-fill" style={{ width: `${Math.min(100, live.pct)}%` }} /></div>
              <div className="gs-meter-pct">{live.pct}<span>/100</span></div>
              <div className="gs-meter-sub">
                {live.tier === 'qualified' ? 'On track to book a call with an AE.'
                  : live.tier === 'review' ? 'Close. A couple more answers could get you there.'
                  : 'Answer the questions to see your fit.'}
              </div>
            </div>
            <ul className="gs-why">
              {['A real Rally account executive, not a bot wall', 'Walkthrough tailored to your stack and team', 'See migration and go-live mapped to your data', 'Rook set up on your pipeline before you decide'].map(t => (
                <li key={t}><span className="gs-why-ic"><Icon name="check" size={12} stroke={3} /></span>{t}</li>
              ))}
            </ul>
            <button className="gs-demo" type="button" onClick={() => nav('/demo')}>
              <Icon name="eye" size={15} /> Prefer to look first? Try the interactive demo
            </button>
          </Reveal>
        </div>
      </section>

      <GetStartedStyles />
    </>
  );
}

function Field({ label, required, error, children }) {
  return (
    <label className="gs-field">
      <span className="gs-lbl">{label}{required && <em>*</em>}</span>
      {children}
      {error && <span className="gs-err">{error}</span>}
    </label>
  );
}

function ResultScreen({ result, config, form, nav }) {
  const meta = TIER_META[result.tier] || TIER_META.low;
  const first = (form.name || '').split(' ')[0] || 'there';
  const openRookVoice = () => {
    // Deep link into the app demo with Rook in voice-qualifier mode.
    try { sessionStorage.setItem('rally_prequal_name', form.name); } catch {}
    nav('/demo');
  };
  return (
    <section className="mkt-section" style={{ paddingTop: 60 }}>
      <div className="mkt-wrap" style={{ maxWidth: 720 }}>
        <Reveal>
          <div className="gs-result">
            <span className="gs-result-ic" style={{ background: meta.color + '1a', color: meta.color }}>
              <Icon name={meta.icon} size={30} />
            </span>
            <h1 className="mkt-h2" style={{ marginTop: 18 }}>{meta.label}, {first}.</h1>

            {result.tier === 'qualified' && (
              <>
                <p className="mkt-lead" style={{ maxWidth: 520, margin: '14px auto 0' }}>
                  You are exactly who Rally is built for. Book time with a {config.aeTitle} and we will tailor the
                  walkthrough to your team, map your migration, and stand up Rook on your pipeline.
                </p>
                <div className="gs-result-cta">
                  <a className="mkt-btn mkt-btn-primary mkt-btn-lg" href={config.bookingUrl}>
                    <Icon name="calendar" size={18} /> Book with a {config.aeTitle}
                  </a>
                  {config.voiceEnabled && (
                    <button className="mkt-btn mkt-btn-ghost mkt-btn-lg" onClick={openRookVoice}>
                      <Icon name="mic" size={18} /> Or talk to Rook now
                    </button>
                  )}
                </div>
                <div className="gs-result-note"><Icon name="check" size={13} /> We emailed your details to the team. Expect a reply within one business day.</div>
              </>
            )}

            {result.tier === 'review' && (
              <>
                <p className="mkt-lead" style={{ maxWidth: 520, margin: '14px auto 0' }}>
                  You look promising. We captured your details and a Rally rep will reach out to see if the timing
                  is right. In the meantime, you can explore the product yourself.
                </p>
                <div className="gs-result-cta">
                  <button className="mkt-btn mkt-btn-primary mkt-btn-lg" onClick={() => nav('/demo')}><Icon name="eye" size={18} /> Try the interactive demo</button>
                  <a className="mkt-btn mkt-btn-ghost mkt-btn-lg" href={config.bookingUrl}><Icon name="calendar" size={18} /> Request a call anyway</a>
                </div>
              </>
            )}

            {result.tier === 'low' && (
              <>
                <p className="mkt-lead" style={{ maxWidth: 520, margin: '14px auto 0' }}>
                  Rally shines for teams actively running revenue. Start free, drive it yourself, and come back when
                  you are ready for a tailored walkthrough. No pressure.
                </p>
                <div className="gs-result-cta">
                  <button className="mkt-btn mkt-btn-primary mkt-btn-lg" onClick={() => nav('/demo')}><Icon name="eye" size={18} /> Explore the demo</button>
                  <button className="mkt-btn mkt-btn-ghost mkt-btn-lg" onClick={() => nav('/features')}>See what Rally does</button>
                </div>
              </>
            )}
          </div>
        </Reveal>
      </div>
      <GetStartedStyles />
    </section>
  );
}

function GetStartedStyles() {
  return (
    <style>{`
    .gs-hero { padding: 56px 0 18px; text-align: center; position: relative; overflow: hidden; }
    .gs-tag { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 700; color: var(--m-accent);
      background: rgba(14,159,143,.1); border: 1px solid rgba(14,159,143,.24); padding: 6px 13px; border-radius: 999px; }
    .gs-grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: 28px; align-items: start; max-width: 1000px; }
    @media (max-width: 820px) { .gs-grid { grid-template-columns: 1fr; } .gs-aside { order: -1; } }

    .gs-card { background: var(--m-bg); border: 1px solid var(--m-line); border-radius: 20px; padding: 28px; box-shadow: 0 24px 60px -30px rgba(16,20,30,.28); }
    .gs-sec { font-size: 12px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: var(--m-ink2); margin-bottom: 14px; }
    .gs-field { display: block; margin-bottom: 16px; }
    .gs-lbl { display: block; font-size: 14px; font-weight: 700; color: var(--m-ink); margin-bottom: 7px; }
    .gs-lbl em { color: #d0503f; font-style: normal; margin-left: 3px; }
    .gs-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    @media (max-width: 480px) { .gs-row2 { grid-template-columns: 1fr; } }
    .gs-in { width: 100%; border: 1px solid var(--m-line); border-radius: 12px; padding: 12px 14px; font-size: 15px; font-family: inherit; color: var(--m-ink); background: #fff; outline: none; transition: border-color .14s, box-shadow .14s; box-sizing: border-box; }
    .gs-in:focus { border-color: var(--m-accent); box-shadow: 0 0 0 3px rgba(14,159,143,.15); }
    .gs-ta { resize: vertical; line-height: 1.5; }
    .gs-err { display: block; font-size: 12.5px; color: #d0503f; margin-top: 6px; font-weight: 600; }

    .gs-opts { display: flex; flex-wrap: wrap; gap: 8px; }
    .gs-opt { font-family: inherit; font-size: 14px; font-weight: 600; color: var(--m-ink2); background: #fff; border: 1px solid var(--m-line); border-radius: 999px; padding: 9px 15px; cursor: pointer; transition: all .14s; }
    .gs-opt:hover { border-color: var(--m-accent); color: var(--m-accent); }
    .gs-opt.is-on { background: var(--m-accent); border-color: var(--m-accent); color: #fff; box-shadow: 0 6px 16px -8px rgba(14,159,143,.6); }

    .gs-warn { display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 600; color: #b45309; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px; padding: 10px 12px; margin: 8px 0 14px; }
    .gs-submit { width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-family: inherit; font-size: 16px; font-weight: 800; color: #fff; background: var(--m-grad); border: none; border-radius: 13px; padding: 15px; cursor: pointer; margin-top: 6px; box-shadow: 0 14px 32px -14px rgba(14,159,143,.7); transition: transform .14s, box-shadow .14s; }
    .gs-submit:hover:not(:disabled) { transform: translateY(-2px); }
    .gs-submit:disabled { opacity: .7; cursor: default; }
    .gs-fine { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 12.5px; color: var(--m-ink2); margin-top: 12px; }

    .gs-aside { position: sticky; top: 90px; display: flex; flex-direction: column; gap: 16px; }
    .gs-meter { background: var(--m-bg); border: 1px solid var(--m-line); border-radius: 18px; padding: 22px; box-shadow: 0 18px 44px -30px rgba(16,20,30,.24); }
    .gs-meter-label { font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: var(--m-ink2); }
    .gs-meter-track { height: 10px; border-radius: 999px; background: #eef1f4; overflow: hidden; margin: 12px 0 8px; }
    .gs-meter-fill { height: 100%; border-radius: 999px; background: var(--m-grad); transition: width .5s cubic-bezier(.22,1,.36,1); }
    .gs-meter-pct { font-size: 34px; font-weight: 900; color: var(--m-ink); letter-spacing: -.02em; }
    .gs-meter-pct span { font-size: 16px; font-weight: 700; color: var(--m-ink2); }
    .gs-meter-sub { font-size: 13.5px; color: var(--m-ink2); margin-top: 4px; line-height: 1.45; }
    .gs-why { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 11px; }
    .gs-why li { display: flex; align-items: flex-start; gap: 10px; font-size: 14px; color: var(--m-ink); line-height: 1.4; }
    .gs-why-ic { width: 20px; height: 20px; border-radius: 50%; flex: none; display: grid; place-items: center; background: rgba(14,159,143,.14); color: var(--m-accent); margin-top: 1px; }
    .gs-demo { display: inline-flex; align-items: center; gap: 8px; font-family: inherit; font-size: 13.5px; font-weight: 700; color: var(--m-ink2); background: transparent; border: 1px dashed var(--m-line); border-radius: 12px; padding: 12px; cursor: pointer; transition: all .14s; }
    .gs-demo:hover { border-color: var(--m-accent); color: var(--m-accent); }

    .gs-result { text-align: center; background: var(--m-bg); border: 1px solid var(--m-line); border-radius: 22px; padding: 44px 32px; box-shadow: 0 30px 70px -34px rgba(16,20,30,.3); }
    .gs-result-ic { width: 68px; height: 68px; border-radius: 20px; display: inline-grid; place-items: center; }
    .gs-result-cta { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-top: 26px; }
    .gs-result-note { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; color: var(--m-ink2); margin-top: 20px; }
    .gs-result-note svg { color: var(--m-accent); }
    `}</style>
  );
}
