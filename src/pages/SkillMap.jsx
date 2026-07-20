// ============================================================
// SKILL MAP  (/skills)
// ------------------------------------------------------------
// A game-like mastery cartography of the entire Ardovo platform: a
// constellation / tech-tree of every skill, grouped by area, wired
// with prerequisites, and coloured by your mastery. You unlock
// stars by doing (real signals from the book of business advance
// them automatically; everywhere else you launch the lesson and
// mark a rep as practiced). Managers flip to a team coverage
// heatmap to see gaps at a glance and retire the status meeting.
//
// This page only reads the store and the local-first skill graph
// (src/lib/skill-graph.js). It owns selection + hover + view state
// and hands the constellation, detail rail and heatmap their data.
// ============================================================
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageTitle, Card, Ring, Badge, Button, Segmented, useToast,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import { getCurrentUser, useStore } from '../lib/store.js';
import {
  AREAS, SKILLS, SKILL_BY_ID, LEVELS, LEVEL_ORDER,
  useSkillmap, userSkillState, overallMastery, areaStats, nextUp,
  markPracticed, resetProgress,
} from '../lib/skill-graph.js';
import SkillConstellation from '../components/skillmap/SkillConstellation.jsx';
import SkillDetail from '../components/skillmap/SkillDetail.jsx';
import TeamCoverage from '../components/skillmap/TeamCoverage.jsx';
import '../components/skillmap/skillmap.css';

const LEVEL_META = {
  locked: { label: 'Locked', color: '#9aa3b2' },
  learning: { label: 'Learning', color: LEVELS.learning.color },
  proficient: { label: 'Proficient', color: LEVELS.proficient.color },
  mastered: { label: 'Mastered', color: LEVELS.mastered.color },
};

