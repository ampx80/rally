// /pages - a full index of every page in Rally: the marketing site, the
// programmatic compare pages, and every product screen. Doubles as an HTML
// sitemap for SEO and a fast jump-to for humans.
import React from 'react';
import { Link } from 'react-router-dom';
import { Reveal, CtaBand } from './kit.jsx';
import { COMPETITORS, COMPETITOR_SLUGS } from './competitors.js';
import { Icon } from '../components/icons.jsx';

const GROUPS = [
  {
    title: 'Marketing',
    links: [
      ['Home', '/'],
      ['Product / Features', '/features'],
      ['Rook AI operator', '/product/rook'],
      ['Pricing', '/pricing'],
      ['Security', '/security'],
      ['Manifesto', '/manifesto'],
      ['All pages (this page)', '/pages'],
    ],
  },
  {
    title: 'Compare',
    links: COMPETITOR_SLUGS.map(s => [`Rally vs ${COMPETITORS[s].name}`, `/compare/${s}`]),
  },
  {
    title: 'Product - Sell',
    links: [
      ['Command center', '/app'],
      ['Leads', '/leads'],
      ['Deals', '/deals'],
      ['Contacts', '/contacts'],
      ['Companies', '/companies'],
      ['My day', '/activities'],
      ['Forecasting', '/forecasting'],
    ],
  },
  {
    title: 'Product - Grow + Deliver',
    links: [
      ['Campaigns', '/campaigns'],
      ['Sequences', '/sequences'],
      ['Projects', '/projects'],
      ['Service inbox', '/inbox'],
    ],
  },
  {
    title: 'Product - Revenue + Intel',
    links: [
      ['Products', '/products'],
      ['Quotes', '/quotes'],
      ['Billing', '/invoices'],
      ['Dashboards', '/dashboards'],
      ['Reports', '/reports'],
    ],
  },
  {
    title: 'Product - Automate + Admin',
    links: [
      ['Workflows', '/workflows'],
      ['Integrations', '/integrations'],
      ['Team', '/team'],
      ['Settings', '/settings'],
    ],
  },
];

export default function SiteMap() {
  const total = GROUPS.reduce((n, g) => n + g.links.length, 0);
  return (
    <>
      <section className="mkt-hero">
        <div className="mkt-wrap">
          <div className="mkt-eyebrow">Site index</div>
          <h1 className="mkt-h1" style={{ marginTop: 12 }}>Every page in <span className="mkt-grad">Rally.</span></h1>
          <p className="mkt-lead" style={{ maxWidth: 620, margin: '18px auto 0' }}>{total} pages across the marketing site and the product. Jump anywhere.</p>
        </div>
      </section>

      <section className="mkt-section" style={{ paddingTop: 0 }}>
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-grid mkt-grid-3">
              {GROUPS.map(g => (
                <div key={g.title} className="mkt-card">
                  <h3 className="mkt-h3" style={{ marginBottom: 14 }}>{g.title}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {g.links.map(([label, to]) => (
                      <Link key={to + label} to={to} className="mkt-muted" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', fontWeight: 500 }}>
                        <Icon name="chevronRight" size={14} />
                        <span>{label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <CtaBand title="Ready to see it live?" sub="Everything alive on first load. Ask Rook and it does the work." />
    </>
  );
}
