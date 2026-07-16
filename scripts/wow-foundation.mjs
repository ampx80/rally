import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const write = (p, s) => {
  fs.writeFileSync(path.join(root, p), s);
  console.log('wrote', p, s.length, 'bytes');
};

// ---------- index.css ----------
let css = read('src/index.css');

css = css.replace(
  /AI-native revenue platform\. The look:[\s\S]*?ASCII hyphen only\./,
  `AI-native revenue platform. Teal is the product accent.
   Indigo/violet is reserved for Rook and AI moments only.
   Narrow command spine + peek drawer, cool light content.
   Type floors: 17px body desktop / 16px mobile. Never smaller.
   NO em-dash or en-dash anywhere. ASCII hyphen only.`
);

css = css.replace(
  /\/\* --- Accent \(one confident color, electric indigo\) --- \*\/[\s\S]*?--nav-sec: #[^;]+;[^\n]*/,
  `/* --- Accent (teal = product; indigo = AI only) --- */
  --accent: #0e9f8f;
  --accent-600: #0b8578;
  --accent-700: #096b61;
  --accent-300: #5ecfc3;
  --accent-50: #e6f7f5;
  --accent-glow: 0 8px 24px rgba(14, 159, 143, .28);
  --accent-teal: #0e9f8f;
  --accent-purple: #7c5cf7;
  --ai: #7c5cf7;
  --ai-600: #6647e0;
  --ai-50: #f0ecfe;
  --ai-glow: 0 8px 24px rgba(124, 92, 247, .28);

  /* --- Ink + surfaces --- */
  --ink: #0e1116;
  --ink-2: #3a4150;
  --page: #f4f6f7;
  --paper: #ffffff;
  --line: #e5e9ed;
  --line-strong: #d0d6de;

  /* --- Command spine --- */
  --nav: #0b1214;
  --nav-2: #121a1d;
  --nav-line: #1e2a2e;
  --nav-text: #e8eef0;
  --nav-muted: #8a9aa0;
  --nav-active: #1a2c2f;
  --nav-sec: #a8b6bb`
);

css = css.replace(/--font-body: 'Inter'[^;]+;/, "--font-body: 'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;");
css = css.replace(/--font-display: 'Inter'[^;]+;/, "--font-display: 'Space Grotesk', 'Instrument Sans', sans-serif;");
css = css.replace(/--sidebar-w: 248px;/, '--sidebar-w: 72px;\n  --peek-w: 240px;');
css = css.replace(/--ease: cubic-bezier\(\.22, 1, \.36, 1\);/, '--ease: cubic-bezier(.32, .72, 0, 1);');
css = css.replace(/box-shadow: 0 0 0 3px rgba\(91, 75, 245, \.16\);/, 'box-shadow: 0 0 0 3px rgba(14, 159, 143, .16);');

if (!css.includes('.btn-ai ')) {
  css = css.replace(
    '.btn-danger:hover { background: var(--risk); color: #fff; }',
    `.btn-danger:hover { background: var(--risk); color: #fff; }
.btn-ai { background: var(--ai); color: #fff; box-shadow: var(--ai-glow); }
.btn-ai:hover { background: var(--ai-600); }`
  );
}

css = css.replace(
  '.card { background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-lg); box-shadow: var(--shadow-sm); }',
  '.card { background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-lg); box-shadow: none; }'
);
css = css.replace(
  `.card-hover { transition: transform .18s var(--ease), box-shadow .18s var(--ease), border-color .18s var(--ease); }
.card-hover:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); border-color: var(--line-strong); }`,
  `.card-hover { transition: border-color .18s var(--ease), box-shadow .18s var(--ease); }
.card-hover:hover { box-shadow: var(--shadow-sm); border-color: var(--line-strong); }`
);

