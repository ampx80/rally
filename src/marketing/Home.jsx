// ARDOVO marketing homepage - creative-director rebuild. Light premium canvas,
// motion everywhere, the self-playing AgentTheater is the hero centerpiece.
// Returns page sections in a fragment; the router wraps this in MarketingShell.
// NO em-dash / en-dash. ASCII hyphen only.
import React from 'react';
import { Link } from 'react-router-dom';
import { Reveal, MktButton, CtaBand } from './kit.jsx';
import AgentTheater from './AgentTheater.jsx';
import AgentConstellation from './AgentConstellation.jsx';
import HeroCurrent from './HeroCurrent.jsx';
import HeroStage from './HeroStage.jsx';
import OrbitDiagram from './OrbitDiagram.jsx';
import SwitchScene from './SwitchScene.jsx';
import InteractiveDemo from './InteractiveDemo.jsx';
import { Icon } from '../components/icons.jsx';

/* ------------------------------------------------------------------ */
/* Data                                                                 */
/* ------------------------------------------------------------------ */

const COMPETITORS = ['Salesforce', 'HubSpot', 'Zoho', 'NetSuite', 'Pipedrive', 'Zendesk', 'Copper'];

const STATS = [
  { value: '0', label: 'hours of data entry per rep' },
  { value: '1', label: 'sentence to set up a full account' },
  { value: '1', label: 'weekend to switch from Salesforce' },
  { value: '14', label: 'modules, one login' },
];

const ROOK_CARDS = [
  { icon: 'chart', title: 'Reads everything', copy: 'Every deal, email, and note in your workspace. Ask anything and it answers with exact numbers, not vibes.' },
  { icon: 'bolt', title: 'Acts on command', copy: 'Moves deals, drafts emails, builds whole accounts from one sentence. You approve, it executes.' },
  { icon: 'rocket', title: 'Runs autopilot', copy: 'Every morning it surfaces the 3 moves that matter most, with the work already teed up.' },
];

const CONSTELLATION = [
  { icon: 'sparkles', title: 'Grounded answers', copy: 'Ask about any deal, quarter, or rep. Rook answers from your live data with the receipts attached.' },
  { icon: 'rocket', title: 'Juggernaut setup', copy: 'One sentence becomes a full account: company, committee, deal, tasks. Built in seconds, not sessions.' },
  { icon: 'mail', title: 'Email drafting', copy: 'Follow-ups, save emails, and sequences drafted in your voice, waiting in your outbox for a yes.' },
  { icon: 'fileText', title: 'QBR deck generation', copy: 'Quarterly reviews assembled from real pipeline data. The deck writes itself before the meeting does.' },
  { icon: 'bolt', title: 'Deal autopilot', copy: 'Stalled deals get flagged, next steps get scheduled, and slipping forecasts get a rescue plan.' },
  { icon: 'workflow', title: 'Visual workflows', copy: 'Routing, triggers, and handoffs you can see. Automation a human can read at a glance.' },
];

const MODULES = [
  ['funnel', 'Leads'], ['target', 'Deals'], ['users', 'Contacts'], ['building', 'Companies'],
  ['trendUp', 'Forecasting'], ['megaphone', 'Campaigns'], ['activity', 'Sequences'], ['layers', 'Projects'],
  ['inbox', 'Inbox'], ['fileText', 'Quotes'], ['receipt', 'Billing'], ['grid', 'Dashboards'],
  ['chart', 'Reports'], ['workflow', 'Workflows'],
];

const OLD_ROWS = [92, 64, 78, 55, 84, 48, 70, 60];

/* ------------------------------------------------------------------ */
/* Small building blocks                                                */
/* ------------------------------------------------------------------ */

function FloatCard({ cls, style, children }) {
  return (
    <div className={cls} style={{
      position: 'absolute', zIndex: 2, background: '#fff',
      border: '1px solid var(--m-line2)', borderRadius: 14, padding: '10px 12px',
      boxShadow: 'var(--m-shadow-md)', fontSize: 12.5, textAlign: 'left', ...style,
    }}>
      {children}
    </div>
  );
}

