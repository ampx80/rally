// Features.jsx - the full Ardovo product tour. Light premium marketing page.
// Every major section carries a relevant, self-contained animated diagram that
// illustrates that section's point (built under ./viz). Router wraps this in
// MarketingShell (nav + footer + aurora); we return the sections in a fragment.
// NO em-dash / en-dash. ASCII hyphen only.
import React from 'react';
import { Link } from 'react-router-dom';
import { Reveal, MktButton, Pill, CtaBand } from './kit.jsx';
import { Icon } from '../components/icons.jsx';
import PipelineBoard from './viz/PipelineBoard.jsx';
import AccountTimeline from './viz/AccountTimeline.jsx';
import RookCommand from './viz/RookCommand.jsx';
import AutomationFlow from './viz/AutomationFlow.jsx';
import ForecastChart from './viz/ForecastChart.jsx';
import ProjectFlow from './viz/ProjectFlow.jsx';
import EnterpriseShield from './viz/EnterpriseShield.jsx';

/* ---- bullet list item ---- */
function Bullet({ children }) {
  return (
    <li style={{ display: 'flex', gap: 11, alignItems: 'flex-start', padding: '8px 0' }}>
      <span style={{ marginTop: 3, color: 'var(--m-teal)', flexShrink: 0 }}>
        <Icon name="check" size={19} stroke={2.6} />
      </span>
      <span style={{ margin: 0, fontSize: '1.075rem', lineHeight: 1.5, color: 'var(--m-ink2)', fontWeight: 500 }}>{children}</span>
    </li>
  );
}

/* Alternating feature row: text on one side, an animated diagram on the other. */
function FeatureRow({ eyebrow, title, para, bullets, mock, flip, delay = 0 }) {
  return (
    <Reveal delay={delay}>
      <div
        className="mkt-feature-row"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center', margin: '92px 0' }}
      >
        <div style={{ order: flip ? 2 : 1 }}>
          <div className="mkt-eyebrow" style={{ marginBottom: 14, fontSize: 14 }}>{eyebrow}</div>
          <h2 className="mkt-h2" style={{ maxWidth: 480 }}>{title}</h2>
          <p className="mkt-lead" style={{ margin: '18px 0 22px', maxWidth: 470 }}>{para}</p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxWidth: 490 }}>
            {bullets.map((b, i) => <Bullet key={i}>{b}</Bullet>)}
          </ul>
        </div>
        <div style={{ order: flip ? 1 : 2 }}>{mock}</div>
      </div>
    </Reveal>
  );
}

/* ---- capability matrix summary ---- */
const MATRIX = [
  ['target', 'Deals and pipeline', 'Drag-and-drop kanban, weighted forecast, deep deal objects.'],
  ['users', 'Contacts and companies', 'Account 360 with full activity timelines.'],
  ['sparkles', 'Rook AI operator', 'Grounded answers and one-sentence account builds.'],
  ['workflow', 'Automations', 'Visual trigger to if/then to action builder.'],
  ['chart', 'Dashboards', 'Live charts and reports off real data.'],
  ['checkSquare', 'Projects', 'A Monday-style team board inside the CRM.'],
  ['send', 'Outreach and sequences', 'Multi-step cadences with reply detection.'],
  ['receipt', 'Quotes and billing', 'Line items, quotes, invoices in one place.'],
  ['command', 'Enterprise-ready', 'Roles, SSO, audit log, one design system.'],
];

