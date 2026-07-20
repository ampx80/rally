// ============================================================
// COMPANION VOICE  (provider-agnostic voice adapter + client tools)
//
// Works TODAY with zero keys (Web Speech) and upgrades automatically when
// keys exist:
//   PREFERRED  VAPI            (VITE_VAPI_PUBLIC_KEY set -> web SDK from CDN)
//   FALLBACK A OpenAI Realtime (reuses src/lib/rook-realtime.js startRealtime)
//   FALLBACK B Web Speech      (speechSynthesis + SpeechRecognition + typed)
//
// CLIENT TOOLS (work with every provider, all client-side):
//   highlight(target)  self-contained spotlight overlay (our own, not TrainingMode)
//   scrollTo(target)   smooth-scroll the matched element into view
//   navigate(route)    SPA navigation via an 'ardova:navigate' event
//   setLesson(which)   'next' | 'prev' | index
//   celebrate()        confetti burst
//
// ASCII only. No em-dash / no en-dash. Normal hyphen only.
// ============================================================
import { TARGET_MAP, SYSTEM_PROMPT } from './training-companion.js';
import { startRealtime } from './rook-realtime.js';
import {
  getCurrentUser, getContacts, getCompanies, getDeals, getActivities,
  pipelineValue, weightedForecast, winRate, openDeals,
} from './store.js';

/* ============================================================
   TARGET RESOLUTION + SPOTLIGHT OVERLAY (self-contained)
   ============================================================ */

// Resolve a friendly target name (or a raw CSS selector) to a live element.
// Every map value is a comma list, so we return the first match found.
export function resolveTarget(target) {
  if (!target) return null;
  if (target instanceof Element) return target;
  const sel = TARGET_MAP[target] || String(target);
  for (const part of sel.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    try {
      const el = document.querySelector(trimmed);
      if (el) return el;
    } catch { /* invalid selector, skip */ }
  }
  return null;
}

let spotlightEls = null;
let spotlightTimer = null;

// Build our OWN spotlight: a dim scrim with a punched-out ring around the
// target plus a small caption. Nothing imported from TrainingMode.
export function spotlight(el, label = '', ms = 4200) {
  clearSpotlight();
  if (!el) return () => {};
  const reduce = typeof window !== 'undefined' && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const rect = el.getBoundingClientRect();
  const pad = 8;
  const top = Math.max(0, rect.top - pad);
  const left = Math.max(0, rect.left - pad);
  const width = Math.min(window.innerWidth, rect.width + pad * 2);
  const height = Math.min(window.innerHeight, rect.height + pad * 2);

  const ring = document.createElement('div');
  ring.className = 'tc-spotlight';
  ring.style.cssText = [
    'position:fixed',
    `top:${top}px`, `left:${left}px`, `width:${width}px`, `height:${height}px`,
    'border-radius:14px',
    'box-shadow:0 0 0 9999px rgba(12,16,26,.55), 0 0 0 3px var(--ai, #7c5cf7)',
    'z-index:2147483000', 'pointer-events:none',
    `transition:${reduce ? 'none' : 'top .35s var(--ease,ease), left .35s var(--ease,ease), width .35s var(--ease,ease), height .35s var(--ease,ease)'}`,
    reduce ? '' : 'animation:tcPulse 1.6s ease-in-out infinite',
  ].join(';');

  const cap = document.createElement('div');
  if (label) {
    cap.className = 'tc-spotlight-cap';
    cap.textContent = label;
    const capTop = top + height + 10;
    const putBelow = capTop + 40 < window.innerHeight;
    cap.style.cssText = [
      'position:fixed',
      `left:${Math.min(left, window.innerWidth - 260)}px`,
      putBelow ? `top:${capTop}px` : `top:${Math.max(8, top - 44)}px`,
      'max-width:260px', 'z-index:2147483001', 'pointer-events:none',
      'background:var(--ai,#7c5cf7)', 'color:#fff', 'font-weight:700',
      'font-size:13px', 'line-height:1.35', 'padding:8px 12px', 'border-radius:10px',
      'box-shadow:0 10px 30px -8px rgba(91,75,245,.6)',
    ].join(';');
  }

  document.body.appendChild(ring);
  if (label) document.body.appendChild(cap);
  spotlightEls = [ring, label ? cap : null].filter(Boolean);
  if (ms > 0) spotlightTimer = setTimeout(clearSpotlight, ms);
  return clearSpotlight;
}

export function clearSpotlight() {
  if (spotlightTimer) { clearTimeout(spotlightTimer); spotlightTimer = null; }
  if (spotlightEls) { spotlightEls.forEach(e => { try { e.remove(); } catch {} }); spotlightEls = null; }
}

