// ============================================================
// TRAINING COMPANION  (Ardo) - the global, dockable right-side panel.
//
// A self-contained onboarding companion: an animated character, a role-based
// lesson track with progress + checkmarks, a voice walkthrough that greets the
// user by name, a live transcript, and a typed input that always works. It can
// highlight elements, scroll to them, and navigate routes as it teaches.
//
// Mount ONCE, globally: <TrainingCompanion />. It renders its own launcher and
// opens on the window event 'ardova:companion'. It does NOT mount itself.
// ASCII only. No em-dash / no en-dash.
// ============================================================
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../icons.jsx';
import { Ring } from '../UI.jsx';
import { getCurrentUser } from '../../lib/store.js';
import Character from './Character.jsx';
import './companion.css';
import {
  currentTrack, greetingFor, buildSystemPrompt, firstNameOf,
  trackCompletion, isLessonDone, markLessonDone, subscribeProgress,
} from '../../lib/training-companion.js';
import {
  makeClientTools, connectRealtimeVoice, askRook, steerBackLine,
  speak, stopSpeaking, createRecognition, speechSupported, recognitionSupported,
  celebrateBurst, clearSpotlight,
} from '../../lib/companion-voice.js';

export default function TrainingCompanion() {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);

  const user = useMemo(() => { try { return getCurrentUser(); } catch { return null; } }, []);
  const track = useMemo(() => currentTrack(), []);
  const firstName = firstNameOf(user);

  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [peek, setPeek] = useState(false);

  const [started, setStarted] = useState(false);
  const [provider, setProvider] = useState(null); // 'vapi' | 'realtime' | 'webspeech'
  const [speaking, setSpeaking] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [listening, setListening] = useState(false);

  const [speakerOn, setSpeakerOn] = useState(true);
  const [micOn, setMicOn] = useState(recognitionSupported);

  const [activeIdx, setActiveIdx] = useState(0);
  const [transcript, setTranscript] = useState([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('');
  const [, forceTick] = useState(0);

  // Refs so the voice loop reads the latest values without stale closures.
  const ctrlRef = useRef(null);
  const startedRef = useRef(false);
  const speakerRef = useRef(true);
  const micRef = useRef(micOn);
  const providerRef = useRef(null);
  const activeIdxRef = useRef(0);
  const recogRef = useRef(null);
  const scrollRef = useRef(null);
  useEffect(() => { startedRef.current = started; }, [started]);
  useEffect(() => { speakerRef.current = speakerOn; }, [speakerOn]);
  useEffect(() => { micRef.current = micOn; }, [micOn]);
  useEffect(() => { providerRef.current = provider; }, [provider]);
  useEffect(() => { activeIdxRef.current = activeIdx; }, [activeIdx]);

  const completion = trackCompletion(track.id);

  // Re-render checkmarks + progress when the shared progress store changes.
  useEffect(() => subscribeProgress(() => forceTick(t => t + 1)), []);

  // Keep the transcript scrolled to the newest turn.
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [transcript, thinking]);

  // Open from anywhere. detail.open === false closes.
  useEffect(() => {
    const onEvt = (e) => {
      const d = e.detail || {};
      if (d.open === false) { setOpen(false); return; }
      setOpen(true); setCollapsed(false);
    };
    window.addEventListener('ardova:companion', onEvt);
    return () => window.removeEventListener('ardova:companion', onEvt);
  }, []);

  // SPA navigation requested by the client tool fallback (or external callers).
  useEffect(() => {
    const onNav = (e) => { const to = e.detail?.to; if (to) { try { navigateRef.current(to); } catch {} } };
    window.addEventListener('ardova:navigate', onNav);
    return () => window.removeEventListener('ardova:navigate', onNav);
  }, []);

  // Cleanup on unmount.
  useEffect(() => () => { stopEverything(); }, []); // eslint-disable-line

  const pushTurn = (role, text) => { if (text) setTranscript(t => [...t, { role, text }]); };

  const doSpeak = useCallback((text, onEnd) => {
    // Only the Web Speech path uses our TTS. Live providers speak on their own.
    if (!speechSupported || !speakerRef.current || providerRef.current === 'vapi' || providerRef.current === 'realtime') { onEnd?.(); return; }
    speak(text, {
      onStart: () => setSpeaking(true),
      onEnd: () => { setSpeaking(false); onEnd?.(); },
    });
  }, []);

  const stopListen = useCallback(() => { try { recogRef.current?.stop(); } catch {} recogRef.current = null; setListening(false); }, []);

  // Web Speech listen loop: fires once, routes the result to the Q&A handler.
  const listenOnce = useCallback(() => {
    if (!startedRef.current || !micRef.current || !recognitionSupported) return;
    if (providerRef.current !== 'webspeech') return; // live providers own the mic
    if (recogRef.current || speaking) return;
    const rec = createRecognition({
      onResult: (txt) => { recogRef.current = null; setListening(false); if (txt) handleAsk(txt, true); },
      onEnd: () => { recogRef.current = null; setListening(false); },
      onError: () => { recogRef.current = null; setListening(false); },
    });
    if (!rec) return;
    recogRef.current = rec; setListening(true);
    try { rec.start(); } catch { recogRef.current = null; setListening(false); }
  }, [speaking]); // eslint-disable-line

  // Walk to a lesson: navigate, spotlight the target, and (in Web Speech mode)
  // narrate it. Marks the lesson complete once narrated / visited.
  const goToLesson = useCallback((idx, { narrate = true } = {}) => {
    const lessons = track.lessons;
    const i = Math.max(0, Math.min(lessons.length - 1, idx));
    const lesson = lessons[i];
    setActiveIdx(i); activeIdxRef.current = i;
    try { navigateRef.current(lesson.route); } catch {}
    setTimeout(() => { spotlightTarget(lesson.target, lesson.title); }, 480);

    const finish = () => { markLessonDone(track.id, lesson.id, true); afterTurn(); };
    if (narrate && providerRef.current === 'webspeech') {
      pushTurn('ardo', lesson.say);
      doSpeak(lesson.say, finish);
    } else if (startedRef.current && (providerRef.current === 'vapi' || providerRef.current === 'realtime')) {
      // Live providers narrate through their own audio; count the visit as done.
      markLessonDone(track.id, lesson.id, true);
    }
    // Otherwise (just previewing while not in a session) leave it unchecked.
  }, [track, doSpeak]); // eslint-disable-line

  const spotlightTarget = (target, label) => {
    // Uses the self-contained overlay from companion-voice (retries once inside).
    try { tools().highlight(target, label); } catch {}
  };

  // After Ardo finishes a turn: celebrate on full completion, else keep the mic
  // warm in Web Speech mode.
  const afterTurn = useCallback(() => {
    const c = trackCompletion(track.id);
    if (c.done >= c.total) {
      setCelebrating(true); celebrateBurst();
      setStatus('You did it! Track complete.');
      setTimeout(() => setCelebrating(false), 2600);
      return;
    }
    if (providerRef.current === 'webspeech' && micRef.current) setTimeout(() => listenOnce(), 350);
  }, [track, listenOnce]);

  // The shared client tool set, rebuilt lazily so it always has fresh setters.
  const toolsRef = useRef(null);
  const tools = useCallback(() => {
    if (!toolsRef.current) {
      toolsRef.current = makeClientTools({
        navigate: (to) => navigateRef.current(to),
        setLesson: (which) => handleSetLesson(which),
      });
    }
    return toolsRef.current;
  }, []); // eslint-disable-line

  const handleSetLesson = useCallback((which) => {
    let next = activeIdxRef.current;
    if (which === 'next') next = activeIdxRef.current + 1;
    else if (which === 'prev') next = activeIdxRef.current - 1;
    else if (typeof which === 'number') next = which;
    else if (/^\d+$/.test(String(which))) next = parseInt(which, 10);
    goToLesson(next, { narrate: providerRef.current === 'webspeech' });
  }, [goToLesson]);

  // Answer any question, always steer back to Ardova.
  const handleAsk = useCallback(async (text, viaVoice = false) => {
    const q = String(text || '').trim();
    if (!q) return;
    pushTurn('user', q);
    if (!viaVoice) setInput('');

    // Live Vapi session: inject the text and let the agent answer via audio.
    if (providerRef.current === 'vapi' && ctrlRef.current?.send?.(q)) { setThinking(true); setTimeout(() => setThinking(false), 900); return; }

    setThinking(true);
    const res = await askRook({ question: q, history: transcript.map(t => ({ role: t.role === 'user' ? 'user' : 'assistant', content: t.text })), path: window.location.pathname });
    setThinking(false);

    if (res?.reply) {
      pushTurn('ardo', res.reply);
      doSpeak(res.reply, afterTurn);
      if (res.nav?.to) { try { navigateRef.current(res.nav.to); } catch {} }
    } else {
      // No backend: friendly steer-back plus the current lesson narration.
      const lesson = track.lessons[activeIdxRef.current];
      const line = `${steerBackLine()} ${lesson ? lesson.say : ''}`.trim();
      pushTurn('ardo', line);
      if (lesson) setTimeout(() => spotlightTarget(lesson.target, lesson.title), 200);
      doSpeak(line, afterTurn);
    }
  }, [transcript, track, doSpeak, afterTurn]);

  // Begin the voice walkthrough. Preferred Vapi -> Realtime -> Web Speech.
  const startWalkthrough = useCallback(async () => {
    if (startedRef.current) { stopEverything(); return; }
    setStarted(true); startedRef.current = true;
    setTranscript([]); setStatus('Warming up...');
    const greeting = greetingFor(user, track);
    const systemPrompt = buildSystemPrompt(user, track);

    const handlers = {
      onUserText: (t) => pushTurn('user', t),
      onAssistantText: (t) => pushTurn('ardo', t),
      onSpeaking: (v) => setSpeaking(!!v),
      onError: () => {},
    };

    let ctrl = null;
    try {
      ctrl = await connectRealtimeVoice({ systemPrompt, greeting, tools: tools(), handlers });
    } catch { ctrl = null; }

    if (ctrl) {
      ctrlRef.current = ctrl;
      setProvider(ctrl.provider); providerRef.current = ctrl.provider;
      setStatus(ctrl.provider === 'vapi' ? 'Ardo is live on voice' : 'Ardo is live');
      // Realtime cannot set a spoken first message, so greet by name ourselves.
      if (ctrl.provider === 'realtime') { pushTurn('ardo', greeting); }
      setTimeout(() => goToLesson(0, { narrate: false }), 700);
      return;
    }

    // Fallback B: Web Speech (always works, no keys needed).
    setProvider('webspeech'); providerRef.current = 'webspeech';
    setStatus(speechSupported ? 'Ardo is walking you through it' : 'Read along with Ardo');
    pushTurn('ardo', greeting);
    doSpeak(greeting, () => goToLesson(0, { narrate: true }));
    if (!speechSupported) { setTimeout(() => goToLesson(0, { narrate: true }), 300); }
  }, [user, track, tools, doSpeak, goToLesson]);

  const stopEverything = useCallback(() => {
    startedRef.current = false; setStarted(false);
    setStatus(''); setSpeaking(false); setThinking(false);
    stopSpeaking(); stopListen(); clearSpotlight();
    try { ctrlRef.current?.stop?.(); } catch {}
    ctrlRef.current = null; setProvider(null); providerRef.current = null;
  }, [stopListen]);

  const toggleSpeaker = () => {
    const next = !speakerOn; setSpeakerOn(next); speakerRef.current = next;
    if (!next) { stopSpeaking(); setSpeaking(false); }
  };
  const toggleMic = () => {
    const next = !micOn; setMicOn(next); micRef.current = next;
    if (ctrlRef.current?.setMuted) { try { ctrlRef.current.setMuted(!next); } catch {} }
    if (next) { if (providerRef.current === 'webspeech' && !speaking) listenOnce(); }
    else stopListen();
  };

  const nextLesson = () => { markLessonDone(track.id, track.lessons[activeIdx].id, true); goToLesson(activeIdx + 1, { narrate: startedRef.current && providerRef.current === 'webspeech' }); };
  const prevLesson = () => goToLesson(activeIdx - 1, { narrate: startedRef.current && providerRef.current === 'webspeech' });

  const ardoState = celebrating ? 'celebrate' : thinking ? 'thinking' : speaking ? 'talking' : 'idle';
  const showFull = !collapsed || peek;
  const subText = !started
    ? `${track.label} track`
    : thinking ? 'Thinking...' : speaking ? 'Speaking...' : listening ? 'Listening...' : (status || 'Voice on');

  const submit = (e) => { e.preventDefault(); if (input.trim()) handleAsk(input.trim(), false); };

  // ---- Launcher only when closed ----
  if (!open) {
    return (
      <button className="tc-launcher" onClick={() => { setOpen(true); setCollapsed(false); }} aria-label="Open Ardo, your training companion">
        <span className="tc-launcher__ardo"><Character state="idle" size={40} /></span>
        <span className="tc-launcher__label">Learn with Ardo</span>
        {completion.done > 0 && completion.done < completion.total && (
          <span className="tc-launcher__badge">{completion.done}/{completion.total}</span>
        )}
      </button>
    );
  }

  return (
    <aside
      className={`tc-dock${collapsed ? ' is-rail' : ''}${collapsed && peek ? ' is-peek' : ''}`}
      role="complementary" aria-label="Ardo training companion"
      onMouseEnter={() => collapsed && setPeek(true)}
      onMouseLeave={() => collapsed && setPeek(false)}
    >
      {/* Collapsed rail preview */}
      {collapsed && !peek && (
        <div className="tc-rail-mini">
          <button className="tc-x" style={{ color: 'var(--n-600)' }} onClick={() => setCollapsed(false)} aria-label="Expand Ardo" title="Expand"><Icon name="chevronRight" size={18} style={{ transform: 'rotate(180deg)' }} /></button>
          <Character state={ardoState} size={44} />
          <div className="tc-rail-mini__ring">
            <Ring value={completion.pct} size={46} stroke={5} label="" />
            <span className="tc-rail-mini__pct">{completion.pct}%</span>
          </div>
          <span className="tc-rail-hint">Learn with Ardo</span>
        </div>
      )}

      {showFull && (
        <>
          <div className="tc-head">
            <span className="tc-head__ardo"><Character state={ardoState} size={40} /></span>
            <div className="tc-head__title">
              <div className="tc-head__name">
                Ardo
                {provider && <span className="tc-head__prov">{provider === 'vapi' ? 'Vapi' : provider === 'realtime' ? 'Realtime' : 'Voice'}</span>}
              </div>
              <div className="tc-head__sub">{subText}</div>
            </div>
            <button className="tc-x" onClick={() => setCollapsed(true)} aria-label="Dock to the side" title="Dock"><Icon name="chevronRight" size={18} /></button>
            <button className="tc-x" onClick={() => { stopEverything(); setOpen(false); }} aria-label="Close Ardo" title="Close"><Icon name="x" size={18} /></button>
          </div>

          <div className="tc-stage">
            <div className="tc-stage__ardo"><Character state={ardoState} size={104} /></div>
            <div className="tc-stage__status">
              {!started
                ? `Hey ${firstName}, ready to learn Ardova?`
                : thinking ? 'Let me think...' : speaking ? 'Ardo is talking...' : listening ? 'Go ahead, I am listening' : 'Ask me anything about Ardova'}
            </div>
            <div className="tc-stage__row">
              <button className={`tc-start${started ? ' is-live' : ''}`} onClick={startWalkthrough}>
                <Icon name={started ? 'x' : 'play'} size={16} />
                {started ? 'Stop' : 'Start with Ardo'}
              </button>
              {recognitionSupported && (
                <button className={`tc-icon-btn${listening ? ' is-live' : micOn ? ' is-on' : ''}`} onClick={toggleMic} aria-label={micOn ? 'Turn mic off' : 'Turn mic on'} title="Microphone">
                  <Icon name="mic" size={18} />
                </button>
              )}
              <button className={`tc-icon-btn${speakerOn ? ' is-on' : ''}`} onClick={toggleSpeaker} aria-label={speakerOn ? 'Mute Ardo' : 'Unmute Ardo'} title="Ardo voice">
                <Icon name={speakerOn ? 'volume2' : 'volumeX'} size={18} />
              </button>
            </div>
          </div>

          <div className="tc-body">
            <div className="tc-track-head">
              <span className="tc-track-head__label">{track.label} track</span>
              <span className="tc-track-head__count">{completion.done} / {completion.total} done</span>
            </div>

            {track.lessons.map((lesson, i) => {
              const done = isLessonDone(track.id, lesson.id);
              const active = i === activeIdx;
              return (
                <div key={lesson.id} className={`tc-lesson${active ? ' is-active' : ''}${done ? ' is-done' : ''}`}>
                  <button className="tc-lesson__row" onClick={() => goToLesson(i, { narrate: startedRef.current && providerRef.current === 'webspeech' })}>
                    <span className="tc-lesson__num">{i + 1}</span>
                    <span
                      className="tc-lesson__check"
                      role="checkbox" aria-checked={done} tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); markLessonDone(track.id, lesson.id, !done); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); markLessonDone(track.id, lesson.id, !done); } }}
                      title={done ? 'Mark as not done' : 'Mark as done'}
                    >
                      <Icon name="check" size={14} />
                    </span>
                    <span className="tc-lesson__main">
                      <span className="tc-lesson__title">{lesson.title}</span>
                      <span className="tc-lesson__meta">{lesson.route}</span>
                    </span>
                    <Icon name="chevronDown" size={16} style={{ color: 'var(--n-400)', flex: 'none' }} />
                  </button>
                  <div className="tc-lesson__expand">
                    <div className="tc-lesson__say">{lesson.say}</div>
                    <button className="tc-lesson__go" onClick={() => goToLesson(i, { narrate: startedRef.current && providerRef.current === 'webspeech' })}>
                      <Icon name="arrowRight" size={13} /> Show me
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="tc-stage__row" style={{ justifyContent: 'space-between', marginTop: 12 }}>
              <button className="tc-icon-btn" style={{ width: 'auto', padding: '0 14px', gap: 6, display: 'inline-flex', alignItems: 'center' }} onClick={prevLesson} disabled={activeIdx === 0} aria-label="Previous lesson">
                <Icon name="arrowLeft" size={16} /> Prev
              </button>
              <button className="tc-icon-btn" style={{ width: 'auto', padding: '0 14px', gap: 6, display: 'inline-flex', alignItems: 'center' }} onClick={nextLesson} disabled={activeIdx >= track.lessons.length - 1} aria-label="Next lesson">
                Next <Icon name="arrowRight" size={16} />
              </button>
            </div>
          </div>

          {transcript.length > 0 && (
            <div className="tc-transcript">
              <div className="tc-transcript__head">
                <span className="tc-transcript__title">Transcript</span>
                <button className="tc-x" style={{ color: 'var(--n-600)' }} onClick={() => setTranscript([])} aria-label="Clear transcript" title="Clear"><Icon name="x" size={14} /></button>
              </div>
              <div className="tc-transcript__scroll" ref={scrollRef}>
                {transcript.map((t, i) => (
                  <div key={i} className={`tc-turn tc-turn--${t.role === 'user' ? 'user' : 'ardo'}`}>
                    <div className="tc-turn__who">{t.role === 'user' ? firstName : 'Ardo'}</div>
                    {t.text}
                  </div>
                ))}
                {thinking && <div className="tc-turn tc-turn--ardo"><div className="tc-turn__who">Ardo</div>...</div>}
              </div>
            </div>
          )}

          <form className="tc-input" onSubmit={submit}>
            <input
              value={input} onChange={(e) => setInput(e.target.value)}
              placeholder={listening ? 'Listening... just talk' : `Ask Ardo anything about Ardova...`}
              aria-label="Ask Ardo"
            />
            <button type="submit" disabled={!input.trim()} aria-label="Send"><Icon name="send" size={16} /></button>
          </form>
        </>
      )}
    </aside>
  );
}
