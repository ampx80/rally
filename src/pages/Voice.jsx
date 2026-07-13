// Voice - the AI receptionist + call intelligence surface.
// Four surfaces over one local-first call store (src/lib/voice-data.js):
//   1. Live call  - a scripted inbound call the AI answers on screen,
//      streaming a transcript, detecting intent, booking / capturing,
//      and auto-logging the activity into the CRM timeline.
//   2. Call log   - every inbound / outbound / missed call with AI
//      summary, sentiment, outcome, next action, and a recording slot.
//   3. Receptionist - greeting script, hours, booking, escalation, and
//      voicemail-to-text config, all live-editable.
//   4. Intelligence - talk ratio, keywords, sentiment, coaching notes.
//
// Positioning, tastefully in the copy: an AI that answers every call,
// books the appointment, and logs it while you sleep - the missed-
// revenue killer for any business with a phone.
//
// Additive + local-first: 100% functional on seeded data with zero
// backend. Real telephony is env-gated (voiceEnv) and degrades silently.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button, Card, Badge, Avatar, PageTitle, SectionHeader, Field, Input, Select,
  Textarea, Modal, Tabs, Ring, MiniBars, StatCard, Segmented,
  ProgressBar, GradientText, useToast, money, moneyK, relTime, timeStr,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import {
  useVoice, getCalls, getSettings, voiceStats, sentimentSplit, outcomeSplit,
  volumeSeries, keywordCloud, updateSettings, updateHours, updateEscalation,
  logCall, voiceEnv, outcomeMeta, OUTCOMES, SENTIMENTS, DEMO_SCENARIOS,
  scenarioById, fmtDuration,
} from '../lib/voice-data.js';

/* Nudge Rook open with a seeded prompt (same channel every page uses). */
function askRook(prompt) {
  window.dispatchEvent(new CustomEvent('rally:rook', { detail: { prompt } }));
}

const dirMeta = {
  inbound:  { icon: 'arrowDown', color: 'var(--ok)',   label: 'Inbound' },
  outbound: { icon: 'arrowUp',   color: 'var(--info)', label: 'Outbound' },
  missed:   { icon: 'x',         color: 'var(--risk)', label: 'Missed' },
};

export default function Voice() {
  useVoice();
  const [tab, setTab] = useState('live');
  const env = voiceEnv();
  const stats = voiceStats();
  const vol = volumeSeries(14);

  const tabs = [
    { key: 'live', label: 'Live call' },
    { key: 'log', label: 'Call log', count: stats.total },
    { key: 'config', label: 'Receptionist' },
    { key: 'intel', label: 'Intelligence' },
  ];

  return (
    <div className="page-in">
      <PageTitle
        eyebrow="AI Receptionist"
        title="Voice"
        sub="An AI that answers every call, qualifies the caller, and books the appointment - then logs it. The missed-revenue killer for any business with a phone."
        action={
          <>
            <Button variant="ghost" size="sm" onClick={() => askRook('Summarize my call activity this week: how many bookings and leads did the AI receptionist capture, and what should I follow up on?')}>
              <Icon name="sparkles" size={15} /> Ask Rook
            </Button>
            <Button variant="primary" size="sm" onClick={() => setTab('live')}>
              <Icon name="phone" size={15} /> Answer a live call
            </Button>
          </>
        }
      />

      {/* env / mode banner */}
      <Card pad className="row between wrap gap-2" style={{ marginBottom: '1.15rem', padding: '.85rem 1.15rem', background: env.connected ? 'var(--ok-bg)' : 'var(--accent-50)', borderColor: 'transparent' }}>
        <div className="row gap-2" style={{ minWidth: 0 }}>
          <span className="row center" style={{ width: 34, height: 34, borderRadius: 9, background: env.connected ? 'var(--ok)' : 'var(--accent)', color: '#fff', flex: 'none' }}>
            <Icon name={env.connected ? 'phone' : 'mic'} size={17} />
          </span>
          <div className="col" style={{ minWidth: 0, lineHeight: 1.25 }}>
            <span className="fw-7">{env.connected ? `Live line connected - ${env.number}` : 'Demo mode - fully interactive on seeded calls'}</span>
            <span className="t-sm muted clip">{env.connected ? `Answering on ${env.provider}` : 'Connect a number to route real calls through this same receptionist. Nothing here needs a backend to try.'}</span>
          </div>
        </div>
        <Badge tone={env.connected ? 'ok' : 'accent'}>
          <span className="dot" style={{ background: env.connected ? 'var(--ok)' : 'var(--accent)', animation: 'pulseDot 1.6s infinite' }} />
          {env.connected ? 'Live' : 'Simulator'}
        </Badge>
      </Card>

      {/* KPI row */}
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', marginBottom: '1.4rem' }}>
        <StatCard label="Calls handled" value={stats.total} icon={<Icon name="phone" size={18} />} spark={vol} sub={`${stats.answered} answered by AI`} />
        <StatCard label="Appointments booked" value={stats.booked} accent="var(--ok)" icon={<Icon name="calendar" size={18} />} sub="while you were busy" />
        <StatCard label="Leads captured" value={stats.leads} accent="var(--accent)" icon={<Icon name="sparkles" size={18} />} sub="qualified + routed" />
        <StatCard label="Answer rate" value={stats.answerRate} format={(n) => `${Math.round(n)}%`} accent="var(--accent-teal)" icon={<Icon name="activity" size={18} />} sub={`${stats.missed} missed of ${stats.total}`} />
        <StatCard label="Revenue rescued" value={stats.revenue} format={moneyK} accent="var(--warn)" icon={<Icon name="dollar" size={18} />} sub="pipeline the phone would have lost" />
        <StatCard label="After-hours saved" value={stats.afterHours} accent="var(--accent-purple)" icon={<Icon name="moon" size={18} />} sub="calls answered off the clock" />
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'live' && <LiveCall />}
      {tab === 'log' && <CallLog />}
      {tab === 'config' && <Receptionist />}
      {tab === 'intel' && <Intelligence />}
    </div>
  );
}

