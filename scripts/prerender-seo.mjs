// ============================================================
// PRERENDER-SEO  (programmatic SEO engine, build step)
// Emits a real static HTML file per generated page so crawlers and LLMs
// get full content + meta + JSON-LD in the initial response (the SPA
// then boots into #root and takes over for humans). Also writes
// sitemap.xml, robots.txt, and llms.txt. Runs after `vite build`.
// NO em-dash / en-dash.
// ============================================================
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');

const reg = await import('../src/marketing/seo/registry.js');
const head = await import('../src/marketing/seo/head.js');
const { ENTRIES, relatedFor, TYPE_META, GROUP_ORDER, categoriesFor, stats } = reg;
const { metaFor, canonicalFor, SITE, orgLd, breadcrumbLd, articleLd, faqLd, definedTermLd, itemListLd } = head;

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const paras = (v) => (Array.isArray(v) ? v : [v]).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join('');
const cellHtml = (v) => v === true ? 'Yes' : v === false ? 'No' : esc(v);

function renderTable(t) {
  if (!t || !t.rows) return '';
  return `<table><thead><tr>${t.columns.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>`
    + `<tbody>${t.rows.map(r => `<tr>${r.map((v, i) => i === 0 ? `<th scope="row">${esc(v)}</th>` : `<td>${cellHtml(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function renderBullets(b) { return b && b.length ? `<ul>${b.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''; }

function renderBody(e) {
  const trail = ['Home', 'Pages', e.category, e.h1 || e.title];
  let h = `<nav aria-label="Breadcrumb">${trail.map((t, i) => i < 3
    ? `<a href="${i === 0 ? '/' : i === 1 ? '/pages' : `/pages?group=${encodeURIComponent(e.group)}`}">${esc(t)}</a> / `
    : `<span>${esc(t)}</span>`).join('')}</nav>`;
  h += `<h1>${esc(e.h1 || e.title)}</h1>`;
  if (e.intro) h += paras(e.intro);
  if (e.stats) h += `<ul class="stats">${e.stats.map(s => `<li><strong>${esc(s.value)}</strong> ${esc(s.label)}</li>`).join('')}</ul>`;
  if (e.shortAnswer) h += `<section><h2>Short answer</h2><p>${esc(e.shortAnswer)}</p></section>`;
  if (e.keyPoints) h += `<section><h2>Key takeaways</h2>${renderBullets(e.keyPoints)}</section>`;
  if (e.table && (e.type === 'comparison' || e.type === 'versus')) h += `<section><h2>${esc(e.tableHeading || 'Side by side')}</h2>${renderTable(e.table)}</section>`;
  if (e.items && e.items.length) {
    h += `<section><h2>${esc(e.itemsHeading || (e.type === 'alternative' ? 'The best alternatives' : 'The ranking'))}</h2><ol>`;
    h += e.items.map(it => `<li><h3>${esc(it.name)}</h3>${it.blurb ? paras(it.blurb) : ''}`
      + `${it.pros ? `<p><strong>Pros:</strong></p>${renderBullets(it.pros)}` : ''}`
      + `${it.cons ? `<p><strong>Cons:</strong></p>${renderBullets(it.cons)}` : ''}`
      + `${it.best ? `<p><strong>Best for:</strong> ${esc(it.best)}</p>` : ''}</li>`).join('');
    h += `</ol></section>`;
  }
  if (e.valueProps) h += `<section><h2>${esc(e.valuePropsHeading || 'What you get')}</h2>${e.valueProps.map(v => `<h3>${esc(v.h)}</h3><p>${esc(v.body)}</p>`).join('')}</section>`;
  if (e.steps && e.steps.length) h += `<section><h2>${esc(e.stepsHeading || 'Step by step')}</h2><ol>${e.steps.map(s => `<li><h3>${esc(s.h)}</h3>${paras(s.body)}${renderBullets(s.bullets)}</li>`).join('')}</ol></section>`;
  if (e.sections) h += e.sections.map(s => `<section><h2>${esc(s.h)}</h2>${paras(s.body)}${renderBullets(s.bullets)}${s.table ? renderTable(s.table) : ''}</section>`).join('');
  if (e.table && !(e.type === 'comparison' || e.type === 'versus')) h += `<section><h2>${esc(e.tableHeading || 'By the numbers')}</h2>${renderTable(e.table)}</section>`;
  if (e.pros || e.cons) h += `<section><h2>${esc(e.prosConsHeading || 'The honest take')}</h2>${e.pros ? `<h3>${esc(e.proLabel || 'Strengths')}</h3>${renderBullets(e.pros)}` : ''}${e.cons ? `<h3>${esc(e.conLabel || 'Considerations')}</h3>${renderBullets(e.cons)}` : ''}</section>`;
  if (e.verdict) h += `<section><h2>The verdict</h2>${paras(e.verdict)}</section>`;
  if (e.faqs && e.faqs.length) h += `<section><h2>Frequently asked questions</h2>${e.faqs.map(f => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}</section>`;
  const rel = relatedFor(e, 6);
  if (rel.length) h += `<section><h2>Keep reading</h2><ul>${rel.map(r => `<li><a href="/pages/${r.slug}">${esc(r.title)}</a></li>`).join('')}</ul></section>`;
  h += `<section><p><a href="/app">Get started with Rally</a> or <a href="/pages">browse all pages</a>.</p></section>`;
  return h;
}

function pageHtml(shell, e) {
  const { title, description } = metaFor(e);
  const canonical = canonicalFor(e.slug);
  const ld = [orgLd(), breadcrumbLd([{ name: 'Home', href: '/' }, { name: 'Pages', href: '/pages' }, { name: e.category }, { name: e.h1 || e.title }]),
    articleLd(e), faqLd(e.faqs), e.type === 'glossary' ? definedTermLd(e) : null,
    (e.type === 'ranking' || e.type === 'alternative') ? itemListLd(e) : null].filter(Boolean);
  const headTags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${esc(canonical)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:url" content="${esc(canonical)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    ...ld.map(g => `<script type="application/ld+json">${JSON.stringify(g).replace(/</g, '\\u003c')}</script>`),
  ].join('\n    ');
  return shell
    .replace(/<title>[\s\S]*?<\/title>/, headTags)
    .replace('<div id="root"></div>', `<div id="root"><main class="seo-prerender mkt-wrap">${renderBody(e)}</main></div>`);
}

function hubHtml(shell) {
  const s = stats();
  const groups = GROUP_ORDER.map(g => ({ g, cats: categoriesFor(g) })).filter(x => x.cats.length);
  let body = `<h1>Rally library - ${s.total}+ CRM, sales, and revenue pages</h1>`
    + `<p>Comparisons, alternatives, best-of rankings, industry guides, and plain-English definitions. Built for humans and the models they ask.</p>`;
  for (const { g, cats } of groups) {
    body += `<section><h2>${esc(g)}</h2>`;
    for (const { category, entries } of cats) {
      body += `<h3>${esc(category)} (${entries.length})</h3><ul>${entries.map(e => `<li><a href="/pages/${e.slug}">${esc(e.title)}</a></li>`).join('')}</ul>`;
    }
    body += `</section>`;
  }
  const ld = [orgLd(), { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Rally', url: SITE,
    potentialAction: { '@type': 'SearchAction', target: `${SITE}/pages?q={query}`, 'query-input': 'required name=query' } }];
  const headTags = [
    `<title>All pages - ${s.total}+ CRM guides, comparisons, and rankings | Rally</title>`,
    `<meta name="description" content="Browse ${s.total}+ pages on CRM, sales, and revenue operations: comparisons, alternatives, rankings, industry guides, and definitions." />`,
    `<link rel="canonical" href="${SITE}/pages" />`,
    ...ld.map(g => `<script type="application/ld+json">${JSON.stringify(g).replace(/</g, '\\u003c')}</script>`),
  ].join('\n    ');
  return shell.replace(/<title>[\s\S]*?<\/title>/, headTags)
    .replace('<div id="root"></div>', `<div id="root"><main class="seo-prerender mkt-wrap">${body}</main></div>`);
}

/* ---------- run ---------- */
const shell = await readFile(join(DIST, 'index.html'), 'utf8');
if (!existsSync(join(DIST, 'pages'))) await mkdir(join(DIST, 'pages'), { recursive: true });

let n = 0;
for (const e of ENTRIES) {
  const dir = join(DIST, 'pages', e.slug);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'index.html'), pageHtml(shell, e), 'utf8');
  n++;
}
await writeFile(join(DIST, 'pages', 'index.html'), hubHtml(shell), 'utf8');

// sitemap.xml
const staticUrls = ['/', '/features', '/product/rook', '/pricing', '/security', '/manifesto', '/pages'];
const urls = [
  ...staticUrls.map(u => ({ loc: SITE + u, pri: u === '/' ? '1.0' : '0.8', freq: 'weekly' })),
  ...ENTRIES.map(e => ({ loc: canonicalFor(e.slug), pri: (e.type === 'ranking' || e.type === 'comparison' || e.type === 'versus' || e.type === 'alternative') ? '0.8' : '0.6', freq: 'monthly', lastmod: e.updated })),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
  + urls.map(u => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<changefreq>${u.freq}</changefreq><priority>${u.pri}</priority></url>`).join('\n')
  + `\n</urlset>\n`;
await writeFile(join(DIST, 'sitemap.xml'), sitemap, 'utf8');

// robots.txt
await writeFile(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`, 'utf8');

// llms.txt - a structured index for LLMs
const s = stats();
let llms = `# Rally\n\n> Rally is the AI-native CRM and revenue platform. Operator: Rook, an AI that executes multi-step revenue work. Alive with data on first load, one clean price.\n\n`;
llms += `This file indexes ${s.total}+ pages for language models. Full sitemap: ${SITE}/sitemap.xml\n\n`;
for (const g of GROUP_ORDER) {
  for (const { category, entries } of categoriesFor(g)) {
    llms += `## ${category}\n`;
    for (const e of entries) {
      const sa = e.shortAnswer ? ': ' + (Array.isArray(e.shortAnswer) ? e.shortAnswer[0] : e.shortAnswer) : '';
      llms += `- [${e.title}](${canonicalFor(e.slug)})${sa}\n`;
    }
    llms += `\n`;
  }
}
await writeFile(join(DIST, 'llms.txt'), llms, 'utf8');

console.log(`prerender-seo: wrote ${n} pages + hub + sitemap.xml (${urls.length} urls) + robots.txt + llms.txt`);

// ============================================================
// JUGGERNAUT TRACK  (appended, fully additive - the existing loop,
// sitemap, robots, and llms.txt writes above are untouched). Emits the
// isolated best-in-class /guides/<slug> pages, then splices their URLs
// into the already-written sitemap.xml and appends a section to
// llms.txt. If the registry is empty or missing, this block no-ops.
// ============================================================
try {
  const jreg = await import('../src/marketing/seo/juggernaut-registry.js');
  const jren = await import('../src/marketing/seo/juggernaut-render.js');
  const JUGGERNAUTS = jreg.JUGGERNAUTS || [];
  if (JUGGERNAUTS.length) {
    if (!existsSync(join(DIST, 'guides'))) await mkdir(join(DIST, 'guides'), { recursive: true });
    let jn = 0;
    for (const e of JUGGERNAUTS) {
      const dir = join(DIST, 'guides', e.slug);
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, 'index.html'), jren.renderJuggernautDocument(shell, e), 'utf8');
      jn++;
    }

    // Splice juggernaut URLs into the existing sitemap.xml (before </urlset>).
    const jugUrls = JUGGERNAUTS.map((e) => `  <url><loc>${jren.guideCanonical(e.slug)}</loc>`
      + `${e.updated ? `<lastmod>${e.updated}</lastmod>` : ''}<changefreq>weekly</changefreq><priority>0.9</priority></url>`).join('\n');
    const sitemapPath = join(DIST, 'sitemap.xml');
    let sm = await readFile(sitemapPath, 'utf8');
    sm = sm.replace('</urlset>', `${jugUrls}\n</urlset>`);
    await writeFile(sitemapPath, sm, 'utf8');

    // Append a Guides section to the existing llms.txt.
    let jllms = `\n## Guides (in-depth, best-in-class)\n`;
    for (const e of JUGGERNAUTS) {
      const sum = typeof e.intro === 'string' ? e.intro : Array.isArray(e.intro) ? e.intro[0] : (e.metaDescription || '');
      jllms += `- [${e.title}](${jren.guideCanonical(e.slug)})${sum ? ': ' + sum : ''}\n`;
    }
    const llmsPath = join(DIST, 'llms.txt');
    const existingLlms = await readFile(llmsPath, 'utf8');
    await writeFile(llmsPath, existingLlms + jllms, 'utf8');

    console.log(`prerender-seo: wrote ${jn} juggernaut /guides pages + spliced sitemap + llms.txt`);
  } else {
    console.log('prerender-seo: no juggernaut entries registered, skipped /guides track');
  }
} catch (err) {
  console.warn('prerender-seo: juggernaut track skipped,', err && err.message);
}
