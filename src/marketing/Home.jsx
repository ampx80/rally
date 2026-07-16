// RALLY marketing homepage - billion-dollar pass.
// KEEP HeroStage (sped ~25%). Teal product accent; violet for Rook only.
// NO em-dash / en-dash. ASCII hyphen only.
import React from 'react';
import { Link } from 'react-router-dom';
import { Reveal, MktButton, CtaBand } from './kit.jsx';
import AgentTheater from './AgentTheater.jsx';
import HeroCurrent from './HeroCurrent.jsx';
import HeroStage from './HeroStage.jsx';
import SwitchScene from './SwitchScene.jsx';
import InteractiveDemo from './InteractiveDemo.jsx';
import { Icon } from '../components/icons.jsx';

const STATS = [
  { value: '0', label: 'hours of data entry' },
  { value: '1', label: 'sentence to build an account' },
  { value: '1', label: 'weekend to switch' },
  { value: '14', label: 'modules, one login' },
];

const ROOK_CARDS = [
  { icon: 'chart', title: 'Reads everything', copy: 'Every deal, email, and note. Ask anything and get exact numbers, not vibes.' },
  { icon: 'bolt', title: 'Acts on command', copy: 'Moves deals, drafts email, builds whole accounts from one sentence. You approve.' },
  { icon: 'rocket', title: 'Runs autopilot', copy: 'Every morning: the 3 moves that matter, with the work already teed up.' },
];

const MIGRATION_STEPS = [
  { day: 'Friday', title: 'We take it from here.', copy: 'Connect read-only. We map every object, field, and stage. You approve over coffee.' },
  { day: 'Saturday', title: 'Your data moves. Nothing breaks.', copy: 'Accounts, contacts, deals, history migrate while your old CRM keeps running.' },
  { day: 'Monday', title: 'Your team logs in and it already works.', copy: 'Deals, notes, next steps there. Rook already briefed. 60-day rollback.' },
];

function CheckRow({ children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14.5, fontWeight: 600, color: 'var(--m-ink2)' }}>
      <span style={{ width: 19, height: 19, borderRadius: 6, background: 'rgba(14,159,143,.12)', color: 'var(--m-teal)', display: 'inline-grid', placeItems: 'center', flex: 'none' }}>
        <Icon name="check" size={12} stroke={3} />
      </span>
      {children}
    </span>
  );
}

