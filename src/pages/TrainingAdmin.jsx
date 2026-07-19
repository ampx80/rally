// TrainingAdmin - the manager view of "who trained on what". A team enablement
// analytics surface: completion, competency, and who is behind, plus a
// per-person module breakdown and a coverage matrix. Reads the local-first
// training engine (teamRoster / teamStats / memberModuleStatus). Teal is the
// product, violet marks the AI layer. ASCII only. NO em-dash / en-dash.
import React, { useMemo, useState } from 'react';
import { SectionHeader, Card, Badge, relTime, ProgressBar, Segmented, EmptyState, Avatar } from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import AgentDeck from '../components/agent/AgentDeck.jsx';
import { useTraining, useTeamProgress, teamRoster, teamStats, memberModuleStatus } from '../lib/training.js';
import { getCurrentUser } from '../lib/store.js';

// Bar + accent color for a completion percentage. atRisk always reads risk.
function pctTone(pct, atRisk) {
  if (atRisk || pct < 50) return 'var(--risk)';
  if (pct < 100) return 'var(--accent)';
  return 'var(--ok)';
}
function pctLabel(pct) {
  if (pct >= 100) return 'Fully trained';
  if (pct >= 80) return 'On track';
  if (pct >= 50) return 'In progress';
  return 'Behind';
}