css = css.replace(
  'background: radial-gradient(1200px 700px at 50% 40%, #1a1636, #0a0d13 70%); color: #fff; animation: launchOut .6s var(--ease) 1.9s forwards;',
  'background: radial-gradient(1200px 700px at 50% 40%, #0f2a28, #070d0e 70%); color: #fff; animation: launchOut .55s var(--ease) 1.65s forwards;'
);
css = css.replace(
  'background: linear-gradient(135deg, #6d5cf7, #4a3ce0); box-shadow: 0 20px 60px -12px rgba(91,75,245,.7);',
  'background: linear-gradient(135deg, #14b8a6, #0e9f8f); box-shadow: 0 20px 60px -12px rgba(14,159,143,.65);'
);
css = css.replace('.launch__word { font-size: 2.6rem; font-weight: 800;', '.launch__word { font-family: var(--font-display); font-size: 2.6rem; font-weight: 700;');
css = css.replace('.launch__tag { color: #a99ff9;', '.launch__tag { color: #5ecfc3;');
css = css.replace('animation: launchLoad 1.5s var(--ease) .5s forwards;', 'animation: launchLoad 1.25s var(--ease) .45s forwards;');

const spine = `

/* ============================================================
   COMMAND SPINE (matches App.jsx: spine-btn / peek-panel / apps-*)
   ============================================================ */
.rl-rail {
  width: var(--sidebar-w); z-index: 40; display: flex; flex-direction: column;
  align-items: center; position: fixed; inset: 0 auto 0 0; height: 100vh;
  border-right: 1px solid var(--nav-line);
  background:
    radial-gradient(120% 55% at 0% 0%, rgba(14,159,143,.2), transparent 55%),
    var(--nav);
}
.rl-rail--mobile { width: min(86vw, 320px) !important; align-items: stretch; }
.spine-logo-wrap { padding: 1rem 0 .6rem; flex: none; }
.spine-logo {
  width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center;
  background: linear-gradient(135deg, #14b8a6, #0e9f8f); color: #fff;
  box-shadow: var(--accent-glow);
}
.spine-nav { display: flex; flex-direction: column; align-items: center; gap: .25rem; flex: 1; width: 100%; padding: .25rem 0; overflow: hidden; }
.spine-btn {
  width: 52px; height: 52px; border-radius: 14px; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 0; border: none; cursor: pointer;
  background: transparent; color: var(--nav-muted); position: relative;
  text-decoration: none; transition: color .15s, background .15s, transform .15s var(--ease);
}
.spine-btn:hover { color: var(--nav-text); background: rgba(255,255,255,.06); transform: translateY(-1px); }
.spine-btn.is-active, .spine-btn.is-peeking {
  color: #fff; background: var(--nav-active);
  box-shadow: inset 3px 0 0 var(--accent), 0 0 0 1px rgba(14,159,143,.28);
}
.spine-btn.is-ai { color: #c4b5fd; }
.spine-btn.is-ai:hover, .spine-btn.is-ai.is-active {
  color: #fff; background: rgba(124,92,247,.22); box-shadow: inset 3px 0 0 var(--ai);
}
.spine-btn__label { display: none; }
.spine-avatar { padding: .85rem 0 1.1rem; flex: none; }
.peek-panel {
  position: fixed; top: 0; left: var(--sidebar-w); bottom: 0; width: var(--peek-w);
  z-index: 38; background: var(--nav-2); border-right: 1px solid var(--nav-line);
  box-shadow: 16px 0 40px rgba(0,0,0,.28); padding: .9rem .75rem; overflow-y: auto;
  animation: peekIn .18s var(--ease);
}
@keyframes peekIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: none; } }
.peek-panel__head {
  display: flex; align-items: center; gap: .5rem; color: #fff;
  font-family: var(--font-display); font-weight: 600; font-size: .95rem;
  padding: .35rem .5rem 1rem; letter-spacing: -.01em;
}
.peek-panel__list { display: flex; flex-direction: column; gap: .15rem; }
.apps-overlay {
  position: fixed; inset: 0; z-index: 90; background: rgba(7,13,14,.55);
  backdrop-filter: blur(8px); display: flex; align-items: flex-start; justify-content: center;
  padding: 4.5rem 1.5rem 2rem; animation: fadeUp .18s var(--ease);
}
.apps-modal {
  width: min(920px, 100%); max-height: min(78vh, 820px); overflow: hidden; display: flex; flex-direction: column;
  background: var(--paper); border: 1px solid var(--line); border-radius: 20px; box-shadow: var(--shadow-lg);
}
.apps-modal__head {
  display: flex; align-items: center; gap: .65rem; padding: 1rem 1.15rem; border-bottom: 1px solid var(--line); flex: none;
}
.apps-modal__head input {
  flex: 1; border: none; outline: none; background: transparent; font-size: 1.05rem; font-weight: 500;
}
.apps-modal__scroll { overflow: auto; padding: 1rem 1.15rem 1.35rem; }
.apps-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.1rem; }
.apps-cat__head {
  font-size: .68rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase;
  color: var(--n-600); margin-bottom: .45rem; padding: 0 .35rem;
}
.apps-cat__item {
  display: flex; align-items: center; gap: .55rem; padding: .55rem .6rem; border-radius: 10px;
  font-weight: 600; font-size: .9rem; color: var(--ink-2);
}
.apps-cat__item:hover { background: var(--accent-50); color: var(--accent-700); }
.rl-topbar.glass {
  background: color-mix(in srgb, var(--page) 82%, transparent); backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--line);
}
.ask-rook-chip {
  display: inline-flex; align-items: center; gap: .4rem; padding: .45rem .75rem; border-radius: 999px;
  border: 1px solid rgba(124,92,247,.28); background: var(--ai-50); color: var(--ai-600);
  font-weight: 700; font-size: .85rem; cursor: pointer;
}
.ask-rook-chip:hover { background: rgba(124,92,247,.16); }
.mission-pulse {
  position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: linear-gradient(180deg, var(--accent), transparent 70%); opacity: .7;
}
.mobile-quick { display: flex; flex-wrap: wrap; gap: .45rem; padding: 0 1rem 1rem; }
.mobile-quick__pill {
  display: inline-flex; align-items: center; gap: .4rem; padding: .45rem .7rem; border-radius: 999px;
  background: var(--nav-active); color: var(--nav-text); font-weight: 600; font-size: .82rem; border: none; cursor: pointer; text-decoration: none;
}
.mobile-quick__pill.is-ai { background: rgba(124,92,247,.22); color: #ddd6fe; }
`;

