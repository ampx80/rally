// Security.jsx - the trust page. Dark cinematic, scoped under .mkt (router wraps
// this in MarketingShell, so we only return the page sections in a fragment).
import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/icons.jsx';
import { Reveal, Pill, CtaBand } from './kit.jsx';
import { ShieldAssemble, DataFlow, ComplianceBadges, EncryptChip } from './viz2/SecurityViz.jsx';

const CAPS = [
  { icon: 'zap', title: 'Encryption in transit and at rest', line: 'TLS 1.2+ on every request. Data encrypted at rest with AES-256. No plaintext at any layer.' },
  { icon: 'users', title: 'SSO / SAML', line: 'Single sign-on with your identity provider so access follows your directory, not a separate password list.', tag: 'on the roadmap' },
  { icon: 'sliders', title: 'Role-based access control', line: 'Scope who can see and change what. Reps, managers, and ops each get exactly the surface they need.' },
  { icon: 'workflow', title: 'Audit logging', line: 'A durable trail of who did what and when, including every action Rook takes on your behalf.' },
  { icon: 'building', title: 'Data residency', line: 'Choose where your revenue data lives. Regional hosting for teams with jurisdictional requirements.', tag: 'on the roadmap' },
  { icon: 'target', title: 'Least-privilege access', line: 'Internal access is minimized by default. No standing access to customer data without a scoped, logged reason.' },
  { icon: 'box', title: 'Backups and recovery', line: 'Automated, point-in-time backups with tested restore paths. Your pipeline is never one bad day from gone.' },
  { icon: 'check', title: 'SOC 2', line: 'Independent audit of our security controls. Underway now, report targeted before broad enterprise rollout.', tag: 'in progress' },
  { icon: 'settings', title: 'GDPR-ready', line: 'Data subject requests, deletion, and export designed in. Built to honor the rights your customers have.' },
];

const ROOK_POINTS = [
  { icon: 'target', title: 'Grounded on your data only', line: 'Rook reasons over the records in your workspace and nothing else. It never invents pipeline, contacts, or numbers.' },
  { icon: 'sparkles', title: 'No training on your data', line: 'Your revenue data is never used to train shared models. What is yours stays yours, full stop.' },
  { icon: 'check', title: 'Actions require your confirmation', line: 'Rook proposes, you approve. Every write, send, or update surfaces for a human confirm before it commits.' },
];

const COMPLIANCE = [
  { label: 'SOC 2 Type II', status: 'In progress', icon: 'check' },
  { label: 'GDPR', status: 'Ready', icon: 'settings' },
  { label: 'Encryption', status: 'TLS 1.2+ / AES-256', icon: 'zap' },
];

