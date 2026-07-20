// ============================================================
// PRACTICE ARENA  (route: /arena)
//
// "Learn by doing, scored instantly." A game-like training ground where reps get
// certified by simulation, not seat-time. Three scored modes, each earning a
// badge on pass; clearing all three for a role grants an "Ardovo Certified
// <Role>" badge. Everything runs deterministically with zero API keys; the
// optional /api/arena route (Anthropic) only enriches the role-play buyer and
// coaching when a key is present.
//
// This page is the hub: pick a role, see your certification progress, launch a
// mode, and admire your badge wall. State + scoring live in src/lib/arena.js;
// each mode is its own component under src/components/arena/.
// ASCII only. NO em-dash / en-dash.
// ============================================================
import React, { useState } from 'react';
import { PageTitle, Card, Button, Badge, StatCard, SectionHeader, Ring, useToast } from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import {
  ROLES, roleById, useArena, certificationStatus, MODE_LABEL, PASS_MARK, gradeTone, resetArena,
} from '../lib/arena.js';
import RolePlay from '../components/arena/RolePlay.jsx';
import SpeedDrill from '../components/arena/SpeedDrill.jsx';
import KnowledgeCheck from '../components/arena/KnowledgeCheck.jsx';
import BadgesWall from '../components/arena/BadgesWall.jsx';
import '../components/arena/arena.css';

const MODES = [
  { id: 'roleplay', title: 'Role-Play', icon: 'messages', accent: 'var(--accent)', blurb: 'Practice discovery, objection-handling, and closing against a realistic buyer persona. AI makes the replies richer when a key is connected.' },
  { id: 'drill', title: 'Speed Drills', icon: 'zap', accent: 'var(--warn)', blurb: 'Beat the clock on everyday CRM workflows. Scored on speed and completeness, with a pace leaderboard.' },
  { id: 'knowledge', title: 'Knowledge Check', icon: 'book', accent: 'var(--accent-purple, var(--accent))', blurb: 'An adaptive quiz on Ardovo concepts that gets harder the more you get right.' },
];

function ModeStatusPill({ passed, score }) {
  if (passed) return <Badge tone="ok"><Icon name="check" size={12} /> {score}</Badge>;
  if (score > 0) return <Badge tone="warn">{score}</Badge>;
  return <Badge tone="default">Not started</Badge>;
}

