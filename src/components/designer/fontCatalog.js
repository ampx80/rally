// designer/fontCatalog.js
// A large, curated library of real Google Fonts for the visual designer,
// grouped by category so the font picker can group and search them. Weights are
// the ones we load per family (kept modest so the network cost stays sane).
//
// Each entry: { name, category, weights, italic }
//   name     exact Google Fonts family name (must match the CSS API)
//   category one of FONT_CATEGORIES
//   weights  numeric weights we request/load for that family
//   italic   whether italic variants exist (so we request ital,wght)
//
// ASCII hyphen only anywhere in this file.

export const FONT_CATEGORIES = [
  'Elegant serif',
  'Modern serif',
  'Sans serif',
  'Display',
  'Script',
  'Handwritten',
  'Slab',
  'Monospace',
];

// Raw catalog. Order inside a category is roughly "most useful first".
export const FONT_CATALOG = [
  /* ---- Elegant serif -------------------------------------------------- */
  { name: 'Playfair Display', category: 'Elegant serif', weights: [400, 600, 700, 800, 900], italic: true },
  { name: 'Cormorant Garamond', category: 'Elegant serif', weights: [400, 500, 600, 700], italic: true },
  { name: 'Cormorant', category: 'Elegant serif', weights: [400, 500, 600, 700], italic: true },
  { name: 'EB Garamond', category: 'Elegant serif', weights: [400, 500, 600, 700], italic: true },
  { name: 'Cinzel', category: 'Elegant serif', weights: [400, 500, 600, 700, 800, 900], italic: false },
  { name: 'Cardo', category: 'Elegant serif', weights: [400, 700], italic: true },
  { name: 'Cormorant SC', category: 'Elegant serif', weights: [400, 500, 600, 700], italic: false },
  { name: 'Marcellus', category: 'Elegant serif', weights: [400], italic: false },
  { name: 'Bodoni Moda', category: 'Elegant serif', weights: [400, 500, 600, 700, 800, 900], italic: true },
  { name: 'Libre Baskerville', category: 'Elegant serif', weights: [400, 700], italic: true },
  { name: 'Cinzel Decorative', category: 'Elegant serif', weights: [400, 700, 900], italic: false },

  /* ---- Modern serif --------------------------------------------------- */
  { name: 'Lora', category: 'Modern serif', weights: [400, 500, 600, 700], italic: true },
  { name: 'Merriweather', category: 'Modern serif', weights: [400, 700, 900], italic: true },
  { name: 'PT Serif', category: 'Modern serif', weights: [400, 700], italic: true },
  { name: 'Spectral', category: 'Modern serif', weights: [300, 400, 500, 600, 700, 800], italic: true },
  { name: 'Crimson Text', category: 'Modern serif', weights: [400, 600, 700], italic: true },
  { name: 'DM Serif Display', category: 'Modern serif', weights: [400], italic: true },
  { name: 'DM Serif Text', category: 'Modern serif', weights: [400], italic: true },
  { name: 'Source Serif 4', category: 'Modern serif', weights: [400, 600, 700], italic: true },
  { name: 'Noto Serif', category: 'Modern serif', weights: [400, 700], italic: true },
  { name: 'Frank Ruhl Libre', category: 'Modern serif', weights: [400, 500, 700, 900], italic: false },

  /* ---- Sans serif ----------------------------------------------------- */
  { name: 'Montserrat', category: 'Sans serif', weights: [300, 400, 500, 600, 700, 800], italic: true },
  { name: 'Poppins', category: 'Sans serif', weights: [300, 400, 500, 600, 700, 800], italic: true },
  { name: 'Raleway', category: 'Sans serif', weights: [300, 400, 500, 600, 700, 800], italic: true },
  { name: 'Josefin Sans', category: 'Sans serif', weights: [300, 400, 500, 600, 700], italic: true },
  { name: 'Work Sans', category: 'Sans serif', weights: [300, 400, 500, 600, 700, 800], italic: true },
  { name: 'Inter', category: 'Sans serif', weights: [300, 400, 500, 600, 700, 800], italic: false },
  { name: 'Lato', category: 'Sans serif', weights: [300, 400, 700, 900], italic: true },
  { name: 'Open Sans', category: 'Sans serif', weights: [400, 500, 600, 700, 800], italic: true },
  { name: 'Nunito', category: 'Sans serif', weights: [400, 600, 700, 800, 900], italic: true },
  { name: 'Nunito Sans', category: 'Sans serif', weights: [400, 600, 700, 800], italic: true },
  { name: 'Quicksand', category: 'Sans serif', weights: [400, 500, 600, 700], italic: false },
  { name: 'DM Sans', category: 'Sans serif', weights: [400, 500, 700], italic: true },
  { name: 'Manrope', category: 'Sans serif', weights: [400, 500, 600, 700, 800], italic: false },
  { name: 'Rubik', category: 'Sans serif', weights: [400, 500, 600, 700, 800], italic: true },
  { name: 'Jost', category: 'Sans serif', weights: [300, 400, 500, 600, 700], italic: true },
  { name: 'Archivo', category: 'Sans serif', weights: [400, 500, 600, 700, 800], italic: true },
  { name: 'Barlow', category: 'Sans serif', weights: [300, 400, 500, 600, 700], italic: true },
  { name: 'Mulish', category: 'Sans serif', weights: [400, 500, 600, 700, 800], italic: true },

  /* ---- Display -------------------------------------------------------- */
  { name: 'Oswald', category: 'Display', weights: [300, 400, 500, 600, 700], italic: false },
  { name: 'Bebas Neue', category: 'Display', weights: [400], italic: false },
  { name: 'Anton', category: 'Display', weights: [400], italic: false },
  { name: 'Abril Fatface', category: 'Display', weights: [400], italic: false },
  { name: 'Alfa Slab One', category: 'Display', weights: [400], italic: false },
  { name: 'Fjalla One', category: 'Display', weights: [400], italic: false },
  { name: 'Righteous', category: 'Display', weights: [400], italic: false },
  { name: 'Yeseva One', category: 'Display', weights: [400], italic: false },
  { name: 'Lobster', category: 'Display', weights: [400], italic: false },
  { name: 'Passion One', category: 'Display', weights: [400, 700, 900], italic: false },
  { name: 'Monoton', category: 'Display', weights: [400], italic: false },
  { name: 'Bungee', category: 'Display', weights: [400], italic: false },
  { name: 'Comfortaa', category: 'Display', weights: [400, 500, 600, 700], italic: false },
  { name: 'Staatliches', category: 'Display', weights: [400], italic: false },

  /* ---- Script --------------------------------------------------------- */
  { name: 'Great Vibes', category: 'Script', weights: [400], italic: false },
  { name: 'Dancing Script', category: 'Script', weights: [400, 500, 600, 700], italic: false },
  { name: 'Pinyon Script', category: 'Script', weights: [400], italic: false },
  { name: 'Parisienne', category: 'Script', weights: [400], italic: false },
  { name: 'Sacramento', category: 'Script', weights: [400], italic: false },
  { name: 'Allura', category: 'Script', weights: [400], italic: false },
  { name: 'Alex Brush', category: 'Script', weights: [400], italic: false },
  { name: 'Tangerine', category: 'Script', weights: [400, 700], italic: false },
  { name: 'Yellowtail', category: 'Script', weights: [400], italic: false },
  { name: 'Satisfy', category: 'Script', weights: [400], italic: false },
  { name: 'Cookie', category: 'Script', weights: [400], italic: false },
  { name: 'Kaushan Script', category: 'Script', weights: [400], italic: false },
  { name: 'Petit Formal Script', category: 'Script', weights: [400], italic: false },
  { name: 'Mr Dafoe', category: 'Script', weights: [400], italic: false },
  { name: 'Pacifico', category: 'Script', weights: [400], italic: false },

  /* ---- Handwritten ---------------------------------------------------- */
  { name: 'Caveat', category: 'Handwritten', weights: [400, 500, 600, 700], italic: false },
  { name: 'Shadows Into Light', category: 'Handwritten', weights: [400], italic: false },
  { name: 'Indie Flower', category: 'Handwritten', weights: [400], italic: false },
  { name: 'Amatic SC', category: 'Handwritten', weights: [400, 700], italic: false },
  { name: 'Permanent Marker', category: 'Handwritten', weights: [400], italic: false },
  { name: 'Patrick Hand', category: 'Handwritten', weights: [400], italic: false },
  { name: 'Gochi Hand', category: 'Handwritten', weights: [400], italic: false },
  { name: 'Kalam', category: 'Handwritten', weights: [300, 400, 700], italic: false },
  { name: 'Reenie Beanie', category: 'Handwritten', weights: [400], italic: false },
  { name: 'Homemade Apple', category: 'Handwritten', weights: [400], italic: false },

  /* ---- Slab ----------------------------------------------------------- */
  { name: 'Roboto Slab', category: 'Slab', weights: [300, 400, 500, 700, 900], italic: false },
  { name: 'Bitter', category: 'Slab', weights: [400, 500, 600, 700, 800], italic: true },
  { name: 'Zilla Slab', category: 'Slab', weights: [400, 500, 600, 700], italic: true },
  { name: 'Arvo', category: 'Slab', weights: [400, 700], italic: true },
  { name: 'Josefin Slab', category: 'Slab', weights: [400, 500, 600, 700], italic: true },

  /* ---- Monospace ------------------------------------------------------ */
  { name: 'JetBrains Mono', category: 'Monospace', weights: [400, 500, 700], italic: true },
  { name: 'Roboto Mono', category: 'Monospace', weights: [400, 500, 700], italic: true },
  { name: 'Space Mono', category: 'Monospace', weights: [400, 700], italic: true },
  { name: 'IBM Plex Mono', category: 'Monospace', weights: [400, 500, 700], italic: true },
  { name: 'Source Code Pro', category: 'Monospace', weights: [400, 500, 700], italic: false },
];

export const FONT_NAMES = FONT_CATALOG.map((f) => f.name);
export const FONT_BY_NAME = FONT_CATALOG.reduce((m, f) => { m[f.name] = f; return m; }, {});
export const WEIGHTS_BY_NAME = FONT_CATALOG.reduce((m, f) => { m[f.name] = f.weights; return m; }, {});

// A small default subset loaded eagerly on first paint so the initial demo and
// picker feel instant. The rest load lazily on demand.
export const DEFAULT_FONTS = [
  'Playfair Display', 'Cormorant Garamond', 'EB Garamond', 'Cinzel', 'Lora',
  'Merriweather', 'Montserrat', 'Poppins', 'Raleway', 'Josefin Sans', 'Oswald',
  'Bebas Neue', 'Abril Fatface', 'Dancing Script', 'Great Vibes', 'Pinyon Script',
  'Parisienne', 'Sacramento',
];

export function fontsByCategory() {
  const out = {};
  for (const cat of FONT_CATEGORIES) out[cat] = [];
  for (const f of FONT_CATALOG) (out[f.category] || (out[f.category] = [])).push(f);
  return out;
}
