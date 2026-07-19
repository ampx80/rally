// Legal.jsx - the legal pack (Privacy, Terms, DPA, Subprocessors, Cookies) plus
// a /legal index. One route-param-driven renderer so procurement/InfoSec have
// real documents to consume. Scoped under .mkt (MarketingShell wraps it).
//
// INTERNAL NOTE (not rendered): these are professionally-drafted operating
// documents that reflect Ardovo's actual data practices as built. Have counsel
// confirm the operating entity, governing law, and jurisdiction fields before
// relying on them in a signed contract. Contact mailboxes (privacy@, legal@,
// security@, dpo@ ardovo.com) must be provisioned to receive mail.
// NO em-dash / en-dash. ASCII only.
import React from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { Icon } from '../components/icons.jsx';
import { Reveal, Pill, CtaBand } from './kit.jsx';
import { useSeoHead } from './seo/head.js';
import './company.css';

const EFFECTIVE = 'July 18, 2026';
const ENTITY = 'Ardovo';

const SUBPROCESSORS = [
  ['Vercel Inc.', 'Application hosting, global edge network, request logs', 'United States'],
  ['Supabase', 'Managed Postgres database and authentication for hosted workspaces', 'United States / EU'],
  ['Anthropic', 'Claude models that power Rook, the AI operator', 'United States'],
  ['OpenAI', 'Realtime speech models for Rook voice mode (only when enabled)', 'United States'],
  ['Resend', 'Transactional and notification email (only when configured)', 'United States'],
  ['Twilio', 'SMS notifications (only when configured)', 'United States'],
  ['Google LLC', 'Single Sign-On (OAuth/OIDC) - receives only email and profile at sign-in', 'United States'],
];

