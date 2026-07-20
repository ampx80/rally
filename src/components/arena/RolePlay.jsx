// ROLE-PLAY mode. The rep practices discovery / objection-handling / a close
// against an AI buyer persona in a turn-based chat. The deterministic engine
// in src/lib/arena.js drives mood + scoring; the optional /api/arena route
// swaps in a richer buyer line when a key is present (with silent fallback).
// Voice output via window.speechSynthesis is opt-in. ASCII only.
import React, { useEffect, useRef, useState } from 'react';
import { Card, Button, Badge, Avatar, Textarea, SectionHeader, EmptyState } from '../UI.jsx';
import { Icon } from '../icons.jsx';
import {
  PERSONAS, personaById, newRolePlay, advanceRolePlay, gradeRolePlay,
  recordResult, fetchBuyerReply, fetchRolePlayFeedback,
} from '../../lib/arena.js';
import ResultsScreen from './ResultsScreen.jsx';

function MoodMeter({ mood }) {
  const color = mood >= 66 ? 'var(--ok)' : mood >= 40 ? 'var(--warn)' : 'var(--risk)';
  const label = mood >= 66 ? 'Warming up' : mood >= 40 ? 'Neutral' : 'Guarded';
  return (
    <div className="col gap-1" style={{ minWidth: 150 }}>
      <div className="row between t-xs muted"><span>Buyer mood</span><span>{label}</span></div>
      <div style={{ background: 'var(--n-100)', borderRadius: 999, height: 8, overflow: 'hidden' }}>
        <div className="ar-mood-fill" style={{ width: `${mood}%`, height: '100%', background: color, borderRadius: 999 }} />
      </div>
    </div>
  );
}

