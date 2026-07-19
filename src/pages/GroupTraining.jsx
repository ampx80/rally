// Group Training - schedule and run GROUP training sessions where a manager
// trains several people at once. Captures a shared notes stream plus live
// dictation (browser SpeechRecognition), can launch a guided walkthrough via
// the 'rally:coach' event, and produces an AI meeting recap on end (with a
// deterministic fallback when the summarizer endpoint is env-gated off).
// Teal is the product; violet marks the AI / live layer. NO em-dash / en-dash.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  useTraining, getGroups, createGroup, startGroup, addGroupNote, endGroup,
  deleteGroup, MODULES, getModule,
} from '../lib/training.js';
import { getUsers, getCurrentUser } from '../lib/store.js';
import {
  SectionHeader, Card, Button, Badge, StatCard, Field, Input, Select, Textarea,
  useToast, relTime, EmptyState,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import AgentDeck from '../components/agent/AgentDeck.jsx';

/* ---------- small local helpers ---------- */
const AV_COLORS = ['#0e9f8f', '#2563a8', '#7c5cf7', '#e0752d', '#1a7f52', '#c0392b', '#0b8578', '#d4a017'];
function avColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AV_COLORS[Math.abs(h) % AV_COLORS.length];
}
const initialsOf = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';

const STATUS_META = {
  scheduled: { label: 'Scheduled', color: 'var(--accent-600)', bg: 'var(--accent-50)', icon: 'calendar' },
  live: { label: 'Live', color: 'var(--ai-600)', bg: 'var(--ai-50)', icon: 'activity' },
  done: { label: 'Done', color: 'var(--ok)', bg: 'var(--ok-bg)', icon: 'check' },
};

const speechCtor = () =>
  (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) || null;

