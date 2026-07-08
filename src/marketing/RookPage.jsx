// RookPage.jsx - the Rook AI operator deep dive. Dark cinematic marketing page.
// Router wraps MarketingShell (nav + footer + aurora) around this; we only
// return the page sections in a fragment. NO em-dash / en-dash - ASCII only.
import React from 'react';
import { Link } from 'react-router-dom';
import { Reveal, MktButton, Pill, CtaBand } from './kit.jsx';
import { Icon } from '../components/icons.jsx';

/* ---- the big chat mock, styled like the product's Rook dock ---- */

function ChatUser({ children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ maxWidth: '78%', background: 'rgba(255,255,255,.05)', border: '1px solid var(--m-line2)', borderRadius: '14px 14px 4px 14px', padding: '11px 15px', fontSize: 14.5, lineHeight: 1.5 }}>
        {children}
      </div>
    </div>
  );
}

function ChatRook({ children }) {
  return (
    <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
      <span className="mkt-logo-mark" style={{ width: 30, height: 30, flexShrink: 0 }}>
        <Icon name="sparkles" size={17} fill="#fff" stroke={0} />
      </span>
      <div style={{ maxWidth: '82%', background: 'linear-gradient(180deg, rgba(109,92,247,.15), rgba(109,92,247,.05))', border: '1px solid rgba(109,92,247,.32)', borderRadius: '14px 14px 14px 4px', padding: '13px 16px', fontSize: 14.5, lineHeight: 1.58 }}>
        {children}
      </div>
    </div>
  );
}

function BigChatMock() {
  return (
    <div className="mkt-glass mkt-card-glow" style={{ maxWidth: 620, margin: '0 auto', padding: 0 }}>
      {/* dock header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '15px 18px', borderBottom: '1px solid var(--m-line)' }}>
        <span className="mkt-logo-mark" style={{ width: 28, height: 28 }}><Icon name="sparkles" size={16} fill="#fff" stroke={0} /></span>
        <span style={{ fontWeight: 700, fontSize: 15 }}>Rook</span>
        <span style={{ fontSize: 12, color: 'var(--m-ink3)' }}>revenue operator</span>
        <span className="mkt-dot" style={{ marginLeft: 'auto' }} />
      </div>
      {/* thread */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '20px 18px' }}>
        <ChatUser>How is the Northwind account trending, and what should I do next?</ChatUser>
        <ChatRook>
          Northwind has <b style={{ color: 'var(--m-teal)' }}>3 open deals</b> worth <b style={{ color: 'var(--m-teal)' }}>$284k</b>. Momentum is up: 12 touches in the last 14 days, and the CFO opened your proposal twice.
          The <b>Vertex platform</b> deal ($156k) is your best move. It is stuck at Legal, waiting on the security packet.
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {['Send security packet', 'Draft CFO follow-up', 'Build the QBR deck'].map(a => (
              <span key={a} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, padding: '7px 13px', borderRadius: 10, background: 'rgba(255,255,255,.06)', border: '1px solid var(--m-line2)' }}>
                <Icon name="zap" size={13} /> {a}
              </span>
            ))}
          </div>
        </ChatRook>
      </div>
      {/* input */}
      <div style={{ padding: '14px 18px', borderTop: '1px solid var(--m-line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,.03)', border: '1px solid var(--m-line2)', borderRadius: 12, padding: '10px 14px' }}>
          <span style={{ color: 'var(--m-ink3)', fontSize: 14 }}>Ask Rook anything about your revenue...</span>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, color: 'var(--m-ink3)' }}>
            <Icon name="mic" size={17} />
            <Icon name="send" size={17} />
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---- per-capability mini mocks ---- */

function GroundedMock() {
  return (
    <div className="mkt-glass" style={{ padding: 18 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12.5, color: 'var(--m-ink3)', marginBottom: 12 }}>
        <Icon name="search" size={15} /> Answer grounded in 4 records
      </div>
      {[
        ['deals', 'Deal: Vertex platform'],
        ['building', 'Company: Northwind Corp'],
        ['users', 'Contact: J. Reyes (CFO)'],
        ['activity', 'Activity: proposal opened 2x'],
      ].map(([ic, t]) => (
        <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', background: 'rgba(255,255,255,.02)', border: '1px solid var(--m-line)', borderRadius: 9, marginBottom: 8, fontSize: 13 }}>
          <span style={{ color: '#b7aefb' }}><Icon name={ic} size={16} /></span>
          <span style={{ fontWeight: 600 }}>{t}</span>
          <span style={{ marginLeft: 'auto', color: 'var(--m-teal)' }}><Icon name="check" size={15} stroke={2.4} /></span>
        </div>
      ))}
    </div>
  );
}

