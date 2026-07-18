// ============================================================
// SeoVisual - the animated hero diagram for every /pages/:slug page.
// One component renders a DIFFERENT, on-brand, animated schematic per
// entry.type, reading real fields from the entry (migration source,
// the two competitors on a versus table, the glossary term, the tool on
// an integration page, and so on). CSS-driven, looping, 60fps
// transform / opacity / stroke motion, frozen under prefers-reduced-
// motion. Decorative, so aria-hidden. NO em-dash / en-dash. ASCII only.
// ============================================================
import React, { useEffect, useState } from 'react';
import { Icon } from '../../components/icons.jsx';
import './seo-visuals.css';

/* ---------- small hooks / helpers ---------- */
function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setR(mq.matches);
    const h = () => setR(mq.matches);
    mq.addEventListener ? mq.addEventListener('change', h) : mq.addListener(h);
    return () => { mq.removeEventListener ? mq.removeEventListener('change', h) : mq.removeListener(h); };
  }, []);
  return r;
}

function useCountUp(target, reduced, { duration = 1400, decimals = 0 } = {}) {
  const [v, setV] = useState(reduced ? target : 0);
  useEffect(() => {
    if (reduced) { setV(target); return; }
    let raf, t0 = null;
    const tick = (t) => {
      if (t0 == null) t0 = t;
      const p = Math.min(1, (t - t0) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      setV(target * e);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, reduced, duration]);
  return decimals ? v.toFixed(decimals) : Math.round(v).toString();
}

function useTypewriter(text, reduced, { speed = 30, startDelay = 500, hold = 3400 } = {}) {
  const [n, setN] = useState(reduced ? text.length : 0);
  useEffect(() => {
    if (reduced) { setN(text.length); return; }
    const timers = [];
    const T = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
    let i = 0;
    const loop = () => {
      i = 0; setN(0);
      const step = () => {
        i += 1; setN(i);
        if (i < text.length) T(step, speed + Math.random() * 28);
        else T(loop, hold);
      };
      T(step, startDelay);
    };
    loop();
    return () => timers.forEach(clearTimeout);
  }, [text, reduced, speed, startDelay, hold]);
  return { shown: text.slice(0, n), done: n >= text.length };
}

function monogram(name) {
  const clean = (name || '').replace(/[^a-zA-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return 'X';
  const parts = clean.split(' ');
  if (parts.length >= 2 && parts[1]) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}
const isArdovo = (s) => /^\s*rally\s*$/i.test(s || '');
const truncate = (s, n) => (s && s.length > n ? s.slice(0, n - 1).trimEnd() + '.' : s || '');

/* Derive the "other product" name for a page from its richest field. */
function otherName(entry) {
  const e = entry || {};
  if (e.type === 'migration') {
    const eb = (e.eyebrow || '').replace(/^migrate from\s*/i, '').trim();
    if (eb) return eb;
    const m = (e.title || '').match(/from\s+(.+?)\s+to\s+rally/i);
    return (m && m[1]) || 'your old CRM';
  }
  if (e.type === 'alternative') {
    const eb = (e.eyebrow || '').replace(/\s*alternatives?\s*$/i, '').trim();
    if (eb) return eb;
    const m = (e.title || '').match(/best\s+(.+?)\s+alternatives/i);
    return (m && m[1]) || 'your platform';
  }
  if (e.type === 'integration') return e.tool || (e.title || '').replace(/\s*(integration|for rally).*/i, '').trim() || 'your tool';
  return e.title || 'your tool';
}

function versusPair(entry) {
  const cols = entry && entry.table && entry.table.columns;
  let a = cols && cols[1];
  let b = cols && cols[2];
  if (!a || !b) {
    const parts = (entry.eyebrow || entry.title || '').split(/\s+vs\.?\s+/i);
    a = a || (parts[0] || 'Tool A').replace(/^rally\s+vs\s+/i, '').trim();
    b = b || (parts[1] || 'Tool B').trim();
  }
  return [a, b];
}

/* ---------- shared frame ---------- */
function Frame({ label, children }) {
  return (
    <div className="sv-frame">
      <div className="sv-head">
        {label}
        <span className="sv-live"><span className="sv-dot" /> Live</span>
      </div>
      {children}
    </div>
  );
}

function ArdovoMark({ size = 44 }) {
  return (
    <span className="sv-mono sv-mono-rally" style={{ width: size, height: size }}>
      <Icon name="sparkles" size={Math.round(size * 0.42)} />
    </span>
  );
}

/* ============================================================
   MIGRATION
   ============================================================ */
function MigrationVisual({ entry }) {
  const src = otherName(entry);
  const mono = monogram(src);
  const recs = [0, 1, 2, 3];
  const maps = [['Account', 'Company'], ['Opportunity', 'Deal'], ['Stage', 'Stage']];
  return (
    <Frame label={`Migrate from ${truncate(src, 16)}`}>
      <svg className="sv-svg" viewBox="0 0 300 96" preserveAspectRatio="xMidYMid meet" aria-hidden>
        <defs>
          <linearGradient id="svMigArdovo" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#0e9f8f" /><stop offset="1" stopColor="#0b8578" />
          </linearGradient>
          <linearGradient id="svMigRec" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#0e9f8f" /><stop offset="1" stopColor="#14b8a6" />
          </linearGradient>
        </defs>
        {/* source node */}
        <g>
          <rect x="6" y="26" width="44" height="44" rx="12" fill="#2a2f3a" />
          <text x="28" y="53" textAnchor="middle" fill="#fff" fontSize="15" fontWeight="800">{mono}</text>
          <text x="28" y="84" textAnchor="middle" fill="var(--m-ink3)" fontSize="9" fontWeight="700">{truncate(src, 12)}</text>
        </g>
        {/* pipe */}
        <rect x="58" y="41" width="184" height="14" rx="7" fill="var(--m-line)" />
        {recs.map((i) => (
          <rect key={i} className="sv-mig-rec" x="62" y="44" width="20" height="8" rx="4" fill="url(#svMigRec)"
            style={{ animation: `svkStream 3.2s linear ${i * 0.55}s infinite` }} />
        ))}
        {/* rally node */}
        <g>
          <rect x="248" y="24" width="46" height="48" rx="12" fill="url(#svMigArdovo)" />
          <g transform="translate(271,44)" fill="#fff">
            <path transform="translate(-8,-8) scale(.66)" d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
          </g>
          <text x="271" y="84" textAnchor="middle" fill="var(--m-accent)" fontSize="9" fontWeight="800">Ardovo</text>
        </g>
      </svg>
      <ul className="sv-map">
        {maps.map(([from, to], i) => (
          <li key={i}>
            <span className="sv-from">{from}</span>
            <span className="sv-arrow"><Icon name="chevronRight" size={13} /></span>
            <span className="sv-to">{to}</span>
            <span className="sv-mapcheck"><Icon name="check" size={11} stroke={3} /></span>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

/* ============================================================
   VERSUS / COMPARISON - dueling bars
   ============================================================ */
function Panel({ name, rally }) {
  const seed = (name || '').length;
  const base = rally ? [92, 86, 90] : [70 - (seed % 5) * 4, 58 - (seed % 4) * 4, 64 - (seed % 3) * 5];
  return (
    <div>
      <div className="sv-panel-name" style={rally ? { color: 'var(--m-accent)' } : undefined}>{truncate(name, 16)}</div>
      <div className="sv-bars">
        {base.map((w, i) => (
          <div key={i} className={`sv-bar-track`}>
            <span className={`sv-bar-fill ${rally ? '' : (i % 2 ? 'sv-bar-b' : 'sv-bar-a')}`}
              style={{ '--sv-w': `${w}%`, animationDelay: `${i * 0.12}s`, background: rally ? 'var(--m-grad)' : undefined }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function VersusVisual({ entry }) {
  const [a, b] = versusPair(entry);
  const rallyPresent = isArdovo(a) || isArdovo(b);
  const label = entry.type === 'comparison' ? `Ardovo vs ${truncate(otherLabel(a, b), 14)}` : `${truncate(a, 10)} vs ${truncate(b, 10)}`;
  return (
    <Frame label={label}>
      <div className="sv-duel">
        <span className="sv-duel-seam" />
        <span className="sv-duel-vs">VS</span>
        <Panel name={a} rally={isArdovo(a)} />
        <Panel name={b} rally={isArdovo(b)} />
      </div>
      {!rallyPresent && (
        <div className="sv-winner">
          <div className="sv-winner-row">
            <ArdovoMark size={20} />
            <span className="sv-winner-name">Ardovo</span>
            <span className="sv-winner-tag">Best fit</span>
          </div>
          <div className="sv-winner-track"><span className="sv-winner-fill" style={{ '--sv-w': '96%' }} /></div>
        </div>
      )}
    </Frame>
  );
}
function otherLabel(a, b) { return isArdovo(a) ? b : a; }

/* ============================================================
   RANKING - ranked bars, #1 crowned
   ============================================================ */
function RankingVisual({ entry }) {
  const items = (entry.items || [])
    .map((it) => ({ name: it.name, score: typeof it.score === 'number' ? it.score : 8 }))
    .sort((x, y) => y.score - x.score)
    .slice(0, 5);
  const list = items.length ? items : [
    { name: 'Ardovo', score: 9.5 }, { name: 'HubSpot', score: 9.1 },
    { name: 'Salesforce', score: 9.0 }, { name: 'Pipedrive', score: 8.4 }, { name: 'Zoho', score: 8.3 },
  ];
  const max = Math.max(...list.map((i) => i.score), 10);
  return (
    <Frame label={truncate(entry.title || 'The ranking', 26)}>
      <div className="sv-rank">
        {list.map((it, i) => (
          <div key={i} className={`sv-rank-row${i === 0 ? ' is-top' : ''}`}>
            <span className="sv-rank-num">{i + 1}</span>
            <div className="sv-rank-body">
              <div className="sv-rank-name">
                {truncate(it.name, 18)}
                {i === 0 && <span className="sv-crown"><Icon name="sparkles" size={12} /></span>}
              </div>
              <div className="sv-rank-track">
                <span className="sv-rank-fill" style={{ '--sv-w': `${Math.round((it.score / max) * 100)}%`, animationDelay: `${i * 0.14}s` }} />
              </div>
            </div>
            <span className="sv-rank-score">{it.score.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* ============================================================
   ALTERNATIVE - leaving X, Ardovo lights up and pulls items over
   ============================================================ */
function AlternativeVisual({ entry }) {
  const src = otherName(entry);
  return (
    <Frame label={`Leaving ${truncate(src, 14)}`}>
      <div className="sv-alt">
        <div className="sv-alt-card sv-alt-src">
          <div className="sv-alt-top"><span className="sv-mono" style={{ width: 30, height: 30, fontSize: 11, borderRadius: 9 }}>{monogram(src)}</span>
            <span className="sv-nodename">{truncate(src, 12)}</span></div>
          <span className="sv-alt-item w1" /><span className="sv-alt-item w2" /><span className="sv-alt-item w3" />
        </div>
        <div className="sv-cross" aria-hidden><span /><span /><span /></div>
        <div className="sv-alt-card sv-alt-rally">
          <div className="sv-alt-top"><ArdovoMark size={30} /><span className="sv-nodename">Ardovo</span></div>
          <span className="sv-alt-item w1" /><span className="sv-alt-item w2" /><span className="sv-alt-item w3" />
        </div>
      </div>
    </Frame>
  );
}

/* ============================================================
   GLOSSARY - concept funnel + count-up
   ============================================================ */
function glossaryMetric(term) {
  const t = (term || '').toLowerCase();
  if (/rate|percent|win|conversion|attainment/.test(t)) return { target: 68, suffix: '%', decimals: 0 };
  if (/coverage|ratio|multiple|weighted/.test(t)) return { target: 3.4, suffix: 'x', decimals: 1 };
  if (/revenue|arr|mrr|value|bookings|quota|acv|ltv|deal size/.test(t)) return { target: 1.24, prefix: '$', suffix: 'M', decimals: 2 };
  if (/cycle|days|time|velocity|age/.test(t)) return { target: 21, suffix: 'd', decimals: 0 };
  return { target: 94, suffix: '', decimals: 0 };
}
function GlossaryVisual({ entry }) {
  const reduced = useReducedMotion();
  const term = entry.term || entry.title || 'the metric';
  const m = glossaryMetric(term);
  const n = useCountUp(m.target, reduced, { decimals: m.decimals, duration: 1500 });
  return (
    <Frame label={truncate(term, 24)}>
      <div className="sv-metric">
        <div className="sv-metric-value"><b>{m.prefix || ''}{n}{m.suffix}</b></div>
        <div className="sv-metric-label">{truncate(term, 28)}</div>
      </div>
      <div className="sv-funnel">
        <div className="sv-funnel-bar">Aware</div>
        <div className="sv-funnel-bar">Engaged</div>
        <div className="sv-funnel-bar">Qualified</div>
        <div className="sv-funnel-bar">Won</div>
      </div>
    </Frame>
  );
}

/* ============================================================
   FEATURE - mini product demo card
   ============================================================ */
function FeatureVisual({ entry }) {
  const title = truncate(entry.h1 || entry.title || 'Feature', 22);
  return (
    <Frame label="Live in Ardovo">
      <div className="sv-demo-head">
        <span className="sv-mono sv-mono-rally" style={{ width: 30, height: 30, borderRadius: 9 }}><Icon name="sparkles" size={14} /></span>
        <span className="sv-demo-title">{title}</span>
        <span className="sv-toggle"><span /></span>
      </div>
      <div className="sv-demo-rows">
        <div className="sv-demo-row"><span className="sv-demo-avatar">NV</span><span className="sv-demo-line" style={{ width: '52%' }} /><span className="sv-demo-chip">Active</span></div>
        <div className="sv-demo-row is-hot"><span className="sv-demo-avatar" style={{ background: 'linear-gradient(135deg,#0e9f8f,#0e9f8f)' }}>MB</span><span className="sv-demo-line" style={{ width: '64%' }} /><span className="sv-demo-chip">Rook</span></div>
        <div className="sv-demo-row"><span className="sv-demo-avatar" style={{ background: 'linear-gradient(135deg,#e0752d,#14b8a6)' }}>PR</span><span className="sv-demo-line" style={{ width: '44%' }} /><span className="sv-demo-chip">Done</span></div>
      </div>
      <svg className="sv-spark" viewBox="0 0 200 48" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="svFeatStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#0e9f8f" /><stop offset="0.6" stopColor="#14b8a6" /><stop offset="1" stopColor="#0e9f8f" />
          </linearGradient>
        </defs>
        <path className="sv-spark-line" d="M2 40 L34 34 L66 36 L98 24 L130 26 L162 14 L198 6"
          fill="none" stroke="url(#svFeatStroke)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Frame>
  );
}

/* ============================================================
   INDUSTRY - mini KPI dashboard
   ============================================================ */
function IndustryVisual({ entry }) {
  const reduced = useReducedMotion();
  const name = entry.name || (entry.title || '').replace(/^best crm for\s*/i, '').trim() || 'your team';
  const deals = useCountUp(48, reduced, { duration: 1400 });
  const rev = useCountUp(1.2, reduced, { decimals: 1, duration: 1600 });
  const win = useCountUp(31, reduced, { duration: 1500 });
  return (
    <Frame label={truncate(`CRM for ${name}`, 26)}>
      <div className="sv-kpis">
        <div className="sv-kpi"><div className="sv-kpi-value">{deals}</div><div className="sv-kpi-label">Open deals</div></div>
        <div className="sv-kpi"><div className="sv-kpi-value accent">${rev}M</div><div className="sv-kpi-label">Pipeline</div></div>
        <div className="sv-kpi"><div className="sv-kpi-value">{win}%</div><div className="sv-kpi-label">Win rate</div></div>
      </div>
      <svg className="sv-spark" viewBox="0 0 200 48" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="svIndFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(14,159,143,.20)" /><stop offset="1" stopColor="rgba(14,159,143,0)" />
          </linearGradient>
        </defs>
        <path d="M2 38 L34 34 L66 36 L98 26 L130 28 L162 16 L198 8 L198 48 L2 48 Z" fill="url(#svIndFill)" />
        <path className="sv-spark-line" d="M2 38 L34 34 L66 36 L98 26 L130 28 L162 16 L198 8"
          fill="none" stroke="#0e9f8f" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Frame>
  );
}

/* ============================================================
   ROLE - day in the life task flow (light-up sequence)
   ============================================================ */
function RoleVisual({ entry }) {
  const name = entry.name || (entry.title || '').replace(/^crm for\s*/i, '').trim() || 'your day';
  const tasks = ['Rook enriches new leads', 'Deals routed to the right rep', 'Follow-ups drafted and sent', 'Forecast refreshed live', 'Weekly review, zero prep'];
  return (
    <Frame label={truncate(`A day for ${name}`, 26)}>
      <div className="sv-flow">
        {tasks.map((t, i) => (
          <div key={i} className="sv-flow-item">
            <span className="sv-flow-dot"><Icon name="check" size={12} stroke={3} /></span>
            <span>{t}</span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* ============================================================
   INTEGRATION - Ardovo <-> Tool connector (SVG), data both ways
   ============================================================ */
function IntegrationVisual({ entry }) {
  const tool = otherName(entry);
  const mono = monogram(tool);
  return (
    <Frame label={`Ardovo + ${truncate(tool, 14)}`}>
      <svg className="sv-svg" viewBox="0 0 300 116" preserveAspectRatio="xMidYMid meet" aria-hidden>
        <defs>
          <linearGradient id="svIntArdovo" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#0e9f8f" /><stop offset="1" stopColor="#0b8578" />
          </linearGradient>
        </defs>
        <line className="sv-int-wire" x1="96" y1="52" x2="204" y2="52" />
        {/* data dots both ways */}
        <g>
          <circle className="sv-int-dotr" cx="100" cy="52" r="3.4" fill="var(--m-accent)" />
          <circle className="sv-int-dotr d2" cx="100" cy="52" r="3.4" fill="var(--m-accent2)" />
          <circle className="sv-int-dotl" cx="200" cy="52" r="3.4" fill="var(--m-teal)" />
          <circle className="sv-int-dotl d2" cx="200" cy="52" r="3.4" fill="var(--m-teal)" />
        </g>
        {/* Ardovo core */}
        <g className="sv-int-core">
          <circle cx="56" cy="52" r="30" fill="url(#svIntArdovo)" />
          <g transform="translate(56,52)" fill="#fff">
            <path transform="translate(-12,-12)" d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
          </g>
        </g>
        <text className="sv-int-label" x="56" y="100" textAnchor="middle">Ardovo</text>
        {/* tool node */}
        <circle className="sv-int-node" cx="244" cy="52" r="30" fill="#fff" />
        <text className="sv-int-mono" x="244" y="58" textAnchor="middle" fill="var(--m-ink)">{mono}</text>
        <text className="sv-int-label" x="244" y="100" textAnchor="middle">{truncate(tool, 12)}</text>
      </svg>
    </Frame>
  );
}

/* ============================================================
   GUIDE / USECASE - numbered step flow
   ============================================================ */
function StepFlowVisual({ entry }) {
  let steps = (entry.steps || []).map((s) => (typeof s === 'string' ? s : s.h)).filter(Boolean).slice(0, 5);
  if (!steps.length) steps = ['Set the goal', 'Map the stages', 'Load real data', 'Let Rook run it', 'Review and refine'];
  return (
    <Frame label={truncate(entry.title || 'Step by step', 26)}>
      <div className="sv-flow">
        {steps.map((s, i) => (
          <div key={i} className="sv-flow-item">
            <span className="sv-flow-dot" style={{ animation: 'none', background: 'var(--m-accent)', borderColor: 'var(--m-accent)', color: '#fff' }}>{i + 1}</span>
            <span>{truncate(s, 34)}</span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* ============================================================
   TEMPLATE - a document / email that types itself, then "copy"
   ============================================================ */
const TEMPLATE_TEXT = "Hi Dana, thanks for the time today. Confirming the exec demo Thursday at 2pm. I will bring the security review and a phased rollout plan. Anything the committee needs first?";
function TemplateVisual({ entry }) {
  const reduced = useReducedMotion();
  const { shown, done } = useTypewriter(TEMPLATE_TEXT, reduced, { speed: 26 });
  return (
    <Frame label={truncate(entry.title || 'Template', 26)}>
      <div className="sv-doc">
        <div className="sv-doc-head"><span className="sv-doc-ic"><Icon name="mail" size={14} /></span> Ready-to-use template</div>
        <div className="sv-doc-body">
          {shown}{!done && <span className="sv-doc-cursor" />}
        </div>
        <div className="sv-doc-foot">
          <span className={`sv-copy${done ? '' : ' is-off'}`}><Icon name="copy" size={12} /> {done ? 'Copied' : 'Copy'}</span>
        </div>
      </div>
    </Frame>
  );
}

/* ============================================================
   DEFAULT - Rook builds card
   ============================================================ */
function DefaultVisual({ entry }) {
  const reduced = useReducedMotion();
  const n = useCountUp(1.24, reduced, { decimals: 2, duration: 1600 });
  return (
    <Frame label={truncate(entry.category || 'Powered by Rook', 26)}>
      <div className="sv-rook">
        <span className="sv-rook-mark"><Icon name="sparkles" size={18} /></span>
        <div>
          <div className="sv-rook-title">Rook is on it</div>
          <div className="sv-think" aria-hidden><span /><span /><span /></div>
        </div>
      </div>
      <div className="sv-metric" style={{ marginBottom: 8 }}>
        <div className="sv-metric-value"><b>${n}M</b></div>
        <div className="sv-metric-label">Pipeline, alive on first load</div>
      </div>
      <svg className="sv-spark" viewBox="0 0 200 48" preserveAspectRatio="none" aria-hidden>
        <path className="sv-spark-line" d="M2 40 L34 36 L66 30 L98 32 L130 20 L162 16 L198 6"
          fill="none" stroke="#0e9f8f" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Frame>
  );
}

/* ============================================================
   ROUTER
   ============================================================ */
const BY_TYPE = {
  migration: MigrationVisual,
  versus: VersusVisual,
  comparison: VersusVisual,
  ranking: RankingVisual,
  alternative: AlternativeVisual,
  glossary: GlossaryVisual,
  feature: FeatureVisual,
  industry: IndustryVisual,
  role: RoleVisual,
  integration: IntegrationVisual,
  guide: StepFlowVisual,
  howto: StepFlowVisual,
  usecase: StepFlowVisual,
  template: TemplateVisual,
};

export default function SeoVisual({ entry }) {
  if (!entry) return null;
  const Cmp = BY_TYPE[entry.type] || DefaultVisual;
  return (
    <div className="sv-wrap" aria-hidden>
      <Cmp entry={entry} />
    </div>
  );
}