/* ============================================================
   TAB 1 - LIVE CALL
   ============================================================ */
const CALL_STEPS = [
  { key: 'answer', label: 'Answered in 2 rings', icon: 'phone' },
  { key: 'intent', label: 'Detected caller intent', icon: 'sparkles' },
  { key: 'act', label: 'Checked calendar + qualified', icon: 'calendar' },
  { key: 'resolve', label: 'Booked / captured the outcome', icon: 'check' },
  { key: 'log', label: 'Auto-logged the activity', icon: 'fileText' },
];

function LiveCall() {
  const toast = useToast();
  const [scenId, setScenId] = useState(DEMO_SCENARIOS[0].id);
  const scen = scenarioById(scenId);
  const [idx, setIdx] = useState(0);        // fully-shown line count
  const [playing, setPlaying] = useState(false);
  const [typing, setTyping] = useState(false);
  const [done, setDone] = useState(false);
  const [saved, setSaved] = useState(false);
  const timer = useRef(null);
  const scrollRef = useRef(null);

  const reset = (auto = false) => {
    clearTimeout(timer.current);
    setIdx(0); setDone(false); setTyping(false); setSaved(false);
    setPlaying(auto);
  };
  useEffect(() => { reset(false); /* on scenario change */ }, [scenId]);
  useEffect(() => () => clearTimeout(timer.current), []);

  // Drive the transcript forward, one line at a time, with a typing beat.
  useEffect(() => {
    if (!playing) return;
    if (idx >= scen.lines.length) { setPlaying(false); setDone(true); setTyping(false); return; }
    const line = scen.lines[idx];
    const delay = Math.min(2400, Math.max(650, line.text.length * 26));
    setTyping(true);
    timer.current = setTimeout(() => {
      setTyping(false);
      setIdx((n) => n + 1);
    }, delay);
    return () => clearTimeout(timer.current);
  }, [playing, idx, scen]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [idx, typing]);

  const answer = () => { reset(true); };
  const stepDone = (key) => {
    const order = ['answer', 'intent', 'act', 'resolve', 'log'];
    const reached =
      key === 'answer' ? idx >= 1 || playing :
      key === 'intent' ? idx >= scen.revealAt :
      key === 'act' ? idx >= Math.max(scen.revealAt + 1, 3) :
      key === 'resolve' ? done :
      key === 'log' ? saved : false;
    return reached;
  };

  const save = () => {
    const r = logCall({
      direction: 'inbound',
      caller: scen.caller.name,
      number: scen.caller.number,
      company: scen.caller.company,
      intent: scen.intent,
      intentKey: scen.id,
      outcome: scen.result.kind,
      sentiment: scen.sentiment,
      duration: 60 + scen.lines.length * 14,
      estValue: scen.result.estValue,
      afterHours: scen.id === 'afterhours',
      summary: `${scen.caller.name} from ${scen.caller.company}: ${scen.result.title}. ${scen.result.detail}.`,
      nextAction: scen.result.detail,
      transcript: scen.lines,
      keywords: [scen.id === 'pricing' ? 'pricing' : scen.id === 'booking' ? 'demo' : 'availability', 'follow-up'],
    });
    setSaved(true);
    toast(r.activity ? 'Saved to call log + logged an activity' : 'Saved to call log');
  };

  const meta = outcomeMeta(scen.result.kind);

  return (
    <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.55fr) minmax(0, 1fr)', gap: '1.15rem', alignItems: 'start' }}>
      {/* left - the call itself */}
      <Card pad style={{ overflow: 'hidden' }}>
        <div className="row between wrap gap-2" style={{ marginBottom: '1rem' }}>
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <div className="eyebrow">Live demo</div>
            <h3 style={{ margin: 0 }}>Watch the AI answer the phone</h3>
          </div>
          <Segmented
            options={DEMO_SCENARIOS.map(s => ({ value: s.id, label: s.label }))}
            value={scenId}
            onChange={setScenId}
          />
        </div>

        {/* caller strip */}
        <div className="row between wrap gap-2" style={{ padding: '.9rem 1rem', borderRadius: 'var(--r-md)', background: 'var(--n-50)', border: '1px solid var(--line)', marginBottom: '1rem' }}>
          <div className="row gap-2" style={{ minWidth: 0 }}>
            <span className="row center floaty" style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--grad-accent, linear-gradient(135deg,#6d5cf7,#4a3ce0))', color: '#fff', flex: 'none' }}>
              <Icon name="phone" size={19} />
            </span>
            <div className="col" style={{ minWidth: 0, lineHeight: 1.3 }}>
              <span className="fw-7 clip">{scen.caller.name}</span>
              <span className="t-sm muted clip">{scen.caller.company} - {scen.caller.number}</span>
            </div>
          </div>
          <div className="row gap-1" style={{ flex: 'none' }}>
            <Badge tone="default">{scen.hint}</Badge>
            {(playing || typing) && (
              <Badge tone="ok"><span className="dot" style={{ background: 'var(--ok)', animation: 'pulseDot 1.1s infinite' }} /> On call</Badge>
            )}
          </div>
        </div>

        {/* intent reveal */}
        <div style={{ minHeight: 30, marginBottom: '.75rem' }}>
          {idx >= scen.revealAt ? (
            <div className="row gap-2 fade-up" style={{ alignItems: 'center' }}>
              <Badge tone="accent"><Icon name="sparkles" size={13} /> Intent detected</Badge>
              <span className="fw-6">{scen.intent}</span>
            </div>
          ) : (
            <span className="t-sm muted">{playing || typing ? 'Listening + transcribing...' : 'Press Answer to take the call.'}</span>
          )}
        </div>

        {/* transcript */}
        <div ref={scrollRef} style={{ height: 300, overflowY: 'auto', borderRadius: 'var(--r-md)', border: '1px solid var(--line)', background: 'var(--n-25)', padding: '1rem' }}>
          {idx === 0 && !typing && (
            <div className="col center gap-2" style={{ height: '100%', textAlign: 'center', color: 'var(--n-600)' }}>
              <span className="row center floaty" style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--accent-50)', color: 'var(--accent-600)' }}><Icon name="mic" size={24} /></span>
              <div className="fw-6">Incoming call from {scen.caller.name}</div>
              <div className="t-sm">The receptionist picks up on the second ring.</div>
            </div>
          )}
          <div className="col gap-2">
            {scen.lines.slice(0, idx).map((l, i) => <Bubble key={i} line={l} />)}
            {typing && <TypingBubble who={scen.lines[idx]?.who || 'ai'} />}
          </div>
        </div>

        {/* outcome */}
        {done && (
          <div className="fade-up" style={{ marginTop: '1rem', borderRadius: 'var(--r-md)', border: `1px solid ${meta.color}`, background: 'color-mix(in srgb, ' + meta.color + ' 8%, var(--paper))', padding: '1rem 1.15rem' }}>
            <div className="row between wrap gap-2">
              <div className="row gap-2" style={{ minWidth: 0 }}>
                <span className="row center" style={{ width: 38, height: 38, borderRadius: 10, background: meta.color, color: '#fff', flex: 'none' }}>
                  <Icon name={scen.result.kind === 'booked' ? 'calendar' : scen.result.kind === 'voicemail' ? 'mail' : 'check'} size={18} />
                </span>
                <div className="col" style={{ minWidth: 0, lineHeight: 1.3 }}>
                  <span className="fw-7 clip">{scen.result.title}</span>
                  <span className="t-sm muted clip">{scen.result.detail}</span>
                </div>
              </div>
              {scen.result.estValue > 0 && (
                <div className="col" style={{ textAlign: 'right', flex: 'none' }}>
                  <span className="stat-label">Rescued</span>
                  <span className="fw-8 tnum" style={{ fontSize: '1.3rem', color: meta.color }}>{money(scen.result.estValue)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* controls */}
        <div className="row gap-2 wrap" style={{ marginTop: '1.1rem' }}>
          {!playing && !done && <Button variant="accent" onClick={answer}><Icon name="phone" size={16} /> Answer the call</Button>}
          {(playing || typing) && <Button variant="ghost" disabled><span className="dot" style={{ background: 'var(--ok)', animation: 'pulseDot 1s infinite' }} /> AI is on the line...</Button>}
          {done && !saved && <Button variant="primary" onClick={save}><Icon name="check" size={16} /> Save to call log + auto-log activity</Button>}
          {done && saved && <Button variant="ghost" disabled><Icon name="check" size={16} /> Logged to CRM</Button>}
          {(done || idx > 0) && <Button variant="quiet" onClick={() => reset(false)}><Icon name="rotateCcw" size={15} /> Replay</Button>}
        </div>
      </Card>

      {/* right - what the AI did + positioning */}
      <div className="col gap-3">
        <Card pad>
          <SectionHeader title="What the AI did" sub="Every call, the same discipline" />
          <div className="col gap-2">
            {CALL_STEPS.map((s) => {
              const on = stepDone(s.key);
              return (
                <div key={s.key} className="row gap-2" style={{ opacity: on ? 1 : 0.5, transition: 'opacity .3s' }}>
                  <span className="row center" style={{ width: 30, height: 30, borderRadius: 8, background: on ? 'var(--accent)' : 'var(--n-100)', color: on ? '#fff' : 'var(--n-400)', flex: 'none', transition: 'background .3s' }}>
                    <Icon name={on ? 'check' : s.icon} size={15} />
                  </span>
                  <span className={on ? 'fw-6' : ''}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card pad style={{ background: 'var(--nav)', color: 'var(--nav-text)', borderColor: 'transparent' }}>
          <div className="eyebrow" style={{ color: 'var(--accent-300)' }}>Why it wins</div>
          <div style={{ fontSize: '1.12rem', fontWeight: 700, lineHeight: 1.4, marginTop: 6 }}>
            The phone is the leakiest funnel in the business. <GradientText>Rally answers every ring</GradientText>, books the meeting, and hands you a logged activity - even at 9:47 PM.
          </div>
          <div className="t-sm" style={{ color: 'var(--nav-muted)', marginTop: 10 }}>
            No missed call is ever a missed lead again.
          </div>
          <Button variant="accent" size="sm" style={{ marginTop: 14 }} onClick={() => askRook('Draft a warm, professional phone greeting for my AI receptionist that qualifies the caller and offers to book a meeting.')}>
            <Icon name="sparkles" size={15} /> Ask Rook to write my greeting
          </Button>
        </Card>
      </div>
    </div>
  );
}

function Bubble({ line }) {
  const ai = line.who === 'ai';
  return (
    <div className="fade-up row" style={{ justifyContent: ai ? 'flex-start' : 'flex-end' }}>
      <div className="row gap-2" style={{ maxWidth: '86%', flexDirection: ai ? 'row' : 'row-reverse', alignItems: 'flex-end' }}>
        <span className="row center" style={{ width: 26, height: 26, borderRadius: '50%', flex: 'none', background: ai ? 'var(--accent)' : 'var(--n-200)', color: ai ? '#fff' : 'var(--ink-2)', fontSize: 11, fontWeight: 700 }}>
          {ai ? <Icon name="mic" size={13} /> : 'C'}
        </span>
        <div style={{
          padding: '.6rem .85rem', borderRadius: 12,
          borderBottomLeftRadius: ai ? 3 : 12, borderBottomRightRadius: ai ? 12 : 3,
          background: ai ? 'var(--accent-50)' : 'var(--paper)',
          border: '1px solid ' + (ai ? 'transparent' : 'var(--line)'),
          color: 'var(--ink)', fontSize: '.98rem', lineHeight: 1.45,
        }}>
          {line.text}
        </div>
      </div>
    </div>
  );
}
function TypingBubble({ who }) {
  const ai = who === 'ai';
  return (
    <div className="row" style={{ justifyContent: ai ? 'flex-start' : 'flex-end' }}>
      <div className="row gap-2" style={{ flexDirection: ai ? 'row' : 'row-reverse', alignItems: 'flex-end' }}>
        <span className="row center" style={{ width: 26, height: 26, borderRadius: '50%', flex: 'none', background: ai ? 'var(--accent)' : 'var(--n-200)', color: ai ? '#fff' : 'var(--ink-2)', fontSize: 11, fontWeight: 700 }}>
          {ai ? <Icon name="mic" size={13} /> : 'C'}
        </span>
        <div className="row gap-1" style={{ padding: '.7rem .85rem', borderRadius: 12, background: ai ? 'var(--accent-50)' : 'var(--paper)', border: '1px solid ' + (ai ? 'transparent' : 'var(--line)') }}>
          {[0, 1, 2].map(i => <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--n-400)', animation: `pulseDot 1s ${i * 0.18}s infinite` }} />)}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   TAB 2 - CALL LOG
   ============================================================ */
function CallLog() {
  useVoice();
  const calls = getCalls();
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState(null);

  const filtered = useMemo(() => {
    let list = calls;
    if (filter === 'inbound') list = list.filter(c => c.direction === 'inbound');
    else if (filter === 'outbound') list = list.filter(c => c.direction === 'outbound');
    else if (filter === 'missed') list = list.filter(c => c.direction === 'missed');
    else if (filter === 'booked') list = list.filter(c => c.outcome === 'booked');
    else if (filter === 'leads') list = list.filter(c => c.outcome === 'lead-captured');
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(c => c.caller.toLowerCase().includes(s) || c.company.toLowerCase().includes(s) || c.intent.toLowerCase().includes(s));
    }
    return list;
  }, [calls, filter, q]);

  const open = openId ? calls.find(c => c.id === openId) : null;

  return (
    <div className="col gap-3">
      <div className="row between wrap gap-2">
        <Segmented
          options={[
            { value: 'all', label: 'All' },
            { value: 'inbound', label: 'Inbound' },
            { value: 'outbound', label: 'Outbound' },
            { value: 'missed', label: 'Missed' },
            { value: 'booked', label: 'Booked' },
            { value: 'leads', label: 'Leads' },
          ]}
          value={filter}
          onChange={setFilter}
        />
        <div className="row gap-2" style={{ flex: 'none' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }}><Icon name="search" size={16} /></span>
            <Input placeholder="Search caller, company, intent..." value={q} onChange={e => setQ(e.target.value)} style={{ paddingLeft: 32, width: 260 }} />
          </div>
        </div>
      </div>

      <Card pad={false} style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Caller</th>
                <th>Intent</th>
                <th>Outcome</th>
                <th>Sentiment</th>
                <th style={{ textAlign: 'right' }}>Duration</th>
                <th>When</th>
                <th>Next action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const d = dirMeta[c.direction];
                const om = outcomeMeta(c.outcome);
                const sm = SENTIMENTS[c.sentiment] || SENTIMENTS.neutral;
                return (
                  <tr key={c.id} onClick={() => setOpenId(c.id)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div className="row gap-2" style={{ minWidth: 0 }}>
                        <span className="row center" style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--n-50)', color: d.color, flex: 'none' }} title={d.label}>
                          <Icon name={d.icon} size={15} />
                        </span>
                        <div className="col" style={{ minWidth: 0, lineHeight: 1.25 }}>
                          <span className="fw-6 clip">{c.caller}</span>
                          <span className="t-xs muted clip">{c.company}</span>
                        </div>
                      </div>
                    </td>
                    <td><span className="clip" style={{ maxWidth: 180, display: 'inline-block' }}>{c.intent}</span></td>
                    <td><Badge tone={om.tone}>{om.label}</Badge></td>
                    <td>
                      <span className="row gap-1"><span className="dot" style={{ background: sm.color }} /> <span className="t-sm">{sm.label}</span></span>
                    </td>
                    <td className="tnum" style={{ textAlign: 'right' }}>{fmtDuration(c.duration)}</td>
                    <td className="t-sm muted">{relTime(c.startedAt)}</td>
                    <td><span className="t-sm clip" style={{ maxWidth: 200, display: 'inline-block' }}>{c.nextAction}</span></td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7}><div className="col center gap-1" style={{ padding: '2.5rem', color: 'var(--n-600)' }}><Icon name="phone" size={26} /><span>No calls match this view.</span></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <CallModal call={open} onClose={() => setOpenId(null)} />
    </div>
  );
}

function CallModal({ call, onClose }) {
  if (!call) return null;
  const om = outcomeMeta(call.outcome);
  const sm = SENTIMENTS[call.sentiment] || SENTIMENTS.neutral;
  const d = dirMeta[call.direction];
  return (
    <Modal open={!!call} onClose={onClose} title="Call detail" width={640}
      footer={
        <>
          <Button variant="ghost" onClick={() => askRook(`Draft a follow-up email to ${call.caller} at ${call.company} based on their call: ${call.summary}`)}>
            <Icon name="sparkles" size={15} /> Draft follow-up with Rook
          </Button>
          <Button variant="primary" onClick={onClose}>Done</Button>
        </>
      }>
      <div className="col gap-3">
        <div className="row between wrap gap-2">
          <div className="row gap-2" style={{ minWidth: 0 }}>
            <Avatar name={call.caller} size={44} />
            <div className="col" style={{ minWidth: 0, lineHeight: 1.3 }}>
              <span className="fw-7 clip">{call.caller}</span>
              <span className="t-sm muted clip">{call.company} - {call.number}</span>
            </div>
          </div>
          <div className="row gap-1" style={{ flex: 'none' }}>
            <Badge tone="default"><Icon name={d.icon} size={12} /> {d.label}</Badge>
            <Badge tone={om.tone}>{om.label}</Badge>
          </div>
        </div>

        <div className="row wrap gap-3" style={{ padding: '.85rem 1rem', borderRadius: 'var(--r-md)', background: 'var(--n-50)' }}>
          <Meta label="Intent" value={call.intent} />
          <Meta label="Duration" value={fmtDuration(call.duration)} />
          <Meta label="Sentiment" value={<span className="row gap-1"><span className="dot" style={{ background: sm.color }} />{sm.label}</span>} />
          <Meta label="When" value={timeStr(call.startedAt)} />
          {call.estValue > 0 && <Meta label="Rescued" value={money(call.estValue)} />}
        </div>

        <div>
          <div className="stat-label" style={{ marginBottom: 6 }}>AI summary</div>
          <div style={{ lineHeight: 1.5 }}>{call.summary}</div>
        </div>

        {/* recording placeholder */}
        <div className="row gap-2" style={{ padding: '.7rem 1rem', borderRadius: 'var(--r-md)', border: '1px solid var(--line)', background: 'var(--paper)' }}>
          <Button variant="ghost" size="sm" disabled={!call.recording}><Icon name="phone" size={15} /> {call.recording ? 'Play recording' : 'No recording'}</Button>
          <div style={{ flex: 1, height: 26, display: 'flex', alignItems: 'center', gap: 3, opacity: call.recording ? 1 : 0.4 }}>
            {Array.from({ length: 40 }).map((_, i) => {
              const h = 4 + ((i * 7 + call.id.length * 3) % 20);
              return <span key={i} style={{ width: 3, height: h, borderRadius: 2, background: 'var(--accent-300)' }} />;
            })}
          </div>
          <span className="t-sm muted tnum">{fmtDuration(call.duration)}</span>
        </div>

        {call.keywords?.length > 0 && (
          <div className="row wrap gap-1">
            {call.keywords.map(k => <Badge key={k} tone="default">{k}</Badge>)}
          </div>
        )}

        {call.transcript?.length > 0 && (
          <div>
            <div className="stat-label" style={{ marginBottom: 8 }}>Transcript</div>
            <div className="col gap-2">
              {call.transcript.map((l, i) => <Bubble key={i} line={l} />)}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
function Meta({ label, value }) {
  return (
    <div className="col" style={{ lineHeight: 1.3 }}>
      <span className="stat-label">{label}</span>
      <span className="fw-6">{value}</span>
    </div>
  );
}

/* ============================================================
   TAB 3 - RECEPTIONIST CONFIG
   ============================================================ */
function Receptionist() {
  const s = useVoice(getSettings);
  const toast = useToast();

  const save = (patch) => { updateSettings(patch); };
  const Switch = ({ on, onClick, label }) => (
    <button type="button" className={`switch${on ? ' on' : ''}`} onClick={onClick} role="switch" aria-checked={on} aria-label={label} />
  );

  return (
    <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: '1.15rem', alignItems: 'start' }}>
      <div className="col gap-3">
        <Card pad>
          <SectionHeader title="Greeting + voice" sub="The first thing every caller hears"
            action={<Button variant="ghost" size="sm" onClick={() => askRook('Write a warm, professional AI receptionist greeting for Vertex Robotics that offers to book a meeting.')}><Icon name="sparkles" size={14} /> Rewrite with Rook</Button>} />
          <div className="col gap-3">
            <Field label="Greeting script">
              <Textarea value={s.greeting} onChange={e => save({ greeting: e.target.value })} rows={3} />
            </Field>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <Field label="Receptionist name"><Input value={s.receptionistName} onChange={e => save({ receptionistName: e.target.value })} /></Field>
              <Field label="Voice">
                <Select value={s.voice} onChange={e => save({ voice: e.target.value })}>
                  {['Ava - warm, professional', 'Miles - calm, confident', 'Nova - bright, upbeat', 'Sage - measured, neutral'].map(v => <option key={v}>{v}</option>)}
                </Select>
              </Field>
            </div>
          </div>
        </Card>

        <Card pad>
          <SectionHeader title="Booking" sub="How the AI turns a call into a meeting" />
          <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr .8fr' }}>
            <Field label="Calendar link"><Input value={s.booking.calendarLink} onChange={e => save({ booking: { ...s.booking, calendarLink: e.target.value } })} /></Field>
            <Field label="Default AE"><Input value={s.booking.defaultAe} onChange={e => save({ booking: { ...s.booking, defaultAe: e.target.value } })} /></Field>
            <Field label="Length (min)"><Input type="number" value={s.booking.durationMin} onChange={e => save({ booking: { ...s.booking, durationMin: Number(e.target.value) || 0 } })} /></Field>
          </div>
        </Card>

        <Card pad>
          <SectionHeader title="Business hours" sub="Outside these, the after-hours rule takes over" />
          <div className="col gap-1">
            {s.hours.map((h, i) => (
              <div key={h.day} className="row gap-2 between" style={{ padding: '.5rem .25rem', borderBottom: i < 6 ? '1px solid var(--n-50)' : 'none' }}>
                <div className="row gap-2" style={{ minWidth: 130 }}>
                  <Switch on={!h.closed} onClick={() => updateHours(i, { closed: !h.closed })} label={`${h.day} open`} />
                  <span className="fw-6">{h.day}</span>
                </div>
                {h.closed ? (
                  <Badge tone="default">Closed</Badge>
                ) : (
                  <div className="row gap-1">
                    <Input type="time" value={h.open} onChange={e => updateHours(i, { open: e.target.value })} style={{ width: 120 }} />
                    <span className="muted">to</span>
                    <Input type="time" value={h.close} onChange={e => updateHours(i, { close: e.target.value })} style={{ width: 120 }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="col gap-3">
        {/* live preview */}
        <Card pad style={{ background: 'var(--nav)', color: 'var(--nav-text)', borderColor: 'transparent' }}>
          <div className="eyebrow" style={{ color: 'var(--accent-300)' }}>Caller hears</div>
          <div className="row gap-2" style={{ marginTop: 10, alignItems: 'flex-start' }}>
            <span className="row center floaty" style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--accent)', color: '#fff', flex: 'none' }}><Icon name="mic" size={16} /></span>
            <div style={{ padding: '.7rem .9rem', borderRadius: 12, borderBottomLeftRadius: 3, background: 'rgba(255,255,255,.06)', lineHeight: 1.45 }}>
              {s.greeting}
            </div>
          </div>
          <div className="t-xs" style={{ color: 'var(--nav-muted)', marginTop: 10 }}>Voice: {s.voice}</div>
        </Card>

        <Card pad>
          <SectionHeader title="After hours" sub="What happens when you are closed" />
          <Segmented
            options={[
              { value: 'voicemail-to-text', label: 'Voicemail to text' },
              { value: 'book-anyway', label: 'Book anyway' },
              { value: 'forward', label: 'Forward' },
            ]}
            value={s.afterHours}
            onChange={(v) => save({ afterHours: v })}
          />
          <div className="col gap-2" style={{ marginTop: '1rem' }}>
            <ToggleRow label="Voicemail to text" hint="Transcribe + text every after-hours message" on={s.voicemailToText} onClick={() => save({ voicemailToText: !s.voicemailToText })} Switch={Switch} />
            <ToggleRow label="SMS follow-up" hint="Text the caller a confirmation automatically" on={s.smsFollowup} onClick={() => save({ smsFollowup: !s.smsFollowup })} Switch={Switch} />
          </div>
        </Card>

        <Card pad>
          <SectionHeader title="Escalation" sub="When to hand off to a human" />
          <ToggleRow label="Escalate on trigger words" hint="Route sensitive calls to a person" on={s.escalation.enabled} onClick={() => updateEscalation({ enabled: !s.escalation.enabled })} Switch={Switch} />
          <div className="col gap-3" style={{ marginTop: '1rem', opacity: s.escalation.enabled ? 1 : 0.5 }}>
            <Field label="Trigger words" hint="Comma separated">
              <Input value={s.escalation.keywords.join(', ')} disabled={!s.escalation.enabled}
                onChange={e => updateEscalation({ keywords: e.target.value.split(',').map(x => x.trim()).filter(Boolean) })} />
            </Field>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <Field label="Transfer to"><Input value={s.escalation.transferTo} disabled={!s.escalation.enabled} onChange={e => updateEscalation({ transferTo: e.target.value })} /></Field>
              <Field label="Transfer number"><Input value={s.escalation.transferNumber} disabled={!s.escalation.enabled} onChange={e => updateEscalation({ transferNumber: e.target.value })} /></Field>
            </div>
          </div>
        </Card>

        <Button variant="primary" onClick={() => toast('Receptionist settings saved')}><Icon name="check" size={16} /> Everything saves as you edit</Button>
      </div>
    </div>
  );
}
function ToggleRow({ label, hint, on, onClick, Switch }) {
  return (
    <div className="row between gap-2">
      <div className="col" style={{ minWidth: 0, lineHeight: 1.3 }}>
        <span className="fw-6">{label}</span>
        {hint && <span className="t-xs muted">{hint}</span>}
      </div>
      <Switch on={on} onClick={onClick} label={label} />
    </div>
  );
}

/* ============================================================
   TAB 4 - CALL INTELLIGENCE
   ============================================================ */
function Intelligence() {
  useVoice();
  const calls = getCalls();
  const sent = sentimentSplit();
  const kw = keywordCloud().slice(0, 12);
  const vol = volumeSeries(14);
  const sentTotal = sent.positive + sent.neutral + sent.negative || 1;
  const positivePct = Math.round((sent.positive / sentTotal) * 100);
  const salesCalls = calls.filter(c => c.coaching && c.coaching.length);
  const maxKw = Math.max(...kw.map(k => k.count), 1);

  return (
    <div className="col gap-3">
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', gap: '1.15rem' }}>
        {/* sentiment */}
        <Card pad>
          <SectionHeader title="Sentiment" sub="Across answered calls" />
          <div className="row gap-3" style={{ alignItems: 'center' }}>
            <Ring value={positivePct} size={92} stroke={9} color="var(--ok)" label={`${positivePct}%`} />
            <div className="col gap-2" style={{ flex: 1 }}>
              {[['positive', 'Positive'], ['neutral', 'Neutral'], ['negative', 'At risk']].map(([k, label]) => {
                const sm = SENTIMENTS[k];
                const pct = Math.round((sent[k] / sentTotal) * 100);
                return (
                  <div key={k} className="col gap-1">
                    <div className="row between t-sm"><span className="row gap-1"><span className="dot" style={{ background: sm.color }} />{label}</span><span className="fw-6 tnum">{sent[k]}</span></div>
                    <ProgressBar value={pct} color={sm.color} height={6} />
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* volume */}
        <Card pad>
          <SectionHeader title="Call volume" sub="Last 14 days" />
          <div style={{ marginTop: 8 }}><MiniBars data={vol} w={280} h={72} color="var(--accent)" /></div>
          <div className="row between t-sm muted" style={{ marginTop: 8 }}>
            <span>14 days ago</span><span>Today</span>
          </div>
        </Card>

        {/* keywords */}
        <Card pad>
          <SectionHeader title="Top keywords" sub="What callers are asking about" />
          <div className="row wrap gap-1" style={{ marginTop: 4 }}>
            {kw.map(k => {
              const scale = 0.8 + (k.count / maxKw) * 0.7;
              return (
                <span key={k.word} className="badge" style={{ fontSize: `${scale}rem`, background: 'var(--accent-50)', color: 'var(--accent-600)' }}>
                  {k.word} <span className="tnum" style={{ opacity: 0.7 }}>{k.count}</span>
                </span>
              );
            })}
          </div>
        </Card>
      </div>

      {/* talk ratio + coaching on sales calls */}
      <Card pad>
        <SectionHeader title="Sales call coaching" sub="Talk ratio, keywords, and next-step discipline on outbound calls"
          action={<Button variant="ghost" size="sm" onClick={() => askRook('Analyze my recent sales calls: where is my talk ratio too high and how do I improve discovery?')}><Icon name="sparkles" size={14} /> Coach me with Rook</Button>} />
        <div className="col gap-2">
          {salesCalls.map(c => {
            const good = c.talkRatio <= 55;
            return (
              <div key={c.id} className="row between wrap gap-3" style={{ padding: '.85rem 1rem', borderRadius: 'var(--r-md)', border: '1px solid var(--line)', background: 'var(--n-25)' }}>
                <div className="col gap-1" style={{ minWidth: 180, flex: 1 }}>
                  <div className="row gap-2"><Avatar name={c.caller} size={30} /><div className="col" style={{ lineHeight: 1.25 }}><span className="fw-6 clip">{c.caller}</span><span className="t-xs muted clip">{c.company}</span></div></div>
                  <div className="row wrap gap-1" style={{ marginTop: 4 }}>{c.keywords.slice(0, 3).map(k => <Badge key={k} tone="default" className="t-xs">{k}</Badge>)}</div>
                </div>
                <div className="col gap-1" style={{ minWidth: 200, flex: 1 }}>
                  <div className="row between t-sm"><span className="muted">Talk ratio (you)</span><span className="fw-7 tnum" style={{ color: good ? 'var(--ok)' : 'var(--warn)' }}>{c.talkRatio}%</span></div>
                  <div style={{ position: 'relative' }}>
                    <ProgressBar value={c.talkRatio} color={good ? 'var(--ok)' : 'var(--warn)'} height={8} />
                    <span style={{ position: 'absolute', left: '55%', top: -2, width: 2, height: 12, background: 'var(--n-400)' }} title="Target 55%" />
                  </div>
                  <span className="t-xs muted">{good ? 'Balanced - strong discovery' : 'High - ask more open questions'}</span>
                </div>
                <div className="col gap-1" style={{ minWidth: 220, flex: 1.4 }}>
                  {c.coaching.map((note, i) => (
                    <div key={i} className="row gap-1 t-sm"><Icon name="sparkles" size={13} style={{ color: 'var(--accent-600)', flex: 'none', marginTop: 3 }} /><span>{note}</span></div>
                  ))}
                </div>
              </div>
            );
          })}
          {salesCalls.length === 0 && <div className="muted t-sm" style={{ padding: '1rem' }}>No outbound sales calls to coach yet.</div>}
        </div>
      </Card>
    </div>
  );
}
