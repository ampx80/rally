// Features.jsx - the full RALLY product tour. Dark cinematic marketing page.
// Router wraps MarketingShell (nav + footer + aurora) around this; we only
// return the page sections in a fragment. NO em-dash / en-dash - ASCII only.
import React from 'react';
import { Link } from 'react-router-dom';
import { Reveal, MktButton, Pill, CtaBand } from './kit.jsx';
import { Icon } from '../components/icons.jsx';

/* ---- small presentational helpers (page-local mocks) ---- */

function Bullet({ children }) {
  return (
    <li style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '7px 0' }}>
      <span style={{ marginTop: 2, color: 'var(--m-teal)', flexShrink: 0 }}>
        <Icon name="check" size={18} stroke={2.4} />
      </span>
      <span className="mkt-body" style={{ margin: 0 }}>{children}</span>
    </li>
  );
}

/* Alternating feature row: text on one side, a visual mock on the other. */
function FeatureRow({ eyebrow, title, para, bullets, mock, flip, delay = 0 }) {
  return (
    <Reveal delay={delay}>
      <div
        className="mkt-feature-row"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 56,
          alignItems: 'center',
          margin: '84px 0',
        }}
      >
        <div style={{ order: flip ? 2 : 1 }}>
          <div className="mkt-eyebrow" style={{ marginBottom: 14 }}>{eyebrow}</div>
          <h2 className="mkt-h2" style={{ maxWidth: 480 }}>{title}</h2>
          <p className="mkt-lead" style={{ margin: '18px 0 20px', maxWidth: 460 }}>{para}</p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxWidth: 480 }}>
            {bullets.map((b, i) => <Bullet key={i}>{b}</Bullet>)}
          </ul>
        </div>
        <div style={{ order: flip ? 1 : 2 }}>{mock}</div>
      </div>
    </Reveal>
  );
}

/* ---- the mocks (built from divs + inline SVG, styled to feel like product) ---- */

