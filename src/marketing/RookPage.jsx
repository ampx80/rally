// RookPage.jsx - the Rook AI operator deep dive. Light premium marketing page.
// Every section carries a relevant, self-contained animated demo (built under
// ./viz): a live conversation, a grounded-records scan, a one-sentence account
// build, a self-writing draft, a morning autopilot brief, a voice log, and an
// operator orbit. Router wraps this in MarketingShell; we return a fragment.
// NO em-dash / en-dash. ASCII hyphen only.
import React from 'react';
import { Link } from 'react-router-dom';
import { Reveal, MktButton, Pill, CtaBand } from './kit.jsx';
import { Icon } from '../components/icons.jsx';
import RookConversation from './viz/RookConversation.jsx';
import GroundedAnswer from './viz/GroundedAnswer.jsx';
import JuggernautBuild from './viz/JuggernautBuild.jsx';
import DraftCompose from './viz/DraftCompose.jsx';
import AutopilotMoves from './viz/AutopilotMoves.jsx';
import VoiceLog from './viz/VoiceLog.jsx';
import OperatorOrbit from './viz/OperatorOrbit.jsx';

/* ---- alternating capability section: copy + animated demo ---- */
function Capability({ eyebrow, title, para, bullets, mock, flip, delay = 0 }) {
  return (
    <Reveal delay={delay}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center', margin: '88px 0' }}>
        <div style={{ order: flip ? 2 : 1 }}>
          <div className="mkt-eyebrow mkt-eyebrow-violet" style={{ marginBottom: 14, fontSize: 14 }}>{eyebrow}</div>
          <h2 className="mkt-h2" style={{ maxWidth: 460 }}>{title}</h2>
          <p className="mkt-lead" style={{ margin: '18px 0 0', maxWidth: 470 }}>{para}</p>
          {bullets && (
            <ul style={{ listStyle: 'none', margin: '20px 0 0', padding: 0, maxWidth: 470 }}>
              {bullets.map((b, i) => (
                <li key={i} style={{ display: 'flex', gap: 11, alignItems: 'flex-start', padding: '7px 0' }}>
                  <span style={{ marginTop: 3, color: 'var(--m-accent2)', flexShrink: 0 }}><Icon name="check" size={19} stroke={2.6} /></span>
                  <span style={{ fontSize: '1.06rem', lineHeight: 1.5, color: 'var(--m-ink2)', fontWeight: 500 }}>{b}</span>
                </li>
              ))}
            </ul>
          )}
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
      {/* HERO - dark cinematic for the operator story */}
      <header className="mkt-hero" style={{ overflow: 'hidden', background: 'radial-gradient(90% 80% at 50% -10%, #2a1f6e 0%, #0b1214 55%, #0b1214 100%)', color: '#fff', paddingBottom: 72 }}>
        <div className="mkt-wrap" style={{ position: 'relative', zIndex: 2 }}>
          <Reveal>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
              <Pill><span className="mkt-tag">Operator</span> Rook Autopilot is live</Pill>
            </div>
          </Reveal>
          <Reveal delay={60}>
            <h1 className="mkt-h1" style={{ maxWidth: 900, margin: '0 auto', color: '#fff' }}>
              Rook. Your AI revenue <span className="mkt-grad-violet m-shine">operator.</span>
            </h1>
          </Reveal>
          <Reveal delay={120}>
            <p className="mkt-lead" style={{ maxWidth: 660, margin: '24px auto 34px', fontSize: 'clamp(1.18rem, 2vw, 1.45rem)', color: 'rgba(255,255,255,.78)' }}>
              Not a chatbot bolted onto a CRM. Rook is grounded in every record and runs the work:
              it answers with your numbers, builds accounts, drafts the outreach, and executes the plays.
            </p>
          </Reveal>
          <Reveal delay={180}>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <span className="m-magnet" style={{ display: 'inline-flex' }}>
                <MktButton to="/app" size="lg">Get started <Icon name="chevronRight" size={18} /></MktButton>
              </span>
              <MktButton to="/features" variant="ghost" size="lg">See the product</MktButton>
            </div>
          </Reveal>
        </div>
      </header>

      {/* LIVE CONVERSATION CENTERPIECE */}
      <section className="mkt-section" style={{ paddingTop: 12 }}>
        <div className="mkt-wrap">
          <Reveal>
            <RookConversation />
          </Reveal>
          <Reveal delay={80}>
            <p className="mkt-dim mkt-center" style={{ fontSize: 15, marginTop: 22 }}>
              A grounded question in, real numbers and one-tap actions out.
            </p>
          </Reveal>
        </div>
      </section>

      <hr className="mkt-rule-violet" />

      {/* CAPABILITY SECTIONS */}
      <section className="mkt-section" style={{ paddingTop: 40 }}>
        <div className="mkt-wrap">
          <Capability
            eyebrow="Grounded Q&A"
            title="It knows every record."
            para="Ask anything about your pipeline and Rook answers from live data, then shows exactly which records it used. No guessing, no made-up numbers."
            bullets={['Answers cite the deals, contacts, and activities behind them', 'Every figure is traceable to a source record', 'Nothing invented, nothing stale']}
            mock={<GroundedAnswer />}
          />
          <Capability
            flip
            eyebrow="Juggernaut"
            title="One sentence, a whole account."
            para="Describe the deal in plain language and Rook stands up the company, the contacts with roles, the deal, and a close plan. Watch it build, step by step."
            bullets={['Company enriched from the domain', 'Buying committee with roles and influence', 'Deal, close plan, and intro email drafted']}
            mock={<JuggernautBuild />}
          />
          <Capability
            eyebrow="Drafts and decks"
            title="It writes the outreach."
            para="Rook drafts emails from the account history and generates a full QBR deck as a downloadable .pptx. Review, tweak, and send in one flow."
            bullets={['Follow-ups written in your voice', 'QBR decks assembled from real pipeline', 'Review and send without leaving the thread']}
            mock={<DraftCompose />}
          />
          <Capability
            flip
            eyebrow="Rook Autopilot"
            title="Proactive, not passive."
            para="Rook surfaces the three highest-leverage moves to make today, ranked by impact. Approve one and it executes the play end to end."
            bullets={['The top three plays, ranked by impact', 'Each with the reason it matters', 'Approve once and Rook runs it']}
            mock={<AutopilotMoves />}
          />
          <Capability
            eyebrow="Voice"
            title="Talk to log."
            para="Speak an update between meetings and Rook writes it to the right contact, deal, or activity. Your notes get captured without touching the keyboard."
            bullets={['Speak naturally, no commands to memorize', 'Rook routes it to the right record', 'Logged as a call, note, or task automatically']}
            mock={<VoiceLog />}
          />
        </div>
      </section>

      <hr className="mkt-rule-violet" />

      {/* OPERATOR ORBIT + CAPABILITY GRID */}
      <section className="mkt-section">
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-center" style={{ maxWidth: 720, margin: '0 auto 40px' }}>
              <div className="mkt-eyebrow mkt-eyebrow-violet" style={{ marginBottom: 14 }}>What Rook can do</div>
              <h2 className="mkt-h2" style={{ maxWidth: 700, margin: '0 auto' }}>
                One operator across your <span className="mkt-grad-violet">entire revenue stack.</span>
              </h2>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div style={{ maxWidth: 860, margin: '0 auto 48px' }}>
              <OperatorOrbit />
            </div>
          </Reveal>
          <Reveal delay={140}>
            <div className="mkt-hline-panel">
              <div className="mkt-hline-grid">
                {CAPS.map(([ic, title, body]) => (
                  <div key={title} className="mkt-hline-item">
                    <div className="mkt-icon mkt-icon-violet" style={{ marginBottom: 16 }}><Icon name={ic} size={22} /></div>
                    <h3 className="mkt-h3" style={{ fontSize: '1.25rem' }}>{title}</h3>
                    <p className="mkt-body" style={{ marginTop: 8, marginBottom: 0, fontSize: '1.02rem' }}>{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <CtaBand title="Let Rook run your revenue." />
    </>
  );
}