export default function Security() {
  return (
    <>
      {/* Hero */}
      <section className="mkt-hero">
        <div className="mkt-wrap">
          <Reveal>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
              <Pill>Trust and security</Pill>
            </div>
            <h1 className="mkt-h1" style={{ maxWidth: 900, margin: '0 auto' }}>
              Enterprise trust, <span className="mkt-grad">built in.</span>
            </h1>
            <p className="mkt-lead" style={{ maxWidth: 640, margin: '24px auto 0' }}>
              Your revenue data is the most sensitive data you have. We treat it that way, from the first
              commit to every action Rook takes on your behalf.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <ShieldAssemble />
          </Reveal>
          <Reveal delay={200}>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 22 }}>
              <EncryptChip />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Data-flow diagram */}
      <section className="mkt-section" style={{ paddingTop: 0 }}>
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center" style={{ maxWidth: 660, margin: '0 auto 40px' }}>
              <p className="mkt-eyebrow">In transit and at rest</p>
              <h2 className="mkt-h2" style={{ marginTop: 12 }}>Encrypted end to end.</h2>
              <p className="mkt-body" style={{ marginTop: 14 }}>
                Every request rides TLS 1.2+ to the Rally edge, and every record lands encrypted with AES-256.
                Your data is never in the clear at any layer.
              </p>
            </div>
          </Reveal>
          <Reveal delay={90}>
            <div style={{ maxWidth: 860, margin: '0 auto' }}>
              <DataFlow />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Capability grid */}
      <section className="mkt-section" style={{ paddingTop: 0 }}>
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center" style={{ maxWidth: 660, margin: '0 auto 44px' }}>
              <p className="mkt-eyebrow">The controls</p>
              <h2 className="mkt-h2" style={{ marginTop: 12 }}>Security you can hand to your CISO.</h2>
              <p className="mkt-body" style={{ marginTop: 14 }}>
                Some of this is shipping today. Some is on the roadmap, and we say which is which. No badges we
                have not earned.
              </p>
            </div>
          </Reveal>
          <div className="mkt-grid mkt-grid-3 m-cascade">
            {CAPS.map((c, i) => (
              <Reveal key={c.title} delay={(i % 3) * 80}>
                <div className="mkt-card" style={{ height: '100%' }}>
                  <div className="mkt-icon"><Icon name={c.icon} size={22} /></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', margin: '18px 0 8px' }}>
                    <h3 className="mkt-h3" style={{ fontSize: '1.15rem' }}>{c.title}</h3>
                    {c.tag && (
                      <span style={{
                        fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase',
                        color: 'var(--m-teal)', background: 'rgba(20,224,200,.1)', border: '1px solid rgba(20,224,200,.3)',
                        borderRadius: 999, padding: '3px 9px',
                      }}>{c.tag}</span>
                    )}
                  </div>
                  <p className="mkt-body" style={{ fontSize: '.98rem', margin: 0 }}>{c.line}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="mkt-wrap"><hr className="mkt-rule" /></div>

      {/* How Rook handles your data */}
      <section className="mkt-section">
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center" style={{ maxWidth: 660, margin: '0 auto 44px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
                <div className="mkt-icon" style={{ width: 56, height: 56 }}><Icon name="sparkles" size={26} /></div>
              </div>
              <h2 className="mkt-h2">How Rook handles your data</h2>
              <p className="mkt-body" style={{ marginTop: 14 }}>
                An AI operator with real reach into your pipeline is only trustworthy if the boundaries are
                explicit. Here are ours.
              </p>
            </div>
          </Reveal>
          <div className="mkt-grid mkt-grid-3">
            {ROOK_POINTS.map((p, i) => (
              <Reveal key={p.title} delay={i * 90}>
                <div className="mkt-card mkt-card-glow" style={{ height: '100%' }}>
                  <div className="mkt-icon"><Icon name={p.icon} size={22} /></div>
                  <h3 className="mkt-h3" style={{ fontSize: '1.2rem', margin: '18px 0 8px' }}>{p.title}</h3>
                  <p className="mkt-body" style={{ fontSize: '.98rem', margin: 0 }}>{p.line}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="mkt-wrap"><hr className="mkt-rule" /></div>

      {/* Compliance strip */}
      <section className="mkt-section">
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center" style={{ maxWidth: 620, margin: '0 auto 40px' }}>
              <p className="mkt-eyebrow">Compliance</p>
              <h2 className="mkt-h2" style={{ marginTop: 12 }}>Where we stand today.</h2>
              <p className="mkt-body" style={{ marginTop: 14 }}>
                An honest snapshot. We will update this page as each item lands rather than claim it early.
              </p>
            </div>
          </Reveal>
          <ComplianceBadges items={COMPLIANCE} />
          <Reveal delay={120}>
            <p className="mkt-dim mkt-center" style={{ fontSize: 14, marginTop: 28, maxWidth: 620, marginLeft: 'auto', marginRight: 'auto' }}>
              Have a security question or need our latest documentation? <Link to="/app" className="mkt-grad" style={{ fontWeight: 700 }}>Get in touch</Link> and we will
              walk your team through the details.
            </p>
          </Reveal>
        </div>
      </section>

      <CtaBand title="Security that earns the CRO's trust." />
    </>
  );
}
