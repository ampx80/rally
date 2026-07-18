// Ardovo vs {competitor} - the high-intent comparison pages. One entry per
// competitor, rendered by the SeoPage `comparison` template. NO em-dash / en-dash.
import { COMPETITORS, COMPETITOR_SLUGS } from '../../competitors.js';

const YEAR = 2026;

/* Expand each competitor into a full, unique comparison page entry. */
export default COMPETITOR_SLUGS.map((slug) => {
  const c = COMPETITORS[slug];
  const table = {
    columns: ['Capability', 'Ardovo', c.name],
    rows: c.rows,
  };
  return {
    slug: `rally-vs-${slug}`,
    type: 'comparison',
    title: `Ardovo vs ${c.name} (${YEAR})`,
    metaTitle: `Ardovo vs ${c.name}: Features, Pricing, and Which To Choose (${YEAR}) | Ardovo`,
    metaDescription: `A direct, honest Ardovo vs ${c.name} comparison for ${YEAR}: where each wins, feature-by-feature tables, and which revenue teams should pick which.`,
    eyebrow: `Ardovo vs ${c.name}`,
    h1: `Ardovo vs ${c.name}: the honest comparison`,
    shortAnswer: `${c.summary}`,
    intro: [
      `${c.tagline} Below is a straight, feature-by-feature look at Ardovo and ${c.name} so you can decide fast, without a sales call.`,
    ],
    stats: [
      { value: 'Minutes', label: 'Ardovo time to first value' },
      { value: 'Day one', label: 'Ardovo is alive with data' },
      { value: 'AI-native', label: 'Rook runs the work' },
    ],
    tableHeading: `Ardovo vs ${c.name}, feature by feature`,
    table,
    highlightCol: 1,
    valuePropsHeading: 'Where Ardovo pulls ahead',
    valueProps: c.rallyWins.map((w, i) => ({
      icon: ['sparkles', 'rocket', 'zap', 'target'][i % 4],
      h: w.split(' - ')[0],
      body: w,
    })),
    prosConsHeading: `Where ${c.name} may still fit better`,
    proLabel: 'Ardovo advantages',
    conLabel: `${c.name} considerations`,
    pros: c.rallyWins,
    cons: c.theyStruggle,
    verdict: `If you want an AI-native revenue platform that is alive on day one and where the operator actually executes the work, choose Ardovo. If you are already deeply invested in ${c.name} and its ecosystem, the honest answer is that a migration is a project worth planning. Ardovo is built to make that switch pay for itself fast.`,
    faqs: [
      { q: `Is Ardovo a real alternative to ${c.name}?`, a: `Yes. Ardovo covers the core CRM and revenue workflow ${c.name} is used for, and adds an AI operator (Rook) that executes multi-step work rather than just answering questions. Most teams are productive in minutes instead of months.` },
      { q: `How is Ardovo's pricing different from ${c.name}?`, a: `Ardovo is one clean price across every module, with no per-cloud add-ons or premium AI tiers. ${c.name} pricing tends to climb as you add seats, contacts, and clouds.` },
      { q: `Can I migrate my data from ${c.name} to Ardovo?`, a: `Yes. Ardovo imports accounts, contacts, deals, and activity, and Rook can help set up your pipeline and views from a single sentence. See the Ardovo library for a full migration guide.` },
      { q: `Does Ardovo have the depth ${c.name} has?`, a: `Ardovo ships a deep deal object (line items, buying committee, competitors), visual automation, forecasting, quotes, and projects out of the box, so most teams find the depth they need without add-ons.` },
    ],
    related: [`rally-vs-${COMPETITOR_SLUGS[(COMPETITOR_SLUGS.indexOf(slug) + 1) % COMPETITOR_SLUGS.length]}`, `${slug}-alternatives`],
    featured: true,
    published: '2026-07-10',
  };
});
