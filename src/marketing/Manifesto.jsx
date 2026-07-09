// Manifesto.jsx - a bold editorial "why Rally" page. Big confident type, generous
// whitespace, pull-quotes. Scoped under .mkt (router wraps in MarketingShell).
import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/icons.jsx';
import { Reveal, Pill, CtaBand } from './kit.jsx';

function Section({ eyebrow, title, children, delay = 0 }) {
  return (
    <section className="mkt-section" style={{ paddingTop: 72, paddingBottom: 72 }}>
      <div className="mkt-wrap">
        <Reveal delay={delay}>
          <div style={{ maxWidth: 820 }}>
            {eyebrow && <p className="mkt-eyebrow" style={{ marginBottom: 16 }}>{eyebrow}</p>}
            <h2 className="mkt-h2">{title}</h2>
            <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
              {children}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function PullQuote({ children }) {
  return (
    <section style={{ padding: '40px 0' }}>
      <div className="mkt-wrap">
        <Reveal>
          <div style={{ maxWidth: 940, margin: '0 auto', textAlign: 'center' }}>
            <h3 className="mkt-h3 mkt-grad m-shine" style={{ fontSize: 'clamp(1.7rem, 3.6vw, 2.6rem)', lineHeight: 1.15, fontWeight: 800 }}>
              {children}
            </h3>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default function Manifesto() {
  return (
    <>
      {/* Hero */}
      <section className="mkt-hero">
        <div className="mkt-wrap">
          <Reveal>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
              <Pill>Manifesto</Pill>
            </div>
            <h1 className="mkt-h1" style={{ maxWidth: 960, margin: '0 auto' }}>
              The incumbents bolted AI on. <span className="mkt-grad m-shine">We started there.</span>
            </h1>
            <p className="mkt-lead" style={{ maxWidth: 680, margin: '24px auto 0' }}>
              Every CRM on the market was built for a world before AI, then had a chatbot stapled to the side.
              Rally is what you build when the AI is the point, not the patch.
            </p>
          </Reveal>
        </div>
      </section>

      <div className="mkt-wrap"><hr className="mkt-rule" /></div>

      {/* 1 */}
      <Section eyebrow="Chapter 01" title="The CRM became a system of record that reps hate.">
        <p className="mkt-body">
          It was supposed to be the brain of the revenue team. Instead it became a filing cabinet with a login.
          Reps spend their afternoons feeding it, not selling. Managers spend their weeks pulling reports out
          of it, not coaching. The tool that promised leverage turned into overhead, and everyone quietly
          agreed to pretend the data was clean.
        </p>
        <p className="mkt-body">
          A generation of software taught salespeople that the CRM works for the CRM. That is the failure Rally
          exists to end.
        </p>
      </Section>

      <PullQuote>Data entry is not a job. It is a symptom of software that never learned to do the work itself.</PullQuote>

      {/* 2 */}
      <Section eyebrow="Chapter 02" title="AI got added as a sidecar. A chatbot in the corner.">
        <p className="mkt-body">
          When the wave hit, the incumbents did the only thing a twenty-year-old architecture allows: they
          bolted a chat box onto the dashboard. It can summarize a record you already opened and draft an email
          you already knew to send. It sits beside the work. It does not do the work.
        </p>
        <p className="mkt-body">
          You cannot retrofit an operator into a system of record. The intelligence has to reach the data, the
          workflow, and the actions natively, or it is just autocomplete wearing a badge.
        </p>
      </Section>

      {/* 3 */}
      <Section eyebrow="Chapter 03" title="Rally is AI-native from the first commit. The operator runs the work.">
        <p className="mkt-body">
          Rook is not a feature we added. Rook is the reason the platform is shaped the way it is. Ask it to
          build a pipeline view, clean a segment, chase the deals that went quiet, or draft the follow-ups for
          your whole book, and it does it, then shows you what it did.
        </p>
        <p className="mkt-body">
          The human sets direction and approves. The operator executes. That is the division of labor a modern
          revenue team actually wants, and it only works when the AI was there from the start.
        </p>
      </Section>

      <PullQuote>You should not operate the software. The software should operate for you.</PullQuote>

      {/* 4 */}
      <Section eyebrow="Chapter 04" title="Alive on first load. Not an empty database you fill for months.">
        <p className="mkt-body">
          Most platforms ship you a blank grid and a six-month implementation. Rally opens with pipeline,
          contacts, structure, and a working operator already in motion, so you can see how your revenue runs
          before you have typed a single field.
        </p>
        <p className="mkt-body">
          Time to value is not a slide in the sales deck. It is the first thirty seconds after you log in.
        </p>
      </Section>

      {/* 5 */}
      <Section eyebrow="Chapter 05" title="One platform. One operator. One design. Not a decade of acquisitions stitched together.">
        <p className="mkt-body">
          The giants grew by buying companies and gluing the logos together. What you get is five products
          wearing one name, five data models, five UIs, and integration tax on every workflow that crosses a
          seam.
        </p>
        <p className="mkt-body">
          Rally is one coherent system. One data model, one operator that sees all of it, one design language
          end to end. The consistency is not cosmetic. It is what lets the AI reason across your entire revenue
          motion instead of one silo at a time.
        </p>
      </Section>

      <PullQuote>One brain beats ten bolt-ons. That is the whole architecture, and the whole advantage.</PullQuote>

      {/* 6 - the bet */}
      <section className="mkt-section" style={{ paddingTop: 72 }}>
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-cta-band" style={{ padding: '72px 40px' }}>
              <p className="mkt-eyebrow" style={{ marginBottom: 18 }}>Chapter 06 / The bet</p>
              <h2 className="mkt-h2" style={{ maxWidth: 860, margin: '0 auto' }}>
                The winning revenue platform will be the one where <span className="mkt-grad m-shine">the AI does the work.</span>
              </h2>
              <p className="mkt-lead" style={{ maxWidth: 620, margin: '20px auto 0' }}>
                We are betting the company on it, and we intend to be that platform. Not a CRM with AI features.
                An AI operator that happens to run your revenue.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 30 }}>
                <Link to="/app" className="mkt-btn mkt-btn-primary mkt-btn-lg">
                  Run your revenue on Rally <Icon name="chevronRight" size={18} />
                </Link>
                <Link to="/product/rook" className="mkt-btn mkt-btn-ghost mkt-btn-lg">Meet Rook</Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <CtaBand title="Come build the future of revenue with us." sub="Run your revenue on Rally." />
    </>
  );
}