function KanbanMock() {
  const cols = [
    { name: 'Qualified', tint: 'rgba(109,92,247,.5)', cards: [['Northwind renewal', '$48k'], ['Atlas expansion', '$22k']] },
    { name: 'Proposal', tint: 'rgba(168,85,247,.5)', cards: [['Vertex platform', '$156k']] },
    { name: 'Closing', tint: 'rgba(20,224,200,.5)', cards: [['Beacon migrate', '$91k'], ['Orbit seats', '$34k']] },
  ];
  return (
    <div className="mkt-glass" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, padding: '0 4px' }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Pipeline</span>
        <span className="mkt-pill" style={{ fontSize: 12, padding: '4px 10px' }}>
          <Icon name="trendUp" size={13} /> Weighted $284k
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {cols.map((c) => (
          <div key={c.name} style={{ background: 'rgba(255,255,255,.02)', border: '1px solid var(--m-line)', borderRadius: 12, padding: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10, fontSize: 12, fontWeight: 700, color: 'var(--m-ink2)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 3, background: c.tint }} />
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {c.cards.map(([t, v]) => (
                <div key={t} style={{ background: 'var(--m-panel)', border: '1px solid var(--m-line2)', borderRadius: 9, padding: '9px 10px' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t}</div>
                  <div style={{ fontSize: 12, color: 'var(--m-teal)', fontWeight: 700, marginTop: 3 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DealObjectMock() {
  const rows = [
    ['Line items', '4 SKUs, $156k ARR'],
    ['Buying committee', 'CFO (champion), VP Eng (eval)'],
    ['Competitor', 'Salesforce (displacing)'],
    ['Close plan', '6 steps, 2 open'],
  ];
  return (
    <div className="mkt-glass" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>Vertex platform</div>
          <div style={{ fontSize: 12.5, color: 'var(--m-ink3)', marginTop: 2 }}>Proposal - 68% to close</div>
        </div>
        <span className="mkt-pill" style={{ fontSize: 12, padding: '4px 10px' }}>$156k</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--m-line)' }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '11px 13px', background: 'rgba(255,255,255,.02)', fontSize: 13 }}>
            <span style={{ color: 'var(--m-ink3)', fontWeight: 600 }}>{k}</span>
            <span style={{ fontWeight: 600, textAlign: 'right' }}>{v}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 12, color: 'var(--m-ink3)' }}>
        <Icon name="clock" size={14} /> Full audit history on every field
      </div>
    </div>
  );
}

function Account360Mock() {
  return (
    <div className="mkt-glass" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div className="mkt-icon" style={{ width: 42, height: 42 }}><Icon name="building" size={22} /></div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>Northwind Corp</div>
          <div style={{ fontSize: 12.5, color: 'var(--m-ink3)' }}>Enterprise - 3 open deals - $284k</div>
        </div>
      </div>
      <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--m-ink3)', margin: '4px 0 10px' }}>Activity timeline</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {[
          ['mail', 'Emailed proposal to CFO', '2h ago'],
          ['phone', 'Discovery call, 32 min', 'Yesterday'],
          ['calendar', 'Booked exec review', '3d ago'],
          ['fileText', 'Shared security packet', '5d ago'],
        ].map(([ic, t, when], i, arr) => (
          <div key={t} style={{ display: 'flex', gap: 12, position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(109,92,247,.14)', border: '1px solid rgba(109,92,247,.3)', color: '#b7aefb', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <Icon name={ic} size={14} />
              </span>
              {i < arr.length - 1 && <span style={{ width: 1, flex: 1, background: 'var(--m-line2)', minHeight: 14 }} />}
            </div>
            <div style={{ paddingBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{t}</div>
              <div style={{ fontSize: 11.5, color: 'var(--m-ink3)', marginTop: 1 }}>{when}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RookMock() {
  return (
    <div className="mkt-glass mkt-card-glow" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
        <span className="mkt-logo-mark" style={{ width: 30, height: 30 }}><Icon name="sparkles" size={17} fill="#fff" stroke={0} /></span>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Rook</span>
        <span className="mkt-dot" style={{ marginLeft: 'auto' }} />
      </div>
      <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid var(--m-line)', borderRadius: 12, padding: '10px 13px', fontSize: 13.5, marginBottom: 10 }}>
        Which deals slipped this quarter and why?
      </div>
      <div style={{ background: 'linear-gradient(180deg, rgba(109,92,247,.14), rgba(109,92,247,.04))', border: '1px solid rgba(109,92,247,.3)', borderRadius: 12, padding: '12px 14px', fontSize: 13.5, lineHeight: 1.55 }}>
        3 deals slipped, worth <b style={{ color: 'var(--m-teal)' }}>$213k</b>. All stalled at Legal review. Common blocker: security questionnaire. Want me to send the SOC 2 packet to each?
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        {['Send packets', 'Draft follow-ups', 'Build the report'].map(a => (
          <span key={a} style={{ fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 9, background: 'rgba(255,255,255,.05)', border: '1px solid var(--m-line2)', cursor: 'default' }}>{a}</span>
        ))}
      </div>
    </div>
  );
}

function AutomationMock() {
  const nodes = [
    { label: 'Trigger', sub: 'Deal moves to Closing', ic: 'zap', accent: true },
    { label: 'If / then', sub: 'Amount > $50k', ic: 'workflow' },
    { label: 'Actions', sub: 'Notify, task, draft', ic: 'send' },
  ];
  return (
    <div className="mkt-glass" style={{ padding: 22 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {nodes.map((n, i) => (
          <React.Fragment key={n.label}>
            <div className={`mkt-node${n.accent ? ' mkt-node-accent' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <span className="mkt-icon" style={{ width: 38, height: 38 }}><Icon name={n.ic} size={19} /></span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--m-ink3)' }}>{n.label}</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 2 }}>{n.sub}</div>
              </div>
            </div>
            {i < nodes.length - 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--m-ink3)' }}>
                <Icon name="chevronDown" size={20} />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function DashboardMock() {
  const bars = [42, 68, 55, 88, 74, 96, 61];
  return (
    <div className="mkt-glass" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Revenue by week</span>
        <span style={{ fontSize: 12, color: 'var(--m-teal)', fontWeight: 700 }}>+18%</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 130, padding: '14px 4px 4px' }}>
        {bars.map((h, i) => (
          <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: '6px 6px 3px 3px', background: 'linear-gradient(180deg, #6d5cf7, #a855f7)', opacity: 0.55 + (h / 250) }} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 16 }}>
        {[['$1.2M', 'Pipeline'], ['32%', 'Win rate'], ['21d', 'Avg cycle']].map(([v, l]) => (
          <div key={l} style={{ background: 'rgba(255,255,255,.02)', border: '1px solid var(--m-line)', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.02em' }}>{v}</div>
            <div style={{ fontSize: 11.5, color: 'var(--m-ink3)', fontWeight: 600 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectsMock() {
  const cols = [
    ['To do', ['Onboard Vertex', 'Q3 QBR deck']],
    ['In progress', ['Migrate Beacon', 'Renewal terms']],
    ['Done', ['Kickoff call']],
  ];
  return (
    <div className="mkt-glass" style={{ padding: 18 }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, padding: '0 4px' }}>Customer projects</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {cols.map(([name, cards]) => (
          <div key={name} style={{ background: 'rgba(255,255,255,.02)', border: '1px solid var(--m-line)', borderRadius: 11, padding: 10 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--m-ink3)', marginBottom: 8 }}>{name}</div>
            {cards.map(c => (
              <div key={c} style={{ background: 'var(--m-panel)', border: '1px solid var(--m-line2)', borderRadius: 8, padding: '8px 9px', fontSize: 12, fontWeight: 600, marginBottom: 7, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c}</div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        {['Outreach', 'Quotes', 'Billing', 'Service'].map(t => (
          <span key={t} style={{ fontSize: 11.5, fontWeight: 600, padding: '5px 11px', borderRadius: 999, background: 'rgba(20,224,200,.1)', border: '1px solid rgba(20,224,200,.25)', color: '#8ff0e4' }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

function EnterpriseMock() {
  const items = [
    ['users', 'Roles and permissions', 'Granular, per-object'],
    ['command', 'SSO and SAML', 'SOC 2 Type II'],
    ['layers', 'One design system', 'Every surface consistent'],
    ['activity', 'Full audit log', 'Every field, every change'],
  ];
  return (
    <div className="mkt-glass" style={{ padding: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {items.map(([ic, t, s]) => (
          <div key={t} style={{ background: 'rgba(255,255,255,.02)', border: '1px solid var(--m-line)', borderRadius: 12, padding: 14 }}>
            <span className="mkt-icon" style={{ width: 36, height: 36, marginBottom: 10 }}><Icon name={ic} size={18} /></span>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>{t}</div>
            <div style={{ fontSize: 12, color: 'var(--m-ink3)', marginTop: 3 }}>{s}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- capability matrix summary ---- */
const MATRIX = [
  ['deals', 'Deals and pipeline', 'Drag-and-drop kanban, weighted forecast, deep deal objects.'],
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
      <header className="mkt-hero">
        <div className="mkt-wrap">
          <Reveal>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
              <Pill>The product</Pill>
            </div>
          </Reveal>
          <Reveal delay={60}>
            <h1 className="mkt-h1" style={{ maxWidth: 900, margin: '0 auto' }}>
              Everything a revenue team needs. <span className="mkt-grad">Nothing it doesn't.</span>
            </h1>
          </Reveal>
          <Reveal delay={120}>
            <p className="mkt-lead" style={{ maxWidth: 640, margin: '22px auto 32px' }}>
              Pipeline, contacts, outreach, quotes, projects, and reporting in one system.
              Every record grounded, every surface consistent, and an AI operator that runs the work.
            </p>
          </Reveal>
          <Reveal delay={180}>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <MktButton to="/app" size="lg">Get started <Icon name="chevronRight" size={18} /></MktButton>
              <MktButton to="/compare/salesforce" variant="ghost" size="lg">Compare to Salesforce</MktButton>
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
            mock={<KanbanMock />}
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
            mock={<Account360Mock />}
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
            mock={<RookMock />}
          />
          <div style={{ textAlign: 'center', margin: '-40px 0 0' }}>
            <Link to="/product/rook" className="mkt-btn mkt-btn-ghost">
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
            mock={<AutomationMock />}
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
            mock={<DashboardMock />}
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
            mock={<ProjectsMock />}
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
            mock={<EnterpriseMock />}
          />
          <div style={{ textAlign: 'center', marginTop: -40 }}>
            <Link to="/security" className="mkt-btn mkt-btn-ghost">
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
            <div className="mkt-center" style={{ marginBottom: 44 }}>
              <div className="mkt-eyebrow" style={{ marginBottom: 14 }}>The whole platform</div>
              <h2 className="mkt-h2" style={{ maxWidth: 720, margin: '0 auto' }}>
                One system for the entire <span className="mkt-grad">revenue motion.</span>
              </h2>
            </div>
          </Reveal>
          <div className="mkt-grid mkt-grid-3">
            {MATRIX.map(([ic, title, body], i) => (
              <Reveal key={title} delay={(i % 3) * 70}>
                <div className="mkt-card mkt-card-glow" style={{ height: '100%' }}>
                  <div className="mkt-icon" style={{ marginBottom: 16 }}><Icon name={ic} size={22} /></div>
                  <h3 className="mkt-h3" style={{ fontSize: '1.25rem' }}>{title}</h3>
                  <p className="mkt-body" style={{ marginTop: 8, marginBottom: 0 }}>{body}</p>
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