function CheckRow({ children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14.5, fontWeight: 600, color: 'var(--m-ink2)' }}>
      <span style={{ width: 19, height: 19, borderRadius: 6, background: 'rgba(14,159,154,.12)', color: 'var(--m-teal)', display: 'inline-grid', placeItems: 'center', flex: 'none' }}>
        <Icon name="check" size={12} stroke={3} />
      </span>
      {children}
    </span>
  );
}

/* Micro-visuals for the migration weekend cards */
function MicroFriday() {
  const rows = [['Account', 'Company'], ['Opportunity', 'Deal'], ['Stage', 'Stage']];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 18 }}>
      {rows.map(([a, b]) => (
        <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600 }}>
          <span style={{ flex: 1, background: 'var(--m-bg2)', border: '1px solid var(--m-line)', borderRadius: 8, padding: '6px 9px', color: 'var(--m-ink3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a}</span>
          <span style={{ color: 'var(--m-ink3)' }}><Icon name="chevronRight" size={13} /></span>
          <span style={{ flex: 1, background: '#fff', border: '1px solid var(--m-line2)', borderRadius: 8, padding: '6px 9px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b}</span>
          <span style={{ width: 18, height: 18, borderRadius: 999, background: 'var(--m-teal)', color: '#fff', display: 'grid', placeItems: 'center', flex: 'none' }}><Icon name="check" size={11} stroke={3} /></span>
        </div>
      ))}
    </div>
  );
}

function MicroSaturday() {
  const chips = [['building', 'Accounts'], ['users', 'Contacts'], ['target', 'Deals']];
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
        {chips.map(([ic, l]) => (
          <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, background: 'var(--m-bg2)', border: '1px solid var(--m-line)', borderRadius: 999, padding: '5px 11px', color: 'var(--m-ink2)' }}>
            <Icon name={ic} size={12} /> {l}
          </span>
        ))}
      </div>
      <div style={{ marginTop: 12, fontSize: 15, fontWeight: 800, color: 'var(--m-ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="mkt-dot m-pulse" /> 12,482 records migrated
      </div>
    </div>
  );
}

function MicroMonday() {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ background: 'var(--m-bg2)', border: '1px solid var(--m-line)', borderRadius: 10, padding: '9px 11px', fontSize: 12, fontWeight: 600, color: 'var(--m-ink2)' }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', color: 'var(--m-ink3)', marginBottom: 5 }}>MONDAY STANDUP</div>
        Rook briefed the team: 3 hot deals, 2 renewals due, zero setup left.
      </div>
      <div style={{ marginTop: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', background: 'var(--m-teal)', padding: '4px 11px', borderRadius: 999, letterSpacing: '.05em' }}>WON</span>
        <span style={{ fontSize: 12, color: 'var(--m-ink3)', marginLeft: 9, fontWeight: 600 }}>First deal closed by lunch</span>
      </div>
    </div>
  );
}

