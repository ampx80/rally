// AiTrust.jsx - AI Trust and Governance (/ai-trust). Because Rook takes real
// actions, this is now a top-3 buyer criterion. Honest, specific, CISO-ready.
// Scoped under .mkt (MarketingShell wraps it). NO em-dash / en-dash. ASCII only.
import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/icons.jsx';
import { Reveal, Pill, CtaBand } from './kit.jsx';
import { useSeoHead } from './seo/head.js';
import './company.css';

const PRINCIPLES = [
  { icon: 'target', title: 'Grounded on your data only', line: 'Rook reasons over the records in your workspace and the request you give it. It does not browse the open web for facts about your pipeline, and it never invents contacts, deals, or numbers.' },
  { icon: 'sparkles', title: 'Never trained on your data', line: 'Rook runs on Anthropic Claude, with OpenAI for optional voice. Both are used under agreements that prohibit training their models on your data. Your revenue data is not a training set.' },
  { icon: 'lock', title: 'Least-context by default', line: 'We send the model only the workspace context a task needs, not your whole database. Data leaves your workspace boundary only to the AI provider processing that single request.' },
  { icon: 'check', title: 'Human-in-the-loop on risk', line: 'Rook proposes; you approve. Low-risk reads run freely, but every high-risk write, send, or external action pauses for a human confirmation before it commits.' },
  { icon: 'workflow', title: 'Every action is audited', line: 'Each action Rook takes is written to your audit log with who, what, when, and why - the reasoning behind the action, not just the result. "The AI did it" is never the answer.' },
  { icon: 'activity', title: 'Reversible by design', line: 'Actions are staged and reversible. Night Shift shows a diff of what Rook wants to change before it lands, and changes can be rolled back.' },
];

const TIERS = [
  ['Read and summarize', 'Look up a contact, summarize a deal, draft an internal note', 'Runs automatically', 'ok'],
  ['Internal write', 'Create a task, update a stage, log an activity', 'Runs, fully logged and reversible', 'ok'],
  ['External or high-value', 'Send an email, move a large deal, change pricing, contact a customer', 'Requires human approval first', 'warn'],
  ['Irreversible or bulk', 'Bulk delete, mass update, anything that cannot be cleanly undone', 'Blocked without explicit admin confirmation', 'stop'],
];

const CONTROLS = [
  { icon: 'sliders', title: 'Scoped permissions and budgets', line: 'Rook inherits the permissions of the user it acts for, capped by role. Admins set action budgets and no-go zones so an agent can never exceed a human.' },
  { icon: 'shield', title: 'Guardrails and no-go zones', line: 'Define objects, fields, and actions Rook may never touch. Guardrails are enforced server-side, not just in the prompt.' },
  { icon: 'building', title: 'Trust dial per workspace', line: 'Dial autonomy up or down per team, from suggest-only to supervised execution, and change it any time.' },
  { icon: 'fileText', title: 'Explainable decisions', line: 'Every proposal carries its reasoning and the records it used, so a manager can review the logic, not just approve a black box.' },
];

const FAQS = [
  { q: 'Which model powers Rook, and does our data train it?', a: 'Anthropic Claude for reasoning and OpenAI for optional voice. Neither provider is permitted to train on your data under our agreements. See our subprocessors list.' },
  { q: 'Does our data leave our environment?', a: 'Only the specific context needed for a single request is sent to the AI provider to generate that response. It is not retained for training. Everything else stays in your workspace.' },
  { q: 'How do you stop hallucinations from causing damage?', a: 'Rook is grounded on your records, high-risk actions require human approval, and every action is staged, logged, and reversible. The approval gate is the backstop against a wrong call becoming a wrong write.' },
  { q: 'Can we turn autonomy down for sensitive teams?', a: 'Yes. The trust dial is per workspace and per action tier, from suggest-only to supervised execution.' },
  { q: 'What does the audit trail actually capture?', a: 'For every action: the actor (human or Rook-on-behalf-of-user), timestamp, the object and fields changed, the before/after, and the reasoning. It is append-only.' },
];

