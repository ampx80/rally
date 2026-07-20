// ============================================================
// LEARN HUB  (route: /learn)  -  the capstone of Ardova Academy 2.0.
//
// One motivating home that ties the whole self-serve training suite together
// so a rep can learn the system in a morning. It reads the REAL read APIs of
// every engine (never mutates them) and turns them into live, clickable tiles:
//   - Training Companion (src/lib/training-companion.js): role lesson track +
//     per-lesson progress, and the cross-launch helpers that start Ardo.
//   - Skill Graph (src/lib/skill-graph.js): overall mastery + next to unlock.
//   - Momentum (src/lib/momentum.js): level, XP, streak, next best quest.
//   - Arena (src/lib/arena.js): certifications earned + badges.
//   - Replay (src/lib/replay.js): coaching highlight + feature coverage.
//   - Store (src/lib/store.js, read-only): the current user's name + role.
//
// Clicking a lesson launches Ardo INTO that lesson. The hero "Start with Ardo"
// button opens the companion. Everything honors prefers-reduced-motion via
// learn.css. ASCII only. No em-dash / no en-dash. Normal hyphen only.
// ============================================================
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PageTitle, GradientText, ProgressBar, Ring, Badge } from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import Character from '../components/companion/Character.jsx';
import JourneyTile from '../components/learn/JourneyTile.jsx';
import MorningStep from '../components/learn/MorningStep.jsx';
import LessonRow from '../components/learn/LessonRow.jsx';
import '../components/learn/learn.css';

import { getCurrentUser, useStore } from '../lib/store.js';
import { progressSummary, startLesson, subscribeProgress } from '../lib/training-companion.js';
import { userSkillState, overallMastery, nextUp, useSkillmap } from '../lib/skill-graph.js';
import {
  useMomentum, getRole, rampSummary, nextBestQuest, rampByTier,
  getProgress as momentumProgress, reconcile, pingStreak,
} from '../lib/momentum.js';
import {
  useArena, getProgress as arenaProgress, ROLES as ARENA_ROLES, PASS_MARK,
} from '../lib/arena.js';
import { useReplay, analyzeSession } from '../lib/replay.js';

/* Open Ardo (optionally onto something specific). Matches the exact contract
   the docked TrainingCompanion listens for. */
function launchArdo(detail = { open: true }) {
  try { window.dispatchEvent(new CustomEvent('ardova:companion', { detail })); } catch {}
}

