// Compliance.jsx - the security questionnaire answer library (/security/faq).
// The canonical ~30 SIG Lite / CAIQ answers that cover the majority of every
// InfoSec review, answered honestly with roadmap dates where something is not
// yet done. Native <details> accordion (accessible, no JS state).
// Scoped under .mkt. NO em-dash / en-dash. ASCII only.
import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/icons.jsx';
import { Reveal, Pill, CtaBand } from './kit.jsx';
import { useSeoHead } from './seo/head.js';
import './company.css';

const GROUPS = [
  {
    h: 'Access control and authentication',
    qa: [
      ['How do users authenticate?', 'Email and password with a salted hash, Google SSO (OIDC), and app-level TOTP two-factor authentication. SAML/SCIM for Okta and Azure AD is on the roadmap.'],
      ['Do you enforce MFA for administrators?', 'Two-factor authentication is available to all users and can be enforced for admins by workspace policy.'],
      ['Is access role-based?', 'Yes. Role-based access control with viewer, rep, manager, and admin ranks, per-object and per-field, enforced in the database via row-level security, not only in the UI.'],
      ['How is least privilege applied internally?', 'Internal access to customer data is minimized by default and requires a scoped, logged reason. No standing access.'],
    ],
  },
  {
    h: 'Data protection and encryption',
    qa: [
      ['Is data encrypted in transit?', 'Yes. TLS 1.2 or higher on every request.'],
      ['Is data encrypted at rest?', 'Hosted workspaces store data in Postgres with encryption at rest provided by our infrastructure provider.'],
      ['Where is data stored and can we choose a region?', 'Hosted data is stored in the United States today. Regional data residency (EU and others) is on the roadmap.'],
      ['Do you use customer data to train AI models?', 'No. Rook runs on Anthropic Claude (and OpenAI for optional voice) under agreements that prohibit training on your data. See our AI trust page.'],
      ['How is data segregated between tenants?', 'Every business record carries an org_id and is protected by row-level security policies, so a user can only ever read or write rows in workspaces they belong to.'],
    ],
  },
  {
    h: 'Business continuity and recovery',
    qa: [
      ['Do you back up data?', 'Hosted workspaces have automated, point-in-time backups with tested restore paths.'],
      ['What is your RPO / RTO target?', 'Targets are documented in our business-continuity plan, available under NDA. We are formalizing published SLAs alongside the SOC 2 program.'],
      ['Can we export all of our data?', 'Yes. You can export contacts, companies, deals, activities, and the audit trail at any time, and on termination.'],
    ],
  },
  {
    h: 'Incident response and monitoring',
    qa: [
      ['Do you have an incident-response plan?', 'Yes, a documented process covering detection, triage, containment, and customer notification.'],
      ['What is your breach-notification commitment?', 'We notify affected customers without undue delay, and in any event within 72 hours of becoming aware of a breach affecting their data.'],
      ['Do you log access and changes?', 'Yes. An append-only audit log records who did what and when across every object, including every action taken by Rook.'],
    ],
  },
  {
    h: 'Compliance and certifications',
    qa: [
      ['Are you SOC 2 certified?', 'SOC 2 Type II is in progress; the report is targeted before broad enterprise rollout. We do not claim badges we have not earned. Ask for our current status and letter of engagement.'],
      ['Are you GDPR ready?', 'Yes. Data subject access, deletion, correction, and export are built in, and we sign a Data Processing Addendum. Standard Contractual Clauses cover cross-border transfers.'],
      ['Do you support CCPA / CPRA?', 'Yes, through the same access, deletion, and export mechanisms and our DPA.'],
      ['Do you have HIPAA coverage?', 'Not today. HIPAA is not currently in scope; contact us if you have a specific requirement.'],
      ['Will you complete our security questionnaire (SIG, CAIQ, custom)?', 'Yes. Send it to security@ardovo.com and we return honest, dated answers, including roadmap items.'],
    ],
  },
  {
    h: 'Application and vendor security',
    qa: [
      ['Do you run penetration tests?', 'Third-party penetration testing is part of the SOC 2 program; a summary will be available to customers under NDA.'],
      ['What is your SDLC and change management?', 'Changes go through version control and review, an automated build gate that refuses to ship broken modules, and staged deploys.'],
      ['Who are your subprocessors?', 'Published and kept current on our subprocessors page. We give notice before adding a new one.'],
      ['How do you handle vulnerabilities?', 'Dependencies are monitored and patched; report anything to security@ardovo.com.'],
    ],
  },
];