export default function Home() {
  return (
    <>
      {/* HERO - brand + claim + CTA + HeroStage (Nate's animation) */}
      <section className="mkt-hero" style={{ overflow: 'hidden', paddingTop: 88, textAlign: 'left' }}>
        <div className="mkt-hero-mesh" aria-hidden />
        <div className="mkt-hero-gridbg" aria-hidden />
        <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: .38, pointerEvents: 'none' }}>
          <HeroCurrent />
        </div>
        <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'radial-gradient(58% 58% at 24% 42%, rgba(255,255,255,.92), rgba(255,255,255,.28) 62%, rgba(255,255,255,0) 100%)' }} />

        <div className="mkt-wrap">
          <div className="mkt-hero-split">
            <Reveal className="mkt-hero-copy">
              <div className="mkt-eyebrow" style={{ marginBottom: 18 }}>Rally</div>
              <h1 className="mkt-h1">
                Everyone sells you a CRM. <span className="mkt-grad m-shine">We run your revenue.</span>
              </h1>
              <p className="mkt-lead" style={{ marginTop: 22 }}>
                One platform for CRM, CPQ, billing, and marketing - run by Rook, the AI operator that does the work. You close.
              </p>
              <div className="mkt-hero-cta">
                <span className="m-magnet" style={{ display: 'inline-flex' }}>
                  <MktButton to="/app" size="lg">Start free <Icon name="chevronRight" size={18} /></MktButton>
                </span>
                <a href="#theater" className="mkt-btn mkt-btn-ghost mkt-btn-lg m-magnet">
                  <Icon name="sparkles" size={18} /> Watch Rook work
                </a>
              </div>
              <p className="mkt-dim" style={{ marginTop: 22, fontSize: 14.5, fontWeight: 600 }}>
                Live account in one sentence. Free migration. 60-day rollback.
              </p>
            </Reveal>

            <Reveal delay={120} style={{ position: 'relative', zIndex: 3 }}>
              <HeroStage />
            </Reveal>
          </div>
        </div>
      </section>

      {/* AGENT THEATER */}
      <section className="mkt-section-sm" style={{ paddingTop: 12 }} id="theater">
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center" style={{ maxWidth: 720, margin: '0 auto 28px' }}>
              <span className="mkt-eyebrow">Live session</span>
              <h2 className="mkt-h2" style={{ margin: '14px 0 0' }}>Rook does not chat. It ships the work.</h2>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <AgentTheater />
          </Reveal>
        </div>
      </section>

      {/* STATS */}
      <section className="mkt-section-sm">
        <div className="mkt-wrap">
          <Reveal>
            <div style={{ borderTop: '2px solid transparent', borderImage: 'var(--m-grad) 1', paddingTop: 40 }}>
              <div className="mkt-grid mkt-grid-4 m-cascade" style={{ gap: 22 }}>
                {STATS.map(s => (
                  <div key={s.label} className="mkt-center">
                    <div className="mkt-stat-value" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{s.value}</div>
                    <div className="mkt-stat-label" style={{ marginTop: 10 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* SWITCH */}
      <section className="mkt-section">
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center" style={{ maxWidth: 780, margin: '0 auto 44px' }}>
              <span className="mkt-eyebrow">The switch</span>
              <h2 className="mkt-h2" style={{ margin: '16px 0 0' }}>Their CRM needs a team. Rally runs itself.</h2>
            </div>
          </Reveal>
          <Reveal delay={80}><SwitchScene /></Reveal>
        </div>
      </section>

      {/* NO-BRAINER */}
      <section className="mkt-section-sm" style={{ paddingTop: 8 }}>
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-card mkt-card-glow" style={{ padding: 'clamp(24px, 3vw, 40px)', textAlign: 'center' }}>
              <h2 className="mkt-h2" style={{ margin: 0 }}>Cancel <span className="mkt-grad">6 tools</span>. Skip the <span className="mkt-grad">admin retainer</span>. Keep <span className="mkt-grad">all your data</span>.</h2>
              <div style={{ display: 'flex', gap: 22, justifyContent: 'center', flexWrap: 'wrap', marginTop: 24 }}>
                <CheckRow>Replaces 6+ tools</CheckRow>
                <CheckRow>No admins, no setup fees</CheckRow>
                <CheckRow>Free white-glove migration</CheckRow>
                <CheckRow>60-day rollback</CheckRow>
              </div>
              <div style={{ marginTop: 26 }}>
                <MktButton to="/app" size="lg">Switch to Rally <Icon name="chevronRight" size={18} /></MktButton>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ROOK */}
      <section className="mkt-section" style={{ paddingTop: 40 }}>
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center" style={{ maxWidth: 720, margin: '0 auto 42px' }}>
              <span className="mkt-eyebrow">The operator</span>
              <h2 className="mkt-h2" style={{ margin: '16px 0 0' }}>Meet Rook. It does the work.</h2>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="mkt-grid mkt-grid-3 m-cascade">
              {ROOK_CARDS.map(c => (
                <div key={c.title} className="mkt-card">
                  <span className="mkt-icon" style={{ background: 'rgba(124,92,247,.12)', color: '#7c5cf7' }}><Icon name={c.icon} size={22} /></span>
                  <h3 className="mkt-h3" style={{ margin: '16px 0 8px' }}>{c.title}</h3>
                  <p className="mkt-body" style={{ margin: 0, fontSize: 15.5 }}>{c.copy}</p>
                </div>
              ))}
            </div>
            <div className="mkt-center" style={{ marginTop: 30 }}>
              <MktButton to="/product/rook" variant="ghost"><Icon name="sparkles" size={18} /> Explore Rook</MktButton>
            </div>
          </Reveal>
        </div>
      </section>

      {/* TRY IT */}
      <section className="mkt-section" style={{ paddingTop: 36 }}>
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center" style={{ maxWidth: 680, margin: '0 auto 36px' }}>
              <span className="mkt-eyebrow">Try it</span>
              <h2 className="mkt-h2" style={{ margin: '16px 0 0' }}>Ask Rook a question. No signup.</h2>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div style={{ maxWidth: 880, margin: '0 auto' }}><InteractiveDemo /></div>
          </Reveal>
        </div>
      </section>

      {/* MIGRATION */}
      <section className="mkt-section">
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center" style={{ maxWidth: 740, margin: '0 auto 44px' }}>
              <span className="mkt-eyebrow">Migration</span>
              <h2 className="mkt-h2" style={{ margin: '16px 0 0' }}>Switch in a weekend. Seriously.</h2>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="mkt-grid mkt-grid-3 m-cascade">
              {MIGRATION_STEPS.map(({ day, title, copy }) => (
                <div key={day} className="mkt-card">
                  <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.02em' }} className="mkt-grad">{day}</div>
                  <h3 className="mkt-h3" style={{ margin: '10px 0 8px', fontSize: '1.15rem' }}>{title}</h3>
                  <p className="mkt-body" style={{ margin: 0, fontSize: 16 }}>{copy}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* PRICING TEASER */}
      <section className="mkt-section" style={{ paddingTop: 24 }}>
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-card mkt-card-glow" style={{ maxWidth: 460, margin: '0 auto', padding: 34, textAlign: 'center' }}>
              <div className="mkt-eyebrow" style={{ marginBottom: 12 }}>Pricing</div>
              <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-.03em', fontFamily: "'Space Grotesk', sans-serif" }}>$49<span style={{ fontSize: 17, fontWeight: 600, color: 'var(--m-ink3)' }}> / seat / month</span></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11, alignItems: 'flex-start', maxWidth: 300, margin: '24px auto 0' }}>
                <CheckRow>All modules included</CheckRow>
                <CheckRow>Rook on every seat</CheckRow>
                <CheckRow>Free white-glove migration</CheckRow>
              </div>
              <div style={{ marginTop: 26 }}>
                <MktButton to="/pricing">See pricing <Icon name="chevronRight" size={16} /></MktButton>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* MANIFESTO */}
      <section className="mkt-section">
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center">
              <p style={{ fontSize: 'clamp(1.9rem, 4.6vw, 3.2rem)', fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.14, maxWidth: 900, margin: '0 auto', color: 'var(--m-ink)', fontFamily: "'Space Grotesk', sans-serif" }}>
                CRMs got so big they needed administrators. <span className="mkt-grad">Software that needs a staff is not software.</span> It is a job you bought.
              </p>
              <div style={{ marginTop: 18 }}>
                <Link to="/manifesto" style={{ fontWeight: 700, color: 'var(--m-accent)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  Read the manifesto <Icon name="chevronRight" size={16} />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <CtaBand
        title="Your pipeline is already waiting."
        sub="Free to start. A full, live workspace in under a minute. Ask Rook and watch it move."
      />
    </>
  );
}
