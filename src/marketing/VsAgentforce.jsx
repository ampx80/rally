// VsAgentforce - the "Ardovo vs Salesforce Agentforce" positioning page.
// Thesis: Salesforce is layering Agentforce 360 / Headless 360 / Data 360 onto
// a 25-year-old CRM core; Ardovo is agent-native from the first commit. Same
// headline capabilities, none of the legacy tax. Claims kept tasteful and
// defensible (Salesforce's own framing: "every capability built over 25 years").
// Composes from the shared marketing kit. NO em-dash / en-dash. ASCII only.
import React from 'react';
import { Reveal, MktButton, CtaBand } from './kit.jsx';
import { Icon } from '../components/icons.jsx';

/* ------------------------------------------------------------------ */
/* Data                                                                 */
/* ------------------------------------------------------------------ */
const FOUNDATION = [
  {
    icon: 'layers',
    kicker: 'The Salesforce stack',
    title: 'Four systems bolted together',
    body: 'Agentforce 360 stitches agents (System of Agency) onto Customer 360 (25 years of business logic), Data 360 (a separate context layer you license on top), and Slack (engagement). Powerful, but every layer is a product you buy, wire, and pay for on its own.',
  },
  {
    icon: 'history',
    kicker: 'The backward-compat tax',
    title: 'A 25-year core to keep alive',
    body: 'Headless 360 exposes "every capability Salesforce has built over 25 years" as an API or MCP tool. That reach is real. So is the debt behind it: the agent still routes through Flows, sharing rules, and metadata designed for a browser-first era.',
  },
  {
    icon: 'zap',
    kicker: 'The Ardovo core',
    title: 'Agent-native from commit one',
    body: 'Ardovo has no legacy layer to retrofit. The data model, the write path, and the API were designed for agents to read and act on directly. There is no Data 360 to bolt on, because context is the product, not an upsell.',
  },
];

// Comparison rows. sf = Agentforce 360 today; rally = Ardovo equivalent.
const ROWS = [
  {
    cap: 'Counter-agent commerce',
    sf: 'A2A connects Salesforce agents to other vendor agents; an AP2 partner, but the buyer is still assumed to be human',
    rally: 'Handshake - your Deal Agent negotiates directly with the BUYER agent over A2A and settles a signed AP2 mandate chain you countersign',
  },
  {
    cap: 'Autonomous multi-agent',
    sf: 'Agentforce agents and Agent Builder, orchestrated across channels',
    rally: 'Agent Cloud plus the Boardroom - autonomous agents native to the record that debate your book, no orchestration bus to license',
  },
  {
    cap: 'Guided determinism and reliability',
    sf: 'Flows, topics, and guardrails layered on the classic automation engine',
    rally: 'Diff of Record - every agent write is a reversible, reviewable diff under explicit mandates',
  },
  {
    cap: 'Headless and MCP access',
    sf: 'Headless 360: 60+ MCP tools, 30+ coding skills, experience layer (2026)',
    rally: '/api/mcp and /api/agent headless from day one - the app is an API, not an afterthought',
  },
  {
    cap: 'Data and context layer',
    sf: 'Data 360 licensed separately, priced by profiles and credits',
    rally: 'Context layer built in - unified data is the core, not a paid add-on',
  },
  {
    cap: 'Observability and testing',
    sf: 'Agentforce Testing Center plus production monitoring add-ons',
    rally: 'Testing Center plus full run traces on every agent action, included',
  },
  {
    cap: 'Multi-model and BYO LLM',
    sf: 'Einstein models with some model choice through the platform',
    rally: 'Per-agent model routing - pick or bring the LLM per task, no lock-in',
  },
  {
    cap: 'Human-in-the-loop governance',
    sf: 'Permissions, sharing rules, and SLA workflows inherited from core',
    rally: 'Autonomy levels - dial each agent from suggest to auto, with mandates and approvals',
  },
  {
    cap: 'Time to value',
    sf: 'Faster than before, but still an implementation and admin motion',
    rally: 'Days, not months - live workspace on first load, Rook does the setup',
  },
  {
    cap: 'Pricing and TCO',
    sf: 'Consumption: per-conversation plus Flex Credits, on top of a Data 360 baseline',
    rally: 'Flat and predictable - no consumption meter, no Data 360 baseline to fund',
  },
  {
    cap: 'Fit for modern teams',
    sf: 'Built for the largest enterprises and their admin teams',
    rally: 'Built for founders, SMB, and high-velocity revenue teams',
  },
];

