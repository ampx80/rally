// ============================================================
// LIFTOFF  (/liftoff)  -  the AI intake experience
// ------------------------------------------------------------
// The first thing a brand-new customer does. A sharp AI (Rook)
// personally interviews the org one big question at a time, then
// GENERATES a tailored deck for every layer of the company. Three
// phases in one page:
//   1) WIZARD      - one hero question per screen (Guided) or a
//                    conversational panel (Interview), plus voice.
//   2) GENERATION  - an animated "assembling your revenue org"
//                    reveal: modules light up, decks are built.
//   3) GALLERY     - a grid of generated decks, one per layer.
//
// LOCAL-FIRST: fully alive on first load. The engine
// (src/lib/liftoff-data.js) ships a seeded DEMO plan so the gallery
// is never empty. Any AI call is env-gated and degrades silently.
//
// ADDITIVE ONLY - this file is new. No existing file is edited.
// ASCII only. NO em-dash and NO en-dash. Hyphen only.
// ============================================================
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Button, Card, Badge, PageTitle, SectionHeader, Segmented,
  ProgressBar, GradientText, Kbd, useToast,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import {
  INTAKE_STEPS, formatKpi, moduleRoute,
  useLiftoff, saveAnswer, submitIntake, resetLiftoff,
  getIntake, getPlan, isComplete, progress, askRook, hasAiEnv,
} from '../lib/liftoff-data.js';

/* ============================================================
   Scoped CSS  (additive, self-contained - no index.css edit).
   Custom keyframes the page needs, all disabled under reduced
   motion. Prefixed lo- so nothing collides with the design system.
   ============================================================ */
const LO_CSS = `
.lo-orb { position: relative; display: inline-grid; place-items: center; flex: none; }
.lo-orb-ring { position: absolute; inset: -4px; border-radius: 50%;
  background: conic-gradient(from 0deg, var(--accent), var(--accent-teal), var(--accent-purple), var(--accent));
  animation: loSpin 3.6s linear infinite; filter: blur(1px); }
.lo-orb-core { position: relative; width: 100%; height: 100%; border-radius: 50%;
  display: grid; place-items: center; color: #fff;
  background: linear-gradient(135deg, #6d5cf7, #4a3ce0); box-shadow: var(--accent-glow); }
.lo-orb[data-think="true"] .lo-orb-ring { animation-duration: 1.1s; }
@keyframes loSpin { to { transform: rotate(360deg); } }
.lo-typing { display: inline-flex; gap: 5px; align-items: center; }
.lo-typing i { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); display: block; animation: loDot 1.1s infinite ease-in-out; }
.lo-typing i:nth-child(2) { animation-delay: .16s; }
.lo-typing i:nth-child(3) { animation-delay: .32s; }
@keyframes loDot { 0%, 80%, 100% { opacity: .25; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-4px); } }
.lo-question { font-size: clamp(1.7rem, 4.2vw, 2.9rem); font-weight: 800; letter-spacing: -.025em; line-height: 1.08; color: var(--ink); }
.lo-big-input { font-size: clamp(1.2rem, 2.4vw, 1.7rem) !important; font-weight: 600; padding: .85rem 1.05rem !important; }
.lo-pick { text-align: left; cursor: pointer; border: 1.5px solid var(--line-strong); background: var(--paper);
  border-radius: var(--r-md); padding: 1rem 1.15rem; transition: border-color .15s var(--ease), background .15s var(--ease), transform .12s var(--ease); }
.lo-pick:hover { border-color: var(--accent-300); transform: translateY(-2px); }
.lo-pick[data-on="true"] { border-color: var(--accent); background: var(--accent-50); box-shadow: 0 0 0 3px var(--accent-50); }
.lo-chip { cursor: pointer; border: 1.5px solid var(--line-strong); background: var(--paper); color: var(--ink);
  border-radius: var(--r-pill); padding: .6rem 1rem; font-weight: 600; font-size: 1rem; transition: all .14s var(--ease); display: inline-flex; align-items: center; gap: .4rem; }
.lo-chip:hover { border-color: var(--accent-300); }
.lo-chip[data-on="true"] { border-color: var(--accent); background: var(--accent-50); color: var(--accent-600); }
.lo-seg { display: flex; gap: 5px; }
.lo-seg-cell { flex: 1; height: 8px; border-radius: 999px; background: var(--n-100); overflow: hidden; }
.lo-seg-cell > i { display: block; height: 100%; width: 0; background: var(--accent); transition: width .4s var(--ease); }
.lo-seg-cell[data-state="done"] > i { width: 100%; }
.lo-seg-cell[data-state="current"] > i { width: 60%; background: linear-gradient(90deg, var(--accent), var(--accent-teal)); }
.lo-bubble { max-width: 78%; padding: .75rem 1rem; border-radius: var(--r-md); font-size: 1.02rem; line-height: 1.45; }
.lo-bubble-a { background: var(--n-50); color: var(--ink); border-bottom-left-radius: 4px; }
.lo-bubble-u { background: var(--accent); color: #fff; border-bottom-right-radius: 4px; }
.lo-reveal-item { display: flex; gap: .7rem; align-items: flex-start; padding: .4rem 0; }
@media (prefers-reduced-motion: reduce) {
  .lo-orb-ring, .lo-typing i { animation: none !important; }
  .lo-pick:hover, .lo-chip:hover { transform: none; }
}
`;

