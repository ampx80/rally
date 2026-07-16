// Customers.jsx - customer-proof page. Animated logo wall, an outcomes stat band
// that counts up on scroll, and role-based (not named) case-study cards. Every
// number is framed as illustrative of the platform's design, not an audited
// customer claim. Scoped under .mkt (router wraps in MarketingShell).
// NO em-dash / en-dash. ASCII hyphen only.
import React, { useEffect, useRef, useState } from 'react';
import { Reveal, MktButton, Pill, CtaBand } from './kit.jsx';
import { Icon } from '../components/icons.jsx';
import './company.css';

/* ------------------------------------------------------------------ */
/* Count-up: animates a number when it scrolls into view.              */
/* ------------------------------------------------------------------ */
function useCountUp(target, duration = 1500) {
  const ref = useRef(null);
  const [val, setVal] = useState(0);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { setVal(target); return; }
    let raf; let started = false;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting && !started) {
          started = true;
          const start = performance.now();
          const tick = (now) => {
            const p = Math.min(1, (now - start) / duration);
            setVal(target * (1 - Math.pow(1 - p, 3)));
            if (p < 1) raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
          io.unobserve(el);
        }
      });
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [target, duration]);
  return [ref, val];
}

function CountStat({ value, prefix = '', suffix = '', decimals = 0, label }) {
  const [ref, v] = useCountUp(value);
  return (
    <div ref={ref} className="mkt-center">
      <div className="mkt-stat-value">{prefix}{v.toFixed(decimals)}{suffix}</div>
      <div className="mkt-stat-label" style={{ marginTop: 10, fontSize: 15 }}>{label}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Data                                                                 */
/* ------------------------------------------------------------------ */
const LOGOS = [
  'Northwind', 'Meridian', 'Harbor Point', 'Vertex', 'Cascade', 'Lumen',
  'Ironclad', 'Brightside', 'Quorum', 'Signal', 'Everline', 'Tidewater',
];

const OUTCOMES = [
  { value: 6, suffix: '+', label: 'tools replaced by one platform' },
  { value: 92, suffix: '%', label: 'less time in data entry' },
  { value: 1, label: 'weekend to switch, fully migrated' },
  { value: 3.4, prefix: 'x', decimals: 1, label: 'faster pipeline review with Rook' },
];

const CASES = [
  {
    tag: 'Mid-market SaaS',
    icon: 'trendUp',
    quote: 'We killed five subscriptions the week we switched. Rook does the pipeline hygiene our ops team used to spend Fridays on.',
    role: 'VP Sales, mid-market SaaS',
    metrics: [['-5', 'tools cancelled'], ['+22%', 'forecast accuracy'], ['1 wknd', 'to go live']],
  },
  {
    tag: 'Field services',
    icon: 'workflow',
    quote: 'One login for quotes, billing, and follow-up. The team stopped copy-pasting between tabs and started closing.',
    role: 'Operations Director, field services',
    metrics: [['0 hrs', 'weekly data entry'], ['+31%', 'quote-to-close'], ['14', 'modules, one seat']],
  },
  {
    tag: 'Agency',
    icon: 'rocket',
    quote: 'The workspace was alive on first load. We evaluated it with realistic data before importing a single row.',
    role: 'Founder, boutique agency',
    metrics: [['< 1 min', 'to a live workspace'], ['3.4x', 'faster reviews'], ['60 day', 'rollback, never used']],
  },
];

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */
export default function Customers() {
  return (
    <>
      <section className="mkt-hero co-hero">
        <div className="co-hero-glow" aria-hidden />
        <div className="mkt-wrap">
          <Reveal>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
              <Pill>Customers</Pill>
            </div>
            <h1 className="mkt-h1" style={{ maxWidth: 940, margin: '0 auto' }}>
              Teams that run revenue <span className="mkt-grad m-shine">without the admin tax.</span>
            </h1>
            <p className="mkt-lead" style={{ maxWidth: 660, margin: '24px auto 0' }}>
              From first-time founders to mid-market sales orgs, teams switch to Rally to trade eleven tabs
              and a CRM admin for one platform and one operator.
            </p>
            <div className="co-hero-rail">
              <span>Fewer tools</span>
              <span>No Friday data entry</span>
              <span>Live in a weekend</span>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mkt-section-sm" style={{ paddingTop: 8 }}>
        <div className="mkt-wrap">
          <Reveal>
            <p className="mkt-center mkt-eyebrow" style={{ marginBottom: 26 }}>The kind of teams running on Rally</p>
          </Reveal>
          <Reveal delay={80}>
            <div className="co-wall">
              {LOGOS.map((name) => (
                <div key={name} className="co-walltile">
                  <span className="co-wallmono" aria-hidden>{name[0]}</span>
                  {name}
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={140}>
            <p className="mkt-center mkt-dim" style={{ marginTop: 22, fontSize: 13.5 }}>
              Representative company names shown to illustrate segments. Rally is a new platform; early teams are onboarding now.
            </p>
          </Reveal>
        </div>
      </section>

      {/* OUTCOMES STAT BAND */}
      <section className="mkt-section" style={{ paddingTop: 40 }}>
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center" style={{ maxWidth: 680, margin: '0 auto 40px' }}>
              <span className="mkt-eyebrow">Outcomes</span>
              <h2 className="mkt-h2" style={{ margin: '16px 0 0' }}>What switching actually changes.</h2>
              <p className="mkt-lead" style={{ marginTop: 16 }}>
                Illustrative of how the platform is designed to perform. Your mileage is your own.
              </p>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="co-statband">
              <div className="co-statgrid">
                {OUTCOMES.map((o) => (
                  <CountStat key={o.label} value={o.value} prefix={o.prefix} suffix={o.suffix} decimals={o.decimals || 0} label={o.label} />
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CASE STUDIES */}
      <section className="mkt-section" style={{ paddingTop: 30 }}>
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center" style={{ maxWidth: 680, margin: '0 auto 46px' }}>
              <span className="mkt-eyebrow">In their words</span>
              <h2 className="mkt-h2" style={{ margin: '16px 0 0' }}>The same story, three ways.</h2>
              <p className="mkt-lead" style={{ marginTop: 16 }}>
                Fewer tools, no data entry, live in a weekend. Testimonials are role-based and illustrative.
              </p>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="mkt-grid mkt-grid-3 m-cascade">
              {CASES.map((c) => (
                <div key={c.role} className="mkt-card co-case" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="mkt-icon" style={{ width: 40, height: 40 }}><Icon name={c.icon} size={20} /></span>
                    <span className="co-chip">{c.tag}</span>
                  </div>
                  <div className="co-quotemark" aria-hidden>"</div>
                  <p className="co-quote" style={{ margin: 0, fontSize: 16.5 }}>{c.quote}</p>
                  <div className="mkt-dim" style={{ marginTop: 14, fontSize: 14, fontWeight: 700 }}>{c.role}</div>
                  <div className="co-metricrow" style={{ marginTop: 'auto' }}>
                    {c.metrics.map(([v, l]) => (
                      <div key={l}>
                        <div className="co-metric-v">{v}</div>
                        <div className="co-metric-l">{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* PROOF STRIP */}
      <section className="mkt-section-sm" style={{ paddingTop: 0 }}>
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-card mkt-card-glow" style={{ padding: 'clamp(24px, 3vw, 40px)', textAlign: 'center' }}>
              <h2 className="mkt-h2" style={{ margin: 0, fontSize: 'clamp(1.7rem, 3.4vw, 2.5rem)' }}>
                The best proof is your own pipeline.
              </h2>
              <p className="mkt-lead" style={{ margin: '16px auto 0', maxWidth: 620 }}>
                Sign up and the workspace is already full of realistic data. Ask Rook to run it, then decide.
                Free to start, free migration, 60-day rollback.
              </p>
              <div style={{ marginTop: 26, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <span className="m-magnet" style={{ display: 'inline-flex' }}>
                  <MktButton to="/app" size="lg">Start free <Icon name="chevronRight" size={18} /></MktButton>
                </span>
                <MktButton to="/pricing" variant="ghost" size="lg">See pricing</MktButton>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <CtaBand title="Be the next team that stopped feeding a CRM." sub="Run your revenue on Rally. Ask Rook and watch it move." />
    </>
  );
}
