// Enterprise.jsx - the page for 1,000 to 10,000 seat buyers (/enterprise).
// Answers the real switching questions: go-live timeline, pilot on your own
// data, migration, onboarding, support/SLA, scale, and where security lives.
// Speaks to the enterprise without abandoning the small team. Scoped under .mkt.
// NO em-dash / en-dash. ASCII only.
import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/icons.jsx';
import { Reveal, Pill, MktButton, CtaBand } from './kit.jsx';
import { useSeoHead } from './seo/head.js';
import './company.css';

const PROOF = [
  ['90+', 'modules in one platform'],
  ['1', 'login, one design system'],
  ['5 to 5,000', 'seats on the same product'],
  ['60-day', 'rollback on migration'],
];

const TIMELINE = [
  { wk: 'Week 1', h: 'Pilot on your data', body: 'We import a slice of your real records into an isolated sandbox. Your team clicks around the actual product with the actual data, not a canned demo.' },
  { wk: 'Weeks 2-3', h: 'Configure and map', body: 'Pipeline stages, roles, custom fields, and integrations mapped to how you already work. Rook drafts the workflows; you approve them.' },
  { wk: 'Weeks 3-4', h: 'Migrate and validate', body: 'Full migration with a review-before-apply staging step: cleanse, de-dupe, and fix mismatched columns in-app before anything hits production.' },
  { wk: 'Week 4+', h: 'Go live with rollback', body: 'Cut over with a 60-day rollback safety net. Rook onboards each rep individually, so adoption does not stall in month two.' },
];

const CARDS = [
  { icon: 'box', title: 'Pilot on your own data', line: 'Run a 30-day evaluation on a sandbox loaded with your real records. Prove the fit before you sign, not after.' },
  { icon: 'workflow', title: 'Migration without the year-long project', line: 'A guided wizard cleanses, de-dupes, and maps your export, with a staging area to review every change before it applies. No consultants required.' },
  { icon: 'sparkles', title: 'AI-native onboarding', line: 'Rook trains your team member by member, on demand, in voice or chat. Everyone gets a personal implementation instead of a shared webinar.' },
  { icon: 'shield', title: 'Governed and audited', line: 'RBAC, an append-only audit log, two-factor auth, and Google SSO ship today. Every AI action is logged and reversible.' },
  { icon: 'users', title: 'Dedicated support and success', line: 'Enterprise plans include priority support and a named success manager, with an SLA defined in your order form.' },
  { icon: 'building', title: 'Scales down as well as up', line: 'The same platform runs a five-person team and a five-thousand-seat org. You do not outgrow it, and you do not overpay to start.' },
];