const CRUSH = [
  {
    icon: 'rocket',
    title: 'Speed',
    body: 'Days, not months. Your workspace loads live on first sign-in and Rook does the wiring. No sandbox, no admin certification, no six-figure implementation partner before you see value.',
  },
  {
    icon: 'dollar',
    title: 'Cost and TCO',
    body: 'One flat price. No per-conversation meter, no Flex Credits to true-up, and no separate Data 360 baseline. You can forecast your Ardovo bill without a procurement spreadsheet.',
  },
  {
    icon: 'plug',
    title: 'Openness',
    body: 'MCP-native and headless from the first commit. Point Cursor, Claude, or any agent at /api/mcp. Your data and workflows are yours - no proprietary layer holding them hostage.',
  },
  {
    icon: 'sparkles',
    title: 'Simplicity',
    body: 'Agents people actually use. One product, not four systems to integrate. Ask Rook in plain language and watch it act, with every write reversible and traceable.',
  },
];

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */
export default function VsAgentforce() {
  return (
    <>
      {/* 1. Hero */}
      <section className="mkt-hero">
        <div className="mkt-hero-mesh" aria-hidden />
        <div className="mkt-wrap" style={{ position: 'relative', zIndex: 2 }}>
          <Reveal>
            <span className="mkt-pill"><span className="mkt-dot" /> Ardovo vs Salesforce Agentforce</span>
            <h1 className="mkt-h1" style={{ margin: '22px auto 0', maxWidth: 900 }}>
              Agent-native, <span className="mkt-grad m-shine">not agent-retrofitted.</span>
            </h1>
            <p className="mkt-lead" style={{ margin: '22px auto 0', maxWidth: 660 }}>
              Salesforce is layering Agentforce 360, Headless 360, and Data 360 onto a 25-year-old CRM core.
              Ardovo was built agent-first from the first commit. Same headline capabilities, none of the legacy tax.
              Faster, cheaper, simpler, open.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 30 }}>
              <MktButton to="/get-started" size="lg">Get started free <Icon name="chevronRight" size={18} /></MktButton>
              <MktButton to="/demo" variant="ghost" size="lg">See the live demo</MktButton>
            </div>
            <div className="mkt-dim" style={{ fontSize: 13, marginTop: 14 }}>
              Claims reflect Salesforce's own April 2026 Headless 360 and Data 360 framing.
            </div>
          </Reveal>
        </div>
      </section>

      {/* 2. The foundation argument */}
      <section className="mkt-section" style={{ paddingTop: 40 }}>
        <div className="mkt-wrap">
          <Reveal>
            <div style={{ textAlign: 'center', maxWidth: 760, margin: '0 auto 44px' }}>
              <span className="mkt-eyebrow">The foundation</span>
              <h2 className="mkt-h2" style={{ margin: '14px 0 0' }}>It is not about features. It is about the floor.</h2>
              <p className="mkt-lead" style={{ margin: '16px auto 0', maxWidth: 620 }}>
                Salesforce is doing impressive work exposing its platform to agents. But you inherit the whole
                stack underneath it. Ardovo starts from a floor that was poured for agents.
              </p>
            </div>
          </Reveal>
          <div className="mkt-grid mkt-grid-3">
            {FOUNDATION.map((f, i) => (
              <Reveal key={f.title} delay={i * 90}>
                <div className={`mkt-card${i === 2 ? ' mkt-card-glow' : ''}`} style={{ height: '100%' }}>
                  <div className="mkt-icon"><Icon name={f.icon} size={22} /></div>
                  <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: i === 2 ? 'var(--m-accent)' : 'var(--m-ink3)', marginTop: 18 }}>{f.kicker}</div>
                  <h3 className="mkt-h3" style={{ margin: '8px 0 10px', fontSize: '1.34rem' }}>{f.title}</h3>
                  <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.6, color: 'var(--m-ink2)' }}>{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Parity + advantage comparison table */}
      <section className="mkt-section" style={{ paddingTop: 0 }}>
        <div className="mkt-wrap">
          <Reveal>
            <div style={{ textAlign: 'center', maxWidth: 760, margin: '0 auto 40px' }}>
              <span className="mkt-eyebrow">Capability for capability</span>
              <h2 className="mkt-h2" style={{ margin: '14px 0 0' }}>Match the ambition. Skip the tax.</h2>
              <p className="mkt-lead" style={{ margin: '16px auto 0', maxWidth: 600 }}>
                Every headline Agentforce 360 capability has a Ardovo equivalent that ships native, not bolted on.
              </p>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="mkt-glass" style={{ overflowX: 'auto' }}>
              <table className="mkt-table" style={{ minWidth: 720 }}>
                <thead>
                  <tr>
                    <th style={{ width: '26%' }}>Capability</th>
                    <th style={{ width: '37%' }}>Salesforce Agentforce 360</th>
                    <th style={{ width: '37%', color: 'var(--m-accent)', background: 'rgba(14,159,143,.06)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                        <span className="mkt-dot" /> Ardovo
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((r, i) => (
                    <tr key={r.cap}>
                      <td style={{ fontWeight: 700, color: 'var(--m-ink)' }}>{r.cap}</td>
                      <td style={{ color: 'var(--m-ink2)', fontSize: 14.5, lineHeight: 1.5 }}>{r.sf}</td>
                      <td style={{
                        background: 'rgba(14,159,143,.05)',
                        borderLeft: '1px solid rgba(14,159,143,.18)',
                        borderRight: '1px solid rgba(14,159,143,.18)',
                        borderBottom: i === ROWS.length - 1 ? '1px solid rgba(14,159,143,.18)' : undefined,
                        fontSize: 14.5, lineHeight: 1.5, color: 'var(--m-ink)', fontWeight: 600,
                      }}>
                        <span style={{ display: 'inline-flex', gap: 8, alignItems: 'flex-start' }}>
                          <Icon name="check" size={15} stroke={3} style={{ color: 'var(--m-accent)', flex: 'none', marginTop: 3 }} />
                          <span>{r.rally}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
          <Reveal>
            <p className="mkt-dim" style={{ fontSize: 12.5, textAlign: 'center', marginTop: 16, maxWidth: 720, marginLeft: 'auto', marginRight: 'auto' }}>
              Agentforce 360 column summarizes Salesforce's published Headless 360, Data 360, and Agentforce
              positioning as of 2026. Comparisons are made in good faith and kept current.
            </p>
          </Reveal>
        </div>
      </section>

      {/* 4. Where Ardovo crushes */}
      <section className="mkt-section" style={{ paddingTop: 0 }}>
        <div className="mkt-wrap">
          <Reveal>
            <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 44px' }}>
              <span className="mkt-eyebrow">Where Ardovo crushes</span>
              <h2 className="mkt-h2" style={{ margin: '14px 0 0' }}>Four places the legacy tax shows up.</h2>
            </div>
          </Reveal>
          <div className="mkt-grid mkt-grid-4">
            {CRUSH.map((c, i) => (
              <Reveal key={c.title} delay={i * 80}>
                <div className="mkt-card" style={{ height: '100%' }}>
                  <div className="mkt-icon"><Icon name={c.icon} size={22} /></div>
                  <h3 className="mkt-h3" style={{ margin: '18px 0 10px', fontSize: '1.3rem' }}>{c.title}</h3>
                  <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: 'var(--m-ink2)' }}>{c.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Match + 1000x statement */}
      <section className="mkt-section" style={{ paddingTop: 0 }}>
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-hline-panel" style={{ padding: 'clamp(40px, 6vw, 72px) clamp(24px, 5vw, 64px)', textAlign: 'center' }}>
              <span className="mkt-pill" style={{ marginBottom: 22 }}><span className="mkt-dot" /> The bar we hold ourselves to</span>
              <h2 className="mkt-h2" style={{ margin: '0 auto', maxWidth: 820 }}>
                Match Agentforce capability for capability. Then be <span className="mkt-grad">1000x</span> easier to run.
              </h2>
              <p className="mkt-lead" style={{ margin: '20px auto 0', maxWidth: 640 }}>
                Anything Agentforce 360 can do, Ardovo does too. The difference is what it costs you to get there:
                no 25-year core to maintain, no Data 360 baseline, no consumption meter, no admin army. Just
                agents that read your data, act with your mandate, and leave a reversible trail.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 6. Close */}
      <CtaBand
        title="Run your revenue on the new foundation."
        sub="The agentic platform without the legacy tax. Start free and let Rook do the work on day one."
      />
    </>
  );
}
