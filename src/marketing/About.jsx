// About.jsx - the company story. Mission, the "AI-native from the first commit"
// thesis, an animated values/principles section, and a founding timeline with a
// self-drawing spine. Scoped under .mkt (router wraps in MarketingShell).
// NO em-dash / en-dash. ASCII hyphen only.
import React from 'react';
import { Link } from 'react-router-dom';
import { Reveal, MktButton, Pill, CtaBand } from './kit.jsx';
import { Icon } from '../components/icons.jsx';
import './company.css';

/* ------------------------------------------------------------------ */
/* Data                                                                 */
/* ------------------------------------------------------------------ */
const PRINCIPLES = [
  { n: '01', icon: 'sparkles', title: 'The operator does the work.', copy: 'Software should not need a staff to run it. If a human is copy-pasting between screens, we built it wrong. Rook executes; you approve.' },
  { n: '02', icon: 'layers', title: 'One system, one data model.', copy: 'Not a decade of acquisitions glued together. One coherent platform means the AI can reason across your whole revenue motion, not one silo.' },
  { n: '03', icon: 'bolt', title: 'Alive on first load.', copy: 'No blank grid, no six-month rollout. You should see how your revenue runs in the first thirty seconds, before you type a single field.' },
  { n: '04', icon: 'shield', title: 'Your data is yours.', copy: 'Encrypted in transit and at rest, role-based access, never used to train outside models, exportable anytime. Trust is a feature, not a policy page.' },
  { n: '05', icon: 'rocket', title: 'Ship the whole thing.', copy: 'Fourteen modules, one login, one price. We would rather ship a complete platform than sell you an upsell ladder one feature at a time.' },
  { n: '06', icon: 'users', title: 'Respect the human.', copy: 'The rep sets direction and closes the deal. The operator handles the grind. We automate the busywork, never the judgment.' },
];

