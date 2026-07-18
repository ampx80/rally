// Changelog.jsx - a beautiful product changelog driven by a local array of
// releases. A self-drawing timeline spine, animated per-release reveal, and
// colored tags. Scoped under .mkt (router wraps in MarketingShell).
// NO em-dash / en-dash. ASCII hyphen only.
import React from 'react';
import { Reveal, Pill, CtaBand } from './kit.jsx';
import { Icon } from '../components/icons.jsx';
import './company.css';

/* ------------------------------------------------------------------ */
/* Releases - newest first. tag drives the pill color (see company.css) */
/* ------------------------------------------------------------------ */
const RELEASES = [
  {
    version: 'v1.6',
    date: 'July 2026',
    tag: 'feature',
    tagLabel: 'New',
    title: 'Generation Studio',
    items: [
      { lead: 'Studio', text: 'ask Rook to generate quotes, one-pagers, and QBR decks from live pipeline data, then edit in the doc builder.' },
      { lead: 'Deck export', text: 'quarterly reviews assemble themselves from real numbers and export to a polished deck.' },
    ],
  },
  {
    version: 'v1.5',
    date: 'July 2026',
    tag: 'platform',
    tagLabel: 'Platform',
    title: 'RBAC and the audit log',
    items: [
      { lead: 'Role-based access', text: 'granular roles across every module, so admins control who sees and edits what.' },
      { lead: 'Audit log', text: 'a complete, exportable trail of every change and every action Rook takes on your behalf.' },
    ],
  },
  {
    version: 'v1.4',
    date: 'June 2026',
    tag: 'feature',
    tagLabel: 'New',
    title: 'Email connect and import',
    items: [
      { lead: 'Email connect', text: 'link your inbox so Rook drafts follow-ups in your voice and drops them in your outbox for a yes.' },
      { lead: 'Import', text: 'bring accounts, contacts, and deals from Salesforce, HubSpot, Zoho, or a CSV, mapped in a day.' },
    ],
  },
  {
    version: 'v1.3',
    date: 'June 2026',
    tag: 'improved',
    tagLabel: 'Improved',
    title: 'Parity waves',
    items: [
      { lead: 'Module parity', text: 'successive waves brought Forecasting, Sequences, Projects, Quotes, and Billing to full working depth.' },
      { lead: 'One data model', text: 'every module now reads and writes the same source of truth, so reports always tie out.' },
    ],
  },
  {
    version: 'v1.2',
    date: 'May 2026',
    tag: 'improved',
    tagLabel: 'Improved',
    title: '1,970 SEO pages',
    items: [
      { lead: 'Content engine', text: 'a prerendered library of comparison and topic pages so teams can find Ardovo before they ever sign up.' },
      { lead: 'Compare hub', text: 'head-to-head pages against every major incumbent, kept on a single canonical URL.' },
    ],
  },
  {
    version: 'v1.1',
    date: 'May 2026',
    tag: 'improved',
    tagLabel: 'Improved',
    title: 'Redesigned marketing site',
    items: [
      { lead: 'New house style', text: 'a light, premium marketing surface with a live self-assembling hero and motion throughout.' },
      { lead: 'Agent theater', text: 'watch Rook build a whole account from one sentence, right on the homepage.' },
    ],
  },
  {
    version: 'v1.0',
    date: 'July 2026',
    tag: 'launch',
    tagLabel: 'Launch',
    title: 'Ardovo is live',
    items: [
      { lead: 'The platform', text: 'fourteen modules, one login, one price, with Rook the AI operator on every seat.' },
      { lead: 'Alive on first load', text: 'every workspace opens full of realistic data so you can explore before you import a row.' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */
export default function Changelog() {
  return (
    <>
      <section className="mkt-hero co-hero">
        <div className="co-hero-glow" aria-hidden />
        <div className="mkt-wrap">
          <Reveal>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
              <Pill><span className="mkt-dot m-pulse" /> Shipping weekly</Pill>
            </div>
            <h1 className="mkt-h1" style={{ maxWidth: 900, margin: '0 auto' }}>
              What shipped. <span className="mkt-grad m-shine">In order.</span>
            </h1>
            <p className="mkt-lead" style={{ maxWidth: 620, margin: '24px auto 0' }}>
              Ardovo is built AI-native and shipped fast. Every release from launch to now, newest first.
            </p>
            <div className="co-hero-rail">
              <span>{RELEASES.length} releases</span>
              <span>Newest at the top</span>
              <span>Built in the open</span>
            </div>
          </Reveal>
        </div>
      </section>

      <div className="mkt-wrap"><hr className="co-gradrule" /></div>

      <section className="mkt-section" style={{ paddingTop: 64 }}>
        <div className="mkt-wrap">
          <div className="co-timeline">
            <span className="co-spine" aria-hidden />
            {RELEASES.map((r, i) => (
              <Reveal key={r.version} delay={Math.min(i, 4) * 70} className="co-tlrow">
                <span className={`co-tldot${i === 0 ? ' is-live' : ''}`} aria-hidden />
                <div className="co-release" style={{ paddingLeft: 0 }}>
                  <div className="co-relhead">
                    <span className="co-relver">{r.version}</span>
                    <span className={`co-reltag t-${r.tag}`}>{r.tagLabel}</span>
                    <span className="co-reldate">{r.date}</span>
                  </div>
                  <h3 className="mkt-h3" style={{ margin: '0 0 16px', fontSize: '1.5rem' }}>{r.title}</h3>
                  <ul className="co-relitems">
                    {r.items.map((it) => (
                      <li key={it.lead} className="co-relitem">
                        <span className="co-relbullet"><Icon name="check" size={13} stroke={3} /></span>
                        <span><b>{it.lead}:</b> {it.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CtaBand title="Want a say in what ships next?" sub="Get started free and tell Rook what you need. We build in the open." />
    </>
  );
}