// ---- document content (arrays of sections; each section is {h, p[], list[]}) ----
const DOCS = {
  privacy: {
    slug: 'privacy',
    label: 'Privacy Policy',
    lede: 'What we collect, why we collect it, how long we keep it, and the rights you have over it.',
    sections: [
      { h: 'Who we are', p: [`${ENTITY} is an AI-native revenue platform. This policy explains how we handle personal data across our marketing site, product application, and the AI operator (Rook) that acts inside your workspace. If you use ${ENTITY} on behalf of a company, that company is the data controller for the customer data in its workspace and ${ENTITY} acts as its processor (see our Data Processing Addendum).`] },
      { h: 'Data we collect', list: [
        'Account data: name, work email, and authentication material (a salted password hash and, if you enable it, a time-based one-time-passcode secret). If you sign in with Google, we receive only your email and basic profile.',
        'Workspace data: the CRM records you create or import (contacts, companies, deals, activities, notes, attachments) and the audit trail of actions taken, including actions taken by Rook.',
        'Usage data: pages visited, features used, device and browser type, and diagnostic logs used to keep the service reliable and secure.',
        'Communications: messages you send us for support, sales, or migration help.',
      ] },
      { h: 'How we use it', list: [
        'To provide, secure, and improve the service.',
        'To power Rook: Rook reasons only over the records in your own workspace to draft and execute the work you ask for. Your workspace data is never used to train shared or third-party models.',
        'To communicate with you about your account, security, and (with your consent where required) product updates.',
        'To meet legal, tax, and compliance obligations.',
      ] },
      { h: 'AI and your data', p: [`Rook is powered by large language models operated by our AI subprocessors (currently Anthropic; OpenAI for optional voice). We send only the workspace context needed to complete your request, under agreements that prohibit those providers from training their models on your data. High-risk actions require a human confirmation before they commit, and every action Rook takes is written to your audit log.`] },
      { h: 'Sharing', p: ['We do not sell personal data. We share it only with the subprocessors listed on our Subprocessors page (each under a data-protection agreement), and where required by law or to protect the service and its users.'] },
      { h: 'Retention', p: ['We keep workspace data for as long as your account is active. On termination you can export your data, after which we delete or anonymize it within 90 days unless a longer period is legally required. Local-first (browser) demo data lives only in your own browser and is cleared when you clear site data.'] },
      { h: 'Your rights', p: ['Depending on where you live, you may have the right to access, correct, delete, export, or restrict processing of your personal data, and to object or withdraw consent. To exercise these rights, contact privacy@ardovo.com. If you are an end user in a customer workspace, we will route your request to the controlling customer.'] },
      { h: 'Security', p: [`We protect data in transit with TLS 1.2+ and apply role-based access control, least-privilege internal access, and audit logging. Our current compliance posture (including SOC 2 status) is published honestly on our security page.`] },
      { h: 'International transfers', p: ['Where data is transferred across borders, we rely on appropriate safeguards such as Standard Contractual Clauses. Regional data residency is on our roadmap.'] },
      { h: 'Contact', p: ['Questions about this policy or your data: privacy@ardovo.com. For data-protection matters specifically, dpo@ardovo.com.'] },
    ],
  },
  terms: {
    slug: 'terms',
    label: 'Terms of Service',
    lede: 'The agreement that governs your use of Ardovo.',
    sections: [
      { h: 'Agreement', p: [`These Terms govern your access to and use of ${ENTITY}. By creating an account or using the service you agree to them. If you are using ${ENTITY} for an organization, you represent that you are authorized to bind that organization.`] },
      { h: 'Your account', list: [
        'You are responsible for the accuracy of your account information and for safeguarding your credentials. We strongly recommend enabling two-factor authentication.',
        'You are responsible for the activity of users you invite into your workspace.',
      ] },
      { h: 'Acceptable use', list: [
        'Do not use the service to break the law, infringe others rights, send unlawful or unsolicited messages, or upload malware.',
        'Do not attempt to disrupt, reverse engineer, or gain unauthorized access to the service or other customers data.',
        'You are responsible for having a lawful basis and any required consents for the personal data you load into your workspace.',
      ] },
      { h: 'Rook (AI operator)', p: ['Rook can draft and execute revenue work on your behalf. You remain responsible for reviewing high-risk actions, which require your confirmation before they commit. AI output can contain errors; do not rely on it as legal, financial, or professional advice.'] },
      { h: 'Plans, billing, and trials', p: ['Paid plans are billed per the pricing you agree to at sign-up or in an order form. Fees are non-refundable except where required by law. You can cancel at any time; access continues through the paid period.'] },
      { h: 'Your data', p: ['You own your workspace data. We process it to provide the service under this agreement and our Data Processing Addendum. You can export your data at any time and on termination (see Privacy Policy for retention).'] },
      { h: 'Availability and support', p: ['We work to keep the service available and publish status at /status. Support levels vary by plan. Enterprise plans may include a committed service-level agreement in the order form.'] },
      { h: 'Warranties and liability', p: ['The service is provided on an "as is" and "as available" basis to the maximum extent permitted by law. To the extent permitted by law, our aggregate liability is limited to the fees you paid in the twelve months before the claim.'] },
      { h: 'Termination', p: ['Either party may terminate for material breach not cured within 30 days of notice. We may suspend access for security or non-payment. On termination the license to use the service ends and export/retention terms apply.'] },
      { h: 'Changes and contact', p: ['We may update these Terms and will post the new effective date here; material changes will be communicated. Questions: legal@ardovo.com.'] },
    ],
  },
  dpa: {
    slug: 'dpa',
    label: 'Data Processing Addendum',
    lede: 'How Ardovo processes customer personal data as your processor, for GDPR/CCPA-style requirements.',
    sections: [
      { h: 'Roles', p: [`This Data Processing Addendum ("DPA") forms part of the agreement between the customer ("Controller") and ${ENTITY} ("Processor"). It applies where ${ENTITY} processes personal data on the Controller's behalf.`] },
      { h: 'Scope and instructions', p: ['We process customer personal data only to provide the service and on the Controller documented instructions (including through the product configuration and Rook actions the Controller initiates), unless required otherwise by law.'] },
      { h: 'Confidentiality', p: ['Personnel authorized to process personal data are bound by confidentiality obligations and access data on a least-privilege, logged basis.'] },
      { h: 'Security measures', list: [
        'Encryption of data in transit (TLS 1.2+).',
        'Role-based access control and least-privilege internal access.',
        'Audit logging of access and of every action taken in the workspace, including Rook actions.',
        'Backups with tested restore paths for hosted workspaces.',
        'A documented incident-response process (see below).',
      ] },
      { h: 'Subprocessors', p: ['The Controller authorizes the use of the subprocessors listed on our Subprocessors page. Each is bound by data-protection terms consistent with this DPA. We will give notice of new subprocessors so the Controller can object on reasonable grounds.'] },
      { h: 'AI subprocessing and no-training', p: ['AI providers that power Rook process workspace context solely to return the requested output and are contractually prohibited from training their models on customer data.'] },
      { h: 'Data subject requests', p: ['Taking into account the nature of processing, we assist the Controller with responding to data subject access, deletion, correction, and portability requests via reasonable technical measures and self-serve export.'] },
      { h: 'Breach notification', p: ['We will notify the Controller without undue delay, and in any event within 72 hours, after becoming aware of a personal data breach affecting their data, with the information reasonably available.'] },
      { h: 'International transfers', p: ['Where applicable, transfers rely on Standard Contractual Clauses or another lawful transfer mechanism.'] },
      { h: 'Deletion and return', p: ['On termination the Controller may export data; we then delete or anonymize it within 90 days unless retention is legally required.'] },
      { h: 'Audit', p: ['On reasonable request and subject to confidentiality, we make available the information necessary to demonstrate compliance, including our current security documentation and (once available) our SOC 2 report. Requests: security@ardovo.com.'] },
    ],
  },
  subprocessors: {
    slug: 'subprocessors',
    label: 'Subprocessors',
    lede: 'The third parties that help us run Ardovo, what they do, and where they operate. We update this list before adding a new one.',
    table: true,
    sections: [
      { h: 'How we use subprocessors', p: ['We engage a small set of trusted providers to deliver the service. Each is bound by a data-protection agreement consistent with our DPA and processes personal data only to perform its function. Providers marked "only when configured/enabled" are used solely if you turn on the related feature.'] },
      { h: 'Change notifications', p: ['To be notified of new or replaced subprocessors, email security@ardovo.com and ask to be added to the subprocessor-change list.'] },
    ],
  },
  cookies: {
    slug: 'cookies',
    label: 'Cookie Policy',
    lede: 'The small amount of local storage we use and why.',
    sections: [
      { h: 'What we store', list: [
        'Strictly necessary: session and authentication state so you stay signed in, and (in demo mode) your local-first workspace data, which lives only in your own browser.',
        'Preferences: interface choices such as pinned pages and theme.',
        'Analytics: privacy-respecting usage measurement to improve the product. We do not use advertising trackers.',
      ] },
      { h: 'Managing storage', p: ['You can clear cookies and local storage at any time through your browser settings. Clearing local-first demo data will remove any workspace data stored only in your browser.'] },
      { h: 'Contact', p: ['Questions: privacy@ardovo.com.'] },
    ],
  },
};