/* ============================================================
   Small helpers  (all hoisted function declarations - TDZ safe)
   ============================================================ */
function uniq(arr) { return [...new Set(arr)]; }
function isEmpty(v) {
  if (v == null) return true;
  if (Array.isArray(v)) return v.length === 0;
  return String(v).trim() === '';
}
function fillQuestion(text, intake) {
  const name = (intake && intake.companyName && String(intake.companyName).trim()) || 'your company';
  return String(text || '').split('{company}').join(name);
}
function digitsOf(raw) {
  const n = parseInt(String(raw).replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}
function matchOption(options, raw) {
  const q = String(raw || '').toLowerCase().trim();
  if (!q) return null;
  // exact value/label first, then substring either direction
  let hit = options.find(o => o.value.toLowerCase() === q || o.label.toLowerCase() === q);
  if (hit) return hit;
  hit = options.find(o => q.includes(o.value.toLowerCase()) || q.includes(o.label.toLowerCase()));
  if (hit) return hit;
  hit = options.find(o => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
  return hit || null;
}
function parseAnswer(step, raw) {
  const t = step.type;
  if (t === 'number') return digitsOf(raw);
  if (t === 'text') return String(raw).trim();
  if (t === 'single') { const o = matchOption(step.options, raw); return o ? o.value : null; }
  if (t === 'multi' || t === 'chips') {
    const parts = String(raw).split(/,| and | then |\/|;/i);
    const vals = [];
    for (const p of parts) { const o = matchOption(step.options, p); if (o) vals.push(o.value); }
    return uniq(vals);
  }
  return String(raw).trim();
}
function firstUnansweredIndex(intake) {
  for (let i = 0; i < INTAKE_STEPS.length; i++) {
    const s = INTAKE_STEPS[i];
    if (s.key === 'team') continue; // optional
    if (isEmpty(intake[s.key])) return i;
  }
  return INTAKE_STEPS.length; // all required answered
}
function clarifyFor(step) {
  if (step.type === 'number') return 'Give me a number - a rough count is fine.';
  if (step.type === 'text') return 'A few words is plenty. Try again?';
  const opts = (step.options || []).slice(0, 5).map(o => o.label).join(', ');
  return `I did not catch a match. Pick from: ${opts}.`;
}
const ACKS = ['Locked in.', 'Got it.', 'Noted.', 'Perfect.', 'Understood.', 'On it.', 'Clean.', 'Sharp.'];
function ackFor(i) { return ACKS[i % ACKS.length]; }

/* Speech recognition - feature-detected, never throws. */
function useSpeech() {
  const [supported] = useState(() => {
    try { return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition); }
    catch { return false; }
  });
  const recRef = useRef(null);
  const [listening, setListening] = useState(false);
  function listen(onText) {
    if (!supported) return;
    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SR();
      rec.lang = 'en-US'; rec.interimResults = false; rec.maxAlternatives = 1;
      rec.onresult = (e) => { try { onText(String(e.results[0][0].transcript || '')); } catch {} };
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);
      recRef.current = rec;
      setListening(true);
      rec.start();
    } catch { setListening(false); }
  }
  function stop() { try { recRef.current && recRef.current.stop(); } catch {} setListening(false); }
  return { supported, listening, listen, stop };
}

/* ============================================================
   Presentational atoms
   ============================================================ */
function RookGlyph({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 3h2v2h2V3h4v2h2V3h2v5l-2 2v6l1 3H5l1-3v-6L4 8V3h2zm1 15h10v2H7v-2z" />
    </svg>
  );
}
function RookOrb({ size = 54, thinking = false }) {
  return (
    <span className="lo-orb" data-think={thinking ? 'true' : 'false'} style={{ width: size, height: size }}>
      <span className="lo-orb-ring" />
      <span className="lo-orb-core"><RookGlyph size={size * 0.46} /></span>
    </span>
  );
}
function TypingDots() { return <span className="lo-typing"><i /><i /><i /></span>; }

function MicButton({ speech, onText, size = 'md' }) {
  if (!speech.supported) return null; // hidden when the browser has no SpeechRecognition
  const on = speech.listening;
  return (
    <Button
      variant={on ? 'accent' : 'ghost'}
      size={size}
      onClick={() => (on ? speech.stop() : speech.listen(onText))}
      aria-label={on ? 'Stop listening' : 'Speak your answer'}
      title={on ? 'Listening... click to stop' : 'Speak your answer'}
    >
      <Icon name="mic" size={16} /> {on ? 'Listening' : 'Speak'}
    </Button>
  );
}