export function smoothScrollTo(el) {
  if (!el) return false;
  try { el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }); return true; }
  catch { try { el.scrollIntoView(); return true; } catch { return false; } }
}

/* Lightweight confetti burst (self-contained, respects reduced motion). */
export function celebrateBurst() {
  const reduce = typeof window !== 'undefined' && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  const colors = ['#7c5cf7', '#0e9f8f', '#f4b942', '#ef6f6c', '#4a3ce0', '#1a7f52'];
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483002;pointer-events:none;overflow:hidden';
  const cx = window.innerWidth - 210;
  const cy = window.innerHeight - 120;
  for (let i = 0; i < 60; i++) {
    const p = document.createElement('span');
    const size = 6 + Math.random() * 7;
    const angle = Math.random() * Math.PI * 2;
    const dist = 90 + Math.random() * 190;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 120;
    p.style.cssText = [
      'position:absolute', `left:${cx}px`, `top:${cy}px`,
      `width:${size}px`, `height:${size * 0.6}px`,
      `background:${colors[i % colors.length]}`, 'border-radius:2px',
      `transform:translate(0,0) rotate(${Math.random() * 360}deg)`,
      'opacity:1', 'transition:transform 1.1s cubic-bezier(.22,1,.36,1), opacity 1.1s ease',
    ].join(';');
    wrap.appendChild(p);
    requestAnimationFrame(() => {
      p.style.transform = `translate(${dx}px, ${dy + 260}px) rotate(${Math.random() * 720}deg)`;
      p.style.opacity = '0';
    });
  }
  document.body.appendChild(wrap);
  setTimeout(() => { try { wrap.remove(); } catch {} }, 1300);
}

/* ============================================================
   CLIENT TOOL FACTORY
   The panel passes in its react-router navigate + lesson controller, so the
   SAME tool set is handed to every provider (Vapi, Realtime, Web Speech).
   ============================================================ */
