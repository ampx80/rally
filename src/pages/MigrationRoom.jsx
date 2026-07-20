// ============================================================
// MIGRATION ROOM  -  the live, multi-person migration session.
//
// Everyone opens the shared link and lands on this same page together. Mira,
// the Ardovo migration specialist, presents an agenda and walks the whole group
// through bringing their data into Ardovo before anything goes live. Route:
//   /migrate/session/:id
//
// Audio + caption mirroring:
//   - Only the HOST auto-narrates. On "Enable audio" the host tries a keyed
//     realtime voice once (connectRealtimeVoice); when that returns null it
//     falls back to Web Speech speak() per line.
//   - Every spoken line is mirrored to the whole room via actions.setCaption,
//     so non-audio participants always read along.
//   - Guests opt in to hear: they simply speak the current caption locally as
//     it changes. They never drive narration.
//
// Everything is reactive to useSession values and guards optional fields.
// Speech + timers are cleaned up on unmount and on mute. ASCII only. No em-dash
// or en-dash. Reduced-motion is honored by the shared fx.css + companion.css.
// ============================================================
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useSession, joinLink } from '../lib/migration-session.js';
import { SPECIALIST, SYSTEM_PROMPT } from '../lib/migration-agent.js';
import {
  speak, stopSpeaking, connectRealtimeVoice, makeClientTools, estimateSpeechMs, voiceKeyPresent,
} from '../lib/companion-voice.js';
import Character from '../components/companion/Character.jsx';
import { Card, Button, Badge, useToast, avatarColor } from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import './migration-room.css';

/* ---------- Mira's scripted talking lines, one per agenda id ---------- */
const MIRA_SCRIPT = {
  intro: 'Welcome everyone, I am Mira, your migration specialist. Today we bring your data into Ardovo together, and nothing goes live until we all agree it looks right.',
  files: 'Let us look at the files we are bringing in. I read each one and tell you exactly what I found, so we all start from the same picture.',
  mapping: 'Now we map every column to the right Ardovo field. We decide this together, one field at a time, no guessing.',
  custom: 'For anything that does not match a standard field, I keep it as a custom field, so none of your data gets left behind.',
  cleanse: 'Next we clean up duplicates and any messy values. I collapse repeats into one clean record and tidy the rest.',
  preview: 'Here is the exact set of records that will land. Take a good look, because this is what goes in.',
  push: 'When we are all happy, one person pushes and your data is live in Ardovo. Real records you can open and work right away.',
};
function miraLine(sess) {
  const item = sess?.agenda?.[sess?.cursor || 0];
  if (!item) return `${SPECIALIST.name} is getting things ready.`;
  return MIRA_SCRIPT[item.id] || `Next up, ${item.title}.`;
}

/* ---------- small local helpers ---------- */
const initialsOf = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';

const REACTIONS = [
  { emoji: '\u{1F44D}', label: 'Thumbs up' },
  { emoji: '\u{1F389}', label: 'Party' },
  { emoji: '\u2753', label: 'Question' },
];

const startsAtLabel = (iso) => {
  try {
    return new Date(iso).toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  } catch { return ''; }
};

const summaryValue = (x) => (Array.isArray(x) ? x.length : x);

