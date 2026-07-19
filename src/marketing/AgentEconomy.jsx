// ARDOVO - The Agent Economy. Flagship positioning page.
// Returns a fragment of <section> blocks; the router wraps this in
// MarketingShell (nav + footer + aurora). Everything custom is scoped
// under the .ae root class in agent-economy.css.
// Violet = AI / agent. Teal = product truth.
// NO em-dash / en-dash. ASCII hyphen only.
import React from 'react';
import { Link } from 'react-router-dom';
import { Reveal, MktButton, CtaBand } from './kit.jsx';
import './agent-economy.css';

/* ------------------------------------------------------------------ */
/* Inline icons (no external imports - siblings may change)            */
/* ------------------------------------------------------------------ */

function Ico({ d, size = 20, stroke = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {d}
    </svg>
  );
}
const IcoArrow = (p) => <Ico {...p} d={<><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></>} />;
const IcoCheck = (p) => <Ico {...p} d={<path d="M20 6 9 17l-5-5" />} />;
const IcoBolt = (p) => <Ico {...p} d={<path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />} />;
const IcoSearch = (p) => <Ico {...p} d={<><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>} />;
const IcoShield = (p) => <Ico {...p} d={<><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" /><path d="M9 12l2 2 4-4" /></>} />;
const IcoLink = (p) => <Ico {...p} d={<><path d="M9 15l6-6" /><path d="M11 6l1-1a4 4 0 0 1 6 6l-1 1" /><path d="M13 18l-1 1a4 4 0 0 1-6-6l1-1" /></>} />;
const IcoScale = (p) => <Ico {...p} d={<><path d="M12 3v18" /><path d="M6 7h12" /><path d="M6 7l-3 6a3 3 0 0 0 6 0L6 7Z" /><path d="M18 7l-3 6a3 3 0 0 0 6 0l-3-6Z" /><path d="M8 21h8" /></>} />;

/* ------------------------------------------------------------------ */
/* Data                                                                 */
/* ------------------------------------------------------------------ */

const SHIFT = [
  {
    n: '01',
    title: 'Buyers show up with their own agents',
    copy: 'Procurement and research agents now do the first pass: sourcing vendors, pulling specs, pressure-testing pricing. The human arrives after the machine has already done the shopping.',
  },
  {
    n: '02',
    title: 'Those agents speak open protocols',
    copy: 'They negotiate over A2A and settle with AP2 signed payment mandates. This is not a chatbot on a website. It is machine-to-machine commerce with cryptographic intent.',
  },
  {
    n: '03',
    title: 'A record cannot transact. A platform can.',
    copy: 'A 25-year-old system of record can only log what a human typed. When the other side is an agent, you need software that can answer, negotiate, and commit on its own.',
  },
];

const PILLARS = [
  {
    tag: 'Handshake',
    title: 'Agent-to-Agent Deal Room',
    copy: 'Your Ardovo Deal Agent negotiates directly with the buyer\'s Buying Agent over A2A and AP2, bounded by your governance mandate. Every round settles into a signed Intent to Cart to Payment mandate chain that a human countersigns before anything commits.',
    to: '/handshake',
    cta: 'Enter the deal room',
    icon: <IcoLink size={22} />,
  },
  {
    tag: 'The Boardroom',
    title: 'Autonomous Revenue Council',
    copy: 'Your agent C-suite debates your real pipeline every night, reaches consensus, and files a decision memo by morning. You approve it or override it. The strategy meeting runs itself while the org sleeps.',
    to: '/boardroom',
    cta: 'Sit in the boardroom',
    icon: <IcoScale size={22} />,
  },
  {
    tag: 'Agent Cloud',
    title: 'Your AI workforce',
    copy: 'A governed fleet of specialized agents runs the book with full run traces, token and cost accounting, and human-in-the-loop control at every step. An operating system for a workforce that never clocks out.',
    to: '/agent-cloud',
    cta: 'Tour the Agent Cloud',
    icon: <IcoBolt size={22} />,
  },
];

const VS_THEM = [
  'Orchestrates its own internal agents inside its walls',
  'Layered on a 25-year-old system-of-record core',
  'An AP2 partner, but the counterparty is still assumed human',
  'Agents assist the seller. The buyer still fills out forms.',
];

const VS_US = [
  'Negotiates with the BUYER\'S agents, not just your own',
  'Agent-native from the first commit, no legacy core to route around',
  'A2A plus AP2 mandate chains are the transaction, not a bolt-on',
  'Counter-agent commerce: machine meets machine, human countersigns',
];

const STANDARDS = [
  { code: 'A2A', name: 'Agent2Agent', desc: 'The open protocol agents use to discover each other and talk. Ardovo agents speak it natively.' },
  { code: 'AP2', name: 'Agent Payments Protocol', desc: 'W3C Verifiable Credentials carry Intent, Cart, and Payment mandates. Signed, auditable, and revocable.' },
  { code: 'MCP', name: 'Model Context Protocol', desc: 'Grounds every agent in your live workspace and tools, so decisions cite real data, not guesses.' },
];

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export default function AgentEconomy() {
  return (
    <div className="ae">
      {/* S1. HERO */}
      <section className="ae-hero mkt-section" style={{ paddingBottom: 72 }}>
        <div className="ae-hero-orbs" aria-hidden>
          <span className="ae-orb o1" />
          <span className="ae-orb o2" />
          <span className="ae-orb o3" />
        </div>
        <div className="mkt-wrap">
          <div className="ae-hero-grid">
            {/* LEFT - copy */}
            <Reveal className="ae-hero-copy">
              <span className="ae-kicker-pill"><span className="ae-live" /> The CRM built for the Agent Economy</span>
              <h1 className="mkt-h1" style={{ marginTop: 20 }}>
                The buyer brought <span className="ae-grad-dual">their own AI.</span>
              </h1>
              <p className="mkt-lead" style={{ marginTop: 22, maxWidth: 560 }}>
                Your next deal will not start with a form. It will start with the buyer's agent
                pinging yours. Ardovo is the first agent-native CRM built for counter-agent commerce,
                where your agents research, negotiate, and settle directly with the buyer's agents,
                and a human countersigns before anything commits.
              </p>
              <div className="ae-hero-cta">
                <MktButton to="/get-started" size="lg">Start free <IcoArrow size={18} /></MktButton>
                <MktButton to="/handshake" variant="ghost" size="lg">See the deal room</MktButton>
              </div>
              <div className="ae-hero-note">
                <span><span className="ae-tick"><IcoCheck size={12} stroke={3} /></span> Bounded by your governance mandate</span>
                <span><span className="ae-tick"><IcoCheck size={12} stroke={3} /></span> Human countersignature to commit</span>
              </div>
            </Reveal>

            {/* RIGHT - agent-to-agent deal room visual */}
            <Reveal delay={140}>
              <div className="ae-stage">
                <div className="ae-stage-head">
                  <span className="ae-live" /> Live deal room
                  <span className="ae-tag">A2A + AP2</span>
                </div>

                <div className="ae-agents">
                  <div className="ae-agent mine">
                    <span className="ae-agent-badge"><IcoBolt size={20} /></span>
                    <div className="ae-agent-role">Your side</div>
                    <div className="ae-agent-name">Ardovo Deal Agent</div>
                    <div className="ae-agent-sub">Negotiating within your price floor and terms mandate.</div>
                  </div>

                  <div className="ae-link" aria-hidden>
                    <span className="ae-link-line" />
                    <span className="ae-link-pulse" />
                    <span className="ae-link-badge"><IcoLink size={15} /></span>
                  </div>

                  <div className="ae-agent theirs">
                    <span className="ae-agent-badge"><IcoSearch size={20} /></span>
                    <div className="ae-agent-role">Buyer side</div>
                    <div className="ae-agent-name">Buying Agent</div>
                    <div className="ae-agent-sub">Sourcing, comparing, and pressure-testing your quote.</div>
                  </div>
                </div>

                <div className="ae-chain" aria-hidden>
                  <span className="ae-chain-step on">Intent</span>
                  <span className="ae-chain-arrow">&gt;</span>
                  <span className="ae-chain-step on">Cart</span>
                  <span className="ae-chain-arrow">&gt;</span>
                  <span className="ae-chain-step">Payment</span>
                </div>

                <div className="ae-stage-foot">
                  <span className="ae-ck"><IcoCheck size={12} stroke={3} /></span>
                  Mandate chain signed. Awaiting human countersignature.
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* S2. THE SHIFT */}
      <section className="mkt-section" style={{ paddingTop: 40 }}>
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center" style={{ maxWidth: 760, margin: '0 auto 48px' }}>
              <span className="mkt-eyebrow mkt-eyebrow-violet">The inflection</span>
              <h2 className="mkt-h2" style={{ margin: '16px 0 0' }}>The shift no CRM saw coming</h2>
              <p className="mkt-lead" style={{ marginTop: 18 }}>
                The buyer's side of the table is being automated. The tools built to record human
                selling were never designed to face a machine.
              </p>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="mkt-grid mkt-grid-3 m-cascade">
              {SHIFT.map((s) => (
                <div key={s.n} className="mkt-card ae-shift-card">
                  <span className="ae-num">{s.n}</span>
                  <h3 className="mkt-h3">{s.title}</h3>
                  <p className="mkt-body" style={{ margin: 0, fontSize: 15.5 }}>{s.copy}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* S3. THREE PILLARS */}
      <section className="mkt-section" style={{ paddingTop: 40 }}>
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center" style={{ maxWidth: 720, margin: '0 auto 48px' }}>
              <span className="mkt-eyebrow mkt-eyebrow-violet">The platform</span>
              <h2 className="mkt-h2" style={{ margin: '16px 0 0' }}>
                Three surfaces for the <span className="mkt-grad-violet">agent economy</span>
              </h2>
              <p className="mkt-lead" style={{ marginTop: 18 }}>
                Not features bolted onto a record. A platform where agents transact, decide, and run
                the book, with a human at every commit.
              </p>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="mkt-grid mkt-grid-3 m-cascade">
              {PILLARS.map((p) => (
                <div key={p.tag} className="mkt-card ae-pillar">
                  <span className="mkt-icon mkt-icon-violet" style={{ marginBottom: 16 }}>{p.icon}</span>
                  <span className="ae-pillar-tag">{p.tag}</span>
                  <h3 className="mkt-h3">{p.title}</h3>
                  <p className="mkt-body" style={{ margin: 0, fontSize: 15 }}>{p.copy}</p>
                  <Link to={p.to} className="ae-pillar-link">{p.cta} <IcoArrow size={16} /></Link>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* S4. ARDOVO vs AGENT NETWORK */}
      <section className="mkt-section" style={{ paddingTop: 40 }}>
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center" style={{ maxWidth: 760, margin: '0 auto 48px' }}>
              <span className="mkt-eyebrow">The difference</span>
              <h2 className="mkt-h2" style={{ margin: '16px 0 0' }}>Ardovo vs the Agent Network</h2>
              <p className="mkt-lead" style={{ marginTop: 18 }}>
                Every incumbent, from Salesforce Agentforce 360 to the Summer '26 Agent Network,
                orchestrates the vendor's own agents. Ardovo transacts with the buyer's.
              </p>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="ae-vs">
              <div className="ae-vs-col them">
                <div className="ae-vs-name">Agent Network</div>
                <div className="ae-vs-sub">Orchestrates its own agents</div>
                <ul className="ae-vs-list">
                  {VS_THEM.map((t) => (
                    <li key={t}>
                      <span className="ae-vs-mark"><IcoCheck size={12} stroke={2.5} /></span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="ae-vs-col us">
                <div className="ae-vs-name">Ardovo</div>
                <div className="ae-vs-sub">Negotiates with the buyer's agents</div>
                <ul className="ae-vs-list">
                  {VS_US.map((t) => (
                    <li key={t}>
                      <span className="ae-vs-mark"><IcoCheck size={12} stroke={3} /></span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
          <Reveal delay={140}>
            <div className="mkt-center" style={{ marginTop: 36 }}>
              <MktButton to="/vs-agentforce" size="lg">See the full comparison <IcoArrow size={18} /></MktButton>
            </div>
          </Reveal>
        </div>
      </section>

      {/* S5. BUILT ON OPEN STANDARDS */}
      <section className="mkt-section" style={{ paddingTop: 40 }}>
        <div className="mkt-wrap">
          <Reveal>
            <div className="ae-std">
              <div className="ae-std-inner">
                <span className="mkt-eyebrow" style={{ color: '#c4b5fd' }}>Built on open standards</span>
                <h2 className="mkt-h2" style={{ margin: '14px 0 0', maxWidth: 720 }}>
                  Open protocols. Signed mandates. A human on the commit.
                </h2>
                <p className="ae-std-lead" style={{ marginTop: 16, maxWidth: 660 }}>
                  Ardovo does not invent a walled garden. It speaks the standards the agent economy
                  is already converging on, so your agents can meet any counterparty on neutral ground.
                </p>
                <div className="ae-std-chips">
                  {STANDARDS.map((s) => (
                    <div key={s.code} className="ae-chip">
                      <span className="ae-chip-code"><span className="ae-dot" />{s.code}</span>
                      <div style={{ color: 'rgba(255,255,255,.9)', fontWeight: 700, fontSize: 13.5, marginTop: 4 }}>{s.name}</div>
                      <div className="ae-chip-desc">{s.desc}</div>
                    </div>
                  ))}
                </div>
                <div className="ae-std-foot">
                  <span className="ae-shield"><IcoShield size={18} /></span>
                  Every agent action is governed, bounded by a mandate, and requires a human
                  countersignature before it commits. Autonomy with a hand on the brake.
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* S6. CLOSING CTA */}
      <CtaBand
        title="Give your revenue org an agent"
        sub="The buyer already has one. Stand up your Ardovo Deal Agent, bound by your rules, and be ready when their agent calls."
      />
    </div>
  );
}