function JuggernautMock() {
  const steps = [
    'Created company Northwind Corp',
    'Added 3 contacts with roles',
    'Opened deal at $156k, stage Proposal',
    'Built a 6-step close plan',
    'Drafted the intro email',
  ];
  return (
    <div className="mkt-glass" style={{ padding: 18 }}>
      <div style={{ fontSize: 12.5, color: 'var(--m-ink3)', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
        <Icon name="bolt" size={15} /> "Stand up the Northwind account for a $156k platform deal"
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {steps.map(s => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 11, fontSize: 13.5 }}>
            <span style={{ width: 22, height: 22, borderRadius: 7, background: 'rgba(20,224,200,.14)', border: '1px solid rgba(20,224,200,.4)', color: 'var(--m-teal)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <Icon name="check" size={14} stroke={2.6} />
            </span>
            <span style={{ fontWeight: 600 }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DraftsMock() {
  return (
    <div className="mkt-glass" style={{ padding: 18 }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 700, padding: '5px 11px', borderRadius: 8, background: 'rgba(109,92,247,.16)', border: '1px solid rgba(109,92,247,.32)', color: '#cbc4fb' }}>Email</span>
        <span style={{ fontSize: 12, fontWeight: 700, padding: '5px 11px', borderRadius: 8, background: 'rgba(255,255,255,.04)', border: '1px solid var(--m-line2)', color: 'var(--m-ink2)' }}>QBR .pptx</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--m-ink3)', marginBottom: 4 }}>Subject</div>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Next steps on the Vertex platform rollout</div>
      <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--m-ink2)' }}>
        Hi Jordan, thanks for the time today. Attached is the SOC 2 packet Legal asked for. To keep us on track for a Q3 start, could we...
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 9, background: 'linear-gradient(100deg,#6d5cf7,#7c5cf7)', color: '#fff' }}>Send</span>
        <span style={{ fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 9, background: 'rgba(255,255,255,.05)', border: '1px solid var(--m-line2)' }}>Regenerate</span>
      </div>
    </div>
  );
}

function AutopilotMock() {
  const moves = [
    ['trendUp', 'Push Vertex to close', '$156k stalled at Legal 6 days'],
    ['clock', 'Re-engage Beacon', 'No touch in 11 days'],
    ['dollar', 'Send Orbit renewal', 'Expires in 3 weeks'],
  ];
  return (
    <div className="mkt-glass" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--m-ink2)' }}>3 moves to make today</span>
        <span className="mkt-pill" style={{ marginLeft: 'auto', fontSize: 11.5, padding: '3px 9px' }}>Autopilot</span>
      </div>
      {moves.map(([ic, t, why]) => (
        <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', background: 'rgba(255,255,255,.02)', border: '1px solid var(--m-line)', borderRadius: 11, marginBottom: 9 }}>
          <span className="mkt-icon" style={{ width: 34, height: 34, flexShrink: 0 }}><Icon name={ic} size={17} /></span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>{t}</div>
            <div style={{ fontSize: 11.5, color: 'var(--m-ink3)' }}>{why}</div>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: 'var(--m-teal)', flexShrink: 0 }}>Run</span>
        </div>
      ))}
    </div>
  );
}

function VoiceMock() {
  return (
    <div className="mkt-glass" style={{ padding: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ position: 'relative', width: 72, height: 72, display: 'grid', placeItems: 'center' }}>
        <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,92,247,.5), transparent 70%)', filter: 'blur(6px)' }} />
        <span className="mkt-logo-mark" style={{ width: 56, height: 56, position: 'relative' }}><Icon name="mic" size={26} fill="#fff" stroke={0} /></span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 30 }}>
        {[10, 22, 14, 28, 18, 26, 12, 20, 8].map((h, i) => (
          <span key={i} style={{ width: 4, height: h, borderRadius: 3, background: 'var(--m-teal)', opacity: 0.7 }} />
        ))}
      </div>
      <div style={{ fontSize: 13.5, color: 'var(--m-ink2)', textAlign: 'center', maxWidth: 280 }}>
        "Log a call with Jordan, 20 minutes, agreed to send the security packet." Logged.
      </div>
    </div>
  );
}

/* ---- alternating capability section ---- */
function Capability({ eyebrow, title, para, mock, flip, delay = 0 }) {
  return (
    <Reveal delay={delay}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center', margin: '80px 0' }}>
        <div style={{ order: flip ? 2 : 1 }}>
          <div className="mkt-eyebrow" style={{ marginBottom: 14 }}>{eyebrow}</div>
          <h2 className="mkt-h2" style={{ maxWidth: 440 }}>{title}</h2>
          <p className="mkt-lead" style={{ margin: '18px 0 0', maxWidth: 460 }}>{para}</p>
        </div>
        <div style={{ order: flip ? 1 : 2 }}>{mock}</div>
      </div>
    </Reveal>
  );
}