export default function TrainingAdmin() {
  useTraining(); // re-render when any completion changes
  useTeamProgress(); // hydrate live cross-user completions when the backend is configured
  const me = getCurrentUser();

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('attention');
  const [view, setView] = useState('roster');
  const [openId, setOpenId] = useState(null);

  const roster = teamRoster();
  const stats = teamStats();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? roster.filter(p => p.name.toLowerCase().includes(q) || (p.title || '').toLowerCase().includes(q))
      : roster;
    const arr = [...base];
    arr.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'completion') return b.pct - a.pct || a.name.localeCompare(b.name);
      // attention: at-risk first, then lowest completion first
      if (a.atRisk !== b.atRisk) return a.atRisk ? -1 : 1;
      return a.pct - b.pct || a.name.localeCompare(b.name);
    });
    return arr;
  }, [roster, query, sort]);

  // Coverage matrix: union of every module that appears across the team, in
  // first-seen order, plus a per-person completion map and per-module coverage.
  const matrix = useMemo(() => {
    const cols = [];
    const seen = new Set();
    const rows = roster.map(p => {
      const status = memberModuleStatus(p.id);
      const map = {};
      status.forEach(m => {
        map[m.id] = m.complete;
        if (!seen.has(m.id)) { seen.add(m.id); cols.push({ id: m.id, title: m.title, area: m.area }); }
      });
      return { person: p, map };
    });
    const coverage = cols.map(c => {
      let applicable = 0, done = 0;
      rows.forEach(r => { if (r.map[c.id] !== undefined) { applicable++; if (r.map[c.id]) done++; } });
      return applicable ? Math.round((done / applicable) * 100) : 0;
    });
    return { cols, rows, coverage };
  }, [roster]);

  const hasTeam = roster.length > 0;

  return (
    <div className="fade-up ta">
      <AgentDeck
        eyebrow="Training Analytics"
        live
        title="Who trained on what,"
        highlight="across your team."
        sub="Completion, competency, and who is falling behind - one manager view over your whole roster. Numbers are live from the training engine; drill into any person for their module-by-module record."
        pods={[
          { label: 'People', value: stats.people, icon: 'users' },
          { label: 'Avg completion', value: stats.avgPct, format: (n) => `${Math.round(n)}%`, icon: 'gauge' },
          { label: 'Fully trained', value: stats.fullyTrained, icon: 'trendUp' },
          { label: 'At risk', value: stats.atRisk, icon: 'shield' },
        ]}
      />

      {!hasTeam ? (
        <Card className="ta-card" style={{ marginTop: '1.25rem' }}>
          <EmptyState
            icon="&#128101;"
            title="No team yet"
            body="Once teammates are on the roster, their training completion and competency show up here."
          />
        </Card>
      ) : (
        <>
          <div className="ta-controls">
            <div className="ta-search">
              <Icon name="search" size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search people by name or title"
                aria-label="Search people"
              />
              {query && (
                <button className="ta-clear" onClick={() => setQuery('')} aria-label="Clear search"><Icon name="x" size={14} /></button>
              )}
            </div>
            <div className="ta-control-group">
              <Segmented
                value={sort}
                onChange={setSort}
                options={[
                  { value: 'attention', label: 'Needs attention' },
                  { value: 'completion', label: 'Completion' },
                  { value: 'name', label: 'Name' },
                ]}
              />
              <Segmented
                value={view}
                onChange={setView}
                options={[
                  { value: 'roster', label: 'Roster' },
                  { value: 'matrix', label: 'Coverage matrix' },
                ]}
              />
            </div>
          </div>

          {view === 'roster' ? (
            <div className="ta-roster">
              <SectionHeader
                title="Team roster"
                sub={`${filtered.length} ${filtered.length === 1 ? 'person' : 'people'}${stats.atRisk ? ` - ${stats.atRisk} at risk` : ''}`}
              />
              {filtered.length === 0 ? (
                <Card className="ta-card">
                  <EmptyState icon="&#128269;" title="No matches" body={`No one matches "${query}". Clear the search to see the full roster.`} />
                </Card>
              ) : (
                <div className="ta-list">
                  {filtered.map(p => (
                    <PersonRow
                      key={p.id}
                      person={p}
                      open={openId === p.id}
                      onToggle={() => setOpenId(openId === p.id ? null : p.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <CoverageMatrix matrix={matrix} meId={me?.id} />
          )}
        </>
      )}

      <TrainingAdminStyles />
    </div>
  );
}

function PersonRow({ person, open, onToggle }) {
  const { name, title, role, required, done, pct, lastActiveAt, atRisk, isMe } = person;
  const tone = pctTone(pct, atRisk);
  const status = useMemo(() => (open ? memberModuleStatus(person.id) : []), [open, person.id]);

  const groups = useMemo(() => {
    const g = {};
    status.forEach(m => { (g[m.area] = g[m.area] || []).push(m); });
    return Object.entries(g);
  }, [status]);

  return (
    <div className={`ta-person${open ? ' is-open' : ''}${isMe ? ' is-me' : ''}`} data-risk={atRisk}>
      <button className="ta-person-head" onClick={onToggle} aria-expanded={open}>
        <Avatar name={name} size={40} />
        <div className="ta-person-id">
          <div className="ta-person-name">
            {name}
            {isMe && <span className="ta-you">You</span>}
            {atRisk && <Badge tone="risk">At risk</Badge>}
          </div>
          <div className="ta-person-title">{title || (role === 'manager' ? 'Manager' : 'Rep')}</div>
        </div>

        <div className="ta-person-bar">
          <div className="ta-bar-top">
            <span className="ta-bar-pct" style={{ color: tone }}>{pct}%</span>
            <span className="ta-bar-count">{done}/{required} modules</span>
          </div>
          <ProgressBar value={pct} color={tone} height={7} />
          <div className="ta-bar-status" style={{ color: tone }}>{pctLabel(pct)}</div>
        </div>

        <div className="ta-person-meta">
          <span className="ta-meta-label">Last active</span>
          <span className="ta-meta-value"><Icon name="activity" size={13} /> {relTime(lastActiveAt)}</span>
        </div>

        <Icon name="chevronDown" size={18} className="ta-person-chev" style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>

      {open && (
        <div className="ta-person-body">
          {status.length === 0 ? (
            <div className="ta-empty-inline">No required modules for this role.</div>
          ) : (
            <>
              <div className="ta-body-head">
                <Icon name="target" size={14} /> Required path - {done} of {required} complete
              </div>
              <div className="ta-groups">
                {groups.map(([area, mods]) => (
                  <div key={area} className="ta-group">
                    <div className="ta-group-title">{area}</div>
                    <ul className="ta-checklist">
                      {mods.map(m => (
                        <li key={m.id} className={`ta-check${m.complete ? ' done' : ''}`}>
                          <span className="ta-check-dot">
                            {m.complete ? <Icon name="check" size={13} /> : null}
                          </span>
                          <span className="ta-check-title">{m.title}</span>
                          <span className="ta-check-state">{m.complete ? 'Complete' : 'Not started'}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function CoverageMatrix({ matrix, meId }) {
  const { cols, rows, coverage } = matrix;
  if (!cols.length) {
    return (
      <Card className="ta-card">
        <EmptyState icon="&#128202;" title="Nothing to map yet" body="Coverage across modules and people appears here once training paths are assigned." />
      </Card>
    );
  }
  return (
    <div className="ta-matrix-wrap">
      <SectionHeader
        title="Coverage matrix"
        sub="Every required module by person. A filled dot is complete, a ring is not started, a dash means the module is not on that person's path."
      />
      <div className="ta-legend">
        <span className="ta-legend-item"><span className="ta-dot done" /> Complete</span>
        <span className="ta-legend-item"><span className="ta-dot" /> Not started</span>
        <span className="ta-legend-item"><span className="ta-dot na">-</span> Not required</span>
      </div>
      <div className="ta-matrix-scroll">
        <table className="ta-matrix">
          <thead>
            <tr>
              <th className="ta-mx-corner">Person</th>
              {cols.map(c => (
                <th key={c.id} className="ta-mx-colhead">
                  <span title={`${c.title} (${c.area})`}>{c.title}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ person, map }) => (
              <tr key={person.id} className={person.id === meId ? 'is-me' : ''}>
                <th className="ta-mx-person" scope="row">
                  <span className="ta-mx-name">
                    {person.name}
                    {person.id === meId && <span className="ta-you">You</span>}
                  </span>
                  <span className="ta-mx-pct" style={{ color: pctTone(person.pct, person.atRisk) }}>{person.pct}%</span>
                </th>
                {cols.map(c => {
                  const v = map[c.id];
                  return (
                    <td key={c.id} className="ta-mx-cell">
                      {v === undefined
                        ? <span className="ta-dot na" title={`${c.title}: not required`}>-</span>
                        : <span className={`ta-dot${v ? ' done' : ''}`} title={`${c.title}: ${v ? 'complete' : 'not started'}`}>{v ? <Icon name="check" size={12} /> : null}</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th className="ta-mx-person ta-mx-foot" scope="row">Module coverage</th>
              {coverage.map((pctVal, i) => (
                <td key={cols[i].id} className="ta-mx-cell ta-mx-cov">
                  <span style={{ color: pctVal >= 80 ? 'var(--ok)' : pctVal >= 50 ? 'var(--accent)' : 'var(--risk)' }}>{pctVal}%</span>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function TrainingAdminStyles() {
  return (
    <style>{`
    .ta-controls { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; margin: 1.25rem 0 1rem; }
    .ta-control-group { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .ta-search { display: flex; align-items: center; gap: 8px; background: var(--paper); border: 1px solid var(--line); border-radius: 12px; padding: 9px 12px; min-width: 260px; flex: 1 1 260px; max-width: 380px; color: var(--n-600); }
    .ta-search:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-50); }
    .ta-search input { flex: 1; border: none; outline: none; background: none; font-family: inherit; font-size: 14px; color: var(--ink); min-width: 0; }
    .ta-search input::placeholder { color: var(--n-400); }
    .ta-clear { border: none; background: none; color: var(--n-400); cursor: pointer; display: grid; place-items: center; padding: 2px; border-radius: 6px; }
    .ta-clear:hover { color: var(--ink); background: var(--n-100); }

    .ta-card { margin-top: 0; }
    .ta-list { display: flex; flex-direction: column; gap: 10px; }

    .ta-person { border: 1px solid var(--line); border-radius: 14px; background: var(--paper); overflow: hidden; transition: border-color .15s, box-shadow .15s; }
    .ta-person:hover { border-color: var(--line-strong); box-shadow: var(--shadow-sm); }
    .ta-person.is-open { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-50); }
    .ta-person.is-me { background: linear-gradient(90deg, var(--accent-50), var(--paper) 55%); }
    .ta-person[data-risk="true"] { border-left: 3px solid var(--risk); }

    .ta-person-head { display: grid; grid-template-columns: 40px minmax(150px, 1.5fr) minmax(160px, 2fr) minmax(96px, auto) 20px; align-items: center; gap: 16px; width: 100%; text-align: left; font-family: inherit; background: none; border: none; cursor: pointer; padding: 14px 16px; }
    .ta-person-id { min-width: 0; }
    .ta-person-name { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 15px; color: var(--ink); flex-wrap: wrap; }
    .ta-person-title { font-size: 12.5px; color: var(--n-600); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ta-you { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; color: var(--accent-600); background: var(--accent-50); padding: 2px 7px; border-radius: 999px; }

    .ta-person-bar { min-width: 0; }
    .ta-bar-top { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 5px; }
    .ta-bar-pct { font-weight: 800; font-size: 15px; font-variant-numeric: tabular-nums; }
    .ta-bar-count { font-size: 12px; color: var(--n-600); font-variant-numeric: tabular-nums; }
    .ta-bar-status { font-size: 11.5px; font-weight: 700; margin-top: 5px; }

    .ta-person-meta { display: flex; flex-direction: column; gap: 3px; text-align: right; }
    .ta-meta-label { font-size: 11px; color: var(--n-400); text-transform: uppercase; letter-spacing: .04em; }
    .ta-meta-value { display: inline-flex; align-items: center; gap: 5px; justify-content: flex-end; font-size: 12.5px; font-weight: 600; color: var(--n-700); }
    .ta-person-chev { color: var(--n-400); transition: transform .2s; justify-self: end; }

    .ta-person-body { border-top: 1px solid var(--line); padding: 14px 16px 16px; background: var(--n-25); }
    .ta-body-head { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 700; color: var(--n-700); margin-bottom: 12px; }
    .ta-empty-inline { font-size: 13px; color: var(--n-600); padding: 8px 2px; }
    .ta-groups { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
    .ta-group-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; color: var(--n-400); margin-bottom: 7px; }
    .ta-checklist { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
    .ta-check { display: flex; align-items: center; gap: 10px; padding: 7px 9px; border-radius: 9px; background: var(--paper); border: 1px solid var(--line); }
    .ta-check-dot { width: 20px; height: 20px; border-radius: 50%; flex: none; display: grid; place-items: center; border: 2px solid var(--line-strong); color: #fff; }
    .ta-check.done .ta-check-dot { background: var(--ok); border-color: var(--ok); }
    .ta-check-title { flex: 1; min-width: 0; font-size: 13px; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ta-check.done .ta-check-title { color: var(--n-700); }
    .ta-check-state { font-size: 11px; font-weight: 700; color: var(--n-400); flex: none; }
    .ta-check.done .ta-check-state { color: var(--ok); }

    .ta-matrix-wrap { margin-top: .5rem; }
    .ta-legend { display: flex; gap: 18px; flex-wrap: wrap; margin: 0 0 12px; }
    .ta-legend-item { display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; color: var(--n-600); font-weight: 600; }
    .ta-dot { width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--line-strong); display: inline-grid; place-items: center; color: #fff; flex: none; font-size: 11px; font-weight: 800; }
    .ta-dot.done { background: var(--ok); border-color: var(--ok); }
    .ta-dot.na { border: none; color: var(--n-400); }

    .ta-matrix-scroll { overflow-x: auto; border: 1px solid var(--line); border-radius: 14px; background: var(--paper); }
    .ta-matrix { border-collapse: collapse; width: 100%; }
    .ta-matrix th, .ta-matrix td { padding: 0; }
    .ta-mx-corner { position: sticky; left: 0; z-index: 3; background: var(--n-25); text-align: left; padding: 12px 14px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; color: var(--n-600); border-bottom: 1px solid var(--line); min-width: 190px; }
    .ta-mx-colhead { vertical-align: bottom; border-bottom: 1px solid var(--line); background: var(--n-25); height: 150px; padding: 10px 0; }
    .ta-mx-colhead span { display: block; writing-mode: vertical-rl; transform: rotate(180deg); font-size: 11.5px; font-weight: 700; color: var(--n-700); white-space: nowrap; max-height: 138px; overflow: hidden; text-overflow: ellipsis; margin: 0 auto; line-height: 1.1; }
    .ta-mx-person { position: sticky; left: 0; z-index: 2; background: var(--paper); text-align: left; padding: 11px 14px; border-bottom: 1px solid var(--line); min-width: 190px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .ta-matrix tbody tr:hover .ta-mx-person { background: var(--n-25); }
    .ta-matrix tbody tr:hover td { background: var(--n-25); }
    .ta-matrix tbody tr.is-me .ta-mx-person, .ta-matrix tbody tr.is-me td { background: var(--accent-50); }
    .ta-mx-name { display: inline-flex; align-items: center; gap: 7px; font-weight: 700; font-size: 13.5px; color: var(--ink); }
    .ta-mx-pct { font-size: 12.5px; font-weight: 800; font-variant-numeric: tabular-nums; flex: none; }
    .ta-mx-cell { text-align: center; border-bottom: 1px solid var(--line); border-left: 1px solid var(--line); padding: 9px 10px; }
    .ta-mx-cell .ta-dot { margin: 0 auto; }
    .ta-mx-foot { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; color: var(--n-600); justify-content: flex-start; }
    .ta-mx-cov { font-size: 12.5px; font-weight: 800; font-variant-numeric: tabular-nums; background: var(--n-25); }
    .ta-matrix tfoot .ta-mx-person { background: var(--n-25); border-bottom: none; }
    .ta-matrix tfoot td { border-bottom: none; }

    @media (max-width: 860px) {
      .ta-person-head { grid-template-columns: 40px 1fr 20px; row-gap: 12px; }
      .ta-person-bar { grid-column: 1 / -1; }
      .ta-person-meta { grid-column: 1 / -1; text-align: left; flex-direction: row; align-items: center; gap: 8px; }
      .ta-meta-value { justify-content: flex-start; }
    }
    `}</style>
  );
}
