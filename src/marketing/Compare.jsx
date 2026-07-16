// Programmatic comparison template. One component, rendered for every
// /compare/:slug - the first seeds of Rally's SEO engine. Cross-links every
// competitor so each page lifts the others. NO em-dash / en-dash.
// Teal #0e9f8f product accent; violet reserved for Rook/AI only.
import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Reveal, MktButton, Pill, CtaBand } from './kit.jsx';
import { COMPETITORS, COMPETITOR_SLUGS } from './competitors.js';
import { Icon } from '../components/icons.jsx';

const PANEL = {
  background: 'linear-gradient(180deg, #fff, #fafcfb)',
  border: '1px solid var(--m-line)',
  borderRadius: 14,
  boxShadow: 'none',
};

// Renders a table/row cell: boolean -> yes/no glyph, string -> text.
function Cell({ value }) {
  if (value === true) return <span className="mkt-yes"><Icon name="check" size={18} /></span>;
  if (value === false) return <span className="mkt-no"><Icon name="x" size={16} /></span>;
  return <span style={{ color: 'var(--m-ink)', fontWeight: 600 }}>{value}</span>;
}

export default function Compare() {
  const { slug } = useParams();
  // Guard unknown slugs by falling back, and read the actual key we resolved to
  // so cross-links exclude the right page.
  const key = COMPETITORS[slug] ? slug : 'salesforce';
  const c = COMPETITORS[key];
  const others = COMPETITOR_SLUGS.filter(s => s !== key);

  return (
    <>
      {/* Hero */}
      <section className="mkt-hero">
        <div className="mkt-wrap">
          <Reveal>
            <Pill>Comparison</Pill>
            <h1 className="mkt-h1" style={{ marginTop: 22, letterSpacing: '-.03em', lineHeight: 1.05 }}>
              Rally vs <span className="mkt-grad m-shine">{c.name}</span>
            </h1>
            <p className="mkt-lead" style={{ maxWidth: 680, margin: '20px auto 0' }}>{c.tagline}</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 32 }}>
              <MktButton to="/app" size="lg">Get started <Icon name="chevronRight" size={18} /></MktButton>
              <MktButton to="/features" variant="ghost" size="lg">See the product</MktButton>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Struggles vs wins */}
      <section className="mkt-section-sm">
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-grid mkt-grid-2 m-cascade">
              <div style={{ ...PANEL, padding: 26 }}>
                <div className="mkt-icon" style={{ background: 'rgba(90,96,118,.1)', color: '#8a90a6', borderColor: 'var(--m-line2)' }}>
                  <Icon name="x" size={22} />
                </div>
                <h3 className="mkt-h3" style={{ marginTop: 18, letterSpacing: '-.02em' }}>Where {c.name} struggles</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: '18px 0 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {c.theyStruggle.map((t, i) => (
                    <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <span className="mkt-no" style={{ marginTop: 2, flexShrink: 0 }}><Icon name="x" size={17} /></span>
                      <span className="mkt-muted" style={{ lineHeight: 1.5 }}>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{
                ...PANEL,
                padding: 26,
                borderColor: 'rgba(14,159,143,.35)',
                background: 'linear-gradient(160deg, rgba(14,159,143,.06), #fff 55%)',
              }}>
                <div className="mkt-icon">
                  <Icon name="zap" size={22} />
                </div>
                <h3 className="mkt-h3" style={{ marginTop: 18, letterSpacing: '-.02em' }}>Where Rally wins</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: '18px 0 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {c.rallyWins.map((t, i) => (
                    <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <span className="mkt-yes m-pop" style={{ marginTop: 2, flexShrink: 0, animationDelay: `${0.3 + i * 0.09}s` }}><Icon name="check" size={18} /></span>
                      <span style={{ color: 'var(--m-ink)', lineHeight: 1.5 }}>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Capability table */}
      <section className="mkt-section-sm">
        <div className="mkt-wrap">
          <Reveal>
            <p className="mkt-eyebrow" style={{ marginBottom: 10 }}>Capabilities</p>
            <h2 className="mkt-h2" style={{ marginBottom: 8, letterSpacing: '-.02em' }}>Rally vs {c.name}, line by line</h2>
            <p className="mkt-muted" style={{ marginBottom: 26, maxWidth: 560 }}>The capabilities that decide whether your revenue team runs or crawls.</p>
            <div style={{ ...PANEL, padding: '6px 8px', overflowX: 'auto' }}>
              <table className="mkt-table">
                <thead>
                  <tr>
                    <th>Capability</th>
                    <th style={{ width: 120, color: 'var(--m-accent)' }}>Rally</th>
                    <th style={{ width: 160 }}>{c.name}</th>
                  </tr>
                </thead>
                <tbody>
                  {c.rows.map((row, i) => {
                    const [label, rally, them] = row;
                    return (
                      <tr key={i}>
                        <td style={{ color: 'var(--m-ink)', fontWeight: 600 }}>{label}</td>
                        <td style={{ background: 'rgba(14,159,143,.04)' }}><Cell value={rally} /></td>
                        <td><Cell value={them} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Summary callout */}
      <section className="mkt-section-sm">
        <div className="mkt-wrap">
          <Reveal>
            <div style={{
              ...PANEL,
              textAlign: 'left',
              padding: '40px 36px',
              borderColor: 'rgba(14,159,143,.28)',
              background: 'linear-gradient(135deg, rgba(14,159,143,.07), #fff 50%)',
              borderLeft: '3px solid #0e9f8f',
            }}>
              <div className="mkt-eyebrow" style={{ marginBottom: 14 }}>The bottom line</div>
              <p className="mkt-lead" style={{ color: 'var(--m-ink)', maxWidth: 820, margin: 0 }}>{c.summary}</p>
              <div style={{ marginTop: 26 }}>
                <MktButton to="/app">Run your revenue on Rally <Icon name="chevronRight" size={18} /></MktButton>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Interlink row - the SEO web */}
      <section className="mkt-section-sm">
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-eyebrow" style={{ marginBottom: 16 }}>Compare Rally to:</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {others.map(s => (
                <Link
                  key={s}
                  to={`/compare/${s}`}
                  className="mkt-btn mkt-btn-ghost"
                  style={{ borderRadius: 999 }}
                >
                  Rally vs {COMPETITORS[s].name}
                  <Icon name="chevronRight" size={16} />
                </Link>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <CtaBand
        title={`Ready to leave ${c.name} behind?`}
        sub="Alive on first load. Ask Rook and it runs the work."
      />
    </>
  );
}
