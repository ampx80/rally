// ============================================================
// ARDOVO REPLAY & COACH  (route /replay)
//
// The system quietly records YOUR OWN usage, then reviews it and coaches you
// to work faster. Self-improvement from your real behavior, not a generic
// tour. Nothing here leaves your device unless you press "Coach me with AI",
// which sends only a compact, PII-free summary to an optional Anthropic pass
// (api/replay-coach); without a key it stays fully local and deterministic.
//
// Two surfaces:
//   1. COACHING CARDS  - personal, kind, actionable, each with a deep link.
//   2. SESSION REPLAY  - timeline of routes + dwell + actions, and feature
//      coverage (what you touched, what is still waiting for you).
//
// Reuses UI.jsx + Icon. Default export. Every button works. Friendly empty
// state before you have a session. NO em-dash / en-dash. ASCII hyphen only.
// ============================================================
import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Button, Badge, SectionHeader, PageTitle, EmptyState, useToast,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import {
  useReplay, analyzeSession, setReplayEnabled, clearReplay, FEATURES,
} from '../lib/replay.js';
import CoachCard from '../components/replay/CoachCard.jsx';
import SessionTimeline from '../components/replay/SessionTimeline.jsx';
import SessionStats from '../components/replay/SessionStats.jsx';
import '../components/replay/replay.css';

function analysisToSummary(a) {
  return {
    totalMinutes: Math.round((a.totalMs / 60000) * 10) / 10,
    coverage: a.coverage,
    stops: a.featuresUsed
      .slice()
      .sort((x, y) => y.dwellMs - x.dwellMs)
      .slice(0, 12)
      .map(f => ({ label: f.label, route: f.route, minutes: Math.round((f.dwellMs / 60000) * 10) / 10, visits: f.visits })),
    untouched: a.untouched.map(f => ({ label: f.label, route: f.route, hint: f.hint })),
    mostRevisited: a.mostRevisited.map(f => ({ label: f.label, route: f.route, visits: f.visits })),
    bounces: a.bounces,
  };
}

