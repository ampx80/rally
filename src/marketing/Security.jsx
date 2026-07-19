// Security.jsx - the trust page. Teal product controls; violet reserved for Rook.
// Scoped under .mkt (router wraps in MarketingShell). NO em-dash / en-dash.
import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/icons.jsx';
import { Reveal, Pill, CtaBand } from './kit.jsx';
import { ShieldAssemble, DataFlow, ComplianceBadges, EncryptChip } from './viz2/SecurityViz.jsx';
import './company.css';

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
  { icon: 'sparkles', title: 'No training on your data', line: 'Rook runs on Anthropic Claude (and OpenAI for optional voice), under agreements that prohibit training their models on your data. What is yours stays yours, full stop.' },
  { icon: 'check', title: 'Actions require your confirmation', line: 'Rook proposes, you approve. Every high-risk write, send, or update surfaces for a human confirm before it commits, and every action is written to your audit log.' },
];

// InfoSec-ready process + documentation (what a CISO actually asks for).
const DOCS = [
  { icon: 'shield', title: 'Incident response', line: 'A documented process with breach notification to affected customers without undue delay, and in any event within 72 hours of awareness.' },
  { icon: 'box', title: 'Subprocessors', line: 'The full list of providers we use, what they do, and where they operate. Updated before we add a new one.', to: '/legal/subprocessors', cta: 'View list' },
  { icon: 'fileText', title: 'Security package and DPA', line: 'Security overview, our SOC 2 status and (once issued) report, and a signable Data Processing Addendum. Available to teams in evaluation.', mailto: 'security@ardovo.com', cta: 'Request access' },
  { icon: 'activity', title: 'Uptime and status', line: 'Live service status and incident history, published openly rather than buried.', to: '/status', cta: 'View status' },
  { icon: 'settings', title: 'Security questionnaires', line: 'We answer SIG Lite, CAIQ, and custom vendor questionnaires with honest, dated roadmap responses.', mailto: 'security@ardovo.com', cta: 'Send yours' },
  { icon: 'users', title: 'Single sign-on', line: 'Google SSO and app-level two-factor authentication ship today. SAML/SCIM for Okta, Azure AD, and others is on the roadmap.', to: '/login', cta: 'See sign-in' },
];

const COMPLIANCE = [
  { label: 'SOC 2 Type II', status: 'In progress', icon: 'check' },
  { label: 'GDPR', status: 'Ready', icon: 'settings' },
  { label: 'Encryption', status: 'TLS 1.2+ / AES-256', icon: 'zap' },
];

const TRUST_STRIP = [
  { icon: 'zap', title: 'Encrypted every hop', sub: 'TLS 1.2+ and AES-256' },
  { icon: 'sliders', title: 'Scoped by role', sub: 'Least privilege by default' },
  { icon: 'workflow', title: 'Every action logged', sub: 'Including Rook writes' },
];