export default function Arena() {
  const progress = useArena();
  const toast = useToast();
  const [roleId, setRoleId] = useState('ae');
  const [view, setView] = useState('hub'); // hub | roleplay | drill | knowledge

  const role = roleById(roleId);
  const cert = certificationStatus(progress, roleId);
  const certifiedRoles = ROLES.filter(r => certificationStatus(progress, r.id).certified).length;
  const streak = progress.streak || { current: 0, best: 0 };

  function launch(modeId) { setView(modeId); }
  function backToHub() { setView('hub'); }

  /* ---- a mode is running ---- */
  if (view !== 'hub') {
    const backBar = (
      <div className="row between wrap gap-2" style={{ marginBottom: '1.25rem' }}>
        <PageTitle
          eyebrow={`Practice Arena / ${role.name}`}
          title={MODES.find(m => m.id === view)?.title || 'Practice'}
        />
        <Button variant="ghost" onClick={backToHub}><Icon name="x" size={16} /> Exit to hub</Button>
      </div>
    );
    return (
      <div className="arena-page">
        {backBar}
        {view === 'roleplay' && <RolePlay roleId={roleId} onExit={backToHub} />}
        {view === 'drill' && <SpeedDrill roleId={roleId} onExit={backToHub} />}
        {view === 'knowledge' && <KnowledgeCheck roleId={roleId} onExit={backToHub} />}
      </div>
    );
  }

  /* ---- hub ---- */
  const certPct = Math.round((cert.modes.filter(m => m.passed).length / 3) * 100);

  return (
    <div className="arena-page">
      <PageTitle
        eyebrow="Learn by doing, scored instantly"
        title="Practice Arena"
        sub="Get certified by simulation, not seat-time. Three scored modes run fully offline; connect a key and AI enriches the role-play and coaching."
        action={
          <Badge tone={certifiedRoles > 0 ? 'ok' : 'default'} className="row gap-1">
            <Icon name="roleShield" size={14} /> {certifiedRoles} of {ROLES.length} roles certified
          </Badge>
        }
      />

      {/* top stats */}
      <div className="ar-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard label="Badges earned" value={progress.badges.length} icon={<Icon name="star" size={18} />} />
        <StatCard label="Roles certified" value={certifiedRoles} icon={<Icon name="roleShield" size={18} />} accent="var(--ok)" />
        <StatCard label="Pass streak" value={progress.passStreak || 0} icon={<Icon name="zap" size={18} />} accent="var(--warn)" sub="Consecutive passing runs" />
        <StatCard label="Day streak" value={streak.current} icon={<Icon name="flag" size={18} />} accent="var(--accent-purple, var(--accent))" sub={`Best ${streak.best}`} />
      </div>

      {/* role selector */}
      <SectionHeader title="Choose your track" sub="Certification is per role. Pass all three modes below while a role is selected to certify it." />
      <div className="ar-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', margin: '.75rem 0 1.75rem' }}>
        {ROLES.map((r) => {
          const rc = certificationStatus(progress, r.id);
          const active = r.id === roleId;
          return (
            <Card
              key={r.id}
              className={`ar-card ${active ? 'ar-role-active' : ''}`}
              tabIndex={0}
              role="button"
              aria-pressed={active}
              onClick={() => setRoleId(r.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setRoleId(r.id); } }}
            >
              <div className="row between" style={{ alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--accent)' }}><Icon name={r.icon} size={24} /></span>
                {rc.certified
                  ? <Badge tone="ok"><Icon name="check" size={12} /> Certified</Badge>
                  : <Badge tone="default">{rc.modes.filter(m => m.passed).length}/3</Badge>}
              </div>
              <div className="fw-7" style={{ marginTop: '.6rem' }}>{r.full}</div>
              <div className="t-sm muted" style={{ marginTop: '.35rem', lineHeight: 1.5 }}>{r.blurb}</div>
            </Card>
          );
        })}
      </div>

      {/* certification progress for the selected role */}
      <Card pad style={{ marginBottom: '1.75rem' }}>
        <div className="row between wrap gap-3" style={{ alignItems: 'center' }}>
          <div className="row gap-3" style={{ alignItems: 'center' }}>
            <Ring value={certPct} size={72} stroke={8} color={cert.certified ? 'var(--ok)' : 'var(--accent)'} label={`${cert.modes.filter(m => m.passed).length}/3`} />
            <div>
              <div className="fw-7" style={{ fontSize: '1.1rem' }}>
                {cert.certified ? `Ardovo Certified ${role.full}` : `${role.full} certification`}
              </div>
              <div className="t-sm muted">
                {cert.certified
                  ? 'Complete. This badge is on your wall.'
                  : `Pass all three modes (score ${PASS_MARK}+) to certify.`}
              </div>
            </div>
          </div>
          <div className="row gap-2 wrap">
            {cert.modes.map((m) => (
              <div key={m.mode} className="col gap-1 center" style={{ minWidth: 96, padding: '.5rem .7rem', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)' }}>
                <div className="t-xs muted">{MODE_LABEL[m.mode]}</div>
                <ModeStatusPill passed={m.passed} score={m.score} />
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* mode launchers */}
      <SectionHeader title={`Train as ${role.name}`} sub="Each run is scored and earns a badge on pass. Your best score per mode counts toward certification." />
      <div className="ar-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', margin: '.75rem 0 1.75rem' }}>
        {MODES.map((m) => {
          const best = (progress.bestScores[roleId] || {})[m.id] || 0;
          const modeCert = cert.modes.find(x => x.mode === m.id);
          return (
            <Card
              key={m.id}
              className="ar-card"
              tabIndex={0}
              role="button"
              onClick={() => launch(m.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); launch(m.id); } }}
            >
              <div className="row between" style={{ alignItems: 'flex-start' }}>
                <span style={{
                  width: 44, height: 44, borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `color-mix(in srgb, ${m.accent} 15%, transparent)`, color: m.accent,
                }}>
                  <Icon name={m.icon} size={24} />
                </span>
                {best > 0
                  ? <Badge tone={gradeTone(best)}>Best {best}</Badge>
                  : <Badge tone="default">New</Badge>}
              </div>
              <div className="fw-7" style={{ marginTop: '.7rem', fontSize: '1.1rem' }}>{m.title}</div>
              <div className="t-sm muted" style={{ marginTop: '.35rem', lineHeight: 1.5 }}>{m.blurb}</div>
              <div className="row between" style={{ marginTop: '.9rem', alignItems: 'center' }}>
                {modeCert && modeCert.passed
                  ? <span className="row gap-1 t-sm fw-6" style={{ color: 'var(--ok)' }}><Icon name="check" size={14} /> Passed</span>
                  : <span className="t-sm muted">{PASS_MARK}+ to pass</span>}
                <span className="row gap-1 t-sm fw-6" style={{ color: 'var(--accent)' }}>
                  {best > 0 ? 'Improve' : 'Start'} <Icon name="play" size={14} />
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* badges wall */}
      <SectionHeader title="Badge wall" sub="Everything you have earned in the Arena." />
      <div style={{ marginTop: '.75rem' }}>
        <BadgesWall badges={progress.badges} />
      </div>

      {/* reset */}
      <div className="row between wrap gap-2" style={{ marginTop: '1.5rem', alignItems: 'center' }}>
        <span className="t-xs muted">
          Scores, badges, and certifications are saved on this device only.
        </span>
        <Button
          variant="quiet"
          size="sm"
          onClick={() => {
            resetArena();
            toast('Arena progress reset', 'warn');
          }}
        >
          <Icon name="rotateCcw" size={14} /> Reset Arena progress
        </Button>
      </div>
    </div>
  );
}