export default function Replay() {
  const navigate = useNavigate();
  const toast = useToast();
  const { events, enabled } = useReplay();

  // Re-tick every 5s so the current stop's dwell stays honest while you read.
  const [, setBeat] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setBeat(b => b + 1), 5000);
    return () => clearInterval(t);
  }, []);

  const analysis = useMemo(() => analyzeSession(events), [events]);

  // AI enrichment state (optional, env-gated on the server).
  const [aiCards, setAiCards] = useState(null);
  const [aiSource, setAiSource] = useState(null); // 'ai' | 'fallback' | null
  const [loadingAi, setLoadingAi] = useState(false);

  const cards = aiCards && aiCards.length ? aiCards : analysis.cards;

  const goTo = (to) => { if (to) navigate(to); };

  const onToggle = () => {
    const next = !enabled;
    setReplayEnabled(next);
    toast(next ? 'Recording resumed' : 'Recording paused', next ? 'ok' : 'warn');
  };

  const onClear = () => {
    clearReplay();
    setAiCards(null);
    setAiSource(null);
    toast('Session cleared');
  };

  const onCoach = async () => {
    setLoadingAi(true);
    try {
      const allowedRoutes = [...new Set([...FEATURES.map(f => f.route), ...analysis.featuresUsed.map(f => f.route)])];
      const res = await fetch('/api/replay-coach', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          summary: analysisToSummary(analysis),
          cards: analysis.cards,
          allowedRoutes,
        }),
      });
      const data = await res.json();
      if (data && data.ok && Array.isArray(data.cards) && data.cards.length) {
        setAiCards(data.cards);
        setAiSource(data.source || 'ai');
        toast(data.source === 'ai' ? 'Rook reviewed your session' : 'Coaching refreshed');
      } else {
        setAiSource('fallback');
        toast('Using your local coaching', 'warn');
      }
    } catch {
      setAiSource('fallback');
      toast('Could not reach the coach; showing local tips', 'warn');
    } finally {
      setLoadingAi(false);
    }
  };

  const recordingBadge = enabled
    ? <Badge tone="ok"><Icon name="check" size={12} /> Recording</Badge>
    : <Badge tone="warn">Paused</Badge>;

  return (
    <div className="col gap-3 fx-scene fx-grid">
      <PageTitle
        eyebrow="Replay and Coach"
        title="Your session, coached"
        sub="Ardovo quietly watches how you work, then coaches you to move faster. Private, on this device, and yours to switch off anytime."
        action={
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            {recordingBadge}
            <Button variant="ghost" size="sm" onClick={onToggle}>
              <Icon name={enabled ? 'eyeOff' : 'eye'} size={15} /> {enabled ? 'Pause' : 'Resume'}
            </Button>
          </div>
        }
      />

      {/* Privacy stance, stated plainly. */}
      <Card className="row gap-2" style={{ alignItems: 'flex-start', borderLeft: '3px solid var(--accent)' }}>
        <span style={{ color: 'var(--accent-600)', flex: 'none', marginTop: 1 }}><Icon name="shield" size={18} /></span>
        <span className="t-sm muted" style={{ lineHeight: 1.55 }}>
          Privacy first. Replay records only which features you opened and how long you stayed, plus optional
          coarse action markers. It never captures keystrokes, form values, record contents, names, or emails.
          Everything stays in your browser. The AI coach is optional and only ever sees the compact summary below.
        </span>
      </Card>

      {!analysis.hasSession ? (
        <Card>
          <EmptyState
            icon={<Icon name="play" size={34} />}
            title="No session to replay yet"
            body="Move around Ardovo for a minute - open a few deals, peek at Forecasting, check My Day. Come back here and your coach will have something real to work with."
            action={
              <div className="row gap-2 wrap" style={{ justifyContent: 'center' }}>
                <Button variant="primary" size="sm" onClick={() => goTo('/deals')}><Icon name="deals" size={15} /> Open Deals</Button>
                <Button variant="ghost" size="sm" onClick={() => goTo('/app')}><Icon name="home" size={15} /> Command Center</Button>
              </div>
            }
          />
        </Card>
      ) : (
        <>
          {/* COACHING */}
          <div className="col gap-2">
            <SectionHeader
              title="Coaching for you"
              sub={aiSource === 'ai'
                ? 'Reviewed by Rook, grounded in what you actually did.'
                : 'Spotted from your real behavior this session.'}
              action={
                <div className="row gap-2" style={{ alignItems: 'center' }}>
                  {aiSource && <Badge tone={aiSource === 'ai' ? 'accent' : 'default'}>{aiSource === 'ai' ? 'AI enriched' : 'Local'}</Badge>}
                  <Button variant="ghost" size="sm" onClick={onCoach} disabled={loadingAi}>
                    <Icon name="sparkles" size={15} /> {loadingAi ? 'Coaching...' : 'Coach me with AI'}
                  </Button>
                </div>
              }
            />
            {cards.length === 0 ? (
              <Card><span className="muted t-sm">Keep working and your coach will surface tips as patterns emerge.</span></Card>
            ) : (
              <div className="grid fx-stagger" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                {cards.map(c => <CoachCard key={c.id || c.title} card={c} onGo={goTo} />)}
              </div>
            )}
          </div>

          {/* STATS + COVERAGE */}
          <SessionStats analysis={analysis} onGo={goTo} />

          {/* TIMELINE */}
          <Card className="col gap-2">
            <SectionHeader
              title="Session replay"
              sub="Newest first. How long you dwelled on each feature, and the actions that fired along the way."
              action={<Button variant="quiet" size="sm" onClick={onClear}><Icon name="trash" size={15} /> Clear session</Button>}
            />
            <SessionTimeline stops={analysis.timeline} onGo={goTo} />
          </Card>
        </>
      )}
    </div>
  );
}