export default function MigrationRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const { self, session, participants, isHost, mode, actions } = useSession(id);

  // ---- audio state ----
  const [audioOn, setAudioOn] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const audioOnRef = useRef(false);
  const controllerRef = useRef(null);   // realtime controller, or null -> Web Speech
  const triedConnectRef = useRef(false);
  const speakTimerRef = useRef(null);
  const lastCaptionRef = useRef(null);   // guest read-along dedupe
  useEffect(() => { audioOnRef.current = audioOn; }, [audioOn]);

  // ---- rename + composer state ----
  const [nameDraft, setNameDraft] = useState(self?.name || '');
  const [msgDraft, setMsgDraft] = useState('');
  const chatEndRef = useRef(null);

  const stage = session?.stage || 'lobby';
  const cursor = session?.cursor || 0;
  const agenda = session?.agenda || [];
  const messages = session?.messages || [];

  /* ============================================================
     SPEECH ENGINE  -  one line at a time, never overlapping.
     ============================================================ */
  const clearSpeakTimer = useCallback(() => {
    if (speakTimerRef.current) { clearTimeout(speakTimerRef.current); speakTimerRef.current = null; }
  }, []);

  const speakLine = useCallback((text) => {
    if (!text) return;
    stopSpeaking();
    clearSpeakTimer();
    setSpeaking(true);
    const done = () => { setSpeaking(false); clearSpeakTimer(); };
    const ctrl = controllerRef.current;
    let usedCtrl = false;
    if (ctrl && typeof ctrl.say === 'function') {
      try { usedCtrl = !!ctrl.say(text); } catch { usedCtrl = false; }
    }
    if (!usedCtrl) {
      speak(text, { onStart: () => setSpeaking(true), onEnd: done });
    }
    // Watchdog: reset the talking state even if no end event ever fires.
    speakTimerRef.current = setTimeout(done, estimateSpeechMs(text) + 1400);
  }, [clearSpeakTimer]);

  // Clean up all speech + timers on unmount.
  useEffect(() => () => {
    stopSpeaking();
    clearSpeakTimer();
    try { controllerRef.current?.stop?.(); } catch {}
    controllerRef.current = null;
  }, [clearSpeakTimer]);

  /* ============================================================
     AUDIO TOGGLE
     ============================================================ */
  const enableAudio = useCallback(async () => {
    setAudioOn(true);
    audioOnRef.current = true;
    if (isHost) {
      // Only open a keyed provider when one is actually configured; otherwise
      // stay on Web Speech so we never probe a missing endpoint (keeps the
      // console clean). Full two-way voice lights up when a key is set.
      if (!triedConnectRef.current && voiceKeyPresent()) {
        triedConnectRef.current = true;
        try {
          controllerRef.current = await connectRealtimeVoice({
            systemPrompt: SYSTEM_PROMPT,
            greeting: '',
            tools: makeClientTools({ navigate }),
            handlers: { onSpeaking: (v) => setSpeaking(!!v), onError: () => {} },
          });
        } catch { controllerRef.current = null; }
      } else {
        try { controllerRef.current?.setMuted?.(false); } catch {}
      }
      if (session?.stage === 'live') speakLine(miraLine(session));
    } else if (session?.caption) {
      // Guests just read the current caption aloud.
      lastCaptionRef.current = session.caption;
      speakLine(session.caption);
    }
  }, [isHost, navigate, session, speakLine]);

  const muteAudio = useCallback(() => {
    setAudioOn(false);
    audioOnRef.current = false;
    stopSpeaking();
    clearSpeakTimer();
    setSpeaking(false);
    try { controllerRef.current?.setMuted?.(true); } catch {}
  }, [clearSpeakTimer]);

  const toggleAudio = useCallback(() => {
    if (audioOn) muteAudio(); else enableAudio();
  }, [audioOn, muteAudio, enableAudio]);

  /* ============================================================
     NARRATION  -  host drives, everyone reads via the caption.
     ============================================================ */
  const lastSpokenRef = useRef({ stage: null, cursor: null });

  // HOST: on cursor / stage change while live, mirror the line to the room and
  // speak it if audio is on. setCaption fires regardless of audio so non-audio
  // participants always read along.
  useEffect(() => {
    if (!session || !isHost) return;
    if (session.stage !== 'live') {
      lastSpokenRef.current = { stage: session.stage, cursor: session.cursor };
      return;
    }
    const already =
      lastSpokenRef.current.stage === 'live' && lastSpokenRef.current.cursor === session.cursor;
    if (already) return;
    lastSpokenRef.current = { stage: 'live', cursor: session.cursor };
    const line = miraLine(session);
    try { actions.setCaption(line); } catch {}
    if (audioOnRef.current) speakLine(line);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.stage, session?.cursor, isHost]);

  // GUEST: when audio is on, read the mirrored caption aloud as it changes.
  useEffect(() => {
    if (!session || isHost || !audioOn) return;
    const cap = session.caption;
    if (!cap || cap === lastCaptionRef.current) return;
    lastCaptionRef.current = cap;
    speakLine(cap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.caption, isHost, audioOn]);

  // Auto-scroll the chat to the newest message.
  useEffect(() => {
    try { chatEndRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch {}
  }, [messages.length]);

  /* ============================================================
     ACTIONS
     ============================================================ */
  function copyLink() {
    const url = joinLink(id);
    const ok = () => toast('Link copied');
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(ok).catch(() => fallbackCopy(url, ok));
    } else {
      fallbackCopy(url, ok);
    }
  }
  function fallbackCopy(url, ok) {
    try {
      const ta = document.createElement('textarea');
      ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove(); ok();
    } catch { toast('Copy is not supported here', 'warn'); }
  }

  function startSession() {
    actions.start();
    if (!audioOn) enableAudio(); // greets the group with Mira's intro line
  }

  function saveName(e) {
    e?.preventDefault?.();
    const next = nameDraft.trim();
    if (!next) { toast('Add a name first', 'warn'); return; }
    actions.rename(next);
    toast('Name updated');
  }

  function sendChat(e) {
    e?.preventDefault?.();
    const t = msgDraft.trim();
    if (!t) return;
    actions.chat(t);
    setMsgDraft('');
  }

  const isLast = agenda.length > 0 && cursor >= agenda.length - 1;

  const captionText = session?.caption
    || (stage === 'live'
      ? miraLine(session)
      : stage === 'ended'
        ? 'That is a wrap. Your data is in Ardovo.'
        : `${SPECIALIST.name} will walk everyone through the migration. ${isHost ? 'Start when the room is ready.' : 'Hang tight, the host will begin soon.'}`);

  const charState = stage === 'ended' ? 'celebrate' : (speaking ? 'talking' : 'idle');

  /* ============================================================
     EMPTY STATE  -  no session for this id.
     ============================================================ */
  if (!session) {
    return (
      <div className="mr fx-scene">
        <div className="mr-empty fx-glass fx-rise">
          <div className="mr-empty-badge fx-float"><Icon name="users" size={26} /></div>
          <h2 className="mr-empty-title">This migration room is not open</h2>
          <p className="mr-empty-body">
            We could not find a session for this link. It may have ended, or the link may be
            incomplete. Start a fresh migration and we will mint a new room you can share.
          </p>
          <Button variant="primary" onClick={() => navigate('/migrate')}>
            <Icon name="rocket" size={16} /> Go to the migration wizard
          </Button>
        </div>
      </div>
    );
  }

  /* ============================================================
     ROOM
     ============================================================ */
  const summary = session.summary;
  const summaryTiles = summary ? [
    summary.rows != null && { label: 'Rows', value: summaryValue(summary.rows) },
    summary.readiness != null && { label: 'Ready', value: `${summaryValue(summary.readiness)}%`, tone: 'ok' },
    summary.files != null && { label: 'Files', value: summaryValue(summary.files) },
    summary.duplicates != null && { label: 'Duplicates', value: summaryValue(summary.duplicates), tone: 'warn' },
    summary.missing != null && { label: 'Missing required', value: summaryValue(summary.missing), tone: 'risk' },
  ].filter(Boolean) : [];

  return (
    <div className="mr fx-scene fx-aurora">
      {/* ---------------- Header ---------------- */}
      <header className="mr-head fx-glass fx-rise">
        <div className="mr-head-main">
          <div className="mr-eyebrow">
            <Icon name="layers" size={13} /> Migration session
            {stage === 'live' && (
              <span className="mr-live"><span className="mr-live-dot fx-pulse" />LIVE</span>
            )}
          </div>
          <h1 className="mr-title fx-holo">{session.title || 'Data migration session'}</h1>
          <div className="mr-chips">
            <span className="mr-chip"><Icon name="command" size={13} /> Room {session.code}</span>
            <span className="mr-chip" title={mode === 'live' ? 'Realtime multi-device sync' : 'Synced across tabs on this browser'}>
              <Icon name="signal" size={13} /> {mode === 'live' ? 'Synced across devices' : 'Synced in this browser'}
            </span>
            {stage === 'lobby' && session.scheduledAt && new Date(session.scheduledAt).getTime() > Date.now() && (
              <span className="mr-chip"><Icon name="clock" size={13} /> Starts {startsAtLabel(session.scheduledAt)}</span>
            )}
          </div>
        </div>
        <div className="mr-head-actions">
          <Button variant="ghost" onClick={copyLink}>
            <Icon name="copy" size={15} /> Copy invite link
          </Button>
        </div>
      </header>

      <div className="mr-grid">
        {/* ============ LEFT: participants ============ */}
        <aside className="mr-col mr-col-left">
          <Card className="mr-panel" pad>
            <div className="mr-panel-head">
              <span><Icon name="users" size={15} /> In the room</span>
              <Badge tone="accent">{participants.length}</Badge>
            </div>
            <ul className="mr-people">
              {participants.map(p => {
                const host = p.id === session.hostId;
                const me = p.id === self?.id;
                return (
                  <li key={p.id} className="mr-person">
                    <span className="mr-ava" style={{ background: avatarColor(p.name) }}>{initialsOf(p.name)}</span>
                    <span className="mr-person-txt">
                      <span className="mr-person-name">{p.name}{me ? ' (you)' : ''}</span>
                      <span className="mr-person-role">{host ? 'Host' : 'Guest'}</span>
                    </span>
                    {host && <span className="mr-host-badge" title="Host"><Icon name="star" size={13} /></span>}
                  </li>
                );
              })}
              {participants.length === 0 && <li className="mr-muted">Waiting for people to join.</li>}
            </ul>

            <form className="mr-rename" onSubmit={saveName}>
              <label className="mr-rename-lbl" htmlFor="mr-name">Your name</label>
              <div className="mr-rename-row">
                <input
                  id="mr-name" className="input" value={nameDraft}
                  onChange={e => setNameDraft(e.target.value)}
                  placeholder="How should we show you?" maxLength={40}
                />
                <Button type="submit" variant="quiet" size="sm">Save</Button>
              </div>
            </form>
          </Card>
        </aside>

        {/* ============ CENTER: presenter + agenda + data ============ */}
        <main className="mr-col mr-col-center">
          {/* Presenter stage */}
          <section className="mr-stage fx-space fx-scan fx-rise">
            <div className="mr-stage-top">
              <div className="mr-presenter">
                <div className={`mr-mira ${speaking ? 'mr-mira-live' : ''}`}>
                  <Character state={charState} size={104} />
                </div>
                <div className="mr-presenter-meta">
                  <div className="mr-presenter-name">{SPECIALIST.name}</div>
                  <div className="mr-presenter-role">{SPECIALIST.role}</div>
                  <div className="mr-presenter-state">
                    <span className={`mr-state-dot ${speaking ? 'is-talking' : ''}`} />
                    {speaking ? 'Speaking' : audioOn ? 'Audio on' : 'Captions on'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className={`mr-audio ${audioOn ? 'is-on' : ''}`}
                onClick={toggleAudio}
                aria-pressed={audioOn}
              >
                <Icon name={audioOn ? 'volume2' : 'volumeX'} size={16} />
                {audioOn ? 'Mute' : 'Enable audio'}
              </button>
            </div>
            <p className="mr-caption" aria-live="polite">{captionText}</p>
          </section>

          {/* Agenda */}
          <Card className="mr-panel" pad>
            <div className="mr-panel-head">
              <span><Icon name="list" size={15} /> Running order</span>
              {stage === 'live' && <Badge tone="accent">Step {Math.min(cursor + 1, agenda.length || 1)} of {agenda.length || 1}</Badge>}
            </div>
            <ol className="mr-agenda">
              {agenda.map((item, i) => {
                const done = item.done || i < cursor;
                const current = stage === 'live' && i === cursor;
                const clickable = isHost;
                return (
                  <li key={item.id || i}>
                    <button
                      type="button"
                      className="mr-agenda-item"
                      data-current={current}
                      data-done={done}
                      disabled={!clickable}
                      onClick={() => clickable && actions.setCursor(i)}
                    >
                      <span className="mr-agenda-mark">
                        {done ? <Icon name="check" size={14} /> : <span className="mr-agenda-num">{i + 1}</span>}
                      </span>
                      <span className="mr-agenda-title">{item.title}</span>
                      {current && <span className="mr-agenda-now">Now</span>}
                    </button>
                  </li>
                );
              })}
              {agenda.length === 0 && <li className="mr-muted">The agenda will appear once the host adds files.</li>}
            </ol>

            {isHost && stage === 'live' && agenda.length > 0 && (
              <div className="mr-agenda-ctrls">
                <Button variant="ghost" size="sm" onClick={actions.prev} disabled={cursor <= 0}>
                  <Icon name="chevronRight" size={14} style={{ transform: 'rotate(180deg)' }} /> Prev
                </Button>
                <Button variant="ghost" size="sm" onClick={actions.next} disabled={isLast}>
                  Next <Icon name="chevronRight" size={14} />
                </Button>
                {isLast ? (
                  <Button variant="primary" size="sm" onClick={actions.end}>
                    <Icon name="check" size={14} /> Finish session
                  </Button>
                ) : (
                  <Button variant="primary" size="sm" onClick={actions.next}>
                    <Icon name="check" size={14} /> This is done
                  </Button>
                )}
              </div>
            )}
          </Card>

          {/* Shared data */}
          <Card className="mr-panel" pad>
            <div className="mr-panel-head">
              <span><Icon name="beaker" size={15} /> What we are looking at</span>
              {isHost && (
                <Button variant="quiet" size="sm" onClick={() => navigate('/migrate')}>
                  <Icon name="sparkles" size={14} /> Open the data wizard
                </Button>
              )}
            </div>

            {summaryTiles.length > 0 ? (
              <div className="mr-tiles">
                {summaryTiles.map(t => (
                  <div key={t.label} className={`mr-tile fx-glass ${t.tone ? `mr-tile-${t.tone}` : ''}`}>
                    <div className="mr-tile-value">{t.value}</div>
                    <div className="mr-tile-label">{t.label}</div>
                  </div>
                ))}
              </div>
            ) : session.files?.length ? (
              <ul className="mr-files">
                {session.files.map((f, i) => (
                  <li key={i} className="mr-file">
                    <span className="mr-file-ic"><Icon name="fileText" size={15} /></span>
                    <span className="mr-file-txt">
                      <span className="mr-file-name">{f.name}</span>
                      <span className="mr-file-meta">
                        {f.target || 'records'}{f.rows != null ? ` - ${f.rows} rows` : ''}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mr-muted mr-hint">
                No shared data yet. {isHost ? 'Drop files in the data wizard and they show up here for the whole room.' : 'The host will drop files in the wizard, and the numbers will appear here live.'}
              </div>
            )}
          </Card>

          {/* Host lobby / ended controls */}
          {isHost && stage === 'lobby' && (
            <Card className="mr-panel mr-cta fx-neon" pad>
              <div className="mr-cta-txt">
                <div className="mr-cta-title">Ready to begin?</div>
                <div className="mr-muted">Starting the session greets the room and puts everyone on the same step.</div>
              </div>
              <Button variant="primary" onClick={startSession}>
                <Icon name="play" size={16} /> Start session
              </Button>
            </Card>
          )}

          {stage === 'ended' && (
            <Card className="mr-panel mr-recap" pad>
              <div className="mr-recap-head"><Icon name="check" size={16} /> Session complete</div>
              <p className="mr-muted" style={{ margin: '6px 0 12px' }}>
                {summaryTiles.length
                  ? 'Your data is in Ardovo. Here is where the room landed.'
                  : 'Thanks for migrating together. You can head back to the wizard anytime.'}
              </p>
              {summaryTiles.length > 0 && (
                <div className="mr-tiles" style={{ marginBottom: 12 }}>
                  {summaryTiles.map(t => (
                    <div key={t.label} className={`mr-tile fx-glass ${t.tone ? `mr-tile-${t.tone}` : ''}`}>
                      <div className="mr-tile-value">{t.value}</div>
                      <div className="mr-tile-label">{t.label}</div>
                    </div>
                  ))}
                </div>
              )}
              <Button variant="primary" onClick={() => navigate('/migrate')}>
                <Icon name="rocket" size={15} /> Back to wizard
              </Button>
            </Card>
          )}
        </main>

        {/* ============ RIGHT: group chat ============ */}
        <aside className="mr-col mr-col-right">
          <Card className="mr-panel mr-chat" pad>
            <div className="mr-panel-head">
              <span><Icon name="send" size={15} /> Group chat</span>
              <Badge>{messages.length}</Badge>
            </div>

            <div className="mr-stream">
              {messages.length === 0 && (
                <div className="mr-muted mr-stream-empty">
                  No messages yet. Say hello or drop a reaction below.
                </div>
              )}
              {messages.map(m => (
                m.kind === 'reaction' ? (
                  <div key={m.id} className="mr-react">
                    <span className="mr-react-emoji" aria-hidden>{m.text}</span>
                    <span className="mr-react-from">{m.from} reacted</span>
                  </div>
                ) : (
                  <div key={m.id} className="mr-msg">
                    <span className="mr-msg-ava" style={{ background: avatarColor(m.from) }}>{initialsOf(m.from)}</span>
                    <div className="mr-msg-body">
                      <div className="mr-msg-from">{m.from}</div>
                      <div className="mr-msg-text">{m.text}</div>
                    </div>
                  </div>
                )
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="mr-reactions" role="group" aria-label="Send a reaction">
              {REACTIONS.map(r => (
                <button
                  key={r.label} type="button" className="mr-react-btn"
                  onClick={() => actions.react(r.emoji)} aria-label={r.label} title={r.label}
                >
                  <span aria-hidden>{r.emoji}</span>
                </button>
              ))}
            </div>

            <form className="mr-chatform" onSubmit={sendChat}>
              <input
                className="input" value={msgDraft} onChange={e => setMsgDraft(e.target.value)}
                placeholder="Message the room" aria-label="Message the room" maxLength={500}
              />
              <Button type="submit" variant="primary" size="sm" aria-label="Send message">
                <Icon name="send" size={15} />
              </Button>
            </form>
          </Card>
        </aside>
      </div>
    </div>
  );
}
