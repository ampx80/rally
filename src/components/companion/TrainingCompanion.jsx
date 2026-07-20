// ============================================================
// TRAINING COMPANION  (Ardo) - the global, dockable right-side panel.
//
// A self-contained onboarding companion: an animated character, a role-based
// lesson track with progress + checkmarks, and a DETERMINISTIC guided tour
// that greets the user by name and then auto-drives every lesson:
//   navigate(route) -> highlight(target, kept lit) -> speak lesson.say ->
//   optional lesson.ask check -> mark done -> advance -> celebrate at the end.
//
// The tour is owned in code here (a small state machine), NOT by the LLM, so it
// runs the SAME way for Web Speech (no keys) and for keyed providers (Vapi /
// Realtime). With no keys at all it still fully drives the tour, hands-free,
// with zero throws and no forced mic prompt.
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
  findLessonInTrack,
} from '../../lib/training-companion.js';
import {
  makeClientTools, connectRealtimeVoice, askRook, steerBackTo,
  speak, stopSpeaking, createRecognition, speechSupported, recognitionSupported,
  celebrateBurst, clearSpotlight, estimateSpeechMs,
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
  const [paused, setPaused] = useState(false);
  const [provider, setProvider] = useState(null); // 'vapi' | 'realtime' | 'webspeech'
  const [speaking, setSpeaking] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [reacting, setReacting] = useState(false); // brief pop when a lesson completes
  const [pointing, setPointing] = useState(false); // brief point-at gesture on highlight
  const [listening, setListening] = useState(false);

  const [speakerOn, setSpeakerOn] = useState(true);
  const [micOn, setMicOn] = useState(false); // opt-in only; never forces a mic prompt

  const [activeIdx, setActiveIdx] = useState(0);
  const [expandedIdx, setExpandedIdx] = useState(-1);
  const [checkText, setCheckText] = useState(''); // lesson.ask shown as a light confirm
  const [transcript, setTranscript] = useState([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('');
  const [phase, setPhase] = useState('idle'); // idle|greeting|navigating|narrating|checking|done|paused
  const [, forceTick] = useState(0);

  // Refs so the tour loop reads the latest values without stale closures.
  const ctrlRef = useRef(null);
  const startedRef = useRef(false);
  const pausedRef = useRef(false);
  const speakerRef = useRef(true);
  const micRef = useRef(micOn);
  const providerRef = useRef(null);
  const activeIdxRef = useRef(0);
  const recogRef = useRef(null);
  const scrollRef = useRef(null);
  const handleLaunchRef = useRef(null);
  const prevDoneRef = useRef(0);
  const runIdRef = useRef(0);            // bumps on start/stop to void stale steps
  const timersRef = useRef(new Set());   // every pending tour timeout
  const pointTimerRef = useRef(null);

  useEffect(() => { startedRef.current = started; }, [started]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { speakerRef.current = speakerOn; }, [speakerOn]);
  useEffect(() => { micRef.current = micOn; }, [micOn]);
  useEffect(() => { providerRef.current = provider; }, [provider]);
  useEffect(() => { activeIdxRef.current = activeIdx; }, [activeIdx]);

  const completion = trackCompletion(track.id);

  // Re-render checkmarks + progress when the shared progress store changes.
  useEffect(() => subscribeProgress(() => forceTick(t => t + 1)), []);

  // A little reaction pop whenever a lesson is newly completed (but not the
  // final one, which triggers the full celebration).
  useEffect(() => {
    if (completion.done > prevDoneRef.current && completion.done < completion.total) {
      setReacting(true);
      const id = setTimeout(() => setReacting(false), 640);
      prevDoneRef.current = completion.done;
      return () => clearTimeout(id);
    }
    prevDoneRef.current = completion.done;
  }, [completion.done, completion.total]);

  // Keep the transcript scrolled to the newest turn.
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [transcript, thinking]);

  // Open + cross-launch from anywhere.
  useEffect(() => {
    const onEvt = (e) => { handleLaunchRef.current?.(e.detail || {}); };
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

  /* ---------- timer plumbing (all tour steps run through here) ---------- */
  const clearTimers = useCallback(() => {
    timersRef.current.forEach(id => clearTimeout(id));
    timersRef.current.clear();
  }, []);
  // Schedule a step that is auto-cancelled if the session stops/restarts.
  const schedule = useCallback((fn, ms, myRun) => {
    const id = setTimeout(() => {
      timersRef.current.delete(id);
      if (myRun !== runIdRef.current || !startedRef.current) return;
      fn();
    }, ms);
    timersRef.current.add(id);
    return id;
  }, []);

  /* ---------- character effects ---------- */
  const firePoint = useCallback(() => {
    setPointing(true);
    if (pointTimerRef.current) clearTimeout(pointTimerRef.current);
    pointTimerRef.current = setTimeout(() => setPointing(false), 1400);
  }, []);

  // Speak a single line through whatever is available, then call onEnd. onEnd
  // always fires (even with no TTS at all) so the conductor can chain. Callers
  // guard onEnd against a stale run id, so an unowned late timer is harmless.
  const speakLine = useCallback((text, onEnd) => {
    const prov = providerRef.current;
    if ((prov === 'vapi' || prov === 'realtime') && ctrlRef.current?.say) {
      setSpeaking(true);
      try { ctrlRef.current.say(text); } catch {}
      setTimeout(() => { setSpeaking(false); onEnd?.(); }, estimateSpeechMs(text));
      return;
    }
    if (speechSupported && speakerRef.current) {
      // Fire onEnd exactly once: whichever comes first, the real utterance end
      // or a safety timer. Some browsers (no installed voices, backgrounded
      // tabs, headless) never emit onend/onerror, which would otherwise stall
      // the whole tour, so we always guarantee forward progress.
      let done = false;
      const finish = () => { if (done) return; done = true; setSpeaking(false); onEnd?.(); };
      speak(text, { onStart: () => setSpeaking(true), onEnd: finish });
      const t = setTimeout(finish, estimateSpeechMs(text) + 1400);
      timersRef.current.add(t);
      return;
    }
    // Muted or unsupported: read-along. Pace it to the text so the spotlight
    // stays lit for a natural beat instead of snapping to the next lesson.
    setTimeout(() => onEnd?.(), estimateSpeechMs(text));
  }, []);

  /* ---------- the shared client tool set (used by every provider) ---------- */
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

  const highlightLesson = useCallback((lesson) => {
    try { tools().highlight(lesson.target, lesson.title); } catch {}
    firePoint();
  }, [tools, firePoint]);

  /* ============================================================
     DETERMINISTIC LESSON CONDUCTOR
     ============================================================ */

  // Walk to and narrate a single lesson, then advance. Provider-agnostic:
  // navigate + highlight run as effects for every provider; narration uses our
  // TTS (Web Speech), the live provider's own voice (Vapi/Realtime), or a
  // read-along timer when there is no speech at all.
  const runLesson = useCallback((idx) => {
    if (!startedRef.current) return;
    const lessons = track.lessons;
    const i = Math.max(0, Math.min(lessons.length - 1, idx));
    const lesson = lessons[i];
    const myRun = runIdRef.current;

    // Cancel anything pending from a previous step so jumps are clean.
    clearTimers(); stopSpeaking(); setSpeaking(false);
    setCheckText('');
    setActiveIdx(i); activeIdxRef.current = i;
    setPaused(false); pausedRef.current = false;

    setPhase('navigating');
    try { navigateRef.current(lesson.route); } catch {}

    // Let the route mount, then spotlight (kept lit) and narrate.
    schedule(() => {
      highlightLesson(lesson);
      setPhase('narrating');
      pushTurn('ardo', lesson.say);
      speakLine(lesson.say, () => {
        if (myRun !== runIdRef.current || !startedRef.current) return;
        markLessonDone(track.id, lesson.id, true);
        const isLast = activeIdxRef.current >= lessons.length - 1;
        if (lesson.ask) {
          setPhase('checking');
          setCheckText(lesson.ask);
          // Hands-free: auto-advance after a beat. The user can also click
          // "Got it, next" to move immediately, or Pause to hold here.
          schedule(() => advance(), isLast ? 1600 : 3200, myRun);
        } else {
          schedule(() => advance(), isLast ? 400 : 800, myRun);
        }
      });
    }, 540, myRun);
  }, [track, clearTimers, schedule, highlightLesson, speakLine]); // eslint-disable-line

  // Advance to the next lesson, or finish the tour after the last one.
  const advance = useCallback(() => {
    if (!startedRef.current || pausedRef.current) return;
    const next = activeIdxRef.current + 1;
    if (next >= track.lessons.length) { finishTour(); return; }
    runLesson(next);
  }, [track, runLesson]); // eslint-disable-line

  const finishTour = useCallback(() => {
    clearTimers();
    setPhase('done'); setCheckText('');
    setCelebrating(true); celebrateBurst();
    setStatus('Tour complete. You are ready to run Ardova.');
    const line = `That is the whole ${track.label} track, ${firstName}. You are ready to run Ardova now. Nice work.`;
    pushTurn('ardo', line);
    speakLine(line, () => {});
    setTimeout(() => { clearSpotlight(); }, 900);
    setTimeout(() => setCelebrating(false), 2600);
  }, [track, firstName, clearTimers, speakLine]);

  // A quiet preview (navigate + spotlight, no narration, no progress) used by
  // Prev/Next when the tour has not started yet, so those controls are never
  // dead.
  const previewLesson = useCallback((idx) => {
    const lessons = track.lessons;
    const i = Math.max(0, Math.min(lessons.length - 1, idx));
    const lesson = lessons[i];
    setActiveIdx(i); activeIdxRef.current = i;
    try { navigateRef.current(lesson.route); } catch {}
    setTimeout(() => highlightLesson(lesson), 520);
  }, [track, highlightLesson]);

  // Provider tool "setLesson" -> steer the conductor.
  const handleSetLesson = useCallback((which) => {
    let next = activeIdxRef.current;
    if (which === 'next') next = activeIdxRef.current + 1;
    else if (which === 'prev') next = activeIdxRef.current - 1;
    else if (typeof which === 'number') next = which;
    else if (/^\d+$/.test(String(which))) next = parseInt(which, 10);
    if (startedRef.current) runLesson(next); else previewLesson(next);
  }, [runLesson, previewLesson]);

  /* ---------- start / stop / pause ---------- */
  const stopEverything = useCallback(() => {
    runIdRef.current += 1;
    startedRef.current = false; setStarted(false);
    pausedRef.current = false; setPaused(false);
    setStatus(''); setSpeaking(false); setThinking(false); setListening(false);
    setPhase('idle'); setCheckText('');
    clearTimers(); stopSpeaking(); stopListen(); clearSpotlight();
    try { ctrlRef.current?.stop?.(); } catch {}
    ctrlRef.current = null; setProvider(null); providerRef.current = null;
  }, [clearTimers]); // eslint-disable-line

  // Begin (or, if a session is live, jump within) the walkthrough. Preferred
  // Vapi -> Realtime -> Web Speech. startIdx lets a cross-launch open Ardo
  // straight onto a specific lesson. onClick passes a DOM event, so anything
  // non-numeric falls back to 0.
  const startWalkthrough = useCallback(async (startIdx = 0) => {
    if (startedRef.current) { stopEverything(); return; }
    const idx = (typeof startIdx === 'number' && startIdx >= 0) ? startIdx : 0;

    runIdRef.current += 1;
    const myRun = runIdRef.current;
    setStarted(true); startedRef.current = true;
    setPaused(false); pausedRef.current = false;
    setTranscript([]); setStatus('Warming up...'); setCelebrating(false); setCheckText('');
    setActiveIdx(idx); activeIdxRef.current = idx;

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

    // Session was stopped while we were connecting.
    if (myRun !== runIdRef.current || !startedRef.current) { try { ctrl?.stop?.(); } catch {} return; }

    if (ctrl) {
      ctrlRef.current = ctrl;
      setProvider(ctrl.provider); providerRef.current = ctrl.provider;
      setStatus(ctrl.provider === 'vapi' ? 'Ardo is live on voice' : 'Ardo is live');
      setPhase('greeting');
      // Vapi speaks its own firstMessage greeting; Realtime we greet in text.
      if (ctrl.provider === 'realtime') { pushTurn('ardo', greeting); try { ctrl.say?.(greeting); } catch {} }
      // Then the deterministic tour takes over.
      schedule(() => runLesson(idx), ctrl.provider === 'vapi' ? 3400 : 1400, myRun);
      return;
    }

    // Fallback B: Web Speech (always works, no keys needed).
    setProvider('webspeech'); providerRef.current = 'webspeech';
    setStatus(speechSupported ? 'Ardo is walking you through it' : 'Read along with Ardo');
    setPhase('greeting');
    pushTurn('ardo', greeting);
    speakLine(greeting, () => { if (myRun === runIdRef.current) runLesson(idx); });
  }, [user, track, tools, stopEverything, schedule, runLesson, speakLine]);

  const pauseTour = useCallback(() => {
    pausedRef.current = true; setPaused(true);
    clearTimers(); stopSpeaking(); setSpeaking(false);
    setStatus('Paused. Resume when you are ready.'); setPhase('paused');
  }, [clearTimers]);

  const resumeTour = useCallback(() => {
    pausedRef.current = false; setPaused(false);
    setStatus(''); runLesson(activeIdxRef.current);
  }, [runLesson]);

  // "Got it, next" during a check, and the Prev/Next controls.
  const gotItNext = useCallback(() => { clearTimers(); advance(); }, [clearTimers, advance]);
  const goPrev = useCallback(() => {
    const i = activeIdxRef.current - 1;
    if (startedRef.current) runLesson(i); else previewLesson(i);
  }, [runLesson, previewLesson]);
  const goNext = useCallback(() => {
    const i = activeIdxRef.current + 1;
    if (startedRef.current) runLesson(i); else previewLesson(i);
  }, [runLesson, previewLesson]);

  // Click a lesson row (or its "Show me"): start the tour there in one click,
  // or jump if already live.
  const startOrJump = useCallback((i) => {
    if (startedRef.current) runLesson(i); else startWalkthrough(i);
  }, [runLesson, startWalkthrough]);

  /* ---------- Web Speech listen (opt-in) ---------- */
  const stopListen = useCallback(() => { try { recogRef.current?.stop(); } catch {} recogRef.current = null; setListening(false); }, []);
  const listenOnce = useCallback(() => {
    if (!micRef.current || !recognitionSupported) return;
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

  /* ---------- typed / spoken Q&A (steers back concisely) ---------- */
  const handleAsk = useCallback(async (text, viaVoice = false) => {
    const q = String(text || '').trim();
    if (!q) return;
    pushTurn('user', q);
    if (!viaVoice) setInput('');

    // Live Vapi session: inject the text and let the agent answer via audio.
    if (providerRef.current === 'vapi' && ctrlRef.current?.send?.(q)) {
      setThinking(true); setTimeout(() => setThinking(false), 900); return;
    }

    setThinking(true);
    const res = await askRook({
      question: q,
      history: transcript.map(t => ({ role: t.role === 'user' ? 'user' : 'assistant', content: t.text })),
      path: window.location.pathname,
    });
    setThinking(false);

    if (res?.reply) {
      pushTurn('ardo', res.reply);
      speakLine(res.reply, () => {});
      if (res.nav?.to) { try { navigateRef.current(res.nav.to); } catch {} }
      return;
    }

    // No backend: a CONCISE steer-back to the relevant lesson plus its
    // spotlight, not the whole lesson narration.
    const lesson = track.lessons[activeIdxRef.current];
    const line = steerBackTo(q, lesson);
    pushTurn('ardo', line);
    if (lesson) setTimeout(() => highlightLesson(lesson), 220);
    speakLine(line, () => {});
  }, [transcript, track, speakLine, highlightLesson]);

  /* ---------- cross-launch handler for 'ardova:companion' ----------
     Accepts { open, autoStart, lessonId, skillId, prompt, route, area, label }:
       - open === false closes the dock (backward compatible).
       - lessonId / skillId / route / area resolve to the best lesson and START
         the walkthrough there (greet + navigate + narrate), not just open.
       - autoStart begins the tour from the top.
       - prompt (with no lesson match) seeds a question.
       - bare { open: true } just opens (backward compatible). */
  const handleLaunch = useCallback((detail) => {
    const d = detail || {};
    if (d.open === false) { setOpen(false); return; }
    setOpen(true); setCollapsed(false); setPeek(false);

    let target = null;
    if (d.lessonId) target = findLessonInTrack(track, { lessonId: d.lessonId });
    if (!target && (d.skillId || d.route || d.area || d.label)) {
      target = findLessonInTrack(track, { skillId: d.skillId, route: d.route, area: d.area, label: d.label });
    }

    if (target) { startOrJump(target.index); return; }

    if (d.autoStart) {
      if (startedRef.current) runLesson(0); else startWalkthrough(0);
      if (d.prompt) setTimeout(() => handleAsk(d.prompt, false), 400);
      return;
    }

    // No lesson matched and no autoStart: seed a question if we have one.
    const seed = d.prompt
      || (d.label ? `Teach me the "${d.label}" skill in Ardova and walk me through it step by step.` : null);
    if (seed) setTimeout(() => handleAsk(seed, false), startedRef.current ? 0 : 260);
    // Otherwise a bare open: nothing else to do.
  }, [track, startOrJump, startWalkthrough, runLesson, handleAsk]);

  useEffect(() => { handleLaunchRef.current = handleLaunch; }, [handleLaunch]);

  /* ---------- toggles ---------- */
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

  const toggleExpand = (i) => setExpandedIdx(cur => (cur === i ? -1 : i));

  /* ---------- render helpers ---------- */
  const ardoState = celebrating ? 'celebrate'
    : thinking ? 'thinking'
    : speaking ? 'talking'
    : listening ? 'listening'
    : 'idle';
  const ardoFx = [reacting ? 'ardo-pop' : '', pointing ? 'ardo-point' : ''].filter(Boolean).join(' ');
  const showFull = !collapsed || peek;

  const subText = !started
    ? `${track.label} track`
    : paused ? 'Paused'
    : thinking ? 'Thinking...'
    : speaking ? 'Speaking...'
    : listening ? 'Listening...'
    : phase === 'checking' ? 'Quick check'
    : (status || 'Guiding you');

  const stageStatus = !started
    ? `Hey ${firstName}, ready to learn Ardova?`
    : paused ? 'Paused. Press resume to keep going.'
    : thinking ? 'Let me think...'
    : phase === 'checking' ? 'Quick check, then we roll on'
    : speaking ? 'Ardo is walking you through it...'
    : listening ? 'Go ahead, I am listening'
    : phase === 'done' ? 'You finished the track. Ask me anything.'
    : 'Guiding you through Ardova';

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
          <Character state={ardoState} size={44} className={ardoFx} />
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
            <span className="tc-head__ardo"><Character state={ardoState} size={40} className={ardoFx} /></span>
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
            <div className="tc-stage__ardo"><Character state={ardoState} size={104} className={ardoFx} /></div>
            <div className="tc-stage__status">{stageStatus}</div>

            <div className="tc-stage__row">
              <button className={`tc-start${started ? ' is-live' : ''}`} onClick={() => startWalkthrough(0)}>
                <Icon name={started ? 'x' : 'play'} size={16} />
                {started ? 'Stop' : 'Start with Ardo'}
              </button>
              {started && (
                <button
                  className="tc-icon-btn tc-pause"
                  style={{ width: 'auto', padding: '0 14px', gap: 6, display: 'inline-flex', alignItems: 'center', fontWeight: 800 }}
                  onClick={paused ? resumeTour : pauseTour}
                  aria-label={paused ? 'Resume tour' : 'Pause tour'}
                  title={paused ? 'Resume' : 'Pause'}
                >
                  {paused ? <><Icon name="play" size={16} /> Resume</> : <><span className="tc-pause__bars" aria-hidden><i /><i /></span> Pause</>}
                </button>
              )}
              {recognitionSupported && (
                <button className={`tc-icon-btn${listening ? ' is-live' : micOn ? ' is-on' : ''}`} onClick={toggleMic} aria-label={micOn ? 'Turn mic off' : 'Turn mic on'} title="Microphone">
                  <Icon name="mic" size={18} />
                </button>
              )}
              <button className={`tc-icon-btn${speakerOn ? ' is-on' : ''}`} onClick={toggleSpeaker} aria-label={speakerOn ? 'Mute Ardo' : 'Unmute Ardo'} title="Ardo voice">
                <Icon name={speakerOn ? 'volume2' : 'volumeX'} size={18} />
              </button>
            </div>

            {/* Light "check" step surfaced from lesson.ask. Auto-advances; the
                buttons let the user move now or hold. Never a dead control. */}
            {started && checkText && (
              <div className="tc-check" role="status">
                <div className="tc-check__q"><Icon name="sparkles" size={14} /> {checkText}</div>
                <div className="tc-check__row">
                  <button className="tc-check__btn" onClick={gotItNext}>Got it, next <Icon name="arrowRight" size={13} /></button>
                  {!paused && <button className="tc-check__btn tc-check__btn--ghost" onClick={pauseTour}>Hold on</button>}
                  {paused && <button className="tc-check__btn tc-check__btn--ghost" onClick={resumeTour}>Resume</button>}
                </div>
              </div>
            )}
          </div>

          <div className="tc-body">
            <div className="tc-track-head">
              <span className="tc-track-head__label">{track.label} track</span>
              <span className="tc-track-head__count">{completion.done} / {completion.total} done</span>
            </div>

            {track.lessons.map((lesson, i) => {
              const done = isLessonDone(track.id, lesson.id);
              const active = i === activeIdx;
              const expanded = expandedIdx === i;
              return (
                <div key={lesson.id} className={`tc-lesson${active ? ' is-active' : ''}${done ? ' is-done' : ''}${expanded ? ' is-expanded' : ''}`}>
                  <div className="tc-lesson__row" role="button" tabIndex={0}
                    onClick={() => startOrJump(i)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startOrJump(i); } }}
                    aria-label={`Start the lesson "${lesson.title}" with Ardo`}
                  >
                    <span className="tc-lesson__num">{i + 1}</span>
                    <button type="button"
                      className="tc-lesson__check"
                      role="checkbox" aria-checked={done}
                      onClick={(e) => { e.stopPropagation(); markLessonDone(track.id, lesson.id, !done); }}
                      title={done ? 'Mark as not done' : 'Mark as done'}
                    >
                      <Icon name="check" size={14} />
                    </button>
                    <span className="tc-lesson__main">
                      <span className="tc-lesson__title">{lesson.title}</span>
                      <span className="tc-lesson__meta">{lesson.route}</span>
                    </span>
                    <button type="button" className={`tc-lesson__toggle${expanded ? ' is-open' : ''}`}
                      onClick={(e) => { e.stopPropagation(); toggleExpand(i); }}
                      aria-label={expanded ? 'Hide lesson detail' : 'Show lesson detail'}
                      aria-expanded={expanded}
                    >
                      <Icon name="chevronDown" size={16} />
                    </button>
                  </div>
                  <div className="tc-lesson__expand">
                    <div className="tc-lesson__say">{lesson.say}</div>
                    <button className="tc-lesson__go" onClick={() => startOrJump(i)}>
                      <Icon name="arrowRight" size={13} /> Show me
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="tc-stage__row" style={{ justifyContent: 'space-between', marginTop: 12 }}>
              <button className="tc-icon-btn" style={{ width: 'auto', padding: '0 14px', gap: 6, display: 'inline-flex', alignItems: 'center' }} onClick={goPrev} disabled={activeIdx === 0} aria-label="Previous lesson">
                <Icon name="arrowLeft" size={16} /> Prev
              </button>
              <button className="tc-icon-btn" style={{ width: 'auto', padding: '0 14px', gap: 6, display: 'inline-flex', alignItems: 'center' }} onClick={goNext} disabled={activeIdx >= track.lessons.length - 1} aria-label="Next lesson">
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
