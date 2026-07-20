// GetStarted - Ardova's early-release qualifying front door at /get-started.
// We hand-pick the first cohort: people desperate to leave Salesforce. The hero
// question IS the score - "How badly do you want to leave Salesforce?" on a
// 1-10 slider. urgency >= 7 is HOT (white-glove booking + instant alert to the
// team), 4-6 is nurture, <= 3 is waitlist. Confident and a little cheeky, never
// desperate. NO em-dash / en-dash. ASCII hyphen only.
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Reveal } from './kit.jsx';
import { Icon } from '../components/icons.jsx';
import {
  usePrequal, recordSubmission, routeFor, urgencyLabel, ROUTE_META,
  CURRENT_TOOLS, SEAT_OPTIONS, isValidEmail,
} from '../lib/prequalify.js';

export default function GetStarted() {
  const config = usePrequal(s => s.config);
  const nav = useNavigate();
  const [urgency, setUrgency] = useState(5);
  const [form, setForm] = useState({ name: '', email: '', company: '', phone: '', currentTool: '', seats: '', pain: '' });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const route = routeFor(urgency);
  const label = urgencyLabel(urgency);

  const emailErr = touched && form.email && !isValidEmail(form.email) ? 'Enter a valid email.' : '';
  const canSubmit = form.name.trim() && isValidEmail(form.email) && form.currentTool && form.seats;

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit) return;
    setBusy(true);
    const { submission } = recordSubmission({ ...form, urgency });
    try {
      await fetch('/api/prequalify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, urgency, route, sourceUrl: window.location.href }),
      });
    } catch {}
    setDone({ route, urgency, submissionId: submission.id });
    setBusy(false);
    window.scrollTo(0, 0);
  };

  if (done) return <ResultScreen route={done.route} urgency={done.urgency} config={config} form={form} nav={nav} />;

  return (
    <>
      <section className="qz-hero">
        <div className="mkt-hero-mesh" aria-hidden />
        <div className="mkt-wrap" style={{ position: 'relative', zIndex: 2 }}>
          <Reveal>
            <span className="qz-tag"><Icon name="bolt" size={14} /> Early release - hand-picked companies</span>
            <h1 className="mkt-h1 qz-h1">{config.headline}</h1>
            <p className="mkt-lead qz-sub">{config.subhead}</p>
          </Reveal>
        </div>
      </section>

      <section className="mkt-section-sm" style={{ paddingTop: 6 }}>
        <div className="mkt-wrap" style={{ maxWidth: 720 }}>
          <Reveal>
            <form className="qz-card" onSubmit={submit} noValidate>
              {/* THE HERO QUESTION */}
              <div className="qz-slider-wrap" data-route={route}>
                <div className="qz-slider-value">
                  <span className="qz-num">{urgency}</span>
                  <span className="qz-outof">/ 10</span>
                </div>
                <div className="qz-slider-label">{label}</div>
                <input
                  className="qz-slider" type="range" min="1" max="10" step="1" value={urgency}
                  onChange={e => setUrgency(Number(e.target.value))}
                  aria-label="How badly do you want to leave Salesforce"
                  style={{ '--pct': `${((urgency - 1) / 9) * 100}%` }}
                />
                <div className="qz-slider-ends"><span>Just curious</span><span>Get me the hell out</span></div>
              </div>

              {/* SUPPORTING QUESTIONS */}
              <div className="qz-q">
                <span className="qz-lbl">What are you on now?<em>*</em></span>
                <div className="qz-opts">
                  {CURRENT_TOOLS.map(t => (
                    <button type="button" key={t.value} className={`qz-opt${form.currentTool === t.value ? ' on' : ''}`} onClick={() => set('currentTool', t.value)}>{t.label}</button>
                  ))}
                </div>
              </div>

              <div className="qz-q">
                <span className="qz-lbl">How many seats?<em>*</em></span>
                <div className="qz-opts">
                  {SEAT_OPTIONS.map(s => (
                    <button type="button" key={s.value} className={`qz-opt${form.seats === s.value ? ' on' : ''}`} onClick={() => set('seats', s.value)}>{s.label}</button>
                  ))}
                </div>
              </div>

              <div className="qz-q">
                <span className="qz-lbl">What is the #1 thing that makes you want to leave?</span>
                <textarea className="qz-in qz-ta" rows={3} value={form.pain} onChange={e => set('pain', e.target.value)}
                  placeholder="Say it plainly. Forecasting is guesswork, admins hold us hostage, every change breaks something..." />
              </div>

              <div className="qz-row2">
                <label className="qz-field">
                  <span className="qz-lbl">Your name<em>*</em></span>
                  <input className="qz-in" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Jordan Avery" />
                </label>
                <label className="qz-field">
                  <span className="qz-lbl">Company</span>
                  <input className="qz-in" value={form.company} onChange={e => set('company', e.target.value)} placeholder="Company name" />
                </label>
              </div>
              <div className="qz-row2">
                <label className="qz-field">
                  <span className="qz-lbl">Work email<em>*</em></span>
                  <input className="qz-in" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@company.com" inputMode="email" />
                  {emailErr && <span className="qz-err">{emailErr}</span>}
                </label>
                <label className="qz-field">
                  <span className="qz-lbl">Phone <span className="qz-opt-note">(optional - for a faster call)</span></span>
                  <input className="qz-in" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 123 4567" inputMode="tel" />
                </label>
              </div>

              {touched && !canSubmit && (
                <div className="qz-warn"><Icon name="activity" size={14} /> Add your name, a valid work email, what you are on now, and your seat count.</div>
              )}
              <button className="qz-submit" type="submit" disabled={busy} data-route={route}>
                {busy ? 'One sec...' : route === 'hot' ? 'Get me out of Salesforce' : 'See where I land'} <Icon name="chevronRight" size={17} />
              </button>
              <div className="qz-fine"><Icon name="lock" size={12} /> 30 seconds. No spam. We are only taking a handful of companies right now.</div>
            </form>
          </Reveal>
        </div>
      </section>
      <QzStyles />
    </>
  );
}

