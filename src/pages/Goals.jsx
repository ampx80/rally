// Goals & Performance - the exec + manager cockpit. Company, team, and rep
// goals across revenue, new logos, activities, and pipeline generation, each
// paced against time-elapsed in the quarter (ahead / on-track / behind). A
// company-goal hero for the selected metric, a four-metric company grid, then
// three tabs: Teams (per-team goal grids), Leaderboard (reps ranked with rank
// movement), and Scorecards (weekly cadence per rep). Every actual is live off
// the seeded book; targets are editable and persist to localStorage.
import React, { useMemo, useState } from 'react';
import { useStore, getUsers, userName } from '../lib/store.js';
import {
  useGoalsStore, GOAL_METRICS, metricById, STATUS_META,
  currentPeriod, currentWeek, getGoal, goalsForScope, getTeams,
  repGoalLeaderboard, repScorecard,
} from '../lib/goals-data.js';
import {
  Card, Badge, Avatar, Tabs, SectionHeader, Segmented, ProgressBar,
  AnimatedNumber, money, moneyK,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import GoalCard from '../components/goals/GoalCard.jsx';
import Leaderboard from '../components/goals/Leaderboard.jsx';
import Scorecard from '../components/goals/Scorecard.jsx';
import GoalEditor from '../components/goals/GoalEditor.jsx';
import '../components/goals/goals.css';

export default function Goals() {
  useStore();        // live book of business
  useGoalsStore();   // goal targets + teams

  const period = useMemo(() => currentPeriod(), []);
  const week = useMemo(() => currentWeek(), []);
  const [metric, setMetric] = useState('revenue');
  const [tab, setTab] = useState('teams');
  const [editing, setEditing] = useState(null); // goal being edited

  const teams = getTeams();
  const reps = getUsers().filter(u => u.role === 'rep');

  // Selected-metric company goal drives the hero.
  const heroGoal = getGoal('company', '_', metric, period);
  const heroMeta = metricById(metric);
  const heroSm = STATUS_META[heroGoal.status] || STATUS_META['on-track'];
  const heroFmt = heroMeta.unit === 'money' ? money : (v) => Math.round(v).toLocaleString();
  const heroFmtK = heroMeta.unit === 'money' ? moneyK : (v) => Math.round(v).toLocaleString();

  // All four company goals for the metric grid.
  const companyGoals = goalsForScope('company', '_', period);
  const leaderboard = useMemo(() => repGoalLeaderboard(metric, period), [metric, period]);

  const onEdit = (goal) => setEditing(goal);
  const editRepName = editing && editing.level === 'rep' ? userName(editing.scope) : null;

  return (
    <div className="goals-page fade-up col gap-3">
      <SectionHeader
        eyebrow={`${period.label} - ${period.daysLeft} days left`}
        title="Goals & Performance"
        sub="Company, team, and rep goals paced against the clock. Ahead, on track, or behind - live off the book."
        action={
          <Segmented
            options={GOAL_METRICS.map(m => ({ value: m.id, label: m.label }))}
            value={metric}
            onChange={setMetric}
          />
        }
      />

      {/* Company-goal hero */}
      <Card className="card-pad gl-rise" style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="gl-hero-glow" style={{ position: 'absolute', top: -60, right: -50, width: 240, height: 240, borderRadius: '50%', background: heroSm.color, opacity: .09, filter: 'blur(12px)' }} />
        <div className="row between wrap" style={{ gap: '1.4rem', position: 'relative' }}>
          <div className="col gap-2" style={{ minWidth: 0, flex: '1 1 320px' }}>
            <span className="row gap-1" style={{ alignItems: 'center', color: heroMeta.color }}>
              <Icon name={heroMeta.icon} size={16} />
              <span className="eyebrow" style={{ color: heroMeta.color }}>Company {heroMeta.label.toLowerCase()} goal</span>
            </span>
            <div className="gl-pop" style={{ fontSize: 'clamp(2.4rem, 5vw, 3.4rem)', fontWeight: 800, lineHeight: 1.02 }}>
              <AnimatedNumber value={heroGoal.actual} format={heroFmt} />
            </div>
            <div className="row gap-2 wrap" style={{ alignItems: 'center' }}>
              <Badge tone={heroSm.tone}>{heroSm.label}</Badge>
              <span className="t-sm muted">
                {heroFmtK(heroGoal.actual)} of {heroFmtK(heroGoal.target)} - {Math.round(heroGoal.attainment * 100)}% attained
              </span>
            </div>
            <div className="row gap-3 wrap" style={{ marginTop: 4 }}>
              <div className="col gap-1">
                <span className="stat-label">Pace to now</span>
                <span className="fw-7 tnum">{heroFmtK(Math.round(heroGoal.expected))}</span>
              </div>
              <div className="col gap-1">
                <span className="stat-label">Projected close</span>
                <span className="fw-7 tnum" style={{ color: heroSm.color }}>{heroFmtK(Math.round(heroGoal.projected))}</span>
              </div>
              <div className="col gap-1">
                <span className="stat-label">Gap to goal</span>
                <span className="fw-7 tnum">{heroGoal.actual >= heroGoal.target ? 'Hit' : heroFmtK(Math.round(heroGoal.target - heroGoal.actual))}</span>
              </div>
            </div>
          </div>

          {/* attainment vs pace line */}
          <div style={{ flex: '1 1 300px', minWidth: 260, maxWidth: 420 }}>
            <div className="row between t-sm" style={{ marginBottom: 6 }}>
              <span className="fw-6">Attainment</span>
              <span className="muted">{Math.round(period.elapsed * 100)}% of {period.label} elapsed</span>
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{ background: 'var(--n-100)', borderRadius: 999, height: 16, overflow: 'hidden', width: '100%' }}>
                <div className="gl-pace-fill" style={{ width: `${Math.min(100, heroGoal.attainment * 100)}%`, height: '100%', background: heroSm.color, borderRadius: 999 }} />
              </div>
              <div className="gl-pace-mark" title="Pace line" style={{ position: 'absolute', top: -3, left: `${Math.min(100, period.elapsed * 100)}%`, transform: 'translateX(-50%)', width: 3, height: 22, background: 'var(--ink)', borderRadius: 2 }} />
            </div>
            <div className="row between t-xs muted" style={{ marginTop: 8 }}>
              <span>0</span>
              <span>pace line = where you should be</span>
              <span>{heroFmtK(heroGoal.target)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Company metric grid - the four goals at a glance */}
      <div className="col gap-1">
        <div className="eyebrow">Company goals - {period.label}</div>
        <div className="grid gl-stagger" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          {companyGoals.map(g => (
            <GoalCard key={g.key} goal={g} period={period} onEdit={onEdit} />
          ))}
        </div>
      </div>

      <Tabs
        tabs={[
          { key: 'teams', label: 'Teams', count: teams.length },
          { key: 'leaderboard', label: 'Leaderboard', count: reps.length },
          { key: 'scorecards', label: 'Scorecards', count: reps.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'teams' && <TeamsTab teams={teams} period={period} metric={metric} onEdit={onEdit} />}
      {tab === 'leaderboard' && <LeaderboardTab rows={leaderboard} metric={metric} period={period} />}
      {tab === 'scorecards' && <ScorecardsTab reps={reps} week={week} />}

      <GoalEditor
        goal={editing}
        repName={editRepName}
        onClose={() => setEditing(null)}
        onSaved={() => setEditing(null)}
      />
    </div>
  );
}

/* ============================================================
   TEAMS - per-team goal grids, rolled up from real owners
   ============================================================ */
function TeamsTab({ teams, period, metric, onEdit }) {
  return (
    <div className="col gap-3">
      <div className="muted t-sm">Team goals roll up live from each team's assigned reps. Click the pencil on any card to reset a target.</div>
      {teams.map(t => {
        const members = getUsers().filter(u => (t.repIds || []).includes(u.id));
        const goals = goalsForScope('team', t.id, period);
        // Lead with the metric selected up top, then the rest.
        const ordered = [...goals].sort((a, b) => (a.metric === metric ? -1 : b.metric === metric ? 1 : 0));
        return (
          <Card key={t.id} className="col gap-3">
            <div className="row between wrap" style={{ gap: '.6rem', alignItems: 'center' }}>
              <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
                <span className="row center" style={{ width: 12, height: 12, borderRadius: 3, background: t.color, flex: 'none' }} />
                <div className="col" style={{ minWidth: 0, lineHeight: 1.2 }}>
                  <h4 className="clip" style={{ margin: 0 }}>{t.name}</h4>
                  <span className="t-xs muted clip">{t.segment}</span>
                </div>
              </div>
              <div className="row gap-1" style={{ flexWrap: 'wrap', flex: 'none' }}>
                {members.map(u => (
                  <span key={u.id} title={u.name} className="row gap-1"
                    style={{ alignItems: 'center', padding: '.2rem .5rem .2rem .25rem', borderRadius: 999, background: 'var(--n-100)' }}>
                    <Avatar name={u.name} size={20} />
                    <span className="t-xs fw-6">{u.name.split(' ')[0]}</span>
                  </span>
                ))}
              </div>
            </div>
            <div className="grid gl-stagger" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              {ordered.map(g => (
                <GoalCard key={g.key} goal={g} period={period} onEdit={onEdit} />
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

/* ============================================================
   LEADERBOARD - reps ranked on the selected metric
   ============================================================ */
function LeaderboardTab({ rows, metric, period }) {
  const m = metricById(metric);
  const hit = rows.filter(r => r.status === 'hit' || r.status === 'ahead').length;
  return (
    <div className="col gap-3">
      <div className="row between wrap" style={{ gap: '.6rem', alignItems: 'center' }}>
        <div className="muted t-sm">Ranked by {m.label.toLowerCase()} attainment for {period.label}. Arrows show rank movement from last week.</div>
        <Badge tone={hit > 0 ? 'ok' : 'default'}>{hit} rep{hit === 1 ? '' : 's'} at or ahead of pace</Badge>
      </div>
      <Card style={{ padding: '.4rem 1rem 1rem' }}>
        <Leaderboard rows={rows} metric={metric} />
      </Card>
    </div>
  );
}

/* ============================================================
   SCORECARDS - weekly cadence per rep
   ============================================================ */
function ScorecardsTab({ reps, week }) {
  return (
    <div className="col gap-3">
      <div className="muted t-sm">Weekly activity and output cadence, {week.label.toLowerCase()}. Score blends progress across all five rows.</div>
      <div className="grid gl-stagger" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
        {reps.map(u => (
          <Scorecard key={u.id} user={u} card={repScorecard(u.id, week)} />
        ))}
      </div>
    </div>
  );
}
