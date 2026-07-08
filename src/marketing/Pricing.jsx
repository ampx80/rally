// Pricing page. Dark cinematic, three tiers, a monthly/annual toggle, and a
// short FAQ. Pricing is illustrative for this preview. NO em-dash / en-dash.
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Reveal, MktButton, Pill, CtaBand } from './kit.jsx';
import { Icon } from '../components/icons.jsx';

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
    a: 'No. Rally is alive on first load with a full book of business, and Rook does the setup work you would normally hand to a specialist admin. Most teams are running in minutes, not months.',
  },
  {
    q: 'Is Rook included?',
    a: 'Yes. Rook basics ship on every plan, including Starter. Growth and Enterprise unlock the full operator that executes multi-step plays, not just answers questions.',
  },
  {
    q: 'Can I migrate from Salesforce?',
    a: 'Yes. Rally imports your accounts, contacts, and deals, and Rook helps map your old fields to Rally objects so nothing gets lost in the move. See the full Salesforce comparison for the details.',
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
              Simple pricing. <span className="mkt-grad">Serious power.</span>
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
                  background: !annual ? 'linear-gradient(100deg, #6d5cf7, #7c5cf7)' : 'transparent',
                  color: !annual ? '#fff' : 'var(--m-ink2)',
                  boxShadow: !annual ? '0 8px 24px -8px rgba(109,92,247,.7)' : 'none',
                }}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                className="mkt-btn"
                style={{
                  padding: '9px 20px',
                  background: annual ? 'linear-gradient(100deg, #6d5cf7, #7c5cf7)' : 'transparent',
                  color: annual ? '#fff' : 'var(--m-ink2)',
                  boxShadow: annual ? '0 8px 24px -8px rgba(109,92,247,.7)' : 'none',
                }}
              >
                Annual
                <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 700, color: 'var(--m-teal)' }}>Save 17%</span>
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Tier cards */}
      <section className="mkt-section-sm">
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-grid mkt-grid-3">
              {TIERS.map((t) => {
                const isPaid = !t.custom && t.monthly > 0;
                const price = t.custom
                  ? 'Custom'
                  : t.monthly === 0
                    ? '$0'
                    : `$${annual ? annualPerMonth(t.monthly) : t.monthly}`;
                const unit = isPaid ? (annual ? 'per seat / mo, billed annually' : t.unit) : t.unit;
                return (
                  <div
                    key={t.name}
                    className={`mkt-card${t.popular ? ' mkt-card-glow' : ''}`}
                    style={t.popular ? { borderColor: 'rgba(109,92,247,.6)', boxShadow: '0 0 0 1px rgba(109,92,247,.3), 0 30px 80px -30px rgba(109,92,247,.5)' } : undefined}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 26 }}>
                      <h3 className="mkt-h3">{t.name}</h3>
                      {t.popular && <span className="mkt-pill" style={{ padding: '4px 12px', fontSize: 12 }}>Most popular</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 18 }}>
                      <span className="mkt-stat-value" style={{ fontSize: 'clamp(2.4rem, 4vw, 3rem)' }}>{price}</span>
                    </div>
                    <div className="mkt-dim" style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{unit}</div>
                    <p className="mkt-muted" style={{ marginTop: 14, lineHeight: 1.5 }}>{t.line}</p>
                    <hr className="mkt-rule" style={{ margin: '22px 0' }} />
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 13 }}>
                      {t.features.map((f, i) => (
                        <li key={i} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                          <span className="mkt-yes" style={{ marginTop: 1, flexShrink: 0 }}><Icon name="check" size={18} /></span>
                          <span style={{ color: 'var(--m-ink)', lineHeight: 1.45 }}>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <div style={{ marginTop: 26 }}>
                      <MktButton to={t.to} variant={t.popular ? 'primary' : 'ghost'}>
                        {t.cta} <Icon name="chevronRight" size={18} />
                      </MktButton>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mkt-dim" style={{ fontSize: 13.5, textAlign: 'center', marginTop: 22 }}>
              Pricing is illustrative for this preview.
            </p>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="mkt-section-sm">
        <div className="mkt-wrap">
          <Reveal>
            <h2 className="mkt-h2 mkt-center" style={{ marginBottom: 8 }}>Questions, answered</h2>
            <p className="mkt-muted mkt-center" style={{ marginBottom: 34 }}>Everything you need before you run your revenue on Rally.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 800, margin: '0 auto' }}>
              {FAQ.map((item, i) => (
                <div key={i} className="mkt-card">
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-.01em', margin: 0, color: 'var(--m-ink)' }}>{item.q}</h3>
                  <p className="mkt-muted" style={{ marginTop: 12, marginBottom: 0, lineHeight: 1.6 }}>
                    {item.a}
                    {item.link && (
                      <> <Link to={item.link.to} style={{ color: 'var(--m-teal)', fontWeight: 600 }}>{item.link.label}</Link>.</>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
