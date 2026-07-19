// designer/fonts.js
// Loads Google Fonts on demand and exposes a promise that resolves once the
// requested families are actually painted, so PNG/JPG export captures the
// real typefaces (Konva draws text with whatever the browser has loaded).
//
// Strategy: with 80+ families we do NOT load them all up front. We inject a
// small default subset eagerly, then lazy-load any other family the moment it
// is used in the document or previewed in the picker. Before an export we force
// every family used across all text runs to be ready.

import { WEIGHTS_BY_NAME, DEFAULT_FONTS } from './fontCatalog';

const GF_BASE = 'https://fonts.googleapis.com/css2';

// Families we have already asked the browser to fetch (deduped).
const requested = new Set();
let defaultsInjected = false;

function familyParam(name) {
  const w = (WEIGHTS_BY_NAME[name] || [400, 700]).slice().sort((a, b) => a - b);
  const fam = name.replace(/ /g, '+');
  return `family=${fam}:wght@${w.join(';')}`;
}

// Inject one <link> for a batch of families. One request per batch keeps the
// header/connection overhead down versus one link per family.
function injectLink(names) {
  if (typeof document === 'undefined' || !names.length) return;
  const params = names.map(familyParam).join('&');
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `${GF_BASE}?${params}&display=swap`;
  document.head.appendChild(link);
}

// Eagerly load the curated default subset once (fast first paint).
export function injectFontLink() {
  if (defaultsInjected) return;
  defaultsInjected = true;
  const fresh = DEFAULT_FONTS.filter((n) => !requested.has(n));
  fresh.forEach((n) => requested.add(n));
  injectLink(fresh);
}

// Request one or more families (idempotent). Used when a font becomes visible
// in the picker or is applied to text.
export function loadFonts(names) {
  const list = (Array.isArray(names) ? names : [names]).filter(Boolean);
  const fresh = list.filter((n) => !requested.has(n));
  if (!fresh.length) return;
  fresh.forEach((n) => requested.add(n));
  injectLink(fresh);
}

// Resolve once the given families (all their weights, roman + italic) are
// loaded. Called before an export so the rasterized canvas shows real fonts.
export async function ensureFontsReady(usedFamilies) {
  if (typeof document === 'undefined' || !document.fonts) return;
  injectFontLink();
  const fams = (usedFamilies && usedFamilies.length ? usedFamilies : DEFAULT_FONTS)
    .filter(Boolean);
  loadFonts(fams);
  const jobs = [];
  for (const fam of fams) {
    for (const w of (WEIGHTS_BY_NAME[fam] || [400, 700])) {
      jobs.push(document.fonts.load(`${w} 64px "${fam}"`).catch(() => {}));
      jobs.push(document.fonts.load(`italic ${w} 64px "${fam}"`).catch(() => {}));
    }
  }
  try {
    await Promise.all(jobs);
    await document.fonts.ready;
  } catch { /* best effort */ }
}