export default function Enterprise() {
  useSeoHead({
    title: 'Ardovo for Enterprise | One platform, live in weeks',
    description: 'Ardovo for 1,000 to 10,000 seat organizations: pilot on your own data, guided migration, AI-native onboarding, RBAC and audit, dedicated support, and a 60-day rollback. Live in weeks, not a year.',
  });
  return (
    <>
      <style>{`
        .ent-proof { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; max-width: 900px; margin: 0 auto; }
        @media (max-width: 720px) { .ent-proof { grid-template-columns: repeat(2, 1fr); } }
        .ent-proof-cell { text-align: center; }
        .ent-proof-n { font-size: clamp(2rem, 4vw, 2.8rem); font-weight: 900; letter-spacing: -.02em; background: var(--m-grad); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
        .ent-proof-l { font-size: 14px; color: var(--m-ink2); margin-top: 4px; }
        .ent-step { display: flex; gap: 18px; padding: 20px 0; border-bottom: 1px solid var(--m-line); }
        .ent-step-wk { flex: none; width: 108px; font-weight: 800; color: var(--m-accent, #0e9f8f); font-size: 14px; padding-top: 2px; }
      `}</style>

      <section className="mkt-hero co-hero">
        <div className="co-hero-glow" aria-hidden />
        <div className="mkt-wrap">
          <Reveal>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}><Pill>Ardovo for Enterprise</Pill></div>
            <h1 className="mkt-h1" style={{ maxWidth: 940, margin: '0 auto', textAlign: 'center' }}>
              Built for 10,000 seats. <span className="mkt-grad">Live in weeks, not a year.</span>
            </h1>
            <p className="mkt-lead" style={{ maxWidth: 680, margin: '24px auto 0', textAlign: 'center' }}>
              The last enterprise CRM migration you sat through took twelve months and burned a team. Ardovo
              runs the migration, trains your people with AI, and lets you pilot on your own data before you
              commit. Same platform, from your first rep to your ten-thousandth.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 30 }}>
              <MktButton to="/get-started" size="lg">Talk to us <Icon name="chevronRight" size={18} /></MktButton>
              <MktButton to="/demo" variant="ghost" size="lg">See the product</MktButton>
            </div>
          </Reveal>
          <Reveal delay={140}>
            <div className="ent-proof" style={{ marginTop: 54 }}>
              {PROOF.map(([n, l]) => (
                <div key={l} className="ent-proof-cell"><div className="ent-proof-n">{n}</div><div className="ent-proof-l">{l}</div></div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mkt-section">
        <div className="mkt-wrap" style={{ maxWidth: 820 }}>
          <Reveal>
            <div className="mkt-center" style={{ maxWidth: 640, margin: '0 auto 20px' }}>
              <p className="mkt-eyebrow">The rollout</p>
              <h2 className="mkt-h2" style={{ marginTop: 12 }}>From export to live in about a month.</h2>
              <p className="mkt-body" style={{ marginTop: 14 }}>
                A real timeline for a real team, not a sales fantasy. It moves fast because the AI does the
                heavy lifting and you approve the calls.
              </p>
            </div>
          </Reveal>
          <Reveal delay={90}>
            <div style={{ marginTop: 20 }}>
              {TIMELINE.map((s) => (
                <div key={s.wk} className="ent-step">
                  <div className="ent-step-wk">{s.wk}</div>
                  <div>
                    <h3 className="mkt-h3" style={{ fontSize: '1.12rem', marginBottom: 6 }}>{s.h}</h3>
                    <p className="mkt-body" style={{ margin: 0 }}>{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <div className="mkt-wrap"><hr className="co-gradrule" /></div>

      <section className="mkt-section">
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center" style={{ maxWidth: 640, margin: '0 auto 44px' }}>
              <p className="mkt-eyebrow">Why it works at scale</p>
              <h2 className="mkt-h2" style={{ marginTop: 12 }}>Everything the enterprise checklist asks for.</h2>
            </div>
          </Reveal>
          <div className="mkt-grid mkt-grid-3 m-cascade">
            {CARDS.map((c, i) => (
              <Reveal key={c.title} delay={(i % 3) * 80}>
                <div className="mkt-card co-cap">
                  <div className="mkt-icon"><Icon name={c.icon} size={22} /></div>
                  <h3 className="mkt-h3" style={{ fontSize: '1.15rem', margin: '16px 0 8px' }}>{c.title}</h3>
                  <p className="mkt-body" style={{ fontSize: '.96rem', margin: 0 }}>{c.line}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={120}>
            <p className="mkt-dim mkt-center" style={{ fontSize: 14, marginTop: 34 }}>
              For your security review: <Link to="/security" className="mkt-grad" style={{ fontWeight: 700 }}>security posture</Link>,
              <Link to="/security/faq" className="mkt-grad" style={{ fontWeight: 700 }}> compliance FAQ</Link>,
              <Link to="/ai-trust" className="mkt-grad" style={{ fontWeight: 700 }}> AI governance</Link>, and
              <Link to="/legal" className="mkt-grad" style={{ fontWeight: 700 }}> legal pack</Link>.
            </p>
          </Reveal>
        </div>
      </section>

      <CtaBand title="Bring your hardest migration. We will run it." sub="Pilot on your own data, migrate with a safety net, and go live in weeks." />
    </>
  );
}