/* ---- what Rook can do grid ---- */
const CAPS = [
  ['search', 'Grounded Q&A', 'Every answer traces back to a real record. No hallucinated pipeline.'],
  ['bolt', 'Juggernaut builds', 'One sentence stands up a company, contacts, deal, and close plan.'],
  ['mail', 'Writes emails', 'Context-aware follow-ups drafted from the account history.'],
  ['fileText', 'Generates decks', 'A full QBR deck as a downloadable .pptx in seconds.'],
  ['trendUp', 'Surfaces the moves', 'The three highest-leverage plays to run today, ranked.'],
  ['zap', 'Executes plays', 'Approve and Rook runs the automation end to end.'],
  ['mic', 'Talk to log', 'Speak an update and Rook writes it to the right record.'],
  ['chart', 'Explains the numbers', 'Ask why a metric moved and get the causal story.'],
  ['users', 'Knows the account', 'Full context on every person, deal, and touch.'],
];

export default function RookPage() {
  return (
    <>
      {/* HERO */}
      <header className="mkt-hero">
        <div className="mkt-wrap">
          <Reveal>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
              <Pill>Meet Rook</Pill>
            </div>
          </Reveal>
          <Reveal delay={60}>
            <h1 className="mkt-h1" style={{ maxWidth: 900, margin: '0 auto' }}>
              Rook. Your AI revenue <span className="mkt-grad">operator.</span>
            </h1>
          </Reveal>
          <Reveal delay={120}>
            <p className="mkt-lead" style={{ maxWidth: 640, margin: '22px auto 32px' }}>
              Not a chatbot bolted onto a CRM. Rook is grounded in every record and runs the work:
              it answers with your numbers, builds accounts, drafts the outreach, and executes the plays.
            </p>
          </Reveal>
          <Reveal delay={180}>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <MktButton to="/app" size="lg">Get started <Icon name="chevronRight" size={18} /></MktButton>
              <MktButton to="/features" variant="ghost" size="lg">See the product</MktButton>
            </div>
          </Reveal>
        </div>
      </header>

      {/* BIG CHAT MOCK */}
      <section className="mkt-section" style={{ paddingTop: 12 }}>
        <div className="mkt-wrap">
          <Reveal>
            <BigChatMock />
          </Reveal>
          <Reveal delay={80}>
            <p className="mkt-dim mkt-center" style={{ fontSize: 14, marginTop: 20 }}>
              A grounded question in, real numbers and one-tap actions out.
            </p>
          </Reveal>
        </div>
      </section>

      <hr className="mkt-rule" />

      {/* CAPABILITY SECTIONS */}
      <section className="mkt-section" style={{ paddingTop: 40 }}>
        <div className="mkt-wrap">
          <Capability
            eyebrow="Grounded Q&A"
            title="It knows every record."
            para="Ask anything about your pipeline and Rook answers from live data, then shows exactly which records it used. No guessing, no made-up numbers."
            mock={<GroundedMock />}
          />
          <Capability
            flip
            eyebrow="Juggernaut"
            title="One sentence, a whole account."
            para="Describe the deal in plain language and Rook stands up the company, the contacts with roles, the deal, and a close plan. Watch it build, step by step."
            mock={<JuggernautMock />}
          />
          <Capability
            eyebrow="Drafts and decks"
            title="It writes the outreach."
            para="Rook drafts emails from the account history and generates a full QBR deck as a downloadable .pptx. Review, tweak, and send in one flow."
            mock={<DraftsMock />}
          />
          <Capability
            flip
            eyebrow="Rook Autopilot"
            title="Proactive, not passive."
            para="Rook surfaces the three highest-leverage moves to make today, ranked by impact. Approve one and it executes the play end to end."
            mock={<AutopilotMock />}
          />
          <Capability
            eyebrow="Voice"
            title="Talk to log."
            para="Speak an update between meetings and Rook writes it to the right contact, deal, or activity. Your notes get captured without touching the keyboard."
            mock={<VoiceMock />}
          />
        </div>
      </section>

      <hr className="mkt-rule" />

      {/* CAPABILITY GRID */}
      <section className="mkt-section">
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center" style={{ marginBottom: 44 }}>
              <div className="mkt-eyebrow" style={{ marginBottom: 14 }}>What Rook can do</div>
              <h2 className="mkt-h2" style={{ maxWidth: 700, margin: '0 auto' }}>
                One operator across your <span className="mkt-grad">entire revenue stack.</span>
              </h2>
            </div>
          </Reveal>
          <div className="mkt-grid mkt-grid-3">
            {CAPS.map(([ic, title, body], i) => (
              <Reveal key={title} delay={(i % 3) * 70}>
                <div className="mkt-card mkt-card-glow" style={{ height: '100%' }}>
                  <div className="mkt-icon" style={{ marginBottom: 16 }}><Icon name={ic} size={22} /></div>
                  <h3 className="mkt-h3" style={{ fontSize: '1.2rem' }}>{title}</h3>
                  <p className="mkt-body" style={{ marginTop: 8, marginBottom: 0 }}>{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CtaBand title="Let Rook run your revenue." />
    </>
  );
}