export default function Features() {
  return (
    <>
      {/* HERO */}
      <header className="mkt-hero" style={{ overflow: 'hidden' }}>
        <div className="mkt-hero-mesh" aria-hidden />
        <div className="mkt-hero-gridbg" aria-hidden />
        <div className="mkt-wrap" style={{ position: 'relative', zIndex: 2 }}>
          <Reveal>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
              <Pill>The product</Pill>
            </div>
          </Reveal>
          <Reveal delay={60}>
            <h1 className="mkt-h1" style={{ maxWidth: 920, margin: '0 auto' }}>
              Everything a revenue team needs. <span className="mkt-grad m-shine">Nothing it doesn't.</span>
            </h1>
          </Reveal>
          <Reveal delay={120}>
            <p className="mkt-lead" style={{ maxWidth: 660, margin: '24px auto 34px', fontSize: 'clamp(1.18rem, 2vw, 1.45rem)' }}>
              Pipeline, contacts, outreach, quotes, projects, and reporting in one system.
              Every record grounded, every surface consistent, and an AI operator that runs the work.
            </p>
          </Reveal>
          <Reveal delay={180}>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <span className="m-magnet" style={{ display: 'inline-flex' }}>
                <MktButton to="/app" size="lg">Get started <Icon name="chevronRight" size={18} /></MktButton>
              </span>
              <MktButton to="/pages/rally-vs-salesforce" variant="ghost" size="lg">Compare to Salesforce</MktButton>
            </div>
          </Reveal>
        </div>
      </header>

      {/* FEATURE SECTIONS */}
      <section className="mkt-section" style={{ paddingTop: 24 }}>
        <div className="mkt-wrap">
          <FeatureRow
            eyebrow="Deals and pipeline"
            title="Pipeline you can actually run."
            para="Drag deals across a kanban board and watch the weighted forecast update live. Every deal is a deep object, not a flat row."
            bullets={[
              'Line items with quantities, discounts, and real ARR',
              'Buying committee with roles and influence scoring',
              'Competitors, close plans, and win/loss reasons',
              'Full audit history on every field change',
            ]}
            mock={<PipelineBoard />}
          />
          <FeatureRow
            flip
            eyebrow="Contacts and companies"
            title="The account 360, done right."
            para="Every person and company rolls up into one view. See the whole relationship on one screen instead of hunting across tabs."
            bullets={[
              'People linked to companies, deals, and open work',
              'A unified activity timeline of every touch',
              'Emails, calls, meetings, and notes in one stream',
              'Deal and revenue rollups per account',
            ]}
            mock={<AccountTimeline />}
          />
          <FeatureRow
            eyebrow="Rook AI operator"
            title="An operator, not a chatbot."
            para="Rook is grounded in your real records. Ask a question and it answers with your numbers, then offers to do the work for you."
            bullets={[
              'Grounded answers pulled from live data',
              'One sentence stands up a whole account',
              'Drafts emails and generates QBR decks',
              'Every claim traceable to a record',
            ]}
            mock={<RookCommand />}
          />
          <div style={{ textAlign: 'center', margin: '-48px 0 0' }}>
            <Link to="/product/rook" className="mkt-btn mkt-btn-ghost m-magnet">
              Meet Rook <Icon name="chevronRight" size={17} />
            </Link>
          </div>
          <FeatureRow
            flip
            eyebrow="Automations"
            title="Build a play in three moves."
            para="A visual builder that reads top to bottom. Pick a trigger, add if/then logic, and choose the actions. No scripting, no consultant."
            bullets={[
              'Triggers on any record change or schedule',
              'Branching if/then conditions',
              'Actions notify, assign, task, or draft',
              'Test a play before you turn it on',
            ]}
            mock={<AutomationFlow />}
          />
          <FeatureRow
            eyebrow="Dashboards and reports"
            title="Charts off real data, live."
            para="Dashboards read straight from your pipeline. No exports, no stale snapshots, no waiting on ops to rebuild the view."
            bullets={[
              'Live charts that update as deals move',
              'Slice by owner, stage, source, or segment',
              'Save and share reporting views',
              'Drill from a chart into the underlying records',
            ]}
            mock={<ForecastChart />}
          />
          <FeatureRow
            flip
            eyebrow="Projects"
            title="The whole revenue motion, one system."
            para="A Monday-style team board lives inside the CRM, so delivery, outreach, quotes, billing, and service all sit next to the deal."
            bullets={[
              'Kanban and list views for team work',
              'Outreach and sequences built in',
              'Quotes, line items, and invoices',
              'Post-sale service tracked on the account',
            ]}
            mock={<ProjectFlow />}
          />
          <FeatureRow
            eyebrow="Enterprise-ready"
            title="Serious from the first login."
            para="Security, roles, and a single design system are not add-ons. They ship on day one, and every surface looks and behaves the same."
            bullets={[
              'Granular roles and permissions',
              'SSO, SAML, and SOC 2 Type II',
              'Full audit log across every object',
              'One consistent design system everywhere',
            ]}
            mock={<EnterpriseShield />}
          />
          <div style={{ textAlign: 'center', marginTop: -48 }}>
            <Link to="/security" className="mkt-btn mkt-btn-ghost m-magnet">
              See our security posture <Icon name="chevronRight" size={17} />
            </Link>
          </div>
        </div>
      </section>

      <hr className="mkt-rule" />

      {/* CAPABILITY MATRIX */}
      <section className="mkt-section">
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center" style={{ marginBottom: 46 }}>
              <div className="mkt-eyebrow" style={{ marginBottom: 14 }}>The whole platform</div>
              <h2 className="mkt-h2" style={{ maxWidth: 740, margin: '0 auto' }}>
                One system for the entire <span className="mkt-grad">revenue motion.</span>
              </h2>
            </div>
          </Reveal>
          <Reveal delay={60}>
            <div className="mkt-hline-panel">
              <div className="mkt-hline-grid">
                {MATRIX.map(([ic, title, body]) => (
                  <div key={title} className="mkt-hline-item">
                    <div className="mkt-icon" style={{ marginBottom: 16 }}><Icon name={ic} size={22} /></div>
                    <h3 className="mkt-h3" style={{ fontSize: '1.3rem' }}>{title}</h3>
                    <p className="mkt-body" style={{ marginTop: 8, marginBottom: 0, fontSize: '1.02rem' }}>{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
