// AskCanvas - Generative UI. Ask Ardovo for a tool ("show me at-risk enterprise
// deals with a one-click save play") and Rook assembles a live, interactive
// micro-app: KPIs, charts, tables, and actions wired to your real book of
// business. Not a chat answer - a bespoke app authored at runtime, rendered by
// a safe declarative interpreter (src/lib/genui). Pin the ones you love.
import React, { useEffect, useRef, useState } from 'react';
import { PageTitle, Button, Card, Badge, useToast } from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import Renderer from '../lib/genui/Renderer.jsx';
import { validateSpec, buildFallbackSpec, buildAskSnapshot } from '../lib/genui/spec.js';

const EXAMPLES = [
  'Show me at-risk enterprise deals with a one-click save play',
  'Build a pipeline command view for this quarter',
  'Compare open pipeline by owner',
  'What is closing this month?',
  'Break down deals by industry',
  'Which deals are slipping and by how much?',
];

const PIN_KEY = 'rally_genui_pins_v1';
const loadPins = () => { try { return JSON.parse(localStorage.getItem(PIN_KEY) || '[]'); } catch { return []; } };
const savePins = (p) => { try { localStorage.setItem(PIN_KEY, JSON.stringify(p.slice(0, 24))); } catch {} };

export default function AskCanvas() {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // { spec, question, source }
  const [pins, setPins] = useState(loadPins);
  const toast = useToast();
  const abortRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => () => { try { abortRef.current?.abort(); } catch {} }, []);

  async function assemble(question) {
    const text = (question || '').trim();
    if (!text || busy) return;
    setBusy(true);
    setResult(null);
    try { abortRef.current?.abort(); } catch {}
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let spec = null, source = 'fallback';
    try {
      const r = await fetch('/api/genui', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, snapshot: buildAskSnapshot() }),
        signal: ctrl.signal,
      });
      const j = await r.json();
      const v = validateSpec(j?.spec);
      if (v.ok) { spec = v.spec; source = j.source || 'rook'; }
    } catch (e) {
      if (e?.name === 'AbortError') { setBusy(false); return; }
    }
    // Network/API failed entirely -> deterministic client-side fallback.
    if (!spec) { spec = buildFallbackSpec(text, buildAskSnapshot()); source = 'fallback'; }
    setResult({ spec, question: text, source });
    setBusy(false);
    requestAnimationFrame(() => canvasRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function pinCurrent() {
    if (!result) return;
    const entry = { id: 'pin_' + Date.now().toString(36), question: result.question, spec: result.spec, at: Date.now() };
    const next = [entry, ...pins];
    setPins(next); savePins(next);
    toast('Pinned to your canvas board');
  }
  function removePin(id) {
    const next = pins.filter(p => p.id !== id);
    setPins(next); savePins(next);
  }
  function openPin(p) {
    const v = validateSpec(p.spec);
    setResult({ spec: v.ok ? v.spec : buildFallbackSpec(p.question, buildAskSnapshot()), question: p.question, source: 'pinned' });
    requestAnimationFrame(() => canvasRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  return (
    <div className="page-in col" style={{ gap: '1.5rem' }}>
      <style>{`
        .genui-block { animation: genuiIn .5s var(--ease) both; }
        @keyframes genuiIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .genui-hero { position: relative; overflow: hidden; border-radius: var(--r-lg); border: 1px solid var(--line);
          background: radial-gradient(120% 140% at 15% 0%, color-mix(in srgb, #5b4bf5 16%, var(--paper)) 0%, var(--paper) 55%); }
        @media (prefers-reduced-motion: reduce) { .genui-block { animation: none !important; opacity: 1; transform: none; } }
      `}</style>

      <PageTitle
        eyebrow="Generative UI"
        title={<>Ask, and Rook <span style={{ background: 'linear-gradient(100deg, var(--accent), var(--accent-purple) 60%, var(--accent-teal))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>builds you a tool</span></>}
        sub="Describe what you need. Rook assembles a live micro-app - KPIs, charts, tables, actions - wired to your real pipeline. Not an answer, an app."
      />

      {/* prompt bar */}
      <div className="genui-hero" style={{ padding: '1.25rem' }}>
        <form onSubmit={(e) => { e.preventDefault(); assemble(q); }} className="col gap-2">
          <div className="row gap-2" style={{ alignItems: 'stretch', flexWrap: 'wrap' }}>
            <div className="row gap-2" style={{ flex: '1 1 320px', alignItems: 'center', background: 'var(--paper)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-md)', padding: '.35rem .6rem' }}>
              <span style={{ color: 'var(--accent)', flex: 'none' }}><Icon name="sparkles" size={20} /></span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ask for a tool, e.g. at-risk enterprise deals with a save play"
                aria-label="Describe the micro-app you want"
                style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: 'var(--ink)', fontSize: '1rem', padding: '.5rem .1rem' }}
              />
            </div>
            <Button type="submit" variant="accent" size="lg" disabled={busy || !q.trim()} style={{ flex: 'none' }}>
              {busy ? 'Assembling...' : 'Assemble'}
            </Button>
          </div>
          <div className="row gap-1 wrap">
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" onClick={() => { setQ(ex); assemble(ex); }}
                className="btn btn-quiet btn-sm" style={{ borderRadius: 999, border: '1px solid var(--line)', color: 'var(--n-600)' }}>
                {ex}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* result canvas */}
      <div ref={canvasRef}>
        {busy && <AssemblingSkeleton />}
        {!busy && result && (
          <Card className="col" style={{ gap: '1.25rem' }}>
            <div className="row between wrap gap-2" style={{ alignItems: 'flex-start' }}>
              <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
                <Badge tone={result.source === 'rook' ? 'accent' : result.source === 'pinned' ? 'info' : 'default'}>
                  {result.source === 'rook' ? 'Rook-authored' : result.source === 'pinned' ? 'Pinned' : 'Assembled'}
                </Badge>
                <span className="t-sm muted clip">for "{result.question}"</span>
              </div>
              <div className="row gap-1" style={{ flex: 'none' }}>
                <Button variant="ghost" size="sm" onClick={() => assemble(result.question)}>Regenerate</Button>
                <Button variant="quiet" size="sm" onClick={pinCurrent}>Pin</Button>
              </div>
            </div>
            <Renderer spec={result.spec} />
          </Card>
        )}
        {!busy && !result && (
          <Card className="col center gap-2" style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem' }}>✨</div>
            <h4 style={{ margin: 0 }}>Type a request to assemble your first micro-app</h4>
            <div className="muted" style={{ maxWidth: 460 }}>
              Rook composes a real, interactive tool from your live data - charts, tables, KPIs, and actions. Try one of the examples above.
            </div>
          </Card>
        )}
      </div>

      {/* pinned board */}
      {pins.length > 0 && (
        <div className="col gap-2">
          <h4 style={{ margin: 0 }}>Your pinned canvases</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '.85rem' }}>
            {pins.map((p) => (
              <Card key={p.id} hover className="col gap-2" style={{ cursor: 'pointer' }} onClick={() => openPin(p)}>
                <div className="row between gap-1" style={{ alignItems: 'flex-start' }}>
                  <span className="fw-6" style={{ minWidth: 0 }}>{p.spec?.title || p.question}</span>
                  <button aria-label="Remove pin" onClick={(e) => { e.stopPropagation(); removePin(p.id); }}
                    className="btn btn-quiet btn-sm" style={{ flex: 'none', padding: '.15rem .4rem' }}><Icon name="x" size={15} /></button>
                </div>
                <div className="t-xs muted clip">{p.question}</div>
                <div className="row gap-1 wrap">
                  {(p.spec?.blocks || []).slice(0, 4).map((b, i) => <Badge key={i} className="t-xs">{b.type}</Badge>)}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AssemblingSkeleton() {
  return (
    <Card className="col" style={{ gap: '1rem' }}>
      <div className="row gap-2" style={{ alignItems: 'center' }}>
        <span style={{ color: 'var(--accent)' }}><Icon name="sparkles" size={18} /></span>
        <span className="fw-6">Rook is assembling your micro-app...</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.85rem' }}>
        {[0, 1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 92, borderRadius: 'var(--r-md)' }} />)}
      </div>
      <div className="skeleton" style={{ height: 240, borderRadius: 'var(--r-md)' }} />
    </Card>
  );
}
