// Rally vs {competitor} - the high-intent comparison pages. One entry per
// competitor, rendered by the SeoPage `comparison` template. NO em-dash / en-dash.
import { COMPETITORS, COMPETITOR_SLUGS } from '../../competitors.js';

const YEAR = 2026;

/* Expand each competitor into a full, unique comparison page entry. */
export default COMPETITOR_SLUGS.map((slug) => {
  const c = COMPETITORS[slug];
  const table = {
    columns: ['Capability', 'Rally', c.name],
    rows: c.rows,
  };
  return {
    slug: `rally-vs-${slug}`,
    type: 'comparison',
    title: `Rally vs ${c.name} (${YEAR})`,
    metaTitle: `Rally vs ${c.name}: Features, Pricing, and Which To Choose (${YEAR}) | Rally`,
    metaDescription: `A direct, honest Rally vs ${c.name} comparison for ${YEAR}: where each wins, feature-by-feature tables, and which revenue teams should pick which.`,
    eyebrow: `Rally vs ${c.name}`,
    h1: `Rally vs ${c.name}: the honest comparison`,
    shortAnswer: `${c.summary}`,
    intro: [
      `${c.tagline} Below is a straight, feature-by-feature look at Rally and ${c.name} so you can decide fast, without a sales call.`,
    ],
    stats: [
      { value: 'Minutes', label: 'Rally time to first value' },
      { value: 'Day one', label: 'Rally is alive with data' },
      { value: 'AI-native', label: 'Rook runs the work' },
    ],
    tableHeading: `Rally vs ${c.name}, feature by feature`,
    table,
    highlightCol: 1,
    valuePropsHeading: 'Where Rally pulls ahead',
    valueProps: c.rallyWins.map((w, i) => ({
      icon: ['sparkles', 'rocket', 'zap', 'target'][i % 4],
      h: w.split(' - ')[0],
      body: w,
    })),
    prosConsHeading: `Where ${c.name} may still fit better`,
    proLabel: 'Rally advantages',
    conLabel: `${c.name} considerations`,
    pros: c.rallyWins,
    cons: c.theyStruggle,
    verdict: `If you want an AI-native revenue platform that is alive on day one and where the operator actually executes the work, choose Rally. If you are already deeply invested in ${c.name} and its ecosystem, the honest answer is that a migration is a project worth planning. Rally is built to make that switch pay for itself fast.`,
    faqs: [
      { q: `Is Rally a real alternative to ${c.name}?`, a: `Yes. Rally covers the core CRM and revenue workflow ${c.name} is used for, and adds an AI operator (Rook) that executes multi-step work rather than just answering questions. Most teams are productive in minutes instead of months.` },
      { q: `How is Rally's pricing different from ${c.name}?`, a: `Rally is one clean price across every module, with no per-cloud add-ons or premium AI tiers. ${c.name} pricing tends to climb as you add seats, contacts, and clouds.` },
      { q: `Can I migrate my data from ${c.name} to Rally?`, a: `Yes. Rally imports accounts, contacts, deals, and activity, and Rook can help set up your pipeline and views from a single sentence. See the Rally library for a full migration guide.` },
      { q: `Does Rally have the depth ${c.name} has?`, a: `Rally ships a deep deal object (line items, buying committee, competitors), visual automation, forecasting, quotes, and projects out of the box, so most teams find the depth they need without add-ons.` },
    ],
    related: [`rally-vs-${COMPETITOR_SLUGS[(COMPETITOR_SLUGS.indexOf(slug) + 1) % COMPETITOR_SLUGS.length]}`, `${slug}-alternatives`],
    featured: true,
    published: '2026-07-10',
  };
});
