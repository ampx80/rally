// Careers.jsx - a punchy careers page. Mission, how we work AI-native, a few
// sample roles with a mailto CTA (no application backend), and a values marquee.
// Scoped under .mkt (router wraps in MarketingShell).
// NO em-dash / en-dash. ASCII hyphen only.
import React from 'react';
import { Reveal, Pill, CtaBand } from './kit.jsx';
import { Icon } from '../components/icons.jsx';
import './company.css';

const APPLY = 'mailto:careers@rally.com?subject=Rally%20-%20';

/* ------------------------------------------------------------------ */
/* Data                                                                 */
/* ------------------------------------------------------------------ */
const HOW_WE_WORK = [
  { icon: 'sparkles', title: 'AI-native, for real.', copy: 'We use Rook and coding agents every day. Small teams ship what used to take departments. Leverage is the whole point, internally too.' },
  { icon: 'bolt', title: 'Ship, then refine.', copy: 'We build in fast loops and let real usage decide. A shipped thing you can feel beats a perfect thing on a roadmap slide.' },
  { icon: 'target', title: 'Own the outcome.', copy: 'Small surface area, high ownership. You do not wait for a committee. You decide, you build, you are accountable for whether it works.' },
  { icon: 'users', title: 'Remote and written.', copy: 'We work async and write things down. Clear writing is how a small team stays fast without turning the calendar into the job.' },
];

const ROLES = [
  { title: 'Founding Product Engineer', team: 'Engineering', type: 'Full-time', loc: 'Remote' },
  { title: 'AI Systems Engineer (Agents)', team: 'Engineering', type: 'Full-time', loc: 'Remote' },
  { title: 'Design Engineer', team: 'Design', type: 'Full-time', loc: 'Remote' },
  { title: 'Founding Account Executive', team: 'Go-to-market', type: 'Full-time', loc: 'Remote' },
  { title: 'Developer Advocate', team: 'Growth', type: 'Full-time', loc: 'Remote' },
];

const VALUES = ['Bias to ship', 'Own the outcome', 'Write it down', 'Respect the user', 'AI-native or bust', 'One coherent system', 'Small team, big leverage'];

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */
export default function Careers() {
  return (
    <>
      <section className="mkt-hero co-hero">
        <div className="co-hero-glow" aria-hidden />
        <div className="mkt-wrap">
          <Reveal>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
              <Pill><span className="mkt-dot m-pulse" /> We are hiring</Pill>
            </div>
            <h1 className="mkt-h1" style={{ maxWidth: 940, margin: '0 auto' }}>
              Build the platform where <span className="mkt-grad m-shine">the AI does the work.</span>
            </h1>
            <p className="mkt-lead" style={{ maxWidth: 660, margin: '24px auto 0' }}>
              We are a small team building an AI-native revenue platform that replaces the whole stack.
              High ownership, real leverage, and a product people actually feel on first load.
            </p>
            <div className="mkt-hero-cta" style={{ justifyContent: 'center', marginTop: 30 }}>
              <a href="#roles" className="mkt-btn mkt-btn-primary mkt-btn-lg m-magnet">See open roles <Icon name="chevronRight" size={18} /></a>
            </div>
            <div className="co-hero-rail">
              <span>Remote-first</span>
              <span>Written, not meeting-led</span>
              <span>Ship with Rook daily</span>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mkt-section-sm" style={{ paddingTop: 8, paddingBottom: 8 }}>
        <div className="mkt-marquee">
          <div className="mkt-marquee-track">
            {[...VALUES, ...VALUES].map((v, i) => (
              <span key={v + i} style={{ display: 'inline-flex', alignItems: 'center', gap: 12, fontSize: 22, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--m-ink2)', whiteSpace: 'nowrap' }}>
                {v} <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--m-teal)', opacity: .7, flex: 'none' }} />
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* HOW WE WORK */}
      <section className="mkt-section" style={{ paddingTop: 48 }}>
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center" style={{ maxWidth: 680, margin: '0 auto 46px' }}>
              <span className="mkt-eyebrow">How we work</span>
              <h2 className="mkt-h2" style={{ margin: '16px 0 0' }}>Small team. Big leverage.</h2>
              <p className="mkt-lead" style={{ marginTop: 16 }}>
                We practice what we sell. Agents do the grind so people do the judgment.
              </p>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="mkt-grid mkt-grid-2 m-cascade">
              {HOW_WE_WORK.map((w) => (
                <div key={w.title} className={`mkt-card co-principle${w.icon === 'sparkles' ? ' co-rook-card' : ''}`}>
                  <span className={w.icon === 'sparkles' ? 'co-rook-icon' : 'mkt-icon'}><Icon name={w.icon} size={22} /></span>
                  <h3 className="mkt-h3" style={{ margin: '16px 0 8px', fontSize: '1.3rem' }}>{w.title}</h3>
                  <p className="mkt-body" style={{ margin: 0, fontSize: 16 }}>{w.copy}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* OPEN ROLES */}
      <section id="roles" className="mkt-section" style={{ paddingTop: 40 }}>
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center" style={{ maxWidth: 680, margin: '0 auto 44px' }}>
              <span className="mkt-eyebrow">Open roles</span>
              <h2 className="mkt-h2" style={{ margin: '16px 0 0' }}>Come build with us.</h2>
              <p className="mkt-lead" style={{ marginTop: 16 }}>
                Do not see your exact role? Write to us anyway. Great people make their own seat.
              </p>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="m-cascade" style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 860, margin: '0 auto' }}>
              {ROLES.map((r) => (
                <div key={r.title} className="mkt-card co-role">
                  <div className="co-role-main">
                    <div className="co-role-title">{r.title}</div>
                    <div className="co-role-meta">
                      <span className="co-chip"><Icon name="grid" size={13} /> {r.team}</span>
                      <span className="co-chip"><Icon name="clock" size={13} /> {r.type}</span>
                      <span className="co-chip"><Icon name="home" size={13} /> {r.loc}</span>
                    </div>
                  </div>
                  <a href={`${APPLY}${encodeURIComponent(r.title)}`} className="mkt-btn mkt-btn-ghost" style={{ flex: 'none' }}>
                    Apply <Icon name="chevronRight" size={16} />
                  </a>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={140}>
            <div className="mkt-center" style={{ marginTop: 40 }}>
              <div className="mkt-card mkt-card-glow" style={{ maxWidth: 600, margin: '0 auto', padding: 'clamp(24px, 3vw, 38px)', textAlign: 'center' }}>
                <span className="mkt-icon" style={{ margin: '0 auto' }}><Icon name="mail" size={22} /></span>
                <h3 className="mkt-h3" style={{ margin: '16px 0 8px' }}>No backend, no black hole.</h3>
                <p className="mkt-body" style={{ margin: '0 auto', maxWidth: 440, fontSize: 16 }}>
                  Applications go straight to a human. Send a note, a link to your work, and why Rally.
                </p>
                <div style={{ marginTop: 22 }}>
                  <a href={`${APPLY}General`} className="mkt-btn mkt-btn-primary mkt-btn-lg m-magnet">
                    Email us <Icon name="chevronRight" size={18} />
                  </a>
                </div>
                <p className="mkt-dim" style={{ marginTop: 16, fontSize: 13.5 }}>careers@rally.com</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <CtaBand title="Not ready to apply? See what you would be building." sub="Explore the platform and meet Rook, the operator you would ship alongside." />
    </>
  );
}