const MIGRATION_STEPS = [
  { day: 'Friday', title: 'We take it from here.', copy: 'Connect read-only. We map every object, field, and stage. You approve over coffee.', Micro: MicroFriday },
  { day: 'Saturday', title: 'Your data moves. Nothing breaks.', copy: 'Accounts, contacts, deals, history migrate while your old CRM keeps running side by side.', Micro: MicroSaturday },
  { day: 'Monday', title: 'Your team logs in and it already works.', copy: 'Deals, notes, next steps there. Rook already briefed. 60-day rollback, no questions.', Micro: MicroMonday },
];

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export default function Home() {
  return (
    <>
      <style>{`@media (max-width: 900px) { .m-floats { display: none !important; } }`}</style>

      {/* S1. HERO - split: copy left, live self-assembling Rook stage right */}
      <section className="mkt-hero" style={{ overflow: 'hidden', paddingTop: 88, textAlign: 'left' }}>
        {/* mesh-gradient + faint grid backdrop for the whole hero */}
        <div className="mkt-hero-mesh" aria-hidden />
        <div className="mkt-hero-gridbg" aria-hidden />
        {/* The Revenue Current - a living pipeline flowing as ambient background */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: .4, pointerEvents: 'none' }}>
          <HeroCurrent />
        </div>
        {/* soft veil so the copy stays crisp over the flow */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'radial-gradient(60% 60% at 26% 40%, rgba(255,255,255,.9), rgba(255,255,255,.35) 62%, rgba(255,255,255,0) 100%)' }} />

        <div className="mkt-wrap">
          <div className="mkt-hero-split">
            {/* LEFT - copy */}
            <Reveal className="mkt-hero-copy">
              <div className="mkt-eyebrow" style={{ marginBottom: 14, fontSize: 15, letterSpacing: '.14em' }}>The AI-native revenue platform</div>
              <h1 className="mkt-h1">
                Everyone sells you a CRM. <span className="mkt-grad m-shine">We run your revenue.</span>
              </h1>
              <p className="mkt-lead" style={{ marginTop: 22 }}>
                Ardovo replaces your CRM, CPQ, billing, and marketing stack with one platform, run by
                Rook, the AI operator that does the actual work. From your first five reps to five
                thousand seats, you close the deals and Rook handles the rest.
              </p>
              <div className="mkt-hero-cta">
                <span className="m-magnet" style={{ display: 'inline-flex' }}>
                  <MktButton to="/app" size="lg">Start free <Icon name="chevronRight" size={18} /></MktButton>
                </span>
                <a href="#theater" className="mkt-btn mkt-btn-ghost mkt-btn-lg m-magnet">
                  <Icon name="sparkles" size={18} /> Watch Rook work
                </a>
              </div>
              <div className="mkt-hero-trust">
                <span className="mkt-trust-item"><span className="mkt-trust-ic"><Icon name="users" size={16} /></span> From 5 reps to 5,000 seats</span>
                <span className="mkt-trust-item"><span className="mkt-trust-ic"><Icon name="layers" size={16} /></span> CRM, CPQ, billing, marketing - one login</span>
                <span className="mkt-trust-item"><span className="mkt-trust-ic"><Icon name="shield" size={16} /></span> Free migration, 60-day rollback</span>
              </div>
            </Reveal>

            {/* RIGHT - the live stage */}
            <Reveal delay={140} style={{ position: 'relative', zIndex: 3 }}>
              <HeroStage />
            </Reveal>
          </div>
        </div>
      </section>

      {/* S1a. OPERATOR CONSTELLATION - dark, futuristic showcase of the AI stack */}
      <AgentConstellation />

      {/* S1b. AGENT THEATER - the full self-playing Rook session */}
      <section className="mkt-section-sm" style={{ paddingTop: 52 }}>
        <div className="mkt-wrap">
          <Reveal>
            <div id="theater" style={{ position: 'relative' }}>
              <AgentTheater />

              {/* floating record cards - hidden under 900px */}
              <FloatCard cls="m-floats m-float-a" style={{ top: -26, left: -40, width: 178 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ width: 30, height: 30, borderRadius: '50%', background: '#0e9f8f', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11.5, fontWeight: 700, flex: 'none' }}>DW</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Dana Whitfield</div>
                    <div style={{ fontSize: 11, color: 'var(--m-ink3)' }}>VP Ops, Meridian</div>
                  </div>
                </div>
              </FloatCard>

              <FloatCard cls="m-floats m-float-b" style={{ top: 40, right: -46, width: 186, border: '1px solid rgba(14,159,154,.45)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--m-teal)', color: '#fff', display: 'grid', placeItems: 'center', flex: 'none' }}><Icon name="check" size={14} stroke={3} /></span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--m-teal)' }}>Deal won +$64K</div>
                    <div style={{ fontSize: 11, color: 'var(--m-ink3)' }}>Harbor Point - closed</div>
                  </div>
                </div>
              </FloatCard>

              <FloatCard cls="m-floats m-float-c" style={{ bottom: -24, left: -34, width: 190 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', color: 'var(--m-ink3)' }}>FORECAST</div>
                <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.02em', margin: '3px 0 5px' }}>$563K <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--m-teal)' }}>108% of target</span></div>
                <div style={{ height: 5, borderRadius: 99, background: 'var(--m-line)', overflow: 'hidden' }}>
                  <div style={{ width: '82%', height: '100%', background: 'var(--m-grad)', borderRadius: 99 }} />
                </div>
              </FloatCard>

              <FloatCard cls="m-floats m-float-a" style={{ bottom: 30, right: -38, width: 196 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700, fontSize: 12.5, marginBottom: 6 }}>
                  <span style={{ color: 'var(--m-accent)', display: 'grid', placeItems: 'center' }}><Icon name="mail" size={14} /></span>
                  Draft ready
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--m-ink2)', lineHeight: 1.45 }}>
                  "Hi Dana, following up on Thursday's demo..."
                </div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--m-accent)', marginTop: 6 }}>ROOK DRAFTED THIS</div>
              </FloatCard>
            </div>
          </Reveal>
        </div>
      </section>

      {/* S2. STATS STRIP */}
      <section className="mkt-section-sm">
        <div className="mkt-wrap">
          <Reveal>
            <div style={{ borderTop: '2px solid transparent', borderImage: 'var(--m-grad) 1', paddingTop: 44 }}>
              <div className="mkt-grid mkt-grid-4 m-cascade" style={{ gap: 22 }}>
                {STATS.map(s => (
                  <div key={s.label} className="mkt-center">
                    <div className="mkt-stat-value">{s.value}</div>
                    <div className="mkt-stat-label" style={{ marginTop: 10 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* MARQUEE - built to beat the incumbents */}
      <section className="mkt-section-sm" style={{ paddingTop: 20 }}>
        <div className="mkt-wrap mkt-center" style={{ marginBottom: 30 }}>
          <span className="mkt-eyebrow">Built to beat the incumbents</span>
        </div>
        <div className="mkt-marquee">
          <div className="mkt-marquee-track">
            {[...COMPETITORS, ...COMPETITORS].map((name, i) => (
              <span key={name + i} style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--m-ink3)', whiteSpace: 'nowrap' }}>{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* S3. OLD WAY vs ARDOVO WAY */}
      <section className="mkt-section">
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center" style={{ maxWidth: 780, margin: '0 auto 48px' }}>
              <span className="mkt-eyebrow">The switch</span>
              <h2 className="mkt-h2" style={{ margin: '16px 0 0' }}>Their CRM needs a team to run it. Ardovo runs itself.</h2>
              <p className="mkt-lead" style={{ marginTop: 18 }}>Same deal. One screen instead of eleven tabs, and the follow-up is already written.</p>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <SwitchScene />
          </Reveal>
        </div>
      </section>

      {/* S3b. THE NO-BRAINER BAND */}
      <section className="mkt-section-sm" style={{ paddingTop: 8 }}>
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-card mkt-card-glow" style={{ padding: 'clamp(24px, 3vw, 40px)', textAlign: 'center' }}>
              <h2 className="mkt-h2" style={{ margin: 0 }}>Cancel <span className="mkt-grad">6 tools</span>. Fire the <span className="mkt-grad">admin retainer</span>. Keep <span className="mkt-grad">all your data</span>.</h2>
              <p className="mkt-lead" style={{ margin: '16px auto 0', maxWidth: 720 }}>
                Ardovo is your CRM, CPQ, billing, marketing, and analytics stack in one login - for less than
                one seat of Salesforce, with a free migration and a 60-day rollback. There is no version of the
                math where you lose.
              </p>
              <div style={{ display: 'flex', gap: 22, justifyContent: 'center', flexWrap: 'wrap', marginTop: 24 }}>
                <CheckRow>Replaces 6+ tools</CheckRow>
                <CheckRow>No admins, no setup fees</CheckRow>
                <CheckRow>Free white-glove migration</CheckRow>
                <CheckRow>60-day rollback</CheckRow>
              </div>
              <div style={{ marginTop: 26 }}>
                <span className="m-magnet" style={{ display: 'inline-flex' }}>
                  <MktButton to="/app" size="lg">Switch to Ardovo <Icon name="chevronRight" size={18} /></MktButton>
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* S4. MEET ROOK */}
      <section className="mkt-section" style={{ paddingTop: 40 }}>
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center" style={{ maxWidth: 720, margin: '0 auto 46px' }}>
              <span className="mkt-eyebrow">The operator</span>
              <h2 className="mkt-h2" style={{ margin: '16px 0 0' }}>Meet Rook. It does the work.</h2>
              <p className="mkt-lead" style={{ marginTop: 18 }}>
                Grounded in your whole workspace. Not a chatbot bolted on top.
              </p>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="mkt-grid mkt-grid-3 m-cascade">
              {ROOK_CARDS.map(c => (
                <div key={c.title} className="mkt-card">
                  <span className="mkt-icon"><Icon name={c.icon} size={22} /></span>
                  <h3 className="mkt-h3" style={{ margin: '16px 0 8px' }}>{c.title}</h3>
                  <p className="mkt-body" style={{ margin: 0, fontSize: 15.5 }}>{c.copy}</p>
                </div>
              ))}
            </div>
            <div className="mkt-center" style={{ marginTop: 34 }}>
              <MktButton to="/product/rook" variant="ghost"><Icon name="sparkles" size={18} /> Explore Rook</MktButton>
            </div>
          </Reveal>
        </div>
      </section>

      {/* S4b. TRY IT YOURSELF - interactive Rook demo */}
      <section className="mkt-section" style={{ paddingTop: 40 }}>
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center" style={{ maxWidth: 680, margin: '0 auto 40px' }}>
              <span className="mkt-eyebrow">Try it yourself</span>
              <h2 className="mkt-h2" style={{ margin: '16px 0 0' }}>Ask Rook a question. No signup.</h2>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div style={{ maxWidth: 880, margin: '0 auto' }}><InteractiveDemo /></div>
          </Reveal>
        </div>
      </section>

      {/* S5. FEATURE CONSTELLATION */}
      <section className="mkt-section" style={{ paddingTop: 40 }}>
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center" style={{ maxWidth: 680, margin: '0 auto 46px' }}>
              <h2 className="mkt-h2">AI-native means everywhere.</h2>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="mkt-grid mkt-grid-3 m-cascade">
              {CONSTELLATION.map(f => (
                <div key={f.title} className="mkt-card m-magnet">
                  <span className="mkt-icon"><Icon name={f.icon} size={22} /></span>
                  <h3 className="mkt-h3" style={{ margin: '16px 0 8px' }}>{f.title}</h3>
                  <p className="mkt-body" style={{ margin: 0, fontSize: 15.5 }}>{f.copy}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* S6. PLATFORM MAP */}
      <section className="mkt-section" style={{ paddingTop: 40 }}>
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center" style={{ maxWidth: 720, margin: '0 auto 44px' }}>
              <span className="mkt-eyebrow">One platform</span>
              <h2 className="mkt-h2" style={{ margin: '16px 0 0' }}>Fourteen modules that replace your whole stack.</h2>
              <p className="mkt-lead" style={{ marginTop: 18 }}>
                Leads to billing, forecast to delivery, service to automation. One operator, one login,
                zero glue code. Alive on first load with realistic data.
              </p>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div style={{ maxWidth: 860, margin: '0 auto' }}>
              <OrbitDiagram />
              <div className="m-cascade" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 12 }}>
                {MODULES.map(([ic, label]) => (
                  <span key={label} className="mkt-node" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 17px', fontSize: 15.5, fontWeight: 700 }}>
                    <span style={{ color: 'var(--m-accent)', display: 'grid', placeItems: 'center' }}><Icon name={ic} size={14} /></span>
                    {label}
                  </span>
                ))}
              </div>
              <p className="mkt-center mkt-dim" style={{ marginTop: 28, fontSize: 17 }}>
                Sign up and it is already full. Explore with realistic data before you import a single row.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* S7. SWITCH IN A WEEKEND */}
      <section className="mkt-section">
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center" style={{ maxWidth: 740, margin: '0 auto 48px' }}>
              <span className="mkt-eyebrow">Migration</span>
              <h2 className="mkt-h2" style={{ margin: '16px 0 0' }}>Switch in a weekend. Seriously.</h2>
              <p className="mkt-lead" style={{ marginTop: 18 }}>
                Free white-glove migration from Salesforce, HubSpot, Zoho, or NetSuite.
                Your data mapped in a day. Your team live by Monday.
              </p>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="mkt-grid mkt-grid-3 m-cascade">
              {MIGRATION_STEPS.map(({ day, title, copy, Micro }) => (
                <div key={day} className="mkt-card">
                  <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.02em' }} className="mkt-grad">{day}</div>
                  <h3 className="mkt-h3" style={{ margin: '10px 0 8px', fontSize: '1.15rem' }}>{title}</h3>
                  <p className="mkt-body" style={{ margin: 0, fontSize: 16 }}>{copy}</p>
                  <Micro />
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={140}>
            <div style={{ display: 'flex', gap: 26, justifyContent: 'center', flexWrap: 'wrap', marginTop: 38 }}>
              <CheckRow>Free white-glove migration</CheckRow>
              <CheckRow>Side-by-side runoff</CheckRow>
              <CheckRow>60-day rollback</CheckRow>
              <CheckRow>Export anytime</CheckRow>
            </div>
            <div className="mkt-center" style={{ marginTop: 30 }}>
              <span className="m-magnet" style={{ display: 'inline-flex' }}>
                <MktButton to="/pricing" size="lg">Book your migration weekend <Icon name="chevronRight" size={18} /></MktButton>
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* S8. PRICING TEASER */}
      <section className="mkt-section" style={{ paddingTop: 30 }}>
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center" style={{ maxWidth: 640, margin: '0 auto 40px' }}>
              <h2 className="mkt-h2">One price. No admin tax.</h2>
              <p className="mkt-lead" style={{ marginTop: 16 }}>
                Every module, every seat gets Rook. No per-feature upsell ladder.
              </p>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="mkt-card mkt-card-glow m-float-c" style={{ maxWidth: 460, margin: '0 auto', padding: 34, textAlign: 'center' }}>
              <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-.03em' }}>$49<span style={{ fontSize: 17, fontWeight: 600, color: 'var(--m-ink3)' }}> / seat / month</span></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11, alignItems: 'flex-start', maxWidth: 300, margin: '24px auto 0' }}>
                <CheckRow>All 14 modules included</CheckRow>
                <CheckRow>Rook on every seat</CheckRow>
                <CheckRow>Free white-glove migration</CheckRow>
                <CheckRow>No setup fees, no admins</CheckRow>
              </div>
              <div style={{ marginTop: 26 }}>
                <MktButton to="/pricing">See pricing <Icon name="chevronRight" size={16} /></MktButton>
              </div>
            </div>
            <p className="mkt-center mkt-dim" style={{ marginTop: 24, fontSize: 14 }}>
              Compare it to your current per-seat plus add-ons plus an admin salary. We will wait.
            </p>
          </Reveal>
        </div>
      </section>

      {/* S9. MANIFESTO PULL QUOTE */}
      <section className="mkt-section">
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center">
              <p style={{ fontSize: 'clamp(1.9rem, 4.6vw, 3.4rem)', fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.14, maxWidth: 900, margin: '0 auto', color: 'var(--m-ink)' }}>
                CRMs got so big they needed administrators. <span className="mkt-grad">Software that needs a staff is not software.</span> It is a job you bought.
              </p>
              <div className="mkt-dim" style={{ marginTop: 22, fontSize: 15, fontWeight: 600 }}>The Ardovo team</div>
              <div style={{ marginTop: 18 }}>
                <Link to="/manifesto" style={{ fontWeight: 700, color: 'var(--m-accent)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  Read the manifesto <Icon name="chevronRight" size={16} />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* S10. TRUST STRIP */}
      <section className="mkt-section-sm" style={{ paddingTop: 0 }}>
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-dim" style={{ display: 'flex', gap: 26, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center', fontSize: 13.5, fontWeight: 600 }}>
              <span>Encrypted in transit and at rest</span>
              <span>Role-based access</span>
              <span>Your data never trains outside models</span>
              <span>Export anytime</span>
              <Link to="/security" style={{ color: 'var(--m-accent)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                Security details <Icon name="chevronRight" size={14} />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* S11. CTA BAND */}
      <CtaBand
        title="Your pipeline is already waiting."
        sub="Free to start. A full, live workspace in under a minute. Ask Rook and watch it move."
      />
    </>
  );
}
