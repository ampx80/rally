// One-shot rebrand: Rally -> Ardovo across all user-visible surfaces.
// CASE-SENSITIVE on purpose so internal contracts stay intact:
//   - localStorage keys  rally_*      (lowercase) untouched
//   - custom events      rally:*      (lowercase) untouched
//   - LDS app_slug       'rally'      (lowercase) untouched
//   - identifiers        rallyCost, __rallyAdminBound, rallySpin  untouched
//   - vercel domain      rally-psi-five.vercel.app  untouched (not a brand domain)
// Only the brand word (Rally/RALLY) and brand domains (rally.app/.so) change.
import fs from 'fs';
import path from 'path';

const ROOTS = ['src', 'api', 'public'];
const SINGLE = ['index.html'];
const EXfrom = new Set(['node_modules', 'dist', '.git', 'tmp', 'coverage', '.vercel']);
const EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.json', '.md', '.txt', '.webmanifest', '.xml', '.svg']);

// Ordered: do domains first (lowercase, specific), then brand word, then all-caps.
const REPLACEMENTS = [
  [/rally\.app/g, 'ardovo.com'],
  [/rally\.so/g, 'ardovo.com'],
  [/RALLY/g, 'ARDOVO'],
  [/Rally/g, 'Ardovo'],
];

let filesChanged = 0, totalHits = 0;

function processFile(fp) {
  if (!EXT.has(path.extname(fp))) return;
  let src;
  try { src = fs.readFileSync(fp, 'utf8'); } catch { return; }
  let out = src, hits = 0;
  for (const [re, to] of REPLACEMENTS) {
    out = out.replace(re, () => { hits++; return to; });
  }
  if (hits > 0 && out !== src) {
    fs.writeFileSync(fp, out);
    filesChanged++; totalHits += hits;
  }
}

function walk(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (EXfrom.has(e.name)) continue;
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) walk(fp);
    else processFile(fp);
  }
}

for (const r of ROOTS) walk(r);
for (const f of SINGLE) processFile(f);

console.log(`Rebrand complete: ${filesChanged} files changed, ${totalHits} replacements.`);
