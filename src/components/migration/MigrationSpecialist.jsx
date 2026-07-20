// ============================================================
// MIGRATION SPECIALIST PANEL  -  Mira, live inside the wizard.
//
// Replaces the old static "assistant" list with a real conversation. Mira
// reacts to the files you drop, reads the analysis, tells you what she found
// one decision at a time, points at the exact spot on screen, proposes custom
// fields for columns that do not map, and can talk it through out loud. She can
// also spin up a live multi-person session from right here.
//
// Voice is optional and layered: a mic toggle reads Mira's lines aloud (Web
// Speech), and "Talk to Mira" opens a full two-way voice session when a
// provider key exists (Vapi / OpenAI Realtime), falling back to speech + typed
// Q&A otherwise. Screen pointing uses the shared client tools.
//
// ASCII only. No em-dash / no en-dash.
// ============================================================
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../icons.jsx';
import Character from '../companion/Character.jsx';
import {
  SPECIALIST, SYSTEM_PROMPT, MIGRATION_TARGET_MAP,
  greetingLines, reviewBriefing, stageBriefing, pushBriefing, localAnswer,
} from '../../lib/migration-agent.js';
import {
  speak, stopSpeaking, connectRealtimeVoice, makeClientTools, askRook, voiceKeyPresent,
} from '../../lib/companion-voice.js';

let mid = 0;
const mkMsg = (role, text, extra = {}) => ({ id: `m${mid++}`, role, text, ...extra });