export default function RolePlay({ roleId, onExit }) {
  const [personaId, setPersonaId] = useState(null);
  const [session, setSession] = useState(null);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [voice, setVoice] = useState(false);
  const [result, setResult] = useState(null);
  const [awarded, setAwarded] = useState([]);
  const [certifiedNow, setCertifiedNow] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [session, thinking]);

  // Cancel any in-flight speech when leaving.
  useEffect(() => () => { try { window.speechSynthesis?.cancel(); } catch {} }, []);

  function speak(text) {
    if (!voice) return;
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1; u.pitch = 1;
      synth.speak(u);
    } catch {}
  }

  function start(id) {
    const s = newRolePlay(id);
    setPersonaId(id);
    setSession(s);
    setResult(null);
    setInput('');
    speak(s.history[0].text);
  }

  async function send() {
    const text = input.trim();
    if (!text || !session || thinking) return;
    setInput('');
    setThinking(true);
    // Ask the optional model for a richer line; fall back to deterministic.
    let override = null;
    try {
      const reply = await fetchBuyerReply(session, text);
      if (reply) override = { reply };
    } catch {}
    const next = advanceRolePlay(session, text, override);
    setSession(next);
    setThinking(false);
    const lastBuyer = next.history[next.history.length - 1];
    if (lastBuyer && lastBuyer.role === 'buyer') speak(lastBuyer.text);
  }

  async function endAndScore() {
    if (!session) return;
    setThinking(true);
    const graded = gradeRolePlay(session);
    // Optional richer feedback from the model.
    try {
      const enriched = await fetchRolePlayFeedback(session, graded);
      if (enriched && enriched.feedback) { graded.feedback = enriched.feedback; graded.meta = { ...graded.meta, source: 'ai' }; }
    } catch {}
    const rec = recordResult('roleplay', roleId, graded);
    setThinking(false);
    setAwarded(rec.awarded);
    setCertifiedNow(rec.certifiedNow);
    setResult(graded);
    try { window.speechSynthesis?.cancel(); } catch {}
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  /* ---- results view ---- */
  if (result) {
    return (
      <ResultsScreen
        result={result}
        awarded={awarded}
        certifiedNow={certifiedNow}
        retryLabel="Run it again"
        onRetry={() => start(personaId)}
        onExit={onExit}
      />
    );
  }

  /* ---- persona picker ---- */
  if (!session) {
    return (
      <div className="col gap-3">
        <div className="row between wrap gap-2">
          <SectionHeader title="Choose your buyer" sub="Each persona pushes back differently. Pick your challenge." />
          <Button variant="ghost" onClick={onExit}><Icon name="arrowLeft" size={16} /> Back</Button>
        </div>
        <div className="ar-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {PERSONAS.map((p) => (
            <Card
              key={p.id}
              className="ar-card"
              tabIndex={0}
              role="button"
              onClick={() => start(p.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start(p.id); } }}
            >
              <div className="row gap-2" style={{ alignItems: 'center' }}>
                <Avatar name={p.name} size={44} />
                <div style={{ minWidth: 0 }}>
                  <div className="fw-7">{p.name}</div>
                  <div className="t-sm muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}, {p.company}</div>
                </div>
              </div>
              <div className="t-sm" style={{ marginTop: '.6rem', color: 'var(--n-600)' }}>{p.tone}</div>
              <div className="row between" style={{ marginTop: '.75rem' }}>
                <Badge tone={p.difficulty === 'Hard' ? 'risk' : 'warn'}>{p.difficulty}</Badge>
                <span className="row gap-1 t-sm fw-6" style={{ color: 'var(--accent)' }}>Start <Icon name="chevronRight" size={15} /></span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  /* ---- live chat ---- */
  const persona = personaById(personaId);
  return (
    <div className="col gap-2" style={{ maxWidth: 780, margin: '0 auto' }}>
      <Card pad>
        <div className="row between wrap gap-2" style={{ alignItems: 'center' }}>
          <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
            <Avatar name={persona.name} size={40} />
            <div style={{ minWidth: 0 }}>
              <div className="fw-7">{persona.name}</div>
              <div className="t-sm muted">{persona.title}, {persona.company}</div>
            </div>
          </div>
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <MoodMeter mood={session.mood} />
            <Button
              variant={voice ? 'accent' : 'ghost'}
              size="sm"
              aria-pressed={voice}
              onClick={() => { const nv = !voice; setVoice(nv); if (!nv) { try { window.speechSynthesis?.cancel(); } catch {} } }}
              title="Read buyer lines aloud"
            >
              <Icon name={voice ? 'volume2' : 'volumeX'} size={16} /> Voice
            </Button>
          </div>
        </div>
      </Card>

      <Card pad={false}>
        <div ref={scrollRef} className="col gap-2" style={{ padding: '1.1rem', height: 380, overflowY: 'auto' }}>
          {session.history.map((h, i) => (
            <div key={i} className={`ar-bubble ${h.role === 'rep' ? 'ar-bubble-rep' : 'ar-bubble-buyer'}`}>
              {h.text}
            </div>
          ))}
          {thinking && (
            <div className="ar-bubble ar-bubble-buyer ar-typing" aria-label="Buyer is thinking">
              <span /><span /><span />
            </div>
          )}
        </div>
        <div className="col gap-2" style={{ borderTop: '1px solid var(--line)', padding: '.9rem 1.1rem' }}>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder="Type your response. Ask a discovery question, handle the objection, or propose a next step. Enter to send."
            aria-label="Your response to the buyer"
          />
          <div className="row between wrap gap-2">
            <div className="t-xs muted">Turn {session.metrics.turns} of the conversation. End any time to get graded.</div>
            <div className="row gap-2">
              <Button variant="ghost" onClick={endAndScore} disabled={session.metrics.turns < 1 || thinking}>End and score</Button>
              <Button variant="primary" onClick={send} disabled={!input.trim() || thinking || session.done}>
                <Icon name="send" size={15} /> Send
              </Button>
            </div>
          </div>
          {session.done && (
            <EmptyState
              icon={'\u2714'}
              title="The buyer is ready to move forward"
              body="You earned a next step. End and score to see how you did."
              action={<Button variant="primary" onClick={endAndScore}>See my grade</Button>}
            />
          )}
        </div>
      </Card>
    </div>
  );
}