/* Quick-fill chips for number + text steps (Rook "suggests" sensible values). */
function numberChips(step, intake) {
  if (step.key === 'seats') {
    const hc = digitsOf(intake.headcount);
    if (hc && hc > 1) {
      return uniq([Math.round(hc * 0.25), Math.round(hc * 0.5), Math.round(hc * 0.75), hc])
        .filter(v => v >= 1)
        .map(v => ({ label: v.toLocaleString() + ' seats', fill: v }));
    }
    return [25, 100, 250, 500].map(v => ({ label: v + ' seats', fill: v }));
  }
  if (step.key === 'headcount') return [50, 200, 620, 2000].map(v => ({ label: v.toLocaleString(), fill: v }));
  return [];
}

/* ============================================================
   STEP INPUT  -  renders the right control for a step type,
   plus AI suggestion chips and a voice mic.
   ============================================================ */
function StepInput({ step, value, intake, onChange, onAdvance, speech }) {
  const t = step.type;
  const inputRef = useRef(null);
  useEffect(() => { const id = setTimeout(() => { try { inputRef.current && inputRef.current.focus(); } catch {} }, 60); return () => clearTimeout(id); }, [step.key]);

  const toggle = (v) => {
    const cur = Array.isArray(value) ? value : [];
    onChange(cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v]);
  };
  const handleVoice = (raw) => {
    if (t === 'number') { const n = digitsOf(raw); onChange(n == null ? '' : n); }
    else if (t === 'text') onChange(String(raw).trim());
    else if (t === 'single') { const o = matchOption(step.options, raw); if (o) onChange(o.value); }
    else {
      const parts = String(raw).split(/,| and | then |\/|;/i);
      const cur = Array.isArray(value) ? [...value] : [];
      for (const p of parts) { const o = matchOption(step.options, p); if (o && !cur.includes(o.value)) cur.push(o.value); }
      onChange(cur);
    }
  };

  /* ---- text ---- */
  if (t === 'text') {
    const example = step.placeholder;
    return (
      <div className="col gap-2">
        <div className="row gap-2 wrap" style={{ alignItems: 'center' }}>
          <input
            ref={inputRef}
            className="input lo-big-input"
            value={value || ''}
            placeholder={step.placeholder || ''}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAdvance(); } }}
            style={{ flex: 1, minWidth: 260 }}
          />
          <MicButton speech={speech} onText={handleVoice} />
        </div>
        {example && (
          <div className="row gap-1 wrap">
            <button className="lo-chip" onClick={() => onChange(example)} style={{ borderStyle: 'dashed' }}>
              <Icon name="sparkles" size={13} /> Use example
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ---- number ---- */
  if (t === 'number') {
    const chips = numberChips(step, intake);
    return (
      <div className="col gap-2">
        <div className="row gap-2 wrap" style={{ alignItems: 'center' }}>
          <input
            ref={inputRef}
            type="number"
            min={step.min}
            max={step.max}
            className="input lo-big-input"
            value={value === 0 || value ? value : ''}
            placeholder={step.placeholder || ''}
            onChange={(e) => onChange(e.target.value === '' ? '' : digitsOf(e.target.value))}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAdvance(); } }}
            style={{ maxWidth: 240, fontWeight: 800 }}
          />
          {step.unit && <span className="t-lg muted fw-6">{step.unit}</span>}
          <MicButton speech={speech} onText={handleVoice} />
        </div>
        {chips.length > 0 && (
          <div className="col gap-1">
            <div className="eyebrow row gap-1" style={{ alignItems: 'center' }}><Icon name="sparkles" size={13} /> Rook suggests</div>
            <div className="row wrap gap-1">
              {chips.map(c => (
                <button key={c.label} className="lo-chip" data-on={String(value) === String(c.fill)} onClick={() => onChange(c.fill)}>
                  {String(value) === String(c.fill) && <Icon name="check" size={13} />}{c.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ---- single (big tappable cards, auto-advance) ---- */
  if (t === 'single') {
    return (
      <div className="col gap-2">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '.75rem' }}>
          {step.options.map(o => {
            const on = value === o.value;
            return (
              <button key={o.value} className="lo-pick" data-on={on} onClick={() => { onChange(o.value); onAdvance(o.value); }}>
                <div className="row between" style={{ gap: '.5rem' }}>
                  <span className="fw-7" style={{ fontSize: '1.15rem' }}>{o.label}</span>
                  {on && <span style={{ color: 'var(--accent)' }}><Icon name="check" size={20} /></span>}
                </div>
                {o.hint && <div className="t-sm muted" style={{ marginTop: 4 }}>{o.hint}</div>}
              </button>
            );
          })}
        </div>
        <div><MicButton speech={speech} onText={handleVoice} /></div>
      </div>
    );
  }

  /* ---- multi / chips (toggle) ---- */
  const selected = Array.isArray(value) ? value : [];
  const suggestions = (step.suggestions || []).map(sv => step.options.find(o => o.value === sv)).filter(Boolean);
  return (
    <div className="col gap-2">
      <div className="row wrap gap-1">
        {step.options.map(o => {
          const on = selected.includes(o.value);
          return (
            <button key={o.value} className="lo-chip" data-on={on} onClick={() => toggle(o.value)} title={o.hint || ''}>
              {on ? <Icon name="check" size={14} /> : <Icon name="plus" size={14} />} {o.label}
            </button>
          );
        })}
      </div>
      {suggestions.length > 0 && (
        <div className="col gap-1" style={{ marginTop: 2 }}>
          <div className="eyebrow row gap-1" style={{ alignItems: 'center' }}><Icon name="sparkles" size={13} /> Rook suggests</div>
          <div className="row wrap gap-1">
            {suggestions.map(o => {
              const on = selected.includes(o.value);
              return (
                <button key={o.value} className="badge" onClick={() => toggle(o.value)}
                  style={{ cursor: 'pointer', border: '1px dashed var(--accent-300)', background: on ? 'var(--accent-50)' : 'transparent', color: 'var(--accent-600)' }}>
                  <Icon name={on ? 'check' : 'plus'} size={12} /> {o.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="row between wrap gap-1" style={{ alignItems: 'center' }}>
        <span className="t-sm muted">{selected.length} selected{step.key === 'team' ? ' (optional)' : ''}</span>
        <MicButton speech={speech} onText={handleVoice} />
      </div>
    </div>
  );
}

/* ============================================================
   INTERVIEW PANEL  -  free-text conversational intake. Rook asks,
   the user replies in plain language, replies map into answers.
   ============================================================ */
function InterviewPanel({ speech, onComplete, onExit }) {
  const scRef = useRef(null);
  const [draft, setDraft] = useState('');
  const [ptr, setPtr] = useState(() => firstUnansweredIndex(getIntake()));
  const [messages, setMessages] = useState(() => {
    const arr = [{ role: 'assistant', text: "I'll interview you like a sharp analyst. Answer in your own words and I map it into your setup as we go." }];
    const i = firstUnansweredIndex(getIntake());
    if (i < INTAKE_STEPS.length) arr.push({ role: 'assistant', text: fillQuestion(INTAKE_STEPS[i].question, getIntake()) });
    else arr.push({ role: 'assistant', text: 'Looks like I already have your answers. Generate your rollout below.' });
    return arr;
  });
  const prog = progress();
  const ready = prog.answered >= prog.total;

  useEffect(() => { try { scRef.current.scrollTop = scRef.current.scrollHeight; } catch {} }, [messages]);

  const send = (raw) => {
    const text = String(raw == null ? draft : raw).trim();
    if (!text) return;
    setDraft('');
    setMessages(m => [...m, { role: 'user', text }]);
    if (ptr >= INTAKE_STEPS.length) return;
    const step = INTAKE_STEPS[ptr];
    const val = parseAnswer(step, text);
    if (isEmpty(val)) { setMessages(m => [...m, { role: 'assistant', text: clarifyFor(step) }]); return; }
    saveAnswer(step.key, val);
    // advance to the next unanswered step (skipping any already filled)
    let next = ptr + 1;
    const live = getIntake();
    while (next < INTAKE_STEPS.length && !isEmpty(live[INTAKE_STEPS[next].key])) next++;
    setPtr(next);
    const ack = ackFor(ptr);
    if (next < INTAKE_STEPS.length) {
      setMessages(m => [...m, { role: 'assistant', text: ack }, { role: 'assistant', text: fillQuestion(INTAKE_STEPS[next].question, getIntake()) }]);
    } else {
      setMessages(m => [...m, { role: 'assistant', text: `${ack} That is everything I need. Hit Generate and watch it assemble.` }]);
    }
  };

  return (
    <div className="col gap-3">
      <Card pad={false} style={{ overflow: 'hidden' }}>
        <div ref={scRef} className="col gap-2" style={{ padding: '1.25rem', maxHeight: 420, overflowY: 'auto' }}>
          {messages.map((msg, i) => (
            msg.role === 'assistant' ? (
              <div key={i} className="row gap-2 fade-up" style={{ alignItems: 'flex-end' }}>
                <RookOrb size={34} />
                <div className="lo-bubble lo-bubble-a">{msg.text}</div>
              </div>
            ) : (
              <div key={i} className="row fade-up" style={{ justifyContent: 'flex-end' }}>
                <div className="lo-bubble lo-bubble-u">{msg.text}</div>
              </div>
            )
          ))}
        </div>
        <div className="row gap-2" style={{ padding: '.9rem 1rem', borderTop: '1px solid var(--line)', background: 'var(--n-25)' }}>
          <input
            className="input"
            value={draft}
            placeholder={ptr < INTAKE_STEPS.length ? 'Type your answer...' : 'All set - generate below'}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } }}
            disabled={ptr >= INTAKE_STEPS.length}
            style={{ flex: 1 }}
          />
          <MicButton speech={speech} onText={(txt) => setDraft(txt)} />
          <Button variant="primary" onClick={() => send()} disabled={ptr >= INTAKE_STEPS.length || !draft.trim()}>
            <Icon name="send" size={16} /> Send
          </Button>
        </div>
      </Card>

      <div className="row between wrap gap-2" style={{ alignItems: 'center' }}>
        <div className="row gap-2" style={{ alignItems: 'center', minWidth: 220, flex: 1 }}>
          <span className="t-sm muted tnum">{prog.answered} / {prog.total}</span>
          <div style={{ flex: 1, maxWidth: 320 }}><ProgressBar value={prog.pct} /></div>
        </div>
        <div className="row gap-1">
          <Button variant="quiet" onClick={onExit}><Icon name="arrowLeft" size={15} /> Back to decks</Button>
          <Button variant="accent" onClick={onComplete} disabled={!ready}>
            <Icon name="rocket" size={16} /> Generate my rollout
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   WIZARD  -  Guided stepper + Interview toggle + voice.
   ============================================================ */
function LiftoffWizard({ onComplete, onExit }) {
  const toast = useToast();
  const speech = useSpeech();
  const intake = useLiftoff(s => s.intake); // reactive read of saved answers
  const [mode, setMode] = useState('guided'); // guided | interview
  const [idx, setIdx] = useState(() => Math.min(firstUnansweredIndex(getIntake()), INTAKE_STEPS.length - 1));
  const [maxReached, setMaxReached] = useState(idx);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);

  const step = INTAKE_STEPS[idx];
  const isLast = idx >= INTAKE_STEPS.length - 1;

  // load the saved answer for this step into the draft whenever the step changes
  useEffect(() => {
    const cur = getIntake()[step.key];
    setDraft(cur === undefined ? (step.type === 'multi' || step.type === 'chips' ? [] : '') : cur);
  }, [idx]); // eslint-disable-line

  // "Rook is typing" shimmer between questions (skipped under reduced motion)
  useEffect(() => {
    let reduce = false;
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch {}
    if (reduce) { setThinking(false); return; }
    setThinking(true);
    const id = setTimeout(() => setThinking(false), 520);
    return () => clearTimeout(id);
  }, [idx]);

  const goNext = (explicit) => {
    const val = explicit !== undefined ? explicit : draft;
    if (step.key !== 'team' && isEmpty(val)) { toast('Give me an answer to keep going.', 'warn'); return; }
    saveAnswer(step.key, val);
    if (isLast) { onComplete(); return; }
    const n = idx + 1;
    setIdx(n);
    setMaxReached(m => Math.max(m, n));
  };
  const goBack = () => { if (idx > 0) setIdx(idx - 1); else onExit(); };

  // Enter-to-advance for card/chip steps (text + number inputs handle their own Enter)
  useEffect(() => {
    if (mode !== 'guided') return;
    if (step.type === 'text' || step.type === 'number') return;
    const onKey = (e) => {
      if (e.key !== 'Enter') return;
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }); // re-bind each render so goNext closes over the latest draft

  const answeredCount = INTAKE_STEPS.filter(s => s.key !== 'team' && !isEmpty(intake[s.key])).length;
  const requiredTotal = INTAKE_STEPS.filter(s => s.key !== 'team').length;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <style>{LO_CSS}</style>

      {/* header: brand + mode toggle + exit */}
      <div className="row between wrap gap-2" style={{ marginBottom: '1.4rem', alignItems: 'center' }}>
        <div className="row gap-1" style={{ alignItems: 'center' }}>
          <span className="eyebrow">Liftoff</span>
          <span className="t-sm muted">AI intake</span>
          {hasAiEnv() && <Badge tone="ok"><span className="dot" style={{ background: 'var(--ok)' }} /> Live Rook</Badge>}
        </div>
        <div className="row gap-1" style={{ alignItems: 'center' }}>
          <Segmented
            options={[{ value: 'guided', label: 'Guided' }, { value: 'interview', label: 'Interview' }]}
            value={mode}
            onChange={setMode}
          />
          <Button variant="quiet" onClick={onExit} aria-label="Exit wizard"><Icon name="x" size={18} /></Button>
        </div>
      </div>

      {mode === 'interview' ? (
        <InterviewPanel speech={speech} onComplete={onComplete} onExit={onExit} />
      ) : (
        <>
          {/* progress rail - one segment per step, click to revisit */}
          <div className="col gap-1" style={{ marginBottom: '1.8rem' }}>
            <div className="lo-seg">
              {INTAKE_STEPS.map((s, i) => {
                const state = i < idx ? 'done' : i === idx ? 'current' : (!isEmpty(intake[s.key]) ? 'done' : 'todo');
                const reachable = i <= maxReached;
                return (
                  <button
                    key={s.key}
                    className="lo-seg-cell"
                    data-state={state}
                    title={fillQuestion(s.question, intake)}
                    aria-label={`Step ${i + 1}: ${s.key}`}
                    disabled={!reachable}
                    onClick={() => reachable && setIdx(i)}
                    style={{ border: 'none', cursor: reachable ? 'pointer' : 'default', padding: 0 }}
                  >
                    <i />
                  </button>
                );
              })}
            </div>
            <div className="row between" style={{ marginTop: 2 }}>
              <span className="t-xs muted">Step {idx + 1} of {INTAKE_STEPS.length}</span>
              <span className="t-xs muted tnum">{answeredCount} / {requiredTotal} answered</span>
            </div>
          </div>

          {/* the question */}
          <div key={idx} className="col gap-3 fade-up">
            <div className="row gap-2" style={{ alignItems: 'center' }}>
              <RookOrb size={52} thinking={thinking} />
              <div className="col" style={{ gap: 2 }}>
                <div className="eyebrow row gap-1" style={{ alignItems: 'center' }}>
                  Rook {thinking && <TypingDots />}
                </div>
                <span className="t-sm muted">Question {idx + 1}{step.key === 'team' ? ' (optional)' : ''}</span>
              </div>
            </div>

            <h1 className="lo-question">{fillQuestion(step.question, intake)}</h1>
            {step.help && <p className="muted" style={{ fontSize: '1.1rem', maxWidth: '60ch', marginTop: '-.4rem' }}>{step.help}</p>}

            <div style={{ marginTop: '.5rem' }}>
              <StepInput step={step} value={draft} intake={intake} onChange={setDraft} onAdvance={goNext} speech={speech} />
            </div>

            {/* nav */}
            <div className="row between wrap gap-2" style={{ marginTop: '1.2rem', alignItems: 'center' }}>
              <Button variant="ghost" onClick={goBack}>
                <Icon name="arrowLeft" size={16} /> {idx === 0 ? 'Exit' : 'Back'}
              </Button>
              <div className="row gap-2" style={{ alignItems: 'center' }}>
                {step.key === 'team' && (
                  <Button variant="quiet" onClick={() => goNext(Array.isArray(draft) ? draft : [])}>Skip</Button>
                )}
                <span className="desktop-only t-xs muted row gap-1" style={{ alignItems: 'center' }}>
                  <Kbd>Enter</Kbd> to continue
                </span>
                <Button variant="accent" size="lg" onClick={() => goNext()}>
                  {isLast ? <><Icon name="rocket" size={18} /> Generate my rollout</> : <>Next <Icon name="arrowRight" size={16} /></>}
                </Button>
              </div>
            </div>
          </div>

          <div className="row center" style={{ marginTop: '2rem' }}>
            <Button variant="quiet" size="sm" onClick={() => askRook('Help me answer the Liftoff intake so Rally can build decks for my whole company')}>
              <Icon name="sparkles" size={15} /> Ask Rook for help
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/* ============================================================
   GENERATION REVEAL  -  the animated "assembling your revenue org"
   sequence. Modules light up one by one, then decks are built for
   each layer. Deterministic, respects prefers-reduced-motion.
   ============================================================ */
function GenerationReveal({ plan, onDone }) {
  const modules = (plan && plan.activatedModules) || [];
  const decks = (plan && plan.decks) || [];
  const total = modules.length + decks.length;
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!plan || total === 0) { const id = setTimeout(onDone, 400); return () => clearTimeout(id); }
    let reduce = false;
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch {}
    if (reduce) { setN(total); const id = setTimeout(onDone, 500); return () => clearTimeout(id); }
    let i = 0;
    let timer;
    const tick = () => {
      i += 1;
      setN(i);
      if (i >= total) { timer = setTimeout(onDone, 750); return; }
      const inDecks = i >= modules.length;
      const delay = inDecks ? 190 : 85;
      timer = setTimeout(tick, delay);
    };
    timer = setTimeout(tick, 260);
    return () => clearTimeout(timer);
  }, [plan]); // eslint-disable-line

  const shownModules = modules.slice(0, Math.min(n, modules.length));
  const shownDecks = decks.slice(0, Math.max(0, n - modules.length));
  const inDecks = n >= modules.length && total > 0;
  const name = (plan && plan.company && plan.company.name) || 'your company';

  return (
    <div style={{ maxWidth: 780, margin: '0 auto' }}>
      <style>{LO_CSS}</style>
      <Card className="fade-up">
        <div className="row gap-2" style={{ alignItems: 'center', marginBottom: '1.1rem' }}>
          <RookOrb size={56} thinking />
          <div className="col" style={{ gap: 2, minWidth: 0 }}>
            <div className="eyebrow">Assembling your revenue org</div>
            <h2 style={{ margin: 0 }}>{name}</h2>
            <div className="t-sm muted">{inDecks ? 'Building a deck for every layer of the company' : 'Switching on the modules your answers call for'}</div>
          </div>
        </div>

        <ProgressBar value={total ? (n / total) * 100 : 100} height={8} />
        <div className="row between" style={{ marginTop: 6, marginBottom: '1.1rem' }}>
          <span className="t-xs muted tnum">{Math.min(n, total)} / {total} assembled</span>
          <span className="t-xs muted">{shownModules.length} modules - {shownDecks.length} decks</span>
        </div>

        {/* modules lighting up */}
        {shownModules.length > 0 && (
          <div style={{ marginBottom: shownDecks.length ? '1.2rem' : 0 }}>
            <div className="eyebrow" style={{ marginBottom: '.5rem' }}>Modules activated</div>
            <div style={{ maxHeight: 220, overflowY: 'auto', paddingRight: 4 }}>
              {shownModules.map(mod => (
                <div key={mod.key} className="lo-reveal-item fade-up">
                  <span style={{ width: 22, height: 22, borderRadius: 6, flex: 'none', display: 'grid', placeItems: 'center', background: 'var(--accent-50)', color: 'var(--accent-600)' }}>
                    <Icon name="check" size={13} stroke={2.4} />
                  </span>
                  <div className="col" style={{ minWidth: 0, gap: 1 }}>
                    <span className="fw-6 clip" style={{ fontSize: '1rem' }}>{mod.label}</span>
                    <span className="t-xs muted clip" style={{ maxWidth: '58ch' }}>{mod.reason}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* decks being built */}
        {shownDecks.length > 0 && (
          <div>
            <div className="eyebrow" style={{ marginBottom: '.5rem' }}>Decks built</div>
            <div className="row wrap gap-1">
              {shownDecks.map(d => (
                <span key={d.role} className="fade-up row gap-1" style={{ alignItems: 'center', padding: '.4rem .7rem', borderRadius: 'var(--r-pill)', border: `1.5px solid ${d.accent}`, color: d.accent, fontWeight: 700 }}>
                  <span className="dot" style={{ background: d.accent }} /> {d.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ============================================================
   DECK CARD
   ============================================================ */
function DeckCard({ deck }) {
  const kpis = (deck.kpis || []).slice(0, 3);
  return (
    <Link to={`/liftoff/deck/${deck.role}`} className="card card-pad card-hover" style={{ display: 'block', position: 'relative', overflow: 'hidden', borderTop: `3px solid ${deck.accent}` }}>
      <div style={{ position: 'absolute', top: -30, right: -30, width: 110, height: 110, borderRadius: '50%', background: deck.accent, opacity: 0.08, filter: 'blur(6px)' }} />
      <div style={{ position: 'relative' }}>
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <div className="col" style={{ gap: 2, minWidth: 0 }}>
            <span className="fw-8" style={{ fontSize: '1.2rem' }}>{deck.label}</span>
            <span className="t-sm muted clip">{deck.audience}</span>
          </div>
          {deck.role === 'master' && <Badge tone="accent">Master</Badge>}
        </div>
        <p className="t-sm" style={{ color: 'var(--ink-2)', margin: '.7rem 0', minHeight: 42 }}>{deck.headline}</p>
        <div className="row wrap gap-1">
          {kpis.map(k => (
            <span key={k.label} className="row gap-1" style={{ alignItems: 'baseline', padding: '.3rem .6rem', borderRadius: 'var(--r-sm)', background: 'var(--n-50)' }}>
              <span className="fw-8 tnum" style={{ fontSize: '1rem', color: deck.accent }}>{formatKpi(k.value, k.format)}</span>
              <span className="t-xs muted clip" style={{ maxWidth: 90 }}>{k.label}</span>
            </span>
          ))}
        </div>
        <div className="row between" style={{ marginTop: '.9rem', alignItems: 'center' }}>
          <span className="link t-sm row gap-1" style={{ alignItems: 'center' }}>Open deck <Icon name="arrowRight" size={14} /></span>
          <span className="t-xs muted">{(deck.modules || []).length} modules</span>
        </div>
      </div>
    </Link>
  );
}

/* ============================================================
   DECK GALLERY  -  alive on first load with the seeded DEMO plan.
   ============================================================ */
function DeckGallery({ onStart, onStartOver }) {
  const toast = useToast();
  useLiftoff(s => !!s.plan); // re-render when a real plan lands
  const plan = getPlan();
  const complete = isComplete();
  const decks = plan.decks || [];
  const seats = (plan.company && plan.company.seats) || (plan.summary && plan.summary.seats) || 0;

  return (
    <div className="page-in">
      <style>{LO_CSS}</style>
      <PageTitle
        eyebrow="Liftoff"
        title={complete ? `${plan.company.name} is ready for launch` : 'Your revenue org, generated'}
        sub={complete
          ? `${plan.summary.headline}`
          : 'Rook interviews your company, then builds a tailored deck for every layer. Preview below or run the wizard to generate your own.'}
        action={
          <div className="row gap-1">
            <Button variant="ghost" onClick={() => askRook(complete
              ? `Brief my team on the Liftoff rollout for ${plan.company.name}`
              : 'Walk me through what Liftoff will generate for my company')}>
              <Icon name="sparkles" size={16} /> Ask Rook
            </Button>
            <Button variant="accent" onClick={onStart}>
              <Icon name="rocket" size={16} /> {complete ? 'Re-run wizard' : 'Start Liftoff'}
            </Button>
          </div>
        }
      />

      {/* preview banner OR summary strip */}
      {!complete ? (
        <Card className="fade-up" style={{ position: 'relative', overflow: 'hidden', marginBottom: '1.4rem' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(680px 240px at 12% -20%, var(--accent-50), transparent 70%)', pointerEvents: 'none' }} />
          <div className="row between wrap gap-2" style={{ position: 'relative', alignItems: 'center' }}>
            <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
              <RookOrb size={48} />
              <div className="col" style={{ gap: 2, minWidth: 0 }}>
                <span className="fw-7" style={{ fontSize: '1.1rem' }}>Preview <GradientText>demo org</GradientText></span>
                <span className="t-sm muted">Run the wizard to generate your own decks. This is Northwind Systems, seeded so nothing is ever blank.</span>
              </div>
            </div>
            <Button variant="accent" onClick={onStart} style={{ flex: 'none' }}>
              <Icon name="rocket" size={16} /> Run the wizard
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: '1.4rem' }}>
          {[
            { label: 'Decks generated', value: decks.length, icon: 'layers' },
            { label: 'Modules active', value: plan.activatedModules.length, icon: 'grid' },
            { label: 'Paid seats', value: seats, icon: 'users' },
            { label: 'Go-live', value: (plan.company && plan.company.timeline) || '30 days', icon: 'rocket' },
          ].map(s => (
            <Card key={s.label} style={{ padding: '1rem 1.15rem' }}>
              <div className="row between" style={{ alignItems: 'center' }}>
                <span className="stat-label">{s.label}</span>
                <span style={{ color: 'var(--accent)' }}><Icon name={s.icon} size={16} /></span>
              </div>
              <div className="fw-8 tnum" style={{ fontSize: '1.9rem', lineHeight: 1.1, marginTop: 4 }}>
                {typeof s.value === 'number' ? s.value.toLocaleString() : s.value}
              </div>
            </Card>
          ))}
        </div>
      )}

      <SectionHeader
        eyebrow="Generated decks"
        title="One deck per layer"
        sub="Every team sees only the view built for them. Click any deck to open it."
      />
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {decks.map(d => <DeckCard key={d.role} deck={d} />)}
      </div>

      {/* share note */}
      <Card className="fade-up" style={{ marginTop: '1.6rem' }}>
        <div className="row between wrap gap-2" style={{ alignItems: 'center' }}>
          <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
            <span style={{ width: 46, height: 46, borderRadius: 12, flex: 'none', display: 'grid', placeItems: 'center', color: '#fff', background: 'linear-gradient(135deg, var(--accent), var(--accent-600))' }}>
              <Icon name="share2" size={22} />
            </span>
            <div className="col" style={{ gap: 2, minWidth: 0 }}>
              <span className="fw-7" style={{ fontSize: '1.05rem' }}>Share with the team</span>
              <span className="t-sm muted">Publish once and all {seats ? seats.toLocaleString() : '500 to 1000'} seats get their own scoped deck. Full transparency, zero noise - each person sees only what they need.</span>
            </div>
          </div>
          <div className="row gap-1" style={{ flex: 'none' }}>
            <Button variant="ghost" onClick={() => toast('Rollout published to every seat.', 'ok')}>
              <Icon name="send" size={16} /> Publish to all seats
            </Button>
            {complete && (
              <Button variant="quiet" onClick={onStartOver}>
                <Icon name="rotateCcw" size={15} /> Start over
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* activated modules */}
      {plan.activatedModules && plan.activatedModules.length > 0 && (
        <div style={{ marginTop: '1.6rem' }}>
          <SectionHeader eyebrow="The stack you turned on" title={`${plan.activatedModules.length} modules active`} sub="Mapped from your departments, goals, and how you sell." />
          <div className="row wrap gap-1">
            {plan.activatedModules.map(mod => (
              <Link key={mod.key} to={moduleRoute(mod.key)} className="lo-chip" title={mod.reason} style={{ textDecoration: 'none' }}>
                <span className="dot" style={{ background: mod.foundation ? 'var(--accent)' : 'var(--accent-teal)' }} /> {mod.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   PAGE  -  orchestrates the three phases.
   ============================================================ */
export default function Liftoff() {
  const toast = useToast();
  const [view, setView] = useState('gallery'); // gallery (alive on load) | wizard | generating
  const [genPlan, setGenPlan] = useState(null);

  const startWizard = () => setView('wizard');
  const onWizardComplete = () => {
    let plan;
    try { plan = submitIntake(); } catch { plan = getPlan(); }
    setGenPlan(plan);
    setView('generating');
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
  };
  const onGenerationDone = () => { setView('gallery'); };
  const startOver = () => { resetLiftoff(); setGenPlan(null); setView('gallery'); toast('Liftoff reset. Run it again anytime.', 'ok'); };

  if (view === 'wizard') {
    return <div className="page-in" style={{ paddingTop: '1rem' }}><LiftoffWizard onComplete={onWizardComplete} onExit={() => setView('gallery')} /></div>;
  }
  if (view === 'generating') {
    return <div className="page-in" style={{ paddingTop: '1rem' }}><GenerationReveal plan={genPlan} onDone={onGenerationDone} /></div>;
  }
  return <DeckGallery onStart={startWizard} onStartOver={startOver} />;
}
