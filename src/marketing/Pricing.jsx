// Pricing page. Dark cinematic, three tiers, a monthly/annual toggle, and a
// short FAQ. Pricing is illustrative for this preview. NO em-dash / en-dash.
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Reveal, MktButton, Pill, CtaBand } from './kit.jsx';
import { Icon } from '../components/icons.jsx';
import { PlanCards, RoiCompare } from './viz2/PricingViz.jsx';

const TIERS = [
  {
    name: 'Starter',
    monthly: 0,
    unit: 'forever',
    line: 'For small teams getting started.',
    cta: 'Get started',
    to: '/app',
    features: [
      'Core CRM and contacts',
      'Full visual pipeline',
      'Up to 3 seats',
      'Rook basics',
    ],
  },
  {
    name: 'Growth',
    monthly: 49,
    unit: 'per seat / mo',
    line: 'For teams running real revenue.',
    cta: 'Get started',
    to: '/app',
    popular: true,
    features: [
      'Everything in Starter',
      'Automations and sequences',
      'Dashboards and reporting',
      'Full Rook operator',
      'In-CRM projects',
    ],
  },
  {
    name: 'Enterprise',
    custom: true,
    unit: 'talk to us',
    line: 'For orgs that need control and scale.',
    cta: 'Talk to us',
    to: '/app',
    features: [
      'Everything in Growth',
      'RBAC and granular permissions',
      'SSO and SCIM provisioning',
      'Full audit log',
      'Priority support',
      'Dedicated success manager',
    ],
  },
];

const FAQ = [
  {
    q: 'Do I need an admin team?',
    a: 'No. Ardovo is alive on first load with a full book of business, and Rook does the setup work you would normally hand to a specialist admin. Most teams are running in minutes, not months.',
  },
  {
    q: 'Is Rook included?',
    a: 'Yes. Rook basics ship on every plan, including Starter. Growth and Enterprise unlock the full operator that executes multi-step plays, not just answers questions.',
  },
  {
    q: 'Can I migrate from Salesforce?',
    a: 'Yes. Ardovo imports your accounts, contacts, and deals, and Rook helps map your old fields to Ardovo objects so nothing gets lost in the move. See the full Salesforce comparison for the details.',
  },
  {
    q: 'Is my data secure?',
    a: 'Encryption in transit and at rest, granular RBAC, SSO, and a full audit log on Enterprise. Read the full details on our security page.',
    link: { to: '/security', label: 'See security' },
  },
  {
    q: 'What happens when my team grows?',
    a: 'Add seats as you go. Growth pricing is per seat so it scales with you, and Enterprise removes the ceiling entirely with custom terms and dedicated support.',
  },
];

// Annual = 2 months free, shown as a rounded per-month figure. Purely visual.
function annualPerMonth(monthly) {
  return Math.round((monthly * 10) / 12);
}

export default function Pricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <>
      {/* Hero */}
      <section className="mkt-hero">
        <div className="mkt-wrap">
          <Reveal>
            <Pill>Pricing</Pill>
            <h1 className="mkt-h1" style={{ marginTop: 22 }}>
              Simple pricing. <span className="mkt-grad m-shine">Serious power.</span>
            </h1>
            <p className="mkt-lead" style={{ maxWidth: 640, margin: '20px auto 0' }}>
              One clean price. One design. One operator across every module. No consultants, no bolt-on AI tax.
            </p>

            {/* Monthly / Annual toggle */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 34, padding: 5, borderRadius: 999, background: 'rgba(255,255,255,.04)', border: '1px solid var(--m-line2)' }}>
              <button
                onClick={() => setAnnual(false)}
                className="mkt-btn"
                style={{
                  padding: '9px 20px',
                  background: !annual ? 'linear-gradient(100deg, #0e9f8f, #14b8a6)' : 'transparent',
                  color: !annual ? '#fff' : 'var(--m-ink2)',
                  boxShadow: !annual ? '0 8px 24px -8px rgba(14,159,143,.55)' : 'none',
                }}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                className="mkt-btn"
                style={{
                  padding: '9px 20px',
                  background: annual ? 'linear-gradient(100deg, #0e9f8f, #14b8a6)' : 'transparent',
                  color: annual ? '#fff' : 'var(--m-ink2)',
                  boxShadow: annual ? '0 8px 24px -8px rgba(14,159,143,.55)' : 'none',
                }}
              >
                Annual
                <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 700, color: annual ? 'rgba(255,255,255,.9)' : 'var(--m-teal)' }}>Save 17%</span>
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Tier cards */}
      <section className="mkt-section-sm">
        <div className="mkt-wrap">
          <PlanCards tiers={TIERS} annual={annual} />
          <p className="mkt-dim" style={{ fontSize: 13.5, textAlign: 'center', marginTop: 24 }}>
            Pricing is illustrative for this preview.
          </p>
        </div>
      </section>

      {/* ROI / comparison */}
      <section className="mkt-section-sm">
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center" style={{ maxWidth: 640, margin: '0 auto 34px' }}>
              <p className="mkt-eyebrow">The math</p>
              <h2 className="mkt-h2" style={{ marginTop: 12 }}>See what the bolt-on tax really costs.</h2>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <RoiCompare />
          </Reveal>
        </div>
      </section>

      {/* FAQ - one hairline panel with internal dividers instead of stacked cards */}
      <section className="mkt-section-sm">
        <div className="mkt-wrap">
          <Reveal>
            <p className="mkt-eyebrow mkt-center" style={{ marginBottom: 12 }}>Support</p>
            <h2 className="mkt-h2 mkt-center" style={{ marginBottom: 8 }}>Questions, answered</h2>
            <p className="mkt-muted mkt-center" style={{ marginBottom: 34 }}>Everything you need before you run your revenue on Ardovo.</p>
          </Reveal>
          <div style={{ maxWidth: 800, margin: '0 auto', border: '1px solid var(--m-line)', borderRadius: 20, background: '#fff', boxShadow: 'var(--m-shadow-sm)', overflow: 'hidden' }}>
            {FAQ.map((item, i) => (
              <Reveal key={item.q} delay={i * 50}>
                <div style={{ padding: '26px 30px', borderBottom: i < FAQ.length - 1 ? '1px solid var(--m-line)' : 'none' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-.01em', margin: 0, color: 'var(--m-ink)' }}>{item.q}</h3>
                  <p className="mkt-muted" style={{ marginTop: 10, marginBottom: 0, lineHeight: 1.6 }}>
                    {item.a}
                    {item.link && (
                      <> <Link to={item.link.to} style={{ color: 'var(--m-teal)', fontWeight: 600 }}>{item.link.label}</Link>.</>
                    )}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
