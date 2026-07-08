// RALLY marketing homepage - the Juggernaut landing page.
// Dark, cinematic, bold. Returns page sections in a fragment; the router
// wraps this in MarketingShell (nav + footer + aurora). NO em-dash / en-dash.
import React from 'react';
import { Link } from 'react-router-dom';
import { Reveal, MktButton, Pill, CtaBand } from './kit.jsx';
import { Icon } from '../components/icons.jsx';

/* Tiny inline sparkline drawn from a set of points. */
function Spark({ points, color = 'var(--m-teal)', w = 84, h = 26 }) {
  const max = Math.max(...points), min = Math.min(...points);
  const span = max - min || 1;
  const step = w / (points.length - 1);
  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)} ${(h - ((p - min) / span) * h).toFixed(1)}`)
    .join(' ');
  const area = `${d} L${w} ${h} L0 ${h} Z`;
  const id = 'sg' + points.join('');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const KPIS = [
  { label: 'Pipeline', value: '$8.2M', delta: '+18%', pts: [3, 5, 4, 6, 7, 6, 9, 11], color: 'var(--m-teal)' },
  { label: 'Win rate', value: '64%', delta: '+6pt', pts: [4, 4, 5, 5, 6, 7, 7, 8], color: '#a855f7' },
  { label: 'New deals', value: '312', delta: '+41', pts: [2, 4, 3, 5, 6, 8, 7, 10], color: '#6d5cf7' },
  { label: 'Forecast', value: '$3.1M', delta: '+12%', pts: [5, 4, 6, 5, 7, 8, 9, 9], color: 'var(--m-teal)' },
];

const STAGES = [
  { name: 'Qualified', color: '#6d5cf7', deals: [['Northwind Freight', '$180K'], ['Vertex Labs', '$92K']] },
  { name: 'Proposal', color: '#a855f7', deals: [['Cobalt Mfg', '$240K'], ['Harbor Point', '$58K']] },
  { name: 'Negotiation', color: '#14e0c8', deals: [['Solace Health', '$410K'], ['Ridgeline', '$120K']] },
  { name: 'Closing', color: '#f0a94a', deals: [['Atlas Retail', '$275K']] },
];

const ROOK_LOG = [
  'Created Northwind Freight',
  'Added 4 stakeholders',
  'Opened a $180K deal',
  'Scheduled 6 tasks',
];

const FEATURES = [
  { icon: 'funnel', title: 'Deals & pipeline', copy: 'Drag-and-drop stages, weighted forecast, and win insights that update live.' },
  { icon: 'users', title: 'Contacts & companies', copy: 'A full book of business with relationship graphs and enrichment built in.' },
  { icon: 'sparkles', title: 'Rook AI operator', copy: 'An agent that reads, decides, and does the work across every module.' },
  { icon: 'workflow', title: 'Automations', copy: 'Trigger sequences, routing, and follow-ups without a single admin.' },
  { icon: 'chart', title: 'Dashboards & reports', copy: 'Boardroom-grade analytics with drill-down on every number.' },
  { icon: 'layers', title: 'Projects', copy: 'Turn a closed deal into delivery. Tasks, owners, and timelines in one place.' },
  { icon: 'megaphone', title: 'Outreach & sequences', copy: 'Multi-touch campaigns that Rook personalizes and paces for you.' },
  { icon: 'receipt', title: 'Quotes & billing', copy: 'Generate quotes, invoices, and revenue schedules from the deal itself.' },
  { icon: 'inbox', title: 'Service inbox', copy: 'Support and success threads tied to the same customer record.' },
];

const SPOKES = [
  { icon: 'layers', label: 'PM' },
  { icon: 'megaphone', label: 'Outreach' },
  { icon: 'grid', label: 'Studio' },
  { icon: 'receipt', label: 'Billing' },
];

const STATS = [
  { value: 'Minutes', label: 'To first value' },
  { value: '1', label: 'Operator, every module' },
  { value: '0', label: 'Admins required' },
  { value: '100%', label: 'AI-native' },
];

const DIFFERENTIATORS = [
  {
    eyebrow: 'Alive on first load',
    title: 'A book of business, seeded on day one.',
    copy: 'No blank slate. Rally opens with a real pipeline, real contacts, and real dashboards so you feel the platform working before you type a thing.',
    mock: 'seed',
  },
  {
    eyebrow: 'Rook does the work',
    title: 'Ask once. It executes everything.',
    copy: 'Rook is agentic. Describe an outcome and it creates the accounts, opens the deals, adds the stakeholders, and schedules the tasks in one run.',
    mock: 'agent',
  },
  {
    eyebrow: 'Built to be beautiful',
    title: 'The polish of Linear. The depth of a platform.',
    copy: 'Every surface is fast, considered, and dense with capability. Rally feels like software people actually want to open every morning.',
    mock: 'polish',
  },
];

const COMPETITORS = ['Salesforce', 'HubSpot', 'Zoho', 'NetSuite', 'Pipedrive', 'Zendesk', 'Copper'];

/* ---- small mock visuals for the differentiator rows ---- */
function MiniMock({ kind }) {
  if (kind === 'seed') {
    return (
      <div className="mkt-glass" style={{ padding: 18 }}>
        {[['Acme Robotics', '$220K', 78], ['Delta Systems', '$140K', 54], ['Pinnacle Group', '$96K', 40]].map(([n, v, w]) => (
          <div key={n} style={{ padding: '12px 4px', borderBottom: '1px solid var(--m-line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14.5, fontWeight: 600 }}>
              <span>{n}</span><span className="mkt-muted">{v}</span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: 'var(--m-line)', overflow: 'hidden' }}>
              <div style={{ width: `${w}%`, height: '100%', background: 'var(--m-grad)' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (kind === 'agent') {
    return (
      <div className="mkt-glass" style={{ padding: 18 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
          <span className="mkt-icon" style={{ width: 34, height: 34 }}><Icon name="sparkles" size={18} /></span>
          <span style={{ fontWeight: 700 }}>Rook</span>
          <span className="mkt-pill" style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: 12 }}><span className="mkt-dot" />Running</span>
        </div>
        {['Analyzing request', 'Creating records', 'Scheduling follow-ups'].map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', fontSize: 14.5 }}>
            <span style={{ color: 'var(--m-teal)', display: 'grid', placeItems: 'center' }}><Icon name="check" size={17} /></span>
            <span className="mkt-muted">{s}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="mkt-glass" style={{ padding: 0 }}>
      <div style={{ display: 'flex', gap: 6, padding: '12px 16px', borderBottom: '1px solid var(--m-line)' }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: '#f0605a' }} />
        <span style={{ width: 10, height: 10, borderRadius: 999, background: '#f0a94a' }} />
        <span style={{ width: 10, height: 10, borderRadius: 999, background: '#14e0c8' }} />
      </div>
      <div style={{ padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {['trendUp', 'pie', 'users', 'target'].map((ic, i) => (
          <div key={ic} style={{ background: 'rgba(255,255,255,.03)', border: '1px solid var(--m-line)', borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="mkt-icon" style={{ width: 30, height: 30 }}><Icon name={ic} size={16} /></span>
            <div style={{ height: 8, flex: 1, borderRadius: 999, background: 'var(--m-line)', overflow: 'hidden' }}>
              <div style={{ width: `${55 + i * 12}%`, height: '100%', background: 'var(--m-grad)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <>
      {/* 1. HERO */}
      <section className="mkt-hero">
        <div className="mkt-wrap">
          <Reveal>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 26 }}>
              <Pill><span className="mkt-tag">New</span> Rook Autopilot is live</Pill>
            </div>
            <h1 className="mkt-h1" style={{ maxWidth: 1000, margin: '0 auto' }}>
              The new AI-powered CRM <span className="mkt-grad">is here.</span>
            </h1>
            <p className="mkt-lead" style={{ maxWidth: 680, margin: '24px auto 0' }}>
              Meet Rally. It comes alive on the first load, and Rook, your AI operator, does the
              actual work: builds the accounts, drafts the emails, moves the deals, and tells you
              the next move. The system of record just became the system that acts.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginTop: 34 }}>
              <MktButton to="/app" size="lg">Get started free <Icon name="chevronRight" size={18} /></MktButton>
              <MktButton to="/product/rook" variant="ghost" size="lg"><Icon name="sparkles" size={18} /> Watch Rook work</MktButton>
            </div>
          </Reveal>

          {/* Product mock */}
          <Reveal delay={120}>
            <div
              className="mkt-glass"
              style={{ marginTop: 62, textAlign: 'left', transform: 'perspective(1600px) rotateX(3deg)', transformOrigin: 'center top' }}
            >
              {/* top bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--m-line)' }}>
                <span style={{ display: 'flex', gap: 6 }}>
                  <span style={{ width: 11, height: 11, borderRadius: 999, background: '#f0605a' }} />
                  <span style={{ width: 11, height: 11, borderRadius: 999, background: '#f0a94a' }} />
                  <span style={{ width: 11, height: 11, borderRadius: 999, background: '#14e0c8' }} />
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 6, fontWeight: 700, fontSize: 14 }}>
                  <span className="mkt-icon" style={{ width: 24, height: 24, borderRadius: 7 }}><Icon name="zap" size={13} fill="#b7aefb" stroke={0} /></span>
                  Rally
                </span>
                <span style={{ marginLeft: 16, display: 'flex', gap: 14, fontSize: 13.5 }} className="mkt-dim">
                  <span style={{ color: 'var(--m-ink)' }}>Pipeline</span><span>Contacts</span><span>Reports</span><span>Rook</span>
                </span>
                <span className="mkt-pill" style={{ marginLeft: 'auto', padding: '5px 12px', fontSize: 12.5 }}><span className="mkt-dot" />Live</span>
              </div>

              {/* KPI tiles */}
              <div className="mkt-grid mkt-grid-4" style={{ padding: 20, gap: 14 }}>
                {KPIS.map(k => (
                  <div key={k.label} style={{ background: 'rgba(255,255,255,.03)', border: '1px solid var(--m-line)', borderRadius: 14, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="mkt-dim" style={{ fontSize: 12.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>{k.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--m-teal)' }}>{k.delta}</span>
                    </div>
                    <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.02em', margin: '8px 0 10px' }}>{k.value}</div>
                    <Spark points={k.pts} color={k.color} />
                  </div>
                ))}
              </div>

              {/* mini pipeline board */}
              <div style={{ padding: '0 20px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 14px' }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>Pipeline</span>
                  <span className="mkt-dim" style={{ fontSize: 13 }}>Q3 forecast</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  {STAGES.map(st => (
                    <div key={st.name} style={{ background: 'rgba(255,255,255,.02)', border: '1px solid var(--m-line)', borderRadius: 12, padding: 12, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 999, background: st.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{st.name}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {st.deals.map(([dn, dv]) => (
                          <div key={dn} style={{ background: 'var(--m-panel)', border: '1px solid var(--m-line)', borderRadius: 9, padding: '9px 10px' }}>
                            <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dn}</div>
                            <div style={{ fontSize: 12, marginTop: 3, color: 'var(--m-teal)', fontWeight: 700 }}>{dv}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 2. MARQUEE */}
      <section className="mkt-section-sm">
        <div className="mkt-wrap mkt-center" style={{ marginBottom: 30 }}>
          <span className="mkt-eyebrow">Built to beat the incumbents</span>
        </div>
        <div className="mkt-marquee">
          <div className="mkt-marquee-track">
            {[...COMPETITORS, ...COMPETITORS].map((name, i) => (
              <span key={name + i} style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--m-ink3)', whiteSpace: 'nowrap' }}>{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* 3. ROOK */}
      <section className="mkt-section">
        <div className="mkt-wrap">
          <div className="mkt-grid mkt-grid-2" style={{ gap: 46, alignItems: 'center' }}>
            <Reveal>
              <div>
                <span className="mkt-eyebrow">The operator</span>
                <h2 className="mkt-h2" style={{ margin: '16px 0 0' }}>
                  Meet Rook. Not a chatbot. An <span className="mkt-grad">operator.</span>
                </h2>
                <p className="mkt-lead" style={{ margin: '20px 0 0' }}>
                  Give Rook an outcome in plain language and it runs the whole play. It creates
                  the accounts, opens the deals, wires up stakeholders, and schedules the work,
                  all in a single agentic run.
                </p>
                <div style={{ marginTop: 28 }}>
                  <MktButton to="/product/rook" variant="ghost"><Icon name="sparkles" size={18} /> Explore Rook</MktButton>
                </div>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="mkt-glass" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 16, borderBottom: '1px solid var(--m-line)' }}>
                  <span className="mkt-icon" style={{ width: 36, height: 36 }}><Icon name="sparkles" size={19} /></span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>Rook</div>
                    <div className="mkt-dim" style={{ fontSize: 12.5 }}>Autopilot run</div>
                  </div>
                  <span className="mkt-pill" style={{ marginLeft: 'auto', padding: '5px 12px', fontSize: 12 }}><span className="mkt-dot" />Working</span>
                </div>

                {/* user bubble */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '18px 0' }}>
                  <div style={{ maxWidth: '82%', background: 'linear-gradient(100deg, #6d5cf7, #7c5cf7)', color: '#fff', padding: '12px 15px', borderRadius: '14px 14px 4px 14px', fontSize: 14.5, lineHeight: 1.5, fontWeight: 500 }}>
                    Set up Northwind Freight as an enterprise account with a 180k deal and a first-call task Friday
                  </div>
                </div>

                {/* assistant checks */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {ROOK_LOG.map((line, i) => (
                    <Reveal key={line} delay={i * 90}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'rgba(20,224,200,.06)', border: '1px solid rgba(20,224,200,.18)', borderRadius: 11, padding: '11px 13px' }}>
                        <span style={{ color: 'var(--m-teal)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="check" size={18} /></span>
                        <span style={{ fontSize: 14.5, fontWeight: 600 }}>{line}</span>
                      </div>
                    </Reveal>
                  ))}
                </div>
                <div className="mkt-dim" style={{ fontSize: 12.5, marginTop: 16, textAlign: 'center' }}>Done in 4 seconds</div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 4. FEATURE GRID */}
      <section className="mkt-section">
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center" style={{ maxWidth: 720, margin: '0 auto 48px' }}>
              <span className="mkt-eyebrow">The whole stack</span>
              <h2 className="mkt-h2" style={{ margin: '16px 0 0' }}>Everything, in one platform.</h2>
              <p className="mkt-lead" style={{ marginTop: 18 }}>
                Nine modules that used to be nine tools. One operator across all of them.
              </p>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="mkt-grid mkt-grid-3">
              {FEATURES.map(f => (
                <div key={f.title} className="mkt-card mkt-card-glow">
                  <span className="mkt-icon"><Icon name={f.icon} size={22} /></span>
                  <h3 className="mkt-h3" style={{ margin: '18px 0 8px' }}>{f.title}</h3>
                  <p className="mkt-body" style={{ margin: 0 }}>{f.copy}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* 5. SUITE DIAGRAM */}
      <section className="mkt-section">
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center" style={{ maxWidth: 680, margin: '0 auto 52px' }}>
              <span className="mkt-eyebrow">One brain, many modules</span>
              <h2 className="mkt-h2" style={{ margin: '16px 0 0' }}>One operator across the entire suite.</h2>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div style={{ maxWidth: 760, margin: '0 auto' }}>
              {/* central hub */}
              <div className="mkt-center" style={{ marginBottom: 8 }}>
                <div className="mkt-node mkt-node-accent" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '18px 26px' }}>
                  <span className="mkt-icon" style={{ width: 40, height: 40 }}><Icon name="sparkles" size={22} /></span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>Rally HQ</div>
                    <div className="mkt-dim" style={{ fontSize: 13 }}>Rook operates here</div>
                  </div>
                </div>
              </div>
              {/* connector */}
              <div className="mkt-center" aria-hidden>
                <div style={{ width: 2, height: 34, margin: '0 auto', background: 'linear-gradient(var(--m-accent), transparent)' }} />
              </div>
              {/* spokes */}
              <div className="mkt-grid mkt-grid-4" style={{ gap: 14 }}>
                {SPOKES.map(s => (
                  <div key={s.label} className="mkt-node" style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
                    <span className="mkt-icon" style={{ width: 36, height: 36 }}><Icon name={s.icon} size={18} /></span>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>{s.label}</span>
                  </div>
                ))}
              </div>
              <p className="mkt-center mkt-muted" style={{ marginTop: 30, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
                Rook threads through every module. Close a deal and it spins up the project,
                fires the outreach, and drafts the invoice. One operator, end to end.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 6. STATS BAND */}
      <section className="mkt-section-sm">
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-grid mkt-grid-4" style={{ gap: 20 }}>
              {STATS.map(s => (
                <div key={s.label} className="mkt-center">
                  <div className="mkt-stat-value mkt-grad">{s.value}</div>
                  <div className="mkt-stat-label" style={{ marginTop: 10 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* 7. DIFFERENTIATORS */}
      <section className="mkt-section">
        <div className="mkt-wrap" style={{ display: 'flex', flexDirection: 'column', gap: 72 }}>
          {DIFFERENTIATORS.map((d, i) => (
            <Reveal key={d.eyebrow}>
              <div className="mkt-grid mkt-grid-2" style={{ gap: 46, alignItems: 'center', direction: i % 2 ? 'rtl' : 'ltr' }}>
                <div style={{ direction: 'ltr' }}>
                  <span className="mkt-eyebrow">{d.eyebrow}</span>
                  <h2 className="mkt-h2" style={{ margin: '16px 0 0', fontSize: 'clamp(1.7rem, 3.4vw, 2.6rem)' }}>{d.title}</h2>
                  <p className="mkt-lead" style={{ margin: '18px 0 0' }}>{d.copy}</p>
                </div>
                <div style={{ direction: 'ltr' }}>
                  <MiniMock kind={d.mock} />
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 8. CTA BAND */}
      <CtaBand />
    </>
  );
}
