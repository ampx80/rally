// ============================================================
// MOMENTUM  (route: /momentum)
// A gamified, adaptive competence ramp. A rep goes from zero to
// competent in a morning and can SEE it. Every quest is proven by
// REAL in-app actions (read live from store.js), not seat-time.
//
// The page composes the momentum engine (src/lib/momentum.js) with
// the shared Ardovo UI. Two tabs: "My ramp" (the personal ring, XP,
// streak, next best quest, and the role path) and "Team ramp" (the
// manager leaderboard scored off real CRM activity). Level ups fire
// self-contained confetti + a celebration modal, both of which
// respect prefers-reduced-motion.
// ASCII hyphen only. No em-dash or en-dash anywhere.
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { useStore, getCurrentUser } from '../lib/store.js';
import {
  ROLES, roleById,
  useMomentum, getRole, setRole,
  reconcile, pingStreak, markQuest, unmarkQuest, ackLevel, resetMomentum,
  getProgress, rampSummary, rampByTier, nextBestQuest,
  questStatus, questProgress, teamRamp, questsForRole, ensureTeamBaseline,
} from '../lib/momentum.js';
import {
  Button, Card, Badge, PageTitle, Tabs, Segmented,
  GradientText, useToast,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import ProgressRing from '../components/momentum/ProgressRing.jsx';
import XpBar from '../components/momentum/XpBar.jsx';
import StreakFlame from '../components/momentum/StreakFlame.jsx';
import LevelBadge from '../components/momentum/LevelBadge.jsx';
import QuestCard from '../components/momentum/QuestCard.jsx';
import NextBestQuest from '../components/momentum/NextBestQuest.jsx';
import TeamRamp from '../components/momentum/TeamRamp.jsx';
import BadgeShelf from '../components/momentum/BadgeShelf.jsx';
import LevelUpModal from '../components/momentum/LevelUpModal.jsx';
import Confetti from '../components/momentum/Confetti.jsx';
import '../components/momentum/momentum.css';

export default function Momentum() {
  const store = useStore();       // live book of business (drives verification)
  useMomentum();                  // re-render on any ramp write
  const toast = useToast();

  const role = getRole();
  const me = getCurrentUser();
  const [tab, setTab] = useState('ramp');
  const [celebrate, setCelebrate] = useState(null); // level object being celebrated
  const [confettiKey, setConfettiKey] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // A cheap signature of the store facts quests care about. When it changes
  // (a deal created, a task closed, a stage moved) we re-verify the ramp.
  const sig = useMemo(() => [
    store.deals.length,
    store.deals.filter(d => d.status === 'won').length,
    store.activities.length,
    store.activities.filter(a => a.done).length,
    store.activities.filter(a => typeof a.subject === 'string' && a.subject.indexOf('Stage moved:') === 0).length,
    store.contacts.length,
    store.companies.length,
  ].join('|'), [store]);

  // Count today as an active day the moment the ramp is opened, and snapshot
  // the team baseline once so the leaderboard measures ramp, not seeded volume.
  useEffect(() => { pingStreak(); ensureTeamBaseline(); }, []);

  // Re-verify whenever the role or the underlying data changes, then
  // celebrate anything that just crossed the line.
  useEffect(() => {
    const res = reconcile();
    if (res.newlyCompleted.length) {
      // Real work landed, so this counts as an active day too (not just opening).
      pingStreak();
      const gain = res.newlyCompleted.reduce((s, q) => s + q.xp, 0);
      toast(
        res.newlyCompleted.length === 1
          ? `Quest complete: ${res.newlyCompleted[0].title} +${res.newlyCompleted[0].xp} XP`
          : `${res.newlyCompleted.length} quests complete +${gain} XP`
      );
    }
    if (res.leveledUp) fireLevelUp(res.level);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, sig]);

  const summary = rampSummary(role);
  const level = summary.level;
  const groups = rampByTier(role);
  const next = nextBestQuest(role);
  const allDone = summary.done === summary.total;
  const streakInfo = getProgress();
  const teamRows = teamRamp(role);
  const roleMeta = roleById(role);

  function fireLevelUp(levelNum) {
    const lvl = rampSummary(getRole()).level;
    setCelebrate(lvl);
    setShowConfetti(true);
    setConfettiKey(k => k + 1);
    ackLevel(levelNum);
  }

  const handleMark = (id) => {
    const q = questsForRole(role).find(x => x.id === id);
    markQuest(id);
    pingStreak(); // completing a quest counts as showing up today
    if (q) toast(`Quest complete: ${q.title} +${q.xp} XP`);
    const res = reconcile();
    if (res.leveledUp) fireLevelUp(res.level);
  };
  const handleUnmark = (id) => { unmarkQuest(id); toast('Marked as not done', 'warn'); };
  const handleReset = () => {
    resetMomentum();
    setCelebrate(null);
    setShowConfetti(false);
    toast('Ramp reset. Baseline recaptured.', 'warn');
  };

  return (
    <div className="mo-page fade-up">
      {showConfetti && <Confetti key={confettiKey} onDone={() => setShowConfetti(false)} />}
      <LevelUpModal open={!!celebrate} level={celebrate} onClose={() => setCelebrate(null)} />

      <PageTitle
        eyebrow="Onboarding"
        title={<>Momentum <GradientText>ramp</GradientText></>}
        sub="Prove you can run the platform by doing the real work. Many quests verify automatically from live CRM activity; the rest you do in the app and check off yourself."
        action={
          <div className="row gap-1" style={{ alignItems: 'center' }}>
            <span className="t-sm muted desktop-only">Ramp path</span>
            <Segmented
              options={ROLES.map(r => ({ value: r.id, label: r.short }))}
              value={role}
              onChange={setRole}
            />
          </div>
        }
      />

      {/* ---------- HERO ---------- */}
      <Card className="card-pad mo-hero fx-shimmer" style={{ marginBottom: '1.4rem' }}>
        <div className="mo-hero__glow" />
        <div className="row between wrap" style={{ gap: '1.6rem', position: 'relative', alignItems: 'center' }}>
          <div className="row gap-3" style={{ alignItems: 'center', minWidth: 0 }}>
            <ProgressRing value={summary.percent} caption="ramped" />
            <div className="col gap-2" style={{ minWidth: 0 }}>
              <div className="row gap-2" style={{ alignItems: 'center' }}>
                <LevelBadge level={level.level} badge={level.badge} color={level.color} size="lg" />
                <div className="col" style={{ lineHeight: 1.15 }}>
                  <span className="eyebrow" style={{ color: 'rgba(255,255,255,.8)' }}>Level {level.level} {roleMeta.short}</span>
                  <span style={{ fontSize: '1.6rem', fontWeight: 800 }}>{level.name}</span>
                  <span className="t-sm" style={{ opacity: .85 }}>{level.blurb}</span>
                </div>
              </div>
              <div style={{ maxWidth: 320 }}>
                <XpBar level={level} />
              </div>
            </div>
          </div>

          <div className="row gap-3 wrap" style={{ flex: 'none', alignItems: 'center' }}>
            <StreakFlame streak={streakInfo.streak || 0} best={streakInfo.bestStreak || 0} />
            <div className="col center" style={{ minWidth: 76 }}>
              <span style={{ fontSize: '1.9rem', fontWeight: 800, lineHeight: 1 }}>{summary.done}<span style={{ opacity: .6, fontSize: '1.1rem' }}>/{summary.total}</span></span>
              <span className="stat-label">quests done</span>
            </div>
            <div className="col center" style={{ minWidth: 76 }}>
              <span style={{ fontSize: '1.9rem', fontWeight: 800, lineHeight: 1 }}>{summary.xp}</span>
              <span className="stat-label">XP earned</span>
            </div>
          </div>
        </div>
      </Card>

      <Tabs
        tabs={[
          { key: 'ramp', label: 'My ramp' },
          { key: 'team', label: 'Team ramp', count: teamRows.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'ramp' && (
        <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: '1.15rem', alignItems: 'start' }}>
          {/* MAIN: next best quest + the role path */}
          <div className="col gap-3" style={{ minWidth: 0 }}>
            <NextBestQuest
              quest={next}
              tierName={next ? `${(groups.find(g => g.tier === next.tier) || {}).name || 'Ramp'} - ${roleMeta.label} path` : ''}
              allDone={allDone}
              onMark={handleMark}
            />

            {groups.map(g => (
              <div key={g.tier} className="col gap-2">
                <div className="row gap-2" style={{ alignItems: 'center' }}>
                  <span className={`mo-tier__rail${g.complete ? ' mo-tier__rail--done' : ''}`} style={{ height: 34 }} />
                  <div className="col" style={{ minWidth: 0, flex: 1 }}>
                    <div className="row between" style={{ alignItems: 'center' }}>
                      <h3 style={{ margin: 0 }}>{g.name}</h3>
                      <Badge tone={g.complete ? 'ok' : 'default'}>{g.done}/{g.total}</Badge>
                    </div>
                    <span className="t-sm muted">{g.blurb}</span>
                  </div>
                </div>
                <div className="col gap-2">
                  {g.items.map(q => (
                    <QuestCard
                      key={q.id}
                      quest={q}
                      done={questStatus(q) === 'done'}
                      progress={questProgress(q)}
                      onMark={handleMark}
                      onUnmark={handleUnmark}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* SIDE: rank ladder + how it works + reset */}
          <div className="col gap-3" style={{ minWidth: 0 }}>
            <BadgeShelf currentLevel={level.level} />

            <Card className="card-pad col gap-2">
              <div className="row gap-1 fw-6" style={{ alignItems: 'center' }}>
                <Icon name="zap" size={16} style={{ color: 'var(--accent-600)' }} /> How Momentum works
              </div>
              <ul className="col gap-1 t-sm muted" style={{ margin: 0, paddingLeft: '1.1rem' }}>
                <li>Auto-verified quests light up the moment you do the real action in the CRM.</li>
                <li>Self-attest quests deep-link to the feature and let you mark them done.</li>
                <li>XP rolls into levels. Your day streak counts every day you show up or finish a quest.</li>
                <li>Switch the ramp path up top to match your role.</li>
              </ul>
            </Card>

            <Card className="card-pad col gap-2" style={{ background: 'var(--n-25)' }}>
              <div className="col gap-1">
                <span className="fw-6">Starting over?</span>
                <span className="t-sm muted">Reset recaptures your baseline so quests measure new work from now.</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleReset} style={{ width: 'fit-content' }}>
                <Icon name="rotateCcw" size={15} /> Reset my ramp
              </Button>
            </Card>
          </div>
        </div>
      )}

      {tab === 'team' && (
        <div className="col gap-3">
          <div className="row between wrap gap-2" style={{ alignItems: 'flex-start' }}>
            <div className="col gap-1" style={{ minWidth: 0 }}>
              <h3 style={{ margin: 0 }}>Team ramp leaderboard</h3>
              <span className="t-sm muted">Ramp is new work each rep has done since tracking started, measured against their own starting point. No status meeting required.</span>
            </div>
            {me?.role === 'manager' && <Badge tone="accent"><Icon name="shield" size={12} /> Manager view</Badge>}
          </div>
          <TeamRamp rows={teamRows} roleLabel={roleMeta.label} />
        </div>
      )}
    </div>
  );
}