const TIMELINE = [
  { year: 'The thesis', title: 'CRMs got so big they needed administrators.', copy: 'We watched revenue teams spend more time feeding their CRM than selling. The tool that promised leverage had become overhead with a login. That was the problem worth a company.' },
  { year: 'First commit', title: 'AI-native, not AI-added.', copy: 'Instead of bolting a chatbot onto a system of record, we started with the operator. Rook was the first thing we built, and the platform was shaped around what it needed to see and do.' },
  { year: 'The build', title: 'Fourteen modules, one operator, one design.', copy: 'CRM, CPQ, billing, marketing, service, analytics, automation. One data model end to end, so the intelligence reaches every corner of the revenue motion natively.' },
  { year: 'Now', title: 'Run your revenue on Rally.', copy: 'The platform is live, the operator is working, and teams are switching in a weekend. This is the beginning of AI-native revenue software, and we intend to define it.', live: true },
];

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */
export default function About() {
  return (
    <>
      {/* HERO */}
      <section className="mkt-hero">
        <div className="mkt-wrap">
          <Reveal>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
              <Pill>About Rally</Pill>
            </div>
            <h1 className="mkt-h1" style={{ maxWidth: 960, margin: '0 auto' }}>
              We are building the platform where <span className="mkt-grad m-shine">the AI does the work.</span>
            </h1>
            <p className="mkt-lead" style={{ maxWidth: 680, margin: '24px auto 0' }}>
              Rally is an AI-native revenue platform run by Rook, the operator that reads your whole workspace
              and acts on command. One system to replace the stack of tools you never wanted to manage.
            </p>
          </Reveal>
        </div>
      </section>

      <div className="mkt-wrap"><hr className="co-gradrule" /></div>

      {/* MISSION */}
      <section className="mkt-section" style={{ paddingTop: 72 }}>
        <div className="mkt-wrap">
          <Reveal>
            <div style={{ maxWidth: 820, margin: '0 auto' }}>
              <p className="mkt-eyebrow" style={{ marginBottom: 16 }}>Our mission</p>
              <h2 className="mkt-h2">End the era of software you have to operate.</h2>
              <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
                <p className="mkt-body">
                  Every CRM on the market was built for a world before AI, then had a chat box stapled to the
                  side. It can summarize a record you already opened and draft an email you already knew to
                  send. It sits beside the work. It does not do the work.
                </p>
                <p className="mkt-body">
                  We think the winning revenue platform will be the one where the AI is the operator, not the
                  autocomplete. So we started there. Rook was the first commit, and everything else is built
                  around what an operator needs to see, decide, and execute across your entire pipeline.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* THESIS PULL QUOTE */}
      <section style={{ padding: '32px 0' }}>
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center">
              <p style={{ fontSize: 'clamp(1.8rem, 4.2vw, 3rem)', fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.15, maxWidth: 900, margin: '0 auto', color: 'var(--m-ink)' }}>
                AI-native from the first commit. <span className="mkt-grad">Software that needs a staff is not software.</span> It is a job you bought.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* PRINCIPLES */}
      <section className="mkt-section" style={{ paddingTop: 56 }}>
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center" style={{ maxWidth: 680, margin: '0 auto 46px' }}>
              <span className="mkt-eyebrow">What we believe</span>
              <h2 className="mkt-h2" style={{ margin: '16px 0 0' }}>Six principles we build against.</h2>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="mkt-grid mkt-grid-3 m-cascade">
              {PRINCIPLES.map((p) => (
                <div key={p.n} className="mkt-card m-magnet">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="mkt-icon"><Icon name={p.icon} size={22} /></span>
                    <span className="co-value-n">{p.n}</span>
                  </div>
                  <h3 className="mkt-h3" style={{ margin: '16px 0 8px', fontSize: '1.22rem' }}>{p.title}</h3>
                  <p className="mkt-body" style={{ margin: 0, fontSize: 15.5 }}>{p.copy}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* TIMELINE */}
      <section className="mkt-section" style={{ paddingTop: 40 }}>
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center" style={{ maxWidth: 680, margin: '0 auto 48px' }}>
              <span className="mkt-eyebrow">The story</span>
              <h2 className="mkt-h2" style={{ margin: '16px 0 0' }}>How we got to AI-native.</h2>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="co-timeline">
              <span className="co-spine" aria-hidden />
              {TIMELINE.map((t, i) => (
                <Reveal key={t.year} delay={i * 90} className="co-tlrow">
                  <span className={`co-tldot${t.live ? ' is-live' : ''}`} aria-hidden />
                  <div className="co-tlyear">{t.year}</div>
                  <h3 className="mkt-h3" style={{ margin: '8px 0 8px', fontSize: '1.4rem' }}>{t.title}</h3>
                  <p className="mkt-body" style={{ margin: 0, fontSize: 16.5, maxWidth: 700 }}>{t.copy}</p>
                </Reveal>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* THE BET */}
      <section className="mkt-section" style={{ paddingTop: 40 }}>
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-cta-band" style={{ padding: '68px 40px' }}>
              <p className="mkt-eyebrow" style={{ marginBottom: 18 }}>The bet</p>
              <h2 className="mkt-h2" style={{ maxWidth: 820, margin: '0 auto' }}>
                Not a CRM with AI features. <span className="mkt-grad m-shine">An AI operator that runs your revenue.</span>
              </h2>
              <p className="mkt-lead" style={{ maxWidth: 600, margin: '20px auto 0' }}>
                We are betting the company on it, and we intend to be that platform.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 30 }}>
                <MktButton to="/app" size="lg">Run your revenue on Rally <Icon name="chevronRight" size={18} /></MktButton>
                <Link to="/manifesto" className="mkt-btn mkt-btn-ghost mkt-btn-lg">Read the manifesto</Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <CtaBand title="Come build the future of revenue with us." sub="Explore the platform, or see the roles we are hiring for." />
    </>
  );
}