const ORDER = ['privacy', 'terms', 'dpa', 'subprocessors', 'cookies'];

function Prose({ doc }) {
  return (
    <div className="legal-prose">
      {doc.sections.map((s, i) => (
        <section key={i} style={{ marginTop: i === 0 ? 0 : 34 }}>
          <h2 className="mkt-h3" style={{ fontSize: '1.35rem', marginBottom: 12 }}>{s.h}</h2>
          {(s.p || []).map((para, j) => (
            <p key={j} className="mkt-body" style={{ margin: '0 0 12px', lineHeight: 1.72 }}>{para}</p>
          ))}
          {s.list && (
            <ul style={{ margin: '4px 0 0', paddingLeft: 20, display: 'grid', gap: 10 }}>
              {s.list.map((li, k) => (
                <li key={k} className="mkt-body" style={{ lineHeight: 1.66 }}>{li}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
      {doc.table && (
        <div style={{ marginTop: 28, overflowX: 'auto' }}>
          <table className="legal-table">
            <thead><tr><th>Subprocessor</th><th>Purpose</th><th>Location</th></tr></thead>
            <tbody>
              {SUBPROCESSORS.map(([n, p, loc]) => (
                <tr key={n}><td style={{ fontWeight: 700 }}>{n}</td><td>{p}</td><td>{loc}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LegalIndex() {
  return (
    <>
      <section className="mkt-hero co-hero">
        <div className="co-hero-glow" aria-hidden />
        <div className="mkt-wrap">
          <Reveal>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}><Pill>Legal</Pill></div>
            <h1 className="mkt-h1" style={{ maxWidth: 820, margin: '0 auto', textAlign: 'center' }}>
              The <span className="mkt-grad">fine print</span>, in plain English.
            </h1>
            <p className="mkt-lead" style={{ maxWidth: 640, margin: '24px auto 0', textAlign: 'center' }}>
              Everything your legal and procurement teams need, written to be read. Updated {EFFECTIVE}.
            </p>
          </Reveal>
        </div>
      </section>
      <section className="mkt-section" style={{ paddingTop: 12 }}>
        <div className="mkt-wrap">
          <div className="mkt-grid mkt-grid-3 m-cascade" style={{ maxWidth: 980, margin: '0 auto' }}>
            {ORDER.map((k, i) => (
              <Reveal key={k} delay={(i % 3) * 70}>
                <Link to={`/legal/${k}`} className="mkt-card co-cap" style={{ display: 'block', textDecoration: 'none' }}>
                  <div className="mkt-icon"><Icon name="fileText" size={22} /></div>
                  <h3 className="mkt-h3" style={{ fontSize: '1.15rem', margin: '16px 0 8px' }}>{DOCS[k].label}</h3>
                  <p className="mkt-body" style={{ fontSize: '.96rem', margin: 0 }}>{DOCS[k].lede}</p>
                  <span className="mkt-grad" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14, fontWeight: 700 }}>Read <Icon name="chevronRight" size={15} /></span>
                </Link>
              </Reveal>
            ))}
          </div>
          <p className="mkt-dim mkt-center" style={{ fontSize: 14, marginTop: 34 }}>
            Need our security package or a signed DPA? <Link to="/security" className="mkt-grad" style={{ fontWeight: 700 }}>See security</Link> or email legal@ardovo.com.
          </p>
        </div>
      </section>
    </>
  );
}

export default function Legal() {
  const { doc: slug } = useParams();
  const doc = slug ? DOCS[slug] : null;
  useSeoHead({
    title: doc ? `${doc.label} | Ardovo` : 'Legal | Ardovo',
    description: doc ? doc.lede : 'Ardovo legal documents: privacy policy, terms of service, data processing addendum, subprocessors, and cookie policy.',
  });
  if (!slug) return <LegalIndex />;
  if (!doc) return <Navigate to="/legal" replace />;
  return (
    <>
      <style>{`
        .legal-table { width: 100%; border-collapse: collapse; font-size: 15px; }
        .legal-table th, .legal-table td { text-align: left; padding: 12px 14px; border-bottom: 1px solid var(--m-line); vertical-align: top; }
        .legal-table thead th { font-size: 12px; letter-spacing: .06em; text-transform: uppercase; color: var(--m-ink2); }
        .legal-prose h2 { scroll-margin-top: 90px; }
      `}</style>
      <section className="mkt-section" style={{ paddingTop: 120 }}>
        <div className="mkt-wrap" style={{ maxWidth: 820 }}>
          <Reveal>
            <Link to="/legal" className="mkt-dim" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, marginBottom: 18 }}>
              <Icon name="arrowLeft" size={15} /> All legal documents
            </Link>
            <h1 className="mkt-h1" style={{ fontSize: 'clamp(2rem, 4vw, 2.9rem)' }}>{doc.label}</h1>
            <p className="mkt-lead" style={{ marginTop: 16 }}>{doc.lede}</p>
            <p className="mkt-dim" style={{ fontSize: 14, marginTop: 8 }}>Effective {EFFECTIVE}</p>
          </Reveal>
          <Reveal delay={90}>
            <div style={{ marginTop: 40 }}><Prose doc={doc} /></div>
          </Reveal>
          <Reveal delay={140}>
            <div style={{ marginTop: 44, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {ORDER.filter(k => k !== slug).map(k => (
                <Link key={k} to={`/legal/${k}`} className="mkt-btn mkt-btn-ghost" style={{ padding: '9px 16px', fontSize: 14 }}>{DOCS[k].label}</Link>
              ))}
            </div>
          </Reveal>
        </div>
      </section>
      <CtaBand title="Security and legal, handled." />
    </>
  );
}