export default function Security() {
  return (
    <>
      <section className="mkt-hero co-hero">
        <div className="co-hero-glow" aria-hidden />
        <div className="mkt-wrap">
          <Reveal>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
              <Pill>Trust and security</Pill>
            </div>
            <h1 className="mkt-h1" style={{ maxWidth: 900, margin: '0 auto' }}>
              Your pipeline stays <span className="mkt-grad">yours.</span>
            </h1>
            <p className="mkt-lead" style={{ maxWidth: 640, margin: '24px auto 0' }}>
              Revenue data is the most sensitive data you have. We treat it that way from the first
              commit through every action Rook takes on your behalf.
            </p>
            <div className="co-hero-rail">
              <span>Encrypted end to end</span>
              <span>Honest compliance status</span>
              <span>Human confirm on Rook writes</span>
            </div>
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

      <section className="mkt-section-sm" style={{ paddingTop: 0 }}>
        <div className="mkt-wrap">
          <Reveal>
            <div className="co-truststrip">
              {TRUST_STRIP.map((t) => (
                <div key={t.title} className="co-trustcell">
                  <span className="mkt-icon" style={{ width: 40, height: 40 }}><Icon name={t.icon} size={20} /></span>
                  <div>
                    <strong>{t.title}</strong>
                    <span>{t.sub}</span>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mkt-section" style={{ paddingTop: 40 }}>
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center" style={{ maxWidth: 660, margin: '0 auto 40px' }}>
              <p className="mkt-eyebrow">In transit and at rest</p>
              <h2 className="mkt-h2" style={{ marginTop: 12 }}>Encrypted end to end.</h2>
              <p className="mkt-body" style={{ marginTop: 14 }}>
                Every request rides TLS 1.2+ to the Ardovo edge, and every record lands encrypted with AES-256.
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

      <section className="mkt-section" style={{ paddingTop: 0 }}>
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center" style={{ maxWidth: 660, margin: '0 auto 44px' }}>
              <p className="mkt-eyebrow">The controls</p>
              <h2 className="mkt-h2" style={{ marginTop: 12 }}>Security you can hand to your CISO.</h2>
              <p className="mkt-body" style={{ marginTop: 14 }}>
                Some of this ships today. Some is on the roadmap, and we say which is which. No badges we
                have not earned.
              </p>
            </div>
          </Reveal>
          <div className="mkt-grid mkt-grid-3 m-cascade">
            {CAPS.map((c, i) => (
              <Reveal key={c.title} delay={(i % 3) * 80}>
                <div className="mkt-card co-cap">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div className="mkt-icon"><Icon name={c.icon} size={22} /></div>
                    <span className="co-value-n">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', margin: '18px 0 8px' }}>
                    <h3 className="mkt-h3" style={{ fontSize: '1.15rem' }}>{c.title}</h3>
                    {c.tag && <span className="co-cap-tag">{c.tag}</span>}
                  </div>
                  <p className="mkt-body" style={{ fontSize: '.98rem', margin: 0 }}>{c.line}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="mkt-wrap"><hr className="co-gradrule" /></div>

      <section className="mkt-section">
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center" style={{ maxWidth: 660, margin: '0 auto 44px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
                <div className="co-rook-icon" style={{ width: 56, height: 56 }}><Icon name="sparkles" size={26} /></div>
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
                <div className="mkt-card co-rook-card">
                  <div className="co-rook-icon"><Icon name={p.icon} size={22} /></div>
                  <h3 className="mkt-h3" style={{ fontSize: '1.2rem', margin: '18px 0 8px' }}>{p.title}</h3>
                  <p className="mkt-body" style={{ fontSize: '.98rem', margin: 0 }}>{p.line}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="mkt-wrap"><hr className="co-gradrule" /></div>

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
            <p className="mkt-dim mkt-center" style={{ fontSize: 14, marginTop: 28, maxWidth: 640, marginLeft: 'auto', marginRight: 'auto' }}>
              Have a security question or need our documentation? Email <a href="mailto:security@ardovo.com" className="mkt-grad" style={{ fontWeight: 700 }}>security@ardovo.com</a> or
              read our <Link to="/legal" className="mkt-grad" style={{ fontWeight: 700 }}>legal documents</Link>.
            </p>
          </Reveal>
        </div>
      </section>

      <div className="mkt-wrap"><hr className="co-gradrule" /></div>

      <section className="mkt-section">
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center" style={{ maxWidth: 660, margin: '0 auto 44px' }}>
              <p className="mkt-eyebrow">For your security review</p>
              <h2 className="mkt-h2" style={{ marginTop: 12 }}>Everything your CISO will ask for.</h2>
              <p className="mkt-body" style={{ marginTop: 14 }}>
                The documents and processes procurement and InfoSec need to move fast. Ask and we send them.
              </p>
            </div>
          </Reveal>
          <div className="mkt-grid mkt-grid-3 m-cascade">
            {DOCS.map((d, i) => (
              <Reveal key={d.title} delay={(i % 3) * 80}>
                <div className="mkt-card co-cap" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="mkt-icon"><Icon name={d.icon} size={22} /></div>
                  <h3 className="mkt-h3" style={{ fontSize: '1.15rem', margin: '16px 0 8px' }}>{d.title}</h3>
                  <p className="mkt-body" style={{ fontSize: '.96rem', margin: '0 0 16px', flex: 1 }}>{d.line}</p>
                  {d.to
                    ? <Link to={d.to} className="mkt-grad" style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>{d.cta} <Icon name="chevronRight" size={15} /></Link>
                    : <a href={`mailto:${d.mailto}`} className="mkt-grad" style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>{d.cta} <Icon name="chevronRight" size={15} /></a>}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CtaBand title="Security that earns the CRO's trust." />
    </>
  );
}