export default function LearnHub() {
  // Subscribe to every engine so the hub stays live as the user learns.
  useStore();
  useSkillmap();
  useMomentum();
  useArena();
  const replaySnap = useReplay();
  const [, tick] = useState(0);
  useEffect(() => subscribeProgress(() => tick(t => t + 1)), []);

  const navigate = useNavigate();

  // Count today as an active day and re-verify momentum quests on open.
  useEffect(() => { try { pingStreak(); reconcile(); } catch {} }, []);

  const me = getCurrentUser();
  const userId = me?.id;
  const firstName = String(me?.name || 'there').trim().split(/\s+/)[0] || 'there';

  /* ---------- companion track (the role lessons) ---------- */
  const summary = progressSummary();

  /* ---------- skill map ---------- */
  const skillState = userId ? userSkillState(userId) : {};
  const mastery = userId ? overallMastery(userId, skillState) : 0;
  const nextSkill = userId ? nextUp(userId, skillState, 1)[0] : null;
  const nextSkillLabel = nextSkill ? nextSkill.skill.label : 'Every skill unlocked';

  /* ---------- momentum ---------- */
  const role = getRole();
  const ramp = rampSummary(role, userId);
  const nbq = nextBestQuest(role, userId);
  const streak = (momentumProgress(userId)?.streak) || 0;
  const tier1 = rampByTier(role, userId)[0] || null;

  /* ---------- arena ---------- */
  const aProg = arenaProgress();
  const certs = (aProg.badges || []).filter(b => b.kind === 'cert').length;
  const badgeCount = (aProg.badges || []).length;
  const drillPassed = Object.values(aProg.bestScores || {}).some(s => (s.drill || 0) >= PASS_MARK);

  /* ---------- replay ---------- */
  const analysis = analyzeSession(replaySnap.events);
  const highlight = analysis.cards && analysis.cards[0];
  const coverage = analysis.coverage || { touched: 0, total: 0 };
  const visitedSkills = (replaySnap.events || []).some(e => e.type === 'route' && e.path === '/skills');

  /* ---------- "learn in a morning" guided sequence ---------- */
  const steps = [
    {
      title: 'Meet Ardo and walk the basics',
      desc: 'Let Ardo greet you and tour the core screens of Ardova, one lesson at a time.',
      done: summary.pct >= 50,
      meta: `${summary.done}/${summary.total} lessons`,
      actionLabel: 'Start with Ardo',
      onAction: () => launchArdo({ open: true }),
    },
    {
      title: 'Do your day-one Momentum quests',
      desc: 'Prove it by doing real work: add a company, add a contact, and open your first deal.',
      done: !!(tier1 && tier1.complete),
      meta: tier1 ? `${tier1.done}/${tier1.total} quests` : 'ready',
      actionLabel: 'Open Momentum',
      onAction: () => navigate('/momentum'),
    },
    {
      title: 'Pass an Arena drill',
      desc: 'Show speed under pressure. Beat one timed drill in the Practice Arena.',
      done: drillPassed,
      meta: drillPassed ? 'passed' : 'not yet',
      actionLabel: 'Open Arena',
      onAction: () => navigate('/arena'),
    },
    {
      title: 'Check your Skill Map',
      desc: 'Watch your mastery light up across the product and pick the next skill to unlock.',
      done: visitedSkills,
      meta: `${mastery}% mastery`,
      actionLabel: 'Open Skill Map',
      onAction: () => navigate('/skills'),
    },
  ];
  const morningDone = steps.filter(s => s.done).length;
  const morningPct = Math.round((morningDone / steps.length) * 100);
  const currentStepIdx = steps.findIndex(s => !s.done);

  /* ---------- hero quick stats ---------- */
  const heroStats = [
    { label: 'Course', value: `${summary.pct}%`, icon: 'book' },
    { label: ramp.level.name, value: `Lv ${ramp.level.level}`, icon: 'zap' },
    { label: 'Day streak', value: streak, icon: 'flag' },
    { label: 'Mastery', value: `${mastery}%`, icon: 'radar' },
  ];

  return (
    <div className="fade-up lh">
      <PageTitle
        eyebrow="Ardova Academy"
        title={<>Learn <GradientText>Hub</GradientText></>}
        sub="Your whole training suite in one place. Learn Ardova in a morning, then keep sharpening."
      />

      {/* ---------------- HERO ---------------- */}
      <section className="lh-hero">
        <span className="lh-hero__bg" aria-hidden />
        <div className="lh-hero__ardo" aria-hidden>
          <Character state="idle" size={148} />
        </div>
        <div className="lh-hero__content">
          <div className="lh-hero__eyebrow">Your morning with Ardo</div>
          <h2 className="lh-hero__title">
            Morning, {firstName}. Let us learn Ardova <GradientText>in one sitting.</GradientText>
          </h2>
          <p className="lh-hero__sub">
            Ardo walks you through the whole system, you prove it by doing real work, and you watch
            your mastery climb. Everything you need to go from day one to dangerous is right here.
          </p>
          <div className="lh-hero__actions">
            <button type="button" className="lh-hero__cta" onClick={() => launchArdo({ open: true })}>
              <Icon name="play" size={18} />
              Start with Ardo
            </button>
            {summary.nextLesson ? (
              <button
                type="button"
                className="lh-hero__ghost"
                onClick={() => startLesson(summary.nextLesson.id)}
              >
                Resume: {summary.nextLesson.title}
                <Icon name="arrowRight" size={15} />
              </button>
            ) : (
              <Link to="/skills" className="lh-hero__ghost">
                See your Skill Map <Icon name="arrowRight" size={15} />
              </Link>
            )}
          </div>
          <div className="lh-hero__stats">
            {heroStats.map((s, i) => (
              <div key={i} className="lh-hero__stat">
                <span className="lh-hero__statIcon"><Icon name={s.icon} size={15} /></span>
                <span className="lh-hero__statVal">{s.value}</span>
                <span className="lh-hero__statLabel">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- LEARN IN A MORNING ---------------- */}
      <section className="lh-morning card">
        <div className="lh-morning__head">
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <div className="eyebrow">Guided path</div>
            <h3 style={{ margin: 0 }}>Learn Ardova in a morning</h3>
            <div className="muted t-sm">Four moves take you from brand new to running the system on your own.</div>
          </div>
          <div className="lh-morning__ring">
            <Ring value={morningPct} size={74} stroke={8} label={`${morningDone}/${steps.length}`} />
          </div>
        </div>
        <div className="lh-morning__bar">
          <ProgressBar value={morningPct} color="var(--accent)" />
        </div>
        <div className="lh-morning__steps">
          {steps.map((s, i) => (
            <MorningStep
              key={i}
              index={i + 1}
              title={s.title}
              desc={s.desc}
              done={s.done}
              current={i === currentStepIdx}
              meta={s.meta}
              actionLabel={s.actionLabel}
              onAction={s.onAction}
              last={i === steps.length - 1}
            />
          ))}
        </div>
        {morningDone === steps.length && (
          <div className="lh-morning__win">
            <Icon name="star" size={16} /> You finished the morning path. You are officially ramped. Keep the streak alive.
          </div>
        )}
      </section>

      {/* ---------------- JOURNEY DASHBOARD ---------------- */}
      <div className="section-head" style={{ marginTop: '1.6rem' }}>
        <div className="col gap-1">
          <div className="eyebrow">Your journey</div>
          <h3 style={{ margin: 0 }}>Every part of your ramp, live</h3>
        </div>
      </div>
      <div className="lh-tiles">
        <JourneyTile
          icon="radar"
          accent="var(--accent)"
          eyebrow="Skill Map"
          value={`${mastery}%`}
          valueSub="mastery"
          headline={nextSkill ? `Next to unlock: ${nextSkillLabel}` : nextSkillLabel}
          rows={[
            { label: 'Next skill', value: nextSkillLabel },
            { label: 'Areas', value: '9 constellations' },
          ]}
          to="/skills"
          cta="Open Skill Map"
        />
        <JourneyTile
          icon="zap"
          accent="var(--accent-purple)"
          eyebrow="Momentum"
          value={`Lv ${ramp.level.level}`}
          valueSub={ramp.level.name}
          headline={nbq ? `Next quest: ${nbq.title}` : 'All quests complete'}
          rows={[
            { label: 'XP', value: `${ramp.xp} / ${ramp.maxXp}` },
            { label: 'Day streak', value: `${streak} day${streak === 1 ? '' : 's'}` },
          ]}
          to="/momentum"
          cta="Open Momentum"
        />
        <JourneyTile
          icon="target"
          accent="var(--accent-teal)"
          eyebrow="Practice Arena"
          value={certs}
          valueSub={`of ${ARENA_ROLES.length} certs`}
          headline={certs ? 'Certified. Prove it again for a higher grade.' : 'Certify by simulation, not seat-time'}
          rows={[
            { label: 'Badges earned', value: badgeCount },
            { label: 'Drill passed', value: drillPassed ? 'Yes' : 'Not yet' },
          ]}
          to="/arena"
          cta="Open Arena"
        />
        <JourneyTile
          icon="history"
          accent="var(--info)"
          eyebrow="Replay + Coach"
          value={coverage.touched}
          valueSub={`/ ${coverage.total} features`}
          headline={highlight ? highlight.title : 'Move around and Ardova coaches you'}
          rows={[
            { label: 'Coverage', value: `${coverage.total ? Math.round((coverage.touched / coverage.total) * 100) : 0}%` },
            { label: 'Tips ready', value: analysis.cards ? analysis.cards.length : 0 },
          ]}
          to="/replay"
          cta="Open Replay"
        />
      </div>

      {/* ---------------- ROLE LESSON TRACK ---------------- */}
      <div className="lh-track card">
        <div className="lh-track__head">
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <div className="eyebrow">Your track</div>
            <h3 style={{ margin: 0 }}>{summary.track.label} lessons</h3>
            <div className="muted t-sm">{summary.track.blurb}</div>
          </div>
          <div className="lh-track__count">
            <Badge tone={summary.done === summary.total ? 'ok' : 'accent'}>
              {summary.done} / {summary.total} done
            </Badge>
          </div>
        </div>
        <div className="lh-track__bar">
          <ProgressBar value={summary.pct} color="var(--accent)" />
        </div>
        <div className="lh-track__list">
          {summary.lessons.map((l, i) => (
            <LessonRow
              key={l.id}
              n={i + 1}
              title={l.title}
              route={l.route}
              done={l.done}
              active={summary.nextLesson && summary.nextLesson.id === l.id}
              onStart={() => startLesson(l.id)}
            />
          ))}
        </div>
        <div className="lh-track__foot">
          <Icon name="sparkles" size={15} />
          <span>Click any lesson and Ardo starts you right there. It navigates, spotlights the screen, and checks you understand it.</span>
        </div>
      </div>
    </div>
  );
}