export default function SkillMap() {
  const nav = useNavigate();
  const toast = useToast();
  const progress = useSkillmap();           // reactive: re-render on every practice mark
  const store = useStore();                 // reactive: re-render on every CRM store change
  const user = getCurrentUser();
  const userId = user?.id;

  // A cheap signature of the CRM facts the skill signals read. When any of it
  // changes (a deal moves stage, an activity is logged, a company is added) the
  // signal-driven mastery + the team heatmap recompute live, not just on a
  // practice mark.
  const storeSig = useMemo(() => JSON.stringify([
    store.deals.map(d => `${d.stage || ''}:${d.status || ''}:${d.ownerId || ''}`),
    store.contacts.map(c => c.ownerId || ''),
    store.companies.map(c => c.ownerId || ''),
    store.activities.map(a => `${a.type || ''}:${a.relatedType || ''}:${a.ownerId || ''}`),
  ]), [store]);

  const [view, setView] = useState('map');   // 'map' | 'team'
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [activeArea, setActiveArea] = useState(null);

  // Recompute the whole mastery state whenever practice marks OR the CRM store
  // change (storeSig captures the signal-driving facts).
  const state = useMemo(() => userSkillState(userId), [userId, progress, storeSig]);
  const overall = useMemo(() => overallMastery(userId, state), [userId, state]);
  const areas = useMemo(() => areaStats(userId, state), [userId, state]);
  const next = useMemo(() => nextUp(userId, state, 4), [userId, state]);

  const counts = useMemo(() => {
    const c = { locked: 0, learning: 0, proficient: 0, mastered: 0 };
    for (const s of SKILLS) c[state[s.id].level]++;
    return c;
  }, [state]);

  const focusSkill = useMemo(() => {
    const id = hoveredId || selectedId;
    return id ? SKILL_BY_ID.get(id) : null;
  }, [hoveredId, selectedId]);
  const focusState = focusSkill ? state[focusSkill.id] : null;

  /* ---------- actions ---------- */
  const handleSelect = (id) => setSelectedId(id);

  const handleNavigate = (skill) => {
    if (skill.rook) {
      try { window.dispatchEvent(new CustomEvent('rally:rook', { detail: { open: true } })); } catch {}
    }
    nav(skill.route);
  };

  const handleLesson = (skill) => {
    const detail = {
      skillId: skill.id,
      label: skill.label,
      area: skill.area,
      route: skill.route,
      prompt: `Teach me the "${skill.label}" skill in Ardovo and walk me through it step by step.`,
    };
    // Primary hook: any coach/companion listener starts this lesson.
    try { window.dispatchEvent(new CustomEvent('ardova:companion', { detail })); } catch {}
    // Working fallback so the button always does something visible today:
    // open Rook with the lesson prompt.
    try { window.dispatchEvent(new CustomEvent('rally:rook', { detail: { open: true, prompt: detail.prompt } })); } catch {}
    toast(`Lesson started: ${skill.label}`);
  };

  const handlePractice = (skill) => {
    // Never advance a locked skill: you must clear its prerequisites first.
    if (state[skill.id]?.level === 'locked') {
      toast('Clear the prerequisites first to practice this skill', 'warn');
      return;
    }
    const n = markPracticed(skill.id, userId);
    const lvl = LEVEL_META[userSkillState(userId)[skill.id].level].label;
    toast(`Practiced ${skill.label} (${n} rep${n === 1 ? '' : 's'}, now ${lvl})`);
  };

  const handleReset = () => {
    resetProgress(userId);
    setSelectedId(null);
    toast('Your practice reps were reset');
  };

  return (
    <div className="page">
      <PageTitle
        eyebrow="Mastery cartography"
        title="Skill Map"
        sub="Every Ardovo skill as a constellation. Unlock stars by doing, follow the paths, and grow your mastery."
        action={
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <Segmented
              options={[{ value: 'map', label: 'My map' }, { value: 'team', label: 'Team coverage' }]}
              value={view} onChange={setView} />
          </div>
        }
      />

      {/* summary strip */}
      <div className="sm-summary" style={{ marginBottom: '1rem' }}>
        <Card className="sm-hero" pad>
          <div className="row gap-3" style={{ alignItems: 'center' }}>
            <Ring value={overall} size={92} stroke={9} color="var(--accent)" label={`${overall}%`} />
            <div className="col gap-1" style={{ minWidth: 0 }}>
              <div className="stat-label">Overall mastery</div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>
                {counts.mastered} of {SKILLS.length} skills mastered
              </div>
              <div className="sm-meter" style={{ marginTop: 6, width: 200, maxWidth: '100%' }}>
                {LEVEL_ORDER.map(l => counts[l] > 0 && (
                  <span key={l} style={{ width: `${(counts[l] / SKILLS.length) * 100}%`, background: LEVEL_META[l].color }} title={`${counts[l]} ${LEVEL_META[l].label}`} />
                ))}
              </div>
              <div className="t-xs muted" style={{ marginTop: 5 }}>
                {counts.proficient} proficient - {counts.learning} learning - {counts.locked} locked
              </div>
            </div>
          </div>
        </Card>

        <Card pad>
          <div className="eyebrow" style={{ marginBottom: '.55rem' }}>Mastery legend</div>
          <div className="sm-legend" style={{ marginBottom: '.85rem' }}>
            {LEVEL_ORDER.map(l => (
              <span key={l} className="sm-legend__item">
                <span className="sm-swatch" style={{ background: LEVEL_META[l].color }} />
                {LEVEL_META[l].label}
              </span>
            ))}
            <span className="sm-legend__item">
              <span className="sm-swatch" style={{ background: 'var(--accent)', boxShadow: '0 0 0 3px rgba(14,159,143,.25)' }} />
              Pulsing = unlocks new skills
            </span>
          </div>
          <div className="eyebrow" style={{ marginBottom: '.5rem' }}>Areas (click to focus)</div>
          <div className="sm-arealegend">
            <button type="button" className={`sm-areachip${activeArea === null ? ' is-active' : ''}`} onClick={() => setActiveArea(null)}>
              All areas
            </button>
            {AREAS.map(a => (
              <button key={a.id} type="button"
                className={`sm-areachip${activeArea === a.id ? ' is-active' : ''}`}
                style={activeArea === a.id ? { color: a.color } : undefined}
                onClick={() => setActiveArea(activeArea === a.id ? null : a.id)}>
                <span className="sm-areachip__dot" style={{ background: a.color }} />
                {a.label}
              </button>
            ))}
          </div>
        </Card>
      </div>

      {view === 'map' ? (
        <div className="sm-wrap">
          <div className="col gap-2">
            <SkillConstellation
              state={state}
              selectedId={selectedId}
              hoveredId={hoveredId}
              activeArea={activeArea}
              onSelect={handleSelect}
              onHover={setHoveredId}
            />
            <div className="row between wrap" style={{ gap: '.5rem' }}>
              <span className="t-xs muted">
                Tip: signals from your real book of business raise mastery automatically. The rest advance as you launch lessons and mark reps.
              </span>
              <Button variant="quiet" size="sm" onClick={handleReset}>
                <Icon name="rotateCcw" size={14} /> Reset my reps
              </Button>
            </div>
          </div>
          <SkillDetail
            skill={focusSkill}
            st={focusState}
            state={state}
            nextItems={next}
            onSelect={handleSelect}
            onNavigate={handleNavigate}
            onLesson={handleLesson}
            onPractice={handlePractice}
          />
        </div>
      ) : (
        <TeamCoverage version={`${storeSig}::${JSON.stringify(progress)}`} currentUserId={userId} />
      )}
    </div>
  );
}