export default function GroupTraining() {
  useTraining(); // reactive: re-render on any group mutation
  const toast = useToast();

  const users = getUsers();
  const me = getCurrentUser();
  const userById = useMemo(() => Object.fromEntries(users.map(u => [u.id, u])), [users]);

  const groups = getGroups();
  const supportsSpeech = useMemo(() => !!speechCtor(), []);

  // composer state
  const [title, setTitle] = useState('');
  const [pickedModules, setPickedModules] = useState([]);
  const [pickedPeople, setPickedPeople] = useState([]);
  const [when, setWhen] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');

  // run panel + done panel state
  const [runId, setRunId] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [coachModuleId, setCoachModuleId] = useState('');
  const [expandedDone, setExpandedDone] = useState(null);

  // dictation state
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const recRef = useRef(null);
  const runIdRef = useRef(null);
  useEffect(() => { runIdRef.current = runId; }, [runId]);

  const notesEndRef = useRef(null);

  // stop any live recognition on unmount
  useEffect(() => () => { try { recRef.current?.stop(); } catch {} }, []);

  const byStatus = useMemo(() => {
    const b = { scheduled: [], live: [], done: [] };
    for (const g of groups) (b[g.status] || b.scheduled).push(g);
    return b;
  }, [groups]);

  const pods = useMemo(() => {
    const trained = new Set();
    byStatus.done.forEach(g => (g.participants || []).forEach(id => trained.add(id)));
    return [
      { label: 'Sessions', value: groups.length, icon: 'users' },
      { label: 'Scheduled', value: byStatus.scheduled.length, icon: 'calendar' },
      { label: 'Live now', value: byStatus.live.length, icon: 'activity' },
      { label: 'People trained', value: trained.size, icon: 'check' },
    ];
  }, [groups.length, byStatus]);

  const filteredModules = useMemo(() => {
    const q = moduleFilter.trim().toLowerCase();
    if (!q) return MODULES;
    return MODULES.filter(m => (m.title + ' ' + m.area).toLowerCase().includes(q));
  }, [moduleFilter]);

  const runGroup = runId ? groups.find(g => g.id === runId) : null;

  /* ---------- composer ---------- */
  function toggleModule(id) {
    setPickedModules(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  }
  function togglePerson(id) {
    setPickedPeople(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  }
  function resetComposer() {
    setTitle(''); setPickedModules([]); setPickedPeople([]); setWhen(''); setModuleFilter('');
  }
  function handleCreate(e) {
    e?.preventDefault?.();
    if (!title.trim()) { toast('Give the session a title', 'warn'); return; }
    if (pickedPeople.length === 0) { toast('Add at least one participant', 'warn'); return; }
    const scheduledAt = when ? new Date(when).toISOString() : new Date().toISOString();
    createGroup({ title: title.trim(), moduleIds: pickedModules, participants: pickedPeople, scheduledAt });
    toast('Session scheduled');
    resetComposer();
  }

  /* ---------- run lifecycle ---------- */
  function openRun(g) {
    if (g.status === 'scheduled') startGroup(g.id);
    setRunId(g.id);
    setCoachModuleId(g.moduleIds?.[0] || '');
    setNoteText(''); setInterim('');
    setTimeout(() => notesEndRef.current?.scrollIntoView({ block: 'nearest' }), 60);
  }
  function closeRun() {
    stopDictation();
    setRunId(null); setNoteText(''); setInterim('');
  }
  function submitNote() {
    const t = noteText.trim();
    if (!t) return;
    addGroupNote(runIdRef.current, t);
    setNoteText('');
    setTimeout(() => notesEndRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 40);
  }

  /* ---------- dictation ---------- */
  function stopDictation() {
    try { recRef.current?.stop(); } catch {}
    recRef.current = null;
    setListening(false);
    setInterim('');
  }
  function toggleDictation() {
    const Ctor = speechCtor();
    if (!Ctor) return;
    if (listening) { stopDictation(); return; }
    let rec;
    try { rec = new Ctor(); } catch { toast('Dictation could not start', 'risk'); return; }
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = (ev) => {
      let live = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) {
          const text = (r[0]?.transcript || '').trim();
          if (text && runIdRef.current) {
            addGroupNote(runIdRef.current, text);
            setTimeout(() => notesEndRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 40);
          }
        } else {
          live += r[0]?.transcript || '';
        }
      }
      setInterim(live);
    };
    rec.onerror = (e) => { if (e?.error !== 'no-speech') toast('Dictation error', 'warn'); stopDictation(); };
    rec.onend = () => { setListening(false); setInterim(''); };
    recRef.current = rec;
    try { rec.start(); setListening(true); }
    catch { stopDictation(); }
  }

  /* ---------- guided walkthrough ---------- */
  function launchCoach() {
    const moduleId = coachModuleId || runGroup?.moduleIds?.[0];
    if (!moduleId) { toast('No module on this session', 'warn'); return; }
    window.dispatchEvent(new CustomEvent('rally:coach', { detail: { moduleId } }));
    toast('Guided walkthrough launched');
  }

  /* ---------- end + summarize ---------- */
  function fallbackSummary(g) {
    const mods = (g.moduleIds || []).map(id => getModule(id)?.title).filter(Boolean);
    const n = (g.notes || []).length;
    return `Ran "${g.title}" with ${g.participants.length} participant${g.participants.length === 1 ? '' : 's'} across ${g.moduleIds.length} module${g.moduleIds.length === 1 ? '' : 's'}${mods.length ? ': ' + mods.join(', ') : ''}. ${n} note${n === 1 ? '' : 's'} captured.`;
  }
  async function handleEnd(g) {
    stopDictation();
    const joined = (g.notes || []).map(n => `[${new Date(n.at).toLocaleTimeString()}] ${n.by}: ${n.text}`).join('\n');
    const fallback = fallbackSummary(g);
    try {
      const res = await fetch('/api/training-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: joined || fallback, user: g.facilitator }),
      });
      const data = await res.json().catch(() => ({}));
      endGroup(g.id, { summary: (data && data.summary) || fallback, actionItems: [] });
      toast(data && data.ok && data.summary ? 'AI recap ready' : 'Session summarized');
    } catch {
      endGroup(g.id, { summary: fallback, actionItems: [] });
      toast('Session summarized');
    }
    if (runIdRef.current === g.id) closeRun();
  }

  function removeGroup(g) {
    if (runIdRef.current === g.id) closeRun();
    deleteGroup(g.id);
    toast('Session removed');
  }

  const hasGroups = groups.length > 0;

  return (
    <div className="fade-up gt">
      <AgentDeck
        eyebrow="Group Training"
        title="Train the whole team,"
        highlight="captured and recapped."
        sub="Schedule a live session, run it for several people at once, and let Ardovo take the notes. Dictate as you teach, launch a guided walkthrough, and get an AI meeting recap the moment you wrap."
        pods={pods}
      />

      {/* ---------------- Composer ---------------- */}
      <Card className="gt-composer" pad>
        <SectionHeader
          eyebrow="New session"
          title="Schedule a session"
          sub="Pick the agenda and who is in the room. Start it now or set a time."
        />
        <form onSubmit={handleCreate} className="col gap-3" style={{ marginTop: '1rem' }}>
          <div className="gt-comp-grid">
            <Field label="Session title">
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Q3 onboarding: pipeline hygiene" />
            </Field>
            <Field label="When" hint="Leave blank to start now">
              <Input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} />
            </Field>
          </div>

          <div className="col gap-1">
            <div className="row between" style={{ alignItems: 'center' }}>
              <label className="gt-lbl">Agenda modules {pickedModules.length > 0 && <Badge tone="accent">{pickedModules.length}</Badge>}</label>
              <div style={{ width: 200 }}>
                <Input value={moduleFilter} onChange={e => setModuleFilter(e.target.value)} placeholder="Filter modules" aria-label="Filter modules" />
              </div>
            </div>
            <div className="gt-picker" role="group" aria-label="Choose modules">
              {filteredModules.map(m => {
                const on = pickedModules.includes(m.id);
                return (
                  <button type="button" key={m.id} className="gt-modchip" data-on={on} onClick={() => toggleModule(m.id)}>
                    <span className="gt-modchip-top">
                      {on && <Icon name="check" size={13} />}
                      <span className="gt-modchip-title">{m.title}</span>
                    </span>
                    <span className="gt-modchip-meta">{m.area} - {m.minutes} min - {m.level}</span>
                  </button>
                );
              })}
              {filteredModules.length === 0 && <div className="gt-muted" style={{ padding: '.5rem' }}>No modules match that filter.</div>}
            </div>
          </div>

          <div className="col gap-1">
            <label className="gt-lbl">Participants {pickedPeople.length > 0 && <Badge tone="accent">{pickedPeople.length}</Badge>}</label>
            <div className="gt-people" role="group" aria-label="Choose participants">
              {users.map(u => {
                const on = pickedPeople.includes(u.id);
                return (
                  <button type="button" key={u.id} className="gt-person" data-on={on} onClick={() => togglePerson(u.id)}>
                    <span className="gt-ava" style={{ background: avColor(u.name) }}>{initialsOf(u.name)}</span>
                    <span className="gt-person-txt">
                      <span className="gt-person-name">{u.name}{me && u.id === me.id ? ' (you)' : ''}</span>
                      <span className="gt-person-title">{u.title}</span>
                    </span>
                    {on && <Icon name="check" size={15} className="gt-person-check" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="row gap-2" style={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            {(title || pickedModules.length || pickedPeople.length || when) && (
              <Button type="button" variant="ghost" onClick={resetComposer}>Clear</Button>
            )}
            <Button type="submit" variant="primary"><Icon name="plus" size={15} /> Schedule session</Button>
          </div>
        </form>
      </Card>

      {/* ---------------- Live run panel ---------------- */}
      {runGroup && runGroup.status === 'live' && (
        <RunPanel
          g={runGroup}
          userById={userById}
          noteText={noteText}
          setNoteText={setNoteText}
          submitNote={submitNote}
          supportsSpeech={supportsSpeech}
          listening={listening}
          interim={interim}
          toggleDictation={toggleDictation}
          coachModuleId={coachModuleId}
          setCoachModuleId={setCoachModuleId}
          launchCoach={launchCoach}
          onEnd={() => handleEnd(runGroup)}
          onClose={closeRun}
          notesEndRef={notesEndRef}
        />
      )}

      {/* ---------------- Sessions ---------------- */}
      {!hasGroups ? (
        <Card pad style={{ marginTop: '1.25rem' }}>
          <EmptyState
            icon="🎓"
            title="No group sessions yet"
            body="Schedule your first session above. Pick an agenda and the people in the room, then start it live to capture shared notes and an AI recap."
          />
        </Card>
      ) : (
        <div className="col gap-3" style={{ marginTop: '1.5rem' }}>
          {(['live', 'scheduled', 'done']).map(status => {
            const list = byStatus[status];
            if (!list.length) return null;
            const meta = STATUS_META[status];
            return (
              <section key={status} className="col gap-2">
                <div className="row gap-2" style={{ alignItems: 'center' }}>
                  <span className="gt-sec-ic" style={{ color: meta.color, background: meta.bg }}><Icon name={meta.icon} size={15} /></span>
                  <h3 className="gt-sec-h">{meta.label}</h3>
                  <Badge tone={status === 'live' ? 'accent' : 'default'}>{list.length}</Badge>
                </div>
                <div className="gt-cards">
                  {list.map(g => (
                    <SessionCard
                      key={g.id}
                      g={g}
                      userById={userById}
                      isOpen={runId === g.id}
                      onOpen={() => openRun(g)}
                      onEnd={() => handleEnd(g)}
                      onDelete={() => removeGroup(g)}
                      expanded={expandedDone === g.id}
                      onToggleExpand={() => setExpandedDone(x => x === g.id ? null : g.id)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <GroupTrainingStyles />
    </div>
  );
}

/* ============================================================
   Session card
   ============================================================ */
function SessionCard({ g, userById, isOpen, onOpen, onEnd, onDelete, expanded, onToggleExpand }) {
  const meta = STATUS_META[g.status];
  const people = (g.participants || []).map(id => userById[id]).filter(Boolean);
  const shown = people.slice(0, 5);
  const extra = people.length - shown.length;

  return (
    <div className="gt-card" data-status={g.status} data-open={isOpen}>
      <div className="row between" style={{ alignItems: 'flex-start', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div className="gt-card-title">{g.title}</div>
          <div className="gt-card-sub">
            {g.moduleIds.length} module{g.moduleIds.length === 1 ? '' : 's'} - {g.participants.length} participant{g.participants.length === 1 ? '' : 's'}
          </div>
        </div>
        <span className="gt-status" style={{ color: meta.color, background: meta.bg }}>
          {g.status === 'live' && <span className="gt-pulse" />}{meta.label}
        </span>
      </div>

      <div className="gt-avastack">
        {shown.map((u, i) => (
          <span key={u.id} className="gt-ava gt-ava-sm" title={u.name} style={{ background: avColor(u.name), marginLeft: i ? -8 : 0, zIndex: shown.length - i }}>
            {initialsOf(u.name)}
          </span>
        ))}
        {extra > 0 && <span className="gt-ava gt-ava-sm gt-ava-more" style={{ marginLeft: -8 }}>+{extra}</span>}
        {people.length === 0 && <span className="gt-muted">No participants</span>}
      </div>

      <div className="gt-card-foot">
        <span className="gt-foot-item"><Icon name="user" size={13} /> {g.facilitator}</span>
        <span className="gt-foot-item"><Icon name="clock" size={13} /> {relTime(g.scheduledAt)}</span>
        {g.status === 'live' && (g.notes?.length > 0) && <span className="gt-foot-item"><Icon name="fileText" size={13} /> {g.notes.length} notes</span>}
      </div>

      {g.status === 'done' && (
        <div className="gt-summary">
          <div className="gt-summary-head"><Icon name="sparkles" size={14} /> Recap</div>
          <p className="gt-summary-body">{g.summary}</p>
          {g.transcript ? (
            <>
              <button className="gt-link" onClick={onToggleExpand}>
                <Icon name="chevronDown" size={13} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
                {expanded ? 'Hide transcript' : 'Full transcript'}
              </button>
              {expanded && <pre className="gt-transcript">{g.transcript}</pre>}
            </>
          ) : (
            <span className="gt-muted t-xs">No notes were captured in this session.</span>
          )}
        </div>
      )}

      <div className="gt-card-actions">
        {g.status === 'scheduled' && (
          <>
            <Button variant="primary" size="sm" onClick={onOpen}><Icon name="play" size={14} /> Start</Button>
            <Button variant="ghost" size="sm" onClick={onDelete} aria-label="Delete session"><Icon name="trash" size={14} /></Button>
          </>
        )}
        {g.status === 'live' && (
          <>
            <Button variant="primary" size="sm" onClick={onOpen}>{isOpen ? 'Focused below' : 'Open live panel'} <Icon name="chevronRight" size={14} /></Button>
            <Button variant="ghost" size="sm" onClick={onEnd}><Icon name="check" size={14} /> End + summarize</Button>
          </>
        )}
        {g.status === 'done' && (
          <Button variant="ghost" size="sm" onClick={onDelete} aria-label="Delete session"><Icon name="trash" size={14} /> Remove</Button>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Live run panel
   ============================================================ */
function RunPanel({
  g, userById, noteText, setNoteText, submitNote, supportsSpeech, listening, interim,
  toggleDictation, coachModuleId, setCoachModuleId, launchCoach, onEnd, onClose, notesEndRef,
}) {
  const agenda = (g.moduleIds || []).map(id => getModule(id)).filter(Boolean);
  const notes = g.notes || [];

  return (
    <Card className="gt-run" pad style={{ marginTop: '1.25rem' }}>
      <div className="row between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div className="gt-run-eyebrow"><span className="gt-pulse" /> Live session</div>
          <h3 className="gt-run-title">{g.title}</h3>
          <div className="gt-card-sub">Facilitated by {g.facilitator} - {g.participants.length} in the room</div>
        </div>
        <div className="row gap-2" style={{ flex: 'none', flexWrap: 'wrap' }}>
          <Button variant="primary" size="sm" onClick={onEnd}><Icon name="check" size={14} /> End + summarize</Button>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close live panel"><Icon name="x" size={14} /></Button>
        </div>
      </div>

      <div className="gt-run-grid">
        {/* Agenda + walkthrough */}
        <div className="col gap-2">
          <div className="gt-panel">
            <div className="gt-panel-head"><Icon name="layers" size={15} /> Agenda</div>
            {agenda.length === 0 && <div className="gt-muted" style={{ padding: '.35rem 0' }}>No modules on this session. Capture freeform notes on the right.</div>}
            <ol className="gt-agenda">
              {agenda.map(m => (
                <li key={m.id} className="gt-agenda-item">
                  <span className="gt-agenda-ic"><Icon name={m.icon || 'book'} size={15} /></span>
                  <span style={{ minWidth: 0 }}>
                    <span className="gt-agenda-title">{m.title}</span>
                    <span className="gt-agenda-meta">{m.area} - {m.minutes} min</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="gt-panel gt-panel--ai">
            <div className="gt-panel-head"><Icon name="sparkles" size={15} /> Guided walkthrough</div>
            <p className="gt-muted" style={{ margin: '0 0 .6rem', fontSize: 13, lineHeight: 1.5 }}>
              Have Rook drive the UI and highlight each step for a module while you talk the room through it.
            </p>
            {agenda.length > 0 ? (
              <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <Select value={coachModuleId} onChange={e => setCoachModuleId(e.target.value)} aria-label="Walkthrough module">
                    {agenda.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                  </Select>
                </div>
                <Button variant="accent" size="sm" onClick={launchCoach}><Icon name="play" size={14} /> Launch</Button>
              </div>
            ) : (
              <span className="gt-muted t-xs">Add modules to the agenda to enable a walkthrough.</span>
            )}
          </div>
        </div>

        {/* Shared notes stream + dictation */}
        <div className="gt-panel gt-notes">
          <div className="row between" style={{ alignItems: 'center' }}>
            <div className="gt-panel-head" style={{ margin: 0 }}><Icon name="fileText" size={15} /> Shared notes</div>
            {supportsSpeech && (
              <button className="gt-mic" data-on={listening} onClick={toggleDictation} type="button" aria-pressed={listening} title={listening ? 'Stop dictation' : 'Start dictation'}>
                <Icon name="mic" size={15} />
                {listening ? 'Listening' : 'Dictate'}
              </button>
            )}
          </div>

          <div className="gt-stream">
            {notes.length === 0 && !interim && (
              <div className="gt-muted" style={{ textAlign: 'center', padding: '1.4rem .5rem', fontSize: 13 }}>
                No notes yet. Type below{supportsSpeech ? ' or hit Dictate to transcribe as you teach.' : '.'}
              </div>
            )}
            {notes.map((n, i) => (
              <div key={i} className="gt-note">
                <span className="gt-ava gt-ava-xs" style={{ background: avColor(n.by) }}>{initialsOf(n.by)}</span>
                <div style={{ minWidth: 0 }}>
                  <div className="gt-note-meta">{n.by} - {new Date(n.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
                  <div className="gt-note-text">{n.text}</div>
                </div>
              </div>
            ))}
            {interim && (
              <div className="gt-note gt-note--interim">
                <span className="gt-ava gt-ava-xs" style={{ background: 'var(--ai-600)' }}><Icon name="mic" size={12} /></span>
                <div style={{ minWidth: 0 }}>
                  <div className="gt-note-meta">Transcribing</div>
                  <div className="gt-note-text">{interim}</div>
                </div>
              </div>
            )}
            <div ref={notesEndRef} />
          </div>

          <form className="gt-noteform" onSubmit={(e) => { e.preventDefault(); submitNote(); }}>
            <Textarea
              rows={2}
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submitNote(); } }}
              placeholder="Add a shared note. Ctrl or Cmd + Enter to post."
              aria-label="Add a shared note"
            />
            <Button type="submit" variant="primary" size="sm"><Icon name="plus" size={14} /> Add note</Button>
          </form>
        </div>
      </div>
    </Card>
  );
}

/* ============================================================
   Scoped styles (gt- prefix)
   ============================================================ */
function GroupTrainingStyles() {
  return (
    <style>{`
    .gt { --gt-radius: 14px; }
    .gt-muted { color: var(--n-600); }

    .gt-composer { margin-top: 1.25rem; }
    .gt-comp-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 1rem; }
    @media (max-width: 620px) { .gt-comp-grid { grid-template-columns: 1fr; } }
    .gt-lbl { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 700; color: var(--ink); }

    .gt-picker { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px; max-height: 240px; overflow-y: auto; padding: 4px; border: 1px solid var(--line); border-radius: 12px; background: var(--n-25); }
    .gt-modchip { text-align: left; display: flex; flex-direction: column; gap: 3px; padding: 9px 11px; border: 1px solid var(--line); border-radius: 10px; background: var(--paper); cursor: pointer; font-family: inherit; transition: border-color .12s, box-shadow .12s, background .12s; }
    .gt-modchip:hover { border-color: var(--accent); }
    .gt-modchip[data-on="true"] { border-color: var(--accent); background: var(--accent-50); box-shadow: inset 0 0 0 1px var(--accent); }
    .gt-modchip-top { display: flex; align-items: center; gap: 6px; color: var(--accent-600); }
    .gt-modchip-title { font-size: 13px; font-weight: 700; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .gt-modchip-meta { font-size: 11.5px; color: var(--n-600); }

    .gt-people { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 8px; }
    .gt-person { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 12px; background: var(--paper); cursor: pointer; font-family: inherit; text-align: left; transition: border-color .12s, background .12s; }
    .gt-person:hover { border-color: var(--accent); }
    .gt-person[data-on="true"] { border-color: var(--accent); background: var(--accent-50); box-shadow: inset 0 0 0 1px var(--accent); }
    .gt-person-txt { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .gt-person-name { font-size: 13px; font-weight: 700; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .gt-person-title { font-size: 11.5px; color: var(--n-600); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .gt-person-check { color: var(--accent-600); flex: none; }

    .gt-ava { display: grid; place-items: center; border-radius: 50%; color: #fff; font-weight: 800; width: 34px; height: 34px; font-size: 13px; flex: none; }
    .gt-ava-sm { width: 30px; height: 30px; font-size: 12px; border: 2px solid var(--paper); }
    .gt-ava-xs { width: 26px; height: 26px; font-size: 11px; }
    .gt-ava-more { background: var(--n-200); color: var(--n-600); }

    .gt-sec-ic { width: 28px; height: 28px; border-radius: 9px; display: grid; place-items: center; flex: none; }
    .gt-sec-h { margin: 0; font-size: 16px; }

    .gt-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem; }
    .gt-card { background: var(--paper); border: 1px solid var(--line); border-radius: var(--gt-radius); padding: 15px; display: flex; flex-direction: column; gap: 12px; transition: border-color .15s, box-shadow .15s; }
    .gt-card:hover { box-shadow: var(--shadow-sm); }
    .gt-card[data-status="live"] { border-color: rgba(124,92,247,.45); }
    .gt-card[data-open="true"] { border-color: var(--ai); box-shadow: 0 0 0 1px var(--ai); }
    .gt-card-title { font-weight: 800; font-size: 15px; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .gt-card-sub { font-size: 12.5px; color: var(--n-600); margin-top: 2px; }
    .gt-status { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 800; padding: 4px 10px; border-radius: 999px; flex: none; }
    .gt-pulse { width: 7px; height: 7px; border-radius: 50%; background: currentColor; box-shadow: 0 0 0 0 currentColor; animation: gtpulse 1.6s infinite; }
    @keyframes gtpulse { 0% { box-shadow: 0 0 0 0 rgba(124,92,247,.5); } 70% { box-shadow: 0 0 0 6px rgba(124,92,247,0); } 100% { box-shadow: 0 0 0 0 rgba(124,92,247,0); } }

    .gt-avastack { display: flex; align-items: center; min-height: 30px; }
    .gt-card-foot { display: flex; flex-wrap: wrap; gap: 12px; border-top: 1px solid var(--line); padding-top: 10px; }
    .gt-foot-item { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: var(--n-600); }

    .gt-summary { background: var(--ai-50); border: 1px solid rgba(124,92,247,.2); border-radius: 11px; padding: 11px 12px; }
    .gt-summary-head { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 800; color: var(--ai-600); text-transform: uppercase; letter-spacing: .03em; }
    .gt-summary-body { margin: 6px 0 8px; font-size: 13px; color: var(--ink-2); line-height: 1.5; }
    .gt-transcript { margin: 8px 0 0; padding: 10px; background: var(--paper); border: 1px solid var(--line); border-radius: 9px; font-family: var(--font-mono); font-size: 11.5px; line-height: 1.55; color: var(--n-600); white-space: pre-wrap; max-height: 240px; overflow-y: auto; }

    .gt-link { display: inline-flex; align-items: center; gap: 4px; background: none; border: none; font-family: inherit; font-weight: 700; font-size: 12.5px; color: var(--ai-600); cursor: pointer; padding: 0; }
    .gt-card-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: auto; }

    /* run panel */
    .gt-run { border-color: rgba(124,92,247,.4) !important; box-shadow: 0 0 0 1px rgba(124,92,247,.18); }
    .gt-run-eyebrow { display: inline-flex; align-items: center; gap: 7px; color: var(--ai-600); font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; }
    .gt-run-title { margin: 4px 0 2px; font-size: 20px; }
    .gt-run-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); gap: 1rem; margin-top: 1.1rem; }
    @media (max-width: 820px) { .gt-run-grid { grid-template-columns: 1fr; } }

    .gt-panel { border: 1px solid var(--line); border-radius: 12px; padding: 13px 14px; background: var(--paper); }
    .gt-panel--ai { background: var(--ai-50); border-color: rgba(124,92,247,.22); }
    .gt-panel-head { display: flex; align-items: center; gap: 7px; font-size: 13.5px; font-weight: 800; color: var(--ink); margin-bottom: 9px; }

    .gt-agenda { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
    .gt-agenda-item { display: flex; align-items: center; gap: 10px; }
    .gt-agenda-ic { width: 32px; height: 32px; border-radius: 9px; flex: none; display: grid; place-items: center; color: var(--accent-600); background: var(--accent-50); }
    .gt-agenda-title { display: block; font-size: 13.5px; font-weight: 700; color: var(--ink); }
    .gt-agenda-meta { display: block; font-size: 11.5px; color: var(--n-600); }

    .gt-notes { display: flex; flex-direction: column; }
    .gt-mic { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--line-strong); background: var(--paper); color: var(--n-600); font-family: inherit; font-weight: 700; font-size: 12.5px; padding: 5px 11px; border-radius: 999px; cursor: pointer; transition: all .15s; }
    .gt-mic:hover { border-color: var(--ai); color: var(--ai-600); }
    .gt-mic[data-on="true"] { background: var(--ai); border-color: var(--ai); color: #fff; }
    .gt-mic[data-on="true"] svg { animation: gtblink 1.1s infinite; }
    @keyframes gtblink { 50% { opacity: .35; } }

    .gt-stream { display: flex; flex-direction: column; gap: 10px; margin: 10px 0; max-height: 300px; min-height: 120px; overflow-y: auto; padding-right: 2px; }
    .gt-note { display: flex; gap: 9px; align-items: flex-start; }
    .gt-note--interim { opacity: .75; }
    .gt-note--interim .gt-note-text { font-style: italic; color: var(--ai-600); }
    .gt-note-meta { font-size: 11px; color: var(--n-400); font-weight: 600; }
    .gt-note-text { font-size: 13.5px; color: var(--ink); line-height: 1.45; word-break: break-word; }

    .gt-noteform { display: flex; gap: 8px; align-items: flex-end; border-top: 1px solid var(--line); padding-top: 11px; margin-top: auto; }
    .gt-noteform .textarea { flex: 1; resize: vertical; }
    .gt-noteform .btn { flex: none; }
    `}</style>
  );
}