export function makeClientTools({ navigate, setLesson } = {}) {
  const doHighlight = (target, label = '') => {
    const run = () => {
      const el = resolveTarget(target);
      if (el) { smoothScrollTo(el); spotlight(el, label); return true; }
      return false;
    };
    if (run()) return { ok: true, target };
    // Element may not be mounted yet right after a navigate; retry once.
    setTimeout(run, 450);
    return { ok: true, target, retried: true };
  };
  return {
    highlight: (target, label) => doHighlight(target, label),
    scrollTo: (target) => {
      const el = resolveTarget(target);
      if (el) { smoothScrollTo(el); return { ok: true, target }; }
      setTimeout(() => { const e2 = resolveTarget(target); if (e2) smoothScrollTo(e2); }, 450);
      return { ok: true, target, retried: true };
    },
    navigate: (route) => {
      const to = String(route || '').trim();
      if (!to) return { ok: false };
      if (navigate) { try { navigate(to); return { ok: true, to }; } catch {} }
      // Fallback: pushState + notify the panel/router via a custom event.
      try {
        window.history.pushState({}, '', to);
        window.dispatchEvent(new CustomEvent('ardova:navigate', { detail: { to } }));
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch {}
      return { ok: true, to };
    },
    setLesson: (which) => { try { setLesson?.(which); } catch {} return { ok: true, which }; },
    celebrate: () => { celebrateBurst(); return { ok: true }; },
  };
}

// The tool argument contract, shared across providers (declared for Vapi + docs).
export const TOOL_SCHEMAS = [
  { name: 'highlight', description: 'Spotlight an element on screen so the user can see what you are talking about.',
    parameters: { type: 'object', properties: { target: { type: 'string', description: 'A friendly name (pipeline, contacts, rook, forecast, search, nav) or a raw CSS selector.' }, label: { type: 'string', description: 'Short caption shown by the spotlight.' } }, required: ['target'] } },
  { name: 'scrollTo', description: 'Smooth-scroll an element into view.',
    parameters: { type: 'object', properties: { target: { type: 'string' } }, required: ['target'] } },
  { name: 'navigate', description: 'Move to a route in the app while teaching.',
    parameters: { type: 'object', properties: { route: { type: 'string', description: 'A route path like /deals or /forecasting.' } }, required: ['route'] } },
  { name: 'setLesson', description: 'Advance the lesson track.',
    parameters: { type: 'object', properties: { which: { type: 'string', description: '"next", "prev", or a numeric index.' } }, required: ['which'] } },
  { name: 'celebrate', description: 'Fire a celebration when the user completes something.',
    parameters: { type: 'object', properties: {} } },
];

// Route a tool call (from any provider) into the shared client tools.
export function runTool(tools, name, args = {}) {
  if (!tools) return { ok: false, error: 'no tools' };
  switch (name) {
    case 'highlight': return tools.highlight(args.target, args.label);
    case 'scrollTo': return tools.scrollTo(args.target);
    case 'navigate': return tools.navigate(args.route || args.to || args.destination);
    case 'setLesson': return tools.setLesson(args.which ?? args.index ?? args.lesson);
    case 'celebrate': return tools.celebrate();
    default: return { ok: false, error: `unknown tool ${name}` };
  }
}

/* ============================================================
   WEB SPEECH PRIMITIVES (Fallback B - always available where supported)
   ============================================================ */
export const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
export const recognitionSupported = typeof window !== 'undefined'
  && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

// Strip characters that read badly aloud (and any stray dashes).
function forSpeech(t) {
  return String(t || '')
    .replace(/[\u2019\u2018]/g, "'").replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2014\u2013]/g, '-')
    .replace(/[*_`#>]/g, '').replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ').trim();
}

export function speak(text, { onStart, onEnd, rate = 1.05, pitch = 1.08 } = {}) {
  if (!speechSupported) { onEnd?.(); return () => {}; }
  const synth = window.speechSynthesis;
  try { synth.cancel(); } catch {}
  const u = new SpeechSynthesisUtterance(forSpeech(text));
  u.rate = rate; u.pitch = pitch;
  // Prefer a lively English voice when the browser exposes one.
  try {
    const voices = synth.getVoices() || [];
    const pick = voices.find(v => /en[-_]US/i.test(v.lang) && /(Google|Samantha|Zira|Aria|Jenny)/i.test(v.name))
      || voices.find(v => /en[-_]US/i.test(v.lang)) || voices.find(v => /^en/i.test(v.lang));
    if (pick) u.voice = pick;
  } catch {}
  u.onstart = () => onStart?.();
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  try { synth.speak(u); } catch { onEnd?.(); }
  return () => { try { synth.cancel(); } catch {} };
}

export function stopSpeaking() { if (speechSupported) { try { window.speechSynthesis.cancel(); } catch {} } }

// Create a one-shot recognizer. Caller wires onResult / onEnd / onError.
export function createRecognition({ onResult, onEnd, onError, interim = false } = {}) {
  if (!recognitionSupported) return null;
  try {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = 'en-US'; rec.interimResults = interim; rec.continuous = false;
    rec.onresult = (e) => {
      let txt = '';
      for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
      onResult?.(txt.trim(), e.results[e.results.length - 1]?.isFinal !== false);
    };
    rec.onend = () => onEnd?.();
    rec.onerror = (e) => onError?.(e);
    return rec;
  } catch { return null; }
}

/* ============================================================
   GROUNDED Q&A  (env-gated, via /api/rook in training mode)
   Answers any question and steers back to Ardova. If /api/rook is
   unavailable, returns null so the caller can speak the scripted steer-back.
   ============================================================ */
function miniSnapshot(path) {
  try {
    const cu = getCurrentUser();
    const deals = getDeals();
    return {
      currentUser: { name: cu?.name, title: cu?.title },
      counts: {
        contacts: getContacts().length, companies: getCompanies().length,
        deals: deals.length, openDeals: openDeals().length,
        wonDeals: deals.filter(d => d.status === 'won').length,
        activities: getActivities().length,
      },
      revenue: { pipeline: pipelineValue(), forecast: Math.round(weightedForecast()), winRate: winRate() },
      focus: null,
    };
  } catch { return null; }
}

// Steer-back line used when there is no backend (keeps the promise alive).
export function steerBackLine(topic) {
  const t = String(topic || '').trim();
  const lead = t ? `Great question about ${t}. ` : 'Great question. ';
  return `${lead}Here is how that connects to Ardova: everything you need lives in one of these screens, so let me point you to the right one and we keep rolling.`;
}

export async function askRook({ question, history = [], path = '' } = {}) {
  const messages = [
    ...history.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: question },
  ];
  try {
    const r = await fetch('/api/rook', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        snapshot: miniSnapshot(path),
        // Training mode makes Rook a patient trainer; voice keeps replies short.
        context: { path, mode: 'training', voice: true, trainingSystem: SYSTEM_PROMPT },
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.ok) return null;
    return { reply: data.reply, nav: data.nav || null, actions: data.actions || [] };
  } catch { return null; }
}

/* ============================================================
   VAPI  (Preferred - loaded from CDN only when a public key exists)
   ============================================================ */
async function startVapi({ publicKey, systemPrompt, greeting, tools, handlers }) {
  const H = handlers || {};
  const Vapi = (await import('https://esm.sh/@vapi-ai/web')).default;
  const vapi = new Vapi(publicKey);

  const assistant = {
    firstMessage: greeting,
    model: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }],
      tools: TOOL_SCHEMAS.map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } })),
    },
    voice: { provider: 'vapi', voiceId: 'Elliot' },
    transcriber: { provider: 'deepgram', model: 'nova-2', language: 'en-US' },
  };

  const handleTool = (name, args) => {
    try { return runTool(tools, name, args || {}); } catch (e) { return { ok: false, error: String(e) }; }
  };

  vapi.on('message', (msg) => {
    try {
      if (!msg) return;
      if (msg.type === 'transcript' && msg.transcriptType === 'final') {
        if (msg.role === 'user') H.onUserText?.(msg.transcript);
        else if (msg.role === 'assistant') H.onAssistantText?.(msg.transcript);
      }
      // Older + newer tool-call event shapes.
      if (msg.type === 'function-call' && msg.functionCall) {
        handleTool(msg.functionCall.name, msg.functionCall.parameters);
      }
      if (msg.type === 'tool-calls' && Array.isArray(msg.toolCalls)) {
        for (const tc of msg.toolCalls) {
          const fn = tc.function || tc;
          let a = fn.arguments; if (typeof a === 'string') { try { a = JSON.parse(a); } catch { a = {}; } }
          handleTool(fn.name, a);
        }
      }
    } catch {}
  });
  vapi.on('speech-start', () => H.onSpeaking?.(true));
  vapi.on('speech-end', () => H.onSpeaking?.(false));
  vapi.on('error', (e) => H.onError?.('vapi', e));

  await vapi.start(assistant);

  return {
    provider: 'vapi',
    stop() { try { vapi.stop(); } catch {} },
    setMuted(m) { try { vapi.setMuted(!!m); } catch {} },
    send(text) {
      try { vapi.send({ type: 'add-message', message: { role: 'user', content: text } }); return true; }
      catch { return false; }
    },
    say(text) { try { vapi.say(text); return true; } catch { return false; } },
  };
}

/* ============================================================
   OPENAI REALTIME  (Fallback A - reuses rook-realtime.js)
   ============================================================ */
// Map Rook's realtime tool names onto our client tools.
function routeRealtimeTool(tools, name, args = {}) {
  if (name === 'navigate') {
    const dest = String(args.destination || args.route || '').toLowerCase();
    const map = {
      home: '/app', deals: '/deals', pipeline: '/deals', leads: '/leads', contacts: '/contacts',
      companies: '/companies', activities: '/activities', 'my day': '/activities', forecasting: '/forecasting',
      dashboards: '/dashboards', reports: '/reports', campaigns: '/campaigns', sequences: '/sequences',
    };
    return tools.navigate(map[dest] || args.route || '/app');
  }
  if (name === 'highlight') return tools.highlight(args.target, args.label);
  return runTool(tools, name, args);
}

async function startRealtimeEngine({ tools, handlers }) {
  const H = handlers || {};
  const ctrl = await startRealtime({
    onUserText: (t) => H.onUserText?.(t),
    onAssistantText: (t) => H.onAssistantText?.(t),
    onSpeaking: (v) => H.onSpeaking?.(!!v),
    onTool: (name, args) => { try { return routeRealtimeTool(tools, name, args); } catch { return { ok: false }; } },
  });
  return {
    provider: 'realtime',
    stop() { try { ctrl.stop(); } catch {} },
    setMuted() {},
    send() { return false; },
    say() { return false; },
  };
}

/* ============================================================
   CONNECT  (Preferred -> Fallback A). Returns a live controller, or null
   when no keyed provider is available so the panel uses Web Speech (B).
   ============================================================ */
export async function connectRealtimeVoice({ systemPrompt, greeting, tools, handlers } = {}) {
  const H = handlers || {};
  let key = null;
  try { key = import.meta.env?.VITE_VAPI_PUBLIC_KEY; } catch { key = null; }

  if (key) {
    try {
      const ctrl = await startVapi({ publicKey: key, systemPrompt, greeting, tools, handlers: H });
      if (ctrl) return ctrl;
    } catch (e) { H.onError?.('vapi', e); }
  }
  try {
    const ctrl = await startRealtimeEngine({ tools, handlers: H });
    if (ctrl) return ctrl;
  } catch (e) { H.onError?.('realtime', e); }
  return null; // -> Web Speech fallback owned by the panel
}