export default function Compliance() {
  useSeoHead({
    title: 'Security and compliance FAQ | Ardovo',
    description: 'Honest answers to the security questionnaire (SIG Lite, CAIQ) questions InfoSec teams ask: access control, encryption, data residency, incident response, SOC 2 status, AI data handling, and subprocessors.',
  });
  return (
    <>
      <style>{`
        .cmp-q { border: 1px solid var(--m-line); border-radius: 14px; padding: 0; margin-bottom: 12px; background: var(--m-card, #fff); overflow: hidden; }
        .cmp-q > summary { cursor: pointer; list-style: none; padding: 17px 20px; font-weight: 700; color: var(--m-ink, #0d1117); font-size: 1.02rem; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .cmp-q > summary::-webkit-details-marker { display: none; }
        .cmp-q > summary .cmp-chev { transition: transform .18s ease; flex: none; color: var(--m-accent, #0e9f8f); }
        .cmp-q[open] > summary .cmp-chev { transform: rotate(90deg); }
        .cmp-a { padding: 0 20px 18px; }
        .cmp-a p { margin: 0; }
      `}</style>

      <section className="mkt-hero co-hero">
        <div className="co-hero-glow" aria-hidden />
        <div className="mkt-wrap">
          <Reveal>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}><Pill>Security and compliance FAQ</Pill></div>
            <h1 className="mkt-h1" style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
              The answers your <span className="mkt-grad">InfoSec team</span> will ask for.
            </h1>
            <p className="mkt-lead" style={{ maxWidth: 660, margin: '24px auto 0', textAlign: 'center' }}>
              The questions that cover most of every SIG Lite and CAIQ, answered straight, with honest roadmap
              dates where something is still in progress. Send your own questionnaire to security@ardovo.com.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="mkt-section" style={{ paddingTop: 8 }}>
        <div className="mkt-wrap" style={{ maxWidth: 860 }}>
          {GROUPS.map((g, gi) => (
            <Reveal key={g.h} delay={Math.min(gi * 50, 200)}>
              <div style={{ marginBottom: 34 }}>
                <h2 className="mkt-h3" style={{ fontSize: '1.25rem', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="mkt-icon" style={{ width: 34, height: 34 }}><Icon name="shield" size={17} /></span>{g.h}
                </h2>
                {g.qa.map(([q, a], i) => (
                  <details key={i} className="cmp-q">
                    <summary>{q}<Icon name="chevronRight" size={17} className="cmp-chev" /></summary>
                    <div className="cmp-a"><p className="mkt-body">{a}</p></div>
                  </details>
                ))}
              </div>
            </Reveal>
          ))}
          <Reveal delay={120}>
            <p className="mkt-dim mkt-center" style={{ fontSize: 14, marginTop: 20 }}>
              See our <Link to="/security" className="mkt-grad" style={{ fontWeight: 700 }}>security posture</Link>,
              <Link to="/ai-trust" className="mkt-grad" style={{ fontWeight: 700 }}> AI governance</Link>, and
              <Link to="/legal" className="mkt-grad" style={{ fontWeight: 700 }}> legal documents</Link>.
            </p>
          </Reveal>
        </div>
      </section>

      <CtaBand title="Pass the security review, faster." />
    </>
  );
}