function ResultScreen({ route, urgency, config, form, nav }) {
  const first = (form.name || '').split(' ')[0] || 'there';
  const meta = ROUTE_META[route] || ROUTE_META.nurture;
  const bookUrl = (config.calendlyUrl && config.calendlyUrl.trim())
    || (import.meta.env && import.meta.env.VITE_CALENDLY_URL)
    || config.bookingUrl || '/meet/intro-call';

  return (
    <section className="mkt-section" style={{ paddingTop: 54 }}>
      <div className="mkt-wrap" style={{ maxWidth: route === 'hot' ? 760 : 640 }}>
        <Reveal>
          <div className="qz-result" style={{ '--tone': meta.color }}>
            {route === 'hot' && (
              <>
                <span className="qz-result-ic"><Icon name="bolt" size={30} /></span>
                <h1 className="mkt-h2" style={{ marginTop: 16 }}>You are exactly who we built this for, {first}.</h1>
                <p className="mkt-lead" style={{ maxWidth: 540, margin: '14px auto 0' }}>
                  {urgency >= 10 ? 'Say no more.' : 'Loud and clear.'} Grab a white-glove migration call below and we will map your
                  move off {form.currentTool ? toolName(form.currentTool) : 'Salesforce'}, your data, and go-live. We just pinged the team - expect a fast reply.
                </p>
                <div className="qz-book">
                  <div className="qz-book-head"><Icon name="calendar" size={16} /> Book your migration call</div>
                  <iframe title="Book a call" className="qz-book-frame" src={bookUrl} />
                  <a className="qz-book-link" href={bookUrl} target="_blank" rel="noreferrer">Open the booking page in a new tab <Icon name="arrowUpRight" size={13} /></a>
                </div>
                <div className="qz-result-note"><Icon name="check" size={13} /> The team was alerted with your answers. If you left a phone number, do not be surprised if we call.</div>
              </>
            )}

            {route === 'nurture' && (
              <>
                <span className="qz-result-ic"><Icon name="clock" size={30} /></span>
                <h1 className="mkt-h2" style={{ marginTop: 16 }}>Frustrated is a great place to start, {first}.</h1>
                <p className="mkt-lead" style={{ maxWidth: 520, margin: '14px auto 0' }}>
                  You are on our radar now. We will keep you close and reach out when a spot opens in the early cohort. In the
                  meantime, poke around - it is more fun than a Salesforce admin ticket.
                </p>
                <div className="qz-result-cta">
                  <button className="mkt-btn mkt-btn-primary mkt-btn-lg" onClick={() => nav('/demo')}><Icon name="eye" size={18} /> Try the live demo</button>
                  <a className="mkt-btn mkt-btn-ghost mkt-btn-lg" href={bookUrl} target="_blank" rel="noreferrer"><Icon name="calendar" size={18} /> Ask for a call anyway</a>
                </div>
              </>
            )}

            {route === 'waitlist' && (
              <>
                <span className="qz-result-ic"><Icon name="sparkles" size={30} /></span>
                <h1 className="mkt-h2" style={{ marginTop: 16 }}>Thanks for the curiosity, {first}.</h1>
                <p className="mkt-lead" style={{ maxWidth: 520, margin: '14px auto 0' }}>
                  We are starting with teams who are ready to move now, so we added you to the list. Come back when Salesforce
                  pushes you over the edge - and it will. Look around while you are here.
                </p>
                <div className="qz-result-cta">
                  <button className="mkt-btn mkt-btn-primary mkt-btn-lg" onClick={() => nav('/demo')}><Icon name="eye" size={18} /> Explore the demo</button>
                  <button className="mkt-btn mkt-btn-ghost mkt-btn-lg" onClick={() => nav('/features')}>See what Ardova does</button>
                </div>
              </>
            )}
          </div>
        </Reveal>
      </div>
      <QzStyles />
    </section>
  );
}