export default function MigrationSpecialist({
  stage = 'upload', target = 'contact', files = [],
  report = null, suggestions = [], staged = null, result = null,
  onCreateCustomFields, onPreview, onPush, onStartSession,
}) {
  const nav = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [voiceOn, setVoiceOn] = useState(false);
  const [live, setLive] = useState(false);       // full two-way voice connected
  const [speaking, setSpeaking] = useState(false);
  const [charState, setCharState] = useState('idle');
  const ctrlRef = useRef(null);
  const bodyRef = useRef(null);
  const lastKeyRef = useRef('');
  const voiceRef = useRef(false);
  useEffect(() => { voiceRef.current = voiceOn; }, [voiceOn]);

  const tools = useMemo(() => makeClientTools({ navigate: nav }), [nav]);

  const say = (text) => {
    if (!voiceRef.current) return;
    setSpeaking(true); setCharState('talking');
    const done = () => { setSpeaking(false); setCharState('idle'); };
    if (ctrlRef.current?.say) { const ok = ctrlRef.current.say(text); if (ok) { setTimeout(done, 300); return; } }
    stopSpeaking();
    speak(text, { onStart: () => { setSpeaking(true); setCharState('talking'); }, onEnd: done });
  };

  // Push a batch of Mira lines, optionally speaking the first one.
  const push = (lines, { speakFirst = true } = {}) => {
    const arr = (Array.isArray(lines) ? lines : [lines]).filter(Boolean);
    if (!arr.length) return;
    setMessages(m => [...m, ...arr.map(l => (typeof l === 'string' ? mkMsg('mira', l) : mkMsg('mira', l.text, { highlight: l.highlight, severity: l.severity })))]);
    const first = typeof arr[0] === 'string' ? arr[0] : arr[0].text;
    if (speakFirst) say(first);
  };

  // React to state: greet, brief the review, stage, and push phases. A key
  // guards against re-emitting the same briefing on unrelated re-renders.
  useEffect(() => {
    const key = `${stage}|${files.length}|${report ? report.readiness + ':' + report.unmapped?.length + ':' + report.duplicateRows : 'x'}|${suggestions.length}|${staged ? staged.records.length : 'x'}|${result ? result.created : 'x'}`;
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;

    if (stage === 'upload') {
      if (!messages.length) push(greetingLines(files), { speakFirst: false });
      else if (files.length) push(greetingLines(files));
    } else if (stage === 'review' && report) {
      push(reviewBriefing({ report, suggestions, target }));
    } else if (stage === 'stage' && staged) {
      push(stageBriefing(staged, target));
    } else if (stage === 'push' && result) {
      push(pushBriefing(result, target));
      setCharState('celebrate'); setTimeout(() => setCharState('idle'), 2600);
    }
  }, [stage, files, report, suggestions, staged, result, target]); // eslint-disable-line

  useEffect(() => { const el = bodyRef.current; if (el) el.scrollTop = el.scrollHeight; }, [messages]);

  useEffect(() => () => { stopSpeaking(); try { ctrlRef.current?.stop(); } catch {} }, []);

  const pointAt = (key) => {
    const sel = MIGRATION_TARGET_MAP[key] || key;
    setCharState('thinking'); setTimeout(() => setCharState('idle'), 1200);
    tools.highlight(sel, '');
  };

  const toggleVoice = () => {
    setVoiceOn(v => {
      const next = !v;
      if (!next) { stopSpeaking(); setSpeaking(false); setCharState('idle'); }
      else { const last = [...messages].reverse().find(m => m.role === 'mira'); if (last) setTimeout(() => say(last.text), 60); }
      return next;
    });
  };

  const talkToMira = async () => {
    if (live) { try { ctrlRef.current?.stop(); } catch {} ctrlRef.current = null; setLive(false); setCharState('idle'); return; }
    setVoiceOn(true);
    // Without a configured voice provider, stay on Web Speech (read-aloud) so we
    // never probe an endpoint that is not there. Full two-way voice lights up
    // when a key is set.
    if (!voiceKeyPresent()) {
      const last = [...messages].reverse().find(m => m.role === 'mira');
      push('I will read everything aloud, and you can type any question here. Full two-way voice turns on once your team wires up a voice key.', { speakFirst: false });
      if (last) setTimeout(() => say(last.text), 60);
      return;
    }
    setCharState('listening');
    const ctrl = await connectRealtimeVoice({
      systemPrompt: SYSTEM_PROMPT,
      greeting: greetingLines(files)[0],
      tools,
      handlers: {
        onUserText: (t) => setMessages(m => [...m, mkMsg('user', t)]),
        onAssistantText: (t) => setMessages(m => [...m, mkMsg('mira', t)]),
        onSpeaking: (v) => { setSpeaking(!!v); setCharState(v ? 'talking' : 'listening'); },
        onError: () => {},
      },
    });
    if (ctrl) { ctrlRef.current = ctrl; setLive(true); }
    else { setCharState('idle'); push('I could not open a live voice line here, but I can still read everything aloud and answer whatever you type.'); }
  };

  const ask = async (q) => {
    const question = String(q || '').trim();
    if (!question) return;
    setMessages(m => [...m, mkMsg('user', question)]);
    setInput('');
    setCharState('thinking');
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    let answer = null;
    try { const r = await askRook({ question, history: [], path }); if (r?.reply) answer = r.reply; } catch {}
    if (!answer) answer = localAnswer(question);
    push(answer);
  };

  const hasCustom = suggestions.length > 0;

  return (
    <div className="ms-panel fx-glass fx-scene">
      <div className="ms-head">
        <div className="ms-avatar"><Character state={charState} size={54} /></div>
        <div className="ms-id">
          <div className="ms-name fx-holo">{SPECIALIST.name}</div>
          <div className="ms-role">{SPECIALIST.role}</div>
        </div>
        <div className="ms-head-actions">
          <button className={`ms-icbtn${voiceOn ? ' is-on' : ''}`} onClick={toggleVoice} title={voiceOn ? 'Mute Mira' : 'Read aloud'} aria-label={voiceOn ? 'Mute Mira' : 'Read aloud'}>
            <Icon name={voiceOn ? 'volume2' : 'volumeX'} size={16} />
          </button>
        </div>
      </div>

      <div className="ms-body" ref={bodyRef}>
        {messages.map(m => (
          <div key={m.id} className={`ms-msg ms-msg--${m.role}${m.severity ? ' sev-' + m.severity : ''}`}>
            <div className="ms-bubble">{m.text}</div>
            {m.role === 'mira' && m.highlight && (
              <button className="ms-show" onClick={() => pointAt(m.highlight)}><Icon name="sparkles" size={12} /> Show me</button>
            )}
          </div>
        ))}
        {speaking && <div className="ms-speaking"><span /><span /><span /> Mira is speaking</div>}
      </div>

      {/* Contextual quick actions */}
      <div className="ms-actions">
        {stage === 'review' && hasCustom && (
          <button className="ms-act ms-act--primary" onClick={() => { onCreateCustomFields?.(); push(`Done. I created ${suggestions.length} custom field${suggestions.length > 1 ? 's' : ''} so nothing is lost.`); }}>
            <Icon name="sparkles" size={14} /> Keep {suggestions.length} column{suggestions.length > 1 ? 's' : ''} as custom field{suggestions.length > 1 ? 's' : ''}
          </button>
        )}
        {stage === 'review' && (
          <button className="ms-act" onClick={() => { onPreview?.(); }}><Icon name="layers" size={14} /> Preview clean data</button>
        )}
        {stage === 'stage' && (
          <button className="ms-act ms-act--primary" onClick={() => { onPush?.(); }}><Icon name="rocket" size={14} /> Push to production</button>
        )}
        <button className="ms-act" onClick={talkToMira}><Icon name="mic" size={14} /> {live ? 'End voice' : 'Talk to Mira'}</button>
        <button className="ms-act" onClick={() => onStartSession?.()}><Icon name="users" size={14} /> Run a guided session</button>
      </div>

      <form className="ms-input" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask Mira anything about your data..." aria-label="Ask Mira" />
        <button type="submit" className="ms-send" disabled={!input.trim()} aria-label="Send"><Icon name="send" size={15} /></button>
      </form>
    </div>
  );
}