export default function AiTrust() {
  useSeoHead({
    title: 'AI Trust and Governance | Ardovo',
    description: 'How Rook, Ardovo\'s AI operator, is governed: grounded on your data only, never trained on it, human approval on high-risk actions, full audit trail, and reversible by design.',
  });
  return (
    <>
      <style>{`
        .ait-table { width: 100%; border-collapse: collapse; font-size: 15px; margin-top: 8px; }
        .ait-table th, .ait-table td { text-align: left; padding: 13px 14px; border-bottom: 1px solid var(--m-line); vertical-align: top; }
        .ait-table thead th { font-size: 12px; letter-spacing: .06em; text-transform: uppercase; color: var(--m-ink2); }
        .ait-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; white-space: nowrap; }
        .ait-badge.ok { color: #0e9f8f; } .ait-badge.warn { color: #b7791f; } .ait-badge.stop { color: #c0392b; }
        .ait-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
      `}</style>

      <section className="mkt-hero co-hero">
        <div className="co-hero-glow" aria-hidden />
        <div className="mkt-wrap">
          <Reveal>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}><Pill>AI trust and governance</Pill></div>
            <h1 className="mkt-h1" style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
              An AI that acts, <span className="mkt-grad">governed like it does.</span>
            </h1>
            <p className="mkt-lead" style={{ maxWidth: 660, margin: '24px auto 0', textAlign: 'center' }}>
              Rook does real work in your CRM, so we hold it to a real standard: grounded on your data,
              never trained on it, approved by a human where it counts, and auditable down to the reasoning.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="mkt-section" style={{ paddingTop: 8 }}>
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center" style={{ maxWidth: 640, margin: '0 auto 44px' }}>
              <p className="mkt-eyebrow">The principles</p>
              <h2 className="mkt-h2" style={{ marginTop: 12 }}>Six commitments, in plain terms.</h2>
            </div>
          </Reveal>
          <div className="mkt-grid mkt-grid-3 m-cascade">
            {PRINCIPLES.map((p, i) => (
              <Reveal key={p.title} delay={(i % 3) * 80}>
                <div className="mkt-card co-cap">
                  <div className="mkt-icon"><Icon name={p.icon} size={22} /></div>
                  <h3 className="mkt-h3" style={{ fontSize: '1.15rem', margin: '16px 0 8px' }}>{p.title}</h3>
                  <p className="mkt-body" style={{ fontSize: '.96rem', margin: 0 }}>{p.line}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="mkt-wrap"><hr className="co-gradrule" /></div>

      <section className="mkt-section">
        <div className="mkt-wrap" style={{ maxWidth: 900 }}>
          <Reveal>
            <div className="mkt-center" style={{ maxWidth: 640, margin: '0 auto 32px' }}>
              <p className="mkt-eyebrow">Risk-tiered execution</p>
              <h2 className="mkt-h2" style={{ marginTop: 12 }}>Autonomy scaled to consequence.</h2>
              <p className="mkt-body" style={{ marginTop: 14 }}>
                Not every action deserves the same freedom. Rook runs freely where it is safe and stops for a
                human where it matters.
              </p>
            </div>
          </Reveal>
          <Reveal delay={90}>
            <table className="ait-table">
              <thead><tr><th>Action tier</th><th>Examples</th><th>What happens</th></tr></thead>
              <tbody>
                {TIERS.map(([tier, ex, behavior, level]) => (
                  <tr key={tier}>
                    <td style={{ fontWeight: 700 }}>{tier}</td>
                    <td className="mkt-body" style={{ margin: 0 }}>{ex}</td>
                    <td><span className={`ait-badge ${level}`}><span className="ait-dot" /> {behavior}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
        </div>
      </section>

      <div className="mkt-wrap"><hr className="co-gradrule" /></div>

      <section className="mkt-section">
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center" style={{ maxWidth: 640, margin: '0 auto 44px' }}>
              <p className="mkt-eyebrow">The controls</p>
              <h2 className="mkt-h2" style={{ marginTop: 12 }}>You hold the leash.</h2>
            </div>
          </Reveal>
          <div className="mkt-grid mkt-grid-2 m-cascade">
            {CONTROLS.map((c, i) => (
              <Reveal key={c.title} delay={(i % 2) * 90}>
                <div className="mkt-card co-cap">
                  <div className="mkt-icon"><Icon name={c.icon} size={22} /></div>
                  <h3 className="mkt-h3" style={{ fontSize: '1.15rem', margin: '16px 0 8px' }}>{c.title}</h3>
                  <p className="mkt-body" style={{ fontSize: '.96rem', margin: 0 }}>{c.line}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mkt-section" style={{ paddingTop: 0 }}>
        <div className="mkt-wrap" style={{ maxWidth: 820 }}>
          <Reveal>
            <div className="mkt-center" style={{ marginBottom: 32 }}>
              <p className="mkt-eyebrow">Questions we get</p>
              <h2 className="mkt-h2" style={{ marginTop: 12 }}>AI due diligence, answered.</h2>
            </div>
          </Reveal>
          {FAQS.map((f, i) => (
            <Reveal key={i} delay={i * 60}>
              <div className="mkt-card" style={{ marginBottom: 14, padding: '20px 22px' }}>
                <h3 className="mkt-h3" style={{ fontSize: '1.08rem', marginBottom: 8 }}>{f.q}</h3>
                <p className="mkt-body" style={{ margin: 0 }}>{f.a}</p>
              </div>
            </Reveal>
          ))}
          <Reveal delay={120}>
            <p className="mkt-dim mkt-center" style={{ fontSize: 14, marginTop: 26 }}>
              Read our <Link to="/security" className="mkt-grad" style={{ fontWeight: 700 }}>security posture</Link>,
              the <Link to="/security/faq" className="mkt-grad" style={{ fontWeight: 700 }}>compliance FAQ</Link>, or
              our <Link to="/legal/subprocessors" className="mkt-grad" style={{ fontWeight: 700 }}>subprocessors</Link>.
            </p>
          </Reveal>
        </div>
      </section>

      <CtaBand title="AI you can put in front of your board." />
    </>
  );
}