function toolName(v) { return (CURRENT_TOOLS.find(t => t.value === v) || {}).label || 'your current tool'; }

function QzStyles() {
  return (
    <style>{`
    .qz-hero { padding: 54px 0 14px; text-align: center; position: relative; overflow: hidden; }
    .qz-tag { display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 800; letter-spacing: .04em; color: #b45309;
      background: #fff7ed; border: 1px solid #fed7aa; padding: 6px 13px; border-radius: 999px; text-transform: uppercase; }
    .qz-h1 { margin: 18px auto 0; max-width: 780px; }
    .qz-sub { margin: 16px auto 0; max-width: 580px; }

    .qz-card { background: var(--m-bg); border: 1px solid var(--m-line); border-radius: 22px; padding: 30px; box-shadow: 0 26px 64px -32px rgba(16,20,30,.3); }

    /* the hero slider */
    .qz-slider-wrap { text-align: center; padding: 8px 4px 22px; border-bottom: 1px solid var(--m-line); margin-bottom: 22px; }
    .qz-slider-value { display: flex; align-items: baseline; justify-content: center; gap: 8px; }
    .qz-num { font-size: 68px; font-weight: 900; letter-spacing: -.03em; line-height: 1; color: var(--tone, #0e9f8f); transition: color .2s; }
    .qz-slider-wrap[data-route="hot"] { --tone: #0e9f8f; }
    .qz-slider-wrap[data-route="nurture"] { --tone: #e0752d; }
    .qz-slider-wrap[data-route="waitlist"] { --tone: #7c5cf7; }
    .qz-outof { font-size: 20px; font-weight: 800; color: var(--m-ink2); }
    .qz-slider-label { font-size: 20px; font-weight: 800; color: var(--tone, #0e9f8f); margin: 4px 0 20px; letter-spacing: -.01em; transition: color .2s; }
    .qz-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 12px; border-radius: 999px; outline: none; cursor: pointer;
      background: linear-gradient(90deg, var(--tone, #0e9f8f) var(--pct, 50%), #e7ebf0 var(--pct, 50%)); transition: background .1s; }
    .qz-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 30px; height: 30px; border-radius: 50%; background: #fff;
      border: 3px solid var(--tone, #0e9f8f); box-shadow: 0 4px 14px rgba(16,20,30,.28); cursor: grab; transition: transform .12s; }
    .qz-slider::-webkit-slider-thumb:active { transform: scale(1.12); cursor: grabbing; }
    .qz-slider::-moz-range-thumb { width: 30px; height: 30px; border-radius: 50%; background: #fff; border: 3px solid var(--tone, #0e9f8f); box-shadow: 0 4px 14px rgba(16,20,30,.28); cursor: grab; }
    .qz-slider-ends { display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; color: var(--m-ink2); margin-top: 10px; }

    .qz-q { margin-bottom: 18px; }
    .qz-lbl { display: block; font-size: 14.5px; font-weight: 800; color: var(--m-ink); margin-bottom: 9px; }
    .qz-lbl em { color: #d0503f; font-style: normal; margin-left: 3px; }
    .qz-opt-note { font-weight: 600; color: var(--m-ink2); font-size: 12.5px; }
    .qz-opts { display: flex; flex-wrap: wrap; gap: 8px; }
    .qz-opt { font-family: inherit; font-size: 14px; font-weight: 700; color: var(--m-ink2); background: #fff; border: 1.5px solid var(--m-line); border-radius: 999px; padding: 10px 16px; cursor: pointer; transition: all .14s; }
    .qz-opt:hover { border-color: var(--m-accent); color: var(--m-accent); }
    .qz-opt.on { background: var(--m-accent); border-color: var(--m-accent); color: #fff; box-shadow: 0 6px 16px -8px rgba(14,159,143,.6); }

    .qz-field { display: block; }
    .qz-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px; }
    @media (max-width: 520px) { .qz-row2 { grid-template-columns: 1fr; } }
    .qz-in { width: 100%; border: 1.5px solid var(--m-line); border-radius: 12px; padding: 12px 14px; font-size: 15px; font-family: inherit; color: var(--m-ink); background: #fff; outline: none; transition: border-color .14s, box-shadow .14s; box-sizing: border-box; }
    .qz-in:focus { border-color: var(--m-accent); box-shadow: 0 0 0 3px rgba(14,159,143,.15); }
    .qz-ta { resize: vertical; line-height: 1.5; }
    .qz-err { display: block; font-size: 12.5px; color: #d0503f; margin-top: 6px; font-weight: 600; }

    .qz-warn { display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 600; color: #b45309; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px; padding: 10px 12px; margin: 4px 0 14px; }
    .qz-submit { width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-family: inherit; font-size: 16.5px; font-weight: 800; color: #fff; border: none; border-radius: 13px; padding: 16px; cursor: pointer; margin-top: 8px; transition: transform .14s, box-shadow .14s; background: var(--m-grad); box-shadow: 0 14px 32px -14px rgba(14,159,143,.7); }
    .qz-submit[data-route="hot"] { background: linear-gradient(100deg, #0e9f8f, #0b8578); }
    .qz-submit:hover:not(:disabled) { transform: translateY(-2px); }
    .qz-submit:disabled { opacity: .7; cursor: default; }
    .qz-fine { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 12.5px; color: var(--m-ink2); margin-top: 12px; text-align: center; }

    .qz-result { text-align: center; background: var(--m-bg); border: 1px solid var(--m-line); border-radius: 22px; padding: 44px 32px; box-shadow: 0 30px 70px -34px rgba(16,20,30,.3); }
    .qz-result-ic { width: 68px; height: 68px; border-radius: 20px; display: inline-grid; place-items: center; background: color-mix(in srgb, var(--tone) 14%, #fff); color: var(--tone); }
    .qz-result-cta { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-top: 26px; }
    .qz-result-note { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; color: var(--m-ink2); margin-top: 22px; }
    .qz-result-note svg { color: var(--tone); }
    .qz-book { margin-top: 26px; border: 1px solid var(--m-line); border-radius: 16px; overflow: hidden; background: #fff; }
    .qz-book-head { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 14px; color: var(--m-ink); padding: 14px 16px; border-bottom: 1px solid var(--m-line); }
    .qz-book-head svg { color: var(--tone); }
    .qz-book-frame { width: 100%; height: 560px; border: none; display: block; background: #fff; }
    .qz-book-link { display: inline-flex; align-items: center; gap: 5px; font-size: 13px; font-weight: 700; color: var(--m-accent); text-decoration: none; padding: 12px 16px; }
    @media (prefers-reduced-motion: reduce) { .qz-slider, .qz-num, .qz-slider-label { transition: none; } }
    `}</style>
  );
}