if (!css.includes('COMMAND SPINE (matches App.jsx')) css += spine;
write('src/index.css', css);

// ---------- marketing.css ----------
let mkt = read('src/marketing/marketing.css');
mkt = mkt.replace(
  /RALLY MARKETING - light, bright, premium\.[\s\S]*?ASCII hyphen only\./,
  `RALLY MARKETING - cool light canvas, teal product accent,
   violet reserved for Rook/AI. Instrument Sans + Space Grotesk.
   Scoped under .mkt so it never touches the product app.
   NO em-dash / en-dash. ASCII hyphen only.`
);
mkt = mkt.replace(/--m-accent: #5b4bf5;/, '--m-accent: #0e9f8f;');
mkt = mkt.replace(/--m-accent2: #a855f7;/, '--m-accent2: #7c5cf7;');
mkt = mkt.replace(/--m-teal: #0e9f9a;/, '--m-teal: #0e9f8f;');
mkt = mkt.replace(
  '--m-grad: linear-gradient(100deg, #5b4bf5, #a855f7 46%, #0e9f9a);',
  '--m-grad: linear-gradient(100deg, #0e9f8f, #14b8a6 42%, #7c5cf7);'
);
mkt = mkt.replace(
  "font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;",
  "font-family: 'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;"
);
mkt = mkt.replace('.mkt ::selection { background: rgba(91,75,245,.18); }', '.mkt ::selection { background: rgba(14,159,143,.18); }');
mkt = mkt.replace(
  'background: radial-gradient(circle, rgba(91,75,245,.22), transparent 70%)',
  'background: radial-gradient(circle, rgba(14,159,143,.22), transparent 70%)'
);
mkt = mkt.replace(
  'background: radial-gradient(circle, rgba(168,85,247,.18), transparent 70%)',
  'background: radial-gradient(circle, rgba(124,92,247,.12), transparent 70%)'
);
mkt = mkt.replace(
  'background: radial-gradient(circle, rgba(14,159,154,.14), transparent 70%)',
  'background: radial-gradient(circle, rgba(20,184,166,.14), transparent 70%)'
);
if (!mkt.includes("--m-display:")) {
  mkt = mkt.replace(
    '.mkt h1, .mkt h2, .mkt h3, .mkt h4, .mkt h5, .mkt-h1, .mkt-h2, .mkt-h3 { color: var(--m-ink); }',
    `.mkt h1, .mkt h2, .mkt h3, .mkt h4, .mkt h5, .mkt-h1, .mkt-h2, .mkt-h3 { color: var(--m-ink); font-family: 'Space Grotesk', 'Instrument Sans', sans-serif; }`
  );
}
mkt = mkt.replace('.m-sweep { animation: mSweep 1s var(--glide) both; }', '.m-sweep { animation: mSweep .75s var(--glide) both; }');
mkt = mkt.replace('.m-spring { animation: mSpringIn .58s var(--spring) both; }', '.m-spring { animation: mSpringIn .44s var(--spring) both; }');
mkt = mkt.replace('.mkt-spark-line.m-draw { animation: mDraw 1.2s var(--glide) forwards; }', '.mkt-spark-line.m-draw { animation: mDraw .9s var(--glide) forwards; }');
write('src/marketing/marketing.css', mkt);

// ---------- HeroStage timing ----------
let hero = read('src/marketing/HeroStage.jsx');
hero = hero.replace(
  `        if (i < SENTENCE.length) T(type, 30 + Math.random() * 34);
        else { T(() => setThinking(true), 260); T(afterThink, 1180); }
      };
      T(type, 520);

      function afterThink() {
        if (cancelled) return;
        setThinking(false);
        T(() => setStep(G_COMPANY), 80);
        T(() => setStep(G_CONTACTS), 640);
        T(() => setStep(G_DEAL), 1260);
        T(() => setStep(G_ADVANCE), 1980);
        T(() => setStep(G_SPARK), 2680);
        T(() => setStep(G_TASK0), 3380);
        T(() => setStep(G_TASK0 + 1), 3720);
        T(() => setStep(G_TASK0 + 2), 4060);
        T(() => setStep(G_TASK0 + 3), 4400);
        T(() => setStep(G_TASK0 + 4), 4740);
        T(() => setStamp(true), 5200);
        T(() => run(), 8800); // graceful reset + loop
      }`,
  `        if (i < SENTENCE.length) T(type, 22 + Math.random() * 26);
        else { T(() => setThinking(true), 195); T(afterThink, 885); }
      };
      T(type, 390);

      function afterThink() {
        if (cancelled) return;
        setThinking(false);
        T(() => setStep(G_COMPANY), 60);
        T(() => setStep(G_CONTACTS), 480);
        T(() => setStep(G_DEAL), 945);
        T(() => setStep(G_ADVANCE), 1485);
        T(() => setStep(G_SPARK), 2010);
        T(() => setStep(G_TASK0), 2535);
        T(() => setStep(G_TASK0 + 1), 2790);
        T(() => setStep(G_TASK0 + 2), 3045);
        T(() => setStep(G_TASK0 + 3), 3300);
        T(() => setStep(G_TASK0 + 4), 3555);
        T(() => setStamp(true), 3900);
        T(() => run(), 6600); // ~25% faster loop
      }`
);
hero = hero.replace('Built in 3.2s', 'Built in 2.4s');
hero = hero.replace('"Built in 3.2s" stamp', '"Built in 2.4s" stamp');
write('src/marketing/HeroStage.jsx', hero);

// ---------- UI avatar colors ----------
let ui = read('src/components/UI.jsx');
ui = ui.replace(
  "const AV_COLORS = ['#5b4bf5', '#0ea5a3', '#e0752d', '#c0392b', '#2563a8', '#8b3fd4', '#1a7f52', '#d4a017'];",
  "const AV_COLORS = ['#0e9f8f', '#0b8578', '#2563a8', '#c0392b', '#e0752d', '#7c5cf7', '#1a7f52', '#d4a017'];"
);
write('src/components/UI.jsx', ui);

console.log('foundation ok', {
  teal: read('src/index.css').includes('--accent: #0e9f8f'),
  spine: read('src/index.css').includes('spine-btn'),
  hero: read('src/marketing/HeroStage.jsx').includes('Built in 2.4s'),
  mkt: read('src/marketing/marketing.css').includes('--m-accent: #0e9f8f'),
});
